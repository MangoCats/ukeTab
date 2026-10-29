import { BeatColumn, ChordMarker, DurationType, InstrumentProfile, Measure, TabDocument, TabNote, TuningConfig } from '../types/tab';
import {
  adaptChordFrets, assignNotesToStrings, autoDetectChordFromBeatNotes, calculatePitch, createChordMarker,
  getChordPreset, getDefaultChordPalette, getSoundingTuning, transposeBeatNotes, transposeChordMarker
} from './musicTheory';

/**
 * Pure document edit operations. Each takes a document and returns a new one without mutating its input,
 * so App.tsx can apply them through setDocument and tests can call them directly.
 */

export type IdFactory = (prefix: string) => string;

let idCounter = 0;
export const defaultIdFactory: IdFactory = prefix =>
  `${prefix}-${Date.now()}-${(idCounter++).toString(36)}${Math.random().toString(36).substring(2, 6)}`;

/**
 * Applies fn to the beat with the given id, wherever it is.
 */
function mapBeat(doc: TabDocument, beatId: string, fn: (beat: BeatColumn) => BeatColumn): TabDocument {
  return {
    ...doc,
    measures: doc.measures.map(m => ({
      ...m,
      beats: m.beats.map(b => (b.id === beatId ? fn(b) : b))
    }))
  };
}

/**
 * On selecting a beat: assigns an auto-detected chord only if the beat's chord was never set (undefined).
 */
export function assignChordOnSelect(doc: TabDocument, beatId: string, profile: InstrumentProfile): TabDocument {
  return mapBeat(doc, beatId, b => {
    if (b.chord !== undefined) return b;
    const autoChord = autoDetectChordFromBeatNotes(b.notes, doc.chordPalette, profile);
    return autoChord ? { ...b, chord: autoChord } : b;
  });
}

/**
 * Sets the note on one string of a beat (replacing any note on that string) and clears the rest flag.
 * The beat keeps its duration. Unless the chord was explicitly cleared (null), a detected chord replaces it.
 */
export function addNote(
  doc: TabDocument,
  beatId: string,
  stringIndex: number,
  fret: number,
  profile: InstrumentProfile,
  makeId: IdFactory = defaultIdFactory
): TabDocument {
  return mapBeat(doc, beatId, b => {
    const otherNotes = b.notes.filter(n => n.string !== stringIndex && !n.isGhost);
    const newNote: TabNote = { id: makeId('n'), string: stringIndex, fret };
    const notes = [...otherNotes, newNote];

    let chord = b.chord;
    if (b.chord !== null) {
      const autoChord = autoDetectChordFromBeatNotes(notes, doc.chordPalette, profile);
      if (autoChord) chord = autoChord;
    }

    return { ...b, isRest: false, notes, chord };
  });
}

/**
 * Removes the note on one string of a beat. The chord becomes the detected chord; if none is detected and
 * fewer notes than strings remain, the chord is unset.
 */
export function removeNote(doc: TabDocument, beatId: string, stringIndex: number, profile: InstrumentProfile): TabDocument {
  const stringCount = doc.tuning.pitches.length;
  return mapBeat(doc, beatId, b => {
    const notes = b.notes.filter(n => n.string !== stringIndex);
    const autoChord = autoDetectChordFromBeatNotes(notes, doc.chordPalette, profile);
    return { ...b, notes, chord: autoChord || (notes.length < stringCount ? undefined : b.chord) };
  });
}

/**
 * Inserts an empty beat (or rest) with the given duration directly after afterBeatId in the same measure.
 */
export function insertBeatAfter(
  doc: TabDocument,
  afterBeatId: string,
  duration: DurationType,
  options: { isRest?: boolean } = {},
  makeId: IdFactory = defaultIdFactory
): { document: TabDocument; beatId: string } {
  const beatId = makeId('b');
  const newBeat: BeatColumn = { id: beatId, duration, notes: [], ...(options.isRest ? { isRest: true } : {}) };

  return {
    beatId,
    document: {
      ...doc,
      measures: doc.measures.map(m => {
        const beatIdx = m.beats.findIndex(b => b.id === afterBeatId);
        if (beatIdx === -1) return m;
        const beats = [...m.beats];
        beats.splice(beatIdx + 1, 0, newBeat);
        return { ...m, beats };
      })
    }
  };
}

/**
 * Toggles the rest flag; making a beat a rest removes its notes.
 */
export function toggleRest(doc: TabDocument, beatId: string): TabDocument {
  return mapBeat(doc, beatId, b => ({ ...b, isRest: !b.isRest, notes: !b.isRest ? [] : b.notes }));
}

export function toggleTriplet(doc: TabDocument, beatId: string): TabDocument {
  return mapBeat(doc, beatId, b => ({ ...b, isTriplet: !b.isTriplet }));
}

export function toggleTie(doc: TabDocument, beatId: string): TabDocument {
  return mapBeat(doc, beatId, b => ({ ...b, isTied: !b.isTied }));
}

/**
 * Sets a beat's chord marker; null records an explicit "no chord" that auto-detection will not override.
 */
export function setBeatChord(doc: TabDocument, beatId: string, chord: ChordMarker | null): TabDocument {
  return mapBeat(doc, beatId, b => ({ ...b, chord }));
}

/**
 * Sets a beat's duration, and its dotted flag when given.
 */
export function setBeatDuration(doc: TabDocument, beatId: string, duration: DurationType, isDotted?: boolean): TabDocument {
  return mapBeat(doc, beatId, b => ({ ...b, duration, isDotted: isDotted !== undefined ? isDotted : b.isDotted }));
}

export function setBeatLyric(doc: TabDocument, beatId: string, lyric: string): TabDocument {
  return mapBeat(doc, beatId, b => ({ ...b, lyric }));
}

export function setChordPalette(doc: TabDocument, chordPalette: ChordMarker[]): TabDocument {
  return { ...doc, chordPalette };
}

/**
 * Deletes a beat. Deleting a measure's only beat removes the measure; deleting the only beat of the only
 * measure leaves one empty quarter beat. Measures are renumbered.
 */
export function deleteBeat(doc: TabDocument, beatId: string, makeId: IdFactory = defaultIdFactory): TabDocument {
  const targetMeasure = doc.measures.find(m => m.beats.some(b => b.id === beatId));
  if (!targetMeasure) return doc;

  if (targetMeasure.beats.length <= 1) {
    if (doc.measures.length <= 1) {
      const measureId = makeId('m');
      return {
        ...doc,
        measures: [{
          id: measureId,
          index: 1,
          timeSignature: targetMeasure.timeSignature || [4, 4],
          beats: [{ id: makeId('b'), duration: '1/4', notes: [] }]
        }]
      };
    }

    return {
      ...doc,
      measures: doc.measures.filter(m => m.id !== targetMeasure.id).map((m, idx) => ({ ...m, index: idx + 1 }))
    };
  }

  return {
    ...doc,
    measures: doc.measures.map(m => (m.id === targetMeasure.id ? { ...m, beats: m.beats.filter(b => b.id !== beatId) } : m))
  };
}

/**
 * Applies fn to every chord marker of the song: each beat's chord (unset and cleared chords are kept) and the
 * chord palette.
 */
function mapChordMarkers(doc: TabDocument, fn: (chord: ChordMarker) => ChordMarker): TabDocument {
  return {
    ...doc,
    measures: doc.measures.map(m => ({
      ...m,
      beats: m.beats.map(b => (b.chord ? { ...b, chord: fn(b.chord) } : b))
    })),
    ...(doc.chordPalette ? { chordPalette: doc.chordPalette.map(fn) } : {})
  };
}

/**
 * Switches the song to a new tuning. Notes keep their strings and frets (so they sound at the new tuning's
 * pitches); chord diagrams keep sounding the same chord (see adaptChordFrets).
 */
export function retuneDocument(doc: TabDocument, newTuning: TuningConfig): TabDocument {
  const retuned = mapChordMarkers(doc, c => createChordMarker(c.name, adaptChordFrets(c.frets, doc.tuning, newTuning)));
  return { ...retuned, tuning: newTuning };
}

// Highest capo fret offered by the toolbar and accepted by setCapo
export const MAX_CAPO = 12;

/**
 * Sets the capo fret (0 = no capo). Notes keep their fret numbers, which are relative to the capo, so the song
 * sounds higher or lower; chord diagrams and names are capo-relative shapes and stay as they are. Ignored unless
 * the capo is an integer 0..MAX_CAPO.
 */
export function setCapo(doc: TabDocument, capo: number): TabDocument {
  if (!Number.isInteger(capo) || capo < 0 || capo > MAX_CAPO) return doc;
  return { ...doc, capo };
}

/**
 * Shifts every note in the song by the given number of semitones within the profile's fret range
 * (see transposeBeatNotes), and transposes every chord marker's name and diagram (see transposeChordMarker).
 * The fret range ends capo frets lower, since frets count from the capo. The profile should be the document's
 * tuning-adapted profile. inexactCount is the number of notes that could not keep their exact pitch.
 */
export function transposeDocument(
  doc: TabDocument,
  semitones: number,
  profile: InstrumentProfile
): { document: TabDocument; inexactCount: number } {
  let inexactCount = 0;
  const maxFret = Math.max(0, profile.maxFret - (doc.capo ?? 0));
  const withNotes: TabDocument = {
    ...doc,
    measures: doc.measures.map(m => ({
      ...m,
      beats: m.beats.map(b => {
        const transposed = transposeBeatNotes(b.notes, semitones, doc.tuning, maxFret);
        inexactCount += transposed.inexactCount;
        return { ...b, notes: transposed.notes };
      })
    }))
  };
  const document = mapChordMarkers(withNotes, c => transposeChordMarker(c, semitones, profile));
  return { document, inexactCount };
}

/**
 * Converts the song to another instrument, in the target's default tuning without a capo. Each beat's sounding
 * notes are re-voiced like a Guitar Pro import (see assignNotesToStrings): sounding pitch folded into the target's
 * importPitchRange, placed on the free string with the lowest fret up to importMaxFret. Muted notes keep their
 * string number when the target has that string, and claim it before the sounding notes are placed. Note ids and
 * ties are kept. Beat and palette chords become the target library's chord of the same name; other beat chords
 * are unset (so auto-detection can apply) and cleared ones stay cleared; a palette left empty becomes the
 * target's default palette. droppedCount is the number of notes no target string could take.
 */
export function convertInstrument(
  doc: TabDocument,
  target: InstrumentProfile
): { document: TabDocument; droppedCount: number } {
  const sourceTuning = getSoundingTuning(doc);
  const tuning = target.defaultTuning;
  const stringCount = tuning.pitches.length;
  let droppedCount = 0;

  const convertNotes = (notes: TabNote[]): TabNote[] => {
    const stored = notes.filter(n => !n.isGhost);
    const sounding = stored.filter(n => n.fret >= 0);
    const muted = stored.filter(n => n.fret < 0 && n.string >= 1 && n.string <= stringCount);

    const placements = assignNotesToStrings(
      sounding.map(n => calculatePitch(n.string, n.fret, sourceTuning)),
      tuning,
      target.importMaxFret,
      { pitchRange: target.importPitchRange, usedStrings: muted.map(n => n.string) }
    );
    const placed = new Map<TabNote, TabNote>();
    sounding.forEach((note, i) => {
      const placement = placements[i];
      if (placement) placed.set(note, { ...note, string: placement.string, fret: placement.fret });
    });
    muted.forEach(note => placed.set(note, note));

    droppedCount += stored.length - placed.size;
    return stored.filter(n => placed.has(n)).map(n => placed.get(n)!);
  };

  // Chords are kept by name only when the target library has them
  const targetChord = (chord: ChordMarker): ChordMarker | null => getChordPreset(chord.name, target);

  const palette: ChordMarker[] = [];
  (doc.chordPalette ?? []).forEach(c => {
    const preset = targetChord(c);
    if (preset && !palette.some(p => p.name === preset.name)) palette.push(preset);
  });

  const document: TabDocument = {
    ...doc,
    instrument: target.id,
    tuning,
    capo: 0,
    layout: { ...doc.layout, maxFretLimit: target.defaultMaxFretLimit },
    chordPalette: palette.length > 0 ? palette : getDefaultChordPalette(target),
    measures: doc.measures.map(m => ({
      ...m,
      beats: m.beats.map(b => ({
        ...b,
        notes: convertNotes(b.notes),
        chord: b.chord ? (targetChord(b.chord) ?? undefined) : b.chord
      }))
    }))
  };
  return { document, droppedCount };
}

// Beat duration matching each valid time signature denominator
const DENOMINATOR_DURATIONS: Record<number, DurationType> = {
  1: '1/1', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16', 32: '1/32'
};

/**
 * Sets one measure's time signature; its beats are untouched. Ignored unless the numerator is an integer 1..16
 * and the denominator is 1, 2, 4, 8, 16 or 32.
 */
export function setMeasureTimeSignature(doc: TabDocument, measureId: string, timeSignature: [number, number]): TabDocument {
  const [num, den] = timeSignature;
  if (!Number.isInteger(num) || num < 1 || num > 16 || !(den in DENOMINATOR_DURATIONS)) return doc;
  return {
    ...doc,
    measures: doc.measures.map(m => (m.id === measureId ? { ...m, timeSignature: [num, den] } : m))
  };
}

/**
 * Appends a measure with the last measure's time signature (4/4 for an empty song), filled with one empty beat
 * per count, of the duration matching the denominator (e.g. 6/8 = six empty eighth beats).
 */
export function addMeasure(doc: TabDocument, makeId: IdFactory = defaultIdFactory): TabDocument {
  const lastMeasure = doc.measures[doc.measures.length - 1];
  const [num, den] = lastMeasure ? lastMeasure.timeSignature : [4, 4];
  const duration = DENOMINATOR_DURATIONS[den] ?? '1/4';
  const newMeasure: Measure = {
    id: makeId('m'),
    index: doc.measures.length + 1,
    timeSignature: [num, den],
    beats: Array.from({ length: num }, () => ({ id: makeId('b'), duration, notes: [] }))
  };
  return { ...doc, measures: [...doc.measures, newMeasure] };
}

/**
 * Copies measures startIdx..endIdx (1-based, clamped to the song) with fresh ids and appends them to the end.
 */
export function duplicateMeasureRange(
  doc: TabDocument,
  startIdx: number,
  endIdx: number,
  makeId: IdFactory = defaultIdFactory
): TabDocument {
  const total = doc.measures.length;
  if (total === 0) return doc;

  const validStart = Math.max(1, Math.min(startIdx, total));
  const validEnd = Math.max(validStart, Math.min(endIdx, total));

  const copies: Measure[] = doc.measures.slice(validStart - 1, validEnd).map(m => ({
    ...m,
    id: makeId('m'),
    beats: m.beats.map(b => ({
      ...b,
      id: makeId('b'),
      notes: b.notes.map(n => ({ ...n, id: makeId('n') })),
      chord: b.chord ? { ...b.chord } : b.chord
    }))
  }));

  return {
    ...doc,
    measures: [...doc.measures, ...copies].map((m, idx) => ({ ...m, index: idx + 1 }))
  };
}
