/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import SPEC from '../docs/PROJECT_SPECIFICATION.md?raw';
import ARCH from '../docs/SOFTWARE_ARCHITECTURE.md?raw';
import { INSTRUMENT_LIST } from './instruments';
import { InstrumentProfile } from './types/tab';
import { SHORTCUTS } from './utils/shortcuts';

/**
 * Keeps docs/ in step with the code: each check fails when a document and the implementation disagree,
 * so behaviour changes must update the documentation in the same commit.
 */

/**
 * Text of the section whose heading starts with the given prefix (e.g. '### 3.1'), up to the next heading
 * of the same or a higher level.
 */
function section(doc: string, headingPrefix: string): string {
  const lines = doc.split(/\r?\n/);
  const start = lines.findIndex(l => l.startsWith(headingPrefix));
  if (start === -1) throw new Error(`Section "${headingPrefix}" not found`);
  const level = headingPrefix.match(/^#+/)![0].length;
  const end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level);
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

/**
 * Markdown table rows of a section as arrays of trimmed cells (header and separator rows excluded).
 */
function tableRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(l => l.trim().startsWith('|') && !/^\|\s*-/.test(l.trim()))
    .slice(1)
    .map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
}

const stripBackticks = (text: string) => text.replace(/`/g, '');
const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);

// Every file under src/ as 'src/...' paths (the glob is resolved by Vite; no module is loaded). The glob
// leaves out the importing file, so this file is added explicitly.
const SRC_FILES = [
  ...Object.keys(import.meta.glob('./**/*.{ts,tsx,css}')).map(f => `src/${f.replace(/^\.\//, '')}`),
  'src/docsConsistency.test.ts'
];
const isTestFile = (f: string) => /\.test\.tsx?$/.test(f);
const isTestHelper = (f: string) => /\.testUtil\.ts$/.test(f);

describe('docs: Product Specification matches the code', () => {
  it('§3.1 tuning table lists every preset in menu order with its labels', () => {
    const documented = tableRows(section(SPEC, '### 3.1')).map(([instrument, name, labels]) => [instrument, name, labels]);
    const expected = INSTRUMENT_LIST.flatMap(p => p.tunings.map(t => [p.name, t.name, t.stringsDisplay.join(' ')]));
    expect(documented).toEqual(expected);
  });

  it('§3.2 states each chord library size and default palette', () => {
    const rows = tableRows(section(SPEC, '### 3.2'));
    INSTRUMENT_LIST.forEach(p => {
      const row = rows.find(r => r[0] === p.name);
      expect(row, `${p.name} row`).toBeDefined();
      expect(Number(row![1].match(/\d+/)![0]), `${p.name} library size`).toBe(Object.keys(p.chordLibrary).length);
      expect(row![2], `${p.name} default palette`).toBe(p.defaultChordNames.join(' '));
    });
  });

  it('§5.5 shortcut table lists every shortcut with its keys and description, in order', () => {
    const documented = tableRows(section(SPEC, '### 5.5')).map(([keys, action]) => [stripBackticks(keys), stripBackticks(action)]);
    expect(documented).toEqual(SHORTCUTS.map(s => [s.keys, s.description]));
  });

  it('§8 lists every tuning preset key', () => {
    const keyRow = tableRows(section(SPEC, '## 8.')).find(r => r[0] === '`tuning.key`')!;
    INSTRUMENT_LIST.forEach(p => p.tunings.forEach(t => expect(keyRow[1], t.key).toContain(`\`${t.key}\``)));
  });
});

describe('docs: Software Architecture matches the code', () => {
  it('§2 source layout names every source file', () => {
    const layout = section(ARCH, '## 2.');
    SRC_FILES.filter(f => !isTestFile(f) && !isTestHelper(f)).forEach(f => {
      expect(layout.includes(f) || layout.includes(`\`${basename(f)}\``), `${f} missing from §2`).toBe(true);
    });
  });

  it('§10 test inventory names every test file and only existing ones', () => {
    const inventory = section(ARCH, '## 10.');
    const testFiles = SRC_FILES.filter(f => isTestFile(f) || isTestHelper(f));
    testFiles.forEach(f => {
      const shortPath = f.replace(/^src\//, '');
      expect(inventory.includes(shortPath) || inventory.includes(`\`${basename(f)}\``), `${f} missing from §10`).toBe(true);
    });
    const listed = [...inventory.matchAll(/`([\w/.]+\.(?:test\.tsx?|testUtil\.ts))`/g)].map(m => basename(m[1]));
    listed.forEach(name => expect(testFiles.map(f => basename(f)), `${name} listed but missing`).toContain(name));
  });

  it('§4 profile table matches numeric and flag profile fields and library sizes', () => {
    const rows = tableRows(section(ARCH, '## 4.'));
    const fields: (keyof InstrumentProfile)[] = ['stringCount', 'defaultMaxFretLimit', 'maxFret', 'importMaxFret', 'exportMidiProgram', 'importKeepsSourceFingering'];
    fields.forEach(field => {
      const row = rows.find(r => r[0] === `\`${field}\``);
      expect(row, `${field} row`).toBeDefined();
      INSTRUMENT_LIST.forEach((p, i) => expect(row![i + 1], `${field} for ${p.name}`).toBe(String(p[field])));
    });
    const libraryRow = rows.find(r => r[0] === '`chordLibrary`')!;
    INSTRUMENT_LIST.forEach((p, i) => expect(libraryRow[i + 1]).toBe(`${Object.keys(p.chordLibrary).length} entries`));
  });
});
