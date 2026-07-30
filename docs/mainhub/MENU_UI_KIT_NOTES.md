# Complete Menu UI Kit

The package now contains every visual building block required to reproduce the premium
menu without asking Claude Code to invent frames, buttons, or icons.

## Component assets

`assets/menu/components/` contains 24 standalone production SVGs:

- top account frame;
- track-window frame;
- avatar frame;
- level badge;
- XP frame and fill;
- currency pill and plus button;
- primary button: normal, pressed, disabled;
- distance chip: normal, selected, locked;
- four color-coded mode-card frames;
- daily challenge card;
- bottom navigation frame and active tab disc;
- teal, coral, and gold status pills.

The same components are also available as symbols in
`assets/menu/menu-components.svg`.

## Icons

- `assets/menu/art_icons/`: premium dimensional Practice, Multiplayer, Challenge,
  Endless, Daily, Coin, and Gem art.
- `assets/menu/icons/`: 17 small utility/navigation icons.
- `assets/menu/menu-wordmark.svg`: scalable game wordmark.

## Preview

`reference/05-menu-ui-elements-sheet.png` is a visual inventory. Black areas inside
the preview cells are transparent regions, not baked black rectangles.

## Implementation rule

Frames contain no text. Claude must place localized DOM text above them. This keeps
English and Slovenian sharp, accessible, and responsive.

Use `data/menu-ui-assets.json` for exact IDs, files, viewBoxes, and states.

