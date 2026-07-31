/**
 * Procedural SFX generator — writes ORIGINAL, royalty-free one-shot sound effects
 * as 16-bit mono WAV files into public/audio/sfx/. Pure Node (no deps), fully
 * deterministic (seeded noise) so re-runs are byte-identical.
 *
 * Run:  node scripts/gen-sfx.mjs
 *
 * These are "cute premium arcade" effects (not gross/wet/anatomical). Music is
 * produced separately (Suno) — this script only makes SFX.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/audio/sfx');
fs.mkdirSync(OUT, { recursive: true });

// ---- deterministic noise -----------------------------------------------------
let _seed = 0x1234abcd;
const rnd = () => { _seed = (Math.imul(_seed ^ (_seed >>> 15), 0x2c1b3c6d) ^ 0x9e3779b9) >>> 0; return _seed / 0xffffffff; };
const noise = () => rnd() * 2 - 1;

// ---- primitives --------------------------------------------------------------
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// exponential glide between f0..f1 over the note (t in 0..1)
const glide = (f0, f1, t) => f0 * Math.pow(f1 / f0, t);

function osc(type, phase) {
  switch (type) {
    case 'sine': return Math.sin(phase);
    case 'tri': return Math.asin(Math.sin(phase)) * (2 / Math.PI);
    case 'saw': return 2 * ((phase / TAU) % 1) - 1;
    case 'square': return Math.sin(phase) >= 0 ? 1 : -1;
    default: return Math.sin(phase);
  }
}

// ADSR-ish env: fast attack, exp decay to sustain, release. All seconds.
function env(t, dur, a = 0.005, d = 0.05, s = 0.6, r = 0.08) {
  if (t < a) return t / a;
  if (t < a + d) return lerp(1, s, (t - a) / d);
  const rel = dur - r;
  if (t >= rel) return s * clamp(1 - (t - rel) / r, 0, 1);
  return s;
}
const pluck = (t, dur, decay = 8) => Math.exp(-decay * (t / dur));

/** Build a mono Float32Array by summing tone/noise voices. */
function render(dur, fn) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = fn(t, i, (f) => (ph += (TAU * f) / SR), (f) => (ph2 += (TAU * f) / SR), () => ph, () => ph2);
  }
  return out;
}

function normalize(buf, peak = 0.9) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  if (m > 0) { const g = peak / m; for (let i = 0; i < buf.length; i++) buf[i] *= g; }
  // 4ms fade out to kill any tail click
  const f = Math.min(buf.length, Math.round(0.004 * SR));
  for (let i = 0; i < f; i++) buf[buf.length - 1 - i] *= i / f;
  return buf;
}

function writeWav(name, buf) {
  const n = buf.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(clamp(buf[i], -1, 1) * 32767), 44 + i * 2);
  fs.writeFileSync(path.join(OUT, name + '.wav'), b);
}

// ---- individual effects ------------------------------------------------------
const S = {
  ui_click: () => normalize(render(0.05, (t, i, a, _b, p) => { a(1500); return osc('sine', p()) * pluck(t, 0.05, 22) * 0.9; }), 0.7),
  ui_back:  () => normalize(render(0.07, (t, i, a, _b, p) => { a(glide(900, 520, t / 0.07)); return osc('sine', p()) * pluck(t, 0.07, 14); }), 0.7),

  charge_start: () => normalize(render(0.22, (t, i, a, _b, p) => { a(glide(200, 520, t / 0.22)); return osc('saw', p()) * env(t, 0.22, 0.02, 0.05, 0.7, 0.06) * 0.6; })),
  charge_tick:  () => normalize(render(0.06, (t) => noise() * pluck(t, 0.06, 30) * 0.5), 0.5),

  launch_weak:      () => normalize(render(0.30, (t, i, a, _b, p) => { a(glide(120, 480, t / 0.30)); return osc('saw', p()) * env(t, 0.30, 0.01, 0.06, 0.5, 0.1); }), 0.75),
  launch_perfect:   () => normalize(render(0.46, (t, i, a, b, p, q) => { a(glide(140, 820, t / 0.46)); b(glide(560, 1640, t / 0.46)); return osc('saw', p()) * env(t, 0.46, 0.01, 0.06, 0.6, 0.12) + osc('sine', q()) * 0.25 * pluck(t, 0.46, 3); })),
  launch_overcooked:() => normalize(render(0.30, (t, i, a, _b, p) => { a(glide(300, 90, t / 0.30)); return (osc('square', p()) * 0.6 + noise() * 0.2) * env(t, 0.30, 0.005, 0.1, 0.4, 0.12); }), 0.7),

  stroke_01: () => strokeSwish(0.16, 900),
  stroke_02: () => strokeSwish(0.15, 1150),
  stroke_03: () => strokeSwish(0.17, 720),

  boost_activate:  () => normalize(render(0.28, (t, i, a, b, p, q) => { a(glide(200, 940, t / 0.28)); b(glide(300, 1400, t / 0.28)); return (osc('saw', p()) * 0.6 + osc('square', q()) * 0.3) * env(t, 0.28, 0.01, 0.06, 0.6, 0.1); })),
  shield_activate: () => normalize(render(0.30, (t, i, a, b, p, q) => { a(glide(420, 820, t / 0.30)); b(glide(640, 1240, t / 0.30)); return (osc('tri', p()) * 0.6 + osc('sine', q()) * 0.4) * env(t, 0.30, 0.02, 0.06, 0.7, 0.1); }), 0.8),

  collision_wall_01: () => thud(0.24, 180, 60, 'square'),
  collision_wall_02: () => thud(0.22, 150, 52, 'square'),
  collision_wbc:     () => thud(0.24, 210, 72, 'sine'),
  collision_virus:   () => normalize(render(0.24, (t, i, a, _b, p) => { a(glide(240, 80, t / 0.24)); return (osc('square', p()) * 0.6 + noise() * 0.25) * env(t, 0.24, 0.004, 0.08, 0.4, 0.1); }), 0.85),
  collision_membrane:() => thud(0.20, 160, 92, 'sine', 0.7),

  pickup_star_01: () => arp(0.18, [784, 1175]),         // G5 -> D6
  pickup_star_02: () => arp(0.18, [988, 1319]),         // B5 -> E6
  pickup_shield:  () => arp(0.22, [523, 659, 784]),     // C5 E5 G5 chord-up
  pickup_speed:   () => normalize(render(0.20, (t, i, a, _b, p) => { a(glide(500, 1250, t / 0.20)); return osc('sine', p()) * env(t, 0.20, 0.01, 0.05, 0.7, 0.06); }), 0.8),

  checkpoint:         () => arp(0.26, [659, 988]),       // E5 -> B5 confirm
  final_sprint_start: () => normalize(render(0.42, (t, i, a, b, p, q) => { a(glide(330, 990, t / 0.42)); b(660); return osc('saw', p()) * 0.5 * env(t, 0.42, 0.01, 0.08, 0.6, 0.12) + osc('sine', q()) * 0.35 * env(t, 0.42, 0.05, 0.1, 0.6, 0.14); })),

  // ---- finish sequence (the required direction) ----
  finish_impact:       () => normalize(render(0.22, (t, i, a, b, p, q) => { a(glide(230, 90, t / 0.22)); b(glide(115, 60, t / 0.22)); return (osc('sine', p()) * 0.7 + osc('sine', q()) * 0.4) * env(t, 0.22, 0.003, 0.05, 0.5, 0.1); }), 0.9), // soft rubbery boomp
  finish_membrane_pop: () => normalize(render(0.12, (t, i, a, _b, p) => { const f = t < 0.04 ? glide(500, 1300, t / 0.04) : glide(1300, 700, (t - 0.04) / 0.08); a(f); return osc('sine', p()) * pluck(t, 0.12, 12) + (t < 0.006 ? noise() * 0.4 : 0); }), 0.85), // clean elastic pop
  finish_suction:      () => normalize(render(0.18, (t, i, a, _b, p) => { a(glide(900, 210, t / 0.18)); return osc('sine', p()) * env(t, 0.18, 0.01, 0.04, 0.6, 0.08) * 0.8 + noise() * 0.12 * (1 - t / 0.18); }), 0.8), // airy fwip
  finish_seal:         () => normalize(render(0.12, (t, i, a, _b, p) => { a(glide(300, 150, t / 0.12)); return osc('sine', p()) * pluck(t, 0.12, 16); }), 0.7), // small soft plup

  result_win:  () => chord(1.1, [523.25, 659.25, 783.99], true),   // C major, warm + rise
  result_lose: () => chord(0.9, [440, 523.25, 349.23], false),     // soft descending-ish
};

function strokeSwish(dur, center) {
  return normalize(render(dur, (t) => {
    const e = Math.sin((t / dur) * Math.PI);                 // swell
    const bp = noise() * 0.6 + Math.sin((t / dur) * center * TAU * 0.001) * 0.1;
    return bp * e * 0.7;
  }), 0.6);
}
function thud(dur, f0, f1, type, peak = 0.85) {
  return normalize(render(dur, (t, i, a, _b, p) => { a(glide(f0, f1, t / dur)); return osc(type, p()) * env(t, dur, 0.004, 0.07, 0.4, 0.1); }), peak);
}
function arp(dur, freqs) {
  const step = dur / freqs.length;
  return normalize(render(dur, (t, i, a, _b, p) => {
    const idx = Math.min(freqs.length - 1, Math.floor(t / step));
    a(freqs[idx]);
    const lt = (t - idx * step) / step;
    return osc('tri', p()) * pluck(lt, step, 5) * 0.9;
  }), 0.8);
}
function chord(dur, freqs, rise) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const ph = freqs.map(() => 0);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const detune = rise ? glide(0.985, 1.0, clamp(t / 0.25, 0, 1)) : glide(1.01, 0.99, t / dur);
    let s = 0;
    for (let k = 0; k < freqs.length; k++) { ph[k] += (TAU * freqs[k] * detune) / SR; s += (osc('sine', ph[k]) * 0.6 + osc('tri', ph[k]) * 0.3); }
    out[i] = (s / freqs.length) * env(t, dur, 0.01, 0.15, 0.7, 0.35);
  }
  return normalize(out, 0.85);
}

let count = 0;
for (const [name, make] of Object.entries(S)) { writeWav(name, make()); count++; }
console.log(`Wrote ${count} SFX WAV files to ${OUT}`);
