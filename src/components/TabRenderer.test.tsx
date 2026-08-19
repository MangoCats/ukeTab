import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TabRenderer } from './TabRenderer';
import { UkuleleTabDocument } from '../types/ukulele';
import { TUNING_PRESETS, getDefaultChordPalette } from '../utils/musicTheory';

const mockTabDocument: UkuleleTabDocument = {
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
});
