/**
 * Audio EVENT integration — the sim emits the right typed events, in order.
 *
 * Drives the REAL game loop (the audio system itself is inert in jsdom: no
 * AudioContext) and taps the emitted events to assert the finish sequence order
 * and the final-sprint music transition. No audio files or speakers involved.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';
import { onAudioEvent, audio } from '../../src/audio';
import type { AudioEventName } from '../../src/audio';

let h: Harness;
let events: AudioEventName[] = [];
let dispose: (() => void) | null = null;

const PX = () => h.tuning.camera.pxPerUnit;

beforeEach(() => {
  h = setupGame();
  try { localStorage.clear(); } catch { /* jsdom */ }
  events = [];
  dispose = onAudioEvent((e) => events.push(e.name));
});
afterEach(() => { dispose?.(); h.restore(); });

function poseAtEggEdge() {
  h.setLevelLength(1000 * PX());
  const LEVEL = 1000 * PX();
  Object.assign(h.G, {
    state: 'playing', mode: 'level', sprint: true, boostOn: false, boosting: 0,
    strokes: [], speed: h.tuning.momentum.overCap, xNorm: 0, steer: 0, steerTarget: 0,
    obstacles: [], pickups: [], nextSpawn: LEVEL + 1e9, canalSeed: 0,
    shieldActive: false, hits: 0, score: 500, elapsed: 10, finished: false,
    _committed: false, _commitCount: 0, finishAnim: null, _result: null, win: true,
    ghost: null, ghostRec: [1, 2, 3, 4, 5, 6, 7, 8],
    distance: LEVEL - 0.5, prevDistance: LEVEL - 0.5,
  });
  h.MP.active = false;
  (window as any).matchMedia = () => ({ matches: false });
}

describe('finish sequence emits audio in order', () => {
  it('impact -> membrane_pop -> suction -> seal -> result', () => {
    poseAtEggEdge();
    h.step(64);            // cross the line -> finishing
    h.step(1700);          // run the whole ~1500ms sequence to results
    expect(h.G.state).toBe('end');

    const finishOrder = events.filter((n) =>
      n === 'finish_impact' || n === 'finish_membrane_pop' || n === 'finish_suction' ||
      n === 'finish_seal' || n === 'result_win' || n === 'result_lose');

    // Exactly one of each finish beat, in the required order, result last.
    expect(finishOrder[0]).toBe('finish_impact');
    expect(finishOrder.indexOf('finish_membrane_pop')).toBeGreaterThan(finishOrder.indexOf('finish_impact'));
    expect(finishOrder.indexOf('finish_suction')).toBeGreaterThan(finishOrder.indexOf('finish_membrane_pop'));
    expect(finishOrder.indexOf('finish_seal')).toBeGreaterThan(finishOrder.indexOf('finish_suction'));
    const result = finishOrder[finishOrder.length - 1];
    expect(result === 'result_win' || result === 'result_lose').toBe(true);
    expect(finishOrder.indexOf('finish_seal')).toBeLessThan(finishOrder.length - 1);
    // No duplicate finish beats.
    expect(events.filter((n) => n === 'finish_impact').length).toBe(1);
    expect(events.filter((n) => n === 'finish_seal').length).toBe(1);
  });
});

describe('final sprint music transition', () => {
  it('emits final_sprint_start and moves the music to the final_sprint state', () => {
    h.setLevelLength(1000 * PX());
    const SPRINT = 1000 * PX() - h.tuning.finalSprint.zoneMaxUnits;   // 5000 - 700 = 4300
    Object.assign(h.G, {
      state: 'playing', mode: 'level', sprint: false, speed: h.tuning.momentum.overCap,
      xNorm: 0, steer: 0, steerTarget: 0, obstacles: [], pickups: [], nextSpawn: 1e12,
      finished: false, _committed: false, distance: SPRINT - 6, prevDistance: SPRINT - 6,
    });
    h.MP.active = false;

    h.step(80);            // cross the sprint marker
    expect(h.G.sprint).toBe(true);
    expect(events).toContain('final_sprint_start');
    expect(audio().music.state).toBe('final_sprint');
  });
});
