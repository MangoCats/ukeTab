import { describe, it, expect } from 'vitest';
import * as alphaTab from '@coderline/alphatab';
import { convertGpDuration, cleanGpLyric, parseGuitarProToTab, resolveSourceTuning } from './guitarProImporter';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from '../instruments/guitar';
import { UKULELE_PROFILE } from '../instruments/ukulele';
import { calculatePitch } from './musicTheory';

/**
 * Builds real Guitar Pro 7 file bytes from alphaTex source, optionally adjusting the parsed score first.
 */
function buildGpBytes(tex: string, adjust?: (score: alphaTab.model.Score) => void): ArrayBuffer {
  const settings = new alphaTab.Settings();
  const importer = new alphaTab.importer.AlphaTexImporter();
  importer.initFromString(tex, settings);
  const score = importer.readScore();
  adjust?.(score);
  const bytes = new alphaTab.exporter.Gp7Exporter().export(score, settings);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// Drop D guitar with capo 2: alphaTex "fret.string" counts strings from the top line (1 = high E)
const DROP_D_CAPO_TEX = String.raw`\title "Drop D Riff" \tempo 90
\track "Guitar" \tuning e4 b3 g3 d3 a2 d2 \capo 2
3.6.4 0.1.4 (5.5 7.4).4 r.4 |`;

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

  it('resolves source tunings to a matching preset or a custom tuning named low to high', () => {
    expect(resolveSourceTuning([64, 59, 55, 50, 45, 38], GUITAR_PROFILE)).toBe(GUITAR_TUNINGS.DADGBE);

    const custom = resolveSourceTuning([64, 59, 55, 50, 45, 36], GUITAR_PROFILE);
    expect(custom.key).toBe('custom');
    expect(custom.name).toBe('Custom (C2 A2 D3 G3 B3 E4)');
    expect(custom.stringsDisplay).toEqual(['E4', 'B3', 'G3', 'D3', 'A2', 'C2']);
  });
});

describe('guitarProImporter: Guitar Import Keeps Source Fingering', () => {
  it('keeps tuning, strings and capo-adjusted frets from a 6-string guitar track', () => {
    const doc = parseGuitarProToTab(buildGpBytes(DROP_D_CAPO_TEX), 'riff.gp', GUITAR_PROFILE);

    expect(doc.instrument).toBe('guitar');
    expect(doc.title).toBe('Drop D Riff');
    expect(doc.tuning).toBe(GUITAR_TUNINGS.DADGBE);

    const beats = doc.measures[0].beats;
    const fingering = (i: number) => beats[i].notes.map(n => [n.string, n.fret]).sort();
    // Capo 2 is folded into the fret numbers so pitches stay correct
    expect(fingering(0)).toEqual([[6, 5]]);
    expect(fingering(1)).toEqual([[1, 2]]);
    expect(fingering(2)).toEqual([[4, 9], [5, 7]]);
    expect(beats[3].isRest).toBe(true);

    // Low D string, fret 3 with capo 2 sounds G2 (MIDI 43), the pitch alphaTab plays for the source note
    expect(calculatePitch(6, 5, doc.tuning)).toBe(43);
  });

  it('imports dead notes as muted X and unknown tunings as custom tunings', () => {
    const tex = String.raw`\track "Lead" \tuning e4 b3 g3 d3 a2 c2 3.3.4 0.6.4 r.2 |`;
    const bytes = buildGpBytes(tex, score => {
      score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].isDead = true;
    });
    const doc = parseGuitarProToTab(bytes, 'lead.gp', GUITAR_PROFILE);

    expect(doc.tuning.key).toBe('custom');
    expect(doc.tuning.pitches).toEqual([64, 59, 55, 50, 45, 36]);
    expect(doc.measures[0].beats[0].notes[0]).toMatchObject({ string: 3, fret: -1 });
    expect(doc.measures[0].beats[1].notes[0]).toMatchObject({ string: 6, fret: 0 });
  });

  it('prefers a 6-string track over an earlier 4-string bass track', () => {
    const tex = String.raw`\track "Bass" \tuning g2 d2 a1 e1 3.4.1 |
\track "Rhythm" \tuning e4 b3 g3 d3 a2 e2 2.5.1 |`;
    const doc = parseGuitarProToTab(buildGpBytes(tex), 'band.gp', GUITAR_PROFILE);

    expect(doc.tuning).toBe(GUITAR_TUNINGS.EADGBE);
    expect(doc.measures[0].beats[0].notes[0]).toMatchObject({ string: 5, fret: 2 });
  });
});

describe('guitarProImporter: Ukulele Import Re-voices Guitar Tracks', () => {
  it('folds a guitar track into the High-G ukulele range on 4 strings', () => {
    const doc = parseGuitarProToTab(buildGpBytes(DROP_D_CAPO_TEX), 'riff.gp', UKULELE_PROFILE);

    expect(doc.instrument).toBe('ukulele');
    expect(doc.tuning.key).toBe('gCEA');

    const notes = doc.measures[0].beats.flatMap(b => b.notes);
    expect(notes.length).toBeGreaterThan(0);
    notes.forEach(n => {
      expect(n.string).toBeGreaterThanOrEqual(1);
      expect(n.string).toBeLessThanOrEqual(4);
      const pitch = calculatePitch(n.string, n.fret, doc.tuning);
      expect(pitch).toBeGreaterThanOrEqual(60);
      expect(pitch).toBeLessThanOrEqual(84);
    });
  });
});
