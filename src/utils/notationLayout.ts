import { BeatColumn, DurationType, Measure } from '../types/tab';

// Pure rhythm-notation layout decisions for TabRenderer. All results are index based (no pixel coordinates).

export interface BeamSegment {
  startIndex: number; // Beat column index the beam starts at; it ends at startIndex + 1
  level: number;      // 1 = primary beam at the stem end, 2 / 3 = secondary beams toward the staff
}

export interface BeamStub {
  index: number;               // Beat column the stub hangs from
  level: number;
  direction: 'left' | 'right'; // Toward the previous joined neighbour if any, else the next
}

export interface BeamLayout {
  segments: BeamSegment[];
  stubs: BeamStub[];
  beamed: boolean[];     // Per column: joined to at least one neighbour (draws no flags)
  flagCounts: number[];  // Per column: flags of a beamable column, 0 for rests and non-flagged durations
}

export interface TripletGroup {
  startIndex: number; // First beat column of the bracket
  endIndex: number;   // Last beat column of the bracket (inclusive)
}

const QUARTER_LENGTHS: Record<DurationType, number> = {
  '1/1': 4,
  '1/2': 2,
  '1/4': 1,
  '1/8': 0.5,
  '1/16': 0.25,
  '1/32': 0.125
};

/** Number of flags (or beam levels) a duration carries: 1/8 → 1, 1/16 → 2, 1/32 → 3, otherwise 0. */
export function getFlagCount(duration: DurationType): number {
  return duration === '1/8' ? 1 : duration === '1/16' ? 2 : duration === '1/32' ? 3 : 0;
}

/** Column length in quarter notes, including dot (× 1.5) and triplet (× 2/3). Rests count the same as notes. */
export function getBeatLengthInQuarters(beat: Pick<BeatColumn, 'duration' | 'isDotted' | 'isTriplet'>): number {
  let length = QUARTER_LENGTHS[beat.duration] ?? 1;
  if (beat.isDotted) length *= 1.5;
  if (beat.isTriplet) length *= 2 / 3;
  return length;
}

export interface BeatGroupPattern {
  starts: number[];    // Group start positions in quarter notes within one cycle, ascending, starting at 0
  cycleLength: number; // Cycle length in quarter notes; positions beyond it repeat the pattern from the start
}

/**
 * Beam groups for one measure of a time signature, in quarter notes:
 * - compound x/8 and x/16 (number divisible by 3): groups of three beat units (dotted beats);
 * - irregular x/8 and x/16 (odd number ≥ 5, not compound): groups of two units, the last group three (7/8 → 2+2+3);
 * - otherwise uniform groups of one beat unit, but at least a quarter.
 * The cycle is one measure (uniform groups: rounded up to whole groups), so an overfull measure repeats the pattern.
 */
export function getBeatGroupPattern(timeSignature: [number, number]): BeatGroupPattern {
  const [num, den] = timeSignature;
  const unit = 4 / den;
  if ((den === 8 || den === 16) && num % 3 === 0) {
    return uniformPattern(3 * unit, num * unit);
  }
  if ((den === 8 || den === 16) && num % 2 === 1 && num >= 5) {
    const starts = Array.from({ length: (num - 3) / 2 + 1 }, (_, i) => i * 2 * unit);
    return { starts, cycleLength: num * unit };
  }
  return uniformPattern(Math.max(unit, 1), num * unit);
}

// Uniform groups of groupLength covering at least one measure (and at least one group)
function uniformPattern(groupLength: number, measureLength: number): BeatGroupPattern {
  const count = Math.max(1, Math.ceil(measureLength / groupLength - 1e-9));
  return { starts: Array.from({ length: count }, (_, i) => i * groupLength), cycleLength: count * groupLength };
}

/** Beam-group index of a column starting at position (quarters from the measure start); overflow cycles continue the count. */
export function getBeatGroupIndex(position: number, pattern: BeatGroupPattern): number {
  const cycle = Math.floor(position / pattern.cycleLength + 1e-9);
  const within = position - cycle * pattern.cycleLength;
  let index = 0;
  pattern.starts.forEach((start, i) => {
    if (within + 1e-9 >= start) index = i;
  });
  return cycle * pattern.starts.length + index;
}

/** Beams, stubs and flags for one measure. Beams join adjacent beamable (non-rest, flagged) columns within the same beat group. */
export function computeBeams(beats: BeatColumn[], timeSignature: [number, number]): BeamLayout {
  const pattern = getBeatGroupPattern(timeSignature);
  const flagCounts = beats.map(b => (b.isRest ? 0 : getFlagCount(b.duration)));

  // Beat group of each column from its start position in the measure
  const groups: number[] = [];
  let position = 0;
  for (const b of beats) {
    groups.push(getBeatGroupIndex(position, pattern));
    position += getBeatLengthInQuarters(b);
  }

  // joinedToNext[i]: columns i and i + 1 share a beam
  const joinedToNext = beats.map((_, i) =>
    i + 1 < beats.length && flagCounts[i] > 0 && flagCounts[i + 1] > 0 && groups[i] === groups[i + 1]
  );
  const beamed = beats.map((_, i) => joinedToNext[i] || (i > 0 && joinedToNext[i - 1]));

  const segments: BeamSegment[] = [];
  const stubs: BeamStub[] = [];
  const maxLevel = Math.max(0, ...flagCounts);

  // Emitted level by level, then by column, so the primary beams come first
  for (let level = 1; level <= maxLevel; level++) {
    beats.forEach((_, i) => {
      if (!beamed[i] || flagCounts[i] < level) return;
      const joinedPrev = i > 0 && joinedToNext[i - 1];
      const joinedNext = joinedToNext[i];
      const sharedPrev = joinedPrev ? Math.min(flagCounts[i], flagCounts[i - 1]) : 0;
      const sharedNext = joinedNext ? Math.min(flagCounts[i], flagCounts[i + 1]) : 0;

      if (sharedNext >= level) {
        segments.push({ startIndex: i, level });
      } else if (Math.max(sharedPrev, sharedNext) < level) {
        stubs.push({ index: i, level, direction: joinedPrev ? 'left' : 'right' });
      }
    });
  }

  return { segments, stubs, beamed, flagCounts };
}

/** Triplet brackets for one measure: runs of consecutive triplet columns split into chunks of 3 (the last chunk may hold 1–2). */
export function computeTripletGroups(beats: BeatColumn[]): TripletGroup[] {
  const result: TripletGroup[] = [];
  let runStart = -1;
  for (let i = 0; i <= beats.length; i++) {
    const inRun = i < beats.length && !!beats[i].isTriplet;
    if (inRun && runStart < 0) runStart = i;
    if (!inRun && runStart >= 0) {
      for (let s = runStart; s < i; s += 3) {
        result.push({ startIndex: s, endIndex: Math.min(s + 2, i - 1) });
      }
      runStart = -1;
    }
  }
  return result;
}

/** A measure shows its time signature when it is the first measure or its signature differs from the previous measure's. */
export function shouldShowTimeSignature(measures: Pick<Measure, 'timeSignature'>[], index: number): boolean {
  if (index <= 0) return true;
  const current = measures[index].timeSignature;
  const previous = measures[index - 1].timeSignature;
  return current[0] !== previous[0] || current[1] !== previous[1];
}

/** Row-start measure indices from each measure block's offsetTop (blocks wrap left to right, so a new row starts lower). */
export function findRowStartIndices(offsetTops: number[]): number[] {
  return offsetTops.flatMap((top, i) => (i === 0 || top - offsetTops[i - 1] > 0.5 ? [i] : []));
}
