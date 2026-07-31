/**
 * My Face — processing + persistence + render-layer selection.
 * No camera, no real IndexedDB (in-memory backend), no real canvas compositing
 * (a fake canvas factory verifies size + mask compositing + Blob output).
 */
import { describe, it, expect } from 'vitest';
import {
  FACE_W, FACE_H, MAX_ROTATION_RAD, clampFaceTransform, faceRenderLayers, renderFaceOverlay,
} from '../../src/app/face/faceProcessor';
import { FaceStore, memoryBackend, CUSTOM_FACE_KEY } from '../../src/app/face/faceStore';

describe('faceProcessor — geometry & layers', () => {
  it('the overlay contract is a 512×768 rig canvas', () => {
    expect(FACE_W).toBe(512);
    expect(FACE_H).toBe(768);
  });

  it('clamps rotation to ±15° and scale to a sane range', () => {
    const hi = clampFaceTransform({ x: 0, y: 0, scale: 999, rotation: 3 });
    expect(hi.rotation).toBeCloseTo(MAX_ROTATION_RAD, 6);
    expect(hi.scale).toBeLessThanOrEqual(8);
    const lo = clampFaceTransform({ x: 0, y: 0, scale: 0.0001, rotation: -3 });
    expect(lo.rotation).toBeCloseTo(-MAX_ROTATION_RAD, 6);
    expect(lo.scale).toBeGreaterThan(0);
  });

  it('a custom face replaces the expression face (render-layer selection)', () => {
    const withFace = faceRenderLayers(true);
    expect(withFace.drawCustomFace).toBe(true);
    expect(withFace.drawExpression).toBe(false);
    const noFace = faceRenderLayers(false);
    expect(noFace.drawCustomFace).toBe(false);
    expect(noFace.drawExpression).toBe(true);
  });
});

describe('renderFaceOverlay — output size + mask clip', () => {
  function fakeCanvasFactory() {
    const ops: string[] = [];
    const ctx: any = {
      clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
      drawImage() { ops.push('draw'); },
      set globalCompositeOperation(v: string) { ops.push('gco:' + v); },
      get globalCompositeOperation() { return 'source-over'; },
    };
    const canvas: any = { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob) => void) => cb(new Blob(['png'])) };
    return { factory: (_w: number, _h: number) => canvas, canvas, ops };
  }

  it('always renders a 512×768 PNG blob and clips with the mask (destination-in)', async () => {
    const f = fakeCanvasFactory();
    const source: any = { width: 100, height: 120 };
    const mask: any = { width: 512, height: 768 };
    const blob = await renderFaceOverlay(source, { x: 256, y: 260, scale: 1, rotation: 0 }, mask, f.factory);

    expect(f.canvas.width).toBe(512);
    expect(f.canvas.height).toBe(768);
    expect(blob).toBeInstanceOf(Blob);
    expect(f.ops).toContain('gco:destination-in');   // the head-window clip
    expect(f.ops.filter((o) => o === 'draw').length).toBe(2);   // source + mask
  });
});

describe('faceStore — persistence & deletion', () => {
  it('saves, loads, reports presence and deletes the overlay', async () => {
    const store = new FaceStore(memoryBackend());
    expect(await store.has()).toBe(false);
    expect(await store.load()).toBeNull();

    const blob = new Blob(['overlay-bytes'], { type: 'image/png' });
    await store.save(blob);
    expect(await store.has()).toBe(true);
    expect(await store.load()).toBe(blob);

    await store.remove();
    expect(await store.has()).toBe(false);
    expect(await store.load()).toBeNull();
  });

  it('uses a single stable key', () => {
    expect(CUSTOM_FACE_KEY).toBe('oiam_custom_face_v1');
  });
});
