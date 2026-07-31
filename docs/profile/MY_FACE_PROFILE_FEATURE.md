# Profile feature — My Face / Moj obraz

Status: visual assets ready; implementation handoff  
Platform: mobile portrait, Canvas2D + TypeScript + Capacitor

## Goal

The player can choose or photograph their face and place it inside Champ's canonical
cream head. This changes only the face presentation. Champ's body silhouette, tail,
hitbox, anchors, cosmetics and gameplay remain unchanged.

## Delivered visual assets

```text
public/art/profile/my_face_tile.png       256 × 256 RGBA
public/art/profile/champ_face_mask.png    512 × 768 RGBA
```

- `my_face_tile.png` opens the capture/gallery flow from Profile or Customize.
- `champ_face_mask.png` is an inset, feathered mask derived from the canonical
  `base_body.png`; it preserves a visible cream rim around the user's image.

## User flow

1. Open Profile or Customize → **My Face / Moj obraz**.
2. Choose **Camera** or **Gallery**.
3. Explain that the original image is processed locally and is not uploaded.
4. Normalize image orientation.
5. Show a crop editor with:
   - drag;
   - pinch zoom;
   - optional rotation up to ±15°;
   - live preview inside Champ's head mask.
6. Confirm with **Use this face / Uporabi ta obraz**.
7. Save only the processed overlay.
8. Offer **Change** and **Delete** actions.

## Output contract

Create a full-canvas `512 × 768` RGBA overlay aligned to the existing rig.

Recommended local key:

```text
oiam_custom_face_v1
```

Prefer IndexedDB/Blob storage over a large base64 localStorage value.

Render stack:

```text
tail / trail
base_body
custom_face_photo        ← clipped by champ_face_mask
optional face gloss
glasses
mouth accessory
hat
aura
```

When `custom_face_photo` is active, do not render `face_idle`, `face_charging`,
`face_determined`, `face_hit` or `face_win` on top of it. Hats, glasses and mouth
accessories remain usable.

## Privacy and multiplayer

- Do not upload the original photo.
- Do not perform identity recognition or biometric profiling.
- Default storage is local-only.
- Other players continue seeing the standard canonical face.
- Cloud sync of the processed overlay is a later opt-in feature and requires a
  private bucket, deletion flow and moderation decision.
- Deleting My Face removes the local processed blob immediately.

## Performance

- Downscale the decoded source before editing; cap its longest edge around 2048 px.
- Revoke temporary object URLs.
- Do not retain the original camera/gallery Blob after confirming or canceling.
- Generate the final overlay once, not every frame.
- During gameplay load it as a normal cached `ImageBitmap`/image asset.

## Claude Code implementation prompt

```text
Implement the My Face / Moj obraz profile customization feature described in
docs/profile/MY_FACE_PROFILE_FEATURE.md.

Use the delivered assets:
- public/art/profile/my_face_tile.png
- public/art/profile/champ_face_mask.png

Requirements:
- mobile camera/gallery picker;
- manual drag/pinch/zoom crop editor;
- local Canvas processing only;
- output a 512x768 RGBA rig overlay;
- store the processed overlay in IndexedDB, not the original photo;
- preserve all existing rig anchors and cosmetic layers;
- hide normal expression overlays while My Face is active;
- keep glasses, mouth items and hats above the custom face;
- add Change/Delete controls;
- English and Slovenian localization;
- do not show/upload the user photo to other players;
- do not change gameplay, hitboxes or multiplayer results;
- include unit tests for mask/output dimensions, persistence, deletion and render
  layer selection;
- run npm run verify.

Stop after implementation and report files changed, tests and manual Android camera
checks still required.
```

