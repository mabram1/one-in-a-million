# 7. Technical Art Pipeline and Canvas Project Structure

## 7.1 Architecture stance

The game is already playable using HTML5 Canvas procedural rendering. This is an asset, not a temporary limitation. The production architecture is **Vite + TypeScript + Canvas2D**, with Vitest for unit, deterministic replay, and golden-run regression tests.

Phaser is not part of the planned architecture. The game does not need a general physics engine, tilemaps, large-scale sprite batching, or a framework-owned scene system. Adding it would increase bundle size and abstraction while risking changes to the already tuned game loop.

Canvas2D remains behind a renderer interface, so another renderer can be evaluated in the future if measured requirements justify it. This is not a roadmap item. Never combine renderer work with gameplay retuning.

## 7.1.1 Architecture decision ADR-2026-001

- **Status:** Accepted
- **Decision:** Use Vite + TypeScript + Canvas2D + Vitest without Phaser.
- **Reason:** The game renders approximately dozens rather than thousands of active objects, uses simple custom collision logic, already has a tuned loop, and deploys as static web/PWA/Capacitor content.
- **Benefits:** small bundle, direct control over timing, type safety, reproducible builds, testable modules, and no framework-driven behavior change.
- **Consequences:** the project owns a small asset loader, runtime state coordinator, sprite animation helper, tween helper where needed, and particle pooling.
- **Revisit only if:** profiling proves Canvas2D inadequate, content requires hundreds of independently animated sprites, or a concrete renderer feature produces a measured benefit greater than migration cost.

## 7.2 System boundaries

Keep these concerns separate:

- **Simulation:** movement, momentum, collisions, pickups, race state.
- **Input:** motion, touch, keyboard adapters and normalized control frames.
- **Rendering:** Canvas2D drawing, camera transform, particles, UI presentation.
- **Content:** track modules, obstacle definitions, seeds, spawn data.
- **Networking:** rooms, snapshots, interpolation, authoritative events.
- **Persistence:** settings, cosmetics, profile, challenge records.
- **Presentation UI:** hub, setup, store, customization, results.
- **Audio/haptics:** event-driven output.
- **Telemetry:** consent-aware product and error events.

Simulation must not import DOM APIs, Canvas contexts, Supabase clients, or asset paths.

## 7.3 Recommended repository structure

```text
/
├── public/
│   └── assets/
│       ├── atlases/
│       ├── audio/
│       ├── characters/
│       ├── effects/
│       ├── environment/
│       ├── obstacles/
│       ├── pickups/
│       └── ui/
├── src/
│   ├── app/
│   │   ├── bootstrap/
│   │   ├── routing/
│   │   └── screens/
│   ├── game/
│   │   ├── config/
│   │   ├── content/
│   │   ├── input/
│   │   ├── simulation/
│   │   ├── race/
│   │   ├── replay/
│   │   ├── rendering/
│   │   │   └── canvas/
│   │   ├── audio/
│   │   └── haptics/
│   ├── multiplayer/
│   ├── persistence/
│   ├── services/
│   ├── ui/
│   │   ├── components/
│   │   ├── tokens/
│   │   └── icons/
│   ├── assets/
│   │   ├── manifest/
│   │   └── generated/
│   ├── telemetry/
│   ├── types/
│   └── utils/
├── tools/
│   ├── asset-pipeline/
│   ├── atlas/
│   ├── validation/
│   └── replay/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── replay/
│   └── visual/
├── docs/
│   ├── handbook/
│   └── decisions/
└── package.json
```

Adapt names to the existing repository rather than creating a parallel architecture. Preserve framework conventions already in use.

## 7.4 Runtime lifecycle model

Use a small explicit runtime coordinator:

```text
bootstrap
preload
mode-setup
race-runtime
results
```

Menus, account, store, lobby, and results remain semantic DOM/CSS where that improves accessibility and responsive layout. Canvas2D owns the race world and any HUD elements that truly benefit from frame-synchronized drawing. Do not move a screen into Canvas merely for visual uniformity.

### Bootstrap

- minimal config;
- capability detection;
- global error hooks;
- loading of the smallest bootstrap bundle.

### Preload

- reads the generated manifest;
- loads the selected track, cosmetics, common HUD, and audio;
- reports real progress;
- handles retry and missing-asset fallback.

### Race runtime

- owns the Canvas2D renderer, view objects, and camera transform;
- receives simulation snapshots;
- forwards normalized input;
- emits presentation events;
- does not contain economy, store, or backend business logic.

### Results

- receives an immutable resolved race result;
- grants rewards through persistence/backend services independently of animation;
- renders through DOM/CSS;
- supports replay, challenge, rematch, and return-to-hub actions.

## 7.5 Simulation contract

Recommended fixed-step update:

```ts
interface RaceSimulation {
  reset(config: RaceConfig): void;
  step(dtSeconds: number, inputs: ReadonlyMap<PlayerId, ControlFrame>): void;
  snapshot(): RaceSnapshot;
  serializeReplayFrame(): ReplayFrame;
}
```

Properties:

- deterministic for a seed/tuning version within documented numeric tolerances;
- no rendering objects;
- no wall-clock calls inside `step`;
- no random calls outside the seeded generator;
- collision profiles referenced by stable IDs;
- event output is idempotent or carries event IDs.

## 7.6 Configuration and tuning

Centralize:

```text
controls
launch
momentum
steering
collision
items
finalSprint
camera
trackGeneration
networkInterpolation
```

Every tuning bundle has a version. Challenges and replays record it. Production changes use before/after test runs and do not ship as incidental refactors.

## 7.7 Asset source structure

```text
art-source/
├── identity/
├── character/
│   ├── body/
│   ├── tails/
│   ├── eyes/
│   └── accessories/
├── obstacles/
├── tracks/
├── pickups/
├── ui/
├── effects/
└── store-listing/
```

Runtime output mirrors domain names but contains only generated, optimized files. Never manually edit generated runtime assets.

## 7.8 Asset pipeline stages

1. **Validate source:** name, dimensions, color space, transparency.
2. **Normalize:** trim only when anchor metadata preserves alignment.
3. **Export scales:** generate required device/runtime scales.
4. **Compress:** WebP/PNG with reviewed quality.
5. **Pack:** atlas only compatible small assets.
6. **Generate metadata:** hashes, sizes, pivots, animation frames.
7. **Validate manifest:** missing/orphaned assets fail CI.
8. **Preview:** contact sheets or a local asset gallery.
9. **Budget check:** bundle and texture memory limits.

Pipeline output is deterministic from source plus config.

## 7.9 Raster scale strategy

Avoid blindly shipping `@1x/@2x/@3x` for every runtime asset. Mobile browsers choose based on DPR but GPU texture cost matters.

Recommended:

- maintain high-resolution masters;
- export one or two practical runtime scales by asset category;
- cap rendering resolution on very high-DPR devices;
- use SVG for simple UI;
- use mipmaps or scale filtering only where visually beneficial;
- test memory on low/mid Android hardware.

Store-listing exports remain separate from runtime assets.

## 7.10 Atlas policy

Atlas:

- small same-lifecycle sprites;
- animation frames;
- common UI icons if rasterized;
- particles.

Do not atlas:

- very large track backgrounds;
- unrelated store art;
- assets loaded in different modes;
- SVG used directly;
- textures likely to exceed hardware limits.

Atlas metadata includes frame, source size, trim offset, pivot, and animation tags.

## 7.11 Runtime loading

Use load groups:

- `bootstrap`: logo, loading UI, base fonts.
- `hub`: hub UI, base character preview.
- `race_common`: player, HUD, pickups, common effects.
- `track_<id>`: selected environment and obstacle art.
- `cosmetic_<id>`: equipped assets only.
- `store`: thumbnails loaded lazily.

Use hashes in filenames or deployment metadata to avoid stale caches. A missing cosmetic falls back to classic without blocking a race.

## 7.12 Performance budgets

Initial targets, to be measured and adjusted:

- stable 60 fps on target mid-range devices; graceful 30 fps fallback;
- avoid per-frame object allocation in simulation and effects;
- pool particles, pickups, obstacle views, and transient text;
- batch compatible sprites;
- cap simultaneous remote trails and ambient particles;
- pause nonessential animation when the app is hidden;
- decode/loading outside active race;
- no synchronous storage/network work in the frame loop.

Track:

- frame-time p50/p95;
- JS heap trend;
- texture memory estimate;
- draw calls/batches;
- asset bundle size;
- load-to-play time;
- long tasks;
- dropped network updates.

## 7.13 Responsive rendering

Use a logical portrait coordinate system and map to safe visible bounds:

- world simulation remains resolution-independent;
- UI uses CSS/safe-area layout or a dedicated viewport adapter;
- canal width responds to logical gameplay width, not raw screen pixels;
- tablet portrait may add side framing rather than widening the competitive route;
- camera crop cannot alter reaction time unfairly.

## 7.14 Multiplayer architecture

Supabase Realtime currently supports live rooms.

Recommended data split:

- reliable events: join, leave, ready, start, finish, item grant/use, host change;
- frequent transient state: position, speed, animation state;
- persisted records: challenge, result, profile, inventory, leaderboard submission.

Remote movement:

- timestamp snapshots;
- buffer briefly;
- interpolate;
- limited extrapolation;
- snap only when error exceeds a documented threshold;
- reduce visual trail on unstable connections.

Competitive integrity:

- validate impossible times/speeds;
- bind results to race and tuning version;
- make finish events idempotent;
- use server timestamps where possible;
- never place secrets or service-role keys in the client.

## 7.15 Replay and ghost format

Record the smallest data that faithfully reproduces the run:

```ts
type ReplayHeader = {
  version: number;
  gameBuild: string;
  tuningVersion: string;
  inputClass: 'mobile_motion' | 'mobile_touch_fallback' | 'desktop_keyboard';
  trackId: string;
  trackVersion: string;
  seed: string;
  durationMs: number;
};
```

Possible payloads:

- normalized input frames at fixed intervals;
- authoritative state keyframes plus interpolation;
- hybrid input + correction keyframes.

Include checksum and compression. Test replay determinism in CI using known seeds and golden results.

## 7.16 Persistence model

Separate:

- device settings;
- guest/local progression;
- authenticated profile;
- inventory/economy;
- purchase entitlements;
- results/leaderboards;
- challenges.

Account linking needs an explicit merge policy. Purchases are validated through platform/backend paths and restored independently from local storage.

## 7.17 Economy data model

Future economy content is data-driven:

```ts
type CatalogItem = {
  id: string;
  type: 'body' | 'tail' | 'eyes' | 'accessory' | 'bundle';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price?: { currency: 'coin' | 'gem'; amount: number };
  entitlementId?: string;
  availability: AvailabilityRule;
};
```

Do not hardcode prices into screen components. Real-money prices come from the platform store response.

## 7.18 Audio and haptics integration

Simulation emits semantic events:

```text
launch_weak
launch_perfect
collision_obstacle
collision_wall
pickup_star
item_shield_break
checkpoint
final_sprint
finish
```

Audio/haptics subscribe and apply user preferences, rate limits, and platform capability. Do not call vibration directly from collision math.

## 7.19 Testing strategy

### Unit

- launch classification;
- momentum decay;
- collision invulnerability;
- item consumption;
- final-sprint restrictions;
- deterministic generation;
- score and finish ordering.

### Integration

- permission denial and fallback;
- pause/resume;
- room join/start/finish;
- host departure;
- challenge create/accept;
- asset fallback;
- profile merge.

### Replay regression

Known seed + input fixture produces expected checkpoints, finish time tolerance, and collision count.

### Visual

- HUD safe areas;
- smallest/tallest viewports;
- theme readability;
- all cosmetic combinations;
- icon and thumbnail consistency.

### Performance

- full multiplayer roster;
- worst-case particle effects;
- repeated race cycles for leaks;
- slow network and offline recovery.

## 7.20 Migration plan: single-file JavaScript to modular TypeScript

1. Move the canonical source into the version-controlled repository.
2. Add Vite, TypeScript, and a reproducible static production build.
3. Add Vitest and capture golden behavior fixtures before structural changes.
4. Extract tuning values verbatim and add `tuningVersion`.
5. Extract shared visual tokens for CSS and Canvas2D.
6. Define the normalized `ControlFrame` contract without changing filters or thresholds.
7. Extract a DOM-free, Canvas-free fixed-step simulation.
8. Make the Canvas2D renderer consume immutable snapshots and semantic events.
9. Move replay, multiplayer, persistence, audio/haptics, and UI behind typed contracts.
10. Introduce a manifest-driven asset loader with fallbacks.
11. Split the old single-file path only after regression tests prove behavior parity.
12. Remove legacy build paths in a separate reviewed cleanup.

At every stage, a shippable path remains.

## 7.21 Technical acceptance checklist

- Simulation is independent from rendering and networking.
- Fixed-step/delta handling is safe.
- Tuning and content versions are recorded.
- Asset manifest has no missing or orphaned runtime files.
- Race loads only required track/cosmetic assets.
- No secrets are shipped client-side.
- Replays pass known-seed tests.
- Offline/permission/missing-asset fallbacks work.
- Performance passes on representative Android hardware.
- Golden-run behavior parity is documented before removing the legacy path.
