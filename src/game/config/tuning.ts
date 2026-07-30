/**
 * Gameplay tuning — the single source of truth for every tuned constant.
 * Handbook 7.6. Grouped by domain: controls, launch, momentum, steering,
 * collision, items, finalSprint, camera, trackGeneration, networkInterpolation.
 *
 * PROTECTED. These values were tuned through playtesting and define how the game
 * feels. Changing any of them is a product decision, not a refactor:
 *   1. get explicit owner approval,
 *   2. bump `tuningVersion`,
 *   3. update the characterization tests that assert the affected behavior.
 *
 * Every value here was copied verbatim from the 0088469 build (see
 * docs/audits/handbook-baseline-audit.md §4.1). Nothing was rounded or "cleaned".
 */

export const tuningVersion = '1.6.0' as const;

/** Motion/stroke detection and cadence. */
export interface ControlsTuning {
  /** Minimum ms between two counted strokes. */
  strokeRefractoryMs: number;
  /** High-pass jerk threshold (m/s²) that registers a stroke. */
  shakeThreshold: number;
  /** Sliding window (ms) used to measure stroke cadence. */
  strokeWindowMs: number;
  /** Strokes/s required to qualify for the steady-rhythm boost. */
  steadyRhythmRate: number;
  /** Strokes/s that yield full forward push. */
  driveRate: number;
  /** Coefficient-of-variation ceiling for "steady" rhythm. */
  steadyRhythmMaxCv: number;
  /** Low-pass factor applied to the tilt axis. */
  tiltLowPass: number;
}

/** Rev-up → release launch mechanic. */
export interface LaunchTuning {
  chargeRatePerSecond: number;
  activeWindowMs: number;
  goZoneLow: number;
  goZoneHigh: number;
  chargeMax: number;
  releaseIdleMs: number;
  /** Charge must exceed this before an idle gap triggers a launch. */
  minReleaseCharge: number;
  /** Weak-launch speed = cruiseCap * (weakBase + weakScale * charge). */
  weakBase: number;
  weakScale: number;
  /** Overcooked launch speed = cruiseCap * fizzleFraction. */
  fizzleFraction: number;
}

/** Speed, acceleration and decay. */
export interface MomentumTuning {
  cruiseCap: number;
  overCap: number;
  accelUp: number;
  decayCruise: number;
  decaySprint: number;
}

/** Tilt steering. */
export interface SteeringTuning {
  sensitivity: number;
  tiltGain: number;
  shakeLockMs: number;
  /** Fraction of cruiseCap at which steering authority is full. */
  authorityFloorFraction: number;
  /** Smoothing factor applied to steer input per second. */
  smoothing: number;
  /** Sprint auto-centering rate. */
  sprintCenteringRate: number;
}

/** Collision response. */
export interface CollisionTuning {
  speedKeptOnHit: number;
  spermRadius: number;
  pickupRadius: number;
  wallBumpMultiplier: number;
  wallGrindScrubPerSecond: number;
  /** Speed above which a wall bump applies a penalty. */
  wallBumpMinSpeedFraction: number;
}

/** Boost / shield / pickups. */
export interface ItemsTuning {
  startingBoostCharges: number;
  startingShieldCharges: number;
  maxCharges: number;
  boostDurationSeconds: number;
  speedOrbDurationSeconds: number;
  starScore: number;
  speedOrbScore: number;
}

/** Final sprint restrictions and geometry. */
export interface FinalSprintTuning {
  zoneMaxUnits: number;
  zoneFraction: number;
  minLevelUnits: number;
  /** Hammering harder in the sprint pushes speed more, so flat-out hammering holds
   *  a high speed (~96% of max) instead of bleeding down to the base equilibrium.
   *  The fast bleed still applies when you stop hammering. */
  hammerAccelMultiplier: number;
}

/** View/projection. */
export interface CameraTuning {
  pxPerUnit: number;
  spermYFraction: number;
  maxHalfViewportFraction: number;
  maxHalfCapPx: number;
  /** Fixed logical viewport width (device-independent). The whole world is laid
   *  out in logical px and uniformly scaled to fit the real screen width, so the
   *  canal width and obstacle geometry are identical on every device (audit P1-10/H4). */
  logicalWidth: number;
}

/** Procedural track generation. */
export interface TrackGenerationTuning {
  gapBase: number;
  gapPerWorldUnit: number;
  gapMax: number;
  graceUntilUnits: number;
  cellProbability: number;
  clusterProbability: number;
  cellSizeBase: number;
  cellSizeRandom: number;
  cellShrinkByProgress: number;
  /** Obstacle spacing/size scale with LOCAL lane width: wider canal => more &
   *  bigger obstacles, narrow canal => fewer & smaller (kept passable). 0 disables. */
  widthDensityBias: number;
  widthSizeBias: number;
  /** A single cell never exceeds this fraction of the lane half-width (passability). */
  maxCellLaneFraction: number;
  clusterSpacingUnits: number;
  cellLaneSpread: number;
  bandGapBase: number;
  bandGapByProgress: number;
  bandGapMax: number;
  bandLaneSpread: number;
  pickupProbability: number;
  breatherProbability: number;
  breatherMultiplier: number;
  particleCount: number;
  cullBehindUnits: number;
  /** Canal wall shape. */
  wallBase: number;
  wallAmplitude: number;
  wallModBase: number;
  wallModAmplitude: number;
  wallFrequency: number;
  wallSecondaryFrequency: number;
  wallSecondaryPhase: number;
  /** Fraction of the track that stays FULL width before the canal starts to
   *  narrow (a wide plateau, then a taper toward the egg). 0.6 = wide for the
   *  first 60%, taper over the last 40%. Keeps the pre-sprint run easier. */
  wideUntilFraction: number;
  narrowAmount: number;
  narrowPower: number;
  minHalfFraction: number;
}

/** Remote-player smoothing and message cadence. */
export interface NetworkInterpolationTuning {
  sendIntervalSeconds: number;
  smoothingPerSecond: number;
  peerTimeoutMs: number;
  finishRebroadcastMs: number;
}

/** Race distances (metres) and derived world units. */
export interface RaceTuning {
  practiceDistancesM: readonly number[];
  practiceDefaultM: number;
  multiplayerDistancesM: readonly number[];
  multiplayerDefaultM: number;
  defaultLevelUnits: number;
  defaultSprintStartUnits: number;
}

export interface ScoringTuning {
  /** Score accrued per unit of speed per second. */
  scorePerSpeedSecond: number;
}

/**
 * Endless checkpoint mode (handbook 2.14): race as far as possible while
 * reaching checkpoints before the clock runs out. These are NEW feature values
 * (the baseline shipped a distance-only endless); they do not affect the
 * level/multiplayer physics that `tuningVersion` guards for replay compatibility.
 */
export interface EndlessTuning {
  /** Seconds on the clock at the start of a run. */
  startSeconds: number;
  /** Seconds granted for each checkpoint crossed. */
  timePerCheckpointSeconds: number;
  /** Hard ceiling on banked time so you can't stockpile forever. */
  maxBankedSeconds: number;
  /** Distance (world units) to the first checkpoint. */
  firstCheckpointUnits: number;
  /** Base gap (world units) between subsequent checkpoints. */
  checkpointSpacingUnits: number;
  /** Each successive gap grows by this many units — difficulty rises in bands. */
  spacingGrowthUnits: number;
}

export interface Tuning {
  controls: ControlsTuning;
  launch: LaunchTuning;
  momentum: MomentumTuning;
  steering: SteeringTuning;
  collision: CollisionTuning;
  items: ItemsTuning;
  finalSprint: FinalSprintTuning;
  camera: CameraTuning;
  trackGeneration: TrackGenerationTuning;
  networkInterpolation: NetworkInterpolationTuning;
  race: RaceTuning;
  scoring: ScoringTuning;
  endless: EndlessTuning;
}

export const tuning: Readonly<Tuning> = Object.freeze({
  controls: {
    strokeRefractoryMs: 105,
    shakeThreshold: 3.6,
    strokeWindowMs: 1400,
    steadyRhythmRate: 3.0,
    driveRate: 4.0,
    steadyRhythmMaxCv: 0.24,
    tiltLowPass: 0.15,
  },
  launch: {
    chargeRatePerSecond: 0.20,
    activeWindowMs: 260,
    goZoneLow: 0.88,
    goZoneHigh: 1.00,
    chargeMax: 1.12,
    releaseIdleMs: 320,
    minReleaseCharge: 0.4,
    weakBase: 0.42,
    weakScale: 0.5,
    fizzleFraction: 0.5,
  },
  momentum: {
    cruiseCap: 96,
    overCap: 132,
    accelUp: 34,
    decayCruise: 0.012,
    decaySprint: 0.30,
  },
  steering: {
    sensitivity: 4.2,
    tiltGain: 0.42,
    shakeLockMs: 280,
    authorityFloorFraction: 0.45,
    smoothing: 14,
    sprintCenteringRate: 1.6,
  },
  collision: {
    speedKeptOnHit: 0.30,
    spermRadius: 15,
    pickupRadius: 18,
    wallBumpMultiplier: 0.88,
    wallGrindScrubPerSecond: 0.4,
    wallBumpMinSpeedFraction: 0.25,
  },
  items: {
    startingBoostCharges: 3,
    startingShieldCharges: 2,
    maxCharges: 9,
    boostDurationSeconds: 1.4,
    speedOrbDurationSeconds: 2.6,
    starScore: 250,
    speedOrbScore: 100,
  },
  finalSprint: {
    zoneMaxUnits: 700,
    zoneFraction: 0.24,
    minLevelUnits: 700,
    hammerAccelMultiplier: 1.12,
  },
  camera: {
    pxPerUnit: 5.0,
    spermYFraction: 0.72,
    maxHalfViewportFraction: 0.48,
    maxHalfCapPx: 236,
    logicalWidth: 400,
  },
  trackGeneration: {
    gapBase: 108,
    gapPerWorldUnit: 0,
    gapMax: 235,
    graceUntilUnits: 150,
    cellProbability: 0.66,
    clusterProbability: 0.42,
    cellSizeBase: 14,
    cellSizeRandom: 13,
    cellShrinkByProgress: 0,
    widthDensityBias: 0.6,
    widthSizeBias: 0.5,
    maxCellLaneFraction: 0.44,
    clusterSpacingUnits: 22,
    cellLaneSpread: 1.6,
    bandGapBase: 0.44,
    bandGapByProgress: 0.22,
    bandGapMax: 0.72,
    bandLaneSpread: 1.3,
    pickupProbability: 0.20,
    breatherProbability: 0.07,
    breatherMultiplier: 1.4,
    particleCount: 48,
    cullBehindUnits: 30,
    wallBase: 0.80,
    wallAmplitude: 0.20,
    wallModBase: 0.88,
    wallModAmplitude: 0.12,
    wallFrequency: 0.0017,
    wallSecondaryFrequency: 0.53,
    wallSecondaryPhase: 1.3,
    wideUntilFraction: 0.6,   // full width for the first 60%, then taper to the egg
    narrowAmount: 0.58,       // same end depth as before the plateau (egg ~= 0.42 width)
    narrowPower: 1.8,         // gentle just after 60%, steep near the egg (as it was)
    minHalfFraction: 0.28,
  },
  networkInterpolation: {
    sendIntervalSeconds: 0.066,
    smoothingPerSecond: 9,
    peerTimeoutMs: 6000,
    finishRebroadcastMs: 1000,
  },
  race: {
    practiceDistancesM: [750, 1000, 1250],
    practiceDefaultM: 1000,
    multiplayerDistancesM: [400, 600, 800],
    multiplayerDefaultM: 600,
    defaultLevelUnits: 2500,
    defaultSprintStartUnits: 1900,
  },
  scoring: {
    scorePerSpeedSecond: 0.6,
  },
  endless: {
    startSeconds: 18,
    timePerCheckpointSeconds: 6,
    maxBankedSeconds: 26,
    firstCheckpointUnits: 110,
    checkpointSpacingUnits: 140,
    spacingGrowthUnits: 14,
  },
});
