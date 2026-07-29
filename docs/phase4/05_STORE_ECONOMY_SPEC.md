# Store and Economy Specification

## 1. Economy goals

- Reward play without requiring grind before the first customization.
- Preserve cosmetics as expression, not power.
- Keep balances understandable.
- Prevent duplicate grants and purchase races.
- Avoid fake urgency, loot boxes, and dark patterns.

## 2. Currency roles

### Coins

Primary earnable currency.

Used for:

- common cosmetics;
- most rare cosmetics;
- future non-competitive profile decorations.

### Gems

Rare/premium currency.

Used for:

- epic cosmetics;
- legendary cosmetics;
- visually exceptional trails and auras.

Gems never buy speed, shields, better hitboxes, extra launch charge, or leaderboard advantage.

## 3. Starting grant

```json
{
  "coins": 1000,
  "gems": 20
}
```

This lets a new player buy one common cosmetic immediately while preserving a reason to play.

The grant is idempotent and keyed by profile creation, not app launch.

## 4. Race reward rules

### Standard mobile-motion race

| Component | Reward |
|---|---:|
| Completion | 40 coins |
| Distance milestones | 8 coins per 250 m, maximum 40 |
| Perfect launch | 5 coins |
| Multiplayer 1st / 2nd / 3rd | 30 / 20 / 10 coins |
| First completed race of day | 50 coins |

Maximum ordinary payout should remain near 125 coins before special events.

### Endless

- base completion: 15 coins;
- each checkpoint: 8 coins;
- checkpoint reward cap: 120 coins per run;
- no passive reward for leaving the game running.

### Challenge

- first valid completion: 50 coins;
- win bonus: 20 coins;
- replay farming does not repeat the first-completion reward.

### Input eligibility

- `mobile_motion`: full rewards.
- `mobile_touch`: base and distance rewards; no ranked placement bonus.
- `desktop_keyboard`: no persistent economy rewards; Demo records are separate.

## 5. Gem earning

- every fifth level: 10 gems;
- first Daily Challenge completion: 2 gems when Daily ships;
- selected achievements later;
- no gems from repeatable keyboard play;
- no random gem drops in Phase 4.

## 6. Price ladder

| Rarity | Recommended price |
|---|---|
| Common | 700–900 coins |
| Rare | 950–1,500 coins |
| Epic | 80–150 gems |
| Legendary | 220–300 gems |

The existing catalog already fits this ladder and remains the launch source of truth.

## 7. Purchase transaction

```ts
interface PurchaseRequest {
  transactionId: string;
  profileId: string;
  itemId: string;
  catalogVersion: number;
  expectedCurrency: "coins" | "gems";
  expectedAmount: number;
}
```

Transaction rules:

1. resolve the item from the current catalog;
2. reject stale or mismatched prices;
3. check ownership;
4. check balance;
5. debit and grant ownership atomically;
6. persist transaction ID;
7. return the new authoritative wallet and ownership state;
8. never debit twice when a request is retried.

For local Phase 4, perform this inside one persistence transaction abstraction. The interface must be replaceable by a Supabase RPC later.

## 8. Store layout

### Header

- Back;
- title `STORE`;
- coins and gems;
- Profile/restore status.

### Sections

1. Featured cosmetic.
2. Recommended for the current loadout.
3. Hats.
4. Glasses.
5. Mouth accessories.
6. Trails and auras when inventory exists.

Real-money coin packs, gem packs, remove ads, and VIP remain hidden while `realMoney.enabled` is false.

## 9. Cosmetic card

Required:

- 256×256 thumbnail;
- item name;
- slot;
- rarity;
- exact price;
- `OWNED`, `EQUIPPED`, `BUY`, or insufficient-funds state;
- preview action.

Rarity affects the frame, not the gameplay value.

## 10. Purchase UX

1. Tap item to preview it on the canonical Spermy.
2. Tap `BUY`.
3. Confirm exact item and price.
4. Disable repeated submit while pending.
5. On success, show `EQUIP NOW`.
6. On failure, preserve wallet and show a specific reason.

No purchase is triggered by tapping the card itself.

## 11. Real-money readiness

Phase 4 configuration:

```json
{
  "realMoney": {
    "enabled": false,
    "reason": "Platform SKUs and billing compliance are not finalized."
  }
}
```

Before enabling:

- Google Play Billing product IDs;
- Apple product IDs;
- localized platform prices;
- pending purchase recovery;
- restore purchases;
- parental/platform confirmation;
- receipt validation;
- refund/revocation handling;
- privacy and terms links.

Do not hard-code converted currency prices in UI.

## 12. Anti-abuse

- reward events use unique IDs;
- no reward on client animation completion;
- multiplayer placement reward waits for authoritative result;
- challenge reward keys include challenge ID and profile ID;
- clock changes cannot repeat daily rewards;
- wallet never uses floating-point numbers;
- negative balances are invalid.

## 13. Telemetry

Track:

- store opened;
- item previewed;
- purchase started;
- purchase succeeded;
- purchase failed with coarse reason;
- item equipped;
- insufficient currency shown.

Never log payment credentials or raw platform receipts.
