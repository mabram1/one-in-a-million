/**
 * Seeded track generation (task P1-05, handbook "deterministic generation").
 *
 * Fixes audit C3: obstacle layout, canal shape and particles must be
 * reproducible from a seed so a challenge ghost — and every player in a live
 * room — can race the exact same track. This is behavior-PRESERVING: the same
 * probability thresholds and ranges are used, only the entropy source changed
 * from global Math.random to a per-race seeded generator.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mulberry32, randomSeed } from '../../src/game/content/prng';
import { setupGame, type Harness } from '../setup/harness';

describe('mulberry32 PRNG', () => {
  it('produces the same stream for the same seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const sa = Array.from({ length: 12 }, () => a());
    const sb = Array.from({ length: 12 }, () => b());
    expect(sa).toEqual(sb);
  });

  it('produces a different stream for a different seed', () => {
    const a = Array.from({ length: 12 }, mulberry32(42));
    const c = Array.from({ length: 12 }, mulberry32(43));
    expect(a).not.toEqual(c);
  });

  it('stays within [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randomSeed returns a 32-bit unsigned integer', () => {
    const s = randomSeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('same seed ⇒ identical track', () => {
  let h: Harness;
  beforeAll(() => { h = setupGame(); });
  afterAll(() => h.restore());

  /** Race once at a fixed seed and snapshot the generated world. */
  function raceOnce(seed: number) {
    h.G._seedOverride = seed;
    const chip = [...document.querySelectorAll('#distChips .chip')]
      .find((c) => (c as HTMLElement).dataset.m === '1000') as HTMLElement;
    chip.click();
    (document.getElementById('practicePlay') as HTMLElement).click();  // beginPlay → resetRun(seed)
    h.step(2200);            // countdown → charging
    h.shakeFor(4.4);         // deterministic launch input
    h.stepUntilState('playing', 2000);
    h.step(4000);            // let a stretch of track generate and scroll
    return {
      raceSeed: h.G.raceSeed,
      canalSeed: +h.G.canalSeed.toFixed(6),
      obstacles: h.G.obstacles.map((o: any) =>
        o.type === 'cell'
          ? `cell:${Math.round(o.world)}:${o.lane.toFixed(3)}:${Math.round(o.r)}`
          : `band:${Math.round(o.world)}:${o.gapLane.toFixed(3)}:${o.gapHalf.toFixed(3)}`),
    };
  }

  it('reproduces the exact obstacle layout and canal shape', () => {
    const a = raceOnce(0x1234abcd);
    const b = raceOnce(0x1234abcd);
    expect(b.raceSeed).toBe(a.raceSeed);
    expect(b.canalSeed).toBe(a.canalSeed);
    expect(b.obstacles).toEqual(a.obstacles);
    expect(a.obstacles.length).toBeGreaterThan(0);   // it actually generated something
  });

  it('produces a different track for a different seed', () => {
    const a = raceOnce(0x1234abcd);
    const c = raceOnce(0x0000beef);
    expect(c.canalSeed).not.toBe(a.canalSeed);
    expect(c.obstacles).not.toEqual(a.obstacles);
  });
});
