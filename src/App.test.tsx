import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { App } from './App';
import { SHORTCUTS } from './utils/shortcuts';
import { createBlankTabDocument } from './utils/sampleData';
import { GUITAR_PROFILE, GUITAR_TUNINGS } from './instruments/guitar';
import { playBeatChord, playMetronomeClick } from './utils/audioSynth';

// No Web Audio in jsdom: record the calls instead
vi.mock('./utils/audioSynth', () => ({
  playBeatChord: vi.fn(),
  playMetronomeClick: vi.fn(),
  playPluck: vi.fn(),
  playMutedClick: vi.fn()
}));

const press = (key: string, init: Partial<KeyboardEventInit> = {}) => {
  act(() => {
    fireEvent.keyDown(window, { key, ...init });
  });
};

// Clicking a beat column's highlight selects that beat (sample song "Conjunction Junction", 4/4 quarters)
const selectBeat = (container: HTMLElement, index: number) => {
  const columns = container.querySelectorAll('.playhead-highlight');
  fireEvent.click(columns[index]);
};

describe('App: shortcuts help panel', () => {
  it('lists every shortcut description after opening "Shortcuts & Guide"', () => {
    const { getByRole, queryByText, getByText } = render(<App />);
    expect(queryByText(SHORTCUTS[0].description)).toBeNull();

    fireEvent.click(getByRole('button', { name: /Shortcuts & Guide/i }));

    SHORTCUTS.forEach(shortcut => {
      expect(getByText(shortcut.description)).not.toBeNull();
    });
  });
});

describe('App: keyboard shortcuts', () => {
  it('sets the selected beat duration with e and toggles a rest with r', () => {
    const { container, getByText } = render(<App />);
    selectBeat(container, 0);
    expect(getByText(/1\/4 Note Event/)).not.toBeNull();

    press('e');
    expect(getByText(/1\/8 Note Event/)).not.toBeNull();

    press('R');
    expect(getByText(/1\/8 Rest Event/)).not.toBeNull();
  });

  it('regression: the first beat is selected on startup, so shortcuts work before any click', () => {
    const { getByText } = render(<App />);
    expect(getByText(/Measure 1 • 1\/4 Note Event/)).not.toBeNull();

    press('e');
    expect(getByText(/Measure 1 • 1\/8 Note Event/)).not.toBeNull();
  });

  it('leaves Ctrl combinations to the browser', () => {
    const { container, getByText } = render(<App />);
    selectBeat(container, 0);
    press('r', { ctrlKey: true });
    expect(getByText(/1\/4 Note Event/)).not.toBeNull();
  });

  it('ignores shortcuts while typing in a text field', () => {
    const { container, getByText, getByPlaceholderText } = render(<App />);
    selectBeat(container, 0);
    const lyricInput = getByPlaceholderText('Add lyric...');

    act(() => {
      fireEvent.keyDown(lyricInput, { key: 'e' });
    });
    expect(getByText(/1\/4 Note Event/)).not.toBeNull();
  });
});

describe('App: metronome playback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(playMetronomeClick).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('regression: metronome clicks once per beat, not once per note column', () => {
    const { container, getByTitle } = render(<App />);

    // Measure 1 becomes five columns (eighth, eighth, quarter, quarter, quarter) in 4/4
    selectBeat(container, 0);
    press('e');
    press('+');
    selectBeat(container, 0);

    fireEvent.click(getByTitle('Toggle Metronome'));
    press(' ', { code: 'Space' });

    // Measure 1 lasts 2000 ms at 120 BPM: four beat clicks, the first accented
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(vi.mocked(playMetronomeClick).mock.calls).toEqual([[true], [false], [false], [false]]);

    // Measure 2 starts with an accent
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(vi.mocked(playMetronomeClick).mock.calls[4]).toEqual([true]);
  });

  it('regression: notes are played for their written length', () => {
    vi.mocked(playBeatChord).mockClear();
    const { container } = render(<App />);
    selectBeat(container, 0);
    press('e');
    press(' ', { code: 'Space' });

    // First column is now an eighth at 120 BPM: 0.25 s
    expect(vi.mocked(playBeatChord).mock.calls[0][5]).toBeCloseTo(0.25);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    // Second column is a quarter: 0.5 s
    expect(vi.mocked(playBeatChord).mock.calls[1][5]).toBeCloseTo(0.5);
  });

  it('fires no clicks after playback stops', () => {
    const { container, getByTitle } = render(<App />);
    selectBeat(container, 0);
    fireEvent.click(getByTitle('Toggle Metronome'));
    press(' ', { code: 'Space' });

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(playMetronomeClick).toHaveBeenCalledTimes(1);

    press(' ', { code: 'Space' });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(playMetronomeClick).toHaveBeenCalledTimes(1);
  });
});

describe('App: opening files', () => {
  it('regression: a file without a chord palette gets default shapes for its own tuning', async () => {
    const dropD = { ...createBlankTabDocument(GUITAR_PROFILE), tuning: GUITAR_TUNINGS.DADGBE, chordPalette: [] };
    const { container, getAllByRole, getByDisplayValue } = render(<App />);
    const input = container.querySelector<HTMLInputElement>('input[accept=".uketab,.json"]')!;

    fireEvent.change(input, { target: { files: [new File([JSON.stringify(dropD)], 'dropd.uketab')] } });

    // Assigning the palette's G to the selected first beat draws the Drop D shape (5 2 0 0 0 3, base fret 2)
    await waitFor(() => expect(getByDisplayValue('Untitled Guitar Tab')).not.toBeNull());
    fireEvent.click(getAllByRole('button', { name: 'G' })[0]);
    await waitFor(() => {
      const baseFretLabels = Array.from(container.querySelectorAll('.chord-base-fret-text')).map(t => t.textContent);
      expect(baseFretLabels).toContain('2fr');
    });
  });
});

describe('App: capo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the capo in the print header only when one is set', () => {
    const { container, getByLabelText } = render(<App />);
    const meta = () => container.querySelector('.print-title-header .meta')!.textContent;
    expect(meta()).toBe('Tuning: Standard High-G (gCEA) (A4-E4-C4-g4) • Tempo: 120 BPM');

    fireEvent.change(getByLabelText('Capo'), { target: { value: '2' } });
    expect(meta()).toBe('Tuning: Standard High-G (gCEA) (A4-E4-C4-g4) • Capo 2 • Tempo: 120 BPM');

    fireEvent.change(getByLabelText('Capo'), { target: { value: '0' } });
    expect(meta()).toBe('Tuning: Standard High-G (gCEA) (A4-E4-C4-g4) • Tempo: 120 BPM');
  });

  it('plays notes at the pitch raised by the capo', () => {
    vi.useFakeTimers();
    vi.mocked(playBeatChord).mockClear();
    const { getByLabelText } = render(<App />);
    fireEvent.change(getByLabelText('Capo'), { target: { value: '3' } });
    press(' ', { code: 'Space' });

    const tuning = vi.mocked(playBeatChord).mock.calls[0][1];
    expect(tuning.pitches).toEqual([72, 67, 63, 70]);
    press(' ', { code: 'Space' });
  });
});

describe('App: converting to another instrument', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts after confirmation, keeps the selection within the new strings and reports dropped notes', async () => {
    // Guitar file whose first beat is a six-note E chord
    const guitarDoc = createBlankTabDocument(GUITAR_PROFILE);
    guitarDoc.measures[0].beats[0].notes = [0, 2, 2, 1, 0, 0].map((fret, i) => ({ id: `e${i}`, string: 6 - i, fret }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { container, getByText, getByDisplayValue } = render(<App />);
    const input = container.querySelector<HTMLInputElement>('input[accept=".uketab,.json"]')!;
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(guitarDoc)], 'e.uketab')] } });
    await waitFor(() => expect(getByDisplayValue('Untitled Guitar Tab')).not.toBeNull());

    [1, 2, 3, 4, 5].forEach(() => press('ArrowDown'));
    expect(getByText(/String 6 \(E2\)/)).not.toBeNull();

    fireEvent.click(getByText('Convert'));
    fireEvent.click(getByText('Convert to Bass'));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(getByText(/4-Line Bass Tab Chart/)).not.toBeNull();
    expect(getByText(/String 4 \(E1\)/)).not.toBeNull();
    expect(alert).toHaveBeenCalledWith('2 note(s) did not fit on the bass and were removed.');
  });

  it('leaves the song unchanged when the conversion is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { getByText } = render(<App />);
    fireEvent.click(getByText('Convert'));
    fireEvent.click(getByText('Convert to Guitar'));
    expect(getByText(/4-Line Ukulele Tab Chart/)).not.toBeNull();
  });
});
