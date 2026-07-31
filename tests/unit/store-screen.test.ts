/**
 * Store screen — buying wires through the ProfileStore and updates ownership +
 * wallet. Uses an injected ProfileStore over in-memory storage (no singleton).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { openStore, affordableItemIds } from '../../src/app/screens/store';
import { ProfileStore } from '../../src/app/profileStore';
import { catalog } from '../../src/app/config';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, v) };
}
const store = () => new ProfileStore(memStore(), () => '2026-07-31T00:00:00.000Z');

afterEach(() => { document.body.innerHTML = ''; });

describe('Store buy flow', () => {
  it('buys an affordable coin item: marks owned and debits the wallet', () => {
    const s = store();
    const item = catalog.items.find((i) => i.price.currency === 'coins' && i.price.amount <= s.profile.wallet.coins)!;
    const before = s.profile.wallet.coins;
    openStore(s);

    const btn = document.querySelector(`[data-buy="${item.id}"]`) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    expect(s.isOwned(item.id)).toBe(true);
    expect(s.profile.wallet.coins).toBe(before - item.price.amount);
    // After re-render the card shows an equip control, not a buy button.
    expect(document.querySelector(`[data-buy="${item.id}"]`)).toBeNull();
    expect(document.querySelector(`[data-equip="${item.id}"]`)).toBeTruthy();
  });

  it('does not render a usable buy button for an unaffordable item', () => {
    const s = store();
    const dear = catalog.items.find((i) => i.price.currency === 'gems' && i.price.amount > s.profile.wallet.gems)!;
    openStore(s);
    const btn = document.querySelector(`[data-buy="${dear.id}"]`) as HTMLButtonElement | null;
    expect(btn && btn.disabled).toBe(true);
    expect(affordableItemIds(s)).not.toContain(dear.id);
  });

  it('equips an owned item from the store', () => {
    const s = store();
    const item = catalog.items.find((i) => i.price.currency === 'coins' && i.price.amount <= s.profile.wallet.coins)!;
    s.buy(item.id, 'seed_txn');           // pre-own it
    openStore(s);
    (document.querySelector(`[data-equip="${item.id}"]`) as HTMLButtonElement).click();
    expect((s.profile.equipped as any)[item.slot]).toBe(item.id);
  });
});
