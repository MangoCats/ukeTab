import { BeatColumn, ChordMarker, DurationType, InstrumentProfile, Measure, TabDocument, TabNote } from '../types/tab';
import { autoDetectChordFromBeatNotes, transposePitches } from './musicTheory';

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
 * Shifts every note in the song by the given number of semitones (see transposePitches).
 */
export function transposeDocument(doc: TabDocument, semitones: number): TabDocument {
  return {
    ...doc,
    measures: doc.measures.map(m => ({
      ...m,
      beats: m.beats.map(b => ({ ...b, notes: transposePitches(b.notes, semitones, doc.tuning) }))
    }))
  };
}

/**
 * Appends a 4/4 measure of four empty quarter beats.
 */
export function addMeasure(doc: TabDocument, makeId: IdFactory = defaultIdFactory): TabDocument {
  const measureId = makeId('m');
  const newMeasure: Measure = {
    id: measureId,
    index: doc.measures.length + 1,
    timeSignature: [4, 4],
    beats: [1, 2, 3, 4].map(() => ({ id: makeId('b'), duration: '1/4' as DurationType, notes: [] }))
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
