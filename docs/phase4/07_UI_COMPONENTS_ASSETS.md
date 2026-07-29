# UI Components and Asset Production

## 1. Rendering boundary

- Race world and existing HUD: Canvas2D.
- Splash, onboarding, Hub, Store, Profile, navigation, and modals: DOM/CSS.
- Reuse accepted transparent mascot/cosmetic assets in DOM with the same z-order.
- Do not rasterize text into screen backgrounds.

## 2. Token contract

```css
:root {
  --color-void: #0d0305;
  --color-bg-1: #210710;
  --color-bg-2: #42101f;
  --color-membrane: #7c1836;
  --color-membrane-dark: #4a0d1f;
  --color-flesh: #d1607c;
  --color-pale: #f8ecdb;
  --color-pale-dim: #d9c6b2;
  --color-energy: #43e0cf;
  --color-go: #7cff9f;
  --color-warm: #ffce97;
  --color-gold: #ffd24d;
  --color-danger: #ff6a5c;
  --color-text: #ffe6dc;
  --color-muted: #c6959e;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --radius-pill: 999px;
  --radius-control: 14px;
  --radius-panel: 18px;
  --radius-modal: 24px;

  --control-min: 44px;
  --button-height: 56px;
}
```

## 3. Reusable DOM components

### App-level

- `AppShell`
- `SafeArea`
- `TopAccountBar`
- `BottomNav`
- `OfflineBanner`
- `ToastRegion`
- `ModalHost`
- `LoadingState`
- `ErrorState`
- `EmptyState`

### Controls

- `PrimaryButton`
- `SecondaryButton`
- `GoldButton`
- `IconButton`
- `Chip`
- `SegmentedTabs`
- `CurrencyPill`
- `XPBar`
- `LevelBadge`
- `RarityBadge`
- `Toggle`
- `Slider`

### Content

- `ModeCard`
- `CosmeticCard`
- `CharacterPreview`
- `StatCard`
- `RecordRow`
- `AccountStatusCard`
- `PurchaseConfirmModal`
- `LevelUpModal`

## 4. Component state contract

Every interactive control supports:

- default;
- hover only where pointer exists;
- focus-visible;
- pressed;
- disabled;
- loading;
- success where relevant;
- error where relevant.

State is never communicated by color alone.

## 5. Character preview

DOM stack:

```text
trail        z 10
base body    z 20
face         z 30
glasses      z 40
mouth        z 50
hat          z 60
aura         z 70
```

All layers use the accepted 512×768 canonical canvas and identical CSS bounds. No per-item offset code.

## 6. Phase 4 visual assets

Identity:

- app icon and Android adaptive layers;
- wordmark and compact wordmark;
- splash canal glow;
- splash particles.

UI icons:

- Home;
- Customize;
- Store;
- Profile;
- Settings;
- coins;
- gems;
- XP;
- account/cloud;
- offline;
- lock;
- check;
- back;
- close.

Mode icons:

- Quick Race;
- Practice;
- Multiplayer;
- Challenge;
- Endless;
- Daily.

Screen reference comps:

- Splash;
- Intro final frame;
- onboarding cards 1–4;
- Main Hub guest;
- Main Hub returning;
- Store;
- Profile.

## 7. Asset format

- Simple icons: SVG.
- Soft organic glows and premium 2.5D art: transparent sRGB PNG.
- Full reference comps: 1080×1920 PNG.
- App icon: 1024×1024 plus Android adaptive foreground/background.
- Fonts: exact Google Fonts names or locally licensed WOFF2.

## 8. Responsive layout

CSS breakpoints use available height, not desktop width assumptions:

- compact: height below 700 CSS px;
- standard: 700–899;
- tall: 900 and above;
- tablet portrait: width above 600, but content max-width remains phone-like.

Hub and Store may scroll. Critical primary actions should remain reachable without scrolling on standard phones.

## 9. Production rule

Full-screen mockups are references, not flattened implementation assets. Claude Code builds responsive DOM/CSS from components and uses separate supplied graphics.
