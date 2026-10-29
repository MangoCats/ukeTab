import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { App } from './App';
import { SHORTCUTS } from './utils/shortcuts';
import { playMetronomeClick } from './utils/audioSynth';

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
