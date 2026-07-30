/**
 * Main Hub v2 (behind the `mainHubV2` flag).
 *
 * A DOM/CSS home screen with an animated decorative live-track canvas, wired to the
 * Phase 4 profile (level / coins / gems) and to the existing game actions. Ships
 * OFF by default; the classic menu keeps working. Enable with `?hub=v2`, the beta
 * toggle on the classic menu, or localStorage `oiam_hub_v2=1`.
 */
import en from '../config/data/hub.en.json';
import sl from '../config/data/hub.sl.json';
import { getProfileStore } from '../profileStore';
import { levelInfo } from '../domain/progression';
import { LiveTrackRenderer } from '../hub/LiveTrackRenderer';
import type { PracticeDistance } from '../hub/types';
import { openSettings } from './settings';

const FLAG_KEY = 'oiam_hub_v2';
const DIST_KEY = 'oiam_practice_dist';
const B = (import.meta as any).env?.BASE_URL || './';
const art = (p: string) => `${B}art/${p}`;
const world = (p: string) => `${B}art/menu_world/${p}`;
const icon = (id: string) => `${B}art/menu/menu-icons.svg#icon-${id}`;
/** A kit SVG component as a stretched background (premium chrome frame). */
const frame = (n: string) => `url(${B}art/menu/components/${n}.svg) center / 100% 100% no-repeat`;

type Copy = typeof en;
function copy(): Copy { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? (sl as Copy) : en; } catch { return en; } }

export function hubV2Enabled(): boolean {
  try {
    const u = new URLSearchParams(location.search).get('hub');
    if (u === 'v2') { localStorage.setItem(FLAG_KEY, '1'); return true; }
    if (u === 'classic') { localStorage.setItem(FLAG_KEY, '0'); return false; }
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch { return false; }
}
export function setHubV2(on: boolean): void { try { localStorage.setItem(FLAG_KEY, on ? '1' : '0'); } catch { /* */ } }

function getDistance(): PracticeDistance {
  try { const d = Number(localStorage.getItem(DIST_KEY)); if (d === 750 || d === 1000 || d === 1250) return d; } catch { /* */ }
  return 1000;
}
function setDistance(d: PracticeDistance): void { try { localStorage.setItem(DIST_KEY, String(d)); } catch { /* */ } }

const fmt = (n: number) => n.toLocaleString('en-US');
const $ = (id: string) => document.getElementById(id);
function click(id: string): void { ($(id) as HTMLElement | null)?.click(); }

let root: HTMLElement | null = null;
let renderer: LiveTrackRenderer | null = null;

/** Route into a Practice race at the given distance via the existing menu controls. */
function raceNow(dist: PracticeDistance): void {
  const chip = document.querySelector(`#distChips .chip[data-m="${dist}"]`) as HTMLElement | null;
  chip?.click();
  hide();
  click('practicePlay');
}

function bindProfile(): void {
  if (!root) return;
  const p = getProfileStore().profile;
  const info = levelInfo(p.xp);
  const c = copy();
  (root.querySelector('.main-hub__name') as HTMLElement).textContent = p.displayName || c.guest;
  (root.querySelector('.main-hub__lvl-badge') as HTMLElement).textContent = String(info.displayLevel);
  const pct = info.xpForNext > 0 ? Math.min(100, (info.xpIntoLevel / info.xpForNext) * 100) : 0;
  (root.querySelector('.main-hub__xp-fill') as HTMLElement).style.setProperty('--xp-progress', pct + '%');
  (root.querySelector('[data-kind="coin"] span') as HTMLElement).textContent = fmt(p.wallet.coins);
  (root.querySelector('[data-kind="gem"] span') as HTMLElement).textContent = fmt(p.wallet.gems);
}

function template(): string {
  const c = copy();
  const dist = getDistance();
  const distBtn = (m: PracticeDistance, label: string) =>
    `<button type="button" aria-pressed="${m === dist}" data-distance="${m}">${label}</button>`;
  const mode = (m: string, label: string) =>
    `<button class="main-hub__mode main-hub__mode--${m}" type="button" data-mode="${m}"><span class="main-hub__mode-disc"><img src="${B}art/menu/art_icons/${m}.svg" alt=""></span><span class="main-hub__mode-label">${label}</span></button>`;
  const nav = (r: string, label: string, cur = false) =>
    `<button type="button" data-route="${r}"${cur ? ' aria-current="page"' : ''}><svg aria-hidden="true"><use href="${icon(r)}"></use></svg><span>${label}</span></button>`;
  return `
  <div class="main-hub__world" aria-hidden="true">
    <img class="main-hub__world-layer main-hub__world-layer--background" src="${world('menu_bg_deep.png')}" alt="">
    <canvas class="main-hub__world-canvas"></canvas>
  </div>
  <div class="main-hub__content main-hub__ui">
    <header class="main-hub__account" aria-label="Player account" style="background:${frame('frame-top-account')}">
      <div class="main-hub__avatar" aria-hidden="true"><img src="${art('spermy/base_body.png')}" alt=""><img src="${art('spermy/face_idle.png')}" alt=""><span class="main-hub__lvl-badge" style="background:${frame('badge-level')}">1</span></div>
      <div class="main-hub__identity">
        <div class="main-hub__name">${c.guest}</div>
        <div class="main-hub__xp">
          <div class="main-hub__xp-track" role="progressbar" aria-label="Experience"><div class="main-hub__xp-fill" style="--xp-progress:0%"></div></div>
        </div>
      </div>
      <div class="main-hub__currency" data-kind="coin" style="background:${frame('pill-currency')}"><svg width="18" height="18" aria-hidden="true"><use href="${icon('coin')}"></use></svg><span>0</span></div>
      <div class="main-hub__currency" data-kind="gem" style="background:${frame('pill-currency')}"><svg width="18" height="18" aria-hidden="true"><use href="${icon('gem')}"></use></svg><span>0</span></div>
      <button class="main-hub__icon-button" type="button" data-route="settings" aria-label="Settings"><svg width="22" height="22" aria-hidden="true"><use href="${icon('settings')}"></use></svg></button>
    </header>
    <h1 class="main-hub__wordmark"><img src="${B}art/menu/menu-wordmark.svg" alt="One in a Million"></h1>
    <div class="main-hub__spacer"></div>
    <div class="main-hub__distance" role="group" aria-label="${c.distanceLabel}">
      ${distBtn(750, c.distances[0])}${distBtn(1000, c.distances[1])}${distBtn(1250, c.distances[2])}
    </div>
    <button class="main-hub__race-now" type="button"><svg aria-hidden="true"><use href="${icon('play')}"></use></svg>${c.primaryAction}</button>
    <nav class="main-hub__modes" aria-label="Game modes">
      ${mode('practice', c.practice)}${mode('multiplayer', c.multiplayer)}${mode('challenge', c.challenge)}${mode('endless', c.endless)}
    </nav>
    <button class="main-hub__daily" type="button" data-route="daily" style="background:${frame('card-daily')}">
      <svg aria-hidden="true"><use href="${icon('daily')}"></use></svg>
      <span class="main-hub__daily-txt"><strong>${c.dailyChallenge}</strong><small>${c.dailyExample}</small>
        <span class="main-hub__daily-prog"><i style="width:0%"></i></span></span>
      <span class="main-hub__daily-reward"><svg width="16" height="16" aria-hidden="true"><use href="${icon('coin')}"></use></svg>500</span>
    </button>
  </div>
  <nav class="main-hub__nav main-hub__ui" aria-label="Main navigation" style="background:${frame('frame-bottom-nav')}">
    ${nav('home', c.home, true)}${nav('customize', c.customize)}${nav('store', c.store)}${nav('profile', c.profile)}
  </nav>`;
}

function toast(msg: string): void {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2000);
}

function wire(): void {
  if (!root) return;
  const c = copy();
  // distance selector
  root.querySelectorAll('.main-hub__distance button').forEach((b) => {
    (b as HTMLElement).onclick = () => {
      const d = Number((b as HTMLElement).dataset.distance) as PracticeDistance;
      setDistance(d); renderer?.setDistance(d);
      root!.querySelectorAll('.main-hub__distance button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      root!.querySelector('.main-hub__track-wrap')?.setAttribute('aria-label', `Practice race, ${d} metres`);
    };
  });
  (root.querySelector('.main-hub__race-now') as HTMLElement).onclick = () => raceNow(getDistance());
  root.querySelectorAll('.main-hub__mode').forEach((b) => {
    (b as HTMLElement).onclick = () => {
      const m = (b as HTMLElement).dataset.mode;
      hide();
      if (m === 'practice') raceNow(getDistance());
      else if (m === 'multiplayer') click('mpPanel');
      else if (m === 'challenge') click('chPanel');
      else if (m === 'endless') click('endlessPanel');
    };
  });
  root.querySelectorAll('.main-hub__nav button, .main-hub__icon-button, .main-hub__daily').forEach((b) => {
    (b as HTMLElement).onclick = () => {
      const r = (b as HTMLElement).dataset.route;
      if (r === 'customize') { hide(); click('custPanel'); }
      else if (r === 'store') toast(c.store + ' — coming soon');
      else if (r === 'profile') toast(c.profile + ' — coming soon');
      else if (r === 'settings') { openSettings(() => raceNow(getDistance())); }
      else if (r === 'daily') toast(c.dailyChallenge + ' — coming soon');
      // 'home' is a no-op (already here)
    };
  });
}

export function isHubOpen(): boolean { return !!root && !root.classList.contains('hidden'); }

export function hide(): void {
  if (!root) return;
  root.classList.add('hidden');
  renderer?.stop();
}

export function show(): void {
  if (!root) {
    root = document.createElement('main');
    root.className = 'main-hub';
    root.setAttribute('data-status', 'ready');
    root.innerHTML = template();
    document.body.appendChild(root);
    wire();
    const canvas = root.querySelector('.main-hub__world-canvas') as HTMLCanvasElement;
    try {
      renderer = new LiveTrackRenderer(canvas, {
        selectedDistance: getDistance(),
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        inputClass: 'mobile_motion',
      });
      void renderer.preload({
        mascotBody: art('spermy/base_body.png'), mascotFace: art('spermy/face_idle.png'), mascotTail: art('spermy/tail_default.png'),
        goal: art('goal/egg.png'), goalHalo: art('goal/egg_halo.png'), goalRays: art('goal/egg_rays.png'),
        wbc: art('obstacles/wbc_s.png'), virus: art('obstacles/virus_s.png'),
        wallLeft: art('walls/wall_left.png'), wallRight: art('walls/wall_right.png'),
      }).then(() => renderer?.start());
    } catch { /* canvas unavailable — bg image still shows */ }
  }
  root.classList.remove('hidden');
  bindProfile();
  renderer?.start();
  $('start')?.classList.add('hidden');
}
