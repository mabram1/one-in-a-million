# Claude Code prompt — production audio, music and haptics

Copy the prompt below into Claude Code.

```text
Build the production-ready audio and haptics foundation for the existing
One in a Million mobile game.

This is an existing Vite + TypeScript + Canvas2D + Capacitor project. Do not start
a new project, do not introduce Phaser and do not retune gameplay.

## Read first

Inspect completely:

- src/game/legacy/game.ts
- src/main.ts
- src/app/screens/settings.ts
- src/game/config/tuning.ts
- src/app/persistence/
- tests/characterization/
- docs/gameplay/FINISH_ABSORPTION_ANIMATION.md
- docs/production-v1/00_READ_ME_FIRST.md
- DESIGN_ASSET_SPEC.md

Find all existing audio, navigator.vibrate and mute calls before changing code.

## Goal

Create one centralized audio/haptics system that supports:

- music;
- gameplay sound effects;
- UI sounds;
- adaptive race music layers;
- synchronized finish-animation audio;
- clear Android haptics;
- persistent volume and accessibility settings;
- graceful fallback when an audio file is missing;
- web, PWA and Capacitor Android.

The sound must feel like a cute premium arcade game, not realistic biology.
Avoid gross, wet or anatomical sounds.

## Architecture

Create typed modules similar to:

src/audio/
  AudioManager.ts
  AudioManifest.ts
  AudioSettings.ts
  MusicDirector.ts
  SfxPlayer.ts
  HapticsManager.ts
  events.ts
  index.ts

Do not call Web Audio, HTMLAudioElement, navigator.vibrate or a Capacitor haptics
plugin directly from simulation functions.

Simulation/gameplay should emit typed presentation events. The audio and haptics
systems consume those events.

Example event names:

- ui_click
- ui_back
- charge_start
- charge_tick
- launch_weak
- launch_perfect
- launch_overcooked
- stroke
- boost_activate
- shield_activate
- collision_wall
- collision_wbc
- collision_virus
- collision_membrane
- pickup_star
- pickup_shield
- pickup_speed
- checkpoint
- final_sprint_start
- finish_impact
- finish_membrane_pop
- finish_suction
- finish_seal
- result_win
- result_lose

## Audio buses

Implement:

- master;
- music;
- sfx;
- ui.

Persist independent levels from 0.0 to 1.0:

- masterVolume;
- musicVolume;
- sfxVolume;
- uiVolume;
- muted;
- hapticsEnabled;
- reducedAudioIntensity.

Use the existing versioned persistence approach and add a safe migration. Existing
users must keep their current mute preference.

## Audio unlocking and lifecycle

- Create/resume AudioContext only from a real user gesture.
- First Play/Race button, tutorial interaction or explicit sound control may unlock it.
- Audio failure must never prevent the game from starting.
- Suspend or mute music when the app enters the background.
- Resume safely when the app returns, without starting the same loop twice.
- Respect Android audio focus and interruptions where the current Capacitor setup
  allows it.
- Do not autoplay audible music before user interaction.

## Adaptive music design

Build a MusicDirector prepared for synchronized looping stems:

public/audio/music/
  menu_base.ogg
  race_base.ogg
  race_speed.ogg
  final_sprint.ogg
  result_win.ogg
  result_lose.ogg

Also support a second fallback source per entry if needed for target-browser
compatibility.

All race stems must be sample-aligned and have identical loop length. Start them
on the same AudioContext clock and control them with gains; do not repeatedly stop
and restart tracks when speed changes.

Music states:

- menu: playful 95–105 BPM feel;
- charging: filtered/tension version of race bed;
- race_normal: race_base;
- race_fast: fade race_speed in according to normalized speed;
- final_sprint: bring final_sprint layer in, duck other layers slightly;
- finishing: duck music rapidly but smoothly;
- result_win/result_lose: play one short sting, then return to menu music.

Use short equal-power or smooth gain ramps. Avoid clicks and abrupt loop changes.

If final music files do not exist yet:

- implement the loader, manifest and state machine;
- log one development-only warning;
- continue silently without music;
- do not create fake empty binary files;
- do not block gameplay.

## Sound effects

Prepare the manifest for:

public/audio/sfx/
  ui_click.ogg
  ui_back.ogg
  charge_start.ogg
  charge_tick.ogg
  launch_weak.ogg
  launch_perfect.ogg
  launch_overcooked.ogg
  stroke_01.ogg
  stroke_02.ogg
  stroke_03.ogg
  boost_activate.ogg
  shield_activate.ogg
  collision_wall_01.ogg
  collision_wall_02.ogg
  collision_wbc.ogg
  collision_virus.ogg
  collision_membrane.ogg
  pickup_star_01.ogg
  pickup_star_02.ogg
  pickup_shield.ogg
  pickup_speed.ogg
  checkpoint.ogg
  final_sprint_start.ogg
  finish_impact.ogg
  finish_membrane_pop.ogg
  finish_suction.ogg
  finish_seal.ogg
  result_win.ogg
  result_lose.ogg

Support:

- deterministic or seeded variant selection where replay presentation needs it;
- small pitch variation, normally within ±3%;
- per-event cooldowns so repeated shake/stroke/collision sounds do not become noise;
- polyphony limits;
- no per-frame AudioNode leaks;
- music ducking during important finish and result sounds.

Do not generate final audio binaries in this task. Implement the production
pipeline and safe fallback. Preserve any existing procedural Web Audio sounds as
temporary fallbacks where they are useful, but move them behind SfxPlayer.

## Required sound direction

The finish sequence must sound:

finish_impact      = soft rubbery “boomp”
finish_membrane_pop = clean elastic “pop”
finish_suction     = fast airy “fwip”
finish_seal        = small soft “plup”
result_win         = short warm arcade chord

No egg rays sound, explosion, blood splash or gross wet effect.
The ovum remains visible while Champ breaks through the membrane and enters it.

## Haptics

Create HapticsManager with semantic methods/events rather than raw vibration calls.

Use short clear feedback:

- UI click: system click haptic where supported;
- perfect launch: two crisp pulses;
- wall/cell collision: one short impact;
- checkpoint: short double confirmation;
- finish impact: one short impact;
- finish suction/seal: a second lighter confirmation.

Avoid long buzzy vibration patterns. Respect hapticsEnabled and Reduced Motion /
reduced intensity settings. Use a Capacitor/native implementation when available
and a guarded navigator.vibrate fallback where appropriate.

## Settings UI

Extend Settings with:

- Master volume;
- Music volume;
- Sound effects volume;
- UI volume;
- Haptics on/off;
- Reduced audio intensity;
- Mute all.

Requirements:

- mobile-friendly sliders and switches;
- minimum 44 × 44 px targets;
- English and Slovenian localization;
- immediate preview sound when changing SFX/UI volume;
- no preview spam while dragging;
- settings persist across restarts.

## Integration

Replace existing direct playStroke/playHit/playPickup/playLaunch and vibration
calls with the typed system while preserving when each gameplay event occurs.

Do not change:

- controls;
- motion thresholds;
- speed or momentum;
- scoring;
- collisions;
- finish time;
- replay/challenge format;
- multiplayer authority;
- race distances.

The audio refactor must not change simulation behavior.

## Tests

Add tests for:

- settings migration and persistence;
- mute and individual bus gains;
- no duplicate music loop after resume;
- missing files do not block boot or Practice;
- event cooldown and polyphony limits;
- final-sprint music transition;
- finish event ordering:
  impact → membrane_pop → suction → seal → result;
- haptics disabled means no native/fallback call;
- background suspend and foreground resume;
- existing characterization tests remain unchanged.

Use test doubles for AudioContext, fetch/audio loading and haptics. Tests must not
require speakers or real audio files.

Run:

npm run verify

## Deliverables

When finished, report:

- files changed;
- event mapping from old calls to new events;
- tests added;
- verify result;
- exact list of still-missing final audio files;
- manual Android checks required.

Stop after the audio architecture, settings, event integration and tests are
complete. Do not invent or download copyrighted music.
```

