/**
 * Settings sheet. Hosts the tutorial replay, menu-style toggle, Supabase server
 * settings, and the audio + haptics controls (volumes, mute, haptics, reduced
 * intensity). Volume changes apply live; a short preview sound plays on release
 * (not while dragging) so there is no preview spam.
 */
import { openHowToPlay } from './howToPlay';
import { setHubV2 } from './mainHub';
import { getAudioSettings, setAudioSettings, unlockAudio, emitAudio, type AudioSettings } from '../../audio';

function locale(): 'sl' | 'en' { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; } }

const T = {
  en: {
    title: 'Settings', replay: 'Replay tutorial', menuNew: 'Menu style: New', menuClassic: 'Menu style: Classic',
    server: 'Server settings', close: 'Close',
    audio: 'Audio & Haptics', master: 'Master', music: 'Music', sfx: 'Sound effects', ui: 'UI sounds',
    muteAll: 'Mute all', haptics: 'Haptics', reduced: 'Reduced audio intensity',
    controls: 'Controls', handRight: 'Power-ups: right hand', handLeft: 'Power-ups: left hand',
  },
  sl: {
    title: 'Nastavitve', replay: 'Ponovi navodila', menuNew: 'Meni: Nov', menuClassic: 'Meni: Klasičen',
    server: 'Nastavitve strežnika', close: 'Zapri',
    audio: 'Zvok in vibracije', master: 'Glavna', music: 'Glasba', sfx: 'Zvočni učinki', ui: 'Zvoki vmesnika',
    muteAll: 'Izklopi vse', haptics: 'Vibracije', reduced: 'Zmanjšana jakost zvoka',
    controls: 'Upravljanje', handRight: 'Dodatki: desna roka', handLeft: 'Dodatki: leva roka',
  },
};

export function openSettings(onReplaySwim?: () => void): void {
  const t = T[locale()];
  const s = getAudioSettings();
  const root = document.createElement('div');
  root.className = 'settings-overlay';
  const hubOn = new URLSearchParams(location.search).get('hub') !== 'classic';
  let hand = localStorage.getItem('oiam_dominant_hand') === 'left' ? 'left' : 'right';

  const slider = (key: keyof AudioSettings, label: string) => `
    <div class="settings-ctl">
      <label for="aud-${key}">${label}</label>
      <input type="range" id="aud-${key}" min="0" max="100" value="${Math.round((s[key] as number) * 100)}" data-vol="${key}" aria-label="${label}">
    </div>`;
  const toggle = (key: keyof AudioSettings, label: string) => `
    <div class="settings-ctl">
      <label for="aud-${key}">${label}</label>
      <span style="flex:1"></span>
      <span class="settings-switch">
        <input type="checkbox" id="aud-${key}" data-toggle="${key}" ${s[key] ? 'checked' : ''} aria-label="${label}">
        <span class="track"></span><span class="thumb"></span>
      </span>
    </div>`;

  root.innerHTML = `
    <div class="settings-sheet" role="dialog" aria-label="${t.title}">
      <h2>${t.title}</h2>
      <button class="settings-row" data-act="replay">❓ ${t.replay}</button>
      <button class="settings-row" data-act="menu">✨ ${hubOn ? t.menuClassic : t.menuNew}</button>
      <button class="settings-row" data-act="server">⚙ ${t.server}</button>

      <div class="settings-group">${t.controls}</div>
      <button class="settings-row" data-act="hand">&#9757; <span data-hand-label>${hand === 'left' ? t.handLeft : t.handRight}</span></button>

      <div class="settings-group">${t.audio}</div>
      ${slider('masterVolume', t.master)}
      ${/* Music removed from the game (SFX-only) — slider omitted. */ ''}
      ${slider('sfxVolume', t.sfx)}
      ${slider('uiVolume', t.ui)}
      ${toggle('muted', t.muteAll)}
      ${toggle('hapticsEnabled', t.haptics)}
      ${toggle('reducedAudioIntensity', t.reduced)}

      <button class="settings-close" data-act="close">${t.close}</button>
    </div>`;

  const close = () => root.remove();

  // Live volume apply; preview only on release (change), so dragging is silent.
  root.querySelectorAll('input[type=range]').forEach((el) => {
    const input = el as HTMLInputElement;
    const key = input.dataset.vol as keyof AudioSettings;
    input.addEventListener('input', () => {
      const v = Math.max(0, Math.min(1, Number(input.value) / 100));
      setAudioSettings({ [key]: v } as Partial<AudioSettings>);
    });
    input.addEventListener('change', () => {
      unlockAudio();
      if (key === 'sfxVolume' || key === 'masterVolume') emitAudio('pickup_star');
      else if (key === 'uiVolume') emitAudio('ui_click');
    });
  });

  root.querySelectorAll('input[type=checkbox]').forEach((el) => {
    const input = el as HTMLInputElement;
    const key = input.dataset.toggle as keyof AudioSettings;
    input.addEventListener('change', () => {
      unlockAudio();
      setAudioSettings({ [key]: input.checked } as Partial<AudioSettings>);
      // Keep the in-HUD mute button glyph in sync when muting from here.
      if (key === 'muted') { const b = document.getElementById('btnMute'); if (b) b.textContent = input.checked ? '🔇' : '🔊'; }
      if ((key === 'hapticsEnabled' && input.checked) || key === 'muted') { if (!input.checked || key !== 'muted') emitAudio('ui_click'); }
    });
  });

  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el === root) { close(); return; }                       // backdrop
    if (el.closest('.settings-ctl')) return;                    // don't close on control interaction
    const act = (el.closest('[data-act]') as HTMLElement | null)?.dataset.act;
    if (act === 'replay') { close(); openHowToPlay(onReplaySwim); }
    else if (act === 'menu') { setHubV2(!hubOn); location.href = hubOn ? location.pathname + '?hub=classic' : location.pathname; }
    else if (act === 'server') { close(); (document.getElementById('serverCfg') as HTMLElement | null)?.click(); }
    else if (act === 'hand') {
      hand = hand === 'right' ? 'left' : 'right';
      try { localStorage.setItem('oiam_dominant_hand', hand); } catch { /* ignore */ }
      const hud = document.getElementById('hud'); if (hud) hud.dataset.hand = hand;
      const label = root.querySelector('[data-hand-label]'); if (label) label.textContent = hand === 'left' ? t.handLeft : t.handRight;
      emitAudio('ui_click');
    }
    else if (act === 'close') close();
  });

  document.body.appendChild(root);
}
