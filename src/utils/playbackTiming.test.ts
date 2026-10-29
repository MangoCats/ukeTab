import { describe, it, expect } from 'vitest';
import { getWrittenNoteDurationMs, getMeasureClickOffsetsMs, getMeasureDurationMs, getColumnStartOffsetMs } from './playbackTiming';
import { getNoteSoundSec } from './audioSynth';
import { BeatColumn, DurationType } from '../types/tab';
import { UKULELE_PROFILE } from '../instruments/ukulele';
import { GUITAR_PROFILE } from '../instruments/guitar';

const beats = (...durations: DurationType[]): Pick<BeatColumn, 'duration'>[] => durations.map(duration => ({ duration }));
const offsets = (clicks: { offsetMs: number }[]) => clicks.map(c => c.offsetMs);
const accents = (clicks: { accent: boolean }[]) => clicks.map(c => c.accent);

describe('playbackTiming: measure and column timing', () => {
  it('sums the actual beat durations of a measure, including dots and triplets', () => {
    expect(getMeasureDurationMs(beats('1/4', '1/4', '1/2'), 120)).toBe(2000);
    expect(getMeasureDurationMs([{ duration: '1/4', isDotted: true }, { duration: '1/8' }], 120)).toBe(1000);
    expect(getMeasureDurationMs([{ duration: '1/8', isTriplet: true }, { duration: '1/8', isTriplet: true }, { duration: '1/8', isTriplet: true }], 120)).toBeCloseTo(500);
    expect(getMeasureDurationMs(beats('1/4'), 120, 0.5)).toBe(1000);
    expect(getMeasureDurationMs([], 120)).toBe(0);
  });

  it('gives each column its start offset within the measure', () => {
    const measure = beats('1/4', '1/8', '1/8', '1/2');
    expect(getColumnStartOffsetMs(measure, 0, 120)).toBe(0);
    expect(getColumnStartOffsetMs(measure, 1, 120)).toBe(500);
    expect(getColumnStartOffsetMs(measure, 2, 120)).toBe(750);
    expect(getColumnStartOffsetMs(measure, 3, 120)).toBe(1000);
    expect(getColumnStartOffsetMs(measure, 3, 120, 2)).toBe(500);
  });
});

describe('playbackTiming: metronome clicks', () => {
  it('clicks 4 times 500 ms apart in 4/4 at 120 BPM, accenting the first', () => {
    const clicks = getMeasureClickOffsetsMs([4, 4], 2000, 120, 1);
    expect(offsets(clicks)).toEqual([0, 500, 1000, 1500]);
    expect(accents(clicks)).toEqual([true, false, false, false]);
  });

  it('clicks 6 eighth-note beats of 250 ms in 6/8 at 120 BPM', () => {
    const clicks = getMeasureClickOffsetsMs([6, 8], 1500, 120, 1);
    expect(offsets(clicks)).toEqual([0, 250, 500, 750, 1000, 1250]);
    expect(accents(clicks)).toEqual([true, false, false, false, false, false]);
  });

  it('stretches 3/4 clicks at half speed', () => {
    const clicks = getMeasureClickOffsetsMs([3, 4], 3000, 120, 0.5);
    expect(offsets(clicks)).toEqual([0, 1000, 2000]);
  });

  it('gives an underfull measure only the clicks that fit before it ends', () => {
    // Three quarters in a 4/4 measure
    const measureMs = getMeasureDurationMs(beats('1/4', '1/4', '1/4'), 120);
    expect(offsets(getMeasureClickOffsetsMs([4, 4], measureMs, 120, 1))).toEqual([0, 500, 1000]);
  });

  it('gives an overfull measure no extra clicks', () => {
    // Six quarters in a 4/4 measure
    const measureMs = getMeasureDurationMs(beats('1/4', '1/4', '1/4', '1/4', '1/4', '1/4'), 120);
    expect(offsets(getMeasureClickOffsetsMs([4, 4], measureMs, 120, 1))).toEqual([0, 500, 1000, 1500]);
  });

  it('starting mid-measure keeps only later clicks, relative to the start', () => {
    // Start on beat 2 exactly: it still clicks, unaccented
    const onBeat = getMeasureClickOffsetsMs([4, 4], 2000, 120, 1, 500);
    expect(offsets(onBeat)).toEqual([0, 500, 1000]);
    expect(accents(onBeat)).toEqual([false, false, false]);

    // Start between beats 1 and 2: the next click waits for beat 2
    expect(offsets(getMeasureClickOffsetsMs([4, 4], 2000, 120, 1, 250))).toEqual([250, 750, 1250]);
  });

  it('regression: metronome clicks once per beat, not once per note column', () => {
    // Eight eighth-note columns in 4/4 used to give eight clicks
    const measure = beats('1/8', '1/8', '1/8', '1/8', '1/8', '1/8', '1/8', '1/8');
    const clicks = getMeasureClickOffsetsMs([4, 4], getMeasureDurationMs(measure, 120), 120, 1);
    expect(clicks).toHaveLength(4);
    expect(offsets(clicks)).toEqual([0, 500, 1000, 1500]);
  });
});

describe('playbackTiming: note length', () => {
  const song = (...columns: [DurationType, boolean?][]) => columns.map(([duration, isTied]) => ({ duration, isTied }));

  it('uses the column duration for an untied note', () => {
    expect(getWrittenNoteDurationMs(song(['1/4'], ['1/4']), 0, 120)).toBe(500);
    expect(getWrittenNoteDurationMs(song(['1/8']), 0, 120, 0.5)).toBe(500);
  });

  it('adds every directly following tied column, across measures and up to the song end', () => {
    const tied = song(['1/4'], ['1/4', true], ['1/2', true], ['1/4'], ['1/4', true]);
    expect(getWrittenNoteDurationMs(tied, 0, 120)).toBe(2000);
    expect(getWrittenNoteDurationMs(tied, 3, 120)).toBe(1000);
  });

  it('regression: playback note length follows the written duration, capped by the natural sustain', () => {
    expect(getNoteSoundSec(UKULELE_PROFILE.synthVoice, 0.25)).toBe(0.25);
    expect(getNoteSoundSec(UKULELE_PROFILE.synthVoice, 4)).toBe(UKULELE_PROFILE.synthVoice.maxSustainSec);
    expect(getNoteSoundSec(GUITAR_PROFILE.synthVoice, 2)).toBe(2);
    expect(getNoteSoundSec(GUITAR_PROFILE.synthVoice)).toBe(GUITAR_PROFILE.synthVoice.maxSustainSec);
  });
});
