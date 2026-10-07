#!/usr/bin/env python3
"""gundemi.org kaynak logosundan 8 bölgesel PNG üretir (globe + bölge + gündemi.org)."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

NAVY = (11, 51, 98, 255)
RED = (192, 0, 5, 255)

REGIONS = [
    ("ege", "ege"),
    ("marmara", "marmara"),
    ("karadeniz", "karadeniz"),
    ("icanadolu", "iç anadolu"),
    ("doguanadolu", "doğu anadolu"),
    ("guneydogu", "güneydoğu"),
    ("akdeniz", "akdeniz"),
    ("kibris", "kıbrıs"),
]


def extract_globe(im: Image.Image) -> Image.Image:
    w, h = im.size
    pixels = im.load()

    def navy_count(x: int) -> int:
        c = 0
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if a > 200 and r < 60 and g < 90 and b > 70 and b > r + 30:
                c += 1
        return c

    gap_start = 200
    for x in range(180, min(400, w)):
        if navy_count(x) < 8:
            gap_start = x
            break
    text_start = gap_start + 20
    for x in range(gap_start, min(500, w)):
        if navy_count(x) > 25:
            text_start = x
            break
    end = max(text_start - 8, 220)
    globe = im.crop((25, 45, end, 310)).copy()
    gp = globe.load()
    gw, gh = globe.size
    for x in range(max(0, gw - 40), gw):
        col_navy = sum(
            1
            for y in range(gh)
            if gp[x, y][3] > 200 and gp[x, y][0] < 60 and gp[x, y][2] > 70
        )
        if col_navy > gh * 0.35:
            for y in range(gh):
                gp[x, y] = (255, 255, 255, 0)
    return globe


def make_logo(globe: Image.Image, region_label: str, font_path: str) -> Image.Image:
    gh = 200
    gw = int(globe.width * gh / globe.height)
    g = globe.resize((gw, gh), Image.Resampling.LANCZOS)
    left_text = f"{region_label} gündemi"
    size = 68
    while size >= 36:
        font_main = ImageFont.truetype(font_path, size)
        font_org = ImageFont.truetype(font_path, size)
        tmp = Image.new("RGBA", (10, 10))
        d = ImageDraw.Draw(tmp)
        bb1 = d.textbbox((0, 0), left_text, font=font_main)
        bb2 = d.textbbox((0, 0), ".org", font=font_org)
        tw = (bb1[2] - bb1[0]) + (bb2[2] - bb2[0]) + 4
        if tw < 820:
            break
        size -= 2

    pad_l, pad_r, pad_t, pad_b = 16, 36, 28, 40
    gap = 18
    canvas_w = pad_l + gw + gap + tw + pad_r
    canvas_h = max(gh + pad_t + pad_b, 260)
    out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    gy = (canvas_h - gh) // 2 - 4
    out.paste(g, (pad_l, gy), g)
    draw = ImageDraw.Draw(out)
    tx = pad_l + gw + gap
    bb1 = draw.textbbox((0, 0), left_text, font=font_main)
    th = bb1[3] - bb1[1]
    ty = (canvas_h - th) // 2 - 4
    draw.text((tx, ty), left_text, font=font_main, fill=NAVY)
    bb1 = draw.textbbox((tx, ty), left_text, font=font_main)
    draw.text((bb1[2] + 1, ty), ".org", font=font_org, fill=RED)
    y_line = max(ty + th + 12, gy + gh - 28)
    x0 = pad_l + int(gw * 0.15)
    x1 = bb1[2] - 4
    thick0 = 7
    draw.polygon(
        [(x0, y_line - thick0 // 2), (x1, y_line), (x0, y_line + thick0 // 2 + 1)],
        fill=RED,
    )
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument(
        "--font",
        default="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    )
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    src = Image.open(args.source).convert("RGBA")
    src.save(args.out / "gundemi-org.png")
    globe = extract_globe(src)
    for slug, label in REGIONS:
        logo = make_logo(globe, label, args.font)
        logo.save(args.out / f"{slug}-gundemi.png", "PNG")
        print("wrote", slug, logo.size)


if __name__ == "__main__":
    main()
