import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TabRenderer } from '../components/TabRenderer';
import { ChordDiagram } from '../components/ChordDiagram';
import { InstrumentProfile, TuningConfig, TabNote, TabDocument } from '../types/tab';
import { UKULELE_PROFILE } from '../instruments/ukulele';
import {
  getStringNumbers,
  extractChordFrets,
  findExistingChordsByFrets,
  createChordMarker,
  autoDetectChordFromBeatNotes,
  getAlternateFretSuggestions,
  transposePitches
} from './musicTheory';

// 6-string staff (standard guitar pitches E4 B3 G3 D3 A2 E2) used to exercise N-string support
const SIX_STRING_TUNING: TuningConfig = {
  key: 'custom',
  name: 'Six String Test',
  pitches: [64, 59, 55, 50, 45, 40],
  stringsDisplay: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2']
};

const SIX_STRING_PROFILE: InstrumentProfile = {
  ...UKULELE_PROFILE,
  stringCount: 6,
  tunings: [SIX_STRING_TUNING],
  defaultTuning: SIX_STRING_TUNING,
  chordLibrary: { 'C': [-1, 3, 2, 0, 1, 0] },
  defaultChordNames: ['C']
};

// C major open shape, notes keyed by string number (1 = high E)
const C_MAJOR_NOTES: TabNote[] = [
  { id: 'n1', string: 1, fret: 0 },
  { id: 'n2', string: 2, fret: 1 },
  { id: 'n3', string: 3, fret: 0 },
  { id: 'n4', string: 4, fret: 2 },
  { id: 'n5', string: 5, fret: 3 },
  { id: 'n6', string: 6, fret: -1 }
];

describe('musicTheory: N-String Support', () => {
  it('lists string numbers for any string count', () => {
    expect(getStringNumbers(4)).toEqual([1, 2, 3, 4]);
    expect(getStringNumbers(6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('extracts chord frets bottom line first only when every string has a note', () => {
    expect(extractChordFrets(C_MAJOR_NOTES, 6)).toEqual([-1, 3, 2, 0, 1, 0]);
    expect(extractChordFrets(C_MAJOR_NOTES.slice(0, 5), 6)).toBeNull();
  });

  it('matches and auto-detects chords only against shapes with the same string count', () => {
    expect(findExistingChordsByFrets([-1, 3, 2, 0, 1, 0], {}, SIX_STRING_PROFILE)).toEqual(['C']);
    expect(findExistingChordsByFrets([3, 2, 0, 1], { 'Short': [3, 2, 0, 1, 0] })).toEqual([]);
    expect(autoDetectChordFromBeatNotes(C_MAJOR_NOTES, [], SIX_STRING_PROFILE)?.name).toBe('C');
  });

  it('creates unknown chord markers with one open fret per string', () => {
    expect(createChordMarker('Mystery', undefined, undefined, SIX_STRING_PROFILE).frets).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('suggests alternate frets on all unassigned strings of the tuning', () => {
    // E4 (string 1 open) is also B3 fret 5, G3 fret 9, D3 fret 14, A2 fret 19, E2 fret 24
    const notes: TabNote[] = [{ id: 'n1', string: 1, fret: 0 }];
    const suggestions = getAlternateFretSuggestions(notes, SIX_STRING_TUNING, 20);
    expect(suggestions.map(g => [g.string, g.fret])).toEqual([[2, 5], [3, 9], [4, 14], [5, 19]]);
  });

  it('transposes notes on strings beyond the fourth', () => {
    const notes: TabNote[] = [{ id: 'n6', string: 6, fret: 3 }];
    expect(transposePitches(notes, 2, SIX_STRING_TUNING)[0]).toMatchObject({ string: 6, fret: 5 });
  });
});

describe('Components: N-String Rendering', () => {
  it('renders a 6-string chord diagram from a 6-entry chord', () => {
    const chord = createChordMarker('C', [-1, 3, 2, 0, 1, 0], undefined, SIX_STRING_PROFILE);
    const { container } = render(<ChordDiagram chord={chord} />);

    expect(container.querySelectorAll('.chord-string-line')).toHaveLength(6);
    expect(container.querySelectorAll('.chord-muted-x')).toHaveLength(1);
    expect(container.querySelectorAll('.chord-open-circle')).toHaveLength(2);
    expect(container.querySelectorAll('.chord-fretted-dot')).toHaveLength(3);
  });

  it('renders one staff line, label and note per string on a 6-string tab', () => {
    const doc: TabDocument = {
      id: 'six-string-tab',
      title: 'Six String Song',
      artist: '',
      tempo: 100,
      keySignature: 'C',
      tuning: SIX_STRING_TUNING,
      chordPalette: [],
      layout: { stemsPlacement: 'below', zoomScale: 1.0, measuresPerSystem: 4, maxFretLimit: 12 },
      measures: [{
        id: 'm1',
        index: 1,
        timeSignature: [4, 4],
        beats: [
          { id: 'b1', duration: '1/4', notes: [{ id: 'n6', string: 6, fret: 7 }] },
          { id: 'b2', duration: '1/4', isRest: true, notes: [] }
        ]
      }]
    };
    const noop = vi.fn();

    const { container } = render(
      <TabRenderer
        document={doc}
        selectedBeatId={null}
        selectedString={null}
        playingBeatId={null}
        onSelectBeat={noop}
        onAddNote={noop}
        onRemoveNote={noop}
        onInsertBeat={noop}
        onDeleteBeatColumn={noop}
        onUpdateBeatDuration={noop}
        onUpdateBeatLyric={noop}
      />
    );

    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    SIX_STRING_TUNING.stringsDisplay.forEach(label => expect(texts).toContain(label));
    expect(texts).toContain('7');
    expect(container.querySelector('.rest-symbol')).not.toBeNull();
  });
});
