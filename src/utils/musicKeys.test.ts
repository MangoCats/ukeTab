import { describe, it, expect } from 'vitest';
import { BeatColumn } from '../types/tab';
import { getChordPreset } from './musicTheory';
import {
  KEY_SIGNATURE_ACCIDENTALS, NOTATION_KEYS, getKeyLabel, getKeyName, getKeyPitchClass, getNotationKey,
  getSoundingChordNames, guessKeyFromChords, isNotationKey, parseChordQuality, transposeKey
} from './musicKeys';

// One measure of quarter beats carrying the named chord markers (null = a beat without a chord)
const songWithChords = (names: (string | null)[], capo = 0) => ({
  capo,
  measures: [{
    id: 'm1', index: 1, timeSignature: [4, 4] as [number, number],
    beats: names.map((name, i): BeatColumn => ({
      id: `b${i}`, duration: '1/4', notes: [], chord: name ? (getChordPreset(name) ?? { name, frets: [0, 0, 0, 0] }) : undefined
    }))
  }]
});

describe('musicKeys: key signatures', () => {
  it('names each pitch class once, with each signature\'s tonic a fifth per sharp from C', () => {
    expect(NOTATION_KEYS).toHaveLength(12);
    NOTATION_KEYS.forEach(key => {
      expect((((KEY_SIGNATURE_ACCIDENTALS[key] * 7) % 12) + 12) % 12).toBe(getKeyPitchClass(key));
    });
  });

  it('labels keys with their relative minor and signature', () => {
    expect(getKeyName('G')).toBe('G major / E minor');
    expect(getKeyLabel('G')).toBe('G major / E minor (1♯)');
    expect(getKeyLabel('Bb')).toBe('Bb major / G minor (2♭)');
    expect(getKeyLabel('C')).toBe('C major / A minor (no ♯/♭)');
    expect(getKeyLabel('F#')).toBe('F# major / D# minor (6♯)');
  });

  it('transposes keys around the octave', () => {
    expect(transposeKey('B', 1)).toBe('C');
    expect(transposeKey('C', -1)).toBe('B');
    expect(transposeKey('Eb', 2)).toBe('F');
    expect(transposeKey('G', 14)).toBe('A');
  });

  it('recognises key names', () => {
    expect(isNotationKey('Bb')).toBe(true);
    expect(isNotationKey('A#')).toBe(false);
    expect(isNotationKey(undefined)).toBe(false);
  });
});

describe('musicKeys: chord qualities', () => {
  it.each([
    ['C', 0, 'major'], ['Cmaj7', 0, 'major'], ['C7', 0, 'major'], ['Caug', 0, 'major'],
    ['Cm', 0, 'minor'], ['Cm7', 0, 'minor'], ['Cmin', 0, 'minor'], ['F#m', 6, 'minor'], ['Bbm', 10, 'minor'],
    ['Bdim', 11, 'diminished'], ['Bm7b5', 11, 'diminished'], ['B°', 11, 'diminished'],
    ['Dsus4', 2, 'neutral'], ['E5', 4, 'neutral'], ['G/B', 7, 'major']
  ])('%s has root %i and is %s', (name, root, quality) => {
    expect(parseChordQuality(name)).toEqual({ root, quality });
  });

  it('ignores names that are not chords', () => {
    expect(parseChordQuality('N.C.')).toBeNull();
    expect(parseChordQuality('')).toBeNull();
  });
});

describe('musicKeys: guessing the key from chords', () => {
  it.each([
    [['C', 'F', 'G', 'Am'], 'C'],
    [['G', 'C', 'D', 'Em'], 'G'],
    [['A7', 'D7', 'E7'], 'A'],
    [['F', 'Bb', 'C'], 'F'],
    [['Bb', 'Eb', 'F7'], 'Bb'],
    [['Em', 'C', 'G', 'D'], 'G'],
    [['Am', 'Dm', 'E', 'Am'], 'C'],
    [['D', 'A', 'Bm', 'G'], 'D'],
    [['E', 'A', 'B7', 'C#m'], 'E']
  ])('%j is in %s', (chords, key) => {
    expect(guessKeyFromChords(chords as string[])).toBe(key);
  });

  it('counts a repeated chord once per change', () => {
    expect(guessKeyFromChords(['G', 'G', 'G', 'G', 'C', 'D'])).toBe(guessKeyFromChords(['G', 'C', 'D']));
  });

  it('prefers fewer sharps or flats when keys tie', () => {
    // Em-Am: in C (iii, vi; ends on the relative minor) and in G (vi, ii; starts on the relative minor) both 2.5
    expect(guessKeyFromChords(['Em', 'Am'])).toBe('C');
    // A lone Dm is the tonic of D minor, which shares F's signature
    expect(guessKeyFromChords(['Dm'])).toBe('F');
  });

  it('returns null without recognisable chords', () => {
    expect(guessKeyFromChords([])).toBeNull();
    expect(guessKeyFromChords(['N.C.'])).toBeNull();
  });

  it('reads the sounding chord names of a song, raised by the capo', () => {
    expect(getSoundingChordNames(songWithChords(['G', null, 'C', 'D7']))).toEqual(['G', 'C', 'D7']);
    expect(getSoundingChordNames(songWithChords(['G', 'C'], 2))).toEqual(['A', 'D']);
  });

  it('uses a chosen key, else the key guessed from the sounding chords, else C', () => {
    expect(getNotationKey({ ...songWithChords(['G', 'C', 'D']), key: 'Eb' })).toEqual({ key: 'Eb', isGuessed: false });
    expect(getNotationKey(songWithChords(['G', 'C', 'D']))).toEqual({ key: 'G', isGuessed: true });
    expect(getNotationKey(songWithChords(['G', 'C', 'D'], 2))).toEqual({ key: 'A', isGuessed: true });
    expect(getNotationKey(songWithChords([null, null]))).toEqual({ key: 'C', isGuessed: true });
  });
});
