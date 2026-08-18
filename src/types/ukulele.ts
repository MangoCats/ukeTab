export type DurationType = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface UkuleleNote {
  id: string;
  string: 1 | 2 | 3 | 4; // 1 = Top line (A4 default), 4 = Bottom line (G4 default)
  fret: number;          // 0 = Open, 1..20 = Fretted
  isGhost?: boolean;     // Visual alternate fret suggestion flag
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
  isTied?: boolean; // When true, sustains into the next beat without re-strumming
  notes: UkuleleNote[];
  chord?: ChordMarker; // Optional Ukulele Chord Diagram attached above beat
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
  measuresPerSystem: number;         // 2..6 measures per system line
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
