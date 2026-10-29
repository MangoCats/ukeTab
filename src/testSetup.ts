// Vitest setup (jsdom): jsdom has no 2D canvas and logs "Not implemented" when one is requested. Report "no canvas"
// instead, which is the case the application already handles (e.g. print row labels fall back to SVG text).
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
