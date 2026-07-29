# Main Hub v2 — Acceptance and QA

## Visual acceptance

- [ ] The Hub looks like a living race start, not a stacked web form.
- [ ] The wide start visibly narrows toward the circular human ovum.
- [ ] Canonical Spermy is the dominant character.
- [ ] Teal is reserved for the local player and selected/primary states.
- [ ] `RACE NOW` is the strongest action.
- [ ] Practice distance is visible without opening another screen.
- [ ] The four modes are visible without vertical scrolling at 390×844.
- [ ] Bottom navigation clears the home indicator.
- [ ] No text is baked into a full-screen PNG.

## Viewport matrix

Test all of:

| Viewport | Expected |
|---|---|
| 360×640 | compact layout; daily collapsed; no primary-action scroll |
| 390×844 | standard reference; all primary content visible |
| 412×915 | tall layout; full daily card |
| 600×960 | centered phone-like content; no stretched cards |
| 768×1024 | tablet portrait; max-width preserved |

Also verify:

- iOS notch and home indicator;
- Android display cutout;
- 200% text;
- Slovenian strings;
- reduced motion;
- slow image loading;
- offline boot.

## Functional acceptance

- [ ] New player defaults to 750 m.
- [ ] Returning player restores the last valid Practice distance.
- [ ] Race Now never changes game tuning before navigation.
- [ ] Motion permission is requested only from a user gesture.
- [ ] Desktop route freezes `desktop_keyboard`.
- [ ] Desktop results remain separate from mobile records.
- [ ] Offline Multiplayer is visibly disabled.
- [ ] Hub animation stops when the route/document is inactive.
- [ ] No network call occurs per animation frame.
- [ ] Existing deep challenge links still work.

## Protected-gameplay regression

Run the existing checks for:

- charge and GO zone;
- motion calibration and iOS sign flip;
- steering;
- collision momentum loss;
- final sprint;
- Practice distances;
- multiplayer room start/finish;
- challenge ghost playback;
- Endless checkpoints;
- race HUD positions.

The menu commit must contain no tuning changes.

## Performance budget

- Hub first useful paint from cached assets: under 1.2 s on a mid-range phone.
- Decorative Canvas target: 60 fps; gracefully reduce to 30 fps when needed.
- No more than 35 decorative particles.
- No Canvas allocation inside the frame loop.
- Decode menu images before the first animated frame where practical.
- Pause requestAnimationFrame when hidden.

## Claude handoff report

Claude must return:

```markdown
### Outcome
### Files changed
### Existing architecture adapted
### Routes wired
### Tests run
### Viewports checked
### Protected gameplay verification
### Remaining risks
```

