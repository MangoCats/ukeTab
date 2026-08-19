export type DurationType = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export const DURATION_OPTIONS: { label: string; value: DurationType }[] = [
  { label: '1', value: '1/1' },
  { label: '1/2', value: '1/2' },
  { label: '1/4', value: '1/4' },
  { label: '1/8', value: '1/8' },
  { label: '1/16', value: '1/16' }
];

export const DURATION_KEY_MAP: Record<string, DurationType> = {
  'w': '1/1',
  'h': '1/2',
  'q': '1/4',
  'e': '1/8',
  's': '1/16'
};

export interface UkuleleNote {
  id: string;
  string: 1 | 2 | 3 | 4; // 1 = Top line (A4 default), 4 = Bottom line (G4 default)
  fret: number;          // 0 = Open, 1..20 = Fretted
  isGhost?: boolean;     // Visual alternate fret suggestion flag
  isTied?: boolean;      // Continued / sustained note from previous beat without re-strumming
}

export interface ChordMarker {
  name: string; // e.g. "Am", "E7", "G", "C", "F", "Dm"
  frets: [number, number, number, number]; // Strings [4, 3, 2, 1]: -1 = Muted/Unplayed X, 0 = Open O, 1..20 = Fretted Dot
  baseFret?: number; // Optional base fret offset (default 1)
}

export interface BeatColumn {
  id: string;
  duration: DurationType;
  isDotted?: boolean;
  isTriplet?: boolean;
  isRest?: boolean;
  isTied?: boolean; // When true, sustains into the next beat without re-strumming (Continued Note)
  notes: UkuleleNote[];
  chord?: ChordMarker | null; // Optional Ukulele Chord Diagram attached above beat (null = explicitly cleared None)
  lyric?: string;
}

export interface Measure {
  id: string;
  index: number;
  timeSignature: [number, number]; // e.g. [4, 4], [3, 4], [6, 8]
  beats: BeatColumn[];
}

export type TuningPresetKey = 'gCEA' | 'GCEA' | 'DGBE' | 'aDF#B' | 'custom';

export interface TuningConfig {
  key: TuningPresetKey;
  name: string;
  pitches: number[];         // MIDI note values for strings 1, 2, 3, 4
  stringsDisplay: string[];  // Label names e.g. ['A4', 'E4', 'C4', 'g4']
}

export interface LayoutOptions {
  stemsPlacement: 'below' | 'above'; // Default: 'below'
  zoomScale: number;                 // 0.75 (Compact), 1.0 (Standard), 1.5 (Large)
  measuresPerSystem: number;         // Default: 4
  maxFretLimit: number;              // Default: 12 (user selectable 7..20)
}

export interface UkuleleTabDocument {
  id: string;
  title: string;
  artist: string;
  tempo: number;
  keySignature: string;
  tuning: TuningConfig;
  layout: LayoutOptions;
  measures: Measure[];
  chordPalette?: ChordMarker[]; // Composition-specific active chord palette
}
