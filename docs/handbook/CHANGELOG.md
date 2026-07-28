# Handbook Changelog

## 1.2 — 2026-07-24

### Added

- Mobile motion control is the canonical competitive input class.
- Desktop keyboard play is explicitly unranked and limited to preview, development, and Practice.
- Results and replay headers record the active input class.
- Keyboard, touch-fallback, and motion results must not share ranked standings unless a future mode explicitly permits mixed input.

## 1.1 — 2026-07-24

### Accepted

- Vite + TypeScript + Canvas2D is the production architecture.
- Vitest is the test runner for unit, replay, and golden-run regression coverage.
- Canvas2D remains behind a typed renderer boundary.
- The project owns a small asset loader and lightweight runtime coordinator.

### Removed

- Phaser is no longer a target architecture, roadmap item, or open product decision.
- The proposed Phaser scene structure and Canvas-to-Phaser migration plan were removed.

### Reason

The current game uses a tuned custom loop, simple collisions, and a modest number of rendered objects. Phaser would add bundle size and framework complexity without solving a demonstrated limitation. TypeScript addresses the more immediate risk: unsafe shared state and undefined multiplayer/replay fields.

### Still awaiting owner decisions

- Whether Endless remains distance-based or becomes checkpoint-and-timer based.
- Whether Phase 1 may change multiplayer start/finish authority.
- Whether the logical gameplay viewport may change perceived width on wide devices.

## 1.0 — 2026-07-24

- Initial production baseline handbook.
