# Stash — logo usage guide

**The mark: Cursor-S.** One folded stroke forms an S, which is also three
stacked rows (a library). Its top terminal breaks off into a text cursor:
*type it once, Stash keeps it.*

## Files

| Need | File |
|---|---|
| Default logo (light backgrounds) | `svg/stash-horizontal-color.svg` |
| On dark / indigo backgrounds | `svg/stash-horizontal-reversed.svg` |
| One colour (print, stamps, embroidery) | `svg/stash-horizontal-black.svg`, `-white.svg`, `svg/stash-symbol-ink.svg` |
| Symbol only | `svg/stash-symbol-color.svg`, `-reversed.svg` |
| Stacked (square spaces) | `svg/stash-stacked-color.svg`, `-reversed.svg` |
| Wordmark only | `svg/stash-wordmark-ink.svg` |
| ≤ 24 px (favicon, menu bar) | `svg/stash-symbol-small.svg` — **always** use this cut at small sizes |
| macOS app icon | `svg/stash-app-icon-macos.svg`, `png/stash-app-icon-1024.png` |
| Menu bar template image | `tray/tray.png` (22 px), `tray/tray@2x.png` (44 px) |
| Website icons | `web/` (favicon.ico/svg, apple-touch, PWA icons, `head-snippet.html`) |
| PNG exports | `png/` |

All masters are pure paths: no live text, fonts, filters or rasters.
`../build_kit.py` regenerates every SVG from the geometry.

## Colour

| Name | HEX | RGB | Use |
|---|---|---|---|
| Stash Indigo | `#4636D6` | 70 54 214 | Symbol, app-icon tile, brand accents |
| Ink | `#17162B` | 23 22 43 | Wordmark and text on light grounds |
| Cursor Amber | `#FFB224` | 255 178 36 | **Only** the cursor block, **only** on Indigo or dark grounds |
| Paper | `#F7F6F2` | 247 246 242 | Light background |

Contrast: white on Indigo 7.6:1 · Amber on Indigo 4.2:1 · Ink on Paper 16.4:1.
Amber on white is 1.8:1, so never use Amber on light backgrounds.

## Clear space & minimum size

- **Clear space** = the width of the cursor block (≈ 20 % of the symbol's
  height) on every side.
- **Minimum size:** symbol 16 px (small cut below 24 px), horizontal lockup
  80 px wide, wordmark 56 px wide.

## Construction

256-unit grid · bars 42 · counters 25 · bowls 46 wide (horizontals thinned
for optical balance) · bowls overshoot flat ends by 3.5 · cursor 36 × 42,
gap 24 ≈ counter. The wordmark uses the same fold logic (x-height 120,
horizontals 24, bowls 26, inner radius 12).

## Motion

The cursor block may blink (on 530 ms / off 530 ms, like a macOS text cursor)
in loaders and launch animations. The S never moves.

## Don't

- Recolour the S amber, or use more than Indigo + Amber in one mark
- Close the gap between the S and the cursor, or move the cursor
- Use the master symbol below 24 px (use the small cut)
- Add shadows, gradients, outlines or 3D effects
- Stretch, rotate or re-typeset the wordmark in another font
- Place the colour logo on busy photos; use the one-colour white version

## Notes

- A trademark search has **not** been done; run one before a public launch.
- The wordmark letters are custom-drawn paths, so no font licence is needed.
