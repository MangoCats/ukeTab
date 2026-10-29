import { describe, it, expect } from 'vitest';
import { getInstrumentProfile, getDocumentProfile, getTuningProfile, DEFAULT_INSTRUMENT_ID, INSTRUMENT_PROFILES, INSTRUMENT_LIST } from './index';
import { UKULELE_PROFILE, UKULELE_TUNINGS } from './ukulele';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from './guitar';
import { expectChordsSpelledCorrectly } from './chordSpelling.testUtil';
import { InstrumentProfile } from '../types/tab';
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

    const notes = [1, 2, 3, 4].map(s => ({ id: `n${s}`, string: s, fret: 1 }));
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

describe('instruments: Chord Shapes Follow the Document Tuning', () => {
  it('spells every library chord correctly in every tuning of every instrument', () => {
    INSTRUMENT_LIST.forEach(profile => {
      profile.tunings.forEach(tuning => {
        const library = getTuningProfile(profile, tuning).chordLibrary;
        // Ukulele shapes are voiced for re-entrant High-G, so the bottom line is not always the root
        expectChordsSpelledCorrectly(library, tuning, { rootInBass: profile.id !== 'ukulele' });
        Object.values(library).flat().forEach(f => expect(f, `${profile.name} ${tuning.name}`).toBeLessThanOrEqual(profile.maxFret));
      });
    });
  });

  it('passes the instrument profile through for its default tuning and keeps the default palette names', () => {
    expect(getDocumentProfile(createBlankTabDocument(GUITAR_PROFILE))).toBe(GUITAR_PROFILE);
    expect(getDocumentProfile({ tuning: UKULELE_PROFILE.defaultTuning })).toBe(UKULELE_PROFILE);

    const dropD = getDocumentProfile({ instrument: 'guitar', tuning: GUITAR_TUNINGS.DADGBE });
    expect(dropD).not.toBe(GUITAR_PROFILE);
    expect({ ...dropD, chordLibrary: GUITAR_PROFILE.chordLibrary }).toEqual(GUITAR_PROFILE);
    expect(getDefaultChordPalette(dropD).map(c => c.name)).toEqual(GUITAR_PROFILE.defaultChordNames);
    expect(dropD.chordLibrary['E']).toEqual([2, 2, 2, 1, 0, 0]);
    expect(dropD.chordLibrary['A']).toEqual([-1, 0, 2, 2, 2, 0]);
  });

  it('returns the same adapted profile object for the same tuning pitches', () => {
    const doc = { instrument: 'guitar' as const, tuning: GUITAR_TUNINGS.DADGBE };
    expect(getDocumentProfile(doc)).toBe(getDocumentProfile({ ...doc, tuning: { ...GUITAR_TUNINGS.DADGBE } }));
    expect(getDocumentProfile(doc)).not.toBe(getDocumentProfile({ ...doc, tuning: GUITAR_TUNINGS.DADGAD }));

    // Low-G differs from High-G only by an octave on String 4, so the shapes are unchanged
    const lowG = getDocumentProfile({ instrument: 'ukulele', tuning: UKULELE_TUNINGS.GCEA });
    expect(lowG.chordLibrary).toEqual(UKULELE_CHORD_LIBRARY);
  });
});
