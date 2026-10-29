import { describe, it, expect } from 'vitest';
import { GUITAR_PROFILE, GUITAR_TUNINGS, GUITAR_CHORD_LIBRARY } from './guitar';
import { getInstrumentProfile, INSTRUMENT_LIST } from './index';
import { createBlankTabDocument } from '../utils/sampleData';
import { getChordPreset } from '../utils/musicTheory';

const NATURAL_PITCH_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Chord tones as semitone intervals above the root, keyed by chord name suffix
const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  'm': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'm7': [0, 3, 7, 10],
  'maj7': [0, 4, 7, 11],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 2, 4, 7],
  '5': [0, 7]
};

function pitchClassOf(letter: string, accidental: string): number {
  return (NATURAL_PITCH_CLASSES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;
}

function noteNameToMidi(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`Bad note name ${name}`);
  return pitchClassOf(match[1], match[2]) + (parseInt(match[3], 10) + 1) * 12;
}

describe('guitar: Instrument Profile', () => {
  it('is registered as a 6-string instrument', () => {
    expect(getInstrumentProfile('guitar')).toBe(GUITAR_PROFILE);
    expect(INSTRUMENT_LIST.map(p => p.id)).toEqual(['ukulele', 'guitar']);
    expect(GUITAR_PROFILE.stringCount).toBe(6);
    expect(GUITAR_PROFILE.defaultTuning).toBe(GUITAR_TUNINGS.EADGBE);
  });

  it('defines every tuning with 6 strings whose labels match their pitches', () => {
    expect(GUITAR_PROFILE.tunings).toHaveLength(Object.keys(GUITAR_TUNINGS).length);
    GUITAR_PROFILE.tunings.forEach(t => {
      expect(t.pitches).toHaveLength(6);
      expect(t.stringsDisplay.map(noteNameToMidi)).toEqual(t.pitches);
      // Strings run high (String 1, top line) to low (String 6, bottom line)
      t.pitches.slice(1).forEach((p, i) => expect(p).toBeLessThan(t.pitches[i]));
    });
  });

  it('spells every library chord correctly in standard tuning', () => {
    const pitches = GUITAR_TUNINGS.EADGBE.pitches;

    Object.entries(GUITAR_CHORD_LIBRARY).forEach(([name, frets]) => {
      expect(frets, name).toHaveLength(6);

      const match = /^([A-G])([#b]?)(.*)$/.exec(name)!;
      const root = pitchClassOf(match[1], match[2]);
      const intervals = QUALITY_INTERVALS[match[3]];
      expect(intervals, `unknown chord quality in ${name}`).toBeDefined();

      // frets[i] is String (6 - i); its open pitch is pitches[5 - i]
      const sounded = frets
        .map((f, i) => (f >= 0 ? pitches[5 - i] + f : null))
        .filter((p): p is number => p !== null);
      const soundedIntervals = new Set(sounded.map(p => (p - root + 120) % 12));

      expect((sounded[0] - root + 120) % 12, `${name} bass note is the root`).toBe(0);
      soundedIntervals.forEach(iv => expect(intervals, `${name} sounds a non-chord tone`).toContain(iv));
      // Every chord tone is sounded, except that the fifth may be omitted
      intervals.filter(iv => iv !== 7).forEach(iv => expect(soundedIntervals.has(iv), `${name} is missing interval ${iv}`).toBe(true));
    });
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
