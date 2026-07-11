#!/usr/bin/env python3
"""Fix common UTF-8/Latin-1 mojibake in Turkish UI strings."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Order matters: longer / more specific patterns first.
REPLACEMENTS: list[tuple[str, str]] = [
    ("ATAT├£RK KîŞESı", "ATATÜRK KÖŞESİ"),
    ("Başş Yap", "Bağış Yap"),
    ("mill├«", "millî"),
    ("Mill├«", "Millî"),
    ("bloşunun", "bloğunun"),
    ("bloşu", "bloğu"),
    ("saşlayıcı", "sağlayıcı"),
    ("sol/saş", "sol/sağ"),
    ("saş reklam", "sağ reklam"),
    ("saş liste", "sağ liste"),
    ("saş sidebar", "sağ sidebar"),
    ("saş blok", "sağ blok"),
    ("saş:", "sağ:"),
    ("görünürlüşü", "görünürlüğü"),
    ("görünürlüş", "görünürlük"),
    ("kaynaşını", "kaynağını"),
    ("kaynaşı", "kaynağı"),
    ("daşıtılır", "dağıtılır"),
    ("daşıtım", "dağıtım"),
    ("akşı kaynakları", "akışı kaynakları"),
    ("akşı kullanılır", "akışı kullanılır"),
    ("merkez akşa", "merkez akışa"),
    ("çalştırmak", "çalıştırmak"),
    ("isteşe", "isteğe"),
    ("uyumluluşu", "uyumluluğu"),
    ("hero başş", "hero bağış"),
    ("başş kutusu", "bağış kutusu"),
    ("alt başş", "alt bağış"),
    ("Başş", "Bağış"),
    ("başş", "bağış"),
    ("HM ", "HM ↔"),
    ("Genel ayarlar ", "Genel ayarlar ↔"),
    ("┬½", "«"),
    ("┬╗", "»"),
    ("ÔÇĞ", "…"),
    ("ÔÇ£", "\u201c"),
    ("ÔÇØ", "\u201d"),
    ("ÔÇô", "–"),
    ("çalşıyor", "çalışıyor"),
    ("çalştırmak", "çalıştırmak"),
    ("┬»", "»"),
    ("┬À", "·"),
    ("├ù", "×"),
    ("┬ğ", "§"),
    ("Maşaza", "Mağaza"),
    ("­şù║´©Å", "🗺️"),
    (
        "/^[­şÅà­şÄô­şô£Ô¡É­şÄû´©ÅÔÇó\\-*]|\\bfa[\\s-]/i",
        "/^[🎖️🎓📜⭐•\\-*]|\\bfa[\\s-]/iu",
    ),
]

EXTENSIONS = {".ts", ".tsx", ".css", ".md"}


def fix_text(text: str) -> tuple[str, int]:
    count = 0
    for old, new in REPLACEMENTS:
        if old in text:
            n = text.count(old)
            text = text.replace(old, new)
            count += n
    return text, count


def main() -> int:
    total_files = 0
    total_replacements = 0
    for path in sorted(ROOT.rglob("*")):
        if path.suffix not in EXTENSIONS:
            continue
        if "node_modules" in path.parts or "dist" in path.parts or "public/yektube" in str(path):
            continue
        raw = path.read_text(encoding="utf-8")
        fixed, n = fix_text(raw)
        if n:
            path.write_text(fixed, encoding="utf-8")
            total_files += 1
            total_replacements += n
            print(f"{path.relative_to(ROOT)}: {n}")
    print(f"Done: {total_files} files, {total_replacements} replacements")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
