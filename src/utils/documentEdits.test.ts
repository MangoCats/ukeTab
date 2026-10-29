import { describe, it, expect } from 'vitest';
import { BeatColumn, TabDocument } from '../types/tab';
import { UKULELE_PROFILE } from '../instruments/ukulele';
import { createBlankTabDocument } from './sampleData';
import { getChordPreset } from './musicTheory';
import {
  IdFactory, assignChordOnSelect, addNote, removeNote, insertBeatAfter, toggleRest, toggleTriplet, toggleTie,
  setBeatChord, setBeatDuration, setBeatLyric, setChordPalette, deleteBeat, transposeDocument, addMeasure,
  duplicateMeasureRange
} from './documentEdits';

const sequentialIds = (): IdFactory => {
  let i = 0;
  return prefix => `new-${prefix}${++i}`;
};

// Ukulele document: measure 1 = [b1 quarter, b2 eighth, b3 rest], measure 2 = [b4 quarter]
function makeDoc(): TabDocument {
  const beats1: BeatColumn[] = [
    { id: 'b1', duration: '1/4', notes: [{ id: 'n1', string: 1, fret: 3 }] },
    { id: 'b2', duration: '1/8', notes: [] },
    { id: 'b3', duration: '1/4', isRest: true, notes: [] }
  ];
  return {
    ...createBlankTabDocument(UKULELE_PROFILE),
    measures: [
      { id: 'm1', index: 1, timeSignature: [3, 4], beats: beats1 },
      { id: 'm2', index: 2, timeSignature: [4, 4], beats: [{ id: 'b4', duration: '1/4', notes: [] }] }
    ]
  };
}

const beat = (doc: TabDocument, id: string) => doc.measures.flatMap(m => m.beats).find(b => b.id === id)!;

// C major on gCEA: strings 4..1 = 0 0 0 3
function addCMajor(doc: TabDocument, beatId: string): TabDocument {
  let d = doc;
  [[4, 0], [3, 0], [2, 0], [1, 3]].forEach(([s, f]) => { d = addNote(d, beatId, s, f, UKULELE_PROFILE); });
  return d;
}

describe('documentEdits: notes', () => {
  it('regression: entering a note keeps the beat duration', () => {
    const doc = addNote(makeDoc(), 'b2', 2, 5, UKULELE_PROFILE);
    expect(beat(doc, 'b2').duration).toBe('1/8');
    expect(beat(doc, 'b2').notes).toEqual([expect.objectContaining({ string: 2, fret: 5 })]);
  });

  it('entering a note on a rest clears the rest flag and keeps its duration', () => {
    const doc = addNote(makeDoc(), 'b3', 1, 0, UKULELE_PROFILE);
    expect(beat(doc, 'b3').isRest).toBe(false);
    expect(beat(doc, 'b3').duration).toBe('1/4');
  });

  it('replaces an existing note on the same string and never stores ghost notes', () => {
    const start = makeDoc();
    start.measures[0].beats[0].notes.push({ id: 'g', string: 2, fret: 7, isGhost: true });
    const doc = addNote(start, 'b1', 1, 7, UKULELE_PROFILE);
    expect(beat(doc, 'b1').notes.map(n => [n.string, n.fret])).toEqual([[1, 7]]);
  });

  it('does not mutate the input document', () => {
    const start = makeDoc();
    const snapshot = JSON.stringify(start);
    addNote(start, 'b1', 2, 1, UKULELE_PROFILE);
    removeNote(start, 'b1', 1, UKULELE_PROFILE);
    deleteBeat(start, 'b1');
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it('removes a note from one string', () => {
    const doc = removeNote(makeDoc(), 'b1', 1, UKULELE_PROFILE);
    expect(beat(doc, 'b1').notes).toEqual([]);
  });
});

describe('documentEdits: chord auto-detection', () => {
  it('detects a chord when every string has a note', () => {
    expect(beat(addCMajor(makeDoc(), 'b2'), 'b2').chord?.name).toBe('C');
  });

  it('does not override an explicitly cleared chord when notes are added', () => {
    const cleared = setBeatChord(makeDoc(), 'b2', null);
    expect(beat(addCMajor(cleared, 'b2'), 'b2').chord).toBeNull();
  });

  it('unsets the chord when a note is removed from a full chord', () => {
    const doc = removeNote(addCMajor(makeDoc(), 'b2'), 'b2', 1, UKULELE_PROFILE);
    expect(beat(doc, 'b2').chord).toBeUndefined();
  });

  it('assigns a chord on selection only when the chord was never set', () => {
    const full = makeDoc();
    full.measures[0].beats[1].notes = [4, 3, 2, 1].map(s => ({ id: `c${s}`, string: s, fret: s === 1 ? 3 : 0 }));
    expect(beat(assignChordOnSelect(full, 'b2', UKULELE_PROFILE), 'b2').chord?.name).toBe('C');

    const cleared = setBeatChord(full, 'b2', null);
    expect(beat(assignChordOnSelect(cleared, 'b2', UKULELE_PROFILE), 'b2').chord).toBeNull();
  });
});

describe('documentEdits: beats', () => {
  it('inserts a beat or rest after the given beat with the given duration', () => {
    const { document, beatId } = insertBeatAfter(makeDoc(), 'b1', '1/16', {}, sequentialIds());
    expect(document.measures[0].beats.map(b => b.id)).toEqual(['b1', beatId, 'b2', 'b3']);
    expect(beat(document, beatId)).toEqual({ id: beatId, duration: '1/16', notes: [] });

    const rest = insertBeatAfter(makeDoc(), 'b3', '1/2', { isRest: true }, sequentialIds());
    expect(beat(rest.document, rest.beatId)).toMatchObject({ duration: '1/2', isRest: true });
  });

  it('toggles rest (clearing notes), triplet and tie flags', () => {
    expect(beat(toggleRest(makeDoc(), 'b1'), 'b1')).toMatchObject({ isRest: true, notes: [] });
    expect(beat(toggleRest(makeDoc(), 'b3'), 'b3').isRest).toBe(false);
    expect(beat(toggleTriplet(makeDoc(), 'b1'), 'b1').isTriplet).toBe(true);
    expect(beat(toggleTie(makeDoc(), 'b1'), 'b1').isTied).toBe(true);
  });

  it('sets duration (keeping the dot unless given), lyric and chord palette', () => {
    const dotted = setBeatDuration(makeDoc(), 'b1', '1/2', true);
    expect(beat(dotted, 'b1')).toMatchObject({ duration: '1/2', isDotted: true });
    expect(beat(setBeatDuration(dotted, 'b1', '1/8'), 'b1')).toMatchObject({ duration: '1/8', isDotted: true });
    expect(beat(setBeatLyric(makeDoc(), 'b1', 'la'), 'b1').lyric).toBe('la');
    const palette = [getChordPreset('C')!];
    expect(setChordPalette(makeDoc(), palette).chordPalette).toBe(palette);
  });

  it('deletes beats, removing emptied measures and renumbering', () => {
    expect(deleteBeat(makeDoc(), 'b2').measures[0].beats.map(b => b.id)).toEqual(['b1', 'b3']);

    const withoutM2 = deleteBeat(makeDoc(), 'b4');
    expect(withoutM2.measures.map(m => [m.id, m.index])).toEqual([['m1', 1]]);

    const single = { ...makeDoc(), measures: [makeDoc().measures[1]] };
    const reset = deleteBeat(single, 'b4', sequentialIds());
    expect(reset.measures).toEqual([{ id: 'new-m1', index: 1, timeSignature: [4, 4], beats: [{ id: 'new-b2', duration: '1/4', notes: [] }] }]);
  });
});

describe('documentEdits: measures & song', () => {
  it('appends a measure', () => {
    const doc = addMeasure(makeDoc(), sequentialIds());
    expect(doc.measures).toHaveLength(3);
    expect(doc.measures[2].index).toBe(3);
  });

  it('duplicates a clamped measure range to the end with fresh ids', () => {
    const doc = duplicateMeasureRange(makeDoc(), 0, 1, sequentialIds());
    expect(doc.measures.map(m => m.index)).toEqual([1, 2, 3]);
    const copy = doc.measures[2];
    expect(copy.id).not.toBe('m1');
    expect(copy.beats.map(b => b.duration)).toEqual(['1/4', '1/8', '1/4']);
    expect(copy.beats.every(b => !['b1', 'b2', 'b3'].includes(b.id))).toBe(true);
  });

  it('transposes every note of the song', () => {
    const doc = transposeDocument(makeDoc(), 2);
    expect(beat(doc, 'b1').notes[0].fret).toBe(5);
  });
});
