import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { ShortcutHelp } from './ShortcutHelp';
import { SHORTCUTS } from '../utils/shortcuts';

describe('ShortcutHelp Component', () => {
  it('lists the keys and description of every SHORTCUTS entry', () => {
    const { container } = render(<ShortcutHelp onClose={() => {}} />);
    const rows = container.querySelectorAll('[data-shortcut-id]');
    expect(rows).toHaveLength(SHORTCUTS.length);

    SHORTCUTS.forEach(shortcut => {
      const row = container.querySelector(`[data-shortcut-id="${shortcut.id}"]`) as HTMLElement;
      expect(row, shortcut.id).not.toBeNull();
      expect(within(row).getByText(shortcut.keys)).not.toBeNull();
      expect(within(row).getByText(shortcut.description)).not.toBeNull();
    });
  });

  it('calls onClose from the close button', () => {
    const handleClose = vi.fn();
    const { getByRole } = render(<ShortcutHelp onClose={handleClose} />);
    fireEvent.click(getByRole('button', { name: /Close/i }));
    expect(handleClose).toHaveBeenCalled();
  });
});
