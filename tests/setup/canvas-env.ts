/**
 * Headless environment for characterization tests.
 *
 * These tests drive the REAL shipped game loop (no simulation rewrite), so jsdom
 * needs the few browser APIs the game touches: a 2D context, a non-zero canvas
 * rect, ResizeObserver, vibration, and DeviceMotionEvent. Everything here is an
 * inert stub — it must never influence gameplay values.
 */

class Ctx2DStub {
  canvas: HTMLCanvasElement;
  // Properties the renderer assigns to.
  fillStyle: unknown = '';
  strokeStyle: unknown = '';
  lineWidth = 1;
  lineCap = 'butt';
  font = '';
  textAlign = '';
  textBaseline = '';
  globalAlpha = 1;
  shadowColor = '';
  shadowBlur = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  private gradient() {
    return { addColorStop: () => {} };
  }
  createLinearGradient() { return this.gradient(); }
  createRadialGradient() { return this.gradient(); }

  save() {} restore() {} translate() {} scale() {} rotate() {} setTransform() {}
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arc() {} ellipse() {}
  fill() {} stroke() {} fillRect() {} clearRect() {} fillText() {} setLineDash() {}
  measureText() { return { width: 0 } as TextMetrics; }
}

const CANVAS_W = 390;   // representative portrait phone
const CANVAS_H = 844;

(HTMLCanvasElement.prototype as any).getContext = function (this: HTMLCanvasElement, kind: string) {
  return kind === '2d' ? new Ctx2DStub(this) : null;
};

// jsdom reports a zero-size rect; the game derives its viewport from this.
(Element.prototype as any).getBoundingClientRect = function () {
  return {
    width: CANVAS_W, height: CANVAS_H, top: 0, left: 0,
    right: CANVAS_W, bottom: CANVAS_H, x: 0, y: 0, toJSON: () => ({}),
  };
};

if (!('ResizeObserver' in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
}

if (!('DeviceMotionEvent' in globalThis)) {
  // Presence alone makes the game attach its motion listener; no permission API,
  // which matches Android/desktop behaviour rather than iOS.
  (globalThis as any).DeviceMotionEvent = class extends Event {};
}

if (!navigator.vibrate) {
  Object.defineProperty(navigator, 'vibrate', { value: () => true, configurable: true });
}

// The game guards AudioContext in try/catch; leaving it undefined exercises that path.
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).cancelAnimationFrame = () => {};

export {};
