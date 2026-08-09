# UkeTab 🪕

> **Interactive Ukulele Tab Chart Creator, Renderer, and Web Studio**

UkeTab is a modern web application designed for Ukulele players, teachers, and arrangers. It enables seamless creation, editing, visualization, audio playback, and export of Ukulele tablature with traditional rhythm stems and synced lyrics.

---

## ✨ Key Features

- 🎼 **4-Line Ukulele Staff**: Specifically engineered for Ukulele with High-G ($gCEA$), Low-G ($GCEA$), Baritone ($DGBE$), and custom tunings.
- ⏱️ **Traditional Rhythm Notation**: Rhythmic stems (whole, half, 1/4, 1/8, 1/16, triplets, dotted notes, rests) displayed directly below the 4-line staff.
- 🎤 **Synchronized Lyrics**: Dedicated lyric track aligned column-by-column with note stems.
- 🖥️ **WYSIWYG Web Editor**: Interactive point-and-click or keyboard-driven editing with real-time visual updates.
- 🔊 **Audio Playback**: Built-in audio synthesizer with real-time playhead tracking across measures.
- 💡 **Alternate Fret Helper**: Automatic candidate fret suggestion ("ghost frets") on unassigned strings for easy fingering choices.
- 🔄 **Key & Tuning Transposition**: 1-click transposition across keys (+/- semitones) and string tunings with automatic tab recalculation.
- 📄 **Multi-Format Export & Zoom Control**:
  - Compact digital storage (`.uketab` JSON).
  - Scalable PDF output with **Zoom Levels** (Compact 75%, Standard 100%, Large/Distance 150%).
  - Standard MIDI (`.mid`) export and **MIDI File Import** with automatic fret mapping.

---

## 📚 Documentation

- [📋 Project & Notation Specification](file:///c:/Users/Mango%20Cat/Dev/UkeTab/docs/PROJECT_SPECIFICATION.md): Comprehensive guide to visual tab specs, rhythm notation standards, data schemas, alternate fret algorithms, and rendering rules.
- [🏗️ Software Architecture Document](file:///c:/Users/Mango%20Cat/Dev/UkeTab/docs/SOFTWARE_ARCHITECTURE.md): Technical architecture, data models, SVG rendering pipeline, Web Audio synthesis, and export subsystems.

---

## 🚀 Technology Stack

- **Frontend**: React 18, TypeScript, HTML5 SVG Vector Engine
- **Audio**: Web Audio API / Tone.js
- **Export Engines**: `jsPDF` + `svg2pdf.js`, `@tonejs/midi`
- **Build System**: Vite

---

## 🗺️ Project Roadmap

- [x] Phase 1: Project Definition & Notation Specifications
- [ ] Phase 2: Core Domain Model & SVG Vector Renderer Prototype
- [ ] Phase 3: Interactive WYSIWYG Editor & Audio Playback Engine
- [ ] Phase 4: Transposition Engine & Alternate Fret Helper
- [ ] Phase 5: PDF Generator with Zoom Scaling & MIDI Import/Export
