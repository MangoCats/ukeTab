# UkeTab Technical Specification & Architectural Manual

## 1. Product Overview & Core Purpose
**UkeTab** is a modern interactive web application for creating, editing, listening to, and exporting 4-line Ukulele tablature.
It features standard stringed instrument notation with fret numbers on staff lines, traditional rhythm stems/flags/beams, lyrics, Web Audio synthesis, and configurable fingering aids.

---

## 2. Visual Notation & Rendering Specs

### Staff & Lines
- **Staff Lines**: Exactly 4 horizontal lines.
- **Default High-G ($gCEA$) String Ordering**:
  - String 1 (Top Line): $A_4$ (440 Hz)
  - String 2 (2nd Line): $E_4$ (329.63 Hz)
  - String 3 (3rd Line): $C_4$ (261.63 Hz)
  - String 4 (Bottom Line): $g_4$ (392.00 Hz) High-G re-entrant tuning.

### Fret Number Representation
- Fret numbers (`0` through `20`) are rendered directly on staff lines inside solid pitch-black line cutout boxes (`#020617`).
- Fret digits are rendered in high-contrast white (`#ffffff`) or sky-blue when active.

### Configurable Alternate Fret Helper
- When a note is placed on a string, equivalent pitch frets on remaining unassigned strings are rendered in parenthesized ghost format `(3)`.
- **User-Selectable Fret Suggestion Limit**:
  - Default Limit: **Fret 12**
  - User Options: `Fret 7`, `Fret 10`, `Fret 12 (Default)`, `Fret 15`, `Fret 20`.

### Rhythm Notation
- Stems default to below staff lines, user-configurable to above staff.
- Stems, flags, and horizontal beams visually distinguish:
  - **Whole Note (`1/1`)**: Open ring
  - **Half Note (`1/2`)**: Open circle stem base
  - **Quarter Note (`1/4`)**: Plain vertical stem `|`
  - **Eighth Note (`1/8`)**: Single flag `|/` or horizontal beam `|__|`
  - **Sixteenth Note (`1/16`)**: Double flag `|//` or double beam `||=||`
  - **Dotted Notes**: Amber dot attached to stem base.

---

## 3. Data Storage & Schema (.uketab)

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
    "maxFretSuggestion": 12
  },
  "measures": []
}
```
