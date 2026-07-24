# 4. UI System and Screen Specifications

## 4.1 UI goals

The interface must remain readable while the player shakes and tilts the phone. It uses large typography, compact hierarchy, persistent placement, and dark translucent surfaces. The race HUD supports action without covering the canal center.

Menus should feel like the same world as the race: rounded, glossy, dark, teal-accented, and gently animated.

## 4.2 Layout grid

Reference artboard: 1080 × 1920.

- Base spacing unit: 4 px CSS-equivalent.
- Standard page gutter: 20 px; 16 px on narrow devices.
- Content spacing: 8, 12, 16, 24, 32 px.
- Large section spacing: 40 or 48 px.
- Minimum touch target: 44 px; preferred button height: 52–56 px.
- Standard panel radius: 16 px.
- Compact pill radius: 999 px.
- Card radius: 18 px.
- Modal radius: 24 px.

All full-screen layouts include safe-area padding. Bottom controls sit above `env(safe-area-inset-bottom)`.

## 4.3 Type system

Use a rounded, bold display face with broad glyphs and a highly readable UI sans. Final font selection must verify licensing and supported character sets.

| Token | Size | Weight | Use |
|---|---:|---:|---|
| `type.display` | 40–48 px | 800 | Hero titles, result |
| `type.h1` | 30–34 px | 800 | Screen title |
| `type.h2` | 22–26 px | 750 | Card title |
| `type.body` | 16–18 px | 500 | Main copy |
| `type.label` | 13–14 px | 700 | Labels, tabs |
| `type.caption` | 12 px | 600 | Secondary metadata |
| `type.hud.number` | 20–28 px | 800 | Distance, time, score |

Numbers use tabular figures. Uppercase is reserved for short actions and race banners. Do not use all-caps paragraphs.

## 4.4 Surface tokens

```css
--surface-page: #0d0305;
--surface-panel: rgba(28, 6, 11, 0.88);
--surface-panel-strong: rgba(13, 3, 5, 0.94);
--surface-input: rgba(255, 255, 255, 0.07);
--border-subtle: rgba(255, 185, 200, 0.18);
--border-focus: #43e0cf;
--shadow-panel: 0 12px 32px rgba(0, 0, 0, 0.36);
--glow-teal: 0 0 18px rgba(67, 224, 207, 0.34);
--glow-gold: 0 0 20px rgba(255, 210, 77, 0.30);
```

Canvas UI may reproduce these visually, but DOM overlays should use the same semantic tokens.

## 4.5 Buttons

### Primary

Teal gradient, deep text, 56 px high, bold action label. One primary action per view. Pressed state scales to 0.96 and reduces glow.

### Secondary

Dark panel with teal border and light text. Used for alternative actions.

### Gold/reward

Gold gradient with dark text. Reserved for claiming rewards, premium feature emphasis, and celebratory actions—not routine navigation.

### Destructive

Dark surface with danger border. Require confirmation for account/data actions, not for canceling a queue.

### Disabled

Reduced contrast, no glow, and an optional short reason. A disabled button must still meet text readability requirements.

### Loading

Keep button width and label area stable; replace leading icon with a spinner and use present-progress text such as `JOINING…`.

## 4.6 Cards, tabs, chips, and list rows

- Cards use a clear title, one focal visual, and no more than two actions.
- Selected tabs use a teal fill/keyline plus text weight.
- Distance chips show selection with fill and checkmark, not color alone.
- Locked content shows the preview, lock condition, and path to unlock.
- Store tiles show item, contents, exact price, and purchase state without fake urgency.

## 4.7 Navigation

Primary hub navigation:

- Home
- Customize
- Store
- Social/Leaderboard
- Profile

Use a bottom navigation bar where all five fit at accessible sizes; otherwise place Profile in the top bar and use four bottom destinations. During racing, primary navigation is hidden.

Back behavior:

- device/browser back closes the top overlay first;
- leaving an active race requires confirmation except after finish;
- queue cancellation is immediate and safe;
- preserve the player’s last meaningful setup selection.

## 4.8 HUD layout

The center canal remains clear.

### Top edge

- left cluster: Distance and Score pills;
- center: Time/checkpoint target when relevant;
- right: place badge or compact connection indicator.

### Right rail

- vertical race progress;
- egg at the top;
- player markers with collision-aware separation;
- off-screen pointers for rivals when appropriate.

### Bottom edge

- segmented speed meter;
- charge meter during launch/recharge context;
- boost and shield buttons with count badges;
- re-center control outside accidental thumb areas.

The HUD may simplify by mode. Do not show empty systems just because components exist.

## 4.9 HUD components

### Stat pill

Label is small; value is large. Maximum two lines. Use icons only if unambiguous.

### Speed meter

Segments transition from muted coral through teal to green/gold overdrive. The speed value must remain interpretable without exact numbers.

### Charge meter

Shows current charge, narrow green GO zone, overcharge danger, and release instruction. Perfect-zone animation is high contrast but not flashing.

### Item button

48–64 px, icon centered, count badge top-right, cooldown or unavailable overlay. Activation feedback must be immediate.

### Race rail

Egg at top, start at bottom, local player marker emphasized. Marker stacking must preserve order and names/initials when possible.

### Place badge

Large ordinal with compact participant count. Avoid misleading intermediate placement when network state is uncertain.

### Race banner

Short, centered near upper play area, maximum approximately 1.2 seconds:

- `PERFECT LAUNCH`
- `FINAL SPRINT`
- `NEW BEST`
- `CHECKPOINT +5s`

## 4.10 Splash and loading

Purpose: establish identity and hide essential initialization.

Layout:

- deepest background;
- logo centered above a small animated Spermy;
- subtle membrane/particle framing;
- progress indicator or rotating tip near bottom;
- version/build hidden in a debug gesture or small footer.

Do not fake progress. If loading is indeterminate, use a loop and a useful status. On failure, show retry and offline explanation.

## 4.11 Sign-in and guest entry

Offer Guest first or equally, then Google and later Apple where available. Explain the benefit of an account: save progression, compete on leaderboards, and restore purchases.

Never block first play behind account creation unless a platform requirement demands it. Account-linking must explain whether local progress will merge or replace.

## 4.12 Main hub

Top bar:

- avatar;
- player name and level;
- XP progress;
- coin and gem balances;
- settings.

Main content:

- prominent `QUICK RACE` or recommended mode;
- Practice;
- Multiplayer;
- Challenge a Friend;
- Endless;
- Daily Challenge;
- track/event carousel if active.

Footer/navigation:

- Customize;
- Store;
- Leaderboard/Social;
- Profile.

The hub should show one clear next action and avoid simultaneous animated promotions.

## 4.13 Practice setup

- title and short explanation;
- distance chips: 750 / 1000 / 1250 m;
- track selector or current track card;
- AI rival difficulty if exposed;
- personal best;
- primary `RACE` button.

Remember the last distance. The selected distance must not be confused with multiplayer presets.

## 4.14 Multiplayer lobby

- room code with copy/share;
- player roster and ready/connectivity states;
- distance chips: 400 / 600 / 800 m;
- host indicator;
- host-only `START`;
- invite action;
- leave action.

Non-hosts see `WAITING FOR HOST`, not a disabled unexplained start button. If the host leaves, transfer ownership or close with a clear message.

## 4.15 Matchmaking

- animated queue visual;
- elapsed time and honest estimate;
- players found count if meaningful;
- selected race rules;
- `CANCEL`;
- background can show low-motion character idles.

Do not trap the player or hide cancel. Move to lobby/countdown only after roster lock.

## 4.16 Challenge a friend

Create flow:

1. choose track/distance or accept current result;
2. race;
3. generate link;
4. preview challenge card;
5. share/copy.

Accept flow:

- challenger identity and time;
- track, distance, and expiry;
- `ACCEPT CHALLENGE`;
- fallback if challenge expired or incompatible.

## 4.17 Results

Hierarchy:

1. win/place and character celebration;
2. finish time/distance;
3. personal best/new record;
4. key stats: score, stars, collisions, launch quality;
5. rewards and progression;
6. actions: `REMATCH`/`TRY AGAIN`, `CHALLENGE A FRIEND`, `HOME`.

Results count-ups finish quickly and can be tapped to skip. Rewards must be granted independently from animation completion.

## 4.18 Customize Spermy

- large live character preview;
- tabs: Body, Tail, Eyes, Accessories;
- scrollable inventory grid;
- equipped and locked states;
- color swatches where applicable;
- item name and rarity;
- `EQUIP`, `OWNED`, or unlock/purchase action.

Preview changes are reversible until equip. The character remains centered and animates gently. Inventory tiles share the same camera and lighting.

## 4.19 Store

Sections:

- featured cosmetic;
- starter pack;
- coin packs;
- gem packs;
- remove ads;
- VIP only if benefits are finalized and compliant.

Requirements:

- localized platform price;
- exact contents;
- no preselected expensive option;
- restore purchases;
- purchase pending/success/failure states;
- parental/platform confirmation handled by store SDK;
- no unapproved scarcity timers.

## 4.20 Tracks

Track cards show:

- artwork and name;
- difficulty;
- signature mechanic;
- personal best;
- locked/unlocked state;
- unlock condition;
- daily/event badge if applicable.

Cards should preview gameplay readability, not only decorative key art.

## 4.21 Leaderboard

Tabs may include Daily, Friends, Global, and Personal Best.

Each row:

- rank;
- avatar/name;
- score/time/distance;
- track/mode context;
- verified status where needed.

Pin the player’s row if off-screen. Show empty, offline, unranked, and privacy states. Never imply global legitimacy before anti-cheat and authoritative scoring are ready.

## 4.22 Daily challenge

Show:

- countdown to reset;
- track and modifiers;
- reward;
- primary metric;
- attempt state;
- top ranks/friend benchmark;
- `PLAY` or `PRACTICE`.

## 4.23 Settings

Groups:

- Audio: music, effects.
- Feedback: haptics, reduced motion.
- Controls: sensitivity, calibration, re-center, touch mode.
- Account: sign in/link, privacy, data export/delete where required.
- Support: help, terms, privacy policy, version.

Settings apply immediately where safe. Calibration has its own guided sheet.

## 4.24 Profile

- avatar and equipped Spermy;
- display name;
- level and XP;
- stats by mode;
- achievements/badges later;
- recent challenges;
- account status;
- privacy controls.

Avoid presenting medically themed or embarrassing statistics.

## 4.25 Onboarding

Use four concise interactive cards:

1. **Shake to charge** — fill the meter.
2. **Stop in the green zone** — nail a perfect launch.
3. **Tilt to steer** — dodge while not shaking.
4. **Shake means straight** — speed up, then release to aim.

Follow with a short safe practice lane. Ask for motion permission immediately before demonstrating motion, not on app launch without context.

## 4.26 Screen-state completeness

Every data-driven screen considers:

- loading;
- first-time empty;
- offline;
- recoverable error;
- permission denied;
- locked;
- disabled;
- success;
- stale data;
- reduced-motion;
- safe-area extremes.

## 4.27 UI acceptance checklist

- Primary action is obvious in two seconds.
- No race-critical content occupies the center.
- Touch targets meet minimum size.
- Text remains readable during physical movement.
- State is not indicated by color alone.
- Prices, rewards, and locks are explicit.
- Back behavior is predictable.
- Narrow and tall portrait layouts pass.
- Motion permission denial has a clear fallback.

