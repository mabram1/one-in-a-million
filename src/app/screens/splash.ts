/**
 * Splash / intro — a short branded opener shown on load.
 *
 * Pure CSS/DOM (no art dependency beyond the existing wordmark SVG): the wordmark
 * scales in, Champ dashes toward a glowing ovum, then it fades to the menu. Taps
 * skip it; it never blocks boot (the game loads underneath). It also conveniently
 * masks the hub's first-frame pop-in. Respects Reduced Motion.
 */
const B = ((import.meta as any).env?.BASE_URL as string) || './';

function reducedMotion(): boolean {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}
function locale(): 'sl' | 'en' { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; } }
const TAGLINE = { en: 'Swim your way to the top', sl: 'Zaplavaj do vrha' };

/** Show the splash. Resolves (and calls onDone) once it has faded away. */
export function showSplash(opts: { durationMs?: number; onDone?: () => void } = {}): void {
  // Never show twice (e.g. HMR / double-invoke).
  if (document.querySelector('.splash-overlay')) return;
  const reduced = reducedMotion();
  const dur = opts.durationMs ?? (reduced ? 700 : 1750);

  const root = document.createElement('div');
  root.className = 'splash-overlay' + (reduced ? ' reduced' : '');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', 'One in a Million');
  root.innerHTML = `
    <div class="splash-stage">
      <div class="splash-egg"></div>
      <div class="splash-champ"><span class="sc-body"></span><span class="sc-tail"></span></div>
      <img class="splash-word" src="${B}art/menu/menu-wordmark.svg" alt="">
      <div class="splash-tag">${TAGLINE[locale()]}</div>
    </div>`;

  let done = false;
  const finish = () => {
    if (done) return; done = true;
    root.classList.add('out');
    setTimeout(() => { root.remove(); opts.onDone?.(); }, 340);
  };
  root.addEventListener('pointerdown', finish);
  document.body.appendChild(root);
  setTimeout(finish, dur);
}
