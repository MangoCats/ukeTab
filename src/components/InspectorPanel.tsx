import React from 'react';
import { UkuleleTabDocument, UkuleleNote } from '../types/ukulele';
import { calculatePitch, midiToNoteName, getAlternateFretSuggestions } from '../utils/musicTheory';
import { Music, Hash, Trash2, AlignLeft, Sparkles, PlusCircle } from 'lucide-react';

interface InspectorPanelProps {
  document: UkuleleTabDocument;
  selectedBeatId: string | null;
  selectedString: (1 | 2 | 3 | 4) | null;
  onUpdateBeatLyric: (beatId: string, lyric: string) => void;
  onSetFret: (beatId: string, stringIndex: 1 | 2 | 3 | 4, fret: number) => void;
  onDeleteNote: (beatId: string, stringIndex: 1 | 2 | 3 | 4) => void;
  onInsertBeat: (afterBeatId: string) => void;
  onInsertRest?: (afterBeatId: string) => void;
  onToggleRest?: (beatId: string) => void;
  onToggleTriplet?: (beatId: string) => void;
  onToggleTie?: (beatId: string) => void;
  onDeleteBeatColumn: (beatId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  document,
  selectedBeatId,
  selectedString,
  onUpdateBeatLyric,
  onSetFret,
  onDeleteNote,
  onInsertBeat,
  onInsertRest,
  onToggleRest,
  onToggleTriplet,
  onToggleTie,
  onDeleteBeatColumn
}) => {
  const { tuning, measures, layout } = document;
  const maxFretLimit = layout.maxFretLimit ?? 12;
  const fretButtonList = Array.from({ length: maxFretLimit + 1 }, (_, i) => i);

  if (!selectedBeatId) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
        Click any beat or string on the staff to inspect and edit fret notes or lyrics.
      </div>
    );
  }

  let selectedBeat: any = null;
  let activeMeasureIndex = 1;

  for (const m of measures) {
    const b = m.beats.find(beat => beat.id === selectedBeatId);
    if (b) {
      selectedBeat = b;
      activeMeasureIndex = m.index;
      break;
    }
  }

  if (!selectedBeat) return null;

  const currentNotes: UkuleleNote[] = selectedBeat.notes.filter((n: UkuleleNote) => !n.isGhost);
  const activeNote = selectedString ? currentNotes.find(n => n.string === selectedString) : null;
  const ghostNotes = getAlternateFretSuggestions(currentNotes, tuning, maxFretLimit);

  const stringName = selectedString ? tuning.stringsDisplay[selectedString - 1] : null;
  const pitchMidi = selectedString && activeNote ? calculatePitch(selectedString, activeNote.fret, tuning) : null;
  const pitchName = pitchMidi ? midiToNoteName(pitchMidi) : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-5 InspectorPanel">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-slate-200 font-outfit">
            Inspector &bull; Measure {activeMeasureIndex} &bull; {selectedBeat.duration} {selectedBeat.isRest ? 'Rest Event' : 'Note Event'}
          </span>
        </div>

        {/* Measure Beat Actions & Lyric Input Field */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onInsertBeat(selectedBeat.id)}
            className="flex items-center gap-1 px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 rounded-lg text-xs font-semibold transition"
            title="Insert a new note event into this measure"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Beat</span>
          </button>

          {onInsertRest && (
            <button
              onClick={() => onInsertRest(selectedBeat.id)}
              className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-semibold transition"
              title="Insert a new rest event into this measure"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Rest</span>
            </button>
          )}

          {onToggleRest && (
            <button
              onClick={() => onToggleRest(selectedBeat.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedBeat.isRest
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title="Toggle rest symbol for this beat (Press R)"
            >
              <span>𝄽 {selectedBeat.isRest ? 'Rest Active' : 'Toggle Rest'}</span>
            </button>
          )}

          {onToggleTriplet && (
            <button
              onClick={() => onToggleTriplet(selectedBeat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedBeat.isTriplet
                  ? 'bg-indigo-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 text-indigo-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title="Toggle triplet (3:2 duration ratio) for this beat (Press T)"
            >
              <span className="font-mono font-bold border border-current rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px]">3</span>
              <span>{selectedBeat.isTriplet ? 'Triplet (3:2) Active' : 'Triplet (3:2)'}</span>
            </button>
          )}

          {onToggleTie && (
            <button
              onClick={() => onToggleTie(selectedBeat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedBeat.isTied
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title="Tie beat into the next beat (sustains duration without re-strumming) (Press L)"
            >
              <span className="font-bold text-sm leading-none">⁀</span>
              <span>{selectedBeat.isTied ? 'Tie Active' : 'Tie (Sustain)'}</span>
            </button>
          )}

          <button
            onClick={() => onDeleteBeatColumn(selectedBeat.id)}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-semibold transition"
            title="Remove this beat column from measure (Deleting last beat deletes measure)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Beat</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs text-slate-400 font-medium">Lyric:</span>
            <input
              type="text"
              value={selectedBeat.lyric || ''}
              onChange={(e) => onUpdateBeatLyric(selectedBeat.id, e.target.value)}
              placeholder="Add lyric..."
              className="bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-1 text-xs text-slate-100 outline-none w-32 transition font-medium"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selected String & Fret Selection Pad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              {selectedString ? `String ${selectedString} (${stringName})` : 'Select String (1..4)'}:
            </span>
            {selectedString && activeNote && (
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Fret {activeNote.fret} ({pitchName})
              </span>
            )}
          </div>

          {selectedString ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {fretButtonList.map(f => {
                  const isActive = activeNote?.fret === f;
                  return (
                    <button
                      key={f}
                      onClick={() => onSetFret(selectedBeat.id, selectedString, f)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition shadow-sm ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}

                {activeNote && (
                  <button
                    onClick={() => onDeleteNote(selectedBeat.id, selectedString)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Note</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Click a string (1..4) on the tab staff to select frets 0–{maxFretLimit}.</p>
          )}
        </div>

        {/* Alternate Fret Suggestions (Up to Max Fret Limit) */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Alternate Frets (Max Fret {maxFretLimit}):</span>
          </div>

          {ghostNotes.length > 0 ? (
            <div className="space-y-2">
              {ghostNotes.map(g => (
                <div
                  key={g.id}
                  onClick={() => onSetFret(selectedBeat.id, g.string, g.fret)}
                  className="flex items-center justify-between p-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-purple-500/30 cursor-pointer transition text-xs"
                >
                  <span className="font-mono text-slate-300">
                    String {g.string} ({tuning.stringsDisplay[g.string - 1]}) &bull; <strong className="text-purple-300">Fret ({g.fret})</strong>
                  </span>
                  <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Same Pitch
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No alternate fret shapes under Fret {maxFretLimit} available for this note.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
