/**
 * Replay / challenge codec — PURE functions, no DOM, canvas, or game state.
 *
 * A run is stored as a distance-per-0.1s curve, delta-encoded into a compact
 * base64 string. The v2 challenge wraps that payload with a header carrying the
 * track seed + tuning version so the recipient races the SAME seeded track
 * (handbook 7.15, tasks P1-05/P1-06). v1 (bare payload) still decodes.
 *
 * This module is intentionally free of game/rendering dependencies so it can be
 * unit-tested in isolation and reused by any renderer (audit P1-08).
 */

export const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Delta-encode a monotonic distance curve (metres of world units) to base64. */
export function encodeDeltas(dists: readonly number[]): string {
  let out = '', prev = 0;
  for (const d of dists) {
    const r = Math.round(d);
    const delta = Math.max(0, Math.min(63, r - prev));
    out += B64[delta];
    prev += delta;
  }
  return out;
}

export function decodeDeltas(str: string): number[] {
  const dists: number[] = [];
  let cur = 0;
  for (const ch of str) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    cur += v;
    dists.push(cur);
  }
  return dists;
}

/** Sampled at 0.1s intervals; linearly interpolate the ghost's position at time `t` (seconds). */
export function interpolateAt(dists: readonly number[], t: number): number {
  if (!dists || !dists.length) return 0;
  const idx = t / 0.1, i = Math.floor(idx);
  if (i >= dists.length - 1) return dists[dists.length - 1];
  const f = idx - i;
  return dists[i] * (1 - f) + dists[i + 1] * f;
}

export function fnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface DecodedChallenge {
  version: 1 | 2;
  seed: number | null;
  distM: number | null;
  tv: string | null;
  durMs: number;
  dists: number[];
  valid: boolean;
}

/** v2 wire format: 2~<seed36>~<distM36>~<tuningVersion>~<durMs36>~<fnv1aChk36>~<deltas> */
export function encodeChallengeCode(o: {
  seed: number; distM: number; tuningVersion: string; durMs: number; dists: readonly number[];
}): string {
  const deltas = encodeDeltas(o.dists);
  return [
    '2',
    (o.seed >>> 0).toString(36),
    Math.round(o.distM).toString(36),
    o.tuningVersion,
    Math.round(o.durMs).toString(36),
    fnv1a(deltas).toString(36),
    deltas,
  ].join('~');
}

export function decodeChallengeCode(raw: string): DecodedChallenge {
  raw = String(raw || '').trim();
  if (raw.slice(0, 2) === '2~') {
    const parts = raw.split('~');
    if (parts.length >= 7) {
      const deltas = parts.slice(6).join('~');
      return {
        version: 2,
        seed: parseInt(parts[1], 36) >>> 0,
        distM: parseInt(parts[2], 36),
        tv: parts[3],
        durMs: parseInt(parts[4], 36),
        dists: decodeDeltas(deltas),
        valid: fnv1a(deltas).toString(36) === parts[5],
      };
    }
  }
  // legacy v1: bare delta payload, no seed → not a fair comparison
  const dists = decodeDeltas(raw);
  return { version: 1, seed: null, distM: null, tv: null, durMs: dists.length * 100, dists, valid: dists.length >= 3 };
}
