import * as alphaTab from '@coderline/alphatab';
import { TabDocument } from '../types/tab';
import { buildAlphaTabScore } from './alphaTabScore';

/**
 * Writes the document as a Guitar Pro 7 (.gp) file: one track for the instrument with its tuning, capo, notation
 * staff and tablature (see buildAlphaTabScore 'instrumentStaff'), plus title, artist, tempo, time and key signatures,
 * chords and lyrics.
 */
export function exportGuitarPro(doc: TabDocument): Uint8Array {
  const settings = new alphaTab.Settings();
  const score = buildAlphaTabScore(doc, 'instrumentStaff', settings);
  return new alphaTab.exporter.Gp7Exporter().export(score, settings);
}

/**
 * File name for a download: the title in lower case with spaces as underscores (as for .uketab files).
 */
export function getExportFileName(doc: Pick<TabDocument, 'title'>, extension: string): string {
  return `${(doc.title || 'untitled').toLowerCase().replace(/\s+/g, '_')}.${extension}`;
}
