import { NotationKey, TabDocument } from '../types/tab';
import { transposeChordName } from './musicTheory';

/**
 * Key signatures for standard notation. A key is named by its major tonic; the relative minor shares its signature.
 */

// One spelling per pitch class (index = pitch class), with at most 6 sharps or 5 flats
export const NOTATION_KEYS: NotationKey[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Sharps (positive) or flats (negative) in each key signature
export const KEY_SIGNATURE_ACCIDENTALS: Record<NotationKey, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5
};

const RELATIVE_MINORS: Record<NotationKey, string> = {
  C: 'A', Db: 'Bb', D: 'B', Eb: 'C', E: 'C#', F: 'D', 'F#': 'D#', G: 'E', Ab: 'F', A: 'F#', Bb: 'G', B: 'G#'
};

const PITCH_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const DEFAULT_NOTATION_KEY: NotationKey = 'C';

export function isNotationKey(value: unknown): value is NotationKey {
  return typeof value === 'string' && (NOTATION_KEYS as string[]).includes(value);
}

export function getKeyPitchClass(key: NotationKey): number {
  return NOTATION_KEYS.indexOf(key);
}

/** "G major / E minor" */
export function getKeyName(key: NotationKey): string {
  return `${key} major / ${RELATIVE_MINORS[key]} minor`;
}

/** "G major / E minor (1♯)" */
export function getKeyLabel(key: NotationKey): string {
  const count = KEY_SIGNATURE_ACCIDENTALS[key];
  const signature = count === 0 ? 'no ♯/♭' : count > 0 ? `${count}♯` : `${-count}♭`;
  return `${getKeyName(key)} (${signature})`;
}

export function transposeKey(key: NotationKey, semitones: number): NotationKey {
  return NOTATION_KEYS[(((getKeyPitchClass(key) + semitones) % 12) + 12) % 12];
}

type ChordQuality = 'major' | 'minor' | 'diminished' | 'neutral';

/**
 * Root pitch class and triad quality of a chord name, or null for names that do not start with A-G.
 * Minor: suffix starting "m" or "min" but not "maj"; diminished: "dim", "°", "m7b5" or "ø"; neutral (fits either
 * quality): "5" power chords and "sus" chords; everything else (7, maj7, 6, add9, aug, ...) is major.
 */
export function parseChordQuality(name: string): { root: number; quality: ChordQuality } | null {
  const match = /^([A-G])([#b]?)([^/]*)/.exec(name.trim());
  if (!match) return null;
  const [, letter, accidental, suffix] = match;
  const root = (PITCH_CLASSES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;

  let quality: ChordQuality = 'major';
  if (/^(dim|°|m7b5|ø)/.test(suffix)) quality = 'diminished';
  else if (/^m(?!aj)/.test(suffix)) quality = 'minor';
  else if (/^(5|sus)/.test(suffix)) quality = 'neutral';
  return { root, quality };
}

// Triad quality on each scale degree (semitones above the tonic) of a major key
const DIATONIC_TRIADS: Record<number, ChordQuality> = { 0: 'major', 2: 'minor', 4: 'minor', 5: 'major', 7: 'major', 9: 'minor', 11: 'diminished' };

/**
 * Guesses the key signature of a chord progression (chord names in playing order), or null when no name is a
 * recognisable chord. Each key scores 1 per chord whose root is in the key and whose quality matches the key's
 * triad on that degree (neutral chords match any quality), plus 0.5 each when the first and last chords are the
 * key's major tonic or relative minor tonic. Repeated chords count once per change, not once per beat.
 * Ties go to the key with fewer sharps or flats, then to the earlier key in NOTATION_KEYS.
 */
export function guessKeyFromChords(chordNames: string[]): NotationKey | null {
  const chords = chordNames.map(parseChordQuality).filter((c): c is NonNullable<typeof c> => c !== null);
  const changes = chords.filter((c, i) => i === 0 || c.root !== chords[i - 1].root || c.quality !== chords[i - 1].quality);
  if (changes.length === 0) return null;

  const isTonic = (c: { root: number; quality: ChordQuality }, tonic: number) => {
    const degree = (c.root - tonic + 12) % 12;
    return (degree === 0 && c.quality !== 'minor' && c.quality !== 'diminished') || (degree === 9 && (c.quality === 'minor' || c.quality === 'neutral'));
  };

  let bestKey = NOTATION_KEYS[0];
  let bestScore = -1;
  for (const [tonic, key] of NOTATION_KEYS.entries()) {
    let score = 0;
    changes.forEach(c => {
      const expected = DIATONIC_TRIADS[(c.root - tonic + 12) % 12];
      if (expected && (c.quality === expected || c.quality === 'neutral')) score += 1;
    });
    if (isTonic(changes[0], tonic)) score += 0.5;
    if (isTonic(changes[changes.length - 1], tonic)) score += 0.5;

    const fewerAccidentals = score === bestScore
      && Math.abs(KEY_SIGNATURE_ACCIDENTALS[key]) < Math.abs(KEY_SIGNATURE_ACCIDENTALS[bestKey]);
    if (score > bestScore || fewerAccidentals) {
      bestKey = key;
      bestScore = score;
    }
  }
  return bestKey;
}

/**
 * The song's chord names as they sound, in playing order: every beat chord marker, with capo-relative shape names
 * raised by the capo (capo 2 + "G" shape = "A").
 */
export function getSoundingChordNames(doc: Pick<TabDocument, 'measures' | 'capo'>): string[] {
  const capo = doc.capo ?? 0;
  return doc.measures.flatMap(m => m.beats.flatMap(b => (b.chord ? [transposeChordName(b.chord.name, capo)] : [])));
}

/**
 * The key used for standard notation: the document's chosen key, otherwise the key guessed from its sounding chord
 * names, otherwise C.
 */
export function getNotationKey(doc: Pick<TabDocument, 'measures' | 'capo' | 'key'>): { key: NotationKey; isGuessed: boolean } {
  if (isNotationKey(doc.key)) return { key: doc.key, isGuessed: false };
  return { key: guessKeyFromChords(getSoundingChordNames(doc)) ?? DEFAULT_NOTATION_KEY, isGuessed: true };
}
