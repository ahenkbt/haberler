#!/usr/bin/env python3
"""ai-autoenable 2026-10-10 (C): site açılışında AI Haber Editörü OTOMATİK aktif + site konseptine göre içerik.
Her 5 dakikada cron'dan çalışır, İDEMPOTENT:
  1. KESİN KURAL: kesim zamanından (autoenable.cutoff) SONRA açılan her aktif haber sitesi (kurumsal/test hariç) için hm_ai_editor_sites satırı
     yoksa enabled=true açar (günlük manşet hedefi 6). Eski sitelere dokunmaz (kota/maliyet; liste raporda).
  2. KONSEPT: kullanıcı konsepti panelde site "Açıklama" alanına (description) ya da layout_json.hmAiConcept alanına yazar. Satırın notes'unda
     'concept:auto' varsa ve metin değiştiyse topic_rule (AI'ya KESİN KONU KURALI) + keywords güncellenir; elle düzenlenen satırlar (concept:auto yok) ezilmez.
     Konsept metni yoksa kural genel (site adı + kategori) kalır.
Geri alma: /etc/cron.d/php-theme-ekonomi içindeki satırı sil; satırı enabled=false yap."""
import hashlib, json, os, re, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
CUTOFF_FILE = os.path.join(DIR, "autoenable.cutoff")
CORP_SLUGS = {"vkd", "vatankahramanlari", "trafik", "tr", "tukav"}
SKIP_RX = re.compile(r"zzprobe|^test", re.I)
STOP = set("""ve veya ile için gibi olan olarak bir bu şu daha çok en kadar ama fakat ancak hem de da ki mi mı mu mü ya yani her tüm bütün
sadece yalnızca haber haberleri haberler site sitesi yayın yayınlar içerik içerikler konu konular hakkında üzerine ilgili göre sonra önce
bizim biz siz onun ona ile gelen gelir yer yeri yerel genel türkiye""".split())


def psql(sql):
    url = subprocess.run(["bash", "-c", '. /root/.hmdb.env && printf %s "$TP_URL"'], capture_output=True, text=True).stdout
    r = subprocess.run(["psql", url, "-X", "-A", "-t", "-F", "\x1f", "-v", "ON_ERROR_STOP=1", "-c", sql], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        raise SystemExit("psql: " + r.stderr[:400])
    return [l.split("\x1f") for l in r.stdout.splitlines() if l.strip()]


def lit(s):
    return "$q$" + str(s).replace("$q$", "") + "$q$"


def arr(xs):
    return "ARRAY[%s]::text[]" % ",".join(lit(x) for x in xs) if xs else "ARRAY[]::text[]"


def words(text):
    out = []
    for w in re.findall(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]{4,}", text):
        w = w.lower().replace("İ", "i")
        if w not in STOP and w not in out:
            out.append(w)
    return out[:20]


def concept_of(layout, description):
    c = str(layout.get("hmAiConcept") or "").strip()
    return c if c else (description or "").strip()


def main():
    if not os.path.exists(CUTOFF_FILE):
        psql("select 1")
        open(CUTOFF_FILE, "w").write(psql("select to_char(now() at time zone 'utc','YYYY-MM-DD HH24:MI:SS')")[0][0])
    cutoff = open(CUTOFF_FILE).read().strip()
    rows = psql("select s.id,s.slug,coalesce(s.domain,''),coalesce(s.layout_json,''),coalesce(s.description,''),s.created_at > '%s'::timestamp "
                "from hm_news_sites s where s.active" % cutoff)
    have = {int(r[0]): r[1:] for r in psql("select site_id,notes,coalesce(topic_rule,'') from hm_ai_editor_sites")}
    made = synced = 0
    for sid, slug, domain, lj, desc, is_new in rows:
        sid = int(sid)
        try:
            lay = json.loads(lj) if lj else {}
        except Exception:
            lay = {}
        if not isinstance(lay, dict):
            lay = {}
        kind = str(lay.get("hmSiteKind") or "").lower()
        corp = kind == "corporate" or slug in CORP_SLUGS or str(lay.get("hmVitrinTheme") or "").lower() in ("corporate", "kurumsal", "vatan")
        if corp or SKIP_RX.search(slug):
            continue
        concept = concept_of(lay, desc)
        if lay.get("hmEco") and concept == (desc or "").strip() and not lay.get("hmAiConcept") and desc.startswith("Ekonomi Gündemi:"):
            concept = ""  # ekonomi: varsayılan açıklama konsept sayılmaz (eko kuralı geçerli)
        h = hashlib.md5(concept.encode()).hexdigest()[:10]
        if sid not in have:
            if is_new != "t":
                continue
            cats = [r[0] for r in psql("select slug from categories where exclusive_site_id=%d order by sort_order" % sid)] + ["gundem"]
            rule = ("Sitenin konsepti: %s Yalnızca bu konseptle ilgili haberleri seç; konu dışı haberleri seçme." % concept) if concept else ""
            psql("insert into hm_ai_editor_sites (site_id,site_slug,domain,concept_type,keywords,categories,exclude_categories,daily_manset_target,min_score,enabled,notes,topic_rule) "
                 "values (%d,%s,%s,'genel',%s,%s,ARRAY['global']::text[],6,5,true,%s,%s) on conflict (site_id) do nothing"
                 % (sid, lit(slug), lit(domain), arr(words(concept)), arr(cats), lit("AI Haber Editörü site açılışında otomatik açıldı (concept:auto) concept-hash:%s" % h), lit(rule) if rule else "NULL"))
            made += 1
            print("ai-autoenable: site %d (%s) AI editör AÇILDI" % (sid, slug))
            continue
        notes, trule = have[sid][0], have[sid][1]
        if "concept:auto" in notes and concept:
            m = re.search(r"concept-hash:([0-9a-f]{10})", notes)
            if not m or m.group(1) != h:
                rule = "Sitenin konsepti: %s Yalnızca bu konseptle ilgili haberleri seç; konu dışı haberleri seçme." % concept
                notes2 = re.sub(r"\s*concept-hash:[0-9a-f]{10}", "", notes) + " concept-hash:" + h
                psql("update hm_ai_editor_sites set topic_rule=%s, keywords=%s, notes=%s, updated_at=now() where site_id=%d" % (lit(rule), arr(words(concept)), lit(notes2), sid))
                synced += 1
                print("ai-autoenable: site %d (%s) konsept güncellendi" % (sid, slug))
    if made or synced:
        print("ai-autoenable: açılan=%d konsept-güncellenen=%d" % (made, synced))


if __name__ == "__main__":
    main()
