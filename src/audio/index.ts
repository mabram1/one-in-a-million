/**
 * Public audio/haptics API.
 *
 * Gameplay code imports ONLY from here. It emits typed events and (for the
 * menu/charge/race music flow) sets music states — it never touches Web Audio,
 * HTMLAudioElement, navigator.vibrate or a haptics plugin directly.
 */
import { AudioManager, type AudioManagerOptions } from './AudioManager';
import type { MusicState } from './MusicDirector';
import type { AudioEvent, AudioEventName } from './events';
import type { AudioSettings } from './AudioSettings';

export type { AudioEvent, AudioEventName } from './events';
export type { AudioSettings } from './AudioSettings';
export type { MusicState } from './MusicDirector';
export { AudioManager } from './AudioManager';
export { DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings } from './AudioSettings';
export { expectedAudioFiles } from './AudioManifest';

let manager: AudioManager | null = null;
const taps = new Set<(e: AudioEvent) => void>();

const devWarn = (msg: string) => { try { if ((import.meta as any).env?.DEV) console.warn(msg); } catch { /* */ } };

/** The process-wide audio manager (created lazily; safe before unlock). */
export function audio(): AudioManager {
  if (!manager) manager = new AudioManager({ warn: devWarn });
  return manager;
}

/** Replace the singleton (tests inject a manager with a fake context). */
export function __setAudioManager(m: AudioManager | null): void { manager = m; }

/** Configure the singleton before first use (e.g. inject options). */
export function configureAudio(options: AudioManagerOptions): AudioManager {
  manager = new AudioManager(options);
  return manager;
}

/** Emit a presentation event. Cheap + safe to call from the sim every frame. */
export function emitAudio(name: AudioEventName, opts: { intensity?: number; seed?: number } = {}): void {
  const event: AudioEvent = { name, ...opts };
  try { audio().handle(event); } catch { /* audio must never break gameplay */ }
  if (taps.size) for (const tap of taps) { try { tap(event); } catch { /* */ } }
}

/** Observe emitted events (tests / debugging). Returns a disposer. */
export function onAudioEvent(fn: (e: AudioEvent) => void): () => void {
  taps.add(fn);
  return () => taps.delete(fn);
}

/** Unlock/resume the AudioContext — MUST be called from a real user gesture. */
export function unlockAudio(): void { try { audio().unlock(); } catch { /* */ } }

/** Music state for the menu/charge/race flow. */
export function setMusicState(state: MusicState, opts?: { speed01?: number }): void {
  try { audio().setMusicState(state, opts); } catch { /* */ }
}
export function setRaceSpeed(speed01: number): void { try { audio().setRaceSpeed(speed01); } catch { /* */ } }

// ---- Settings passthrough ---------------------------------------------------
export function getAudioSettings(): AudioSettings { return audio().getSettings(); }
export function setAudioSettings(patch: Partial<AudioSettings>): void { audio().setSettings(patch); }

/** Wire background/foreground handling once (idempotent). */
let lifecycleWired = false;
export function wireAudioLifecycle(): void {
  if (lifecycleWired || typeof document === 'undefined') return;
  lifecycleWired = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio().suspendForBackground();
    else audio().resumeFromBackground();
  });
  // Capacitor app state (native background) if the bridge is present.
  try {
    const cap = (window as any).Capacitor;
    const App = cap?.Plugins?.App;
    App?.addListener?.('appStateChange', (s: { isActive: boolean }) => {
      if (s.isActive) audio().resumeFromBackground(); else audio().suspendForBackground();
    });
  } catch { /* no native bridge */ }
}
