import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { InspectorPanel } from './InspectorPanel';
import { createBlankTabDocument } from '../utils/sampleData';
import { TabDocument } from '../types/tab';

// Two measures: m1 in 4/4 (beat b1), m2 in 6/8 (beat b2)
function makeDoc(secondTimeSignature: [number, number] = [6, 8]): TabDocument {
  return {
    ...createBlankTabDocument(),
    measures: [
      { id: 'm1', index: 1, timeSignature: [4, 4], beats: [{ id: 'b1', duration: '1/4', notes: [] }] },
      { id: 'm2', index: 2, timeSignature: secondTimeSignature, beats: [{ id: 'b2', duration: '1/8', notes: [] }] }
    ]
  };
}

function renderPanel(document: TabDocument, selectedBeatId: string, onSetMeasureTimeSignature = vi.fn()) {
  const noop = vi.fn();
  return render(
    <InspectorPanel
      document={document}
      selectedBeatId={selectedBeatId}
      selectedString={1}
      onUpdateBeatLyric={noop}
      onSetFret={noop}
      onDeleteNote={noop}
      onInsertBeat={noop}
      onDeleteBeatColumn={noop}
      onSetMeasureTimeSignature={onSetMeasureTimeSignature}
    />
  );
}

const numeratorSelect = (getByLabelText: (text: string) => HTMLElement) =>
  getByLabelText('Time signature beats per measure') as HTMLSelectElement;
const denominatorSelect = (getByLabelText: (text: string) => HTMLElement) =>
  getByLabelText('Time signature beat unit') as HTMLSelectElement;

describe('InspectorPanel Component: Measure Time Signature', () => {
  it('shows the time signature of the selected beat\'s measure', () => {
    const { getByText, getByLabelText, unmount } = renderPanel(makeDoc(), 'b2');
    expect(getByText('Measure 2 Time Signature:')).toBeTruthy();
    expect(numeratorSelect(getByLabelText).value).toBe('6');
    expect(denominatorSelect(getByLabelText).value).toBe('8');
    unmount();

    const first = renderPanel(makeDoc(), 'b1');
    expect(numeratorSelect(first.getByLabelText).value).toBe('4');
    expect(denominatorSelect(first.getByLabelText).value).toBe('4');
  });

  it('offers numerators 1-12 and denominators 2, 4, 8, 16', () => {
    const { getByLabelText } = renderPanel(makeDoc(), 'b1');
    expect(Array.from(numeratorSelect(getByLabelText).options).map(o => o.value))
      .toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(Array.from(denominatorSelect(getByLabelText).options).map(o => o.value)).toEqual(['2', '4', '8', '16']);
  });

  it('includes a stored value outside the lists so it displays correctly', () => {
    const { getByLabelText } = renderPanel(makeDoc([15, 32]), 'b2');
    expect(numeratorSelect(getByLabelText).value).toBe('15');
    expect(denominatorSelect(getByLabelText).value).toBe('32');
    expect(Array.from(denominatorSelect(getByLabelText).options).map(o => o.value)).toEqual(['2', '4', '8', '16', '32']);
  });

  it('calls back with the measure id and the new time signature', () => {
    const onSet = vi.fn();
    const { getByLabelText } = renderPanel(makeDoc(), 'b2', onSet);

    fireEvent.change(numeratorSelect(getByLabelText), { target: { value: '3' } });
    expect(onSet).toHaveBeenLastCalledWith('m2', [3, 8]);

    fireEvent.change(denominatorSelect(getByLabelText), { target: { value: '4' } });
    expect(onSet).toHaveBeenLastCalledWith('m2', [6, 4]);
  });

  it('hides the control when no callback is given', () => {
    const noop = vi.fn();
    const { queryByLabelText } = render(
      <InspectorPanel
        document={makeDoc()}
        selectedBeatId="b1"
        selectedString={1}
        onUpdateBeatLyric={noop}
        onSetFret={noop}
        onDeleteNote={noop}
        onInsertBeat={noop}
        onDeleteBeatColumn={noop}
      />
    );
    expect(queryByLabelText('Time signature beats per measure')).toBeNull();
  });
});
