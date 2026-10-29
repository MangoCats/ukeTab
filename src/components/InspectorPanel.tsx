import React, { useState } from 'react';
import { TabDocument, TabNote, ChordMarker, Measure } from '../types/tab';
import { calculatePitch, midiToNoteName, getAlternateFretSuggestions, createChordMarker, getEffectiveChordPalette, getStringNumbers, getSoundingTuning } from '../utils/musicTheory';
import { getDocumentProfile } from '../instruments';
import { Music, Hash, Trash2, AlignLeft, Sparkles, PlusCircle, Settings2, ChevronDown, ChevronUp, X } from 'lucide-react';

interface InspectorPanelProps {
  document: TabDocument;
  selectedBeatId: string | null;
  selectedString: number | null;
  onUpdateBeatLyric: (beatId: string, lyric: string) => void;
  onSetFret: (beatId: string, stringIndex: number, fret: number) => void;
  onDeleteNote: (beatId: string, stringIndex: number) => void;
  onInsertBeat: (afterBeatId: string) => void;
  onInsertRest?: (afterBeatId: string) => void;
  onToggleRest?: (beatId: string) => void;
  onToggleTriplet?: (beatId: string) => void;
  onToggleTie?: (beatId: string) => void;
  onDeleteBeatColumn: (beatId: string) => void;
  onSetBeatChord?: (beatId: string, chord: ChordMarker | null) => void;
  onSetMeasureTimeSignature?: (measureId: string, timeSignature: [number, number]) => void;
  onOpenChordPaletteModal?: () => void;
  onDeselectBeat?: () => void;
}

const TIME_SIGNATURE_NUMERATORS = Array.from({ length: 12 }, (_, i) => i + 1);
const TIME_SIGNATURE_DENOMINATORS = [2, 4, 8, 16];

// Selector options, plus the stored value when it is outside the list so the select still shows it
const withCurrentValue = (options: number[], current: number) =>
  options.includes(current) ? options : [...options, current].sort((a, b) => a - b);

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
  onDeleteBeatColumn,
  onSetBeatChord,
  onSetMeasureTimeSignature,
  onOpenChordPaletteModal,
  onDeselectBeat
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const { tuning, measures, layout, chordPalette } = document;
  const profile = getDocumentProfile(document);
  const stringCount = tuning.pitches.length;
  const maxFretLimit = layout.maxFretLimit ?? profile.defaultMaxFretLimit;
  const fretButtonList = [-1, ...Array.from({ length: maxFretLimit + 1 }, (_, i) => i)];

  if (!selectedBeatId) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 InspectorPanel">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Music className="w-4 h-4 text-amber-400" />
          <span>Click any beat or string on the staff to inspect and edit fret notes, lyrics, or chord diagrams.</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700"
          title={isCollapsed ? "Expand Inspector" : "Minimize Inspector"}
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  let selectedBeat: any = null;
  let selectedMeasure: Measure | null = null;
  let activeMeasureIndex = 1;

  for (const m of measures) {
    const b = m.beats.find(beat => beat.id === selectedBeatId);
    if (b) {
      selectedBeat = b;
      selectedMeasure = m;
      activeMeasureIndex = m.index;
      break;
    }
  }

  if (!selectedBeat || !selectedMeasure) return null;

  const [timeSigNumerator, timeSigDenominator] = selectedMeasure.timeSignature;
  const measureId = selectedMeasure.id;

  const currentNotes: TabNote[] = selectedBeat.notes.filter((n: TabNote) => !n.isGhost);
  const activeNote = selectedString ? currentNotes.find(n => n.string === selectedString) : null;
  const ghostNotes = getAlternateFretSuggestions(currentNotes, tuning, maxFretLimit);

  const stringName = selectedString ? tuning.stringsDisplay[selectedString - 1] : null;
  // The pitch heard includes the capo; alternate frets above stay capo-relative and use the plain tuning
  const pitchMidi = selectedString && activeNote ? calculatePitch(selectedString, activeNote.fret, getSoundingTuning(document)) : null;
  const pitchName = pitchMidi && pitchMidi > 0 ? midiToNoteName(pitchMidi) : null;

  // Active composition chords palette
  const activeChordsList = getEffectiveChordPalette(chordPalette, profile);

  const effectiveChord = (selectedBeat.chord && typeof selectedBeat.chord === 'object') ? selectedBeat.chord : undefined;

  const displayChordsList = [...activeChordsList];
  if (effectiveChord && !displayChordsList.some(c => c.name.toLowerCase() === effectiveChord.name.toLowerCase())) {
    displayChordsList.push(effectiveChord);
  }

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-lg space-y-3.5 InspectorPanel">
      {/* Viewport Fixed Header Row: Beat Details, Lyric Input & Expand/Collapse Chevron */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs text-slate-200 font-outfit">
            Inspector &bull; Measure {activeMeasureIndex} &bull; {selectedBeat.duration} {selectedBeat.isRest ? 'Rest Event' : 'Note Event'}
          </span>
        </div>

        {/* Action Controls & Minimize/Expand Button */}
        <div className="flex flex-wrap items-center gap-2.5">
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
            title="Remove this beat column from measure"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Beat</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Synchronized Lyric Editor */}
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

          {/* Time Signature of the selected beat's measure */}
          {onSetMeasureTimeSignature && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Measure {activeMeasureIndex} Time Signature:</span>
              <select
                aria-label="Time signature beats per measure"
                value={timeSigNumerator}
                onChange={(e) => onSetMeasureTimeSignature(measureId, [parseInt(e.target.value, 10), timeSigDenominator])}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded px-1.5 py-0.5 outline-none"
                title="Beats per measure"
              >
                {withCurrentValue(TIME_SIGNATURE_NUMERATORS, timeSigNumerator).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500 font-bold">/</span>
              <select
                aria-label="Time signature beat unit"
                value={timeSigDenominator}
                onChange={(e) => onSetMeasureTimeSignature(measureId, [timeSigNumerator, parseInt(e.target.value, 10)])}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded px-1.5 py-0.5 outline-none"
                title="Beat unit (note value that gets one count)"
              >
                {withCurrentValue(TIME_SIGNATURE_DENOMINATORS, timeSigDenominator).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {onDeselectBeat && (
            <button
              onClick={onDeselectBeat}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition ml-1"
              title="Close beat editor (Deselect beat)"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Close</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700 ml-1"
            title={isCollapsed ? "Expand Inspector Controls" : "Minimize Inspector Controls"}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Editing Sections (Chord Diagrams, Fret Selection Pad, Alternate Frets) */}
      {!isCollapsed && (
        <div className="space-y-3.5 pt-1">
          {/* Chord Diagram Chart Inspector Section */}
          <div className="border-b border-slate-800/80 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-amber-400 uppercase tracking-wide font-outfit">
                  {profile.name} Chord Diagram (Rendered Above Staff)
                </span>
              </div>

              <div className="flex items-center gap-3">
                {onOpenChordPaletteModal && (
                  <button
                    onClick={onOpenChordPaletteModal}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg"
                    title="Manage song chord palette or create custom chord fingerings"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Manage Palette / Create Chord</span>
                  </button>
                )}

                {effectiveChord && (
                  <button
                    onClick={() => onSetBeatChord && onSetBeatChord(selectedBeat.id, null)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Chord</span>
                  </button>
                )}
              </div>
            </div>

            {/* Composition Active Chords Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-xs text-slate-400 font-medium">Composition Chords:</span>
              {displayChordsList.map(chordObj => (
                <button
                  key={chordObj.name}
                  onClick={() => {
                    if (onSetBeatChord) onSetBeatChord(selectedBeat.id, chordObj);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                    effectiveChord?.name.toLowerCase() === chordObj.name.toLowerCase()
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {chordObj.name}
                </button>
              ))}
            </div>

            {/* Custom Chord Editor Inputs */}
            {effectiveChord && (
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Chord Name:</span>
                  <input
                    type="text"
                    value={effectiveChord.name}
                    onChange={(e) => {
                      if (onSetBeatChord) {
                        onSetBeatChord(selectedBeat.id, {
                          ...effectiveChord,
                          name: e.target.value
                        });
                      }
                    }}
                    className="w-20 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1 text-amber-400 font-bold outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-medium">Strings [{getStringNumbers(stringCount).reverse().map(s => `S${s}`).join(', ')}]:</span>
                  {Array.from({ length: stringCount }, (_, strIdx) => strIdx).map(strIdx => {
                    const strNum = stringCount - strIdx;
                    const currentFret = effectiveChord ? effectiveChord.frets[strIdx] : 0;

                    return (
                      <div key={`c-str-${strNum}`} className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-mono">S{strNum}:</span>
                        <select
                          value={currentFret}
                          onChange={(e) => {
                            if (onSetBeatChord) {
                              const newFrets = [...effectiveChord.frets];
                              newFrets[strIdx] = parseInt(e.target.value, 10);
                              onSetBeatChord(selectedBeat.id, createChordMarker(effectiveChord.name, newFrets, undefined, profile));
                            }
                          }}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded px-1.5 py-0.5 outline-none"
                        >
                          <option value={-1}>X (Muted)</option>
                          <option value={0}>0 (Open)</option>
                          {Array.from({ length: 15 }, (_, i) => i + 1).map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-0.5">
            {/* Selected String & Fret Selection Pad */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  {selectedString ? `String ${selectedString} (${stringName})` : `Select String (1..${stringCount})`}:
                </span>
                {selectedString && activeNote && (
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {activeNote.fret === -1 ? 'Muted (X)' : `Fret ${activeNote.fret} (${pitchName})`}
                  </span>
                )}
              </div>

              {selectedString ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {fretButtonList.map(f => {
                      const isActive = activeNote?.fret === f;
                      const isMute = f === -1;
                      return (
                        <button
                          key={f}
                          onClick={() => onSetFret(selectedBeat.id, selectedString, f)}
                          className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition shadow-sm ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                              : isMute
                              ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                          title={isMute ? 'Muted String Note (X)' : `Fret ${f}`}
                        >
                          {isMute ? 'X' : f}
                        </button>
                      );
                    })}

                    {activeNote && (
                      <button
                        onClick={() => onDeleteNote(selectedBeat.id, selectedString)}
                        className="px-3 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Note</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Click a string (1..{stringCount}) on the tab staff to select frets 0–{maxFretLimit}.</p>
              )}
            </div>

            {/* Alternate Fret Suggestions (Up to Max Fret Limit) */}
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Alternate Frets (Max Fret {maxFretLimit}):</span>
              </div>

              {ghostNotes.length > 0 ? (
                <div className="space-y-1.5">
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
      )}
    </div>
  );
};
