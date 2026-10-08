"""Recategorize portal_rss_items with classifier.decide().
plan:  python recat.py plan rows.csv sitecats.json plan.json   (no DB writes; AI only for ambiguous items)
Each plan row: id, site, from, action(move|hide), to, reason, title."""
import csv, json, sys, collections
sys.path.insert(0, __import__("os").path.dirname(__file__))
import classifier as C
csv.field_size_limit(10**8)

def plan(rows_csv, sitecats_json, out_json, use_ai=True):
    sitecats = {int(k): v for k, v in json.load(open(sitecats_json)).items()}
    out, stats = [], collections.Counter()
    import concurrent.futures as cf
    def one(r):
        rid, site, cat, title, spot, lead, feed = int(r[0]), int(r[1]), r[2], r[3], r[4], r[5], r[6]
        cats = sitecats.get(site)
        if not cats:
            return None
        restricted = site in C.SITE_RULES or site in C.REGION_SITES or site in C.LOCAL_SITES
        return rid, site, cat, title, C.decide(cat, cats, title, spot or lead[:300], lead, site_id=site if restricted else None, ai=use_ai)
    with cf.ThreadPoolExecutor(8) as ex:
        res = [x for x in ex.map(one, csv.reader(open(rows_csv, encoding="utf-8"))) if x]
    for rid, site, cat, title, d in res:
        stats[(site, cat, d["action"])] += 1
        if d["action"] in ("move", "hide"):
            out.append(dict(id=rid, site=site, frm=cat, action=d["action"], to=d["to"], reason=d["reason"], title=title))
    json.dump(out, open(out_json, "w"), ensure_ascii=False, indent=0)
    summ = collections.Counter((p["site"], p["frm"], p["action"], p["to"]) for p in out)
    for k, v in sorted(summ.items(), key=lambda kv: (kv[0][0], -kv[1])):
        print("\t".join(map(str, k)), v)
    print("AI", C.AI_STATS, file=sys.stderr)
    print("total", len(out), "moves", sum(1 for p in out if p["action"] == "move"), "hides", sum(1 for p in out if p["action"] == "hide"), file=sys.stderr)

if __name__ == "__main__":
    if sys.argv[1] == "plan":
        plan(sys.argv[2], sys.argv[3], sys.argv[4], use_ai=(len(sys.argv) < 6 or sys.argv[5] != "noai"))
