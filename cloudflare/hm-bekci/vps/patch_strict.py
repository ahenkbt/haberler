import re, sys
p = "/docker/php-theme/ai-editor/ai_editor.py"
s = open(p, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    assert s.count(old) >= 1, ("missing", old[:80])
    s = s.replace(old, new, count)

# 1) config flag + topic_rule column
rep('REWRITE = os.environ.get("AI_EDITOR_REWRITE", "0") == "1"\n',
    'REWRITE = os.environ.get("AI_EDITOR_REWRITE", "0") == "1"\n'
    '# 2026-10-08 user rule: strict per-site topics. Off-topic items are never placed.\n'
    'STRICT_TOPIC = os.environ.get("AI_STRICT_TOPIC", "1") == "1"\n')
rep('"exclusive_group", "daily_manset_target", "min_score", "enabled", "keyword_groups", "preferred_sources")]\n    rows =',
    '"exclusive_group", "daily_manset_target", "min_score", "enabled", "keyword_groups", "preferred_sources", "topic_rule")]\n    rows =')

# 2) strict place gate (title/spot/feed only) for city/regional
rep('''        if cn.need_place and not hits and not near:
            return 0, ["yer yok"], False''',
'''        if cn.need_place and not hits and not near:
            return 0, ["yer yok"], False
        if STRICT_TOPIC and cn.concept_type == "regional" and not ({"yer:başlık", "yer:spot", "yer:feed"} & set(why)):
            return 0, ["yer yok (katı: başlık/spot/feed)"], False''')

# 3) strict keyword gate for topical / kamu_yerel
rep('''        if cn.concept_type == "topical" and not (kt or ks) and it["category_slug"] not in cn.categories:
            return 0, ["konu yok"], False''',
'''        if cn.concept_type == "topical" and not (kt or ks) and it["category_slug"] not in cn.categories:
            return 0, ["konu yok"], False
        if STRICT_TOPIC and cn.concept_type in ("topical", "kamu_yerel") and not (kt or ks):
            return 0, ["konu yok (katı: başlık/spot)"], False
        if STRICT_TOPIC and cn.concept_type == "kamu_yerel" and PROV_RE and not PROV_RE.search(fold(title + " " + spot + " " + head)) \\
                and not (cn.place_re and cn.place_re.search(fold(title + " " + spot))):
            return 0, ["yerel değil (il/ilçe yok)"], False''')

# 4) AI pick: always consult when there are picks; strict topic rule; empty selection = none fit
rep('''        if not REWRITE and not args.no_ai and len(picks) > todo:
            picks = ai_pick_manset(cfg, cn, picks, todo, sst)''',
'''        if not REWRITE and not args.no_ai and picks and (len(picks) > todo or STRICT_TOPIC):
            picks = ai_pick_manset(cfg, cn, picks, todo, sst)''')
rep('''    user = ("Site: %s (konsept: %s; öncelikli kategoriler: %s; konular: %s)\\n"
            "Bu siteye en uygun, en güçlü ve en yeni %d haberi manşet için önem sırasıyla seç.\\n"''',
'''    rule = (getattr(cn, "topic_rule", None) or "").strip()
    user = (("KESİN KONU KURALI: %s\\nBu kurala uymayan adayı ASLA seçme; uygun aday azsa daha az seç, hiç yoksa boş liste döndür.\\n\\n" % rule) if (STRICT_TOPIC and rule) else "") + \\
           ("Site: %s (konsept: %s; öncelikli kategoriler: %s; konular: %s)\\n"
            "Bu siteye en uygun, en güçlü ve en yeni %d haberi manşet için önem sırasıyla seç.\\n"''')
rep('''    if not order:
        sst["ai_pick"] = "empty"
        return picks[:todo]''',
'''    if not order:
        sst["ai_pick"] = "empty"
        if STRICT_TOPIC and isinstance(d, dict) and isinstance(d.get("secim"), list):
            log("  [%s] AI: konuya uygun aday yok (katı kural) — manşet eklenmedi" % cn.site_slug)
            return []
        return picks[:todo]''')
open(p, "w", encoding="utf-8").write(s)
print("patched")
