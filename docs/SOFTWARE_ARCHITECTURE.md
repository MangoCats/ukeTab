# UkeTab - Software Architecture Document

## 1. System Overview & Technology Stack

**UkeTab** is designed as a client-side modern web application. It runs efficiently in web browsers, providing low-latency WYSIWYG editing, real-time audio playback, vector printing/PDF generation, and file import/export.

```
+-------------------------------------------------------------------------+
|                              UkeTab UI Layer                            |
|    +--------------------+  +-------------------+  +----------------+    |
|    |  WYSIWYG Editor    |  | Toolbar & Controls|  | PDF/Export UI  |    |
|    +--------------------+  +-------------------+  +----------------+    |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                        Application Logic & State                        |
|   +-----------------------------------------------------------------+   |
|   |                      UkuleleTab Document State                   |   |
|   +-----------------------------------------------------------------+   |
|     |                     |                    |                   |    |
|  +--v-------------+  +----v-----------+  +-----v-----------+  +----v--+ |
|  | Transposition  |  | Alternate Fret |  | Layout & Zoom   |  | Play- | |
|  |    Engine      |  |    Solver      |  |     Engine      |  | head  | |
|  +----------------+  +----------------+  +-----------------+  +-------+ |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                           Core Subsystems                               |
|  +------------------+  +------------------+  +-----------------------+  |
|  | SVG Vector Render|  | Web Audio Synth  |  | Import/Export (PDF,   |  |
|  |     Pipeline     |  |     Engine       |  |  MIDI, .uketab JSON)  |  |
|  +------------------+  +------------------+  +-----------------------+  |
+-------------------------------------------------------------------------+
```

### Technology Stack
- **Framework**: React 18+ with TypeScript (Type-safe domain modeling for music theory & rendering).
- **Build Tool**: Vite (Lightning-fast dev server and optimized production bundles).
- **Rendering Engine**: Custom SVG Vector Engine (Continuous staff systems, traditional vertically stacked time signatures, ukulele chord diagram charts, crisp at any print zoom level).
- **Audio Engine**: Web Audio API (Low-latency audio synthesizer with acoustic ukulele pluck ADSR envelope & metronome click generator).
- **Print & PDF Engine**: Browser High-DPI Vector Printing Engine with automatic web UI stripping, large 28pt song title header, and zero-whitespace system layout.
- **MIDI Processing**: `@tonejs/midi` (Binary MIDI parsing, pitch solver, and automatic Ukulele tab generation).

---

## 2. Core Domain Data Model

The domain model represents the hierarchical structure of a ukulele tab document:

```typescript
export type DurationType = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface UkuleleNote {
  id: string;
  string: 1 | 2 | 3 | 4; // 1 = A4 (Top), 4 = G4 (Bottom)
  fret: number;          // 0 = Open, 1..20 = Fretted
  isGhost?: boolean;     // Rendered for alternate fret suggestions
}

export interface ChordMarker {
  name: string; // e.g. "Am", "E7", "G", "C", "F", "Dm"
  frets: [number, number, number, number]; // Strings [4, 3, 2, 1]: -1 = Muted X, 0 = Open O, 1..20 = Fretted Dot
  baseFret?: number; // Optional base fret offset (default 1)
}

export interface BeatColumn {
  id: string;
  duration: DurationType;
  isDotted?: boolean;
  isTriplet?: boolean;
  isRest?: boolean;
  isTied?: boolean;
  notes: UkuleleNote[];
  chord?: ChordMarker | null;
  lyric?: string;
}

export interface Measure {
  id: string;
  index: number;
  timeSignature: [number, number]; // e.g. [4, 4], [3, 4]
  beats: BeatColumn[];
}

export interface TuningConfig {
  key: TuningPresetKey;
  name: string;
  pitches: number[]; // MIDI note numbers for strings [1, 2, 3, 4]
  stringsDisplay: string[];
}

export interface LayoutOptions {
  stemsPlacement: 'below' | 'above'; // Default: 'below'
  zoomScale: number;                 // 0.75 | 1.0 | 1.5
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
  chordPalette?: ChordMarker[];
}
```

---

## 3. Key Algorithmic Engines

### 3.1 Transposition & Tuning Shift Solver
When the user shifts the song key by $N$ semitones or changes string tuning (e.g. High-G to Low-G or Baritone):

```typescript
export function transposePitches(
  notes: UkuleleNote[],
  semitoneShift: number,
  tuning: TuningConfig
): UkuleleNote[] {
  return notes.map(note => {
    const currentPitch = calculatePitch(note.string, note.fret, tuning);
    const newPitch = currentPitch + semitoneShift;
    const newFret = newPitch - tuning.pitches[note.string - 1];

    if (newFret >= 0 && newFret <= 20) {
      return { ...note, fret: newFret };
    }
    return { ...note, fret: Math.max(0, Math.min(20, newFret)) };
  });
}
```

### 3.2 Alternate Fret Fingering Helper Engine
When a note is placed on string $s$ at fret $f$, the system calculates alternate frets on unassigned strings:

$$\text{Pitch } P = \text{Tuning}[s - 1] + f$$

For each unassigned string $s' \in \{1, 2, 3, 4\} \setminus \{s\}$:

$$f' = P - \text{Tuning}[s' - 1]$$

If $0 \le f' \le \text{maxFretLimit}$ (default 12), string $s'$ receives a ghost note option. Clicking the ghost note converts it into an active note.

### 3.3 Ukulele Chord Diagram Engine
Maps chord names (`Am`, `E7`, `G`, `C`, `F`, `Dm`, etc.) to 4-string fret arrays `[f4, f3, f2, f1]`. Renders mini 4-string vertical fingering charts directly above the staff line with filled dots (frets), open circles `○` (open strings), and `✕` (muted strings).

### 3.4 Dynamic Zoom-Aware System Row Wrapping Engine
Calculates total horizontal measure widths against printable page width boundaries (`820px`). When a measure overruns the margin threshold, it wraps onto a new continuous system row starting with its own clef string header and time signature.

### 3.5 MIDI File Import Engine (`midiImporter.ts`)
Decodes binary `.mid` files using `@tonejs/midi`. Extracts tempos, time signatures, and note pitch streams. Transposes pitches into High-G range ($C_4$ to $A_5$), solves 4-string fret assignments, and auto-detects matching chord diagrams.

---

## 4. Audio Playback & Playhead Subsystem

- **Web Audio Engine**: Uses an oscillator array with high-frequency dampening to simulate acoustic ukulele string plucking, plus an impulse oscillator for metronome clicks.
- **Audio Clock Scheduling**: Audio events are scheduled using `window.setTimeout` synced to document tempo and playback speed multiplier (`0.5x`–`1.25x`).
- **Visual Playhead**: Driven by active beat state updates to highlight the current beat column in real time without UI stutter.

---

## 5. Multi-Format Export & Import Architecture

1. **Clean Sheet Music PDF Engine**:
   - Renders a large 28pt song title header, artist name, and tuning/tempo metadata.
   - Strips all web editor controls, toolbars, popover bars, selection rings, and red **✕** deletion badges in print mode.
2. **JSON Serializer & Importer (`.uketab`)**:
   - `Save .uketab`: Exports full document state to compact `.uketab` JSON file.
   - `Open .uketab`: File input handler reading `.uketab` JSON files via FileReader, updating document state instantly.
3. **MIDI Importer (`.mid` / `.midi`)**:
   - `Open MIDI`: File input handler reading `.mid` files via `@tonejs/midi`, generating complete draft Ukulele tab charts automatically.
