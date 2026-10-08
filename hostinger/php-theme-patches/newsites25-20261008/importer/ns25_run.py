#!/usr/bin/env python3
"""newsites25 2026-10-08 runner: importer-v5 catfill.main() with targets-ns25.json for memur.gundemi.org (1147),
turkdunyasi.gundemi.org (1148) and world.fix.tc (1149). INSERT-only into twilight-pine portal_rss_items (photo-checked,
site-scoped dedupe incl. the shared pool 230 => a story already in the network pool is taken from another source).
Two hooks, both read-only on the feeds:
  1) 'scrape:' listing items get their publish date from the haberler.com image path (/YYYY/MM/DD/), undated dropped
     (same rule as spor-kibris spk_run.py);
  2) every entry gets e['_cat'] = world continent slug of the FIRST foreign country named in the title (then the
     summary), using the same country map as the theme's "TurkAta News - <Country>" dateline (worldmap.json).
     world.fix.tc targets use src_cats=[<continent>], so each story lands in exactly one continent."""
import json, os, re, sys, html
from datetime import datetime
sys.path.insert(0, "/app5")
import catfill as CF

W = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "worldmap.json"), encoding="utf-8"))
MAP = dict((k, v) for k, v in W["map"]); STRICT = set(W["strict"]); CONT = W["continent"]
_keys = sorted(MAP, key=len, reverse=True)
RX = re.compile(r"(?<![\w])(" + "|".join(re.escape(k) for k in _keys) + r")(?=[a-zçğıöşü’'\s\W]|$)")
LOWER = re.compile(r"[a-zçğıöşü]")

def country(text):
    best = None
    for m in RX.finditer(text or ""):
        w = m.group(1)
        if w in STRICT and LOWER.match(text[m.end():m.end() + 1] or ""):
            continue
        if best is None or m.start() < best[1] or (m.start() == best[1] and len(w) > len(best[0])):
            best = (w, m.start())
    return MAP.get(best[0]) if best else None

def continent(title, summary):
    for t in (title, summary):
        c = country(html.unescape(t or ""))
        if c:
            return CONT.get(c)
    return None

def tag(es):
    for e in es:
        if "_cat" not in e:
            e["_cat"] = continent(e.get("title") or "", re.sub(r"<[^>]+>", " ", e.get("summary") or e.get("description") or "")[:400])
    return es

_orig_feed, _orig_listing = CF.fetch_feed, CF.fetch_listing
def fetch_feed(u):
    u2, es = _orig_feed(u)
    return u2, tag(es)
def fetch_listing_dated(u):
    u2, es = _orig_listing(u)
    out = []
    for e in es:
        img = ((e.get("media_content") or [{}])[0] or {}).get("url", "")
        m = re.search(r"/(20\d\d)/(\d\d)/(\d\d)/", img)
        if not m:
            continue
        try:
            d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), 9, 0, 0)
        except ValueError:
            continue
        e["published_parsed"] = d.timetuple()
        out.append(e)
    return u2, tag(out)
CF.fetch_feed = fetch_feed
CF.fetch_listing = fetch_listing_dated

# 3) "have" per category counts only the new sites' OWN rows (their hmNewsRssSources is [0] = own rows only, so global
#    NULL/230 rows with the same slug, e.g. 'avrupa', are not visible there). Dedupe scope (site + NULL + pool 230) is unchanged.
NS25 = {1147, 1148, 1149}
_HAVE_Q = "SELECT category_slug, title, link FROM portal_rss_items"
_HAVE_W = "(site_id = %s OR site_id IS NULL OR site_id = %s)"
class _Cur:
    def __init__(self, c): object.__setattr__(self, "_c", c)
    def execute(self, q, p=None, *a, **k):
        if _HAVE_Q in q and _HAVE_W in q and p and int(p[0]) in NS25:
            q = q.replace(_HAVE_W, "(site_id = %s AND %s IS NOT NULL)")
        self._c.execute(q, p, *a, **k)
        return self
    def __getattr__(self, n): return getattr(self._c, n)
class _Con:
    def __init__(self, c): object.__setattr__(self, "_c", c)
    def cursor(self, *a, **k): return _Cur(self._c.cursor(*a, **k))
    def __getattr__(self, n): return getattr(self._c, n)
    def __setattr__(self, n, v): setattr(self._c, n, v)
    def __enter__(self): self._c.__enter__(); return self
    def __exit__(self, *a): return self._c.__exit__(*a)
_orig_connect = CF.psycopg.connect
class _PG:
    def __getattr__(self, n): return getattr(_orig_psycopg, n)
    @staticmethod
    def connect(*a, **k): return _Con(_orig_connect(*a, **k))
_orig_psycopg = CF.psycopg
CF.psycopg = _PG()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        for t in sys.argv[2:]:
            print(continent(t, ""), "<=", t)
        sys.exit(0)
    CF.main()
