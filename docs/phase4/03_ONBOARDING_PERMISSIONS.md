# Onboarding and Permissions

## 1. Principle

Teach the physical control rhythm, not a list of buttons:

**shake to build speed → release → tilt to dodge → shake again**

Motion permission is requested only after the player understands the benefit.

## 2. First-run sequence

### Card 1 — Shake to charge

Title: `SHAKE TO CHARGE`

Copy: `Shake your phone to fill the meter.`

Interactive requirement: the meter responds to real motion where available. Desktop shows an animation and keyboard hint without pretending motion exists.

### Card 2 — Stop in the green zone

Title: `NAIL THE LAUNCH`

Copy: `Stop shaking inside the green GO zone for overdrive.`

Show undercharged, perfect, and overcooked outcomes visually.

### Card 3 — Tilt to steer

Title: `TILT TO DODGE`

Copy: `Release, then tilt left or right to choose your line.`

### Card 4 — Shaking means straight

Title: `SPEED OR STEERING`

Copy: `While shaking, Spermy swims straight. Release to aim.`

### Final safe practice

- short corridor;
- no fail state;
- one wide WBC;
- one star;
- one steering target;
- completion grants `100 coins` once.

## 3. Permission flow

1. Explain motion use.
2. Player taps `ENABLE MOTION`.
3. Request platform permission inside that gesture.
4. On success, run calibration.
5. On denial, present Touch controls.
6. Keep `TRY AGAIN` in Settings.

Do not repeatedly prompt after denial.

## 4. Fallback input classes

```ts
type InputClass =
  | "mobile_motion"
  | "mobile_touch"
  | "desktop_keyboard";
```

- `mobile_motion`: ranked-eligible.
- `mobile_touch`: stored separately and clearly labeled.
- `desktop_keyboard`: Demo/Practice records only; never mixed with mobile records.

Desktop copy:

`DESKTOP DEMO — keyboard results are stored separately and do not enter mobile rankings.`

## 5. Completion flags

```ts
interface OnboardingState {
  version: 1;
  introSeen: boolean;
  controlsExplained: boolean;
  motionPermission: "unknown" | "granted" | "denied" | "unavailable";
  calibrationComplete: boolean;
  safePracticeComplete: boolean;
  rewardClaimed: boolean;
}
```

Never issue the tutorial reward twice after refresh, reinstall restore, or account merge.

## 6. Skip behavior

- `SKIP FOR NOW` is available after the first explanation card.
- Skipping chooses a detected fallback and routes to Hub.
- Settings retains `Replay Tutorial`.
- Multiplayer may warn once if calibration is incomplete, but it must not trap the user.

## 7. Accessibility

- reduced-motion alternative;
- haptics optional;
- high-contrast instructions;
- icons plus text;
- no instruction depends on color alone;
- minimum target 44×44 CSS px;
- localized copy must fit at 200% text size.

## 8. Analytics events

No personal sensor stream is recorded.

Allowed events:

- `onboarding_started`;
- `onboarding_card_completed`;
- `motion_prompt_shown`;
- `motion_permission_result`;
- `calibration_completed`;
- `fallback_selected`;
- `safe_practice_completed`;
- `onboarding_skipped`.

Record event names and coarse outcomes only, never raw accelerometer samples.
