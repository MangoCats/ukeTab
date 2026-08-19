import React from 'react';
import { UkuleleTabDocument, UkuleleNote, DurationType, Measure, ChordMarker } from '../types/ukulele';
import { getAlternateFretSuggestions, getChordPreset, createChordMarker, DEFAULT_COMPOSITION_CHORD_NAMES } from '../utils/musicTheory';
import { ChordDiagram } from './ChordDiagram';
import { Trash2, PlusCircle, Music, X } from 'lucide-react';

interface TabRendererProps {
  document: UkuleleTabDocument;
  selectedBeatId: string | null;
  selectedString: (1 | 2 | 3 | 4) | null;
  playingBeatId: string | null;
  onSelectBeat: (measureIndex: number, beatId: string, stringIndex?: 1 | 2 | 3 | 4) => void;
  onAddNote: (beatId: string, stringIndex: 1 | 2 | 3 | 4, fret: number) => void;
  onRemoveNote: (beatId: string, stringIndex: 1 | 2 | 3 | 4) => void;
  onInsertBeat: (afterBeatId: string) => void;
  onInsertRest?: (afterBeatId: string) => void;
  onToggleRest?: (beatId: string) => void;
  onToggleTriplet?: (beatId: string) => void;
  onToggleTie?: (beatId: string) => void;
  onDeleteBeatColumn: (beatId: string) => void;
  onUpdateBeatDuration: (beatId: string, duration: DurationType, isDotted?: boolean) => void;
  onUpdateBeatLyric: (beatId: string, lyric: string) => void;
  onSetBeatChord?: (beatId: string, chord: ChordMarker | null) => void;
  onDeselectBeat?: () => void;
}

export const TabRenderer: React.FC<TabRendererProps> = ({
  document,
  selectedBeatId,
  selectedString,
  playingBeatId,
  onSelectBeat,
  onAddNote,
  onRemoveNote,
  onInsertBeat,
  onInsertRest,
  onToggleRest,
  onToggleTriplet,
  onToggleTie,
  onDeleteBeatColumn,
  onUpdateBeatDuration,
  onUpdateBeatLyric,
  onSetBeatChord,
  onDeselectBeat
}) => {
  const { tuning, layout, measures, chordPalette } = document;
  const zoom = layout.zoomScale;
  const stemsBelow = layout.stemsPlacement === 'below';
  const maxFretLimit = layout.maxFretLimit ?? 12;
  const fretButtonList = Array.from({ length: maxFretLimit + 1 }, (_, i) => i);
  const popoverWidth = Math.max(520, (maxFretLimit + 1) * 24 + 130);

  // Layout metrics (Widen string grid vertically so vertically stacked frets don't overwrite)
  const lineSpacing = 24 * zoom;
  const stringHeaderWidth = 60 * zoom;
  const measurePadding = 15 * zoom;
  const beatWidth = 62 * zoom;

  // Selected beat info for Chord Diagram & Inspector
  let activeChordNotes: UkuleleNote[] = [];
  let currentBeatDuration: DurationType = '1/4';
  let currentBeatDotted: boolean = false;
  let currentBeatChord: ChordMarker | null | undefined = undefined;

  if (selectedBeatId) {
    for (const m of measures) {
      const b = m.beats.find(beat => beat.id === selectedBeatId);
      if (b) {
        activeChordNotes = b.notes.filter(n => !n.isGhost);
        currentBeatDuration = b.duration;
        currentBeatDotted = !!b.isDotted;
        currentBeatChord = b.chord;
        break;
      }
    }
  }

  const durationOptions: { label: string; value: DurationType }[] = [
    { label: '1', value: '1/1' },
    { label: '1/2', value: '1/2' },
    { label: '1/4', value: '1/4' },
    { label: '1/8', value: '1/8' },
    { label: '1/16', value: '1/16' }
  ];

  // Active composition chords palette
  const activeChordsList = chordPalette && chordPalette.length > 0
    ? chordPalette
    : DEFAULT_COMPOSITION_CHORD_NAMES.map(name => getChordPreset(name) || createChordMarker(name));

  const effectiveChord = (currentBeatChord && typeof currentBeatChord === 'object') ? currentBeatChord : undefined;

  // Pre-select dropdown options list: include effective chord if defined in library even if not in composition palette
  const dropdownChordOptions = [...activeChordsList];
  if (effectiveChord && !dropdownChordOptions.some(c => c.name.toLowerCase() === effectiveChord.name.toLowerCase())) {
    dropdownChordOptions.push(effectiveChord);
  }

  // Calculate layout heights
  const hasChordsInDocument = measures.some(m => m.beats.some(b => b.chord && typeof b.chord === 'object'));
  const chordSpace = hasChordsInDocument ? 78 * zoom : 0;
  const topMargin = (stemsBelow ? 42 * zoom : 60 * zoom) + chordSpace;
  const bottomMargin = stemsBelow ? 50 * zoom : 28 * zoom;

  const getStringY = (stringIndex: 1 | 2 | 3 | 4) => {
    return topMargin + (stringIndex - 1) * lineSpacing;
  };

  const renderRestSymbol = (beat: { duration: DurationType; isDotted?: boolean }, beatX: number) => {
    const z = zoom;
    const duration = beat.duration || '1/4';
    const isDotted = !!beat.isDotted;
    const string2Y = getStringY(2);
    const string3Y = getStringY(3);

    // Traditional rest placement:
    // Whole rest ('1/1'): hangs directly below String 2 (Line 2)
    // Half rest ('1/2'): sits directly on top of String 3 (Line 3)
    // Quarter, 8th, 16th rests: centered on String 3 (Line 3)
    const restY = duration === '1/1' ? string2Y : string3Y;

    // Dot Y offset aligned with each rest shape
    const dotY = duration === '1/1' ? 3 * z : duration === '1/2' ? -3 * z : duration === '1/4' ? 0 : -2 * z;

    return (
      <g transform={`translate(${beatX}, ${restY})`} className="rest-symbol text-sky-400">
        {duration === '1/1' && (
          /* Whole Rest: Solid rectangle hanging below String 2 (Line 2) */
          <rect
            x={-6 * z}
            y={0}
            width={12 * z}
            height={6 * z}
            fill="currentColor"
            className="rest-rect"
          />
        )}

        {duration === '1/2' && (
          /* Half Rest: Solid rectangle sitting on top of String 3 (Line 3) */
          <rect
            x={-6 * z}
            y={-6 * z}
            width={12 * z}
            height={6 * z}
            fill="currentColor"
            className="rest-rect"
          />
        )}

        {duration === '1/4' && (
          /* Quarter Rest: Traditional squiggly rest centered on String 3 (Line 3) */
          <path
            d={`M ${-2 * z} ${-14 * z}
               C ${0 * z} ${-17 * z}, ${3.5 * z} ${-15 * z}, ${2 * z} ${-11 * z}
               C ${0.5 * z} ${-8 * z}, ${-3.5 * z} ${-4 * z}, ${3 * z} ${0 * z}
               C ${6 * z} ${3 * z}, ${3 * z} ${8 * z}, ${-1 * z} ${10.5 * z}
               C ${-4 * z} ${12 * z}, ${-4.5 * z} ${14 * z}, ${-2.5 * z} ${15.5 * z}
               C ${-0.5 * z} ${16.5 * z}, ${1.5 * z} ${15 * z}, ${2 * z} ${13.5 * z}
               C ${-0.5 * z} ${16.5 * z}, ${-5.5 * z} ${16 * z}, ${-5 * z} ${12 * z}
               C ${-4.5 * z} ${9 * z}, ${-1.5 * z} ${6.5 * z}, ${-2.5 * z} ${4 * z}
               C ${-3.5 * z} ${1.5 * z}, ${-6 * z} ${-2 * z}, ${-2 * z} ${-6.5 * z}
               C ${0.5 * z} ${-9.5 * z}, ${-2 * z} ${-12 * z}, ${-2 * z} ${-14 * z} Z`}
            fill="currentColor"
          />
        )}

        {duration === '1/8' && (
          /* Eighth Rest: Traditional 7-shaped rest with single hook on String 3 (Line 3) */
          <g>
            <path
              d={`M ${3 * z} ${11 * z} L ${-2 * z} ${-11 * z}`}
              stroke="currentColor"
              strokeWidth={2.2 * z}
              strokeLinecap="round"
            />
            <circle cx={-6 * z} cy={-7.5 * z} r={3 * z} fill="currentColor" />
            <path
              d={`M ${-6 * z} ${-10.5 * z} C ${-1 * z} ${-10.5 * z}, ${-1 * z} ${-3 * z}, ${-2 * z} ${-7.5 * z}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2 * z}
              strokeLinecap="round"
            />
          </g>
        )}

        {duration === '1/16' && (
          /* Sixteenth Rest: Traditional rest with double hooks on String 3 (Line 3) */
          <g>
            <path
              d={`M ${4 * z} ${13 * z} L ${-3 * z} ${-13 * z}`}
              stroke="currentColor"
              strokeWidth={2.2 * z}
              strokeLinecap="round"
            />
            <circle cx={-7 * z} cy={-9.5 * z} r={2.5 * z} fill="currentColor" />
            <path
              d={`M ${-7 * z} ${-12 * z} C ${-2 * z} ${-12 * z}, ${-2 * z} ${-5 * z}, ${-2.5 * z} ${-9.5 * z}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8 * z}
              strokeLinecap="round"
            />
            <circle cx={-7 * z} cy={-1.5 * z} r={2.5 * z} fill="currentColor" />
            <path
              d={`M ${-7 * z} ${-4 * z} C ${-2 * z} ${-4 * z}, ${-2 * z} ${3 * z}, ${-1.5 * z} ${-1.5 * z}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8 * z}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Dotted rest dot indicator */}
        {isDotted && (
          <circle cx={9 * z} cy={dotY} r={2.6 * z} fill="currentColor" className="rest-dot" />
        )}
      </g>
    );
  };

  const string1Y = getStringY(1);
  const string2Y = getStringY(2);
  const string3Y = getStringY(3);
  const string4Y = getStringY(4);
  const staffHeight = string4Y - string1Y;
  const measureSvgHeight = topMargin + staffHeight + bottomMargin;

  return (
    <div className="w-full space-y-4 TabContainer">
      {/* Active Chord Box Preview Header (Hidden in Print) */}
      {activeChordNotes.length > 0 && (
        <div className="no-print flex items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-400">Selected Beat Shape:</div>
            <ChordDiagram notes={activeChordNotes} tuning={tuning} chordName={effectiveChord?.name} />
          </div>
          <div className="text-xs text-slate-400 font-mono hidden md:block">
            Tip: Select any beat to assign a <span className="text-amber-400 font-semibold">Ukulele Chord Diagram</span> rendered above the staff lines.
          </div>
        </div>
      )}

      {/* Main Tablature Canvas: Modular Continuous Measure Blocks with Flexbox Wrapping */}
      <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-2xl relative border-none shadow-none bg-transparent">
        <div className="tab-canvas-wrapper flex flex-wrap items-start">
          {measures.map((measure, mIdx) => {
            const isFirstMeasure = (mIdx === 0);
            const clefWidth = isFirstMeasure ? stringHeaderWidth : 0;
            const timeSigWidth = isFirstMeasure ? 32 * zoom : 0;
            const measureContentWidth = (measure.beats.length * beatWidth) + (measurePadding * 2);
            const measureSvgWidth = clefWidth + timeSigWidth + measureContentWidth;

            const beatsStartX = clefWidth + timeSigWidth + measurePadding;

            // Compute Rhythm Beams for 8th / 16th notes in measure
            const beamedBeatIndices = new Set<number>();
            const beams: { startX: number; endX: number; level: number; y: number }[] = [];

            // Step 1: Identify all Level 1 primary beams between adjacent 8th/16th notes
            measure.beats.forEach((b, bIdx) => {
              if (b.duration === '1/8' || b.duration === '1/16') {
                const nextBeat = measure.beats[bIdx + 1];
                if (nextBeat && (nextBeat.duration === '1/8' || nextBeat.duration === '1/16')) {
                  const x1 = beatsStartX + bIdx * beatWidth;
                  const x2 = beatsStartX + (bIdx + 1) * beatWidth;
                  const beamY = stemsBelow ? string4Y + 36 * zoom : string1Y - 36 * zoom;

                  beamedBeatIndices.add(bIdx);
                  beamedBeatIndices.add(bIdx + 1);

                  beams.push({ startX: x1, endX: x2, level: 1, y: beamY });
                }
              }
            });

            // Step 2: Compute Level 2 secondary beams (full beams and fractional beamlets for 1/16th notes)
            const beamY = stemsBelow ? string4Y + 36 * zoom : string1Y - 36 * zoom;
            const level2Y = stemsBelow ? beamY - 6 * zoom : beamY + 6 * zoom;
            const stubLength = 16 * zoom;

            measure.beats.forEach((b, bIdx) => {
              if (b.duration === '1/16' && beamedBeatIndices.has(bIdx)) {
                const prevBeat = measure.beats[bIdx - 1];
                const nextBeat = measure.beats[bIdx + 1];

                const isConnectedToNext16th = nextBeat && nextBeat.duration === '1/16' && beamedBeatIndices.has(bIdx + 1);
                const isConnectedToPrev16th = prevBeat && prevBeat.duration === '1/16' && beamedBeatIndices.has(bIdx - 1);

                const currentX = beatsStartX + bIdx * beatWidth;

                if (isConnectedToNext16th) {
                  // Full Level 2 secondary beam connecting this 16th to the next 16th
                  const nextX = beatsStartX + (bIdx + 1) * beatWidth;
                  beams.push({ startX: currentX, endX: nextX, level: 2, y: level2Y });
                } else if (!isConnectedToPrev16th) {
                  // Single 1/16th note in a beam group: render traditional fractional secondary beam (stub / beamlet)
                  const isConnectedToPrev8th = prevBeat && (prevBeat.duration === '1/8' || prevBeat.duration === '1/16') && beamedBeatIndices.has(bIdx - 1);
                  const isConnectedToNext8th = nextBeat && (nextBeat.duration === '1/8' || nextBeat.duration === '1/16') && beamedBeatIndices.has(bIdx + 1);

                  if (isConnectedToPrev8th) {
                    // Fractional beam stub pointing leftward along the primary beam
                    beams.push({ startX: currentX - stubLength, endX: currentX, level: 2, y: level2Y });
                  } else if (isConnectedToNext8th) {
                    // Fractional beam stub pointing rightward along the primary beam
                    beams.push({ startX: currentX, endX: currentX + stubLength, level: 2, y: level2Y });
                  }
                }
              }
            });

            return (
              <div key={measure.id} className="measure-svg-block inline-block relative">
                <svg
                  width={measureSvgWidth}
                  height={measureSvgHeight}
                  className="select-none overflow-visible bg-slate-950/80"
                  style={{ overflow: 'visible' }}
                >
                  {/* 4 Continuous Horizontal Ukulele Staff Lines Across Measure */}
                  <g stroke="#64748b" strokeWidth={1.5 * zoom}>
                    {([1, 2, 3, 4] as const).map(s => (
                      <line
                        key={`line-${s}`}
                        x1={0}
                        y1={getStringY(s)}
                        x2={measureSvgWidth}
                        y2={getStringY(s)}
                      />
                    ))}
                  </g>

                  {/* Clef Header / String Tuning Labels (First Measure) */}
                  {isFirstMeasure && (
                    <g>
                      {([1, 2, 3, 4] as const).map(s => (
                        <text
                          key={`hdr-${s}`}
                          x={14 * zoom}
                          y={getStringY(s) + 4 * zoom}
                          textAnchor="start"
                          fill="#cbd5e1"
                          fontFamily="monospace"
                          fontSize={`${12 * zoom}px`}
                          fontWeight="bold"
                        >
                          {tuning.stringsDisplay[s - 1]}
                        </text>
                      ))}
                      {/* Double Start Barline */}
                      <line
                        x1={clefWidth - 12}
                        y1={string1Y}
                        x2={clefWidth - 12}
                        y2={string4Y}
                        stroke="#ffffff"
                        strokeWidth={3 * zoom}
                      />
                      <line
                        x1={clefWidth - 7}
                        y1={string1Y}
                        x2={clefWidth - 7}
                        y2={string4Y}
                        stroke="#64748b"
                        strokeWidth={1.5 * zoom}
                      />
                    </g>
                  )}

                  {/* Traditional Sheet Music Time Signature (First Measure) */}
                  {isFirstMeasure && (
                    <g className="time-signature-engraving">
                      {/* Line Cutout Masks so staff lines do not strike through time signature numbers */}
                      <rect
                        x={clefWidth + 4 * zoom}
                        y={string1Y + 2 * zoom}
                        width={24 * zoom}
                        height={28 * zoom}
                        fill="#020617"
                        rx={3}
                        className="time-signature-mask"
                      />
                      <rect
                        x={clefWidth + 4 * zoom}
                        y={string3Y - 2 * zoom}
                        width={24 * zoom}
                        height={28 * zoom}
                        fill="#020617"
                        rx={3}
                        className="time-signature-mask"
                      />
                      <text
                        x={clefWidth + 16 * zoom}
                        y={string1Y + 24 * zoom}
                        textAnchor="middle"
                        fill="#f59e0b"
                        fontFamily="'Outfit', 'Times New Roman', Georgia, serif"
                        fontSize={`${26 * zoom}px`}
                        fontWeight="800"
                        className="time-signature-text"
                        style={{ pointerEvents: 'none' }}
                      >
                        {measure.timeSignature[0]}
                      </text>
                      <text
                        x={clefWidth + 16 * zoom}
                        y={string4Y + 2 * zoom}
                        textAnchor="middle"
                        fill="#f59e0b"
                        fontFamily="'Outfit', 'Times New Roman', Georgia, serif"
                        fontSize={`${26 * zoom}px`}
                        fontWeight="800"
                        className="time-signature-text"
                        style={{ pointerEvents: 'none' }}
                      >
                        {measure.timeSignature[1]}
                      </text>
                    </g>
                  )}

                  {/* Measure Number Badge */}
                  <g className="no-print">
                    <rect
                      x={clefWidth + timeSigWidth + 4}
                      y={string1Y - 18 * zoom}
                      width={28 * zoom}
                      height={14 * zoom}
                      rx={3}
                      fill="#1e293b"
                      stroke="#334155"
                    />
                    <text
                      x={clefWidth + timeSigWidth + 18 * zoom}
                      y={string1Y - 8 * zoom}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontFamily="monospace"
                      fontSize={`${9 * zoom}px`}
                      fontWeight="bold"
                    >
                      M{measure.index}
                    </text>
                  </g>

                  {/* Measure End Barline */}
                  <line
                    x1={measureSvgWidth}
                    y1={string1Y}
                    x2={measureSvgWidth}
                    y2={string4Y}
                    stroke="#64748b"
                    strokeWidth={1.5 * zoom}
                  />
                  {mIdx === measures.length - 1 && (
                    <line
                      x1={measureSvgWidth - 4}
                      y1={string1Y}
                      x2={measureSvgWidth - 4}
                      y2={string4Y}
                      stroke="#ffffff"
                      strokeWidth={3 * zoom}
                    />
                  )}

                  {/* Rhythm Beams */}
                  {beams.map((bm, bmIdx) => (
                    <line
                      key={`bm-${measure.id}-${bmIdx}`}
                      x1={bm.startX}
                      y1={bm.y}
                      x2={bm.endX}
                      y2={bm.y}
                      stroke="#38bdf8"
                      strokeWidth={3.5 * zoom}
                      className="rhythm-beam"
                    />
                  ))}

                  {/* Measure Beats & Fret Notes */}
                  {measure.beats.map((beat, bIdx) => {
                    const beatX = beatsStartX + bIdx * beatWidth;
                    const isSelected = selectedBeatId === beat.id;
                    const isPlaying = playingBeatId === beat.id;

                    const activeNotes = beat.notes.filter(n => !n.isGhost);
                    const ghostNotes = isSelected ? getAlternateFretSuggestions(activeNotes, tuning, maxFretLimit) : [];

                    const displayChord = (beat.chord && typeof beat.chord === 'object') ? beat.chord : undefined;

                    const stemX = beatX;
                    const stemStartY = stemsBelow ? string4Y + 6 * zoom : string1Y - 6 * zoom;
                    const stemEndY = stemsBelow ? string4Y + 36 * zoom : string1Y - 36 * zoom;
                    const lyricY = stemsBelow ? stemEndY + 24 * zoom : string4Y + 25 * zoom;
                    const isBeamed = beamedBeatIndices.has(bIdx);

                    return (
                      <g
                        key={beat.id}
                        className="cursor-pointer group"
                        onClick={() => onSelectBeat(measure.index - 1, beat.id)}
                      >
                        {/* Playhead Highlight */}
                        <rect
                          x={beatX - beatWidth / 2 + 5}
                          y={topMargin - 15}
                          width={beatWidth - 10}
                          height={staffHeight + 75}
                          rx={6}
                          fill={isPlaying ? 'rgba(245, 158, 11, 0.3)' : isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent'}
                          className="playhead-highlight no-print transition-colors duration-150 group-hover:fill-slate-800/40"
                        />

                        {/* Ukulele Chord Diagram Chart Rendered Above Staff */}
                        {displayChord && (
                          <g
                            transform={`translate(${beatX - 25 * zoom}, ${string1Y - 78 * zoom}) scale(${zoom})`}
                            className="chord-chart-rendering"
                          >
                            <ChordDiagram
                              chord={displayChord}
                              width={50}
                              height={72}
                              textColor="#f59e0b"
                              dotColor="#f59e0b"
                              gridColor="#94a3b8"
                              isSvgInline={true}
                            />
                          </g>
                        )}

                        {/* Traditional Rest Symbol */}
                        {beat.isRest ? (
                          renderRestSymbol(beat, beatX)
                        ) : (
                          /* Standard Fret Numbers & Line Cutouts */
                          ([1, 2, 3, 4] as const).map(s => {
                            const noteOnString = activeNotes.find(n => n.string === s);
                            const ghostOnString = ghostNotes.find(n => n.string === s);
                            const stringY = getStringY(s);
                            const isTargetStringSelected = isSelected && selectedString === s;
                            const isNoteTied = noteOnString?.isTied || (beat.isTied && !!noteOnString);

                            return (
                              <g key={`cell-${beat.id}-s${s}`}>
                                {/* Hit Target Area */}
                                <rect
                                  x={beatX - 12 * zoom}
                                  y={stringY - 8 * zoom}
                                  width={24 * zoom}
                                  height={16 * zoom}
                                  fill="transparent"
                                  className="no-print"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectBeat(measure.index - 1, beat.id, s);
                                    if (!noteOnString) {
                                      onAddNote(beat.id, s, ghostOnString ? ghostOnString.fret : 0);
                                    }
                                  }}
                                />

                                {/* Tied / Continued Note Arc (Curve Arch Connecting to Previous Note) */}
                                {isNoteTied && (
                                  <path
                                    d={`M ${beatX - beatWidth + 8 * zoom} ${stringY - 5 * zoom} Q ${beatX - beatWidth / 2} ${stringY - 16 * zoom} ${beatX - 8 * zoom} ${stringY - 5 * zoom}`}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth={2 * zoom}
                                    className="tab-tie-arc"
                                  />
                                )}

                                {/* Selection Ring */}
                                {isTargetStringSelected && (
                                  <rect
                                    x={beatX - 14 * zoom}
                                    y={stringY - 10 * zoom}
                                    width={28 * zoom}
                                    height={20 * zoom}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth={1.5 * zoom}
                                    strokeDasharray="2 2"
                                    rx={4}
                                    className="selection-ring no-print"
                                  />
                                )}

                                {/* Fret Number */}
                                {noteOnString && (
                                  <g
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectBeat(measure.index - 1, beat.id, s);
                                    }}
                                  >
                                    <rect
                                      x={beatX - (noteOnString.fret >= 10 ? 11 : 8) * zoom}
                                      y={stringY - 9 * zoom}
                                      width={(noteOnString.fret >= 10 ? 22 : 16) * zoom}
                                      height={18 * zoom}
                                      fill="#020617"
                                      rx={2}
                                      className="fret-mask"
                                    />
                                    <text
                                      x={beatX}
                                      y={stringY}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      fill={
                                        isNoteTied
                                          ? '#38bdf8'
                                          : isTargetStringSelected
                                          ? '#38bdf8'
                                          : isPlaying
                                          ? '#fbbf24'
                                          : '#ffffff'
                                      }
                                      fontFamily="monospace, ui-monospace, sans-serif"
                                      fontSize={`${15 * zoom}px`}
                                      fontWeight="bold"
                                      className="fret-number-text"
                                      style={{ pointerEvents: 'none' }}
                                    >
                                      {isNoteTied ? `(${noteOnString.fret})` : noteOnString.fret}
                                    </text>

                                    {/* Direct Red Trashcan Badge */}
                                    {isTargetStringSelected && (
                                      <g
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onRemoveNote(beat.id, s);
                                        }}
                                        className="delete-badge no-print cursor-pointer hover:scale-125 transition-transform"
                                      >
                                        <title>Delete note on string</title>
                                        <circle
                                          cx={beatX + 16 * zoom}
                                          cy={stringY - 10 * zoom}
                                          r={7.5 * zoom}
                                          fill="#ef4444"
                                          className="no-print"
                                        />
                                        <text
                                          x={beatX + 16 * zoom}
                                          y={stringY - 7 * zoom}
                                          textAnchor="middle"
                                          fill="#ffffff"
                                          fontSize={`${9.5 * zoom}px`}
                                          fontWeight="bold"
                                          className="pointer-events-none font-mono no-print"
                                        >
                                          ✕
                                        </text>
                                      </g>
                                    )}
                                  </g>
                                )}

                                {/* Alternate Fret Suggestion (Ghost Note) */}
                                {!noteOnString && ghostOnString && (
                                  <g
                                    className="ghost-fret no-print opacity-80 hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddNote(beat.id, s, ghostOnString.fret);
                                    }}
                                  >
                                    <rect
                                      x={beatX - 12 * zoom}
                                      y={stringY - 8 * zoom}
                                      width={24 * zoom}
                                      height={16 * zoom}
                                      fill="#020617"
                                      rx={2}
                                      className="fret-mask no-print"
                                    />
                                    <text
                                      x={beatX}
                                      y={stringY}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      fill="#c084fc"
                                      fontFamily="monospace, ui-monospace, sans-serif"
                                      fontSize={`${13 * zoom}px`}
                                      fontWeight="bold"
                                      className="no-print"
                                      style={{ pointerEvents: 'none' }}
                                    >
                                      ({ghostOnString.fret})
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })
                        )}

                        {/* Inline Floating Context Action Toolbar */}
                        {isSelected && (
                          <foreignObject
                            x={beatX - popoverWidth / 2}
                            y={topMargin - 125 * zoom}
                            width={popoverWidth}
                            height={105 * zoom}
                            style={{ overflow: 'visible' }}
                            className="floating-popover no-print pointer-events-auto"
                          >
                            <div className="flex flex-col items-center justify-between bg-slate-900/95 border border-sky-500/70 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md w-full h-full">
                              {/* Row 1: Rhythm Duration, Rest, Triplet, Tie, Insert/Delete Beat */}
                              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5 w-full justify-center">
                                <span className="text-[11px] text-slate-400 font-semibold mr-1">Rhythm:</span>
                                {durationOptions.map(d => (
                                  <button
                                    key={d.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateBeatDuration(beat.id, d.value, currentBeatDotted);
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition ${
                                      currentBeatDuration === d.value
                                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateBeatDuration(beat.id, currentBeatDuration, !currentBeatDotted);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition ${
                                    currentBeatDotted
                                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                  title="Toggle dotted duration"
                                >
                                  . Dot
                                </button>

                                <div className="h-4 w-px bg-slate-800 mx-1" />

                                {/* Insert Beat Event */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInsertBeat(beat.id);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 font-bold text-[11px] transition flex items-center gap-1"
                                  title="Insert a new note event into this measure"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  <span>+ Beat</span>
                                </button>

                                {/* Delete Beat Event */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteBeatColumn(beat.id);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-rose-600/30 hover:bg-rose-600/60 text-rose-300 font-bold text-[11px] transition flex items-center gap-1"
                                  title="Delete this beat column from measure"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                  <span>Del Beat</span>
                                </button>

                                {/* Close Beat Editor Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDeselectBeat) onDeselectBeat();
                                    else onSelectBeat(-1, '');
                                  }}
                                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition ml-0.5"
                                  title="Close beat editor (Deselect beat)"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Row 2: Composition Chord Palette Dropdown & Frets */}
                              <div className="flex items-center justify-between w-full pt-1 gap-2">
                                {/* Chord Selector */}
                                <div className="flex items-center gap-1">
                                  <Music className="w-3 h-3 text-amber-400" />
                                  <span className="text-[11px] text-amber-400 font-bold">Chord:</span>
                                  <select
                                    value={displayChord?.name || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const chordName = e.target.value;
                                      if (!chordName) {
                                        if (onSetBeatChord) onSetBeatChord(beat.id, null);
                                      } else {
                                        const found = dropdownChordOptions.find(c => c.name.toLowerCase() === chordName.toLowerCase()) || getChordPreset(chordName);
                                        if (found && onSetBeatChord) {
                                          onSetBeatChord(beat.id, found);
                                        }
                                      }
                                    }}
                                    className="bg-slate-950 border border-slate-800 text-amber-400 font-bold text-[11px] rounded px-1.5 py-0.5 outline-none cursor-pointer"
                                  >
                                    <option value="">(None)</option>
                                    {dropdownChordOptions.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Dynamic Fret Selection Buttons */}
                                {selectedString && (
                                  <div className="flex items-center gap-1 overflow-x-auto">
                                    <span className="text-[11px] text-slate-400 font-semibold">Fret:</span>
                                    {fretButtonList.map(f => (
                                      <button
                                        key={f}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onAddNote(beat.id, selectedString, f);
                                        }}
                                        className="w-5.5 h-5.5 rounded-md text-[10px] font-bold font-mono bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition flex items-center justify-center flex-shrink-0"
                                        title={`Set fret ${f}`}
                                      >
                                        {f}
                                      </button>
                                    ))}

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveNote(beat.id, selectedString);
                                      }}
                                      className="w-6 h-5.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white transition flex items-center justify-center ml-1 shadow-md flex-shrink-0"
                                      title="Delete note on string"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </foreignObject>
                        )}

                        {/* Rhythm Stems & Flags */}
                        {!beat.isRest && (
                          <g stroke={isPlaying ? '#f59e0b' : '#cbd5e1'} strokeWidth={2 * zoom} fill="none">
                            {beat.duration !== '1/1' && (
                              <line x1={stemX} y1={stemStartY} x2={stemX} y2={stemEndY} className="rhythm-stem" />
                            )}

                            {beat.duration === '1/1' && (
                              <circle
                                cx={stemX}
                                cy={stemStartY + 10 * zoom}
                                r={6 * zoom}
                                stroke="#cbd5e1"
                                strokeWidth={2 * zoom}
                                className="rhythm-whole-ring"
                              />
                            )}

                            {beat.duration === '1/2' && (
                              <circle
                                cx={stemX}
                                cy={stemEndY}
                                r={4 * zoom}
                                fill="#020617"
                                stroke="#cbd5e1"
                                strokeWidth={2 * zoom}
                                className="rhythm-half-ring"
                              />
                            )}

                            {beat.duration === '1/8' && !isBeamed && (
                              <path
                                d={`M ${stemX} ${stemEndY} C ${stemX + 8 * zoom} ${stemEndY + (stemsBelow ? -4 : 4) * zoom}, ${stemX + 10 * zoom} ${stemEndY + (stemsBelow ? -12 : 12) * zoom}, ${stemX + 12 * zoom} ${stemEndY + (stemsBelow ? -16 : 16) * zoom}`}
                                stroke={isPlaying ? '#f59e0b' : '#38bdf8'}
                                strokeWidth={2.8 * zoom}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                className="rhythm-flag"
                              />
                            )}

                            {beat.duration === '1/16' && !isBeamed && (
                              <g>
                                <path
                                  d={`M ${stemX} ${stemEndY} C ${stemX + 8 * zoom} ${stemEndY + (stemsBelow ? -4 : 4) * zoom}, ${stemX + 10 * zoom} ${stemEndY + (stemsBelow ? -12 : 12) * zoom}, ${stemX + 12 * zoom} ${stemEndY + (stemsBelow ? -16 : 16) * zoom}`}
                                  stroke={isPlaying ? '#f59e0b' : '#38bdf8'}
                                  strokeWidth={2.8 * zoom}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                  className="rhythm-flag"
                                />
                                <path
                                  d={`M ${stemX} ${stemEndY + (stemsBelow ? -6 : 6) * zoom} C ${stemX + 8 * zoom} ${stemEndY + (stemsBelow ? -10 : 10) * zoom}, ${stemX + 10 * zoom} ${stemEndY + (stemsBelow ? -18 : 18) * zoom}, ${stemX + 12 * zoom} ${stemEndY + (stemsBelow ? -22 : 22) * zoom}`}
                                  stroke={isPlaying ? '#f59e0b' : '#38bdf8'}
                                  strokeWidth={2.8 * zoom}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                  className="rhythm-flag"
                                />
                              </g>
                            )}

                            {beat.isDotted && (() => {
                              // Traditional uncollided dot placement toward top of vertical stem away from flags
                              let dotX = stemX + 7.5 * zoom;
                              let dotY = stemsBelow ? stemStartY + 8 * zoom : stemStartY - 8 * zoom;

                              if (beat.duration === '1/1') {
                                dotX = stemX + 11 * zoom;
                                dotY = stemStartY + 10 * zoom;
                              }

                              return (
                                <circle
                                  cx={dotX}
                                  cy={dotY}
                                  r={2.8 * zoom}
                                  fill="#f59e0b"
                                  stroke="none"
                                  className="rhythm-dot"
                                />
                              );
                            })()}
                          </g>
                        )}

                        {/* Duration Label Badge (Hidden in Print) */}
                        <g className="no-print">
                          <rect
                            x={stemX - 14 * zoom}
                            y={stemsBelow ? stemEndY + 4 * zoom : stemEndY - 16 * zoom}
                            width={28 * zoom}
                            height={12 * zoom}
                            fill="#0f172a"
                            stroke="#334155"
                            strokeWidth={1}
                            rx={3}
                            className="no-print"
                          />
                          <text
                            x={stemX}
                            y={stemsBelow ? stemEndY + 13 * zoom : stemEndY - 7 * zoom}
                            textAnchor="middle"
                            fill={
                              beat.duration === '1/4'
                                ? '#94a3b8'
                                : beat.duration === '1/8'
                                ? '#38bdf8'
                                : beat.duration === '1/16'
                                ? '#a855f7'
                                : '#f59e0b'
                            }
                            fontFamily="monospace"
                            fontSize={`${9 * zoom}px`}
                            fontWeight="bold"
                            className="no-print"
                            style={{ pointerEvents: 'none' }}
                          >
                            {beat.duration}{beat.isDotted ? '.' : ''}
                          </text>
                        </g>

                        {/* Lyric Text Alignment */}
                        {beat.lyric && (
                          <text
                            x={beatX}
                            y={lyricY + 4 * zoom}
                            textAnchor="middle"
                            fill="#38bdf8"
                            fontFamily="sans-serif"
                            fontSize={`${13 * zoom}px`}
                            fontWeight="600"
                            className="tab-lyric-text"
                            style={{ pointerEvents: 'none' }}
                          >
                            {beat.lyric}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
