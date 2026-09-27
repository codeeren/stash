#!/usr/bin/env python3
"""Generates the Stash "Cursor-S" logo masters (symbol, small-size cut,
wordmark, lockups, app icon, tray icon) as clean SVG paths.

Run from anywhere: python3 docs/Logos/v2/build_kit.py
Output: docs/Logos/v2/kit/svg/
"""
from pathlib import Path

OUT = Path(__file__).parent / "kit" / "svg"
OUT.mkdir(parents=True, exist_ok=True)

# Palette
INDIGO = "#4636D6"  # Stash Indigo — primary
INK = "#17162B"     # Ink — wordmark / text on light
AMBER = "#FFB224"   # Cursor Amber — accent, only on dark / indigo grounds
PAPER = "#F7F6F2"   # Paper — light ground
WHITE = "#FFFFFF"


def s_path(top, bar, gap, bowl, cx_l, cx_r, arm_end, left, right):
    """A folded S: three horizontal bars joined by two elliptical bowls.
    bar = horizontal thickness, gap = counter height, bowl = extra bowl
    weight (bowl stroke = bar + bowl, horizontal thinning)."""
    ri = gap / 2
    ry = bar + gap / 2
    rx = ri + bar + bowl
    y1, y2, y3 = top, top + bar + gap, top + 2 * (bar + gap)
    b = y3 + bar
    f = lambda v: f"{v:g}"
    return (
        f"M{f(arm_end)} {f(y1)} V{f(y1 + bar)} H{f(cx_l)} "
        f"A{f(ri)} {f(ri)} 0 0 0 {f(cx_l)} {f(y2)} H{f(cx_r)} "
        f"A{f(rx)} {f(ry)} 0 0 1 {f(cx_r)} {f(b)} H{f(left)} V{f(y3)} H{f(cx_r)} "
        f"A{f(ri)} {f(ri)} 0 0 0 {f(cx_r)} {f(y2 + bar)} H{f(cx_l)} "
        f"A{f(rx)} {f(ry)} 0 0 1 {f(cx_l)} {f(y1)} Z"
    )


# Master symbol (256 grid): bars 42, counters 25, bowls 46 wide (+4 thinning
# compensation), bowls overshoot the flat terminals by 3.5 units.
SYMBOL_S = s_path(top=40, bar=42, gap=25, bowl=4, cx_l=95, cx_r=161,
                  arm_end=156, left=40, right=216)
SYMBOL_CURSOR = (180, 40, 36, 42)  # x, y, w, h — gap to arm = 24 ≈ counter

# Small-size cut (≤ 24 px): lighter bars, opened counters and cursor gap.
SMALL_S = s_path(top=42, bar=36, gap=32, bowl=4, cx_l=94, cx_r=162,
                 arm_end=146, left=40, right=216)
SMALL_CURSOR = (180, 42, 36, 36)


def rect_path(x, y, w, h):
    return f"M{x} {y} H{x + w} V{y + h} H{x} Z"


def symbol_group(s, cursor, s_fill, c_fill):
    return (f'<path fill="{s_fill}" d="{s}"/>'
            f'<path fill="{c_fill}" d="{rect_path(*cursor)}"/>')


# ---------------------------------------------------------------- wordmark
# Lowercase letters built on the same fold logic as the symbol.
# x-height 120, horizontals 24, bowls 26, inner radius 12, ascender 48.
T, B = 48, 168  # x-height top / baseline in wordmark space (asc top = 0)


def g_s(x):
    return (f"M{x+96} {T} V{T+24} H{x+38} A12 12 0 0 0 {x+38} {T+48} H{x+62} "
            f"A38 36 0 0 1 {x+62} {B} H{x+4} V{B-24} H{x+62} "
            f"A12 12 0 0 0 {x+62} {T+72} H{x+38} A38 36 0 0 1 {x+38} {T} Z")


def g_t(x):
    return (f"M{x+16} {T-36} H{x+42} V{T} H{x+68} V{T+24} H{x+42} V{B-36} "
            f"A12 12 0 0 0 {x+54} {B-24} H{x+72} V{B} H{x+52} "
            f"A36 36 0 0 1 {x+16} {B-36} V{T+24} H{x} V{T} H{x+16} Z")


def g_a(x):
    return (f"M{x+8} {T} H{x+68} A36 36 0 0 1 {x+104} {T+36} V{B} H{x+38} "
            f"A38 36 0 0 1 {x+38} {T+48} H{x+78} V{T+36} "
            f"A12 12 0 0 0 {x+66} {T+24} H{x+8} Z "
            f"M{x+78} {T+72} H{x+38} A12 12 0 0 0 {x+38} {B-24} H{x+78} Z")


def g_h(x):
    return (f"M{x} 0 H{x+26} V{T} H{x+68} A36 36 0 0 1 {x+104} {T+36} V{B} "
            f"H{x+78} V{T+36} A12 12 0 0 0 {x+66} {T+24} H{x+26} V{B} H{x} Z")


# Optically spaced advance positions
WORD = " ".join([g_s(0), g_t(114), g_a(198), g_s(320), g_h(440)])
WORD_W, WORD_H = 544, B


def svg(w, h, body, title="Stash logo", bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img"><title>{title}</title>'
            f'{rect}{body}</svg>\n')


def word_group(x, y, scale, fill):
    return (f'<g transform="translate({x:g} {y:g}) scale({scale:g})">'
            f'<path fill="{fill}" fill-rule="evenodd" d="{WORD}"/></g>')


def write(name, content):
    (OUT / name).write_text(content)


# Symbol
write("stash-symbol-color.svg", svg(256, 256, symbol_group(SYMBOL_S, SYMBOL_CURSOR, INDIGO, INDIGO)))
write("stash-symbol-ink.svg", svg(256, 256, symbol_group(SYMBOL_S, SYMBOL_CURSOR, INK, INK)))
write("stash-symbol-reversed.svg", svg(256, 256, symbol_group(SYMBOL_S, SYMBOL_CURSOR, WHITE, AMBER)))
write("stash-symbol-small.svg", svg(256, 256, symbol_group(SMALL_S, SMALL_CURSOR, INDIGO, INDIGO)))
write("stash-symbol-small-black.svg", svg(256, 256, symbol_group(SMALL_S, SMALL_CURSOR, "#000000", "#000000")))

# Wordmark
write("stash-wordmark-ink.svg", svg(WORD_W, WORD_H, f'<path fill="{INK}" fill-rule="evenodd" d="{WORD}"/>'))

# Horizontal lockup: symbol height 176 (40..216); wordmark scaled so the
# x-height centres on the symbol's middle bar and the baseline sits on 216.
SC = 0.76
wx = 216 + 44  # gap = 44 ≈ cursor-block width
wy = 216 - B * SC
HW = int(wx + WORD_W * SC + 40)


def horizontal(s_fill, c_fill, w_fill, bg=None):
    body = symbol_group(SYMBOL_S, SYMBOL_CURSOR, s_fill, c_fill) + word_group(wx, wy, SC, w_fill)
    return svg(HW, 256, body, bg=bg)


write("stash-horizontal-color.svg", horizontal(INDIGO, INDIGO, INK))
write("stash-horizontal-ink.svg", horizontal(INK, INK, INK))
write("stash-horizontal-reversed.svg", horizontal(WHITE, AMBER, WHITE))

# Stacked lockup: symbol on top, wordmark centred beneath.
SS = 0.62
sw = WORD_W * SS
stack_w = 360
sx = (stack_w - sw) / 2
sy = 256 - 8


def stacked(s_fill, c_fill, w_fill):
    body = (f'<g transform="translate({(stack_w - 256) / 2:g} 0)">'
            + symbol_group(SYMBOL_S, SYMBOL_CURSOR, s_fill, c_fill) + "</g>"
            + word_group(sx, sy, SS, w_fill))
    return svg(stack_w, int(sy + B * SS + 40), body)


write("stash-stacked-color.svg", stacked(INDIGO, INDIGO, INK))
write("stash-stacked-reversed.svg", stacked(WHITE, AMBER, WHITE))

# macOS app icon (1024 grid, 824 body at 100 offset, Big Sur+ template).
def app_icon(s, cursor):
    k = 0.56 * 824 / 176  # symbol content height → 56 % of the tile
    ox = 512 - 128 * k
    oy = 512 - 128 * k - 6
    return svg(1024, 1024,
               f'<rect x="100" y="100" width="824" height="824" rx="185" fill="{INDIGO}"/>'
               f'<g transform="translate({ox:.2f} {oy:.2f}) scale({k:.4f})">'
               + symbol_group(s, cursor, WHITE, AMBER) + "</g>",
               title="Stash app icon")


write("stash-app-icon-macos.svg", app_icon(SYMBOL_S, SYMBOL_CURSOR))

# Menu bar (tray) template: black on transparent, small-size cut, padded
# so the glyph is ~18 of 22 pt.
write("stash-tray-template.svg",
      svg(256, 256, f'<g transform="translate(128 128) scale(1.06) translate(-128 -128)">'
          + symbol_group(SMALL_S, SMALL_CURSOR, "#000000", "#000000") + "</g>",
          title="Stash menu bar icon"))

print("wrote", len(list(OUT.glob("*.svg"))), "SVGs to", OUT)

# App icon drawn with the small-size cut, for the 16/32 px slots of icon.icns.
write("stash-app-icon-macos-small.svg", app_icon(SMALL_S, SMALL_CURSOR))
