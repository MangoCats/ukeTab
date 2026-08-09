import React from 'react';
import { UkuleleNote, TuningConfig } from '../types/ukulele';

interface ChordDiagramProps {
  notes: UkuleleNote[];
  tuning: TuningConfig;
  chordName?: string;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({ notes, tuning, chordName }) => {
  if (!notes.length) return null;

  const numFrets = 4;
  const width = 80;
  const height = 90;
  const topMargin = 22;
  const sideMargin = 16;
  const stringSpacing = (width - sideMargin * 2) / 3;
  const fretSpacing = (height - topMargin - 10) / numFrets;

  // Determine highest fret to calculate base fret if > 4
  const frets = notes.map(n => n.fret).filter(f => f > 0);
  const maxFret = frets.length ? Math.max(...frets) : 0;
  const minFret = frets.length ? Math.min(...frets) : 1;
  const baseFret = maxFret > 4 ? minFret : 1;

  return (
    <div className="inline-flex flex-col items-center bg-slate-950/80 border border-slate-800 rounded-xl p-2 shadow-lg">
      {chordName && (
        <span className="text-xs font-bold font-outfit text-amber-400 mb-1">{chordName}</span>
      )}
      <svg width={width} height={height} className="select-none">
        {/* Nut Line */}
        <line
          x1={sideMargin}
          y1={topMargin}
          x2={width - sideMargin}
          y2={topMargin}
          stroke="#f8fafc"
          strokeWidth={baseFret === 1 ? 3 : 1}
        />

        {/* Base Fret Indicator */}
        {baseFret > 1 && (
          <text
            x={sideMargin - 10}
            y={topMargin + fretSpacing / 2 + 3}
            className="fill-slate-400 font-mono text-[9px] font-bold"
          >
            {baseFret}fr
          </text>
        )}

        {/* Fret Grid Lines */}
        {Array.from({ length: numFrets + 1 }).map((_, fIdx) => {
          const y = topMargin + fIdx * fretSpacing;
          return (
            <line
              key={`fret-${fIdx}`}
              x1={sideMargin}
              y1={y}
              x2={width - sideMargin}
              y2={y}
              stroke="#475569"
              strokeWidth={1}
            />
          );
        })}

        {/* 4 String Lines (String 4 left to String 1 right on diagram) */}
        {([4, 3, 2, 1] as const).map((s, colIdx) => {
          const x = sideMargin + colIdx * stringSpacing;
          const note = notes.find(n => n.string === s);

          return (
            <g key={`str-${s}`}>
              <line
                x1={x}
                y1={topMargin}
                x2={x}
                y2={topMargin + numFrets * fretSpacing}
                stroke="#64748b"
                strokeWidth={1.5}
              />

              {/* Open String (0) or Fretted Dot */}
              {note ? (
                note.fret === 0 ? (
                  <circle
                    cx={x}
                    cy={topMargin - 6}
                    r={3}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                  />
                ) : (
                  <circle
                    cx={x}
                    cy={topMargin + (note.fret - baseFret + 0.5) * fretSpacing}
                    r={5}
                    fill="#f59e0b"
                  />
                )
              ) : (
                /* Unplayed String 'X' */
                <text
                  x={x}
                  y={topMargin - 3}
                  textAnchor="middle"
                  className="fill-slate-500 font-mono text-[9px]"
                >
                  x
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
