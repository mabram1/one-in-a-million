/**
 * Store screen — spend coins/gems on cosmetics.
 *
 * Prices come from the catalog (config), purchases go through the ProfileStore
 * (idempotent by transactionId, wallet never negative). Owned items can be
 * equipped straight from here. Thumbnails reuse the loaded cosmetic sprites.
 */
import { catalog, type CatalogItem } from '../config';
import { getProfileStore, ProfileStore } from '../profileStore';

const B = ((import.meta as any).env?.BASE_URL as string) || './';

function locale(): 'sl' | 'en' { try { return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; } }
const T = {
  en: { title: 'Store', buy: 'Buy', owned: 'Owned', equip: 'Equip', equipped: 'Equipped', notEnough: 'Not enough', close: 'Close' },
  sl: { title: 'Trgovina', buy: 'Kupi', owned: 'V lasti', equip: 'Opremi', equipped: 'Opremljeno', notEnough: 'Premalo', close: 'Zapri' },
};

const fmt = (n: number) => n.toLocaleString('en-US');
let txnCounter = 0;
const nextTxnId = (id: string) => `buy_${id}_${++txnCounter}_${Math.round(perfNow())}`;
function perfNow() { try { return performance.now(); } catch { return 0; } }

/** Open the store. `store` is injectable for tests; defaults to the singleton. */
export function openStore(store: ProfileStore = getProfileStore()): void {
  const t = T[locale()];
  const root = document.createElement('div');
  root.className = 'settings-overlay store-overlay';

  const priceHtml = (it: CatalogItem) =>
    `<span class="store-price ${it.price.currency}">${it.price.currency === 'gems' ? '💎' : '🪙'} ${fmt(it.price.amount)}</span>`;

  // Dedicated store thumbnail art (public/art/store/<id>_thumb.png); if one is ever
  // missing the emoji placeholder shows instead.
  const thumb = (it: CatalogItem) =>
    `<img src="${B}art/store/${it.id}_thumb.png" alt="" loading="lazy"
       onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ci-none',textContent:'${it.slot === 'trail' ? '✦' : it.slot === 'aura' ? '☀' : '🎩'}'}))">`;

  const card = (it: CatalogItem) => {
    const owned = store.isOwned(it.id);
    const equipped = (store.profile.equipped as any)[it.slot] === it.id;
    const affordable = store.profile.wallet[it.price.currency] >= it.price.amount;
    const action = owned
      ? `<button class="store-btn ${equipped ? 'is-equipped' : 'equip'}" data-equip="${it.id}" data-slot="${it.slot}" ${equipped ? 'disabled' : ''}>${equipped ? t.equipped : t.equip}</button>`
      : `<button class="store-btn buy${affordable ? '' : ' disabled'}" data-buy="${it.id}" ${affordable ? '' : 'disabled'}>${affordable ? t.buy : t.notEnough}</button>`;
    return `<div class="cust-item r-${it.rarity} store-card${owned ? ' owned' : ''}" data-card="${it.id}">
      <div class="ci-thumb">${thumb(it)}</div>
      <div class="ci-name">${it.name}</div>
      ${owned ? `<div class="store-owned">${t.owned}</div>` : priceHtml(it)}
      ${action}
    </div>`;
  };

  const balance = () =>
    `<div class="store-balance"><span>🪙 ${fmt(store.profile.wallet.coins)}</span><span>💎 ${fmt(store.profile.wallet.gems)}</span></div>`;

  const render = () => {
    root.innerHTML = `
      <div class="settings-sheet store-sheet" role="dialog" aria-label="${t.title}">
        <div class="store-head"><h2>${t.title}</h2>${balance()}</div>
        <div class="cust-grid store-grid">${catalog.items.map(card).join('')}</div>
        <button class="settings-close" data-act="close">${t.close}</button>
      </div>`;
  };
  render();

  const flash = (id: string, cls: string) => {
    const el = root.querySelector(`[data-card="${id}"]`) as HTMLElement | null;
    if (!el) return; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 400);
  };

  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el === root) { root.remove(); return; }
    if ((el.closest('[data-act="close"]'))) { root.remove(); return; }

    const buyId = (el.closest('[data-buy]') as HTMLElement | null)?.dataset.buy;
    if (buyId) {
      const outcome = store.buy(buyId, nextTxnId(buyId));
      if (outcome.ok) render();
      else flash(buyId, outcome.reason === 'insufficient_funds' ? 'shake' : 'shake');
      return;
    }
    const equipBtn = el.closest('[data-equip]') as HTMLElement | null;
    if (equipBtn) {
      const id = equipBtn.dataset.equip!; const slot = equipBtn.dataset.slot as CatalogItem['slot'];
      store.equip(slot, id);
      render();
      return;
    }
  });

  document.body.appendChild(root);
}

/** Test/inspection helper: catalog ids that a wallet can currently afford. */
export function affordableItemIds(store: ProfileStore = getProfileStore()): string[] {
  return catalog.items.filter((i) => !store.isOwned(i.id) && store.profile.wallet[i.price.currency] >= i.price.amount).map((i) => i.id);
}
