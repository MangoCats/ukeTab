# UkeTab Technical Specification & Architectural Manual

## 1. Product Overview & Core Purpose
**UkeTab** is a modern interactive web application for creating, editing, listening to, and exporting 4-line Ukulele tablature.
It features standard stringed instrument notation with fret numbers on staff lines, traditional rhythm stems/flags/beams, lyrics, Web Audio synthesis, continuous staff system engraving, clean PDF export, ukulele chord diagrams, Guitar Pro import (`.gp`, `.gp3`–`.gp5`, `.gpx`), tied/continued note sustain, and configurable fingering aids.

---

## 2. Visual Notation & Rendering Specs

### Staff & Continuous System Layout
- **Staff Lines**: Exactly 4 horizontal lines.
- **Default High-G ($gCEA$) String Ordering**:
  - String 1 (Top Line): $A_4$ (440 Hz)
  - String 2 (2nd Line): $E_4$ (329.63 Hz)
  - String 3 (3rd Line): $C_4$ (261.63 Hz)
  - String 4 (Bottom Line): $g_4$ (392.00 Hz) High-G re-entrant tuning.
- **Continuous System Staff Engraving**:
  - String tuning labels (`A4`, `E4`, `C4`, `g4`) and time signatures are rendered **ONCE per system row** at the far-left clef header.
  - Measures flow continuously across the system row separated by single vertical barlines without repeated string labels or whitespace gaps.
- **Zoom-Proportional & Margin-Overrun Dynamic Row-Wrapping**:
  - Automatically wraps measures onto a new system row when the row width exceeds the printable page boundary (`820px`).
  - Adapts to active zoom presets (75% Compact, 100% Standard, 150% Large).

### Ukulele Chord Diagram Charts Above Tabs
- **Independent Placement**: Ukulele chord diagrams (chord name label + 4-string fingering grid) can be assigned to any beat column directly above String 1 ($A_4$). They operate independently of tab fret numbers underneath (can sit above single notes, full chords, rests, or lyrics).
- **Standard Fingering Chart Format**:
  - **4 Vertical String Lines**: Strings 4, 3, 2, 1 (left-to-right).
  - **Nut Line & Frets**: Thick nut line for `baseFret = 1`; base fret offset text (e.g. `3fr`) for higher positions.
  - **Filled Circles (●)**: Finger placement on frets.
  - **Open Circles (○)**: Played open strings (fret 0).
  - **✕**: Muted / unplayed strings (-1).
  - **Chord Title**: Prominently rendered above diagram (e.g. `Am`, `E7`, `G`, `D`, `F`, `C`, `Dm`).
- **Chord Library & Custom Editor**: Built-in library of standard Ukulele chords + custom chord name and 4-string fret assignment.
- **1-Click Auto-Assignment**: Selecting any 4-string beat automatically detects and assigns the matching chord from the defined library.
- **Print & PDF Support**: Renders in high-contrast crisp black lines, text, and dots in PDF export.

### Fret Number Representation & Tied Notes
- Fret numbers (`0` through `20`) are rendered directly on staff lines inside solid pitch-black line cutout boxes (`#020617`).
- Fret digits are rendered in high-contrast white (`#ffffff`) or sky-blue when active.
- **Tied / Continued Notes**: Notes that ring out across beat boundaries without re-strumming render as parenthesized fret numbers e.g. `(12)` with a cyan tie arch `⁀` connecting from the previous beat.

### Unified Max Fret Limit Control
- **User-Selectable Fret Limit (`maxFretLimit`)**:
  - Default Limit: **Fret 12**
  - User Options: `Fret 7`, `Fret 10`, `Fret 12 (Default)`, `Fret 15`, `Fret 20`.
  - Applies to **both**:
    1. **Fret Selection Button List**: Inline popover toolbar and Inspector panel render fret buttons `0` through `maxFretLimit`.
    2. **Alternate Fret Helper**: Equivalent pitch suggestions (parenthesized ghost frets `(3)`) are filtered up to `maxFretLimit`.

### Rhythm Notation & Time Signatures
- **Traditional Vertically Stacked Time Signature ($\mathbf{\frac{4}{4}}$)**:
  - Numerator sits centered over upper staff lines; denominator sits centered over lower staff lines in bold serif typography (`font-weight: 800`, `26px`) with background masking to prevent staff lines from cutting through numbers.
- **Rhythm Stems, Flags & Beams**:
  - Default to below staff lines, user-configurable to above staff.
  - **Whole Note (`1/1`)**: Open ring indicator.
  - **Half Note (`1/2`)**: Open circle stem base (hollow with white fill in print mode).
  - **Quarter Note (`1/4`)**: Plain vertical stem `|`.
  - **Eighth Note (`1/8`)**: Single curved flag `|/` or horizontal primary beam `|__|`.
  - **Sixteenth Note (`1/16`)**: Double flag `|//`, full double beam `||=||`, or fractional secondary beam stubs (`|/--|`) when mixed adjacent to 1/8th notes.
  - **Dotted Notes**: Cleanly positioned dot indicator placed beside the top of the vertical stem near the staff to prevent flag interference (amber on web screen, pure black `#000000` in PDF/print output).

### Guitar Pro Import Engine (`.gp`, `.gp3`–`.gp5`, `.gpx`)
- **Pristine Single-Note & Polyphonic Import**: Decodes Guitar Pro binary files using `@coderline/alphatab`. Preserves exact track selection, measure barlines, time signatures, note durations, dotted notes, tied/continued notes, and song headers (Title, Artist, Tempo).
- **High-G Ukulele Re-voicing**: Automatically re-voices guitar pitch streams ($E_2$–$E_6$) onto 4-string High-G Ukulele staff lines.

---

## 3. High-Contrast PDF Print & Export Engine
- **Large Song Title Header**: Displays a prominent `18pt` title caption, italicized artist subtitle, and tuning/tempo metadata centered at the top of the PDF.
- **Dynamic Multi-Page Footer**: Displays a clean footer in `9pt` font positioned 1/2" (`0.5in`) above the bottom edge of each printed page showing `"{Title} X of Y"` (where `{Title}` is the dynamic song title, `X` is the current page number via `counter(page)`, and `Y` is the total page count via `counter(pages)`).
- **Right-Justified Measure Layout**: Measure rows wrap dynamically to fit page width and are right-justified flush against the right page margin, placing excess whitespace on the left.
- **Pure Black-on-White Non-Color-Based Engraving**: All notation symbols (dots, flags, stems, beams, time signature digits, chord diagrams, and rests) render in pure `#000000` black on `#ffffff` white background with zero dependency on color.
- **Strict UI Stripping**: All web editing controls, toolbars, popovers, selection highlight rings, and red **✕** deletion badges are 100% hidden in print mode (`no-print`).

---

## 4. Data Storage & Schema (.uketab)

Tabs are stored as JSON files (`.uketab`):
```json
{
  "id": "tab-001",
  "title": "Three Is a Magic Number",
  "artist": "Bob Dorough",
  "tempo": 112,
  "keySignature": "G",
  "tuning": {
    "key": "gCEA",
    "name": "Standard High-G (gCEA)",
    "pitches": [69, 64, 60, 67],
    "stringsDisplay": ["A4", "E4", "C4", "g4"]
  },
  "layout": {
    "stemsPlacement": "below",
    "zoomScale": 1.0,
    "measuresPerSystem": 4,
    "maxFretLimit": 12
  },
  "chordPalette": [
    { "name": "C", "frets": [0, 0, 0, 3], "baseFret": 1 },
    { "name": "G", "frets": [0, 2, 3, 2], "baseFret": 1 }
  ],
  "measures": []
}
```

---

## 5. Automated Testing & Quality Assurance

### Test Runner & Engine
- **Framework**: [Vitest](https://vitest.dev/) native Vite-powered unit test runner.
- **Execution Speed**: Sub-second execution with direct TypeScript transpilation and zero Babel overhead.

### Test Suites & Coverage
1. **Music Theory & Mathematical Engine (`src/utils/musicTheory.test.ts`)**:
   - Multi-tuning pitch calculations (`calculatePitch`) across High-G ($gCEA$), Low-G ($GCEA$), Baritone ($DGBE$), and Soprano D ($aDF\#B$).
   - Pitch transposition and semitone shifting with $0 \le \text{fret} \le 20$ bounds clamping.
   - Beat duration calculations (`getBeatDurationMs`) across all note values (`1/1`–`1/32`), dotted multipliers ($1.5\times$), triplets ($\frac{2}{3}\times$), and speed multipliers.
   - Alternate fret ghost notes solver with `maxFretLimit` filtering.
   - Chord palette resolution (`getDefaultChordPalette`, `getEffectiveChordPalette`), chord detection (`autoDetectChordFromBeatNotes`), and 4-string fret extraction (`extract4StringFrets`).
2. **Guitar Pro Import Parser (`src/utils/guitarProImporter.test.ts`)**:
   - AlphaTab duration code mappings (`convertGpDuration`).
   - Clean lyric syllable hyphenation and whitespace handling (`cleanGpLyric`).
3. **Ukulele Domain Types & Constants (`src/types/ukulele.test.ts`)**:
   - Validation of `DURATION_OPTIONS` and keyboard shortcut mappings `DURATION_KEY_MAP`.
4. **Sample Tab Documents & Generator (`src/utils/sampleData.test.ts`)**:
   - Validation of default sample tab files and blank tab document generation.

### Running Automated Tests
```bash
# Run all unit test suites once
npm test

# Run test runner in live watch mode during development
npm run test:watch
```
