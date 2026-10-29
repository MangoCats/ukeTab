# UkeTab 🪕

> **Interactive Ukulele, Guitar & Bass Tab Creator, Player and Printer**

UkeTab is a browser application for writing, editing, playing back, printing and importing tablature for **ukulele (4 strings), guitar (6 strings) and bass (4 strings)**, with rhythm notation, chord diagrams and lyrics.

---

## 🛠️ Quick Start

```bash
npm install
npm run dev      # http://localhost:3000
```

Full setup, test and build instructions: **[HOWTO.md](HOWTO.md)**.

---

## ✨ Features

- 🎸 **Three instruments**: choose Ukulele, Guitar or Bass from **New Tab** or **Open Guitar Pro**. Each has its own tunings, chord library, default chord palette and playback voice.
  - Ukulele: High-G (gCEA), Low-G (GCEA), Baritone (DGBE), Soprano D (aDF#B).
  - Guitar: Standard, Drop D, Half-Step Down, Open G, Open D, DADGAD; open, barre and power chords.
  - Bass: Standard (EADG), Drop D, Half-Step Down, BEAD; root-fifth double stops.
- 🎼 **Tab staff**: one line per string, fret numbers on the lines, muted strings as `X`, string labels and time signature at the start of the song, measures that wrap to the page width, zoom 75% / 100% / 150%.
- ⏱️ **Rhythm notation**: whole to sixteenth notes with stems (below or above the staff), flags, beams with sixteenth-note stubs, dotted notes, traditional rest symbols, and tied notes shown as `(n)` with an arc. Triplets affect playback timing.
- 🎵 **Chord diagrams** above any beat, with base-fret labels (e.g. `6fr`). Chords are detected automatically when every string has a note. A per-song chord palette can be edited and extended with custom chords.
- 🖥️ **Editing**: click a string to enter a note; a popover above the selected beat and an inspector panel at the bottom; full keyboard control (`0`–`9` frets, `x` muted, `w h q e s` durations, `.` dot, `r` rest, `t` triplet, `l` tie, `+` insert beat, arrows, `Backspace`, `Space`).
- 🪄 **Alternate fret helper**: suggests the same pitch on other strings, up to a configurable Max Fret Limit (7, 10, 12, 15, 20).
- 🔊 **Playback**: Web Audio synthesizer with a per-instrument voice, metronome, playhead highlight and speed 0.5×–1.25×.
- 🔄 **Transpose** the whole song ±1 semitone at a time.
- 📂 **Files**: save and open `.uketab` (JSON); import Guitar Pro `.gp`, `.gp3`–`.gp5`, `.gpx`. Guitar and bass imports keep the source tuning and fingering; ukulele imports re-fit the notes onto 4 strings.
- 📄 **Print / PDF**: black-on-white output with a title header, `{Title} X of Y` page footer and right-aligned measure rows, without editor controls.
- 🧪 **Automated tests** for music theory, instruments, chord shapes, Guitar Pro import and UI components.

---

## 📚 Documentation

- [HOWTO.md](HOWTO.md): prerequisites, install, run, test, build and preview.
- [Product Specification](docs/PROJECT_SPECIFICATION.md): complete user-visible behaviour, including instruments, notation, editing, playback, file format, import, print and known limitations.
- [Software Architecture](docs/SOFTWARE_ARCHITECTURE.md): source layout, data model, instrument profiles, algorithms, rendering, audio, import/export internals and the test inventory.

---

## 🚀 Technology Stack

- **Frontend**: React 18, TypeScript, hand-written SVG notation
- **Audio**: Web Audio API
- **Guitar Pro parsing**: `@coderline/alphatab`
- **Print / PDF**: browser print with CSS print rules
- **Build & tests**: Vite, Vitest (jsdom)

---

## 💻 Commands

```bash
npm run dev         # Development server (http://localhost:3000)
npm test            # Run all tests once
npm run test:watch  # Run tests in watch mode
npm run build       # Type-check and build to dist/
npm run preview     # Serve the production build
```

---

## 🗺️ Roadmap

- [x] Phase 1: Project definition & notation specification
- [x] Phase 2: Core domain model & SVG renderer
- [x] Phase 3: Interactive editor & audio playback
- [x] Phase 4: Transposition & alternate fret helper
- [x] Phase 5: PDF output, chord diagrams & `.uketab` storage
- [x] Phase 6: Automated test suite & high-contrast print notation
- [x] Phase 7: Instrument profiles, 6-string guitar and 4-string bass modes
