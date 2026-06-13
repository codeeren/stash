"""Production icon generator for Stash — hub-on-a-card-deck design.
Writes every macOS/Windows icon size + .icns + .ico + the tray template.
"""

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path("/Users/erenyilmaz/Desktop/Eren/Kodlama/Claude")
ICONS = ROOT / "src-tauri/icons"

SIZE = 1024
SS = 2
S = SIZE * SS

GRAD_TOP = (109, 123, 255)
GRAD_BOT = (67, 56, 202)
CARD_FRONT = (255, 255, 255)
CARD_BACK = (226, 230, 245)
INDIGO = (67, 56, 202)


def superellipse_mask(side, n=5.0):
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    a = side / 2.0
    cx = cy = S / 2.0
    for y in range(S):
        v = (y + 0.5 - cy) / a
        if abs(v) >= 1.0:
            continue
        half = a * (1.0 - abs(v) ** n) ** (1.0 / n)
        d.line([(cx - half, y), (cx + half, y)], fill=255)
    return m


def vertical_gradient(top, bot):
    grad = Image.new("RGB", (1, S))
    for y in range(S):
        t = y / (S - 1)
        grad.putpixel((0, y), tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return grad.resize((S, S))


def rounded_card(w, h, r, fill):
    pad = int(r * 2.2)
    tile = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    ds.rounded_rectangle([pad, pad + int(h * 0.04), pad + w, pad + h + int(h * 0.04)],
                         radius=r, fill=(20, 24, 60, 130))
    sh = sh.filter(ImageFilter.GaussianBlur(int(r * 0.8)))
    tile = Image.alpha_composite(tile, sh)
    body = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    db = ImageDraw.Draw(body)
    db.rounded_rectangle([pad, pad, pad + w, pad + h], radius=r, fill=fill + (255,))
    return Image.alpha_composite(tile, body)


def place_card(canvas, angle, cx, cy, w, h, r, fill):
    tile = rounded_card(w, h, r, fill).rotate(angle, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(tile, (int(cx - tile.width / 2), int(cy - tile.height / 2)))


def draw_hub(d, cx, cy, scale, color):
    R = int(scale * 0.36)
    w = max(2, int(scale * 0.058))
    rc = int(scale * 0.115)
    ro = int(scale * 0.090)
    outer = []
    for a in (-90, 30, 150):
        rad = math.radians(a)
        outer.append((cx + int(R * math.cos(rad)), cy + int(R * math.sin(rad))))
    for ox, oy in outer:
        d.line([(cx, cy), (ox, oy)], fill=color, width=w, joint="curve")
    for ox, oy in outer:
        d.ellipse([ox - ro, oy - ro, ox + ro, oy + ro], fill=color)
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=color)


def build_app_icon():
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    side = int(0.82 * S)
    mask = superellipse_mask(side)
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sm = mask.filter(ImageFilter.GaussianBlur(int(0.018 * S)))
    shadow.paste(Image.new("RGBA", (S, S), (15, 18, 45, 110)), (0, int(0.012 * S)), sm)
    canvas = Image.alpha_composite(canvas, shadow)
    grad = vertical_gradient(GRAD_TOP, GRAD_BOT).convert("RGBA")
    grad.putalpha(mask)
    canvas = Image.alpha_composite(canvas, grad)
    sheen = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sg = Image.new("L", (1, S), 0)
    for y in range(S):
        t = y / (S - 1)
        sg.putpixel((0, y), max(0, int(70 * (1 - t * 2.2))))
    sg = sg.resize((S, S))
    sheen.paste(Image.new("RGBA", (S, S), (255, 255, 255, 255)), (0, 0),
                Image.composite(sg, Image.new("L", (S, S), 0), mask))
    canvas = Image.alpha_composite(canvas, sheen)
    cw, ch, cr = int(0.285 * S), int(0.40 * S), int(0.045 * S)
    cx0, cy0 = S // 2, int(0.55 * S)
    place_card(canvas, 16, cx0 - int(0.11 * S), cy0 + int(0.015 * S), cw, ch, cr, CARD_BACK)
    place_card(canvas, -16, cx0 + int(0.11 * S), cy0 + int(0.015 * S), cw, ch, cr, CARD_BACK)
    place_card(canvas, 0, cx0, cy0 - int(0.01 * S), cw, ch, cr, CARD_FRONT)
    gl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw_hub(ImageDraw.Draw(gl), cx0, cy0 - int(0.01 * S), int(0.31 * S), INDIGO + (255,))
    canvas = Image.alpha_composite(canvas, gl)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def build_tray():
    T = 512
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    cw, ch, cr = int(0.40 * T), int(0.56 * T), int(0.07 * T)
    stroke = int(0.052 * T)

    def card(angle, dx, dy):
        tile = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        x0, y0 = (T - cw) // 2, (T - ch) // 2
        td.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=cr,
                             fill=(0, 0, 0, 0), outline=(0, 0, 0, 255), width=stroke)
        img.alpha_composite(tile.rotate(angle, resample=Image.BICUBIC, expand=False), (dx, dy))

    card(16, int(-0.11 * T), int(0.015 * T))
    card(-16, int(0.11 * T), int(0.015 * T))
    card(0, 0, int(-0.01 * T))
    fd = ImageDraw.Draw(img)
    x0, y0 = (T - cw) // 2, (T - ch) // 2 - int(0.01 * T)
    fd.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=cr,
                         fill=(0, 0, 0, 0), outline=(0, 0, 0, 255), width=stroke)
    return img


def rz(img, n):
    return img.resize((n, n), Image.LANCZOS)


master = build_app_icon()
master.save(ROOT / "docs/Logos/app-icon-source.png")

rz(master, 32).save(ICONS / "32x32.png")
rz(master, 64).save(ICONS / "64x64.png")
rz(master, 128).save(ICONS / "128x128.png")
rz(master, 256).save(ICONS / "128x128@2x.png")
rz(master, 1024).save(ICONS / "icon.png")
for s in [30, 44, 71, 89, 107, 142, 150, 284, 310]:
    rz(master, s).save(ICONS / f"Square{s}x{s}Logo.png")
rz(master, 50).save(ICONS / "StoreLogo.png")
master.save(ICONS / "icon.ico", format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

ISET = Path("/tmp/icon.iconset")
ISET.mkdir(exist_ok=True)
for f in ISET.iterdir():
    f.unlink()
for s, name in [(16, "icon_16x16.png"), (32, "icon_16x16@2x.png"), (32, "icon_32x32.png"),
                (64, "icon_32x32@2x.png"), (128, "icon_128x128.png"), (256, "icon_128x128@2x.png"),
                (256, "icon_256x256.png"), (512, "icon_256x256@2x.png"), (512, "icon_512x512.png"),
                (1024, "icon_512x512@2x.png")]:
    rz(master, s).save(ISET / name)
subprocess.run(["iconutil", "-c", "icns", str(ISET), "-o", str(ICONS / "icon.icns")], check=True)

tray = build_tray()
rz(tray, 44).save(ICONS / "tray@2x.png")
rz(tray, 22).save(ICONS / "tray.png")
print("OK — all icons written")
