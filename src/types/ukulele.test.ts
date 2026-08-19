import { describe, it, expect } from 'vitest';
import { DURATION_OPTIONS, DURATION_KEY_MAP } from './ukulele';

describe('ukulele domain types & constants', () => {
  it('defines all standard duration options', () => {
    expect(DURATION_OPTIONS).toHaveLength(5);
    expect(DURATION_OPTIONS.map(d => d.value)).toEqual(['1/1', '1/2', '1/4', '1/8', '1/16']);
    expect(DURATION_OPTIONS.map(d => d.label)).toEqual(['1', '1/2', '1/4', '1/8', '1/16']);
  });

  it('maps single-character keyboard shortcuts to correct note durations', () => {
    expect(DURATION_KEY_MAP['w']).toBe('1/1');
    expect(DURATION_KEY_MAP['h']).toBe('1/2');
    expect(DURATION_KEY_MAP['q']).toBe('1/4');
    expect(DURATION_KEY_MAP['e']).toBe('1/8');
    expect(DURATION_KEY_MAP['s']).toBe('1/16');
  });
});
