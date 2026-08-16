/**
 * Tuning integrity — guards the PROTECTED values themselves.
 *
 * These numbers were tuned through playtesting and are recorded in
 * docs/audits/handbook-baseline-audit.md §4.1. If a change here is intentional,
 * it needs owner approval AND a tuningVersion bump (handbook 7.6).
 */
import { describe, it, expect } from 'vitest';
import { tuning, tuningVersion } from '../../src/game/config/tuning';

describe('tuning version', () => {
  it('is the current approved version', () => {
    // 1.0.0 = verbatim baseline 0088469. 1.1.0 added camera.logicalWidth (P1-10).
    // 1.2.0 finalSprint.hammerAccelMultiplier. 1.3.0/1.4.0 raised obstacle density.
    // 1.5.0 width-driven distribution (wide=more+bigger, narrow=fewer+smaller).
    // 1.6.0 canal width profile: full-width plateau then taper.
    // 1.7.0 steering is damped (not fully locked) while shaking — steering.shakeSteerFactor
    // 0.35 — so you can nudge around obstacles while building speed (owner 2026-08-01).
    // 1.8.0 easier spacing: obstacle gap ~1.3x wider (gapBase 108->140, gapMax 235->305,
    // min gap 60->78) — more room between obstacles (owner 2026-08-03).
    expect(tuningVersion).toBe('1.8.0');
  });

  it('is frozen so nothing can mutate it at runtime', () => {
    expect(Object.isFrozen(tuning)).toBe(true);
  });
});

describe('protected tuning values (baseline 0088469)', () => {
  it('controls', () => {
    expect(tuning.controls.strokeRefractoryMs).toBe(105);
    expect(tuning.controls.shakeThreshold).toBe(3.6);
    expect(tuning.controls.strokeWindowMs).toBe(1400);
    expect(tuning.controls.steadyRhythmRate).toBe(3.0);
    expect(tuning.controls.driveRate).toBe(4.0);
  });

  it('launch — ~5 s charge and a narrow GO zone', () => {
    expect(tuning.launch.chargeRatePerSecond).toBe(0.20);
    expect(tuning.launch.goZoneLow).toBe(0.88);
    expect(tuning.launch.goZoneHigh).toBe(1.00);
    expect(tuning.launch.chargeMax).toBe(1.12);
    expect(tuning.launch.activeWindowMs).toBe(260);
    expect(tuning.launch.releaseIdleMs).toBe(320);
    // The defining property: full charge takes about five seconds of shaking.
    expect(tuning.launch.chargeMax / tuning.launch.chargeRatePerSecond).toBeCloseTo(5.6, 1);
    // And the GO zone is narrow — well under a second of charging wide.
    const zoneSeconds =
      (tuning.launch.goZoneHigh - tuning.launch.goZoneLow) / tuning.launch.chargeRatePerSecond;
    expect(zoneSeconds).toBeLessThan(0.8);
  });

  it('momentum', () => {
    expect(tuning.momentum.cruiseCap).toBe(96);
    expect(tuning.momentum.overCap).toBe(132);
    expect(tuning.momentum.accelUp).toBe(34);
    expect(tuning.momentum.decayCruise).toBe(0.012);
    expect(tuning.momentum.decaySprint).toBe(0.30);
    // Sprint must bleed far faster than cruising — that is what makes it a sprint.
    expect(tuning.momentum.decaySprint).toBeGreaterThan(tuning.momentum.decayCruise * 10);
  });

  it('steering', () => {
    expect(tuning.steering.sensitivity).toBe(4.2);
    expect(tuning.steering.tiltGain).toBe(0.42);
    expect(tuning.steering.shakeLockMs).toBe(280);
    expect(tuning.steering.authorityFloorFraction).toBe(0.45);
  });

  it('collision — a hit costs momentum but never ends the run', () => {
    expect(tuning.collision.speedKeptOnHit).toBe(0.30);
    expect(tuning.collision.speedKeptOnHit).toBeGreaterThan(0);
    expect(tuning.collision.spermRadius).toBe(15);
    expect(tuning.collision.wallBumpMultiplier).toBe(0.88);
  });

  it('items', () => {
    expect(tuning.items.startingBoostCharges).toBe(3);
    expect(tuning.items.startingShieldCharges).toBe(2);
    expect(tuning.items.boostDurationSeconds).toBe(1.4);
    expect(tuning.items.speedOrbDurationSeconds).toBe(2.6);
    expect(tuning.items.starScore).toBe(250);
  });

  it('race distances', () => {
    expect(tuning.race.practiceDistancesM).toEqual([750, 1000, 1250]);
    expect(tuning.race.practiceDefaultM).toBe(1000);
    expect(tuning.race.multiplayerDistancesM).toEqual([400, 600, 800]);
    expect(tuning.race.multiplayerDefaultM).toBe(600);
  });

  it('final sprint geometry', () => {
    expect(tuning.finalSprint.zoneMaxUnits).toBe(700);
    expect(tuning.finalSprint.zoneFraction).toBe(0.24);
    expect(tuning.finalSprint.hammerAccelMultiplier).toBe(1.12);
    // Sustainable sprint speed = accel / decay; the multiplier lifts it to ~96% of
    // over-cap so flat-out hammering holds high instead of bleeding to ~86%.
    const sustain = (tuning.momentum.accelUp * tuning.finalSprint.hammerAccelMultiplier) / tuning.momentum.decaySprint;
    expect(sustain / tuning.momentum.overCap).toBeGreaterThan(0.93);
    expect(sustain / tuning.momentum.overCap).toBeLessThan(1.0);
  });

  it('camera — fixed logical viewport (device-independent, P1-10)', () => {
    expect(tuning.camera.pxPerUnit).toBe(5.0);
    expect(tuning.camera.spermYFraction).toBe(0.72);
    expect(tuning.camera.maxHalfViewportFraction).toBe(0.48);
    expect(tuning.camera.maxHalfCapPx).toBe(236);
    expect(tuning.camera.logicalWidth).toBe(400);
    // The canal half-width is now a device-independent constant: on the 400px
    // logical stage it is 192px on every screen (the 236 cap never binds).
    const maxHalf = Math.min(tuning.camera.logicalWidth * tuning.camera.maxHalfViewportFraction, tuning.camera.maxHalfCapPx);
    expect(maxHalf).toBe(192);
  });

  it('endless checkpoint mode (P1-16 feature values)', () => {
    expect(tuning.endless.startSeconds).toBe(18);
    expect(tuning.endless.timePerCheckpointSeconds).toBe(6);
    expect(tuning.endless.maxBankedSeconds).toBe(26);
    expect(tuning.endless.firstCheckpointUnits).toBe(110);
    expect(tuning.endless.checkpointSpacingUnits).toBe(140);
    expect(tuning.endless.spacingGrowthUnits).toBe(14);
  });
});
