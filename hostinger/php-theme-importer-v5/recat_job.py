#!/usr/bin/env python3
"""Hourly recategorizer (importer-v5): last RECAT_HOURS of portal_rss_items -> classifier.decide() -> move/hide.
Moves: UPDATE category_slug (+ region_key/region_label for province slugs). Hides (site-owned rows on topic/local/regional sites):
hm_site_content_hidden reason 'off_topic:*'. Shared pool 230 rows are never hidden. Log: stdout (cron -> /var/log/php-theme/recat.log)."""
import json, os, sys, collections
from datetime import datetime, timezone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import psycopg, classifier as C
DB = os.environ["IMPORT_DATABASE_URL"]; DRY = os.environ.get("IMPORT_DRY_RUN") == "1"
HOURS = int(os.environ.get("RECAT_HOURS", "3"))
SITECATS = {int(k): v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sitecats.json"))).items()}
def log(*a): print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), *a, flush=True)
con = psycopg.connect(DB, autocommit=True, connect_timeout=15); cur = con.cursor()
cur.execute("SET statement_timeout = '60s'")
rows = cur.execute("""SELECT id, coalesce(site_id,0), category_slug, title, coalesce(spot,''), left(coalesce(content_html,''), 1500)
    FROM portal_rss_items WHERE site_id = ANY(%s) AND created_at > now() - make_interval(hours => %s)""", (list(SITECATS), HOURS)).fetchall()
moves, hides, stats = [], [], collections.Counter()
for rid, site, cat, title, spot, body in rows:
    lead = C.re.sub(r"<[^>]+>", " ", body)[:600]
    restricted = site in C.SITE_RULES or site in C.REGION_SITES or site in C.LOCAL_SITES
    d = C.decide(cat, SITECATS[site], title, spot or lead[:300], lead, site_id=site if restricted else None, ai=True)
    if d["action"] == "move" and d["to"]:
        moves.append((rid, cat, d["to"])); stats["%s %s->%s" % (site, cat, d["to"])] += 1
        log("MOVE", rid, site, cat, "->", d["to"], d["reason"], title[:90])
    elif d["action"] == "hide" and site != 230:
        hides.append((site, "rss-%d" % rid, title, rid, d["reason"][:120])); stats["%s %s hide" % (site, cat)] += 1
        log("HIDE", rid, site, cat, d["reason"], title[:90])
if not DRY:
    for rid, f, t in moves:
        prov = C.CITY_SLUG.get(t) if not t.startswith("gundemi-") else None
        cur.execute("""UPDATE portal_rss_items SET category_slug = %s, region_key = coalesce(%s, region_key), region_label = coalesce(%s, region_label)
                       WHERE id = %s AND category_slug = %s""", (t, ("tr-" + t) if prov else None, prov, rid, f))
    if hides:
        cur.executemany("""INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason) VALUES (%s,%s,%s,'rss',%s,%s)
                           ON CONFLICT DO NOTHING""", hides)
log("rows=%d moves=%d hides=%d ai=%s dry=%s %s" % (len(rows), len(moves), len(hides), json.dumps(C.AI_STATS), DRY, json.dumps(stats, ensure_ascii=False)))
