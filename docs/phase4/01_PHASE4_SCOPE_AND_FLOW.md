# Phase 4 Scope and Flow

## 1. Objectives

Phase 4 must make the game feel ready to install and return to, without changing the tuned race feel.

Primary outcomes:

- branded launch;
- clear first-play path;
- professional home screen;
- durable local profile and progression;
- working cosmetic ownership and virtual-currency purchases;
- clean migration path to Supabase Auth and platform billing.

## 2. In scope

- Splash and initialization state.
- Two-to-three-second intro sequence.
- First-run onboarding and motion permission.
- Guest profile creation.
- Main Hub redesign.
- App-level navigation.
- Coins, gems, XP, levels, ownership, and equipped cosmetics.
- Store and Profile screens.
- Loading, empty, offline, error, and reduced-motion states.
- Input-class tagging and separate records.
- Local persistence with schema migrations.
- Repository-level UI tokens and reusable components.

## 3. Out of scope

- Re-tuning acceleration, shake detection, steering, collision, or final sprint.
- Changing WBC, virus, wall, HUD, mascot, or pickup art.
- Real-money billing.
- Ads, VIP, battle pass, loot boxes, or limited-time pressure mechanics.
- Authoritative global leaderboards.
- Sticky-mucus slowdown or cilia-push simulation.
- New rival/ghost or boost art.
- Social feed, clans, chat, or user-generated content.

## 4. Canonical route map

```text
BOOT
  -> SPLASH_LOADING
      -> INTRO (first launch or app-version milestone)
          -> WELCOME
              -> MOTION_EXPLANATION
                  -> MOTION_PERMISSION
                      -> CONTROL_TUTORIAL
                          -> SAFE_PRACTICE
                              -> MAIN_HUB

RETURNING USER
  BOOT -> SPLASH_LOADING -> MAIN_HUB

MAIN_HUB
  -> QUICK_RACE
  -> PRACTICE
  -> MULTIPLAYER
  -> CHALLENGE
  -> ENDLESS
  -> CUSTOMIZE
  -> STORE
  -> PROFILE
  -> SETTINGS
```

The intro never blocks recovery from an initialization error. Deep links for challenges skip decorative intro after boot and route to the challenge acceptance screen.

## 5. App shell

Persistent regions:

- top account bar: avatar, display name, level, XP, coins, gems;
- page content;
- bottom navigation: Home, Customize, Store, Profile;
- global toast layer;
- modal layer;
- network/offline banner;
- safe-area padding.

During racing, the app shell is hidden and the existing HUD remains authoritative.

## 6. Navigation behavior

- Browser/device Back closes the top modal first.
- Back from a child screen returns to the previous app screen.
- Back from Main Hub asks whether to exit only in the installed Android shell.
- Store purchase confirmation does not disappear on accidental Back while pending.
- App remembers the last selected mode setup, not the last promotional card.
- Challenge deep links preserve the return destination.

## 7. Required screen states

Every Phase 4 screen must define:

- loading;
- ready;
- first-time empty;
- offline;
- recoverable error;
- disabled;
- success;
- reduced motion;
- narrow portrait;
- tall portrait;
- safe-area extremes.

## 8. Deliverable order

1. Types, config, migrations, repositories.
2. Shared UI tokens and app shell.
3. Splash and initialization.
4. Intro and reduced-motion variant.
5. Onboarding and permission flow.
6. Main Hub.
7. Economy and ownership service.
8. Store.
9. Profile.
10. Telemetry hooks and QA.

## 9. Phase 4 completion gate

Phase 4 is complete when a fresh install can:

1. launch without a blank frame;
2. understand why motion access is needed;
3. complete tutorial or choose fallback controls;
4. enter Main Hub as Guest;
5. finish a race and receive XP/coins exactly once;
6. buy a cosmetic;
7. equip it;
8. restart the app without losing state;
9. view a Profile that correctly separates input classes;
10. remain usable offline with local data.
