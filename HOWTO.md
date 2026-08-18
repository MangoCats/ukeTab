# UkeTab - Environment Setup & Execution Guide

This document provides step-by-step instructions for setting up the development environment, installing dependencies, running the application locally, and creating production builds.

---

## 📋 Prerequisites

Before setting up UkeTab, ensure you have the following installed on your operating system:

1. **Node.js**: Version **18.0.0** or higher (LTS recommended).
   - Check version: `node -v`
   - Download: [nodejs.org](https://nodejs.org/)
2. **npm** (Node Package Manager): Version **9.0.0** or higher (included with Node.js).
   - Check version: `npm -v`
3. **Git**: Version **2.20+**.
   - Check version: `git --version`

---

## ⚙️ Environment Setup & Installation

### 1. Clone the Repository
Clone the project repository from GitHub to your local machine:
```bash
git clone git@github.com:MangoCats/ukeTab.git
cd ukeTab
```

### 2. Install Dependencies
Install all required Node.js packages and dependencies (React, Vite, TypeScript, Lucide Icons, alphaTab Guitar Pro parser, Tone.js MIDI parser):
```bash
npm install
```

---

## 🚀 Running the Project

### Development Server (Hot-Reloading)
To launch the interactive local development server with instant hot-reloading:
```bash
npm run dev
```

Once started, open your web browser and navigate to:
👉 **[http://localhost:3000/](http://localhost:3000/)** (or the URL printed in your terminal).

---

## 📦 Production Build & Testing

### 1. Type Check & Compile Production Bundle
To compile TypeScript files and create an optimized production bundle in the `dist/` directory:
```bash
npm run build
```

### 2. Preview Production Build
To test and preview the production build locally:
```bash
npm run preview
```

---

## 🪕 Key Application Features

- **WYSIWYG 4-Line Ukulele Staff**: Edit tab fret numbers, traditional rhythm stems/flags, and lyrics.
- **Ukulele Chord Diagram Charts**: Assign 4-line fingering grids with filled dots (frets), open circles (`○`), muted markers (`✕`), and chord titles above tabs.
- **Composition Chord Palette Manager**: Limit chord dropdowns to relevant song chords or define custom chord fingerings.
- **Auto Chord Recognition**: Auto-populates matching chord definitions when 4-string beats are selected.
- **Guitar Pro Importer (`.gp`, `.gp3`–`.gp5`, `.gpx`)**: Import Guitar Pro files to generate pristine Ukulele tab charts with exact measure barlines and rhythm stems.
- **MIDI File Importer (`.mid` / `.midi`)**: Import `.mid` files to auto-generate draft Ukulele tab charts with High-G string/fret solver.
- **PDF Print Export Engine**: Export clean, high-contrast sheet music without web editing controls.
- **Save & Open `.uketab` JSON Files**: Store and reload tab documents locally.
