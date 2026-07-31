/**
 * "My Face / Moj obraz" — put your own face inside Champ's head.
 *
 * Camera/gallery pick → drag/pinch/rotate crop editor with a live preview inside
 * the head mask → a 512×768 overlay saved locally (IndexedDB, never the original
 * photo, never uploaded). Gameplay, hitboxes and multiplayer are untouched.
 */
import { art } from '../../game/assets/store';
import { setCustomFaceImage, loadCustomFace, hasCustomFace } from '../../game/assets/store';
import { getFaceStore } from '../face/faceStore';
import {
  FACE_W, FACE_H, MAX_ROTATION_RAD, defaultFaceTransform, clampFaceTransform, renderFaceOverlay, type FaceTransform,
} from '../face/faceProcessor';

const B = ((import.meta as any).env?.BASE_URL as string) || './';
function locale(): 'sl' | 'en' { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; } }
const T = {
  en: { title: 'My Face', privacy: 'Processed on your device — never uploaded.', camera: '📷 Camera', gallery: '🖼 Gallery',
    use: 'Use this face', cancel: 'Cancel', change: 'Change', del: 'Delete', rotate: 'Rotate', close: 'Close', active: 'Your face is active' },
  sl: { title: 'Moj obraz', privacy: 'Obdelano na tvoji napravi — nikoli naloženo.', camera: '📷 Kamera', gallery: '🖼 Galerija',
    use: 'Uporabi ta obraz', cancel: 'Prekliči', change: 'Zamenjaj', del: 'Izbriši', rotate: 'Zasukaj', close: 'Zapri', active: 'Tvoj obraz je aktiven' },
};

const PREVIEW_W = 232, PREVIEW_H = Math.round((PREVIEW_W * FACE_H) / FACE_W);   // keep the 512:768 ratio
const K = PREVIEW_W / FACE_W;

/** Downscale a decoded image so its longest edge is <= cap (perf + memory). */
function downscale(img: HTMLImageElement, cap = 2048): CanvasImageSource {
  const long = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
  if (long <= cap) return img;
  const s = cap / long;
  const c = document.createElement('canvas');
  c.width = Math.round((img.naturalWidth || img.width) * s);
  c.height = Math.round((img.naturalHeight || img.height) * s);
  const cx = c.getContext('2d'); if (cx) cx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export function openMyFace(onChanged?: () => void): void {
  const t = T[locale()];
  const root = document.createElement('div');
  root.className = 'settings-overlay myface-overlay';

  let source: CanvasImageSource | null = null;
  let srcW = 0, srcH = 0;
  let tf: FaceTransform = defaultFaceTransform(1, 1);
  let mask: HTMLImageElement | null = null;

  const camInput = mkFileInput(true);
  const galInput = mkFileInput(false);

  const render = () => {
    const editing = !!source;
    root.innerHTML = `
      <div class="settings-sheet myface-sheet" role="dialog" aria-label="${t.title}">
        <h2>${t.title}</h2>
        <p class="myface-privacy">${t.privacy}</p>
        ${editing ? editorHtml() : pickerHtml()}
        <button class="settings-close" data-act="close">${t.close}</button>
      </div>`;
    if (editing) mountEditor();
  };

  const pickerHtml = () => `
    <div class="myface-picker">
      <div class="myface-current"><img src="${B}art/profile/my_face_tile.png" alt=""></div>
      ${hasCustomFace() ? `<div class="myface-active">✓ ${t.active}</div>` : ''}
      <div class="myface-actions">
        <button class="store-btn" data-act="camera">${t.camera}</button>
        <button class="store-btn equip" data-act="gallery">${t.gallery}</button>
      </div>
      ${hasCustomFace() ? `<button class="settings-row myface-del" data-act="delete">🗑 ${t.del}</button>` : ''}
    </div>`;

  const editorHtml = () => `
    <div class="myface-editor">
      <canvas class="myface-canvas" width="${PREVIEW_W}" height="${PREVIEW_H}"></canvas>
      <label class="myface-rotate">${t.rotate}
        <input type="range" class="myface-rot" min="-15" max="15" value="${Math.round((tf.rotation * 180) / Math.PI)}">
      </label>
      <div class="myface-actions">
        <button class="store-btn" data-act="use">${t.use}</button>
        <button class="settings-row myface-cancel" data-act="cancel">${t.cancel}</button>
      </div>
    </div>`;

  const drawPreview = () => {
    const canvas = root.querySelector('.myface-canvas') as HTMLCanvasElement | null;
    const cx = canvas?.getContext('2d'); if (!canvas || !cx || !source) return;
    cx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    cx.save();
    cx.scale(K, K);   // work in rig (512×768) space
    // faint body backdrop for alignment context
    if (art.img.body) { cx.globalAlpha = 0.22; cx.drawImage(art.img.body, 0, 0, FACE_W, FACE_H); cx.globalAlpha = 1; }
    // the user's face, clipped by the head mask
    cx.save();
    cx.translate(tf.x, tf.y); cx.rotate(tf.rotation); cx.scale(tf.scale, tf.scale);
    cx.drawImage(source, -srcW / 2, -srcH / 2);
    cx.restore();
    if (mask) { cx.globalCompositeOperation = 'destination-in'; cx.drawImage(mask, 0, 0, FACE_W, FACE_H); cx.globalCompositeOperation = 'source-over'; }
    cx.restore();
    // head outline
    cx.strokeStyle = 'rgba(67,224,207,.5)'; cx.lineWidth = 1.5;
    cx.strokeRect(1, 1, PREVIEW_W - 2, PREVIEW_H - 2);
  };

  const mountEditor = () => {
    if (!mask) { mask = new Image(); mask.onload = drawPreview; mask.src = `${B}art/profile/champ_face_mask.png`; }
    drawPreview();
    const canvas = root.querySelector('.myface-canvas') as HTMLCanvasElement;
    const pts = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinchDist = twoDist(pts); });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId)!; const cur = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, cur);
      if (pts.size === 1) { tf = clampFaceTransform({ ...tf, x: tf.x + (cur.x - prev.x) / K, y: tf.y + (cur.y - prev.y) / K }); }
      else if (pts.size === 2) { const d = twoDist(pts); if (pinchDist > 0) tf = clampFaceTransform({ ...tf, scale: tf.scale * (d / pinchDist) }); pinchDist = d; }
      drawPreview();
    });
    const end = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinchDist = 0; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); tf = clampFaceTransform({ ...tf, scale: tf.scale * (e.deltaY < 0 ? 1.06 : 0.94) }); drawPreview(); }, { passive: false });
    (root.querySelector('.myface-rot') as HTMLInputElement).addEventListener('input', (e) => {
      tf = clampFaceTransform({ ...tf, rotation: (Number((e.target as HTMLInputElement).value) * Math.PI) / 180 }); drawPreview();
    });
  };

  const pickFrom = (input: HTMLInputElement) => {
    const file = input.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      source = downscale(img);
      srcW = (source as any).width || img.naturalWidth; srcH = (source as any).height || img.naturalHeight;
      tf = defaultFaceTransform(srcW, srcH);
      URL.revokeObjectURL(url);              // don't retain the original blob URL
      render();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };
  camInput.addEventListener('change', () => pickFrom(camInput));
  galInput.addEventListener('change', () => pickFrom(galInput));

  const confirm = async () => {
    if (!source) return;
    const m = mask || await loadImg(`${B}art/profile/champ_face_mask.png`);
    const blob = await renderFaceOverlay(source, tf, m);
    if (blob) { await getFaceStore().save(blob); await loadCustomFace(); }
    source = null;                            // drop the original after processing
    onChanged?.(); root.remove();
  };
  const del = async () => { await getFaceStore().remove(); setCustomFaceImage(null); onChanged?.(); render(); };

  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el === root || el.closest('[data-act="close"]')) { root.remove(); return; }
    const act = (el.closest('[data-act]') as HTMLElement | null)?.dataset.act;
    if (act === 'camera') camInput.click();
    else if (act === 'gallery') galInput.click();
    else if (act === 'use') void confirm();
    else if (act === 'cancel') { source = null; render(); }
    else if (act === 'delete') void del();
  });

  render();
  document.body.appendChild(root);
}

function mkFileInput(camera: boolean): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = 'image/*'; i.style.display = 'none';
  if (camera) i.setAttribute('capture', 'user');
  return i;
}
function twoDist(pts: Map<number, { x: number; y: number }>): number {
  const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y);
}
function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
}

export { MAX_ROTATION_RAD };
