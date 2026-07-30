/**
 * Minimal Settings sheet. Per the How-to spec, the tutorial is NOT a standalone menu
 * button — it is replayed from Settings ("Replay Tutorial"). Also hosts the menu-style
 * toggle and the existing Supabase server settings.
 */
import { openHowToPlay } from './howToPlay';
import { setHubV2 } from './mainHub';

function locale(): 'sl' | 'en' { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; } }
const T = {
  en: { title: 'Settings', replay: 'Replay tutorial', menuNew: 'Menu style: New', menuClassic: 'Menu style: Classic', server: 'Server settings', close: 'Close' },
  sl: { title: 'Nastavitve', replay: 'Ponovi navodila', menuNew: 'Meni: Nov', menuClassic: 'Meni: Klasičen', server: 'Nastavitve strežnika', close: 'Zapri' },
};

export function openSettings(onReplaySwim?: () => void): void {
  const t = T[locale()];
  const root = document.createElement('div');
  root.className = 'settings-overlay';
  const hubOn = new URLSearchParams(location.search).get('hub') === 'v2';
  root.innerHTML = `
    <div class="settings-sheet" role="dialog" aria-label="${t.title}">
      <h2>${t.title}</h2>
      <button class="settings-row" data-act="replay">❓ ${t.replay}</button>
      <button class="settings-row" data-act="menu">✨ ${hubOn ? t.menuClassic : t.menuNew}</button>
      <button class="settings-row" data-act="server">⚙ ${t.server}</button>
      <button class="settings-close" data-act="close">${t.close}</button>
    </div>`;
  const close = () => root.remove();
  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el === root) { close(); return; }                       // backdrop
    const act = (el.closest('[data-act]') as HTMLElement | null)?.dataset.act;
    if (act === 'replay') { close(); openHowToPlay(onReplaySwim); }
    else if (act === 'menu') { setHubV2(!hubOn); location.href = hubOn ? location.pathname : location.pathname + '?hub=v2'; }
    else if (act === 'server') { close(); (document.getElementById('serverCfg') as HTMLElement | null)?.click(); }
    else if (act === 'close') close();
  });
  document.body.appendChild(root);
}
