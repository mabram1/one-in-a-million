# Build & Deploy

## Local

```bash
npm install      # once
npm run dev      # Vite dev server at http://localhost:5173
npm run test     # characterization tests (protected behavior)
npm run typecheck
npm run build    # → www/ (index.html + assets/, plus copied public/)
npm run verify   # typecheck + test + build (use before committing)
```

## Source of truth

- `src/game/legacy/game.ts` — the game (being split into typed modules incrementally).
- `src/game/config/tuning.ts` — **all** tuned gameplay constants. Protected; changing a
  value needs owner approval + a `tuningVersion` bump + updated tests.
- `src/styles/game.css` — styles.
- `index.html` — Vite entry (DOM only).
- `public/` — `manifest.webmanifest`, `sw.js`, `icon.svg` (copied verbatim into `www/`).

`www/` is **build output**. It is committed so GitHub Pages (branch deploy) keeps serving
the current site; do not hand-edit it.

## Targets

| Target | How it gets `www/` | Notes |
|---|---|---|
| **GitHub Pages** | serves committed `www/` at `…/one-in-a-million/www/` | canonical URL unchanged |
| **Vercel** | runs `npm run build` (`vercel.json`) | serves `www/` at the domain root |
| **Android (Capacitor)** | CI runs `npm run build` then `cap sync` | `webDir: "www"` |
| **PWA** | `manifest.webmanifest` + `sw.js` shipped in `www/` | network-first SW |

## CI

- `.github/workflows/ci.yml` — typecheck + tests + build on every push/PR. Test failure =
  protected gameplay changed.
- `.github/workflows/android.yml` — builds the web bundle, then the debug APK.

## Rollback

```bash
git checkout pre-vite-baseline   # restores the exact pre-migration build
```
Or open `legacy/www-index-0088469.html`.
