import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChordDiagram } from './ChordDiagram';
import { ChordMarker } from '../types/ukulele';

describe('ChordDiagram Component', () => {
  it('renders standard C chord diagram with open strings and 1 fretted dot', () => {
    const cChord: ChordMarker = {
      name: 'C',
      frets: [0, 0, 0, 3],
      baseFret: 1
    };

    const { container } = render(<ChordDiagram chord={cChord} width={50} height={72} />);

    // Check SVG rendered
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    // Check chord title text
    const titleText = container.querySelector('text');
    expect(titleText?.textContent).toBe('C');

    // Frets [0, 0, 0, 3]: 3 open circles and 1 fretted dot circle
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(4);
  });

  it('renders chord with muted string (✕) and high position base fret', () => {
    const customChord: ChordMarker = {
      name: 'Ddim',
      frets: [-1, 2, 1, 2],
      baseFret: 3
    };

    const { container } = render(<ChordDiagram chord={customChord} width={50} height={72} />);

    // Base fret text (3fr)
    const allTexts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    expect(allTexts).toContain('Ddim');
    expect(allTexts).toContain('3fr');

    // Muted string renders an '✕' text indicator
    expect(allTexts).toContain('✕');
  });
});
