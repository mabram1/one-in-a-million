/** Phase 4 persistence / migration unit tests (handbook 08 §4). */
import { describe, it, expect } from 'vitest';
import { loadState, saveState, STATE_KEY, BACKUP_KEY } from '../../src/app/persistence/db';
import { ProfileStore } from '../../src/app/profileStore';

const NOW = '2026-07-28T00:00:00.000Z';

/** Minimal in-memory Storage for deterministic tests. */
function mem(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    _map: map,
  };
}

describe('migration', () => {
  it('fresh install creates a Guest with the starting wallet', () => {
    const s = loadState(mem(), NOW);
    expect(s.schemaVersion).toBe(1);
    expect(s.profile.accountType).toBe('guest');
    expect(s.profile.wallet).toEqual({ coins: 1000, gems: 20 });
    expect(s.profile.ownedCosmeticIds).toEqual([]);
  });

  it('adopts legacy equipped cosmetics as owned', () => {
    const storage = mem({ oiam_equipped: JSON.stringify({ hat: 'crown', glasses: 'sunglasses', bogus: 'nope' }) });
    const s = loadState(storage, NOW);
    expect(s.profile.equipped.hat).toBe('crown');
    expect(s.profile.equipped.glasses).toBe('sunglasses');
    expect(s.profile.ownedCosmeticIds.sort()).toEqual(['crown', 'sunglasses']);
    expect((s.profile.equipped as any).bogus).toBeUndefined();   // unknown ids dropped
  });

  it('recovers from corrupt state to a safe Guest and backs up the raw data', () => {
    const storage = mem({ [STATE_KEY]: '{ this is not json' });
    const s = loadState(storage, NOW);
    expect(s.profile.accountType).toBe('guest');
    expect(storage._map.get(BACKUP_KEY)).toBe('{ this is not json');
  });

  it('round-trips a saved state', () => {
    const storage = mem();
    const s = loadState(storage, NOW);
    s.profile.wallet.coins = 4242;
    saveState(s, storage);
    const again = loadState(storage, NOW);
    expect(again.profile.wallet.coins).toBe(4242);
  });
});

describe('ProfileStore', () => {
  it('persists purchases and equipping across reload, and mirrors the legacy key', () => {
    const storage = mem();
    const store = new ProfileStore(storage, () => NOW);
    const buy = store.buy('sunglasses', 'tx1');
    expect(buy.ok).toBe(true);
    store.equip('glasses', 'sunglasses');
    expect(store.profile.equipped.glasses).toBe('sunglasses');
    // legacy mirror written for the running game
    expect(JSON.parse(storage.getItem('oiam_equipped')!).glasses).toBe('sunglasses');
    // reload
    const store2 = new ProfileStore(storage, () => NOW);
    expect(store2.isOwned('sunglasses')).toBe(true);
    expect(store2.profile.equipped.glasses).toBe('sunglasses');
    expect(store2.profile.wallet.coins).toBe(200);
  });

  it('emits a change event on mutation', () => {
    const store = new ProfileStore(mem(), () => NOW);
    let fired = 0; store.onChange(() => fired++);
    store.buy('bowtie', 'tx1');
    expect(fired).toBe(1);
  });
});
