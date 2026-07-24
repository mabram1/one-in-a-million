# 8. Claude Code Rules, Roadmap, and Appendices

## 8.1 Claude Code development rules

### Rule 1: Read before changing

Inspect the relevant handbook chapter, repository files, tests, and current behavior. Do not infer architecture from the brief alone.

### Rule 2: Preserve tuned behavior

Refactoring input, rendering, networking, or assets must not change gameplay values. If a behavior changes, identify the old value, new value, player impact, and approval.

### Rule 3: Make the smallest coherent change

Do not redesign unrelated screens, rename broad APIs, upgrade dependencies, or move folders unless required by the task.

### Rule 4: Reuse systems

Use existing components, tokens, loaders, event types, collision profiles, and state machines. A new style or abstraction requires a gap that current systems cannot reasonably cover.

### Rule 5: Separate concerns

No network calls in rendering, no Canvas or DOM objects in simulation, no store logic in HUD, no collision rules encoded in sprite pixels.

### Rule 6: Keep data versioned

Tracks, tuning, replays, challenges, catalogs, and migrations use explicit versions. Compatibility behavior is intentional.

### Rule 7: Treat mobile constraints as primary

Test safe areas, physical motion, touch size, landscape rejection/handling, low memory, intermittent network, tab/app suspension, and Android back behavior.

### Rule 8: Build complete states

Every feature includes loading, empty, success, failure, disabled, offline, and permission behavior where applicable.

### Rule 9: Protect privacy and secrets

No service-role keys in clients. Collect only necessary data. Do not log raw sensor streams, auth tokens, room secrets, or personal data.

### Rule 10: Verify proportionally

Run unit, integration, replay, visual, and performance checks appropriate to the risk. A text change does not require a full performance suite; a simulation change does.

## 8.2 Required implementation workflow

1. Define outcome and out-of-scope items.
2. Locate governing handbook rules.
3. Inspect current implementation and tests.
4. Record assumptions and risks.
5. Implement behind existing contracts.
6. Add/update tests.
7. Check portrait layouts and fallbacks.
8. Report player-visible change, files, verification, and follow-up.

## 8.3 Prohibited shortcuts

- Do not replace tuned constants with guessed “clean” values.
- Do not use generated placeholder art as final production art.
- Do not introduce a second design-token system.
- Do not store real-money prices in static UI copy.
- Do not trust client-only leaderboard results.
- Do not make cosmetics affect hitboxes.
- Do not use unseeded randomness in challenge tracks.
- Do not add continuous allocations inside update loops.
- Do not hide errors with empty catches.
- Do not request motion permission without context.
- Do not create medically explicit or crude copy/art.

## 8.4 Code-quality conventions

- Prefer explicit domain names over generic `utils`.
- Keep public types narrow.
- Use exhaustive state handling.
- Avoid boolean combinations that represent impossible race states.
- Give events stable IDs when duplicate delivery is possible.
- Make timestamps and units explicit in names (`durationMs`, `speedMps`).
- Document why, not what.
- Delete dead code only when verified and in scope.
- Preserve repository formatting and lint rules.

## 8.5 Pull-request/change summary template

```markdown
## Outcome

## Player-visible behavior

## Handbook sections

## Scope
- Changed:
- Not changed:

## Verification
- Automated:
- Manual:
- Viewports/devices:

## Data or compatibility impact

## Risks and rollback
```

## 8.6 Roadmap principles

The roadmap favors a polished vertical slice, then progression/social completeness, then content scale. It does not assume every proposed feature must ship.

Gates:

- **Product gate:** is the player value clear?
- **Design gate:** does it support the core loop?
- **Art gate:** is the visual language consistent?
- **Technical gate:** is the system measurable and maintainable?
- **Release gate:** are performance, privacy, store, and recovery states ready?

## 8.7 Phase 0: Baseline and documentation

Goal: make the current build reproducible and safe to extend.

Deliverables:

- adopt this handbook;
- inventory current screens, tuning, assets, and routes;
- centralize design tokens and gameplay tuning;
- document build/deploy flow;
- add known-seed gameplay fixtures;
- capture baseline performance on representative devices;
- record current multiplayer and ghost schemas.

Exit criteria:

- one source for constants;
- current build passes smoke tests;
- protected gameplay is documented by tests or fixtures;
- no secret configuration in the client repository.

## 8.8 Phase 1: Premium vertical slice

Goal: one race loop looks and feels store-ready.

Scope:

- identity: app icon, wordmark, splash;
- approved base Spermy and key states;
- Classic Tunnel visual pass;
- six obstacle/pickup families;
- HUD component system;
- polished hub, practice, lobby, onboarding, and results;
- asset manifest and loading pipeline;
- sound/haptic event cleanup;
- responsive/safe-area pass.

Exit criteria:

- new player can install, learn, race, finish, and replay;
- local player and hazards are readable on small screens;
- art pipeline produces deterministic assets;
- frame rate and memory meet baseline targets;
- screenshots can be captured without placeholder UI.

## 8.9 Phase 2: Identity and progression

Goal: players have a persistent reason to return.

Scope:

- guest profile and optional sign-in;
- XP and levels;
- coin/gem definitions;
- customization with 8 bodies, 5 tails, 5 eyes, 8 accessories;
- inventory and equip persistence;
- store catalog UI;
- restore purchases foundation;
- profile/settings completion.

Before implementation, approve:

- earn rates;
- sinks;
- unlock curve;
- duplicate policy;
- account merge policy;
- entitlement validation;
- child/consumer protections.

Exit criteria:

- progression cannot be lost silently;
- cosmetics never alter competitive behavior;
- purchases restore correctly in test environments;
- economy is data-driven and remotely configurable only with safe defaults.

## 8.10 Phase 3: Social and competitive

Goal: sharing and competition drive replay.

Scope:

- production matchmaking;
- live lobby hardening;
- challenge-link reliability and expiry;
- friends/social layer appropriate to platform;
- leaderboards with validation;
- daily challenge;
- rematch and post-race sharing.

Exit criteria:

- disconnect and host departure behavior is tested;
- challenge replays remain compatible across supported versions;
- leaderboard submissions have integrity checks;
- block/report/privacy features match social scope.

## 8.11 Phase 4: Track expansion

Goal: content variety without mechanical fragmentation.

Order:

1. Bubble Stream
2. Villus Forest
3. Evil Vein
4. Golden Path

Each theme requires:

- token set;
- complete module family;
- signature obstacles;
- validation seeds;
- preview/store art;
- performance check;
- accessibility/readability check.

Exit criteria:

- all tracks use the same simulation contracts;
- generators guarantee valid routes;
- challenges reproduce identically by version/seed;
- theme particles and materials stay within budgets.

## 8.12 Phase 5: Live operations and partnerships

Possible scope:

- seasonal cosmetics;
- sponsor races;
- limited-time challenges;
- achievement system;
- curated track rotations.

Not baseline commitments:

- battle pass;
- paid random rewards;
- stat-selling items;
- aggressive ad loops.

Each live event needs start/end/fallback behavior, time-zone handling, content versioning, reward grant idempotency, and a post-event ownership policy.

## 8.13 Release readiness

### Product

- onboarding completion and first-race success measured;
- no dead-end navigation;
- guest play is available;
- store claims match behavior.

### Quality

- supported-device smoke matrix;
- suspend/resume and orientation behavior;
- offline, slow network, and reconnect;
- no known critical replay or finish-order bugs;
- analytics errors do not block play.

### Compliance

- privacy policy and consent flows;
- account/data deletion path where required;
- purchase restore;
- store metadata and age rating;
- sponsorship disclosure;
- current platform requirements verified near submission.

### Operations

- error monitoring;
- rollback build;
- backend migration and backup plan;
- feature flags default safely;
- support contact and known-issue process.

## 8.14 Appendix A: Glossary

**Canal:** The scrolling play corridor and its walls.  
**Charge:** Energy produced by shaking.  
**Control frame:** Normalized input consumed by the simulation.  
**Final sprint:** Hazard-free final section with steering/items disabled and faster speed decay.  
**Ghost:** Non-colliding replay of a previous run.  
**GO zone:** Narrow charge-meter range for a perfect launch.  
**Module:** Authored track segment with sockets and compatibility rules.  
**Momentum:** Persistent forward speed that decays and is reduced by collisions.  
**Race rail:** Right-side vertical progress display.  
**Spermy:** Cute fictional player avatar.  
**Theme:** Visual/content skin and signature mechanic set for a track.  
**Tuning version:** Identifier for gameplay constants used by a race/replay.

## 8.15 Appendix B: Canonical IDs

```text
modes:
  practice
  multiplayer_private
  multiplayer_matchmaking
  challenge_ghost
  endless_checkpoint
  daily_challenge
  sponsor_race

tracks:
  classic
  bubble
  villus
  evil
  golden

pickups:
  star
  boost_charge
  shield_charge
  speed_orb

items:
  boost
  shield
```

IDs are stable storage/API keys. Display names are localized separately.

## 8.16 Appendix C: Event taxonomy

Gameplay events:

```text
race_loaded
calibration_completed
charge_started
launch_released
launch_quality
race_started
collision
pickup_collected
item_activated
checkpoint_crossed
final_sprint_started
race_finished
race_abandoned
```

Product events:

```text
onboarding_started
onboarding_completed
mode_selected
lobby_created
lobby_joined
challenge_created
challenge_accepted
cosmetic_previewed
cosmetic_equipped
store_item_selected
purchase_started
purchase_completed
purchase_failed
```

Telemetry should use coarse normalized control metrics, not raw motion data. Event schemas need versioning and consent review.

## 8.17 Appendix D: Localization rules

- Keep UI strings outside source logic.
- Provide context and character limits.
- Use parameterized messages, not concatenated fragments.
- Support pluralization.
- Use locale-aware numbers, dates, times, and prices.
- Allow approximately 30% text expansion.
- Avoid text baked into art.
- Test right-to-left layout before claiming support.

## 8.18 Appendix E: Accessibility checks

- Motion-control alternatives are fully playable.
- Sensor permission language explains purpose.
- Re-center/calibration are reachable.
- Essential states include shape, label, or pattern beyond color.
- Reduced motion lowers nonessential movement.
- Haptic, music, and effects controls are independent.
- Touch targets meet minimum size.
- Text survives larger accessibility scaling in DOM screens.
- No important instruction disappears automatically before it can be read.
- Timed onboarding can be replayed.

## 8.19 Appendix F: Economy guardrails

- One soft currency (coins) and one premium currency (gems) are sufficient for launch.
- Display exact prices and contents.
- Do not create negative balances.
- Grants and purchases are idempotent.
- Server/purchase authority owns premium entitlements.
- Cosmetic ownership survives catalog removal.
- VIP benefits, if introduced, are explicit and noncompetitive.
- Children and family-policy implications require review before ads or purchases.

## 8.20 Appendix G: Security and privacy

- Use least-privilege Supabase policies.
- Never expose service-role credentials.
- Validate room/challenge inputs.
- Rate-limit join, challenge creation, and leaderboard submissions.
- Sanitize display names and user content.
- Avoid predictable private room access where privacy matters.
- Store only necessary replay/profile data.
- Define retention and deletion behavior.
- Treat client timestamps and scores as untrusted.

## 8.21 Appendix H: QA device matrix

Minimum representative set:

- small older Android phone;
- mid-range current Android;
- tall high-DPR Android;
- iPhone Safari/PWA;
- tablet portrait;
- desktop browser with keyboard fallback.

Test:

- fresh install;
- denied/allowed motion permission;
- sensor sign and calibration;
- slow/unstable network;
- background/resume;
- low battery/reduced performance;
- safe areas;
- repeated races;
- live multiplayer roster;
- challenge link open from cold start.

## 8.22 Appendix I: Content review checklist

- Does it strengthen the shake/steer rhythm?
- Is the decision understandable without text?
- Is there a valid route?
- Is telegraph time fair at maximum speed?
- Does it remain readable on every compatible theme?
- Does it avoid crude or explicit imagery?
- Does it have reduced-effects behavior?
- Is it versioned and deterministic where needed?
- Are collision and visual bounds aligned?
- Does it meet performance budgets?

## 8.23 Appendix J: Open decisions

These items require owner approval before implementation:

- final supported distance sets across each mode;
- exact launch/speed/collision tuning values to extract from current build;
- final font family and license;
- account merge policy;
- XP curve and level cap;
- coin/gem earn and spend rates;
- catalog pricing;
- ad policy and remove-ads entitlement;
- VIP scope, if any;
- leaderboard authority and anti-cheat thresholds;
- matchmaking skill bands;
- daily challenge retry policy;
- telemetry vendor and consent model;
- acceptance thresholds for any future renderer change, only if profiling demonstrates a real Canvas2D limitation.

## 8.24 Appendix K: Definition of a vertical slice

The vertical slice is complete when a new player can:

1. open a branded splash;
2. enter as guest;
3. understand motion controls;
4. choose Practice;
5. charge and launch;
6. race through a polished Classic Tunnel;
7. collide, recover, collect, and use items;
8. enter final sprint and finish;
9. understand results;
10. replay or share;
11. experience stable performance and complete feedback.

It does not require all tracks, economy, VIP, battle pass, or hundreds of cosmetics.

## 8.25 Handbook maintenance

Owner responsibilities:

- product owner approves pillars, modes, economy, and roadmap;
- art lead approves master character, tokens, and asset quality;
- engineering owner approves architecture, schemas, and migrations;
- QA owner maintains device, replay, and release matrices.

When implementation and handbook disagree:

1. determine whether implementation is a bug, legacy behavior, or approved evolution;
2. do not silently edit either side;
3. create a decision record;
4. update code/tests and handbook together;
5. increment document version.
