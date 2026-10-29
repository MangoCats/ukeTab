import React from 'react';
import { Keyboard } from 'lucide-react';
import { SHORTCUTS } from '../utils/shortcuts';

interface ShortcutHelpProps {
  onClose: () => void;
}

/** Help panel listing every entry of SHORTCUTS, so the panel cannot drift from the key handler. */
export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => (
  <div className="no-print bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 mb-6 shadow-2xl space-y-3">
    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
      <h3 className="text-sm font-bold font-outfit text-amber-400 flex items-center gap-2">
        <Keyboard className="w-4 h-4" />
        Interactive Editing Instructions & Keyboard Shortcuts
      </h3>
      <button
        onClick={onClose}
        className="text-xs text-slate-400 hover:text-slate-200"
      >
        ✕ Close
      </button>
    </div>
    <p className="text-xs text-slate-400">
      Click a string on a beat to select it. Shortcuts are ignored while typing in a text field or menu, and most require a selected beat.
    </p>
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {SHORTCUTS.map(shortcut => (
        <li
          key={shortcut.id}
          data-shortcut-id={shortcut.id}
          className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800"
        >
          <kbd
            className="shrink-0 bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono"
            style={{ minWidth: '8.5rem', textAlign: 'center' }}
          >
            {shortcut.keys}
          </kbd>
          <span className="text-slate-300">{shortcut.description}</span>
        </li>
      ))}
    </ul>
  </div>
);
