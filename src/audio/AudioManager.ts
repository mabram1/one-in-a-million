/**
 * The audio orchestrator: owns the AudioContext + the four mix buses
 * (master -> {music, sfx, ui}), unlocks on a user gesture, and turns typed
 * presentation events into SFX, haptics and music cues. Everything is safe to
 * call before unlock and in headless tests (no context -> inert).
 */
import { SfxPlayer } from './SfxPlayer';
import { MusicDirector, type MusicState } from './MusicDirector';
import { HapticsManager } from './HapticsManager';
import { SFX_MANIFEST, HAPTICS } from './AudioManifest';
import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings, type AudioSettings } from './AudioSettings';
import type { AudioEvent, AudioEventName } from './events';

export interface AudioManagerOptions {
  /** Factory for the AudioContext (injectable for tests). */
  contextFactory?: () => AudioContext | null;
  fetchImpl?: typeof fetch;
  vibrateFn?: ((p: number | number[]) => boolean) | null;
  warn?: (msg: string) => void;
  now?: () => number;
  storage?: Pick<typeof localStorage, 'getItem' | 'setItem'>;
}

function defaultContextFactory(): AudioContext | null {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch { return null; }
}

export class AudioManager {
  private opts: AudioManagerOptions;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBusNode: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private uiBus: GainNode | null = null;

  private settings: AudioSettings;
  private unlocked = false;
  private assetsLoaded = false;
  private suspended = false;

  readonly sfx: SfxPlayer;
  readonly music: MusicDirector;
  readonly haptics: HapticsManager;

  /** URLs that failed to load (populated after unlock+load). */
  missingFiles: string[] = [];

  constructor(options: AudioManagerOptions = {}) {
    this.opts = options;
    this.settings = loadAudioSettings(options.storage, undefined);
    this.sfx = new SfxPlayer(null, (bus) => this.busNode(bus), options.now);
    this.music = new MusicDirector(null, null, options.warn);
    this.haptics = new HapticsManager(options.vibrateFn);
    this.applySettingsToOutputs();
  }

  getSettings(): AudioSettings { return { ...this.settings }; }
  isUnlocked(): boolean { return this.unlocked; }

  /** Adopt a prior (runtime) mute preference before first-ever persistence. */
  adoptLegacyMute(muted: boolean): void {
    // Only if the user has no stored audio settings yet.
    const stored = loadAudioSettings(this.opts.storage, undefined);
    if (stored.muted === DEFAULT_AUDIO_SETTINGS.muted) {
      this.settings.muted = muted;
      this.applySettingsToOutputs();
    }
  }

  /** Create/resume the AudioContext from a real user gesture. Idempotent. */
  unlock(): void {
    if (!this.ctx) {
      const factory = this.opts.contextFactory || defaultContextFactory;
      this.ctx = factory();
      if (this.ctx) this.buildGraph();
    }
    if (this.ctx) {
      try { if (this.ctx.state === 'suspended') this.ctx.resume(); } catch { /* */ }
      this.unlocked = true;
      this.suspended = false;
      if (!this.assetsLoaded) { this.assetsLoaded = true; void this.loadAssets(); }
    }
  }

  private buildGraph(): void {
    if (!this.ctx) return;
    try {
      this.master = this.ctx.createGain();
      this.musicBusNode = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.uiBus = this.ctx.createGain();
      this.musicBusNode.connect(this.master);
      this.sfxBus.connect(this.master);
      this.uiBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.sfx.setContext(this.ctx);
      this.music.setContext(this.ctx, this.musicBusNode);
      this.applySettingsToOutputs();
    } catch { /* stubbed nodes */ }
  }

  private async loadAssets(): Promise<void> {
    const f = this.opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    const [sfxMissing, musicMissing] = await Promise.all([this.sfx.loadAll(f), this.music.load(f)]);
    this.missingFiles = [...sfxMissing, ...musicMissing];
    if (this.missingFiles.length && this.opts.warn) {
      this.opts.warn(`[audio] ${this.missingFiles.length} audio file(s) missing — using procedural fallbacks / silence.`);
    }
  }

  private busNode(bus: 'sfx' | 'ui'): AudioNode | null {
    return bus === 'ui' ? this.uiBus : this.sfxBus;
  }

  // ---- Settings -------------------------------------------------------------
  setSettings(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.applySettingsToOutputs();
    saveAudioSettings(this.settings, this.opts.storage);
  }

  private applySettingsToOutputs(): void {
    const s = this.settings;
    const set = (g: GainNode | null, v: number) => { if (g) { try { g.gain.value = v; } catch { /* */ } } };
    const m = s.muted ? 0 : 1;
    set(this.master, s.masterVolume * m);
    set(this.musicBusNode, s.musicVolume);
    set(this.sfxBus, s.sfxVolume);
    set(this.uiBus, s.uiVolume);
    this.haptics.setEnabled(s.hapticsEnabled);
    this.haptics.setReducedIntensity(s.reducedAudioIntensity);
    this.sfx.setReducedIntensity(s.reducedAudioIntensity);
  }

  /** Read-only per-bus effective gain (for tests/inspection). */
  busGain(bus: 'master' | 'music' | 'sfx' | 'ui'): number {
    const s = this.settings;
    if (bus === 'master') return s.muted ? 0 : s.masterVolume;
    if (s.muted) return 0;   // buses are downstream of a muted master
    return bus === 'music' ? s.musicVolume : bus === 'sfx' ? s.sfxVolume : s.uiVolume;
  }

  // ---- Event handling -------------------------------------------------------
  handle(event: AudioEvent): void {
    const name = event.name;
    const def = SFX_MANIFEST[name];
    if (def && !this.settings.muted) this.sfx.play(name, { intensity: event.intensity, seed: event.seed });
    const shape = HAPTICS[name];
    if (shape) this.haptics.play(shape);
    this.musicCue(name);
    if (def?.duck && !this.settings.muted) this.duckMusic();
  }

  /** Certain events drive music-state transitions directly. */
  private musicCue(name: AudioEventName): void {
    switch (name) {
      case 'final_sprint_start': this.music.setState('final_sprint'); break;
      case 'finish_impact':      this.music.setState('finishing'); break;
      case 'result_win':         this.music.setState('result_win'); break;
      case 'result_lose':        this.music.setState('result_lose'); break;
      default: break;
    }
  }

  /** Explicit music state for the menu/charge/race flow (called by the game). */
  setMusicState(state: MusicState, opts?: { speed01?: number }): void { this.music.setState(state, opts); }
  setRaceSpeed(speed01: number): void { this.music.setSpeed(speed01); }

  private duckMusic(): void {
    if (!this.ctx || !this.musicBusNode) return;
    try {
      const now = this.ctx.currentTime;
      const g = this.musicBusNode.gain;
      const full = this.settings.musicVolume;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(full * 0.35, now + 0.06);
      g.linearRampToValueAtTime(full, now + 0.5);
    } catch { /* */ }
  }

  // ---- Lifecycle ------------------------------------------------------------
  suspendForBackground(): void {
    if (this.suspended) return;
    this.suspended = true;
    this.music.suspend();
    try { this.ctx?.suspend?.(); } catch { /* */ }
  }

  resumeFromBackground(): void {
    if (!this.suspended) return;
    this.suspended = false;
    try { this.ctx?.resume?.(); } catch { /* */ }
    this.music.resume();
  }

  isSuspended(): boolean { return this.suspended; }
}
