# Audio assets — status & decisions

_Last updated: 2026-07-31_

## Decision: NO background music (SFX-only)

**The game ships with sound effects only. No background music is needed.**
(Owner decision, 2026-07-31.)

Rationale: the SFX carry the feel; the game is a short-session, motion-controlled
mobile game where music is often muted anyway, and the owner did not want a
generic/AI-generated music bed.

### What this means for asset producers (incl. Codex)

- **Do NOT produce music.** No `menu_base`, `race_base`, `race_speed`,
  `final_sprint`, `result_win`, `result_lose` music tracks are required.
- **Do NOT produce SFX either** — they already exist (see below).
- The audio system runs perfectly with no music files: the music bus stays wired
  and dormant, so if we ever change our mind, dropping stems into
  `public/audio/music/` is all that's needed. Nothing is blocked.

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
