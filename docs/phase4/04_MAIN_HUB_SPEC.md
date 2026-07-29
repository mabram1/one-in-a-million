# Main Hub Specification

## 1. Purpose

The Hub answers three questions in under two seconds:

1. Who am I?
2. What should I play next?
3. What did I earn?

## 2. Portrait layout

Reference: 1080×1920.

### Top account bar

- avatar/equipped Spermy portrait;
- guest or display name;
- level badge;
- XP progress;
- coin balance;
- gem balance;
- Settings button.

### Hero zone

- canonical Spermy live preview;
- current track label;
- one large `QUICK RACE` action;
- last/best result;
- optional first-win reward chip.

### Mode stack

- Practice;
- Multiplayer;
- Challenge a Friend;
- Endless;
- Daily Challenge, visible but marked `COMING NEXT` until backend rules are ready.

### Bottom navigation

- Home;
- Customize;
- Store;
- Profile.

Home is teal-active. Other destinations use muted cream.

## 3. Information hierarchy

- One animated focal element: the Spermy preview.
- One primary action: Quick Race.
- Maximum one promotional/reward card.
- Currency balances remain stable in the top bar.
- Server configuration and development links are removed from the player-facing Hub.

## 4. Quick Race behavior

Version 1 routes to the last-used Practice setup.

Defaults:

- new player: 750 m Practice;
- returning player: last valid Practice distance;
- challenge deep link: never replaces Quick Race default.

The button label may become `CONTINUE` only for a recoverable interrupted local race.

## 5. Mode card contract

```ts
interface ModeCardModel {
  id: "practice" | "multiplayer" | "challenge" | "endless" | "daily";
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  enabled: boolean;
  disabledReason?: string;
  lastResult?: string;
}
```

Disabled cards remain readable and explain why.

## 6. Hub state variants

### Guest first visit

- name `Guest`;
- level 1;
- tutorial reward visible;
- Customize and Store available;
- cloud-save benefit shown non-blockingly.

### Returning offline

- local balances and profile visible;
- Practice and Endless available;
- Multiplayer disabled with `OFFLINE`;
- no stale fake leaderboard data.

### Signed in

- synced name/avatar;
- conflict resolution completes before balance-changing actions;
- pending cloud sync shown as a subtle status, not a blocking modal.

### Desktop

Show persistent `DESKTOP DEMO` pill. Quick Race routes to keyboard Practice. Competitive records and mobile leaderboards remain separate.

## 7. Animation

- character idle/bob: 2.4–3.2 s loop;
- tail animation from existing rig;
- card press: 0.96 scale, 100 ms;
- XP/coin changes animate only after confirmed persistence;
- background breath: maximum 2% luminance shift;
- reduced motion replaces loops with static final states.

## 8. Mockups to approve before implementation polish

1. New guest Hub.
2. Returning player Hub with progression.
3. Offline Hub.
4. Desktop Demo Hub.

## 9. Acceptance

- Quick Race is the dominant action.
- No vertical scrollbar at 390×844 CSS px.
- Content remains accessible at 360×640 using compact mode.
- Bottom navigation clears the home indicator.
- Currency and XP values use tabular figures.
- Hub makes no network call per animation frame.
- Existing game route remains reachable without account creation.
