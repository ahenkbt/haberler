#!/usr/bin/env python3
"""ekonomi 2026-10-10: ekonomi.gundemi.org (slug ekonomi, "Ekonomi Gündemi") kurulum/onarım betiği — İDEMPOTENT.
Panelde site açıldığında (ya da --create ile) çalışır; her 5 dakikada cron'dan da çalışır:
  1. TP hm_news_sites'ta aktif slug='ekonomi' / domain='ekonomi.gundemi.org' satırını bulur (yoksa yalnız --create ile tohum satır açar;
     panel satırı gelince tohum satır gizlenir (active=false), silinmez).
  2. layout_json'a EKSİK anahtarları ekler (var olanı ezmez): PHP tema bayrakları, hmEco, renkler, künye, kaynak ayarı.
  3. eko-* kategorilerini (exclusive_site_id=site) yazar.
  4. AI Haber Editörü satırını (hm_ai_editor_sites) enabled=true açar (yoksa).
  5. RSS importer hedeflerini (targets-ns28.json) site id ile üretir.
Geri alma: cron dosyasını sil; satırı active=false yap; backups/eco-20261010/."""
import json, os, re, subprocess, sys

TARGETS = "/docker/php-theme/newsites28/targets-ns28.json"
SECTIONS = [  # slug, ad, renk
    ("eko-gundem", "Ekonomi Gündemi", "#c9a227"), ("eko-borsa", "Borsa ve Hisse", "#1e9e6a"), ("eko-doviz", "Döviz ve Kur", "#2f80c9"),
    ("eko-altin", "Altın ve Emtia", "#e0b13a"), ("eko-kripto", "Kripto Para", "#f08a24"), ("eko-banka-finans", "Bankacılık ve Finans", "#3d7bd9"),
    ("eko-makro", "Makro Ekonomi", "#8a63d2"), ("eko-sirketler", "Şirketler", "#16a2a8"), ("eko-sanayi-ihracat", "Sanayi ve Dış Ticaret", "#d0583a"),
    ("eko-enerji", "Enerji", "#e8792b"), ("eko-emlak", "Gayrimenkul", "#a0764a"), ("eko-tarim", "Tarım ve Gıda", "#5a9e3a"),
    ("eko-dunya", "Dünya Ekonomisi", "#4a6fa5"), ("eko-teknoloji", "Teknoloji ve Girişim", "#7a55c7"), ("eko-is-dunyasi", "İş Dünyası", "#b0892a"),
    ("eko-genel-gundem", "Türkiye Gündemi", "#6b7a8f"),
]
SLUGS = [s[0] for s in SECTIONS]
DESC = ("Ekonomi Gündemi: borsa, döviz, altın, kripto para, bankacılık ve finans, makro ekonomi, şirketler, enerji ve gayrimenkul haberleri; "
        "BIST 100, dolar, euro, gram altın, Brent ve Bitcoin canlı piyasa şeridi.")
KEYWORDS = ["ekonomi", "borsa", "bist", "hisse", "döviz", "dolar", "euro", "altın", "gümüş", "kripto", "bitcoin", "enflasyon", "faiz", "merkez bankası",
            "tcmb", "banka", "kredi", "ihracat", "ithalat", "sanayi", "şirket", "yatırım", "petrol", "brent", "enerji", "vergi", "asgari ücret", "konut", "kira", "tarım", "halka arz"]
RULE = ("Yalnızca ekonomi haberleri: borsa ve hisse, döviz ve kur, altın ve emtia, kripto para, bankacılık ve finans, makro ekonomi (enflasyon, büyüme, bütçe, vergi, ücret), "
        "şirketler ve yatırım, sanayi ve dış ticaret, enerji, gayrimenkul, tarım ve gıda, dünya ekonomisi, teknoloji ve girişim, iş dünyası. Spor, magazin, asayiş ve parti siyaseti seçilmez.")


def psql(sql, tuples=True):
    url = subprocess.run(["bash", "-c", '. /root/.hmdb.env && printf %s "$TP_URL"'], capture_output=True, text=True).stdout
    r = subprocess.run(["psql", url, "-X", "-A", "-t", "-F", "\x1f", "-v", "ON_ERROR_STOP=1", "-c", sql], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        raise SystemExit("psql: " + r.stderr[:400])
    return [l.split("\x1f") for l in r.stdout.splitlines() if l.strip()] if tuples else r.stdout


def lit(s):
    return "$q$" + s.replace("$q$", "") + "$q$"


def find_rows():
    rows = psql("select id,slug,coalesce(domain,''),active,coalesce(layout_json,''),coalesce(description,'') from hm_news_sites "
                "where slug='ekonomi' or lower(domain)='ekonomi.gundemi.org' order by id")
    out = []
    for r in rows:
        try:
            lay = json.loads(r[4]) if r[4] else {}
        except Exception:
            lay = {}
        out.append(dict(id=int(r[0]), slug=r[1], domain=r[2], active=r[3] == "t", layout=lay if isinstance(lay, dict) else {}, description=r[5]))
    return out


def defaults(kunye):
    return {
        "frontend": "php", "phpTheme": True, "hmSiteKind": "news", "hmEco": True, "hmVitrinTheme": "yenisafak",
        "hmPrimaryColor": "#0f3d2e", "hmSecondaryColor": "#c9a227", "hmNavBarBackground": "#0a1f33",
        "hmYsSlogan": "Piyasanın nabzı, ekonominin gündemi.", "logoUrl": "/brand/eco/eco-icon.svg", "faviconUrl": "/brand/eco/eco-icon.svg",
        "hmNewsRssSources": [0], "hybridRssEnabled": False, "hmNewsFooterEnabled": True, "hmNewsSliderEnabled": True, "hmCatTree": "off",
        "showPlatformNav": False, "hmNewsYsMarketsEnabled": True, "hmCategorySortSlugs": SLUGS, "hmNewsRssCategoryOnly": SLUGS,
        "hmNavOnlyCategorySlugs": SLUGS, "hmEcoRev": "eco-20261010",
        "hmYsKunye": kunye,
    }


def main():
    create = "--create" in sys.argv
    rows = find_rows()
    active = [r for r in rows if r["active"]]
    if not active:
        if not create:
            print("ekonomi: aktif site satırı yok (panelden açılmasını bekliyor; --create ile tohum açılır)")
            return
        kun = {"lead": "Piyasanın nabzı, ekonominin gündemi.", "email": "ekonomi@gundemi.org", "phone": "0532 229 18 92", "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
               "yayin": "EKONOMİ GÜNDEMİ", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara", "genelMudur": "Nail Türkoğlu", "yaziIsleri": "Melek Acar", "yayinYonetmeni": "Mustafa ÖZDEMİR"}
        lay = defaults(kun)
        lay["hmEcoSeed"] = True
        contact = {"phone": kun["phone"], "address": kun["address"], "email": kun["email"]}
        psql("insert into hm_news_sites (slug,domain,display_name,contact_json,layout_json,active,description) values ('ekonomi','ekonomi.gundemi.org','Ekonomi Gündemi',%s,%s,true,%s)"
             % (lit(json.dumps(contact, ensure_ascii=False)), lit(json.dumps(lay, ensure_ascii=False)), lit(DESC)), tuples=False)
        print("ekonomi: tohum satır açıldı")
        rows = find_rows(); active = [r for r in rows if r["active"]]
    site = max(active, key=lambda r: (not r["layout"].get("hmEcoSeed"), r["id"]))
    sid = site["id"]
    # 1b) panel satırı geldiyse eski tohum satırı gizle (silme yok)
    for r in active:
        if r["id"] != sid and r["layout"].get("hmEcoSeed"):
            psql("update hm_news_sites set active=false, updated_at=now() where id=%d" % r["id"], tuples=False)
            print("ekonomi: tohum satır %d gizlendi" % r["id"])
    # 2) layout: eksik anahtarlar
    kun = (site["layout"].get("hmYsKunye") or {})
    if not kun:
        base = psql("select coalesce(layout_json::jsonb->'hmYsKunye','{}'::jsonb)::text from hm_news_sites where id=1171")
        kun = json.loads(base[0][0]) if base else {}
        kun.update({"lead": "Piyasanın nabzı, ekonominin gündemi.", "email": "ekonomi@gundemi.org", "yayin": "EKONOMİ GÜNDEMİ"})
    add = {k: v for k, v in defaults(kun).items() if k not in site["layout"] or site["layout"][k] in (None, "", [], {})}
    if add:
        merged = dict(site["layout"]); merged.update(add)
        psql("update hm_news_sites set layout_json=%s, updated_at=now() where id=%d" % (lit(json.dumps(merged, ensure_ascii=False)), sid), tuples=False)
        print("ekonomi: layout anahtarları eklendi:", ",".join(sorted(add)))
    if not site["description"].strip():
        psql("update hm_news_sites set description=%s where id=%d and coalesce(description,'')=''" % (lit(DESC), sid), tuples=False)
    # 3) kategoriler
    vals = ",".join("(%d,%s,%s,%s,%d,%d)" % (sid * 100 + i + 1, lit(n), lit(s), lit(c), sid, i + 1) for i, (s, n, c) in enumerate(SECTIONS))
    psql("insert into categories (id,name,slug,color,exclusive_site_id,sort_order) select * from (values %s) v(id,name,slug,color,exclusive_site_id,sort_order) "
         "where not exists (select 1 from categories c where c.slug=v.slug and c.exclusive_site_id=v.exclusive_site_id) on conflict do nothing" % vals, tuples=False)
    # 4) AI editör
    arr = lambda xs: "ARRAY[%s]::text[]" % ",".join(lit(x) for x in xs)
    psql("insert into hm_ai_editor_sites (site_id,site_slug,domain,concept_type,keywords,categories,exclude_categories,daily_manset_target,min_score,enabled,notes,topic_rule) "
         "values (%d,'ekonomi','ekonomi.gundemi.org','topical',%s,%s,ARRAY['global']::text[],8,5,true,%s,%s) on conflict (site_id) do nothing"
         % (sid, arr(KEYWORDS), arr(SLUGS + ["ekonomi", "gundem"]), lit("AI Haber Editörü otomatik açıldı 2026-10-10 (Ekonomi Gündemi). concept:auto — konsept metni panelde site açıklaması/hmAiConcept ile güncellenir."), lit(RULE)), tuples=False)
    # 5) importer hedefleri
    os.makedirs(os.path.dirname(TARGETS), exist_ok=True)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import mktargets_ns28
    t = mktargets_ns28.build(sid)
    new = json.dumps(t, ensure_ascii=False, indent=1)
    if not os.path.exists(TARGETS) or open(TARGETS).read() != new:
        open(TARGETS, "w").write(new)
        print("ekonomi: importer hedefleri yazıldı (site %d, %d hedef)" % (sid, len(t)))
    print("ekonomi: tamam site_id=%d" % sid)


if __name__ == "__main__":
    main()
