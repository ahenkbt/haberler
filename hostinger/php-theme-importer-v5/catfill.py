#!/usr/bin/env python3
"""catfill: keep thin/empty menu categories of the PHP news sites fed (INSERT-only into twilight-pine portal_rss_items).

targets.json: [{"site": <hm_news_sites.id>, "cat": "<category_slug>", "feeds": [url,...], "match": "<regex>"|null,
                "exclude": "<regex>"|null, "min": 12, "per_run": 6, "max_age": 21}]
Rules: every inserted row has a photo that really loads (HTTP 200/206 image/*, >= 4 KB, sent with the site's Referer;
feed photo first, else og:image); no photo -> not inserted. Same story already visible on the site (portal_rss_items of
the site/NULL/shared 230 pool, any category, last 45 days, plus news rows) -> skipped (link, guid, normalized title,
near-identical title). Sites 1 and 230 (230 is the shared pool vatanhaber also shows) honour hm_site_blocked_terms of
site 1. Corporate sites are refused. One short transaction per run under the importers' advisory lock.
"""
import hashlib, html, json, os, re, sys, time, unicodedata
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
import feedparser, requests, psycopg, ftfy, trafilatura
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import classifier as CL   # strict category/topic/city rules shared with recat.py and the AI Haber Editörü

DB = os.environ["IMPORT_DATABASE_URL"]
DRY = os.environ.get("IMPORT_DRY_RUN") == "1"
TARGETS = json.load(open(os.environ.get("CATFILL_TARGETS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "targets.json")), encoding="utf-8"))
ONLY = set(filter(None, os.environ.get("CATFILL_ONLY", "").split(",")))   # "site:cat" filter
MODE = os.environ.get("CATFILL_MODE", "daily")    # fill: up to max(min - have, per_run); daily: per_run
CORPORATE = {7, 11, 61}                            # vkd, trafik, tukav: never news
SHARED = 230
BLOCK_SITES = {1, 230}
SHARED_DEDUPE = [int(x) for x in os.environ.get("CATFILL_SHARED_DEDUPE", "230,1").split(",") if x.strip().isdigit()]
UA = "Mozilla/5.0 (compatible; TurkataHaberBot/1.0; +https://turkatahaber.com)"
S = requests.Session(); S.headers.update({"User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9"})
def log(*a): print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), *a, flush=True)
def fix(t): return ftfy.fix_text(html.unescape(t or "")).strip()
def text_of(h): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fix(h))).strip()
FOLD = str.maketrans({"I": "ı", "İ": "i"}); ASCII = str.maketrans("ığüşöçâîû", "igusocaiu")
def norm_title(t): return re.sub(r"[^a-z0-9]+", "", html.unescape(t or "").translate(FOLD).lower().translate(ASCII))
def title_key(t):
    t = t.lower().replace("ı", "i").replace("İ", "i"); t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c)); return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", t)).strip()
def canon_link(u):
    u = (u or "").strip().split("#", 1)[0].split("?", 1)[0].lower()
    u = re.sub(r"^[a-z]+://", "", u); u = re.sub(r"^(www\d?|m|amp|mobile)\.", "", u); u = re.sub(r"/amp/?$", "", u)
    return u.rstrip("/")
def trigrams(k): return {k[i:i + 3] for i in range(len(k) - 2)}
def sim(a, b):
    if a == b: return 1.0
    ga, gb = trigrams(a), trigrams(b)
    if not ga or not gb: return 0.0
    i = len(ga & gb); return i / (len(ga) + len(gb) - i)
def nums(k): return ",".join(re.findall(r"\d+", k))
TR_SAFE = {0x131: "\ue131", 0x130: "\ue130"}
TR_ONLY = re.compile(r"[ğĞıİşŞ]")
TR_HINT = re.compile(r"[çÇöÖüÜ]|\b(ve|bir|ile|için|gibi|olarak|sonra|kadar|daha|yeni|ilk|türkiye|ankara|istanbul|izmir|kktc)\b", re.I)
def is_turkish(t): return bool(TR_ONLY.search(t) or TR_HINT.search(t))

class Pool:
    def __init__(self): self.tk = set(); self.links = set(); self.head = {}
    def add(self, title, link):
        k = norm_title(title)
        if k: self.tk.add(k)
        if len(k) >= 20: self.head.setdefault(k[:14], []).append(k)
        if link: self.links.add(canon_link(link))
    def has(self, title, link, guid=""):
        k = norm_title(title)
        if canon_link(link) in self.links or (guid and canon_link(guid) in self.links) or k in self.tk: return True
        if len(k) >= 20:
            for o in self.head.get(k[:14], ()):
                if nums(o) == nums(k) and sim(o, k) >= 0.8: return True
        # same tail (sites often prefix "SON DAKİKA" etc.)
        return False

def entry_image(e, body):
    for key in ("media_content", "media_thumbnail"):
        for m in e.get(key) or []:
            u = m.get("url")
            if u and (m.get("medium") in (None, "image") or re.search(r"\.(jpe?g|png|webp|gif)", u, re.I)): return u
    for l in (e.get("links") or []) + (e.get("enclosures") or []):
        if (l.get("type") or "").startswith("image") and l.get("href"): return l["href"]
    m = re.search(r"<img[^>]+src=[\"']([^\"']+)", body or "", re.I)
    if m and m.group(1).startswith("http"): return html.unescape(m.group(1))
    v = e.get("image")
    if isinstance(v, dict) and v.get("href"): return v["href"]
    return None

_feeds = {}
def fetch_feed(u):
    try:
        r = S.get(u, timeout=20)
        if r.status_code != 200: return u, []
        return u, feedparser.parse(r.content).entries[:120]
    except Exception: return u, []

def fetch_listing(u):
    """'scrape:<listing url>' (haberler.com/belediye/, /muhtar/): article links, titles and listing thumbnails; og:image as fallback."""
    url = u[len("scrape:"):]
    try:
        r = S.get(url, timeout=20)
        if r.status_code != 200: return u, []
        host = re.match(r"https?://[^/]+", url).group(0)
        out, seen = [], set()
        for m in re.finditer(r'<a\b([^>]*)>(.{0,1200}?)</a>', r.text, re.S):
            attrs, inner = m.group(1), m.group(2)
            h = re.search(r'href="([^"]+-\d{6,}-haberi/?)"', attrs)
            if not h: continue
            link = h.group(1) if h.group(1).startswith("http") else host + h.group(1)
            tt = re.search(r'title="([^"]+)"', attrs)
            title = html.unescape(tt.group(1)) if tt else re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", inner))).strip()
            img = re.search(r'<img[^>]+(?:data-src|src)="(https://[^"]+\.(?:jpe?g|png|webp)[^"]*)"', inner)
            if len(title) < 25 or link in seen: continue
            seen.add(link)
            e = {"link": link, "title": title, "id": link}
            if img: e["media_content"] = [{"url": re.sub(r"/crop/\d+x\d+/", "/crop/735x490/", img.group(1))}]
            out.append(e)
        return u, out[:90]
    except Exception: return u, []

def fetch_db(cur, u):
    """'db:<site_id>' = recent own rows of a topic/local site, for cross-distribution to the shared pool (only on-topic rows)."""
    sid = int(u.split(":")[1]); out = []
    for t, link, spot, body, img, pub, cat in cur.execute("""SELECT title, link, spot, content_html, image_url, published_at, category_slug
            FROM portal_rss_items WHERE site_id = %s AND image_url IS NOT NULL AND published_at > now() - interval '7 days'
            ORDER BY published_at DESC LIMIT 400""", (sid,)).fetchall():
        if not CL.site_topic_ok(sid, t or "", spot or "")[0]: continue
        out.append({"link": link, "title": t, "summary": spot or "", "content": [{"value": body or ""}], "id": link,
                    "published_parsed": pub.utctimetuple() if pub else None, "media_content": [{"url": img}], "_cat": cat})
    return out

_img = {}
def image_ok(u, referer):
    if not u or not u.startswith("http") or re.search(r"(logo|placeholder|default|no-?image|opengraph|favicon|avatar)[^/]*$", u, re.I): return False
    key = (u, referer)
    if key in _img: return _img[key]
    ok = False
    try:
        r = S.get(u, timeout=15, stream=True, headers={"Referer": referer, "Range": "bytes=0-65535",
                                                     "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"})
        ct = r.headers.get("content-type", "").lower(); size = 0
        cr = r.headers.get("content-range", "")
        if "/" in cr and cr.rsplit("/", 1)[1].isdigit(): size = int(cr.rsplit("/", 1)[1])
        elif r.headers.get("content-length", "").isdigit(): size = int(r.headers["content-length"])
        chunk = next(r.iter_content(65536), b""); r.close()
        size = max(size, len(chunk))
        ok = r.status_code in (200, 206) and ct.startswith("image/") and size >= 4096
    except Exception: ok = False
    _img[key] = ok; return ok

def page(link):
    try:
        r = S.get(link, timeout=15)
        if r.status_code != 200 or "html" not in r.headers.get("content-type", ""): return None, None
        r.encoding = r.apparent_encoding if not r.encoding or r.encoding.lower() == "iso-8859-1" else r.encoding
        doc = r.text
        og = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', doc, re.I) or \
             re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', doc, re.I)
        txt = trafilatura.extract(doc, url=link, include_comments=False, include_tables=False, favor_precision=True)
        return (txt if txt and len(txt) > 300 else None), (html.unescape(og.group(1)).strip() if og else None)
    except Exception: return None, None
def clean_html(h):
    h = fix(h)
    h = re.sub(r"(?is)<(script|style|iframe|noscript|form|object|embed)[^>]*>.*?</\1>", "", h)
    h = re.sub(r"(?is)<(script|style|iframe|noscript|form|object|embed|link|meta)[^>]*/?>", "", h)
    h = re.sub(r"(?i)\s+on\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", h)
    return h.strip()
def paragraphs(txt): return "".join("<p>%s</p>" % html.escape(p.strip(), quote=False) for p in re.split(r"\n+", txt or "") if p.strip())
def host_label(u):
    m = re.match(r"https?://(?:www\.)?([^/:]+)", u or "")
    if not m: return None
    base = m.group(1).split(".")[0].replace("-", " "); return " ".join(w[:1].upper() + w[1:] for w in base.split())

SUSPENDED = {229}
# SEO/TV-guide junk that some tag feeds return; never imported anywhere
JUNK = re.compile(r"(full ?hd|\bizle\b|izleme linki|fragman|son bölüm|tek parça|canlı izle|kimdir\b|kaç yaşında|nereli|evli mi|burç yorum|hangi kanalda|ne zaman başlıyor|saat kaçta)", re.I)
# Topic guard for panel feeds (tag feeds fall back to general news when the tag is quiet)
TOPIC = {
    "savunma-sanayi": r"(savunma|SSB\b|ASELSAN|ROKETSAN|TUSAŞ|Baykar|HAVELSAN|MKE\b|\bSTM\b|füze|\bİHA|SİHA|tank|fırkateyn|denizaltı|KAAN|HÜRJET|Bayraktar|\bTSK\b|\bMSB\b|mühimmat|radar|hava savunma|askeri|ordu)",
    "tsk": r"(\bTSK\b|\bMSB\b|asker|şehit|gazi|harekat|terör|operasyon|Mehmetçik|komando|Milli Savunma)",
    "saglik": r"(sağlık|hastane|doktor|hekim|tedavi|hastalık|kanser|aşı|virüs|ilaç|beslenme|diyet|kalp|diyabet|obezite|ameliyat|grip|enfeksiyon)",
    "ekoloji": r"(çevre|iklim|orman|doğa|ekoloji|\bsu\b|kuraklık|yangın|karbon|emisyon|geri dönüşüm|atık|biyoçeşitlilik|hayvan|sel|baraj|tarım)",
    "teknoloji": r"(teknoloji|yapay zeka|telefon|uygulama|internet|yazılım|uzay|bilim|robot|siber|otomobil|elektrikli|dijital|bilgisayar|Apple|Google|Samsung)",
    "spor": r"(maç|lig|futbol|basketbol|voleybol|gol|transfer|teknik direktör|Galatasaray|Fenerbahçe|Beşiktaş|Trabzonspor|milli takım|şampiyon|turnuva|spor)",
}   # kirsehirhaber.org (suspended by the user)
def panel_targets(cur):
    """Feeds added in the admin/editor panel (hm_news_sites.layout_json hmNewsSiteRssFeedRows) -> targets.
    A feed whose category is a global category goes to the shared pool (site 230), which every news site that reads the
    shared pool shows under that category (cross-distribution, one copy, deduped). Site-exclusive categories, and sites
    whose panel sets hmNewsRssSources without 230, keep the items on the site itself. Corporate/suspended sites: skipped."""
    glob_cats = {r[0] for r in cur.execute("SELECT DISTINCT slug FROM categories WHERE exclusive_site_id IS NULL").fetchall()}
    own_cats = {}
    for sid, slug in cur.execute("SELECT exclusive_site_id, slug FROM categories WHERE exclusive_site_id IS NOT NULL").fetchall():
        own_cats.setdefault(sid, set()).add(slug)
    out = {}
    for sid, lj in cur.execute("SELECT DISTINCT ON (id) id, layout_json FROM hm_news_sites WHERE active ORDER BY id").fetchall():
        if sid in CORPORATE or sid in SUSPENDED: continue
        try: lay = json.loads(lj) if isinstance(lj, str) else (lj or {})
        except Exception: continue
        if lay.get("hmNewsSiteKind") == "corporate" or str(lay.get("hmNewsTheme", "")).startswith(("kurumsal", "php-kurumsal", "vkd")): continue
        src = lay.get("hmNewsRssSources"); shared_ok = not isinstance(src, list) or SHARED in [int(x) for x in src if str(x).isdigit()]
        for row in lay.get("hmNewsSiteRssFeedRows") or []:
            if not isinstance(row, dict) or row.get("enabled") is False: continue
            url = (row.get("url") or "").strip(); cat = (row.get("categorySlug") or row.get("categoryKey") or "").strip()
            if not url.startswith("http") or not cat or cat == "global": continue
            if cat in own_cats.get(sid, set()): dest = sid
            elif cat in glob_cats: dest = SHARED if shared_ok else sid
            else: continue
            t = out.setdefault((dest, cat), {"site": dest, "cat": cat, "feeds": [], "match": TOPIC.get(cat), "min": 0, "per_run": 6, "max_age": 2, "panel": True})
            if url not in t["feeds"]: t["feeds"].append(url)
    log("panel feeds: %d targets, %d feed urls" % (len(out), len({u for t in out.values() for u in t["feeds"]})))
    return list(out.values())

def main():
    t0 = time.time(); now = datetime.now(timezone.utc)
    if os.environ.get("CATFILL_SOURCE") == "panel":
        with psycopg.connect(DB, autocommit=True, connect_timeout=15) as c0:
            TARGETS[:] = panel_targets(c0.cursor())
    targets = [t for t in TARGETS if not ONLY or ("%s:%s" % (t["site"], t["cat"])) in ONLY]
    targets = [t for t in targets if int(t["site"]) not in CORPORATE]
    for t in targets:   # feeds: "url" (uses target match) or {"url": ..., "match": regex|null}
        t["feeds"] = [f if isinstance(f, dict) else {"url": f, "match": t.get("match")} for f in t["feeds"]]
    urls = sorted({f["url"] for t in targets for f in t["feeds"]})
    net = [u for u in urls if not u.startswith(("db:", "scrape:"))]
    with ThreadPoolExecutor(8) as ex: _feeds.update(dict(ex.map(fetch_feed, net)))
    with ThreadPoolExecutor(4) as ex: _feeds.update(dict(ex.map(fetch_listing, [u for u in urls if u.startswith("scrape:")])))
    log("targets=%d feeds=%d ok=%d" % (len(targets), len(urls), sum(1 for u in urls if _feeds.get(u))))
    con = psycopg.connect(DB, autocommit=True, connect_timeout=15); cur = con.cursor()
    sites = {r[0]: r[1] for r in cur.execute("SELECT id, domain FROM hm_news_sites WHERE active").fetchall()}
    for u in [u for u in urls if u.startswith("db:")]:
        _feeds[u] = fetch_db(cur, u)
    pats = []
    for (p,) in cur.execute("SELECT pattern FROM hm_site_blocked_terms WHERE site_id = 1").fetchall():
        try: pats.append(re.compile(p.translate(TR_SAFE), re.I))
        except re.error: pass
    site_ids = sorted({int(t["site"]) for t in targets})
    pools, have = {}, {}
    for sid in site_ids:
        pool = Pool()
        # 230 = shared pool: dedupe against every site whose menu shows these global categories (turkatahaber, yerel.net.tr, vatanhaber)
        scope = ("(site_id IS NULL OR site_id IN (%s))" % ",".join(str(int(x)) for x in SHARED_DEDUPE)) if sid == SHARED \
            else "(site_id = %d OR site_id IS NULL OR site_id = %d)" % (sid, SHARED)
        for title, link in cur.execute("SELECT title, link FROM portal_rss_items WHERE %s AND published_at > now() - interval '45 days'" % scope).fetchall():
            pool.add(title, link)
        try:   # importer role may not read editor news; the theme's display dedupe still covers those
            for title, link in cur.execute("""SELECT title, coalesce(rss_source_url,'') FROM news WHERE status='published'
                    AND (site_id IS NULL OR site_id = %s OR owner_site_id = %s) AND created_at > now() - interval '45 days'""", (sid, sid)).fetchall():
                pool.add(title, link)
        except psycopg.Error:
            pass
        pools[sid] = pool
        # visible count per category: the theme hides later copies of a story already in the site's scope (Dedupe::hiddenMap)
        first = Pool()
        for cat, title, link in cur.execute("""SELECT category_slug, title, link FROM portal_rss_items
                 WHERE (site_id = %s OR site_id IS NULL OR site_id = %s) ORDER BY id""", (sid, SHARED)).fetchall():
            if first.has(title, link): continue
            first.add(title, link); have[(sid, cat)] = have.get((sid, cat), 0) + 1
    plan = []
    taken = {}   # per site: norm titles chosen in this run
    for t in targets:
        sid = int(t["site"]); cat = t["cat"]; dom = sites.get(sid)
        if not dom: log("skip: site", sid, "inactive/unknown"); continue
        n_have = have.get((sid, cat), 0)
        want = max(t.get("per_run", 6), min(t.get("min", 12) - n_have, 8)) if MODE == "daily" else max(t.get("min", 12) - n_have, 0)
        if MODE == "fill": want = min(want, t.get("fill_cap", 15))
        if want <= 0: log("ok", sid, cat, "have", n_have); continue
        nx = re.compile(t["exclude"], re.I) if t.get("exclude") else None
        oldest = now - timedelta(days=t.get("max_age", 21) if MODE == "fill" else min(t.get("max_age", 21), int(os.environ.get("CATFILL_DAILY_AGE", "3"))))
        cands = []
        for f in t["feeds"]:
            u = f["url"]; rx = re.compile(f["match"], re.I) if f.get("match") else None
            for e in _feeds.get(u, []):
                link = (e.get("link") or "").strip(); title = fix(e.get("title"))[:220]
                if not link.startswith("http") or not title or not is_turkish(title): continue
                pp = e.get("published_parsed") or e.get("updated_parsed")
                pub = datetime(*pp[:6], tzinfo=timezone.utc) if pp else now
                if pub > now + timedelta(minutes=5): pub = now
                if pub < oldest: continue
                enc = (e.get("content") or [{}])[0].get("value", "") if e.get("content") else ""
                desc = e.get("summary") or e.get("description") or ""
                spot = text_of(desc)[:360] or None
                hay = title if t.get("title_only") else title + " " + (spot or "")
                if rx and not rx.search(hay): continue
                sp2 = "" if t.get("title_only") else (spot or "")
                if t.get("cat_rule") and not CL.cat_rule_ok(t["cat_rule"], title, sp2): continue
                if t.get("city") and not CL.mentions_city(t["city"], title, sp2): continue
                if t.get("region") and not CL.region_rx(t["region"]).search(title + "\n" + sp2): continue
                if t.get("topic") and not CL.best_topic(title, sp2)[0] == t["topic"]: continue
                if t.get("src_cats") and e.get("_cat") not in t["src_cats"]: continue
                if nx and nx.search(hay): continue
                if JUNK.search(title): continue
                if sid in BLOCK_SITES and any(p.search(("%s\n%s\n%s" % (title, spot or "", text_of(enc))).translate(TR_SAFE)) for p in pats): continue
                body = clean_html(enc) if enc and len(text_of(enc)) > 200 else (clean_html(desc) if desc and len(text_of(desc)) > 400 else "")
                cands.append(dict(feed=u, link=link, title=title, pub=pub, spot=spot, body=body, guid=(e.get("id") or "").strip(),
                                  image=entry_image(e, enc or desc)))
        cands.sort(key=lambda c: c["pub"], reverse=True)
        local = Pool(); picked = []; tk = taken.setdefault(sid, Pool())
        for c in cands:
            if len(picked) >= want * 5: break
            if pools[sid].has(c["title"], c["link"], c["guid"]) or local.has(c["title"], c["link"]) or tk.has(c["title"], c["link"]) \
                    or (sid != SHARED and taken.get(SHARED, Pool()).has(c["title"], c["link"])): continue
            local.add(c["title"], c["link"]); picked.append(c)
        plan.append((t, sid, cat, dom, want, picked, n_have))
    # photos + bodies (network, no DB transaction open)
    def prep(c, dom):
        ref = "https://%s/" % dom
        txt, og = (None, None)
        if not c["body"] or not c["image"] or not image_ok(c["image"], ref):
            txt, og = page(c["link"])
        if not c["body"] and txt: c["body"] = paragraphs(fix(txt))
        if not (c["image"] and image_ok(c["image"], ref)):
            c["image"] = og if og and image_ok(og, ref) else None
        if not c["body"] and c["spot"]: c["body"] = "<p>%s</p>" % html.escape(c["spot"], quote=False)
        return c
    rows = []
    for t, sid, cat, dom, want, picked, n_have in plan:
        with ThreadPoolExecutor(6) as ex: done = list(ex.map(lambda c: prep(c, dom), picked))
        good = [c for c in done if c["image"] and len(text_of(c["body"] or "")) >= 120]
        if sid in BLOCK_SITES:
            good = [c for c in good if not any(p.search(("%s\n%s\n%s" % (c["title"], c["spot"] or "", text_of(c["body"]))).translate(TR_SAFE)) for p in pats)]
        tk = taken.setdefault(sid, Pool()); sel = []
        for c in good:   # one story -> one category per site (earlier targets win)
            if len(sel) >= want: break
            if tk.has(c["title"], c["link"]) or (sid != SHARED and taken.get(SHARED, Pool()).has(c["title"], c["link"])): continue
            tk.add(c["title"], c["link"]); sel.append(c)
        good = sel
        log("plan site=%s cat=%s have=%d want=%d candidates=%d with_photo=%d -> %d" % (sid, cat, n_have, want, len(picked), len([c for c in done if c["image"]]), len(good)))
        for c in good: rows.append((sid, cat, c))
    if DRY or not rows:
        for sid, cat, c in rows: log("DRY", sid, cat, c["title"][:90], c["image"][:80])
        log("dry=%s rows=%d elapsed=%.1fs" % (DRY, len(rows), time.time() - t0)); return
    con.autocommit = False
    cur.execute("SET LOCAL lock_timeout = '5s'"); cur.execute("SET LOCAL statement_timeout = '60s'")
    cur.execute("SELECT pg_advisory_xact_lock(hashtext('php_theme_rss_import'))")
    keys = list({"link:" + c["link"].lower() for _, _, c in rows})
    exist = set(cur.execute("SELECT site_id, dedupe_key FROM portal_rss_items WHERE dedupe_key = ANY(%s)", (keys,)).fetchall())
    nid = cur.execute("SELECT COALESCE(max(id),0) FROM portal_rss_items").fetchone()[0] + 1
    batch, by = [], {}
    for sid, cat, c in rows:
        dk = "link:" + c["link"].lower()
        if (sid, dk) in exist or (None, dk) in exist: continue
        exist.add((sid, dk))
        prov = CL.city_of_slug(cat) if not cat.startswith("gundemi-") else None
        batch.append((nid, "cf%d-%s" % (sid, hashlib.sha1(c["feed"].encode()).hexdigest()[:10]), sid, cat,
                      hashlib.sha1((c["guid"] or canon_link(c["link"])).encode()).hexdigest()[:16], dk, c["title"], title_key(c["title"]),
                      c["link"], c["spot"], c["body"], c["image"], host_label(c["link"]), "tr", c["pub"],
                      ("tr-" + cat) if prov else None, prov))
        nid += 1; by["%s:%s" % (sid, cat)] = by.get("%s:%s" % (sid, cat), 0) + 1
    cur.executemany("""INSERT INTO portal_rss_items (id, feed_id, site_id, category_slug, item_key, dedupe_key, title, title_key, link, spot,
                       content_html, image_url, source_name, lang, published_at, region_key, region_label)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", batch)
    con.commit()
    log("inserted=%d %s elapsed=%.1fs" % (len(batch), json.dumps(by), time.time() - t0))

if __name__ == "__main__":
    main()
