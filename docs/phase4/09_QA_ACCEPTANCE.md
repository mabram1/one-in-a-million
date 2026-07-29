# Phase 4 QA and Acceptance

## 1. Functional checklist

- [ ] Fresh install creates one Guest profile.
- [ ] Starting grant is exactly 1,000 coins and 20 gems.
- [ ] Refresh does not repeat the grant.
- [ ] Splash reflects real initialization state.
- [ ] Intro plays once and is skippable.
- [ ] Reduced motion uses a static/crossfade intro.
- [ ] Motion permission appears only after explanation and tap.
- [ ] Denial routes to fallback controls.
- [ ] Tutorial reward grants once.
- [ ] Hub loads without account creation.
- [ ] Quick Race preserves last Practice setup.
- [ ] Store displays the authoritative catalog price.
- [ ] Purchase debits and grants atomically.
- [ ] Duplicate transaction ID cannot debit twice.
- [ ] Insufficient funds never changes wallet.
- [ ] Owned item can be equipped.
- [ ] Unowned item cannot be equipped.
- [ ] Loadout survives reload.
- [ ] Race reward grants once.
- [ ] Multiplayer placement reward uses authoritative result.
- [ ] Level milestone gems grant once.
- [ ] Desktop keyboard result is labeled and separated.
- [ ] Offline Practice and Endless remain available.

## 2. Visual checklist

- [ ] Exact palette tokens used.
- [ ] Fredoka/Nunito loaded without layout flash where possible.
- [ ] No light theme.
- [ ] Primary action obvious within two seconds.
- [ ] Minimum 44×44 touch targets.
- [ ] Safe areas respected.
- [ ] Currency uses icons plus numeric labels.
- [ ] Rarity is not communicated only by color.
- [ ] Store card text fits at 200%.
- [ ] Character preview uses canonical layer stack.
- [ ] No cosmetic uses custom CSS offsets.
- [ ] Desktop Demo label remains visible on Hub and Profile.

## 3. Viewport matrix

| Viewport | Expected |
|---|---|
| 360×640 | Compact layout; no clipped primary action |
| 390×844 | Standard target |
| 412×915 | Tall target |
| 600×960 | Tablet portrait with phone-width content |
| Android notch | Top bar below safe inset |
| Home indicator | Bottom navigation above safe inset |

## 4. Failure tests

- corrupt local state;
- storage quota failure;
- offline boot;
- asset load timeout;
- Supabase unavailable;
- motion unavailable;
- motion permission denied;
- app backgrounded during purchase;
- refresh after debit before UI success;
- stale catalog version;
- missing cosmetic asset;
- duplicate reward event;
- account merge conflict.

## 5. Performance

- No per-frame DOM allocations from Hub idle animation.
- No network calls from animation loops.
- Initial app shell interactive quickly while heavy art continues loading.
- Character layers decoded once and reused.
- Store thumbnails lazy-load below the fold.
- Intro assets do not delay offline recovery controls.

## 6. Security and integrity

- No wallet values accepted from display text.
- No negative or floating wallet amounts.
- Transaction and reward IDs validated.
- HTML escaped for display names.
- Raw motion sensor data not logged.
- Desktop result cannot be submitted to mobile-motion record category.

## 7. Regression

- Existing race starts.
- Charge timing unchanged.
- Tilt and shake controls unchanged.
- Touch and keyboard fallbacks remain available.
- WBC/virus collision geometry unchanged.
- Final sprint unchanged.
- Multiplayer room flow unchanged.
- Challenge links remain compatible.
- Existing settings/calibration survive migration.

## 8. Release gate

Phase 4 may ship when:

- all functional checklist items pass;
- no balance duplication bug remains;
- all four target viewport classes pass;
- protected gameplay regression checks pass;
- real-money UI remains hidden;
- privacy/support links have valid destinations before public release.
