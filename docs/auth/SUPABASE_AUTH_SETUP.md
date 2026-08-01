# Supabase Auth setup — "One in a Million"

The first-run account gate (`src/app/screens/authGate.ts`) uses the existing
Supabase project. The **code cannot enable providers or set redirect URLs** — that
is dashboard configuration. This document lists everything an admin must do.

- Project: `tsddumsxoclcjguczezr` (`https://tsddumsxoclcjguczezr.supabase.co`)
- Client uses the **anon (public) key only** — safe to ship in the app. **Never put
  the `service_role` key in client code or this repo.**
- Client options already set: `persistSession`, `autoRefreshToken`,
  `detectSessionInUrl` (the redirected session is processed on launch).

## 1. Enable the Google provider

Dashboard → **Authentication → Providers → Google**:

1. Toggle **Enabled**.
2. Create an OAuth client in the **Google Cloud Console**
   (APIs & Services → Credentials → OAuth client ID → *Web application*).
3. Paste the **Client ID** and **Client secret** into Supabase.
4. In the Google client, set the **Authorized redirect URI** to Supabase's callback:
   `https://tsddumsxoclcjguczezr.supabase.co/auth/v1/callback`
5. Add the **Authorized JavaScript origins** for each surface below.

## 2. Site URL + Redirect URLs

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: the primary production URL — `https://mabram1.github.io/one-in-a-million/`
  (or the Vercel domain once live: `https://oneinamillion.skilliyo.com`).
- **Redirect URLs** (allow-list — add every surface; the client redirects back to
  `location.href` minus the hash):
  - `http://localhost:5173/*` and the other dev ports (`5174`–`5181/*`)
  - `https://mabram1.github.io/one-in-a-million/*`  (GitHub Pages)
  - `https://oneinamillion.skilliyo.com/*`          (Vercel, when live)
  - `https://*.vercel.app/*`                          (Vercel previews, optional)
  - **Android / Capacitor deep link**: the app's custom scheme, e.g.
    `ch.websamurai.oneinamillion://auth-callback` (must match `capacitor.config`
    `appId`/scheme; add an `appUrlOpen` handler on native to feed the URL back to
    Supabase). Web/PWA works without this; only the installed APK needs it.

Google OAuth and the email magic link both redirect to these URLs, so any URL not
on the allow-list will fail with a redirect error.

## 3. Email magic-link (OTP)

Dashboard → **Authentication → Email Templates → Magic Link**:

- Confirm the **Magic Link** template is enabled and its action URL uses
  `{{ .ConfirmationURL }}` (default is fine).
- Under **Providers → Email**, keep **Enable Email provider** on and
  **Confirm email** as desired. For dev, Supabase's built-in mailer is rate-limited
  — configure a real **SMTP** provider for production sending.
- The client calls `signInWithOtp({ email, emailRedirectTo })`; no password flow.

## 4. Guest ↔ authenticated reconciliation

The game is **guest-first**: a Guest profile is created locally on first run and
progress lives in `localStorage` (`oiam_state_v1`) + IndexedDB (My Face).

- Choosing **Play as Guest** sets `oiam_entry_choice=guest` and never contacts the
  server — Guest play works fully offline.
- On a later sign-in, `authGate.adoptSession()` calls
  `ProfileStore.linkAccount(user.id, name)`, which **mutates the existing local
  profile in place** — it keeps wallet (coins/gems), XP/level, owned + equipped
  cosmetics, records and the My Face overlay, and only swaps `id`,
  `accountType='linked'` and `displayName`. A progressed guest is **never replaced
  by an empty linked profile**.
- **Server-side reconciliation (future, when cloud saves are added):** on first
  link, treat the local profile as the source of truth and upload it; if a row for
  that `user.id` already exists on another device, merge by taking the MAX of each
  currency/XP/record and the UNION of owned cosmetics, then write back. Do this in
  a Postgres RLS-protected table keyed by `auth.uid()`. Not required for the
  current local-only build.

## 5. My Face privacy

- The **original photo is never uploaded**. Only a processed 512×768 overlay is
  stored locally (IndexedDB). Any future cloud sync of the overlay must be an
  explicit opt-in into a private, RLS-protected bucket with a deletion flow.

## Checklist (dashboard work still required)

- [ ] Google provider enabled with Client ID + secret
- [ ] Google authorized redirect URI = Supabase `/auth/v1/callback`
- [ ] Site URL set
- [ ] Redirect URLs allow-listed (localhost, Pages, Vercel, Android scheme)
- [ ] Magic-link email template enabled (+ production SMTP)
- [ ] (Native only) Capacitor deep-link handler wired for the OAuth return
- [ ] `service_role` key kept server-side only — never in the client
