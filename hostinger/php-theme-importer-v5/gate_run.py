#!/usr/bin/env python3
"""Topic gate for the per-site panel importer (php-theme-importer:2 /app/import_rss.py, IMPORT_SCOPE_SITE=1 runs).
Topic/regional/local sites (classifier.SITE_RULES / REGION_SITES / LOCAL_SITES) only receive items that pass
classifier.site_topic_ok(); everything else is skipped before insert (haberler.com tag feeds fall back to general news when
the tag is quiet, e.g. "Orman Genel Müdürlüğü" -> 600+ off-topic items/day on yesilvatan). Skipped items are not lost: the
general pool importers carry general news. Runs the original importer unchanged otherwise."""
import sys
sys.path.insert(0, "/app"); sys.path.insert(1, "/app5")
import classifier as C
import import_rss as M
RESTRICTED = set(C.SITE_RULES) | set(C.REGION_SITES) | set(C.LOCAL_SITES)
_orig = M.drop_repeats
def gated(cur, items, site_id, *a, **k):
    if site_id in RESTRICTED:
        keep = []
        for c in items:
            lead = M.text_of(c.get("body") or "")[:600] if hasattr(M, "text_of") else ""
            if C.site_topic_ok(site_id, c["title"], c.get("spot") or "", lead)[0]:
                keep.append(c)
        M.log("topic gate (importer-v5 classifier): site %s kept %d, skipped %d off-topic" % (site_id, len(keep), len(items) - len(keep)))
        items = keep
    return _orig(cur, items, site_id, *a, **k)
M.drop_repeats = gated
M.main()
