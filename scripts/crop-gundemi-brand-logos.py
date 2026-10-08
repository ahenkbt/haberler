#!/usr/bin/env python3
"""Trim white/map background from gundemi regional brand JPGs → header PNG/WebP."""
from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image

HEADER_H = 268

DEFAULT_MAP = {
    "f46a180a-976f-43b0-9afa-073c25b7435b.jpg": "doguanadolu-gundemi",
    "bda97fdc-c2b5-48f4-8284-30ab03814015.jpg": "marmara-gundemi",
    "f808adf3-06ce-4204-9ba3-5c5d526502a8.jpg": "guneydogu-gundemi",
    "15f30dea-d35f-4069-a16a-011399c82fef.jpg": "karadeniz-gundemi",
    "6d8ce502-6193-49a4-a088-4f875c319c05.jpg": "ege-gundemi",
}


def is_bg(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 10:
        return True
    if r >= 245 and g >= 245 and b >= 245:
        return True
    if min(r, g, b) >= 235 and max(r, g, b) - min(r, g, b) <= 18:
        return True
    if (
        b >= 230
        and g >= 220
        and r >= 200
        and b >= r
        and (b - r) <= 40
        and max(r, g, b) - min(r, g, b) <= 45
    ):
        return True
    if r >= 210 and g >= 230 and b >= 240 and b > r + 5 and g > r:
        return True
    return False


def flood_clear(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if visited[i]:
            continue
        visited[i] = 1
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            continue
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                q.append((nx, ny))
    return im


def process(src: Path, stem: str, out_dirs: list[Path]) -> None:
    cleared = flood_clear(Image.open(src))
    box = cleared.split()[-1].getbbox()
    if not box:
        raise SystemExit(f"empty after clear: {src}")
    l, t, r, b = box
    pad = 8
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(cleared.width, r + pad)
    b = min(cleared.height, b + pad)
    cropped = cleared.crop((l, t, r, b))
    nw = max(1, int(round(cropped.width * (HEADER_H / cropped.height))))
    out = cropped.resize((nw, HEADER_H), Image.Resampling.LANCZOS)
    for d in out_dirs:
        d.mkdir(parents=True, exist_ok=True)
        out.save(d / f"{stem}.png", "PNG", optimize=True)
        if d.name == "logos" and "ahenkpress" in str(d):
            out.save(d / f"{stem}.webp", "WEBP", quality=90, method=6)
    print(f"{stem}: {out.size}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", type=Path, required=True, help="Directory with source JPGs")
    ap.add_argument(
        "--ahenk",
        type=Path,
        default=Path("goalgo/artifacts/ahenkpress/public/gundemi/logos"),
    )
    ap.add_argument(
        "--hostinger",
        type=Path,
        default=Path("hostinger/gundemi-bolge/assets/logos"),
    )
    args = ap.parse_args()
    for fname, stem in DEFAULT_MAP.items():
        src = args.assets / fname
        if not src.is_file():
            print(f"skip missing {src}")
            continue
        process(src, stem, [args.ahenk, args.hostinger])


if __name__ == "__main__":
    main()
