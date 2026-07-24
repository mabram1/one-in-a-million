# Handbook Baseline Audit — One in a Million

**Audit date:** 2026-07-24
**Handbook version audited against:** Developer Handbook v1.0 (Production baseline)
**Build audited:** `android-app` @ `0088469` (deployed to GitHub Pages + Android APK)
**Scope:** Read-only audit. No code changed. No gameplay retuned.

> **Protected behavior notice.** Controls, physics, collision response, race distances,
> multiplayer authority, and ghost compatibility are protected. Every task in the Phase 1
> backlog below is written to be *behavior-preserving*; any task that could alter tuned values
> is explicitly flagged **[NEEDS APPROVAL]**.

---

## 1. Current architecture and important files

### 1.1 Repository layout (actual)

```text
spermy-game/                          ← working folder, NOT a git repository
├── prototype/
│   └── spermy-prototype.html         ← 1,233 lines — THE SOURCE OF TRUTH (not version controlled)
├── android-app/                      ← the git repo pushed to GitHub (mabram1/one-in-a-million)
│   ├── www/
│   │   ├── index.html                ← 1,255 lines — GENERATED build artifact (committed)
│   │   ├── manifest.webmanifest      ← PWA manifest
│   │   ├── sw.js                     ← service worker (network-first)
│   │   └── icon.svg                  ← app icon
│   ├── .github/workflows/android.yml ← CI: builds debug APK via Capacitor, publishes to Release
│   ├── capacitor.config.json         ← appId ch.websamurai.oneinamillion
│   ├── vercel.json                   ← serves www/ as static site
│   ├── package.json                  ← Capacitor deps only (no build tooling)
│   └── index.html                    ← redirect stub → www/
├── supabase/                         ← local Supabase CLI project (dev only)
│   └── config.toml                   ← ports API 54421 / DB 54422 / Studio 54423
├── GAME_DESIGN_DOC.md
├── DESIGN_BRIEF.md
└── docs/audits/handbook-baseline-audit.md   ← this file
```

### 1.2 The single source file

The entire game is **one HTML file** containing three concerns inline:

| Region | Approx. size | Contents |
|---|---|---|
| `<style>` | ~110 lines | All CSS, including a `:root` design-token block |
| DOM | ~110 lines | Menu, lobby, HUD, overlays, toast, diagnostics |
| `<script type="module">` | 8 lines | Dynamic CDN imports (Trystero, Supabase) |
| `<script>` main IIFE | ~1,000 lines | **Everything else**: simulation, rendering, input, networking, replay, UI logic, audio |

**Function inventory (69 functions, all in one closure):**

- *Lifecycle/loop:* `loop`, `update`, `chargeUpdate`, `render`, `resize`, `resetRun`, `beginPlay`, `startCountdown`, `launch`, `endRun`, `quitRun`
- *Simulation:* `wallHalf`, `setLevelLength`, `spawnAhead`, `collisions`, `doHit`, `softWallBump`, `collectPickups`, `takePickup`, `updateRival`, `spermScreenX`
- *Input:* `registerStroke`, `onMotion`, `steerFromPointer` (+ inline key/pointer listeners)
- *Rendering:* `drawWalls`, `drawParticles`, `drawObstacles`, `drawPickups`, `drawSprintLine`, `drawEgg`, `drawRivalGhost`, `drawPeers`, `drawSperm`, `drawSpermShape`, `drawBanner`, `drawCompetitorMarkers`, `seedParticles`
- *Networking:* `startLive`, `startLiveSupabase`, `startLiveP2P`, `broadcastState`, `prunePeers`, `smoothPeers`, `showLobby`, `updateLobby`, `leaveLobby`, `beginLiveRace`, `supaCfg`, `setSupaCfg`, `peerHue`, `peerCount`
- *Replay/ghost:* `encodeGhost`, `decodeGhost`, `ghostWorldAt`, `setGhost`, `loadGhostFromHash`, `shareChallenge`, `enterChallenge`
- *UI:* `syncHUD`, `syncRaceMarkers`, `competitors`, `selectMode`, `updateHint`, `updateDiag`, `toast`, `banner`
- *Audio:* `initAudio`, `playStroke`, `playHit`, `playPickup`, `playLaunch`

### 1.3 Build and deployment

- **Build:** an **ad-hoc shell heredoc** run manually — concatenates an HTML head wrapper + `prototype/spermy-prototype.html` + a service-worker registration script into `android-app/www/index.html`. **This script exists nowhere in the repository.**
- **Verified:** deployed `www/index.html` core is byte-identical to the prototype source (78,927 chars) → *no current drift*, but the process is unreproducible by anyone else.
- **Web:** GitHub Pages (`mabram1.github.io/one-in-a-million/www/`); Vercel configured but domain `oneinamillion.skilliyo.com` not yet attached.
- **Android:** GitHub Actions → Capacitor → debug APK → GitHub Release `latest`.
- **Backend:** Supabase Cloud (`tsddumsxoclcjguczezr.supabase.co`), Realtime only. No tables, no auth, no RLS in use.

---

## 2. Handbook requirements ALREADY implemented

| Handbook rule | Status | Evidence |
|---|---|---|
| §2.1 Core race flow (prepare→calibrate→charge→release→race→recover→sprint→finish) | ✅ Full | State machine `start → ready → charging → playing → end` |
| §2.2 ~5 s charge, narrow GO zone, weak/perfect/overcooked | ✅ Full | `CHG_RATE 0.20`, `CHG_ZONE_LO/HI 0.88/1.00`, `CHG_MAX 1.12` |
| §2.2 Shaking suppresses steering | ✅ Full | `STEER_LOCK_MS 280` gate in `onMotion` |
| §2.2 Momentum persists, decays gradually | ✅ Full | `DECAY_CRUISE 0.012` |
| §2.2 Collisions cost momentum, never kill | ✅ Full | `HIT_PENALTY 0.30`, no death path |
| §2.2/§2.9 Final sprint: no steering, no items, faster bleed | ✅ Full | `DECAY_SPRINT 0.30`; steer forced 0; boost blocked; pickups cleared |
| §2.6 Collision consumes shield first; no repeat-drain from one overlap | ✅ Full | `doHit` shield branch; `o.hit` latch; wall bump edge-triggered |
| §2.7 Pickups STAR / BOOST_CHARGE / SHIELD_CHARGE / SPEED_ORB | ✅ Full | `takePickup` |
| §2.7 Items disabled in protected phases, thumb-reachable | ✅ Full | `!G.sprint` guard; buttons at bottom corners |
| §2.9 Funnel: wide start → narrow egg; big/dense early, small/sparse late | ✅ Full | `wallHalf` power-1.8 narrowing; `spawnAhead` `prog`-scaled size/density |
| §2.10 Practice 750/1000/1250 m, AI rival, distance pre-selection | ✅ Full | Menu chips; `setLevelLength` |
| §2.11 Live MP: room code, host-only start, 400/600/800 m, competitor rail + off-screen pointers | ✅ Full | Supabase Realtime; `MP.isHost`; `syncRaceMarkers`; `drawCompetitorMarkers` |
| §2.11 Remote racers interpolated and visually distinct | ✅ Full | `smoothPeers` lerp; per-peer hue; reduced alpha |
| §2.13 Challenge: run recorded, link shared, friend races ghost | ⚠️ Partial | Works, but **track is not seeded** — see §3 |
| §2.13 Ghost is semi-transparent and cannot collide | ✅ Full | alpha 0.45; ghost excluded from collision |
| §2.5 Never use frame count as time; clamp on resume | ✅ Full | `dt` clamped to `[0, 0.05]` |
| §3.2 Core palette | ✅ Partial | `:root` tokens exist (CSS only) |
| §7.14 No service-role key client-side | ✅ Full | Only anon key shipped |
| §7.14 Remote movement interpolated | ✅ Full | `smoothPeers` |
| §7.12 No per-frame allocation in hot paths | ✅ Mostly | Gradients cached in `GFX`; blood cells flat-filled |
| §1 Portrait-only, dark theme, centre clear, ≥44 px targets, safe areas | ✅ Full | CSS layout; HUD confined to top/bottom/right |
| §2.3 Touch + keyboard + motion fallbacks | ✅ Full | All three adapters present |
| §2.18 Sensor permission denial has playable fallback | ✅ Full | Keyboard/touch fallback + diagnostics line |
| §2.18 Re-center without reload | ✅ Full | ⟲ button |
| §8 iOS sensor sign correction | ✅ Full | `MOTION_SIGN` |

**Verdict: the gameplay layer is substantially handbook-compliant already.** The gaps are almost entirely *structural* (architecture, reproducibility, data integrity), not behavioral.

---

## 3. Gaps, inconsistencies, technical debt, and risks

### 3.1 Critical

| # | Finding | Impact | Handbook ref |
|---|---|---|---|
| **C1** | **Source of truth is not version controlled.** `prototype/spermy-prototype.html` is outside any git repo; only the *generated* `www/index.html` is committed. | Loss of machine = loss of canonical source and history. No review, no blame, no rollback of the real source. | §8 Rule 6 |
| **C2** | **Build is an unwritten manual shell command.** No script in the repo reproduces `www/index.html`. | Nobody else (or future me) can build. Silent drift is possible and undetectable. | §7.8 "deterministic from source + config" |
| **C3** | **Challenge tracks are not seeded.** `spawnAhead` uses `Math.random()` (18 call sites). A friend racing your ghost gets a **different obstacle layout**. | Time comparison is not fair; violates the core premise of the challenge feature. | §2.13, §8.3 "no unseeded randomness in challenge tracks" |
| **C4** | **Replay format has no header/version.** Ghost is a bare base64 delta string; no `version`, `tuningVersion`, `trackId`, `seed`, `durationMs`, checksum. | Old challenges will silently mis-compare after any tuning change. Cannot detect incompatibility. | §7.15 |

### 3.2 High

| # | Finding | Impact | Handbook ref |
|---|---|---|---|
| **H1** | **No separation of concerns.** Simulation, rendering, input, networking, replay, and UI all live in one closure and mutate a shared `G` object. Simulation directly reads DOM (`$('...')`), calls `navigator.vibrate`, and touches canvas metrics (`W`, `H`, `cx`, `spermY`). | Cannot unit-test simulation, cannot run headless, cannot swap renderer, high regression risk on every change. | §7.2, §7.5, §8 Rule 5 |
| **H2** | **Client-authoritative multiplayer.** Each client broadcasts its own `d`/`ft`; peers are trusted verbatim. No validation of impossible speeds/times; finish events are not idempotent; no server timestamps. | Trivially cheatable; unusable as-is for real leaderboards. | §2.11, §7.14 |
| **H3** | **No shared race start time.** `go` broadcast starts each client on receipt; latency differences shift start by tens of ms. | Unfair at close finishes; results not authoritative. | §2.11 |
| **H4** | **Rendering resolution couples to gameplay width.** `maxHalf = min(W*0.48, 236)` — canal width derives from *screen pixels*, not a logical gameplay width. | A wider device gets a wider playfield → different difficulty/reaction time. | §7.13 |
| **H5** | **Audio/haptics called directly from simulation.** `doHit`/`takePickup` call `navigator.vibrate` and `playHit()` inline. | No user preference, no rate limiting, no capability gating. | §7.18 |
| **H6** | **No error surfacing.** Many `catch(e){}` empty blocks (network, storage, clipboard, audio). | Failures are invisible; debugging user reports is guesswork. | §8.3 "do not hide errors with empty catches" |

### 3.3 Medium

| # | Finding | Impact | Handbook ref |
|---|---|---|---|
| **M1** | **Endless mode contradicts the handbook.** §2.14 specifies a *checkpoint/time* mode; the build implements distance-only ("how far can you get"), no checkpoints, no timer. | Documented product rule does not match shipped behavior. **Requires a product decision.** | §2.14 |
| **M2** | **Design tokens are CSS-only.** 30 distinct hex literals + 18 `rgba()` literals are hardcoded inside canvas draw calls, duplicating `:root` values. | Retheming (5 planned track themes) requires hunting literals across the renderer. | §3.2, §8.3 "no second token system" |
| **M3** | **Tuning constants are not versioned or grouped by domain.** They are a flat `const` block; no `tuningVersion` exists. | Replays/challenges cannot record which tuning produced them (feeds C4). | §7.6 |
| **M4** | **No asset manifest or loader.** Zero external art; everything procedural. `icon.svg` is the only asset, referenced by literal path. | Fine today, but there is no ingestion path for incoming ChatGPT art. | §7.11, §6 |
| **M5** | **CDN runtime dependencies.** Trystero + Supabase imported from `esm.sh` at runtime, unpinned to an integrity hash. | Third-party outage or content change breaks multiplayer; offline start is degraded. | §7.11 |
| **M6** | **Duplicated distance-selection logic.** Practice chips and MP chips are separate DOM+state implementations (`practiceM`, `mpM`). | Divergence risk as modes grow. | §8 Rule 4 |
| **M7** | **No tests of any kind.** No unit, integration, replay, or visual tests. Verification has been manual/simulated per change. | Regressions in protected behavior are only caught by playtesting. | §7.19 |
| **M8** | **Diagnostics panel ships in production.** `updateDiag` runs every 10 frames and mutates DOM. | Minor cost + leaks internal state to users. | §4 |

### 3.4 Low

| # | Finding | Impact |
|---|---|---|
| L1 | Dead code: `.live-btn` CSS, `#modeLevel`/`#modeEndless` handling, `#mRival`, `SUPA_DEFAULT` fallback path unused when localStorage set. |
| L2 | `supabase/config.toml.bak` committed alongside config; local-only artifact in working tree. |
| L3 | Handbook zip and extracted `_handbook/` sit in the working folder, unorganised. |
| L4 | `GAME_DESIGN_DOC.md` and `DESIGN_BRIEF.md` now partially superseded by the handbook; no precedence note. |
| L5 | Magic numbers in layout (`race` rail `top:74px; bottom:158px`) will fight larger HUDs. |

### 3.5 Risks

- **R1 — Single-file ceiling.** At ~1,250 lines the file is still workable, but every new system (economy, customization, tracks, leaderboards) compounds H1. The cost of splitting rises with each feature added first.
- **R2 — Protected-behavior erosion.** With no tests and no tuning version, an innocent refactor can silently change feel. This is the highest-value thing to defend.
- **R3 — Backend trust.** Shipping leaderboards on the current client-authoritative model would require rework, not extension (H2).
- **R4 — Art integration.** Incoming art has nowhere to land (M4); without a manifest, paths will be hardcoded ad hoc.

---

## 4. Values that should be centralized

### 4.1 Gameplay tuning (currently a flat `const` block, unversioned)

Proposed grouping per §7.6 — **values must be moved verbatim, not "cleaned"**:

| Group | Constants |
|---|---|
| `controls` | `REFRACTORY 105`, `SHAKE_THRESH 3.6`, `STROKE_WINDOW 1400`, `STEADY_RATE 3.0`, `DRIVE_RATE 4.0`, `MOTION_SIGN`, `IS_IOS` |
| `launch` | `CHG_RATE 0.20`, `CHG_ACTIVE_MS 260`, `CHG_ZONE_LO 0.88`, `CHG_ZONE_HI 1.00`, `CHG_MAX 1.12`, `CHG_RELEASE_MS 320` |
| `momentum` | `CRUISE_CAP 96`, `OVER_CAP 132`, `ACCEL_UP 34`, `DECAY_CRUISE 0.012`, `DECAY_SPRINT 0.30` |
| `steering` | `STEER_SENS 4.2`, `TILT_GAIN 0.42`, `STEER_LOCK_MS 280`, `STEER_FLOOR (= CRUISE_CAP*0.45)` |
| `collision` | `HIT_PENALTY 0.30`, wall bump `0.88`, grind scrub `0.4`, sperm radius `15`, pickup radius `18` |
| `items` | boost duration `1.4`, speed-orb duration `2.6`, start charges `3`/`2`, cap `9` |
| `finalSprint` | sprint-zone fraction `min(700, len*0.24)` |
| `camera` | `SPERM_Y_FRAC 0.72`, `PX_PER_UNIT 5.0` |
| `trackGeneration` | gap `min(300, 132 + world*0.05)`, grace `150`, cell prob `0.62`, cluster `0.42*(1-prog)`, size `(14+13r)*(1-0.4prog)`, band gap `min(0.72, 0.44+0.22prog)`, pickup prob `0.20`, breather `0.07`/`1.4`, wall shape `0.80/0.20/0.88/0.12/1.8/0.58/0.28`, `maxHalf min(W*0.48,236)` |
| `networkInterpolation` | broadcast `0.066 s`, smoothing `dt*9`, prune `6000 ms`, finish re-broadcast `1000 ms` |
| `race` | practice `750/1000/1250`, MP `400/600/800`, MP default `600` |

### 4.2 Visual tokens

- **Exists:** `:root` CSS custom properties (17 tokens) — good, but **CSS-only**.
- **Not centralized:** 30 hex literals + 18 `rgba()` literals inside canvas code, e.g. wall gradient stops `#1c060b`/`#5e1229`/`#b8304f`, blood cells `#c8404c`/`#7c1a24`, WBC nucleus `#a06bc0`/`#5e3480`, egg `#fff6e2`/`#ffd98a`/`#e79a3c`, sperm `#fbf0e0`, ghost `#dbeaff`/`#9ec4ff`, pickups `#ffd24d`/`#43e0cf`/`#7cff9f`.
- **Also uncentralized:** typography scale, radii (12/14/16/18 px), z-index ladder (9/10/20/30/40), rail geometry.

### 4.3 UI style

Panels, chips, buttons (`.play`, `.challenge-btn`, `.live-btn`, `.itembtn`, `.panel-play`) each redeclare gradients/shadows rather than composing shared classes — a component/token gap per §4.5.

### 4.4 Asset paths & config

| Value | Location | Should be |
|---|---|---|
| `icon.svg`, `manifest.webmanifest`, `sw.js` | literal `<link>`/`register()` | manifest-driven (§7.11) |
| Supabase URL + anon key | inline `SUPA_DEFAULT` const | build-time config/env |
| `esm.sh` CDN URLs + versions | inline dynamic imports | pinned dependency config |
| localStorage keys `oiam_run`, `oiam_supa` | scattered literals | persistence module constants (§7.16) |
| Trystero `appId`, Supabase channel prefix `oiam:` | inline | network config |

---

## 5. Current system boundaries (as-built)

| Concern | Where it lives | Boundary quality |
|---|---|---|
| **Simulation** | `update`, `chargeUpdate`, `collisions`, `doHit`, `collectPickups`, `spawnAhead`, `wallHalf`, `updateRival` | ❌ **Leaky.** Reads canvas metrics (`W/H/cx/spermY`), calls DOM (`syncHUD`), audio, and `navigator.vibrate`. No `step(dt, inputs)` contract, no snapshot. State is the shared mutable `G`. |
| **Input** | `onMotion`, `registerStroke`, `steerFromPointer`, inline key/pointer listeners | ⚠️ **Partial.** Three adapters exist and normalize into `G.steerTarget` + stroke events — effectively a `ControlFrame`, but implicit, unnamed, and written straight into game state. iOS sign fix correctly isolated in the adapter. |
| **Rendering** | `render` + 12 `draw*` functions, `GFX` gradient cache | ⚠️ **Partial.** Cleanly grouped and now allocation-light, but reads `G` directly instead of a snapshot; draw order is implicit in one function. |
| **Multiplayer** | `startLive*`, `broadcastState`, `prunePeers`, `smoothPeers`, `MP` object | ⚠️ **Partial.** Transport is abstracted (Supabase / P2P behind `MP.send`/`MP.sendGo`) — genuinely good. But client-authoritative, no event IDs, no server time, and it writes directly into render-consumed state. |
| **Replay/ghost** | `encodeGhost`, `decodeGhost`, `ghostWorldAt`, `setGhost` | ⚠️ **Partial.** Compact and lossless (verified), but position-sample based, **unseeded**, headerless, unversioned. Track length is *inferred* from the ghost's final distance — clever, but fragile. |
| **UI** | `syncHUD`, `syncRaceMarkers`, `competitors`, overlays, `toast`, `banner` | ❌ **Leaky.** `syncHUD` is called from inside the simulation tick and writes ~15 DOM nodes per frame. `competitors()` correctly abstracts "who am I racing" across AI/ghost/live — a good seam to keep. |
| **Persistence** | `localStorage` literals in 3 places | ❌ No module. |
| **Audio/haptics** | `initAudio`, `play*` called inline from simulation | ❌ No event bus. |
| **Telemetry** | — | ❌ None. |

**Good seams already present** (worth preserving in any refactor): `MP.send`/`MP.sendGo` transport abstraction; `competitors()`; `GFX` cache; `setLevelLength()`; the input adapters.

---

## 6. Phase 1 vertical-slice backlog

**Goal:** make the current build reproducible, protected, and extensible **without changing one frame of gameplay.**

Tasks are small, independently shippable, and ordered so a shippable build exists at every step.

---

### P1-01 — Put the source under version control · **S**
Move `prototype/spermy-prototype.html` into the repo as `src/index.html`; commit the handbook to `docs/handbook/`; remove `config.toml.bak` and the stray zip.
- **Acceptance:** `git ls-files` lists the source; a fresh clone contains everything needed to build; deployed output unchanged.
- **Tests:** Build from a clean clone; byte-compare produced `www/index.html` against the currently deployed file (must be identical).
- **Depends on:** —

### P1-02 — Commit a real build script · **S**
Replace the manual heredoc with `tools/build.mjs` (Node, no deps) that composes head + source + SW registration → `www/index.html`. Add `npm run build`.
- **Acceptance:** `npm run build` reproduces the deployed file byte-for-byte; CI runs it and fails if `www/index.html` is stale.
- **Tests:** Byte-compare against `0088469` output; CI check on a deliberately stale commit fails.
- **Depends on:** P1-01

### P1-03 — Extract tuning config (verbatim) · **M**
Move all constants from §4.1 into a single `tuning` object grouped by domain, with `tuningVersion: "1.0.0"`. **Values copied exactly; no rounding, no renaming of semantics.**
- **Acceptance:** No literal tuning numbers remain in simulation/input code; `tuningVersion` is exported; gameplay identical.
- **Tests:** Golden-run test — fixed input script (scripted strokes/steers) through the simulation before and after produces identical distance/speed/score traces within 1e-6. Manual: perfect-launch still lands at 136–137 %.
- **Depends on:** P1-01
- ⚠️ Protected behavior: **must not change any value.**

### P1-04 — Extract design tokens shared by CSS and canvas · **M**
Single source of colour/spacing/radii tokens; CSS `:root` generated from it; canvas draws reference tokens instead of the 30 hex + 18 rgba literals.
- **Acceptance:** Zero colour literals in `draw*` functions; rendered output visually identical.
- **Tests:** Screenshot comparison of a posed frame (fixed seed/state) before vs after — pixel-diff ≤ 0.5 %.
- **Depends on:** P1-01

### P1-05 — Seeded track generation · **M**
Replace `Math.random()` in `spawnAhead`/`seedParticles`/`wallHalf` seed with a seeded PRNG (e.g. mulberry32) driven by `raceSeed`. Same distributions, same tuning.
- **Acceptance:** Same seed + same length ⇒ identical obstacle/pickup layout; different seeds still vary; difficulty curve unchanged statistically.
- **Tests:** Unit — 1,000 spawns for seed A twice ⇒ deep-equal; seeds A vs B ⇒ differ. Statistical — mean gap, cell size and cluster rate per progress-band within 5 % of current build over 200 runs.
- **Depends on:** P1-03
- ⚠️ **Fixes C3.** Layout *distribution* preserved; individual layouts will differ from today (unavoidable and intended).

### P1-06 — Versioned replay/challenge format v2 · **M**
Add a header (`version`, `gameBuild`, `tuningVersion`, `trackSeed`, `distanceM`, `durationMs`, checksum) in front of the existing delta payload. Keep decoding v1 links as **legacy**: playable, labelled, and excluded from strict time comparison.
- **Acceptance:** New challenges carry seed + tuning version and reproduce the creator's exact track; v1 links still open and are visibly labelled legacy.
- **Tests:** Round-trip encode/decode equality (as already verified for v1); v1 fixture still decodes; mismatched `tuningVersion` surfaces the legacy label.
- **Depends on:** P1-05
- ⚠️ Ghost compatibility is protected → **backward compatibility is mandatory, not optional.**

### P1-07 — Extract a `ControlFrame` input contract · **M**
Formalize the existing adapters to emit `{ steer, shakeEnergy, actionBoost, actionShield, recenter, source }`; simulation consumes only that. No filter/threshold changes.
- **Acceptance:** Simulation has no `navigator`/DOM/event references; all three input sources still work, including the iOS sign fix and re-center.
- **Tests:** Unit — synthetic motion samples produce expected `ControlFrame`s; iOS UA flips steer sign. Manual — device check on Android + iPhone.
- **Depends on:** P1-03
- ⚠️ Protected: shake→stroke thresholds and the steering lock must be untouched.

### P1-08 — Separate simulation from rendering/UI · **L**
Introduce `step(dt, controlFrame)` + `snapshot()`. `render` and `syncHUD` consume the snapshot. Move `syncHUD` out of the simulation tick.
- **Acceptance:** Simulation module imports nothing from DOM/canvas/network; a headless Node harness can run a full race; visuals unchanged.
- **Tests:** Headless race with scripted inputs → same finish time/score as P1-03 golden run; frame-time p95 not worse than baseline on mid Android.
- **Depends on:** P1-03, P1-07

### P1-09 — Event bus for audio and haptics · **S**
Simulation emits semantic events (`launch_perfect`, `collision_obstacle`, `pickup_star`, `final_sprint`, `finish`, …); an output module subscribes and applies preferences/rate limits.
- **Acceptance:** No `navigator.vibrate` or `play*()` calls inside simulation; a mute/haptics preference works; behaviour otherwise identical.
- **Tests:** Unit — collision emits exactly one `collision_obstacle` per overlap; rate limiter caps repeats.
- **Depends on:** P1-08

### P1-10 — Logical gameplay viewport · **M**
Derive canal width from a fixed logical width mapped to the safe area, instead of `W*0.48`.
- **Acceptance:** Playfield width in gameplay units is identical across 360 px, 414 px, and tablet portrait; only framing changes.
- **Tests:** Compute canal half-width at three viewports — equal in world units; visual check of the three viewports.
- **Depends on:** P1-08
- ⚠️ **[NEEDS APPROVAL]** — on wide devices the *visible* playfield changes; this alters perceived difficulty even though tuning constants are untouched.

### P1-11 — Shared race start + authoritative finish ordering · **M**
Host broadcasts a start timestamp; clients count down to a common `t0`. Finish events carry a stable event ID and are deduplicated; ordering resolved from finish times bound to the race ID.
- **Acceptance:** Two devices start within ~50 ms; duplicate finish events do not double-count; results agree on both devices.
- **Tests:** Integration — simulated latency 50/150/400 ms; duplicated finish event; late joiner. Two-device manual race with agreeing results.
- **Depends on:** P1-06
- ⚠️ **[NEEDS APPROVAL]** — touches multiplayer authority (protected).

### P1-12 — Persistence module · **S**
Centralize `oiam_run`, `oiam_supa` (and future settings) behind a typed store with namespacing and migration hooks.
- **Acceptance:** No `localStorage` literals outside the module; existing saved runs/settings still load.
- **Tests:** Unit — read/write/clear, corrupt-JSON recovery; manual — an existing device keeps its saved challenge.
- **Depends on:** P1-01

### P1-13 — Error surfacing and diagnostics gating · **S**
Replace empty `catch` blocks with a `reportError` path (console + optional user toast); hide the diagnostics line behind a debug flag.
- **Acceptance:** No silent empty catches in network/storage/audio paths; diagnostics absent in production build.
- **Tests:** Force a Supabase failure → user sees a clear message; unit test the error reporter.
- **Depends on:** P1-01

### P1-14 — Asset manifest + loader skeleton · **M**
Introduce `assets/manifest` with entries for the icon and placeholders for incoming art; loader with fallback so a missing cosmetic never blocks a race.
- **Acceptance:** All asset references resolve through the manifest; a deliberately missing entry logs and falls back without breaking the race.
- **Tests:** Unit — missing-asset fallback; CI — manifest validation fails on orphaned/missing files.
- **Depends on:** P1-02

### P1-15 — Golden-run regression harness in CI · **M**
Run the headless simulation with fixture inputs + fixed seed; assert checkpoint distances, finish time, collision count, and score against stored goldens.
- **Acceptance:** CI fails when protected behaviour changes; goldens are regenerated only via an explicit, reviewed step.
- **Tests:** Deliberately perturb `HIT_PENALTY` in a scratch branch → CI must fail.
- **Depends on:** P1-08, P1-05

### P1-16 — Resolve the Endless-mode contradiction · **S** (decision) / **L** (if rebuilt)
Decide between (a) amend handbook §2.14 to describe the shipped distance-based mode, or (b) implement checkpoint/timer Endless.
- **Acceptance:** Handbook and build agree; decision recorded with date/owner/reason.
- **Tests:** If (b): checkpoint grant, timer expiry ends run, last-second crossing uses authoritative time.
- **Depends on:** —
- ⚠️ **[NEEDS APPROVAL]** — product decision, not an engineering one.

---

## 7. Recommended order, dependencies, complexity

### Wave 1 — Safety net (do first; unlocks everything else)
| Task | Size | Depends on |
|---|---|---|
| P1-01 Source under version control | S | — |
| P1-02 Build script + CI staleness check | S | P1-01 |
| P1-13 Error surfacing + diagnostics gate | S | P1-01 |
| P1-12 Persistence module | S | P1-01 |

### Wave 2 — Protect the tuning (highest risk-reduction per effort)
| Task | Size | Depends on |
|---|---|---|
| P1-03 Extract tuning config (verbatim) | M | P1-01 |
| P1-04 Shared design tokens | M | P1-01 |
| P1-07 `ControlFrame` contract | M | P1-03 |

### Wave 3 — Data integrity (fixes the fairness bug)
| Task | Size | Depends on |
|---|---|---|
| P1-05 Seeded track generation | M | P1-03 |
| P1-06 Replay format v2 (+v1 legacy) | M | P1-05 |

### Wave 4 — Architecture
| Task | Size | Depends on |
|---|---|---|
| P1-08 Simulation / rendering split | **L** | P1-03, P1-07 |
| P1-09 Audio + haptics event bus | S | P1-08 |
| P1-15 Golden-run CI harness | M | P1-08, P1-05 |
| P1-14 Asset manifest + loader | M | P1-02 |

### Wave 5 — Needs approval before scheduling
| Task | Size | Note |
|---|---|---|
| P1-16 Endless decision | S / **L** | Product decision |
| P1-11 Shared start + finish authority | M | Multiplayer authority is protected |
| P1-10 Logical gameplay viewport | M | Changes perceived difficulty on wide devices |

**Explicitly deferred beyond Phase 1** (handbook agrees these are not mandates): Phaser migration (§7.1, §7.20 — revisit only after P1-08 and only with a measured comparison), texture atlases, telemetry, economy/catalog, leaderboards (blocked on P1-11), full modular repo restructure (§7.3).

**Critical path:** P1-01 → P1-02 → P1-03 → P1-05 → P1-06, with P1-08 as the largest single item.
**Total Phase 1:** 7×S, 7×M, 1×L (plus one conditional L).

---

## 8. Summary judgement

The **product layer is in good shape** and already satisfies most handbook gameplay rules — the tuned control loop, funnel, sprint restrictions, item rules, and live multiplayer are all implemented and match §2 closely.

The **engineering layer is where the debt is**, and it is concentrated in four things worth fixing before any new feature: the source is not in version control (C1), the build is not reproducible (C2), challenge tracks are not seeded so ghost races are not fair comparisons (C3), and replays carry no version header (C4).

Everything in Wave 1–3 is behavior-preserving and can proceed without touching protected values. Wave 4 is the real architectural investment. Wave 5 items must not start without an explicit decision from the project owner.
