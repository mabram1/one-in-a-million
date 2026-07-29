# Claude Code Implementation Guide

## 1. Protected systems

Do not change:

- race simulation;
- tuned motion thresholds;
- charge timing or GO zone;
- collision behavior;
- final sprint;
- multiplayer authority;
- ghost format;
- accepted gameplay sprite geometry;
- existing race HUD placement.

Phase 4 wraps the game with a product shell. It does not rewrite the game loop.

## 2. Recommended source structure

```text
src/
  app/
    App.ts
    router.ts
    boot/
      BootCoordinator.ts
      AssetPreloader.ts
    shell/
      AppShell.ts
      TopAccountBar.ts
      BottomNav.ts
  config/
    tokens.ts
    economy.ts
    catalog.ts
    progression.ts
  domain/
    profile/
      PlayerProfile.ts
      ProfileService.ts
    economy/
      Wallet.ts
      EconomyService.ts
      RewardService.ts
      PurchaseService.ts
    cosmetics/
      CosmeticsCatalog.ts
      LoadoutService.ts
    records/
      InputClass.ts
      PersonalBest.ts
  persistence/
    LocalDatabase.ts
    migrations/
    repositories/
      ProfileRepository.ts
      TransactionRepository.ts
      RewardReceiptRepository.ts
  ui/
    components/
    screens/
      SplashScreen.ts
      IntroScreen.ts
      OnboardingScreen.ts
      MainHubScreen.ts
      StoreScreen.ts
      ProfileScreen.ts
    styles/
      tokens.css
      typography.css
      components.css
  integrations/
    auth/
    billing/
    telemetry/
```

Adapt names to the repository, but preserve boundaries.

Asset integration must follow `data/asset_source_map.json`. The Party Hat and Rainbow
Trail still come from the accepted Phase 2 package; the other launch cosmetics come
from the customization expansion. Merge their `assets` roots while preserving
catalog-relative paths. Do not silently drop catalog entries whose file lives in an
older accepted package.

## 3. Domain invariants

- Wallet amounts are non-negative integers.
- Ownership is a set of cosmetic IDs.
- Equipped item must be owned or be a defined default.
- Purchases are idempotent.
- Rewards are idempotent.
- Level milestone rewards are idempotent.
- Catalog price comes from configuration, never from the button label.
- Desktop records and rewards cannot enter mobile-motion categories.

## 4. Persistence migration

Add one versioned state root:

```ts
interface PersistentGameStateV1 {
  schemaVersion: 1;
  profile: PlayerProfile;
  transactions: Record<string, PurchaseReceipt>;
  rewardReceipts: Record<string, RewardReceipt>;
  records: PersonalBest[];
  settings: ExistingSettings;
}
```

Migration behavior:

- preserve existing settings and calibration;
- create Guest profile if missing;
- grant starting wallet once;
- mark currently equipped/free cosmetics as owned;
- back up raw previous state before migration;
- recover to a safe Guest state if data is corrupt;
- never erase challenge or control settings.

## 5. Services

### EconomyService

- reads wallet;
- validates debit/credit;
- exposes atomic transaction operations;
- emits one state-change event after persistence.

### RewardService

- accepts authoritative result summary;
- applies input eligibility;
- computes reward from config;
- stores receipt by event ID;
- returns wallet and XP delta.

### PurchaseService

- resolves catalog item/version;
- validates price and ownership;
- debits and grants ownership atomically;
- supports retry with the same transaction ID.

### LoadoutService

- previews without persisting;
- equips only owned items;
- validates slots;
- returns canonical layer list.

## 6. Race integration

Do not calculate rewards inside rendering or result animation.

```text
authoritative/local validated result
  -> RewardService.grant(resultEvent)
      -> persistence transaction
          -> RewardReceipt + wallet + XP
              -> UI count-up from confirmed delta
```

For multiplayer, wait for the authoritative finish result before placement rewards.

## 7. Input-class detection

Determine and freeze `inputClass` at race start:

- motion granted and active → `mobile_motion`;
- touch fallback on mobile → `mobile_touch`;
- keyboard/pointer desktop mode → `desktop_keyboard`.

Include input class in result and personal-best keys. Do not infer it after the run.

## 8. Store implementation

Phase 4 supports virtual currency only.

`realMoney.enabled === false` means:

- no platform checkout calls;
- no fake price buttons;
- no coin/gem pack cards;
- no VIP/remove-ads cards;
- architecture retains a disabled billing adapter interface.

## 9. Testing

Unit:

- reward formulas;
- starting grant;
- duplicate reward rejection;
- purchase success;
- insufficient funds;
- duplicate purchase retry;
- equip unowned rejection;
- level-up and every-fifth-level gem grant;
- input-class separation;
- migrations.

Integration:

- fresh install;
- returning local profile;
- offline boot;
- motion denied;
- purchase and reload;
- race reward and reload;
- challenge deep link;
- multiplayer result.

Visual:

- 360×640;
- 390×844;
- 412×915;
- tablet portrait;
- 200% text;
- reduced motion;
- notched safe areas.

## 10. Commit sequence

1. `phase4: add profile economy and catalog types`
2. `phase4: add persistence migration and services`
3. `phase4: add app shell and design tokens`
4. `phase4: add splash intro and onboarding`
5. `phase4: redesign main hub`
6. `phase4: add cosmetic store`
7. `phase4: add profile and separated records`
8. `phase4: add tests telemetry and polish`

Keep commits reversible and do not mix gameplay tuning with UI work.

## 11. Required handoff report

```markdown
### Outcome

### Files changed

### Data migrations

### Tests run

### Viewports checked

### Protected gameplay verification

### Remaining risks
```
