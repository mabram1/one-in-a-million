# 5. Content System: Tracks, Obstacles, and Power-ups

## 5.1 Content-design goals

New content should create new decisions using the established controls. It should not require a separate control scheme, hide hazards in decoration, or invalidate recovery. Good content changes when the player shakes, when they steer, and which line they choose.

Each gameplay object has:

- a clear silhouette;
- a readable idle state;
- a telegraph;
- an active state;
- a recovery/cooldown state where relevant;
- one primary consequence;
- documented collision geometry;
- compatible track and pattern tags;
- performance budget.

## 5.2 Difficulty vocabulary

Use five authored bands:

1. **Learn:** one mechanic, wide safe route, long telegraph.
2. **Read:** repeated mechanic, moderate route choice.
3. **React:** combined motion and tighter timing.
4. **Master:** layered patterns with planned recovery.
5. **Peak:** short, fair climax; never procedural clutter.

Difficulty depends on speed and viewport. Pattern validation must use the fastest expected approach speed and smallest supported play width.

## 5.3 Pattern rules

- Always preserve at least one viable route.
- Do not spawn a required pickup inside a hazard body.
- Do not demand steering while a forced shake segment removes steering.
- Avoid consecutive full-width punishment without recovery space.
- Moving hazards must telegraph from outside reaction distance.
- Random variation adjusts sockets within tested bounds; it does not invent layouts.
- A pattern carries minimum/maximum canal width and speed tags.
- Final sprint contains no hazards or pickups.

## 5.4 Obstacle: Immune Cell

**Fantasy:** a soft white blobby cell with a purple nucleus.

Variants:

- Small drifter
- Large blocker
- Slow follower
- Splitter
- Pulse burster

Behavior:

- idle pulse;
- optional slow lateral drift;
- clear anticipation before a burst or split;
- collision removes momentum;
- short local invulnerability prevents repeated drain.

Art:

- cream/off-white body distinct from player through purple nucleus, round silhouette, and no teal tail;
- shadow defines position;
- dangerous active edge uses coral/purple pulse.

## 5.5 Obstacle: Membrane Band / Mucus Gate

Two soft anchors connect through a flexible band.

Variants:

- fixed gap;
- moving gap;
- timed open/close;
- double band;
- breakable visual feint only if behavior is unambiguous.

The band must visibly thicken during the damaging state. A thin decorative strand cannot have a large invisible hitbox.

## 5.6 Obstacle: Cilia Sweep

Rounded cilia extend from one wall and sweep across part of the path.

Consequence:

- pushes laterally and reduces speed modestly;
- does not usually cause a full crash penalty.

Telegraph:

- base glow travels outward;
- cilia lean backward before sweeping;
- safe side remains readable.

Fine background cilia must be lower contrast and cannot resemble active sweepers.

## 5.7 Obstacle: Fluid Current

A translucent directional flow pushes the player while inside.

Variants:

- left/right cross-current;
- backward drag;
- accelerating forward stream;
- alternating current.

Communicate direction with moving particulate streaks and broad arrows/waves. Do not use text during play. Current boundaries are soft but readable.

## 5.8 Obstacle: Contraction Walls

Both walls breathe inward, temporarily narrowing the canal.

Rules:

- telegraph through membrane brightening and inward waves;
- center or offset gap remains viable;
- avoid combining with an untelegraphed moving blocker;
- release creates a brief recovery pocket.

Collision remains a wall collision, not an instant fail.

## 5.9 Obstacle: Sticky Mucus

A translucent patch slows speed and steering response while occupied.

The patch should look viscous through slow internal swirl and bubbles. It must not resemble a harmless background stain. Entry and exit need soft feedback; it should not repeatedly trigger hit effects.

## 5.10 Obstacle: Cell Cluster

Several small cells orbit a shared center, opening periodic gaps.

Rules:

- rotation direction is obvious;
- gap timing is learnable;
- orbit speed is bounded by reaction time;
- collision applies once per cell overlap;
- clusters do not spawn where the canal width clips their orbit.

## 5.11 Obstacle: Bubble Burst

A bubble grows, telegraphs maximum pressure, then produces a radial push.

The player may pass before the burst, wait, or route around it. The expanding graphic and damaging/push radius must match. Reduced motion keeps timing telegraph through rings and value change.

## 5.12 Obstacle: Rival Wake

A remote or AI racer may leave a brief turbulent trail.

Use sparingly. The wake:

- slows or gently destabilizes;
- expires quickly;
- never makes another player fully opaque or hides hazards;
- is disabled if network latency makes its location unfair.

Asynchronous ghosts do not create wakes.

## 5.13 Obstacle: pH Zone

A stylized fluid region modifies one property temporarily.

Potential effects:

- speed decay;
- steering sensitivity;
- energy regeneration;
- current strength.

Each zone uses an icon and distinct edge pattern, not biological accuracy. Avoid reversing controls in the baseline; it is frustrating during motion play and creates accessibility issues.

## 5.14 Pickup system

Pickups float on the play plane and are collected by overlap. They share:

- 192 × 192 source canvas;
- consistent apparent size;
- gentle bob and rotation;
- pale outer keyline;
- short collection burst;
- optional magnet behavior only if introduced as a power-up.

Pickups never use the exact silhouette of a hazard.

## 5.15 Star

**Symbol:** `★`  
**Color:** warm gold with cream edge  
**Function:** adds score/collection value.

Stars may form risk/reward lines that teach a safe route, but should not always reveal the optimal competitive line.

## 5.16 Boost charge

**Symbol:** lightning bolt  
**Color:** gold core with teal ring  
**Function:** adds one boost charge or meter amount according to the current item model.

Inventory cap and overflow behavior must be explicit. Overflow may convert to score only if consistently messaged.

## 5.17 Shield charge

**Symbol:** shield  
**Color:** teal/cream  
**Function:** adds one shield charge or meter amount.

Shield activation:

- consumes one charge;
- shows a clear bubble around the player;
- blocks one defined collision;
- provides a short fade-out;
- cannot silently expire without feedback.

## 5.18 Speed orb

**Symbol:** four-point sparkle  
**Color:** teal-white core with gold accent  
**Function:** immediate temporary overdrive.

The speed orb should be visually distinct from gems/currency. It activates on collection and is not stored.

## 5.19 Active boost

Boost creates a short speed increase and stronger teal trail.

Rules:

- no use during final sprint if the mode forbids items;
- no stacking beyond the defined cap;
- effect duration is time-based, not frame-based;
- activation feedback is immediate even if the server later reconciles multiplayer state.

## 5.20 Power-up candidates for later phases

These require separate balancing before production:

- Magnet: attracts pickups within a visible radius.
- Phase/Ghost: briefly ignores obstacles.
- Time Capsule: adds checkpoint time in endless only.
- Slow Rivals: not recommended for live competitive launch because it increases network/fairness complexity.

Do not implement a power-up simply because art exists.

## 5.21 Golden egg

The egg is the goal and visual climax.

Art:

- largest single object in the finish chamber;
- warm gold shell, pale center highlight;
- radial rays and floating motes;
- halo stronger than any pickup but controlled to avoid white-out;
- no realistic texture.

Behavior:

- appears on progress rail from race start;
- becomes visible in-world near the final sprint;
- finish collision/line is separate from decorative bounds;
- goal animation cannot delay authoritative finish.

## 5.22 Track theme gameplay matrix

| Theme | Signature mechanic | Primary obstacle families | Ambient identity |
|---|---|---|---|
| Classic Tunnel | Balanced fundamentals | Immune cells, membrane bands | Red cells, coral glow |
| Bubble Stream | Currents and timing | Bubbles, cross-currents | Cyan/violet bubbles |
| Villus Forest | Sweeps and lane pressure | Cilia, contractions | Soft fronds, drifting spores |
| Evil Vein | Aggressive pulse patterns | Bursters, sticky zones, gates | Deep wine, red pulses |
| Golden Path | Speed and precision | Small clusters, clean gates | Gold dust, bright goal cues |

Themes are not difficulty tiers by default. Each supports multiple difficulty bands.

## 5.23 Procedural generation contract

Recommended generator sequence:

1. select seed and content version;
2. choose a track progression profile;
3. select compatible modules;
4. reserve checkpoint/final-sprint modules;
5. populate obstacle sockets using budget and tags;
6. populate pickups using risk/reward paths;
7. validate spatial and temporal viability;
8. emit deterministic content data;
9. record seed/version in replay and challenge metadata.

Validation checks:

- minimum clear width;
- maximum required lateral travel;
- reaction time at expected speed;
- overlapping collision shapes;
- wall clipping;
- pickup/hazard conflicts;
- repeated mechanic limits;
- recovery distance;
- deterministic output.

## 5.24 Content acceptance template

```markdown
### Content ID
- Name:
- Theme:
- Difficulty bands:
- Player decision:
- Telegraph:
- Active behavior:
- Consequence:
- Recovery:
- Collision:
- Compatible modules:
- Incompatible combinations:
- Audio/haptic:
- Performance budget:
- Test seeds:
```

