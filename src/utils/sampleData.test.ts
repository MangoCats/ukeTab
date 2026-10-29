import { describe, it, expect } from 'vitest';
import {
  createBlankTabDocument,
  SAMPLE_TAB_DOCUMENT,
  CONJUNCTION_JUNCTION_TAB,
  THREE_IS_A_MAGIC_NUMBER_TAB,
  ALOHA_GROOVE_TAB
} from './sampleData';
import { extractChordFrets } from './musicTheory';
import { getNotationKey } from './musicKeys';

describe('sampleData: Tab Document Models & Blank Document Generator', () => {
  it('generates a valid blank document with initialized chord palette and 1 measure', () => {
    const doc = createBlankTabDocument();

    expect(doc.id).toMatch(/^tab-blank-/);
    expect(doc.title).toBe('Untitled Ukulele Tab');
    expect(doc.tempo).toBe(120);
    expect(doc.tuning.key).toBe('gCEA');
    expect(doc.chordPalette).toBeDefined();
    expect(doc.chordPalette!.length).toBeGreaterThan(0);
    expect(doc.measures).toHaveLength(1);
    expect(doc.measures[0].beats).toHaveLength(4);
    expect(doc.measures[0].timeSignature).toEqual([4, 4]);
  });

  it('contains valid pre-configured sample tabs with measures and notes', () => {
    expect(CONJUNCTION_JUNCTION_TAB.measures.length).toBeGreaterThan(0);
    expect(THREE_IS_A_MAGIC_NUMBER_TAB.measures.length).toBeGreaterThan(0);
    expect(ALOHA_GROOVE_TAB.measures.length).toBeGreaterThan(0);

    // Verify sample tab has valid 4-string beats
    const firstBeatNotes = CONJUNCTION_JUNCTION_TAB.measures[0].beats[0].notes;
    expect(firstBeatNotes.length).toBe(4);
  });

  it('marks the startup song chords, matching each strummed chord shape, so it prints in G', () => {
    const beats = SAMPLE_TAB_DOCUMENT.measures.flatMap(m => m.beats);
    expect(beats.filter(b => b.chord).map(b => b.chord!.name)).toEqual(['G', 'Em', 'C', 'Am', 'D7', 'G', 'C', 'G']);
    beats.filter(b => b.chord && b.notes.length === 4).forEach(b => {
      expect(b.chord!.frets).toEqual(extractChordFrets(b.notes, 4));
    });
    expect(getNotationKey(SAMPLE_TAB_DOCUMENT)).toEqual({ key: 'G', isGuessed: true });
  });
});
