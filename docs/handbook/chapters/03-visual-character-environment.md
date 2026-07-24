# 3. Visual Language, Character Bible, and Environment Bible

## 3.1 Art-direction statement

**Polished 2.5D top-down cartoon biology arcade.**

The camera looks down on a vertically scrolling canal. Depth comes from layered walls, soft shadows, rim lights, parallax, overlapping particles, and character banking—not from a realistic 3D tunnel. The play plane stays clear and predictable.

The result should feel soft, glossy, energetic, and premium. It must never feel medically realistic, gross, explicit, or visually noisy.

## 3.2 Core palette

| Token | Hex | Role |
|---|---:|---|
| `color.bg.deepest` | `#0D0305` | Outer background, maximum depth |
| `color.bg.deep` | `#1C060B` | Canal interior |
| `color.wall.deep` | `#5E1229` | Deep wall mass |
| `color.wall.coral` | `#B8304F` | Inner wall |
| `color.membrane.glow` | `#FFB9C8` | Play-boundary edge |
| `color.accent.teal` | `#43E0CF` | Player, primary action |
| `color.gold.bright` | `#FFD24D` | Egg, reward, boost |
| `color.gold.warm` | `#F2B25F` | Gold depth |
| `color.success` | `#7CFF9F` | Perfect zone, success |
| `color.danger` | `#FF6A5C` | Rival, warning |
| `color.character.cream` | `#F8ECDB` | Hero body |
| `color.text.muted` | `#C6959E` | Secondary text |
| `color.text.primary` | `#FFF7F2` | Primary text |

Colors are tokens, not isolated hex literals. Each theme may remap wall and ambient tokens but must preserve player teal, goal gold, readable cream, and danger distinction.

## 3.3 Material language

### Organic walls

- Rounded, asymmetric contours.
- Three value bands: deep mass, coral inner wall, pale glowing edge.
- Broad gradients, no photographic texture.
- Slow 1–3% breathing deformation.
- Sparse wet highlights following the wall curve.

### Cells and obstacles

- Soft, slightly translucent bodies.
- Clear internal nucleus shapes where useful.
- One dominant silhouette per hazard.
- Subtle shadow below to establish play-plane height.
- Active or dangerous phase uses directional motion and a stronger rim, not only color.

### UI

- Dark translucent panels with controlled blur where performance allows.
- Teal keyline or glow for interactive focus.
- Gold for rewards and premium emphasis.
- Gloss is restrained: one highlight and one shadow, not skeuomorphic chrome.

## 3.4 Shape rules

- Corners and tips are rounded.
- Character and friendly objects use circles, capsules, teardrops, and waves.
- Hazards may be lumpy or spiky only when tips remain blunt.
- Important objects need recognizable silhouettes at 48 px.
- Avoid hairline strokes; icon strokes remain legible at small sizes.
- Decorative glows never define the collision boundary.

## 3.5 Lighting and depth

Default light comes from the upper center with local emissive accents.

Depth stack:

1. deep canal background;
2. low-contrast stains and ambient flow;
3. distant cells and particles;
4. wall mass;
5. membrane edge;
6. floor shadows;
7. obstacles and pickups;
8. racers and trails;
9. collision/boost effects;
10. HUD.

Objects on the play plane use a soft shadow displaced slightly downward. The player has the clearest teal rim. Rivals use their assigned color and reduced opacity.

## 3.6 Motion language

Ambient motion is slow and irregular. Gameplay motion is decisive.

| Element | Motion |
|---|---|
| Wall | Slow breathing and highlight drift |
| Background particles | Gentle upward/downward parallax |
| Player tail | Continuous wave, frequency tied to speed |
| Player head | Small bank toward steering direction |
| Eyes | Blink and glance; never reduce readability |
| Immune cell | Slow pulse with telegraphed active motion |
| Pickup | Float, rotate, and pulse |
| Button | 0.96 scale on press, quick spring return |
| Reward | Short radial burst and count-up |

Reduced-motion mode removes parallax intensity, large scale pulses, and repeated reward loops while preserving essential telegraphs.

## 3.7 Character role

Spermy is the emotional center and player identity. The design is a fantasy mascot, not a realistic depiction.

Personality:

- optimistic;
- determined;
- slightly cheeky;
- expressive under pressure;
- resilient after crashes.

The character should look lovable in an icon, readable during a race, and modular enough for cosmetics.

## 3.8 Base proportions

Reference racing sprite canvas: 256 × 384 px at source scale.

- Head occupies roughly 34–40% of total visible character length.
- Head is a soft cream teardrop with the wider end leading upward.
- Eyes occupy roughly 35–45% of head width together.
- Tail begins centered behind the head and tapers through a long S-curve.
- Tail glow extends beyond the opaque core but does not affect hitbox.
- Shadow is a separate layer.

Exact proportions should be locked after the first approved master asset. All cosmetics fit that master rig.

## 3.9 Character layer contract

Back to front:

```text
shadow
trail
tail_glow
tail_core
body
body_detail
eyes
eyebrows
mouth
accessory_back
accessory_front
status_fx
```

Layers share one origin and reference bounds. Cosmetic exports may omit empty layers but may not change the anchor.

## 3.10 Required poses and expressions

### Front/identity

Neutral hero pose for profile, store, onboarding, and icon studies.

### Racing

Focused expression, head slightly elongated by motion, active tail wave, teal trail.

### Happy

Raised eyebrows, bright eyes, small smile; suitable for unlocks.

### Crash/sad

Brief squint or wobble with a recoverable comic expression. Never injured or distressed.

### Celebrate

Wink, spin, or “number one” pose with gold/teal confetti.

Additional runtime states: idle blink, charging effort, perfect launch, shielded, boosted, slowed, finish.

## 3.11 Animation principles

- Head motion remains smaller than tail motion.
- Eyes and facial features follow the head rigidly.
- Tail wave amplitude increases with speed; charging increases frequency.
- Steering creates a maximum bank that does not distort the hitbox.
- Crash squash is brief, then recovery begins immediately.
- Victory loops should be 1.5–2.5 seconds and seamless.

Prefer procedural tail animation at runtime when it is cheaper and more responsive than sprite sheets. Use sprite sheets for authored expressions or effects only when necessary.

## 3.12 Customization system

Cosmetics never modify physics, hitbox, speed, score, or item capacity.

### Body colors: launch set

1. Classic Cream
2. Lagoon Blue
3. Coral Pop
4. Grape Glow
5. Mint Spark
6. Golden One
7. Midnight
8. Bubblegum

Color variants must preserve face contrast and player rim. Avoid colors too close to the wall or goal.

### Tail styles: launch set

1. Classic Wave
2. Electric
3. Bubble
4. Rainbow
5. Comet

Tail styles share the root anchor, approximate length, and competitive footprint. Decorative particles are capped for performance.

### Eye styles: launch set

1. Googly Classic
2. Confident
3. Sleepy
4. Starry
5. Cyber

Eyes must preserve glance direction and expression readability. Sunglasses belong to accessories, not eyes.

### Accessories: launch set

1. Red headband
2. Crown
3. Sunglasses
4. Pilot goggles
5. Baseball cap
6. Headphones
7. Halo
8. Tiny helmet

Accessories must not cover both eyes, extend excessively into adjacent lanes, or resemble gameplay pickups.

## 3.13 Cosmetic rarity

Suggested cosmetic-only tiers:

- Common: one material treatment, simple color.
- Rare: extra pattern or restrained particle.
- Epic: animated material or distinct tail behavior.
- Legendary: coordinated body/tail/effect set with premium presentation.

Rarity does not imply power. Use labels and frames in inventory; do not rely on color alone.

## 3.14 Rival and remote-player readability

The local player always has:

- cream or equipped body with strong teal ownership rim;
- highest local opacity;
- strongest tail focus;
- consistent center marker if needed.

Remote racers:

- use assigned accent colors;
- render at approximately 65–85% opacity depending on overlap;
- have simpler trails;
- show a compact name marker when readable;
- never use the exact player teal treatment.

The asynchronous ghost is more transparent, has a dashed or soft trail, and carries a `GHOST` marker at setup/results—not a permanent large label in play.

## 3.15 Environment construction

Each track is assembled from modules:

- intro/wide start;
- straight;
- gentle left/right bias;
- wide arena;
- narrowing funnel;
- obstacle set piece;
- checkpoint;
- recovery pocket;
- theme transition;
- final-sprint gate;
- goal chamber.

Every module defines:

- logical width curve;
- safe path(s);
- spawn sockets;
- wall art parameters;
- ambient particle profile;
- theme tokens;
- difficulty rating;
- compatible neighboring modules.

## 3.16 Camera and composition

- The player sits below vertical center during normal racing so upcoming content is visible.
- The camera may ease forward with speed but cannot hide near hazards.
- HUD never reduces the logical canal without layout compensation.
- Camera shake is brief and low amplitude; it must not compound physical phone shaking.
- The finish egg is introduced progressively through glow, rays, and scale.

## 3.17 Track-theme visual bible

### Classic Tunnel

Warm crimson and coral. White immune cells, red blood cells, pink membrane glow. This is the canonical readability benchmark.

### Bubble Stream

Deep plum with cyan-violet fluid highlights. Transparent bubbles, refractive rings, lateral currents. Teal player rim remains distinct by using violet in environment glows.

### Villus Forest

Dark burgundy with soft coral fronds along the walls. Cilia/villi sweep in slow waves. The play route remains open; fine strands do not cross the center as decoration.

### Evil Vein

Deep wine and charcoal with danger-red pulses. More aggressive immune shapes and contracting walls. Avoid black-on-black hazards; active edges use pale coral telegraphs.

### Golden Path

Deep aubergine base with warm gold dust and cream-gold membrane edges. Gold pickups need teal or white outline so they remain distinct from ambient particles. The egg remains the brightest and largest gold object.

## 3.18 Art acceptance checklist

- Cute and stylized, not realistic or explicit.
- Readable at runtime scale and on the smallest screen.
- Local player is identifiable in a crowded race.
- Collision silhouette is clear without relying on glow.
- Asset uses approved palette or documented theme remap.
- Correct anchor, bounds, naming, and transparency.
- No baked background unless the manifest requests it.
- No accidental halos, matte edges, or compression artifacts.
- Animation loops cleanly and supports reduced motion where relevant.

