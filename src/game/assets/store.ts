/**
 * Runtime art store + loader (Phase 2 asset integration).
 *
 * Loads the Spermy rig layers, expressions and equipped cosmetics as <img>
 * elements the canvas renderer can draw. Everything is optional: until
 * `art.ready` flips true the game keeps drawing its procedural fallback, so a
 * slow/failed load never blocks play.
 */

export interface RigAnchor { x: number; y: number; }
export interface Rig {
  canvas: { width: number; height: number };
  anchors: Record<string, RigAnchor>;
  z_order: Record<string, number>;
}
export interface Cosmetic {
  id: string; name: string; slot: string; rarity: string;
  price: { currency: string; amount: number };
  thumb: string; asset: string; z: number;
}

/** Keyed images the renderer asks for by name. */
const IMAGE_PATHS: Record<string, string> = {
  body: 'spermy/base_body.png',
  tail_default: 'spermy/tail_default.png',
  face_idle: 'spermy/face_idle.png',
  face_charging: 'spermy/face_charging.png',
  face_determined: 'spermy/face_determined.png',
  face_hit: 'spermy/face_hit.png',
  face_win: 'spermy/face_win.png',
  // (individual cosmetics are loaded by id from cosmetics.json — see loadArt)
  // HUD button art (applied via .src so paths resolve on dev/build/Pages alike)
  boost_normal: 'ui/buttons/boost_normal.png',
  shield_normal: 'ui/buttons/shield_normal.png',
  // canal wall membrane textures + deep-tunnel backdrop
  wall_left: 'walls/wall_left.png',
  wall_right: 'walls/wall_right.png',
  tunnel_bg: 'game_world/tunnel_bg.png',
  // gameplay world (Phase 3)
  wbc_s: 'obstacles/wbc_s.png',
  wbc_m: 'obstacles/wbc_m.png',
  wbc_l: 'obstacles/wbc_l.png',
  virus_s: 'obstacles/virus_s.png',
  virus_m: 'obstacles/virus_m.png',
  virus_l: 'obstacles/virus_l.png',
  cell_cluster: 'obstacles/cell_cluster.png',
  immune_pod: 'obstacles/immune_pod.png',
  rbc: 'obstacles/rbc.png',
  membrane: 'obstacles/membrane.png',
  star: 'pickups/star.png',
  shield: 'pickups/shield.png',
  speedorb: 'pickups/speedorb.png',
  checkpoint_ring: 'pickups/checkpoint_ring.png',
  egg: 'goal/egg.png',
  egg_halo: 'goal/egg_halo.png',
  egg_rays: 'goal/egg_rays.png',
};

/** What Spermy is wearing. Slots map to an image key (or null = nothing). */
export interface Equipped {
  skin: string | null; glasses: string | null; mouth: string | null;
  hat: string | null; trail: string | null; aura: string | null;
}

// Classic default look (no cosmetics) — matches the original feel. Cosmetics are
// chosen in the Customize screen (Phase 4) and persisted to localStorage.
const DEFAULT_EQUIPPED: Equipped = {
  skin: null, glasses: null, mouth: null,
  hat: null, trail: null, aura: null,
};

export const art = {
  ready: false,
  img: {} as Record<string, HTMLImageElement>,
  rig: null as Rig | null,
  cosmetics: [] as Cosmetic[],
  equipped: loadEquipped(),
  /** Player's "My Face" overlay (512×768, replaces the expression face). */
  customFace: null as HTMLImageElement | null,
  customFaceReady: false,
};

/** True when a custom face overlay should replace the expression faces. */
export function hasCustomFace(): boolean { return art.customFaceReady && !!art.customFace; }

/** Set (or clear with null) the custom face overlay image the renderer draws. */
export function setCustomFaceImage(img: HTMLImageElement | null): void {
  if (art.customFace && (art.customFace as any)._url) { try { URL.revokeObjectURL((art.customFace as any)._url); } catch { /* */ } }
  art.customFace = img;
  art.customFaceReady = !!img;
}

/** Load the stored custom-face overlay Blob into an <img> for the renderer. */
export async function loadCustomFace(): Promise<void> {
  try {
    const { getFaceStore } = await import('../../app/face/faceStore');
    const blob = await getFaceStore().load();
    if (!blob) { setCustomFaceImage(null); return; }
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    (img as any)._url = url;
    setCustomFaceImage(img);
  } catch { setCustomFaceImage(null); }
}

function loadEquipped(): Equipped {
  try {
    const raw = localStorage.getItem('oiam_equipped');
    if (raw) return { ...DEFAULT_EQUIPPED, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_EQUIPPED };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + url));
    img.src = url;
  });
}

/** Load the art set. Non-fatal: on any error we simply stay on the procedural fallback. */
export async function loadArt(base: string = import.meta.env.BASE_URL): Promise<void> {
  const root = `${base}art/`;
  try {
    const entries = Object.entries(IMAGE_PATHS);
    const imgs = await Promise.all(entries.map(([, p]) => loadImage(root + p)));
    entries.forEach(([key], i) => { art.img[key] = imgs[i]; });

    const [rig, cosmetics] = await Promise.all([
      fetch(root + 'spermy/spermy-rig.json').then((r) => r.json()).catch(() => null),
      fetch(root + 'cosmetics.json').then((r) => r.json()).catch(() => []),
    ]);
    art.rig = rig;
    art.cosmetics = cosmetics || [];
    // Load every cosmetic's full-size overlay, keyed by its id, so the renderer and
    // the Customize screen can use them.
    await Promise.all(art.cosmetics.map((c) =>
      loadImage(root + c.asset).then((im) => { art.img[c.id] = im; }).catch(() => { /* skip missing */ }),
    ));
    if (art.rig) art.ready = true;
  } catch {
    art.ready = false;   // keep the procedural fallback
  }
}

/** Equip (or clear with null) a cosmetic slot and persist it. Rendering reads art.equipped live. */
export function equip(slot: keyof Equipped, id: string | null): void {
  art.equipped[slot] = id;
  try { localStorage.setItem('oiam_equipped', JSON.stringify(art.equipped)); } catch { /* ignore */ }
}
