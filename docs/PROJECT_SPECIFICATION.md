# UkeTab Technical Specification & Architectural Manual

## 1. Product Overview & Core Purpose
**UkeTab** is a modern interactive web application for creating, editing, listening to, and exporting 4-line Ukulele tablature.
It features standard stringed instrument notation with fret numbers on staff lines, traditional rhythm stems/flags/beams, lyrics, Web Audio synthesis, continuous staff system engraving, clean PDF export, ukulele chord diagrams, Guitar Pro import (`.gp`, `.gp3`–`.gp5`, `.gpx`), MIDI file import (`.mid`), and configurable fingering aids.

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

### Fret Number Representation
- Fret numbers (`0` through `20`) are rendered directly on staff lines inside solid pitch-black line cutout boxes (`#020617`).
- Fret digits are rendered in high-contrast white (`#ffffff`) or sky-blue when active.

### Unified Max Fret Limit Control
- **User-Selectable Fret Limit (`maxFretLimit`)**:
  - Default Limit: **Fret 12**
  - User Options: `Fret 7`, `Fret 10`, `Fret 12 (Default)`, `Fret 15`, `Fret 20`.
  - Applies to **both**:
    1. **Fret Selection Button List**: Inline popover toolbar and Inspector panel render fret buttons `0` through `maxFretLimit`.
    2. **Alternate Fret Helper**: Equivalent pitch suggestions (parenthesized ghost frets `(3)`) are filtered up to `maxFretLimit`.

### Rhythm Notation & Time Signatures
- **Traditional Vertically Stacked Time Signature ($\mathbf{\frac{4}{4}}$)**:
  - Numerator sits centered over upper staff lines; denominator sits centered over lower staff lines in bold serif typography (`font-weight: 800`, `26px`).
- **Rhythm Stems & Flags**:
  - Default to below staff lines, user-configurable to above staff.
  - **Whole Note (`1/1`)**: Open ring
  - **Half Note (`1/2`)**: Open circle stem base
  - **Quarter Note (`1/4`)**: Plain vertical stem `|`
  - **Eighth Note (`1/8`)**: Single flag `|/` or horizontal beam `|__|`
  - **Sixteenth Note (`1/16`)**: Double flag `|//` or double beam `||=||`
  - **Dotted Notes**: Amber dot attached to stem base.

### Guitar Pro Import Engine (`.gp`, `.gp3`–`.gp5`, `.gpx`)
- **Pristine Single-Note & Polyphonic Import**: Decodes Guitar Pro binary files using `@coderline/alphatab`. Preserves exact track selection, measure barlines, time signatures, note durations, dotted notes, and song headers (Title, Artist, Tempo).
- **High-G Ukulele Re-voicing**: Automatically re-voices guitar pitch streams ($E_2$–$E_6$) onto 4-string High-G Ukulele staff lines.

### MIDI Import Engine (`.mid` / `.midi`)
- **Automated Import**: Imports MIDI files, parses header tempo/time signatures, and automatically converts note pitch streams into draft Ukulele tab charts.
- **High-G Pitch Solver**: Automatically transposes pitches outside High-G range ($C_4$ to $A_5$) and solves optimal string $s \in \{1..4\}$ and fret $f \in [0..15]$ assignments.

---

## 3. High-Contrast PDF Print Engine
- **Large Song Title Header**: Displays a prominent `28pt` title caption (**"Aloha Ukulele Groove"**), italicized artist subtitle, and tuning/tempo metadata centered at the top of the PDF.
- **Strict UI Stripping**: All web editing controls, popovers, selection highlight rings, and red **✕** deletion badges are 100% hidden in print mode (`no-print`).

---

## 4. Data Storage & Schema (.uketab)

Tabs are stored as JSON files (`.uketab`):
```json
{
  "id": "tab-001",
  "title": "Aloha Ukulele Groove",
  "artist": "Traditional",
  "tempo": 100,
  "keySignature": "C",
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
  "measures": []
}
```
