# UkeTab 🪕

> **Interactive Ukulele Tab Chart Creator, Renderer, and Web Studio**

UkeTab is a modern web application designed for Ukulele players, teachers, and arrangers. It enables seamless creation, editing, visualization, audio playback, file import/export, and clean PDF print generation of Ukulele tablature with traditional rhythm stems, ukulele chord diagram charts, and synced lyrics.

---

## 🛠️ Quick Start & Setup

For step-by-step instructions on setting up your environment, running the development server (`npm run dev`), and building for production (`npm run build`), see:
👉 **[HOWTO.md](file:///c:/Users/Mango%20Cat/Dev/UkeTab/HOWTO.md)**

---

## ✨ Key Features

- 🎼 **4-Line Ukulele Staff**: Engineered specifically for Ukulele with High-G ($gCEA$), Low-G ($GCEA$), Baritone ($DGBE$), Soprano D ($aDF\#B$), and custom tunings.
- 🪕 **Ukulele Chord Diagram Charts Above Tabs**: Render 4-line fingering grids with filled dots (frets), open circles `○` (open strings), `✕` (muted strings), base fret indicators (e.g. `3fr`), and chord name labels (`Am`, `E7`, `G`, `D`, `F`, `C`, `Dm`) positioned directly above tabs in both web editor and PDF export.
- 🎼 **Continuous System Engraving**: Staff lines run continuously across measures with 1 clef string header and 1 time signature per system row.
- ⏱️ **Traditional Vertically Stacked Time Signatures**: Numerator stacked over denominator ($\mathbf{\frac{4}{4}}$) in bold classical serif engraving typography.
- ⏱️ **Traditional Rhythm Stems & Flags**: Stem lines, single flags (`1/8`), double flags (`1/16`), horizontal beams, dotted notes, rests, triplets, and ties displayed directly on the staff.
- ➕ **In-Measure Beat Event Editing**: Insert new note events / beat columns anywhere inside a measure using **`+ Insert Beat`** or keyboard shortcut **`+`**.
- 🎤 **Synchronized Lyrics**: Dedicated lyric track aligned column-by-column with note stems.
- 🖥️ **WYSIWYG Interactive Editor**: Floating context action bar directly over selected notes, touch inspector pad with chord presets, and full keyboard shortcuts (`0-9`, `←/→/↑/↓`, `w/h/q/e/s`, `.`, `r`, `t`, `l`, `+`, `Backspace`).
- 🔊 **Audio Playback & Metronome**: Built-in Web Audio synthesizer with real-time playhead tracking, metronome clicks, and speed multiplier (`0.5x`–`1.25x`).
- 🪕 **Unified Max Fret Limit & Alternate Fret Helper**: Configurable limit (`maxFretLimit`, default 12, user selectable 7..20) applying to both the fret selection button list and equivalent pitch ghost notes `(3)`.
- 🔄 **Key & Tuning Transposition**: 1-click transposition across keys (+/- semitones) and string tunings with automatic tab recalculation.
- 📄 **Clean PDF Print Export Engine**:
  - Displays a large, bold `28pt` Song Title Caption, artist subtitle, and tuning/tempo metadata.
  - Renders chord diagrams in high-contrast crisp black lines and dots.
  - Automatically strips all web UI controls, toolbars, selection rings, and red **✕** deletion badges in PDF mode.
- 📂 **Digital Storage & File Import**:
  - Save and Open `.uketab` JSON files.

---

## 📚 Documentation

- [📖 Execution & Setup Guide (HOWTO.md)](file:///c:/Users/Mango%20Cat/Dev/UkeTab/HOWTO.md): Environment setup, running locally, building, and previewing.
- [📋 Project & Notation Specification](file:///c:/Users/Mango%20Cat/Dev/UkeTab/docs/PROJECT_SPECIFICATION.md): Comprehensive guide to visual tab specs, rhythm notation standards, data schemas, alternate fret algorithms, and rendering rules.
- [🏗️ Software Architecture Document](file:///c:/Users/Mango%20Cat/Dev/UkeTab/docs/SOFTWARE_ARCHITECTURE.md): Technical architecture, data models, SVG rendering pipeline, Web Audio synthesis, and export subsystems.

---

## 🚀 Technology Stack

- **Frontend**: React 18, TypeScript, HTML5 SVG Vector Engine
- **Audio**: Web Audio API Synthesizer & Metronome
- **Print & PDF Engine**: Browser High-DPI Vector Printing Engine
- **Build System**: Vite

---

## 🗺️ Project Roadmap

- [x] Phase 1: Project Definition & Notation Specifications
- [x] Phase 2: Core Domain Model & SVG Vector Renderer Prototype
- [x] Phase 3: Interactive WYSIWYG Editor & Audio Playback Engine
- [x] Phase 4: Transposition Engine & Alternate Fret Helper
- [x] Phase 5: PDF Generator with Zoom Scaling, Ukulele Chord Diagrams & Storage (.uketab)
