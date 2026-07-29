# One in a Million — Phase 4 Handoff

Status: implementation-ready specification  
Scope: identity, first-run experience, Main Hub, Store economy, and Profile  
Target: portrait mobile; TypeScript + Canvas2D game with DOM/CSS application UI

## Outcome

Phase 4 turns the playable race into a coherent product:

1. honest loading and branded splash;
2. short, skippable intro;
3. contextual motion permission and interactive onboarding;
4. professional Main Hub with one obvious next action;
5. persistent profile, XP, coins, gems, owned cosmetics, and equipped loadout;
6. cosmetic Store using virtual currency;
7. separate result eligibility for motion, touch fallback, and desktop keyboard play.

The race simulation, motion tuning, multiplayer authority, ghosts, walls, HUD, and accepted Phase 2/3 art are protected and out of scope.

## Product decisions already made

- Coins are the normal earnable currency.
- Gems are rare/premium currency but remain earnable in small quantities.
- Cosmetics only: no purchasable gameplay advantage.
- Starting balance: `1,000 coins` and `20 gems`.
- Guest play remains available.
- Real-money purchases are disabled in this phase.
- Desktop keyboard records never mix with mobile-motion records.
- The intro is two to three seconds and always skippable after the first run.
- App launch never requests motion permission without explanation.

## Package map

- `01_PHASE4_SCOPE_AND_FLOW.md` — scope, navigation, screen states, sequence.
- `02_IDENTITY_SPLASH_INTRO.md` — identity and animation specification.
- `03_ONBOARDING_PERMISSIONS.md` — first-run and controls teaching.
- `04_MAIN_HUB_SPEC.md` — final hub layout and behavior.
- `05_STORE_ECONOMY_SPEC.md` — currencies, rewards, pricing, purchases.
- `06_PROFILE_PROGRESSION_SPEC.md` — XP, level, profile, input classes.
- `07_UI_COMPONENTS_ASSETS.md` — reusable components and asset plan.
- `08_CLAUDE_CODE_IMPLEMENTATION.md` — architecture and implementation order.
- `09_QA_ACCEPTANCE.md` — completion checklist and test matrix.
- `CLAUDE_PHASE4_PROMPT.md` — copy/paste task prompt.
- `data/` — machine-readable configuration contracts.

## Recommended execution

Claude Code should first implement the data contracts and persistence migrations, then the reusable app shell, then Splash/Intro/Onboarding/Main Hub, and only then Store/Profile. Do not build each screen as isolated HTML.

The optional gameplay work—sticky mucus behavior, cilia push behavior, rival/ghost sprite, and an additional boost pickup—is explicitly deferred until Phase 4 is stable.
