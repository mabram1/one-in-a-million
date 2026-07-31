/**
 * Audio + haptics foundation.
 *
 * Uses test doubles for AudioContext, fetch and vibration — no speakers or real
 * audio files. Covers settings migration/persistence, bus gains + mute, cooldown
 * + polyphony, missing-file tolerance, music transitions, resume-without-duplicate
 * loop, background suspend/resume, and haptics gating.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from '../../src/audio/AudioManager';
import { SfxPlayer } from '../../src/audio/SfxPlayer';
import { HapticsManager } from '../../src/audio/HapticsManager';
import {
  DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings, normalizeSettings,
} from '../../src/audio/AudioSettings';

// ---- Test doubles -----------------------------------------------------------
function fakeParam() {
  return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} };
}
function fakeNode(extra: any = {}) {
  return { connect() {}, disconnect() {}, ...extra };
}
class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state: 'suspended' | 'running' = 'suspended';
  destination = fakeNode();
  resumed = 0; suspended = 0;
  resume() { this.state = 'running'; this.resumed++; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; this.suspended++; return Promise.resolve(); }
  createGain() { return fakeNode({ gain: fakeParam() }); }
  createBufferSource() { return fakeNode({ buffer: null, loop: false, detune: { value: 0 }, onended: null, start() {}, stop() {} }); }
  createOscillator() { return fakeNode({ type: 'sine', frequency: fakeParam(), onended: null, start() {}, stop() {} }); }
  createBiquadFilter() { return fakeNode({ type: 'bandpass', frequency: { value: 0 }, Q: { value: 0 } }); }
  createBuffer(_c: number, len: number) { return { getChannelData: () => new Float32Array(len) }; }
  decodeAudioData(_a: ArrayBuffer) { return Promise.resolve(this.createBuffer(1, 16) as any); }
}

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, v), _map: m };
}

const okFetch: any = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
const missFetch: any = async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) });

// =============================================================================
describe('AudioSettings — migration & persistence', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadAudioSettings(memStorage())).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('adopts a prior (runtime) mute preference on first migration', () => {
    expect(loadAudioSettings(memStorage(), true).muted).toBe(true);
    expect(loadAudioSettings(memStorage(), false).muted).toBe(false);
  });

  it('round-trips saved settings', () => {
    const st = memStorage();
    saveAudioSettings({ ...DEFAULT_AUDIO_SETTINGS, musicVolume: 0.25, muted: true }, st);
    const loaded = loadAudioSettings(st);
    expect(loaded.musicVolume).toBe(0.25);
    expect(loaded.muted).toBe(true);
  });

  it('recovers to defaults from corrupt data', () => {
    const st = memStorage(); st.setItem('oiam_audio_v1', '{not json');
    expect(loadAudioSettings(st)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('normalizes/clamps out-of-range values', () => {
    const n = normalizeSettings({ masterVolume: 5, musicVolume: -1, muted: 'yes' });
    expect(n.masterVolume).toBe(1);
    expect(n.musicVolume).toBe(0);
    expect(n.muted).toBe(DEFAULT_AUDIO_SETTINGS.muted);   // non-boolean -> default
  });
});

describe('AudioManager — bus gains & mute', () => {
  it('reflects individual bus volumes', () => {
    const am = new AudioManager({ storage: memStorage() });
    am.setSettings({ masterVolume: 0.8, musicVolume: 0.3, sfxVolume: 0.5, uiVolume: 0.6 });
    expect(am.busGain('master')).toBeCloseTo(0.8);
    expect(am.busGain('music')).toBeCloseTo(0.3);
    expect(am.busGain('sfx')).toBeCloseTo(0.5);
    expect(am.busGain('ui')).toBeCloseTo(0.6);
  });

  it('mute forces every bus to zero and persists', () => {
    const st = memStorage();
    const am = new AudioManager({ storage: st });
    am.setSettings({ muted: true });
    expect(am.busGain('master')).toBe(0);
    expect(am.busGain('music')).toBe(0);
    expect(am.busGain('sfx')).toBe(0);
    expect(loadAudioSettings(st).muted).toBe(true);      // saved
  });
});

describe('SfxPlayer — cooldown & polyphony', () => {
  let now = 0;
  function player() {
    const ctx = new FakeAudioContext() as any;
    const p = new SfxPlayer(ctx, () => ctx.createGain(), () => now);
    return p;
  }

  beforeEach(() => { now = 1000; });

  it('rejects a repeat within the event cooldown, allows it after', () => {
    const p = player();
    expect(p.play('collision_wbc').played).toBe(true);    // cooldown 120ms
    now += 50;
    expect(p.play('collision_wbc').reason).toBe('cooldown');
    now += 100;                                            // 150ms total > 120
    expect(p.play('collision_wbc').played).toBe(true);
  });

  it('enforces the per-event polyphony limit (stroke maxVoices=3)', () => {
    const p = player();
    // Advance past the 70ms cooldown between each so overlap (not cooldown) is
    // what limits us. The fake context never fires `onended`, so voices persist.
    const r: any[] = [];
    for (let i = 0; i < 4; i++) { r.push(p.play('stroke')); now += 80; }
    expect(r.filter((x) => x.played).length).toBe(3);
    expect(r[3].reason).toBe('polyphony');
  });

  it('picks a deterministic variant for a given seed (replay-safe)', () => {
    const p = player();
    const a = p.play('stroke', { seed: 42 }).variant;
    now += 1000;
    const b = p.play('stroke', { seed: 42 }).variant;
    expect(a).toBe(b);
  });

  it('is inert without a context (never throws, reports no-context)', () => {
    const p = new SfxPlayer(null, () => null);
    expect(p.play('stroke').reason).toBe('no-context');
  });
});

describe('SfxPlayer — missing files fall back, never block', () => {
  it('reports missing files but still plays via the procedural fallback', async () => {
    const ctx = new FakeAudioContext() as any;
    const p = new SfxPlayer(ctx, () => ctx.createGain(), () => 0);
    const missing = await p.loadAll(missFetch);
    expect(missing.length).toBeGreaterThan(0);            // everything missing
    expect(p.play('collision_wbc').played).toBe(true);    // fallback tone still fires
    expect(p.play('collision_wbc', {}).usedFallback).not.toBe(false);
  });
});

describe('MusicDirector via AudioManager — transitions & resume', () => {
  function mgr() {
    return new AudioManager({ storage: memStorage(), contextFactory: () => new FakeAudioContext() as any, fetchImpl: okFetch });
  }

  it('brings the final-sprint layer in on the final_sprint_start event', () => {
    const am = mgr(); am.unlock();
    am.setMusicState('race_fast', { speed01: 1 });
    expect(am.music.state).toBe('race_fast');
    am.handle({ name: 'final_sprint_start' });            // event drives the music
    expect(am.music.state).toBe('final_sprint');
    expect(am.music.getTargetGain('final_sprint')).toBe(1);
    // Single-track model: the race bed keeps playing continuously through the
    // sprint (it is not crossfaded out toward missing stems).
    expect(am.music.getTargetGain('race_base')).toBe(1);
  });

  it('does not restart the race loop after a background resume', () => {
    const am = mgr(); am.unlock();
    am.setMusicState('race_normal');
    expect(am.music.raceStartCount).toBe(1);
    am.suspendForBackground();
    am.resumeFromBackground();
    expect(am.music.raceStartCount).toBe(1);              // same loop, not re-started
    expect(am.music.isRaceActive()).toBe(true);
  });

  it('suspends and resumes the context on background/foreground', () => {
    const am = mgr(); am.unlock();
    const ctx: any = (am as any).ctx;
    const before = ctx.suspended;
    am.suspendForBackground();
    expect(am.isSuspended()).toBe(true);
    expect(ctx.suspended).toBe(before + 1);
    am.resumeFromBackground();
    expect(am.isSuspended()).toBe(false);
  });
});

describe('HapticsManager — gating', () => {
  it('does not vibrate when haptics are disabled', () => {
    let calls = 0;
    const h = new HapticsManager(() => { calls++; return true; });
    h.setEnabled(false);
    expect(h.play('impact')).toBe(false);
    expect(calls).toBe(0);
    h.setEnabled(true);
    expect(h.play('impact')).toBe(true);
    expect(calls).toBe(1);
  });

  it('collapses multi-pulse shapes under reduced intensity', () => {
    const patterns: (number | number[])[] = [];
    const h = new HapticsManager((p) => { patterns.push(p); return true; });
    h.setReducedIntensity(true);
    h.play('success');                                    // would be a two-pulse array
    expect(Array.isArray(patterns[0])).toBe(false);       // collapsed to a single light tick
  });
});
