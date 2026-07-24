# 2. Gameplay Pillars and Game Modes

## 2.1 Core race flow

1. **Prepare:** load track, racers, cosmetics, control profile, and audio.
2. **Calibrate:** use the saved motion profile or offer a quick re-center.
3. **Charge:** steering is locked while the player shakes to fill the launch meter.
4. **Release:** stopping in the narrow green GO zone creates a perfect launch and overdrive.
5. **Race:** momentum bleeds slowly; the player alternates between shaking straight and tilting to dodge.
6. **Recover:** collisions remove momentum but do not kill the run.
7. **Sprint:** after the final-sprint marker, the lane clears, steering and items are disabled, and speed decays faster.
8. **Finish:** resolve order consistently, show immediate feedback, then present results and a next action.

## 2.2 Protected control behavior

The production build is the source for exact tuned values. The following behavior is invariant unless explicitly approved:

- Default launch charging requires roughly five seconds of sustained shaking.
- The perfect zone is narrow enough to reward timing but wide enough to learn.
- Undercharge produces a weak launch.
- Overcharge produces an “overcooked” fizzle.
- Shaking suppresses steering and sends the player straight.
- Tilting controls lateral position only while steering is available.
- Momentum persists and decays gradually during the main race.
- Wall and obstacle collisions sharply reduce speed.
- Normal collisions do not end the race.
- The final sprint removes route choice and becomes a pure physical speed contest.

All exact constants belong in a central tuning configuration, not spread across rendering or input files.

## 2.3 Input abstraction

The simulation consumes normalized intentions rather than raw platform events:

```ts
type ControlFrame = {
  steer: number;        // -1..1
  shakeEnergy: number;  // 0..1 normalized signal
  actionBoost: boolean;
  actionShield: boolean;
  recenter: boolean;
  source: 'motion' | 'touch' | 'keyboard';
};
```

Raw sensor sampling, filtering, iOS sign correction, dead zones, calibration, and permissions remain inside adapters. Replays record normalized inputs or authoritative state samples, never raw device sensor streams.

## 2.4 Launch quality states

| State | Meter condition | Gameplay result | Feedback |
|---|---|---|---|
| Weak | Released below GO zone | Low initial speed | Soft sputter, amber text |
| Good | Released near GO zone | Standard strong launch | Teal burst |
| Perfect | Released inside GO zone | Temporary overdrive | Gold/green burst, haptic, banner |
| Overcooked | Held past safe maximum | Fizzle and reduced launch | Comic pop, red-coral warning |

The meter must telegraph the GO zone early and never move unpredictably. If the zone changes by mode, disclose it before charging.

## 2.5 Movement and momentum

Movement should feel buoyant but controlled. The character visually banks before the collision body moves fully, creating anticipation without input lag. Lateral acceleration may be smoothed, but player intent must remain responsive.

Recommended separation:

- simulation speed in world units per second;
- display speed normalized to an arcade meter;
- distance in meters for player-facing progress;
- rendering scroll independent from actual screen pixels.

Never use frame count as time. Use a bounded delta or fixed-step simulation. Pause or clamp on tab resume to prevent a large time jump.

## 2.6 Collisions and fairness

Collision response:

1. confirm the obstacle is active and vulnerable;
2. consume shield if present;
3. otherwise reduce momentum and apply short knockback/control damping;
4. trigger invulnerability long enough to prevent repeated hits from one overlap;
5. play hit feedback;
6. preserve race participation.

Visual art must fit established collision geometry. Do not enlarge a hitbox to match decorative glow, cilia tips, or particles. Telegraph moving hazards before their damaging state.

## 2.7 Pickups and items

World pickups:

- `STAR`: score/collection value.
- `BOOST_CHARGE`: adds boost inventory or charge.
- `SHIELD_CHARGE`: adds shield inventory or charge.
- `SPEED_ORB`: immediate temporary overdrive.

Active items are thumb reachable and must not require precision tapping during shake. Item activation is disabled during protected phases such as final sprint. A disabled item remains visible with a reason, not silently unresponsive.

## 2.8 Scoring

Score should celebrate skill without obscuring race position. Baseline sources:

- stars collected;
- clean obstacle passes or near-misses if implemented;
- launch quality;
- finish position;
- remaining time in checkpoint/endless variants;
- mode-specific bonuses.

Race order and best time are more important than score in competitive modes. Never make paid cosmetics alter score multipliers unless the game clearly separates cosmetic and noncompetitive events; baseline policy forbids it.

## 2.9 Race funnel

The canal begins wider and becomes narrower near the egg. Content follows:

- early track: larger obstacles, wider gaps, more route choice;
- middle: combined patterns, controlled pressure, recovery opportunities;
- late: smaller, clearer hazards and fewer arbitrary blockages;
- final sprint: no hazards, pickups, active items, or steering.

Difficulty is created by timing and composition, not visual camouflage.

## 2.10 Practice mode

**Purpose:** learn controls, improve time, test cosmetics, and race an AI rival without social pressure.

Existing distance presets: 750 m, 1000 m, 1250 m. These remain canonical unless migrated deliberately from legacy values.

Requirements:

- distance selection before race;
- visible personal best;
- AI rival labeled clearly;
- restart available quickly;
- tutorial prompts decay as competence is demonstrated;
- practice results do not masquerade as live multiplayer rankings.

AI should feel plausible, not psychic. It follows the same speed constraints, makes readable errors, and uses difficulty curves rather than direct rubber-banding at the finish.

## 2.11 Live multiplayer

**Purpose:** short real-time races accessed with minimal setup.

Current behavior:

- room code;
- multiple players over Supabase Realtime;
- host-only start;
- selectable 400 m, 600 m, and 800 m races;
- live competitor rail and off-screen pointers.

Rules:

- server/backend time or a shared countdown establishes start time;
- clients do not trust arbitrary opponent finish claims;
- local movement feels immediate;
- remote racers are interpolated and visually distinct;
- reconnection and host departure have defined outcomes;
- a player entering late spectates or waits for the next race, rather than spawning mid-race.

## 2.12 Matchmaking

Target flow:

1. choose quick race;
2. enter a queue with an estimated wait of about 20 seconds;
3. show player arrivals and allow safe cancellation;
4. lock roster before countdown;
5. create a fresh race instance;
6. return racers to results/rematch rather than a dead lobby.

Matchmaking may launch with broad skill bands. Avoid false precision in queue estimates.

## 2.13 Challenge a friend

The player completes a run, receives a link, and the friend races the recorded ghost on the same deterministic track.

Challenge payload needs:

- challenge ID, version, creator display data;
- track ID and generation seed;
- mode and distance;
- tuning version;
- replay data or compressed state samples;
- creator result and integrity metadata;
- expiry and privacy state.

The ghost is semi-transparent and cannot collide. If a replay was recorded under incompatible tuning, either play it under its original version or label it legacy; never silently compare incompatible physics.

## 2.14 Endless checkpoint mode

The player races as far as possible while reaching checkpoints before time expires.

Rules:

- each checkpoint grants clearly displayed time;
- the next target is always visible in the HUD;
- difficulty rises in authored bands;
- the run ends when time reaches zero, not on collision;
- a last-second checkpoint uses authoritative crossing time;
- results emphasize distance, checkpoints, score, and personal best.

Content generation must guarantee a viable path. Endless does not mean uncontrolled randomness.

## 2.15 Daily challenge

All players receive the same seed, modifiers, track, and rules for the local challenge day. The daily challenge supports asynchronous ranking and a single primary scored attempt, with optional unranked practice attempts if desired.

It must display:

- time remaining;
- track and modifier summary;
- reward;
- attempt status;
- ranking scope;
- rules for retries.

## 2.16 Sponsor race

Sponsor content is a themed, time-limited wrapper around standard mechanics. It must:

- preserve hazard readability;
- label sponsorship clearly;
- avoid targeting children with manipulative purchase prompts;
- keep brand imagery out of critical play space;
- use approved track modules rather than a custom untested physics fork.

## 2.17 Game-state model

Recommended top-level states:

```text
BOOT → AUTH_GATE → HUB → MODE_SETUP → LOADING
→ CALIBRATION → CHARGE → COUNTDOWN/LAUNCH → RACING
→ FINAL_SPRINT → FINISHING → RESULTS
```

Overlay states such as pause, permission, reconnecting, and tutorial must not create contradictory simulation states.

## 2.18 Gameplay acceptance checklist

- Start and finish are deterministic across supported frame rates.
- Sensor permission denial has a playable fallback.
- Re-center works without reloading.
- A collision cannot repeatedly drain speed during one overlap.
- Final sprint disables steering and items visibly.
- Every procedural pattern has a valid route.
- Ghosts use matching seeds and tuning versions.
- Multiplayer handles disconnect, host departure, and duplicate finish events.
- Results use authoritative race data.

