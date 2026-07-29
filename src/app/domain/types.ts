/** Phase 4 domain types (profile, economy, records). */
import type { CosmeticSlot } from '../config';

export type InputClass = 'mobile_motion' | 'mobile_touch' | 'desktop_keyboard';

export interface Wallet { coins: number; gems: number; }

export interface Equipped {
  skin?: string; glasses?: string; mouth?: string;
  hat?: string; trail?: string; aura?: string;
}

export interface PlayerProfile {
  schemaVersion: 1;
  id: string;
  accountType: 'guest' | 'linked';
  displayName: string;
  createdAt: string;
  level: number;
  xp: number;
  wallet: Wallet;
  ownedCosmeticIds: string[];
  equipped: Equipped;
  /** Level milestones (every 5th) whose gem reward has already been paid. */
  gemMilestonesClaimed: number[];
  onboarding: { version: number; completed: boolean; rewardClaimed: boolean };
}

export interface PurchaseReceipt {
  transactionId: string;
  itemId: string;
  currency: 'coins' | 'gems';
  amount: number;
  at: string;
}

export interface RewardReceipt {
  eventId: string;
  coins: number;
  xp: number;
  gems: number;
  at: string;
}

export interface PersonalBest {
  mode: 'practice' | 'multiplayer' | 'challenge' | 'endless';
  trackId: string;
  distance: number | 'endless';
  inputClass: InputClass;
  tuningVersion: string;
  value: number;          // best time (s) or best distance (m) depending on mode
  at: string;
}

export interface PersistentGameStateV1 {
  schemaVersion: 1;
  profile: PlayerProfile;
  transactions: Record<string, PurchaseReceipt>;
  rewardReceipts: Record<string, RewardReceipt>;
  records: PersonalBest[];
}

export type { CosmeticSlot };
