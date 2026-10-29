import { describe, it, expect } from 'vitest';
import { GUITAR_PROFILE, GUITAR_TUNINGS, GUITAR_CHORD_LIBRARY } from './guitar';
import { getInstrumentProfile } from './index';
import { createBlankTabDocument } from '../utils/sampleData';
import { getChordPreset } from '../utils/musicTheory';
import { expectValidTunings, expectChordsSpelledCorrectly } from './chordSpelling.testUtil';

describe('guitar: Instrument Profile', () => {
  it('is registered as a 6-string instrument', () => {
    expect(getInstrumentProfile('guitar')).toBe(GUITAR_PROFILE);
    expect(GUITAR_PROFILE.stringCount).toBe(6);
    expect(GUITAR_PROFILE.defaultTuning).toBe(GUITAR_TUNINGS.EADGBE);
  });

  it('defines every tuning with 6 strings whose labels match their pitches', () => {
    expect(GUITAR_PROFILE.tunings).toHaveLength(Object.keys(GUITAR_TUNINGS).length);
    expectValidTunings(GUITAR_PROFILE.tunings, 6);
  });

  it('spells every library chord correctly in standard tuning', () => {
    expectChordsSpelledCorrectly(GUITAR_CHORD_LIBRARY, GUITAR_TUNINGS.EADGBE);
  });

  it('starts new guitar tabs in standard tuning with a guitar chord palette', () => {
    const doc = createBlankTabDocument(GUITAR_PROFILE);
    expect(doc.instrument).toBe('guitar');
    expect(doc.title).toBe('Untitled Guitar Tab');
    expect(doc.tuning.key).toBe('EADGBE');
    expect(doc.chordPalette!.map(c => c.name)).toEqual(GUITAR_PROFILE.defaultChordNames);
    doc.chordPalette!.forEach(c => expect(c.frets).toHaveLength(6));
  });

  it('places high barre chords on a base fret so they fit the 4-fret diagram', () => {
    expect(getChordPreset('Eb', GUITAR_PROFILE)?.baseFret).toBe(6);
    expect(getChordPreset('C#m', GUITAR_PROFILE)?.baseFret).toBe(4);
    expect(getChordPreset('F', GUITAR_PROFILE)?.baseFret).toBe(1);
  });
});
