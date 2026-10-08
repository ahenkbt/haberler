#!/usr/bin/env python3
"""Off-topic guard for items the recategorizer cannot move: live HM items (LiveBridge cache, /api/news/hybrid) and editor
news rows. Topic/regional/local sites: hide what fails classifier.site_topic_ok(). General sites: hide live items that sit in a
strict category (CAT_RULES / city category) they do not belong to (live categories come from the HM DB and cannot be moved
from here). Writes hm_site_content_hidden (reason off_topic:* / live_wrong_cat:*). Never deletes."""
import glob, json, os, sys, re
from datetime import datetime, timezone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import psycopg, classifier as C
DB = os.environ["IMPORT_DATABASE_URL"]; DRY = os.environ.get("IMPORT_DRY_RUN") == "1"
BRIDGE = os.environ.get("BRIDGE_DIR", "/bridge")
CORPORATE = {7, 11, 61}
def log(*a): print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), *a, flush=True)
con = psycopg.connect(DB, autocommit=True, connect_timeout=15); cur = con.cursor()
cur.execute("SET statement_timeout = '60s'")
hosts = {}
for sid, dom in cur.execute("SELECT id, domain FROM hm_news_sites WHERE active").fetchall():
    if sid in CORPORATE or not dom: continue
    hosts.setdefault(dom.lower().removeprefix("www."), sid)
restricted = set(C.SITE_RULES) | set(C.REGION_SITES) | set(C.LOCAL_SITES)
out = []
for uf in glob.glob(os.path.join(BRIDGE, "*.json.url")):
    try:
        u = json.load(open(uf)).get("url", "")
        if "/api/news/hybrid?" not in u: continue
        host = re.match(r"https?://([^/]+)", u).group(1).lower().removeprefix("www.")
        sid = hosts.get(host)
        if not sid: continue
        d = json.load(open(uf[:-4]))
    except Exception:
        continue
    for it in d.get("items") or []:
        slug, title, spot, cat = it.get("slug") or "", it.get("title") or "", it.get("spot") or "", it.get("categorySlug") or ""
        if not slug or not title or slug.startswith("rss-"): continue   # rss- rows are handled by recat_job
        if sid in restricted:
            ok, rule = C.site_topic_ok(sid, title, spot)
            if not ok: out.append((sid, slug, title, "off_topic:" + rule))
            continue
        city = C.city_of_slug(cat)
        if city and not C.mentions_city(city, title, spot):
            out.append((sid, slug, title, "live_wrong_cat:%s" % cat))
        elif cat in C.CAT_RULES and not C.cat_rule_ok(cat, title, spot):
            out.append((sid, slug, title, "live_wrong_cat:%s" % cat))
# editor news rows visible on restricted sites (site NULL = network-wide)
try:
    for sid in restricted:
        for slug, title, spot in cur.execute("""SELECT slug, title, coalesce(spot,'') FROM news WHERE status='published'
                AND (site_id IS NULL OR site_id = %s OR owner_site_id = %s) AND created_at > now() - interval '10 days'""", (sid, sid)).fetchall():
            if slug and title and not C.site_topic_ok(sid, title, spot)[0]:
                out.append((sid, slug, title, "off_topic:news"))
except psycopg.Error as e:
    log("news read skipped:", str(e).splitlines()[0])
out = list({(a, b, c): r for a, b, c, r in out}.items())
if not DRY and out:
    cur.executemany("""INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, reason) VALUES (%s,%s,%s,'live',%s)
                       ON CONFLICT DO NOTHING""", [(a, b, c, r[:120]) for (a, b, c), r in out])
by = {}
for (a, b, c), r in out: by[a] = by.get(a, 0) + 1
log("hidden_candidates=%d by_site=%s dry=%s" % (len(out), json.dumps(by), DRY))
for (a, b, c), r in out[:400]: log("HIDE", a, r, c[:90])
