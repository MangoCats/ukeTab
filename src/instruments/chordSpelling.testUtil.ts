import { expect } from 'vitest';
import { ChordFretLibrary, TuningConfig } from '../types/tab';

// Shared assertions for instrument profile tests (not a test file itself)

const NATURAL_PITCH_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Chord tones as semitone intervals above the root, keyed by chord name suffix
const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  'm': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'm7': [0, 3, 7, 10],
  '7m': [0, 3, 7, 10], // UkuTabs shorthand for m7
  'maj7': [0, 4, 7, 11],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 2, 4, 7],
  '5': [0, 7]
};

function pitchClassOf(letter: string, accidental: string): number {
  return (NATURAL_PITCH_CLASSES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;
}

export function noteNameToMidi(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`Bad note name ${name}`);
  return pitchClassOf(match[1], match[2]) + (parseInt(match[3], 10) + 1) * 12;
}

/**
 * Checks each tuning has the expected string count, labels matching its pitches, and strings ordered high to low.
 */
export function expectValidTunings(tunings: TuningConfig[], stringCount: number) {
  tunings.forEach(t => {
    expect(t.pitches, t.name).toHaveLength(stringCount);
    expect(t.stringsDisplay.map(noteNameToMidi), t.name).toEqual(t.pitches);
    // Strings run high (String 1, top line) to low (String N, bottom line)
    t.pitches.slice(1).forEach((p, i) => expect(p, t.name).toBeLessThan(t.pitches[i]));
  });
}

/**
 * Checks every chord shape, played in the given tuning, has the root in the bass, sounds only chord tones,
 * and sounds every chord tone except possibly the fifth. Pass rootInBass: false for re-entrant tunings
 * (e.g. High-G ukulele), whose bottom-line string is not the lowest pitch.
 */
export function expectChordsSpelledCorrectly(
  library: ChordFretLibrary,
  tuning: TuningConfig,
  { rootInBass = true }: { rootInBass?: boolean } = {}
) {
  const stringCount = tuning.pitches.length;

  Object.entries(library).forEach(([name, frets]) => {
    expect(frets, name).toHaveLength(stringCount);

    const match = /^([A-G])([#b]?)(.*)$/.exec(name)!;
    const root = pitchClassOf(match[1], match[2]);
    const intervals = QUALITY_INTERVALS[match[3]];
    expect(intervals, `unknown chord quality in ${name}`).toBeDefined();

    // frets[i] is String (N - i); its open pitch is pitches[N - 1 - i]
    const sounded = frets
      .map((f, i) => (f >= 0 ? tuning.pitches[stringCount - 1 - i] + f : null))
      .filter((p): p is number => p !== null);
    const soundedIntervals = new Set(sounded.map(p => (p - root + 120) % 12));

    if (rootInBass) expect((sounded[0] - root + 120) % 12, `${name} bass note is the root`).toBe(0);
    soundedIntervals.forEach(iv => expect(intervals, `${name} sounds a non-chord tone`).toContain(iv));
    intervals.filter(iv => iv !== 7).forEach(iv => expect(soundedIntervals.has(iv), `${name} is missing interval ${iv}`).toBe(true));
  });
}
