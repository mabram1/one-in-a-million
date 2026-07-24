/**
 * Test harness: boots the REAL game against jsdom and drives its frame loop with
 * a deterministic clock. Nothing here reimplements gameplay — every assertion in
 * the characterization suite observes the shipped code.
 *
 * The DOM is taken from index.html so tests cannot drift from shipped markup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { bootGame } from '../../src/game/legacy/game';

const ROOT = path.resolve(__dirname, '../..');

function installDom() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
}

export interface Harness {
  /** Live game state (the real `G` object). */
  G: any;
  /** Live multiplayer state (the real `MP` object). */
  MP: any;
  tuning: any;
  setLevelLength: (units: number) => void;
  competitors: () => any[];
  /** Advance the fake clock and run the real loop in ~16 ms frames. */
  step: (ms: number) => void;
  /** Current fake clock value in ms. */
  nowMs: () => number;
  /** Dispatch a keydown (e.g. 'Space', 'ArrowLeft'). */
  key: (code: string, down?: boolean) => void;
  /** One shake stroke via the keyboard adapter. */
  stroke: () => void;
  /** Shake steadily for `seconds`, then stop (drives charge/launch). */
  shakeFor: (seconds: number, strokeIntervalMs?: number) => void;
  /** Step 16 ms at a time until `G.state` reaches `state` (or timeout). */
  stepUntilState: (state: string, maxMs?: number) => boolean;
  /** Keep shaking until the game leaves 'charging' (auto-launch), stopping at the launch frame. */
  strokeUntilLaunch: (maxMs?: number) => void;
  /** Dispatch a devicemotion sample (tilt on x, jerk magnitude for strokes). */
  motion: (x: number, magnitude?: number) => void;
  /** Restore real timers. */
  restore: () => void;
}

export function setupGame(startClockMs = 1_000_000): Harness {
  installDom();

  let fake = startClockMs;
  const realNow = performance.now.bind(performance);
  (performance as any).now = () => fake;

  const handle: any = bootGame();

  const step = (ms: number) => {
    const end = fake + ms;
    while (fake < end) {
      fake += 16;
      handle.loop(fake);
    }
  };

  const key = (code: string, down = true) => {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  };

  const stroke = () => key('Space');

  const shakeFor = (seconds: number, strokeIntervalMs = 170) => {
    const end = fake + seconds * 1000;
    while (fake < end) {
      stroke();
      step(strokeIntervalMs);
    }
  };

  const stepUntilState = (state: string, maxMs = 6000) => {
    let waited = 0;
    while (waited < maxMs && handle.G.state !== state) {
      fake += 16; handle.loop(fake); waited += 16;
    }
    return handle.G.state === state;
  };

  const strokeUntilLaunch = (maxMs = 9000) => {
    let waited = 0, sinceStroke = 999;
    while (waited < maxMs && handle.G.state === 'charging') {
      if (sinceStroke >= 120) { key('Space'); sinceStroke = 0; }
      fake += 16; handle.loop(fake); waited += 16; sinceStroke += 16;
    }
  };

  const motion = (x: number, magnitude = 0) => {
    const ev: any = new Event('devicemotion');
    ev.accelerationIncludingGravity = { x, y: 0, z: 9.8 };
    ev.acceleration = { x: magnitude, y: 0, z: 0 };
    window.dispatchEvent(ev);
  };

  handle.resize();

  return {
    G: handle.G,
    MP: handle.MP,
    tuning: handle.tuning,
    setLevelLength: handle.setLevelLength,
    competitors: handle.competitors,
    step,
    nowMs: () => fake,
    key,
    stroke,
    shakeFor,
    stepUntilState,
    strokeUntilLaunch,
    motion,
    restore: () => { (performance as any).now = realNow; },
  };
}

/** Drive a run from the menu into the racing state at a given practice distance. */
export function startPracticeRace(h: Harness, metres = 1000) {
  const chip = [...document.querySelectorAll('#distChips .chip')]
    .find((c) => (c as HTMLElement).dataset.m === String(metres)) as HTMLElement | undefined;
  chip?.click();
  (document.getElementById('practicePlay') as HTMLElement).click();
  h.step(2200);            // countdown → charging
}
