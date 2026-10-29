import { describe, it, expect } from 'vitest';
import { BeatColumn, DurationType } from '../types/tab';
import {
  computeBeams, computeTripletGroups, shouldShowTimeSignature, getBeatGroupPattern, getBeatGroupIndex, getBeatLengthInQuarters, getFlagCount,
  findRowStartIndices
} from './notationLayout';

let nextId = 0;
const beat = (duration: DurationType, extra: Partial<BeatColumn> = {}): BeatColumn => ({
  id: `b${++nextId}`,
  duration,
  notes: extra.isRest ? [] : [{ id: `n${nextId}`, string: 1, fret: 0 }],
  ...extra
});
const repeat = (n: number, make: () => BeatColumn) => Array.from({ length: n }, make);

describe('notationLayout: durations & beat groups', () => {
  it('counts flags per duration', () => {
    expect(['1/1', '1/2', '1/4', '1/8', '1/16', '1/32'].map(d => getFlagCount(d as DurationType))).toEqual([0, 0, 0, 1, 2, 3]);
  });

  it('measures column lengths in quarters including dots and triplets', () => {
    expect(getBeatLengthInQuarters({ duration: '1/8' })).toBe(0.5);
    expect(getBeatLengthInQuarters({ duration: '1/8', isDotted: true })).toBe(0.75);
    expect(getBeatLengthInQuarters({ duration: '1/8', isTriplet: true })).toBeCloseTo(1 / 3);
    expect(getBeatLengthInQuarters({ duration: '1/1' })).toBe(4);
  });

  it('derives uniform beat-group patterns from the time signature (one measure cycle)', () => {
    expect(getBeatGroupPattern([4, 4])).toEqual({ starts: [0, 1, 2, 3], cycleLength: 4 });
    expect(getBeatGroupPattern([3, 4])).toEqual({ starts: [0, 1, 2], cycleLength: 3 });
    expect(getBeatGroupPattern([2, 2])).toEqual({ starts: [0, 2], cycleLength: 4 });
    expect(getBeatGroupPattern([4, 1])).toEqual({ starts: [0, 4, 8, 12], cycleLength: 16 });
    expect(getBeatGroupPattern([6, 8])).toEqual({ starts: [0, 1.5], cycleLength: 3 });
    expect(getBeatGroupPattern([9, 8])).toEqual({ starts: [0, 1.5, 3], cycleLength: 4.5 });
    expect(getBeatGroupPattern([12, 8])).toEqual({ starts: [0, 1.5, 3, 4.5], cycleLength: 6 });
    expect(getBeatGroupPattern([3, 8])).toEqual({ starts: [0], cycleLength: 1.5 });
    expect(getBeatGroupPattern([6, 16])).toEqual({ starts: [0, 0.75], cycleLength: 1.5 });
    // Measures shorter than one group still use whole quarter groups
    expect(getBeatGroupPattern([1, 8])).toEqual({ starts: [0], cycleLength: 1 });
  });

  it('groups irregular x/8 and x/16 meters as 2+…+2+3 beat units', () => {
    expect(getBeatGroupPattern([5, 8])).toEqual({ starts: [0, 1], cycleLength: 2.5 });
    expect(getBeatGroupPattern([7, 8])).toEqual({ starts: [0, 1, 2], cycleLength: 3.5 });
    expect(getBeatGroupPattern([11, 8])).toEqual({ starts: [0, 1, 2, 3, 4], cycleLength: 5.5 });
    expect(getBeatGroupPattern([5, 16])).toEqual({ starts: [0, 0.5], cycleLength: 1.25 });
    // Odd numbers below 5 and odd x/4 meters stay uniform
    expect(getBeatGroupPattern([1, 8]).starts).toEqual([0]);
    expect(getBeatGroupPattern([5, 4])).toEqual({ starts: [0, 1, 2, 3, 4], cycleLength: 5 });
  });

  it('maps positions to group indices, repeating the pattern beyond one measure', () => {
    const sevenEight = getBeatGroupPattern([7, 8]);
    expect([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map(p => getBeatGroupIndex(p, sevenEight))).toEqual([0, 0, 1, 1, 2, 2, 2, 3, 3]);
    // Uniform patterns match plain floor(position / group length), including triplet thirds
    const fourFour = getBeatGroupPattern([4, 4]);
    expect([0, 1 / 3, 2 / 3, 1, 3.5, 4, 5.25].map(p => getBeatGroupIndex(p, fourFour))).toEqual([0, 0, 0, 1, 3, 4, 5]);
  });
});

describe('notationLayout: computeBeams', () => {
  it('regression: beams break at each quarter beat in 4/4 (8 eighths → four 2-note groups)', () => {
    const layout = computeBeams(repeat(8, () => beat('1/8')), [4, 4]);
    expect(layout.segments).toEqual([0, 2, 4, 6].map(i => ({ startIndex: i, level: 1 })));
    expect(layout.stubs).toEqual([]);
    expect(layout.beamed.every(Boolean)).toBe(true);
  });

  it('regression: beams never connect rest columns', () => {
    const beats = [beat('1/8'), beat('1/8', { isRest: true }), beat('1/8')];
    const layout = computeBeams(beats, [4, 4]);
    expect(layout.segments).toEqual([]);
    expect(layout.stubs).toEqual([]);
    expect(layout.beamed).toEqual([false, false, false]);
    // Unbeamed eighths draw a flag; the rest draws none
    expect(layout.flagCounts).toEqual([1, 0, 1]);
  });

  it('beams a dotted eighth + sixteenth with a level-2 stub pointing left', () => {
    const layout = computeBeams([beat('1/8', { isDotted: true }), beat('1/16')], [4, 4]);
    expect(layout.segments).toEqual([{ startIndex: 0, level: 1 }]);
    expect(layout.stubs).toEqual([{ index: 1, level: 2, direction: 'left' }]);
  });

  it('points a leading sixteenth stub right toward its next neighbour', () => {
    const layout = computeBeams([beat('1/16'), beat('1/8', { isDotted: true })], [4, 4]);
    expect(layout.segments).toEqual([{ startIndex: 0, level: 1 }]);
    expect(layout.stubs).toEqual([{ index: 0, level: 2, direction: 'right' }]);
  });

  it('beams four sixteenths in one beat at levels 1 and 2 across all', () => {
    const layout = computeBeams(repeat(4, () => beat('1/16')), [4, 4]);
    expect(layout.segments).toEqual([
      { startIndex: 0, level: 1 }, { startIndex: 1, level: 1 }, { startIndex: 2, level: 1 },
      { startIndex: 0, level: 2 }, { startIndex: 1, level: 2 }, { startIndex: 2, level: 2 }
    ]);
    expect(layout.stubs).toEqual([]);
  });

  it('regression: 6/8 groups six eighths into two groups of three', () => {
    const layout = computeBeams(repeat(6, () => beat('1/8')), [6, 8]);
    expect(layout.segments).toEqual([0, 1, 3, 4].map(i => ({ startIndex: i, level: 1 })));
  });

  it('keeps eighths within one beat group beamed as before (two eighths in 4/4)', () => {
    const layout = computeBeams([beat('1/8'), beat('1/8'), beat('1/4')], [4, 4]);
    expect(layout.segments).toEqual([{ startIndex: 0, level: 1 }]);
    expect(layout.beamed).toEqual([true, true, false]);
  });

  it('regression: 1/32 pairs are beamed at level 3', () => {
    const layout = computeBeams([beat('1/32'), beat('1/32')], [4, 4]);
    expect(layout.segments).toEqual([1, 2, 3].map(level => ({ startIndex: 0, level })));
    expect(layout.stubs).toEqual([]);
  });

  it('regression: an unbeamed 1/32 gets 3 flags', () => {
    const layout = computeBeams([beat('1/32'), beat('1/4')], [4, 4]);
    expect(layout.segments).toEqual([]);
    expect(layout.beamed).toEqual([false, false]);
    expect(layout.flagCounts[0]).toBe(3);
  });

  it('adds stubs only for levels no joined neighbour shares', () => {
    // 1/16 + 1/32 + 1/16 in one beat: the 1/32 gets one level-3 stub pointing left
    const layout = computeBeams([beat('1/16'), beat('1/32'), beat('1/16')], [4, 4]);
    expect(layout.segments.filter(s => s.level <= 2)).toHaveLength(4);
    expect(layout.stubs).toEqual([{ index: 1, level: 3, direction: 'left' }]);
  });

  it('regression: 5/8 beams as 2+3', () => {
    const layout = computeBeams(repeat(5, () => beat('1/8')), [5, 8]);
    expect(layout.segments).toEqual([0, 2, 3].map(i => ({ startIndex: i, level: 1 })));
    expect(layout.beamed.every(Boolean)).toBe(true);
  });

  it('regression: 7/8 beams as 2+2+3', () => {
    const layout = computeBeams(repeat(7, () => beat('1/8')), [7, 8]);
    expect(layout.segments).toEqual([0, 2, 4, 5].map(i => ({ startIndex: i, level: 1 })));
  });

  it('beams 7/8 sixteenths and eighths by the same 2+2+3 positions', () => {
    // Four sixteenths fill the first group; then eighths 2 | 3
    const beats = [...repeat(4, () => beat('1/16')), ...repeat(5, () => beat('1/8'))];
    const layout = computeBeams(beats, [7, 8]);
    expect(layout.segments.filter(s => s.level === 1).map(s => s.startIndex)).toEqual([0, 1, 2, 4, 6, 7]);
  });

  it('repeats the irregular pattern in an overfull measure (9 eighths in 7/8 → 2+2+3 | 2)', () => {
    const layout = computeBeams(repeat(9, () => beat('1/8')), [7, 8]);
    expect(layout.segments).toEqual([0, 2, 4, 5, 7].map(i => ({ startIndex: i, level: 1 })));
  });

  it('places triplet eighths in beat groups by their shortened length', () => {
    const triplets = repeat(6, () => beat('1/8', { isTriplet: true }));
    const layout = computeBeams(triplets, [2, 4]);
    expect(layout.segments).toEqual([0, 1, 3, 4].map(i => ({ startIndex: i, level: 1 })));
  });
});

describe('notationLayout: computeTripletGroups', () => {
  const t = () => beat('1/8', { isTriplet: true });

  it('chunks a run of 3 into one bracket', () => {
    expect(computeTripletGroups(repeat(3, t))).toEqual([{ startIndex: 0, endIndex: 2 }]);
  });

  it('chunks a run of 4 into 3 + 1', () => {
    expect(computeTripletGroups(repeat(4, t))).toEqual([{ startIndex: 0, endIndex: 2 }, { startIndex: 3, endIndex: 3 }]);
  });

  it('chunks a run of 6 into two brackets of 3', () => {
    expect(computeTripletGroups(repeat(6, t))).toEqual([{ startIndex: 0, endIndex: 2 }, { startIndex: 3, endIndex: 5 }]);
  });

  it('restarts chunking after a non-triplet column', () => {
    const beats = [t(), t(), beat('1/4'), t(), t(), t()];
    expect(computeTripletGroups(beats)).toEqual([{ startIndex: 0, endIndex: 1 }, { startIndex: 3, endIndex: 5 }]);
  });

  it('returns no brackets without triplets', () => {
    expect(computeTripletGroups([beat('1/8'), beat('1/8')])).toEqual([]);
  });
});

describe('notationLayout: shouldShowTimeSignature', () => {
  const measures = [
    { timeSignature: [4, 4] as [number, number] },
    { timeSignature: [4, 4] as [number, number] },
    { timeSignature: [3, 4] as [number, number] },
    { timeSignature: [3, 8] as [number, number] },
    { timeSignature: [3, 8] as [number, number] }
  ];

  it('shows the signature on the first measure and wherever it changes (either number)', () => {
    expect(measures.map((_, i) => shouldShowTimeSignature(measures, i))).toEqual([true, false, true, true, false]);
  });
});

describe('notationLayout: findRowStartIndices', () => {
  it('starts a row at the first block and wherever a block sits lower than the previous one', () => {
    expect(findRowStartIndices([0, 0, 0, 180, 180, 360])).toEqual([0, 3, 5]);
  });

  it('reports only the first block when nothing wraps (or nothing is laid out, as in jsdom)', () => {
    expect(findRowStartIndices([0, 0, 0])).toEqual([0]);
    expect(findRowStartIndices([])).toEqual([]);
  });
});
