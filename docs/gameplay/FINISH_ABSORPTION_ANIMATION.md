# Finish animation — “The Million-Dollar Plop”

Status: implementation specification  
Renderer: Canvas2D  
Art dependency: existing `egg.png` and `egg_halo.png`  
Do not use: `egg_rays.png`

## Product intent

At the finish, Champ does not stop in front of the ovum and the ovum does not emit
sunburst rays. Champ hits the soft outer membrane at full sprint, the membrane
briefly compresses, then pulls him inside with a quick elastic suction effect.

The moment should be:

- satisfying;
- funny and cheeky;
- premium mobile-game quality;
- readable in under 1.5 seconds;
- cute rather than anatomical or gross.

## Protected behavior

The authoritative finish is still the exact frame on which:

```ts
G.distance >= LEVEL_LENGTH
```

At that frame:

- lock `finishTime = G.elapsed`;
- lock score, place and input class;
- broadcast multiplayer finish immediately;
- stop accepting steering, shake, boost and shield input;
- do not advance race time during the cosmetic animation;
- do not change tuning, replay data or ranking.

The results overlay appears only after the cosmetic sequence completes.

## Timeline

Total duration: `1450 ms`.

### 0–120 ms — impact

- Champ stretches slightly in the direction of travel: `scaleY 1.00 → 1.16`.
- Champ compresses sideways: `scaleX 1.00 → 0.84`.
- Ovum compresses: `scaleY 1.00 → 0.91`, `scaleX 1.00 → 1.08`.
- Tiny camera bump, maximum 4 logical pixels.
- One muted coral impact ripple starts at the contact point.
- Haptic: short `18 ms`.

No flash-to-white and no radial rays.

### 120–360 ms — membrane rebound

- Ovum returns with an overshoot:
  - `scaleX 1.08 → 0.97 → 1.00`;
  - `scaleY 0.91 → 1.05 → 1.00`.
- Champ returns from the impact squash but remains locked to the ovum centre.
- The first ripple expands and fades.
- A small second ripple begins after approximately `90 ms`.

### 360–980 ms — suction

- Apply `easeInBack` for the first pull, then `easeInCubic`.
- Champ scale: `1.00 → 0.08`.
- Champ alpha: `1.00 → 0.00`, with most fade in the final 35%.
- Move Champ 6–10 logical pixels deeper into the ovum centre.
- Add a restrained wobble of at most `±0.10 rad`.
- Tail motion speeds up briefly, then tail length visually collapses toward
  `tail_root`.
- Cosmetics follow the same transform and disappear with the rig.
- Ovum remains clearly visible; it does not swallow the entire screen.
- Play a short airy “fwip/plop” sound, not a wet anatomical sound.
- Haptic at final pull: `[12, 30, 28]`.

### 980–1240 ms — seal

- Champ is fully hidden.
- Ovum performs one small pulse: `1.00 → 1.045 → 1.00`.
- `egg_halo.png` gently brightens and contracts.
- Draw two soft membrane rings using muted coral/gold alpha under 0.25.
- No rays, starburst, confetti or explosion.

### 1240–1450 ms — handoff

- Hold the clean ovum for approximately `120 ms`.
- Fade the results overlay in over `180–210 ms`.
- Win/placement data must already be locked from the crossing frame.

## State model

Add a presentation-only state:

```ts
type FinishAnimation = {
  active: boolean;
  startedAtMs: number;
  durationMs: 1450;
  lockedElapsed: number;
  lockedScore: number;
  resultCommitted: boolean;
};
```

Recommended flow:

```text
playing
  → finish crossing: commit finish data and broadcast
  → finishing: render animation, no simulation/input
  → end: show result screen
```

Split the current `endRun(true)` responsibility:

1. `commitGoalFinish()` — idempotently locks authoritative race data.
2. `beginFinishAnimation()` — starts presentation.
3. `showResults()` — updates DOM after 1450 ms.

Quit and Endless timeout continue to call the immediate non-goal result flow and do
not play this animation.

## Rendering

### Ovum

Remove the `egg_rays` draw call from the production path. Keep:

- `egg_halo` with restrained pulse;
- `egg` sprite;
- procedural low-alpha ripples.

All deformation must happen with Canvas transforms around the ovum centre:

```ts
ctx.translate(eggX, eggY);
ctx.scale(eggScaleX, eggScaleY);
ctx.drawImage(egg, -eggD / 2, -eggD / 2, eggD, eggD);
```

Do not edit or regenerate `egg.png` for v1 of the animation.

### Champ rig

Apply one parent transform to the complete layered rig so body, face and cosmetics
remain aligned. The tail may receive an additional local collapse factor.

Do not export a flattened finish sprite.

## Accessibility and settings

- With Reduced Motion:
  - duration becomes `550 ms`;
  - no camera bump;
  - no wobble;
  - simple scale/fade into ovum followed by result screen.
- Respect mute and haptics settings.
- The animation must be skippable after `450 ms` by a tap, but skipping only jumps
  presentation to results and never changes finish data.

## Acceptance criteria

- `egg_rays.png` is never drawn in the finish scene.
- Finish time and multiplayer placement equal the original crossing-frame values.
- Results are delayed only visually, not logically.
- Champ, face and every equipped cosmetic shrink as one aligned rig.
- Tail collapses cleanly without remaining visible after the body disappears.
- Repeated update/render calls cannot commit or broadcast finish twice.
- Android back/touch cannot restart or quit during the locked sequence.
- Reduced Motion path works.
- Existing 87 tests remain green.
- New tests cover authoritative finish locking, idempotency, delayed result display
  and Reduced Motion duration.

## Claude Code prompt

```text
Implement the finish absorption animation exactly as specified in
docs/gameplay/FINISH_ABSORPTION_ANIMATION.md.

Read the existing finish flow, drawEgg(), drawSperm(), rig layering, multiplayer
finish authority and characterization tests before editing.

Non-negotiable:
- no egg rays;
- no tuning or gameplay changes;
- finish time/score/place are committed on the original crossing frame;
- multiplayer finish is broadcast immediately and idempotently;
- results UI waits for the 1450 ms cosmetic sequence;
- use the existing layered rig and existing egg/halo assets;
- add Reduced Motion and skip behavior;
- add tests, then run npm run verify.

Stop after implementation and report files changed, tests, and required manual
checks on an Android phone.
```

