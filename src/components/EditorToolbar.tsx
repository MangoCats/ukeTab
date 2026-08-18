import React, { useRef } from 'react';
import { UkuleleTabDocument, DurationType, TuningPresetKey } from '../types/ukulele';
import { TUNING_PRESETS } from '../utils/musicTheory';
import { parseGuitarProToUkuleleTab } from '../utils/guitarProImporter';
import {
  Play,
  Pause,
  Plus,
  Download,
  Upload,
  FileText,
  Volume2,
  VolumeX,
  Gauge,
  ZoomIn,
  ArrowUpDown,
  Sparkles,
  PlusCircle,
  Music2,
  FilePlus
} from 'lucide-react';

interface EditorToolbarProps {
  document: UkuleleTabDocument;
  isPlaying: boolean;
  activeDuration: DurationType;
  enableMetronome: boolean;
  playbackSpeed: number;
  onUpdateDocument: React.Dispatch<React.SetStateAction<UkuleleTabDocument>>;
  onTogglePlayback: () => void;
  onToggleMetronome: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectDuration: (duration: DurationType) => void;
  onAddMeasure: () => void;
  onInsertBeat?: () => void;
  onInsertRest?: () => void;
  onToggleTriplet?: () => void;
  onToggleTie?: () => void;
  onTranspose: (semitones: number) => void;
  onNewSong?: () => void;
  onExportJson: () => void;
  onImportJson: (doc: UkuleleTabDocument) => void;
  onExportPdf: () => void;
  onOpenChordPaletteModal?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  document,
  isPlaying,
  enableMetronome,
  playbackSpeed,
  onUpdateDocument,
  onTogglePlayback,
  onToggleMetronome,
  onChangeSpeed,
  onAddMeasure,
  onInsertBeat,
  onInsertRest,
  onToggleTriplet,
  onToggleTie,
  onTranspose,
  onNewSong,
  onExportJson,
  onImportJson,
  onExportPdf,
  onOpenChordPaletteModal
}) => {
  const { tuning, layout, tempo } = document;
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const gpFileInputRef = useRef<HTMLInputElement>(null);

  const handleTuningChange = (key: TuningPresetKey) => {
    onUpdateDocument(prev => ({
      ...prev,
      tuning: TUNING_PRESETS[key]
    }));
  };

  const handleStemsToggle = () => {
    onUpdateDocument(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        stemsPlacement: prev.layout.stemsPlacement === 'below' ? 'above' : 'below'
      }
    }));
  };

  const handleZoomChange = (zoom: number) => {
    onUpdateDocument(prev => ({
      ...prev,
      layout: { ...prev.layout, zoomScale: zoom }
    }));
  };

  const handleMaxFretLimitChange = (maxFret: number) => {
    onUpdateDocument(prev => ({
      ...prev,
      layout: { ...prev.layout, maxFretLimit: maxFret }
    }));
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as UkuleleTabDocument;
        if (parsed && parsed.title && Array.isArray(parsed.measures)) {
          onImportJson(parsed);
        } else {
          alert('Invalid .uketab file format.');
        }
      } catch (err) {
        alert('Could not parse .uketab JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsedDoc = parseGuitarProToUkuleleTab(buffer, file.name);
        onImportJson(parsedDoc);
      } catch (err: any) {
        alert(`Could not parse Guitar Pro file: ${err?.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="no-print EditorToolbar bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Hidden File Inputs for .uketab and .gp imports */}
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={handleJsonFileChange}
        accept=".uketab,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={gpFileInputRef}
        onChange={handleGpFileChange}
        accept=".gp,.gp3,.gp4,.gp5,.gpx"
        className="hidden"
      />

      {/* Upper Control Bar: Title Input & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={document.title}
            onChange={(e) => onUpdateDocument(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg font-bold font-outfit bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-slate-100 outline-none transition"
            placeholder="Tab Title"
          />
          <input
            type="text"
            value={document.artist}
            onChange={(e) => onUpdateDocument(prev => ({ ...prev, artist: e.target.value }))}
            className="text-xs text-slate-400 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-2.5 py-1.5 outline-none transition hidden md:block"
            placeholder="Artist / Arranger"
          />
        </div>

        {/* Primary Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlayback}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Tab'}</span>
          </button>

          <button
            onClick={onToggleMetronome}
            className={`p-2 rounded-xl border text-xs font-semibold transition ${
              enableMetronome
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Metronome"
          >
            {enableMetronome ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Manage Chord Palette & Create Chords Modal Button */}
          {onOpenChordPaletteModal && (
            <button
              onClick={onOpenChordPaletteModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold transition shadow-sm"
              title="Manage relevant chord palette for this song or define new chord fingerings"
            >
              <Music2 className="w-4 h-4" />
              <span>Chord Palette & Editor</span>
            </button>
          )}

          {/* New Blank Song Button */}
          {onNewSong && (
            <button
              onClick={onNewSong}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              title="Start a new blank Ukulele tab chart"
            >
              <FilePlus className="w-4 h-4 text-emerald-400" />
              <span>New Tab</span>
            </button>
          )}

          {/* Open / Import .uketab Document */}
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            title="Open a saved .uketab JSON file from your computer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Open .uketab</span>
          </button>

          {/* Open / Import Guitar Pro (.gp, .gp3-5, .gpx) File */}
          <button
            onClick={() => gpFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            title="Import a Guitar Pro (.gp/.gp3/.gp4/.gp5/.gpx) file to auto-generate a clean Ukulele tab chart"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Open Guitar Pro</span>
          </button>

          {/* Save .uketab Document */}
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            title="Save document as .uketab JSON file"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Save .uketab</span>
          </button>

          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            title="Export Clean Print PDF Sheet Music"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Export PDF</span>
          </button>

          {/* Insert Beat in Measure Button */}
          {onInsertBeat && (
            <button
              onClick={onInsertBeat}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-semibold transition"
              title="Insert a new note event / beat column into the current measure"
            >
              <PlusCircle className="w-4 h-4 text-sky-400" />
              <span>+ Beat</span>
            </button>
          )}

          {/* Add New Measure Button */}
          <button
            onClick={onAddMeasure}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Measure</span>
          </button>
        </div>
      </div>

      {/* Secondary Settings Row: Tuning, Stems, Zoom, Metronome, Transposition, Max Fret Limit */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tuning Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Tuning:</span>
            <select
              value={tuning.key}
              onChange={(e) => handleTuningChange(e.target.value as TuningPresetKey)}
              className="bg-slate-950 border border-slate-800 text-amber-400 font-semibold rounded-lg px-2.5 py-1 focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="gCEA">Standard High-G (gCEA)</option>
              <option value="GCEA">Linear Low-G (GCEA)</option>
              <option value="DGBE">Baritone (DGBE)</option>
              <option value="aDF#B">Soprano D (aDF#B)</option>
            </select>
          </div>

          {/* Rhythm Stems Placement Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Stems:</span>
            <button
              onClick={handleStemsToggle}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-semibold transition"
            >
              {layout.stemsPlacement === 'below' ? 'Below Staff (Default)' : 'Above Staff'}
            </button>
          </div>

          {/* Zoom Preset Selector */}
          <div className="flex items-center gap-2">
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Zoom:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[
                { label: '75%', val: 0.75 },
                { label: '100%', val: 1.0 },
                { label: '150%', val: 1.5 }
              ].map(z => (
                <button
                  key={z.val}
                  onClick={() => handleZoomChange(z.val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    layout.zoomScale === z.val
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Fret Limit Selector (Default 12) */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Max Fret Limit:</span>
            <select
              value={layout.maxFretLimit ?? 12}
              onChange={(e) => handleMaxFretLimitChange(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-800 text-purple-400 font-bold rounded-lg px-2 py-1 focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value={7}>Fret 7</option>
              <option value={10}>Fret 10</option>
              <option value={12}>Fret 12 (Default)</option>
              <option value={15}>Fret 15</option>
              <option value={20}>Fret 20</option>
            </select>
          </div>
        </div>

        {/* Right side controls: Transposition & Tempo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Transpose:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => onTranspose(-1)}
                className="px-2 py-0.5 rounded text-amber-400 hover:bg-slate-800 font-bold transition"
                title="Transpose down 1 semitone"
              >
                -1
              </button>
              <button
                onClick={() => onTranspose(1)}
                className="px-2 py-0.5 rounded text-amber-400 hover:bg-slate-800 font-bold transition"
                title="Transpose up 1 semitone"
              >
                +1
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Tempo:</span>
            <input
              type="number"
              min={40}
              max={240}
              value={tempo}
              onChange={(e) => onUpdateDocument(prev => ({ ...prev, tempo: parseInt(e.target.value, 10) || 120 }))}
              className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-400 outline-none"
            />
            <span className="text-[10px] text-slate-500 font-semibold">BPM</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-200 font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x (Normal)</option>
              <option value={1.25}>1.25x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
