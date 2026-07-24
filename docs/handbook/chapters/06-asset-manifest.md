# 6. Asset Manifest

## 6.1 Manifest purpose

The manifest is the production contract between design, art, and engineering. Every imported asset has an ID, owner, status, source, export format, dimensions, anchor, and usage. Files must not enter runtime directories without a manifest record.

Priority:

- **P0:** vertical slice and identity.
- **P1:** launch-quality core.
- **P2:** progression and content expansion.
- **P3:** later events and polish.

Status:

`planned → briefed → concept → approved → source_ready → exported → integrated → verified`

## 6.2 Naming convention

```text
<domain>_<group>_<name>_<variant>_<state>@<scale>.<ext>
```

Examples:

```text
char_spermy_body_classic_idle@2x.webp
char_spermy_tail_electric_racing@2x.webp
obs_immune_large_pulse@2x.webp
ui_icon_shield_default.svg
fx_launch_perfect_burst@2x.webp
track_classic_wall_inner_a@2x.webp
```

Rules:

- lowercase ASCII and underscores;
- stable semantic names, not `final2`;
- scale suffix only on raster exports;
- state appears only when the pixels differ;
- IDs do not include folder paths;
- no spaces.

## 6.3 Source and export formats

Use SVG for:

- UI icons;
- logos and wordmarks;
- simple accessories;
- badges;
- currency and item symbols;
- scalable flat shapes.

Use lossless source PNG/PSD-equivalent or layered vector source for:

- characters;
- organic obstacles;
- soft effects;
- wall textures;
- painterly theme art.

Runtime exports:

- WebP where quality and browser support are verified;
- PNG for lossless transparency or compatibility;
- sprite atlas for small frequently used runtime frames;
- source files never packed directly into production.

## 6.4 Identity manifest

| ID | Deliverable | Format | Size | Priority |
|---|---|---|---:|---|
| `id_app_icon_master` | App icon master | PNG/source | 1024² | P0 |
| `id_app_icon_android_fg` | Android adaptive foreground | PNG | 432²+ | P0 |
| `id_app_icon_android_bg` | Android adaptive background | PNG/SVG | 432²+ | P0 |
| `id_logo_wordmark_full` | Wordmark with character | SVG | scalable | P0 |
| `id_logo_wordmark_plain` | Wordmark without character | SVG | scalable | P0 |
| `id_logo_mark` | Compact OIAM mark | SVG | scalable | P1 |
| `id_splash_art` | Splash composition | PNG/WebP | 1080×1920 | P0 |
| `id_loading_character` | Loading loop character | atlas/procedural | 256×384 | P1 |

App icon direction: Spermy’s cream head and large eyes in a bold teal/coral ring with a small gold goal accent. Avoid tiny wordmarks and explicit anatomical composition.

## 6.5 Base character manifest

| ID | State | Format | Source canvas | Priority |
|---|---|---|---:|---|
| `char_spermy_base_front` | Identity/front | PNG/WebP | 512² | P0 |
| `char_spermy_base_racing` | Racing | layered/procedural | 256×384 | P0 |
| `char_spermy_base_happy` | Happy | PNG/WebP | 512² | P0 |
| `char_spermy_base_crash` | Crash/sad | atlas | 256×384 | P0 |
| `char_spermy_base_celebrate` | Victory | atlas | 512² | P1 |
| `char_spermy_shadow` | Shared shadow | PNG/WebP | 256² | P0 |
| `char_spermy_shield_overlay` | Shield state | procedural/SVG | scalable | P1 |
| `char_spermy_boost_fx` | Boost trail | procedural/atlas | variable | P1 |

## 6.6 Customization manifest

### Body materials

`body_classic`, `body_lagoon`, `body_coral`, `body_grape`, `body_mint`, `body_gold`, `body_midnight`, `body_bubblegum`

Each body requires:

- runtime material or tint definition;
- inventory thumbnail;
- display name;
- rarity;
- unlock/economy metadata;
- face-contrast check.

### Tails

`tail_classic`, `tail_electric`, `tail_bubble`, `tail_rainbow`, `tail_comet`

Each tail requires:

- runtime core/glow behavior;
- thumbnail;
- optional particle texture;
- reduced-effects variant;
- maximum particle count.

### Eyes

`eyes_googly`, `eyes_confident`, `eyes_sleepy`, `eyes_starry`, `eyes_cyber`

Each requires neutral, charge, crash, and celebrate compatibility or a documented fallback to base expressions.

### Accessories

`acc_headband`, `acc_crown`, `acc_sunglasses`, `acc_goggles`, `acc_cap`, `acc_headphones`, `acc_halo`, `acc_helmet`

Each requires front/back layer where needed, common anchor, thumbnail, and overlap test across all eye styles.

## 6.7 Rival manifest

| ID | Description | Format | Priority |
|---|---|---|---|
| `rival_palette_01..08` | Remote color assignments | JSON/tokens | P0 |
| `rival_trail_simple` | Lower-cost remote trail | procedural | P0 |
| `rival_marker_01..08` | Race rail markers | SVG | P0 |
| `ghost_material` | Async ghost shader/tint | config | P0 |
| `ghost_trail` | Dashed soft trail | procedural | P1 |

## 6.8 Obstacle manifest

| ID family | Variants | Source size | Priority |
|---|---|---:|---|
| `obs_immune` | small, large, follower, splitter, burster | 256–512² | P0/P1 |
| `obs_membrane_gate` | fixed, moving, timed, double | 512²/modules | P0 |
| `obs_cilia` | short, long, sweep_left, sweep_right | 256×512 | P1 |
| `obs_current` | left, right, drag, forward | procedural + particles | P1 |
| `obs_contraction` | centered, offset | wall module | P1 |
| `obs_sticky` | small, large, trail | 512² | P1 |
| `obs_cluster` | slow, fast, offset | 512² | P2 |
| `obs_bubble` | small, large, burst | atlas/procedural | P1 |
| `obs_ph_zone` | slow, decay, energy | procedural | P2 |

Every obstacle variant needs idle, telegraph, active, and hit/recovery representation where applicable.

## 6.9 Pickup and goal manifest

| ID | Deliverable | Format | Priority |
|---|---|---|---|
| `pickup_star` | Score star | SVG/PNG | P0 |
| `pickup_boost` | Boost charge | SVG/PNG | P0 |
| `pickup_shield` | Shield charge | SVG/PNG | P0 |
| `pickup_speed_orb` | Instant overdrive | SVG/PNG | P0 |
| `goal_egg_world` | Golden egg | layered PNG/WebP | P0 |
| `goal_egg_rail` | Progress icon | SVG | P0 |
| `goal_egg_halo` | Goal glow | procedural/PNG | P0 |
| `goal_finish_rays` | Finish rays | procedural/atlas | P1 |

## 6.10 Track manifest

Each theme includes:

- token file;
- background parameters/texture;
- left/right wall module set;
- membrane edge;
- ambient particles;
- distant cell set;
- signature obstacle reskins;
- intro, checkpoint, final-sprint, and goal modules;
- preview card art;
- store/selection thumbnail;
- audio ambience reference.

Theme IDs:

```text
track_classic
track_bubble
track_villus
track_evil
track_golden
```

Classic is P0. Bubble and Villus are P1. Evil and Golden are P2 unless roadmap priorities change.

## 6.11 HUD manifest

| Family | Components | Format | Priority |
|---|---|---|---|
| `hud_stat` | distance, score, time | 9-slice/SVG | P0 |
| `hud_speed` | track, segments, overdrive | SVG/procedural | P0 |
| `hud_charge` | fill, GO zone, danger | SVG/procedural | P0 |
| `hud_item` | boost, shield, badge, disabled | SVG | P0 |
| `hud_rail` | rail, egg, markers, pointers | SVG/procedural | P0 |
| `hud_place` | ordinal badge | SVG/9-slice | P0 |
| `hud_banner` | perfect, sprint, checkpoint, best | 9-slice/text | P1 |
| `hud_recenter` | control action | SVG | P0 |

Text should remain live rather than baked into raster assets.

## 6.12 UI icon manifest

Required P0/P1 icons:

```text
home, back, close, settings, sound, music, haptic,
motion, touch, keyboard, recenter, info, help,
profile, edit, level, xp, coin, gem, lock, unlock,
store, customize, body, tail, eyes, accessory,
practice, multiplayer, matchmaking, challenge,
endless, daily, leaderboard, friends, global,
copy, share, invite, room, host, ready, connection,
play, replay, rematch, pause, resume, quit,
star, boost, shield, speed, timer, distance, score,
check, warning, error, offline, restore, privacy
```

Icons use one rounded stroke/fill family and must be tested at 24 px.

## 6.13 Screen mockup manifest

P0:

- Splash/loading
- Main hub
- Practice setup
- Multiplayer lobby
- In-game HUD
- Results
- Onboarding

P1:

- Matchmaking
- Challenge create/accept
- Customize
- Store
- Tracks
- Settings

P2:

- Profile
- Leaderboard
- Daily challenge
- VIP/expanded store states

Each screen delivery includes a 1080 × 1920 mockup, component breakdown, narrow-screen note, state variants, and token references.

## 6.14 Effects and particles

P0/P1:

- launch weak/good/perfect/overcooked;
- collision puff;
- wall scrape;
- boost trail;
- shield bubble/hit/break;
- pickup collect by type;
- checkpoint ring;
- final sprint gate;
- finish burst;
- unlock/reward;
- ambient dust, bubbles, red cells.

Effects must have duration, blend mode, max instances, reduced-effects alternative, and pooling requirement.

## 6.15 Store-listing assets

Before store submission:

- 1024² app icon;
- Android adaptive icon layers;
- Play feature graphic at current required dimensions;
- 6–8 portrait screenshots;
- localized screenshot captions;
- privacy-policy URL;
- promotional copy;
- age/content-rating answers reviewed against current content.

Exact store dimensions and policies must be verified against current Apple/Google documentation at submission time.

Suggested screenshot story:

1. Shake for the perfect launch.
2. Tilt through a wild living tunnel.
3. Race friends live.
4. Challenge a friend’s ghost.
5. Customize your Spermy.
6. Conquer new tracks.
7. Chase daily records.

## 6.16 Manifest record schema

```json
{
  "id": "obs_immune_large",
  "domain": "obstacle",
  "status": "approved",
  "priority": "P0",
  "source": "art/obstacles/immune/immune_large.source",
  "exports": [
    {
      "path": "assets/obstacles/immune/obs_immune_large_idle@2x.webp",
      "width": 512,
      "height": 512,
      "scale": 2
    }
  ],
  "anchor": { "x": 0.5, "y": 0.5 },
  "collisionProfile": "immune_large_v1",
  "tags": ["classic", "bubble", "blocker"],
  "owner": "art",
  "notes": "Glow excluded from collision bounds."
}
```

## 6.17 Asset QA checklist

- ID and filenames match manifest.
- Source is preserved.
- Transparency and edge matte are clean.
- Dimensions, scale, pivot, and bounds are correct.
- Color space is sRGB.
- Runtime compression was visually checked.
- Asset is visible on all compatible themes.
- Thumbnail matches equipped appearance.
- Reduced-effects behavior exists where required.
- Load/unload path is tested.
- Collision geometry was not derived from decorative pixels.

