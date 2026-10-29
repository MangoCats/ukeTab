import { describe, it, expect } from 'vitest';
import {
  TUNING_PRESETS,
  calculatePitch,
  midiToNoteName,
  getBeatDurationMs,
  getAlternateFretSuggestions,
  transposePitches,
  transposeBeatNotes,
  getChordPreset,
  createChordMarker,
  findExistingChordsByFrets,
  autoDetectChordFromBeatNotes,
  extractChordFrets,
  getDefaultChordPalette,
  getEffectiveChordPalette
} from './musicTheory';
import { TabNote, TuningConfig } from '../types/tab';

describe('musicTheory: Pitch & Tuning Calculations', () => {
  it('calculates exact MIDI pitch across standard High-G tuning (gCEA)', () => {
    const tuning = TUNING_PRESETS.gCEA;
    // String 1: A4 (69)
    expect(calculatePitch(1, 0, tuning)).toBe(69);
    expect(calculatePitch(1, 3, tuning)).toBe(72); // C5

    // String 2: E4 (64)
    expect(calculatePitch(2, 0, tuning)).toBe(64);
    expect(calculatePitch(2, 1, tuning)).toBe(65); // F4

    // String 3: C4 (60)
    expect(calculatePitch(3, 0, tuning)).toBe(60);
    expect(calculatePitch(3, 2, tuning)).toBe(62); // D4

    // String 4: G4 (67)
    expect(calculatePitch(4, 0, tuning)).toBe(67);
    expect(calculatePitch(4, 2, tuning)).toBe(69); // A4
  });

  it('calculates exact MIDI pitch across alternative tunings', () => {
    // Low-G tuning (GCEA): String 4 is G3 (55)
    expect(calculatePitch(4, 0, TUNING_PRESETS.GCEA)).toBe(55);

    // Baritone tuning (DGBE): String 4 is D3 (50), String 1 is E4 (64)
    expect(calculatePitch(4, 0, TUNING_PRESETS.DGBE)).toBe(50);
    expect(calculatePitch(1, 0, TUNING_PRESETS.DGBE)).toBe(64);

    // Soprano D tuning (aDF#B): String 1 is B4 (71)
    expect(calculatePitch(1, 0, TUNING_PRESETS['aDF#B'])).toBe(71);
  });

  it('converts MIDI note numbers to note names with octave', () => {
    expect(midiToNoteName(60)).toBe('C4');
    expect(midiToNoteName(69)).toBe('A4');
    expect(midiToNoteName(64)).toBe('E4');
    expect(midiToNoteName(67)).toBe('G4');
    expect(midiToNoteName(72)).toBe('C5');
  });
});

describe('musicTheory: Beat Duration Calculations', () => {
  const tempo120 = 120; // 1 quarter note = 500ms

  it('calculates duration for standard notes at 120 BPM', () => {
    expect(getBeatDurationMs({ duration: '1/1' }, tempo120)).toBe(2000);
    expect(getBeatDurationMs({ duration: '1/2' }, tempo120)).toBe(1000);
    expect(getBeatDurationMs({ duration: '1/4' }, tempo120)).toBe(500);
    expect(getBeatDurationMs({ duration: '1/8' }, tempo120)).toBe(250);
    expect(getBeatDurationMs({ duration: '1/16' }, tempo120)).toBe(125);
    expect(getBeatDurationMs({ duration: '1/32' }, tempo120)).toBe(62.5);
  });

  it('handles dotted notes (1.5x multiplier)', () => {
    // Dotted quarter = 500 * 1.5 = 750ms
    expect(getBeatDurationMs({ duration: '1/4', isDotted: true }, tempo120)).toBe(750);
    // Dotted 8th = 250 * 1.5 = 375ms
    expect(getBeatDurationMs({ duration: '1/8', isDotted: true }, tempo120)).toBe(375);
  });

  it('handles triplet notes (2/3 multiplier)', () => {
    // Triplet quarter = 500 * (2/3) = ~333.33ms
    expect(getBeatDurationMs({ duration: '1/4', isTriplet: true }, tempo120)).toBeCloseTo(333.333, 2);
  });

  it('adjusts duration for playback speed multiplier', () => {
    // 0.5x speed -> 2x duration
    expect(getBeatDurationMs({ duration: '1/4' }, tempo120, 0.5)).toBe(1000);
    // 2.0x speed -> 0.5x duration
    expect(getBeatDurationMs({ duration: '1/4' }, tempo120, 2.0)).toBe(250);
  });
});

describe('musicTheory: Alternate Fret Suggestions', () => {
  const tuning = TUNING_PRESETS.gCEA;

  it('suggests alternate frets for a note on other strings', () => {
    // Note on String 3 (C4), fret 4 = E4 (64)
    // String 2 open is E4 (fret 0)
    const notes: TabNote[] = [{ id: 'n1', string: 3, fret: 4 }];
    const suggestions = getAlternateFretSuggestions(notes, tuning, 12);

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ string: 2, fret: 0, isGhost: true })
      ])
    );
  });

  it('respects user-defined maxFretLimit', () => {
    // Note on String 2 (E4), fret 0 = E4 (64)
    // String 3 (C4) needs fret 4 (64 - 60 = 4)
    // String 4 (G4) cannot play E4 lower than fret 0 (64 - 67 = -3 -> discarded)
    const notes: TabNote[] = [{ id: 'n1', string: 2, fret: 0 }];

    // When maxFretLimit is 3, candidate fret 4 on String 3 should be excluded
    const suggestionsMax3 = getAlternateFretSuggestions(notes, tuning, 3);
    expect(suggestionsMax3.find(g => g.string === 3 && g.fret === 4)).toBeUndefined();

    // When maxFretLimit is 12, candidate fret 4 on String 3 should be included
    const suggestionsMax12 = getAlternateFretSuggestions(notes, tuning, 12);
    expect(suggestionsMax12.find(g => g.string === 3 && g.fret === 4)).toBeDefined();
  });
});

describe('musicTheory: Pitch Transposition', () => {
  const tuning = TUNING_PRESETS.gCEA;

  it('transposes note pitches up and down by semitones', () => {
    const notes: TabNote[] = [
      { id: 'n1', string: 1, fret: 0 }, // A4
      { id: 'n2', string: 3, fret: 0 }  // C4
    ];

    // Transpose +2 semitones: A4 -> B4 (fret 2), C4 -> D4 (fret 2)
    const transposedUp = transposePitches(notes, 2, tuning);
    expect(transposedUp[0].fret).toBe(2);
    expect(transposedUp[1].fret).toBe(2);

    // Transpose -2 semitones from fret 2: should return to 0
    const transposedDown = transposePitches(transposedUp, -2, tuning);
    expect(transposedDown[0].fret).toBe(0);
    expect(transposedDown[1].fret).toBe(0);
  });

  const pitchOf = (n: TabNote) => calculatePitch(n.string, n.fret, tuning);

  it('regression: transposition never changes a note\'s pitch when another string can play it', () => {
    // A4 (string 1 open) - 5 = E4: below string 1's range, but string 2 plays it open
    const down = transposeBeatNotes([{ id: 'n1', string: 1, fret: 0 }], -5, tuning, 20);
    expect(down.notes).toEqual([{ id: 'n1', string: 2, fret: 0 }]);
    expect(down.inexactCount).toBe(0);

    // E4 string fret 20 (C6) + 1 = C#6: past fret 20 on string 2, playable on string 1
    const up = transposeBeatNotes([{ id: 'n1', string: 2, fret: 20 }], 1, tuning, 20);
    expect(pitchOf(up.notes[0])).toBe(85);
    expect(up.inexactCount).toBe(0);
  });

  it('keeps notes on their string when the new fret is within 0..maxFret, and leaves muted notes unchanged', () => {
    const notes: TabNote[] = [
      { id: 'n1', string: 1, fret: 3, isTied: true },
      { id: 'n2', string: 2, fret: -1 }
    ];
    expect(transposeBeatNotes(notes, 2, tuning, 20)).toEqual({
      notes: [{ id: 'n1', string: 1, fret: 5, isTied: true }, { id: 'n2', string: 2, fret: -1 }],
      inexactCount: 0
    });
  });

  it('relocates an out-of-range note to the string giving the lowest fret, keeping its id and tie', () => {
    // G#4 (A4 open - 1): string 2 fret 4, string 3 fret 8, string 4 (g4) fret 1 -> string 4
    const result = transposeBeatNotes([{ id: 'n1', string: 1, fret: 0, isTied: true }], -1, tuning, 20);
    expect(result.notes).toEqual([{ id: 'n1', string: 4, fret: 1, isTied: true }]);

    // C#6: string 1 fret 16 beats string 4 fret 18
    expect(transposeBeatNotes([{ id: 'n1', string: 2, fret: 20 }], 1, tuning, 20).notes[0])
      .toMatchObject({ string: 1, fret: 16 });
  });

  it('breaks equal-fret ties by the lower string number', () => {
    const unisonTuning: TuningConfig = { key: 'custom', name: 'Unison Test', pitches: [69, 64, 64, 60], stringsDisplay: ['A4', 'E4', 'E4', 'C4'] };
    // G#4 is fret 4 on both string 2 and string 3
    expect(transposeBeatNotes([{ id: 'n1', string: 1, fret: 0 }], -1, unisonTuning, 20).notes[0])
      .toMatchObject({ string: 2, fret: 4 });
  });

  it('never relocates onto a string already used in the beat, including by a muted note', () => {
    const notes: TabNote[] = [
      { id: 'n1', string: 1, fret: 0 },  // G#4 after -1: string 4 fret 1 is taken, string 2 is muted
      { id: 'n2', string: 4, fret: 2 },  // stays on string 4 at fret 1
      { id: 'n3', string: 2, fret: -1 }
    ];
    const result = transposeBeatNotes(notes, -1, tuning, 20);
    expect(result.notes).toEqual([
      { id: 'n1', string: 3, fret: 8 },
      { id: 'n2', string: 4, fret: 1 },
      { id: 'n3', string: 2, fret: -1 }
    ]);
    expect(result.inexactCount).toBe(0);
  });

  it('relocates notes in beat order, so an earlier note takes a free string first', () => {
    const notes: TabNote[] = [
      { id: 'n1', string: 2, fret: 20 }, // C#6 -> string 1 fret 16
      { id: 'n2', string: 3, fret: 20 }  // A5 -> string 1 (fret 12) is taken; string 4 fret 14 beats string 2 fret 17
    ];
    expect(transposeBeatNotes(notes, 1, tuning, 20).notes).toEqual([
      { id: 'n1', string: 1, fret: 16 },
      { id: 'n2', string: 4, fret: 14 }
    ]);
  });

  it('clamps and counts a note no free string can play', () => {
    // B3 (C4 open - 1) is below every string of gCEA
    const result = transposeBeatNotes([{ id: 'n1', string: 3, fret: 0 }, { id: 'n2', string: 1, fret: 5 }], -1, tuning, 20);
    expect(result.notes).toEqual([{ id: 'n1', string: 3, fret: 0 }, { id: 'n2', string: 1, fret: 4 }]);
    expect(result.inexactCount).toBe(1);
  });

  it('regression: transposition never puts two notes on one string', () => {
    const notes: TabNote[] = [
      { id: 'n1', string: 1, fret: 0 },
      { id: 'n2', string: 3, fret: 20 }, // A5: its only free string is 2, but string 2's own note has nowhere else to go
      { id: 'n3', string: 2, fret: 20 }, // C#6: fits only strings 1 and 4, both used
      { id: 'n4', string: 4, fret: 0 }
    ];
    const result = transposeBeatNotes(notes, 1, tuning, 20);
    expect(result.notes.map(n => n.string).sort()).toEqual([1, 2, 3, 4]);
    expect(result.notes.map(n => n.fret)).toEqual([1, 20, 20, 1]);
    expect(result.inexactCount).toBe(2);
  });

  it('uses maxFret as the fret range: guitar fret 22 + 2 stays at 24, ukulele fret 20 + 1 relocates', () => {
    const guitarTuning: TuningConfig = { key: 'EADGBE', name: 'Standard', pitches: [64, 59, 55, 50, 45, 40], stringsDisplay: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'] };
    expect(transposeBeatNotes([{ id: 'n1', string: 1, fret: 22 }], 2, guitarTuning, 24))
      .toEqual({ notes: [{ id: 'n1', string: 1, fret: 24 }], inexactCount: 0 });

    expect(transposeBeatNotes([{ id: 'n1', string: 1, fret: 20 }], 1, guitarTuning, 20).inexactCount).toBe(1);
    expect(transposeBeatNotes([{ id: 'n1', string: 2, fret: 20 }], 1, tuning, 20).notes[0].string).not.toBe(2);
  });

  it('keeps transposePitches as the notes of transposeBeatNotes with a default maxFret of 20', () => {
    const notes: TabNote[] = [{ id: 'n1', string: 2, fret: 20 }, { id: 'n2', string: 3, fret: 0 }];
    expect(transposePitches(notes, 1, tuning)).toEqual(transposeBeatNotes(notes, 1, tuning, 20).notes);
  });
});

describe('musicTheory: Chord Palette, Detection & 4-String Extraction', () => {
  it('extracts 4-string frets in [S4, S3, S2, S1] order', () => {
    const completeNotes: TabNote[] = [
      { id: 'n1', string: 1, fret: 3 }, // A4 string -> Fret 3
      { id: 'n2', string: 2, fret: 0 }, // E4 string -> Fret 0
      { id: 'n3', string: 3, fret: 0 }, // C4 string -> Fret 0
      { id: 'n4', string: 4, fret: 0 }  // G4 string -> Fret 0
    ];
    // C major = [0, 0, 0, 3] (S4, S3, S2, S1)
    expect(extractChordFrets(completeNotes, 4)).toEqual([0, 0, 0, 3]);

    const partialNotes: TabNote[] = [
      { id: 'n1', string: 1, fret: 3 },
      { id: 'n2', string: 2, fret: 0 }
    ];
    expect(extractChordFrets(partialNotes, 4)).toBeNull();
  });

  it('automatically detects standard chords from 4-string notes', () => {
    const cMajorNotes: TabNote[] = [
      { id: 'n1', string: 1, fret: 3 },
      { id: 'n2', string: 2, fret: 0 },
      { id: 'n3', string: 3, fret: 0 },
      { id: 'n4', string: 4, fret: 0 }
    ];
    const detected = autoDetectChordFromBeatNotes(cMajorNotes);
    expect(detected).not.toBeNull();
    expect(detected?.name).toBe('C');
    expect(detected?.frets).toEqual([0, 0, 0, 3]);

    const gMajorNotes: TabNote[] = [
      { id: 'n1', string: 1, fret: 2 },
      { id: 'n2', string: 2, fret: 3 },
      { id: 'n3', string: 3, fret: 2 },
      { id: 'n4', string: 4, fret: 0 }
    ];
    const detectedG = autoDetectChordFromBeatNotes(gMajorNotes);
    expect(detectedG?.name).toBe('G');
    expect(detectedG?.frets).toEqual([0, 2, 3, 2]);
  });

  it('returns default and effective chord palettes as SSoT', () => {
    const defaultPalette = getDefaultChordPalette();
    expect(defaultPalette.length).toBeGreaterThan(0);
    expect(defaultPalette.some(c => c.name === 'C')).toBe(true);
    expect(defaultPalette.some(c => c.name === 'Am')).toBe(true);

    // If palette is provided, getEffectiveChordPalette returns it
    const custom = [createChordMarker('Custom', [1, 2, 3, 4])];
    expect(getEffectiveChordPalette(custom)).toEqual(custom);

    // If palette is empty or undefined, returns default palette
    expect(getEffectiveChordPalette([])).toEqual(defaultPalette);
    expect(getEffectiveChordPalette(undefined)).toEqual(defaultPalette);
  });

  it('finds existing chords by frets', () => {
    expect(findExistingChordsByFrets([0, 0, 0, 3])).toContain('C');
    expect(findExistingChordsByFrets([2, 0, 0, 0])).toContain('Am');
    expect(findExistingChordsByFrets([2, 0, 1, 0])).toContain('F');
    expect(findExistingChordsByFrets([99, 99, 99, 99])).toEqual([]);
  });

  it('creates chord markers with computed base frets', () => {
    const lowChord = createChordMarker('C', [0, 0, 0, 3]);
    expect(lowChord.baseFret).toBe(1);

    const highChord = createChordMarker('HighShape', [5, 6, 7, 8]);
    expect(highChord.baseFret).toBe(5);
  });
});
