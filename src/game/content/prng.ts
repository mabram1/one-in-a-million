/**
 * Deterministic pseudo-random generator for TRACK GENERATION.
 *
 * The obstacle layout, canal shape, and ambient particles must be reproducible
 * from a seed so that a challenge ghost — and every player in a live room —
 * races the exact same track (audit C3 / task P1-05).
 *
 * mulberry32: tiny, fast, well-distributed 32-bit generator. Same seed ⇒ same
 * stream. NOT for anything security-sensitive.
 *
 * Note: this replaces Math.random ONLY inside track generation. Cosmetic and
 * identity randomness (audio noise, room codes, rival-AI pacing, screen shake)
 * deliberately keep Math.random — they are not part of the reproducible world.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh 32-bit seed. The seed itself may be non-deterministic; generation from it is not. */
export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
