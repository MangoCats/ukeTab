import React from 'react';
import { UkuleleTabDocument, UkuleleNote, DurationType, Measure } from '../types/ukulele';
import { getAlternateFretSuggestions } from '../utils/musicTheory';
import { ChordDiagram } from './ChordDiagram';
import { Trash2, PlusCircle } from 'lucide-react';

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
  onDeleteBeatColumn: (beatId: string) => void;
  onUpdateBeatDuration: (beatId: string, duration: DurationType, isDotted?: boolean) => void;
  onUpdateBeatLyric: (beatId: string, lyric: string) => void;
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
  onDeleteBeatColumn,
  onUpdateBeatDuration,
  onUpdateBeatLyric
}) => {
  const { tuning, layout, measures } = document;
  const zoom = layout.zoomScale;
  const stemsBelow = layout.stemsPlacement === 'below';
  const maxFretLimit = layout.maxFretLimit ?? 12;
  const fretButtonList = Array.from({ length: maxFretLimit + 1 }, (_, i) => i);
  const popoverWidth = Math.max(410, (maxFretLimit + 1) * 24 + 110);

  // Base layout dimensions
  const lineSpacing = 20 * zoom;
  const topMargin = stemsBelow ? 45 * zoom : 55 * zoom;
  const bottomMargin = stemsBelow ? 55 * zoom : 30 * zoom;
  const stringHeaderWidth = 65 * zoom;
  const measurePadding = 18 * zoom;
  const beatWidth = 68 * zoom;

  const getStringY = (stringIndex: 1 | 2 | 3 | 4) => {
    return topMargin + (stringIndex - 1) * lineSpacing;
  };

  const string1Y = getStringY(1);
  const string4Y = getStringY(4);
  const staffHeight = string4Y - string1Y;

  // Selected beat notes for Chord Diagram preview
  let activeChordNotes: UkuleleNote[] = [];
  let currentBeatDuration: DurationType = '1/4';
  let currentBeatDotted: boolean = false;

  if (selectedBeatId) {
    for (const m of measures) {
      const b = m.beats.find(beat => beat.id === selectedBeatId);
      if (b) {
        activeChordNotes = b.notes.filter(n => !n.isGhost);
        currentBeatDuration = b.duration;
        currentBeatDotted = !!b.isDotted;
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

  // Zoom-Aware Dynamic Row-Wrapping Engine
  const pagePrintWidth = 820; 
  const maxSystemWidth = pagePrintWidth;

  const systems: Measure[][] = [];
  let currentSystem: Measure[] = [];
  let currentSystemWidth = stringHeaderWidth;

  measures.forEach((m) => {
    const isFirstInSystem = currentSystem.length === 0;
    const timeSigWidth = isFirstInSystem ? 32 * zoom : 0;
    const mWidth = (m.beats.length * beatWidth) + (measurePadding * 2) + timeSigWidth;

    if (!isFirstInSystem && (currentSystemWidth + mWidth > maxSystemWidth)) {
      systems.push(currentSystem);
      currentSystem = [m];
      currentSystemWidth = stringHeaderWidth + (m.beats.length * beatWidth) + (measurePadding * 2) + (32 * zoom);
    } else {
      currentSystem.push(m);
      currentSystemWidth += mWidth;
    }
  });

  if (currentSystem.length > 0) {
    systems.push(currentSystem);
  }

  return (
    <div className="w-full space-y-4 TabContainer">
      {/* Active Chord Box Preview Header (Hidden in Print) */}
      {activeChordNotes.length > 0 && (
        <div className="no-print flex items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-400">Selected Beat Shape:</div>
            <ChordDiagram notes={activeChordNotes} tuning={tuning} />
          </div>
          <div className="text-xs text-slate-400 font-mono hidden md:block">
            Tip: Press <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">+</code> or click <span className="text-sky-400 font-semibold">+ Insert Beat</span> to add a new note event to this measure.
          </div>
        </div>
      )}

      {/* Main Tablature Canvas: Continuous Staff System Rows */}
      <div className="w-full overflow-x-auto bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-2xl relative border-none shadow-none bg-transparent">
        <div className="tab-canvas-wrapper flex flex-col space-y-3 print:space-y-1">
          {systems.map((systemMeasures, sysIdx) => {
            let systemContentWidth = 0;
            const measureOffsets: number[] = [];

            systemMeasures.forEach((m) => {
              measureOffsets.push(systemContentWidth);
              const hasTimeSig = (m.id === systemMeasures[0].id);
              const timeSigWidth = hasTimeSig ? 32 * zoom : 0;
              systemContentWidth += (m.beats.length * beatWidth) + (measurePadding * 2) + timeSigWidth;
            });

            const systemSvgWidth = stringHeaderWidth + systemContentWidth;
            const systemSvgHeight = topMargin + staffHeight + bottomMargin;

            return (
              <div key={`system-${sysIdx}`} className="system-row block mb-2 print:mb-1 relative">
                <svg
                  width={systemSvgWidth}
                  height={systemSvgHeight}
                  className="select-none overflow-visible rounded-xl bg-slate-950 border border-slate-800 shadow-inner"
                  style={{ overflow: 'visible' }}
                >
                  {/* Clef Header / String Tuning Labels */}
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
                      x1={stringHeaderWidth - 12}
                      y1={string1Y}
                      x2={stringHeaderWidth - 12}
                      y2={string4Y}
                      stroke="#ffffff"
                      strokeWidth={3 * zoom}
                    />
                    <line
                      x1={stringHeaderWidth - 7}
                      y1={string1Y}
                      x2={stringHeaderWidth - 7}
                      y2={string4Y}
                      stroke="#64748b"
                      strokeWidth={1.5 * zoom}
                    />
                  </g>

                  {/* 4 Continuous Horizontal Ukulele Staff Lines Across System */}
                  <g stroke="#64748b" strokeWidth={1.5 * zoom}>
                    {([1, 2, 3, 4] as const).map(s => (
                      <line
                        key={`line-${s}`}
                        x1={stringHeaderWidth - 7}
                        y1={getStringY(s)}
                        x2={systemSvgWidth - 10}
                        y2={getStringY(s)}
                      />
                    ))}
                  </g>

                  {/* System Final End Bar Line */}
                  <line
                    x1={systemSvgWidth - 10}
                    y1={string1Y}
                    x2={systemSvgWidth - 10}
                    y2={string4Y}
                    stroke="#94a3b8"
                    strokeWidth={2 * zoom}
                  />

                  {/* Render Continuous Measures inside System Row */}
                  {systemMeasures.map((measure, mInSys) => {
                    const mX = stringHeaderWidth + measureOffsets[mInSys];
                    const isFirstInSystem = mInSys === 0;
                    const timeSigWidth = isFirstInSystem ? 32 * zoom : 0;
                    const beatsStartX = mX + measurePadding + timeSigWidth;

                    // Compute Rhythm Beams and Triplet Groups for measure
                    const beamedBeatIndices = new Set<number>();
                    const beams: { startX: number; endX: number; level: number; y: number }[] = [];
                    const tripletGroupBrackets: { startX: number; endX: number; middleX: number; bracketY: number; digitY: number }[] = [];

                    // 1. Detect Triplet Groups (3 consecutive triplet beats)
                    let bIdxCheck = 0;
                    while (bIdxCheck <= measure.beats.length - 3) {
                      const b1 = measure.beats[bIdxCheck];
                      const b2 = measure.beats[bIdxCheck + 1];
                      const b3 = measure.beats[bIdxCheck + 2];

                      if (b1?.isTriplet && b2?.isTriplet && b3?.isTriplet) {
                        const x1 = beatsStartX + bIdxCheck * beatWidth;
                        const x2 = beatsStartX + (bIdxCheck + 1) * beatWidth;
                        const x3 = beatsStartX + (bIdxCheck + 2) * beatWidth;

                        const beamY = stemsBelow ? string4Y + 36 * zoom : string1Y - 36 * zoom;

                        // Connect note stems across the 3 triplet notes with a beam line
                        beamedBeatIndices.add(bIdxCheck);
                        beamedBeatIndices.add(bIdxCheck + 1);
                        beamedBeatIndices.add(bIdxCheck + 2);

                        beams.push({ startX: x1, endX: x3, level: 1, y: beamY });

                        if (b1.duration === '1/16' || b2.duration === '1/16' || b3.duration === '1/16') {
                          const level2Y = stemsBelow ? beamY - 6 * zoom : beamY + 6 * zoom;
                          beams.push({ startX: x1, endX: x3, level: 2, y: level2Y });
                        }

                        // Position bracket line and "3" digit beneath/above the connected note stems
                        const bracketY = stemsBelow ? beamY + 11 * zoom : beamY - 11 * zoom;
                        const digitY = stemsBelow ? beamY + 22 * zoom : beamY - 14 * zoom;

                        tripletGroupBrackets.push({
                          startX: x1 - 3 * zoom,
                          endX: x3 + 3 * zoom,
                          middleX: x2,
                          bracketY,
                          digitY
                        });

                        bIdxCheck += 3;
                      } else {
                        bIdxCheck++;
                      }
                    }

                    // 2. Standard Beaming for non-triplet pairs
                    measure.beats.forEach((b, bIdx) => {
                      if (beamedBeatIndices.has(bIdx)) return;
                      if (b.duration === '1/8' || b.duration === '1/16') {
                        const nextBeat = measure.beats[bIdx + 1];
                        if (nextBeat && !beamedBeatIndices.has(bIdx + 1) && (nextBeat.duration === '1/8' || nextBeat.duration === '1/16')) {
                          const x1 = beatsStartX + bIdx * beatWidth;
                          const x2 = beatsStartX + (bIdx + 1) * beatWidth;
                          const beamY = stemsBelow ? string4Y + 36 * zoom : string1Y - 36 * zoom;

                          beamedBeatIndices.add(bIdx);
                          beamedBeatIndices.add(bIdx + 1);

                          beams.push({ startX: x1, endX: x2, level: 1, y: beamY });
                          if (b.duration === '1/16' && nextBeat.duration === '1/16') {
                            const level2Y = stemsBelow ? beamY - 6 * zoom : beamY + 6 * zoom;
                            beams.push({ startX: x1, endX: x2, level: 2, y: level2Y });
                          }
                        }
                      }
                    });

                    // Measure End Barline
                    const measureEndX = mX + (measure.beats.length * beatWidth) + (measurePadding * 2) + timeSigWidth;

                    return (
                      <g key={measure.id}>
                        {/* Traditional Sheet Music Time Signature (Vertically Stacked Bold Serif Digits) */}
                        {isFirstInSystem && (
                          <g className="time-signature-engraving">
                            {/* Top Numerator Digit */}
                            <text
                              x={mX + 16 * zoom}
                              y={string1Y + 24 * zoom}
                              textAnchor="middle"
                              fill="#f59e0b"
                              fontFamily="'Outfit', 'Times New Roman', Georgia, serif"
                              fontSize={`${26 * zoom}px`}
                              fontWeight="800"
                              style={{ pointerEvents: 'none' }}
                            >
                              {measure.timeSignature[0]}
                            </text>

                            {/* Bottom Denominator Digit */}
                            <text
                              x={mX + 16 * zoom}
                              y={string4Y + 2 * zoom}
                              textAnchor="middle"
                              fill="#f59e0b"
                              fontFamily="'Outfit', 'Times New Roman', Georgia, serif"
                              fontSize={`${26 * zoom}px`}
                              fontWeight="800"
                              style={{ pointerEvents: 'none' }}
                            >
                              {measure.timeSignature[1]}
                            </text>
                          </g>
                        )}

                        {/* Measure Dividing Barline */}
                        {mInSys < systemMeasures.length - 1 && (
                          <line
                            x1={measureEndX}
                            y1={string1Y}
                            x2={measureEndX}
                            y2={string4Y}
                            stroke="#64748b"
                            strokeWidth={1.5 * zoom}
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
                          />
                        ))}

                        {/* Triplet Group Notation (Standard Notation: Connected note stems with a 3 beneath them) */}
                        {tripletGroupBrackets.map((bracket, bktIdx) => (
                          <g key={`tgr-${measure.id}-${bktIdx}`} className="triplet-group-engraving">
                            {/* Horizontal bracket line with small vertical end ticks */}
                            <path
                              d={`M ${bracket.startX} ${bracket.bracketY - (stemsBelow ? 3 : -3) * zoom} L ${bracket.startX} ${bracket.bracketY} L ${bracket.middleX - 8 * zoom} ${bracket.bracketY} M ${bracket.middleX + 8 * zoom} ${bracket.bracketY} L ${bracket.endX} ${bracket.bracketY} L ${bracket.endX} ${bracket.bracketY - (stemsBelow ? 3 : -3) * zoom}`}
                              stroke="#818cf8"
                              strokeWidth={1.5 * zoom}
                              fill="none"
                            />
                            {/* Bold 3 digit centered beneath the connected notes */}
                            <text
                              x={bracket.middleX}
                              y={bracket.digitY}
                              textAnchor="middle"
                              fill="#818cf8"
                              fontFamily="'Outfit', 'Inter', 'Times New Roman', sans-serif"
                              fontSize={`${13 * zoom}px`}
                              fontWeight="800"
                              style={{ pointerEvents: 'none' }}
                            >
                              3
                            </text>
                          </g>
                        ))}

                        {/* Measure Beats & Fret Notes */}
                        {measure.beats.map((beat, bIdx) => {
                          const beatX = beatsStartX + bIdx * beatWidth;
                          const isSelected = selectedBeatId === beat.id;
                          const isPlaying = playingBeatId === beat.id;

                          const activeNotes = beat.notes.filter(n => !n.isGhost);
                          const ghostNotes = isSelected ? getAlternateFretSuggestions(activeNotes, tuning, maxFretLimit) : [];

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

                              {/* Standard Fret Numbers & Line Cutouts */}
                              {([1, 2, 3, 4] as const).map(s => {
                                const noteOnString = activeNotes.find(n => n.string === s);
                                const ghostOnString = ghostNotes.find(n => n.string === s);
                                const stringY = getStringY(s);
                                const isTargetStringSelected = isSelected && selectedString === s;

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
                                          y={stringY + 4 * zoom}
                                          textAnchor="middle"
                                          fill={
                                            isTargetStringSelected
                                              ? '#38bdf8'
                                              : isPlaying
                                              ? '#fbbf24'
                                              : '#ffffff'
                                          }
                                          fontFamily="monospace, ui-monospace, sans-serif"
                                          fontSize={`${15 * zoom}px`}
                                          fontWeight="bold"
                                          style={{ pointerEvents: 'none' }}
                                        >
                                          {noteOnString.fret}
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
                                    {!beat.isRest && !noteOnString && ghostOnString && (
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
                                          y={stringY + 4 * zoom}
                                          textAnchor="middle"
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
                              })}

                              {/* Musical Rest Symbol (Rendered at center of 4-line staff when beat.isRest is true) */}
                              {beat.isRest && (
                                <g className="rest-symbol-group pointer-events-none">
                                  {beat.duration === '1/1' ? (
                                    <rect
                                      x={beatX - 7 * zoom}
                                      y={getStringY(2)}
                                      width={14 * zoom}
                                      height={6 * zoom}
                                      fill={isPlaying ? '#f59e0b' : isSelected ? '#38bdf8' : '#e2e8f0'}
                                      rx={1}
                                    />
                                  ) : beat.duration === '1/2' ? (
                                    <rect
                                      x={beatX - 7 * zoom}
                                      y={getStringY(3) - 6 * zoom}
                                      width={14 * zoom}
                                      height={6 * zoom}
                                      fill={isPlaying ? '#f59e0b' : isSelected ? '#38bdf8' : '#e2e8f0'}
                                      rx={1}
                                    />
                                  ) : (
                                    <text
                                      x={beatX}
                                      y={topMargin + 2.1 * lineSpacing}
                                      textAnchor="middle"
                                      fill={isPlaying ? '#f59e0b' : isSelected ? '#38bdf8' : '#e2e8f0'}
                                      fontSize={`${22 * zoom}px`}
                                      fontFamily="serif, 'Times New Roman', Georgia"
                                      fontWeight="bold"
                                      style={{ pointerEvents: 'none' }}
                                    >
                                      {beat.duration === '1/4' ? '𝄽' : beat.duration === '1/8' ? '𝄾' : beat.duration === '1/16' ? '𝄿' : '𝄽'}
                                    </text>
                                  )}
                                </g>
                              )}

                              {/* Inline Floating Context Action Toolbar */}
                              {isSelected && (
                                <foreignObject
                                  x={beatX - popoverWidth / 2}
                                  y={topMargin - 105 * zoom}
                                  width={popoverWidth}
                                  height={95 * zoom}
                                  style={{ overflow: 'visible' }}
                                  className="floating-popover no-print pointer-events-auto"
                                >
                                  <div className="flex flex-col items-center justify-between bg-slate-900/95 border border-sky-500/70 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md w-full h-full">
                                    {/* Row 1: Rhythm Duration & Insert/Delete Beat Column */}
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

                                      {/* Rest Toggle */}
                                      {onToggleRest && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleRest(beat.id);
                                          }}
                                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                                            beat.isRest
                                              ? 'bg-purple-500 text-slate-950 shadow-sm'
                                              : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                                          }`}
                                          title="Toggle rest symbol for this beat (Press R)"
                                        >
                                          𝄽 Rest
                                        </button>
                                      )}

                                      {/* Triplet Toggle */}
                                      {onToggleTriplet && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleTriplet(beat.id);
                                          }}
                                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                                            beat.isTriplet
                                              ? 'bg-indigo-500 text-slate-950 shadow-sm'
                                              : 'bg-slate-800 text-indigo-300 hover:bg-slate-700'
                                          }`}
                                          title="Toggle triplet (3:2) designation for this beat (Press T)"
                                        >
                                          3 Triplet
                                        </button>
                                      )}

                                      {/* Insert Beat Event in Measure */}
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

                                      {/* Insert Rest Event in Measure */}
                                      {onInsertRest && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onInsertRest(beat.id);
                                          }}
                                          className="px-2 py-0.5 rounded-md bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-[11px] transition flex items-center gap-1"
                                          title="Insert a new rest event into this measure"
                                        >
                                          <span>+ Rest</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Row 2: Dynamic Fret Selection Buttons (0 to maxFretLimit) + Trashcan */}
                                    {selectedString && (
                                      <div className="flex items-center justify-center gap-1 w-full pt-1 overflow-x-auto">
                                        <span className="text-[11px] text-slate-400 font-semibold mr-1">Fret:</span>
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
                                </foreignObject>
                              )}

                              {/* Rhythm Stems & Flags */}
                              <g stroke={isPlaying ? '#f59e0b' : '#cbd5e1'} strokeWidth={2 * zoom} fill="none">
                                {beat.duration !== '1/1' && (
                                  <line x1={stemX} y1={stemStartY} x2={stemX} y2={stemEndY} />
                                )}

                                {beat.duration === '1/1' && (
                                  <circle cx={stemX} cy={stemStartY + 10 * zoom} r={6 * zoom} stroke="#cbd5e1" strokeWidth={2 * zoom} />
                                )}

                                {beat.duration === '1/2' && (
                                  <circle cx={stemX} cy={stemEndY} r={4 * zoom} fill="#020617" stroke="#cbd5e1" strokeWidth={2 * zoom} />
                                )}

                                {beat.duration === '1/8' && !isBeamed && (
                                  <path
                                    d={`M ${stemX} ${stemEndY} C ${stemX + 8 * zoom} ${stemEndY + (stemsBelow ? -4 : 4) * zoom}, ${stemX + 10 * zoom} ${stemEndY + (stemsBelow ? -12 : 12) * zoom}, ${stemX + 12 * zoom} ${stemEndY + (stemsBelow ? -16 : 16) * zoom}`}
                                    stroke={isPlaying ? '#f59e0b' : '#38bdf8'}
                                    strokeWidth={2.5 * zoom}
                                    fill="none"
                                  />
                                )}

                                {beat.duration === '1/16' && !isBeamed && (
                                  <g>
                                    <path
                                      d={`M ${stemX} ${stemEndY} C ${stemX + 8 * zoom} ${stemEndY + (stemsBelow ? -4 : 4) * zoom}, ${stemX + 10 * zoom} ${stemEndY + (stemsBelow ? -12 : 12) * zoom}, ${stemX + 12 * zoom} ${stemEndY + (stemsBelow ? -16 : 16) * zoom}`}
                                      stroke={isPlaying ? '#f59e0b' : '#38bdf8'}
                                      strokeWidth={2.5 * zoom}
                                      fill="none"
                                    />
                                    <path
                                      d={`M ${stemX} ${stemEndY + (stemsBelow ? -6 : 6) * zoom} C ${stemX + 8 * zoom} ${stemEndY + (stemsBelow ? -10 : 10) * zoom}, ${stemX + 10 * zoom} ${stemEndY + (stemsBelow ? -18 : 18) * zoom}, ${stemX + 12 * zoom} ${stemEndY + (stemsBelow ? -22 : 22) * zoom}`}
                                      stroke={isPlaying ? '#f59e0b' : '#38bdf8'}
                                      strokeWidth={2.5 * zoom}
                                      fill="none"
                                    />
                                  </g>
                                )}

                                {beat.isDotted && (
                                  <circle cx={stemX + 8 * zoom} cy={stemEndY} r={2.5 * zoom} fill="#f59e0b" stroke="none" />
                                )}

                                {/* Isolated Triplet Indicator: Clean single '3' text on background when not in a 3-note group */}
                                {beat.isTriplet && !isBeamed && (
                                  <text
                                    x={stemX}
                                    y={stemEndY + (stemsBelow ? 16 * zoom : -10 * zoom)}
                                    textAnchor="middle"
                                    fill="#818cf8"
                                    fontFamily="sans-serif, ui-sans-serif"
                                    fontSize={`${12 * zoom}px`}
                                    fontWeight="800"
                                    style={{ pointerEvents: 'none' }}
                                  >
                                    3
                                  </text>
                                )}
                              </g>

                              {/* Duration Label Badge (Hidden in Print) */}
                              <g className="no-print">
                                <rect
                                  x={stemX - 14 * zoom}
                                  y={stemsBelow ? stemEndY + (beat.isTriplet ? 28 * zoom : 4 * zoom) : stemEndY - (beat.isTriplet ? 28 * zoom : 16 * zoom)}
                                  width={28 * zoom}
                                  height={12 * zoom}
                                  fill="#0f172a"
                                  stroke={beat.isTriplet ? '#6366f1' : '#334155'}
                                  strokeWidth={1}
                                  rx={3}
                                  className="no-print"
                                />
                                <text
                                  x={stemX}
                                  y={stemsBelow ? stemEndY + (beat.isTriplet ? 37 * zoom : 13 * zoom) : stemEndY - (beat.isTriplet ? 19 * zoom : 7 * zoom)}
                                  textAnchor="middle"
                                  fill={
                                    beat.isTriplet
                                      ? '#818cf8'
                                      : beat.duration === '1/4'
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
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {beat.lyric}
                                </text>
                              )}
                            </g>
                          );
                        })}
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
