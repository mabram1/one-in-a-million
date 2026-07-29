# Main Hub v2 — Production Specification

## 1. Product goal

The Hub must feel like the first frame of a race, not a settings page. Within two
seconds a player should understand:

1. who they are and what they own;
2. which distance is selected;
3. where to tap to start;
4. how to reach the other modes.

## 2. Final visual composition

### A. Top account bar

One compact translucent pill containing:

- equipped Spermy portrait;
- display name or `Guest`;
- level badge and XP progress;
- coin and gem balances;
- Settings icon.

It must not exceed 60 CSS px in the standard layout. Currency changes count up only
after persistence confirms the change.

### B. Compact live wordmark

Render `One in a Million` as DOM text, never as part of the background image.

- `One`: player teal;
- `in a Million`: cream;
- display face: Fredoka 700;
- optional small `FEATURING SPERMY` eyebrow on tall screens only.

### C. Live Track window

This is the signature element. It is a decorative Canvas2D renderer that borrows the
game's world art but has no gameplay simulation.

The window shows:

- a bright, wide starting chamber around the player;
- walls narrowing toward the top;
- circular glowing human ovum at the vanishing point;
- canonical Spermy above the start line;
- up to two muted rival silhouettes;
- a small number of WBC/virus objects in the middle distance;
- subtle particles and fluid drift;
- selected distance pill;
- mobile-motion readiness pill or desktop-demo pill.

The center lane uses teal only for the player. Rival lanes use coral or violet.

### D. Primary action

`RACE NOW` / `NA DIRKO` overlaps the bottom edge of the live-track window.

- minimum height: 56 CSS px;
- teal gradient, cream/void text depending contrast;
- large play icon;
- one pressed state: scale to 0.96 for 100 ms;
- routes to the selected Practice distance in v1;
- never silently starts Multiplayer.

### E. Distance selector

Three chips inside the upper part of the live-track window:

- 750 m;
- 1000 m;
- 1250 m.

Default for a new player: 750 m. Returning player: last valid Practice distance.
Changing the chip updates the goal depth/parallax preview but never modifies race
tuning until the race route is confirmed.

### F. Mode strip

Four equal controls:

- Practice;
- Multiplayer;
- Challenge;
- Endless.

Use a compact horizontal grid, not a vertical stack. Icons carry most of the meaning.
At 360 px width the label may wrap to two lines, but must remain at least 12 CSS px.

### G. Daily challenge

One shallow reward card above the bottom navigation.

- Hide or collapse to a chip when backend support is not ready.
- Never show fake progress.
- If offline, show cached rules only when their validity window is known.

### H. Bottom navigation

Fixed safe-area dock:

- Home;
- Customize;
- Store;
- Profile.

Home is teal-active. The other tabs are cream/muted. Do not duplicate Settings here.

## 3. Canvas layering

Back to front:

```text
0  background gradient
1  deep wall folds
2  narrowing membrane edges
3  distant particles
4  goal halo
5  goal rays
6  goal body
7  middle-distance obstacles/rivals
8  start platform and lane markings
9  player tail
10 player body
11 player face
12 near particles and subtle vignette
```

Use the accepted 512×768 rig alignment for the player. Do not paint a replacement
mascot into the Canvas.

## 4. DOM accessibility

- All interactive controls are real `button` or `a` elements.
- Canvas is decorative: `aria-hidden="true"`.
- The live-track section has an accessible DOM label describing selected distance.
- Visible focus ring: 2 px player teal plus 2 px void offset.
- Never communicate locked/offline/selected state using color alone.
- Support 200% text without clipping balances or mode labels.

## 5. Desktop separation

The app may open on desktop, but desktop play is not competitive mobile play.

- Show a persistent `DESKTOP DEMO` pill.
- Allow keyboard Practice.
- Store results under `desktop_keyboard`.
- Do not submit them to mobile-motion leaderboards or shared bests.
- This is state/domain behavior, not only a visual label.

## 6. Non-goals

Do not:

- change the race loop;
- change motion thresholds;
- alter charge timing;
- alter collision or final sprint;
- replace multiplayer transport;
- combine desktop and mobile records;
- rasterize live labels into a background;
- ship the concept PNG as the UI.

