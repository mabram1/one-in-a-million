/**
 * Race rewards wiring — finishing a race credits the economy (coins/XP/gems)
 * through the ProfileStore, idempotently, and only for ranked (motion) input.
 *
 * Drives the REAL game loop to the egg and observes the authoritative reward
 * committed on the crossing frame (via commitGoalFinish -> grantRaceReward).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';
import { getProfileStore } from '../../src/app/profileStore';

let h: Harness;
const PX = () => h.tuning.camera.pxPerUnit;

beforeEach(() => {
  h = setupGame();
  try { localStorage.clear(); } catch { /* jsdom */ }
  (window as any).matchMedia = () => ({ matches: true });   // reduced motion -> shorter finish anim
});
afterEach(() => h.restore());

/** Pose one frame short of the egg, controlling the run's input class. */
function poseAtEggEdge(inputClass: 'mobile_motion' | 'desktop_keyboard') {
  h.setLevelLength(1000 * PX());
  const LEVEL = 1000 * PX();
  Object.assign(h.G, {
    state: 'playing', mode: 'level', sprint: true, boostOn: false, boosting: 0,
    strokes: [], speed: h.tuning.momentum.overCap, xNorm: 0, steer: 0, steerTarget: 0,
    obstacles: [], pickups: [], nextSpawn: LEVEL + 1e9, canalSeed: 0,
    shieldActive: false, hits: 0, score: 500, elapsed: 10, finished: false,
    _committed: false, _commitCount: 0, finishAnim: null, _result: null, _reward: null, win: true,
    ghost: null, ghostRec: [1, 2, 3, 4, 5, 6, 7, 8], perfectLaunch: true,
    raceEventId: 'test_' + inputClass + '_' + Math.round(LEVEL),   // stable per test
    inputUsed: inputClass === 'mobile_motion'
      ? { motion: true, keyboard: false, touch: false }
      : { motion: false, keyboard: true, touch: false },
    distance: LEVEL - 0.5, prevDistance: LEVEL - 0.5,
  });
  h.MP.active = false;
}

describe('race rewards', () => {
  it('credits coins + XP to the wallet on a ranked (motion) finish', () => {
    const store = getProfileStore();
    const before = { coins: store.profile.wallet.coins, xp: store.profile.xp };
    poseAtEggEdge('mobile_motion');
    h.step(64);   // cross the line -> commitGoalFinish -> grantRaceReward

    const rw = h.G._reward;
    expect(rw).toBeTruthy();
    expect(rw.coins).toBeGreaterThan(0);
    expect(rw.xp).toBeGreaterThan(0);
    // The wallet actually grew by exactly the granted amount.
    expect(store.profile.wallet.coins - before.coins).toBe(rw.coins);
    expect(store.profile.xp - before.xp).toBe(rw.xp);
  });

  it('is idempotent — the same run does not double-credit', () => {
    const store = getProfileStore();
    poseAtEggEdge('mobile_motion');
    h.step(64);
    const afterFirst = store.profile.wallet.coins;
    // Re-run the whole finish animation to results; commit is guarded so no re-grant.
    h.step(1000);
    expect(h.G.state).toBe('end');
    expect(store.profile.wallet.coins).toBe(afterFirst);
    expect(h.G._commitCount).toBe(1);
  });

  it('grants nothing for an unranked (keyboard) finish', () => {
    const store = getProfileStore();
    const before = store.profile.wallet.coins;
    poseAtEggEdge('desktop_keyboard');
    h.step(64);
    expect(h.G._reward.coins).toBe(0);
    expect(h.G._reward.xp).toBe(0);
    expect(store.profile.wallet.coins).toBe(before);
  });
});
