/**
 * Fair obstacles in narrow sections (req 1).
 *
 * Once the canal tapers, a shaking player has limited steering, so hazards must
 * stay fair: single cells pinned near a wall (never a centre blocker), no
 * clusters, and membrane openings kept inside the reachable lane — always leaving
 * a readable safe route. Generation is the REAL seeded spawner.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';

let h: Harness;
const PX = () => h.tuning.camera.pxPerUnit;

beforeEach(() => { h = setupGame(); });

/** Pose deep in the tapering zone (before the obstacle-free sprint) and let the
 *  real spawner fill the track ahead, then collect what it produced. */
function obstaclesInNarrowZone(): any[] {
  h.setLevelLength(1000 * PX());
  const LEVEL = 1000 * PX();
  const at = Math.round(LEVEL * 0.8);          // ~80% — well into the narrowing, before the sprint
  // Deterministic generation: a fixed PRNG + canal phase so the assertions don't
  // depend on the process's Math.random state (seeded generation is the point).
  let s = 0x1234abcd;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
  Object.assign(h.G, {
    state: 'playing', mode: 'level', sprint: false, speed: 0, xNorm: 0,
    obstacles: [], pickups: [], distance: at, prevDistance: at, nextSpawn: at,
    finished: false, _committed: false, rng, canalSeed: 0,
  });
  h.MP.active = false;
  h.step(64);                                   // run spawnAhead a few frames (speed 0 => distance stays)
  const horizon = at + 240;
  return h.G.obstacles.filter((o: any) => o.world >= at && o.world <= horizon);
}

describe('narrow-section obstacles stay passable', () => {
  it('places single cells near a wall (no unavoidable centre blocker) and no clusters', () => {
    const obs = obstaclesInNarrowZone();
    const cells = obs.filter((o) => o.type === 'cell');
    expect(cells.length).toBeGreaterThan(0);          // the spawner did produce hazards here

    for (const c of cells) {
      // Pinned toward a wall — leaves the opposite side open as a safe corridor.
      expect(Math.abs(c.lane)).toBeGreaterThanOrEqual(0.7);
      expect(Math.abs(c.lane)).toBeLessThanOrEqual(1.0);
    }

    // No two cells at (almost) the same depth on opposite walls (that would block both routes).
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (Math.abs(cells[i].world - cells[j].world) < 12) {
          expect(Math.sign(cells[i].lane)).toBe(Math.sign(cells[j].lane));   // same side, corridor intact
        }
      }
    }
  });

  it('keeps every membrane opening inside the reachable lane (a readable gap)', () => {
    const bands = obstaclesInNarrowZone().filter((o) => o.type === 'band');
    for (const b of bands) {
      const lo = b.gapLane - b.gapHalf, hi = b.gapLane + b.gapHalf;
      expect(lo).toBeGreaterThan(-1);                 // opening fully inside [-1, 1]
      expect(hi).toBeLessThan(1);
      expect(b.gapHalf).toBeGreaterThan(0.12);         // and wide enough to read/steer into
    }
  });
  // (Seeded determinism of generation is covered by seeded-generation.test.ts.)
});
