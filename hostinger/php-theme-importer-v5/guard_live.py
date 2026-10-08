#!/usr/bin/env python3
"""Live-item guard (v2, 2026-10-08 user rule "dağıt, gizleme"). Live HM items cannot be moved from here, so this guard only
keeps NETWORK RSS-sync items (rssSourceUrl set, not editor-manual, no author, not published by a site editor, not a column) off
topic/regional/local sites when they are off-topic there. Such an item stays visible on the general news sites through the
network feed, so nothing disappears. Editor/author content is NEVER hidden; general sites are never touched; editor `news`
rows are never touched. Reason: 'offsite_network:<rule>'. Never deletes."""
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
    if sid not in restricted: continue
    for it in d.get("items") or []:
        slug, title, spot = it.get("slug") or "", it.get("title") or "", it.get("spot") or ""
        if not slug or not title or slug.startswith("rss-"): continue   # rss- rows are handled by recat_job (moved, not hidden)
        src = (it.get("rssSourceUrl") or "").lower()
        # own editor content: editor-manual / authored / column, or no source URL, or the source URL is this very site
        editor = bool(it.get("isEditorManual") or it.get("authorId") or it.get("authorName")
                      or not src or host in src or (it.get("contentKind") or "") not in ("", "news"))
        if editor: continue
        ok, rule = C.site_topic_ok(sid, title, spot)
        if not ok: out.append((sid, slug, title, "offsite_network:" + rule))
# TP news rows on restricted sites: network items (site NULL) and copies syndicated from another site (rss_source_url set).
# A site's OWN editor content (site_id/owner = this site and editor-manual or not a copy) is never hidden.
news_out = []
try:
    # titles fanned out to 2+ sites in the window = syndicated copies (e.g. a vatanhaber editor item copied to every site)
    fanned = {r[0] for r in cur.execute("""SELECT lower(title) FROM news WHERE status='published' AND created_at > now() - make_interval(days => %s)
              GROUP BY 1 HAVING count(DISTINCT coalesce(site_id, 0)) > 1""", (int(os.environ.get('GUARD_NEWS_DAYS', '30')),)).fetchall()}
    for sid in restricted:
        for slug, title, spot, s_id, o_id, ed, src in cur.execute("""SELECT slug, title, coalesce(spot,''), site_id, owner_site_id,
                coalesce(is_editor_manual,false), coalesce(rss_source_url,'') FROM news WHERE status='published'
                AND (site_id IS NULL OR site_id = %s OR owner_site_id = %s) AND created_at > now() - make_interval(days => %s)""",
                (sid, sid, int(os.environ.get('GUARD_NEWS_DAYS', '30')))).fetchall():
            own = (s_id == sid or o_id == sid) and (ed or (not src and (title or "").lower() not in fanned))
            if own or not slug or not title: continue
            ok, rule = C.site_topic_ok(sid, title, spot)
            if not ok: news_out.append((sid, slug, title, "offsite_network:news:" + rule))
except psycopg.Error as e:
    log("news read skipped:", str(e).splitlines()[0])
news_out = list({(a, b, c): r for a, b, c, r in news_out}.items())
if not DRY and news_out:
    cur.executemany("""INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, reason) VALUES (%s,%s,%s,'news',%s)
                       ON CONFLICT DO NOTHING""", [(a, b, c, r[:120]) for (a, b, c), r in news_out])
log("news_hidden_candidates=%d" % len(news_out))
out = list({(a, b, c): r for a, b, c, r in out}.items())
if not DRY and out:
    cur.executemany("""INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, reason) VALUES (%s,%s,%s,'live',%s)
                       ON CONFLICT DO NOTHING""", [(a, b, c, r[:120]) for (a, b, c), r in out])
by = {}
for (a, b, c), r in out: by[a] = by.get(a, 0) + 1
log("hidden_candidates=%d by_site=%s dry=%s" % (len(out), json.dumps(by), DRY))
for (a, b, c), r in out[:400]: log("HIDE", a, r, c[:90])
