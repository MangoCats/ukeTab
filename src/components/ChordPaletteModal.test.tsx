import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ChordPaletteModal } from './ChordPaletteModal';
import { getDefaultChordPalette } from '../utils/musicTheory';

describe('ChordPaletteModal Component', () => {
  it('renders modal with chord library buttons and handles close', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();
    const palette = getDefaultChordPalette();

    const { getByText, getByRole, container } = render(
      <ChordPaletteModal
        isOpen={true}
        onClose={handleClose}
        activePalette={palette}
        onUpdatePalette={handleUpdate}
      />
    );

    expect(getByText(/Composition Chord Palette Manager/i)).not.toBeNull();
    expect(getByText(/Active Composition Chords/i)).not.toBeNull();
    expect(getByText(/Define New Custom Chord/i)).not.toBeNull();

    // Click close 'X' button in header
    const closeBtn = container.querySelector('button .lucide-x')?.parentElement;
    expect(closeBtn).toBeDefined();
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  it('switches to create tab and back', () => {
    const palette = getDefaultChordPalette();
    const { getByText } = render(
      <ChordPaletteModal
        isOpen={true}
        onClose={() => {}}
        activePalette={palette}
        onUpdatePalette={() => {}}
      />
    );

    const createTabBtn = getByText(/Define New Custom Chord/i);
    fireEvent.click(createTabBtn);

    expect(getByText(/Live Fingering Chart Preview/i)).not.toBeNull();
    expect(getByText(/Save & Add to Composition Palette/i)).not.toBeNull();
  });
});
