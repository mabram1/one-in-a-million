/**
 * Typed presentation events.
 *
 * Simulation / gameplay code emits these; the audio + haptics systems consume
 * them. Nothing in the sim calls Web Audio, HTMLAudioElement, navigator.vibrate
 * or a native haptics plugin directly — it only names WHAT happened, never HOW it
 * should sound or buzz. That keeps the audio refactor from touching gameplay.
 */

export type AudioEventName =
  // UI
  | 'ui_click'
  | 'ui_back'
  // charge / launch
  | 'charge_start'
  | 'charge_tick'
  | 'launch_weak'
  | 'launch_perfect'
  | 'launch_overcooked'
  // swimming
  | 'stroke'
  // items
  | 'boost_activate'
  | 'shield_activate'
  // collisions
  | 'collision_wall'
  | 'collision_wbc'
  | 'collision_virus'
  | 'collision_membrane'
  // pickups
  | 'pickup_star'
  | 'pickup_shield'
  | 'pickup_speed'
  // structure
  | 'checkpoint'
  | 'final_sprint_start'
  // finish sequence (ordered)
  | 'finish_impact'
  | 'finish_membrane_pop'
  | 'finish_suction'
  | 'finish_seal'
  // results
  | 'result_win'
  | 'result_lose';

export interface AudioEvent {
  name: AudioEventName;
  /** 0..1 loudness/energy hint (e.g. stroke strength, collision severity). */
  intensity?: number;
  /**
   * Deterministic variant selector. When presentation must be reproducible
   * (replay/ghost), pass a stable seed so the same run picks the same variant.
   * Omit for "live" events where a round-robin/pseudo-random variant is fine.
   */
  seed?: number;
}

export const ALL_AUDIO_EVENTS: readonly AudioEventName[] = [
  'ui_click', 'ui_back',
  'charge_start', 'charge_tick', 'launch_weak', 'launch_perfect', 'launch_overcooked',
  'stroke',
  'boost_activate', 'shield_activate',
  'collision_wall', 'collision_wbc', 'collision_virus', 'collision_membrane',
  'pickup_star', 'pickup_shield', 'pickup_speed',
  'checkpoint', 'final_sprint_start',
  'finish_impact', 'finish_membrane_pop', 'finish_suction', 'finish_seal',
  'result_win', 'result_lose',
] as const;

/** The four mix buses every sound routes through. */
export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';

/** Semantic haptic shapes (mapped to native/vibrate patterns by HapticsManager). */
export type HapticShape =
  | 'none'
  | 'selection'    // light UI tick
  | 'light'        // small confirmation
  | 'impact'       // one short knock (collision / finish impact)
  | 'success'      // two crisp pulses (perfect launch)
  | 'double';      // short double confirmation (checkpoint / finish seal)
