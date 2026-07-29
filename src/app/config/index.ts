/**
 * Phase 4 configuration contracts (data-driven).
 *
 * These import the machine-readable JSON contracts shipped in the Phase 4 handoff.
 * Prices, rewards and the level curve come from here — NEVER from UI labels.
 */
import economyJson from './data/economy.json';
import catalogJson from './data/catalog.json';
import routesJson from './data/routes.json';

export type CurrencyId = 'coins' | 'gems';
export type CosmeticSlot = 'skin' | 'glasses' | 'mouth' | 'hat' | 'trail' | 'aura';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CatalogItem {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: Rarity;
  price: { currency: CurrencyId; amount: number };
  thumb: string;
  asset: string;
  z: number;
}

export const economy = economyJson;
export const routes = routesJson;
export const catalog = catalogJson as { version: number; items: CatalogItem[] };

/** Look up a catalog item by id (source of truth for price + slot). */
export function catalogItem(id: string): CatalogItem | undefined {
  return catalog.items.find((i) => i.id === id);
}
