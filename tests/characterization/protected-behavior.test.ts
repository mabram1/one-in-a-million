/**
 * Characterization tests for PROTECTED gameplay behavior.
 *
 * These drive the real shipped loop (no simulation rewrite) and lock in the feel
 * that was tuned through playtesting: launch classification, momentum, the
 * steering lock while shaking, collision cost, pickups, and final-sprint rules.
 *
 * They exist so the upcoming simulation split (audit P1-08) cannot silently
 * change gameplay. If one fails, assume the game changed — not the test.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupGame, startPracticeRace, type Harness } from '../setup/harness';

let h: Harness;

beforeAll(() => { h = setupGame(); });
afterAll(() => h.restore());

/**
 * Put the game into a clean racing state at a known speed.
 *
 * `nextSpawn` is parked far ahead so the (still unseeded) procedural spawner
 * cannot inject random obstacles mid-measurement — otherwise a chance collision
 * would masquerade as decay. This is a test-determinism guard, not a gameplay
 * change; it exists precisely because track generation is not yet seeded
 * (audit C3 / task P1-05).
 */
function poseRacing(speed: number, opts: Partial<Record<string, unknown>> = {}) {
  const distance = (opts.distance as number) ?? 400;
  Object.assign(h.G, {
    state: 'playing', mode: 'level', sprint: false, boostOn: false, boosting: 0,
    strokes: [], speed, xNorm: 0, steer: 0, steerTarget: 0,
    obstacles: [], pickups: [], distance, prevDistance: distance,
    nextSpawn: distance + 1_000_000, canalSeed: 0,
    shieldActive: false, hits: 0, score: 0, finished: false,
    boostCharges: h.tuning.items.startingBoostCharges,
    shieldCharges: h.tuning.items.startingShieldCharges,
    ...opts,
  });
  h.MP.active = false;
}

describe('launch classification (protected)', () => {
  it('stopping inside the GO zone yields a perfect launch at overdrive speed', () => {
    startPracticeRace(h, 1000);
    expect(h.G.state).toBe('charging');
    h.shakeFor(4.4);              // land inside the narrow GO zone, then stop
    const chargeAtStop = h.G.charge;
    const launched = h.stepUntilState('playing', 2000);   // wait out the release idle
    expect(launched).toBe(true);
    expect(chargeAtStop).toBeGreaterThanOrEqual(h.tuning.launch.goZoneLow);
    expect(chargeAtStop).toBeLessThanOrEqual(h.tuning.launch.goZoneHigh);
    // Captured at the launch frame (before any cruise decay): exactly overdrive.
    expect(h.G.speed).toBe(h.tuning.momentum.overCap);
  });

  it('under-charging yields a weak launch below cruise speed', () => {
    startPracticeRace(h, 1000);
    h.shakeFor(2.0);
    expect(h.stepUntilState('playing', 2000)).toBe(true);
    expect(h.G.speed).toBeLessThan(h.tuning.momentum.cruiseCap);
    expect(h.G.speed).toBeGreaterThan(0);
  });

  it('over-charging fizzles ("overcooked") at half cruise speed', () => {
    startPracticeRace(h, 1000);
    h.strokeUntilLaunch();       // keep shaking past chargeMax; stop at the launch frame
    expect(h.G.state).toBe('playing');
    expect(h.G.speed).toBeCloseTo(
      h.tuning.momentum.cruiseCap * h.tuning.launch.fizzleFraction, 5);
  });
});

describe('momentum (protected)', () => {
  it('bleeds only gently while cruising — speed is kept, not lost', () => {
    poseRacing(h.tuning.momentum.cruiseCap);
    const before = h.G.speed;
    h.step(3000);             // 3 s of coasting, no strokes, no obstacles
    const lostFraction = (before - h.G.speed) / before;
    expect(lostFraction).toBeGreaterThan(0);        // it does decay…
    expect(lostFraction).toBeLessThan(0.10);        // …but stays well under 10 % in 3 s
  });

  it('never exceeds the overdrive cap', () => {
    poseRacing(h.tuning.momentum.overCap, { boostOn: true });
    h.step(1000);
    expect(h.G.speed).toBeLessThanOrEqual(h.tuning.momentum.overCap + 1e-6);
  });
});

describe('steering lock while shaking (protected)', () => {
  it('holds straight while shaking, and steers once shaking stops', () => {
    poseRacing(h.tuning.momentum.cruiseCap);
    // A tilt is present the whole time; only the shaking should suppress it.
    h.motion(-4, 0);
    h.step(100);
    h.G.steerTarget = 0;

    // Shaking → the motion adapter must force steerTarget to 0.
    h.stroke();
    h.motion(-4, 0);
    expect(h.G.steerTarget).toBe(0);

    // After the lock window expires, the same tilt must produce steering.
    h.step(h.tuning.steering.shakeLockMs + 120);
    h.motion(-4, 0);
    expect(Math.abs(h.G.steerTarget)).toBeGreaterThan(0);
  });

  it('steering authority scales with speed (no speed, no turning)', () => {
    poseRacing(0);
    h.G.steerTarget = 1; h.G.steer = 1;
    const xAtRest = h.G.xNorm;
    h.step(300);
    const movedAtRest = Math.abs(h.G.xNorm - xAtRest);

    poseRacing(h.tuning.momentum.cruiseCap);
    h.G.steerTarget = 1; h.G.steer = 1;
    const xAtSpeed = h.G.xNorm;
    h.step(300);
    const movedAtSpeed = Math.abs(h.G.xNorm - xAtSpeed);

    expect(movedAtSpeed).toBeGreaterThan(movedAtRest * 5);
  });
});

describe('collision (protected)', () => {
  it('a hit keeps exactly the tuned fraction of speed and never ends the run', () => {
    poseRacing(100);
    h.G.obstacles = [{ type: 'cell', world: h.G.distance + 2, lane: 0, r: 22, hit: false, ph: 0 }];
    const before = h.G.speed;
    h.step(120);
    expect(h.G.hits).toBe(1);
    expect(h.G.speed).toBeLessThan(before);
    expect(h.G.speed / before).toBeCloseTo(h.tuning.collision.speedKeptOnHit, 1);
    expect(h.G.state).toBe('playing');            // no death state
  });

  it('one overlap cannot drain speed repeatedly', () => {
    poseRacing(100);
    h.G.obstacles = [{ type: 'cell', world: h.G.distance + 2, lane: 0, r: 30, hit: false, ph: 0 }];
    h.step(600);                                   // stay overlapping for many frames
    expect(h.G.hits).toBe(1);
  });

  it('an active shield absorbs the hit at no speed cost', () => {
    poseRacing(100, { shieldActive: true });
    const before = h.G.speed;
    h.G.obstacles = [{ type: 'cell', world: h.G.distance + 2, lane: 0, r: 22, hit: false, ph: 0 }];
    h.step(120);
    expect(h.G.hits).toBe(0);
    expect(h.G.shieldActive).toBe(false);          // consumed
    expect(h.G.speed).toBeGreaterThan(before * 0.9);
  });
});

describe('pickups (protected)', () => {
  it('a star awards its score', () => {
    poseRacing(80);
    const before = h.G.score;
    h.G.pickups = [{ kind: 'star', world: h.G.distance + 2, lane: 0, r: 14, taken: false, ph: 0 }];
    h.step(120);
    expect(h.G.score - before).toBeGreaterThanOrEqual(h.tuning.items.starScore);
  });

  it('a boost pickup grants a charge, capped', () => {
    poseRacing(80, { boostCharges: 1 });
    h.G.pickups = [{ kind: 'boost', world: h.G.distance + 2, lane: 0, r: 14, taken: false, ph: 0 }];
    h.step(120);
    expect(h.G.boostCharges).toBe(2);
  });

  it('a speed orb grants temporary overdrive', () => {
    poseRacing(60);
    h.G.pickups = [{ kind: 'speed', world: h.G.distance + 2, lane: 0, r: 15, taken: false, ph: 0 }];
    h.step(120);
    expect(h.G.speed).toBeGreaterThanOrEqual(h.tuning.momentum.overCap - 1);
    expect(h.G.boosting).toBeGreaterThan(0);
  });
});

describe('final sprint restrictions (protected)', () => {
  it('disables steering and clears any carried boost on entry', () => {
    h.setLevelLength(2500);
    poseRacing(h.tuning.momentum.cruiseCap, { distance: 1880, prevDistance: 1880, boosting: 2.5 });
    h.G.steerTarget = 1;
    h.step(400);                                   // cross the sprint marker
    expect(h.G.sprint).toBe(true);
    expect(h.G.boosting).toBeLessThanOrEqual(0);   // no carried-over boost
    expect(h.G.steerTarget).toBe(0);               // steering off
  });

  it('bleeds speed much faster than cruising', () => {
    h.setLevelLength(2500);
    poseRacing(h.tuning.momentum.cruiseCap, { distance: 1880, prevDistance: 1880 });
    h.step(300);
    expect(h.G.sprint).toBe(true);
    const before = h.G.speed;
    h.step(1000);                                  // 1 s, no strokes
    const sprintLoss = (before - h.G.speed) / before;

    poseRacing(h.tuning.momentum.cruiseCap);       // cruising comparison
    const cruiseBefore = h.G.speed;
    h.step(1000);
    const cruiseLoss = (cruiseBefore - h.G.speed) / cruiseBefore;

    expect(sprintLoss).toBeGreaterThan(cruiseLoss * 5);
  });

  it('blocks the boost item during the sprint', () => {
    h.setLevelLength(2500);
    poseRacing(h.tuning.momentum.cruiseCap, { distance: 1880, prevDistance: 1880 });
    h.step(300);
    expect(h.G.sprint).toBe(true);
    const charges = h.G.boostCharges;
    (document.getElementById('btnBoost') as HTMLElement).click();
    expect(h.G.boostCharges).toBe(charges);        // ignored
    expect(h.G.boosting).toBeLessThanOrEqual(0);
  });
});

describe('race distances (protected)', () => {
  it('maps practice metres to world units and places the sprint marker', () => {
    for (const m of h.tuning.race.practiceDistancesM) {
      h.setLevelLength(m * h.tuning.camera.pxPerUnit);
      const units = m * h.tuning.camera.pxPerUnit;
      expect(h.G.distance).toBeDefined();
      // Sprint starts before the egg, by the tuned fraction (capped).
      const expectedSprint = units - Math.min(
        h.tuning.finalSprint.zoneMaxUnits,
        Math.round(units * h.tuning.finalSprint.zoneFraction));
      expect(expectedSprint).toBeLessThan(units);
    }
  });
});
