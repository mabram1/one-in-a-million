# Authoritative rooms — server allocator (handoff)

Rooms v2 currently caps players **client-side** (Realtime Presence is advisory).
This document + `supabase/migrations/0001_rooms.sql` add a **server-authoritative**
capacity + start-lock so the 10-player limit and "has the race started" can't be
faked by a client. It is **not applied automatically** — the owner applies it.

## Apply the migration

Either paste `supabase/migrations/0001_rooms.sql` into the Supabase **SQL editor**
and run it, or with the CLI:

```bash
supabase db push        # or: supabase migration up
```

It creates `rooms` + `room_members`, RLS (reads allowed for Realtime, writes only
via RPCs), and the RPCs below. Optionally schedule `select public.sweep_rooms();`
every minute via **pg_cron** or a cron Edge Function.

## RPC contract

| RPC | Args | Returns | Notes |
|-----|------|---------|-------|
| `join_room` | `p_code, p_player_id, p_kind, p_display_name?, p_distance_m?, p_seed?, p_host_id?` | `{ok, reason?, room, members}` | Atomic under a row lock. Creates the room on first join, purges members with no heartbeat >30s, rejects `full` (11th) and `started`. |
| `touch_room_member` | `p_code, p_player_id` | void | Heartbeat every ~5–10 s. |
| `start_room` | `p_code, p_player_id, p_start_at` | `{ok, reason?, start_at, seed}` | Private: host only. Public: any joined member. Idempotent (returns `already` if started). Rejects `empty`. |
| `leave_room` | `p_code, p_player_id` | void | On leaving the lobby. |
| `sweep_rooms` | — | void | Trusted scheduler only; not granted to clients. |

`reason` ∈ `bad_request | not_found | started | full | not_host | empty`.

## Client integration (sketch)

The client already has the transport (`startLiveSupabase`) and a `supabase()`
client with the anon key. Wire the RPCs alongside the existing Realtime channel:

```ts
const { data } = await client.rpc('join_room', {
  p_code: code, p_player_id: MP.id, p_kind: MP.kind,
  p_display_name: MP.name, p_distance_m: mpM, p_seed: roomSeed(code),
  p_host_id: MP.isHost ? MP.id : null,
});
if (!data?.ok) {
  if (data?.reason === 'full')    /* -> "Room full", route public joiners to next window */;
  if (data?.reason === 'started') /* -> "Race already started", offer the next room */;
  return;
}
// use data.room.seed / data.room.start_at as the authoritative track + start clock.
```

- Keep Realtime Presence for **live positions**; use the RPC result for **membership,
  capacity, seed and start_at** (authoritative).
- Heartbeat with `touch_room_member` on the existing lobby interval.
- Host START calls `start_room`; everyone reads `rooms.status='started'` +
  `start_at` (via the RPC return or a Realtime row update) and begins together.
- Finish authority (fastest valid time) stays as the existing `mpPlacement()` /
  `ingestPeerState()` anti-cheat — the DB governs the room, not per-frame timing.

## Countdown target — one definition

For public rooms the one-minute boundary is the **authoritative gameplay start**
(`start_at`). Timeline:

```
[minute window opens] --- lobby fills --- [lock ~T-3s] --- 3·2·1 briefing --- [start_at = minute boundary] GO
```

- **Lobby lock:** ~3 s before `start_at`; `join_room` returns `started` after that
  (late joiners are routed to the NEXT window's code via `publicRoomCode(next)`).
- **Countdown start:** at lock; the READY→3→2→1→GO briefing runs to `start_at`.
- **Gameplay start:** `start_at` — the same performance-clock instant on every
  client (`beginPlay(startAt)` converts it locally).

Use this single definition in code + UI ("Next race starts in …" counts down to
`start_at`).

## Client wiring — DONE (game.ts)

The RPCs are now called best-effort from the Supabase transport (realtime presence
still drives the live UI; only a hard rejection changes behaviour):

- **`join_room`** — on channel `SUBSCRIBED` (`startLiveSupabase`). A `full`/`started`
  result toasts and bounces the player back to the hub. This is now the authoritative
  10-player cap (the old `updateLobby` cap is advisory only).
- **`touch_room_member`** — 8 s heartbeat (`MP._touchT`), cleared in `leaveLobby`.
- **`start_room`** — fire-and-forget in the host START handler; marks the room
  `started` so late `join_room` calls are rejected. Never blocks the host's own start.
- **`leave_room`** — best-effort in `leaveLobby` (client captured before teardown).

All calls go through the `roomRpc(fn, args)` helper, which returns `null` on any
error so the game keeps working when the RPC/migration is unavailable.

## Notes

- Never call these with a service-role key in the browser — anon + RLS + SECURITY
  DEFINER is the whole point.
- Public rooms auto-start via the per-minute countdown (they don't call `start_room`);
  they rotate by `publicRoomCode` each minute, and `sweep_rooms` reaps stale rows.
