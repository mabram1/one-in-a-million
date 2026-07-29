/** Phase 4 economy/progression unit tests (handbook 08 §9). */
import { describe, it, expect } from 'vitest';
import {
  createGuestProfile, computeRaceReward, grantReward, purchaseItem, equipItem, type RaceResult,
} from '../../src/app/domain/economy';
import { levelInfo, cumulativeXpForLevel } from '../../src/app/domain/progression';
import type { PersistentGameStateV1 } from '../../src/app/domain/types';

const NOW = '2026-07-28T00:00:00.000Z';
function freshState(): PersistentGameStateV1 {
  return { schemaVersion: 1, profile: createGuestProfile('g1', NOW), transactions: {}, rewardReceipts: {}, records: [] };
}
const baseRace = (over: Partial<RaceResult>): RaceResult => ({
  eventId: 'e1', mode: 'practice', inputClass: 'mobile_motion', distanceM: 1000,
  perfectLaunch: false, firstRaceOfDay: false, ...over,
});

describe('starting wallet', () => {
  it('grants 1000 coins and 20 gems once', () => {
    const p = createGuestProfile('g1', NOW);
    expect(p.wallet).toEqual({ coins: 1000, gems: 20 });
    expect(p.ownedCosmeticIds).toEqual([]);
  });
});

describe('reward formulas', () => {
  it('mobile motion: completion + distance (capped) + perfect + first-of-day', () => {
    const r = computeRaceReward(baseRace({ perfectLaunch: true, firstRaceOfDay: true }));
    // 40 + min(40, floor(1000/250)*8=32) + 5 + 50 = 127 coins; xp 50+5+25 = 80
    expect(r).toEqual({ coins: 127, xp: 80 });
  });
  it('caps distance coins', () => {
    const r = computeRaceReward(baseRace({ distanceM: 100000 }));
    expect(r.coins).toBe(40 + 40);   // completion + capped distance
  });
  it('multiplayer placement adds motion-only podium coins + xp', () => {
    const r = computeRaceReward(baseRace({ mode: 'multiplayer', placement: 1 }));
    expect(r.coins).toBe(40 + 32 + 30);  // +1st place 30
    expect(r.xp).toBe(50 + 25);
  });
  it('endless scales with checkpoints (capped)', () => {
    const r = computeRaceReward(baseRace({ mode: 'endless', checkpoints: 10 }));
    expect(r).toEqual({ coins: 15 + 80, xp: 10 + 50 });
  });
  it('desktop keyboard earns nothing persistent (input-class separation)', () => {
    expect(computeRaceReward(baseRace({ inputClass: 'desktop_keyboard', perfectLaunch: true, firstRaceOfDay: true }))).toEqual({ coins: 0, xp: 0 });
  });
});

describe('grantReward idempotency', () => {
  it('applies once and rejects a duplicate eventId', () => {
    const s0 = freshState();
    const g1 = grantReward(s0, baseRace({ firstRaceOfDay: true }), NOW);
    expect(g1.delta.coins).toBeGreaterThan(0);
    expect(g1.state.profile.wallet.coins).toBe(1000 + g1.delta.coins);
    const g2 = grantReward(g1.state, baseRace({ firstRaceOfDay: true }), NOW);   // same eventId 'e1'
    expect(g2.delta).toEqual({ coins: 0, xp: 0, gems: 0, leveledTo: null });
    expect(g2.state.profile.wallet.coins).toBe(g1.state.profile.wallet.coins);
  });
});

describe('level-up gems (every 5th level, once)', () => {
  it('grants 10 gems on reaching level 5 and not again', () => {
    const s = freshState();
    s.profile.xp = cumulativeXpForLevel(5) - 1;   // one XP short of level 5
    expect(levelInfo(s.profile.xp).level).toBe(4);
    const g = grantReward(s, baseRace({ mode: 'endless', checkpoints: 10, eventId: 'lvl' }), NOW);
    expect(g.delta.leveledTo).toBe(5);
    expect(g.delta.gems).toBe(10);
    expect(g.state.profile.wallet.gems).toBe(30);   // 20 start + 10
    // a further reward that stays under level 10 grants no more gems
    const g2 = grantReward(g.state, baseRace({ mode: 'endless', checkpoints: 1, eventId: 'lvl2' }), NOW);
    expect(g2.delta.gems).toBe(0);
  });
});

describe('purchases', () => {
  it('succeeds, debits the right currency, grants ownership', () => {
    const s = freshState();
    const o = purchaseItem(s, 'sunglasses', 'tx1', NOW);   // 800 coins
    expect(o.ok).toBe(true);
    if (o.ok) {
      expect(o.state.profile.wallet.coins).toBe(200);
      expect(o.state.profile.ownedCosmeticIds).toContain('sunglasses');
    }
  });
  it('rejects insufficient funds', () => {
    const s = freshState();
    const o = purchaseItem(s, 'crown', 'tx1', NOW);   // 250 gems, have 20
    expect(o).toMatchObject({ ok: false, reason: 'insufficient_funds' });
  });
  it('is idempotent on retry with the same transactionId', () => {
    const s = freshState();
    const o1 = purchaseItem(s, 'sunglasses', 'tx1', NOW);
    expect(o1.ok).toBe(true);
    const o2 = purchaseItem((o1 as any).state, 'sunglasses', 'tx1', NOW);
    expect(o2).toMatchObject({ ok: true, retried: true });
    if (o2.ok) expect(o2.state.profile.wallet.coins).toBe(200);   // not charged twice
  });
  it('rejects buying an already-owned item (new transaction)', () => {
    const s = freshState();
    const o1 = purchaseItem(s, 'sunglasses', 'tx1', NOW);
    const o2 = purchaseItem((o1 as any).state, 'sunglasses', 'tx2', NOW);
    expect(o2).toMatchObject({ ok: false, reason: 'already_owned' });
  });
});

describe('equipping', () => {
  it('rejects equipping an unowned item', () => {
    const p = createGuestProfile('g1', NOW);
    const p2 = equipItem(p, 'glasses', 'sunglasses');   // not owned
    expect(p2.equipped.glasses).toBeUndefined();
  });
  it('equips an owned item and clears with null', () => {
    let p = createGuestProfile('g1', NOW);
    p = { ...p, ownedCosmeticIds: ['sunglasses'] };
    p = equipItem(p, 'glasses', 'sunglasses');
    expect(p.equipped.glasses).toBe('sunglasses');
    p = equipItem(p, 'glasses', null);
    expect(p.equipped.glasses).toBeUndefined();
  });
});
