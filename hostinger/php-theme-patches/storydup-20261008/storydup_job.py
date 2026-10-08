"""Story de-duplication across sources and sites (user rule 2026-10-08 21:40).

Same story from several sources -> one story cluster (storyclust.py rules + Evren check for borderline pairs).
Per news site at most ONE item of a cluster is listed; the others go to hm_story_dup_hidden(site_id, public_slug),
which the PHP theme excludes from every list query (storySql). Nothing is deleted or unpublished; story pages
still open. Choice per site: site's editor/manual news or own AI-editor article (never suppressed) > site-own RSS >
shared-pool variant assigned round-robin (site rank + cluster hash) so every general site shows a DIFFERENT
source's version. Corporate sites (7, 11, 61) are never touched.
Env: IMPORT_DATABASE_URL, EVREN_API_KEY (+NVIDIA/GEMINI/OPENAI), DUP_DAYS (14), DUP_AI_MAX_PAIRS (600),
DUP_AI_THREADS (3), DUP_DRY_RUN=1.
"""
import hashlib, json, os, re, sys, time, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import psycopg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import storyclust as S

DAYS = int(os.environ.get("DUP_DAYS", "14"))
AI_MAX = int(os.environ.get("DUP_AI_MAX_PAIRS", "600"))
THREADS = int(os.environ.get("DUP_AI_THREADS", "3"))
DRY = os.environ.get("DUP_DRY_RUN") == "1"
CORPORATE = {7, 11, 61}
REPUTE = ["aa", "trthaber", "trt", "ntv", "cnnturk", "hurriyet", "milliyet", "sabah", "haberturk", "yenisafak", "dha",
          "iha", "sozcu", "cumhuriyet", "star", "takvim", "aksam", "karar", "t24", "bbc", "dw", "euronews", "birgun",
          "dirilispos", "haberler"]


def log(*a):
    print(datetime.now().strftime("%H:%M:%S"), *a, flush=True)


def repute(src):
    s = S.norm(src or "").replace(" ", "")
    for i, r in enumerate(REPUTE):
        if s.startswith(r[:9]):
            return i
    return len(REPUTE) - 3          # unknown: below the national outlets, above aggregators


def h32(s):
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


# ------------------------------------------------------------------ AI check for borderline pairs
PROVIDERS = [
    ("evren", "https://evren-llmapi.ssyz.org.tr/v1", "EVREN_API_KEY", ["deepseek-v4-flash", "gemma-4-31b"], "x-api-key"),
    ("nvidia", "https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY", ["nvidia/nemotron-3.5-lightning-30b-a3b"], "bearer"),
    ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "GEMINI_API_KEY", ["gemini-3.1-flash-lite"], "bearer"),
    ("openai", "https://api.openai.com/v1", "OPENAI_API_KEY", ["gpt-4.1-nano"], "bearer"),
]
_DEAD = {}
PROMPT = ("Haber sitesi editörüsün. Aşağıdaki her numaralı çiftte iki haber başlığı (ve kısa özet) var. "
          "İkisi AYNI haberi mi veriyor? AYNI = aynı olay ve aynı gelişme, sadece farklı kaynak ya da farklı ifade "
          "(okur ikisini art arda görse 'bu haberi zaten okudum' der). FARKLI = aynı kişi/konu ama başka açıklama, "
          "başka olay, yeni gelişme (ör. gözaltı → tutuklama, farklı gün, farklı il, farklı rakam, farklı maç).\n"
          "Her çift için tek satır yaz: '<numara>: 1' (aynı) ya da '<numara>: 0' (farklı). Başka hiçbir şey yazma.\n\n")


def ai_batch(pairs, timeout=60):
    """pairs: list of (a_title, a_spot, b_title, b_spot). Returns list of bool|None."""
    body_txt = PROMPT + "\n".join(
        "%d) A: %s | %s\n   B: %s | %s" % (i + 1, at, (asp or "")[:140], bt, (bsp or "")[:140])
        for i, (at, asp, bt, bsp) in enumerate(pairs))
    for name, base, env, models, auth in PROVIDERS:
        key = os.environ.get(env)
        if not key or _DEAD.get(name, 0) > time.time():
            continue
        for model in models:
            body = {"model": model, "messages": [{"role": "user", "content": body_txt}], "max_tokens": 12 * len(pairs) + 50,
                    "temperature": 0}
            if name == "evren":
                body["reasoning_effort"] = "none" if model == "deepseek-v4-flash" else "low"
            elif name == "nvidia":
                body["chat_template_kwargs"] = {"enable_thinking": False}
            elif name == "gemini":
                body["reasoning_effort"] = "minimal"
            hdr = {"Content-Type": "application/json"}
            hdr.update({"x-api-key": key} if auth == "x-api-key" else {"Authorization": "Bearer " + key})
            try:
                req = urllib.request.Request(base + "/chat/completions", data=json.dumps(body).encode(), headers=hdr)
                j = json.loads(urllib.request.urlopen(req, timeout=timeout).read())
                ans = ((j.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
                ans = re.sub(r"<think>.*?</think>", "", ans, flags=re.S)
                out = [None] * len(pairs)
                for m in re.finditer(r"(\d+)\s*[:).-]\s*([01])", ans):
                    i = int(m.group(1)) - 1
                    if 0 <= i < len(pairs):
                        out[i] = m.group(2) == "1"
                if sum(v is not None for v in out) >= len(pairs) * 0.8:
                    return out, "%s:%s" % (name, model)
            except Exception as ex:
                log("  ai %s/%s: %s" % (name, model, str(ex)[:120]))
                continue
        _DEAD[name] = time.time() + 300
    return [None] * len(pairs), ""


def pair_key(a, b):
    x, y = sorted([" ".join(a.tt), " ".join(b.tt)])
    return hashlib.md5((x + "\x00" + y).encode()).hexdigest()


# ------------------------------------------------------------------ load
def load(con):
    items = []   # dict(slug, kind, ref, site, owner, cat, src, ts, title, spot, image, manual)
    for r in con.execute("""SELECT id, site_id, category_slug, COALESCE(source_name,''), published_at, title,
                                   left(COALESCE(spot,''),300), COALESCE(image_url,'')
                            FROM portal_rss_items WHERE published_at > now() - make_interval(days => %s)
                              AND (site_id IS NULL OR site_id <> ALL(%s))""", (DAYS, list(CORPORATE))):
        items.append(dict(slug="rss-%d" % r[0], kind="rss", ref=r[0], site=r[1], owner=None, cat=r[2] or "", src=r[3],
                          ts=r[4].timestamp(), title=r[5] or "", spot=r[6], image=r[7], manual=False))
    return items


def load_news(con):
    out = []
    for r in con.execute("""SELECT n.id, n.slug, n.site_id, n.owner_site_id, COALESCE(c.slug,''), n.created_at, n.title,
                                   left(COALESCE(n.spot,''),300), COALESCE(n.image_url,''),
                                   (COALESCE(n.is_editor_manual,false) OR COALESCE(n.rss_source_url,'') = ''), COALESCE(n.rss_source_url,'')
                            FROM news n LEFT JOIN categories c ON c.id = n.category_id
                            WHERE n.status = 'published' AND n.created_at > now() - make_interval(days => %s)
                              AND COALESCE(n.slug,'') <> ''""", (DAYS,)):
        if r[2] in CORPORATE or r[3] in CORPORATE:
            continue
        out.append(dict(slug=r[1], kind="news", ref=r[0], site=r[2], owner=r[3], cat=r[4], src=re.sub(r"^https?://(www\.)?", "", r[10]).split(".")[0],
                        ts=r[5].timestamp(), title=r[6] or "", spot=r[7], image=r[8], manual=bool(r[9])))
    return out


def load_ai(con):
    out = []
    try:
        for r in con.execute("""SELECT id, site_id, published_at, title, orig_title, left(COALESCE(spot,''),300), COALESCE(image_url,''),
                                       COALESCE(category_slug,''), source_item_id
                                FROM hm_ai_editor_articles WHERE status = 'published' AND published_at IS NOT NULL
                                  AND published_at > now() - make_interval(days => %s)""", (DAYS,)):
            out.append(dict(slug="ai-%d" % r[0], kind="ai", ref=r[0], site=r[1], owner=None, cat=r[7], src="ai",
                            ts=r[2].timestamp(), title=r[4] or r[3] or "", spot=r[5], image=r[6], manual=True, source_item=r[8]))
    except Exception as ex:
        log("ai articles unreadable:", str(ex)[:120])
        con.rollback()
    return out


def sites(con):
    out = []
    for sid, slug, lj in con.execute("SELECT DISTINCT ON (id) id, slug, layout_json FROM hm_news_sites ORDER BY id"):
        if sid in CORPORATE:
            continue
        try:
            lay = json.loads(lj) if isinstance(lj, str) else (lj or {})
        except Exception:
            lay = {}
        v = lay.get("hmNewsRssSources")
        shared = [int(x) for x in v if str(x).lstrip("-").isdigit() and int(x) > 0] if isinstance(v, list) else [230]
        out.append(dict(id=sid, slug=slug, shared=set(shared)))
    return out


def site_filters(con, sid):
    off, pasif, pats = set(), set(), []
    for (c,) in con.execute("SELECT category_slug FROM hm_site_category_overrides WHERE site_id=%s AND active=false", (sid,)):
        off.add(c)
    for (p,) in con.execute("SELECT public_slug FROM hm_site_content_hidden WHERE site_id=%s", (sid,)):
        pasif.add(p)
    for (p,) in con.execute("SELECT pattern FROM hm_site_blocked_terms WHERE site_id=%s", (sid,)):
        try:
            pats.append(re.compile(p, re.I))
        except re.error:
            pass
    return off, pasif, pats


def visible(it, site, filt):
    off, pasif, pats = filt
    sid = site["id"]
    if it["kind"] == "rss":
        if not (it["site"] is None or it["site"] == sid or it["site"] in site["shared"]):
            return False
    elif it["kind"] == "news":
        if not (it["site"] is None or it["site"] == sid or it["owner"] == sid):
            return False
    else:  # ai
        return it["site"] == sid
    if it["cat"] in off or it["slug"] in pasif:
        return False
    if pats:
        txt = it["title"] + "\n" + it["spot"]
        if any(p.search(txt) for p in pats):
            return False
    return True


def main():
    t0 = time.time()
    url = os.environ["IMPORT_DATABASE_URL"]
    con = psycopg.connect(url, autocommit=True)
    items = load(con) + load_news(con) + load_ai(con)
    log("items: %d (rss %d, news %d, ai %d)" % (len(items), sum(i["kind"] == "rss" for i in items),
                                                 sum(i["kind"] == "news" for i in items), sum(i["kind"] == "ai" for i in items)))
    docs = []
    by_key = {}
    for it in items:
        k = "%s|%s|%d" % (it["kind"], it["slug"], it["ref"])
        while k in by_key:
            k += "+"
        d = S.Doc(k, it["ts"], it["title"], it["spot"])
        docs.append(d)
        by_key[k] = it
        it["doc"] = d
    S.build(docs)
    _, pairs = S.candidates(docs)
    # verdicts for borderline pairs
    cache = {}
    for pk, same in con.execute("SELECT pair_key, same FROM hm_story_dup_verdicts WHERE decided_at > now() - interval '30 days'"):
        cache[pk] = same
    ask, seen = [], set()
    for d, o, v, sc in pairs:
        if v != S.MAYBE:
            continue
        if d.title == o.title:
            continue
        pk = pair_key(d, o)
        if pk in cache or pk in seen:
            continue
        seen.add(pk)
        ask.append((pk, d, o, sc))
    ask.sort(key=lambda x: (-max(x[1].ts, x[2].ts)))           # newest first: what readers see now
    ask = ask[:AI_MAX]
    log("pairs: %d sure, %d borderline (%d cached, asking %d)" % (sum(p[2] == S.SURE for p in pairs),
                                                                 sum(p[2] == S.MAYBE for p in pairs), len(cache), len(ask)))
    batches = [ask[i:i + 20] for i in range(0, len(ask), 20)]

    def run(b):
        res, by = ai_batch([(d.title, by_key[d.key]["spot"], o.title, by_key[o.key]["spot"]) for _, d, o, _ in b])
        return b, res, by

    n_ai = 0
    with ThreadPoolExecutor(THREADS) as ex:
        for b, res, by in ex.map(run, batches):
            rows = []
            for (pk, d, o, _), r in zip(b, res):
                if r is None:
                    continue
                cache[pk] = r
                n_ai += 1
                rows.append((pk, r, by, d.title[:300], o.title[:300]))
            if rows and not DRY:
                with con.cursor() as cur:
                    cur.executemany("""INSERT INTO hm_story_dup_verdicts (pair_key, same, decided_by, a_title, b_title)
                                       VALUES (%s,%s,%s,%s,%s) ON CONFLICT (pair_key) DO UPDATE
                                       SET same = EXCLUDED.same, decided_by = EXCLUDED.decided_by, decided_at = now()""", rows)
    log("ai verdicts: %d new" % n_ai)

    def decide(d, o):
        if d.title == o.title:
            return True
        pk = pair_key(d, o)
        if pk in cache:
            return cache[pk]
        st, _ = S.score(d, o)
        return st >= 0.6 and not (d.nums and o.nums and not (d.nums & o.nums)) and not (d.names and o.names and not (d.names & o.names))

    leader = S.cluster(docs, decide)
    clusters = defaultdict(list)
    for k, lk in leader.items():
        clusters[h32(lk)].append(by_key[k])
    # AI articles join the cluster of their source item even when the rewritten title differs
    rss_cluster = {it["ref"]: cid for cid, mem in clusters.items() for it in mem if it["kind"] == "rss"}
    in_cluster = {id(it) for mem in clusters.values() for it in mem}
    for it in items:
        if it["kind"] == "ai" and id(it) not in in_cluster and it.get("source_item") in rss_cluster:
            clusters[rss_cluster[it["source_item"]]].append(it)
    log("clusters: %d with %d items" % (len(clusters), sum(len(v) for v in clusters.values())))

    st = sites(con)
    general = sorted(s["id"] for s in st if 230 in s["shared"] or s["id"] == 230)
    rank = {sid: i for i, sid in enumerate(general)}
    hidden_rows = []
    per_site = defaultdict(int)
    for site in st:
        filt = site_filters(con, site["id"])
        sid = site["id"]
        for cid, mem in clusters.items():
            vis = [it for it in mem if visible(it, site, filt)]
            if len(vis) < 2:
                continue
            own = [it for it in vis if it["manual"] and it["kind"] != "ai"]   # editor news: never hidden
            ais = sorted((it for it in vis if it["kind"] == "ai"), key=lambda x: -x["ts"])
            if own:
                keep = own
            elif ais:
                keep = ais[:1]                                   # site's own AI article (latest development)
            else:
                siteown = [it for it in vis if it["site"] == sid and it["kind"] == "rss"]
                pool = siteown or vis
                variants = defaultdict(list)
                for it in pool:
                    variants[" ".join(it["doc"].tt)].append(it)
                vlist = []
                for vk, copies in variants.items():
                    copies.sort(key=lambda x: (x["kind"] != "rss", x["ref"]))   # lowest rss id = copy the theme keeps
                    c = copies[0]
                    vlist.append((0 if c["image"] else 1, repute(c["src"]), -c["ts"], c["ref"], c))
                vlist.sort(key=lambda x: x[:4])
                if siteown or sid not in rank:
                    keep = [vlist[0][4]]
                else:
                    keep = [vlist[(rank[sid] + cid) % len(vlist)][4]]
            ks = {id(k) for k in keep}
            for it in vis:
                if id(it) in ks or (it["manual"] and it["kind"] != "ai"):
                    continue
                hidden_rows.append((sid, it["slug"], cid, keep[0]["slug"], "dup:%s" % ("own" if own else "ai" if ais else "variant")))
                per_site[sid] += 1
    # unique (site, slug)
    uniq = {}
    for r in hidden_rows:
        uniq.setdefault((r[0], r[1]), r)
    hidden_rows = list(uniq.values())
    log("hidden rows: %d; per site: %s" % (len(hidden_rows), dict(sorted(per_site.items()))))
    if DRY:
        return clusters, hidden_rows
    now = datetime.now(timezone.utc)
    with con.transaction():
        prev = defaultdict(set)
        for sid, slug in con.execute("SELECT site_id, public_slug FROM hm_story_dup_hidden"):
            prev[sid].add(slug)
        con.execute("DELETE FROM hm_story_dup_hidden")
        with con.cursor() as cur:
            cur.executemany("""INSERT INTO hm_story_dup_hidden (site_id, public_slug, cluster_id, kept_slug, reason, computed_at)
                               VALUES (%s,%s,%s,%s,%s,%s)""", [r + (now,) for r in hidden_rows])
        con.execute("DELETE FROM hm_story_dup_clusters")
        rows = []
        for cid, mem in clusters.items():
            for it in mem:
                rows.append((cid, it["slug"], it["kind"], it["ref"], it["site"], it["src"][:40], it["title"][:300],
                             datetime.fromtimestamp(it["ts"], timezone.utc), now))
        with con.cursor() as cur:
            cur.executemany("""INSERT INTO hm_story_dup_clusters (cluster_id, public_slug, kind, ref_id, site_id, source, title,
                               published_at, computed_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""", rows)
    # page-cache rev bump only for sites whose recent hidden set changed (new duplicates on screen now)
    newh = defaultdict(set)
    for r in hidden_rows:
        newh[r[0]].add(r[1])
    changed = [sid for sid in set(prev) | set(newh) if prev.get(sid, set()) != newh.get(sid, set())]
    if changed and os.environ.get("DUP_BUMP_REV", "1") == "1":
        try:
            with con.cursor() as cur:
                cur.executemany("""INSERT INTO hm_site_override_rev (site_id, rev_at) VALUES (%s, now())
                                   ON CONFLICT (site_id) DO UPDATE SET rev_at = now()
                                   WHERE hm_site_override_rev.rev_at < now() - make_interval(mins => %s)""",
                                [(s, int(os.environ.get("DUP_BUMP_MIN", "30"))) for s in changed])
        except Exception as ex:
            log("rev bump:", str(ex)[:120])
    log("done in %.0fs; changed sites: %s" % (time.time() - t0, sorted(changed)))


if __name__ == "__main__":
    main()
