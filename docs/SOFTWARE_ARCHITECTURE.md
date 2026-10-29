# UkeTab Software Architecture

This document describes how UkeTab is built. The user-visible behaviour is specified in the [Product Specification](PROJECT_SPECIFICATION.md); section references of the form "Spec §n" point there.

## 1. Overview & Technology Stack

UkeTab is a client-only single-page application. There is no server: documents live in React state, are saved and loaded as local files, and print through the browser.

```
+---------------------------------------------------------------------------+
| UI (React components)                                                      |
|  EditorToolbar | TabRenderer (SVG staff + popover) | InspectorPanel        |
|  ChordPaletteModal | DuplicateMeasuresModal | ChordDiagram                 |
+---------------------------------------------------------------------------+
| App.tsx: document state, selection, playback loop, keyboard shortcuts,    |
|          edit handlers                                                     |
+---------------------------------------------------------------------------+
| Domain logic                                                               |
|  instruments/ (profiles) | utils/musicTheory | utils/audioSynth            |
|  utils/guitarProImporter | utils/sampleData                                |
+---------------------------------------------------------------------------+
| Platform: React 18, SVG, Web Audio API, CSS print media, FileReader,      |
|           @coderline/alphatab (Guitar Pro parsing)                         |
+---------------------------------------------------------------------------+
```

| Concern | Technology |
|---|---|
| UI | React 18, TypeScript 5 (strict), lucide-react icons |
| Notation | Hand-written SVG (no notation library) |
| Styling | `src/index.css`: a hand-written subset of Tailwind-style utility classes plus print rules. Tailwind itself is **not** installed; a class missing from `index.css` has no effect. |
| Audio | Web Audio API oscillators |
| Guitar Pro | `@coderline/alphatab` 1.8 (`ScoreLoader.loadScoreFromBytes`) |
| Build / dev server | Vite 5 (`npm run dev` serves on port 3000) |
| Tests | Vitest 4 with jsdom and Testing Library |

---

## 2. Source Layout

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Mounts `<App/>` and loads `index.css` |
| `src/App.tsx` | Owns all application state; playback scheduler; keyboard shortcuts; every document edit handler; help panel; print header and footer |
| `src/types/tab.ts` | Domain types and duration constants (§3) |
| `src/instruments/ukulele.ts`, `guitar.ts`, `bass.ts` | Instrument profiles: tunings, chord libraries, default palettes, import and synth settings (§4) |
| `src/instruments/index.ts` | Profile registry, `getInstrumentProfile`, menu order `INSTRUMENT_LIST` |
| `src/utils/musicTheory.ts` | Pitch maths, alternate frets, transposition, chord lookup/detection, palette resolution, beat durations (§5) |
| `src/utils/audioSynth.ts` | Pluck, muted-click and metronome synthesis (§7) |
| `src/utils/guitarProImporter.ts` | Guitar Pro → `TabDocument` conversion (§8.2) |
| `src/utils/sampleData.ts` | Built-in sample songs and `createBlankTabDocument(profile)` |
| `src/components/EditorToolbar.tsx` | Title/artist, action buttons, instrument menus, settings row, file inputs |
| `src/components/TabRenderer.tsx` | Staff SVG per measure, rhythm, rests, beams, ghost notes, chord diagrams, floating popover |
| `src/components/InspectorPanel.tsx` | Bottom inspector (beat actions, lyric, chord editing, fret pad, alternate frets) |
| `src/components/ChordDiagram.tsx` | Chord diagram SVG and `getChordDiagramWidth` |
| `src/components/ChordPaletteModal.tsx` | Palette selection and custom chord creation |
| `src/components/DuplicateMeasuresModal.tsx` | Start/end range dialog for measure duplication |
| `src/index.css` | Utility classes, component styles, `@media print` rules (§8.3) |

---

## 3. Domain Data Model (`src/types/tab.ts`)

```typescript
export type DurationType = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface TabNote {
  id: string;
  string: number;        // 1 = top line .. N = bottom line (N = tuning.pitches.length)
  fret: number;          // -1 = Muted (X), 0 = Open, 1+ = Fretted (editor input up to 20; Guitar Pro import up to the profile's importMaxFret)
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
  tempo: number;
  keySignature: string;      // Stored only; not used
  tuning: TuningConfig;
  layout: LayoutOptions;
  measures: Measure[];
  chordPalette?: ChordMarker[];
}
```

`DURATION_OPTIONS` (`1/1` … `1/16`) drives the popover duration buttons. `DURATION_KEY_MAP` maps `w h q e s` to durations.

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
  noteDurationSec: number;
}

export interface InstrumentProfile {
  id: InstrumentId;
  name: string;
  stringCount: number;
  tunings: TuningConfig[];                   // Tuning menu presets, menu order
  defaultTuning: TuningConfig;
  chordLibrary: ChordFretLibrary;            // Shapes for defaultTuning
  defaultChordNames: string[];               // Default palette
  defaultMaxFretLimit: number;
  importPitchRange: [number, number] | null; // Octave-folding range for re-voiced imports
  importMaxFret: number;
  importKeepsSourceFingering: boolean;
  importTrackKeywords: string[];             // Lowercase track-name keywords
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
| `importPitchRange` | `[60, 84]` | `[40, 88]` | `[28, 55]` |
| `importMaxFret` | 15 | 24 | 24 |
| `importKeepsSourceFingering` | false | true | true |
| `importTrackKeywords` | guitar, ukulele, acoustic | guitar, acoustic | bass |
| `synthVoice` (type, start, end, gain, attack, length) | triangle, 3.5, 0.4, 0.4, 0.008 s, 0.6 s | sawtooth, 5, 0.6, 0.22, 0.004 s, 1.2 s | sawtooth, 8, 1.0, 0.35, 0.006 s, 1.4 s |

The full preset list with names and labels is in Spec §3.1.

**Resolution**: `getInstrumentProfile(document.instrument)` returns the profile, or ukulele when the id is missing or unknown. `App` computes the document's profile once per render. Components call `getInstrumentProfile(document.instrument)` themselves.

**Profile-aware functions** (the profile parameter defaults to ukulele, so older call sites keep their behaviour):
- in `musicTheory`: `getDefaultChordPalette`, `getEffectiveChordPalette`, `getChordPreset`, `findExistingChordsByFrets`, `autoDetectChordFromBeatNotes`, `createChordMarker`;
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

### 5.2 String Numbers
`getStringNumbers(n)` returns `[1 … n]`. Every per-string loop (staff lines, labels, note cells, solver candidates) iterates it.

### 5.3 Alternate Frets
`getAlternateFretSuggestions(notes, tuning, maxFretLimit)`:
- For each non-muted note with pitch P, and each string s′ that has no note in the column, the candidate fret is `f′ = P − tuning.pitches[s′ − 1]`.
- A ghost note is produced when `0 ≤ f′ ≤ maxFretLimit`.
- Results are not de-duplicated per string; the renderer shows the first suggestion found for each string.

### 5.4 Transposition
`transposePitches(notes, shift, tuning)` keeps every note on its string. Muted notes are returned unchanged. Otherwise the new fret is `fret + shift`, clamped to 0–20. Chord markers are not touched.

### 5.5 Chord Lookup, Detection & Base Fret
- `extractChordFrets(notes, stringCount)` returns `[fret(N) … fret(1)]` from non-ghost notes when every string has a note, else `null`.
- `findExistingChordsByFrets(frets, custom, profile)` returns the names in `{...profile.chordLibrary, ...custom}` with an identical fret array (same length, same values).
- `autoDetectChordFromBeatNotes(notes, palette, profile)` extracts the column's frets and takes the first matching name. It returns the palette's marker of that name if there is one, else the library preset, else a new marker.
- **Base fret** (`getChordPreset`, `createChordMarker`): an explicit `baseFret` wins. Otherwise, if the highest fretted value exceeds 4, use the lowest fretted value; otherwise use 1.
- `createChordMarker(name)` with no frets returns the library preset, or an all-open marker with `profile.stringCount` entries.
- **Palette resolution**: `getEffectiveChordPalette(palette, profile)` returns the palette if it is non-empty, else the presets for `profile.defaultChordNames`.
- **App call sites**: `handleSelectBeat` auto-detects only when `chord === undefined`. `handleAddNote` auto-detects unless `chord === null`, and keeps the old chord when nothing matches. `handleRemoveNote` uses the detected chord, else unsets the chord when fewer notes than strings remain.

### 5.6 Beat Duration
`getBeatDurationMs(beat, tempo, speed) = (60000 / tempo) × m × (1.5 if dotted) × (2/3 if triplet) / speed`, with m = 4, 2, 1, 0.5, 0.25, 0.125 for `1/1` … `1/32`.

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
| Time signature width (first measure only) | 32 |
| Chord space above staff (when any beat has a chord) | 78 |
| Top margin | 42 (stems below) or 60 (stems above), plus chord space |
| Bottom margin | 50 (stems below) or 28 (stems above) |
| Stem | from 6 to 36 beyond the outer string line, on the stem side |
| Primary beam | at the stem end; secondary beam 6 closer to the staff; stub length 16 |

- `getStringY(s) = topMargin + (s − 1) × 24`.
- `staffMidY` is the midpoint of String 1 and String N. The time signature numerator baseline is at `staffMidY − 12` and the denominator at `staffMidY + 38`; the masks start at `staffMidY − 34` and `staffMidY + 10`.
- Rests use the upper middle line `⌊N/2⌋` and the lower middle line `⌊N/2⌋ + 1`.
- Beams: in step 1, each pair of adjacent columns whose durations are both in {`1/8`, `1/16`} gets a level-1 beam; rest columns are included. In step 2, `1/16` columns get level-2 beams to adjacent beamed `1/16`s, or a stub toward a beamed neighbour (previous first).
- The time signature, string labels and opening double barline are drawn only for `measures[0]`. The final barline is drawn only on the last measure.

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
- It flattens all beats, starts at the selected beat, and chains `window.setTimeout` calls using `getBeatDurationMs`.
- The effect depends on `document`, so any edit restarts playback from the selected beat.
- `playingBeatId` drives the highlight.

**Per column**: unless the column is a rest or `isTied`, `playBeatChord(beat, tuning, false, isFirst, profile.synthVoice)` runs. It:
- skips ghost notes;
- calls `playMutedClick()` for fret −1;
- calls `playPluck(midi, voice.noteDurationSec, voice)` for every other note.

**`playPluck`**:
- Oscillator of `voice.oscillatorType` at `440 × 2^((midi − 69)/12)` Hz.
- A low-pass filter that falls exponentially from `f × filterStartRatio` to `f × filterEndRatio` over the note length.
- Gain rises from 0.001 to `peakGain` over `attackSec`, then decays exponentially to 0.0001 at the note length.

**Other sounds**:
- `playMutedClick()`: a 120 Hz square wave, gain 0.12, 35 ms.
- `playMetronomeClick(accent)`: a sine at 1200 Hz (accent) or 800 Hz, 50 ms. `App` calls it once per column when the metronome is on, accented on the first column of each measure.

One shared `AudioContext` is created on first use and resumed if suspended.

---

## 8. Import & Export

### 8.1 `.uketab`
- **Save** (`App.handleExportJson`): `JSON.stringify(document, null, 2)` downloaded as `<title lower-cased, whitespace → _>.uketab`.
- **Open** (`EditorToolbar.handleJsonFileChange` → `App.handleImportJson`): the JSON is parsed and must have `title` and an array `measures`. The handler then sets `instrument` to the resolved profile id and sets `chordPalette` with `getEffectiveChordPalette`. It selects the first beat and clamps `selectedString` to the new string count.
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
   - `convertGpDuration` maps 1/2/4/8/16/32 to `DurationType` (anything else → `1/4`); `dots > 0` → dotted. Tuplets are ignored.
   - A beat is a rest if it is flagged as one or has no notes.
   - **Compatible path**: string = `stringCount − gpNote.string + 1` (alphaTab string 1 is the bottom line); fret = `isDead ? −1 : gpNote.fret + staff.capo`. Notes on an already-used string are dropped.
   - **Re-voice path**: pitch = `gpNote.realValue`, folded by octaves into `importPitchRange` when set. Choose the unused string with the smallest fret in `0 … importMaxFret`; else the first unused string with the fret clamped to that range; else drop the note.
   - Tie: `isTieDestination` (or `tie`) sets `note.isTied`, and the column's `isTied` if any note is tied.
   - Lyric from the map, else the beat's own lyrics. Chord from `autoDetectChordFromBeatNotes`.
   - An empty bar becomes `timeSignatureNumerator` quarter rests.
7. The result has `instrument: profile.id`, `keySignature: 'C'`, `layout: { stemsPlacement: 'below', zoomScale: 1, measuresPerSystem: 4, maxFretLimit: profile.defaultMaxFretLimit }` and `chordPalette: getDefaultChordPalette(profile)`.

`EditorToolbar` stores the instrument chosen in the **Open Guitar Pro** menu in a ref before opening the file picker, and passes it as `profile`.

### 8.3 Print (`index.css` `@media print`, `App.tsx`)
- `window.print()` is the whole export path. The `@page` rule sets `size: auto` and margins 0.5 in top, 0.75 in bottom, 0.25 in left, 0.5 in right.
- The footer is an `@page @bottom-center` rule generated in `App` (`"{title} " counter(page) " of " counter(pages)`). It overrides the static `"UkeTab …"` footer in `index.css`.
- `.print-title-header` (hidden on screen) is shown with title 18 pt / weight 800, artist 10 pt italic, metadata 8.5 pt, and a bottom rule.
- `.tab-canvas-wrapper` becomes `justify-content: flex-end` with a 0.5 in left margin and 0.15 in row gap. `.measure-svg-block` and `svg` use `break-inside: avoid`.
- Recolouring: fret numbers 18 pt black on white masks; lyrics 14 pt; chord titles 20.8 px. Stems, flags, beams, dots, rests, ties, rings, chord diagrams and the time signature are black, and the half-note ring is filled white.
- Hidden in print: `.no-print`, `.EditorToolbar`, `.InspectorPanel`, `header`, `footer`, `foreignObject`, `.floating-popover`, `.ghost-fret`, `.delete-badge`, `.selection-ring`, `.playhead-highlight` and every `button`.

---

## 9. Application State (`App.tsx`)

| State | Purpose |
|---|---|
| `document` | The `TabDocument` being edited (initially the "Conjunction Junction" sample with its effective palette) |
| `selectedBeatId`, `selectedString` | Current selection; `selectedString` is clamped to the string count on open and New Tab |
| `activeDuration` | Duration given to entered notes and inserted beats; set only by `w h q e s` |
| `isPlaying`, `playingBeatId`, `enableMetronome`, `playbackSpeed` | Playback |
| `showHelpModal`, `showChordPaletteModal`, `showDuplicateModal` | Dialog visibility |

All document changes go through `setDocument` with immutable updates. Keyboard handling is one `keydown` listener on `window`, ignored while focus is in an input, textarea or select. It merges two digits typed within 600 ms when the result is ≤ 20.

---

## 10. Automated Testing

Vitest runs every `src/**/*.test.ts(x)` file in jsdom. `tsc` runs as part of `npm run build`.

| File | Covers |
|---|---|
| `utils/musicTheory.test.ts` | Pitch across ukulele tunings, note names, beat durations (dotted, triplet, speed), alternate frets and `maxFretLimit`, transposition clamping, chord extraction/detection/lookup, palettes, base fret |
| `utils/multiString.test.tsx` | 6-string theory functions; 6-string `ChordDiagram` and `TabRenderer` output |
| `utils/guitarProImporter.test.ts` | Duration and lyric helpers; tuning resolution; compatibility check; end-to-end imports from GP7 bytes generated with alphaTab (guitar fingering, capo, dead notes, custom tuning, track choice, bass, ukulele re-voicing) |
| `utils/sampleData.test.ts` | Blank document and sample songs |
| `types/tab.test.ts` | `DURATION_OPTIONS`, `DURATION_KEY_MAP` |
| `instruments/instruments.test.ts` | Registry fallback; legacy aliases; chord helpers honour the given profile |
| `instruments/guitar.test.ts`, `bass.test.ts` | Registration; tuning labels match pitches; every library chord sounds exactly its named chord tones with the root in the bass; blank documents; base fret of high barre chords |
| `instruments/chordSpelling.testUtil.ts` | Shared assertions for the two files above (not a test file) |
| `components/TabRenderer.test.tsx` | Staff, labels, time signature, notes, lyrics |
| `components/ChordDiagram.test.tsx` | Dots, open circles, muted marks, base fret label |
| `components/ChordPaletteModal.test.tsx` | Library list, close, tab switching |
| `components/DuplicateMeasuresModal.test.tsx` | Open/closed rendering, confirm callback |
| `components/EditorToolbar.test.tsx` | Instrument menus, menu order, hidden file inputs, custom tuning option |
