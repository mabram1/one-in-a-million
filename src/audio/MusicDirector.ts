/**
 * Adaptive music. The three race stems (base / speed / final_sprint) are one
 * synchronized loop: they start together on the same AudioContext clock and are
 * mixed with per-stem gains — speed and sprint layers fade IN over the base, we
 * never stop/restart tracks when the state changes. Menu and result stings are
 * separate. Everything degrades to a silent no-op when files are missing or the
 * context is absent, and resume never double-starts a running loop.
 */
import { MUSIC_MANIFEST, RACE_STEMS, type MusicTrack } from './AudioManifest';

export type MusicState =
  | 'idle' | 'menu' | 'charging'
  | 'race_normal' | 'race_fast' | 'final_sprint'
  | 'finishing' | 'result_win' | 'result_lose';

/**
 * Target mix (0..1) for each race stem per state.
 *
 * The game currently ships ONE race track (race_base = "Neon Turbo Dash"), so the
 * bed plays continuously through the whole race at a steady level; the optional
 * race_speed / final_sprint LAYERS add on top only if those files ever exist
 * (they don't today, so they contribute nothing). This keeps the single track
 * audible the entire race instead of crossfading toward missing stems.
 */
function raceMix(state: MusicState, speed01: number): Record<MusicTrack, number> {
  const z: Record<MusicTrack, number> = { menu_base: 0, race_base: 0, race_speed: 0, final_sprint: 0, result_win: 0, result_lose: 0 };
  const x = Math.max(0, Math.min(1, speed01));
  switch (state) {
    case 'charging':     return { ...z, race_base: 0.6 };
    case 'race_normal':  return { ...z, race_base: 1 };
    case 'race_fast':    return { ...z, race_base: 1, race_speed: x * 0.6 };   // base always on; speed layer optional
    case 'final_sprint': return { ...z, race_base: 1, race_speed: 0.6, final_sprint: 1 };
    case 'finishing':    return { ...z, race_base: 0.18, final_sprint: 0.1 };  // duck for the finish sequence
    default:             return z;
  }
}

const RAMP_FAST = 0.12;   // s — quick, click-free
const RAMP_SLOW = 0.6;

export class MusicDirector {
  private ctx: AudioContext | null;
  private bus: AudioNode | null;
  private warn: (msg: string) => void;
  private buffers = new Map<MusicTrack, AudioBuffer | null>();
  private stemGain = new Map<MusicTrack, GainNode>();
  private stemSource = new Map<MusicTrack, AudioBufferSourceNode>();
  private menuSource: AudioBufferSourceNode | null = null;
  private menuGain: GainNode | null = null;

  state: MusicState = 'idle';
  private speed01 = 0;
  private raceActive = false;
  private menuActive = false;
  private suspended = false;
  private missing: string[] = [];

  // Observable target mix (kept in sync even without a real context, for tests).
  private targetGain = new Map<MusicTrack, number>();
  /** How many times the synchronized race loop has been (re)started. */
  raceStartCount = 0;
  menuStartCount = 0;

  constructor(ctx: AudioContext | null, musicBus: AudioNode | null, warn: (msg: string) => void = () => {}) {
    this.ctx = ctx;
    this.bus = musicBus;
    this.warn = warn;
  }

  setContext(ctx: AudioContext | null, musicBus: AudioNode | null): void {
    this.ctx = ctx; this.bus = musicBus;
  }

  getTargetGain(track: MusicTrack): number { return this.targetGain.get(track) || 0; }
  isRaceActive(): boolean { return this.raceActive; }
  isSuspended(): boolean { return this.suspended; }
  missingFiles(): string[] { return [...this.missing]; }

  async load(fetchImpl: typeof fetch | undefined = typeof fetch !== 'undefined' ? fetch : undefined): Promise<string[]> {
    this.missing = [];
    if (!this.ctx || !fetchImpl) { this.missing = allMusicUrls(); return this.missing; }
    await Promise.all((Object.keys(MUSIC_MANIFEST) as MusicTrack[]).map(async (track) => {
      const def = MUSIC_MANIFEST[track];
      for (const url of def.sources) {
        try {
          const res = await fetchImpl(url);
          if (!res || !(res as Response).ok) continue;
          const arr = await (res as Response).arrayBuffer();
          const buf = await this.decode(arr);
          if (buf) { this.buffers.set(track, buf); return; }
        } catch { /* try next source */ }
      }
      this.buffers.set(track, null);
      this.missing.push(def.sources[0]);
    }));
    if (this.missing.length) this.warn(`[audio] ${this.missing.length} music file(s) missing — continuing without music.`);
    return this.missing;
  }

  private decode(arr: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.ctx) return Promise.resolve(null);
    try {
      const p = this.ctx.decodeAudioData(arr as ArrayBuffer);
      return p && typeof (p as any).then === 'function'
        ? (p as Promise<AudioBuffer>).catch(() => null)
        : new Promise((resolve) => (this.ctx as any).decodeAudioData(arr, resolve, () => resolve(null)));
    } catch { return Promise.resolve(null); }
  }

  /** Enter a music state. Starts/stops the underlying loops as needed; mixing is
   *  done with gain ramps, never by restarting a running loop. */
  setState(state: MusicState, opts: { speed01?: number } = {}): void {
    if (typeof opts.speed01 === 'number') this.speed01 = opts.speed01;
    this.state = state;

    if (state === 'menu' || state === 'idle') {
      this.stopRace();
      if (state === 'menu') this.startMenu(); else this.stopMenu();
    } else if (state === 'result_win' || state === 'result_lose') {
      // Duck/stop the race bed; a one-shot sting plays, then the caller returns to menu.
      this.stopRace();
      this.playSting(state === 'result_win' ? 'result_win' : 'result_lose');
    } else {
      // charging / race_* / final_sprint / finishing — the shared race loop.
      this.stopMenu();
      this.startRace();
    }
    this.applyMix(state === 'final_sprint' || state === 'finishing' ? RAMP_FAST : RAMP_SLOW);
  }

  setSpeed(speed01: number): void {
    this.speed01 = Math.max(0, Math.min(1, speed01));
    if (this.state === 'race_fast') this.applyMix(RAMP_FAST);
  }

  private applyMix(ramp: number): void {
    const mix = raceMix(this.state, this.speed01);
    for (const track of RACE_STEMS) {
      const target = this.suspended ? 0 : mix[track];
      this.targetGain.set(track, target);
      this.rampStem(track, target, ramp);
    }
  }

  private rampStem(track: MusicTrack, target: number, ramp: number): void {
    const g = this.stemGain.get(track); if (!g || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(target, now + ramp);
    } catch { /* stub gain */ }
  }

  private startRace(): void {
    if (this.raceActive) return;           // never double-start a running loop
    this.raceActive = true;
    this.raceStartCount++;
    if (!this.ctx || !this.bus) return;
    const start = this.ctx.currentTime + 0.02;   // one shared clock => sample-aligned
    for (const track of RACE_STEMS) {
      const buf = this.buffers.get(track);
      try {
        const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.bus);
        this.stemGain.set(track, g);
        if (buf) {
          const src = this.ctx.createBufferSource();
          src.buffer = buf; src.loop = true; src.connect(g); src.start(start);
          this.stemSource.set(track, src);
        }
      } catch { /* stub */ }
    }
  }

  private stopRace(): void {
    if (!this.raceActive) return;
    this.raceActive = false;
    for (const [, src] of this.stemSource) { try { src.stop(); src.disconnect(); } catch { /* */ } }
    for (const [, g] of this.stemGain) { try { g.disconnect(); } catch { /* */ } }
    this.stemSource.clear(); this.stemGain.clear();
    for (const t of RACE_STEMS) this.targetGain.set(t, 0);
  }

  private startMenu(): void {
    if (this.menuActive) return;
    this.menuActive = true;
    this.menuStartCount++;
    this.targetGain.set('menu_base', this.suspended ? 0 : 1);
    if (!this.ctx || !this.bus) return;
    const buf = this.buffers.get('menu_base');
    try {
      const g = this.ctx.createGain(); g.gain.value = this.suspended ? 0 : 1; g.connect(this.bus);
      this.menuGain = g;
      if (buf) { const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(g); src.start(); this.menuSource = src; }
    } catch { /* */ }
  }

  private stopMenu(): void {
    if (!this.menuActive) return;
    this.menuActive = false;
    this.targetGain.set('menu_base', 0);
    try { this.menuSource?.stop(); this.menuSource?.disconnect(); } catch { /* */ }
    try { this.menuGain?.disconnect(); } catch { /* */ }
    this.menuSource = null; this.menuGain = null;
  }

  private playSting(track: MusicTrack): void {
    if (!this.ctx || !this.bus) return;
    const buf = this.buffers.get(track); if (!buf) return;
    try {
      const g = this.ctx.createGain(); g.gain.value = this.suspended ? 0 : 1; g.connect(this.bus);
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = false; src.connect(g);
      src.onended = () => { try { src.disconnect(); g.disconnect(); } catch { /* */ } };
      src.start();
    } catch { /* */ }
  }

  /** App backgrounded: silence music WITHOUT tearing down loops (so resume is seamless). */
  suspend(): void {
    if (this.suspended) return;
    this.suspended = true;
    for (const t of RACE_STEMS) this.rampStem(t, 0, RAMP_FAST);
    try { if (this.menuGain && this.ctx) this.menuGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + RAMP_FAST); } catch { /* */ }
  }

  /** App foregrounded: restore levels. Never restarts an already-running loop. */
  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    this.applyMix(RAMP_FAST);
    try { if (this.menuActive && this.menuGain && this.ctx) this.menuGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + RAMP_FAST); } catch { /* */ }
    if (this.menuActive) this.targetGain.set('menu_base', 1);
  }

  stopAll(): void { this.stopRace(); this.stopMenu(); this.state = 'idle'; }
}

function allMusicUrls(): string[] {
  return (Object.keys(MUSIC_MANIFEST) as MusicTrack[]).map((t) => MUSIC_MANIFEST[t].sources[0]);
}
