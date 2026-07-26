/**
 * Multiplayer finish authority (task P1-11).
 *
 * Clients self-report position, so peers cannot be fully trusted without a
 * server. What the game DOES enforce P2P:
 *   - one shared seeded track (host broadcasts the seed — see challenge-format),
 *   - each peer's FIRST physically-plausible finish time is authoritative,
 *   - repeat / contradictory finish reports are deduplicated (idempotent),
 *   - impossible finish times (faster than OVER_CAP allows) are rejected.
 * Placement is then computed from that validated finish set.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';

let h: Harness;
beforeEach(() => {
  h = setupGame();
  h.setLevelLength(600 * h.tuning.camera.pxPerUnit);   // 600 m track
  h.MP.active = true; h.MP.started = true; h.MP.id = 'me';
  h.MP.peers = {}; h.MP.finishes = {};
});

// Fastest physically-possible time to cover the 600 m track: LEVEL_LENGTH / OVER_CAP,
// with LEVEL_LENGTH = 600 * pxPerUnit(5.0) = 3000 px and OVER_CAP = 132 px/s.
const overCapFloor = () => (600 * 5.0) / 132;

describe('finish validation', () => {
  it('records a peer finish only once (idempotent) and keeps the FIRST time', () => {
    const ft = overCapFloor() + 20;                      // comfortably legal
    h.ingestPeerState('peerA', { d: 3000, x: 0, n: 'A', fin: 1, ft });
    h.ingestPeerState('peerA', { d: 3000, x: 0, n: 'A', fin: 1, ft: ft + 15 });   // later, contradictory
    expect(Object.keys(h.MP.finishes)).toEqual(['peerA']);
    expect(h.MP.finishes.peerA).toBe(ft);                // first report wins
  });

  it('rejects a physically impossible finish time (anti-cheat)', () => {
    h.ingestPeerState('cheater', { d: 3000, x: 0, n: 'X', fin: 1, ft: 0.5 });
    expect(h.MP.finishes.cheater).toBeUndefined();
    expect(overCapFloor()).toBeGreaterThan(1);           // sanity: the floor is meaningful
  });

  it('rejects missing / non-positive finish times', () => {
    h.ingestPeerState('a', { d: 1, x: 0, n: 'a', fin: 1, ft: 0 });
    h.ingestPeerState('b', { d: 1, x: 0, n: 'b', fin: 1, ft: -3 });
    h.ingestPeerState('c', { d: 1, x: 0, n: 'c', fin: 1 });          // no ft
    expect(Object.keys(h.MP.finishes).length).toBe(0);
  });

  it('ignores our own id echoed back', () => {
    h.ingestPeerState('me', { d: 3000, x: 0, n: 'me', fin: 1, ft: overCapFloor() + 10 });
    expect(Object.keys(h.MP.finishes).length).toBe(0);
    expect(Object.keys(h.MP.peers).length).toBe(0);
  });

  it('a non-finish update still tracks the peer for interpolation but records no finish', () => {
    h.ingestPeerState('peerB', { d: 1500, x: 0.3, n: 'B', fin: 0, ft: 0 });
    expect(h.MP.peers.peerB).toBeDefined();
    expect(h.MP.peers.peerB.td).toBe(1500);
    expect(Object.keys(h.MP.finishes).length).toBe(0);
  });
});

describe('placement from the validated finish set', () => {
  it('counts only peers who legitimately finished before us', () => {
    const early = overCapFloor() + 10;
    const late = overCapFloor() + 40;
    h.ingestPeerState('fast', { d: 3000, x: 0, n: 'F', fin: 1, ft: early });
    h.ingestPeerState('slow', { d: 3000, x: 0, n: 'S', fin: 1, ft: late });
    h.G.elapsed = overCapFloor() + 25;                   // we beat 'slow' but not 'fast'

    const { place, total } = h.mpPlacement();
    expect(total).toBe(3);                               // fast + slow + us
    expect(place).toBe(2);                               // one peer (fast) ahead
  });

  it('a rejected cheat time does not steal a place', () => {
    h.ingestPeerState('cheater', { d: 3000, x: 0, n: 'X', fin: 1, ft: 0.1 });
    h.G.elapsed = overCapFloor() + 30;
    const { place, total } = h.mpPlacement();
    expect(total).toBe(2);                               // cheater still counts as present
    expect(place).toBe(1);                               // but did not finish ahead
  });
});
