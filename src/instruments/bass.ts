import { BassTuningKey, ChordFretLibrary, InstrumentProfile, TuningConfig } from '../types/tab';

// Four-String Bass Tunings Catalog (String 1 = G line at top of staff, String 4 = low E line at bottom)
export const BASS_TUNINGS: Record<BassTuningKey, TuningConfig> = {
  EADG: {
    key: 'EADG',
    name: 'Standard (EADG)',
    pitches: [43, 38, 33, 28], // G2, D2, A1, E1
    stringsDisplay: ['G2', 'D2', 'A1', 'E1']
  },
  DADG: {
    key: 'DADG',
    name: 'Drop D (DADG)',
    pitches: [43, 38, 33, 26], // String 4: D1 (26)
    stringsDisplay: ['G2', 'D2', 'A1', 'D1']
  },
  EbAbDbGb: {
    key: 'EbAbDbGb',
    name: 'Half-Step Down (Eb)',
    pitches: [42, 37, 32, 27], // Gb2, Db2, Ab1, Eb1
    stringsDisplay: ['Gb2', 'Db2', 'Ab1', 'Eb1']
  },
  BEAD: {
    key: 'BEAD',
    name: 'BEAD',
    pitches: [38, 33, 28, 23], // D2, A1, E1, B0
    stringsDisplay: ['D2', 'A1', 'E1', 'B0']
  }
};

/**
 * Bass Double-Stop Library (EADG Standard Tuning): root-fifth and root-fifth-octave power shapes.
 * Maps chord name to fret array [String 4 (low E), String 3, String 2, String 1 (G)].
 * Values: -1 = Muted/Unplayed X, 0 = Open O, 1..20 = Fretted
 */
export const BASS_CHORD_LIBRARY: ChordFretLibrary = {
  // Root on String 4 (E)
  'E5': [0, 2, 2, -1],
  'F5': [1, 3, 3, -1],
  'G5': [3, 5, 5, -1],

  // Root on String 3 (A)
  'A5': [-1, 0, 2, 2],
  'Bb5': [-1, 1, 3, 3],
  'B5': [-1, 2, 4, 4],
  'C5': [-1, 3, 5, 5],

  // Root on String 2 (D)
  'D5': [-1, -1, 0, 2]
};

export const BASS_DEFAULT_CHORD_NAMES = ['E5', 'A5', 'D5', 'G5', 'C5'];

export const BASS_PROFILE: InstrumentProfile = {
  id: 'bass',
  name: 'Bass',
  stringCount: 4,
  tunings: [BASS_TUNINGS.EADG, BASS_TUNINGS.DADG, BASS_TUNINGS.EbAbDbGb, BASS_TUNINGS.BEAD],
  defaultTuning: BASS_TUNINGS.EADG,
  chordLibrary: BASS_CHORD_LIBRARY,
  defaultChordNames: BASS_DEFAULT_CHORD_NAMES,
  defaultMaxFretLimit: 12,
  maxFret: 24,
  importPitchRange: [28, 55], // Standard 4-string bass range E1..G3 when re-voicing other instruments' tracks
  importMaxFret: 24,
  importKeepsSourceFingering: true,
  importTrackKeywords: ['bass'],
  synthVoice: {
    // Round electric bass pluck: sawtooth harmonics keep low notes audible on small speakers
    oscillatorType: 'sawtooth',
    filterStartRatio: 8,
    filterEndRatio: 1.0,
    peakGain: 0.35,
    attackSec: 0.006,
    maxSustainSec: 3.0
  }
};
