# Delivery Sequence and Optional Backlog

## Phase 4A — Identity and Home

Implement first:

1. app shell and design tokens;
2. Splash and real loading states;
3. Intro;
4. onboarding and permission flow;
5. Main Hub redesign;
6. input-class tagging;
7. fresh-install and returning-user tests.

Approval checkpoint:

- launch feels professional;
- first-time player understands controls;
- Hub is clear;
- desktop is visibly a separate Demo class;
- gameplay remains unchanged.

## Phase 4B — Store, Economy, and Profile

Implement after Phase 4A approval:

1. profile schema and migration;
2. wallet and XP;
3. reward receipts;
4. ownership/loadout;
5. virtual-currency Store;
6. Profile and separated records;
7. purchase/reward tests;
8. offline and reload verification.

Approval checkpoint:

- rewards grant exactly once;
- cosmetic purchase and equip survive reload;
- prices match catalog;
- no pay-to-win;
- real-money UI remains hidden.

## Optional gameplay backlog

These are not part of Phase 4 and must use separate gameplay tuning tasks.

### P1 — Sticky mucus behavior

Art exists: `obstacles/sticky_mucus.png`.

Suggested behavior:

- speed multiplier: 0.72 while inside;
- steering response multiplier: 0.82;
- 120 ms entry easing;
- 220 ms exit easing;
- no repeated crash event;
- visible status ring and one entry haptic.

Values are starting hypotheses, not approved tuning.

### P1 — Cilia sweep behavior

Art exists: `obstacles/cilia_sweep.png`.

Suggested behavior:

- clear 550–750 ms anticipation;
- lateral impulse instead of full crash;
- modest speed loss;
- mirror sprite for left/right wall;
- preserve one viable lane;
- reduced-motion telegraph through value/outline change.

Values require mobile playtesting.

### P2 — Rival and ghost sprite

Reuse the canonical body silhouette at 0.8×.

- live rivals: warm coral/desaturated body;
- asynchronous ghost: 45–55% opacity;
- never use local-player teal;
- ghost has no collision;
- rival names/markers stay more important than cosmetic detail.

### P2 — Additional boost-charge pickup

The current Phase 3 `speedorb.png` is immediate overdrive. If the game still needs a stored boost-charge pickup, create a separate `pickups/boost_charge.png` rather than reusing the speed orb.

Proposed visual:

- gold lightning core;
- cream keyline;
- coral secondary ring;
- no dominant teal, to keep player ownership readable.

### P3 — Real-money billing

Only after:

- retention and economy data;
- platform product IDs;
- receipt validation;
- restore flow;
- refund handling;
- legal/privacy review;
- parental confirmation behavior.

Do not introduce VIP until its exact benefits are defined and demonstrably non-pay-to-win.
