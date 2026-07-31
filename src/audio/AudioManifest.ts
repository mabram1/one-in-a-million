/**
 * The audio manifest: what each event sounds like and how it behaves.
 *
 * Files are referenced by URL (resolved against the deploy base). None of the
 * final binaries exist yet — the loader tolerates that (logs one dev warning,
 * plays the procedural fallback where one is registered). Do NOT create empty
 * placeholder binaries; ship the manifest + graceful fallback.
 *
 * Sound direction: cute premium arcade — never gross/wet/anatomical. The finish
 * sequence is a soft rubbery "boomp" -> clean elastic "pop" -> airy "fwip" ->
 * small soft "plup" -> short warm arcade chord. No rays/explosion/splash sounds.
 */
import type { AudioEventName, AudioBus, HapticShape } from './events';

const BASE = ((import.meta as any).env?.BASE_URL as string) || './';
const sfx = (f: string) => `${BASE}audio/sfx/${f}`;
const music = (f: string) => `${BASE}audio/music/${f}`;

export interface SfxDef {
  /** One or more variant clips; each is a source list (primary + fallback codecs). */
  variants: string[][];
  bus: Exclude<AudioBus, 'master' | 'music'>;   // 'sfx' | 'ui'
  /** Minimum ms between plays of THIS event (anti-spam). */
  cooldownMs: number;
  /** Max simultaneous voices for this event. */
  maxVoices: number;
  /** +/- fractional pitch randomisation (0.03 = +/-3%). */
  pitchVar: number;
  /** Relative gain 0..1 before bus/master. */
  gain: number;
  /** Duck music briefly while this plays (finish/result emphasis). */
  duck?: boolean;
  /** Procedural fallback id (see SfxPlayer) used when the file is missing. */
  fallback?: FallbackTone;
}

/** Names of the preserved procedural Web-Audio tones (temporary fallbacks). */
export type FallbackTone = 'stroke' | 'hit' | 'pickup' | 'launch' | 'fwip';

/** Semantic haptic per event (HapticsManager maps shape -> native/vibrate). */
export const HAPTICS: Partial<Record<AudioEventName, HapticShape>> = {
  ui_click: 'selection',
  ui_back: 'selection',
  launch_perfect: 'success',
  launch_weak: 'light',
  launch_overcooked: 'light',
  boost_activate: 'light',
  shield_activate: 'light',
  collision_wall: 'impact',
  collision_wbc: 'impact',
  collision_virus: 'impact',
  collision_membrane: 'light',
  checkpoint: 'double',
  finish_impact: 'impact',
  finish_suction: 'light',
  finish_seal: 'double',
  result_win: 'success',
};

// SFX ship as generated .wav (universally decodable incl. iOS/Android WebView).
// See scripts/gen-sfx.mjs — original, royalty-free, deterministic.
const clip = (name: string) => [sfx(`${name}.wav`)];

export const SFX_MANIFEST: Record<AudioEventName, SfxDef> = {
  ui_click:  { variants: [clip('ui_click')],  bus: 'ui', cooldownMs: 40, maxVoices: 3, pitchVar: 0.02, gain: 0.7 },
  ui_back:   { variants: [clip('ui_back')],   bus: 'ui', cooldownMs: 40, maxVoices: 3, pitchVar: 0.02, gain: 0.7 },

  charge_start: { variants: [clip('charge_start')], bus: 'sfx', cooldownMs: 200, maxVoices: 1, pitchVar: 0.02, gain: 0.8, fallback: 'launch' },
  charge_tick:  { variants: [clip('charge_tick')],  bus: 'sfx', cooldownMs: 90,  maxVoices: 2, pitchVar: 0.03, gain: 0.4, fallback: 'stroke' },

  launch_weak:      { variants: [clip('launch_weak')],      bus: 'sfx', cooldownMs: 120, maxVoices: 1, pitchVar: 0.02, gain: 0.9, fallback: 'launch' },
  launch_perfect:   { variants: [clip('launch_perfect')],   bus: 'sfx', cooldownMs: 120, maxVoices: 1, pitchVar: 0.02, gain: 1.0, fallback: 'launch' },
  launch_overcooked:{ variants: [clip('launch_overcooked')],bus: 'sfx', cooldownMs: 120, maxVoices: 1, pitchVar: 0.02, gain: 0.9, fallback: 'launch' },

  stroke: { variants: [clip('stroke_01'), clip('stroke_02'), clip('stroke_03')], bus: 'sfx', cooldownMs: 70, maxVoices: 3, pitchVar: 0.03, gain: 0.7, fallback: 'stroke' },

  boost_activate:  { variants: [clip('boost_activate')],  bus: 'sfx', cooldownMs: 120, maxVoices: 1, pitchVar: 0.02, gain: 0.9, fallback: 'launch' },
  shield_activate: { variants: [clip('shield_activate')], bus: 'sfx', cooldownMs: 120, maxVoices: 1, pitchVar: 0.02, gain: 0.8, fallback: 'pickup' },

  collision_wall:     { variants: [clip('collision_wall_01'), clip('collision_wall_02')], bus: 'sfx', cooldownMs: 120, maxVoices: 2, pitchVar: 0.03, gain: 0.8, fallback: 'hit' },
  collision_wbc:      { variants: [clip('collision_wbc')],      bus: 'sfx', cooldownMs: 120, maxVoices: 2, pitchVar: 0.03, gain: 0.9, fallback: 'hit' },
  collision_virus:    { variants: [clip('collision_virus')],    bus: 'sfx', cooldownMs: 120, maxVoices: 2, pitchVar: 0.03, gain: 0.9, fallback: 'hit' },
  collision_membrane: { variants: [clip('collision_membrane')], bus: 'sfx', cooldownMs: 120, maxVoices: 2, pitchVar: 0.03, gain: 0.7, fallback: 'hit' },

  pickup_star:   { variants: [clip('pickup_star_01'), clip('pickup_star_02')], bus: 'sfx', cooldownMs: 80, maxVoices: 3, pitchVar: 0.03, gain: 0.8, fallback: 'pickup' },
  pickup_shield: { variants: [clip('pickup_shield')], bus: 'sfx', cooldownMs: 100, maxVoices: 2, pitchVar: 0.02, gain: 0.8, fallback: 'pickup' },
  pickup_speed:  { variants: [clip('pickup_speed')],  bus: 'sfx', cooldownMs: 100, maxVoices: 2, pitchVar: 0.02, gain: 0.9, fallback: 'pickup' },

  checkpoint:        { variants: [clip('checkpoint')],        bus: 'sfx', cooldownMs: 150, maxVoices: 1, pitchVar: 0.02, gain: 0.9, fallback: 'pickup' },
  final_sprint_start:{ variants: [clip('final_sprint_start')],bus: 'sfx', cooldownMs: 500, maxVoices: 1, pitchVar: 0.0,  gain: 1.0, fallback: 'launch' },

  finish_impact:       { variants: [clip('finish_impact')],       bus: 'sfx', cooldownMs: 0, maxVoices: 1, pitchVar: 0.0, gain: 1.0, duck: true, fallback: 'hit' },
  finish_membrane_pop: { variants: [clip('finish_membrane_pop')], bus: 'sfx', cooldownMs: 0, maxVoices: 1, pitchVar: 0.0, gain: 1.0, duck: true, fallback: 'pickup' },
  finish_suction:      { variants: [clip('finish_suction')],      bus: 'sfx', cooldownMs: 0, maxVoices: 1, pitchVar: 0.0, gain: 1.0, duck: true, fallback: 'fwip' },
  finish_seal:         { variants: [clip('finish_seal')],         bus: 'sfx', cooldownMs: 0, maxVoices: 1, pitchVar: 0.0, gain: 0.9, duck: true, fallback: 'fwip' },

  result_win:  { variants: [clip('result_win')],  bus: 'sfx', cooldownMs: 0, maxVoices: 1, pitchVar: 0.0, gain: 1.0, duck: true, fallback: 'launch' },
  result_lose: { variants: [clip('result_lose')], bus: 'sfx', cooldownMs: 0, maxVoices: 1, pitchVar: 0.0, gain: 0.9, duck: true, fallback: 'hit' },
};

/** Looping music stems. Race stems must be sample-aligned + equal length. */
export type MusicTrack =
  | 'menu_base' | 'race_base' | 'race_speed' | 'final_sprint' | 'result_win' | 'result_lose';

export interface MusicDef { sources: string[]; loop: boolean; }

// Music comes from Suno (owner) — mp3 or wav. The director tries each source in
// order and uses the first that loads, so drop in whichever format you export.
const track = (name: string) => [music(`${name}.mp3`), music(`${name}.wav`), music(`${name}.ogg`)];
export const MUSIC_MANIFEST: Record<MusicTrack, MusicDef> = {
  menu_base:    { sources: track('menu_base'),    loop: true },
  race_base:    { sources: track('race_base'),    loop: true },
  race_speed:   { sources: track('race_speed'),   loop: true },
  final_sprint: { sources: track('final_sprint'), loop: true },
  result_win:   { sources: track('result_win'),   loop: false },
  result_lose:  { sources: track('result_lose'),  loop: false },
};

/** The synchronized, gain-mixed race layers (started together on one clock). */
export const RACE_STEMS: MusicTrack[] = ['race_base', 'race_speed', 'final_sprint'];

/** Every audio file the game expects — used to report what is still missing. */
export function expectedAudioFiles(): string[] {
  const files = new Set<string>();
  for (const def of Object.values(SFX_MANIFEST)) for (const v of def.variants) for (const s of v) files.add(s);
  for (const def of Object.values(MUSIC_MANIFEST)) for (const s of def.sources) files.add(s);
  return [...files];
}
