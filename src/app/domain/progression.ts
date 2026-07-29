/**
 * XP → level progression (pure). Level 1 starts at 0 XP.
 * Curve + gem milestones come from the economy config (handbook 06 §4).
 */
import { economy } from '../config';

const BASE = economy.xp.levelBase;         // 100
const GROWTH = economy.xp.levelGrowth;     // 1.18
const DISPLAY_CAP = economy.xp.displayLevelCap;      // 30
const GEMS_EVERY = economy.xp.gemsEveryLevels;       // 5
const MILESTONE_GEMS = economy.xp.levelMilestoneGems; // 10

/** XP required to advance FROM `level` to `level + 1`. */
export function xpForLevelStep(level: number): number {
  return Math.round((BASE * Math.pow(GROWTH, level - 1)) / 10) * 10;
}

/** Total XP needed to have REACHED `level` (level 1 => 0). */
export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevelStep(l);
  return total;
}

export interface LevelInfo {
  level: number;          // true level (uncapped)
  displayLevel: number;   // clamped to DISPLAY_CAP for the UI
  xpIntoLevel: number;    // XP earned within the current level
  xpForNext: number;      // XP needed to finish the current level
}

export function levelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xp >= cumulativeXpForLevel(level + 1)) level++;
  const base = cumulativeXpForLevel(level);
  return {
    level,
    displayLevel: Math.min(level, DISPLAY_CAP),
    xpIntoLevel: xp - base,
    xpForNext: xpForLevelStep(level),
  };
}

/**
 * Which every-Nth-level gem milestones a given level has reached (5, 10, 15, …).
 * Used to pay 10 gems exactly once per milestone (idempotent via claimed set).
 */
export function reachedGemMilestones(level: number): number[] {
  const out: number[] = [];
  for (let m = GEMS_EVERY; m <= level; m += GEMS_EVERY) out.push(m);
  return out;
}

export const MILESTONE_GEM_AMOUNT = MILESTONE_GEMS;
