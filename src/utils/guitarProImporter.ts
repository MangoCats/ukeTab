import * as alphaTab from '@coderline/alphatab';
import { UkuleleTabDocument, Measure, BeatColumn, UkuleleNote, DurationType, TuningConfig, ChordMarker } from '../types/ukulele';
import { TUNING_PRESETS, autoDetectChordFromBeatNotes, DEFAULT_COMPOSITION_CHORD_NAMES, getChordPreset, createChordMarker } from './musicTheory';

/**
 * Convert alphaTab duration number to UkeTab DurationType
 */
function convertGpDuration(duration: number, isDotted: boolean): { duration: DurationType; isDotted: boolean } {
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
function cleanGpLyric(lyrics: string[] | null | undefined): string | undefined {
  if (!lyrics || lyrics.length === 0) return undefined;
  const raw = lyrics.join('').replace(/,/g, '').trim();
  return raw || undefined;
}

/**
 * Parses a Guitar Pro (.gp, .gp3, .gp4, .gp5, .gpx) ArrayBuffer and converts it into a clean UkuleleTabDocument with Tied/Continued Notes & Synchronized Lyrics.
 */
export function parseGuitarProToUkuleleTab(
  arrayBuffer: ArrayBuffer,
  fileName: string = 'Imported Song'
): UkuleleTabDocument {
  const uint8Array = new Uint8Array(arrayBuffer);
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(uint8Array);

  const songTitle = score.title || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const artist = score.artist || 'Guitar Pro Import';
  const tempo = Math.round(score.tempo || 120);

  const tuning: TuningConfig = TUNING_PRESETS.gCEA;
  const chordPalette = DEFAULT_COMPOSITION_CHORD_NAMES.map(name => getChordPreset(name) || createChordMarker(name));

  if (!score.tracks || score.tracks.length === 0) {
    throw new Error('Guitar Pro file contains no tracks.');
  }

  // Find track with lyrics or default to track 0
  let targetTrack = score.tracks.find(t => t.staves.some(s => s.bars.some(b => b.voices.some(v => v.beats.some(bt => bt.lyrics && bt.lyrics.length > 0)))));
  if (!targetTrack) {
    targetTrack = score.tracks[0];
  }

  const staff = targetTrack.staves[0];

  if (!staff || !staff.bars || staff.bars.length === 0) {
    throw new Error('Guitar Pro track contains no measures.');
  }

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

        const ukeNotes: UkuleleNote[] = [];
        const assignedStrings = new Set<1 | 2 | 3 | 4>();
        let hasTiedNote = false;

        if (!isRest && gpBeat.notes.length > 0) {
          gpBeat.notes.forEach((gpNote, nIdx) => {
            let pitch = gpNote.realValue;
            const isTied = !!(gpNote.isTieDestination || (gpNote as any).tie);

            if (isTied) {
              hasTiedNote = true;
            }

            // Transpose into High-G Ukulele pitch range [60..84]
            while (pitch < 60) pitch += 12;
            while (pitch > 84) pitch -= 12;

            // Solve optimal Ukulele string & fret
            const targetStrings: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
            let bestString: (1 | 2 | 3 | 4) | null = null;
            let bestFret = 999;

            for (const s of targetStrings) {
              if (!assignedStrings.has(s)) {
                const fret = pitch - tuning.pitches[s - 1];
                if (fret >= 0 && fret <= 15) {
                  if (fret < bestFret) {
                    bestFret = fret;
                    bestString = s;
                  }
                }
              }
            }

            if (!bestString) {
              for (const s of targetStrings) {
                if (!assignedStrings.has(s)) {
                  bestString = s;
                  bestFret = Math.max(0, Math.min(15, pitch - tuning.pitches[s - 1]));
                  break;
                }
              }
            }

            if (bestString) {
              assignedStrings.add(bestString);
              ukeNotes.push({
                id: `gp-n-${mIdx}-${bIdx}-${nIdx}`,
                string: bestString,
                fret: bestFret,
                isTied: isTied
              });
            }
          });
        }

        const autoChord = autoDetectChordFromBeatNotes(ukeNotes, chordPalette);
        const beatLyric = cleanGpLyric(gpBeat.lyrics);

        beatsInBar.push({
          id: `b-gp-${mIdx + 1}-${bIdx + 1}`,
          duration: duration,
          isDotted: isDotted,
          isRest: isRest,
          isTied: hasTiedNote, // Mark BeatColumn as tied/continued note
          notes: ukeNotes,
          chord: autoChord || undefined,
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
    tempo: tempo,
    keySignature: 'C',
    tuning: tuning,
    layout: {
      stemsPlacement: 'below',
      zoomScale: 1.0,
      measuresPerSystem: 4,
      maxFretLimit: 12
    },
    measures: measures,
    chordPalette: chordPalette
  };
}
