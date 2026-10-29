import React, { useState, useEffect, useRef } from 'react';
import { TabDocument, InstrumentId, DurationType, ChordMarker, DURATION_KEY_MAP } from './types/tab';
import { SAMPLE_TAB_DOCUMENT, createBlankTabDocument } from './utils/sampleData';
import { getBeatDurationMs, getEffectiveChordPalette, extractChordFrets } from './utils/musicTheory';
import {
  assignChordOnSelect, addNote, removeNote, insertBeatAfter, toggleRest, toggleTriplet, toggleTie, setBeatChord,
  setChordPalette, deleteBeat, setBeatDuration, setBeatLyric, transposeDocument, addMeasure, duplicateMeasureRange,
  setMeasureTimeSignature
} from './utils/documentEdits';
import { playBeatChord, playMetronomeClick } from './utils/audioSynth';
import { getMeasureClickOffsetsMs, getMeasureDurationMs, getColumnStartOffsetMs } from './utils/playbackTiming';
import { findShortcut, resolveFretDigit } from './utils/shortcuts';
import { getInstrumentProfile } from './instruments';
import { TabRenderer } from './components/TabRenderer';
import { EditorToolbar } from './components/EditorToolbar';
import { InspectorPanel } from './components/InspectorPanel';
import { ChordPaletteModal } from './components/ChordPaletteModal';
import { DuplicateMeasuresModal } from './components/DuplicateMeasuresModal';
import { ShortcutHelp } from './components/ShortcutHelp';
import { Sparkles, Keyboard, Music2 } from 'lucide-react';

export const App: React.FC = () => {
  const [document, setDocument] = useState<TabDocument>(() => ({
    ...SAMPLE_TAB_DOCUMENT,
    chordPalette: getEffectiveChordPalette(SAMPLE_TAB_DOCUMENT.chordPalette)
  }));

  const [selectedBeatId, setSelectedBeatId] = useState<string | null>('b1-1');
  const [selectedString, setSelectedString] = useState<number>(1);
  const [activeDuration, setActiveDuration] = useState<DurationType>('1/4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const [enableMetronome, setEnableMetronome] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showChordPaletteModal, setShowChordPaletteModal] = useState<boolean>(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);

  const playbackTimeoutRef = useRef<number | null>(null);
  const metronomeTimeoutsRef = useRef<number[]>([]);
  const profile = getInstrumentProfile(document.instrument);
  const lastKeyTimeRef = useRef<number>(0);
  const lastDigitRef = useRef<string>('');

  // Precise Audio Scheduling Engine with Dynamic Duration & Triplet Support
  useEffect(() => {
    const clearMetronomeClicks = () => {
      metronomeTimeoutsRef.current.forEach(id => clearTimeout(id));
      metronomeTimeoutsRef.current = [];
    };

    if (!isPlaying) {
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      clearMetronomeClicks();
      setPlayingBeatId(null);
      return;
    }

    const allBeats = document.measures.flatMap(m => m.beats.map((b, beatIndex) => ({ ...b, measureIndex: m.index, measure: m, beatIndex })));
    if (!allBeats.length) {
      setIsPlaying(false);
      return;
    }

    let startIndex = 0;
    if (selectedBeatId) {
      const foundIdx = allBeats.findIndex(b => b.id === selectedBeatId);
      if (foundIdx !== -1) {
        startIndex = foundIdx;
      }
    }

    let currentIndex = startIndex;

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
        playBeatChord(beatInfo, document.tuning, false, isFirstBeatInMeasure, profile.synthVoice);
      }

      // Metronome follows the time signature, not the columns: schedule a measure's beat clicks on entering it
      if (enableMetronome && (isFirstBeatInMeasure || currentIndex === startIndex)) {
        const { measure } = beatInfo;
        const clicks = getMeasureClickOffsetsMs(
          measure.timeSignature,
          getMeasureDurationMs(measure.beats, document.tempo, playbackSpeed),
          document.tempo,
          playbackSpeed,
          getColumnStartOffsetMs(measure.beats, beatInfo.beatIndex, document.tempo, playbackSpeed)
        );
        clicks.forEach(({ offsetMs, accent }) => {
          metronomeTimeoutsRef.current.push(window.setTimeout(() => playMetronomeClick(accent), offsetMs));
        });
      }

      const durationMs = getBeatDurationMs(beatInfo, document.tempo, playbackSpeed);
      currentIndex++;
      playbackTimeoutRef.current = window.setTimeout(playNextBeat, durationMs);
    };

    playNextBeat();

    return () => {
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      clearMetronomeClicks();
    };
  }, [isPlaying, document, enableMetronome, playbackSpeed]);

  // Global Keyboard Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Key bindings live in utils/shortcuts (also rendered by the help panel); actions per id live here
      const shortcut = findShortcut(e);
      if (!shortcut) return;
      if (shortcut.requiresSelection && !selectedBeatId) return; // Leave the key to the browser; selectedBeatId! below relies on this
      e.preventDefault();

      const allBeats = document.measures.flatMap(m => m.beats);
      const currentBeatIdx = allBeats.findIndex(b => b.id === selectedBeatId);

      switch (shortcut.id) {
        case 'playPause':
          setIsPlaying(prev => !prev);
          return;

        case 'setDuration': {
          const targetDur = DURATION_KEY_MAP[e.key.toLowerCase()];
          setActiveDuration(targetDur);
          handleUpdateBeatDuration(selectedBeatId!, targetDur);
          return;
        }

        case 'toggleRest':
          handleToggleRest(selectedBeatId!);
          return;

        case 'toggleTriplet':
          handleToggleTriplet(selectedBeatId!);
          return;

        case 'toggleTie':
          handleToggleTie(selectedBeatId!);
          return;

        case 'toggleDot': {
          const b = allBeats[currentBeatIdx];
          if (b) handleUpdateBeatDuration(b.id, b.duration, !b.isDotted);
          return;
        }

        case 'insertBeat':
          handleInsertBeat(selectedBeatId!);
          return;

        case 'nextBeat':
          if (currentBeatIdx !== -1 && currentBeatIdx < allBeats.length - 1) {
            setSelectedBeatId(allBeats[currentBeatIdx + 1].id);
          }
          return;

        case 'previousBeat':
          if (currentBeatIdx > 0) {
            setSelectedBeatId(allBeats[currentBeatIdx - 1].id);
          }
          return;

        case 'previousString':
          setSelectedString(prev => Math.max(1, prev - 1));
          return;

        case 'nextString':
          setSelectedString(prev => Math.min(document.tuning.pitches.length, prev + 1));
          return;

        case 'removeNote':
          if (selectedBeatId) handleRemoveNote(selectedBeatId, selectedString);
          return;

        case 'mutedNote':
          handleAddNote(selectedBeatId!, selectedString, -1);
          return;

        case 'setFret': {
          const now = Date.now();
          const { fret, pendingDigit } = resolveFretDigit(e.key, lastDigitRef.current, now - lastKeyTimeRef.current);
          lastDigitRef.current = pendingDigit;
          lastKeyTimeRef.current = now;
          handleAddNote(selectedBeatId!, selectedString, fret);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBeatId, selectedString, document]);

  // Document edits are pure functions in utils/documentEdits; these handlers apply them and manage selection
  const profileOf = (doc: TabDocument) => getInstrumentProfile(doc.instrument);

  const handleSelectBeat = (measureIndex: number, beatId: string, stringIndex?: number) => {
    setSelectedBeatId(beatId);
    if (stringIndex) {
      setSelectedString(stringIndex);
    }
    setDocument(prev => assignChordOnSelect(prev, beatId, profileOf(prev)));
  };

  const handleAddNote = (beatId: string, stringIndex: number, fret: number) => {
    setDocument(prev => addNote(prev, beatId, stringIndex, fret, profileOf(prev)));
  };

  const handleSetFret = (beatId: string, stringIndex: number, fret: number) => {
    handleAddNote(beatId, stringIndex, fret);
  };

  const handleRemoveNote = (beatId: string, stringIndex: number) => {
    setDocument(prev => removeNote(prev, beatId, stringIndex, profileOf(prev)));
  };

  const insertAfter = (afterBeatId: string, isRest: boolean) => {
    const result = insertBeatAfter(document, afterBeatId, activeDuration, { isRest });
    setDocument(result.document);
    setSelectedBeatId(result.beatId);
  };

  const handleInsertBeat = (afterBeatId: string) => insertAfter(afterBeatId, false);

  const handleInsertRest = (afterBeatId: string) => insertAfter(afterBeatId, true);

  const handleToggleRest = (beatId: string) => {
    setDocument(prev => toggleRest(prev, beatId));
  };

  const handleToggleTriplet = (beatId: string) => {
    setDocument(prev => toggleTriplet(prev, beatId));
  };

  const handleToggleTie = (beatId: string) => {
    setDocument(prev => toggleTie(prev, beatId));
  };

  const handleSetBeatChord = (beatId: string, chord: ChordMarker | null) => {
    setDocument(prev => setBeatChord(prev, beatId, chord));
  };

  const handleUpdateChordPalette = (newPalette: ChordMarker[]) => {
    setDocument(prev => setChordPalette(prev, newPalette));
  };

  const handleDeleteBeatColumn = (beatId: string) => {
    setDocument(prev => deleteBeat(prev, beatId));
    setSelectedBeatId(null);
  };

  const handleUpdateBeatDuration = (beatId: string, duration: DurationType, isDotted?: boolean) => {
    setDocument(prev => setBeatDuration(prev, beatId, duration, isDotted));
  };

  const handleUpdateBeatLyric = (beatId: string, lyric: string) => {
    setDocument(prev => setBeatLyric(prev, beatId, lyric));
  };

  // Computed from the current document rather than a functional update, because the inexact count is needed here
  const handleTranspose = (semitones: number) => {
    const { document: transposed, inexactCount } = transposeDocument(document, semitones, profile);
    setDocument(transposed);
    if (inexactCount > 0) {
      window.alert(`${inexactCount} note(s) could not be transposed exactly and were kept at the nearest fret.`);
    }
  };

  const handleSetMeasureTimeSignature = (measureId: string, timeSignature: [number, number]) => {
    setDocument(prev => setMeasureTimeSignature(prev, measureId, timeSignature));
  };

  const handleAddMeasure = () => {
    setDocument(prev => addMeasure(prev));
  };

  const handleDuplicateMeasureRange = (startIdx: number, endIdx: number) => {
    setDocument(prev => duplicateMeasureRange(prev, startIdx, endIdx));
  };

  const handleNewSong = (instrumentId: InstrumentId) => {
    const newProfile = getInstrumentProfile(instrumentId);
    if (window.confirm(`Create a new blank ${newProfile.name.toLowerCase()} tab chart? Unsaved changes will be replaced.`)) {
      const blankDoc = createBlankTabDocument(newProfile);
      setDocument(blankDoc);
      setSelectedBeatId(blankDoc.measures[0]?.beats[0]?.id || null);
      setSelectedString(prev => Math.min(prev, blankDoc.tuning.pitches.length));
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

  const handleImportJson = (importedDoc: TabDocument) => {
    const importedProfile = getInstrumentProfile(importedDoc.instrument);
    setDocument({
      ...importedDoc,
      instrument: importedProfile.id,
      chordPalette: getEffectiveChordPalette(importedDoc.chordPalette, importedProfile)
    });
    const firstBeat = importedDoc.measures[0]?.beats[0]?.id || null;
    setSelectedBeatId(firstBeat);
    setSelectedString(prev => Math.min(prev, importedDoc.tuning.pitches.length));
  };

  const handleExportPdf = () => {
    window.print();
  };

  // Calculate initial chord frets for selected beat if every string is defined
  let selectedBeatInitialFrets: number[] | null = null;
  if (selectedBeatId) {
    for (const m of document.measures) {
      const b = m.beats.find(beat => beat.id === selectedBeatId);
      if (b) {
        selectedBeatInitialFrets = extractChordFrets(b.notes, document.tuning.pitches.length);
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
        profile={profile}
        tuning={document.tuning}
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
              Interactive {document.tuning.pitches.length}-Line {profile.name} Tab Chart Creator & Synthesizer
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

      {/* Keyboard Shortcuts Help Panel, generated from utils/shortcuts (Hidden in Print) */}
      {showHelpModal && <ShortcutHelp onClose={() => setShowHelpModal(false)} />}

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

        {/* Dynamic Printable Page Footer Styles (PDF / Print Mode) */}
        <style>{`
          @media print {
            @page {
              @bottom-center {
                content: ${JSON.stringify((document.title || `Untitled ${profile.name} Tab`) + ' ')} counter(page) " of " counter(pages);
                font-size: 9pt;
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #0f172a;
                font-weight: 500;
                vertical-align: middle;
              }
            }
          }
        `}</style>

        {/* Dedicated Printable Title Header (Visible ONLY in Print / PDF Mode) */}
        <div className="print-title-header">
          <h1>{document.title || `Untitled ${profile.name} Tab`}</h1>
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
          onSelectActiveDuration={setActiveDuration}
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
              onSetMeasureTimeSignature={handleSetMeasureTimeSignature}
              onOpenChordPaletteModal={() => setShowChordPaletteModal(true)}
              onDeselectBeat={() => setSelectedBeatId(null)}
            />
          </div>
        </div>
      </main>

      {/* Footer (Hidden in Print) */}
      <footer className="no-print mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="font-semibold text-slate-400">UkeTab Engine v1.0.0</span> &bull; {profile.name} Tab Creator with Traditional Rhythm Notation
        </div>
        <div className="flex items-center gap-4 font-medium text-slate-400">
          <a href="/docs/PROJECT_SPECIFICATION.md" className="hover:text-amber-400 transition">Project Spec</a>
          <a href="/docs/SOFTWARE_ARCHITECTURE.md" className="hover:text-amber-400 transition">Architecture</a>
        </div>
      </footer>
    </div>
  );
};
