/**
 * "How to Play" onboarding carousel (bilingual EN/SL, DOM/CSS).
 *
 * Five cards teach shake-to-charge, the GO zone, tilt-to-steer, shake=straight,
 * and the ovum goal. Text is loaded from the authoritative localization JSON (never
 * from the reference PNGs); illustrations reuse the accepted game art. Completion is
 * versioned + persisted so it shows once but can be replayed from the menu.
 */
import en from '../config/data/howto.en.json';
import sl from '../config/data/howto.sl.json';

const HOWTO_KEY = 'oiam_howto_v1';
const VERSION = 1;

interface Card {
  eyebrow: string; title: string; body: string; button: string; callout: string;
  state_labels?: string[]; choice_labels?: string[];
}
const COPY: Record<string, { cards: Card[] }> = { en, sl };

function locale(): 'sl' | 'en' {
  try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; }
}

export function howToCompleted(): boolean {
  try { const s = JSON.parse(localStorage.getItem(HOWTO_KEY) || '{}'); return s.version === VERSION && (s.completed || s.skipped); }
  catch { return false; }
}
/** True once the tutorial has been shown at all — so it auto-opens exactly once, ever. */
export function howToSeen(): boolean {
  try { const s = JSON.parse(localStorage.getItem(HOWTO_KEY) || '{}'); return s.version === VERSION && (s.shown || s.completed || s.skipped); }
  catch { return false; }
}
function persist(step: number, completed: boolean, skipped: boolean): void {
  try { localStorage.setItem(HOWTO_KEY, JSON.stringify({ version: VERSION, currentStep: step, shown: true, completed, skipped, completedAt: completed ? new Date().toISOString() : undefined })); }
  catch { /* non-fatal */ }
}

const B = (import.meta as any).env?.BASE_URL || './';
const art = (p: string) => `${B}art/${p}`;

/** Stacked Spermy (tail + body + face) as an illustration fragment. */
function spermy(face: string): string {
  return `<span class="htp-spermy">
    <img src="${art('spermy/tail_default.png')}" alt="">
    <img src="${art('spermy/base_body.png')}" alt="">
    <img src="${art('spermy/' + face + '.png')}" alt="">
  </span>`;
}

/** Build the per-card illustration from accepted assets (approximation of the comps). */
function illustration(i: number, c: Card): string {
  switch (i) {
    case 0: return `<div class="htp-art">
      <span class="htp-arrow left">‹</span>
      <div class="htp-stack"><img class="htp-meter" src="${art('ui/hud/charge_meter_charging.png')}" alt="">${spermy('face_charging')}</div>
      <span class="htp-arrow right">›</span></div>`;
    case 1: return `<div class="htp-art col">
      <img class="htp-meter" src="${art('ui/hud/charge_meter_in_go_zone.png')}" alt="">
      <div class="htp-faces">
        <div class="ok-early">${spermy('face_charging')}<b>${c.state_labels?.[0] || ''}</b></div>
        <div class="ok-good">${spermy('face_win')}<b>${c.state_labels?.[1] || ''}</b></div>
        <div class="ok-late">${spermy('face_hit')}<b>${c.state_labels?.[2] || ''}</b></div>
      </div></div>`;
    case 2: return `<div class="htp-art">
      <span class="htp-arrow left">‹</span>
      <div class="htp-tilt"><img class="htp-obst" src="${art('obstacles/wbc_m.png')}" alt="">${spermy('face_determined')}<img class="htp-star" src="${art('pickups/star.png')}" alt=""></div>
      <span class="htp-arrow right">›</span></div>`;
    case 3: return `<div class="htp-art">
      <div class="htp-half"><span class="htp-updown">↑</span>${spermy('face_determined')}<b>${c.choice_labels?.[0] || ''}</b></div>
      <div class="htp-half"><span class="htp-curve">↪</span>${spermy('face_idle')}<b>${c.choice_labels?.[1] || ''}</b></div></div>`;
    default: return `<div class="htp-art col">
      <span class="htp-goal"><img src="${art('goal/egg_rays.png')}" class="rays" alt=""><img src="${art('goal/egg_halo.png')}" class="halo" alt=""><img src="${art('goal/egg.png')}" class="egg" alt=""></span>
      ${spermy('face_win')}</div>`;
  }
}

/** Open the carousel. `onSwim` runs when the player finishes on card 5. */
export function openHowToPlay(onSwim?: () => void): void {
  const cards = (COPY[locale()] || en).cards;
  let step = 0;

  const root = document.createElement('div');
  root.className = 'htp-overlay';
  document.body.appendChild(root);

  const close = (completed: boolean, skipped: boolean) => { persist(step + 1, completed, skipped); root.remove(); };

  const render = () => {
    const c = cards[step];
    const last = step === cards.length - 1;
    const title = c.title.split('\n').map((t) => `<span>${t}</span>`).join('');
    root.innerHTML = `
      <div class="htp-card">
        <div class="htp-eyebrow">${c.eyebrow}</div>
        <h2 class="htp-title">${title}</h2>
        ${illustration(step, c)}
        <div class="htp-callout">${c.callout}</div>
        <p class="htp-body">${c.body.replace(/\n/g, '<br>')}</p>
        <div class="htp-dots">${cards.map((_, j) => `<i class="${j === step ? 'on' : ''}"${j === step ? ' aria-current="step"' : ''}></i>`).join('')}</div>
        <div class="htp-actions">
          ${step > 0 ? '<button class="htp-back" aria-label="Back">←</button>' : ''}
          <button class="htp-next">${c.button}</button>
        </div>
        ${step >= 1 && !last ? '<button class="htp-skip">SKIP</button>' : ''}
      </div>`;
    (root.querySelector('.htp-next') as HTMLElement).onclick = () => {
      if (last) { close(true, false); onSwim && onSwim(); }
      else { step++; render(); persist(step + 1, false, false); }
    };
    const back = root.querySelector('.htp-back') as HTMLElement | null;
    if (back) back.onclick = () => { step--; render(); };
    const skip = root.querySelector('.htp-skip') as HTMLElement | null;
    if (skip) skip.onclick = () => close(false, true);
  };
  render();
}

/** Show the tutorial exactly once, ever (marked the moment it first appears). */
export function maybeShowHowToPlay(onSwim?: () => void): void {
  if (howToSeen()) return;
  try { localStorage.setItem(HOWTO_KEY, JSON.stringify({ version: VERSION, shown: true })); } catch { /* non-fatal */ }
  openHowToPlay(onSwim);
}
