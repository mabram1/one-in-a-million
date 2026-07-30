# Canal v2 — integration note

## Assets

```text
game_world/tunnel_bg.png  1080 × 1920 RGB, opaque, sRGB
walls/wall_left.png        438 × 768 RGBA, sRGB
walls/wall_right.png       438 × 768 RGBA, exact mirror
```

The background is ambient depth only. The two wall strips are the moving/scrolling
foreground membrane and define the visible lane boundary.

## Required renderer behavior

The current `drawWalls()` returns immediately when `tunnel_bg` is loaded. This means
`wallHalf()` changes collision geometry but the visible walls do not follow it.

Change the loaded-art branch so it draws the existing dynamic wall texture:

```ts
function drawWalls() {
  if (art.ready && art.img.tunnel_bg && art.img.tunnel_bg.complete) {
    drawWallTexture();
    return;
  }

  // existing procedural fallback stays unchanged
}
```

`drawWallTexture()` already:

- clips the left and right texture to `cx ± wallHalfViz(worldY)`;
- scrolls the texture with world distance;
- uses left/right matched art;
- keeps collision geometry in `wallHalf()` unchanged.

Keep `tileW = 146` and `tileH = 256` for the 3× source assets unless a visual test
shows a seam or a scale mismatch.

## Visual geometry

The lane should be controlled only by the existing geometry:

```text
wide early section → gentle breathing width → progressively narrower final section
```

Do not bake the funnel shape into `wall_left.png` or `wall_right.png`. They are
straight, vertically tileable material strips. The engine creates the changing
shape by clipping them against `wallHalfViz()` every frame.

Do not change `wallHalf()`, collision values, input tuning, obstacle positions or
replay behavior as part of this art integration.

## Acceptance checks

- At the wide start, only a narrow amount of foreground wall is visible.
- As the lane narrows, both wall textures visibly move/clip toward the centre.
- The player collision boundary matches the visible edge.
- No large bubbly/grape-like wall forms.
- No green fringe or visible top/bottom tile seam.
- The background remains behind the moving walls and never replaces collision
  geometry.
- Existing characterization tests remain green.

