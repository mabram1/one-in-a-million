# ADR-2026-001 — Vite + TypeScript + Canvas2D, no Phaser

- **Status:** Accepted (Handbook v1.1)
- **Date:** 2026-07-24

## Decision

The production architecture is **Vite + TypeScript + Canvas2D**, with **Vitest** for
unit, deterministic replay, and golden-run regression tests. **Phaser is not used.**
Canvas2D stays behind a renderer boundary so another renderer could be evaluated later
only if profiling proves a real limitation.

## Reason

The game renders dozens (not thousands) of active objects, uses simple custom collision
logic, and already has a tuned loop that ships as static web / PWA / Capacitor content.
Phaser would add bundle size and framework complexity without solving a demonstrated
limitation. TypeScript addresses the more immediate risk observed during development:
unsafe shared state and `undefined` multiplayer/replay fields (e.g. the "both players
won" results bug).

## Foundation Sprint (this change)

- Canonical source moved into the repo (`src/`), replacing the single-file prototype as
  the source of truth.
- Reproducible Vite build → `www/` (same directory the previous deploy used), `base: './'`
  so Pages, Vercel and Capacitor all resolve assets.
- All gameplay constants extracted **verbatim** into `src/game/config/tuning.ts`
  (`tuningVersion: "1.0.0"`), grouped by domain per handbook 7.6.
- Characterization tests (Vitest) lock protected launch/momentum/steering-lock/collision/
  pickup/final-sprint behavior against the real shipped loop.
- CI runs typecheck + tests + build.

## Explicitly NOT done in this sprint

No tuning changed; no gameplay timing, controls, collision, race distances, or ghost
compatibility changed; no UI redesign; no multiplayer authority change; no viewport
change; Endless not rebuilt; the simulation is **not yet** split from rendering (that is a
later task, gated on these baseline tests passing).

## Recoverability

The pre-migration build is preserved four ways: git tag `pre-vite-baseline`,
`legacy/www-index-0088469.html`, `tests/fixtures/legacy-build/index.html`, and the git
history of the previously committed `www/index.html`.
