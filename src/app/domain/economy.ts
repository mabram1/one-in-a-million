/**
 * Economy domain (pure). Wallet math, race-reward computation, purchases and
 * equipping. All operations are idempotent where the spec requires it (rewards by
 * eventId, purchases by transactionId, level gems by milestone) and never let the
 * wallet go negative. Prices come from the catalog, never from UI labels.
 *
 * Functions return NEW state; the persistence layer applies + saves atomically.
 */
import { economy, catalogItem, type CurrencyId } from '../config';
import type { PersistentGameStateV1, PlayerProfile, InputClass, CosmeticSlot } from './types';
import { levelInfo, reachedGemMilestones, MILESTONE_GEM_AMOUNT } from './progression';

export interface RaceResult {
  eventId: string;
  mode: 'practice' | 'multiplayer' | 'challenge' | 'endless';
  inputClass: InputClass;
  distanceM: number;
  perfectLaunch: boolean;
  placement?: number;      // multiplayer podium (1..3)
  checkpoints?: number;    // endless
  firstRaceOfDay: boolean;
  challengeFirstCompletion?: boolean;
  challengeWin?: boolean;
}

export interface RewardDelta { coins: number; xp: number; gems: number; leveledTo: number | null; }

/** Fresh Guest profile with the one-time starting wallet. */
export function createGuestProfile(id: string, nowIso: string): PlayerProfile {
  return {
    schemaVersion: 1, id, accountType: 'guest', displayName: 'Guest', createdAt: nowIso,
    level: 1, xp: 0,
    wallet: { coins: economy.startingWallet.coins, gems: economy.startingWallet.gems },
    ownedCosmeticIds: [], equipped: {}, gemMilestonesClaimed: [],
    onboarding: { version: 1, completed: false, rewardClaimed: false },
  };
}

export function creditWallet(coins: number, gems: number, w: { coins: number; gems: number }) {
  return { coins: w.coins + Math.max(0, Math.floor(coins)), gems: w.gems + Math.max(0, Math.floor(gems)) };
}

/** Compute a race's coin + XP reward from config. Desktop keyboard earns nothing persistent. */
export function computeRaceReward(r: RaceResult): { coins: number; xp: number } {
  if (r.inputClass === 'desktop_keyboard') return { coins: 0, xp: 0 };
  const rr: any = economy.raceRewards;
  const xpc = economy.xp;
  let coins = 0, xp = 0;

  if (r.mode === 'endless') {
    const cps = Math.max(0, r.checkpoints || 0);
    coins = rr.endless.baseCoins + Math.min(rr.endless.checkpointCoinCap, cps * rr.endless.coinsPerCheckpoint);
    xp = xpc.endlessBase + Math.min(xpc.endlessCap, cps * xpc.endlessPerCheckpoint);
    return { coins, xp };
  }

  const table = r.inputClass === 'mobile_motion' ? rr.mobileMotion : rr.mobileTouch;
  coins += table.completionCoins;
  const milestones = Math.floor(Math.max(0, r.distanceM) / table.distanceMilestoneMeters);
  coins += Math.min(table.distanceCoinCap, milestones * table.coinsPerDistanceMilestone);
  if (r.perfectLaunch) coins += table.perfectLaunchCoins;
  if (r.firstRaceOfDay) coins += table.firstRaceOfDayCoins;
  if (r.mode === 'multiplayer' && r.placement && table.placementCoins[r.placement] != null) {
    coins += table.placementCoins[r.placement];
  }
  if (r.mode === 'challenge') {
    if (r.challengeFirstCompletion) coins += rr.challenge.firstCompletionCoins;
    if (r.challengeWin) coins += rr.challenge.winCoins;
  }

  xp += xpc.completion;
  if (r.perfectLaunch) xp += xpc.perfectLaunch;
  if (r.firstRaceOfDay) xp += xpc.firstRaceOfDay;
  if (r.mode === 'multiplayer' && r.placement && (xpc.placement as any)[r.placement] != null) {
    xp += (xpc.placement as any)[r.placement];
  }
  return { coins, xp };
}

/** Pay any newly-reached every-5th-level gem milestones exactly once. Mutates a copy. */
function applyLevelGems(p: PlayerProfile): { profile: PlayerProfile; gems: number } {
  const lvl = levelInfo(p.xp).level;
  const due = reachedGemMilestones(lvl).filter((m) => !p.gemMilestonesClaimed.includes(m));
  if (!due.length) return { profile: p, gems: 0 };
  const gems = due.length * MILESTONE_GEM_AMOUNT;
  return {
    profile: { ...p, wallet: { ...p.wallet, gems: p.wallet.gems + gems }, gemMilestonesClaimed: [...p.gemMilestonesClaimed, ...due] },
    gems,
  };
}

/** Idempotent race reward. Re-granting the same eventId is a no-op returning zero delta. */
export function grantReward(state: PersistentGameStateV1, r: RaceResult, nowIso: string): { state: PersistentGameStateV1; delta: RewardDelta } {
  if (state.rewardReceipts[r.eventId]) {
    return { state, delta: { coins: 0, xp: 0, gems: 0, leveledTo: null } };
  }
  const { coins, xp } = computeRaceReward(r);
  const beforeLevel = levelInfo(state.profile.xp).level;
  let profile: PlayerProfile = {
    ...state.profile,
    xp: state.profile.xp + xp,
    wallet: creditWallet(coins, 0, state.profile.wallet),
  };
  const lg = applyLevelGems(profile); profile = lg.profile;
  const afterLevel = levelInfo(profile.xp).level;
  profile.level = afterLevel;
  const receipt = { eventId: r.eventId, coins, xp, gems: lg.gems, at: nowIso };
  const next: PersistentGameStateV1 = {
    ...state, profile, rewardReceipts: { ...state.rewardReceipts, [r.eventId]: receipt },
  };
  return { state: next, delta: { coins, xp, gems: lg.gems, leveledTo: afterLevel > beforeLevel ? afterLevel : null } };
}

export type PurchaseOutcome =
  | { ok: true; state: PersistentGameStateV1; alreadyOwned?: boolean; retried?: boolean }
  | { ok: false; reason: 'unknown_item' | 'insufficient_funds' | 'already_owned' };

/** Idempotent purchase: retrying the same transactionId returns the prior success without double-charging. */
export function purchaseItem(state: PersistentGameStateV1, itemId: string, transactionId: string, nowIso: string): PurchaseOutcome {
  const prior = state.transactions[transactionId];
  if (prior) return { ok: true, state, retried: true };   // idempotent retry

  const item = catalogItem(itemId);
  if (!item) return { ok: false, reason: 'unknown_item' };
  if (state.profile.ownedCosmeticIds.includes(itemId)) return { ok: false, reason: 'already_owned' };

  const cur: CurrencyId = item.price.currency;
  const have = state.profile.wallet[cur];
  if (have < item.price.amount) return { ok: false, reason: 'insufficient_funds' };

  const wallet = { ...state.profile.wallet, [cur]: have - item.price.amount };
  const profile: PlayerProfile = { ...state.profile, wallet, ownedCosmeticIds: [...state.profile.ownedCosmeticIds, itemId] };
  const receipt = { transactionId, itemId, currency: cur, amount: item.price.amount, at: nowIso };
  return { ok: true, state: { ...state, profile, transactions: { ...state.transactions, [transactionId]: receipt } } };
}

/** Equip (or clear with null) a slot. Only owned items may be equipped. */
export function equipItem(profile: PlayerProfile, slot: CosmeticSlot, itemId: string | null): PlayerProfile {
  if (itemId != null) {
    const item = catalogItem(itemId);
    if (!item || item.slot !== slot || !profile.ownedCosmeticIds.includes(itemId)) return profile;   // reject unowned/mismatched
  }
  const equipped = { ...profile.equipped };
  if (itemId == null) delete equipped[slot]; else equipped[slot] = itemId;
  return { ...profile, equipped };
}
