#!/usr/bin/env python3
"""ai_editor.py yaması: concept_prompt topic kuralına ve manşet seçim promptuna eklenir.

content_mode generate olmayan sitede haber yeniden yazılmaz (curate: kaynak metin + link).
Global AI_EDITOR_REWRITE=0 da yazımı kapalı tutar.

  python3 patch_concept_prompt.py --self-test
  python3 patch_concept_prompt.py [/yol/ai_editor.py]
"""
from __future__ import annotations

import sys

SITE_REWRITES = '''
def site_rewrites(cn):
    # Yeniden yazım yalnız content_mode=generate ve AI_EDITOR_REWRITE=1 iken.
    # curate (varsayılan) ve boş mod: kaynak metin + link; AI yalnızca manşet ve kategori seçer.
    mode = str(getattr(cn, "content_mode", None) or "curate").strip().lower()
    return bool(REWRITE) and mode == "generate"


'''

COLS_OLD = '"preferred_sources", "topic_rule")]'
COLS_NEW = '"preferred_sources", "topic_rule", "concept_prompt", "content_mode")]'

ROWS_OLD = 'rows = [dict(zip(cols, r)) for r in con.execute("SELECT %s FROM hm_ai_editor_sites ORDER BY site_id" % ",".join(cols))]'
ROWS_NEW = '''_editor_cols = list(cols)
    try:
        rows = [dict(zip(_editor_cols, r)) for r in con.execute("SELECT %s FROM hm_ai_editor_sites ORDER BY site_id" % ",".join(_editor_cols))]
    except Exception as _ex:
        log("  hm_ai_editor_sites concept_prompt/content_mode okunamadı (%s); eski kolonlarla devam" % str(_ex)[:140])
        _editor_cols = [c for c in _editor_cols if c not in ("concept_prompt", "content_mode")]
        rows = [dict(zip(_editor_cols, r)) for r in con.execute("SELECT %s FROM hm_ai_editor_sites ORDER BY site_id" % ",".join(_editor_cols))]'''

RULE_OLD = (
    '    rule = (getattr(cn, "topic_rule", None) or "").strip()\n'
    '    user = (("KESİN KONU KURALI: %s\\nBu kurala uymayan adayı ASLA seçme; uygun aday azsa daha az seç, hiç yoksa boş liste döndür.\\n\\n" % rule) if (STRICT_TOPIC and rule) else "") + \\\n'
    '           ("Site: %s (konsept: %s; öncelikli kategoriler: %s; konular: %s)\\n"'
)
RULE_NEW = (
    '    rule = (getattr(cn, "topic_rule", None) or "").strip()\n'
    '    concept = (getattr(cn, "concept_prompt", None) or "").strip()\n'
    '    if concept:\n'
    '        rule = (rule + "\\n" + concept).strip() if rule else concept\n'
    '    user = (("KESİN KONU KURALI: %s\\nBu kurala uymayan adayı ASLA seçme; uygun aday azsa daha az seç, hiç yoksa boş liste döndür.\\n\\n" % rule) if (STRICT_TOPIC and rule) else "") + \\\n'
    '           (("SİTE KONSEPTİ / İÇERİK TALİMATI: %s\\nBu talimata uymayan adayı seçme.\\n\\n" % concept) if concept else "") + \\\n'
    '           ("Site: %s (konsept: %s; öncelikli kategoriler: %s; konular: %s)\\n"'
)

REWRITE_CALL_OLD = "if REWRITE else curate_result(it)"
REWRITE_CALL_NEW = "if site_rewrites(cn) else curate_result(it)"

CREDIT_OLD = 'credit, (not REWRITE), it["category_slug"]'
CREDIT_NEW = 'credit, (not site_rewrites(cn)), it["category_slug"]'

PICK_CAP_OLD = "pick_cap = todo if REWRITE or args.no_ai else min(todo * 2, todo + 6)"
PICK_CAP_NEW = "pick_cap = todo if site_rewrites(cn) or args.no_ai else min(todo * 2, todo + 6)"

PICK_IF_OLD = "if not REWRITE and not args.no_ai and picks and (len(picks) > todo or STRICT_TOPIC):"
PICK_IF_NEW = "if not site_rewrites(cn) and not args.no_ai and picks and (len(picks) > todo or STRICT_TOPIC):"

# Yama öncesi ai_editor.py parçası (curate + strict topic). Öz-test bunu dönüştürür.
FIXTURE = '''REWRITE = os.environ.get("AI_EDITOR_REWRITE", "0") == "1"
# 2026-10-08 user rule: strict per-site topics. Off-topic items are never placed.
STRICT_TOPIC = os.environ.get("AI_STRICT_TOPIC", "1") == "1"
REPORT_DIR = "/reports"

def load_sites(con, args):
    cols = [d for d in ("site_id", "site_slug", "domain", "concept_type", "cities", "districts", "regions",
                        "nearby_cities", "keywords", "exclude_keywords", "categories", "exclude_categories",
                        "exclusive_group", "daily_manset_target", "min_score", "enabled", "keyword_groups", "preferred_sources", "topic_rule")]
    rows = [dict(zip(cols, r)) for r in con.execute("SELECT %s FROM hm_ai_editor_sites ORDER BY site_id" % ",".join(cols))]
    return rows

def run():
    pick_cap = todo if REWRITE or args.no_ai else min(todo * 2, todo + 6)
    if not REWRITE and not args.no_ai and picks and (len(picks) > todo or STRICT_TOPIC):
        picks = ai_pick_manset(cfg, cn, picks, todo, sst)
    res = (lib.rewrite(cfg, it["title"], it["spot"], it["paras"],
                       focus=(dev["title"], dev["note"]) if dev and dev.get("note") else None)
           if REWRITE else curate_result(it))
    credit_line = it["image_url"], credit, (not REWRITE), it["category_slug"]

def ai_pick_manset(cfg, cn, picks, todo, sst):
    rule = (getattr(cn, "topic_rule", None) or "").strip()
    user = (("KESİN KONU KURALI: %s\\nBu kurala uymayan adayı ASLA seçme; uygun aday azsa daha az seç, hiç yoksa boş liste döndür.\\n\\n" % rule) if (STRICT_TOPIC and rule) else "") + \\
           ("Site: %s (konsept: %s; öncelikli kategoriler: %s; konular: %s)\\n"
            "Bu siteye en uygun haberi seç.\\n" % (cn.domain,))
    return user
'''


def _replace(src: str, old: str, new: str, label: str) -> str:
    if old not in src:
        if new in src:
            return src
        raise SystemExit("eksik çapa (%s): %s" % (label, old[:80]))
    return src.replace(old, new, 1)


def apply(src: str) -> str:
    if "def site_rewrites(" not in src:
        anchor = 'STRICT_TOPIC = os.environ.get("AI_STRICT_TOPIC", "1") == "1"\n'
        if anchor not in src:
            raise SystemExit("eksik çapa: STRICT_TOPIC")
        src = src.replace(anchor, anchor + SITE_REWRITES, 1)
    src = _replace(src, COLS_OLD, COLS_NEW, "kolonlar")
    src = _replace(src, ROWS_OLD, ROWS_NEW, "load_sites")
    src = _replace(src, PICK_CAP_OLD, PICK_CAP_NEW, "pick_cap")
    src = _replace(src, PICK_IF_OLD, PICK_IF_NEW, "ai_pick")
    src = _replace(src, RULE_OLD, RULE_NEW, "manşet prompt")
    src = _replace(src, REWRITE_CALL_OLD, REWRITE_CALL_NEW, "rewrite")
    src = _replace(src, CREDIT_OLD, CREDIT_NEW, "credit")
    return src


def self_test() -> None:
    out = apply(FIXTURE)
    assert "def site_rewrites(" in out
    assert 'mode == "generate"' in out
    assert '"concept_prompt", "content_mode"' in out
    assert "SİTE KONSEPTİ / İÇERİK TALİMATI" in out
    assert "if site_rewrites(cn) else curate_result(it)" in out
    assert "(not site_rewrites(cn))" in out
    assert "concept_prompt" in out.split("def ai_pick_manset", 1)[1]
    # concept metni topic_rule ile birleşir
    assert 'rule + "\\n" + concept' in out or "rule + " in out
    again = apply(out)
    assert again == out, "yama ikinci kez değişti"
    curate = "mode = str(getattr(cn, \"content_mode\", None) or \"curate\").strip().lower()\n    return bool(REWRITE) and mode == \"generate\""
    assert curate in out
    print("ok")


def main() -> None:
    if "--self-test" in sys.argv:
        self_test()
        return
    path = "/docker/php-theme/ai-editor/ai_editor.py"
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if args:
        path = args[0]
    with open(path, encoding="utf-8") as f:
        src = f.read()
    out = apply(src)
    if out == src:
        print("zaten uygulanmış")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print("patched", path)


if __name__ == "__main__":
    main()
