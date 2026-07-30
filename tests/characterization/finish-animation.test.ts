/**
 * Finish absorption animation — "The Million-Dollar Plop"
 * (spec: docs/gameplay/FINISH_ABSORPTION_ANIMATION.md).
 *
 * The animation is PRESENTATION ONLY. These tests lock the non-negotiable
 * contract: the authoritative result is committed on the crossing frame and the
 * cosmetic sequence can never change finish time, score, placement or replay
 * data, nor reveal the results overlay early. They drive the REAL shipped loop.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';

let h: Harness;

const PX = () => h.tuning.camera.pxPerUnit;
const levelPx = (metres = 1000) => metres * PX();
const OVUM_RADIUS = () => 75;   // OVUM_D (150) / 2 — the ovum's base on-screen radius

const realMatchMedia = (window as any).matchMedia;

/**
 * Pose the game one frame short of the egg, at sprint speed, so the very next
 * loop frame crosses `G.distance >= LEVEL_LENGTH`. Mirrors poseRacing in the
 * protected-behavior suite: obstacles cleared and the spawner parked far ahead.
 */
function poseAtEggEdge(opts: Partial<Record<string, unknown>> = {}) {
  h.setLevelLength(levelPx(1000));
  const LEVEL = levelPx(1000);
  Object.assign(h.G, {
    state: 'playing', mode: 'level', sprint: true, boostOn: false, boosting: 0,
    strokes: [], speed: h.tuning.momentum.overCap, xNorm: 0, steer: 0, steerTarget: 0,
    obstacles: [], pickups: [], nextSpawn: LEVEL + 1_000_000, canalSeed: 0,
    shieldActive: false, hits: 0, score: 1234, elapsed: 10, finished: false,
    _committed: false, _commitCount: 0, finishAnim: null, _result: null,
    ghost: null, ghostRec: [1, 2, 3, 4, 5, 6, 7, 8],
    distance: LEVEL - 0.5, prevDistance: LEVEL - 0.5,
    ...opts,
  });
  h.MP.active = false;
}

/**
 * Cross the finish line. A few 16 ms frames: the harness's very first loop frame
 * after boot has dt=0 (the clock is only just anchored), so the first frame never
 * advances distance — a short burst guarantees the crossing while staying far
 * inside the 550/1450 ms animation window.
 */
function crossTheLine() { h.step(64); }

beforeEach(() => {
  h = setupGame();
  try { localStorage.clear(); } catch { /* jsdom */ }
});
afterEach(() => { h.restore(); (window as any).matchMedia = realMatchMedia; });

describe('authoritative finish (locked on the crossing frame)', () => {
  it('enters the presentation-only "finishing" state and keeps results hidden', () => {
    poseAtEggEdge();
    crossTheLine();
    expect(h.G.state).toBe('finishing');
    expect(h.G.finished).toBe(true);
    expect((document.getElementById('end') as HTMLElement).classList.contains('hidden')).toBe(true);
  });

  it('locks finish time and score on the crossing frame', () => {
    poseAtEggEdge();
    crossTheLine();
    expect(h.G.finishElapsed).toBe(h.G.elapsed);      // captured, not a live value
    expect(h.G.finishScore).toBe(h.G.score);
    expect(h.G.finishElapsed).toBeGreaterThan(10);    // includes the crossing frame's dt
  });

  it('does not advance elapsed time (or score) during the animation', () => {
    poseAtEggEdge();
    crossTheLine();
    const lockedElapsed = h.G.elapsed;
    const lockedScore = h.G.score;
    h.step(800);                                       // deep into the cosmetic sequence
    expect(h.G.state).toBe('finishing');               // still animating
    expect(h.G.elapsed).toBe(lockedElapsed);
    expect(h.G.score).toBe(lockedScore);
  });

  it('commits exactly once — repeated crossings cannot re-commit (idempotent)', () => {
    poseAtEggEdge();
    crossTheLine();
    expect(h.G._commitCount).toBe(1);
    h.step(2000);                                      // run the whole animation to results
    expect(h.G.state).toBe('end');
    expect(h.G._commitCount).toBe(1);
    // Even if the crossing condition recurs, a finished run never commits again.
    h.G.state = 'playing'; h.G.distance = levelPx(1000) + 500;   // finished is still true
    h.step(64);
    expect(h.G._commitCount).toBe(1);
  });
});

describe('multiplayer finish authority', () => {
  it('broadcasts our finish exactly once (not twice) on the crossing frame', () => {
    poseAtEggEdge();
    const sent: any[] = [];
    h.MP.active = true; h.MP.started = true; h.MP.id = 'me'; h.MP.name = 'me';
    h.MP.peers = {}; h.MP.finishes = {};
    h.MP.send = (p: any) => sent.push(p);
    crossTheLine();
    const finishBroadcasts = sent.filter((p) => p.fin === 1).length;
    expect(finishBroadcasts).toBe(1);
    // Running the animation forward does not fire another synchronous finish send.
    h.step(1000);
    expect(sent.filter((p) => p.fin === 1).length).toBe(1);
  });
});

describe('results are delayed only visually', () => {
  it('keeps #end hidden until the 1500 ms sequence completes, then shows it', () => {
    poseAtEggEdge();
    crossTheLine();
    const end = document.getElementById('end') as HTMLElement;

    h.step(1000);                                      // < 1500 ms
    expect(h.G.state).toBe('finishing');
    expect(end.classList.contains('hidden')).toBe(true);

    h.step(600);                                       // past the total duration
    expect(h.G.state).toBe('end');
    expect(end.classList.contains('hidden')).toBe(false);
  });
});

describe('Reduced Motion', () => {
  const realMM = (window as any).matchMedia;
  afterEach(() => { (window as any).matchMedia = realMM; });

  it('uses the shorter 600 ms sequence', () => {
    (window as any).matchMedia = () => ({ matches: true });
    poseAtEggEdge();
    crossTheLine();
    expect(h.G.finishAnim).not.toBeNull();
    expect(h.G.finishAnim.durationMs).toBe(600);
    expect(h.G.finishAnim.reduced).toBe(true);
  });

  it('uses the full 1500 ms sequence when reduced motion is off', () => {
    (window as any).matchMedia = () => ({ matches: false });
    poseAtEggEdge();
    crossTheLine();
    expect(h.G.finishAnim.durationMs).toBe(1500);
  });
});

describe('skip', () => {
  it('a tap after 450 ms jumps to results without changing the locked finish', () => {
    (window as any).matchMedia = () => ({ matches: false });
    poseAtEggEdge();
    crossTheLine();
    h.step(500);                                       // past the 450 ms skip threshold, well before 1450

    const lockedElapsed = h.G.finishElapsed;
    const lockedScore = h.G.finishScore;
    const liveElapsed = h.G.elapsed;

    window.dispatchEvent(new Event('pointerdown'));    // skip

    expect(h.G.state).toBe('end');
    expect(h.G.finishElapsed).toBe(lockedElapsed);
    expect(h.G.finishScore).toBe(lockedScore);
    expect(h.G.elapsed).toBe(liveElapsed);             // untouched by the skip
  });

  it('a tap before 450 ms is ignored (no accidental skip)', () => {
    (window as any).matchMedia = () => ({ matches: false });
    poseAtEggEdge();
    crossTheLine();
    h.step(300);                                       // before the skip threshold
    window.dispatchEvent(new Event('pointerdown'));
    expect(h.G.state).toBe('finishing');               // still animating
  });
});

describe('the ovum stays visible', () => {
  it('is drawn on every frame of the sequence and never shrinks below its base size', () => {
    (window as any).matchMedia = () => ({ matches: false });
    poseAtEggEdge();
    crossTheLine();
    const framesBefore = h.G._eggFrames;
    // Sample the ovum size across impact, entering and close phases.
    const base = OVUM_RADIUS();
    for (const _ of [0, 1, 2, 3]) {
      h.step(300);
      const ff = h.finishFrame();
      if (!ff) break;                                  // reached results after the last step
      expect(ff.ovumRx).toBeGreaterThanOrEqual(base - 0.001);   // never shrunk/removed
      expect(ff.ovumRy).toBeGreaterThanOrEqual(base - 0.001);
    }
    expect(h.G._eggFrames - framesBefore).toBeGreaterThan(5);    // the ovum kept rendering
  });

  it('the shipped renderer never draws egg_rays', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/game/legacy/game.ts'), 'utf8');
    expect(/art\.img\.egg_rays/.test(src)).toBe(false);
  });
});

describe('Champ enters the ovum', () => {
  it('is still visible while entering and only fully hidden after the entry completes', () => {
    (window as any).matchMedia = () => ({ matches: false });
    poseAtEggEdge();
    crossTheLine();

    // Mid-entry (~600 ms): Champ is still visible (passing through the membrane).
    h.step(560);
    const entering = h.finishFrame();
    expect(entering.champAlpha).toBeGreaterThan(0);

    // After the entry completes (~1050 ms, seal phase): Champ is fully hidden.
    h.step(460);
    const inside = h.finishFrame();
    expect(inside.champAlpha).toBe(0);
    expect(h.G.state).toBe('finishing');               // but the ovum sequence is still on screen
  });
});
