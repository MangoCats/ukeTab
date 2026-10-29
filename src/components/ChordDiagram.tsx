import React from 'react';
import { TabNote, TuningConfig, ChordMarker } from '../types/tab';

interface ChordDiagramProps {
  notes?: TabNote[];
  chord?: ChordMarker;
  tuning?: TuningConfig;
  chordName?: string;
  width?: number;
  height?: number;
  textColor?: string;
  dotColor?: string;
  gridColor?: string;
  isSvgInline?: boolean;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  notes,
  chord,
  tuning,
  chordName: chordNameProp,
  width = 50,
  height = 72,
  textColor = '#f59e0b',
  dotColor = '#f59e0b',
  gridColor = '#94a3b8',
  isSvgInline = false
}) => {
  let chordName = chordNameProp || chord?.name;

  if (!chord && !(notes && notes.length)) {
    return null;
  }

  const stringCount = chord
    ? chord.frets.length
    : tuning?.pitches.length ?? Math.max(4, ...notes!.map(n => n.string));

  // fretsPerString[s] = fret on string s (1..N); -1 = muted / unplayed
  const fretsPerString: number[] = Array(stringCount + 1).fill(-1);

  if (chord) {
    // chord.frets is bottom line first [String N, ..., String 1]
    chord.frets.forEach((fret, i) => {
      fretsPerString[stringCount - i] = fret;
    });
  } else {
    notes!.forEach(n => {
      fretsPerString[n.string] = n.fret;
    });
  }

  const numFrets = 4;
  const topMargin = 26; // Expanded whitespace between 60% larger chord title and nut line / open circles
  const sideMargin = 9;
  const stringSpacing = (width - sideMargin * 2) / (stringCount - 1);
  const fretSpacing = (height - topMargin - 5) / numFrets;

  // Compute base fret
  const activeFrets = fretsPerString.filter(f => f > 0);
  const maxFret = activeFrets.length ? Math.max(...activeFrets) : 0;
  const minFret = activeFrets.length ? Math.min(...activeFrets) : 1;
  const baseFret = chord?.baseFret || (maxFret > 4 ? minFret : 1);

  const diagramContent = (
    <>
      {/* Chord Name Label (60% Larger Font: 16px) */}
      {chordName && (
        <text
          x={width / 2}
          y={16}
          textAnchor="middle"
          fill={textColor}
          fontFamily="'Outfit', 'Inter', system-ui, sans-serif"
          fontSize="16px"
          fontWeight="800"
          className="chord-title-text select-none"
        >
          {chordName}
        </text>
      )}

      {/* Nut Line (Thick if baseFret === 1) */}
      <line
        x1={sideMargin}
        y1={topMargin}
        x2={width - sideMargin}
        y2={topMargin}
        stroke={baseFret === 1 ? '#f8fafc' : gridColor}
        strokeWidth={baseFret === 1 ? 2.5 : 1}
        className="chord-nut-line"
      />

      {/* Base Fret Indicator (e.g. 3fr) */}
      {baseFret > 1 && (
        <text
          x={sideMargin - 4}
          y={topMargin + fretSpacing / 2 + 3}
          textAnchor="end"
          fill={gridColor}
          fontFamily="monospace"
          fontSize="8px"
          fontWeight="bold"
          className="chord-base-fret-text"
        >
          {baseFret}fr
        </text>
      )}

      {/* Horizontal Fret Lines */}
      {Array.from({ length: numFrets + 1 }).map((_, fIdx) => {
        const y = topMargin + fIdx * fretSpacing;
        return (
          <line
            key={`fret-${fIdx}`}
            x1={sideMargin}
            y1={y}
            x2={width - sideMargin}
            y2={y}
            stroke={gridColor}
            strokeWidth={0.7}
            className="chord-fret-line"
          />
        );
      })}

      {/* Vertical String Lines (String N, lowest line on the staff, at left to String 1 at right) */}
      {Array.from({ length: stringCount }, (_, i) => stringCount - i).map((s, colIdx) => {
        const x = sideMargin + colIdx * stringSpacing;
        const fretVal = fretsPerString[s];

        return (
          <g key={`str-${s}`}>
            {/* Vertical String Line */}
            <line
              x1={x}
              y1={topMargin}
              x2={x}
              y2={topMargin + numFrets * fretSpacing}
              stroke={gridColor}
              strokeWidth={1.1}
              className="chord-string-line"
            />

            {/* String Status: Open Circle O, Muted X, or Fretted Dot */}
            {fretVal === 0 ? (
              /* Open String (0) */
              <circle
                cx={x}
                cy={topMargin - 4}
                r={2.4}
                fill="none"
                stroke={dotColor}
                strokeWidth={1.2}
                className="chord-open-circle"
              />
            ) : fretVal > 0 ? (
              /* Fretted Finger Placement Dot */
              <circle
                cx={x}
                cy={topMargin + (fretVal - baseFret + 0.5) * fretSpacing}
                r={3.4}
                fill={dotColor}
                className="chord-fretted-dot"
              />
            ) : (
              /* Unplayed Muted String 'X' */
              <text
                x={x}
                y={topMargin - 2}
                textAnchor="middle"
                fill={gridColor}
                fontFamily="monospace"
                fontSize="8px"
                fontWeight="bold"
                className="chord-muted-x"
              >
                ✕
              </text>
            )}
          </g>
        );
      })}
    </>
  );

  if (isSvgInline) {
    return <g className="chord-diagram-group">{diagramContent}</g>;
  }

  return (
    <div className="inline-flex flex-col items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 shadow-lg">
      <svg width={width} height={height} className="select-none overflow-visible">
        {diagramContent}
      </svg>
    </div>
  );
};
