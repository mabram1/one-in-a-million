# Claude Code Handoff

Use this file as the entry prompt when starting a Claude Code session.

## Required context

Read `README.md` and all files in `chapters/` before proposing architectural, gameplay, UI, or asset changes. Treat the handbook as the project single source of truth.

## Operating instruction

You are contributing to **One in a Million**, an existing, playable mobile portrait game. Preserve working behavior unless the task explicitly requests a change. The motion-control loop has been tuned through playtesting and is product-defining.

Before implementation:

1. Restate the requested outcome in one sentence.
2. Identify the handbook sections that govern it.
3. Inspect the existing implementation and reuse established components.
4. List assumptions only where the repository cannot answer them.
5. Propose the smallest coherent change.

During implementation:

- Separate simulation, rendering, input, networking, and UI.
- Keep gameplay deterministic enough for replay ghosts.
- Never put network calls, asset decoding, or allocations in the frame loop.
- Use design tokens instead of scattered literal values.
- Add assets through the manifest and loader, not ad hoc paths.
- Preserve touch, keyboard, and motion-control fallbacks.
- Do not redesign unrelated screens.

Before handoff:

- Run proportional tests and build checks.
- Check narrow and tall portrait viewports.
- Report changed files, visible behavior, tests, and remaining risks.
- Update the handbook only when an approved product rule changes.

## Protected behavior

Do not change these without explicit owner approval:

- the charge → release → steer → recharge control rhythm;
- approximately five seconds of sustained shaking to charge at default tuning;
- the narrow perfect-launch GO zone;
- steering lock while shaking/charging;
- slow momentum bleed after launch;
- collision punishment through momentum loss rather than death;
- final-sprint restrictions and faster speed bleed;
- existing race lengths, multiplayer authority, or ghost format;
- current mobile sensor calibration fixes;
- collision shapes or timing merely to fit new visuals.

## Response template

```markdown
### Outcome
<What changed for the player or team>

### Handbook rules used
- <chapter and rule>

### Implementation
- <small, concrete summary>

### Verification
- <tests and devices/viewports>

### Risks or follow-ups
- <only real remaining items>
```

