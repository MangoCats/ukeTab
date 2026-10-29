import * as alphaTab from '@coderline/alphatab';
import { TabDocument, Measure, BeatColumn, TabNote, DurationType, TuningConfig, ChordMarker, InstrumentProfile, NotationKey } from '../types/tab';
import {
  assignNotesToStrings, autoDetectChordFromBeatNotes, createChordMarker, getChordPreset, getDefaultChordPalette, midiToNoteName,
  transposeChordName
} from './musicTheory';
import { NOTATION_KEYS } from './musicKeys';
import { MAX_CAPO } from './documentEdits';
import { getInstrumentProfile, getTuningProfile } from '../instruments';

/**
 * Convert alphaTab duration number to UkeTab DurationType
 */
export function convertGpDuration(duration: number, isDotted: boolean): { duration: DurationType; isDotted: boolean } {
  let dType: DurationType = '1/4';
  if (duration === 1) dType = '1/1';
  else if (duration === 2) dType = '1/2';
  else if (duration === 4) dType = '1/4';
  else if (duration === 8) dType = '1/8';
  else if (duration === 16) dType = '1/16';
  else if (duration === 32) dType = '1/32';

  return { duration: dType, isDotted };
}

/**
 * Clean Guitar Pro lyric syllable formatting (remove trailing commas/hyphens)
 */
export function cleanGpLyric(lyrics: string[] | null | undefined): string | undefined {
  if (!lyrics || lyrics.length === 0) return undefined;
  const raw = lyrics.join('').replace(/,/g, '').trim();
  return raw || undefined;
}

/**
 * The document key for a source key signature (sharps positive, flats negative), or undefined for no sharps or
 * flats, which files also use when no key was chosen (the key is then guessed from the chords).
 */
export function convertGpKeySignature(keySignature: number): NotationKey | undefined {
  if (!keySignature) return undefined;
  return NOTATION_KEYS[(((keySignature * 7) % 12) + 12) % 12]; // Each sharp moves the tonic up a fifth
}

/**
 * A chord named in the source file. A kept fingering keeps the source diagram (listed highest string first) when it
 * has one fret per string; otherwise the chord is the library shape of that name, renamed by soundingShift (the
 * source capo, since re-voiced notes have none), or null when the library has no such chord.
 */
export function convertGpChord(
  chord: alphaTab.model.Chord,
  keepSourceFingering: boolean,
  stringCount: number,
  soundingShift: number,
  profile: InstrumentProfile
): ChordMarker | null {
  if (!chord.name) return null;
  if (keepSourceFingering && chord.strings.length === stringCount) {
    return createChordMarker(chord.name, [...chord.strings].reverse(), undefined, profile);
  }
  const name = keepSourceFingering ? chord.name : transposeChordName(chord.name, soundingShift);
  const preset = getChordPreset(name, profile);
  return preset ? { ...preset, name } : null;
}

/**
 * Whether a source staff's fingering can be kept on the instrument: same string count, and lowest open
 * string within an octave of the instrument's default tuning (so a 4-string ukulele track is not taken as bass).
 */
export function isCompatibleSourceTuning(staffTuning: number[], profile: InstrumentProfile): boolean {
  if (!profile.importKeepsSourceFingering || staffTuning.length !== profile.stringCount) return false;
  return Math.abs(Math.min(...staffTuning) - Math.min(...profile.defaultTuning.pitches)) <= 12;
}

/**
 * Picks the track to import. Instruments that keep source fingering prefer a compatible track (see
 * isCompatibleSourceTuning); otherwise the first track named with one of the profile's keywords wins,
 * falling back to the first track.
 */
export function selectImportTrack(tracks: alphaTab.model.Track[], profile: InstrumentProfile): alphaTab.model.Track {
  const isNamedForInstrument = (t: alphaTab.model.Track) => {
    const nameLower = t.name.toLowerCase();
    return profile.importTrackKeywords.some(k => nameLower.includes(k));
  };

  const compatible = tracks.filter(t => isCompatibleSourceTuning(t.staves[0]?.tuning ?? [], profile));
  const match = compatible.find(isNamedForInstrument) || compatible[0];
  if (match) return match;

  return tracks.find(isNamedForInstrument) || tracks[0];
}

/**
 * Resolves the tuning of a source staff whose fingering is kept (pitches listed top line first):
 * the profile preset with identical pitches, or a custom tuning named after its notes (low to high).
 */
export function resolveSourceTuning(staffTuning: number[], profile: InstrumentProfile): TuningConfig {
  const preset = profile.tunings.find(
    t => t.pitches.length === staffTuning.length && t.pitches.every((p, i) => p === staffTuning[i])
  );
  if (preset) return preset;

  const stringsDisplay = staffTuning.map(midiToNoteName);
  return {
    key: 'custom',
    name: `Custom (${[...stringsDisplay].reverse().join(' ')})`,
    pitches: [...staffTuning],
    stringsDisplay
  };
}

/**
 * Parses a Guitar Pro (.gp, .gp3, .gp4, .gp5, .gpx) ArrayBuffer and converts it into a clean TabDocument with Tied Notes & Precision Tick-Synchronized Lyrics.
 */
export function parseGuitarProToTab(
  arrayBuffer: ArrayBuffer,
  fileName: string = 'Imported Song',
  profile: InstrumentProfile = getInstrumentProfile()
): TabDocument {
  const uint8Array = new Uint8Array(arrayBuffer);
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(uint8Array);

  const songTitle = score.title || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const artist = score.artist || 'Guitar Pro Import';
  const tempo = Math.round(score.tempo || 120);

  if (!score.tracks || score.tracks.length === 0) {
    throw new Error('Guitar Pro file contains no tracks.');
  }

  // 1. Build a precision tick-timestamp Lyric Map across all tracks in the song
  // Key format: `${mIdx}-${beat.playbackStart}` -> lyric syllable string
  const timeLyricMap = new Map<string, string>();

  score.tracks.forEach((t) => {
    t.staves.forEach((st) => {
      st.bars.forEach((bar, mIdx) => {
        bar.voices.forEach((voice) => {
          voice.beats.forEach((bt) => {
            if (bt.lyrics && bt.lyrics.length > 0) {
              const cleaned = cleanGpLyric(bt.lyrics);
              if (cleaned) {
                const key = `${mIdx}-${bt.playbackStart}`;
                if (!timeLyricMap.has(key)) {
                  timeLyricMap.set(key, cleaned);
                }
              }
            }
          });
        });
      });
    });
  });

  // 2. Select the instrumental track to import
  const targetTrack = selectImportTrack(score.tracks, profile);
  const staff = targetTrack.staves[0];

  if (!staff || !staff.bars || staff.bars.length === 0) {
    throw new Error('Guitar Pro track contains no measures.');
  }

  // 3. Keep the source tuning, strings and frets when the track matches the instrument; otherwise re-voice notes
  const keepSourceFingering = isCompatibleSourceTuning(staff.tuning, profile);
  const tuning: TuningConfig = keepSourceFingering
    ? resolveSourceTuning(staff.tuning, profile)
    : profile.defaultTuning;
  const stringCount = tuning.pitches.length;

  // A kept fingering keeps the source capo (frets stay relative to it); a capo above the editor's range is
  // folded into the fret numbers instead. Re-voiced notes use sounding pitches, so their document has no capo.
  const sourceCapo = keepSourceFingering ? staff.capo : 0;
  const capo = sourceCapo <= MAX_CAPO ? sourceCapo : 0;
  const capoFretOffset = sourceCapo - capo;

  // Chord palette and detection use library shapes adapted to the resolved tuning
  const chordProfile = getTuningProfile(profile, tuning);
  const chordPalette = getDefaultChordPalette(chordProfile);

  const measures: Measure[] = [];

  staff.bars.forEach((bar, mIdx) => {
    const masterBar = score.masterBars[mIdx] || score.masterBars[0];
    const timeSigNumerator = masterBar ? masterBar.timeSignatureNumerator : 4;
    const timeSigDenominator = masterBar ? masterBar.timeSignatureDenominator : 4;
    const timeSig: [number, number] = [timeSigNumerator, timeSigDenominator];

    const voice = bar.voices[0];
    const beatsInBar: BeatColumn[] = [];

    if (voice && voice.beats && voice.beats.length > 0) {
      voice.beats.forEach((gpBeat, bIdx) => {
        const { duration, isDotted } = convertGpDuration(gpBeat.duration, gpBeat.dots > 0);
        const isRest = gpBeat.isRest || !gpBeat.notes || gpBeat.notes.length === 0;

        const tabNotes: TabNote[] = [];
        const isTiedNote = (gpNote: alphaTab.model.Note) => !!(gpNote.isTieDestination || (gpNote as any).tie);
        const hasTiedNote = !isRest && gpBeat.notes.some(isTiedNote);

        if (!isRest) {
          if (keepSourceFingering) {
            const assignedStrings = new Set<number>();
            gpBeat.notes.forEach((gpNote, nIdx) => {
              // alphaTab string 1 is the bottom line; frets are played relative to the capo
              const sourceString = stringCount - gpNote.string + 1;
              if (!assignedStrings.has(sourceString)) {
                assignedStrings.add(sourceString);
                tabNotes.push({
                  id: `gp-n-${mIdx}-${bIdx}-${nIdx}`,
                  string: sourceString,
                  fret: gpNote.isDead ? -1 : gpNote.fret + capoFretOffset,
                  isTied: isTiedNote(gpNote)
                });
              }
            });
          } else {
            // Dead notes stay muted on the same string number when the instrument has it, claimed first; sounding
            // pitches (capo included) are folded into the instrument's range and placed on the other strings
            const mutedStrings = new Set<number>();
            gpBeat.notes.forEach((gpNote, nIdx) => {
              const sourceString = staff.tuning.length - gpNote.string + 1;
              if (!gpNote.isDead || sourceString < 1 || sourceString > stringCount || mutedStrings.has(sourceString)) return;
              mutedStrings.add(sourceString);
              tabNotes.push({ id: `gp-n-${mIdx}-${bIdx}-${nIdx}`, string: sourceString, fret: -1, isTied: isTiedNote(gpNote) });
            });

            const sounding = gpBeat.notes.map((gpNote, nIdx) => ({ gpNote, nIdx })).filter(({ gpNote }) => !gpNote.isDead);
            const placements = assignNotesToStrings(
              sounding.map(({ gpNote }) => gpNote.realValue),
              tuning,
              profile.importMaxFret,
              { pitchRange: profile.importPitchRange, usedStrings: mutedStrings }
            );
            placements.forEach((placement, i) => {
              if (!placement) return; // More notes than strings
              const { gpNote, nIdx } = sounding[i];
              tabNotes.push({
                id: `gp-n-${mIdx}-${bIdx}-${nIdx}`,
                string: placement.string,
                fret: placement.fret,
                isTied: isTiedNote(gpNote)
              });
            });
          }
        }

        // A chord named in the file wins over one detected from the notes
        const gpChord = gpBeat.chordId ? staff.chords?.get(gpBeat.chordId) : undefined;
        const sourceChord = gpChord ? convertGpChord(gpChord, keepSourceFingering, stringCount, staff.capo, chordProfile) : null;
        const chord = sourceChord || autoDetectChordFromBeatNotes(tabNotes, chordPalette, chordProfile);

        // Synchronize lyric syllable using exact measure index + playbackStart tick timestamp
        const tickKey = `${mIdx}-${gpBeat.playbackStart}`;
        const beatLyric = timeLyricMap.get(tickKey) || cleanGpLyric(gpBeat.lyrics);

        beatsInBar.push({
          id: `b-gp-${mIdx + 1}-${bIdx + 1}`,
          duration: duration,
          isDotted: isDotted,
          ...(gpBeat.tupletNumerator === 3 && gpBeat.tupletDenominator === 2 ? { isTriplet: true } : {}),
          isRest: isRest,
          isTied: hasTiedNote, // Mark BeatColumn as tied/continued note
          notes: tabNotes,
          chord: chord || undefined,
          lyric: beatLyric
        });
      });
    } else {
      // Empty measure fallback
      for (let b = 1; b <= timeSigNumerator; b++) {
        beatsInBar.push({
          id: `b-gp-${mIdx + 1}-${b}`,
          duration: '1/4',
          isRest: true,
          notes: []
        });
      }
    }

    measures.push({
      id: `m-gp-${mIdx + 1}`,
      index: mIdx + 1,
      timeSignature: timeSig,
      beats: beatsInBar
    });
  });

  return {
    id: `tab-gp-${Date.now()}`,
    title: songTitle,
    artist: artist,
    instrument: profile.id,
    tempo: tempo,
    ...(convertGpKeySignature(staff.bars[0]?.keySignature ?? 0) ? { key: convertGpKeySignature(staff.bars[0].keySignature) } : {}),
    tuning: tuning,
    capo: capo,
    layout: {
      stemsPlacement: 'below',
      zoomScale: 1.0,
      measuresPerSystem: 4,
      maxFretLimit: profile.defaultMaxFretLimit
    },
    measures: measures,
    chordPalette: chordPalette
  };
}
