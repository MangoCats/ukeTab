import { describe, it, expect } from 'vitest';
import * as alphaTab from '@coderline/alphatab';
import { convertGpDuration, cleanGpLyric, parseGuitarProToTab, resolveSourceTuning, isCompatibleSourceTuning } from './guitarProImporter';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from '../instruments/guitar';
import { BASS_PROFILE, BASS_TUNINGS } from '../instruments/bass';
import { UKULELE_PROFILE } from '../instruments/ukulele';
import { assignNotesToStrings, calculatePitch, getSoundingTuning } from './musicTheory';

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
  it('keeps tuning, strings, frets and the capo from a 6-string guitar track', () => {
    const doc = parseGuitarProToTab(buildGpBytes(DROP_D_CAPO_TEX), 'riff.gp', GUITAR_PROFILE);

    expect(doc.instrument).toBe('guitar');
    expect(doc.title).toBe('Drop D Riff');
    expect(doc.tuning).toBe(GUITAR_TUNINGS.DADGBE);

    const beats = doc.measures[0].beats;
    const fingering = (i: number) => beats[i].notes.map(n => [n.string, n.fret]).sort();
    // The capo is kept and frets stay relative to it, as written in the source
    expect(doc.capo).toBe(2);
    expect(fingering(0)).toEqual([[6, 3]]);
    expect(fingering(1)).toEqual([[1, 0]]);
    expect(fingering(2)).toEqual([[4, 7], [5, 5]]);
    expect(beats[3].isRest).toBe(true);

    // Low D string, fret 3 with capo 2 sounds G2 (MIDI 43), the pitch alphaTab plays for the source note
    expect(calculatePitch(6, 3, getSoundingTuning(doc))).toBe(43);
  });

  it('folds a capo above the editor range into the fret numbers', () => {
    const doc = parseGuitarProToTab(buildGpBytes(DROP_D_CAPO_TEX, score => {
      score.tracks[0].staves[0].capo = 14;
    }), 'riff.gp', GUITAR_PROFILE);
    expect(doc.capo).toBe(0);
    expect(doc.measures[0].beats[0].notes[0]).toMatchObject({ string: 6, fret: 17 });
  });

  it('builds the chord palette from library shapes adapted to the imported tuning', () => {
    const doc = parseGuitarProToTab(buildGpBytes(DROP_D_CAPO_TEX), 'riff.gp', GUITAR_PROFILE);
    expect(doc.chordPalette!.map(c => c.name)).toEqual(GUITAR_PROFILE.defaultChordNames);
    expect(doc.chordPalette!.find(c => c.name === 'G')?.frets).toEqual([5, 2, 0, 0, 0, 3]);
    expect(doc.chordPalette!.find(c => c.name === 'D')?.frets).toEqual([-1, -1, 0, 2, 3, 2]);
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

describe('guitarProImporter: Bass Import', () => {
  // Ukulele track listed first: same string count as bass, but far too high to keep its fingering
  const UKE_AND_BASS_TEX = String.raw`\track "Ukulele" \tuning a4 e4 c4 g4 0.1.4 |
\track "Bass" \tuning g2 d2 a1 e1 3.4.4 0.3.4 5.2.2 |`;

  it('accepts only same-count tracks whose lowest string is within an octave of the bass', () => {
    expect(isCompatibleSourceTuning([43, 38, 33, 28], BASS_PROFILE)).toBe(true);
    expect(isCompatibleSourceTuning([43, 38, 33, 26], BASS_PROFILE)).toBe(true);
    expect(isCompatibleSourceTuning([69, 64, 60, 67], BASS_PROFILE)).toBe(false);
    expect(isCompatibleSourceTuning([43, 38, 33, 28, 23], BASS_PROFILE)).toBe(false);
    expect(isCompatibleSourceTuning([64, 59, 55, 50, 45, 40], GUITAR_PROFILE)).toBe(true);
    expect(isCompatibleSourceTuning([43, 38, 33, 28, 23, 18], GUITAR_PROFILE)).toBe(false);
  });

  it('keeps the fingering of a bass track listed after a ukulele track', () => {
    const doc = parseGuitarProToTab(buildGpBytes(UKE_AND_BASS_TEX), 'band.gp', BASS_PROFILE);

    expect(doc.instrument).toBe('bass');
    expect(doc.tuning).toBe(BASS_TUNINGS.EADG);
    const fingering = doc.measures[0].beats.map(b => b.notes.map(n => [n.string, n.fret]));
    expect(fingering).toEqual([[[4, 3]], [[3, 0]], [[2, 5]]]);
  });

  it('re-voices a ukulele-only file into the bass range', () => {
    const tex = String.raw`\track "Ukulele" \tuning a4 e4 c4 g4 0.1.4 3.1.4 0.3.4 |`;
    const doc = parseGuitarProToTab(buildGpBytes(tex), 'uke.gp', BASS_PROFILE);

    expect(doc.tuning).toBe(BASS_TUNINGS.EADG);
    const notes = doc.measures[0].beats.flatMap(b => b.notes);
    expect(notes).toHaveLength(3);
    notes.forEach(n => {
      const pitch = calculatePitch(n.string, n.fret, doc.tuning);
      expect(pitch).toBeGreaterThanOrEqual(28);
      expect(pitch).toBeLessThanOrEqual(55);
    });
  });
});

describe('guitarProImporter: ukulele tracks', () => {
  it('keeps the strings and frets of a ukulele track, as for guitar and bass', () => {
    // alphaTex strings count from the top line: G4 is played on the E string (2) at fret 3, not the open g string
    const tex = String.raw`\track "Ukulele" \tuning a4 e4 c4 g4 3.2.4 x.1.4 2.4.2 |`;
    const doc = parseGuitarProToTab(buildGpBytes(tex), 'uke.gp', UKULELE_PROFILE);
    expect(doc.tuning.key).toBe('gCEA');
    expect(doc.measures[0].beats.map(b => b.notes.map(n => [n.string, n.fret]))).toEqual([[[2, 3]], [[1, -1]], [[4, 2]]]);
  });

  it('regression: re-voiced dead notes stay muted on their string number', () => {
    const tex = String.raw`\track "Guitar" \tuning (e4 b3 g3 d3 a2 e2) (x.1 x.2 3.5).4 |`;
    const [beat] = parseGuitarProToTab(buildGpBytes(tex), 'muted.gp', UKULELE_PROFILE).measures[0].beats;
    expect(beat.notes.filter(n => n.fret === -1).map(n => n.string).sort()).toEqual([1, 2]);
    expect(beat.notes.filter(n => n.fret >= 0).map(n => calculatePitch(n.string, n.fret, UKULELE_PROFILE.defaultTuning))).toEqual([60]);
  });
});

describe('guitarProImporter: Ukulele Import Re-voices Guitar Tracks', () => {
  it('places sounding pitches with the shared assignNotesToStrings solver and sets no capo', () => {
    const bytes = buildGpBytes(DROP_D_CAPO_TEX);
    const doc = parseGuitarProToTab(bytes, 'riff.gp', UKULELE_PROFILE);
    expect(doc.capo).toBe(0);

    const sourceBeats = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes)).tracks[0].staves[0].bars[0].voices[0].beats;
    sourceBeats.forEach((sourceBeat, i) => {
      const expected = assignNotesToStrings(
        sourceBeat.notes.map(n => n.realValue),
        UKULELE_PROFILE.defaultTuning,
        UKULELE_PROFILE.importMaxFret,
        { pitchRange: UKULELE_PROFILE.importPitchRange }
      );
      expect(doc.measures[0].beats[i].notes.map(n => ({ string: n.string, fret: n.fret }))).toEqual(expected);
    });
  });

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
