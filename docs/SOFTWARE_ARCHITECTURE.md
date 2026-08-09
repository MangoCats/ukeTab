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
- **Rendering Engine**: Custom SVG Vector Engine (Scalable, responsive, crisp at any print zoom level).
- **Audio Engine**: Web Audio API (Low-latency audio synthesis with custom Ukulele pluck ADSR envelope & sample buffers).
- **PDF Generation**: `jsPDF` + `svg2pdf.js` (Vector-based PDF generation directly from SVG DOM trees).
- **MIDI Processing**: `@tonejs/midi` (Binary MIDI parsing and generation).

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

export interface BeatColumn {
  id: string;
  duration: DurationType;
  isDotted?: boolean;
  isTriplet?: boolean;
  isRest?: boolean;
  notes: UkuleleNote[];
  lyric?: string;
}

export interface Measure {
  id: string;
  index: number;
  timeSignature: [number, number]; // e.g. [4, 4], [3, 4]
  beats: BeatColumn[];
}

export interface TuningConfig {
  name: string;
  pitches: number[]; // MIDI note numbers for strings [1, 2, 3, 4]
  isCustom?: boolean;
}

export interface LayoutOptions {
  stemsPlacement: 'below' | 'above'; // Default: 'below', user configurable
  zoomPreset: 'compact' | 'standard' | 'large';
  zoomScale: number; // 0.75 | 1.0 | 1.5
  measuresPerSystem: number; // 2..6
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
}
```

---

## 3. Key Algorithmic Engines

### 3.1 Transposition & Tuning Shift Solver
When the user shifts the song key by $N$ semitones or changes string tuning (e.g. High-G to Low-G or Baritone):

```typescript
export function transposeNote(
  note: UkuleleNote,
  currentTuning: TuningConfig,
  targetTuning: TuningConfig,
  semitoneShift: number
): UkuleleNote | null {
  const currentPitch = currentTuning.pitches[note.string - 1] + note.fret;
  const targetPitch = currentPitch + semitoneShift;
  const newFret = targetPitch - targetTuning.pitches[note.string - 1];

  if (newFret >= 0 && newFret <= 20) {
    return { ...note, fret: newFret };
  }
  // If fret exceeds range on current string, solver searches adjacent strings
  return findClosestStringForPitch(targetPitch, targetTuning);
}
```

### 3.2 Alternate Fret Fingering Helper Engine
When a note is placed on string $s$ at fret $f$, the system calculates alternate frets on unassigned strings:

$$\text{Pitch } P = \text{Tuning}[s - 1] + f$$

For each unassigned string $s' \in \{1, 2, 3, 4\} \setminus \{s\}$:

$$f' = P - \text{Tuning}[s' - 1]$$

If $0 \le f' \le 15$, string $s'$ receives a ghost note option. Clicking the ghost note converts it into an active note and removes the original note from string $s$.

---

## 4. Audio Playback & Playhead Subsystem

- **Web Audio Engine**: Uses an oscillator array with high-frequency dampening to simulate string plucking, or pre-rendered acoustic ukulele sample buffers.
- **Audio Clock Scheduling**: Audio events are scheduled using `AudioContext.currentTime` for precise millisecond-level timing.
- **Visual Playhead**: Driven by `requestAnimationFrame` reading the active audio playback offset to highlight the current beat column in real time without lag or UI stutter.

---

## 5. Multi-Format Export & Import Architecture

1. **PDF Generator Module (`/src/io/pdfExporter.ts`)**:
   - Converts SVG staff systems into high-DPI vector PDF pages.
   - Dynamic scaling presets (Compact 75%, Standard 100%, Large 150%) automatically recalculate measures-per-line and system spacing before export.
2. **MIDI Import/Export Module (`/src/io/midiHandler.ts`)**:
   - Converts beat events and pitches to `.mid` binary tracks.
   - Imports `.mid` files using a minimal-hand-displacement greedy algorithm to place MIDI notes onto optimal ukulele strings and frets.
3. **JSON Serializer (`/src/io/jsonHandler.ts`)**:
   - Schema validation and versioned parsing for `.uketab` files.
