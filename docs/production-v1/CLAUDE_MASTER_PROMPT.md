# Claude Code — master prompt za nadaljevanje razvoja

Kopiraj vsebino spodnjega bloka v Claude Code.

---

You are continuing the existing **One in a Million** game in this repository.
Do not start a new project and do not rewrite the tuned race loop.

## Read first

Read these files completely before changing code:

1. `docs/production-v1/00_READ_ME_FIRST.md`
2. `docs/production-v1/01_PRODUCT_DECISIONS.md`
3. `docs/production-v1/02_COMPLETION_ROADMAP.md`
4. `docs/production-v1/03_BACKEND_BILLING_SECURITY.md`
5. `docs/production-v1/04_OWNER_INPUTS_REQUIRED.md`
6. `DESIGN_ASSET_SPEC.md`
7. `docs/handbook/README.md`
8. `docs/decisions/ADR-2026-001-vite-typescript-canvas2d.md`
9. `src/game/config/tuning.ts`
10. all tests under `tests/characterization/`

Then inspect the actual implementation and report which roadmap tasks are already
complete, partial, or missing. Trust the repository over old audit prose.

## Non-negotiable constraints

- Keep Vite + TypeScript + Canvas2D + Capacitor. Do not add Phaser.
- Preserve motion controls, launch charge, GO zone, steering, momentum, collision
  behavior, race distances, seeded tracks, replay compatibility and multiplayer
  behavior.
- Do not retune values unless the owner explicitly approves it.
- Do not combine a renderer rewrite with gameplay changes.
- `mobile_motion`, `mobile_touch` and `desktop_keyboard` results must remain separate.
- Teal `#43e0cf` remains the local player color.
- Reuse the existing art rig, catalog, design tokens and production assets.
- New user-facing copy must be in English and Slovenian localization data.
- No secrets in source control.
- No client-authoritative wallet, entitlement, daily quota or official leaderboard.
- No fake billing buttons or pretend purchases.
- Do not expose a user selfie to other players in v1.
- Keep the current working tree safe; do not discard unrelated changes.

## Work method

Implement the roadmap in small vertical phases. At the start of each phase:

1. inspect current code and migrations;
2. state the exact files you intend to change;
3. identify protected behavior and regression risk;
4. implement only that phase;
5. add or update tests;
6. run `npm run verify`;
7. provide a concise handoff: completed, tests, manual Android checks, remaining work.

Do not attempt Auth, Store, Billing and selfie processing in one change.

## Start now with Phase A only

Implement **Phase A — app shell stabilization** from
`docs/production-v1/02_COMPLETION_ROADMAP.md`.

Required outcomes:

- make Main Hub v2 the default landing experience;
- keep the classic menu only as a debug fallback, not the default product UI;
- add a small typed app router/state coordinator for splash, auth, home, customize,
  store, profile, leaderboard, daily, settings, paywall and race;
- replace `coming soon` toasts with real route surfaces, but the new surfaces may
  initially be honest empty states that contain their required title, navigation,
  loading/error state and next-phase contract;
- preserve the existing working Customize and Settings actions;
- make Android back navigation deterministic;
- restore the active non-race route after reload/resume where appropriate;
- centralize app-level toast/error handling;
- remove the runtime Supabase CDN import and install/pin the Supabase JS dependency
  through the Vite build; preserve offline game boot;
- do not implement login or billing yet;
- update documentation to mark Phase A status accurately.

## Phase A tests

Add tests for:

- default route is the new Main Hub;
- all declared routes resolve;
- unknown route falls back safely;
- Store/Profile/Daily/Leaderboard navigation opens real route surfaces;
- back returns to Home and does not accidentally quit an active race;
- Supabase import failure does not block offline Practice;
- all existing characterization, unit, typecheck and build checks remain green.

## Stop condition

Stop after Phase A is implemented and verified. Do not continue into Phase B
without owner review, because Phase B requires real Supabase and Google OAuth
configuration.

---

