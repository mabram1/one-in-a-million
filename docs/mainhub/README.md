# One in a Million — Production Main Menu Handoff

This package turns the approved concept direction into an implementation contract for
Claude Code and the existing TypeScript + Canvas2D game.

## Approved direction

Use the structure of `reference/03-live-track-hub.png`, combined with:

- dimensional mode-card polish from `reference/01-cinematic-arcade-hub.png`;
- visible Practice distance selection from `reference/02-practice-podium-hub.png`.

The references are art-direction mockups. They are **not** flattened screen assets and
must not be used as full-screen backgrounds.

## Rendering boundary

- Account bar, wordmark, buttons, mode controls, daily card, and bottom navigation:
  semantic DOM + CSS.
- Animated tunnel preview: a dedicated decorative Canvas2D renderer.
- Mascot, goal, and obstacles: supplied accepted transparent PNG assets.
- Existing gameplay simulation, input, multiplayer, replay, tuning, and race HUD:
  protected and unchanged.

## Start here

1. Give Claude Code this complete folder.
2. Paste `CLAUDE_CODE_PROMPT.md`.
3. Let Claude inspect the current repository before it changes any files.
4. Implement behind a `mainHubV2` feature flag.
5. Compare against `docs/ACCEPTANCE_AND_QA.md`.

## Package map

```text
assets/
  menu/menu-icons.svg        reusable SVG symbol sprite
  reuse/                     accepted production PNGs needed by the live preview
data/
  asset-source-map.json      canonical paths and intended use
  design-tokens.json         exact visual tokens
  main-hub-layout.json       responsive layout contract
  main-hub-copy.*.json       English and Slovenian copy
docs/
  MAIN_HUB_PRODUCTION_SPEC.md
  ANIMATION_AND_STATE_SPEC.md
  ACCEPTANCE_AND_QA.md
starter/
  main-hub.types.ts
  main-hub.copy.ts
  live-track-renderer.ts
  main-hub.css
reference/
  three approved direction mockups
```

## Important

The starter files are framework-neutral reference implementation code. Claude should
adapt imports, routing, and state wiring to the actual repository rather than creating
a second application shell.

