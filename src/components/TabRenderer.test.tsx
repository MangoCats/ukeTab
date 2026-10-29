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
    const renderMeasures = (measures: Measure[], stemsPlacement: 'below' | 'above' = 'below') => render(
      <TabRenderer
        document={{ ...mockTabDocument, measures, layout: { ...mockTabDocument.layout, stemsPlacement } }}
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
      // In-block string labels stay first-measure only (later measures only get gutter labels outside the measure SVG)
      expect(Array.from(blocks[2].querySelector('svg')!.querySelectorAll('text')).map(t => t.textContent)).not.toContain('A4');
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

    // Vertical range [min, max] of all y coordinates in an SVG path ("M x y L x y ...")
    const pathYRange = (d: string) => {
      const ys = d.trim().split(/\s*[ML]\s*/).filter(Boolean).map(pair => Number(pair.trim().split(/\s+/)[1]));
      return [Math.min(...ys), Math.max(...ys)];
    };

    it('regression: triplet bracket clears the duration badge and lyrics clear the "3" (stems below)', () => {
      const triplets = ['t1', 't2', 't3'].map(id => b(id, '1/8', { isTriplet: true, lyric: id }));
      const { container } = renderMeasures([
        { id: 'm1', index: 1, timeSignature: [2, 4], beats: [...triplets, b('q1', '1/4', { lyric: 'q1' })] },
        { id: 'm2', index: 2, timeSignature: [2, 4], beats: [b('q2', '1/4', { lyric: 'q2' }), b('q3', '1/4')] }
      ]);
      const blocks = Array.from(container.querySelectorAll('.measure-svg-block'));
      const [bracketTop, bracketBottom] = pathYRange(blocks[0].querySelector('.triplet-bracket')!.getAttribute('d')!);
      const badge = blocks[0].querySelector('.duration-badge rect')!;
      const badgeTop = Number(badge.getAttribute('y'));
      const badgeBottom = badgeTop + Number(badge.getAttribute('height'));
      // Stems end 36 below the last string; badge 4–16 beyond, bracket line 22 beyond with hooks 5 toward the staff
      expect(badgeBottom).toBeLessThan(bracketTop);
      expect(bracketBottom - bracketTop).toBe(5);
      const numberY = Number(blocks[0].querySelector('.triplet-number')!.getAttribute('y'));
      expect(numberY).toBe(bracketBottom);
      const lyricY = (block: Element) => Number(block.querySelector('.tab-lyric-text')!.getAttribute('y'));
      // The "3" is 11 px, centred on the line: the top of the lyric (13 px text above its baseline) stays beyond it
      expect(lyricY(blocks[0]) - 13).toBeGreaterThan(numberY + 5.5);
      // Measure without triplets: lyric and height as before; the triplet measure grows by 14
      expect(lyricY(blocks[0]) - lyricY(blocks[1])).toBe(14);
      const height = (block: Element) => Number(block.querySelector('svg')!.getAttribute('height'));
      expect(height(blocks[1])).toBe(42 + 3 * 24 + 50);
      expect(height(blocks[0]) - height(blocks[1])).toBe(14);
    });

    it('keeps stems-above lyrics and heights unchanged in triplet measures', () => {
      const { container } = renderMeasures([
        { id: 'm1', index: 1, timeSignature: [2, 4], beats: [b('t1', '1/8', { isTriplet: true, lyric: 'a' }), b('t2', '1/8', { isTriplet: true }), b('t3', '1/8', { isTriplet: true })] },
        { id: 'm2', index: 2, timeSignature: [2, 4], beats: [b('q2', '1/4', { lyric: 'b' })] }
      ], 'above');
      const blocks = Array.from(container.querySelectorAll('.measure-svg-block'));
      const lyricYs = blocks.map(bl => bl.querySelector('.tab-lyric-text')!.getAttribute('y'));
      expect(lyricYs[0]).toBe(lyricYs[1]);
      expect(blocks.map(bl => bl.querySelector('svg')!.getAttribute('height'))).toEqual([String(60 + 72 + 28), String(60 + 72 + 28)]);
      // Bracket line 22 beyond the stem end (stem end 36 above String 1 at y 60): 60 − 58 = 2; hooks 5 toward the staff
      expect(pathYRange(blocks[0].querySelector('.triplet-bracket')!.getAttribute('d')!)).toEqual([2, 7]);
    });
  });

  describe('row-start string labels', () => {
    const noop = vi.fn();
    const measures: Measure[] = [1, 2, 3, 4].map(i => ({
      id: `m${i}`, index: i, timeSignature: [4, 4], beats: [{ id: `q${i}`, duration: '1/4', notes: [{ id: `n${i}`, string: 1, fret: i }] }]
    }));
    const renderDoc = (doc: TabDocument) => render(
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
    const labelsOf = (el: Element) => Array.from(el.querySelectorAll('text')).map(t => t.textContent);

    it('keeps the first-measure labels in its block and draws no gutter labels for a single measure', () => {
      const { container } = renderDoc(mockTabDocument);
      const block = container.querySelector('.measure-svg-block')!;
      expect(labelsOf(block.querySelector('svg')!)).toEqual(expect.arrayContaining(['g4', 'C4', 'E4', 'A4']));
      expect(container.querySelectorAll('.string-gutter-labels')).toHaveLength(0);
    });

    it('regression: print row labels are images when a canvas exists, so hidden ones never reach the PDF text layer', () => {
      const fillText = vi.fn();
      const fakeContext = { scale: vi.fn(), fillText, fillStyle: '', font: '', textAlign: '', textBaseline: '' };
      const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext as unknown as CanvasRenderingContext2D);
      const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,TEST');
      try {
        const { container } = renderDoc({ ...mockTabDocument, measures });
        const printLabels = Array.from(container.querySelectorAll('.print-gutter-labels'));
        expect(printLabels).toHaveLength(3);
        printLabels.forEach(el => {
          expect(el.tagName).toBe('IMG');
          expect(el.getAttribute('src')).toBe('data:image/png;base64,TEST');
          expect(el.querySelectorAll('text')).toHaveLength(0);
        });
        // One shared image, drawn once with every string label
        expect(fillText.mock.calls.map(c => c[0])).toEqual(['A4', 'E4', 'C4', 'g4']);
      } finally {
        getContext.mockRestore();
        toDataURL.mockRestore();
      }
    });

    it('renders print-only gutter labels for every measure after the first, one per string line', () => {
      const { container } = renderDoc({ ...mockTabDocument, measures });
      const blocks = Array.from(container.querySelectorAll('.measure-svg-block'));
      expect(blocks.map(bl => bl.querySelectorAll('.print-gutter-labels').length)).toEqual([0, 1, 1, 1]);
      const gutter = blocks[1].querySelector('.print-gutter-labels')!;
      expect(gutter.classList.contains('string-gutter-labels')).toBe(true);
      expect(gutter.classList.contains('no-print')).toBe(false);
      // String 1 (A4) on top down to String 4 (g4), right-aligned on each line's y (+4 baseline offset)
      expect(labelsOf(gutter)).toEqual(['A4', 'E4', 'C4', 'g4']);
      const texts = Array.from(gutter.querySelectorAll('text'));
      expect(texts.map(t => t.getAttribute('y'))).toEqual(['46', '70', '94', '118']);
      expect(texts.every(t => t.getAttribute('text-anchor') === 'end')).toBe(true);
      // Gutter labels never change measure widths
      expect(blocks[1].querySelector('svg')!.getAttribute('width')).toBe(String(62 + 30));
      // jsdom lays nothing out (every offsetTop is 0), so no measure is detected as a row start on screen
      expect(container.querySelectorAll('.screen-gutter-labels')).toHaveLength(0);
    });

    it('renders screen gutter labels only for measures detected as starting a row', () => {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
      // Measures 1–2 on the first row, 3–4 on the second
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get(this: HTMLElement) {
          if (!this.classList.contains('measure-svg-block') || !this.parentElement) return 0;
          return Array.from(this.parentElement.children).indexOf(this) >= 2 ? 180 : 0;
        }
      });
      try {
        const { container } = renderDoc({ ...mockTabDocument, measures });
        const blocks = Array.from(container.querySelectorAll('.measure-svg-block'));
        expect(blocks.map(bl => bl.querySelectorAll('.screen-gutter-labels').length)).toEqual([0, 0, 1, 0]);
        const screenGutter = blocks[2].querySelector('.screen-gutter-labels')!;
        expect(screenGutter.classList.contains('no-print')).toBe(true);
        expect(labelsOf(screenGutter)).toEqual(['A4', 'E4', 'C4', 'g4']);
      } finally {
        if (original) Object.defineProperty(HTMLElement.prototype, 'offsetTop', original);
        else Reflect.deleteProperty(HTMLElement.prototype, 'offsetTop');
      }
    });
  });
});
