# One in a Million — Android test build

This folder is a ready-to-upload GitHub repo that turns the *One in a Million* web prototype
into an installable **Android APK** (built automatically in the cloud) and an installable **PWA**.

You do **not** need Android Studio, Node, or any tools on your computer — GitHub builds the APK for you.

---

## What's here

```
index.html                     redirect to www/ (for the Pages link)
www/                           the actual game
  index.html
  manifest.webmanifest         makes it installable as an app
  sw.js                        offline support
  icon.svg                     app icon
package.json                   Capacitor dependencies
capacitor.config.json          app id / name
.github/workflows/android.yml  builds the APK in the cloud
```

---

## Option A — Get the installable APK (what you asked for)

### 1. Make a GitHub account
If you don't have one: go to <https://github.com> → **Sign up** (free).

### 2. Create a new repository
- Click **+** (top right) → **New repository**.
- Name it e.g. `one-in-a-million`.
- Set it **Public** (needed for free Actions minutes and Pages).
- **Create repository**.

### 3. Upload these files
On the empty repo page → **uploading an existing file** → drag in **everything inside this
`android-app` folder** (including the `www` folder and the hidden `.github` folder).
> Tip: if drag-and-drop skips the `.github` folder, upload the rest first, then create the file
> `.github/workflows/android.yml` manually via **Add file → Create new file** and paste its contents.
- Commit to the **main** branch.

### 4. Let it build
- Go to the **Actions** tab. A run called **Build Android APK** starts automatically (takes ~3–6 min).
- When it finishes (green ✓), the APK is in two places:
  - **Releases** (right sidebar) → **Latest debug build** → download **app-debug.apk** ← easiest on your phone
  - or the **Actions run → Artifacts → one-in-a-million-debug-apk**

### 5. Install on your Android phone
- Open the **Releases** page on your phone and download **app-debug.apk**.
- Tap it → Android will ask to **allow installing unknown apps** → allow → **Install**.
- Open **One in a Million** and shake away. Tilt + shake work in the app. 🎮

---

## Option B — Instant test as a PWA (no APK, ~1 minute)

1. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch: `main` / `/ (root)` → Save**.
2. Wait ~1 min, then open the given link on your **Android phone in Chrome**
   (it will land on the game via the redirect).
3. Chrome menu (⋮) → **Add to Home screen / Install app**.
4. Launch it from your home screen — runs fullscreen, tilt + shake work (Android, over HTTPS).

---

## Notes
- The bottom of the screen shows a small **motion status line** (secure / embed / perm / events)
  so you can confirm the sensor is live. Once everything's good we'll remove it.
- The APK is a **debug** build (unsigned) — perfect for testing, not for the Play Store yet.
- App id: `ch.websamurai.oneinamillion` (change in `capacitor.config.json` if you like).
- If the first Actions build fails, open the failed step's log and send it over — usually a
  one-line version tweak.
