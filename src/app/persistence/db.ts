/**
 * Versioned local persistence for the Phase 4 product state.
 *
 * One state root (schemaVersion 1). Migration is non-destructive: it preserves the
 * existing game's settings/keys, seeds a Guest profile with the one-time starting
 * wallet, and adopts whatever cosmetics the player already had equipped as owned.
 * Corrupt data is backed up and recovered to a safe Guest state.
 */
import type { PersistentGameStateV1, Equipped } from '../domain/types';
import { createGuestProfile } from '../domain/economy';
import { catalogItem, type CosmeticSlot } from '../config';

export const STATE_KEY = 'oiam_state_v1';
export const BACKUP_KEY = 'oiam_state_backup';
const LEGACY_EQUIPPED_KEY = 'oiam_equipped';

type Storage = Pick<typeof localStorage, 'getItem' | 'setItem'>;

function makeId(nowIso: string): string {
  // stable-ish guest id without Math.random dependency in tests
  return 'guest_' + nowIso.replace(/[^0-9]/g, '').slice(0, 14);
}

function isValid(s: any): s is PersistentGameStateV1 {
  return !!s && s.schemaVersion === 1 && s.profile && s.profile.wallet
    && typeof s.profile.wallet.coins === 'number' && Array.isArray(s.profile.ownedCosmeticIds);
}

/** Read the legacy `oiam_equipped` map (from the pre-Phase-4 Customize screen). */
function readLegacyEquipped(storage: Storage): { equipped: Equipped; owned: string[] } {
  const equipped: Equipped = {}; const owned: string[] = [];
  try {
    const raw = storage.getItem(LEGACY_EQUIPPED_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      for (const slot of Object.keys(obj) as CosmeticSlot[]) {
        const id = obj[slot];
        if (id && catalogItem(id)) { equipped[slot] = id; if (!owned.includes(id)) owned.push(id); }
      }
    }
  } catch { /* ignore malformed legacy data */ }
  return { equipped, owned };
}

function migrate(storage: Storage, nowIso: string): PersistentGameStateV1 {
  const profile = createGuestProfile(makeId(nowIso), nowIso);
  const { equipped, owned } = readLegacyEquipped(storage);
  profile.equipped = equipped;
  profile.ownedCosmeticIds = owned;   // adopt already-equipped cosmetics as owned (they were free before)
  return { schemaVersion: 1, profile, transactions: {}, rewardReceipts: {}, records: [] };
}

/** Load state, migrating or recovering as needed. Always returns a valid state. */
export function loadState(storage: Storage = localStorage, nowIso: string = new Date().toISOString()): PersistentGameStateV1 {
  let raw: string | null = null;
  try { raw = storage.getItem(STATE_KEY); } catch { /* storage unavailable */ }
  if (!raw) return migrate(storage, nowIso);
  try {
    const parsed = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
    throw new Error('invalid shape');
  } catch {
    try { storage.setItem(BACKUP_KEY, raw); } catch { /* best-effort backup */ }
    return migrate(storage, nowIso);   // corruption recovery -> safe Guest
  }
}

export function saveState(state: PersistentGameStateV1, storage: Storage = localStorage): void {
  try { storage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* quota/unavailable — non-fatal */ }
}

/** Mirror equipped cosmetics into the legacy key the running game still reads. */
export function writeLegacyEquipped(equipped: Equipped, storage: Storage = localStorage): void {
  try { storage.setItem(LEGACY_EQUIPPED_KEY, JSON.stringify(equipped)); } catch { /* non-fatal */ }
}
