import { describe, it, expect } from 'vitest';
import {
  TUNING_PRESETS,
  calculatePitch,
  midiToNoteName,
  getBeatDurationMs,
  getAlternateFretSuggestions,
  transposePitches,
  getChordPreset,
  createChordMarker,
  findExistingChordsByFrets,
  autoDetectChordFromBeatNotes,
  extract4StringFrets,
  getDefaultChordPalette,
  getEffectiveChordPalette
} from './musicTheory';
import { UkuleleNote } from '../types/ukulele';

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
    const notes: UkuleleNote[] = [{ id: 'n1', string: 3, fret: 4 }];
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
    const notes: UkuleleNote[] = [{ id: 'n1', string: 2, fret: 0 }];

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
    const notes: UkuleleNote[] = [
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

  it('clamps frets within 0 to 20 bounds', () => {
    const notes: UkuleleNote[] = [{ id: 'n1', string: 1, fret: 0 }];
    const transposedNegative = transposePitches(notes, -5, tuning);
    expect(transposedNegative[0].fret).toBe(0);

    const highNotes: UkuleleNote[] = [{ id: 'n1', string: 1, fret: 18 }];
    const transposedOver = transposePitches(highNotes, 10, tuning);
    expect(transposedOver[0].fret).toBe(20);
  });
});

describe('musicTheory: Chord Palette, Detection & 4-String Extraction', () => {
  it('extracts 4-string frets in [S4, S3, S2, S1] order', () => {
    const completeNotes: UkuleleNote[] = [
      { id: 'n1', string: 1, fret: 3 }, // A4 string -> Fret 3
      { id: 'n2', string: 2, fret: 0 }, // E4 string -> Fret 0
      { id: 'n3', string: 3, fret: 0 }, // C4 string -> Fret 0
      { id: 'n4', string: 4, fret: 0 }  // G4 string -> Fret 0
    ];
    // C major = [0, 0, 0, 3] (S4, S3, S2, S1)
    expect(extract4StringFrets(completeNotes)).toEqual([0, 0, 0, 3]);

    const partialNotes: UkuleleNote[] = [
      { id: 'n1', string: 1, fret: 3 },
      { id: 'n2', string: 2, fret: 0 }
    ];
    expect(extract4StringFrets(partialNotes)).toBeNull();
  });

  it('automatically detects standard chords from 4-string notes', () => {
    const cMajorNotes: UkuleleNote[] = [
      { id: 'n1', string: 1, fret: 3 },
      { id: 'n2', string: 2, fret: 0 },
      { id: 'n3', string: 3, fret: 0 },
      { id: 'n4', string: 4, fret: 0 }
    ];
    const detected = autoDetectChordFromBeatNotes(cMajorNotes);
    expect(detected).not.toBeNull();
    expect(detected?.name).toBe('C');
    expect(detected?.frets).toEqual([0, 0, 0, 3]);

    const gMajorNotes: UkuleleNote[] = [
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
