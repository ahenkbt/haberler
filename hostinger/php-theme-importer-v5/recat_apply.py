"""Turn a recat plan into batched SQL (stdout). Moves: UPDATE category_slug (+ region tags for province slugs).
Hides: hm_site_content_hidden rows (reason off_topic:*) for site-owned rows only (shared pool 230 rows are never hidden)."""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import classifier as C
plan = json.load(open(sys.argv[1]))
B = int(os.environ.get("RECAT_BATCH", "300"))
q = lambda s: "'" + (s or "").replace("'", "''") + "'"
moves = [p for p in plan if p["action"] == "move" and p["to"]]
hides = [p for p in plan if p["action"] == "hide" and p["site"] != 230]
out = ["set statement_timeout='60s'; set lock_timeout='5s';"]
for i in range(0, len(moves), B):
    vals = []
    for p in moves[i:i + B]:
        prov = C.CITY_SLUG.get(p["to"]) if not p["to"].startswith("gundemi-") else None
        vals.append("(%d,%s,%s,%s,%s)" % (p["id"], q(p["frm"]), q(p["to"]), q("tr-" + p["to"]) if prov else "NULL", q(prov) if prov else "NULL"))
    out.append("update portal_rss_items p set category_slug=v.t, region_key=coalesce(v.rk, p.region_key), region_label=coalesce(v.rl, p.region_label) "
               "from (values %s) v(id,f,t,rk,rl) where p.id=v.id and p.category_slug=v.f;" % ",".join(vals))
for i in range(0, len(hides), B):
    vals = ["(%d,%s,%s,'rss',%d,%s)" % (p["site"], q("rss-%d" % p["id"]), q(p["title"]), p["id"], q(p["reason"][:120])) for p in hides[i:i + B]]
    out.append("insert into hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason) values %s on conflict do nothing;" % ",".join(vals))
print("\n".join(out))
print("moves", len(moves), "hides", len(hides), "skipped_shared_hides", sum(1 for p in plan if p["action"] == "hide" and p["site"] == 230), file=sys.stderr)
