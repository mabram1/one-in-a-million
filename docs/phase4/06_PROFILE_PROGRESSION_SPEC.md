# Profile and Progression Specification

## 1. Profile purpose

Profile shows identity, progress, equipped style, and meaningful records without implying that keyboard and mobile-motion performance are equivalent.

## 2. Profile model

```ts
interface PlayerProfile {
  schemaVersion: 1;
  id: string;
  accountType: "guest" | "linked";
  displayName: string;
  createdAt: string;
  level: number;
  xp: number;
  wallet: {
    coins: number;
    gems: number;
  };
  ownedCosmeticIds: string[];
  equipped: {
    skin?: string;
    glasses?: string;
    mouth?: string;
    hat?: string;
    trail?: string;
    aura?: string;
  };
  onboarding: {
    version: number;
    completed: boolean;
    rewardClaimed: boolean;
  };
}
```

## 3. XP rules

XP is progression, not currency.

Race XP:

- completed race: 50 XP;
- multiplayer podium: 25 / 15 / 10 XP;
- perfect launch: 5 XP;
- first race of day: 25 XP;
- Endless: 10 XP plus 5 XP per checkpoint, capped at 100 XP.

Desktop Demo may track local practice XP visually but does not persist it to the main profile.

## 4. Level curve

Level 1 starts at 0 XP.

```ts
function xpToNextLevel(level: number): number {
  return Math.round((100 * Math.pow(1.18, level - 1)) / 10) * 10;
}
```

Initial target: levels 1–30. Cap display at 30 until rewards and long-term progression are extended.

Every fifth level grants 10 gems exactly once.

## 5. Record separation

```ts
interface PersonalBestKey {
  mode: "practice" | "multiplayer" | "challenge" | "endless";
  trackId: string;
  distance: number | "endless";
  inputClass: "mobile_motion" | "mobile_touch" | "desktop_keyboard";
  tuningVersion: string;
  contentVersion: string;
}
```

Never compare records across different input classes without an explicit filter. Desktop UI displays `DESKTOP DEMO RECORD`.

## 6. Profile screen layout

### Header

- title;
- Settings;
- account/cloud status.

### Identity card

- live equipped Spermy;
- display name;
- level badge;
- XP bar;
- Guest/Linked label;
- `LINK ACCOUNT` for Guest.

### Stats

Tabs:

- Motion;
- Touch;
- Desktop Demo.

Rows:

- races completed;
- wins;
- best finish by distance;
- longest Endless distance;
- perfect launches;
- challenges completed.

### Collection

- owned count / total catalog;
- current loadout;
- `CUSTOMIZE`.

### Account

- cloud sync;
- restore status;
- privacy;
- data deletion/export routes when backend ships.

## 7. Display name

- Guest default: `Guest`;
- 3–20 visible characters when edited;
- trim whitespace;
- no markup;
- server moderation required before public display;
- local-only names remain private until linked.

## 8. Guest linking

The UI must explain:

- local progression will be attached to the account;
- if cloud data already exists, a merge decision is required;
- purchases and balances cannot silently disappear.

Do not implement “last write wins” for wallet or ownership.

## 9. Persistence

Local store:

- schema version;
- transactional write abstraction;
- backup last known valid state;
- migrations;
- corruption recovery;
- idempotent grants.

Supabase later becomes the authority for linked profiles, but local Practice remains playable offline.

## 10. Acceptance

- Wallet and ownership survive reload.
- Equipping survives reload.
- XP level-up cannot grant gems twice.
- Desktop record never appears under Motion.
- Guest can play without signing in.
- Cloud/link state is explicit.
- Profile renders empty and first-time states correctly.
