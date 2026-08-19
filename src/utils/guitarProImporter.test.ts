import { describe, it, expect } from 'vitest';
import { convertGpDuration, cleanGpLyric } from './guitarProImporter';

describe('guitarProImporter helper utilities', () => {
  it('maps alphaTab duration numbers to UkeTab DurationType', () => {
    expect(convertGpDuration(1, false)).toEqual({ duration: '1/1', isDotted: false });
    expect(convertGpDuration(2, true)).toEqual({ duration: '1/2', isDotted: true });
    expect(convertGpDuration(4, false)).toEqual({ duration: '1/4', isDotted: false });
    expect(convertGpDuration(8, true)).toEqual({ duration: '1/8', isDotted: true });
    expect(convertGpDuration(16, false)).toEqual({ duration: '1/16', isDotted: false });
    expect(convertGpDuration(32, false)).toEqual({ duration: '1/32', isDotted: false });
  });

  it('cleans guitar pro lyric formatting', () => {
    expect(cleanGpLyric(['Hel-', 'lo,'])).toBe('Hel-lo');
    expect(cleanGpLyric(['Ukulele,', ' '])).toBe('Ukulele');
    expect(cleanGpLyric(null)).toBeUndefined();
    expect(cleanGpLyric([])).toBeUndefined();
    expect(cleanGpLyric(['   '])).toBeUndefined();
  });
});
