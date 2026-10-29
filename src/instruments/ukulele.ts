import { ChordFretLibrary, InstrumentProfile, TuningConfig, TuningPresetKey } from '../types/tab';

// Standard Ukulele Tunings Catalog
export const UKULELE_TUNINGS: Record<TuningPresetKey, TuningConfig> = {
  gCEA: {
    key: 'gCEA',
    name: 'Standard High-G (gCEA)',
    pitches: [69, 64, 60, 67], // String 1: A4 (69), String 2: E4 (64), String 3: C4 (60), String 4: G4 (67)
    stringsDisplay: ['A4', 'E4', 'C4', 'g4']
  },
  GCEA: {
    key: 'GCEA',
    name: 'Linear Low-G (GCEA)',
    pitches: [69, 64, 60, 55], // String 4: G3 (55)
    stringsDisplay: ['A4', 'E4', 'C4', 'G3']
  },
  DGBE: {
    key: 'DGBE',
    name: 'Baritone (DGBE)',
    pitches: [64, 59, 55, 50], // String 1: E4 (64), String 2: B3 (59), String 3: G3 (55), String 4: D3 (50)
    stringsDisplay: ['E4', 'B3', 'G3', 'D3']
  },
  'aDF#B': {
    key: 'aDF#B',
    name: 'Soprano D-Tuning (aDF#B)',
    pitches: [71, 66, 62, 69], // String 1: B4 (71), String 2: F#4 (66), String 3: D4 (62), String 4: A4 (69)
    stringsDisplay: ['B4', 'F#4', 'D4', 'a4']
  },
  custom: {
    key: 'custom',
    name: 'Custom Tuning',
    pitches: [69, 64, 60, 67],
    stringsDisplay: ['S1', 'S2', 'S3', 'S4']
  }
};

/**
 * Standard Ukulele Chord Preset Library (gCEA Standard Tuning)
 * UkuTabs style chord catalog mapping chord name/abbreviation to fret array [String 4, String 3, String 2, String 1].
 * Values: -1 = Muted/Unplayed X, 0 = Open O, 1..20 = Fretted
 */
export const UKULELE_CHORD_LIBRARY: ChordFretLibrary = {
  'C': [0, 0, 0, 3],
  'C7': [0, 0, 0, 1],
  'Cm': [0, 3, 3, 3],
  'Cm7': [3, 3, 3, 3],
  'C7m': [3, 3, 3, 3],
  'Cmaj7': [0, 0, 0, 2],
  'Cadd9': [0, 0, 0, 5],
  'Csus4': [0, 0, 1, 3],

  'G': [0, 2, 3, 2],
  'G7': [0, 2, 1, 2],
  'Gm': [0, 2, 3, 1],
  'Gm7': [0, 2, 1, 1],
  'G7m': [0, 2, 1, 1],
  'Gmaj7': [0, 2, 2, 2],
  'Gsus4': [0, 2, 3, 3],

  'Am': [2, 0, 0, 0],
  'A': [2, 1, 0, 0],
  'A7': [0, 1, 0, 0],
  'Am7': [0, 0, 0, 0],
  'A7m': [0, 0, 0, 0],
  'Amaj7': [1, 1, 0, 0],
  'Asus4': [2, 2, 0, 0],

  'F': [2, 0, 1, 0],
  'F7': [2, 3, 1, 0],
  'Fm': [1, 0, 1, 3],
  'Fm7': [1, 3, 1, 3],
  'F7m': [1, 3, 1, 3],
  'Fmaj7': [2, 4, 1, 0],
  'Fadd9': [0, 0, 1, 0],

  'Em': [0, 4, 3, 2],
  'E': [4, 4, 4, 2],
  'E7': [1, 2, 0, 2],
  'Em7': [0, 2, 0, 2],
  'E7m': [0, 2, 0, 2], // UkuTabs alternative shorthand
  'Emaj7': [1, 3, 0, 2],

  'Dm': [2, 2, 1, 0],
  'D': [2, 2, 2, 0],
  'D7': [2, 2, 2, 3],
  'Dm7': [2, 2, 1, 3],
  'D7m': [2, 2, 1, 3],
  'Dmaj7': [2, 2, 2, 4],
  'Dsus4': [2, 2, 3, 0],

  'Bm': [4, 2, 2, 2],
  'B': [4, 3, 2, 2],
  'B7': [2, 3, 2, 2],
  'Bm7': [2, 2, 2, 2],
  'B7m': [2, 2, 2, 2],

  'Bb': [3, 2, 1, 1],
  'Bbm': [3, 1, 1, 1],
  'Bb7': [1, 2, 1, 1],

  'Eb': [0, 3, 3, 1],
  'Ab': [5, 3, 4, 3],
  'F#m': [2, 1, 2, 0],
  'F#m7': [2, 2, 2, 0],
  'C#m': [1, 1, 0, 4],
  'C#m7': [1, 1, 0, 2]
};

export const UKULELE_DEFAULT_CHORD_NAMES = ['C', 'G', 'Am', 'F', 'Em', 'Dm', 'D', 'E7', 'E7m'];

export const UKULELE_PROFILE: InstrumentProfile = {
  id: 'ukulele',
  name: 'Ukulele',
  stringCount: 4,
  tunings: [UKULELE_TUNINGS.gCEA, UKULELE_TUNINGS.GCEA, UKULELE_TUNINGS.DGBE, UKULELE_TUNINGS['aDF#B']],
  defaultTuning: UKULELE_TUNINGS.gCEA,
  chordLibrary: UKULELE_CHORD_LIBRARY,
  defaultChordNames: UKULELE_DEFAULT_CHORD_NAMES,
  defaultMaxFretLimit: 12,
  importPitchRange: [60, 84], // High-G Ukulele pitch range
  importMaxFret: 15,
  synthVoice: {
    // Acoustic ukulele pluck: triangle wave with a closing low-pass filter
    oscillatorType: 'triangle',
    filterStartRatio: 3.5,
    filterEndRatio: 0.4,
    peakGain: 0.4,
    attackSec: 0.008,
    noteDurationSec: 0.6
  }
};
