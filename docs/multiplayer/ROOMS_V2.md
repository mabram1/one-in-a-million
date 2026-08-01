# Multiplayer Rooms v2

## Product flows

### Private Challenge

1. The host opens **Challenge**, then creates a private room.
2. The game creates a short room code and a URL containing `#room=CODE`.
3. The host shares the link or code.
4. Opening the link joins that exact room automatically.
5. The lobby shows a live roster. Only the host chooses the distance and starts.
6. START broadcasts one seed, distance and absolute `startAt` timestamp.
7. Every client converts `startAt` to its local performance clock and renders the same 3-2-1.

The older asynchronous ghost challenge remains available from the results screen.

### Public Matchmaking

- The client derives a shared public-room code from the next full UTC minute.
- Anyone entering during the waiting window joins that room.
- The UI shows the roster, `n / 10`, and an automatic countdown.
- At the minute boundary every client starts the same 600 m track using a deterministic room seed.
- No host is required, so a host disconnect cannot strand the lobby.

## Security and configuration

- `VITE_SUPABASE_ANON_KEY` is injected at build time. Never commit an anon or service-role key literal.
- `VITE_PUBLIC_APP_URL` must point to the public web build used in private-room invitations. This prevents an Android/Capacitor build from sharing its device-local `localhost` URL.
- Realtime Presence is used for lobby display and is advisory, not authoritative.
- Race state is still client-reported. Existing plausibility checks reject impossible finish times, but competitive prizes require server authority.

## Hard 10-player capacity (server follow-up)

The UI and client protocol use `MAX_ROOM_PLAYERS = 10`. A malicious or racing client can still subscribe directly to a Realtime channel. For a strict capacity limit, add a Supabase `join_room` RPC or Edge Function that atomically:

1. locks the room row;
2. removes expired memberships;
3. rejects entry when active membership count is 10;
4. inserts a membership tied to `auth.uid()` and a short lease;
5. returns a signed/admitted room token or membership ID.

Recommended tables:

```sql
rooms(id text primary key, kind text, starts_at timestamptz, max_players int, seed bigint, status text)
room_members(room_id text, user_id uuid, joined_at timestamptz, lease_until timestamptz,
             primary key(room_id, user_id))
```

RLS must allow players to read their room and update only their own membership. The service-role key must never be shipped to the game.
