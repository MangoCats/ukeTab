import React, { useState } from 'react';
import { ChordMarker } from '../types/ukulele';
import { UKULELE_CHORD_LIBRARY, getChordPreset, createChordMarker, findExistingChordsByFrets } from '../utils/musicTheory';
import { ChordDiagram } from './ChordDiagram';
import { Music, Check, Plus, AlertTriangle, X, Sparkles } from 'lucide-react';

interface ChordPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePalette: ChordMarker[];
  onUpdatePalette: (newPalette: ChordMarker[]) => void;
}

export const ChordPaletteModal: React.FC<ChordPaletteModalProps> = ({
  isOpen,
  onClose,
  activePalette,
  onUpdatePalette
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');

  // Creator state
  const [newChordName, setNewChordName] = useState<string>('');
  const [s4Fret, setS4Fret] = useState<number>(0);
  const [s3Fret, setS3Fret] = useState<number>(0);
  const [s2Fret, setS2Fret] = useState<number>(0);
  const [s1Fret, setS1Fret] = useState<number>(0);

  const currentFrets: [number, number, number, number] = [s4Fret, s3Fret, s2Fret, s1Fret];
  const duplicateMatches = findExistingChordsByFrets(currentFrets);

  const activeNames = new Set(activePalette.map(c => c.name.toLowerCase()));
  const allLibraryNames = Object.keys(UKULELE_CHORD_LIBRARY);

  const handleToggleChordInPalette = (chordName: string) => {
    const isCurrentlyActive = activeNames.has(chordName.toLowerCase());
    if (isCurrentlyActive) {
      const updated = activePalette.filter(c => c.name.toLowerCase() !== chordName.toLowerCase());
      onUpdatePalette(updated);
    } else {
      const preset = getChordPreset(chordName) || createChordMarker(chordName);
      onUpdatePalette([...activePalette, preset]);
    }
  };

  const handleSaveNewChord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChordName.trim()) {
      alert('Please enter a chord name (e.g. F#m7 or Aminor).');
      return;
    }

    const created = createChordMarker(newChordName.trim(), currentFrets);
    const updatedPalette = [...activePalette.filter(c => c.name.toLowerCase() !== created.name.toLowerCase()), created];
    onUpdatePalette(updatedPalette);

    setNewChordName('');
    setActiveTab('select');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-outfit text-slate-100">
                Composition Chord Palette Manager
              </h2>
              <p className="text-xs text-slate-400">
                Select relevant chords for this song's dropdown, or define custom chord fingerings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('select')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'select'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Active Composition Chords ({activePalette.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Define New Custom Chord</span>
          </button>
        </div>

        {/* Tab 1: Select Active Composition Chords */}
        {activeTab === 'select' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <p className="text-xs text-slate-400">
              Check the chords below to include them in the quick dropdown list for this composition:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {allLibraryNames.map(name => {
                const isActive = activeNames.has(name.toLowerCase());
                const chordMarker = getChordPreset(name);

                return (
                  <div
                    key={name}
                    onClick={() => handleToggleChordInPalette(name)}
                    className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {chordMarker && (
                      <ChordDiagram chord={chordMarker} width={42} height={62} />
                    )}

                    <div className="flex items-center gap-1.5 w-full justify-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-bold font-mono text-slate-200">{name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Define New Custom Chord */}
        {activeTab === 'create' && (
          <form onSubmit={handleSaveNewChord} className="flex-1 overflow-y-auto space-y-5 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Form Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chord Name / Shorthand:
                  </label>
                  <input
                    type="text"
                    value={newChordName}
                    onChange={(e) => setNewChordName(e.target.value)}
                    placeholder="e.g. F#m7, C5, Aminor"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-bold outline-none transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Fret Placement [Strings 4, 3, 2, 1]:
                  </label>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px]">S4 (g/G):</span>
                      <select
                        value={s4Fret}
                        onChange={(e) => setS4Fret(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono font-bold outline-none mt-0.5"
                      >
                        <option value={-1}>X (Muted)</option>
                        <option value={0}>0 (Open)</option>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(f => (
                          <option key={f} value={f}>Fret {f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px]">S3 (C):</span>
                      <select
                        value={s3Fret}
                        onChange={(e) => setS3Fret(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono font-bold outline-none mt-0.5"
                      >
                        <option value={-1}>X (Muted)</option>
                        <option value={0}>0 (Open)</option>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(f => (
                          <option key={f} value={f}>Fret {f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px]">S2 (E):</span>
                      <select
                        value={s2Fret}
                        onChange={(e) => setS2Fret(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono font-bold outline-none mt-0.5"
                      >
                        <option value={-1}>X (Muted)</option>
                        <option value={0}>0 (Open)</option>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(f => (
                          <option key={f} value={f}>Fret {f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px]">S1 (A):</span>
                      <select
                        value={s1Fret}
                        onChange={(e) => setS1Fret(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono font-bold outline-none mt-0.5"
                      >
                        <option value={-1}>X (Muted)</option>
                        <option value={0}>0 (Open)</option>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(f => (
                          <option key={f} value={f}>Fret {f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Duplicate Fingering Alert Box */}
                {duplicateMatches.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 space-y-1.5 text-xs text-amber-300">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Existing Fingering Pattern Found</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-slate-300">
                      This fingering pattern <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-amber-300">[{s4Fret}, {s3Fret}, {s2Fret}, {s1Fret}]</code> is already defined in the library as <strong className="text-amber-300">{duplicateMatches.join(', ')}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      You can still save it under your custom name (e.g. <em>"{newChordName || 'MyChord'}"</em>)!
                    </p>
                  </div>
                )}
              </div>

              {/* Live Preview */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-3 min-h-[220px]">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Live Fingering Chart Preview:
                </span>

                <ChordDiagram
                  chord={{
                    name: newChordName || 'New Chord',
                    frets: currentFrets
                  }}
                  width={54}
                  height={78}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition"
              >
                Save & Add to Composition Palette
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
