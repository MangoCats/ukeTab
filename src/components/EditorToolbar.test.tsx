import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditorToolbar } from './EditorToolbar';
import { createBlankTabDocument } from '../utils/sampleData';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from '../instruments/guitar';
import { getChordPreset } from '../utils/musicTheory';
import { TabDocument } from '../types/tab';

function renderToolbar(document: TabDocument, onNewSong = vi.fn(), onUpdateDocument = vi.fn()) {
  const noop = vi.fn();
  return render(
    <EditorToolbar
      document={document}
      isPlaying={false}
      activeDuration="1/4"
      enableMetronome={false}
      playbackSpeed={1}
      onUpdateDocument={onUpdateDocument}
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

  it('changes the tuning with chord diagrams re-fingered and notes kept', () => {
    const onUpdateDocument = vi.fn();
    const doc = createBlankTabDocument(GUITAR_PROFILE);
    doc.measures[0].beats[0] = { ...doc.measures[0].beats[0], notes: [{ id: 'n1', string: 6, fret: 3 }], chord: getChordPreset('G', GUITAR_PROFILE) };
    const { container } = renderToolbar(doc, vi.fn(), onUpdateDocument);

    const tuningSelect = Array.from(container.querySelectorAll('select')).find(s => s.value === 'EADGBE')!;
    fireEvent.change(tuningSelect, { target: { value: 'DADGBE' } });

    const updated: TabDocument = onUpdateDocument.mock.calls[0][0](doc);
    expect(updated.tuning).toBe(GUITAR_TUNINGS.DADGBE);
    expect(updated.measures[0].beats[0].notes).toEqual([{ id: 'n1', string: 6, fret: 3 }]);
    expect(updated.measures[0].beats[0].chord?.frets).toEqual([5, 2, 0, 0, 0, 3]);
    expect(updated.chordPalette!.find(c => c.name === 'E')?.frets).toEqual([2, 2, 2, 1, 0, 0]);
  });
});

describe('EditorToolbar Component: Capo & Instrument Conversion', () => {
  it('offers no capo or a capo at frets 1-12, and sets it keeping the notes', () => {
    const onUpdateDocument = vi.fn();
    const doc = createBlankTabDocument(GUITAR_PROFILE);
    doc.measures[0].beats[0] = { ...doc.measures[0].beats[0], notes: [{ id: 'n1', string: 6, fret: 3 }] };
    const { getByLabelText } = renderToolbar(doc, vi.fn(), onUpdateDocument);

    const capoSelect = getByLabelText('Capo') as HTMLSelectElement;
    expect(capoSelect.value).toBe('0');
    expect(Array.from(capoSelect.options).map(o => o.textContent)).toEqual(['None', ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)]);

    fireEvent.change(capoSelect, { target: { value: '3' } });
    const updated: TabDocument = onUpdateDocument.mock.calls[0][0](doc);
    expect(updated.capo).toBe(3);
    expect(updated.measures).toBe(doc.measures);
  });

  it('shows the document\'s capo', () => {
    const { getByLabelText } = renderToolbar({ ...createBlankTabDocument(), capo: 5 });
    expect((getByLabelText('Capo') as HTMLSelectElement).value).toBe('5');
  });

  it('lists only the other instruments in the Convert menu', () => {
    const onConvertInstrument = vi.fn();
    const noop = vi.fn();
    const { getByText, getAllByRole, queryByRole } = render(
      <EditorToolbar
        document={createBlankTabDocument(GUITAR_PROFILE)}
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
        onConvertInstrument={onConvertInstrument}
        onExportJson={noop}
        onImportJson={noop}
        onExportPdf={noop}
      />
    );

    fireEvent.click(getByText('Convert'));
    expect(getAllByRole('menuitem').map(el => el.textContent)).toEqual(['Convert to Ukulele4 strings', 'Convert to Bass4 strings']);

    fireEvent.click(getByText('Convert to Bass'));
    expect(onConvertInstrument).toHaveBeenCalledWith('bass');
    expect(queryByRole('menu')).toBeNull();
  });
});
