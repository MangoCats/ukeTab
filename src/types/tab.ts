export type DurationType = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export const DURATION_OPTIONS: { label: string; value: DurationType }[] = [
  { label: '1', value: '1/1' },
  { label: '1/2', value: '1/2' },
  { label: '1/4', value: '1/4' },
  { label: '1/8', value: '1/8' },
  { label: '1/16', value: '1/16' },
  { label: '1/32', value: '1/32' }
];

export const DURATION_KEY_MAP: Record<string, DurationType> = {
  'w': '1/1',
  'h': '1/2',
  'q': '1/4',
  'e': '1/8',
  's': '1/16',
  'd': '1/32'
};

export interface TabNote {
  id: string;
  string: number;        // 1 = Top line (highest string, A4 on ukulele) .. N = Bottom line (N = tuning string count)
  fret: number;          // -1 = Muted (X), 0 = Open, 1+ = Fretted (editor input up to 20; Guitar Pro import up to the profile's importMaxFret; transposition up to its maxFret)
  isGhost?: boolean;     // Visual alternate fret suggestion flag
  isTied?: boolean;      // Continued / sustained note from previous beat without re-strumming
}

export interface ChordMarker {
  name: string; // e.g. "Am", "E7", "G", "C", "F", "Dm"
  frets: number[]; // One entry per string, bottom line first [N, ..., 2, 1]: -1 = Muted/Unplayed X, 0 = Open O, 1..20 = Fretted Dot
  baseFret?: number; // Optional base fret offset (default 1)
}

export interface BeatColumn {
  id: string;
  duration: DurationType;
  isDotted?: boolean;
  isTriplet?: boolean;
  isRest?: boolean;
  isTied?: boolean; // When true, sustains into the next beat without re-strumming (Continued Note)
  notes: TabNote[];
  chord?: ChordMarker | null; // Chord diagram drawn above the beat (undefined = never set, may be auto-detected; null = explicitly cleared)
  lyric?: string;
}

export interface Measure {
  id: string;
  index: number;
  timeSignature: [number, number]; // e.g. [4, 4], [3, 4], [6, 8]
  beats: BeatColumn[];
}

export type UkuleleTuningKey = 'gCEA' | 'GCEA' | 'DGBE' | 'aDF#B';
export type GuitarTuningKey = 'EADGBE' | 'DADGBE' | 'EbAbDbGbBbEb' | 'DGDGBD' | 'DADF#AD' | 'DADGAD';
export type BassTuningKey = 'EADG' | 'DADG' | 'EbAbDbGb' | 'BEAD';
export type TuningPresetKey = UkuleleTuningKey | GuitarTuningKey | BassTuningKey | 'custom';

export interface TuningConfig {
  key: TuningPresetKey;
  name: string;
  pitches: number[];         // MIDI note values for strings 1..N; its length is the staff's string count
  stringsDisplay: string[];  // Label names e.g. ['A4', 'E4', 'C4', 'g4']
}

export type InstrumentId = 'ukulele' | 'guitar' | 'bass';

export type ChordFretLibrary = Record<string, number[]>; // Chord name -> frets, bottom line first [String N, ..., String 1]

export interface SynthVoice {
  oscillatorType: OscillatorType;
  filterStartRatio: number;  // Low-pass cutoff at pluck, as a multiple of note frequency
  filterEndRatio: number;    // Low-pass cutoff at end of decay
  peakGain: number;
  attackSec: number;
  maxSustainSec: number;     // Longest a plucked note rings; shorter written notes stop sooner
}

export interface InstrumentProfile {
  id: InstrumentId;
  name: string;                           // Display name e.g. 'Ukulele'
  stringCount: number;
  tunings: TuningConfig[];                // Selectable tuning presets, in menu order
  defaultTuning: TuningConfig;
  chordLibrary: ChordFretLibrary;
  defaultChordNames: string[];            // Initial composition chord palette
  defaultMaxFretLimit: number;
  maxFret: number;                        // Highest fret on the instrument; transposition range
  importPitchRange: [number, number] | null; // Guitar Pro import folds pitches into this MIDI range by octaves (null = keep original pitch)
  importMaxFret: number;                  // Highest fret the Guitar Pro importer will assign (<= maxFret)
  importKeepsSourceFingering: boolean;    // Matching Guitar Pro tracks (same string count, lowest string within an octave) keep their own tuning, strings and frets
  importTrackKeywords: string[];          // Preferred Guitar Pro track name keywords (lowercase)
  exportMidiProgram: number;              // General MIDI program written to Guitar Pro exports
  synthVoice: SynthVoice;
}

export interface LayoutOptions {
  stemsPlacement: 'below' | 'above'; // Default: 'below'
  zoomScale: number;                 // 0.75 (Compact), 1.0 (Standard), 1.5 (Large)
  measuresPerSystem: number;         // Default: 4 (stored only; row wrapping is driven by available width)
  maxFretLimit: number;              // Default: 12 (user selectable 7..20)
}

// Key signature for standard notation, named by its major tonic (the relative minor shares it)
export type NotationKey = 'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'F#' | 'G' | 'Ab' | 'A' | 'Bb' | 'B';

export interface TabDocument {
  id: string;
  title: string;
  artist: string;
  instrument?: InstrumentId; // Absent in older .uketab files, which are always ukulele
  tempo: number;
  key?: NotationKey;        // Key signature of the sounding music for standard notation; absent = guessed from the chords
  tuning: TuningConfig;
  capo?: number;            // Capo fret 0..12 (absent = 0, no capo); fret numbers are relative to the capo
  layout: LayoutOptions;
  measures: Measure[];
  chordPalette?: ChordMarker[]; // Composition-specific active chord palette
}
