import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TabRenderer } from './TabRenderer';
import { TabDocument, BeatColumn, Measure } from '../types/tab';
import { TUNING_PRESETS, getDefaultChordPalette } from '../utils/musicTheory';

const mockTabDocument: TabDocument = {
  id: 'test-tab-1',
  title: 'Test Song',
  artist: 'Test Artist',
  tempo: 120,
  keySignature: 'C',
  tuning: TUNING_PRESETS.gCEA,
  chordPalette: getDefaultChordPalette(),
  layout: {
    stemsPlacement: 'below',
    zoomScale: 1.0,
    measuresPerSystem: 4,
    maxFretLimit: 12
  },
  measures: [
    {
      id: 'm1',
      index: 1,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'b1',
          duration: '1/8',
          notes: [
            { id: 'n1', string: 4, fret: 0 },
            { id: 'n2', string: 3, fret: 0 },
            { id: 'n3', string: 2, fret: 0 },
            { id: 'n4', string: 1, fret: 3 }
          ],
          chord: { name: 'C', frets: [0, 0, 0, 3], baseFret: 1 },
          lyric: 'Hel-'
        },
        {
          id: 'b2',
          duration: '1/8',
          notes: [{ id: 'n5', string: 1, fret: 2 }],
          lyric: '-lo'
        }
      ]
    }
  ]
};

describe('TabRenderer Component', () => {
  it('renders continuous staff lines, string headers, time signature, and notes', () => {
    const noop = vi.fn();

    const { container } = render(
      <TabRenderer
        document={mockTabDocument}
        selectedBeatId="b1"
        selectedString={1}
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

    // Verify SVG container is rendered
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    const allTextContents = Array.from(container.querySelectorAll('text')).map(t => t.textContent);

    // Verify tuning string labels (A4, E4, C4, g4)
    expect(allTextContents).toContain('A4');
    expect(allTextContents).toContain('E4');
    expect(allTextContents).toContain('C4');
    expect(allTextContents).toContain('g4');

    // Verify time signature numbers (4 / 4)
    expect(allTextContents.filter(t => t === '4').length).toBeGreaterThanOrEqual(2);

    // Verify fret numbers rendered on staff (0 and 3)
    expect(allTextContents).toContain('3');
    expect(allTextContents).toContain('0');

    // Verify synchronized lyrics track
    expect(allTextContents).toContain('Hel-');
    expect(allTextContents).toContain('-lo');
  });

  it('makes a popover duration choice the active duration as well as the beat duration', () => {
    const noop = vi.fn();
    const onUpdateBeatDuration = vi.fn();
    const onSelectActiveDuration = vi.fn();
    const { getAllByText } = render(
      <TabRenderer
        document={mockTabDocument}
        selectedBeatId="b1"
        selectedString={1}
        playingBeatId={null}
        onSelectBeat={noop}
        onAddNote={noop}
        onRemoveNote={noop}
        onInsertBeat={noop}
        onDeleteBeatColumn={noop}
        onUpdateBeatDuration={onUpdateBeatDuration}
        onSelectActiveDuration={onSelectActiveDuration}
        onUpdateBeatLyric={noop}
      />
    );

    const sixteenthButton = getAllByText('1/16').find(el => el.tagName === 'BUTTON')!;
    fireEvent.click(sixteenthButton);
    expect(onUpdateBeatDuration).toHaveBeenCalledWith('b1', '1/16', false);
    expect(onSelectActiveDuration).toHaveBeenCalledWith('1/16');
  });
  describe('rhythm notation', () => {
    const noop = vi.fn();
    const note = (id: string) => [{ id: `n-${id}`, string: 1, fret: 0 }];
    const b = (id: string, duration: BeatColumn['duration'], extra: Partial<BeatColumn> = {}): BeatColumn => ({
      id, duration, notes: extra.isRest ? [] : note(id), ...extra
    });
    const renderMeasures = (measures: Measure[]) => render(
      <TabRenderer
        document={{ ...mockTabDocument, measures }}
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

    it('renders a triplet bracket, a 1/32 rest and a mid-song time-signature change', () => {
      const { container } = renderMeasures([
        { id: 'm1', index: 1, timeSignature: [4, 4], beats: [b('t1', '1/8', { isTriplet: true }), b('t2', '1/8', { isTriplet: true }), b('t3', '1/8', { isTriplet: true }), b('q1', '1/4')] },
        { id: 'm2', index: 2, timeSignature: [4, 4], beats: [b('r32', '1/32', { isRest: true }), b('q2', '1/4')] },
        { id: 'm3', index: 3, timeSignature: [3, 4], beats: [b('q3', '1/4'), b('q4', '1/4')] }
      ]);

      // One bracket with a "3" for the three triplet eighths
      expect(container.querySelectorAll('.triplet-bracket')).toHaveLength(1);
      const tripletNumbers = container.querySelectorAll('.triplet-number');
      expect(tripletNumbers).toHaveLength(1);
      expect(tripletNumbers[0].textContent).toBe('3');

      // 32nd rest: three hooks inside the rest-symbol group
      const restSymbols = container.querySelectorAll('.rest-symbol');
      expect(restSymbols).toHaveLength(1);
      expect(restSymbols[0].querySelectorAll('circle')).toHaveLength(3);

      // Time signature on measure 1 and on measure 3 (4/4 → 3/4), not on measure 2
      const blocks = Array.from(container.querySelectorAll('.measure-svg-block'));
      expect(blocks.map(bl => bl.querySelectorAll('.time-signature-engraving').length)).toEqual([1, 0, 1]);
      const m3Digits = Array.from(blocks[2].querySelectorAll('.time-signature-text')).map(t => t.textContent);
      expect(m3Digits).toEqual(['3', '4']);
      // Measure 3 reserves the 32 px time-signature width; measure 2 does not
      expect(blocks[1].querySelector('svg')!.getAttribute('width')).toBe(String(2 * 62 + 30));
      expect(blocks[2].querySelector('svg')!.getAttribute('width')).toBe(String(2 * 62 + 30 + 32));
      // String labels stay first-measure only
      expect(Array.from(blocks[2].querySelectorAll('text')).map(t => t.textContent)).not.toContain('A4');
    });

    it('regression: beams never connect rest columns', () => {
      const { container } = renderMeasures([
        { id: 'm1', index: 1, timeSignature: [4, 4], beats: [b('e1', '1/8'), b('e2', '1/8', { isRest: true }), b('e3', '1/8')] }
      ]);
      expect(container.querySelectorAll('.rhythm-beam')).toHaveLength(0);
      expect(container.querySelectorAll('.rhythm-flag')).toHaveLength(2);
    });

    it('regression: beams break at each quarter beat (8 eighths in 4/4)', () => {
      const beats = Array.from({ length: 8 }, (_, i) => b(`e${i}`, '1/8'));
      const { container } = renderMeasures([{ id: 'm1', index: 1, timeSignature: [4, 4], beats }]);
      expect(container.querySelectorAll('.rhythm-beam')).toHaveLength(4);
      expect(container.querySelectorAll('.rhythm-flag')).toHaveLength(0);
    });

    it('draws a dotted-eighth + sixteenth as a primary beam plus a left-pointing secondary stub', () => {
      const { container } = renderMeasures([
        { id: 'm1', index: 1, timeSignature: [4, 4], beats: [b('d1', '1/8', { isDotted: true }), b('s1', '1/16')] }
      ]);
      const beams = Array.from(container.querySelectorAll('.rhythm-beam'));
      expect(beams).toHaveLength(2);
      // First measure: 60 header + 32 time signature + 15 padding = 107; columns at 107 and 169
      expect(beams.map(l => [l.getAttribute('x1'), l.getAttribute('x2')])).toEqual([['107', '169'], ['153', '169']]);
      // Stems below: level 2 sits 6 px closer to the staff than level 1
      expect(Number(beams[0].getAttribute('y1')) - Number(beams[1].getAttribute('y1'))).toBe(6);
    });

    it('regression: an unbeamed 1/32 note draws three flags', () => {
      const { container } = renderMeasures([
        { id: 'm1', index: 1, timeSignature: [4, 4], beats: [b('x1', '1/32'), b('q1', '1/4')] }
      ]);
      expect(container.querySelectorAll('.rhythm-flag')).toHaveLength(3);
      expect(container.querySelectorAll('.rhythm-beam')).toHaveLength(0);
    });
  });
});
