import * as alphaTab from '@coderline/alphatab';

/**
 * Renders an alphaTab score to SVG for printing. alphaTab lays the score out in systems and reports each laid-out
 * part (chord diagram list, each system, the closing credit line) as a separate SVG fragment, in page order.
 */

export interface NotationSvgPart {
  svg: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** alphaTab's closing "rendered by alphaTab" line, which the printout hides */
  isCredit: boolean;
}

const CREDIT_TEXT = '>rendered by alphaTab<';

// Elements the UkeTab print header already shows (title, artist, tuning, tempo) or that UkeTab does not use
const HIDDEN_ELEMENTS = [
  alphaTab.NotationElement.ScoreTitle,
  alphaTab.NotationElement.ScoreSubTitle,
  alphaTab.NotationElement.ScoreArtist,
  alphaTab.NotationElement.ScoreAlbum,
  alphaTab.NotationElement.ScoreWords,
  alphaTab.NotationElement.ScoreMusic,
  alphaTab.NotationElement.ScoreWordsAndMusic,
  alphaTab.NotationElement.ScoreCopyright,
  alphaTab.NotationElement.GuitarTuning,
  alphaTab.NotationElement.EffectCapo,
  alphaTab.NotationElement.EffectDynamics,
  alphaTab.NotationElement.EffectTempo
];

/**
 * Settings for print rendering: SVG output drawn synchronously on the calling thread, page layout, all black, and
 * the given scale (1 = alphaTab's default staff size).
 */
export function createNotationSettings(scale: number): alphaTab.Settings {
  const settings = new alphaTab.Settings();
  settings.core.engine = 'svg';
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false;
  settings.display.layoutMode = alphaTab.LayoutMode.Page;
  settings.display.scale = scale;
  HIDDEN_ELEMENTS.forEach(element => settings.notation.elements.set(element, false));

  // Everything black, as in the tab printout (alphaTab draws bar numbers red and staff lines grey by default)
  const black = new alphaTab.model.Color(0, 0, 0, 255);
  const resources = settings.display.resources;
  resources.staffLineColor = black;
  resources.barSeparatorColor = black;
  resources.barNumberColor = black;
  resources.mainGlyphColor = black;
  resources.secondaryGlyphColor = black;
  resources.scoreInfoColor = black;
  return settings;
}

/**
 * Lays out and draws every track of the score at the given width (CSS pixels). Throws if alphaTab reports an error
 * or does not finish synchronously.
 */
export function renderNotationSvg(
  score: alphaTab.model.Score,
  settings: alphaTab.Settings,
  width: number
): { parts: NotationSvgPart[]; height: number } {
  const renderer = new alphaTab.rendering.ScoreRenderer(settings);
  renderer.width = width;

  const parts: NotationSvgPart[] = [];
  let height = -1;
  let error: unknown = null;
  renderer.partialRenderFinished.on(result => {
    const svg = String(result.renderResult ?? '');
    parts.push({ svg, x: result.x, y: result.y, width: result.width, height: result.height, isCredit: svg.includes(CREDIT_TEXT) });
  });
  renderer.renderFinished.on(result => {
    height = result.totalHeight;
  });
  renderer.error.on(e => {
    error = e;
  });

  renderer.renderScore(score, score.tracks.map(t => t.index));
  renderer.destroy();

  if (error) throw error;
  if (height < 0) throw new Error('Notation rendering did not finish');
  return { parts: [...parts].sort((a, b) => a.y - b.y || a.x - b.x), height };
}
