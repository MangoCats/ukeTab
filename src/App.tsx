import React, { useState, useEffect, useRef } from 'react';
import { UkuleleTabDocument, DurationType, UkuleleNote, Measure, BeatColumn, ChordMarker } from './types/ukulele';
import { SAMPLE_TAB_DOCUMENT, createBlankTabDocument } from './utils/sampleData';
import { transposePitches, getBeatDurationMs, DEFAULT_COMPOSITION_CHORD_NAMES, getChordPreset, createChordMarker, autoDetectChordFromBeatNotes } from './utils/musicTheory';
import { playBeatChord, playMetronomeClick } from './utils/audioSynth';
import { TabRenderer } from './components/TabRenderer';
import { EditorToolbar } from './components/EditorToolbar';
import { InspectorPanel } from './components/InspectorPanel';
import { ChordPaletteModal } from './components/ChordPaletteModal';
import { DuplicateMeasuresModal } from './components/DuplicateMeasuresModal';
import { Sparkles, Keyboard, Music2 } from 'lucide-react';

export const App: React.FC = () => {
  const [document, setDocument] = useState<UkuleleTabDocument>(() => {
    const doc = { ...SAMPLE_TAB_DOCUMENT };
    if (!doc.chordPalette || doc.chordPalette.length === 0) {
      doc.chordPalette = DEFAULT_COMPOSITION_CHORD_NAMES.map(name => getChordPreset(name) || createChordMarker(name));
    }
    return doc;
  });

  const [selectedBeatId, setSelectedBeatId] = useState<string | null>('b1-1');
  const [selectedString, setSelectedString] = useState<1 | 2 | 3 | 4>(1);
  const [activeDuration, setActiveDuration] = useState<DurationType>('1/4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const [enableMetronome, setEnableMetronome] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showChordPaletteModal, setShowChordPaletteModal] = useState<boolean>(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);

  const playbackTimeoutRef = useRef<number | null>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const lastDigitRef = useRef<string>('');

  // Precise Audio Scheduling Engine with Dynamic Duration & Triplet Support
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      setPlayingBeatId(null);
      return;
    }

    const allBeats = document.measures.flatMap(m => m.beats.map(b => ({ ...b, measureIndex: m.index })));
    if (!allBeats.length) {
      setIsPlaying(false);
      return;
    }

    let currentIndex = 0;

    const playNextBeat = () => {
      if (currentIndex >= allBeats.length) {
        setIsPlaying(false);
        setPlayingBeatId(null);
        return;
      }

      const beatInfo = allBeats[currentIndex];
      setPlayingBeatId(beatInfo.id);

      const isFirstBeatInMeasure = (currentIndex === 0) || (allBeats[currentIndex - 1].measureIndex !== beatInfo.measureIndex);

      if (!beatInfo.isRest && !beatInfo.isTied) {
        playBeatChord(beatInfo, document.tuning, false, isFirstBeatInMeasure);
      }
      if (enableMetronome && isFirstBeatInMeasure) {
        playMetronomeClick(true);
      } else if (enableMetronome) {
        playMetronomeClick(false);
      }

      const durationMs = getBeatDurationMs(beatInfo, document.tempo, playbackSpeed);
      currentIndex++;
      playbackTimeoutRef.current = window.setTimeout(playNextBeat, durationMs);
    };

    playNextBeat();

    return () => {
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    };
  }, [isPlaying, document, enableMetronome, playbackSpeed]);

  // Global Keyboard Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const allBeats = document.measures.flatMap(m => m.beats);
      const currentBeatIdx = allBeats.findIndex(b => b.id === selectedBeatId);

      // Spacebar: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
        return;
      }

      // Duration Shortcuts: w (1/1), h (1/2), q (1/4), e (1/8), s (1/16)
      const durationKeyMap: Record<string, DurationType> = {
        'w': '1/1',
        'h': '1/2',
        'q': '1/4',
        'e': '1/8',
        's': '1/16'
      };

      const keyLower = e.key.toLowerCase();
      if (durationKeyMap[keyLower] && selectedBeatId) {
        e.preventDefault();
        const targetDur = durationKeyMap[keyLower];
        setActiveDuration(targetDur);
        handleUpdateBeatDuration(selectedBeatId, targetDur);
        return;
      }

      // Toggle Rest: Key 'r'
      if (keyLower === 'r' && selectedBeatId) {
        e.preventDefault();
        handleToggleRest(selectedBeatId);
        return;
      }

      // Toggle Triplet: Key 't'
      if (keyLower === 't' && selectedBeatId) {
        e.preventDefault();
        handleToggleTriplet(selectedBeatId);
        return;
      }

      // Toggle Tie / Sustain: Key 'l'
      if (keyLower === 'l' && selectedBeatId) {
        e.preventDefault();
        handleToggleTie(selectedBeatId);
        return;
      }

      // Dot shortcut (.)
      if (e.key === '.' && selectedBeatId) {
        e.preventDefault();
        for (const m of document.measures) {
          const b = m.beats.find(beat => beat.id === selectedBeatId);
          if (b) {
            handleUpdateBeatDuration(selectedBeatId, b.duration, !b.isDotted);
            break;
          }
        }
        return;
      }

      // Shift + Enter or Insert Beat (+): Insert new beat event column into measure
      if ((e.key === '+' || (e.shiftKey && e.key === 'Enter')) && selectedBeatId) {
        e.preventDefault();
        handleInsertBeat(selectedBeatId);
        return;
      }

      // Arrow Navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentBeatIdx !== -1 && currentBeatIdx < allBeats.length - 1) {
          setSelectedBeatId(allBeats[currentBeatIdx + 1].id);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentBeatIdx > 0) {
          setSelectedBeatId(allBeats[currentBeatIdx - 1].id);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedString(prev => (prev > 1 ? (prev - 1) as 1 | 2 | 3 | 4 : 1));
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedString(prev => (prev < 4 ? (prev + 1) as 1 | 2 | 3 | 4 : 4));
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (selectedBeatId) {
          handleRemoveNote(selectedBeatId, selectedString);
        }
        return;
      }

      if (/^[0-9]$/.test(e.key) && selectedBeatId) {
        e.preventDefault();
        const now = Date.now();
        let targetFret = parseInt(e.key, 10);

        if (now - lastKeyTimeRef.current < 600 && lastDigitRef.current !== '') {
          const combined = parseInt(lastDigitRef.current + e.key, 10);
          if (combined <= 20) {
            targetFret = combined;
          }
          lastDigitRef.current = '';
        } else {
          lastDigitRef.current = e.key;
        }

        lastKeyTimeRef.current = now;
        handleAddNote(selectedBeatId, selectedString, targetFret);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBeatId, selectedString, document]);

  const handleSelectBeat = (measureIndex: number, beatId: string, stringIndex?: 1 | 2 | 3 | 4) => {
    setSelectedBeatId(beatId);
    if (stringIndex) {
      setSelectedString(stringIndex);
    }

    // Auto-assign matching chord ONLY if beat.chord is undefined (never set and not explicitly cleared with null)
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          if (b.chord === undefined) {
            const autoChord = autoDetectChordFromBeatNotes(b.notes, prev.chordPalette);
            if (autoChord) {
              return { ...b, chord: autoChord };
            }
          }
          return b;
        })
      }))
    }));
  };

  const handleAddNote = (beatId: string, stringIndex: 1 | 2 | 3 | 4, fret: number) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          const existingFiltered = b.notes.filter(n => n.string !== stringIndex && !n.isGhost);
          const newNote: UkuleleNote = {
            id: `n-${Date.now()}-${stringIndex}`,
            string: stringIndex,
            fret: fret
          };
          const updatedNotes = [...existingFiltered, newNote];

          let updatedChord = b.chord;
          if (b.chord === undefined) {
            const autoChord = autoDetectChordFromBeatNotes(updatedNotes, prev.chordPalette);
            if (autoChord) updatedChord = autoChord;
          } else if (b.chord && typeof b.chord === 'object') {
            const autoChord = autoDetectChordFromBeatNotes(updatedNotes, prev.chordPalette);
            if (autoChord) updatedChord = autoChord;
          }

          return {
            ...b,
            isRest: false,
            duration: activeDuration,
            notes: updatedNotes,
            chord: updatedChord
          };
        })
      }))
    }));
  };

  const handleSetFret = (beatId: string, stringIndex: 1 | 2 | 3 | 4, fret: number) => {
    handleAddNote(beatId, stringIndex, fret);
  };

  const handleRemoveNote = (beatId: string, stringIndex: 1 | 2 | 3 | 4) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          const updatedNotes = b.notes.filter(n => n.string !== stringIndex);
          const autoChord = autoDetectChordFromBeatNotes(updatedNotes, prev.chordPalette);

          return {
            ...b,
            notes: updatedNotes,
            chord: autoChord || (updatedNotes.length < 4 ? undefined : b.chord)
          };
        })
      }))
    }));
  };

  const handleInsertBeat = (afterBeatId: string) => {
    const newId = `b-${Date.now()}`;
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => {
        const beatIdx = m.beats.findIndex(b => b.id === afterBeatId);
        if (beatIdx === -1) return m;

        const newBeat: BeatColumn = {
          id: newId,
          duration: activeDuration,
          notes: []
        };

        const updatedBeats = [...m.beats];
        updatedBeats.splice(beatIdx + 1, 0, newBeat);
        return { ...m, beats: updatedBeats };
      })
    }));
    setSelectedBeatId(newId);
  };

  const handleInsertRest = (afterBeatId: string) => {
    const newId = `b-${Date.now()}`;
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => {
        const beatIdx = m.beats.findIndex(b => b.id === afterBeatId);
        if (beatIdx === -1) return m;

        const newBeat: BeatColumn = {
          id: newId,
          duration: activeDuration,
          isRest: true,
          notes: []
        };

        const updatedBeats = [...m.beats];
        updatedBeats.splice(beatIdx + 1, 0, newBeat);
        return { ...m, beats: updatedBeats };
      })
    }));
    setSelectedBeatId(newId);
  };

  const handleToggleRest = (beatId: string) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          return {
            ...b,
            isRest: !b.isRest,
            notes: !b.isRest ? [] : b.notes
          };
        })
      }))
    }));
  };

  const handleToggleTriplet = (beatId: string) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          return {
            ...b,
            isTriplet: !b.isTriplet
          };
        })
      }))
    }));
  };

  const handleToggleTie = (beatId: string) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          return {
            ...b,
            isTied: !b.isTied
          };
        })
      }))
    }));
  };

  const handleSetBeatChord = (beatId: string, chord: ChordMarker | null) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          return {
            ...b,
            chord: chord // null explicitly clears the chord
          };
        })
      }))
    }));
  };

  const handleUpdateChordPalette = (newPalette: ChordMarker[]) => {
    setDocument(prev => ({
      ...prev,
      chordPalette: newPalette
    }));
  };

  const handleDeleteBeatColumn = (beatId: string) => {
    setDocument(prev => {
      const targetMeasure = prev.measures.find(m => m.beats.some(b => b.id === beatId));
      if (!targetMeasure) return prev;

      // Deleting the last beat in a measure deletes the measure!
      if (targetMeasure.beats.length <= 1) {
        if (prev.measures.length <= 1) {
          const newMId = `m-${Date.now()}`;
          return {
            ...prev,
            measures: [
              {
                id: newMId,
                index: 1,
                timeSignature: targetMeasure.timeSignature || [4, 4],
                beats: [
                  {
                    id: `b-${newMId}-1`,
                    duration: '1/4',
                    notes: []
                  }
                ]
              }
            ]
          };
        }

        const remainingMeasures = prev.measures
          .filter(m => m.id !== targetMeasure.id)
          .map((m, idx) => ({ ...m, index: idx + 1 }));

        return { ...prev, measures: remainingMeasures };
      }

      const updatedMeasures = prev.measures.map(m => {
        if (m.id !== targetMeasure.id) return m;
        return {
          ...m,
          beats: m.beats.filter(b => b.id !== beatId)
        };
      });

      return { ...prev, measures: updatedMeasures };
    });
    setSelectedBeatId(null);
  };

  const handleUpdateBeatDuration = (beatId: string, duration: DurationType, isDotted?: boolean) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          return {
            ...b,
            duration,
            isDotted: isDotted !== undefined ? isDotted : b.isDotted
          };
        })
      }))
    }));
  };

  const handleUpdateBeatLyric = (beatId: string, lyric: string) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => {
          if (b.id !== beatId) return b;
          return { ...b, lyric };
        })
      }))
    }));
  };

  const handleTranspose = (semitones: number) => {
    setDocument(prev => ({
      ...prev,
      measures: prev.measures.map(m => ({
        ...m,
        beats: m.beats.map(b => ({
          ...b,
          notes: transposePitches(b.notes, semitones, prev.tuning)
        }))
      }))
    }));
  };

  const handleAddMeasure = () => {
    setDocument(prev => {
      const nextIndex = prev.measures.length + 1;
      const mId = `m-${Date.now()}`;
      const newMeasure: Measure = {
        id: mId,
        index: nextIndex,
        timeSignature: [4, 4],
        beats: ([1, 2, 3, 4] as const).map(bNum => ({
          id: `b-${mId}-${bNum}`,
          duration: '1/4',
          notes: []
        }))
      };
      return {
        ...prev,
        measures: [...prev.measures, newMeasure]
      };
    });
  };

  const handleDuplicateMeasureRange = (startIdx: number, endIdx: number) => {
    setDocument(prev => {
      const total = prev.measures.length;
      if (total === 0) return prev;

      const validStart = Math.max(1, Math.min(startIdx, total));
      const validEnd = Math.max(validStart, Math.min(endIdx, total));

      const targetMeasures = prev.measures.slice(validStart - 1, validEnd);

      const duplicatedMeasures: Measure[] = targetMeasures.map((m, mOffset) => {
        const newMeasureId = `m-${Date.now()}-${mOffset}-${Math.random().toString(36).substring(2, 6)}`;
        const newBeats: BeatColumn[] = m.beats.map((b, bOffset) => {
          const newBeatId = `b-${newMeasureId}-${bOffset}`;
          const newNotes: UkuleleNote[] = b.notes.map((n, nOffset) => ({
            ...n,
            id: `n-${Date.now()}-${bOffset}-${nOffset}-${Math.random().toString(36).substring(2, 5)}`
          }));
          return {
            ...b,
            id: newBeatId,
            notes: newNotes,
            chord: b.chord ? { ...b.chord } : b.chord
          };
        });

        return {
          ...m,
          id: newMeasureId,
          beats: newBeats
        };
      });

      const combinedMeasures = [...prev.measures, ...duplicatedMeasures].map((m, idx) => ({
        ...m,
        index: idx + 1
      }));

      return {
        ...prev,
        measures: combinedMeasures
      };
    });
  };

  const handleNewSong = () => {
    if (window.confirm('Create a new blank ukulele tab chart? Unsaved changes will be replaced.')) {
      const blankDoc = createBlankTabDocument();
      if (!blankDoc.chordPalette || blankDoc.chordPalette.length === 0) {
        blankDoc.chordPalette = DEFAULT_COMPOSITION_CHORD_NAMES.map(name => getChordPreset(name) || createChordMarker(name));
      }
      setDocument(blankDoc);
      setSelectedBeatId(blankDoc.measures[0]?.beats[0]?.id || null);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(document, null, 2));
    const downloadAnchor = window.document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${document.title.toLowerCase().replace(/\s+/g, '_')}.uketab`);
    window.document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (importedDoc: UkuleleTabDocument) => {
    if (!importedDoc.chordPalette || importedDoc.chordPalette.length === 0) {
      importedDoc.chordPalette = DEFAULT_COMPOSITION_CHORD_NAMES.map(name => getChordPreset(name) || createChordMarker(name));
    }
    setDocument(importedDoc);
    const firstBeat = importedDoc.measures[0]?.beats[0]?.id || null;
    setSelectedBeatId(firstBeat);
  };

  const handleExportPdf = () => {
    window.print();
  };

  // Calculate initial 4-string frets for selected beat if all 4 strings are defined
  let selectedBeatInitialFrets: [number, number, number, number] | null = null;
  if (selectedBeatId) {
    for (const m of document.measures) {
      const b = m.beats.find(beat => beat.id === selectedBeatId);
      if (b) {
        const activeNotes = b.notes.filter(n => !n.isGhost);
        const s1 = activeNotes.find(n => n.string === 1);
        const s2 = activeNotes.find(n => n.string === 2);
        const s3 = activeNotes.find(n => n.string === 3);
        const s4 = activeNotes.find(n => n.string === 4);
        if (s1 && s2 && s3 && s4) {
          selectedBeatInitialFrets = [s4.fret, s3.fret, s2.fret, s1.fret];
        }
        break;
      }
    }
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between p-4 md:p-8 max-w-7xl mx-auto pb-44">
      {/* Chord Palette & Custom Chord Creator Modal */}
      <ChordPaletteModal
        isOpen={showChordPaletteModal}
        onClose={() => setShowChordPaletteModal(false)}
        activePalette={document.chordPalette || []}
        onUpdatePalette={handleUpdateChordPalette}
        initialFrets={selectedBeatInitialFrets}
      />

      {/* Duplicate Measure Range Modal */}
      <DuplicateMeasuresModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        totalMeasures={document.measures.length}
        onDuplicate={handleDuplicateMeasureRange}
      />

      {/* Top Banner & App Header (Hidden in Print) */}
      <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold text-xl">
            🪕
          </div>
          <div>
            <h1 className="text-2xl font-bold font-outfit tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 bg-clip-text text-transparent">
              UkeTab Studio
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Interactive 4-Line Ukulele Tab Chart Creator & Synthesizer
            </p>
          </div>
        </div>

        {/* Feature Badges & Shortcuts Help Button */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <button
            onClick={() => setShowChordPaletteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl transition shadow-md"
          >
            <Music2 className="w-4 h-4" />
            <span>Manage Chord Palette</span>
          </button>
          <button
            onClick={() => setShowHelpModal(!showHelpModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl transition shadow-md"
          >
            <Keyboard className="w-4 h-4" />
            <span>Shortcuts & Guide</span>
          </button>
        </div>
      </header>

      {/* Editing Shortcuts Quick Guide Banner / Modal (Hidden in Print) */}
      {showHelpModal && (
        <div className="no-print bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 mb-6 shadow-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold font-outfit text-amber-400 flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Interactive Editing Instructions & Keyboard Shortcuts
            </h3>
            <button
              onClick={() => setShowHelpModal(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-amber-400">1. Fret Notes & Chords:</span>
              <p className="text-slate-300">Click string on staff, type <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">0-9</code> or assign a Ukulele Chord (G, C, F, Dm, E7, E7m).</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-sky-400">2. Note Value (Rhythm):</span>
              <p className="text-slate-300">Press <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300 font-mono">w, h, q, e, s</code> for Whole, Half, 1/4, 1/8, 1/16 rhythm values.</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-indigo-400">3. Rests, Triplets & Ties:</span>
              <p className="text-slate-300">Press <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300 font-mono">R</code> for Rest, <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">T</code> for Triplet, <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">L</code> for Tie (Sustain).</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-rose-400">4. Delete & Playback:</span>
              <p className="text-slate-300">Press <code className="bg-slate-800 px-1 py-0.5 rounded text-rose-300 font-mono">Backspace</code> to delete. Press <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300 font-mono">Spacebar</code> to Play/Pause.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="space-y-6 flex-1">
        {/* Web Editor Toolbar (Hidden in Print) */}
        <div className="no-print">
          <EditorToolbar
            document={document}
            isPlaying={isPlaying}
            activeDuration={activeDuration}
            enableMetronome={enableMetronome}
            playbackSpeed={playbackSpeed}
            onUpdateDocument={setDocument}
            onTogglePlayback={() => setIsPlaying(!isPlaying)}
            onToggleMetronome={() => setEnableMetronome(!enableMetronome)}
            onChangeSpeed={setPlaybackSpeed}
            onSelectDuration={setActiveDuration}
            onAddMeasure={handleAddMeasure}
            onOpenDuplicateModal={() => setShowDuplicateModal(true)}
            onInsertBeat={selectedBeatId ? () => handleInsertBeat(selectedBeatId) : undefined}
            onInsertRest={selectedBeatId ? () => handleInsertRest(selectedBeatId) : undefined}
            onToggleTriplet={selectedBeatId ? () => handleToggleTriplet(selectedBeatId) : undefined}
            onToggleTie={selectedBeatId ? () => handleToggleTie(selectedBeatId) : undefined}
            onTranspose={handleTranspose}
            onNewSong={handleNewSong}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onExportPdf={handleExportPdf}
            onOpenChordPaletteModal={() => setShowChordPaletteModal(true)}
          />
        </div>

        {/* Dedicated Printable Title Header (Visible ONLY in Print / PDF Mode) */}
        <div className="print-title-header">
          <h1>{document.title || 'Untitled Ukulele Tab'}</h1>
          {document.artist && <p className="artist">{document.artist}</p>}
          <p className="meta">
            Tuning: {document.tuning.name} ({document.tuning.stringsDisplay.join('-')}) &bull; Tempo: {document.tempo} BPM
          </p>
        </div>

        {/* Tab Notation Canvas (Visible in Web and Print) */}
        <TabRenderer
          document={document}
          selectedBeatId={selectedBeatId}
          selectedString={selectedString}
          playingBeatId={playingBeatId}
          onSelectBeat={handleSelectBeat}
          onAddNote={handleAddNote}
          onRemoveNote={handleRemoveNote}
          onInsertBeat={handleInsertBeat}
          onInsertRest={handleInsertRest}
          onToggleRest={handleToggleRest}
          onToggleTriplet={handleToggleTriplet}
          onToggleTie={handleToggleTie}
          onDeleteBeatColumn={handleDeleteBeatColumn}
          onUpdateBeatDuration={handleUpdateBeatDuration}
          onUpdateBeatLyric={handleUpdateBeatLyric}
          onSetBeatChord={handleSetBeatChord}
          onDeselectBeat={() => setSelectedBeatId(null)}
        />

        {/* Fixed Viewport Bottom Edit Dock (Hidden in Print) */}
        <div className="no-print fixed bottom-0 left-0 right-0 z-50 p-3 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <InspectorPanel
              document={document}
              selectedBeatId={selectedBeatId}
              selectedString={selectedString}
              onUpdateBeatLyric={handleUpdateBeatLyric}
              onSetFret={handleSetFret}
              onDeleteNote={handleRemoveNote}
              onInsertBeat={handleInsertBeat}
              onInsertRest={handleInsertRest}
              onToggleRest={handleToggleRest}
              onToggleTriplet={handleToggleTriplet}
              onToggleTie={handleToggleTie}
              onDeleteBeatColumn={handleDeleteBeatColumn}
              onSetBeatChord={handleSetBeatChord}
              onOpenChordPaletteModal={() => setShowChordPaletteModal(true)}
              onDeselectBeat={() => setSelectedBeatId(null)}
            />
          </div>
        </div>
      </main>

      {/* Footer (Hidden in Print) */}
      <footer className="no-print mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="font-semibold text-slate-400">UkeTab Engine v1.0.0</span> &bull; Ukulele Tab Creator with Traditional Rhythm Notation
        </div>
        <div className="flex items-center gap-4 font-medium text-slate-400">
          <a href="/docs/PROJECT_SPECIFICATION.md" className="hover:text-amber-400 transition">Project Spec</a>
          <a href="/docs/SOFTWARE_ARCHITECTURE.md" className="hover:text-amber-400 transition">Architecture</a>
        </div>
      </footer>
    </div>
  );
};
