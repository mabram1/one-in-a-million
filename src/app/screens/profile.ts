/**
 * Profile screen — identity, level/XP progress, wallet, and personal bests.
 *
 * Read-only view over the ProfileStore + the game's local best-time keys. No
 * mutation here (cosmetics are bought in the Store, equipped in Customize).
 */
import { getProfileStore, ProfileStore } from '../profileStore';
import { levelInfo } from '../domain/progression';
import { catalog } from '../config';
import { openMyFace } from './myFace';
import { art, hasCustomFace } from '../../game/assets/store';

const B = ((import.meta as any).env?.BASE_URL as string) || './';

function locale(): 'sl' | 'en' { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; } }
const T = {
  en: { title: 'Profile', level: 'Level', coins: 'Coins', gems: 'Gems', cosmetics: 'Cosmetics', bests: 'Personal bests', endless: 'Endless best', none: 'No runs yet', close: 'Close', guest: 'Guest', myFace: 'My Face' },
  sl: { title: 'Profil', level: 'Stopnja', coins: 'Kovanci', gems: 'Dragulji', cosmetics: 'Kozmetika', bests: 'Osebni rekordi', endless: 'Endless rekord', none: 'Še brez teka', close: 'Zapri', guest: 'Gost', myFace: 'Moj obraz' },
};

const fmt = (n: number) => n.toLocaleString('en-US');

function champPreview(): string {
  const layers: string[] = [];
  const add = (key: string | null | undefined, cls: string) => {
    if (!key) return;
    const src = art.img[key]?.src;
    if (src) layers.push(`<img class="${cls}" src="${src}" alt="">`);
  };
  add(art.equipped.trail || 'tail_default', 'profile-champ-tail');
  add('body', 'profile-champ-body');
  if (hasCustomFace() && art.customFace) layers.push(`<img class="profile-champ-face" src="${art.customFace.src}" alt="">`);
  else add('face_idle', 'profile-champ-face');
  add(art.equipped.glasses, 'profile-champ-glasses');
  add(art.equipped.mouth, 'profile-champ-mouth');
  add(art.equipped.hat, 'profile-champ-hat');
  add(art.equipped.aura, 'profile-champ-aura');
  return layers.join('');
}

/** Best times per practice distance, read from the game's local PB storage. */
function personalBests(): { dist: number; time: number }[] {
  const out: { dist: number; time: number }[] = [];
  for (const dist of [750, 1000, 1250]) {
    let best = Infinity;
    for (const ic of ['mobile_motion', 'mobile_touch_fallback']) {
      try {
        const raw = localStorage.getItem(`oiam_pb_${ic}_${dist}`);
        if (raw) { const pb = JSON.parse(raw); if (pb && typeof pb.time === 'number') best = Math.min(best, pb.time); }
      } catch { /* ignore */ }
    }
    if (best < Infinity) out.push({ dist, time: best });
  }
  return out;
}

function endlessBest(): number { try { return +(localStorage.getItem('oiam_endless_best') || 0) || 0; } catch { return 0; } }

export function openProfile(store: ProfileStore = getProfileStore()): void {
  const t = T[locale()];
  const p = store.profile;
  const info = levelInfo(p.xp);
  const pct = info.xpForNext > 0 ? Math.min(100, Math.round((info.xpIntoLevel / info.xpForNext) * 100)) : 100;
  const owned = p.ownedCosmeticIds.length;
  const total = catalog.items.length;
  const bests = personalBests();
  const eb = endlessBest();

  const root = document.createElement('div');
  root.className = 'settings-overlay profile-overlay';
  root.innerHTML = `
    <div class="settings-sheet profile-sheet" role="dialog" aria-label="${t.title}">
      <h2>${t.title}</h2>
      <div class="profile-champ-card">
        <div class="profile-champ-preview" aria-label="Your customized Champ">${champPreview()}</div>
        <button class="profile-face-edit" data-act="myface"><img src="${B}art/profile/my_face_tile.png" alt="">${t.myFace}</button>
      </div>
      <div class="profile-id">
        <div class="profile-name">${p.displayName || t.guest}</div>
        <div class="profile-lvl">${t.level} ${info.displayLevel}</div>
      </div>
      <div class="profile-xp"><div class="profile-xp-fill" style="width:${pct}%"></div><span>${fmt(info.xpIntoLevel)} / ${fmt(info.xpForNext)} XP</span></div>
      <div class="profile-wallet">
        <div class="profile-stat"><span class="k">🪙 ${t.coins}</span><span class="v">${fmt(p.wallet.coins)}</span></div>
        <div class="profile-stat"><span class="k">💎 ${t.gems}</span><span class="v">${fmt(p.wallet.gems)}</span></div>
        <div class="profile-stat"><span class="k">🎨 ${t.cosmetics}</span><span class="v">${owned} / ${total}</span></div>
      </div>
      <div class="settings-group">${t.bests}</div>
      <div class="stats profile-bests">
        ${bests.length ? bests.map((b) => `<div class="row"><span class="k">${b.dist} m</span><span class="v">${b.time.toFixed(1)} s</span></div>`).join('') : `<div class="row"><span class="k">${t.none}</span><span class="v"></span></div>`}
        ${eb ? `<div class="row"><span class="k">${t.endless}</span><span class="v">${fmt(eb)} m</span></div>` : ''}
      </div>
      <button class="settings-close" data-act="close">${t.close}</button>
    </div>`;

  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-act="myface"]')) { openMyFace(); return; }
    if (el === root || el.closest('[data-act="close"]')) root.remove();
  });
  document.body.appendChild(root);
}
