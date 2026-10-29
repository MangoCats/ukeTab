import { BeatColumn } from '../types/tab';
import { getBeatDurationMs } from './musicTheory';

type TimedBeat = Pick<BeatColumn, 'duration' | 'isDotted' | 'isTriplet'>;

export interface MetronomeClick {
  offsetMs: number; // Delay from the moment playback enters the measure (or starts within it)
  accent: boolean;  // First beat of the measure
}

const EPSILON_MS = 1e-6;

/** Actual length of a measure: the sum of its beat column durations (may differ from its time signature). */
export function getMeasureDurationMs(beats: TimedBeat[], tempo: number, speed: number = 1.0): number {
  return beats.reduce((total, beat) => total + getBeatDurationMs(beat, tempo, speed), 0);
}

/**
 * Written length of the notes struck at beats[index]: the column's own duration plus every directly following
 * column marked tied (those continue the sound instead of striking again). beats is the whole song in order.
 */
export function getWrittenNoteDurationMs(
  beats: Pick<BeatColumn, 'duration' | 'isDotted' | 'isTriplet' | 'isTied'>[],
  index: number,
  tempo: number,
  speed: number = 1.0
): number {
  let total = getBeatDurationMs(beats[index], tempo, speed);
  for (let i = index + 1; i < beats.length && beats[i].isTied; i++) {
    total += getBeatDurationMs(beats[i], tempo, speed);
  }
  return total;
}

/** Start time of the beat column at beatIndex, measured from the start of its measure. */
export function getColumnStartOffsetMs(beats: TimedBeat[], beatIndex: number, tempo: number, speed: number = 1.0): number {
  return getMeasureDurationMs(beats.slice(0, beatIndex), tempo, speed);
}

/**
 * Metronome clicks for one measure: one per time-signature beat (tempo counts quarter notes, so a beat lasts
 * (60000 / tempo) × (4 / den) / speed ms), accented on beat 1. Clicks stop at the measure's actual end, so an
 * underfull measure gets fewer and an overfull one no extras. Clicks before startOffsetMs are dropped and the
 * remaining offsets are relative to it, for playback that starts mid-measure.
 */
export function getMeasureClickOffsetsMs(
  timeSignature: [number, number],
  measureDurationMs: number,
  tempo: number,
  speed: number,
  startOffsetMs: number = 0
): MetronomeClick[] {
  const [num, den] = timeSignature;
  const beatMs = (60000 / tempo) * (4 / den) / speed;
  const clicks: MetronomeClick[] = [];
  for (let k = 0; k < num; k++) {
    const clickMs = k * beatMs;
    if (clickMs >= measureDurationMs - EPSILON_MS) break;
    if (clickMs < startOffsetMs - EPSILON_MS) continue;
    clicks.push({ offsetMs: Math.max(0, clickMs - startOffsetMs), accent: k === 0 });
  }
  return clicks;
}
