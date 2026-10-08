#!/usr/bin/env python3
"""Hourly recategorizer (importer-v5): last RECAT_HOURS of portal_rss_items -> classifier.decide() -> move/hide.
Moves: UPDATE category_slug (+ region_key/region_label for province slugs). Off-topic rows on topic/local/regional sites (and
"no fit" rows anywhere) are MOVED to the shared general pool (site_id 230) under classifier.pool_target() (2026-10-08 rule
"dağıt, gizleme"). Hidden (hm_site_content_hidden, reason 'recat_keep:*') ONLY when: duplicate of a pool story, no image,
banned (vatanhaber terms), junk/spam. Shared pool 230 rows are never hidden. Log: stdout (cron -> /var/log/php-theme/recat.log)."""
import json, os, sys, collections
from datetime import datetime, timezone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import psycopg, classifier as C
DB = os.environ["IMPORT_DATABASE_URL"]; DRY = os.environ.get("IMPORT_DRY_RUN") == "1"
HOURS = int(os.environ.get("RECAT_HOURS", "3"))
SITECATS = {int(k): v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sitecats.json"))).items()}
if os.environ.get("RECAT_SITES"):
    SITECATS = {k: v for k, v in SITECATS.items() if str(k) in os.environ["RECAT_SITES"].split(",")}
def log(*a): print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), *a, flush=True)
con = psycopg.connect(DB, autocommit=True, connect_timeout=15); cur = con.cursor()
cur.execute("SET statement_timeout = '60s'")
rows = cur.execute("""SELECT id, coalesce(site_id,0), category_slug, title, coalesce(spot,''), left(coalesce(content_html,''), 1500)
         , coalesce(image_url,''), coalesce(title_key,''), coalesce(dedupe_key,''), coalesce(link,'')
    FROM portal_rss_items WHERE site_id = ANY(%s) AND created_at > now() - make_interval(hours => %s)""", (list(SITECATS), HOURS)).fetchall()
moves, hides, pool_moves, stats = [], [], [], collections.Counter()
OG_MAX = int(os.environ.get("RECAT_OG_MAX", "60")); og_tries, og_fixed = [], []
def og_image(link):
    """No-image rows: try the source page's og:image before keeping them hidden (only if the image really loads)."""
    try:
        import requests
        h = {"User-Agent": "Mozilla/5.0 (compatible; TurkataHaberBot/1.0)"}
        r = requests.get(link, timeout=10, headers=h)
        m = C.re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', r.text, C.re.I) or \
            C.re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', r.text, C.re.I)
        if not m: return None
        u = m.group(1).replace("&amp;", "&")
        q = requests.get(u, timeout=10, stream=True, headers=dict(h, Referer=link, Range="bytes=0-65535"))
        chunk = next(q.iter_content(65536), b""); q.close()
        return u if q.status_code in (200, 206) and q.headers.get("content-type", "").startswith("image/") and len(chunk) >= 4096 else None
    except Exception:
        return None
POOL_CATS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sitecats.json")))["230"]
for rid, site, cat, title, spot, body, img, tkey, dkey, link in rows:
    lead = C.re.sub(r"<[^>]+>", " ", body)[:600]
    restricted = site in C.SITE_RULES or site in C.REGION_SITES or site in C.LOCAL_SITES
    d = C.decide(cat, SITECATS[site], title, spot or lead[:300], lead, site_id=site if restricted else None, ai=True)
    if d["action"] == "move" and d["to"]:
        moves.append((rid, cat, d["to"])); stats["%s %s->%s" % (site, cat, d["to"])] += 1
        log("MOVE", rid, site, cat, "->", d["to"], d["reason"], title[:90])
    elif d["action"] == "hide" and site != 230:
        why = C.keep_hidden_reason(title, spot, lead)
        if why is None and not img and link.startswith("http") and len(og_tries) < OG_MAX:
            og_tries.append(rid); img = og_image(link) or ""
            if img: og_fixed.append((img, rid))
        if why is None and not img:
            why = "no_image"
        if why is None and cur.execute("""SELECT 1 FROM portal_rss_items WHERE (site_id = 230 OR site_id IS NULL) AND id <> %s
                AND ((title_key <> '' AND title_key = %s) OR (dedupe_key <> '' AND dedupe_key = %s) OR (link <> '' AND link = %s)) LIMIT 1""",
                (rid, tkey, dkey, link)).fetchone():
            why = "duplicate"
        if why:
            hides.append((site, "rss-%d" % rid, title, rid, ("recat_keep:" + why)[:120])); stats["%s %s keep_hidden:%s" % (site, cat, why)] += 1
            log("KEEP_HIDDEN", rid, site, cat, why, d["reason"], title[:90])
        else:
            to, tw = C.pool_target(cat, title, spot, lead, POOL_CATS)
            pool_moves.append((rid, site, cat, to)); stats["%s %s ->230:%s" % (site, cat, to)] += 1
            log("TO_POOL", rid, site, cat, "-> 230", to, d["reason"], tw, title[:90])
if not DRY:
    for rid, f, t in moves:
        prov = C.CITY_SLUG.get(t) if not t.startswith("gundemi-") else None
        cur.execute("""UPDATE portal_rss_items SET category_slug = %s, region_key = coalesce(%s, region_key), region_label = coalesce(%s, region_label)
                       WHERE id = %s AND category_slug = %s""", (t, ("tr-" + t) if prov else None, prov, rid, f))
    for img, rid in og_fixed:
        cur.execute("UPDATE portal_rss_items SET image_url = %s, updated_at = now() WHERE id = %s AND coalesce(image_url,'') = ''", (img, rid))
    for rid, site, f, t in pool_moves:
        prov = C.CITY_SLUG.get(t)
        cur.execute("""UPDATE portal_rss_items SET site_id = 230, category_slug = %s, region_key = coalesce(%s, region_key),
                       region_label = coalesce(%s, region_label), updated_at = now() WHERE id = %s AND site_id = %s AND category_slug = %s""",
                    (t, ("tr-" + t) if prov else None, prov, rid, site, f))
    if hides:
        cur.executemany("""INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason) VALUES (%s,%s,%s,'rss',%s,%s)
                           ON CONFLICT DO NOTHING""", hides)
log("to_pool=%d og_tries=%d og_fixed=%d" % (len(pool_moves), len(og_tries), len(og_fixed)))
log("rows=%d moves=%d kept_hidden=%d ai=%s dry=%s %s" % (len(rows), len(moves), len(hides), json.dumps(C.AI_STATS), DRY, json.dumps(stats, ensure_ascii=False)))
