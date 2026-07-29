# Main Hub v2 — Animation and State Specification

## 1. Motion principles

The world is always gently alive. UI does not constantly bounce.

- background breathing: 6–8 s, maximum 2% luminance;
- particles: 8–14 s vertical drift, deterministic seeded positions;
- ovum halo pulse: 2.8 s, opacity 0.55–0.82;
- ovum rays: 24 s rotation;
- Spermy bob: 2.8 s, ±4 CSS px equivalent;
- tail wave: use the accepted rig/animation behavior;
- rival drift: 4–6 s, subtle lateral offset;
- button press: 100 ms to 0.96 scale;
- screen entrance: 320 ms opacity + 12 px translate;
- no perpetual animation on DOM text or currency pills.

Pause decorative animation when:

- document is hidden;
- the Hub is not the active route;
- a system modal covers the app;
- the user enables reduced motion.

## 2. Reduced motion

With `prefers-reduced-motion: reduce`:

- render a static tail frame;
- stop particles after their initial placement;
- stop halo pulse and ray rotation;
- remove parallax;
- retain only immediate pressed/focus state feedback.

## 3. Hub state model

```text
loading
  -> guest-ready
  -> signed-in-ready
  -> offline-ready
  -> route-transition
  -> error-recoverable
```

Loading must resolve from local persistence first. Network sync may refine the model
without blocking Practice or Endless.

## 4. Input/platform variants

### Mobile motion available

Show `MOTION READY`. Primary action starts the selected Practice setup.

### Mobile motion permission not decided

Primary action routes to the existing permission/calibration flow. Do not request
sensor permission from a background timer; it must follow a user gesture.

### Mobile motion denied

Keep touch fallback available if supported and label the input class correctly.

### Desktop

Show `DESKTOP DEMO`. Freeze `inputClass = desktop_keyboard` at race start.

### Offline

- Practice and Endless enabled;
- Multiplayer disabled with visible `OFFLINE`;
- Challenge enabled only when the required ghost payload is local;
- balances show confirmed local values;
- no fake daily progress.

## 5. Route actions

| Control | Result |
|---|---|
| Race Now | selected Practice distance or permission flow |
| Practice | focuses/opens Practice distance selector |
| Multiplayer | existing lobby/matchmaking route |
| Challenge | challenge creation/join route |
| Endless | existing Endless route |
| Daily | daily route only when feature-ready |
| Customize | customization route |
| Store | Store route |
| Profile | Profile route |
| Settings | Settings route/modal |

## 6. Analytics events

Names are suggestions; adapt to the existing telemetry layer.

```text
hub_view
hub_distance_changed
hub_primary_race_pressed
hub_mode_pressed
hub_daily_pressed
hub_nav_pressed
hub_desktop_demo_started
hub_motion_permission_routed
```

Do not include personally identifying sensor data.

