/**
 * Pure unit tests for the replay/challenge codec (no game, no DOM).
 * Proves the module is correct in isolation (audit P1-08).
 */
import { describe, it, expect } from 'vitest';
import {
  encodeDeltas, decodeDeltas, interpolateAt, fnv1a,
  encodeChallengeCode, decodeChallengeCode,
} from '../../src/game/replay/codec';

describe('delta encoding', () => {
  it('round-trips a monotonic distance curve (within rounding)', () => {
    const dists = [0, 3, 9, 20, 34, 51, 51, 63];
    const round = decodeDeltas(encodeDeltas(dists));
    expect(round.length).toBe(dists.length);
    for (let i = 0; i < dists.length; i++) {
      expect(Math.abs(round[i] - Math.round(dists[i]))).toBeLessThanOrEqual(1);
    }
  });

  it('clamps per-step deltas to the 0..63 range but preserves the endpoint via cumulative sum', () => {
    const s = encodeDeltas([0, 10, 20, 30]);
    const d = decodeDeltas(s);
    expect(d[d.length - 1]).toBe(30);
  });
});

describe('interpolateAt', () => {
  it('interpolates between 0.1s samples', () => {
    const dists = [0, 10, 20, 30];      // t = 0, .1, .2, .3
    expect(interpolateAt(dists, 0)).toBe(0);
    expect(interpolateAt(dists, 0.15)).toBeCloseTo(15, 5);
    expect(interpolateAt(dists, 1)).toBe(30);   // past the end → last value
    expect(interpolateAt([], 5)).toBe(0);
  });
});

describe('fnv1a', () => {
  it('is stable and unsigned', () => {
    const a = fnv1a('hello');
    expect(a).toBe(fnv1a('hello'));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(fnv1a('hellp')).not.toBe(a);
  });
});

describe('challenge v2 codec', () => {
  const dists = [0, 8, 17, 29, 44, 60, 60, 61];

  it('encodes a versioned code and decodes it back', () => {
    const code = encodeChallengeCode({ seed: 0xdeadbeef, distM: 1000, tuningVersion: '1.0.0', durMs: 40600, dists });
    expect(code.startsWith('2~')).toBe(true);

    const dec = decodeChallengeCode(code);
    expect(dec.version).toBe(2);
    expect(dec.valid).toBe(true);
    expect(dec.seed).toBe(0xdeadbeef >>> 0);
    expect(dec.distM).toBe(1000);
    expect(dec.tv).toBe('1.0.0');
    expect(dec.durMs).toBe(40600);
    expect(dec.dists[dec.dists.length - 1]).toBe(61);
  });

  it('flags a corrupted payload as invalid', () => {
    const code = encodeChallengeCode({ seed: 1, distM: 750, tuningVersion: '1.0.0', durMs: 1000, dists });
    const parts = code.split('~');
    parts[6] = parts[6].slice(0, -2) + 'ZZ';           // tamper
    expect(decodeChallengeCode(parts.join('~')).valid).toBe(false);
  });

  it('decodes a bare v1 payload as legacy (no seed)', () => {
    const v1 = encodeDeltas(dists);                    // no header
    const dec = decodeChallengeCode(v1);
    expect(dec.version).toBe(1);
    expect(dec.seed).toBeNull();
    expect(dec.dists.length).toBe(dists.length);
    expect(dec.valid).toBe(true);
  });
});
