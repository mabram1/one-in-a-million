# One in a Million Developer Handbook

**Version:** 1.1  
**Status:** Production baseline  
**Audience:** Game design, art, UI/UX, engineering, QA, Claude Code  
**Platforms:** Mobile portrait web/PWA, Android; iOS through web initially  
**Primary implementation:** Vite + TypeScript + Canvas2D, with Vitest for regression tests

This handbook is the single source of truth for **One in a Million**, a playful 2.5D vertical mobile racer in which a cute character called Spermy races through stylized biological canals toward a golden egg.

The handbook protects what already works, defines the visual and interaction system, and turns future work into repeatable production rules. It is deliberately practical: every chapter contains decisions, constraints, naming conventions, and acceptance criteria that Claude Code or a human contributor can follow.

## Start here

1. Read [Governance, Vision, and Design Principles](chapters/01-governance-vision-principles.md).
2. Read [Gameplay Pillars and Game Modes](chapters/02-gameplay-and-modes.md) before touching controls, physics, race rules, or scoring.
3. Read [Visual Language, Character, and Environment](chapters/03-visual-character-environment.md) before creating art.
4. Read [UI System and Screen Specifications](chapters/04-ui-and-screens.md) before changing menus or HUD.
5. Use [Content System: Tracks, Obstacles, and Power-ups](chapters/05-content-system.md) for new gameplay content.
6. Use the [Asset Manifest](chapters/06-asset-manifest.md) to plan and track deliverables.
7. Follow [Technical Art Pipeline and Canvas Architecture](chapters/07-technical-pipeline-and-canvas.md) for implementation.
8. Claude Code must follow [Development Rules, Roadmap, and Appendices](chapters/08-development-rules-roadmap-appendices.md).

## Authority and precedence

If two instructions conflict, use this order:

1. Explicit instruction from the project owner for the current task.
2. Approved gameplay values and behavior in the current working build.
3. This handbook.
4. Existing project conventions.
5. A contributor's preference.

Working code is not automatically correct, but tuned gameplay must not be changed incidentally. A refactor is not permission to retune the game.

## Non-negotiable product constraints

- Portrait 9:16, mobile-first.
- One-handed play using shake and tilt as the signature controls.
- Sessions usually last 20–60 seconds.
- Cute, cheeky, friendly, and non-explicit.
- Dark theme only.
- The center of the screen stays visually clear during racing.
- No death state from normal collisions; mistakes cost momentum.
- Important text remains readable while the phone is moving.
- Touch targets are at least 44 × 44 CSS pixels.
- Safe areas are respected.
- Procedural Canvas rendering remains supported while art is integrated gradually.

## Definition of done for a handbook-compliant change

A change is complete only when:

- it preserves the relevant product and design invariants;
- it reuses tokens and components rather than inventing parallel styles;
- it works on the smallest supported portrait viewport and a tall modern phone;
- it supports touch and the existing fallback controls where relevant;
- it has loading, empty, error, locked, disabled, and offline behavior where relevant;
- it has no critical information hidden behind a notch or home indicator;
- it maintains race performance and does not introduce avoidable allocations in the frame loop;
- it includes a short test note and updates documentation or manifests when the system changes.

## Package map

```text
one-in-a-million-developer-handbook/
├── README.md
├── CLAUDE_HANDOFF.md
├── CHANGELOG.md
└── chapters/
    ├── 01-governance-vision-principles.md
    ├── 02-gameplay-and-modes.md
    ├── 03-visual-character-environment.md
    ├── 04-ui-and-screens.md
    ├── 05-content-system.md
    ├── 06-asset-manifest.md
    ├── 07-technical-pipeline-and-canvas.md
    └── 08-development-rules-roadmap-appendices.md
```

## Living-document policy

Use semantic document versions:

- **Patch**: clarification with no behavior change.
- **Minor**: approved addition that remains backward compatible.
- **Major**: change to a core mechanic, visual identity, economy, architecture, or content contract.

Every material change should record the date, owner, decision, reason, affected systems, and migration impact. Do not silently alter a rule to match an implementation shortcut.
