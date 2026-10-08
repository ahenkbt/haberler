/**
 * "Habere dönüştür" (user request 2026-10-08 21:53): an incoming site mail becomes a DRAFT news item of
 * that site (site-own editor item), never published automatically. The editor reviews it in the normal
 * add-news form (/editor/haberler/:id/duzenle) and publishes from there.
 *
 *  - title  = subject without Re:/Fwd:/YNT:/İLT: prefixes
 *  - body   = mail text (HTML flattened to safe paragraphs; quoted replies, signatures, disclaimers trimmed;
 *             for a forwarded mail the forwarded part is used)
 *  - images = <img> pictures of the mail body (http(s) or inline data:) copied to R2: first = cover,
 *             the rest are appended as a gallery. (Attachments are not stored by the inbound mail pipeline,
 *             so only pictures inside the mail body can be taken.)
 *  - category = keyword classifier over the site's own categories (editor can change it)
 *  - optional Evren AI ("AI ile düzenle"): news-style title/spot/body; on failure the plain draft is kept
 *  - hm_site_mail_news (mail DB) remembers message -> news, so a mail is converted only once.
 */
import { saveMediaDataUrlToS3 } from "./hm-editor-media-s3-edge.js";
import { handleKhEditorDataEdge } from "./hm-editor-kh-data-edge.js";

const SUBJECT_PREFIX_RE = /^\s*(?:\[[^\]]{1,30}\]\s*)?(?:(?:re|fw|fwd|ynt|yan[ıi]t|[iİ]lt|[iİ]leti|[iİ]letilen|tr|aw|wg|sv|vs|rv|enc)\s*(?:\[\d+\]|\(\d+\))?\s*[:：]\s*)+/i;

export function cleanSubject(raw) {
  let s = String(raw ?? "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 5; i += 1) {
    const next = s.replace(SUBJECT_PREFIX_RE, "").trim();
    if (next === s) break;
    s = next;
  }
  return s.slice(0, 220);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ccedil: "ç", Ccedil: "Ç", ouml: "ö", Ouml: "Ö", uuml: "ü", Uuml: "Ü", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" };

export function decodeEntities(s) {
  return String(s ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

/** HTML -> plain text with paragraph breaks; scripts/styles/heads/comments and quoted blocks dropped. */
export function htmlToText(html) {
  let s = String(html ?? "");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<(script|style|head|title|noscript|template|svg)[\s\S]*?<\/\1\s*>/gi, " ");
  s = s.replace(/<blockquote[^>]*type=["']?cite[\s\S]*?<\/blockquote\s*>/gi, "\n");
  s = s.replace(/<div[^>]*class=["'][^"']*gmail_quote[\s\S]*$/i, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|table|section|article)\s*>/gi, "\n\n");
  s = s.replace(/<li[^>]*>/gi, "• ");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s.replace(/\r/g, "").replace(/[ \t\u00a0]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const FORWARD_RE = /^[-_ ]*(?:-{2,}\s*)?(?:forwarded message|[iİ]letilen ileti|[iİ]leti iletildi|orijinal ileti|original message|begin forwarded message|yönlendirilen ileti)\b.*$/im;
const HEADER_LINE_RE = /^(?:from|kimden|gönderen|date|tarih|gönderildi|sent|subject|konu|to|kime|cc|bilgi)\s*:/i;
const CUT_RES = [
  /^--\s*$/,
  /^_{5,}\s*$/,
  /^(?:on|am|le)\s.{4,200}\s(?:wrote|schrieb|a écrit)\s*:\s*$/i,
  /^.{4,200}\s(?:tarihinde|zamanında).{0,120}(?:yazdı|şunu yazdı)\s*:?\s*$/i,
  /^(?:saygılarımla|saygılar(?:ımızla)?|[iİ]yi çalışmalar(?:ımızla)?|selamlar|sevgiler|kolay gelsin|kind regards|best regards|regards|best|thanks(?: and regards)?|teşekkürler(?:, saygılar)?)[,.!]?\s*$/i,
  /^(?:sent from my|iphone'?umdan gönderildi|ipad'?imden gönderildi|android için outlook|outlook for (?:ios|android)|get outlook for|samsung galaxy)/i,
  /^(?:bu e-?posta|bu ileti|bu mesaj|this e-?mail|this message|confidential|gizlilik|yasal uyarı|disclaimer|uyarı\s*:|important\s*:)/i,
];

/** Forwarded mail: the forwarded part (after its From/Date/Subject header block) is the story. */
export function extractForwarded(text) {
  const s = String(text ?? "");
  const m = s.match(FORWARD_RE);
  if (!m || m.index == null) return s;
  const before = s.slice(0, m.index).trim();
  const lines = s.slice(m.index + m[0].length).split("\n");
  let i = 0;
  while (i < lines.length && (lines[i].trim() === "" || HEADER_LINE_RE.test(lines[i].trim()))) i += 1;
  const fwd = lines.slice(i).join("\n").trim();
  // Keep a short personal note only when the forwarded part is empty.
  return fwd || before;
}

export function trimMailText(raw) {
  const text = extractForwarded(String(raw ?? "").replace(/\r/g, ""));
  const out = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (CUT_RES.some((re) => re.test(t)) && out.join("").trim().length > 0) break;
    if (/^>/.test(t)) continue;
    out.push(line.replace(/\s+$/, ""));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Plain text -> safe paragraphs (the only HTML the draft body gets from the mail). */
export function textToParagraphHtml(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export function makeSpot(text) {
  const first = String(text ?? "").split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).find((p) => p.length > 20) || "";
  if (first.length <= 240) return first;
  const cut = first.slice(0, 240);
  const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (dot > 80 ? cut.slice(0, dot + 1) : `${cut.replace(/\s+\S*$/, "")}…`).trim();
}

/** Picture candidates of a mail body (http(s) and inline data: images; no tracking pixels, logos/icons skipped). */
export function extractImageUrls(html, max = 6) {
  const out = [];
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(String(html ?? ""))) && out.length < max) {
    const tag = m[0];
    const src = decodeEntities((tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i) || tag.match(/\ssrc\s*=\s*([^\s>]+)/i) || [])[1] || "").trim();
    if (!src) continue;
    if (!/^https?:\/\//i.test(src) && !/^data:image\/(?:jpeg|png|gif|webp);base64,/i.test(src)) continue;
    const w = parseInt((tag.match(/\swidth\s*=\s*["']?(\d+)/i) || [])[1] || "0", 10);
    const h = parseInt((tag.match(/\sheight\s*=\s*["']?(\d+)/i) || [])[1] || "0", 10);
    if ((w && w < 120) || (h && h < 90)) continue;
    if (/(?:pixel|track|beacon|open\.gif|spacer|logo|icon|signature|imza|facebook|twitter|instagram|linkedin|whatsapp|youtube)/i.test(src.slice(0, 300))) continue;
    if (!out.includes(src)) out.push(src);
  }
  return out;
}

const TOPIC_KEYWORDS = [
  ["spor", ["maç", "gol", "futbol", "basketbol", "voleybol", "lig", "teknik direktör", "transfer", "şampiyon", "turnuva", "antrenman", "sporcu", "olimpiyat", "galatasaray", "fenerbahçe", "beşiktaş", "trabzonspor"]],
  ["ekonomi", ["ekonomi", "enflasyon", "faiz", "dolar", "euro", "borsa", "ihracat", "ithalat", "yatırım", "vergi", "zam", "asgari ücret", "merkez bankası", "piyasa", "esnaf", "ticaret", "sanayi", "fiyat"]],
  ["saglik", ["sağlık", "hastane", "doktor", "hekim", "tedavi", "hasta", "aşı", "salgın", "ameliyat", "ilaç", "kanser", "diyet", "beslenme"]],
  ["egitim", ["eğitim", "okul", "öğrenci", "öğretmen", "üniversite", "sınav", "yks", "lgs", "mezun", "ders", "akademik", "burs", "milli eğitim"]],
  ["teknoloji", ["teknoloji", "yapay zeka", "yazılım", "uygulama", "internet", "siber", "telefon", "dijital", "robot", "bilişim", "girişim"]],
  ["dunya", ["abd", "rusya", "ukrayna", "avrupa birliği", "nato", "bm ", "birleşmiş milletler", "israil", "gazze", "iran", "çin", "almanya", "fransa", "suriye", "kktc", "kıbrıs"]],
  ["siyaset", ["milletvekili", "meclis", "tbmm", "bakan", "cumhurbaşkanı", "parti", "seçim", "belediye başkanı", "muhalefet", "iktidar", "genel başkan", "kongre"]],
  ["asayis", ["polis", "jandarma", "gözaltı", "tutuklandı", "kaza", "yangın", "cinayet", "operasyon", "hırsız", "dolandırıcı", "yaralandı", "hayatını kaybetti", "mahkeme"]],
  ["kultur-sanat", ["sergi", "konser", "tiyatro", "festival", "sinema", "film", "kitap", "yazar", "sanatçı", "müze", "kültür", "sanat"]],
  ["cevre", ["çevre", "iklim", "orman", "deprem", "sel", "kuraklık", "geri dönüşüm", "doğa", "fidan", "hava kirliliği"]],
  ["yasam", ["yaşam", "hayat", "aile", "çocuk", "kadın", "yardım", "bağış", "gönüllü", "sosyal", "engelli", "yaşlı", "huzurevi"]],
  ["magazin", ["ünlü", "magazin", "evlendi", "boşandı", "dizi", "oyuncu", "şarkıcı"]],
];
const SLUG_ALIASES = { siyaset: ["siyaset", "politika"], asayis: ["asayis", "asayiş", "guvenlik", "polis-adliye", "adliye"], "kultur-sanat": ["kultur-sanat", "kultur", "sanat"], yasam: ["yasam", "hayat", "toplum"], cevre: ["cevre", "doga"], dunya: ["dunya", "dis-haberler"] };

function trLower(s) {
  return String(s ?? "").toLocaleLowerCase("tr-TR");
}

/** Keyword classifier over the site's categories: [{slug,name}] -> slug ('' if the site has none). */
export function suggestCategory(text, categories) {
  const cats = (categories || []).filter((c) => c && c.slug);
  if (!cats.length) return "";
  const hay = ` ${trLower(text)} `;
  const bySlug = new Map(cats.map((c) => [trLower(c.slug), c.slug]));
  const scored = TOPIC_KEYWORDS.map(([topic, words]) => [topic, words.reduce((n, w) => n + (hay.split(w).length - 1), 0)]).sort((a, b) => b[1] - a[1]);
  for (const [topic, score] of scored) {
    if (score <= 0) break;
    for (const alias of SLUG_ALIASES[topic] || [topic]) {
      if (bySlug.has(alias)) return bySlug.get(alias);
    }
    const byName = cats.find((c) => trLower(c.name).includes(topic.split("-")[0]));
    if (byName) return byName.slug;
  }
  for (const fallback of ["gundem", "yerel", "turkiye", "haberler", "son-dakika"]) {
    if (bySlug.has(fallback)) return bySlug.get(fallback);
  }
  return cats[0].slug;
}

export function buildDraftFromMail(message) {
  const subject = cleanSubject(message?.subject || "");
  const rawText = String(message?.text || "").trim() || htmlToText(message?.html || "");
  const fromHtml = message?.html ? htmlToText(message.html) : "";
  // Prefer the HTML version when the text part is empty or much shorter (some clients send a stub text part).
  const base = fromHtml && fromHtml.length > rawText.length * 1.5 ? fromHtml : rawText;
  const body = trimMailText(base);
  const title = subject || makeSpot(body).slice(0, 120) || "E-postadan haber";
  return { title, spot: makeSpot(body), bodyText: body, content: textToParagraphHtml(body) };
}

export function parseFromHeader(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: s.toLowerCase() };
}

/* ---------- side effects (Worker) ---------- */

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function copyImageToR2(env, src) {
  try {
    if (/^data:image\//i.test(src)) {
      if (src.length > 12_000_000) return null;
      const r = await saveMediaDataUrlToS3(env, src, "posta");
      return r?.url || null;
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(src, { signal: ctl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 HM-posta-haber" } }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const type = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png|gif|webp)$/.test(type)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 3000 || buf.length > 8 * 1024 * 1024) return null;
    const r = await saveMediaDataUrlToS3(env, `data:${type};base64,${bytesToBase64(buf)}`, "posta");
    return r?.url || null;
  } catch {
    return null;
  }
}

async function evrenRewrite(env, draft) {
  const key = String(env?.EVREN_API_KEY || "").trim();
  if (!key) return { error: "Evren AI anahtarı tanımlı değil" };
  const prompt = `Aşağıdaki e-postayı Türkçe bir haber metnine dönüştür. Bilgileri değiştirme, ekleme yapma, abartma.
Kısa ve net bir haber başlığı (en fazla 90 karakter), 1-2 cümlelik spot ve paragraflar halinde haber metni yaz.
Kişisel hitap, imza ve yasal uyarıları çıkar. Sadece şu JSON'u döndür: {"title":"...","spot":"...","paragraphs":["...","..."]}

Konu: ${draft.title}

E-posta:
${draft.bodyText.slice(0, 9000)}`;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 55_000);
    const res = await fetch("https://evren-llmapi.ssyz.org.tr/v1/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env?.EVREN_MODEL || "deepseek-v4-flash",
        messages: [
          { role: "system", content: "Sen deneyimli bir Türk haber editörüsün. Yalnızca geçerli JSON döndürürsün." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    }).finally(() => clearTimeout(timer));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: `Evren AI HTTP ${res.status}` };
    const raw = String(data?.choices?.[0]?.message?.content || "");
    const jsonText = (raw.match(/\{[\s\S]*\}/) || [""])[0];
    const j = JSON.parse(jsonText);
    const title = String(j.title || "").trim().slice(0, 200);
    const spot = String(j.spot || "").trim().slice(0, 400);
    const paragraphs = (Array.isArray(j.paragraphs) ? j.paragraphs : String(j.content || "").split(/\n{2,}/)).map((p) => String(p).trim()).filter(Boolean);
    if (!title || !paragraphs.length) return { error: "Evren AI boş yanıt verdi" };
    return { title, spot, content: textToParagraphHtml(paragraphs.join("\n\n")) };
  } catch (err) {
    return { error: `Evren AI yanıt vermedi (${String(err?.name === "AbortError" ? "zaman aşımı" : err?.message || err).slice(0, 80)})` };
  }
}

async function editorApi(request, env, path, init = {}) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  const req = new Request(url.toString(), {
    method: init.method || "GET",
    headers: { Authorization: request.headers.get("Authorization") || "", "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const res = await handleKhEditorDataEdge(req, env, url);
  const data = res ? await res.json().catch(() => ({})) : {};
  return { status: res?.status ?? 500, data };
}

/** Converted state of messages for the site (message id -> {newsId, slug}). */
export async function conversionsFor(msql, siteId, ids) {
  const list = (ids || []).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0);
  if (!list.length) return new Map();
  try {
    const rows = await msql`SELECT message_id, news_id, news_slug FROM hm_site_mail_news WHERE site_id = ${siteId} AND message_id = ANY(${list}) AND news_id IS NOT NULL`;
    return new Map((rows || []).map((r) => [Number(r.message_id), { newsId: Number(r.news_id), slug: r.news_slug || null }]));
  } catch {
    return new Map();
  }
}

/**
 * POST .../messages/:id/to-news {ai?: boolean}. `message` is already ownership-checked by the caller.
 * Returns {status, body}.
 */
export async function convertMailToNews(request, env, { msql, site, editor, message, ai }) {
  if (message.direction !== "in") return { status: 400, body: { error: "Yalnızca gelen e-postalar habere dönüştürülür." } };
  const siteId = Number(site.id);
  // Claim (one conversion per mail per site). A claim without news older than 3 minutes is stale (failed run).
  const claim = await msql`
    INSERT INTO hm_site_mail_news (message_id, site_id, editor_id) VALUES (${message.id}, ${siteId}, ${editor.id})
    ON CONFLICT (message_id, site_id) DO NOTHING RETURNING message_id
  `;
  if (!claim?.[0]) {
    const cur = (await msql`SELECT news_id, news_slug, created_at FROM hm_site_mail_news WHERE message_id = ${message.id} AND site_id = ${siteId}`)?.[0];
    if (cur?.news_id) {
      return { status: 409, body: { error: "Bu e-posta zaten habere dönüştürüldü.", newsId: Number(cur.news_id), editUrl: `/editor/haberler/${cur.news_id}/duzenle` } };
    }
    if (cur && Date.now() - new Date(cur.created_at).getTime() < 180_000) {
      return { status: 409, body: { error: "Dönüştürme sürüyor, lütfen birkaç saniye sonra tekrar deneyin." } };
    }
    await msql`UPDATE hm_site_mail_news SET created_at = now(), editor_id = ${editor.id} WHERE message_id = ${message.id} AND site_id = ${siteId} AND news_id IS NULL`;
  }
  const release = () => msql`DELETE FROM hm_site_mail_news WHERE message_id = ${message.id} AND site_id = ${siteId} AND news_id IS NULL`.catch(() => {});
  try {
    const notes = [];
    const draft = buildDraftFromMail({ subject: message.subject, text: message.body_text, html: message.body_html });
    if (!draft.bodyText && !draft.title) {
      await release();
      return { status: 400, body: { error: "E-postada habere dönüştürülecek metin yok." } };
    }
    let { title, spot, content } = draft;
    let aiUsed = false;
    if (ai) {
      const r = await evrenRewrite(env, draft);
      if (r.error) notes.push(`${r.error}; e-posta metni olduğu gibi kullanıldı.`);
      else {
        ({ title, spot, content } = r);
        aiUsed = true;
      }
    }
    const urls = extractImageUrls(message.body_html || "");
    const images = [];
    for (const src of urls) {
      const u = await copyImageToR2(env, src);
      if (u) images.push(u);
    }
    if (urls.length && !images.length) notes.push("E-postadaki görseller alınamadı.");
    if (images.length > 1) {
      content += `\n${images.slice(1).map((u) => `<figure class="hm-mail-gallery"><img src="${escapeHtml(u)}" alt="${escapeHtml(title)}" loading="lazy"></figure>`).join("\n")}`;
    }
    const cats = await editorApi(request, env, "/api/hm/editor/categories");
    const list = Array.isArray(cats.data) ? cats.data : Array.isArray(cats.data?.categories) ? cats.data.categories : [];
    const categorySlug = suggestCategory(`${title}\n${draft.bodyText}`, list.map((c) => ({ slug: c.slug, name: c.name })));
    if (!categorySlug) {
      await release();
      return { status: 400, body: { error: "Sitede kategori yok; önce bir kategori ekleyin." } };
    }
    const from = parseFromHeader(message.from_addr);
    const created = await editorApi(request, env, "/api/hm/editor/news", {
      method: "POST",
      body: {
        title,
        spot: spot || undefined,
        content,
        imageUrl: images[0] || undefined,
        categorySlug,
        senderFullName: from.name || undefined,
        senderEmail: from.email || undefined,
        status: "draft",
        siteOnly: true,
        tags: [],
      },
    });
    const newsId = Number(created.data?.id);
    if (created.status >= 300 || !Number.isFinite(newsId) || newsId <= 0) {
      await release();
      return { status: 502, body: { error: created.data?.error || "Taslak haber oluşturulamadı." } };
    }
    const slug = String(created.data?.slug || "");
    await msql`UPDATE hm_site_mail_news SET news_id = ${newsId}, news_slug = ${slug}, ai_used = ${aiUsed} WHERE message_id = ${message.id} AND site_id = ${siteId}`;
    return {
      status: 200,
      body: { ok: true, newsId, slug, status: "draft", editUrl: `/editor/haberler/${newsId}/duzenle`, categorySlug, images: images.length, aiUsed, notes },
    };
  } catch (err) {
    await release();
    throw err;
  }
}
