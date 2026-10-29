import { describe, it, expect } from 'vitest';
import { BeatColumn, TabDocument } from '../types/tab';
import { UKULELE_PROFILE, UKULELE_TUNINGS } from '../instruments/ukulele';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from '../instruments/guitar';
import { BASS_PROFILE } from '../instruments/bass';
import { getDocumentProfile } from '../instruments';
import { createBlankTabDocument } from './sampleData';
import { calculatePitch, createChordMarker, getChordPreset, getDefaultChordPalette, getSoundingTuning } from './musicTheory';
import {
  IdFactory, assignChordOnSelect, addNote, removeNote, insertBeatAfter, toggleRest, toggleTriplet, toggleTie,
  setBeatChord, setBeatDuration, setBeatLyric, setChordPalette, deleteBeat, transposeDocument, retuneDocument,
  addMeasure, duplicateMeasureRange, setMeasureTimeSignature, setCapo, convertInstrument, setKey
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
    start.measures[0].beats[1].notes = [{ id: 'n9', string: 2, fret: 20 }];
    start.measures[0].beats[1].chord = getChordPreset('Am');
    const snapshot = JSON.stringify(start);
    addNote(start, 'b1', 2, 1, UKULELE_PROFILE);
    removeNote(start, 'b1', 1, UKULELE_PROFILE);
    deleteBeat(start, 'b1');
    transposeDocument(start, 1, UKULELE_PROFILE);
    transposeDocument(start, -12, UKULELE_PROFILE);
    retuneDocument(start, UKULELE_TUNINGS['aDF#B']);
    setMeasureTimeSignature(start, 'm1', [6, 8]);
    addMeasure(start);
    setCapo(start, 3);
    convertInstrument(start, GUITAR_PROFILE);
    convertInstrument(setCapo(start, 5), BASS_PROFILE);
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

  const withLastTimeSignature = (timeSignature: [number, number]) =>
    setMeasureTimeSignature(makeDoc(), 'm2', timeSignature);

  it('regression: Add Measure copies the last measure\'s time signature instead of always adding 4/4', () => {
    const waltz = addMeasure(withLastTimeSignature([3, 4]), sequentialIds()).measures[2];
    expect(waltz.timeSignature).toEqual([3, 4]);
    expect(waltz.beats).toEqual([
      { id: 'new-b2', duration: '1/4', notes: [] },
      { id: 'new-b3', duration: '1/4', notes: [] },
      { id: 'new-b4', duration: '1/4', notes: [] }
    ]);

    const compound = addMeasure(withLastTimeSignature([6, 8])).measures[2];
    expect(compound.timeSignature).toEqual([6, 8]);
    expect(compound.beats.map(b => b.duration)).toEqual(Array(6).fill('1/8'));

    const cutTime = addMeasure(withLastTimeSignature([2, 2])).measures[2];
    expect(cutTime.timeSignature).toEqual([2, 2]);
    expect(cutTime.beats.map(b => b.duration)).toEqual(['1/2', '1/2']);
  });

  it('adds a 4/4 measure of four empty quarter beats to a song without measures', () => {
    const doc = addMeasure({ ...makeDoc(), measures: [] }, sequentialIds());
    expect(doc.measures).toEqual([{
      id: 'new-m1',
      index: 1,
      timeSignature: [4, 4],
      beats: ['new-b2', 'new-b3', 'new-b4', 'new-b5'].map(id => ({ id, duration: '1/4', notes: [] }))
    }]);
  });

  it('sets one measure\'s time signature without touching its beats or other measures', () => {
    const start = makeDoc();
    const doc = setMeasureTimeSignature(start, 'm1', [6, 8]);
    expect(doc.measures[0].timeSignature).toEqual([6, 8]);
    expect(doc.measures[0].beats).toBe(start.measures[0].beats);
    expect(doc.measures[1]).toBe(start.measures[1]);

    expect(setMeasureTimeSignature(start, 'm1', [16, 32]).measures[0].timeSignature).toEqual([16, 32]);
    expect(setMeasureTimeSignature(start, 'm1', [1, 1]).measures[0].timeSignature).toEqual([1, 1]);
  });

  it('ignores invalid time signatures', () => {
    const start = makeDoc();
    [[0, 4], [17, 4], [2.5, 4], [NaN, 4], [4, 3], [4, 0], [4, 64], [4, NaN]].forEach(ts => {
      expect(setMeasureTimeSignature(start, 'm1', ts as [number, number])).toBe(start);
    });
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
    const { document, inexactCount } = transposeDocument(makeDoc(), 2, UKULELE_PROFILE);
    expect(beat(document, 'b1').notes[0].fret).toBe(5);
    expect(inexactCount).toBe(0);
  });

  it('transposes within the profile\'s maxFret and sums inexact notes over the song', () => {
    expect([UKULELE_PROFILE.maxFret, GUITAR_PROFILE.maxFret, BASS_PROFILE.maxFret]).toEqual([20, 24, 24]);
    [UKULELE_PROFILE, GUITAR_PROFILE, BASS_PROFILE].forEach(p => expect(p.importMaxFret).toBeLessThanOrEqual(p.maxFret));

    // Guitar fret 22 + 2 = 24 stays on its string
    const guitarDoc = createBlankTabDocument(GUITAR_PROFILE);
    guitarDoc.measures[0].beats[0].notes = [{ id: 'g1', string: 1, fret: 22 }];
    const guitar = transposeDocument(guitarDoc, 2, GUITAR_PROFILE);
    expect(guitar.document.measures[0].beats[0].notes).toEqual([{ id: 'g1', string: 1, fret: 24 }]);
    expect(guitar.inexactCount).toBe(0);

    // Ukulele E-string fret 20 + 1 moves to the A string at fret 16; C-string open - 1 (B3) cannot be played
    const start = makeDoc();
    start.measures[0].beats[0].notes = [{ id: 'n1', string: 2, fret: 20 }];
    start.measures[1].beats[0].notes = [{ id: 'n2', string: 3, fret: 0 }];
    start.measures[0].beats[1].notes = [{ id: 'n3', string: 3, fret: 0 }];
    const up = transposeDocument(start, 1, UKULELE_PROFILE);
    expect(beat(up.document, 'b1').notes).toEqual([{ id: 'n1', string: 1, fret: 16 }]);
    expect(up.inexactCount).toBe(0);
    expect(transposeDocument(start, -1, UKULELE_PROFILE).inexactCount).toBe(2);
  });
});

// Guitar document: b1 = E chord with its notes, b2 = explicitly cleared chord, b3 = chord never set
function makeGuitarDoc(): TabDocument {
  const eNotes = [0, 2, 2, 1, 0, 0].map((fret, i) => ({ id: `e${i}`, string: 6 - i, fret }));
  return {
    ...createBlankTabDocument(GUITAR_PROFILE),
    measures: [{
      id: 'm1',
      index: 1,
      timeSignature: [4, 4],
      beats: [
        { id: 'b1', duration: '1/4', notes: eNotes, chord: getChordPreset('E', GUITAR_PROFILE) },
        { id: 'b2', duration: '1/4', notes: [{ id: 'n2', string: 1, fret: 3 }], chord: null },
        { id: 'b3', duration: '1/4', notes: [] }
      ]
    }]
  };
}

describe('documentEdits: chords follow tuning changes and transposition', () => {
  it('retunes the song, re-fingering beat chords and the palette while notes keep their frets', () => {
    const start = makeGuitarDoc();
    const doc = retuneDocument(start, GUITAR_TUNINGS.DADGBE);
    const dropD = getDocumentProfile(doc);

    expect(doc.tuning).toBe(GUITAR_TUNINGS.DADGBE);
    expect(beat(doc, 'b1').chord).toEqual({ name: 'E', frets: [2, 2, 2, 1, 0, 0], baseFret: 1 });
    expect(beat(doc, 'b1').notes).toEqual(beat(start, 'b1').notes);
    expect(beat(doc, 'b2').chord).toBeNull();
    expect(beat(doc, 'b3').chord).toBeUndefined();
    expect(doc.chordPalette).toEqual(GUITAR_PROFILE.defaultChordNames.map(n => getChordPreset(n, dropD)));
    expect(doc.chordPalette!.find(c => c.name === 'G')).toEqual({ name: 'G', frets: [5, 2, 0, 0, 0, 3], baseFret: 2 });
  });

  it('retunes custom chords and recomputes their base fret', () => {
    const start = setChordPalette(makeDoc(), [createChordMarker('Mine', [0, 0, 0, 3])]);
    const doc = retuneDocument(start, UKULELE_TUNINGS['aDF#B']);
    expect(doc.chordPalette).toEqual([{ name: 'Mine', frets: [10, 10, 10, 13], baseFret: 10 }]);
    expect(retuneDocument(start, UKULELE_TUNINGS.GCEA).chordPalette).toEqual(start.chordPalette);
  });

  it('transposes beat chords and the palette, preferring library shapes, and keeps unset and cleared chords', () => {
    const start = setBeatChord(setBeatChord(makeDoc(), 'b1', getChordPreset('C')), 'b2', null);
    const { document } = transposeDocument(start, 2, UKULELE_PROFILE);

    expect(beat(document, 'b1').chord).toEqual(getChordPreset('D'));
    expect(beat(document, 'b2').chord).toBeNull();
    expect(beat(document, 'b3').chord).toBeUndefined();
    expect(document.chordPalette!.map(c => c.name)).toEqual(['D', 'A', 'Bm', 'G', 'F#m', 'Em', 'E', 'F#7', 'F#7m']);
    // F#7 and F#7m are not in the library, so E7 and E7m shift up two frets
    expect(document.chordPalette!.slice(-2).map(c => c.frets)).toEqual([[3, 4, 2, 4], [2, 4, 2, 4]]);
  });

  it('regression: transposing a song transposes its chord names and diagrams', () => {
    const start = makeGuitarDoc();
    const { document } = transposeDocument(start, 5, getDocumentProfile(start));
    expect(beat(document, 'b1').chord).toEqual(getChordPreset('A', GUITAR_PROFILE));
    expect(beat(document, 'b1').notes.map(n => n.fret)).toEqual([5, 7, 7, 6, 5, 5]);

    // In Drop D the adapted library shapes are used
    const dropDStart = retuneDocument(start, GUITAR_TUNINGS.DADGBE);
    const dropD = transposeDocument(dropDStart, 3, getDocumentProfile(dropDStart)).document;
    expect(beat(dropD, 'b1').chord).toEqual({ name: 'G', frets: [5, 2, 0, 0, 0, 3], baseFret: 2 });
  });
});

describe('documentEdits: capo', () => {
  it('sets the capo, keeping every note\'s fret so the song sounds higher', () => {
    const start = makeDoc();
    const doc = setCapo(start, 2);
    expect(doc.capo).toBe(2);
    expect(doc.measures).toBe(start.measures);
    expect(calculatePitch(1, 3, getSoundingTuning(doc))).toBe(calculatePitch(1, 3, start.tuning) + 2);
    expect(setCapo(doc, 0).capo).toBe(0);
    expect(setCapo(start, 12).capo).toBe(12);
  });

  it('ignores capo values outside 0..12 or not whole frets', () => {
    const start = setCapo(makeDoc(), 4);
    [-1, 13, 2.5, NaN, Infinity].forEach(capo => expect(setCapo(start, capo)).toBe(start));
  });

  it('transposes only up to the highest fret above the capo', () => {
    // Guitar fret 20 + 2 = 22 is allowed without a capo, but beyond 24 - 3 = 21 with capo 3
    const guitarDoc = createBlankTabDocument(GUITAR_PROFILE);
    guitarDoc.measures[0].beats[0].notes = [{ id: 'g1', string: 1, fret: 20 }];
    const plain = transposeDocument(guitarDoc, 2, GUITAR_PROFILE);
    expect(plain.document.measures[0].beats[0].notes).toEqual([{ id: 'g1', string: 1, fret: 22 }]);

    // No other string reaches the pitch either, so the note is clamped and counted
    const capoed = transposeDocument(setCapo(guitarDoc, 3), 2, GUITAR_PROFILE);
    expect(capoed.document.measures[0].beats[0].notes).toEqual([{ id: 'g1', string: 1, fret: 21 }]);
    expect(capoed.inexactCount).toBe(1);
  });
});

describe('documentEdits: notation key', () => {
  it('sets a key and returns to guessing it', () => {
    const doc = setKey(makeDoc(), 'Eb');
    expect(doc.key).toBe('Eb');
    expect('key' in setKey(doc, undefined)).toBe(false);
    expect('key' in setKey(doc, 'H' as never)).toBe(false);
  });

  it('moves a chosen key with transposition and capo changes, and leaves a guessed key to the chords', () => {
    const chosen = setKey(makeDoc(), 'G');
    expect(transposeDocument(chosen, 2, UKULELE_PROFILE).document.key).toBe('A');
    expect(transposeDocument(chosen, -1, UKULELE_PROFILE).document.key).toBe('F#');
    expect(setCapo(chosen, 3).key).toBe('Bb');
    expect(setCapo(setCapo(chosen, 3), 1).key).toBe('Ab');

    expect('key' in transposeDocument(makeDoc(), 2, UKULELE_PROFILE).document).toBe(false);
    expect('key' in setCapo(makeDoc(), 2)).toBe(false);
  });

  it('keeps the key when converting to another instrument, since the pitches stay', () => {
    expect(convertInstrument(setKey(setCapo(makeDoc(), 2), 'D'), GUITAR_PROFILE).document.key).toBe('D');
  });
});

describe('documentEdits: converting to another instrument', () => {
  const allNotes = (doc: TabDocument) => doc.measures.flatMap(m => m.beats.flatMap(b => b.notes));
  const soundingPitches = (doc: TabDocument) => {
    const tuning = getSoundingTuning(doc);
    return new Map(allNotes(doc).filter(n => n.fret >= 0).map(n => [n.id, calculatePitch(n.string, n.fret, tuning)]));
  };
  const expectValidStrings = (doc: TabDocument, stringCount: number, maxFret: number) => {
    doc.measures.flatMap(m => m.beats).forEach(b => {
      const strings = b.notes.map(n => n.string);
      expect(new Set(strings).size).toBe(strings.length);
      b.notes.forEach(n => {
        expect(n.string).toBeGreaterThanOrEqual(1);
        expect(n.string).toBeLessThanOrEqual(stringCount);
        expect(n.fret).toBeLessThanOrEqual(maxFret);
      });
    });
  };

  // Ukulele: b2 = C chord (detected), b3 = cleared chord, b4 = a chord missing from the guitar library
  function makeUkeSong(): TabDocument {
    const doc = setBeatChord(setBeatChord(addCMajor(makeDoc(), 'b2'), 'b3', null), 'b4', getChordPreset('E7m'));
    return { ...doc, layout: { ...doc.layout, maxFretLimit: 7 } };
  }

  it('moves a ukulele song onto the guitar at the same pitches, keeping ids, ties and everything else', () => {
    const start = makeUkeSong();
    start.measures[0].beats[0].notes = [{ id: 'n1', string: 1, fret: 3, isTied: true }];
    const { document, droppedCount } = convertInstrument(start, GUITAR_PROFILE);

    expect(droppedCount).toBe(0);
    expect(document.instrument).toBe('guitar');
    expect(document.tuning).toBe(GUITAR_PROFILE.defaultTuning);
    expect(document.capo).toBe(0);
    expect(document.layout).toEqual({ ...start.layout, maxFretLimit: GUITAR_PROFILE.defaultMaxFretLimit });
    expect(soundingPitches(document)).toEqual(soundingPitches(start)); // Ukulele pitches lie in the guitar range
    expectValidStrings(document, 6, GUITAR_PROFILE.importMaxFret);
    expect(beat(document, 'b1').notes).toEqual([{ id: 'n1', string: 1, fret: 8, isTied: true }]);
    // C chord g4 C4 E4 C5 (in note order) takes the most compact fingering, frets 8–10
    expect(beat(document, 'b2').notes.map(n => [n.string, n.fret])).toEqual([[2, 8], [4, 10], [3, 9], [1, 8]]);

    expect(document.title).toBe(start.title);
    expect(document.tempo).toBe(start.tempo);
    const rhythm = (doc: TabDocument) => doc.measures.map(m => [m.id, m.timeSignature, m.beats.map(b => [b.id, b.duration, b.isRest, b.lyric])]);
    expect(rhythm(document)).toEqual(rhythm(start));
  });

  it('maps chords by name onto the target library, unsets unknown ones and keeps cleared ones', () => {
    const { document } = convertInstrument(makeUkeSong(), GUITAR_PROFILE);
    expect(beat(document, 'b2').chord).toEqual(getChordPreset('C', GUITAR_PROFILE));
    expect(beat(document, 'b3').chord).toBeNull();
    expect(beat(document, 'b4').chord).toBeUndefined();
    expect(beat(document, 'b1').chord).toBeUndefined();
    // The ukulele default palette without E7m, which the guitar library lacks
    expect(document.chordPalette).toEqual(['C', 'G', 'Am', 'F', 'Em', 'Dm', 'D', 'E7'].map(n => getChordPreset(n, GUITAR_PROFILE)));
  });

  it('regression: chord shapes under a capo become the chords they sound', () => {
    // Capo 2 with a G shape sounds A; the converted song has no capo, so its chord is A
    const doc = setCapo(setBeatChord(makeDoc(), 'b1', getChordPreset('G')), 2);
    const { document } = convertInstrument({ ...doc, chordPalette: [getChordPreset('G')!] }, GUITAR_PROFILE);
    expect(beat(document, 'b1').chord).toEqual(getChordPreset('A', GUITAR_PROFILE));
    expect(document.chordPalette).toEqual([getChordPreset('A', GUITAR_PROFILE)]);
  });

  it('includes the capo in the sounding pitch and removes it', () => {
    const { document } = convertInstrument(setCapo(makeDoc(), 2), GUITAR_PROFILE);
    // Ukulele A string fret 3 with capo 2 sounds D5 (74): guitar String 1 fret 10
    expect(beat(document, 'b1').notes).toEqual([{ id: 'n1', string: 1, fret: 10 }]);
    expect(document.capo).toBe(0);
  });

  it('folds a guitar song into the bass range, dropping notes beyond four strings and counting them', () => {
    const start = makeGuitarDoc();
    const { document, droppedCount } = convertInstrument(start, BASS_PROFILE);

    // E chord E2 B2 E3 G#3 B3 E4 folded into E1..G3: E2 B2 E3 G#2 take the four strings at frets 9–12,
    // the repeated B2 and E3 are dropped
    expect(droppedCount).toBe(2);
    expect(beat(document, 'b1').notes.map(n => [n.id, n.string, n.fret])).toEqual([
      ['e0', 4, 12], ['e1', 2, 9], ['e2', 1, 9], ['e3', 3, 11]
    ]);
    expectValidStrings(document, 4, BASS_PROFILE.importMaxFret);
    const before = soundingPitches(start);
    soundingPitches(document).forEach((pitch, id) => {
      expect((before.get(id)! - pitch) % 12).toBe(0);
      expect(pitch).toBeGreaterThanOrEqual(28);
      expect(pitch).toBeLessThanOrEqual(55);
    });

    // No guitar default chord is in the bass library: chords unset, palette falls back to the bass default
    expect(beat(document, 'b1').chord).toBeUndefined();
    expect(beat(document, 'b2').chord).toBeNull();
    expect(document.chordPalette).toEqual(getDefaultChordPalette(BASS_PROFILE));
  });

  it('keeps only palette chords the target library has, matching names case-insensitively', () => {
    const palette = ['E5', 'G', 'a5', 'Mine'].map(n => createChordMarker(n, [0, 0, 0, 0, 0, 0], undefined, GUITAR_PROFILE));
    const { document } = convertInstrument(setChordPalette(makeGuitarDoc(), palette), BASS_PROFILE);
    expect(document.chordPalette).toEqual([getChordPreset('E5', BASS_PROFILE), getChordPreset('A5', BASS_PROFILE)]);
  });

  it('keeps muted notes on strings the target has, ahead of sounding notes, and drops the others', () => {
    const start = makeGuitarDoc();
    start.measures[0].beats[2].notes = [
      { id: 'x6', string: 6, fret: -1 },
      { id: 'b2', string: 5, fret: 2 },
      { id: 'x1', string: 1, fret: -1, isTied: true }
    ];
    const { document, droppedCount } = convertInstrument(start, BASS_PROFILE);

    // B2 would take String 1 at fret 4, but the muted String 1 keeps its string: B2 goes to String 2 fret 9
    expect(beat(document, 'b3').notes).toEqual([
      { id: 'b2', string: 2, fret: 9 },
      { id: 'x1', string: 1, fret: -1, isTied: true }
    ]);
    expect(droppedCount).toBe(3); // B3 and E4 of the E chord, and the muted String 6
  });

  it('regression: a song\'s instrument can be changed after creation', () => {
    const uke = makeUkeSong();
    const guitar = convertInstrument(uke, GUITAR_PROFILE).document;
    const back = convertInstrument(guitar, UKULELE_PROFILE);
    expect(back.document.instrument).toBe('ukulele');
    expect(back.droppedCount).toBe(0);
    expect(soundingPitches(back.document)).toEqual(soundingPitches(uke));
    expectValidStrings(back.document, 4, UKULELE_PROFILE.importMaxFret);
    expect(beat(back.document, 'b2').chord).toEqual(getChordPreset('C'));
  });
});
