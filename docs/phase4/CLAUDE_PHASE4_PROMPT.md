# Claude Code Phase 4 Prompt

Copy this into Claude Code after placing this package in the repository.

---

Implement Phase 4 for **One in a Million**, an existing portrait mobile TypeScript + Canvas2D game.

Read these files completely before editing:

1. the project Developer Handbook;
2. `one-in-a-million-phase4-handoff/README.md`;
3. every numbered Markdown file in the Phase 4 handoff;
4. every JSON file under `one-in-a-million-phase4-handoff/data/`.

Treat them as the approved product contract.

Required outcome:

- Splash with honest boot states;
- short skippable Intro;
- contextual motion onboarding and safe practice;
- redesigned Main Hub;
- local Guest profile;
- coins, gems, XP, levels, ownership, and equipped cosmetics;
- virtual-currency Store;
- Profile screen;
- separate motion/touch/desktop records;
- versioned persistence migrations and tests.

Hard rules:

- Do not rewrite the game loop.
- Do not change motion tuning, charge timing, collision behavior, final sprint, multiplayer authority, or ghost format.
- Keep Canvas2D for the race and DOM/CSS for application screens.
- Use existing accepted mascot, cosmetics, walls, HUD, obstacles, pickups, and goal assets.
- Use exact design tokens; do not invent another palette.
- No real-money checkout in Phase 4.
- Purchases and rewards must be atomic and idempotent.
- Desktop keyboard results must never enter mobile-motion rankings.
- Preserve offline Practice/Endless and Guest play.

Work in this order:

1. inspect repository architecture and existing persistence;
2. report the exact files you plan to change;
3. add types/config/migration/services with tests;
4. add shared app shell and tokens;
5. add Splash/Intro/Onboarding;
6. implement Main Hub;
7. implement Store;
8. implement Profile;
9. run builds, tests, mobile viewport checks, and gameplay regressions.

Do not implement optional sticky-mucus/cilia mechanics, new rival art, or extra boost art in this phase.

At completion, report:

- visible player outcome;
- changed files;
- migrations;
- tests;
- checked viewports;
- proof protected gameplay remains unchanged;
- remaining risks.
