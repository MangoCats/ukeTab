/// <reference types="vite/client" />
import React, { useMemo } from 'react';
import bravuraFontUrl from '@coderline/alphatab/font/Bravura.woff2?url';
import { TabDocument } from '../types/tab';
import { buildAlphaTabScore, NotationStaffMode } from '../utils/alphaTabScore';
import { createNotationSettings, renderNotationSvg } from '../utils/notationRender';

// Printable width in CSS pixels (US Letter / A4 width less the page margins) and the alphaTab staff scale
export const NOTATION_PRINT_WIDTH = 720;
export const NOTATION_PRINT_SCALE = 0.85;

// The family alphaTab's SVG glyphs use through the "at" class; font-size 34px is alphaTab's music font size
export const NOTATION_FONT_FAMILY = 'alphaTab';
const FONT_CSS = `
@font-face { font-family: '${NOTATION_FONT_FAMILY}'; src: url('${bravuraFontUrl}') format('woff2'); font-display: block; }
.notation-print .at { font-family: '${NOTATION_FONT_FAMILY}'; font-size: 34px; font-style: normal; font-weight: normal; line-height: 1; }
.notation-print .at-surface-svg text { dominant-baseline: alphabetic; white-space: pre; }
`;

/**
 * Standard notation with tablature, drawn by alphaTab, for printing only (hidden on screen). Each laid-out part
 * (chord diagram list, each system) is a block that is not split across pages; alphaTab's credit line is hidden.
 */
export const NotationPrint: React.FC<{ document: TabDocument; mode: NotationStaffMode }> = ({ document, mode }) => {
  const rendered = useMemo(() => {
    try {
      const settings = createNotationSettings(NOTATION_PRINT_SCALE);
      return renderNotationSvg(buildAlphaTabScore(document, mode, settings), settings, NOTATION_PRINT_WIDTH);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [document, mode]);

  if ('error' in rendered) {
    return <div className="notation-print" role="alert">Standard notation could not be drawn: {rendered.error}</div>;
  }

  let previousBottom = 0;
  return (
    <div className="notation-print" data-mode={mode}>
      <style>{FONT_CSS}</style>
      {rendered.parts.map((part, i) => {
        const gap = Math.max(0, part.y - previousBottom);
        previousBottom = part.y + part.height;
        return (
          <div key={i} className={part.isCredit ? 'notation-print-part notation-print-credit' : 'notation-print-part'} style={{ position: 'relative', height: part.height, marginTop: gap }}>
            <div style={{ position: 'absolute', left: part.x, top: 0 }} dangerouslySetInnerHTML={{ __html: part.svg }} />
          </div>
        );
      })}
    </div>
  );
};
