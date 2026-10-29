import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditorToolbar } from './EditorToolbar';
import { createBlankTabDocument } from '../utils/sampleData';
import { GUITAR_PROFILE } from '../instruments/guitar';
import { TabDocument } from '../types/tab';

function renderToolbar(document: TabDocument, onNewSong = vi.fn()) {
  const noop = vi.fn();
  return render(
    <EditorToolbar
      document={document}
      isPlaying={false}
      activeDuration="1/4"
      enableMetronome={false}
      playbackSpeed={1}
      onUpdateDocument={noop}
      onTogglePlayback={noop}
      onToggleMetronome={noop}
      onChangeSpeed={noop}
      onSelectDuration={noop}
      onAddMeasure={noop}
      onTranspose={noop}
      onNewSong={onNewSong}
      onExportJson={noop}
      onImportJson={noop}
      onExportPdf={noop}
    />
  );
}

describe('EditorToolbar Component: Instrument Menus', () => {
  it('creates a new tab for the instrument picked from the New Tab menu', () => {
    const onNewSong = vi.fn();
    const { getByText, queryByRole } = renderToolbar(createBlankTabDocument(), onNewSong);

    expect(queryByRole('menu')).toBeNull();
    fireEvent.click(getByText('New Tab'));
    fireEvent.click(getByText('New Guitar Tab'));

    expect(onNewSong).toHaveBeenCalledWith('guitar');
    expect(queryByRole('menu')).toBeNull();
  });

  it('lists the current instrument first in the Guitar Pro import menu', () => {
    const { getByText, getAllByRole } = renderToolbar(createBlankTabDocument(GUITAR_PROFILE));

    fireEvent.click(getByText('Open Guitar Pro'));
    const items = getAllByRole('menuitem').map(el => el.textContent);
    expect(items).toEqual(['Import as Guitar Tab6 strings', 'Import as Ukulele Tab4 strings', 'Import as Bass Tab4 strings']);
  });

  it('keeps the native file pickers hidden', () => {
    const { container } = renderToolbar(createBlankTabDocument());
    const fileInputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    expect(fileInputs).toHaveLength(2);
    fileInputs.forEach(input => expect(input.hidden).toBe(true));
  });

  it('offers the instrument tunings and keeps a custom tuning selectable', () => {
    const doc = createBlankTabDocument(GUITAR_PROFILE);
    const custom = { ...doc, tuning: { key: 'custom' as const, name: 'Custom (C2 A2 D3 G3 B3 E4)', pitches: [64, 59, 55, 50, 45, 36], stringsDisplay: ['E4', 'B3', 'G3', 'D3', 'A2', 'C2'] } };
    const { container } = renderToolbar(custom);

    const tuningSelect = Array.from(container.querySelectorAll('select')).find(s => s.value === 'custom')!;
    const options = Array.from(tuningSelect.options).map(o => o.textContent);
    expect(options).toEqual([...GUITAR_PROFILE.tunings.map(t => t.name), 'Custom (C2 A2 D3 G3 B3 E4)']);
  });
});
