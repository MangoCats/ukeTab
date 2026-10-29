import { describe, it, expect } from 'vitest';
import { BASS_PROFILE, BASS_TUNINGS, BASS_CHORD_LIBRARY } from './bass';
import { getInstrumentProfile, INSTRUMENT_LIST } from './index';
import { createBlankTabDocument } from '../utils/sampleData';
import { expectValidTunings, expectChordsSpelledCorrectly } from './chordSpelling.testUtil';

describe('bass: Instrument Profile', () => {
  it('is registered as a 4-string instrument after ukulele and guitar', () => {
    expect(getInstrumentProfile('bass')).toBe(BASS_PROFILE);
    expect(INSTRUMENT_LIST.map(p => p.id)).toEqual(['ukulele', 'guitar', 'bass']);
    expect(BASS_PROFILE.stringCount).toBe(4);
    expect(BASS_PROFILE.defaultTuning).toBe(BASS_TUNINGS.EADG);
  });

  it('defines every tuning with 4 strings whose labels match their pitches', () => {
    expect(BASS_PROFILE.tunings).toHaveLength(Object.keys(BASS_TUNINGS).length);
    expectValidTunings(BASS_PROFILE.tunings, 4);
  });

  it('spells every double-stop shape correctly in standard tuning', () => {
    expectChordsSpelledCorrectly(BASS_CHORD_LIBRARY, BASS_TUNINGS.EADG);
  });

  it('starts new bass tabs in standard tuning with a power-chord palette', () => {
    const doc = createBlankTabDocument(BASS_PROFILE);
    expect(doc.instrument).toBe('bass');
    expect(doc.title).toBe('Untitled Bass Tab');
    expect(doc.tuning.key).toBe('EADG');
    expect(doc.chordPalette!.map(c => c.name)).toEqual(BASS_PROFILE.defaultChordNames);
  });
});
