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
  // proof cosmetics (Phase 2)
  hat_party: 'cosmetics/hat/hat_party.png',
  trail_rainbow: 'cosmetics/trail/trail_rainbow.png',
  // HUD button art (applied via .src so paths resolve on dev/build/Pages alike)
  boost_normal: 'ui/buttons/boost_normal.png',
  shield_normal: 'ui/buttons/shield_normal.png',
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
};

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
    if (art.rig) art.ready = true;
  } catch {
    art.ready = false;   // keep the procedural fallback
  }
}
