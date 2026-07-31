import './styles/game.css';
import './styles/main-hub.css';
import { bootGame } from './game/legacy/game';
import { loadArt } from './game/assets/store';
import { maybeShowHowToPlay } from './app/screens/howToPlay';
import { hubV2Enabled, show as showHub } from './app/screens/mainHub';
import { openSettings } from './app/screens/settings';
import { wireAudioLifecycle } from './audio';

/**
 * Optional live-multiplayer transports, loaded from a CDN at runtime.
 *
 * These are deliberately NOT awaited before boot: the game must start instantly
 * and offline. It only looks for `window.__supa` / `window.__trystero` when the
 * player actually opens a live race. This preserves the load order of the
 * pre-migration build, where the game script ran before the transport module.
 */
const loadExternal = (url: string) => import(/* @vite-ignore */ url);

void (async () => {
  try {
    const m: any = await loadExternal('https://esm.sh/trystero@0.20.0/nostr');
    (window as any).__trystero = { joinRoom: m.joinRoom };
  } catch {
    /* P2P fallback unavailable — live race falls back to Supabase or is disabled */
  }
  try {
    const s: any = await loadExternal('https://esm.sh/@supabase/supabase-js@2');
    (window as any).__supa = { createClient: s.createClient };
  } catch {
    /* Supabase transport unavailable — surfaced to the player on demand */
  }
})();

bootGame();

// Audio/haptics: suspend music in the background, resume on return (web + native).
wireAudioLifecycle();

// Load the Spermy art rig in the background. The game renders its procedural
// fallback until this resolves, then swaps to sprites — no boot blocking.
void loadArt();

// How to Play: replay from the menu link, and show once on first run. Finishing on
// the last card ("Let's swim!") starts a safe Practice run.
const startPractice = () => { (document.getElementById('practicePlay') as HTMLElement | null)?.click(); };
// Settings (hosts Replay Tutorial, menu style, server settings) — replaces the
// standalone How-to and beta buttons.
(document.getElementById('settingsLink') as HTMLElement | null)?.addEventListener('click', () => openSettings(startPractice));
// How to Play auto-shows exactly once on first run.
maybeShowHowToPlay(startPractice);

// Landing: the Main Hub is the default product UI (production Phase A). The classic
// menu stays as a debug fallback via ?hub=classic. (The hub is a fixed overlay now,
// so it renders correctly instead of falling below the fold.)
void hubV2Enabled;
if (new URLSearchParams(location.search).get('hub') !== 'classic') showHub();

// PWA service worker (parity with the pre-migration build). Registered relative to
// the deploy base so it works on GitHub Pages subpaths, Vercel root, and Capacitor.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    // updateViaCache:'none' → the browser always revalidates sw.js itself, so a new
    // SW (which skipWaiting()s + claims + drops old caches) takes over on first load
    // instead of after a manual reload.
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' }).catch(() => {
      /* offline SW unavailable — game still runs online */
    });
  });
}

