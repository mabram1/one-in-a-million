# How to Play — Claude Code Implementation

## 1. Placement in the first-run flow

```text
Splash
  -> Intro
      -> Card 1: Charge
      -> Card 2: GO zone
      -> Card 3: Tilt
      -> Card 4: Speed vs steering
      -> Card 5: Goal
      -> Motion permission
      -> Calibration
      -> Safe Practice
      -> Main Hub
```

Motion permission must still be requested from a direct user gesture. The first four cards explain why access is useful before the prompt appears.

## 2. Behavior

- Swipe left/right or use `NEXT`.
- Back returns to the previous card.
- Progress dots show the current card.
- `SKIP FOR NOW` may appear as a small secondary action after card 1.
- Card 5 uses `LET’S SWIM!` and starts permission/calibration or fallback selection.
- Settings exposes `Replay Tutorial`.
- Completion is versioned so future control changes can show an updated tutorial.

## 3. Responsive implementation

Use DOM/CSS:

- safe-area-aware container;
- title and body as live localized text;
- reusable illustration region;
- fixed-height bottom action region;
- minimum 44×44 CSS-pixel controls;
- no horizontal overflow;
- support 360×640 through tablet portrait.

Reference comps are 1080×1920 and show intended hierarchy, not fixed CSS coordinates.

## 4. Illustration composition

Reuse accepted assets:

- canonical 512×768 Spermy body/tail/faces;
- existing charge-meter states;
- WBC medium;
- star pickup;
- human ovum with separate halo/rays.

Do not redraw the mascot or bake cosmetics into tutorial art.

### Card 1

- charging expression;
- phone frame;
- charge meter;
- left/right shake arrows.

### Card 2

- GO-zone meter;
- early, perfect, and too-late expressions;
- green highlight without flashing.

### Card 3

- tilted phone;
- determined expression;
- WBC and star;
- curved steering path.

### Card 4

- split comparison:
  - shake/straight;
  - release plus tilt/curve.

### Card 5

- accepted round human ovum;
- halo and 12-ray layer;
- winning Spermy;
- route into safe Practice.

## 5. Localization

Load:

- `copy/how_to_play.en.json`
- `copy/how_to_play.sl.json`

Never use text extracted from the reference PNGs. The JSON is authoritative.

Implement with ICU-capable localization or the project’s existing i18n layer. Preserve punctuation and apostrophes.

## 6. Accessibility

- Screen-reader title, body, and current step.
- `aria-current="step"` on the active progress indicator.
- Reduced-motion mode removes phone shake, tilt, tail bob, and rotating egg rays.
- Images have concise localized alternative text.
- Text remains readable at 200%.
- Instructions never depend on color alone.

## 7. Interactive enhancement

When sensors are already available:

- card 1 meter may react to real shake;
- card 3 phone/character may react to tilt.

Do not record raw sensor data. A static animation remains the fallback.

## 8. Completion model

```ts
interface HowToPlayState {
  version: 1;
  currentStep: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
}
```

Persist only after each navigation action. Tutorial completion and the safe-Practice reward are separate idempotent flags.

## 9. Copy QA

- English and Slovenian both render without clipping.
- Labels inside diagrams are localized.
- Game terms remain consistent:
  - `charge meter` / `merilnik`;
  - `GO zone` / `zelena cona`;
  - `tilt` / `nagni`;
  - `ovum` / `ovum`.
- Humor remains clean and suitable for store screenshots.

## 10. Acceptance

- Player can correctly describe the shake/release/tilt loop after the cards.
- Player knows that shaking disables steering.
- Player recognizes the green zone.
- Player knows the goal is the circular ovum.
- Tutorial is skippable and replayable.
- Motion denial has a touch fallback.
- Existing gameplay tuning is unchanged.
