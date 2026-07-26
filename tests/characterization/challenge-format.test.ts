/**
 * Challenge / replay format v2 (task P1-06).
 *
 * v2 carries the track seed + tuning version so a friend races the SAME
 * seeded track (fair time comparison). v1 links must still decode and play,
 * flagged legacy. Ghost compatibility is protected — backward compatibility of
 * v1 is a hard requirement, verified here.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';
import { tuningVersion } from '../../src/game/config/tuning';

let h: Harness;
beforeAll(() => { h = setupGame(); });
afterAll(() => h.restore());

/** Race a full run at a fixed seed and return its shared challenge code. */
function recordChallenge(seed: number, metres = 1000): string {
  // Start from a clean slate: the game instance is shared across tests, and a
  // ghost/challenge left loaded by an earlier test would make practicePlay reuse
  // its level length instead of the fresh `metres` distance we want to record.
  h.G.ghost = null; h.G.challengeSeed = null; h.G.challengeLegacy = false; h.G.challengeLevelUnits = 0;
  h.G._seedOverride = seed;
  const chip = [...document.querySelectorAll('#distChips .chip')]
    .find((c) => (c as HTMLElement).dataset.m === String(metres)) as HTMLElement;
  chip.click();
  (document.getElementById('practicePlay') as HTMLElement).click();
  h.step(2200);
  h.shakeFor(4.4);
  h.stepUntilState('playing', 2000);
  // Drive all the way to the egg (shaking to keep speed up) so a full run is
  // recorded and endRun builds the challenge code.
  let guard = 0;
  while (h.G.state !== 'end' && guard < 120000) {
    h.stroke();
    h.step(90); guard += 90;
  }
  return h.G.lastGhostCode as string;
}

describe('v2 encode → decode', () => {
  it('produces a versioned code that round-trips with the seed and tuning version', () => {
    const seed = 0x0badf00d;
    const code = recordChallenge(seed, 1000);
    expect(code.startsWith('2~')).toBe(true);

    const dec = h.decodeChallenge(code);
    expect(dec.version).toBe(2);
    expect(dec.valid).toBe(true);
    expect(dec.seed).toBe(seed >>> 0);
    expect(dec.tv).toBe(tuningVersion);
    expect(dec.distM).toBe(1000);
    expect(dec.durMs).toBeGreaterThan(0);
    expect(dec.dists.length).toBeGreaterThan(5);
  });

  it('detects corruption via checksum', () => {
    const code = recordChallenge(0x12345, 1000);
    const parts = code.split('~');
    parts[6] = parts[6].slice(0, -3) + 'AAA';   // tamper with the payload
    const dec = h.decodeChallenge(parts.join('~'));
    expect(dec.valid).toBe(false);
  });
});

describe('v1 legacy compatibility (protected)', () => {
  it('still decodes a bare v1 delta string and flags it legacy', () => {
    // A v1 code is just the delta payload with no header.
    const v2 = recordChallenge(0x999, 1000);
    const v1 = v2.split('~').slice(6).join('~');      // strip the v2 header
    const dec = h.decodeChallenge(v1);
    expect(dec.version).toBe(1);
    expect(dec.seed).toBeNull();
    expect(dec.dists.length).toBeGreaterThan(5);

    expect(h.setChallenge(dec)).toBe(true);
    expect(h.G.challengeLegacy).toBe(true);           // labelled legacy
    expect(h.G.ghost.length).toBeGreaterThan(5);      // still playable
  });
});

describe('loading a v2 challenge reproduces the creator’s track', () => {
  it('a race started from the challenge uses the creator’s seed and distance', () => {
    const seed = 0x1a2b3c4d;

    // Creator records a run; capture their in-race track (visible obstacles at a fixed point).
    const code = recordChallenge(seed, 1000);
    const creatorDist = Math.round(h.G.raceSeed);       // == seed (creator used it)
    expect(creatorDist).toBe(seed >>> 0);

    // Friend loads the challenge and starts it.
    const dec = h.decodeChallenge(code);
    expect(h.setChallenge(dec)).toBe(true);
    expect(h.G.challengeSeed).toBe(seed >>> 0);
    expect(h.G.challengeLegacy).toBe(false);            // fair: seeded + matching tuning
    expect(Math.round(h.G.challengeLevelUnits / h.tuning.camera.pxPerUnit)).toBe(1000);

    (document.getElementById('practicePlay') as HTMLElement).click();   // starts the challenge race
    expect(h.G.raceSeed).toBe(seed >>> 0);              // friend races the SAME seed
    // And a ghost is present to race against.
    expect(h.G.ghost.length).toBeGreaterThan(5);
  });
});

describe('multiplayer start shares one seed', () => {
  it('the host broadcasts a seed and races on it (so joiners can match)', () => {
    // Host in a live lobby; capture what gets broadcast.
    h.MP.active = true; h.MP.started = false; h.MP.isHost = true;
    const sent: any[] = [];
    h.MP.send = () => {};
    h.MP.sendGo = (p: any) => sent.push(p);

    // Real host path: the START button generates + broadcasts a seed, then races on it.
    (document.getElementById('lobbyStart') as HTMLElement).click();

    expect(sent.length).toBe(1);
    expect(typeof sent[0].seed).toBe('number');
    expect(sent[0].m).toBe(h.tuning.race.multiplayerDefaultM);
    // The host races the exact seed it told everyone else to use.
    expect(h.G.raceSeed).toBe(sent[0].seed >>> 0);

    h.MP.active = false; h.MP.isHost = false;
  });
});
