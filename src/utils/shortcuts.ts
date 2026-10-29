import { DURATION_KEY_MAP } from '../types/tab';

export type ShortcutId =
  | 'setFret'
  | 'mutedNote'
  | 'removeNote'
  | 'setDuration'
  | 'toggleDot'
  | 'toggleRest'
  | 'toggleTriplet'
  | 'toggleTie'
  | 'insertBeat'
  | 'previousBeat'
  | 'nextBeat'
  | 'previousString'
  | 'nextString'
  | 'playPause';

// The subset of KeyboardEvent the matchers read, so tests can pass plain objects
export interface ShortcutKeyEvent {
  key: string;
  code?: string;
  shiftKey?: boolean;
}

export interface ShortcutDefinition {
  id: ShortcutId;
  keys: string;               // Display label for the help panel
  description: string;
  requiresSelection: boolean; // When true the key is left to the browser unless a beat is selected
  matches: (e: ShortcutKeyEvent) => boolean;
}

// Two digits typed within this window merge into one fret if the result is at most TWO_DIGIT_FRET_MAX
export const TWO_DIGIT_FRET_WINDOW_MS = 600;
export const TWO_DIGIT_FRET_MAX = 20;

const keyIs = (...keys: string[]) => (e: ShortcutKeyEvent) => keys.includes(e.key);
const keyIsIgnoringCase = (...keys: string[]) => (e: ShortcutKeyEvent) => keys.includes(e.key.toLowerCase());

/** Every keyboard shortcut, in help-panel order. App dispatches on the id of the matching entry. */
export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'setFret',
    keys: '0–9',
    description: `Set the fret on the selected string. A second digit within ${TWO_DIGIT_FRET_WINDOW_MS} ms makes a two-digit fret if the result is ≤ ${TWO_DIGIT_FRET_MAX} (e.g. 1 then 2 = 12).`,
    requiresSelection: true,
    matches: e => /^[0-9]$/.test(e.key)
  },
  {
    id: 'mutedNote',
    keys: 'x or m',
    description: 'Muted note (X) on the selected string',
    requiresSelection: true,
    matches: keyIsIgnoringCase('x', 'm')
  },
  {
    id: 'removeNote',
    keys: 'Backspace, Delete',
    description: 'Remove the note on the selected string',
    requiresSelection: false,
    matches: keyIs('Backspace', 'Delete')
  },
  {
    id: 'setDuration',
    keys: 'w h q e s',
    description: 'Set the active duration and the selected beat to whole, half, quarter, eighth, sixteenth',
    requiresSelection: true,
    matches: e => Object.prototype.hasOwnProperty.call(DURATION_KEY_MAP, e.key.toLowerCase())
  },
  {
    id: 'toggleDot',
    keys: '.',
    description: 'Toggle dotted',
    requiresSelection: true,
    matches: keyIs('.')
  },
  {
    id: 'toggleRest',
    keys: 'r',
    description: 'Toggle rest (making a beat a rest removes its notes)',
    requiresSelection: true,
    matches: keyIsIgnoringCase('r')
  },
  {
    id: 'toggleTriplet',
    keys: 't',
    description: 'Toggle triplet',
    requiresSelection: true,
    matches: keyIsIgnoringCase('t')
  },
  {
    id: 'toggleTie',
    keys: 'l',
    description: 'Toggle tie',
    requiresSelection: true,
    matches: keyIsIgnoringCase('l')
  },
  {
    id: 'insertBeat',
    keys: '+ or Shift+Enter',
    description: 'Insert a beat after the selected beat',
    requiresSelection: true,
    matches: e => e.key === '+' || (!!e.shiftKey && e.key === 'Enter')
  },
  {
    id: 'previousBeat',
    keys: '←',
    description: 'Previous beat column, across measures',
    requiresSelection: false,
    matches: keyIs('ArrowLeft')
  },
  {
    id: 'nextBeat',
    keys: '→',
    description: 'Next beat column, across measures',
    requiresSelection: false,
    matches: keyIs('ArrowRight')
  },
  {
    id: 'previousString',
    keys: '↑',
    description: 'Previous string (stops at String 1)',
    requiresSelection: false,
    matches: keyIs('ArrowUp')
  },
  {
    id: 'nextString',
    keys: '↓',
    description: 'Next string (stops at String N)',
    requiresSelection: false,
    matches: keyIs('ArrowDown')
  },
  {
    id: 'playPause',
    keys: 'Space',
    description: 'Play / pause (no selection needed)',
    requiresSelection: false,
    matches: e => e.code === 'Space'
  }
];

export function findShortcut(e: ShortcutKeyEvent): ShortcutDefinition | undefined {
  return SHORTCUTS.find(shortcut => shortcut.matches(e));
}

/**
 * Resolves a typed fret digit against the previous one. Within the merge window a pending digit combines with
 * this one if the result is ≤ TWO_DIGIT_FRET_MAX; any merge attempt clears the pending digit.
 */
export function resolveFretDigit(digit: string, pendingDigit: string, msSinceLastDigit: number): { fret: number; pendingDigit: string } {
  if (msSinceLastDigit < TWO_DIGIT_FRET_WINDOW_MS && pendingDigit !== '') {
    const combined = parseInt(pendingDigit + digit, 10);
    return { fret: combined <= TWO_DIGIT_FRET_MAX ? combined : parseInt(digit, 10), pendingDigit: '' };
  }
  return { fret: parseInt(digit, 10), pendingDigit: digit };
}
