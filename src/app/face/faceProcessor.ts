/**
 * "My Face" processing — turn a user photo + crop transform into a rig-aligned
 * 512×768 RGBA overlay, feathered into Champ's cream head by the delivered mask
 * (public/art/profile/champ_face_mask.png). Local canvas only; no upload, no
 * recognition. The output is drawn in-game exactly like any other rig layer.
 */

/** Rig-canvas size — the overlay is always exactly this (aligned to base_body). */
export const FACE_W = 512;
export const FACE_H = 768;

/** Rotation is limited to a gentle ±15° per the feature spec. */
export const MAX_ROTATION_RAD = (15 * Math.PI) / 180;
const MIN_SCALE = 0.15;
const MAX_SCALE = 8;

export interface FaceTransform {
  /** Where the source's CENTER sits on the 512×768 canvas. */
  x: number;
  y: number;
  scale: number;
  rotation: number;   // radians
}

/** The default transform: source centered on the head, scaled to roughly fill it. */
export function defaultFaceTransform(srcW: number, _srcH = 0): FaceTransform {
  const target = FACE_W * 0.62;                       // head is ~62% of canvas width
  const scale = srcW > 0 ? target / srcW : 1;
  return { x: FACE_W / 2, y: FACE_H * 0.34, scale, rotation: 0 };
}

/** Keep a transform within safe bounds (rotation ±15°, sane scale). */
export function clampFaceTransform(tf: FaceTransform): FaceTransform {
  return {
    x: tf.x,
    y: tf.y,
    scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, tf.scale)),
    rotation: Math.max(-MAX_ROTATION_RAD, Math.min(MAX_ROTATION_RAD, tf.rotation)),
  };
}

export interface FaceLayerPlan {
  drawBody: true;
  /** Draw the user's custom face overlay (clipped, between body and cosmetics). */
  drawCustomFace: boolean;
  /** Draw a normal expression face (idle/charging/...). Suppressed when custom. */
  drawExpression: boolean;
}

/**
 * Which face layers to render. When a custom face is active it REPLACES the
 * expression faces; body, glasses, mouth, hat and aura are unaffected.
 */
export function faceRenderLayers(hasCustomFace: boolean): FaceLayerPlan {
  return { drawBody: true, drawCustomFace: hasCustomFace, drawExpression: !hasCustomFace };
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type CanvasFactory = (w: number, h: number) => AnyCanvas;

function domCanvas(w: number, h: number): AnyCanvas {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toBlob(canvas: AnyCanvas): Promise<Blob | null> {
  if ('convertToBlob' in canvas && typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
    return (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' }).catch(() => null);
  }
  return new Promise((resolve) => {
    try { (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), 'image/png'); }
    catch { resolve(null); }
  });
}

function srcSize(source: CanvasImageSource): { w: number; h: number } {
  const s = source as any;
  return { w: s.width || s.videoWidth || s.naturalWidth || 0, h: s.height || s.videoHeight || s.naturalHeight || 0 };
}

/**
 * Render the final overlay: the source under `tf`, then clipped by `mask` with a
 * destination-in composite so only Champ's head window shows (with the mask's
 * feathered cream rim). Returns a PNG Blob (or null if canvas is unavailable).
 */
export async function renderFaceOverlay(
  source: CanvasImageSource,
  tf: FaceTransform,
  mask: CanvasImageSource,
  createCanvas: CanvasFactory = domCanvas,
): Promise<Blob | null> {
  const canvas = createCanvas(FACE_W, FACE_H);
  canvas.width = FACE_W; canvas.height = FACE_H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  const t = clampFaceTransform(tf);
  const { w, h } = srcSize(source);

  ctx.clearRect(0, 0, FACE_W, FACE_H);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.rotation);
  ctx.scale(t.scale, t.scale);
  ctx.drawImage(source, -w / 2, -h / 2);
  ctx.restore();

  // Keep only the head window (feathered rim baked into the mask alpha).
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0, FACE_W, FACE_H);
  ctx.globalCompositeOperation = 'source-over';

  return toBlob(canvas);
}
