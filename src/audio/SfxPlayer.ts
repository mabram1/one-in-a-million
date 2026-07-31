/**
 * One-shot sound effects: buffer loading, variant selection, pitch variation,
 * per-event cooldowns and polyphony limits, with the game's original procedural
 * Web-Audio tones preserved as fallbacks when a file is missing.
 *
 * Deliberately tolerant of a stubbed/absent AudioContext so headless tests and
 * boot-before-unlock never throw. Web Audio nodes are one-shot and released on
 * `ended` — no per-frame node accumulation.
 */
import { SFX_MANIFEST, type SfxDef, type FallbackTone } from './AudioManifest';
import type { AudioEventName } from './events';

export interface PlayInput { intensity?: number; seed?: number; }
export interface PlayResult {
  played: boolean;
  reason?: 'cooldown' | 'polyphony' | 'no-context';
  variant?: number;
  usedFallback?: boolean;
}

const GLOBAL_MAX_VOICES = 24;

/** Small deterministic 0..1 hash so variant/pitch are reproducible from a seed. */
function hash01(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 0xffffffff;
}

export class SfxPlayer {
  private ctx: AudioContext | null;
  private destFor: (bus: 'sfx' | 'ui') => AudioNode | null;
  private now: () => number;
  private buffers = new Map<string, AudioBuffer | null>();
  private noiseBuf: AudioBuffer | null = null;
  private lastPlay = new Map<AudioEventName, number>();
  private voices = new Map<AudioEventName, number>();
  private rr = new Map<AudioEventName, number>();
  private activeTotal = 0;
  private reducedIntensity = false;

  constructor(
    ctx: AudioContext | null,
    destFor: (bus: 'sfx' | 'ui') => AudioNode | null,
    now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  ) {
    this.ctx = ctx;
    this.destFor = destFor;
    this.now = now;
  }

  setContext(ctx: AudioContext | null): void {
    this.ctx = ctx;
    this.noiseBuf = null;
    if (ctx) this.buildNoise();
  }

  setReducedIntensity(v: boolean): void { this.reducedIntensity = v; }

  private buildNoise(): void {
    if (!this.ctx || this.noiseBuf) return;
    try {
      const n = Math.floor(this.ctx.sampleRate * 0.4);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    } catch { this.noiseBuf = null; }
  }

  /**
   * Best-effort preload of every variant clip. Missing/failed files resolve to
   * `null` (the event then uses its procedural fallback). Returns the list of
   * URLs that failed to load, for a single dev-only "missing audio" report.
   */
  async loadAll(
    fetchImpl: typeof fetch | undefined = typeof fetch !== 'undefined' ? fetch : undefined,
  ): Promise<string[]> {
    this.buildNoise();
    const missing: string[] = [];
    const urls = new Set<string>();
    for (const def of Object.values(SFX_MANIFEST)) for (const v of def.variants) urls.add(v[0]);
    if (!this.ctx || !fetchImpl) { return [...urls]; }   // no decoding possible yet
    await Promise.all([...urls].map(async (url) => {
      try {
        const res = await fetchImpl(url);
        if (!res || !(res as Response).ok) { this.buffers.set(url, null); missing.push(url); return; }
        const arr = await (res as Response).arrayBuffer();
        const buf = await this.decode(arr);
        this.buffers.set(url, buf);
        if (!buf) missing.push(url);
      } catch { this.buffers.set(url, null); missing.push(url); }
    }));
    return missing;
  }

  private decode(arr: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.ctx) return Promise.resolve(null);
    try {
      const p = this.ctx.decodeAudioData(arr as ArrayBuffer);
      // Some engines still use the callback form; normalise to a promise.
      return p && typeof (p as any).then === 'function'
        ? (p as Promise<AudioBuffer>).catch(() => null)
        : new Promise((resolve) => (this.ctx as any).decodeAudioData(arr, resolve, () => resolve(null)));
    } catch { return Promise.resolve(null); }
  }

  play(name: AudioEventName, input: PlayInput = {}): PlayResult {
    const def = SFX_MANIFEST[name];
    if (!def) return { played: false };
    if (!this.ctx) return { played: false, reason: 'no-context' };

    const t = this.now();
    const last = this.lastPlay.get(name);
    if (def.cooldownMs > 0 && last != null && t - last < def.cooldownMs) {
      return { played: false, reason: 'cooldown' };
    }
    const active = this.voices.get(name) || 0;
    if (active >= def.maxVoices || this.activeTotal >= GLOBAL_MAX_VOICES) {
      return { played: false, reason: 'polyphony' };
    }

    const variant = this.pickVariant(name, def, input.seed);
    const dest = this.destFor(def.bus);
    const gain = this.effectiveGain(def, input.intensity);
    const detune = this.pitch(def, input.seed, variant);

    const onEnd = () => this.release(name);
    const buf = this.bufferFor(def, variant);
    const started = buf
      ? this.playBuffer(buf, dest, gain, detune, onEnd)
      : def.fallback ? this.playFallback(def.fallback, dest, gain, input.intensity, onEnd) : false;

    if (!started) return { played: false, variant };

    this.lastPlay.set(name, t);
    this.voices.set(name, active + 1);
    this.activeTotal++;
    return { played: true, variant, usedFallback: !buf };
  }

  private pickVariant(name: AudioEventName, def: SfxDef, seed?: number): number {
    const n = def.variants.length;
    if (n <= 1) return 0;
    if (seed != null) return Math.floor(hash01(seed) * n) % n;   // deterministic for replay
    const i = (this.rr.get(name) || 0) % n;
    this.rr.set(name, i + 1);
    return i;
  }

  private pitch(def: SfxDef, seed: number | undefined, variant: number): number {
    if (!def.pitchVar) return 0;
    const base = seed != null ? hash01(seed * 31 + variant) : Math.random();
    const cents = (base * 2 - 1) * def.pitchVar * 1200;   // +/- pitchVar in cents
    return cents;
  }

  private effectiveGain(def: SfxDef, intensity?: number): number {
    let g = def.gain * (typeof intensity === 'number' ? 0.5 + 0.5 * Math.max(0, Math.min(1, intensity)) : 1);
    if (this.reducedIntensity) g *= 0.7;
    return g;
  }

  private bufferFor(def: SfxDef, variant: number): AudioBuffer | null {
    const url = def.variants[variant]?.[0];
    return url ? this.buffers.get(url) ?? null : null;
  }

  private release(name: AudioEventName): void {
    this.voices.set(name, Math.max(0, (this.voices.get(name) || 1) - 1));
    this.activeTotal = Math.max(0, this.activeTotal - 1);
  }

  private playBuffer(buf: AudioBuffer, dest: AudioNode | null, gain: number, detune: number, onEnd: () => void): boolean {
    if (!this.ctx || !dest) return false;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      try { if (src.detune) src.detune.value = detune; } catch { /* no detune param */ }
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(g); g.connect(dest);
      src.onended = () => { onEnd(); try { src.disconnect(); g.disconnect(); } catch { /* */ } };
      src.start();
      return true;
    } catch { return false; }
  }

  // ---- Procedural fallbacks (ported verbatim from the pre-refactor game audio) --
  private playFallback(tone: FallbackTone, dest: AudioNode | null, gain: number, intensity = 0.7, onEnd: () => void = () => {}): boolean {
    if (!this.ctx || !dest) return false;
    const ctx = this.ctx, t = ctx.currentTime;
    const attach = (node: { onended: any }) => { try { node.onended = () => onEnd(); } catch { onEnd(); } };
    try {
      if (tone === 'stroke') {
        this.buildNoise();
        if (!this.noiseBuf) return false;
        const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480 + intensity * 900; bp.Q.value = 0.8;
        const g = ctx.createGain(); const v = (0.05 + intensity * 0.12) * gain;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        src.connect(bp); bp.connect(g); g.connect(dest); attach(src); src.start(t); src.stop(t + 0.24);
        return true;
      }
      const o = ctx.createOscillator(), g = ctx.createGain(); attach(o);
      if (tone === 'hit') { o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.3);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.36); return true; }
      if (tone === 'pickup') { o.type = 'triangle'; const p = 0.5 + intensity; o.frequency.setValueAtTime(560 * p, t); o.frequency.exponentialRampToValueAtTime(1120 * p, t + 0.11);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.22); return true; }
      if (tone === 'launch') { o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(720, t + 0.35);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * gain, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.52); return true; }
      // fwip
      o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(210, t + 0.16);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 * gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.22);
      return true;
    } catch { return false; }
  }
}
