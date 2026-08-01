# Go live on Vercel + custom domain

The code is Vercel-ready: `vercel.json` builds the Vite app to `www/`, `base:'./'`
works at a root domain, and all URLs/keys are env-driven. The steps below are
**dashboard actions the owner must do** (Vercel / DNS / Supabase) — code needs no
further change.

> ⚠️ Confirm the exact domain first. This doc uses **`oneinamillion.skilliyo.com`**
> (from project notes). If the real domain differs, use that everywhere below.

## 1. Create the Vercel project

Vercel → **Add New → Project → Import** `mabram1/one-in-a-million`.

- **Root Directory: `android-app`**  ← critical: the Vite app lives in `android-app/`,
  not the repo root. Set this in the import screen (Edit → Root Directory).
- Framework preset: **Other** (vercel.json already sets build + output).
- Build command: `npm run build` (from vercel.json)
- Output directory: `www` (from vercel.json)

## 2. Environment variables (Vercel → Settings → Environment Variables)

Add for **Production** (and Preview if you want previews to work):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://tsddumsxoclcjguczezr.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the Supabase anon key (public) |
| `VITE_PUBLIC_APP_URL` | `https://oneinamillion.skilliyo.com` |

(These mirror the GitHub Actions **Variables**; setting them here makes Vercel the
source of truth. `VITE_PUBLIC_APP_URL` has **no `/www`** on Vercel — the site is
served at the domain root, unlike the Pages `/one-in-a-million/www` subpath.)

Redeploy after adding env vars so they're baked into the build.

## 3. Domain + DNS

Vercel → **Settings → Domains → Add** `oneinamillion.skilliyo.com`.

At **skilliyo.com's DNS** (wherever that zone is managed) add the record Vercel
shows — normally:

```
CNAME   oneinamillion   →   cname.vercel-dns.com
```

(or the A record Vercel gives if a CNAME isn't allowed). Vercel issues the TLS
cert automatically once DNS resolves.

## 4. Supabase (Auth → URL Configuration)

- **Site URL:** `https://oneinamillion.skilliyo.com`
- **Redirect URLs — add:**
  - `https://oneinamillion.skilliyo.com/**`
  - keep the dev + Pages URLs if you still use them
- **Google OAuth** (Google Cloud console): add authorized JavaScript origin
  `https://oneinamillion.skilliyo.com` (the callback URI stays the Supabase
  `/auth/v1/callback`). See `docs/auth/SUPABASE_AUTH_SETUP.md`.

## 5. Apply the rooms migration (for authoritative multiplayer)

Run `supabase/migrations/0001_rooms.sql` in the Supabase SQL editor (or
`supabase db push`). See `docs/multiplayer/ROOMS_SERVER_AUTHORITY.md`.

## 6. Verify live

- Open `https://oneinamillion.skilliyo.com` — splash → account gate → hub.
- Guest play works offline; Google/email sign-in works (needs the env vars +
  Supabase URLs above).
- Create a private room → **SHARE LINK** produces an `oneinamillion.skilliyo.com/#room=…`
  link (not localhost, not the Pages URL).
- No console errors; SFX play (no music by design).

## Notes

- **GitHub Pages** can stay as a mirror or be retired — Vercel becomes primary.
  The `pages.yml`/`android.yml` builds still work; the APK (`android.yml`) is
  unaffected by the web host.
- The Android APK's `VITE_PUBLIC_APP_URL` should also point to the live domain so
  in-app share links open the right web app (set the GitHub Actions Variable).
- Never put the Supabase **service_role** key anywhere in the client/Vercel client
  env. Only the anon key.
