# Audio assets — status & decisions

_Last updated: 2026-07-31_

## Music: REMOVED again (SFX-only) — 2026-08-01

Owner removed the background music ("doesn't fit"). `public/audio/music/` is empty,
the Music slider is hidden, and the game runs SFX-only. The music system stays
wired and dormant — dropping a file back into `public/audio/music/` would play it
again — but there is intentionally no music. (History below kept for context.)

## (history) Music: one race track (owner-supplied), quiet background

**Update 2026-07-31 (later same day):** the owner added a race track they like —
`public/audio/music/race_base.mp3` ("Neon Turbo Dash", made with Suno) — used as
the in-game bed at a low background level (default `musicVolume` = 0.35, tunable
via the restored Music slider in Settings). It plays continuously through the
whole race (charging → race → sprint), ducks during the finish sequence, and
stops for the result. Menu currently has no music.

(Earlier the same day we had decided SFX-only; that is reversed for this one
track. The system supported both states with no code churn.)

### What this means for asset producers (incl. Codex)

- **Do NOT produce music.** The owner sources music themselves (Suno). Optional
  extra stems (`menu_base`, `race_speed`, `final_sprint`, `result_win`,
  `result_lose`) would enhance it but are NOT required — drop them into
  `public/audio/music/` (mp3/wav) and they play automatically.
- **Do NOT produce SFX** — they already exist (see below).

## Sound effects — DONE ✅

Original, royalty-free one-shot SFX are generated procedurally and committed under
`public/audio/sfx/*.wav` (29 files). They are produced by a deterministic,
dependency-free synth script:

```
node scripts/gen-sfx.mjs
```

Re-running the script reproduces byte-identical files. To tweak a sound, edit its
recipe in `scripts/gen-sfx.mjs` and re-run. Covered events: UI click/back, charge
start/tick, launches (weak/perfect/overcooked), strokes ×3, boost/shield,
collisions (wall ×2 / wbc / virus / membrane), pickups (star ×2 / shield / speed),
checkpoint, final-sprint start, the finish beats (impact → membrane pop → suction
→ seal) and win/lose stings. No gross/wet/anatomical sounds.

## System

The centralized audio/haptics system lives in `src/audio/` (see the audio-haptics
handoff). Gameplay only emits typed events; the manager plays SFX + haptics and
would drive music if any stems existed. Music being absent is a supported,
first-class state — not a missing dependency.
