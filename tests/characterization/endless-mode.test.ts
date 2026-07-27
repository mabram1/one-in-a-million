/**
 * Endless checkpoint mode (handbook 2.14, task P1-16).
 *
 * Race as far as possible while reaching checkpoints before the clock expires:
 *  - the run starts with a fixed time budget;
 *  - crossing a checkpoint banks time (capped) and advances the next target;
 *  - checkpoint gaps grow in authored bands (difficulty rises);
 *  - the run ends when time hits zero — NOT on collision.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';

let h: Harness;

/** Boot straight into a playing Endless run. */
function startEndless() {
  (document.getElementById('endlessPanel') as HTMLElement).click();
  h.step(2200);         // countdown -> charging
  h.shakeFor(4.4);      // charge and launch
  h.stepUntilState('playing', 2000);
}

beforeEach(() => {
  h = setupGame();
  try { localStorage.removeItem('oiam_endless_best'); } catch { /* jsdom */ }
  startEndless();
});

const PX = () => h.tuning.camera.pxPerUnit;
const END = () => h.tuning.endless;

describe('start of run', () => {
  it('is in endless mode with the full clock and the first checkpoint targeted', () => {
    expect(h.G.mode).toBe('endless');
    expect(h.G.state).toBe('playing');
    // A couple of frames have ticked since launch, so allow a small margin.
    expect(h.G.timeLeft).toBeGreaterThan(END().startSeconds - 1);
    expect(h.G.timeLeft).toBeLessThanOrEqual(END().startSeconds);
    expect(h.G.checkpointsHit).toBe(0);
    expect(h.G.nextCheckpoint).toBe(END().firstCheckpointUnits * PX());
  });
});

describe('checkpoints', () => {
  it('crossing a checkpoint banks time and advances the target by the authored (growing) gap', () => {
    const before = h.G.timeLeft;
    const firstTarget = h.G.nextCheckpoint;

    // Drive across the first checkpoint.
    h.G.distance = firstTarget + 1;
    h.step(16);

    expect(h.G.checkpointsHit).toBe(1);
    expect(h.G.timeLeft).toBeGreaterThan(before + END().timePerCheckpointSeconds - 1);   // +6s minus one frame
    // gap for index 0 == checkpointSpacingUnits (no growth yet)
    expect(h.G.nextCheckpoint).toBe(firstTarget + END().checkpointSpacingUnits * PX());

    // Second checkpoint: the gap has grown by spacingGrowthUnits.
    const secondTarget = h.G.nextCheckpoint;
    h.G.distance = secondTarget + 1;
    h.step(16);
    expect(h.G.checkpointsHit).toBe(2);
    expect(h.G.nextCheckpoint).toBe(
      secondTarget + (END().checkpointSpacingUnits + END().spacingGrowthUnits) * PX(),
    );
  });

  it('never banks more than the ceiling', () => {
    // Cross many checkpoints quickly; time must not exceed the cap.
    for (let i = 0; i < 12; i++) { h.G.distance = h.G.nextCheckpoint + 1; h.step(16); }
    expect(h.G.checkpointsHit).toBeGreaterThanOrEqual(10);
    expect(h.G.timeLeft).toBeLessThanOrEqual(END().maxBankedSeconds + 0.001);
  });
});

describe('run ending', () => {
  it('ends when the clock reaches zero', () => {
    h.G.timeLeft = 0.05;
    h.step(200);
    expect(h.G.state).toBe('end');
  });

  it('does NOT end on collision while time remains', () => {
    // Plenty of clock left; step through many frames (obstacles spawn and may be
    // hit) and confirm the run is still going — only the timer can end it.
    h.G.timeLeft = 10;
    h.step(1500);
    expect(h.G.state).toBe('playing');
  });

  it('records a personal best in distance', () => {
    h.G.distance = 3210 * PX();          // ~3210 m
    h.G.nextCheckpoint = h.G.distance + 1e9;   // no more crossings to re-bank time
    h.G.timeLeft = 0.05;
    h.step(200);
    expect(h.G.state).toBe('end');
    // The sperm still carries speed for the final frame, so distance ticks up a
    // couple of metres before the clock hits zero.
    const best = Number(localStorage.getItem('oiam_endless_best'));
    expect(best).toBeGreaterThanOrEqual(3210);
    expect(best).toBeLessThan(3216);
  });
});
