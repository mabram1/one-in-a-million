/**
 * Public Supabase endpoint + anon key.
 *
 * The anon key is PUBLIC by design (Supabase clients ship it; access is guarded by
 * Row Level Security — it is NOT the service_role key). Even so, we source it from
 * a build-time env var so the literal isn't committed to the repo (keeps secret
 * scanners quiet and allows rotation without a code change).
 *
 * Set `VITE_SUPABASE_ANON_KEY` (and optionally `VITE_SUPABASE_URL`):
 *   - locally via a gitignored `.env.local` (see `.env.example`)
 *   - in CI/deploy via a GitHub Actions repo VARIABLE (not a secret — it's public).
 *
 * If unset, cloud features (live multiplayer via Supabase, Google/email auth) are
 * inactive and fall back gracefully (P2P multiplayer, guest play); the in-app
 * "Server settings" (localStorage `oiam_supa`) can still supply url+key at runtime.
 */
const env = (import.meta as any).env || {};

/** Public project URL (not a secret — appears in every request). */
export const SUPABASE_URL: string = env.VITE_SUPABASE_URL || 'https://tsddumsxoclcjguczezr.supabase.co';

/** Public anon key, injected at build time. Empty when not configured. */
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = (): boolean => !!SUPABASE_ANON_KEY;
