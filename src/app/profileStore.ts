/**
 * ProfileStore — the app-facing facade over the Phase 4 domain + persistence.
 *
 * Loads the versioned state, exposes the profile, and performs atomic mutations
 * (reward / purchase / equip) that persist and emit one change event. Rewards and
 * purchases are idempotent (see domain/economy). Equipped cosmetics are mirrored to
 * the legacy key so the existing race renderer picks them up with no changes.
 */
import type { PersistentGameStateV1, PlayerProfile, CosmeticSlot } from './domain/types';
import { grantReward, purchaseItem, equipItem, type RaceResult, type RewardDelta, type PurchaseOutcome } from './domain/economy';
import { loadState, saveState, writeLegacyEquipped } from './persistence/db';

type Storage = Pick<typeof localStorage, 'getItem' | 'setItem'>;

export class ProfileStore {
  private state: PersistentGameStateV1;
  private listeners = new Set<() => void>();
  constructor(private storage: Storage = localStorage, private now: () => string = () => new Date().toISOString()) {
    this.state = loadState(storage, now());
    writeLegacyEquipped(this.state.profile.equipped, storage);   // keep the running game in sync on boot
  }

  get profile(): PlayerProfile { return this.state.profile; }
  getState(): PersistentGameStateV1 { return this.state; }

  onChange(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(): void { for (const fn of this.listeners) fn(); }
  private commit(): void { saveState(this.state, this.storage); this.emit(); }

  /** Apply an authoritative race result. Idempotent by result.eventId. */
  grantRaceReward(result: RaceResult): RewardDelta {
    const { state, delta } = grantReward(this.state, result, this.now());
    this.state = state; this.commit();
    return delta;
  }

  /** Buy a cosmetic. Idempotent by transactionId. */
  buy(itemId: string, transactionId: string): PurchaseOutcome {
    const outcome = purchaseItem(this.state, itemId, transactionId, this.now());
    if (outcome.ok) { this.state = outcome.state; this.commit(); }
    return outcome;
  }

  /** Equip (or clear with null) a slot; only owned items take effect. Mirrors to the game. */
  equip(slot: CosmeticSlot, itemId: string | null): void {
    this.state = { ...this.state, profile: equipItem(this.state.profile, slot, itemId) };
    writeLegacyEquipped(this.state.profile.equipped, this.storage);
    this.commit();
  }

  /** Upgrade the current local Guest to a linked account without losing wallet,
   * cosmetics, XP, records, or the locally processed My Face overlay. */
  linkAccount(id: string, displayName: string): void {
    this.state = { ...this.state, profile: {
      ...this.state.profile,
      id,
      accountType: 'linked',
      displayName: displayName.trim() || this.state.profile.displayName || 'Champ',
    } };
    this.commit();
  }

  isOwned(itemId: string): boolean { return this.state.profile.ownedCosmeticIds.includes(itemId); }
}

let singleton: ProfileStore | null = null;
export function getProfileStore(): ProfileStore {
  if (!singleton) singleton = new ProfileStore();
  return singleton;
}
