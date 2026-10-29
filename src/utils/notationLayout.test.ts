import { describe, it, expect } from 'vitest';
import { BeatColumn, DurationType } from '../types/tab';
import {
  computeBeams, computeTripletGroups, shouldShowTimeSignature, getBeatGroupLength, getBeatLengthInQuarters, getFlagCount
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

  it('derives beat-group length from the time signature', () => {
    expect(getBeatGroupLength([4, 4])).toBe(1);
    expect(getBeatGroupLength([3, 4])).toBe(1);
    expect(getBeatGroupLength([2, 2])).toBe(2);
    expect(getBeatGroupLength([4, 1])).toBe(4);
    expect(getBeatGroupLength([6, 8])).toBe(1.5);
    expect(getBeatGroupLength([9, 8])).toBe(1.5);
    expect(getBeatGroupLength([12, 8])).toBe(1.5);
    expect(getBeatGroupLength([3, 8])).toBe(1.5);
    expect(getBeatGroupLength([5, 8])).toBe(1);
    expect(getBeatGroupLength([6, 16])).toBe(0.75);
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
