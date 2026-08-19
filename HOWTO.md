# UkeTab - Environment Setup & Execution Guide

This document provides step-by-step instructions for setting up the development environment, installing dependencies, running the application locally, and creating production builds.

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
Install all required Node.js packages and dependencies (React, Vite, TypeScript, Lucide Icons, alphaTab Guitar Pro parser):
```bash
npm install
```

---

## 📦 Production Build & Testing

### 1. Run Automated Unit Test Suites
To run all automated unit tests via Vitest:
```bash
npm test
```

To run the test runner in interactive live watch mode during active development:
```bash
npm run test:watch
```

### 2. Type Check & Compile Production Bundle
To compile TypeScript files and create an optimized production bundle in the `dist/` directory:
```bash
npm run build
```

### 3. Preview Production Build
To test and preview the production build locally:
```bash
npm run preview
```

