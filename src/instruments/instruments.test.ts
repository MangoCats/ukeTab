import { describe, it, expect } from 'vitest';
import { getInstrumentProfile, DEFAULT_INSTRUMENT_ID, INSTRUMENT_PROFILES } from './index';
import { UKULELE_PROFILE } from './ukulele';
import { InstrumentProfile } from '../types/ukulele';
import {
  TUNING_PRESETS,
  UKULELE_CHORD_LIBRARY,
  DEFAULT_COMPOSITION_CHORD_NAMES,
  getChordPreset,
  getDefaultChordPalette,
  findExistingChordsByFrets,
  autoDetectChordFromBeatNotes
} from '../utils/musicTheory';
import { createBlankTabDocument } from '../utils/sampleData';

// Minimal stand-in profile to prove chord helpers read from the profile passed in, not the ukulele data
const TEST_PROFILE: InstrumentProfile = {
  ...UKULELE_PROFILE,
  name: 'Test Instrument',
  chordLibrary: { 'X': [1, 1, 1, 1] },
  defaultChordNames: ['X'],
  defaultMaxFretLimit: 15
};

describe('instruments: Profile Registry', () => {
  it('resolves documents without an instrument field to the ukulele profile', () => {
    expect(DEFAULT_INSTRUMENT_ID).toBe('ukulele');
    expect(getInstrumentProfile()).toBe(UKULELE_PROFILE);
    expect(getInstrumentProfile(undefined)).toBe(UKULELE_PROFILE);
    expect(getInstrumentProfile('ukulele')).toBe(INSTRUMENT_PROFILES.ukulele);
  });

  it('keeps legacy musicTheory exports pointing at the ukulele profile data', () => {
    expect(UKULELE_PROFILE.stringCount).toBe(4);
    expect(UKULELE_PROFILE.defaultTuning).toBe(TUNING_PRESETS.gCEA);
    expect(UKULELE_PROFILE.chordLibrary).toBe(UKULELE_CHORD_LIBRARY);
    expect(UKULELE_PROFILE.defaultChordNames).toBe(DEFAULT_COMPOSITION_CHORD_NAMES);
    expect(UKULELE_PROFILE.tunings.map(t => t.key)).toEqual(['gCEA', 'GCEA', 'DGBE', 'aDF#B']);
    UKULELE_PROFILE.tunings.forEach(t => expect(t.pitches).toHaveLength(UKULELE_PROFILE.stringCount));
  });
});

describe('instruments: Chord Helpers Use the Given Profile', () => {
  it('looks up presets and the default palette in the profile chord library', () => {
    expect(getChordPreset('X', TEST_PROFILE)?.frets).toEqual([1, 1, 1, 1]);
    expect(getChordPreset('C', TEST_PROFILE)).toBeNull();
    expect(getChordPreset('C')?.frets).toEqual([0, 0, 0, 3]);
    expect(getDefaultChordPalette(TEST_PROFILE).map(c => c.name)).toEqual(['X']);
  });

  it('matches fret patterns and auto-detects chords against the profile library', () => {
    expect(findExistingChordsByFrets([1, 1, 1, 1], {}, TEST_PROFILE)).toEqual(['X']);
    expect(findExistingChordsByFrets([0, 0, 0, 3], {}, TEST_PROFILE)).toEqual([]);

    const notes = [1, 2, 3, 4].map(s => ({ id: `n${s}`, string: s as 1 | 2 | 3 | 4, fret: 1 }));
    expect(autoDetectChordFromBeatNotes(notes, [], TEST_PROFILE)?.name).toBe('X');
  });

  it('creates blank documents from the profile defaults', () => {
    const doc = createBlankTabDocument(TEST_PROFILE);
    expect(doc.title).toBe('Untitled Test Instrument Tab');
    expect(doc.instrument).toBe('ukulele');
    expect(doc.layout.maxFretLimit).toBe(15);
    expect(doc.chordPalette!.map(c => c.name)).toEqual(['X']);
  });
});
