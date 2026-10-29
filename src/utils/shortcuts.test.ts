import { describe, it, expect } from 'vitest';
import { SHORTCUTS, ShortcutId, ShortcutKeyEvent, findShortcut, resolveFretDigit } from './shortcuts';

// Representative events for every shortcut, as a browser reports them
const BOUND_EVENTS: [ShortcutKeyEvent, ShortcutId][] = [
  ...'0123456789'.split('').map((key): [ShortcutKeyEvent, ShortcutId] => [{ key, code: `Digit${key}` }, 'setFret']),
  [{ key: '7', code: 'Numpad7' }, 'setFret'],
  [{ key: 'x', code: 'KeyX' }, 'mutedNote'],
  [{ key: 'X', code: 'KeyX', shiftKey: true }, 'mutedNote'],
  [{ key: 'm', code: 'KeyM' }, 'mutedNote'],
  [{ key: 'M', code: 'KeyM', shiftKey: true }, 'mutedNote'],
  [{ key: 'Backspace', code: 'Backspace' }, 'removeNote'],
  [{ key: 'Delete', code: 'Delete' }, 'removeNote'],
  ...'whqesdWHQESD'.split('').map((key): [ShortcutKeyEvent, ShortcutId] => [{ key, code: `Key${key.toUpperCase()}` }, 'setDuration']),
  [{ key: '.', code: 'Period' }, 'toggleDot'],
  [{ key: 'r', code: 'KeyR' }, 'toggleRest'],
  [{ key: 'R', code: 'KeyR', shiftKey: true }, 'toggleRest'],
  [{ key: 't', code: 'KeyT' }, 'toggleTriplet'],
  [{ key: 'T', code: 'KeyT', shiftKey: true }, 'toggleTriplet'],
  [{ key: 'l', code: 'KeyL' }, 'toggleTie'],
  [{ key: 'L', code: 'KeyL', shiftKey: true }, 'toggleTie'],
  [{ key: '+', code: 'Equal', shiftKey: true }, 'insertBeat'],
  [{ key: '+', code: 'NumpadAdd' }, 'insertBeat'],
  [{ key: 'Enter', code: 'Enter', shiftKey: true }, 'insertBeat'],
  [{ key: 'ArrowLeft', code: 'ArrowLeft' }, 'previousBeat'],
  [{ key: 'ArrowRight', code: 'ArrowRight' }, 'nextBeat'],
  [{ key: 'ArrowUp', code: 'ArrowUp' }, 'previousString'],
  [{ key: 'ArrowDown', code: 'ArrowDown' }, 'nextString'],
  [{ key: ' ', code: 'Space' }, 'playPause'],
  [{ key: ' ', code: 'Space', shiftKey: true }, 'playPause']
];

const UNBOUND_EVENTS: ShortcutKeyEvent[] = [
  { key: 'Enter', code: 'Enter' },
  { key: 'Enter', code: 'NumpadEnter' },
  { key: ' ' }, // Space is matched by code only
  { key: 'a', code: 'KeyA' },
  { key: 'z', code: 'KeyZ' },
  { key: '=', code: 'Equal' },
  { key: '-', code: 'Minus' },
  { key: ',', code: 'Comma' },
  { key: '!', code: 'Digit1', shiftKey: true },
  { key: 'Escape', code: 'Escape' },
  { key: 'Tab', code: 'Tab' },
  { key: 'Shift', code: 'ShiftLeft', shiftKey: true },
  { key: 'F5', code: 'F5' },
  { key: 'Home', code: 'Home' },
  // Ctrl, Alt and Meta combinations belong to the browser and system
  { key: 'r', code: 'KeyR', ctrlKey: true },
  { key: 's', code: 'KeyS', ctrlKey: true },
  { key: 's', code: 'KeyS', metaKey: true },
  { key: '5', code: 'Digit5', altKey: true },
  { key: 'ArrowLeft', code: 'ArrowLeft', altKey: true },
  { key: ' ', code: 'Space', ctrlKey: true }
];

describe('shortcuts: SHORTCUTS table', () => {
  it('has a unique id and a key label and description for every entry', () => {
    const ids = SHORTCUTS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    SHORTCUTS.forEach(s => {
      expect(s.keys.trim()).not.toBe('');
      expect(s.description.trim()).not.toBe('');
    });
  });

  it('matches every shortcut by its representative events', () => {
    BOUND_EVENTS.forEach(([event, id]) => {
      expect(findShortcut(event)?.id, JSON.stringify(event)).toBe(id);
    });
  });

  it('has at least one representative event per shortcut', () => {
    const covered = new Set(BOUND_EVENTS.map(([, id]) => id));
    SHORTCUTS.forEach(s => expect(covered.has(s.id), s.id).toBe(true));
  });

  it('never matches one event to two shortcuts', () => {
    [...BOUND_EVENTS.map(([event]) => event), ...UNBOUND_EVENTS].forEach(event => {
      const matching = SHORTCUTS.filter(s => s.matches(event)).map(s => s.id);
      expect(matching.length, `${JSON.stringify(event)} -> ${matching.join(', ')}`).toBeLessThanOrEqual(1);
    });
  });

  it('returns undefined for unbound keys, including plain Enter and Space without its code', () => {
    UNBOUND_EVENTS.forEach(event => {
      expect(findShortcut(event), JSON.stringify(event)).toBeUndefined();
    });
  });

  it('only needs a selection for beat edits; navigation, delete and play/pause are always handled', () => {
    const withoutSelection = SHORTCUTS.filter(s => !s.requiresSelection).map(s => s.id).sort();
    expect(withoutSelection).toEqual(['nextBeat', 'nextString', 'playPause', 'previousBeat', 'previousString', 'removeNote']);
  });
});

describe('shortcuts: two-digit fret entry', () => {
  it('merges a second digit within the window when the result is at most 20', () => {
    expect(resolveFretDigit('2', '1', 300)).toEqual({ fret: 12, pendingDigit: '' });
    expect(resolveFretDigit('0', '2', 599)).toEqual({ fret: 20, pendingDigit: '' });
  });

  it('uses the single digit when the merge would exceed 20, and clears the pending digit', () => {
    expect(resolveFretDigit('5', '3', 300)).toEqual({ fret: 5, pendingDigit: '' });
    expect(resolveFretDigit('1', '2', 300)).toEqual({ fret: 1, pendingDigit: '' });
  });

  it('starts a new pending digit after the window or with nothing pending', () => {
    expect(resolveFretDigit('2', '1', 600)).toEqual({ fret: 2, pendingDigit: '2' });
    expect(resolveFretDigit('7', '', 10)).toEqual({ fret: 7, pendingDigit: '7' });
  });
});

describe('shortcuts: regressions', () => {
  it('regression: Ctrl/Alt/Meta combinations are left to the browser (Ctrl+R reloads, Ctrl+S saves)', () => {
    expect(findShortcut({ key: 'r', code: 'KeyR', ctrlKey: true })).toBeUndefined();
    expect(findShortcut({ key: 's', code: 'KeyS', ctrlKey: true })).toBeUndefined();
    expect(findShortcut({ key: 'r', code: 'KeyR' })?.id).toBe('toggleRest');
  });

  it('regression: thirty-second notes have a shortcut (d)', () => {
    expect(findShortcut({ key: 'd', code: 'KeyD' })?.id).toBe('setDuration');
  });
});
