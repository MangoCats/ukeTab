import * as alphaTab from '@coderline/alphatab';
import { BeatColumn, ChordMarker, NotationKey, TabDocument, TuningConfig } from '../types/tab';
import { getInstrumentProfile } from '../instruments';
import { calculatePitch, getSoundingTuning, transposeChordName } from './musicTheory';
import { KEY_SIGNATURE_ACCIDENTALS, getKeyPitchClass, getNotationKey } from './musicKeys';

/**
 * Builds an alphaTab score (used for standard notation printing and Guitar Pro export) from a document.
 *
 * - 'grandStaff': a piano grand staff at sounding pitch (treble for middle C and above, bass below) with the sounding
 *   chord names, followed by the instrument's tablature.
 * - 'instrumentStaff': the instrument's own notation staff (see getInstrumentStaffClef) with its tablature below,
 *   chord names as written in the tab (capo-relative shapes).
 */
export type NotationStaffMode = 'grandStaff' | 'instrumentStaff';

// Middle C (C4): this pitch and above go on the treble staff of the grand staff
export const GRAND_STAFF_SPLIT_PITCH = 60;

/**
 * Clef for an instrument's own notation staff, from its lowest open string: below C2 (basses) a bass clef written an
 * octave above sounding pitch; below G3 (guitars, baritone ukulele) a treble clef written an octave above sounding
 * pitch; otherwise (ukuleles) a treble clef at sounding pitch. Octave clefs are printed with a small 8 below.
 */
export function getInstrumentStaffClef(tuning: TuningConfig): { clef: 'treble' | 'bass'; octaveDown: boolean } {
  const lowest = Math.min(...tuning.pitches);
  if (lowest < 36) return { clef: 'bass', octaveDown: true };
  if (lowest < 55) return { clef: 'treble', octaveDown: true };
  return { clef: 'treble', octaveDown: false };
}

const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
// Notes outside the key, by semitones above the tonic: [letter steps above the tonic letter] (#1, b3, #4, b6, b7)
const CHROMATIC_LETTER_STEPS: Record<number, number> = { 1: 0, 3: 2, 6: 3, 8: 5, 10: 6 };

/**
 * Accidental for a pitch in a key: 0 for notes in the key (the key signature applies), otherwise the accidental of
 * its usual chromatic spelling relative to the tonic (raised 1st and 4th, lowered 3rd, 6th and 7th; e.g. in C:
 * C#, Eb, F#, Ab, Bb; in G: G#, Bb, C#, Eb, F natural) as -1 flat, 0 natural or +1 sharp. null when that spelling
 * would need a double accidental (alphaTab's default spelling is used then).
 */
export function getChromaticAccidental(pitch: number, key: NotationKey): number | null | 'inKey' {
  const tonic = getKeyPitchClass(key);
  const interval = (((pitch - tonic) % 12) + 12) % 12;
  const step = CHROMATIC_LETTER_STEPS[interval];
  if (step === undefined) return 'inKey';

  const tonicLetter = 'CDEFGAB'.indexOf(key[0]);
  const letter = (tonicLetter + step) % 7;
  let offset = (((pitch - NATURAL_PITCH_CLASSES[letter]) % 12) + 12) % 12;
  if (offset > 6) offset -= 12;
  return Math.abs(offset) <= 1 ? offset : null;
}

const ACCIDENTAL_MODES: Record<number, alphaTab.model.NoteAccidentalMode> = {
  [-1]: alphaTab.model.NoteAccidentalMode.ForceFlat,
  0: alphaTab.model.NoteAccidentalMode.ForceNatural,
  1: alphaTab.model.NoteAccidentalMode.ForceSharp
};

function accidentalMode(pitch: number, key: NotationKey): alphaTab.model.NoteAccidentalMode {
  const accidental = getChromaticAccidental(pitch, key);
  return accidental === 'inKey' || accidental === null ? alphaTab.model.NoteAccidentalMode.Default : ACCIDENTAL_MODES[accidental];
}

// A note to place on one staff: piano notes have only a pitch; tab notes also have an alphaTab string and fret
interface StaffNote {
  pitch: number;          // Sounding MIDI pitch (-1 for muted)
  string?: number;        // alphaTab string (1 = lowest)
  fret?: number;          // Relative to the capo; muted notes use 0
  isDead?: boolean;
  isTied?: boolean;
}

interface StaffSpec {
  staff: alphaTab.model.Staff;
  clef: alphaTab.model.Clef;
  clefOttava: alphaTab.model.Ottavia;
  notesOf: (beat: BeatColumn) => StaffNote[];
  continuesTies: boolean;        // An empty tied column repeats the previous column's notes as tied notes
  fullBarRests?: boolean;        // A bar with no notes, lyrics or chord names on this staff is one whole-bar rest
  chordOf?: (beat: BeatColumn) => ChordMarker | null;
  showChordDiagrams?: boolean;
  lyrics?: boolean;
}

const DURATIONS: Record<string, alphaTab.model.Duration> = {
  '1/1': alphaTab.model.Duration.Whole,
  '1/2': alphaTab.model.Duration.Half,
  '1/4': alphaTab.model.Duration.Quarter,
  '1/8': alphaTab.model.Duration.Eighth,
  '1/16': alphaTab.model.Duration.Sixteenth,
  '1/32': alphaTab.model.Duration.ThirtySecond
};

function newStaff(options: { notation: boolean; tab: boolean; tuning?: TuningConfig; capo?: number }): alphaTab.model.Staff {
  const staff = new alphaTab.model.Staff();
  staff.showStandardNotation = options.notation;
  staff.showTablature = options.tab;
  if (options.tuning) {
    // alphaTab lists string pitches highest first, as TuningConfig.pitches does
    staff.stringTuning = new alphaTab.model.Tuning('', [...options.tuning.pitches], false);
    staff.capo = options.capo ?? 0;
  }
  return staff;
}

function newTrack(name: string, program: number, channel: number): alphaTab.model.Track {
  const track = new alphaTab.model.Track();
  track.name = name;
  track.shortName = name;
  track.playbackInfo.program = program;
  track.playbackInfo.primaryChannel = channel;
  track.playbackInfo.secondaryChannel = channel + 1;
  return track;
}

/**
 * Converts a chord marker to an alphaTab chord. Diagram strings are listed highest string first (markers store the
 * bottom line first).
 */
function toAlphaTabChord(marker: ChordMarker, showDiagram: boolean): alphaTab.model.Chord {
  const chord = new alphaTab.model.Chord();
  chord.name = marker.name;
  chord.strings = [...marker.frets].reverse();
  chord.firstFret = marker.baseFret ?? 1;
  chord.showDiagram = showDiagram;
  chord.showName = true;
  chord.showFingering = false;
  return chord;
}

export function buildAlphaTabScore(doc: TabDocument, mode: NotationStaffMode, settings: alphaTab.Settings = new alphaTab.Settings()): alphaTab.model.Score {
  const profile = getInstrumentProfile(doc.instrument);
  const tuning = doc.tuning;
  const stringCount = tuning.pitches.length;
  const capo = doc.capo ?? 0;
  const soundingTuning = getSoundingTuning(doc);
  const { key } = getNotationKey(doc);
  const { Clef, Ottavia } = alphaTab.model;

  const score = new alphaTab.model.Score();
  score.title = doc.title;
  score.artist = doc.artist;

  const soundingNotes = (beat: BeatColumn) => beat.notes.filter(n => !n.isGhost && n.fret >= 0);
  const tabNotes = (beat: BeatColumn): StaffNote[] => beat.notes
    .filter(n => !n.isGhost && n.string >= 1 && n.string <= stringCount)
    .map(n => ({
      pitch: calculatePitch(n.string, n.fret, soundingTuning),
      string: stringCount - n.string + 1,
      fret: Math.max(0, n.fret),
      isDead: n.fret < 0,
      isTied: n.isTied || beat.isTied
    }));
  const writtenChord = (beat: BeatColumn) => beat.chord ?? null;

  const instrumentTrack = newTrack(profile.name, profile.exportMidiProgram, 0);
  const specs: StaffSpec[] = [];

  if (mode === 'grandStaff') {
    const pianoTrack = newTrack('Piano', 0, 2);
    // Piano notes: sounding pitches on this staff, one per pitch (strings in unison are one key), low to high
    const pianoNotes = (inStaff: (pitch: number) => boolean) => (beat: BeatColumn): StaffNote[] => {
      const byPitch = new Map<number, StaffNote>();
      soundingNotes(beat).forEach(n => {
        const pitch = calculatePitch(n.string, n.fret, soundingTuning);
        const isTied = !!(n.isTied || beat.isTied);
        if (inStaff(pitch)) byPitch.set(pitch, { pitch, isTied: isTied || !!byPitch.get(pitch)?.isTied });
      });
      return [...byPitch.values()].sort((a, b) => a.pitch - b.pitch);
    };
    // Chord names above the piano music are the chords heard (capo-relative shapes raised by the capo)
    const soundingChord = (beat: BeatColumn) => (beat.chord ? { ...beat.chord, name: transposeChordName(beat.chord.name, capo) } : null);

    const treble = newStaff({ notation: true, tab: false });
    const bass = newStaff({ notation: true, tab: false });
    const tab = newStaff({ notation: false, tab: true, tuning, capo });
    pianoTrack.addStaff(treble);
    pianoTrack.addStaff(bass);
    instrumentTrack.addStaff(tab);
    score.addTrack(pianoTrack);
    score.addTrack(instrumentTrack);

    specs.push(
      { staff: treble, clef: Clef.G2, clefOttava: Ottavia.Regular, notesOf: pianoNotes(p => p >= GRAND_STAFF_SPLIT_PITCH), continuesTies: true, fullBarRests: true, chordOf: soundingChord, lyrics: true },
      { staff: bass, clef: Clef.F4, clefOttava: Ottavia.Regular, notesOf: pianoNotes(p => p < GRAND_STAFF_SPLIT_PITCH), continuesTies: true, fullBarRests: true },
      // With a capo the tab also names the shapes played; without one the names above the piano music suffice
      { staff: tab, clef: Clef.G2, clefOttava: Ottavia.Regular, notesOf: tabNotes, continuesTies: false, chordOf: capo > 0 ? writtenChord : undefined, showChordDiagrams: true }
    );
  } else {
    const { clef, octaveDown } = getInstrumentStaffClef(tuning);
    const staff = newStaff({ notation: true, tab: true, tuning, capo });
    instrumentTrack.addStaff(staff);
    score.addTrack(instrumentTrack);
    specs.push({
      staff,
      clef: clef === 'bass' ? Clef.F4 : Clef.G2,
      clefOttava: octaveDown ? Ottavia._8vb : Ottavia.Regular,
      notesOf: tabNotes,
      continuesTies: true,
      chordOf: writtenChord,
      showChordDiagrams: true,
      lyrics: true
    });
  }

  doc.measures.forEach((measure, measureIndex) => {
    const masterBar = new alphaTab.model.MasterBar();
    masterBar.timeSignatureNumerator = measure.timeSignature[0];
    masterBar.timeSignatureDenominator = measure.timeSignature[1];
    if (measureIndex === 0) {
      masterBar.tempoAutomations.push(alphaTab.model.Automation.buildTempoAutomation(false, 0, doc.tempo, 2));
    }
    score.addMasterBar(masterBar);
  });

  specs.forEach(spec => addStaffBars(doc, spec, key));
  score.finish(settings);
  return score;
}

/**
 * Adds one bar per measure to a staff, one beat per column. Rests and columns with no notes for this staff are rests;
 * a measure with no columns, or (with fullBarRests) silent on this staff, is a single whole-bar rest.
 * A note is tied when the note or its column is marked tied and the previous column on this staff has the same
 * note (same pitch, and for tab notes the same string and fret); otherwise it is drawn as a new note.
 */
function addStaffBars(doc: TabDocument, spec: StaffSpec, key: NotationKey): void {
  const { staff } = spec;
  const keySignature = KEY_SIGNATURE_ACCIDENTALS[key] as alphaTab.model.KeySignature;
  const chordIds = new Map<string, string>();
  let previousNotes: StaffNote[] = [];

  const chordId = (marker: ChordMarker): string => {
    const id = `${marker.name}|${marker.frets.join(',')}`;
    if (!chordIds.has(id)) {
      chordIds.set(id, id);
      staff.addChord(id, toAlphaTabChord(marker, !!spec.showChordDiagrams));
    }
    return id;
  };

  // Chord shapes of the song appear in the diagram list even when no beat on this staff names them
  if (spec.showChordDiagrams) {
    doc.measures.forEach(m => m.beats.forEach(b => b.chord && chordId(b.chord)));
  }

  const sameNote = (a: StaffNote, b: StaffNote) => a.pitch === b.pitch && a.string === b.string && a.fret === b.fret && !a.isDead && !b.isDead;

  doc.measures.forEach(measure => {
    const bar = new alphaTab.model.Bar();
    bar.clef = spec.clef;
    bar.clefOttava = spec.clefOttava;
    bar.keySignature = keySignature;
    bar.keySignatureType = alphaTab.model.KeySignatureType.Major;
    staff.addBar(bar);
    const voice = new alphaTab.model.Voice();
    bar.addVoice(voice);

    // Notes per column first, so a bar that is silent on this staff can become one whole-bar rest
    const columns = measure.beats.map(column => {
      let notes = column.isRest ? [] : spec.notesOf(column);
      if (spec.continuesTies && !column.isRest && column.isTied && notes.length === 0) {
        notes = previousNotes.filter(n => !n.isDead).map(n => ({ ...n, isTied: true }));
      }
      const tiedTo = previousNotes;
      previousNotes = notes;
      return { column, notes, tiedTo, marker: spec.chordOf?.(column) ?? null, lyric: spec.lyrics ? column.lyric : undefined };
    });

    const isSilent = columns.every(c => c.notes.length === 0 && !c.marker && !c.lyric);
    if (columns.length === 0 || (spec.fullBarRests && isSilent)) {
      const rest = new alphaTab.model.Beat();
      rest.duration = alphaTab.model.Duration.Whole;
      voice.addBeat(rest);
      return;
    }

    columns.forEach(({ column, notes, tiedTo, marker, lyric }) => {
      const beat = new alphaTab.model.Beat();
      beat.duration = DURATIONS[column.duration] ?? alphaTab.model.Duration.Quarter;
      beat.dots = column.isDotted ? 1 : 0;
      if (column.isTriplet) {
        beat.tupletNumerator = 3;
        beat.tupletDenominator = 2;
      }
      if (lyric) beat.lyrics = [lyric];
      if (marker) beat.chordId = chordId(marker);

      notes.forEach(staffNote => {
        const note = new alphaTab.model.Note();
        if (staffNote.string !== undefined) {
          note.string = staffNote.string;
          note.fret = staffNote.fret ?? 0;
          note.isDead = !!staffNote.isDead;
        } else {
          note.octave = Math.floor(staffNote.pitch / 12);
          note.tone = staffNote.pitch % 12;
        }
        if (!staffNote.isDead) note.accidentalMode = accidentalMode(staffNote.pitch, key);
        note.isTieDestination = !!staffNote.isTied && tiedTo.some(p => sameNote(p, staffNote));
        beat.addNote(note);
      });
      voice.addBeat(beat);
    });
  });
}
