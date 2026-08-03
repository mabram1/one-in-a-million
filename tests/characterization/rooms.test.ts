/**
 * Multiplayer Rooms v2 — room codes, invite links, and guest/linked gating.
 *
 * Exercises the REAL helpers from the shipped game handle. Network transport
 * (Supabase Realtime / P2P) is out of scope here; these lock the deterministic,
 * offline-testable contract + the account-gated room-choice UI.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';
import { getProfileStore } from '../../src/app/profileStore';

let h: Harness;
beforeEach(() => { h = setupGame(); });

describe('room codes + seed', () => {
  it('sanitizes a room code (uppercase, alphanumeric, capped)', () => {
    expect(h.cleanRoomCode('  ab-cd ')).toBe('ABCD');
    expect(h.cleanRoomCode('x!@#y9z')).toBe('XY9Z');
    expect(h.cleanRoomCode('abcdefghijkl')).toHaveLength(8);   // capped at 8
    expect(h.cleanRoomCode(null)).toBe('');
  });

  it('public room code is deterministic per one-minute window', () => {
    const base = 100 * 60000;
    expect(h.publicRoomCode(base)).toBe(h.publicRoomCode(base + 30000));   // same minute -> same room
    expect(h.publicRoomCode(base)).not.toBe(h.publicRoomCode(base + 60000)); // next minute -> new room
  });

  it('derives a deterministic track seed from a room code (shared track)', () => {
    expect(h.roomSeed('ABCD')).toBe(h.roomSeed('ABCD'));
    expect(h.roomSeed('ABCD')).not.toBe(h.roomSeed('WXYZ'));
    expect(Number.isInteger(h.roomSeed('ABCD'))).toBe(true);
  });
});

describe('invite link', () => {
  it('uses the public app base (never localhost) and the #room= deep link', () => {
    const link = h.privateInviteLink('AB12');
    expect(link).toMatch(/^https?:\/\//);
    expect(link).toContain('#room=AB12');
    expect(link).not.toMatch(/localhost|127\.0\.0\.1/);   // must be shareable, not a dev URL
    expect(h.publicAppBase()).not.toMatch(/localhost|127\.0\.0\.1/);
  });
});

describe('multiplayer choice screen + account gating', () => {
  it('opening Multiplayer shows the choice screen with public + private + code-join', () => {
    h.openRoomChoice(false);
    expect(document.getElementById('roomChoice')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('publicJoin')).toBeTruthy();      // JOIN OPEN RACE
    expect(document.getElementById('privateCreate')).toBeTruthy();   // CREATE A ROOM
    expect(document.getElementById('privateJoin')).toBeTruthy();     // ROOM CODE + JOIN
    expect(document.getElementById('roomChoiceDivider')?.style.display).not.toBe('none');
  });

  it('a guest cannot create a room (button disabled -> "SIGN IN TO CREATE") but joining stays open', () => {
    // Default profile is a Guest.
    expect(h.isLinkedPlayer()).toBe(false);
    h.openRoomChoice(false);
    const create = document.getElementById('privateCreate') as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(create.textContent).toBe('SIGN IN TO CREATE');
    expect(document.getElementById('privateGuestNote')?.classList.contains('hidden')).toBe(false);
    // Joining by code remains available to guests.
    expect((document.getElementById('privateJoin') as HTMLButtonElement).disabled).toBe(false);

    // After linking, the guest becomes a linked user and CAN create.
    getProfileStore().linkAccount('user-123', 'Champ');
    expect(h.isLinkedPlayer()).toBe(true);
    h.openRoomChoice(false);
    expect(create.disabled).toBe(false);
    expect(create.textContent).toBe('CREATE A ROOM');
    expect(document.getElementById('privateGuestNote')?.classList.contains('hidden')).toBe(true);
  });

  it('Challenge-a-Friend opens the same room system focused on private play (no public divider)', () => {
    h.openRoomChoice(true);
    expect(document.getElementById('roomChoice')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('roomChoiceDivider')?.style.display).toBe('none');
    expect(document.getElementById('roomChoiceEyebrow')?.textContent).toBe('CHALLENGE A FRIEND');
  });
});

describe('multiplayer final standings', () => {
  it('ranks finishers first (by time), then still-racing players by distance', () => {
    // Self finished at 12.0s; peer A finished faster; peers B/C are still racing.
    h.MP.id = 'self'; h.MP.name = 'Me';
    h.G.finished = true; h.G.elapsed = 12.0; h.G.distance = 5200;
    h.MP.peers = {
      A: { n: 'Ana',  d: 5200, fin: true,  ft: 10.0 },
      B: { n: 'Bo',   d: 3000, fin: false },
      C: { n: 'Cy',   d: 4000, fin: false },
    };
    h.MP.finishes = { A: 10.0 };   // validated finish set

    const s = h.mpStandings();
    expect(s.map((r) => r.name)).toEqual(['Ana', 'Me', 'Cy', 'Bo']);
    expect(s.map((r) => r.place)).toEqual([1, 2, 3, 4]);
    expect(s[0].time).toBe(10.0);            // fastest finisher
    expect(s[1].self).toBe(true);            // self is second (finished at 12.0)
    expect(s[2].time).toBeNull();            // still racing -> no time
    expect(s[3].name).toBe('Bo');            // farther-behind racer is last
  });

  it('lists self as the only racer before anyone else appears', () => {
    h.MP.id = 'self'; h.MP.name = 'Solo';
    h.G.finished = false; h.G.distance = 100;
    h.MP.peers = {}; h.MP.finishes = {};
    const s = h.mpStandings();
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ self: true, name: 'Solo', place: 1, time: null });
  });
});
