"""turksav.org (site 233) defense columnists (turksav concept 2026-10-08, user request: "savunma haberde yazar isimlerini değiştir,
sadece konsept yazılar yazsın").

The 10 fictional persona columnists (authors 615-624, ai_author=true, hm_site_id=233; schedule in hm_ai_columnists site_id=233)
write ONLY defense/security concept columns: savunma sanayii, deniz gücü / Mavi Vatan, hava-uzay, kara sistemleri,
siber / elektronik harp, hava savunma, jeopolitik, iç güvenlik (Jandarma / Emniyet), askerî tarih, insansız sistemler / Ar-Ge.
Every draft passes: word count, columnists.moderate (no politics, no invented quotes/statistics), a concept gate (distinct
defense terms + an LLM yes/no "is this a defense/security concept column"), title not similar to the site's recent column titles.

  python /app/turksav_columns.py write [--dry-run] [--force] [--authors 615,616] [--date YYYY-MM-DD]
Mounted read-only by /docker/php-theme/ai-editor/ops/turksav-columns.sh (same image/env as the AI editor).
Stop: delete /etc/cron.d/php-theme-turksav-columns, or UPDATE authors SET ai_writing_enabled=false WHERE id=<author>."""
import argparse, json, os, re, sys

sys.path.insert(0, "/app")
import lib
from lib import log
import columnists as C

SITE_ID = 233
CFG_SITE = 230  # same provider chain as the turkatahaber columnists (Evren -> NVIDIA -> Gemini -> OpenAI)
CONCEPT = re.compile(r"(?i)(savunma|güvenlik|asker|askerî|askeri|ordu|harp|harb|muharebe|cephe|komuta|donanma|deniz kuvvet|deniz gücü|mavi vatan|"
                     r"hava kuvvet|hava gücü|kara kuvvet|jandarma|emniyet teşkilat|silahlı kuvvet|mehmetçik|caydırıcı|strateji|zırh|füze|"
                     r"mühimmat|silah|savunma sanayi|insansız|tatbikat|harekât|harekat|tersane|fırkateyn|denizaltı|sınır güvenliği|istihbarat|"
                     r"radar|elektronik harp|siber|uydu|hava savunma|tehdit|operasyon)")
CONCEPT_MIN = 5
SELF_AI = re.compile(r"(?i)(yapay\s+zek[aâ]\s+(olarak|tarafından)|\bdil\s+modeli|language model|chatgpt|deepseek|gemini)")

SYSTEM = """Sen {name} imzasıyla Türkçe köşe yazısı yazan bir savunma ve güvenlik analistisin. Yazı bir savunma-güvenlik haber sitesinde yayımlanır.
Uzmanlık alanın: {label}. Kapsam: {brief}
KESİN KURALLAR:
- KONSEPT: Yazı baştan sona savunma, güvenlik, askerî strateji, savunma sanayii ya da askerî tarih alanında olmalı ve senin uzmanlık alanında kalmalı. Günlük yaşam, sağlık, mutfak, spor, magazin, kişisel gelişim konusu YOK.
- Kavramsal, analitik ve öğretici bir köşe yazısı yaz: haber dili değil; okura bir kavramı, bir yaklaşımı, bir tarihî dersi ya da bir teknolojinin mantığını anlat. Akıcı, ciddi, kurallı Türkçe.
- Siyaset YOK: parti, seçim, iktidar/muhalefet, hükümet, cumhurbaşkanı, başbakan, bakan, milletvekili, siyasetçi, siyaset, siyasi, ideoloji kelimelerini hiç kullanma. Yaşayan gerçek kişi adı kullanma (tarihî komutanlar ve şahsiyetler genel kabul görmüş bilgilerle anılabilir).
- Uydurma alıntı, söz, istatistik, yüzde, para/adet/menzil/hız rakamı, araştırma sonucu YOK. Metinde HİÇ tırnak işareti kullanma. Tarihî yıllar (ör. 1071, 1915, 1974) kullanılabilir.
- Doğrulanamayacak güncel iddia (yeni sözleşme, teslimat, test, ihale, ürün özelliği, gizli bilgi) ileri sürme; belirli bir ülkeyi, orduyu ya da kurumu suçlayan iddia yazma. Gizli/operasyonel ayrıntı verme.
- Kendini gerçek bir kişi gibi tanıtma; biyografik iddia (rütbe, görev, yaş) ve yaşanmış anı/sahne uydurma. Görüş dili (bence, kanaatimce, değerlendirmem şu ki) serbest.
- Yapay zekâdan, yazının nasıl yazıldığından, site/gazete adından söz etme. Yazıya bugünün tarihiyle ya da mevsimle başlama.
- UZUNLUK: 750-900 kelime: giriş, "## " ile başlayan 3-5 ara başlıklı bölüm (her biri 2-3 dolu paragraf) ve güçlü bir sonuç.
- Başlık: dikkat çekici ama abartısız, en fazla 75 karakter, tıklama tuzağı yok.
Yanıt yalnızca JSON: {{"title": "başlık", "spot": "1-2 cümle özet, en fazla 220 karakter", "body": "paragraflar arası boş satır, ara başlıklar ## ile"}}"""

CONCEPT_SYSTEM = """Bir köşe yazısının bir savunma ve güvenlik sitesine uygun olup olmadığını denetliyorsun. Uygun = ana konu savunma, güvenlik, askerî strateji, askerî tarih, savunma sanayii/teknolojisi, iç güvenlik (jandarma/emniyet teşkilatı) ya da jeopolitik güvenlik. Ana konusu günlük yaşam, sağlık, mutfak, spor, kişisel gelişim, genel kültür olan yazı UYGUN DEĞİL.
Yalnızca JSON: {"defense_concept": true/false, "reason": "kısa açıklama"}"""


MOD_SYSTEM = """Bir savunma ve güvenlik köşe yazısını yayın öncesi denetliyorsun. Savunma stratejisi, caydırıcılık, deniz yetki alanları, Mavi Vatan,
ittifaklar, bölgesel güvenlik ve millî güvenlik çıkarlarının kavramsal/analitik tartışılması SİYASİ SAYILMAZ (sitenin konusudur).
Siyasi = parti, seçim, iktidar/muhalefet, belirli bir hükümetin ya da yaşayan bir siyasetçinin övülmesi/eleştirilmesi, iç siyaset polemiği.
Şunları kontrol et: siyasi içerik (yukarıdaki tanımla), uydurma alıntı, istatistik/yüzde/rakamla verilen iddia, doğrulanamayacak güncel olay/sözleşme/ürün iddiası,
yaşayan gerçek kişi hakkında iddia, nefret/ayrımcılık, bir ülkeyi ya da halkı hedef gösteren düşmanca dil, gizli/operasyonel ayrıntı.
Yalnızca JSON: {"political": true/false, "invented_quotes_or_stats": true/false, "other_risk": true/false, "reason": "kısa açıklama"}"""


def moderate(cfg, title, spot, body):
    """columnists.moderate with a defense-aware AI check (strategy/geopolitics is the site's topic, not politics)."""
    text = "%s\n%s\n%s" % (title, spot, body)
    reasons = []
    m = C.POLITICAL.search(text) or C.POLITICAL.search(lib.fold(text)) or C.POLITICAL_NAMES.search(text)
    if m:
        reasons.append("politik kelime: %s" % m.group(0))
    if C.STATS.search(text):
        reasons.append("istatistik/iddia: %s" % C.STATS.search(text).group(0))
    if C.QUOTES.search(text):
        reasons.append("tırnaklı alıntı")
    if reasons:
        return reasons
    try:
        d, _, _ = lib.chat_json(cfg, MOD_SYSTEM, text[:12000], max_tokens=500, temperature=0, task="classify")
        if d.get("political"):
            reasons.append("AI denetim: siyasi (%s)" % str(d.get("reason") or "")[:120])
        if d.get("invented_quotes_or_stats"):
            reasons.append("AI denetim: alıntı/istatistik (%s)" % str(d.get("reason") or "")[:120])
        if d.get("other_risk"):
            reasons.append("AI denetim: risk (%s)" % str(d.get("reason") or "")[:120])
    except lib.AIError as ex:
        reasons.append("AI denetim yapılamadı: %s" % ex)  # fail closed
    return reasons


def concept_problems(cfg, text):
    found = {m.group(0).lower() for m in CONCEPT.finditer(text)}
    if len(found) < CONCEPT_MIN:
        return ["konsept dışı: %d farklı savunma terimi" % len(found)]
    try:
        d, _, _ = lib.chat_json(cfg, CONCEPT_SYSTEM, text[:12000], max_tokens=300, temperature=0, task="classify")
        if not d.get("defense_concept"):
            return ["konsept dışı (AI): %s" % str(d.get("reason") or "")[:120]]
    except lib.AIError as ex:
        return ["konsept denetimi yapılamadı: %s" % ex]  # fail closed
    return []


def cmd_write(args):
    con = lib.connect()
    today = lib.trt_now().date() if not args.date else __import__("datetime").datetime.strptime(args.date, "%Y-%m-%d").date()
    wd = today.isoweekday()
    rows = con.execute("""SELECT c.author_id, a.name, c.topic_label, c.topic_brief, c.min_words, c.max_words, c.weekdays
                          FROM hm_ai_columnists c JOIN authors a ON a.id = c.author_id AND a.hm_site_id = c.site_id
                          WHERE c.site_id=%s AND a.is_active AND a.ai_writing_enabled AND a.ai_author
                            AND NOT EXISTS (SELECT 1 FROM hm_site_author_hidden h WHERE h.site_id=c.site_id AND h.author_id=a.id)
                          ORDER BY c.author_id""", (SITE_ID,)).fetchall()
    if args.authors:
        want = {int(x) for x in args.authors.split(",") if x.strip()}
        rows = [r for r in rows if r[0] in want]
    if not args.force:
        rows = [r for r in rows if wd in (r[6] or [])]
    log("turksav columns %s (weekday %d): %d authors due" % (today, wd, len(rows)))
    if not rows:
        return 0
    cfg = lib.resolve_ai(con, CFG_SITE)
    for aid, name, label, brief, minw, maxw, _wd in rows:
        done = con.execute("SELECT status FROM hm_ai_column_log WHERE author_id=%s AND column_date=%s", (aid, today)).fetchone()
        if done and done[0] == "published" and not args.dry_run:
            continue
        own = [r[0] for r in con.execute("""SELECT title FROM hm_makaleler WHERE author_id=%s AND site_id=%s AND status='published'
                                            ORDER BY created_at DESC LIMIT 15""", (aid, SITE_ID))]
        site_recent = [r[0] for r in con.execute("""SELECT title FROM hm_makaleler WHERE site_id=%s AND status='published'
                                                    AND created_at > now() - interval '21 days' ORDER BY created_at DESC LIMIT 60""", (SITE_ID,))]
        user = ("Bugün %s. %s alanında yeni bir köşe yazısı yaz. Somut bir alt konu ya da kavram seç ve derinleştir.\n"
                "Daha önce yazdığın başlıklar (tekrar etme): %s\n"
                "Sitedeki diğer yazarların son başlıkları (aynı konuya girme): %s\n"
                % (today.strftime("%d.%m.%Y"), label, "; ".join(own) or "-", "; ".join(t for t in site_recent if t not in own)[:3000] or "-"))
        status, reason, res = "failed", None, None
        for attempt in range(4):
            try:
                d, model, _ = lib.chat_json(cfg, SYSTEM.format(name=name, label=label, brief=brief), user, max_tokens=7000, temperature=0.8)
            except lib.AIError as ex:
                reason = "AI hata: %s" % ex
                break
            title = re.sub(r"\s+", " ", str(d.get("title") or "")).strip().strip("\"“”")[:120]
            spot = re.sub(r"\s+", " ", str(d.get("spot") or "")).strip()[:300]
            body = str(d.get("body") or "").strip()
            words = len(re.findall(r"\w+", re.sub(r"^#.*$", "", body, flags=re.M)))
            text = "%s\n%s\n%s" % (title, spot, body)
            problems = []
            if not (minw <= words <= maxw + 80):
                problems.append("kelime sayısı %d" % words)
            if not title or not spot:
                problems.append("başlık/özet yok")
            sim = next((t for t in site_recent if title and lib.similar(title, t, 0.4)), None)
            if sim:
                problems.append("başlık benziyor: %s" % sim)
            if SELF_AI.search(text):
                problems.append("model adı geçiyor")
            if not problems:
                problems += concept_problems(cfg, text)
            if not problems:
                problems += moderate(cfg, title, spot, body)
            res = dict(title=title, spot=spot, body=body, words=words, model=model, attempt=attempt + 1)
            if not problems:
                status, reason = "published", None
                break
            status, reason = "moderated_out", "; ".join(problems)
            hint = ""
            if words < minw:
                hint += " Yazı çok kısaydı (%d kelime): en az 780 kelime yaz." % words
            elif words > maxw + 80:
                hint += " Yazı çok uzundu (%d kelime): en fazla 880 kelime yaz." % words
            if "konsept" in reason:
                hint += " Konu açıkça savunma/güvenlik alanında ve senin uzmanlık alanında olsun."
            if "benziyor" in reason:
                hint += " Başlık ve konu tamamen farklı olsun."
            if "istatistik" in reason or "alıntı" in reason:
                hint += " Hiç rakam (bin, milyon, yüzde, adet, menzil) ve tırnak kullanma."
            if "politik" in reason or "siyasi" in reason:
                hint += " Siyaset kelimelerini (siyasi, siyaset, hükümet, iktidar, bakan, cumhurbaşkanı) hiç kullanma."
            user += "\n\nÖNCEKİ DENEME REDDEDİLDİ (%s). Kurallara kesin uy.%s" % (reason, hint)
        log("  %d %s [%s] %s: %s %s" % (aid, name, label, status, (res or {}).get("title", ""), reason or ""))
        if args.dry_run:
            if res:
                print(json.dumps(dict(author=name, status=status, reason=reason, **res), ensure_ascii=False)[:3000], flush=True)
            continue
        mid = None
        with con.transaction():
            if status == "published":
                base = "%s-%s" % (lib.slugify(re.sub(r"[\'’‘`]", "", res["title"]), 70), today.strftime("%Y%m%d"))
                slug, n = base, 2
                while con.execute("SELECT 1 FROM hm_makaleler WHERE site_id=%s AND slug=%s", (SITE_ID, slug)).fetchone():
                    slug, n = "%s-%d" % (base, n), n + 1
                mid = con.execute("""INSERT INTO hm_makaleler (site_id, author_id, title, slug, spot, content, image_url, status,
                                                              external_key, ai_generated)
                                     VALUES (%s,%s,%s,%s,%s,%s,NULL,'published',%s,true) RETURNING id""",
                                  (SITE_ID, aid, res["title"], slug, res["spot"], C.body_html(res["body"]),
                                   "ts-col:%d:%s" % (aid, today.isoformat()))).fetchone()[0]
            con.execute("""INSERT INTO hm_ai_column_log (author_id, column_date, status, makale_id, title, reason, checks)
                           VALUES (%s,%s,%s,%s,%s,%s,%s)
                           ON CONFLICT (author_id, column_date) DO UPDATE SET status=EXCLUDED.status, makale_id=EXCLUDED.makale_id,
                             title=EXCLUDED.title, reason=EXCLUDED.reason, checks=EXCLUDED.checks""",
                        (aid, today, status, mid, (res or {}).get("title"), reason,
                         json.dumps({"site": SITE_ID, "words": (res or {}).get("words"), "model": (res or {}).get("model"),
                                     "attempt": (res or {}).get("attempt")})))
            con.execute("UPDATE hm_ai_columnists SET last_run_at=now() WHERE author_id=%s", (aid,))
        log("      -> %s" % ("makale %d /haber/%s" % (mid, slug) if mid else "nothing published"))
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("write")
    w.add_argument("--dry-run", action="store_true")
    w.add_argument("--force", action="store_true", help="ignore the weekday schedule (still one column per author per day)")
    w.add_argument("--authors", default="")
    w.add_argument("--date", default="")
    args = ap.parse_args()
    if os.environ.get("AI_EDITOR_ENABLED", "1") != "1":
        log("AI_EDITOR_ENABLED != 1; nothing to do")
        return 0
    return {"write": cmd_write}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
