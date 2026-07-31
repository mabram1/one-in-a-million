# Audio scope decision — SFX only

Status: final product decision  
Date: 2026-07-31

## Decision

**One in a Million ships without background music.**

Do not create, request, download or integrate:

- menu music;
- race music;
- speed/boost music layers;
- Final Sprint music;
- win/lose result music tracks;
- adaptive music stems;
- a `MusicDirector`.

Silence between gameplay effects is intentional and is part of the product's sound
identity. The audio system supporting an empty music catalog is normal behavior,
not a missing-content error.

## Existing audio assets

The complete required SFX set already exists:

```text
public/audio/sfx/        29 original procedural WAV files
scripts/gen-sfx.mjs     deterministic source generator
```

These assets include UI, launch, stroke, collisions, pickups, checkpoint, Final
Sprint, finish-entry sequence and result stings.

Do not regenerate, replace, recompress or redesign them unless the owner explicitly
requests a specific revision.

## Instructions for Claude Code

```text
Audio scope is already complete and is SFX-only.

- Do not add background music.
- Do not add menu, race, sprint or result music.
- Do not build a MusicDirector or adaptive music layer system.
- Do not generate or download audio files.
- Keep the existing 29 procedural WAV files under public/audio/sfx/.
- Keep scripts/gen-sfx.mjs as their deterministic source.
- Treat an empty music catalog as intentional and non-blocking.
- Only touch audio code when required to connect an existing SFX event to a visual
  or gameplay animation explicitly requested by the owner.
- Preserve mute, SFX volume, haptics, mobile audio unlocking and lifecycle behavior.

Current work must focus on visual assets and their integration.
```

