# One in a Million — handoff for Codex (2026-08-03)

## TL;DR — status

**The game is LIVE on Vercel at https://oneinamillion.skilliyo.com** (custom domain +
SSL, auto-deploy on push to `main`). Guest play, Google + email sign-in, and
server-authoritative multiplayer are all wired. 145 tests pass; typecheck + build
clean. Web launch has **no remaining blockers**.

Repo: `mabram1/one-in-a-million` (git root = the app root; `src/`, `www/`,
`vercel.json`, `supabase/` all at top). Stack: TS + Vite (`base:'./'`, `outDir:www`) +
Canvas2D + Capacitor. Supabase for auth + realtime rooms.

## What shipped in the last few days (newest first)

- **`419c4c0` feat(mp): server-authoritative rooms + final standings**
  - Wired the `supabase/migrations/0001_rooms.sql` RPCs into the Supabase transport
    in `src/game/legacy/game.ts` via a new **best-effort** `roomRpc(fn,args)` helper
    (returns `null` on any error → realtime presence keeps driving the UI):
    - `join_room` on channel `SUBSCRIBED` → authoritative 10-player cap + start-lock;
      a `full`/`started` result toasts and bounces the player to the hub.
    - `touch_room_member` 8 s heartbeat (`MP._touchT`), cleared in `leaveLobby`.
    - `start_room` fire-and-forget in the host START handler (never delays the host's
      own start; just marks the room `started` so late `join_room`s are rejected).
    - `leave_room` best-effort in `leaveLobby` (client captured before teardown).
  - **Multiplayer final standings** on the results screen: new `mpStandings()` (self +
    peers ranked by validated finish time, then distance) rendered into `#endStats`
    when `MP.active`; peer names sanitized (`[<>&]` stripped, 16-char cap). New CSS
    `.mp-standing`/`.mp-standings-head`/`.mp-dot` in `src/styles/game.css`.
  - Tests: +2 standings characterization tests in `tests/characterization/rooms.test.ts`
    (`mpStandings` exposed on the handle + harness).

- **`d760e17` fix(hub): Customize "back" returns to the Main Hub, not the legacy menu**
  - `closeCustomize()` used to `#start.classList.remove('hidden')`, exposing the old
    legacy menu (small `.picon` icons). It now re-opens the Main Hub (`showHub()`);
    only `?hub=classic` falls back to `#start`.

- **`d7e033b` fix(hub): hide race canvas in menu (HUD bleed-through)**
  - `#c` (the Canvas2D race canvas) rendered every frame regardless of state, so in
    the menu (`G.state==='start'`) the game world + HUD (side rail, ovum, action
    buttons, "CHARGE…" prompt) bled through the **translucent** hub/customize overlays.
    `loop()` now hides `#c` (visibility) and skips the world render in `'start'`; the
    hub keeps its own `.main-hub__world-canvas` backdrop.

- **`ed20c6c` / `f191eac` Go-live prep (Vercel)**
  - `vercel.json` (build → `www`, cleanUrls, security headers). `docs/deploy/VERCEL_SETUP.md`
    runbook. `.env.example` default `VITE_PUBLIC_APP_URL=https://oneinamillion.skilliyo.com`.
    `.gitignore`: exclude local `.claude/` + raw `art-deliveries/`. Vercel Root Directory =
    repo root (NOT a subfolder).

- **`8c6e1b3` Integrate Codex Rooms v2** — private invite codes (`#room=CODE`), scheduled
  public rooms (per-minute `publicRoomCode`), shared `roomSeed`, host authority,
  guest/linked gating; fixed the auth-gate empty-anon-key regression.

- Earlier the same window: removed in-game music (SFX-only), moved the Supabase anon
  key to an env var (public/RLS-safe), gentle steering while shaking (tuning 1.7.0),
  hub layout cleanup (fixed the "two menus"/unclickable bug), "My Face", splash screen.

## Infra done by the owner (dashboards)

Vercel project (auto-deploy on push; Deployment Protection disabled so the public site
isn't behind a Vercel login); env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` /
`VITE_PUBLIC_APP_URL`; domain + DNS CNAME; Supabase Auth URL config
(`https://oneinamillion.skilliyo.com/**`); Google OAuth client
(origin + `.../auth/v1/callback` redirect) with the provider enabled in Supabase; email
provider on; **`0001_rooms.sql` migration applied**.

## Architecture notes Codex should know

- **`src/game/legacy/game.ts`** is a `@ts-nocheck` IIFE monolith (~1900 lines) returning
  a test/diagnostic handle `{ G, MP, tuning, ... }`. All gameplay + multiplayer lives here.
- **`MP`** object (`:~294`): `{ active, transport('supabase'|'p2p'), client, ch, id, code,
  name, kind, isHost, peers, finishes, send, sendGo, started, _lobbyT, _touchT, ... }`.
  Realtime presence is advisory; the RPCs are the authority now.
- MP distances are **400/600/800 m** (match the migration's `distance_m` CHECK). Practice
  distances (750/1000/1250) are separate.
- The **Main Hub** (`src/app/screens/mainHub.ts`) is the default shell (main.ts shows it
  unless `?hub=classic`); the legacy `#start` menu should never appear in the hub flow.
- Characterization tests boot the real loop over jsdom with a fake clock
  (`tests/setup/harness.ts`). `tuningVersion` guards replay/challenge compat.

## Open / candidate tasks for Codex

Owner-only (manual, not code): final Google + email sign-in click-through; a real 2-device
multiplayer run (verify invite link, lobby, START, and the new standings table); mark the
GitGuardian incident resolved.

Code work available:
1. **Custom SMTP** for Supabase email (default sender has a low quota → magic-link may not
   deliver at scale). Wire via Supabase → Auth → Emails → SMTP; document in
   `docs/auth/SUPABASE_AUTH_SETUP.md`.
2. **Schedule `sweep_rooms()`** (pg_cron or a cron Edge Function, every minute) — the
   function exists in the migration but nothing calls it.
3. **Per-player "ready" toggle** in private lobbies (currently host-starts-when-ready +
   a "Waiting for host…" indicator for guests).
4. **Android APK**: rebuild/verify against the live domain (`VITE_PUBLIC_APP_URL`).
5. Longstanding: **iPhone motion sensor** ("allow motion" prompt / tilt on iOS) needs a
   real-device pass.

## Constraints

- Do **not** commit real secrets. The Supabase **anon** key is public/RLS-safe; the
  **service_role** key must never touch the client/Vercel env.
- Never call the room RPCs with a service-role key in the browser — anon + RLS + SECURITY
  DEFINER is the design.
- Keep changes tested: `npm run typecheck && npm test && npm run build` before pushing.
