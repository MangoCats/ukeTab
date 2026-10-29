# UkeTab Software Architecture

This document describes how UkeTab is built. The user-visible behaviour is specified in the [Product Specification](PROJECT_SPECIFICATION.md); section references of the form "Spec §n" point there.

## 1. Overview & Technology Stack

UkeTab is a client-only single-page application. There is no server: documents live in React state, are saved and loaded as local files, and print through the browser.

```
+---------------------------------------------------------------------------+
| UI (React components)                                                      |
|  EditorToolbar | TabRenderer (SVG staff + popover) | InspectorPanel        |
|  ChordPaletteModal | DuplicateMeasuresModal | ChordDiagram | ShortcutHelp  |
|  NotationPrint (alphaTab SVG, print only)                                  |
+---------------------------------------------------------------------------+
| App.tsx: document state, selection, playback loop, keyboard shortcuts,    |
|          edit handlers                                                     |
+---------------------------------------------------------------------------+
| Domain logic                                                               |
|  instruments/ (profiles) | utils/musicTheory | utils/documentEdits        |
|  utils/notationLayout | utils/playbackTiming | utils/shortcuts            |
|  utils/audioSynth | utils/guitarProImporter | utils/guitarProExporter     |
|  utils/musicKeys | utils/alphaTabScore | utils/notationRender            |
|  utils/sampleData                                                         |
+---------------------------------------------------------------------------+
| Platform: React 18, SVG, Web Audio API, CSS print media, FileReader,      |
|           @coderline/alphatab (Guitar Pro I/O, standard notation)         |
+---------------------------------------------------------------------------+
```

| Concern | Technology |
|---|---|
| UI | React 18, TypeScript 5 (strict), lucide-react icons |
| Notation | Tab: hand-written SVG. Standard notation for printing: alphaTab's SVG renderer (§8.3) |
| Styling | `src/index.css`: a hand-written subset of Tailwind-style utility classes plus print rules. Tailwind itself is **not** installed; a class missing from `index.css` has no effect. |
| Audio | Web Audio API oscillators |
| Guitar Pro | `@coderline/alphatab` 1.8 (`ScoreLoader.loadScoreFromBytes`, `Gp7Exporter`) |
| Build / dev server | Vite 5 (`npm run dev` serves on port 3000) |
| Tests | Vitest 4 with jsdom and Testing Library |

---

## 2. Source Layout

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Mounts `<App/>` and loads `index.css` |
| `src/App.tsx` | Owns all application state; playback scheduler (notes and metronome clicks); keyboard dispatch via `findShortcut`; edit handlers that apply `documentEdits` operations and manage selection; file downloads; print flow, header and footer |
| `src/types/tab.ts` | Domain types and duration constants (§3) |
| `src/instruments/ukulele.ts`, `guitar.ts`, `bass.ts` | Instrument profiles: tunings, chord libraries, default palettes, import and synth settings (§4) |
| `src/instruments/index.ts` | Profile registry, `getInstrumentProfile`, menu order `INSTRUMENT_LIST` |
| `src/utils/musicTheory.ts` | Pitch maths, alternate frets, transposition, chord lookup/detection, palette resolution, beat durations (§5) |
| `src/utils/documentEdits.ts` | Pure, non-mutating document edit operations (notes, chords, beats, measures, time signatures, transposition) with an injectable id factory (§5.7) |
| `src/utils/notationLayout.ts` | Pure notation layout decisions: flag counts, beat groups, beams and stubs, triplet groups, where time signatures show (§6.1) |
| `src/utils/playbackTiming.ts` | Pure playback timing: measure length, column offsets, written note length, metronome click offsets (§7) |
| `src/utils/shortcuts.ts` | The keyboard shortcut table `SHORTCUTS`, `findShortcut` and two-digit fret entry (§9) |
| `src/utils/audioSynth.ts` | Pluck, muted-click and metronome synthesis (§7) |
| `src/utils/guitarProImporter.ts` | Guitar Pro → `TabDocument` conversion (§8.2) |
| `src/utils/guitarProExporter.ts` | `TabDocument` → Guitar Pro 7 bytes, download file names (§8.4) |
| `src/utils/musicKeys.ts` | Notation keys: signatures, labels, transposition, chord qualities, key guessing (§5.8) |
| `src/utils/alphaTabScore.ts` | `TabDocument` → alphaTab score for standard notation and export: grand staff or instrument staff, clefs, spelling, ties (§8.3) |
| `src/utils/notationRender.ts` | alphaTab print settings and synchronous SVG rendering (§8.3) |
| `src/utils/sampleData.ts` | Built-in sample songs and `createBlankTabDocument(profile)` |
| `src/components/EditorToolbar.tsx` | Title/artist, action buttons, instrument and Export PDF menus, settings row (including Key), file inputs |
| `src/components/NotationPrint.tsx` | Print-only standard notation: renders the alphaTab SVG parts and the music font CSS (§8.3) |
| `src/components/TabRenderer.tsx` | Staff SVG per measure, rhythm, rests, beams, ghost notes, chord diagrams, floating popover |
| `src/components/InspectorPanel.tsx` | Bottom inspector (beat actions, lyric, measure time signature, chord editing, fret pad, alternate frets) |
| `src/components/ChordDiagram.tsx` | Chord diagram SVG and `getChordDiagramWidth` |
| `src/components/ChordPaletteModal.tsx` | Palette selection and custom chord creation |
| `src/components/DuplicateMeasuresModal.tsx` | Start/end range dialog for measure duplication |
| `src/components/ShortcutHelp.tsx` | Help panel listing every `SHORTCUTS` entry |
| `src/index.css` | Utility classes, component styles, `@media print` rules (§8.3) |
| `src/testSetup.ts` | Vitest setup: reports "no 2D canvas" in jsdom instead of logging "Not implemented" (§10) |

---

## 3. Domain Data Model (`src/types/tab.ts`)

```typescript
export type DurationType = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface TabNote {
  id: string;
  string: number;        // 1 = top line .. N = bottom line (N = tuning.pitches.length)
  fret: number;          // -1 = Muted (X), 0 = Open, 1+ = Fretted (editor input up to 20; Guitar Pro import up to the profile's importMaxFret; transposition up to its maxFret)
  isGhost?: boolean;     // Alternate fret suggestion (never stored in documents)
  isTied?: boolean;      // Continues from the previous beat
}

export interface ChordMarker {
  name: string;
  frets: number[];       // One entry per string, bottom line first [N, ..., 1]
  baseFret?: number;
}

export interface BeatColumn {
  id: string;
  duration: DurationType;
  isDotted?: boolean;
  isTriplet?: boolean;
  isRest?: boolean;
  isTied?: boolean;              // Column is not re-sounded in playback
  notes: TabNote[];
  chord?: ChordMarker | null;    // undefined = never set (auto-detect allowed); null = explicitly cleared
  lyric?: string;
}

export interface Measure {
  id: string;
  index: number;                     // 1-based
  timeSignature: [number, number];
  beats: BeatColumn[];
}

export type UkuleleTuningKey = 'gCEA' | 'GCEA' | 'DGBE' | 'aDF#B';
export type GuitarTuningKey = 'EADGBE' | 'DADGBE' | 'EbAbDbGbBbEb' | 'DGDGBD' | 'DADF#AD' | 'DADGAD';
export type BassTuningKey = 'EADG' | 'DADG' | 'EbAbDbGb' | 'BEAD';
export type TuningPresetKey = UkuleleTuningKey | GuitarTuningKey | BassTuningKey | 'custom';

export interface TuningConfig {
  key: TuningPresetKey;
  name: string;
  pitches: number[];         // MIDI note per string, String 1 first; length = string count
  stringsDisplay: string[];  // Labels, String 1 first
}

export interface LayoutOptions {
  stemsPlacement: 'below' | 'above';
  zoomScale: number;         // 0.75 | 1.0 | 1.5
  measuresPerSystem: number; // Stored only; not used by layout
  maxFretLimit: number;      // 7 | 10 | 12 | 15 | 20
}

export interface TabDocument {
  id: string;
  title: string;
  artist: string;
  instrument?: InstrumentId; // Missing in pre-instrument files = 'ukulele'
  capo?: number;             // 0–12; frets are relative to it; missing = 0
  tempo: number;
  key?: NotationKey;         // Notation key of the sounding music; missing = guessed from the chords (§5.8)
  tuning: TuningConfig;
  layout: LayoutOptions;
  measures: Measure[];
  chordPalette?: ChordMarker[];
}
```

`NotationKey` is `'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'F#' | 'G' | 'Ab' | 'A' | 'Bb' | 'B'`, a key signature named by its major tonic. Files from before notation keys may contain a `keySignature` string; `App.handleImportJson` drops it.

`DURATION_OPTIONS` (`1/1` … `1/32`) drives the popover duration buttons. `DURATION_KEY_MAP` maps `w h q e s d` to `1/1` … `1/32`.

**Invariant**: the string count is always `tuning.pitches.length`. Rendering, alternate frets, chord extraction and the importer's string solver read it from the tuning. Profile-level code (default chord markers, palette window) uses `profile.stringCount`. Both agree because every preset of a profile has `stringCount` pitches (enforced by tests), and a custom tuning is only created when its length equals `stringCount`.

---

## 4. Instrument Profiles (`src/instruments/`)

```typescript
export type InstrumentId = 'ukulele' | 'guitar' | 'bass';
export type ChordFretLibrary = Record<string, number[]>; // name -> frets, bottom line first

export interface SynthVoice {
  oscillatorType: OscillatorType;
  filterStartRatio: number;  // Low-pass cutoff at pluck, × note frequency
  filterEndRatio: number;    // Low-pass cutoff at end of decay, × note frequency
  peakGain: number;
  attackSec: number;
  maxSustainSec: number;     // Longest a note rings; shorter written notes stop sooner
}

export interface InstrumentProfile {
  id: InstrumentId;
  name: string;
  stringCount: number;
  tunings: TuningConfig[];                   // Tuning menu presets, menu order
  defaultTuning: TuningConfig;
  chordLibrary: ChordFretLibrary;            // Shapes for defaultTuning (adapted per document, see below)
  defaultChordNames: string[];               // Default palette
  defaultMaxFretLimit: number;
  maxFret: number;                           // Highest fret on the instrument; transposition range
  importPitchRange: [number, number] | null; // Octave-folding range for re-voiced imports
  importMaxFret: number;                     // <= maxFret
  importKeepsSourceFingering: boolean;
  importTrackKeywords: string[];             // Lowercase track-name keywords
  exportMidiProgram: number;                 // General MIDI program (0-based) of Guitar Pro exports
  synthVoice: SynthVoice;
}
```

| Field | Ukulele | Guitar | Bass |
|---|---|---|---|
| `stringCount` | 4 | 6 | 4 |
| `tunings` | gCEA, GCEA, DGBE, aDF#B | EADGBE, DADGBE, EbAbDbGbBbEb, DGDGBD, DADF#AD, DADGAD | EADG, DADG, EbAbDbGb, BEAD |
| `defaultTuning` | gCEA `[69,64,60,67]` | EADGBE `[64,59,55,50,45,40]` | EADG `[43,38,33,28]` |
| `chordLibrary` | 56 entries | 47 entries | 8 entries |
| `defaultMaxFretLimit` | 12 | 12 | 12 |
| `maxFret` | 20 | 24 | 24 |
| `importPitchRange` | `[60, 84]` | `[40, 88]` | `[28, 55]` |
| `importMaxFret` | 15 | 24 | 24 |
| `importKeepsSourceFingering` | true | true | true |
| `importTrackKeywords` | guitar, ukulele, acoustic | guitar, acoustic | bass |
| `exportMidiProgram` | 24 | 25 | 33 |
| `synthVoice` (type, start, end, gain, attack, max sustain) | triangle, 3.5, 0.4, 0.4, 0.008 s, 1.5 s | sawtooth, 5, 0.6, 0.22, 0.004 s, 3 s | sawtooth, 8, 1.0, 0.35, 0.006 s, 3 s |

The full preset list with names and labels is in Spec §3.1.

**Resolution**: `getInstrumentProfile(document.instrument)` returns the profile, or ukulele when the id is missing or unknown. `App` computes the document's profile once per render. Components call `getInstrumentProfile(document.instrument)` themselves.

**Tuning-adapted profiles**: chord work uses `getDocumentProfile(doc)` = `getTuningProfile(getInstrumentProfile(doc.instrument), doc.tuning)`. `getTuningProfile(profile, tuning)` returns the profile itself when the tuning's pitches equal `defaultTuning`'s, otherwise a copy whose `chordLibrary` is adapted with `adaptChordFrets(frets, defaultTuning, tuning)` (§5.5). The copy is memoised per profile object (WeakMap) and tuning pitches, so it is stable across renders. `App` (`profile`, `profileOf`, file open), `InspectorPanel`, `TabRenderer`, the chord palette window and the Guitar Pro importer (after resolving the tuning) use it; synth and import settings are the same as the base profile.

**Profile-aware functions** (the profile parameter defaults to ukulele, so older call sites keep their behaviour):
- in `musicTheory`: `getDefaultChordPalette`, `getEffectiveChordPalette`, `getChordPreset`, `findExistingChordsByFrets`, `autoDetectChordFromBeatNotes`, `createChordMarker`;
- in `documentEdits`: `assignChordOnSelect`, `addNote`, `removeNote`, `transposeDocument` (uses `maxFret`), `convertInstrument` (target profile);
- `buildAlphaTabScore` (instrument name and `exportMidiProgram`), `convertGpChord`;
- `createBlankTabDocument`;
- `parseGuitarProToTab`, `selectImportTrack`, `isCompatibleSourceTuning`, `resolveSourceTuning`;
- `playBeatChord` / `playPluck`, which take a `SynthVoice`.

**Compatibility aliases**: `musicTheory.ts` re-exports `TUNING_PRESETS` (= `UKULELE_TUNINGS`, which also contains a `custom` entry), `UKULELE_CHORD_LIBRARY` and `DEFAULT_COMPOSITION_CHORD_NAMES`.

**Adding an instrument**:
1. Create `src/instruments/<name>.ts` with tunings, a chord library and a profile.
2. Add its id to `InstrumentId` and its tuning keys to `TuningPresetKey`.
3. Register it in `INSTRUMENT_PROFILES` and `INSTRUMENT_LIST`.
4. Add tests using `chordSpelling.testUtil.ts`.

No renderer or editor changes are needed.

---

## 5. Algorithms (`src/utils/musicTheory.ts`)

### 5.1 Pitch
`calculatePitch(string, fret, tuning) = tuning.pitches[string − 1] + fret`, or −1 for a muted note. `midiToNoteName` uses sharps and scientific octave numbering (MIDI 60 = `C4`).

`getSoundingTuning(doc)` returns `doc.tuning` when there is no capo, otherwise a copy (same key, name and labels) with every pitch raised by `doc.capo`. Sounding pitch = `calculatePitch(string, fret, getSoundingTuning(doc))`; it is used for playback, the inspector pitch display, instrument conversion and standard notation. Everything relative to the fingering (alternate frets, chord shapes and detection, transposition string choice) uses `doc.tuning`.

`assignNotesToStrings(pitches, tuning, maxFret, { pitchRange?, usedStrings? })` → `({ string, fret } | null)[]` (input order) folds each pitch by octaves into `pitchRange` (if given), then searches every way to put the pitches on distinct unused strings at frets `0 … maxFret` (each pitch may also stay unplaced) and keeps the one that places the most pitches, then has the smallest span between fretted (> 0) frets, then the lowest total fret; ties keep the first found (lower strings, in pitch order). An unplaced pitch goes on the first unused string with its fret clamped, else `null`. Strings in `usedStrings` are never chosen. It is shared by the Guitar Pro re-voice path and `convertInstrument`, which both claim muted notes' strings through `usedStrings` first.

### 5.2 String Numbers
`getStringNumbers(n)` returns `[1 … n]`. Every per-string loop (staff lines, labels, note cells, solver candidates) iterates it.

### 5.3 Alternate Frets
`getAlternateFretSuggestions(notes, tuning, maxFretLimit)`:
- For each non-muted note with pitch P, and each string s′ that has no note in the column, the candidate fret is `f′ = P − tuning.pitches[s′ − 1]`.
- A ghost note is produced when `0 ≤ f′ ≤ maxFretLimit`.
- Results are not de-duplicated per string; the renderer shows the first suggestion found for each string.

### 5.4 Transposition
`transposeBeatNotes(notes, shift, tuning, maxFret): { notes, inexactCount }` transposes one beat's notes, keeping exact pitch where possible:
1. Muted notes are unchanged and keep their string.
2. Each other note whose `fret + shift` is in `0 … maxFret` keeps its string (`transposeDocument` passes `maxFret = max(0, profile.maxFret − capo)`).
3. Each remaining note, in beat order, moves to a string not used by any note already placed in the beat (muted notes count), choosing the lowest valid fret for its exact new pitch; ties go to the lower string number.
4. A note no free string can play is kept on its own string, clamped to `0 … maxFret`, and counted in `inexactCount`. Such a note's string is reserved before placement is redone, so two notes never share a string.

Note ids and `isTied` are kept; a note is inexact when its final pitch differs from its original pitch plus the shift. `transposePitches(notes, shift, tuning, maxFret = 20)` remains as `transposeBeatNotes(...).notes`.

Chord markers are transposed separately (`documentEdits.transposeDocument`):
- `transposeChordName(name, semitones)`: root `[A-G][#b]?` and optional slash bass are moved and spelled from `C C# D Eb E F F# G Ab A Bb B`; the suffix is kept; unparseable names are returned unchanged.
- `transposeChordMarker(marker, semitones, profile)`: the new name's library preset (case-insensitive, from the tuning-adapted profile) if one exists, keeping the transposed name; otherwise every non-muted fret + `semitones`, all non-muted + 12 if any is negative; `baseFret` recomputed.

### 5.5 Chord Lookup, Detection & Base Fret
- `extractChordFrets(notes, stringCount)` returns `[fret(N) … fret(1)]` from non-ghost notes when every string has a note, else `null`.
- `findExistingChordsByFrets(frets, custom, profile)` returns the names in `{...profile.chordLibrary, ...custom}` with an identical fret array (same length, same values).
- `autoDetectChordFromBeatNotes(notes, palette, profile)` extracts the column's frets and takes the first matching name. It returns the palette's marker of that name if there is one, else the library preset, else a new marker.
- **Base fret** (`getChordPreset`, `createChordMarker`): an explicit `baseFret` wins. Otherwise, if the highest fretted value exceeds 4, use the lowest fretted value; otherwise use 1.
- `createChordMarker(name)` with no frets returns the library preset, or an all-open marker with `profile.stringCount` entries.
- `adaptChordFrets(frets, fromTuning, toTuning)`: for each string, `d = ((from − to) mod 12)`, used as `d − 12` when `d > 6` (so −5 … +6); muted frets stay −1. Then the whole shape moves +12 if any played fret is negative, or −12 if every played fret is ≥ 12. Shapes whose length differs from either tuning are returned unchanged. Adapting to another tuning and back returns the original shape (tested for every library chord and tuning).
- **Palette resolution**: `getEffectiveChordPalette(palette, profile)` returns the palette if it is non-empty, else the presets for `profile.defaultChordNames`.
- **Edit operations** (§5.7): `assignChordOnSelect` auto-detects only when `chord === undefined`. `addNote` auto-detects unless `chord === null`, and keeps the old chord when nothing matches. `removeNote` uses the detected chord, else unsets the chord when fewer notes than strings remain.

### 5.6 Beat Duration
`getBeatDurationMs(beat, tempo, speed) = (60000 / tempo) × m × (1.5 if dotted) × (2/3 if triplet) / speed`, with m = 4, 2, 1, 0.5, 0.25, 0.125 for `1/1` … `1/32`.

### 5.7 Document Edit Operations (`src/utils/documentEdits.ts`)
Every change to a document goes through a pure function that returns a new document and never mutates its input. `App.tsx` applies them with `setDocument(prev => op(prev, ...))` and handles selection itself. Functions that create beats, measures or notes take an optional `IdFactory` (`prefix => id`; the default combines time, a counter and random characters), so tests can supply predictable ids.

| Operation | Behaviour |
|---|---|
| `assignChordOnSelect(doc, beatId, profile)` | Auto-detects a chord for a beat whose chord is `undefined` |
| `addNote(doc, beatId, string, fret, profile)` | Replaces the note on that string, clears the rest flag, **keeps the beat's duration**, re-detects the chord unless it is `null` |
| `removeNote(doc, beatId, string, profile)` | Removes the note on that string and updates the chord (§5.5) |
| `insertBeatAfter(doc, afterBeatId, duration, { isRest })` | Inserts an empty beat or rest after a beat in the same measure; returns `{ document, beatId }` |
| `toggleRest`, `toggleTriplet`, `toggleTie` | Flip the flag; making a beat a rest removes its notes |
| `setBeatChord`, `setBeatDuration`, `setBeatLyric`, `setChordPalette` | Set the value; `setBeatDuration` keeps the dot unless one is given |
| `deleteBeat(doc, beatId)` | Removes the beat; an emptied measure is removed and measures renumbered; the last beat of the last measure becomes one empty quarter beat |
| `transposeDocument(doc, semitones, profile)` | Applies `transposeBeatNotes` with `profile.maxFret` to every beat and `transposeChordMarker` to every non-null beat chord and palette entry, and moves a set `key` by `semitones` (`transposeKey`); returns `{ document, inexactCount }` (App alerts when the count is above 0) |
| `retuneDocument(doc, newTuning)` | Sets the tuning; notes keep their frets; every non-null beat chord and palette entry is re-fingered with `adaptChordFrets(old → new)` and its base fret recomputed (used by the toolbar Tuning menu) |
| `setMeasureTimeSignature(doc, measureId, [num, den])` | Sets one measure's time signature when `num` is an integer 1–16 and `den` ∈ {1, 2, 4, 8, 16, 32}; otherwise returns the document unchanged; beats are untouched |
| `setCapo(doc, capo)` | Sets the capo when it is an integer `0 … MAX_CAPO` (12); otherwise returns the document unchanged; frets and chords are untouched; a set `key` moves by the capo change |
| `setKey(doc, key)` | Sets `key` to a `NotationKey`; `undefined` or any other value removes the field (guessing) |
| `convertInstrument(doc, target)` | Returns `{ document, droppedCount }`: target id, default tuning, capo 0, target default Max Fret Limit; muted notes keep their string if it exists (claimed first), sounding notes (pitch from `getSoundingTuning`) are placed with `assignNotesToStrings(…, target.importMaxFret, { pitchRange: target.importPitchRange, usedStrings })`; unplaced notes are dropped and counted; ids, ties and order are kept; ghost notes are discarded. Beat and palette chords are renamed with `transposeChordName(name, capo)` (the sounding chord, as the result has no capo), then map by name to target presets, else `undefined`; `null` stays; the palette keeps target presets (deduplicated) or falls back to the target default palette; `key` is kept |
| `addMeasure(doc)` | Appends a measure with the last measure's time signature (4/4 for an empty song) and `num` empty beats of the duration matching `den` |
| `duplicateMeasureRange(doc, start, end)` | Copies the clamped 1-based range with fresh ids and appends it |

### 5.8 Notation Keys (`src/utils/musicKeys.ts`)
- `NOTATION_KEYS` lists one key per pitch class (index = pitch class); `KEY_SIGNATURE_ACCIDENTALS` gives each key's sharps (positive) or flats (negative), with `(accidentals × 7) mod 12` = the tonic's pitch class. `getKeyName` (`G major / E minor`), `getKeyLabel` (adds `(1♯)`, `(2♭)` or `(no ♯/♭)`), `transposeKey`, `isNotationKey`.
- `parseChordQuality(name)` → `{ root, quality } | null`: root from `^[A-G][#b]?`; the rest of the name before any `/` is `diminished` if it starts with `dim`, `°`, `m7b5` or `ø`, `minor` if it starts with `m` not followed by `aj`, `neutral` if it starts with `5` or `sus`, else `major`.
- `guessKeyFromChords(names)` (Spec §3.1.2): parses the names, drops unparseable ones, merges consecutive repeats; returns `null` if none remain. For each key (in `NOTATION_KEYS` order) the score is the number of chords whose degree `(root − tonic) mod 12` is in `{0: major, 2: minor, 4: minor, 5: major, 7: major, 9: minor, 11: diminished}` with that quality or `neutral`, plus 0.5 each when the first and last chords are tonic chords (degree 0 major/neutral, or degree 9 minor/neutral). A later key replaces the best only with a higher score, or an equal score and fewer accidentals.
- `getSoundingChordNames(doc)`: every beat chord's name in order, `transposeChordName(name, capo)`.
- `getNotationKey(doc)` → `{ key, isGuessed }`: `doc.key` if valid, else the guess from the sounding names, else `C`.

---

## 6. Rendering (`TabRenderer.tsx`, `ChordDiagram.tsx`)

### 6.1 Structure & Geometry
Each measure is its own `<svg>` inside a `div.measure-svg-block`. The blocks sit in a flex-wrap container (`.tab-canvas-wrapper`), so rows wrap by available width. There is no fixed page-width constant and no per-row header logic; `layout.measuresPerSystem` is not used.

All sizes below are multiplied by `zoom = layout.zoomScale`.

| Quantity | Value |
|---|---|
| String line spacing | 24 |
| Beat column width | 62 |
| Measure padding (each side) | 15 |
| String-label header (first measure only) | 60 |
| Time signature width (measures that show one) | 32 |
| Chord space above staff (when any beat has a chord) | 78 |
| Top margin | 42 (stems below) or 60 (stems above), plus chord space |
| Bottom margin | 50 (stems below) or 28 (stems above) |
| Stem | from 6 to 36 beyond the outer string line, on the stem side |
| Beams | level 1 at the stem end; each further level 6 closer to the staff; stub length 16 |
| Flags | one per flag count, each 6 closer to the staff than the previous |
| Triplet bracket | 22 beyond the stem end (the screen duration badge spans 4–16); end hooks 5 toward the staff; "3" in an 11 px bold italic gap; a one-column bracket spans ±10 |
| Triplet measures, stems below | lyrics 14 further from the staff; bottom margin 14 larger |
| Row-start label gutter | 40 wide, left of the measure block; labels right-aligned 6 from its right edge, at each string line y + 4 |

- `getStringY(s) = topMargin + (s − 1) × 24`.
- `staffMidY` is the midpoint of String 1 and String N. The time signature numerator baseline is at `staffMidY − 12` and the denominator at `staffMidY + 38`; the masks start at `staffMidY − 34` and `staffMidY + 10`.
- Rests use the upper middle line `⌊N/2⌋` and the lower middle line `⌊N/2⌋ + 1`; `1/32` rests are drawn with three hooks.
- **Beams** (`notationLayout.computeBeams(beats, timeSignature)` → `{ segments, stubs, beamed, flagCounts }`, index-based; `TabRenderer` converts indices to x and levels to y):
  - `getFlagCount`: `1/8` → 1, `1/16` → 2, `1/32` → 3, else 0. A column is beamable when it is not a rest and has flags.
  - Column start = sum of earlier `getBeatLengthInQuarters` (base length × 1.5 if dotted × 2/3 if triplet, rests included).
  - `getBeatGroupPattern([num, den])` → `{ starts, cycleLength }` in quarters, with unit = 4/den: compound (`den ∈ {8, 16}`, `num % 3 = 0`) groups of 3 units; `den ∈ {8, 16}` with odd `num ≥ 5` groups of 2 units ending in one of 3 (cycle = `num × unit`); otherwise groups of `max(unit, 1)` with the cycle rounded up to whole groups. `getBeatGroupIndex(position, pattern)` gives the group index, repeating the pattern past the cycle (tolerance 1e-9).
  - Adjacent beamable columns in the same group are joined; each joined pair gets a segment at every level up to the smaller flag count.
  - A beamed column gets a stub for each of its levels that no joined neighbour shares, pointing to the previous joined neighbour, else the next. Unbeamed beamable columns draw `flagCount` flags.
- **Triplets** (`computeTripletGroups(beats)` → `{ startIndex, endIndex }[]`): runs of consecutive `isTriplet` columns split into chunks of three (last chunk 1–2). Brackets are drawn after the columns with pointer events disabled; classes `triplet-bracket` and `triplet-number`.
- **Time signature** (`shouldShowTimeSignature(measures, index)`): true for index 0 and wherever `[num, den]` differs from the previous measure. String labels inside the block and the opening double barline are drawn only for `measures[0]`.
- **Row-start labels**: other row starts get labels in an absolute `<svg class="string-gutter-labels">` at `right: 100%` of the measure block (`aria-hidden`, no pointer events). On screen, `findRowStartIndices(offsetTops)` (index 0 plus each block lower than the previous by more than 0.5 px) runs in a `useLayoutEffect` on document/zoom changes and on wrapper resize (`ResizeObserver` when available); row-start blocks with index > 0 get `.screen-gutter-labels.no-print`, and the wrapper has a `40 × zoom` left padding. Print cannot be measured from script, so every block with index > 0 also gets `.print-gutter-labels`, hidden on screen and shown in print with `z-index: -1` inside a `.tab-canvas-wrapper` with `isolation: isolate`: the opaque white previous block covers it unless the block starts a printed row. The final barline is drawn only on the last measure. The print-only labels are one PNG per document (`renderLabelsToPng`, drawn on a canvas at 4× CSS pixels, black, memoised on the labels, zoom and string positions) shown as an `<img>` in every later block, so hidden labels never reach the PDF text layer; without a 2D canvas (jsdom) they fall back to SVG text.

### 6.2 Note Cells & Interaction
- For each string of each column, a transparent hit rectangle selects the beat and string. If the cell is empty, it also calls `onAddNote` with the ghost fret, or 0.
- The fret text sits on a `.fret-mask` rectangle, wider for two-digit frets.
- Tie state is `note.isTied || (beat.isTied && note present)`.
- Ghost notes are computed only for the selected column.
- The floating popover is HTML inside an SVG `<foreignObject>` (class `floating-popover no-print`), anchored above the selected column.

### 6.3 Chord Diagrams
- `ChordDiagram` takes either a `chord` (frets bottom line first) or `notes` plus `tuning`. The string count is `chord.frets.length`, else `tuning.pitches.length`.
- The width defaults to `getChordDiagramWidth(stringCount)` = `50 + 5 × max(0, stringCount − 4)`; the height defaults to 72. The diagram shows a 4-fret window.
- Above-staff diagrams are translated to be centred on the column, at `String1Y − 78 × zoom`.

---

## 7. Audio & Playback (`audioSynth.ts`, `App.tsx`)

**Scheduling**: a `useEffect` in `App` runs while `isPlaying`.
- It flattens all beats (each carrying its measure and index in the measure), starts at the selected beat, and chains `window.setTimeout` calls using `getBeatDurationMs`.
- The effect depends on `document`, so any edit restarts playback from the selected beat.
- `playingBeatId` drives the highlight.

**Per column**: unless the column is a rest or `isTied`, `playBeatChord(beat, getSoundingTuning(document), false, isFirst, profile.synthVoice, writtenSec)` runs, where `writtenSec = getWrittenNoteDurationMs(allBeats, index, tempo, speed) / 1000` (the column's duration plus every directly following `isTied` column, across measures). It:
- skips ghost notes;
- calls `playMutedClick()` for fret −1;
- calls `playPluck(midi, getNoteSoundSec(voice, writtenSec), voice)` for every other note, where `getNoteSoundSec` = `min(writtenSec, voice.maxSustainSec)` (the full sustain when no written length is given).

**`playPluck`**:
- Oscillator of `voice.oscillatorType` at `440 × 2^((midi − 69)/12)` Hz.
- A low-pass filter that falls exponentially from `f × filterStartRatio` to `f × filterEndRatio` over the note length.
- Gain rises from 0.001 to `peakGain` over `attackSec`, then decays exponentially to 0.0001 at the note length.

**Other sounds**:
- `playMutedClick()`: a 120 Hz square wave, gain 0.12, 35 ms.
- `playMetronomeClick(accent)`: a sine at 1200 Hz (accent) or 800 Hz, 50 ms.

**Metronome scheduling** (`playbackTiming.ts`):
- `getMeasureDurationMs(beats, tempo, speed)` sums `getBeatDurationMs`; `getColumnStartOffsetMs(beats, index, tempo, speed)` is the offset of a column within its measure.
- `getMeasureClickOffsetsMs(timeSignature, measureDurationMs, tempo, speed, startOffsetMs = 0)` returns `{ offsetMs, accent }[]`: clicks at `k × beatMs` for `k = 0 … num − 1`, with `beatMs = (60000 / tempo) × (4 / den) / speed`, kept only while `k × beatMs` is before the measure's actual end and not before `startOffsetMs`; offsets are relative to `startOffsetMs`; `accent` is `k = 0`.
- When playback enters a measure (its start column, then each later measure's first column) and the metronome is on, `App` schedules that measure's clicks with `window.setTimeout`. The handles are kept in `metronomeTimeoutsRef` and cleared on Stop, effect cleanup and song end, so no click outlives playback.

One shared `AudioContext` is created on first use and resumed if suspended.

---

## 8. Import & Export

### 8.1 `.uketab`
- **Save** (`App.handleExportJson`): `JSON.stringify(document, null, 2)` downloaded (as a data URL, through `App.downloadFile`'s temporary anchor) as `getExportFileName(doc, 'uketab')` = `<title lower-cased, whitespace → _, or "untitled">.uketab`.
- **Open** (`EditorToolbar.handleJsonFileChange` → `App.handleImportJson`): the JSON is parsed and must have `title` and an array `measures`. The handler drops a legacy `keySignature` field, sets `instrument` to the resolved profile id and sets `chordPalette` with `getEffectiveChordPalette`. It selects the first beat and clamps `selectedString` to the new string count.
- The two native `<input type="file">` elements use the HTML `hidden` attribute (there is no `.hidden` class in `index.css`) and are opened by `ref.click()`.

### 8.2 Guitar Pro (`guitarProImporter.ts`)
`parseGuitarProToTab(buffer, fileName, profile)`:
1. `ScoreLoader.loadScoreFromBytes`. Title, artist and tempo come from the score with fallbacks (Spec §9.2).
2. A lyric map `"{barIndex}-{beat.playbackStart}" → syllable` is built from every track, staff and voice (first wins). `cleanGpLyric` joins the syllable parts, removes commas and trims.
3. `selectImportTrack(tracks, profile)`:
   - first, tracks whose first staff passes `isCompatibleSourceTuning`; prefer a name containing an `importTrackKeywords` entry, else the first compatible track;
   - otherwise, the first track with a keyword in its name, else `tracks[0]`.
4. `isCompatibleSourceTuning(staffTuning, profile)`: `importKeepsSourceFingering` is set, the length equals `stringCount`, and `|min(staffTuning) − min(defaultTuning.pitches)| ≤ 12`.
5. When compatible, `resolveSourceTuning` returns the preset with identical pitches, or `{ key: 'custom', name: 'Custom (<labels low→high>)', pitches, stringsDisplay: midiToNoteName(...) }`. Otherwise the document uses `profile.defaultTuning`.
6. For each bar of the first staff, only voice 0 is read. For each beat:
   - `convertGpDuration` maps 1/2/4/8/16/32 to `DurationType` (anything else → `1/4`); `dots > 0` → dotted. A 3:2 tuplet (`tupletNumerator` 3, `tupletDenominator` 2) sets `isTriplet`; other tuplets are ignored.
   - A beat is a rest if it is flagged as one or has no notes.
   - **Compatible path**: string = `stringCount − gpNote.string + 1` (alphaTab string 1 is the bottom line); fret = `isDead ? −1 : gpNote.fret` (plus `staff.capo` only when it exceeds `MAX_CAPO`); the document's `capo` = `staff.capo` when ≤ 12. Notes on an already-used string are dropped.
   - **Re-voice path**: dead notes first become fret −1 on string `staff.tuning.length − gpNote.string + 1` when that is within `1 … stringCount` and not yet taken (others are dropped); the other notes' pitches = `realValue` (which includes the source capo), placed with `assignNotesToStrings(pitches, tuning, importMaxFret, { pitchRange: importPitchRange, usedStrings: mutedStrings })`; notes that get `null` are dropped; the document has no capo.
   - Tie: `isTieDestination` (or `tie`) sets `note.isTied`, and the column's `isTied` if any note is tied.
   - Lyric from the map, else the beat's own lyrics.
   - Chord: when `gpBeat.chordId` names a chord in `staff.chords`, `convertGpChord(chord, keepSourceFingering, stringCount, staff.capo, chordProfile)`: on the compatible path with `strings.length === stringCount`, `createChordMarker(name, reversed strings)` (alphaTab lists the highest string first); otherwise the tuning-adapted preset of the name (re-voice path: `transposeChordName(name, staff.capo)`), else `null`. Without a file chord, or when that gives `null`, `autoDetectChordFromBeatNotes`.
   - An empty bar becomes `timeSignatureNumerator` quarter rests.
7. The result has `instrument: profile.id`, `key: convertGpKeySignature(staff.bars[0].keySignature)` when that is defined (`NOTATION_KEYS[(ks × 7) mod 12]` for a non-zero signature; 0 gives no key), `layout: { stemsPlacement: 'below', zoomScale: 1, measuresPerSystem: 4, maxFretLimit: profile.defaultMaxFretLimit }` and `chordPalette: getDefaultChordPalette(getTuningProfile(profile, tuning))`, so the palette uses shapes for the imported tuning.

`EditorToolbar` stores the instrument chosen in the **Open Guitar Pro** menu in a ref before opening the file picker, and passes it as `profile`.

### 8.3 Print (`index.css` `@media print`, `App.tsx`, `NotationPrint.tsx`)
- `window.print()` is the whole export path. The `@page` rule sets `size: auto` and margins 0.5 in top, 0.75 in bottom, 0.25 in left, 0.5 in right.
- The footer is an `@page @bottom-center` rule generated in `App` (`"{title} " counter(page) " of " counter(pages)`). It overrides the static `"UkeTab …"` footer in `index.css`.
- `.print-title-header` (hidden on screen) is shown with title 18 pt / weight 800, artist 10 pt italic, metadata 8.5 pt (`Tuning: … • Capo N • Key: … • Tempo: …`, the capo part only when set, the key part (`getKeyName(getNotationKey(doc).key)`) only while `printNotation` is set), and a bottom rule.
- `.tab-canvas-wrapper` becomes `justify-content: flex-end` with a 0.5 in left margin and 0.15 in row gap. `.measure-svg-block` and `svg` use `break-inside: avoid`.
- Recolouring: fret numbers 18 pt black on white masks; lyrics 14 pt; chord titles 20.8 px. Stems, flags, beams, dots, rests, ties, rings, chord diagrams and the time signature are black, and the half-note ring is filled white.
- Hidden in print: `.no-print`, `.EditorToolbar`, `.InspectorPanel`, `header`, `footer`, `foreignObject`, `.floating-popover`, `.ghost-fret`, `.delete-badge`, `.selection-ring`, `.playhead-highlight` and every `button`.

**Print flow** (`App`): the toolbar's Export PDF menu (`PDF_EXPORT_OPTIONS`) calls `onExportPdf(notation)` with `null`, `'grandStaff'` or `'instrumentStaff'`. `null` calls `window.print()` at once. Otherwise `printNotation` is set, which renders `<NotationPrint document mode>` and wraps `TabRenderer` in a `.no-print` div; an effect waits for `document.fonts.load('34px alphaTab')` (skipped when the Font Loading API is missing; a failure is ignored), registers a one-time `afterprint` listener that clears `printNotation`, and calls `window.print()`. The effect's cleanup removes the listener.

**Notation score** (`alphaTabScore.buildAlphaTabScore(doc, mode, settings?)` → `alphaTab.model.Score`, after `score.finish(settings)`):
- Score title and artist; one `MasterBar` per measure with its time signature; the first has a tempo automation `buildTempoAutomation(false, 0, tempo, 2)`.
- `'grandStaff'`: track `Piano` (program 0, channels 2/3) with a treble staff (`Clef.G2`) and a bass staff (`Clef.F4`), both notation only, then the instrument track (`profile.name`, `exportMidiProgram`, channels 0/1) with one tab-only staff (`stringTuning` = `doc.tuning.pitches`, `capo`). Piano notes: non-ghost, non-muted notes at `calculatePitch(…, getSoundingTuning(doc))`, one per pitch (tied if any source note is), sorted, on treble when ≥ `GRAND_STAFF_SPLIT_PITCH` (60) else bass; `note.octave = ⌊p / 12⌋`, `note.tone = p mod 12` (alphaTab's piano value is `octave × 12 + tone`). Treble beats carry the lyrics and a chord named `transposeChordName(chord.name, capo)` without a diagram; tab beats carry the written chord only when `capo > 0`.
- `'instrumentStaff'`: the instrument track alone, one staff with notation and tab. `getInstrumentStaffClef(doc.tuning)`: lowest open pitch < 36 → `F4` + `Ottavia._8vb`; < 55 → `G2` + `_8vb`; else `G2` regular (alphaTab raises the displayed notes by 12 for `_8vb`; no `displayTranspositionPitch` is used). Beats carry lyrics and the written chord.
- Tab notes: alphaTab string = `stringCount − string + 1`, fret as written (relative to the staff's `capo`), muted notes as `isDead` with fret 0.
- Chords: one `Chord` per distinct `name|frets` per staff (`strings` = frets reversed, highest string first; `firstFret` = `baseFret ?? 1`). On the staff that shows diagrams (tab staff, or the instrument staff), every beat chord of the song is registered with `showDiagram`, so alphaTab lists each shape once at the top even when no beat on that staff references it.
- Every bar: the clef, `keySignature = KEY_SIGNATURE_ACCIDENTALS[getNotationKey(doc).key]`, `KeySignatureType.Major`. Non-muted notes get `accidentalMode` from `getChromaticAccidental(pitch, key)`: degrees 1, 3, 6, 8, 10 semitones above the tonic are spelled on the tonic's letter +0, +2, +3, +5, +6 letters; the resulting offset −1/0/+1 maps to `ForceFlat`/`ForceNatural`/`ForceSharp`; in-key notes and spellings needing a double accidental use `Default`.
- Beats: `Duration` from the column duration, `dots` 0/1, triplet → `tupletNumerator 3`, `tupletDenominator 2`; a rest column, or a column without notes for the staff, has no notes. On notation staves a column with `isTied`, no notes for the staff and not a rest takes the previous column's non-muted notes, all tied. A note is `isTieDestination` when it (or its column) is tied and the previous column on the staff has a note with the same pitch, string and fret (both not muted); alphaTab resolves `tieOrigin` itself, across bars.
- On the piano staves, a measure whose columns give no notes, lyrics or chords on that staff is one whole-duration rest beat (alphaTab's `isFullBarRest`). A measure without columns is one on every staff.

**Rendering** (`notationRender.ts`): `createNotationSettings(scale)` sets the SVG engine, no lazy loading, no workers, `LayoutMode.Page`, `display.scale`, hides `ScoreTitle`, `ScoreSubTitle`, `ScoreArtist`, `ScoreAlbum`, `ScoreWords`, `ScoreMusic`, `ScoreWordsAndMusic`, `ScoreCopyright`, `GuitarTuning`, `EffectCapo`, `EffectDynamics` and `EffectTempo`, and makes every rendering colour black. `renderNotationSvg(score, settings, width)` runs a `ScoreRenderer` (it lays out and draws synchronously with these settings), collects each `partialRenderFinished` result `{ svg, x, y, width, height, isCredit }` (`isCredit` marks the part holding alphaTab's always-drawn "rendered by alphaTab" text), sorts them by position and throws on an alphaTab error or a missing `renderFinished`.

**`NotationPrint`** renders `buildAlphaTabScore` at `NOTATION_PRINT_WIDTH` (720 px) and `NOTATION_PRINT_SCALE` (0.85), memoised on document and mode; an error is shown as a message instead. Each part is a `.notation-print-part` block (`break-inside: avoid`) of the part's height, separated by the vertical gap alphaTab left, with the SVG placed at the part's x; the credit part also gets `.notation-print-credit`, which the print CSS hides. A `<style>` declares `@font-face 'alphaTab'` from `@coderline/alphatab/font/Bravura.woff2?url` (bundled by Vite) and gives `.at` glyph text that family at 34 px (alphaTab writes glyph sizes as percentages of it). `.notation-print` is `display: none` on screen and shown in print.

### 8.4 Guitar Pro Export (`guitarProExporter.ts`)
`exportGuitarPro(doc)` builds `buildAlphaTabScore(doc, 'instrumentStaff', new Settings())` and returns `new Gp7Exporter().export(score, settings)`. `App.handleExportGuitarPro` wraps the bytes in a `Blob`, downloads it through an object URL as `getExportFileName(doc, 'gp')` (revoked a second later) and alerts on an exception. Re-importing with `parseGuitarProToTab` and the same profile reproduces the columns, notes, ties, chords, lyrics, meter, tempo, tuning and capo (tested); a guessed key comes back as `key` unless it is C.

---

## 9. Application State (`App.tsx`)

| State | Purpose |
|---|---|
| `document` | The `TabDocument` being edited (initially the "Conjunction Junction" sample with its effective palette) |
| `selectedBeatId`, `selectedString` | Current selection (initially the sample's first beat and String 1); `selectedString` is clamped to the string count on open and New Tab |
| `activeDuration` | Duration given to inserted beats and rests; set by `w h q e s d` and by the popover duration buttons (`TabRenderer` `onSelectActiveDuration`) |
| `isPlaying`, `playingBeatId`, `enableMetronome`, `playbackSpeed` | Playback |
| `printNotation` | `null`, or the notation staff mode while a notation printout is being printed (§8.3) |
| `showHelpModal`, `showChordPaletteModal`, `showDuplicateModal` | Dialog visibility |

All document changes go through `setDocument` with immutable updates.

**Keyboard**: one `keydown` listener on `window`, ignored while focus is in an input, textarea or select. It calls `findShortcut(e)` on the single `SHORTCUTS` table; `findShortcut` returns nothing while Ctrl, Alt or Meta is held (`src/utils/shortcuts.ts`). Each entry has an `id`, a display `keys` label, a `description`, `requiresSelection` and `matches(e)`, and no event matches two entries.
- No match: nothing happens.
- `requiresSelection` and no selected beat: the key is left to the browser.
- Otherwise: `preventDefault`, then the action for that id runs in `App`.

Two-digit frets use `resolveFretDigit(digit, pendingDigit, msSinceLastDigit)`, which merges digits typed within `TWO_DIGIT_FRET_WINDOW_MS` (600) when the result is at most `TWO_DIGIT_FRET_MAX` (20). The help panel (`ShortcutHelp`) renders every `SHORTCUTS` entry, and the specification's shortcut table is checked against `SHORTCUTS` by `docsConsistency.test.ts`.

---

## 10. Automated Testing

Vitest runs every `src/**/*.test.ts(x)` file in jsdom, after `src/testSetup.ts` (configured in `vite.config.ts`). `tsc` runs as part of `npm run build`.

| File | Covers |
|---|---|
| `utils/musicTheory.test.ts` | Pitch across ukulele tunings, note names, beat durations (dotted, triplet, speed), alternate frets and `maxFretLimit`, exact-pitch transposition (relocation, tie-break, occupied strings, clamping and count, `maxFret`), chord extraction/detection/lookup, palettes, base fret; regressions: transposition keeps pitch and never doubles a string; chord shapes across tunings (`adaptChordFrets`), chord name and marker transposition; regressions: G detected in Drop D, adapting any library shape and back is exact; sounding tuning with a capo; `assignNotesToStrings`; regression: re-voiced chords use the most compact fingering |
| `utils/multiString.test.tsx` | 6-string theory functions; 6-string `ChordDiagram` and `TabRenderer` output |
| `utils/guitarProImporter.test.ts` | Duration and lyric helpers; tuning resolution; compatibility check; end-to-end imports from GP7 bytes generated with alphaTab (guitar fingering, capo, dead notes, custom tuning, track choice, bass, ukulele re-voicing); palette shapes adapted to the imported tuning; source capo kept as the document capo, capo above 12 folded into frets, re-voicing via the shared solver; ukulele tracks keep their fingering; regression: re-voiced dead notes stay muted |
| `utils/sampleData.test.ts` | Blank document and sample songs (the startup song's chord markers match its strummed shapes and give key G) |
| `utils/documentEdits.test.ts` | Every edit operation, non-mutation, chord auto-detection rules, time-signature edits and Add Measure inheritance, transposition within `maxFret`; regressions: entering a note keeps the beat duration, Add Measure copies the time signature; retuning re-fingers beat and palette chords; regression: transposing a song transposes its chord names and diagrams; `setCapo` validation, transposition limit with a capo, instrument conversions (pitches, strings, muted notes, chords, palette, dropped count); regression: a song's instrument can be changed after creation; `setKey`; a chosen key moves with transposition and capo changes and survives conversion; regression: chord shapes under a capo become the chords they sound when converting |
| `utils/notationLayout.test.ts` | Flag counts, beat lengths, beat-group patterns and indices (uniform, irregular, overfull), beams and stubs (eighths, sixteenths, dotted, 6/8, 5/8, 7/8, 1/32, triplet eighths), triplet chunking, time-signature display, row-start detection; regressions: 5/8 beams 2+3, 7/8 beams 2+2+3, beams never touch rests and break at beat groups |
| `utils/playbackTiming.test.ts` | Measure length, column offsets, metronome clicks for 4/4, 6/8, half speed, under/overfull measures and mid-measure starts; regression: one click per beat, not per column; written note length with tie chains; regression: note length follows the written duration, capped by the sustain |
| `utils/shortcuts.test.ts` | Every shortcut matches its events, no event matches two shortcuts, unbound keys, selection requirements, two-digit fret entry; regressions: Ctrl/Alt/Meta combinations are left to the browser, `d` sets thirty-seconds |
| `components/ShortcutHelp.test.tsx` | Help panel lists every `SHORTCUTS` entry; close button |
| `components/InspectorPanel.test.tsx` | Measure time-signature control: current values, options, out-of-list values, callback, hidden without a callback; sounding pitch with a capo |
| `App.test.tsx` | Help panel lists all shortcuts; `e` and `r` shortcuts on a selected beat; Ctrl combinations ignored; shortcuts ignored while typing; regressions: first beat selected on startup, metronome clicks once per beat; no clicks after Stop; regression: an opened file without a palette gets default shapes for its own tuning; regression: notes are played for their written length; print header with and without a capo; playback uses the capo; convert flow and cancel; Tab only prints at once; notation printouts (grand staff, instrument staff with a chosen key) render the notation, add the key to the header, hide the editor tab and are removed after printing; Guitar Pro download; legacy `keySignature` dropped on open |
| `docsConsistency.test.ts` | Documentation matches the code: spec tuning table, chord library sizes and palettes, tuning keys; architecture source layout, test inventory and profile table (numeric and flag fields) |
| `utils/musicKeys.test.ts` | Key signatures and pitch classes, labels, key transposition, chord qualities, key guessing (common progressions, repeats, ties, no chords), sounding chord names with a capo, chosen vs guessed vs default key |
| `utils/alphaTabScore.test.ts` | Instrument-staff clefs per tuning; chromatic spelling; grand staff tracks, middle-C split at sounding pitch, unisons merged, muted notes left out, whole-bar rests, sounding chord names and capo shapes, diagram order, lyrics placement; durations, dots, triplets, rests, time signatures; ties within and across bars and empty tied columns; key signature and accidentals; tempo and empty measures; instrument staff tuning, capo, clef, octave, strings, dead notes and chords; SVG rendering of both modes and hidden header elements |
| `utils/guitarProExporter.test.ts` | Round trips through the importer (ukulele with triplets, rests, ties, muted notes, chords, lyrics, meter, tempo and key; guitar with capo, DADGAD and a custom chord; bass); guessed and C keys; empty tied columns; file names; importer key-signature and chord conversion |
| `types/tab.test.ts` | `DURATION_OPTIONS`, `DURATION_KEY_MAP` |
| `instruments/instruments.test.ts` | Registry fallback; legacy aliases; chord helpers honour the given profile; every library chord spelled correctly in every tuning of every instrument; tuning-adapted profile passthrough and memoisation |
| `instruments/guitar.test.ts`, `bass.test.ts` | Registration; tuning labels match pitches; every library chord sounds exactly its named chord tones with the root in the bass; blank documents; base fret of high barre chords |
| `instruments/chordSpelling.testUtil.ts` | Shared tuning and chord-spelling assertions (with a `rootInBass` option for re-entrant tunings) for the instrument tests (not a test file) |
| `components/TabRenderer.test.tsx` | Staff, labels, time signature, notes, lyrics; popover duration also sets the active duration; triplet bracket, 1/32 rest and flags, time-signature change, beam coordinates and stubs; row-start gutter labels (print-only for every later measure, screen-only at detected row starts); regression: triplet bracket clears the badge and lyrics clear the "3"; regression: print row labels are images when a canvas exists |
| `components/ChordDiagram.test.tsx` | Dots, open circles, muted marks, base fret label |
| `components/ChordPaletteModal.test.tsx` | Library list, close, tab switching |
| `components/DuplicateMeasuresModal.test.tsx` | Open/closed rendering, confirm callback |
| `components/EditorToolbar.test.tsx` | Instrument menus, menu order, hidden file inputs, custom tuning option; changing the tuning re-fingers chords and keeps notes; Capo menu; Convert menu lists only other instruments; Key menu (Auto with the guessed key, circle-of-fifths order, set and clear); Export PDF menu; Save Guitar Pro |
