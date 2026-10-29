import { describe, it, expect } from 'vitest';
import * as alphaTab from '@coderline/alphatab';
import { BeatColumn, InstrumentProfile, TabDocument, TabNote } from '../types/tab';
import { UKULELE_PROFILE, UKULELE_TUNINGS } from '../instruments/ukulele';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from '../instruments/guitar';
import { BASS_PROFILE, BASS_TUNINGS } from '../instruments/bass';
import { createBlankTabDocument } from './sampleData';
import { calculatePitch, getChordPreset, getSoundingTuning } from './musicTheory';
import { GRAND_STAFF_SPLIT_PITCH, buildAlphaTabScore, getChromaticAccidental, getInstrumentStaffClef } from './alphaTabScore';
import { createNotationSettings, renderNotationSvg } from './notationRender';

const { Clef, Ottavia, Duration, NoteAccidentalMode } = alphaTab.model;

let noteId = 0;
const n = (string: number, fret: number, extra: Partial<TabNote> = {}): TabNote => ({ id: `n${++noteId}`, string, fret, ...extra });

// A document of the given instrument whose measures hold the given beats (4/4 unless stated)
function docWith(profile: InstrumentProfile, measures: BeatColumn[][], extra: Partial<TabDocument> = {}): TabDocument {
  return {
    ...createBlankTabDocument(profile),
    measures: measures.map((beats, i) => ({ id: `m${i + 1}`, index: i + 1, timeSignature: [4, 4], beats })),
    ...extra
  };
}

const beatsOf = (staff: alphaTab.model.Staff, bar = 0) => staff.bars[bar].voices[0].beats;
const pitchesOf = (beat: alphaTab.model.Beat) => beat.notes.map(note => note.realValue).sort((a, b) => a - b);

// Ukulele C chord (G4 C4 E4 C5) then G chord (G4 D4 G4 B4, two strings in unison on G4)
const C_THEN_G: BeatColumn[] = [
  { id: 'b1', duration: '1/2', chord: getChordPreset('C')!, notes: [n(4, 0), n(3, 0), n(2, 0), n(1, 3)], lyric: 'Hel-' },
  { id: 'b2', duration: '1/2', chord: getChordPreset('G')!, notes: [n(4, 0), n(3, 2), n(2, 3), n(1, 2)], lyric: 'lo' }
];

describe('alphaTabScore: staff choices', () => {
  it('writes ukuleles at pitch in treble clef, guitars and baritone ukulele an octave up in treble, basses an octave up in bass', () => {
    expect(getInstrumentStaffClef(UKULELE_TUNINGS.gCEA)).toEqual({ clef: 'treble', octaveDown: false });
    expect(getInstrumentStaffClef(UKULELE_TUNINGS.GCEA)).toEqual({ clef: 'treble', octaveDown: false });
    expect(getInstrumentStaffClef(UKULELE_TUNINGS.DGBE)).toEqual({ clef: 'treble', octaveDown: true });
    expect(getInstrumentStaffClef(GUITAR_TUNINGS.EADGBE)).toEqual({ clef: 'treble', octaveDown: true });
    expect(getInstrumentStaffClef(GUITAR_TUNINGS.DADGBE)).toEqual({ clef: 'treble', octaveDown: true });
    expect(getInstrumentStaffClef(BASS_TUNINGS.EADG)).toEqual({ clef: 'bass', octaveDown: true });
    expect(getInstrumentStaffClef(BASS_TUNINGS.BEAD)).toEqual({ clef: 'bass', octaveDown: true });
  });

  it('spells notes outside the key as raised 1st and 4th, lowered 3rd, 6th and 7th', () => {
    // C major: C# Eb F# Ab Bb
    expect([61, 63, 66, 68, 70].map(p => getChromaticAccidental(p, 'C'))).toEqual([1, -1, 1, -1, -1]);
    expect([60, 62, 64, 65, 67, 69, 71].every(p => getChromaticAccidental(p, 'C') === 'inKey')).toBe(true);
    // G major: G# Bb C# Eb F natural
    expect([68, 70, 61, 63, 65].map(p => getChromaticAccidental(p, 'G'))).toEqual([1, -1, 1, -1, 0]);
    // F major: B natural is the raised 4th
    expect(getChromaticAccidental(71, 'F')).toBe(0);
    // F# major: the raised tonic would be F double sharp, left to alphaTab
    expect(getChromaticAccidental(67, 'F#')).toBeNull();
  });
});

describe('alphaTabScore: piano grand staff', () => {
  it('has a two-staff piano track above a tab-only instrument track', () => {
    const score = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G]), 'grandStaff');
    expect(score.tracks.map(t => t.name)).toEqual(['Piano', 'Ukulele']);
    const [treble, bass] = score.tracks[0].staves;
    expect([treble.showStandardNotation, treble.showTablature, treble.isStringed]).toEqual([true, false, false]);
    expect(treble.bars[0].clef).toBe(Clef.G2);
    expect(bass.bars[0].clef).toBe(Clef.F4);
    const tab = score.tracks[1].staves[0];
    expect([tab.showStandardNotation, tab.showTablature]).toEqual([false, true]);
    expect(tab.tuning).toEqual(UKULELE_TUNINGS.gCEA.pitches);
  });

  it('puts middle C and above on the treble staff, lower notes on the bass staff, at sounding pitch', () => {
    // Guitar E chord with capo 1 sounds F: F2 C3 F3 A3 C4 F4
    const fChord = [n(6, 0), n(5, 2), n(4, 2), n(3, 1), n(2, 0), n(1, 0)];
    const doc = docWith(GUITAR_PROFILE, [[{ id: 'b1', duration: '1/1', notes: fChord }]], { capo: 1 });
    const [treble, bass] = buildAlphaTabScore(doc, 'grandStaff').tracks[0].staves;
    const sounding = fChord.map(note => calculatePitch(note.string, note.fret, getSoundingTuning(doc))).sort((a, b) => a - b);
    expect(sounding).toEqual([41, 48, 53, 57, 60, 65]);
    expect(pitchesOf(beatsOf(treble)[0])).toEqual(sounding.filter(p => p >= GRAND_STAFF_SPLIT_PITCH));
    expect(pitchesOf(beatsOf(bass)[0])).toEqual(sounding.filter(p => p < GRAND_STAFF_SPLIT_PITCH));
  });

  it('plays strings in unison as one note and leaves out muted notes', () => {
    const doc = docWith(UKULELE_PROFILE, [C_THEN_G]);
    const treble = buildAlphaTabScore(doc, 'grandStaff').tracks[0].staves[0];
    expect(pitchesOf(beatsOf(treble)[1])).toEqual([62, 67, 71]);

    const muted = docWith(UKULELE_PROFILE, [[{ id: 'b1', duration: '1/1', notes: [n(1, -1), n(2, 0)] }]]);
    expect(pitchesOf(beatsOf(buildAlphaTabScore(muted, 'grandStaff').tracks[0].staves[0])[0])).toEqual([64]);
  });

  it('draws a staff that is silent for a whole bar as one whole-bar rest', () => {
    const [treble, bass] = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G]), 'grandStaff').tracks[0].staves;
    expect(beatsOf(treble)).toHaveLength(2);
    expect(beatsOf(bass)).toHaveLength(1);
    expect(beatsOf(bass)[0].isFullBarRest).toBe(true);
  });

  it('names the sounding chords above the piano music, and the shapes above the tab only with a capo', () => {
    const noCapo = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G]), 'grandStaff');
    expect(beatsOf(noCapo.tracks[0].staves[0]).map(b => b.chord?.name)).toEqual(['C', 'G']);
    expect(beatsOf(noCapo.tracks[1].staves[0]).map(b => b.chord?.name)).toEqual([undefined, undefined]);

    const capo = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G], { capo: 2 }), 'grandStaff');
    expect(beatsOf(capo.tracks[0].staves[0]).map(b => b.chord?.name)).toEqual(['D', 'A']);
    expect(beatsOf(capo.tracks[1].staves[0]).map(b => b.chord?.name)).toEqual(['C', 'G']);
  });

  it('lists the chord shapes as diagrams (highest string first) and keeps names off the piano diagrams', () => {
    const score = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G]), 'grandStaff');
    const diagrams = [...score.tracks[1].staves[0].chords!.values()];
    expect(diagrams.map(c => [c.name, c.strings, c.showDiagram])).toEqual([
      ['C', [3, 0, 0, 0], true],
      ['G', [2, 3, 2, 0], true]
    ]);
    expect([...score.tracks[0].staves[0].chords!.values()].every(c => !c.showDiagram)).toBe(true);
  });

  it('puts lyrics under the treble staff only', () => {
    const score = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G]), 'grandStaff');
    expect(beatsOf(score.tracks[0].staves[0]).map(b => b.lyrics)).toEqual([['Hel-'], ['lo']]);
    expect(beatsOf(score.tracks[1].staves[0]).map(b => b.lyrics)).toEqual([null, null]);
  });
});

describe('alphaTabScore: rhythm, ties, key and meter', () => {
  const rhythm = (): TabDocument => docWith(UKULELE_PROFILE, [
    [
      { id: 'a1', duration: '1/8', isTriplet: true, notes: [n(1, 0)] },
      { id: 'a2', duration: '1/8', isTriplet: true, notes: [n(1, 1)] },
      { id: 'a3', duration: '1/8', isTriplet: true, notes: [n(1, 3)] },
      { id: 'a4', duration: '1/4', isDotted: true, notes: [n(2, 3)] },
      { id: 'a5', duration: '1/32', notes: [n(1, 2)] },
      { id: 'a6', duration: '1/4', isRest: true, notes: [] }
    ],
    [
      { id: 'b1', duration: '1/2', notes: [n(1, 3)] },
      { id: 'b2', duration: '1/2', isTied: true, notes: [n(1, 3)] }
    ],
    [
      { id: 'c1', duration: '1/2', isTied: true, notes: [] },
      { id: 'c2', duration: '1/2', notes: [n(1, 0, { isTied: true })] }
    ]
  ], { key: 'F' });

  it('keeps durations, dots, triplets, rests and time signatures', () => {
    const doc = rhythm();
    doc.measures[1].timeSignature = [3, 4];
    const score = buildAlphaTabScore(doc, 'instrumentStaff');
    const beats = beatsOf(score.tracks[0].staves[0]);
    expect(beats.map(b => b.duration)).toEqual([Duration.Eighth, Duration.Eighth, Duration.Eighth, Duration.Quarter, Duration.ThirtySecond, Duration.Quarter]);
    expect(beats.map(b => b.tupletNumerator)).toEqual([3, 3, 3, -1, -1, -1]);
    expect(beats[3].dots).toBe(1);
    expect(beats[5].isRest).toBe(true);
    expect(score.masterBars.map(m => [m.timeSignatureNumerator, m.timeSignatureDenominator])).toEqual([[4, 4], [3, 4], [4, 4]]);
  });

  it('ties notes to the same note in the previous column, across bars, and continues empty tied columns', () => {
    for (const mode of ['grandStaff', 'instrumentStaff'] as const) {
      const staff = buildAlphaTabScore(rhythm(), mode).tracks[0].staves[0];
      const [b1, b2] = beatsOf(staff, 1);
      const [c1, c2] = beatsOf(staff, 2);
      expect(b1.notes[0].isTieDestination).toBe(false);
      expect(b2.notes[0].isTieDestination).toBe(true);
      expect(b2.notes[0].tieOrigin).toBe(b1.notes[0]);
      // The empty tied column holds the previous column's note, tied across the bar line
      expect(pitchesOf(c1)).toEqual([72]);
      expect(c1.notes[0].tieOrigin).toBe(b2.notes[0]);
      // A tied note with nothing to tie to is a new note
      expect(c2.notes[0].isTieDestination).toBe(false);
    }
  });

  it('writes the key signature on every bar and spells notes outside it', () => {
    const doc = rhythm();
    doc.measures[0].beats[1].notes = [n(1, 1)]; // Bb4, in F
    doc.measures[0].beats[2].notes = [n(1, 2)]; // B4: B natural in F
    const staff = buildAlphaTabScore(doc, 'grandStaff').tracks[0].staves[0];
    expect(staff.bars.map(b => b.keySignature)).toEqual([-1, -1, -1]);
    const [, bb, b] = beatsOf(staff);
    expect(bb.notes[0].accidentalMode).toBe(NoteAccidentalMode.Default);
    expect(b.notes[0].accidentalMode).toBe(NoteAccidentalMode.ForceNatural);
  });

  it('starts with the song tempo and an empty measure is a whole-bar rest', () => {
    const doc = docWith(UKULELE_PROFILE, [[]], { tempo: 96 });
    const score = buildAlphaTabScore(doc, 'instrumentStaff');
    expect(score.tempo).toBe(96);
    expect(beatsOf(score.tracks[0].staves[0])[0].isFullBarRest).toBe(true);
  });
});

describe('alphaTabScore: instrument staff', () => {
  it('has one staff with notation and tab, the tuning, capo, clef and octave', () => {
    const guitar = buildAlphaTabScore(docWith(GUITAR_PROFILE, [[{ id: 'b1', duration: '1/4', notes: [n(6, 0)] }]], { capo: 3 }), 'instrumentStaff');
    expect(guitar.tracks).toHaveLength(1);
    const staff = guitar.tracks[0].staves[0];
    expect([staff.showStandardNotation, staff.showTablature, staff.capo]).toEqual([true, true, 3]);
    expect([staff.bars[0].clef, staff.bars[0].clefOttava]).toEqual([Clef.G2, Ottavia._8vb]);
    // Low E string, open, with capo 3 sounds G2 and is written an octave up
    const note = beatsOf(staff)[0].notes[0];
    expect([note.string, note.fret, note.realValue]).toEqual([1, 0, 43]);
    expect(note.displayValue).toBe(55);

    const bass = buildAlphaTabScore(docWith(BASS_PROFILE, [[{ id: 'b1', duration: '1/4', notes: [n(4, 0)] }]]), 'instrumentStaff');
    expect([bass.tracks[0].staves[0].bars[0].clef, bass.tracks[0].staves[0].bars[0].clefOttava]).toEqual([Clef.F4, Ottavia._8vb]);
    const uke = buildAlphaTabScore(docWith(UKULELE_PROFILE, [C_THEN_G]), 'instrumentStaff');
    expect(uke.tracks[0].staves[0].bars[0].clefOttava).toBe(Ottavia.Regular);
  });

  it('keeps every string, muted notes as dead notes, and the chord shape names', () => {
    const doc = docWith(UKULELE_PROFILE, [[
      { id: 'b1', duration: '1/2', chord: getChordPreset('G')!, notes: [n(4, 0), n(3, 2), n(2, 3), n(1, 2)] },
      { id: 'b2', duration: '1/2', notes: [n(1, -1)] }
    ]], { capo: 2 });
    const [g, muted] = beatsOf(buildAlphaTabScore(doc, 'instrumentStaff').tracks[0].staves[0]);
    expect(g.notes.map(note => [note.string, note.fret])).toEqual([[1, 0], [2, 2], [3, 3], [4, 2]]);
    expect(g.chord?.name).toBe('G');
    expect(muted.notes.map(note => [note.string, note.isDead])).toEqual([[4, true]]);
  });
});

describe('notationRender', () => {
  it('draws both staff choices and an empty song to SVG', () => {
    const settings = createNotationSettings(0.85);
    for (const doc of [docWith(UKULELE_PROFILE, [C_THEN_G]), docWith(BASS_PROFILE, [[]]), createBlankTabDocument(GUITAR_PROFILE)]) {
      for (const mode of ['grandStaff', 'instrumentStaff'] as const) {
        const { parts, height } = renderNotationSvg(buildAlphaTabScore(doc, mode, settings), settings, 720);
        expect(height).toBeGreaterThan(0);
        expect(parts.length).toBeGreaterThan(0);
        expect(parts.every(p => p.svg.startsWith('<svg'))).toBe(true);
        // Only the last part is alphaTab's credit line
        expect(parts.map(p => p.isCredit)).toEqual(parts.map((_, i) => i === parts.length - 1));
      }
    }
  });

  it('hides the title, tuning and tempo the print header already shows', () => {
    const settings = createNotationSettings(1);
    const doc = { ...docWith(UKULELE_PROFILE, [C_THEN_G]), title: 'Unique Title Text' };
    const svg = renderNotationSvg(buildAlphaTabScore(doc, 'instrumentStaff', settings), settings, 720).parts.map(p => p.svg).join('');
    expect(svg).not.toContain('Unique Title Text');
    expect(svg).toContain('Hel-');
  });
});
