import { ChordFretLibrary, GuitarTuningKey, InstrumentProfile, TuningConfig } from '../types/tab';

// Six-String Guitar Tunings Catalog (String 1 = high E line at top of staff, String 6 = low E line at bottom)
export const GUITAR_TUNINGS: Record<GuitarTuningKey, TuningConfig> = {
  EADGBE: {
    key: 'EADGBE',
    name: 'Standard (EADGBE)',
    pitches: [64, 59, 55, 50, 45, 40], // E4, B3, G3, D3, A2, E2
    stringsDisplay: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2']
  },
  DADGBE: {
    key: 'DADGBE',
    name: 'Drop D (DADGBE)',
    pitches: [64, 59, 55, 50, 45, 38], // String 6: D2 (38)
    stringsDisplay: ['E4', 'B3', 'G3', 'D3', 'A2', 'D2']
  },
  EbAbDbGbBbEb: {
    key: 'EbAbDbGbBbEb',
    name: 'Half-Step Down (Eb)',
    pitches: [63, 58, 54, 49, 44, 39], // Eb4, Bb3, Gb3, Db3, Ab2, Eb2
    stringsDisplay: ['Eb4', 'Bb3', 'Gb3', 'Db3', 'Ab2', 'Eb2']
  },
  DGDGBD: {
    key: 'DGDGBD',
    name: 'Open G (DGDGBD)',
    pitches: [62, 59, 55, 50, 43, 38], // D4, B3, G3, D3, G2, D2
    stringsDisplay: ['D4', 'B3', 'G3', 'D3', 'G2', 'D2']
  },
  'DADF#AD': {
    key: 'DADF#AD',
    name: 'Open D (DADF#AD)',
    pitches: [62, 57, 54, 50, 45, 38], // D4, A3, F#3, D3, A2, D2
    stringsDisplay: ['D4', 'A3', 'F#3', 'D3', 'A2', 'D2']
  },
  DADGAD: {
    key: 'DADGAD',
    name: 'DADGAD',
    pitches: [62, 57, 55, 50, 45, 38], // D4, A3, G3, D3, A2, D2
    stringsDisplay: ['D4', 'A3', 'G3', 'D3', 'A2', 'D2']
  }
};

/**
 * Standard Guitar Chord Preset Library (EADGBE Standard Tuning)
 * Maps chord name to fret array [String 6 (low E), String 5, String 4, String 3, String 2, String 1 (high E)].
 * Values: -1 = Muted/Unplayed X, 0 = Open O, 1..20 = Fretted
 */
export const GUITAR_CHORD_LIBRARY: ChordFretLibrary = {
  // Open position chords
  'C': [-1, 3, 2, 0, 1, 0],
  'C7': [-1, 3, 2, 3, 1, 0],
  'Cmaj7': [-1, 3, 2, 0, 0, 0],
  'Cadd9': [-1, 3, 2, 0, 3, 0],

  'D': [-1, -1, 0, 2, 3, 2],
  'Dm': [-1, -1, 0, 2, 3, 1],
  'D7': [-1, -1, 0, 2, 1, 2],
  'Dm7': [-1, -1, 0, 2, 1, 1],
  'Dmaj7': [-1, -1, 0, 2, 2, 2],
  'Dsus2': [-1, -1, 0, 2, 3, 0],
  'Dsus4': [-1, -1, 0, 2, 3, 3],

  'E': [0, 2, 2, 1, 0, 0],
  'Em': [0, 2, 2, 0, 0, 0],
  'E7': [0, 2, 0, 1, 0, 0],
  'Em7': [0, 2, 0, 0, 0, 0],
  'Emaj7': [0, 2, 1, 1, 0, 0],
  'Esus4': [0, 2, 2, 2, 0, 0],

  'Fmaj7': [-1, -1, 3, 2, 1, 0],

  'G': [3, 2, 0, 0, 0, 3],
  'G7': [3, 2, 0, 0, 0, 1],
  'Gmaj7': [3, 2, 0, 0, 0, 2],

  'A': [-1, 0, 2, 2, 2, 0],
  'Am': [-1, 0, 2, 2, 1, 0],
  'A7': [-1, 0, 2, 0, 2, 0],
  'Am7': [-1, 0, 2, 0, 1, 0],
  'Amaj7': [-1, 0, 2, 1, 2, 0],
  'Asus2': [-1, 0, 2, 2, 0, 0],
  'Asus4': [-1, 0, 2, 2, 3, 0],

  'B7': [-1, 2, 1, 2, 0, 2],

  // E-shape barre chords (root on String 6)
  'F': [1, 3, 3, 2, 1, 1],
  'Fm': [1, 3, 3, 1, 1, 1],
  'F#': [2, 4, 4, 3, 2, 2],
  'F#m': [2, 4, 4, 2, 2, 2],
  'Gm': [3, 5, 5, 3, 3, 3],
  'Ab': [4, 6, 6, 5, 4, 4],

  // A-shape barre chords (root on String 5)
  'Bb': [-1, 1, 3, 3, 3, 1],
  'Bbm': [-1, 1, 3, 3, 2, 1],
  'B': [-1, 2, 4, 4, 4, 2],
  'Bm': [-1, 2, 4, 4, 3, 2],
  'Cm': [-1, 3, 5, 5, 4, 3],
  'C#': [-1, 4, 6, 6, 6, 4],
  'C#m': [-1, 4, 6, 6, 5, 4],
  'Eb': [-1, 6, 8, 8, 8, 6],

  // Power chords
  'E5': [0, 2, 2, -1, -1, -1],
  'A5': [-1, 0, 2, 2, -1, -1],
  'D5': [-1, -1, 0, 2, 3, -1],
  'G5': [3, 5, 5, -1, -1, -1]
};

export const GUITAR_DEFAULT_CHORD_NAMES = ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F'];

export const GUITAR_PROFILE: InstrumentProfile = {
  id: 'guitar',
  name: 'Guitar',
  stringCount: 6,
  tunings: [
    GUITAR_TUNINGS.EADGBE,
    GUITAR_TUNINGS.DADGBE,
    GUITAR_TUNINGS.EbAbDbGbBbEb,
    GUITAR_TUNINGS.DGDGBD,
    GUITAR_TUNINGS['DADF#AD'],
    GUITAR_TUNINGS.DADGAD
  ],
  defaultTuning: GUITAR_TUNINGS.EADGBE,
  chordLibrary: GUITAR_CHORD_LIBRARY,
  defaultChordNames: GUITAR_DEFAULT_CHORD_NAMES,
  defaultMaxFretLimit: 12,
  maxFret: 24,
  importPitchRange: [40, 88], // Standard guitar range E2..E6 when re-voicing other instruments' tracks
  importMaxFret: 24,
  importKeepsSourceFingering: true,
  importTrackKeywords: ['guitar', 'acoustic'],
  synthVoice: {
    // Steel-string pluck: brighter sawtooth with a closing low-pass filter and longer sustain
    oscillatorType: 'sawtooth',
    filterStartRatio: 5,
    filterEndRatio: 0.6,
    peakGain: 0.22,
    attackSec: 0.004,
    maxSustainSec: 3.0
  }
};
