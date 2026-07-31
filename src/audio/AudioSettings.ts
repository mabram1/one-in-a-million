/**
 * Persistent audio + haptics settings.
 *
 * Independent 0..1 bus levels plus mute, haptics and reduced-intensity toggles,
 * stored under a versioned key (mirrors the app's other versioned persistence in
 * src/app/persistence/db.ts). Migration is non-destructive and adopts the user's
 * previous mute preference if one is supplied by the caller.
 */

export interface AudioSettings {
  masterVolume: number;   // 0..1
  musicVolume: number;    // 0..1
  sfxVolume: number;      // 0..1
  uiVolume: number;       // 0..1
  muted: boolean;
  hapticsEnabled: boolean;
  reducedAudioIntensity: boolean;
}

export interface StoredAudioSettings {
  schemaVersion: 1;
  settings: AudioSettings;
}

export const AUDIO_SETTINGS_KEY = 'oiam_audio_v1';

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  masterVolume: 0.9,
  musicVolume: 0.35,   // background bed — sits under the SFX
  sfxVolume: 0.9,
  uiVolume: 0.8,
  muted: false,
  hapticsEnabled: true,
  reducedAudioIntensity: false,
});

type Storage = Pick<typeof localStorage, 'getItem' | 'setItem'>;

const clamp01 = (v: unknown, fallback: number): number =>
  typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : fallback;

/** Coerce any parsed object into a complete, in-range AudioSettings. */
export function normalizeSettings(raw: any, base: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS }): AudioSettings {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    masterVolume: clamp01(s.masterVolume, base.masterVolume),
    musicVolume: clamp01(s.musicVolume, base.musicVolume),
    sfxVolume: clamp01(s.sfxVolume, base.sfxVolume),
    uiVolume: clamp01(s.uiVolume, base.uiVolume),
    muted: bool(s.muted, base.muted),
    hapticsEnabled: bool(s.hapticsEnabled, base.hapticsEnabled),
    reducedAudioIntensity: bool(s.reducedAudioIntensity, base.reducedAudioIntensity),
  };
}

/**
 * Load settings, migrating/recovering as needed. Always returns a valid object.
 *
 * @param legacyMuted  the pre-existing (runtime) mute preference to adopt on a
 *                     first-ever migration, so existing users keep their choice.
 */
export function loadAudioSettings(
  storage: Storage = localStorage,
  legacyMuted?: boolean,
): AudioSettings {
  let raw: string | null = null;
  try { raw = storage.getItem(AUDIO_SETTINGS_KEY); } catch { /* storage unavailable */ }
  if (!raw) {
    const base = { ...DEFAULT_AUDIO_SETTINGS };
    if (typeof legacyMuted === 'boolean') base.muted = legacyMuted;   // adopt prior mute
    return base;
  }
  try {
    const parsed = JSON.parse(raw);
    // Accept either the wrapped {schemaVersion, settings} shape or a bare object.
    const body = parsed && parsed.schemaVersion === 1 ? parsed.settings : parsed;
    return normalizeSettings(body);
  } catch {
    const base = { ...DEFAULT_AUDIO_SETTINGS };
    if (typeof legacyMuted === 'boolean') base.muted = legacyMuted;
    return base;   // corrupt -> safe defaults
  }
}

export function saveAudioSettings(settings: AudioSettings, storage: Storage = localStorage): void {
  const payload: StoredAudioSettings = { schemaVersion: 1, settings: normalizeSettings(settings) };
  try { storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(payload)); } catch { /* quota/unavailable — non-fatal */ }
}
