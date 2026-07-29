# Identity, Splash, and Intro

## 1. Identity lock

Name: **One in a Million**  
Mascot: canonical accepted Spermy rig  
Goal symbol: accepted circular human ovum  
Tone: cheeky premise, clean presentation, premium casual arcade

Use the existing tokens exactly:

```css
--void: #0d0305;
--bg-1: #210710;
--bg-2: #42101f;
--membrane: #7c1836;
--flesh: #d1607c;
--pale: #f8ecdb;
--pale-dim: #d9c6b2;
--energy: #43e0cf;
--go: #7cff9f;
--warm: #ffce97;
--gold: #ffd24d;
--danger: #ff6a5c;
--text: #ffe6dc;
--muted: #c6959e;
```

Display font: **Fredoka**, weights 600 and 700.  
Body font: **Nunito**, weights 500, 600, and 700.

## 2. Splash screen

Reference: 1080×1920 portrait.

Layer order:

1. `#0d0305` background;
2. soft maroon canal glow;
3. low-contrast drifting particles;
4. centered wordmark;
5. small canonical Spermy beneath the logo;
6. honest load indicator and status;
7. retry/offline controls only when needed.

Copy:

- `Loading your race…`
- `Preparing Spermy…`
- `Connecting to the canal…`
- `Ready!`

Do not fake a percentage. Show percentage only when the loader has measurable byte or task progress.

## 3. Initialization states

```ts
type BootState =
  | "loading-local"
  | "loading-assets"
  | "connecting"
  | "ready"
  | "offline-ready"
  | "recoverable-error"
  | "fatal-error";
```

Offline-ready is valid when local Practice and Endless can run. Multiplayer actions remain visibly unavailable with an explanation.

## 4. Intro timeline

Total normal duration: 2.6 seconds.

| Time | Event |
|---:|---|
| 0–400 ms | Deep maroon field fades in; particles drift. |
| 350–950 ms | Spermy swims upward with one tail wave and teal trail. |
| 800–1450 ms | Circular ovum appears above with soft gold halo. |
| 1200–2050 ms | Wordmark resolves: `ONE IN A MILLION`. |
| 2050–2600 ms | Logo and character settle; transition to Welcome or Hub. |

Rules:

- first launch: play once;
- returning launch: skip by default unless app version marks a new identity sequence;
- tap skips after 400 ms;
- reduced motion: 350 ms crossfade to final lockup;
- no autoplay sound before user interaction;
- haptic only after the app has permission and only at final lockup.

## 5. Asset production list

Full compositions:

- `screens/splash_1080x1920.png`
- `screens/intro_keyframe_01_1080x1920.png`
- `screens/intro_keyframe_02_1080x1920.png`
- `screens/intro_keyframe_03_1080x1920.png`

Reusable layers:

- `identity/wordmark.png`
- `identity/wordmark_compact.png`
- `identity/app_icon_1024.png`
- `identity/android_foreground_432.png`
- `identity/android_background_432.png`
- `identity/splash_canal_glow.png`
- `identity/splash_particles.png`

Use accepted mascot and ovum assets directly. Do not redraw either inside the wordmark.

## 6. App icon direction

The icon contains:

- large canonical Spermy head;
- one readable teal tail curve;
- small golden circular ovum target;
- deep maroon background;
- no small text.

Keep critical content within the adaptive safe circle. Test at 48 px.

## 7. Acceptance

- No blank white frame during boot.
- Logo readable at 320 CSS px width.
- Intro can be skipped.
- Reduced motion removes swim, scale bounce, and ray rotation.
- Splash error exposes Retry and Continue Offline where valid.
- Existing accepted mascot and ovum remain canonical.
