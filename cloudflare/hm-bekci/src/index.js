// hm-bekci — AI Bekçi + AI Haber Editörü scheduler for the HM news sites (Cloudflare Worker).
// Cron */10: browser-facing probes (no self-fetch), DB freshness, safe auto-fixes, AI (Evren-first) diagnosis.
// Cron 17 3,8,13,18 / 47 5,10,15,20 (UTC): queue the AI Haber Editörü run (VPS runner executes the existing job).
// Routes on ahenk.net.tr: /api/hm/admin/site-watchdog* (feeds the existing "Haber AI Bekçi" page),
// /api/bekci/* (AI Haber Editörü page API), /admin* (HTML passthrough + shortcut bar; /admin/ai-icerik-robotu page).
// Never: container restart, deleting data, pbx.goalgo.org / goalgo / turkatav-platform changes.
import { neon } from "@neondatabase/serverless";
import { ozelSites, ozelCreate, ozelList, ozelSetStatus, ozelMedia, ozelPage, OZEL_CAT_SLUG } from "./ozel.js";

const UA = "Mozilla/5.0 (compatible; AhenkBekci/2.0; +https://ahenk.net.tr/admin/haber-siteleri-bekci)";
const SUSPENDED = new Set(["kirsehirhaber.org"]);
const CORPORATE = new Set(["vkd", "trafik", "tr"]);              // kurumsal: probe only, no news checks
const HANDS_OFF = { "tukav.org": "tukav.org Cloudflare Pages 'goalgo' projesinden yayınlanıyor (goalgo/turkatav-platform) — bekçi dokunmaz, yalnız raporlar." };
const PANEL_ID = { 230: 1132, 231: 1087, 232: 1088, 233: 1089, 236: 1090, 237: 1091 };   // PHP id -> panel (Worker DB) id
const IMPORTER_LOG = { 1: "importer-vatanhaber", 3: "importer-sha-asg", 8: "importer-sha-ahg", 230: "importer", 231: "importer-yerelnet",
  232: "importer-sehitgazi", 233: "importer-turksav", 236: "importer-yesilvatan", 237: "importer-dunyasaglik" };
const IMPORTER_SLUG = { 1: "vatanhaber", 3: "asg", 8: "ankarahabergundemi", 230: "main", 231: "yerelnet", 232: "sehitgazi", 233: "turksav", 236: "yesilvatan", 237: "dunyasaglik" };
const IMPORTER_MAX_MIN = { "importer": 40, "importer-sha-asg": 75, "importer-sha-ahg": 75 };   // others: every 30 min -> 75
const PURGE_COOLDOWN_MIN = 60, IMPORT_COOLDOWN_MIN = 180, STALE_WARN_H = 6, STALE_CRIT_H = 24, MANSET_STUCK_H = 10;

// ---------------------------------------------------------------- helpers
// Workers allow only 6 simultaneous open connections per invocation; queued fetches would burn their own timeout
// and show up as false "zaman aşımı" / broken images. Gate all probe fetches through a small semaphore.
let _active = 0; const _waiters = [];
const _acquire = () => _active < 5 ? (_active++, Promise.resolve()) : new Promise((r) => _waiters.push(r));
const _release = () => { const n = _waiters.shift(); if (n) n(); else _active--; };
async function timed(url, opts = {}) {
  await _acquire();
  try { return await _timed(url, opts); } finally { _release(); }
}
async function _timed(url, { method = "GET", headers = {}, body, ms = 15000, noBody = false, maxBody = 600000 } = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method, body, redirect: "follow", headers: { "user-agent": UA, accept: "text/html,application/xml,*/*", ...headers }, signal: AbortSignal.timeout(ms) });
    let text = "";
    if (!noBody) text = (await r.text()).slice(0, maxBody); else r.body?.cancel?.();
    return { status: r.status, ms: Date.now() - t0, body: text, ctype: r.headers.get("content-type") || "", cf: r.headers.get("cf-cache-status") || "", url: r.url };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, body: "", err: String(e?.message || e).slice(0, 120) };
  }
}
const normTitle = (t) => String(t || "").toLocaleLowerCase("tr").replace(/&[a-z#0-9]+;/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const decode = (s) => String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "").trim();
const rank = { ok: 0, info: 0, low: 1, medium: 2, high: 3 };
const fmtMin = (m) => m == null ? "?" : m < 90 ? `${m} dk` : m < 48 * 60 ? `${Math.round(m / 60)} sa` : `${Math.round(m / 1440)} gün`;
function pickLinks(html, re, max = 1) { const out = []; let m; const rx = new RegExp(re, "g"); while ((m = rx.exec(html)) && out.length < max) if (!out.includes(m[1])) out.push(m[1]); return out; }
function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)) {
    const b = m[1]; const g = (t) => decode((b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1]);
    items.push({ title: g("title"), link: g("link"), pub: Date.parse(g("pubDate")) || null });
  }
  return items;
}
const db = (env) => (env.PHP_DB_URL ? neon(env.PHP_DB_URL) : null);
async function getState(sql, k) { const r = await sql.query(`SELECT v, updated_at FROM hm_bekci_state WHERE k=$1`, [k]); return r[0] ? { ...r[0].v, _at: r[0].updated_at } : null; }
async function setState(sql, k, v) { await sql.query(`INSERT INTO hm_bekci_state (k,v,updated_at) VALUES ($1,$2,now()) ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v, updated_at=now()`, [k, JSON.stringify(v)]); }
async function logEvent(sql, e) {
  await sql.query(`INSERT INTO hm_bekci_events (domain,kind,severity,message,detail,ai_text,ai_provider) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [e.domain || null, e.kind, e.severity || "info", String(e.message || "").slice(0, 1000), JSON.stringify(e.detail || {}), e.ai_text || null, e.ai_provider || null]);
}
async function mapPool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

// ---------------------------------------------------------------- AI chain (Evren → NVIDIA → Gemini → OpenAI, cheap models)
const SYS = "Sen Ahenk haber sitelerinin teknik bekçisisin. Kısa, net, Türkçe yaz. Uydurma yapma; yalnızca verilen ölçümlere dayan.";
async function oaiCompat(url, key, model, prompt, extra = {}, maxTokens = 1200) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: maxTokens, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }], ...extra }), signal: AbortSignal.timeout(40000) });
  const d = await r.json().catch(() => ({}));
  const t = String(d?.choices?.[0]?.message?.content || "").trim();
  if (!r.ok || !t) throw new Error(`HTTP ${r.status} ${d?.error?.message || d?.detail || "boş yanıt"}`.slice(0, 160));
  return { text: t, model: d?.model || model };
}
export async function aiChat(env, prompt) {
  const errors = [];
  const chain = [
    ["evren", env.EVREN_API_KEY, () => oaiCompat("https://evren-llmapi.ssyz.org.tr/v1/chat/completions", env.EVREN_API_KEY, env.EVREN_MODEL || "deepseek-v4-flash", prompt, {}, 4000)],   // reasoning model: leave room for thinking tokens
    ["nvidia", env.NVIDIA_API_KEY, () => oaiCompat("https://integrate.api.nvidia.com/v1/chat/completions", env.NVIDIA_API_KEY, env.NVIDIA_MODEL, prompt, { chat_template_kwargs: { enable_thinking: false } })],
    ["gemini", env.GEMINI_API_KEY, async () => {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, { method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }), signal: AbortSignal.timeout(40000) });
      const d = await r.json().catch(() => ({}));
      const t = (d?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
      if (!r.ok || !t) throw new Error(`HTTP ${r.status} ${d?.error?.message || "boş"}`.slice(0, 160));
      return { text: t, model: env.GEMINI_MODEL };
    }],
    ["openai", env.OPENAI_API_KEY, () => oaiCompat("https://api.openai.com/v1/chat/completions", env.OPENAI_API_KEY, env.OPENAI_MODEL || "gpt-4o-mini", prompt)],
  ];
  for (const [name, key, fn] of chain) {
    if (!key) { errors.push(`${name}: anahtar yok`); continue; }
    const t0 = Date.now();
    try { const r = await fn(); return { text: r.text, provider: name, model: r.model, ms: Date.now() - t0, errors }; }
    catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  return { text: null, provider: null, errors };
}

// ---------------------------------------------------------------- site list
async function loadSites(sql) {
  const rows = await sql.query(`SELECT DISTINCT ON (lower(domain)) id, slug, display_name, domain FROM hm_news_sites WHERE active IS DISTINCT FROM false AND coalesce(domain,'')<>'' ORDER BY lower(domain), id`);
  return rows.map((r) => ({ id: Number(r.id), slug: r.slug, name: String(r.display_name || r.slug), domain: String(r.domain).toLowerCase().replace(/^www\./, ""),
    corporate: CORPORATE.has(r.slug), suspended: SUSPENDED.has(String(r.domain).toLowerCase()), handsOff: HANDS_OFF[String(r.domain).toLowerCase()] || null })).sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------- checks (browser-facing URLs, light)
async function checkImages(base, html) {
  const srcs = pickLinks(html, '<img[^>]+?(?:data-src|src)="([^"]+)"', 60).filter((s) => !s.startsWith("data:") && !/\.svg(\?|$)/i.test(s) && !/logo|favicon|icon|placeholder|pixel/i.test(s)).slice(0, 6);
  const res = await Promise.all(srcs.map(async (s) => {
    let u; try { u = new URL(s.replace(/&amp;/g, "&"), base).toString(); } catch { return { u: s, status: 0, ok: false }; }
    const r = await timed(u, { headers: { range: "bytes=0-2047", accept: "image/*" }, noBody: true, ms: 10000 });
    return { u, status: r.status, err: r.err, ok: (r.status === 200 || r.status === 206) && /image|octet/i.test(r.ctype) };
  }));
  return { checked: res.length, broken: res.filter((x) => !x.ok).map((x) => ({ u: x.u.slice(0, 160), status: x.status, err: x.err })) };
}
const P = (r) => r ? { url: r.url, status: r.status, ms: r.ms, ok: r.status >= 200 && r.status < 400, error: r.err } : null;

async function checkSite(site, ctx) {
  const base = `https://${site.domain}`;
  const out = { id: site.id, slug: site.slug, name: site.name, host: site.domain, corporate: site.corporate, phpTheme: !site.corporate, hard: [], soft: [], info: [], m: {} };
  if (site.suspended) { const h = await timed(base + "/", { ms: 12000, noBody: true }); out.home = P(h); out.suspended = true; out.info.push("Kullanıcı isteğiyle askıda — kontrol/düzeltme yapılmıyor."); return out; }
  const [home, editor, kose] = await Promise.all([timed(base + "/", { ms: 15000 }), timed(base + "/editor", { ms: 12000, noBody: true }), site.corporate ? null : timed(base + "/koseyazari/giris", { ms: 12000, noBody: true })]);
  out.home = P(home); out.editor = P(editor); out.kose = kose ? P(kose) : { status: null, ok: true, note: "kurumsal" };
  const down = (r) => r.status === 0 || r.status >= 500;
  if (down(home)) out.hard.push(`anasayfa ${home.status || "zaman aşımı"} (${home.ms} ms) — tarayıcı da açamıyor`);
  else if (home.status >= 400) out.hard.push(`anasayfa HTTP ${home.status}`);
  else if (home.ms > 8000) out.soft.push(`anasayfa yavaş ${(home.ms / 1000).toFixed(1)} sn (önbellek ${home.cf || "-"})`);
  if (down(editor) || editor.status === 404) out.hard.push(`editör girişi (/editor) ${editor.status || "zaman aşımı"}`);
  if (kose && (down(kose) || kose.status === 404)) out.hard.push(`köşe yazarı girişi (/koseyazari/giris) ${kose.status || "zaman aşımı"}`);
  if (site.handsOff) { out.info.push(site.handsOff); return out; }
  if (site.corporate || home.status !== 200) return out;
  // category + article + rss
  const cat = pickLinks(home.body, 'href="(?:https?://[^"/]+)?(/kategori/[^"#?]+)"')[0];
  const rss = await timed(base + "/rss.xml", { ms: 12000 });
  const items = rss.status === 200 ? parseRss(rss.body) : [];
  const art = pickLinks(home.body, 'href="((?:https?://[^"]+)?/haber/[^"#]+)"')[0] || items[0]?.link;
  const [catR, artR] = await Promise.all([cat ? timed(base + cat, { ms: 15000, noBody: true }) : null, art ? timed(new URL(art, base).toString(), { ms: 15000, noBody: true }) : null]);
  out.kategori = catR ? { ...P(catR), path: cat } : null; out.haber = artR ? { ...P(artR), path: new URL(art, base).pathname } : null;
  if (!cat) out.info.push("anasayfada /kategori/ linki yok (menü)");
  else if (down(catR) || catR.status >= 400) out.hard.push(`kategori ${cat} ${catR.status || "zaman aşımı"}`);
  else if (catR.ms > 8000) out.soft.push(`kategori yavaş ${(catR.ms / 1000).toFixed(1)} sn`);
  if (!art) out.soft.push("anasayfada haber linki yok");
  else if (down(artR) || artR.status >= 400) out.hard.push(`haber sayfası ${out.haber.path.slice(0, 60)} ${artR.status || "zaman aşımı"}`);
  else if (artR.ms > 8000) out.soft.push(`haber sayfası yavaş ${(artR.ms / 1000).toFixed(1)} sn`);
  // latest news age (RSS) + stuck manşet (first article link on home unchanged)
  const newest = items.reduce((m, i) => Math.max(m, i.pub && i.pub < Date.now() + 3600e3 ? i.pub : 0), 0);
  out.m.latestAgeMin = newest ? Math.round((Date.now() - newest) / 60000) : null;
  if (rss.status !== 200) out.soft.push(`RSS (/rss.xml) ${rss.status || "zaman aşımı"}`);
  else if (out.m.latestAgeMin != null && out.m.latestAgeMin > STALE_CRIT_H * 60) out.hard.push(`son haber ${fmtMin(out.m.latestAgeMin)} önce — site güncellenmiyor`);
  else if (out.m.latestAgeMin != null && out.m.latestAgeMin > STALE_WARN_H * 60) out.soft.push(`son haber ${fmtMin(out.m.latestAgeMin)} önce`);
  const firstHome = pickLinks(home.body, 'href="((?:https?://[^"]+)?/haber/[^"#]+)"')[0] || null;
  const prev = ctx.prev[site.domain] || {};
  const since = prev.firstHome === firstHome && prev.firstHomeSince ? prev.firstHomeSince : new Date().toISOString();
  out.m.firstHome = firstHome; out.m.firstHomeSince = since; out.m.mansetAgeMin = Math.round((Date.now() - Date.parse(since)) / 60000);
  if (firstHome && out.m.mansetAgeMin > MANSET_STUCK_H * 60) out.soft.push(`manşet ${fmtMin(out.m.mansetAgeMin)} değişmedi (takılmış olabilir)`);
  // duplicate headlines visible to readers (RSS + home)
  const seen = new Map();
  for (const t of items.map((i) => i.title)) { const k = normTitle(t); if (k.length > 12) seen.set(k, (seen.get(k) || 0) + 1); }
  out.m.dupTitles = [...seen.entries()].filter(([, n]) => n > 1).map(([t, n]) => ({ t: t.slice(0, 90), n }));
  if (out.m.dupTitles.length) out.soft.push(`${out.m.dupTitles.length} mükerrer başlık (RSS)`);
  out.m.images = await checkImages(base + "/", home.body);
  if (out.m.images.broken.length >= 2) out.soft.push(`${out.m.images.broken.length}/${out.m.images.checked} görsel kırık (anasayfa)`);
  return out;
}

async function dbChecks(sql, site, out, importers) {
  if (site.corporate || site.suspended || site.handsOff) return;
  const r = await sql.query(`SELECT
      (SELECT round(extract(epoch FROM now()-max(created_at))/60) FROM portal_rss_items WHERE site_id=$1) AS rss_age,
      (SELECT count(*) FROM portal_rss_items WHERE site_id=$1 AND created_at > now()-interval '24 hours') AS rss24,
      (SELECT round(extract(epoch FROM now()-max(created_at))/60) FROM news WHERE site_id=$1 AND status='published') AS news_age`, [site.id]);
  out.m.db = { rssAgeMin: r[0].rss_age == null ? null : Number(r[0].rss_age), rss24: Number(r[0].rss24 || 0), newsAgeMin: r[0].news_age == null ? null : Number(r[0].news_age) };
  const logName = IMPORTER_LOG[site.id];
  if (logName && importers?.[logName]) {
    const ageMin = Math.round((Date.now() / 1000 - importers[logName].mtime) / 60);
    out.m.importer = { log: logName, ageMin, lastInserted: importers[logName].lastInserted, recentErrors: importers[logName].recentErrors, stateAt: importers._at };
    if (ageMin > (IMPORTER_MAX_MIN[logName] || 75)) out.soft.push(`RSS içe aktarıcı ${fmtMin(ageMin)} önce çalıştı (beklenen ≤${IMPORTER_MAX_MIN[logName] || 75} dk)`);
    else if (importers[logName].recentErrors > 3) out.soft.push(`RSS içe aktarıcı son çalışmasında hata verdi`);
  } else out.m.importer = { note: "kendi içe aktarıcısı yok (havuz / AI editör ile beslenir)" };
  // NOTE: news.id is NOT unique in TP (sync artifacts: same id inserted twice). Rows are addressed by (id, created_at),
  // and a group is only auto-hidden when every row has a distinct id (otherwise report only).
  const d = await sql.query(`SELECT lower(btrim(title)) AS k, array_agg(id ORDER BY created_at, id) AS ids, array_agg(to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') ORDER BY created_at, id) AS ats FROM news WHERE site_id=$1 AND status='published' AND created_at > now()-interval '72 hours' GROUP BY 1 HAVING count(*)>1 LIMIT 25`, [site.id]);
  out.m.dupRows = d.map((x) => { const ids = x.ids.map(Number); return { k: String(x.k).slice(0, 90), ids, ats: x.ats, sameId: new Set(ids).size !== ids.length }; });
  if (out.m.dupRows.length) out.soft.push(`${out.m.dupRows.length} mükerrer haber satırı (DB, 72 sa)`);
}

// panel (Worker DB) -> PHP Neon (twilight-pine): are the panel's newest DB news present in the PHP DB?
async function syncCheck(sql, site) {
  const pid = PANEL_ID[site.id] || site.id;
  const r = await timed(`https://ahenk.net.tr/api/news/hybrid?siteId=${pid}&limit=8&dbFirst=1&rssScope=site`, { ms: 12000, headers: { accept: "application/json" } });
  if (r.status === 404) return { checked: 0, missing: [], note: "panelde bu site kimliği yok" };
  if (r.status !== 200) return { err: `panel API ${r.status || "zaman aşımı"} (${r.ms} ms)` };
  let items = [];
  try { items = (JSON.parse(r.body).items || []).filter((x) => x.source === "db" && /^db:\d+$/.test(String(x.id))); } catch { return { err: "panel API JSON değil" }; }
  if (!items.length) return { checked: 0, missing: [] };
  const ids = items.map((x) => Number(String(x.id).slice(3)));
  const f = await sql.query(`SELECT id FROM news WHERE id = ANY($1::bigint[])`, [ids]);
  const have = new Set(f.map((x) => Number(x.id)));
  const missing = items.filter((x) => !have.has(Number(String(x.id).slice(3)))).map((x) => ({ id: x.id, title: String(x.title || "").slice(0, 80), at: x.publishedAt || x.createdAt || null }));
  return { checked: ids.length, missing, ms: r.ms, at: new Date().toISOString() };
}

async function checkPanel() {
  const [live, full] = await Promise.all([timed("https://ahenk.net.tr/api/healthz/live", { ms: 10000 }), timed("https://ahenk.net.tr/api/healthz", { ms: 15000 })]);
  return { live: P(live), healthz: P(full) };
}

// ---------------------------------------------------------------- safe fixes
async function cfZoneId(env, domain) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, { headers: { authorization: `Bearer ${env.CF_API_TOKEN}` } });
  const d = await r.json().catch(() => ({})); return d?.result?.[0]?.id || null;
}
async function purgeUrls(env, site, out) {
  if (!env.CF_API_TOKEN) return { ok: false, err: "CF_API_TOKEN yok" };
  const z = await cfZoneId(env, site.domain); if (!z) return { ok: false, err: "zone bulunamadı" };
  const paths = ["/", "/rss.xml"]; if (out.kategori?.path) paths.push(out.kategori.path);
  const files = paths.flatMap((p) => [`https://${site.domain}${p}`, `https://www.${site.domain}${p}`]);
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${z}/purge_cache`, { method: "POST", headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ files }) });
  const d = await r.json().catch(() => ({})); return { ok: !!d.success, files: files.length, err: d.success ? null : JSON.stringify(d.errors || r.status).slice(0, 160) };
}
async function purgeOzel(env, siteIds, sql) {
  try {
    const sites = (await loadSites(sql)).filter((x) => siteIds.includes(x.id));
    await Promise.all(sites.map((x) => purgeUrls(env, x, { kategori: { path: "/kategori/" + OZEL_CAT_SLUG } })));
  } catch (e) { console.error("[ozel-purge]", e?.message || e); }
}
async function enqueue(sql, kind, slug, reason) {
  const ex = await sql.query(`SELECT id FROM hm_bekci_requests WHERE kind=$1 AND coalesce(site_slug,'')=coalesce($2,'') AND status IN ('pending','running') AND at > now()-interval '3 hours' LIMIT 1`, [kind, slug]);
  if (ex.length) return { queued: false, id: Number(ex[0].id) };
  const r = await sql.query(`INSERT INTO hm_bekci_requests (kind, site_slug, reason) VALUES ($1,$2,$3) RETURNING id`, [kind, slug, String(reason).slice(0, 300)]);
  return { queued: true, id: Number(r[0].id) };
}
async function autoFix(env, sql, site, out, state, actions) {
  if (site.suspended || site.corporate || site.handsOff) return;
  const fx = state.fixes[site.domain] || (state.fixes[site.domain] = {});
  const now = Date.now();
  const pageBad = ["home", "kategori", "haber"].some((k) => out[k] && (out[k].status === 0 || out[k].status >= 500));
  const dbFresh = (out.m.db?.rssAgeMin ?? 1e9) < 120 || (out.m.db?.newsAgeMin ?? 1e9) < 120;
  const siteStale = (out.m.latestAgeMin ?? 0) > STALE_WARN_H * 60 || (out.m.mansetAgeMin ?? 0) > MANSET_STUCK_H * 60;
  if ((pageBad || (siteStale && dbFresh)) && (!fx.purgeAt || now - fx.purgeAt > PURGE_COOLDOWN_MIN * 60000)) {
    const p = await purgeUrls(env, site, out); fx.purgeAt = now;
    const why = pageBad ? "sayfa 5xx / zaman aşımı" : "DB'de yeni haber var ama sitede eski görünüyor";
    actions.push({ domain: site.domain, kind: "fix_purge", severity: p.ok ? "info" : "medium", message: `Cloudflare önbelleği temizlendi: anasayfa, RSS, kategori (${why})${p.ok ? "" : " — BAŞARISIZ: " + p.err}`, detail: { why, ...p } });
  }
  const imp = out.m.importer;
  const impBad = imp?.log && (imp.ageMin > (IMPORTER_MAX_MIN[imp.log] || 75) || imp.recentErrors > 3);
  if (impBad && IMPORTER_SLUG[site.id] && (!fx.importAt || now - fx.importAt > IMPORT_COOLDOWN_MIN * 60000)) {
    const q = await enqueue(sql, "rss_import", IMPORTER_SLUG[site.id], `bekçi: ${imp.log} ${imp.ageMin} dk önce / hata ${imp.recentErrors}`); fx.importAt = now;
    actions.push({ domain: site.domain, kind: "fix_rss_import", severity: "info", message: `RSS içe aktarıcı yeniden tetiklendi (${IMPORTER_SLUG[site.id]}, iş #${q.id}${q.queued ? "" : " zaten sırada"})`, detail: q });
  }
  if (out.m.dupRows?.length) {
    const safe = out.m.dupRows.filter((d) => !d.sameId);
    const hide = safe.flatMap((d) => d.ids.slice(1).map((id, j) => [id, d.ats[j + 1]])).slice(0, 25);
    const u = hide.length ? await sql.query(`UPDATE news SET status='draft', updated_at=now() WHERE site_id=$1 AND status='published' AND (id, created_at) IN (SELECT * FROM unnest($2::bigint[], $3::timestamptz[])) RETURNING id, created_at`, [site.id, hide.map((h) => h[0]), hide.map((h) => h[1])]) : [];
    const rows = u.map((x) => [Number(x.id), new Date(x.created_at).toISOString()]);
    if (rows.length) actions.push({ domain: site.domain, kind: "fix_dedupe", severity: "info", message: `${rows.length} mükerrer haber gizlendi (taslağa alındı, silinmedi; ilk kopya yayında)`, detail: { ids: rows.map((r) => r[0]), rows, rollback: rows.map((r) => `UPDATE news SET status='published' WHERE site_id=${site.id} AND id=${r[0]} AND created_at='${r[1]}';`).join(" ") } });
    const same = out.m.dupRows.filter((d) => d.sameId).length;
    if (same) out.info.push(`${same} başlıkta aynı id iki kez var (eşitleme artığı) — otomatik gizlenmedi`);
  }
}

// ---------------------------------------------------------------- main run
export async function runOnce(env, { manual = false, cookie = null } = {}) {
  const sql = db(env);
  const startedAt = new Date().toISOString();
  if (!manual) {   // CF cron + VPS tick may both fire: at most one automatic pass per ~5 min
    const [last] = await sql.query(`SELECT extract(epoch from now()-max(at))::int AS age FROM hm_bekci_runs`);
    if (last?.age != null && last.age < 300) return { skipped: true, generatedAt: null };
  }
  const state = (await getState(sql, "main")) || {};
  state.fixes ||= {}; state.prev ||= {}; state.sig ||= {}; state.sync ||= {}; state.syncCursor ||= 0;
  const importers = await getState(sql, "importers");
  const sites = await loadSites(sql);
  const ctx = { prev: state.prev };
  const [panel, results] = await Promise.all([checkPanel(), mapPool(sites, 4, (s) => checkSite(s, ctx).catch((e) => ({ id: s.id, slug: s.slug, name: s.name, host: s.domain, hard: ["bekçi hatası: " + e.message], soft: [], info: [], m: {} })))]);
  for (const [i, s] of sites.entries()) { try { await dbChecks(sql, s, results[i], importers); } catch (e) { results[i].info.push("DB kontrolü: " + String(e.message).slice(0, 100)); } }
  // sync check: rotate 3 news sites per run (panel API is slow — keep load low); manual run checks 6
  const newsIdx = sites.map((s, i) => [s, i]).filter(([s]) => !s.corporate && !s.suspended && !s.handsOff);
  const liveOk = panel.live?.ok;
  if (liveOk && newsIdx.length) {
    const n = manual ? 6 : 3;
    for (let k = 0; k < Math.min(n, newsIdx.length); k++) {
      const [s] = newsIdx[(state.syncCursor + k) % newsIdx.length];
      try { state.sync[s.domain] = await syncCheck(sql, s); } catch (e) { state.sync[s.domain] = { err: String(e.message).slice(0, 100) }; }
    }
    state.syncCursor = (state.syncCursor + n) % newsIdx.length;
  }
  for (const [s, i] of newsIdx) {
    const sy = state.sync[s.domain]; results[i].m.sync = sy || null;
    if (sy?.missing?.length) results[i].soft.push(`panel↔PHP DB: panelin son ${sy.checked} haberinden ${sy.missing.length} tanesi sitenin DB'sinde yok`);
  }
  // fixes
  const actions = [];
  for (const [i, s] of sites.entries()) { try { await autoFix(env, sql, s, results[i], state, actions); } catch (e) { actions.push({ domain: s.domain, kind: "fix_error", severity: "medium", message: "Oto-düzeltme hatası: " + String(e.message).slice(0, 160) }); } }
  // manual run by a logged-in admin: re-run panel→PHP sync for sites with missing rows (uses the existing, admin-protected endpoint)
  if (manual && cookie) {
    for (const [s, i] of newsIdx) {
      const sy = results[i].m.sync; if (!sy?.missing?.length) continue;
      const r = await timed("https://ahenk.net.tr/api/hm/admin/site-watchdog/sync-site", { method: "POST", ms: 60000, headers: { cookie, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ siteId: PANEL_ID[s.id] || s.id, limit: 100 }) });
      let d = {}; try { d = JSON.parse(r.body); } catch {}
      actions.push({ domain: s.domain, kind: "fix_sync", severity: r.status === 200 ? "info" : "medium", message: r.status === 200 ? `Panel→PHP DB eşitleme çalıştırıldı: haber ${d.news ?? "?"}, makale ${d.makaleler ?? "?"}, yazar ${d.authors ?? "?"}` : `Panel→PHP DB eşitleme başarısız (HTTP ${r.status || "zaman aşımı"})`, detail: { status: r.status, ...d } });
    }
  }
  for (const r of results) if (r.m?.firstHome !== undefined) state.prev[r.host] = { firstHome: r.m.firstHome, firstHomeSince: r.m.firstHomeSince };
  // AI diagnosis only when an incident appears/changes (cheap; Evren first)
  const sev = (r) => (r.hard.length ? "high" : r.soft.length ? "medium" : "ok");
  const sigOf = (r) => sev(r) + "|" + [...r.hard, ...r.soft].map((x) => x.replace(/[\d.,]+/g, "#")).join(";");
  const panelSev = !panel.live?.ok ? "high" : !panel.healthz?.ok ? "medium" : "ok";
  const incidents = results.filter((r) => sev(r) !== "ok");
  const changed = incidents.filter((r) => state.sig[r.host] !== sigOf(r));
  for (const r of results) state.sig[r.host] = sev(r) === "ok" ? "" : sigOf(r);
  const panelChanged = state.sig.__panel !== panelSev; state.sig.__panel = panelSev;
  let ai = null;
  const prevAi = state.ai || {};
  if (changed.length || actions.length || manual || (panelChanged && panelSev !== "ok")) {
    const brief = (manual ? incidents : changed).map((r) => ({ site: r.host, kritik: r.hard, uyari: r.soft, sonHaberDk: r.m.latestAgeMin, db: r.m.db, iceAktarici: r.m.importer, esitleme: r.m.sync && { kontrol: r.m.sync.checked, eksik: r.m.sync.missing?.length, hata: r.m.sync.err } }));
    if (panelSev !== "ok") brief.push({ site: "ahenk.net.tr (panel API)", kritik: panelSev === "high" ? ["/api/healthz/live yanıt vermiyor"] : [], uyari: panelSev === "medium" ? [`/api/healthz (container) ${panel.healthz?.status || "zaman aşımı"} ${panel.healthz?.ms} ms`] : [] });
    if (brief.length || actions.length) {
      ai = await aiChat(env, `Haber siteleri bekçi ölçümleri ve yapılan otomatik düzeltmeler aşağıda. Her site için 1-2 cümlelik Türkçe teşhis ve bir sonraki adımı yaz. Sadece JSON döndür: {"<site>": "<metin>"}.\nÖlçümler: ${JSON.stringify(brief).slice(0, 9000)}\nDüzeltmeler: ${JSON.stringify(actions.map((a) => [a.domain, a.message])).slice(0, 2500)}`);
      let map = {};
      try { map = JSON.parse(String(ai.text || "").replace(/^```(json)?|```$/gm, "").trim()); } catch { map = {}; }
      for (const b of brief) {
        const t = typeof map[b.site] === "string" ? map[b.site] : null;
        if (t) prevAi[b.site] = { text: t.slice(0, 600), provider: `${ai.provider}/${ai.model}`, at: new Date().toISOString() };
        await logEvent(sql, { domain: b.site, kind: "incident", severity: b.kritik?.length ? "high" : "medium", message: [...(b.kritik || []), ...(b.uyari || [])].join(" · "), detail: b, ai_text: t, ai_provider: ai.provider ? `${ai.provider}/${ai.model}` : ("yok: " + ai.errors.join(" | ")).slice(0, 300) });
      }
    }
  }
  for (const r of results) if (sev(r) === "ok") delete prevAi[r.host];
  state.ai = prevAi;
  for (const a of actions) await logEvent(sql, a);
  const report = buildReport({ startedAt, panel, results, actions, ai, prevAi, state });
  await sql.query(`INSERT INTO hm_bekci_runs (ok,warn,crit,results) VALUES ($1,$2,$3,$4)`, [results.filter((r) => sev(r) === "ok").length, results.filter((r) => sev(r) === "medium").length, results.filter((r) => sev(r) === "high").length, JSON.stringify(report)]);
  await sql.query(`DELETE FROM hm_bekci_runs WHERE at < now()-interval '7 days'`);
  await setState(sql, "main", state);
  return report;
}

function buildReport({ startedAt, panel, results, actions, ai, prevAi, state }) {
  const issues = [];
  const panelLabel = "ahenk.net.tr panel API";
  if (!panel.live?.ok) issues.push({ kind: "api", severity: "high", message: `${panelLabel}: /api/healthz/live ${panel.live?.status || "zaman aşımı"} — panel girişi çalışmaz` });
  else if (!panel.healthz?.ok) issues.push({ kind: "api", severity: "medium", message: `${panelLabel}: container /api/healthz ${panel.healthz?.status || "zaman aşımı"} (${panel.healthz?.ms} ms) — «Sunucuya ulaşılamıyor» uyarısının kaynağı; oto-restart YAPILMAZ` });
  for (const r of results) {
    for (const h of r.hard) issues.push({ kind: "site", severity: "high", siteId: r.id, slug: r.slug, message: `${r.name} (${r.host}): ${h}` });
    for (const s of r.soft) issues.push({ kind: "site", severity: "medium", siteId: r.id, slug: r.slug, message: `${r.name} (${r.host}): ${s}` });
    for (const s of r.info) issues.push({ kind: "info", severity: "info", siteId: r.id, slug: r.slug, message: `${r.name}: ${s}` });
    const a = prevAi[r.host]; if (a && (r.hard.length || r.soft.length)) issues.push({ kind: "ai", severity: "info", siteId: r.id, slug: r.slug, message: `🤖 AI teşhis — ${r.host} (${a.provider}): ${a.text}` });
  }
  const pa = prevAi["ahenk.net.tr (panel API)"]; if (pa && (!panel.live?.ok || !panel.healthz?.ok)) issues.push({ kind: "ai", severity: "info", message: `🤖 AI teşhis — panel API (${pa.provider}): ${pa.text}` });
  for (const a of actions) issues.push({ kind: "fix", severity: "info", message: `🔧 Oto-düzeltme — ${a.domain}: ${a.message}` });
  issues.sort((x, y) => (rank[y.severity] || 0) - (rank[x.severity] || 0));
  const sites = results.map((r) => {
    const m = r.m || {};
    const det = [];
    if (r.kategori) det.push(`kategori ${r.kategori.status}/${r.kategori.ms}ms`);
    if (r.haber) det.push(`haber ${r.haber.status}/${r.haber.ms}ms`);
    if (m.latestAgeMin != null) det.push(`son haber ${fmtMin(m.latestAgeMin)} önce`);
    if (m.mansetAgeMin != null && m.firstHome) det.push(`manşet ${fmtMin(m.mansetAgeMin)}dır aynı`);
    if (m.images) det.push(`görsel ${m.images.broken.length}/${m.images.checked} kırık`);
    if (m.dupTitles) det.push(`mükerrer ${m.dupTitles.length + (m.dupRows?.length || 0)}`);
    if (m.sync) det.push(m.sync.err ? `panel↔PHP: ${m.sync.err}` : m.sync.note ? `panel↔PHP: ${m.sync.note}` : `panel↔PHP ${m.sync.missing.length}/${m.sync.checked} eksik`);
    if (m.importer) det.push(m.importer.log ? `içe aktarıcı ${fmtMin(m.importer.ageMin)} önce` : "içe aktarıcı: havuz");
    return { id: r.id, slug: r.slug, name: r.name, host: r.host, ok: r.hard.length === 0, canSync: !r.corporate, phpTheme: r.phpTheme, corporate: r.corporate,
      home: r.home, editor: r.editor, kose: r.kose, kategori: r.kategori, haber: r.haber, metrics: m,
      softIssues: [...r.soft, ...det.length ? [det.join(" · ")] : [], ...r.info] };
  });
  return { startedAt, finishedAt: new Date().toISOString(), engine: "hm-bekci v2 (tarayıcı gözünden ölçüm + oto-düzeltme)", dualWriteReady: true,
    healthy: !issues.some((i) => i.severity === "high"), api: panel, sites, issues, actions,
    ai: ai ? { provider: ai.provider, model: ai.model, ms: ai.ms, errors: ai.errors } : null,
    note: "AI Bekçi 10 dakikada bir siteleri ziyaretçi gibi ölçer (anasayfa, kategori, haber, /editor, /koseyazari/giris, RSS, görseller) ve güvenli düzeltmeleri kendisi yapar: Cloudflare önbelleğini temizler, durmuş RSS içe aktarıcıyı yeniden başlatır, mükerrer haberleri gizler (silmez). «Şimdi tara» ayrıca eksik panel haberlerini PHP DB'ye eşitler. Container yeniden başlatılmaz." };
}

// ---------------------------------------------------------------- AI Haber Editörü (page + API)
async function editorData(sql) {
  const [sites, runs, today, reqs] = await Promise.all([
    sql.query(`SELECT site_id, site_slug, domain, concept_type, enabled, daily_manset_target FROM hm_ai_editor_sites ORDER BY site_id`),
    sql.query(`SELECT id, started_at, finished_at, status, error, stats FROM hm_ai_editor_runs WHERE coalesce(dry_run,false)=false ORDER BY id DESC LIMIT 12`),
    sql.query(`SELECT site_id, count(*) FILTER (WHERE status='published') AS pub, count(*) AS total, max(created_at) AS last FROM hm_ai_editor_articles WHERE manset_date = (now() AT TIME ZONE 'Europe/Istanbul')::date GROUP BY 1`),
    sql.query(`SELECT id, at, kind, site_slug, reason, status, done_at, result FROM hm_bekci_requests WHERE kind='ai_editor_run' ORDER BY id DESC LIMIT 6`),
  ]);
  const t = Object.fromEntries(today.map((r) => [Number(r.site_id), r]));
  return {
    sites: sites.map((s) => ({ ...s, corporate: CORPORATE.has(s.site_slug), suspended: s.site_slug === "kirsehirhaber", today: t[Number(s.site_id)] || null })),
    runs: runs.map((r) => {
      const st = r.stats || {}; const per = st.editor?.sites || st.sites || {};
      const perSite = Object.entries(per).map(([k, v]) => ({ site: k, made: v?.made ?? 0, candidates: v?.candidates ?? null, ai_pick: v?.ai_pick || null, todo: v?.todo ?? null }));
      return { id: Number(r.id), started_at: r.started_at, finished_at: r.finished_at, status: r.status, error: r.error, fetch: st.fetch ? { feeds: st.fetch.feeds, inserted: st.fetch.inserted, dup: (st.fetch.dup_link || 0) + (st.fetch.dup_title || 0) } : null, perSite };
    }),
    queue: reqs,
  };
}
// ---------------------------------------------------------------- AI kota (manset5 2026-10-08)
const PROV_ORDER = ["evren", "nvidia", "gemini", "openai", "openrouter"];
const PROV_NAME = { evren: "Evren.ai", nvidia: "NVIDIA NIM", gemini: "Google Gemini", openai: "OpenAI", openrouter: "OpenRouter" };
export async function quotaData(sql) {
  const [q, st, use, keys, ev, m5, gen] = await Promise.all([
    sql.query(`SELECT scope, provider, site_id, model, status, remaining, http, error, checked_at, status_since FROM hm_ai_provider_quota`),
    sql.query(`SELECT provider AS breaker, open_until, last_reason, credits_remaining FROM hm_ai_provider_state`),
    sql.query(`SELECT provider, sum(calls)::int calls, sum(failed)::int failed, sum(prompt_tokens+completion_tokens)::bigint tokens FROM hm_ai_provider_usage WHERE day = (now() AT TIME ZONE 'Europe/Istanbul')::date GROUP BY 1`),
    sql.query(`SELECT k.site_id, k.provider, k.enabled, k.usage_count, k.last_used_at, left(coalesce(k.last_error,''),160) last_error, (SELECT s.domain FROM hm_news_sites s WHERE s.id = k.site_id LIMIT 1) domain FROM hm_llm_provider_keys k WHERE k.site_id IS NOT NULL ORDER BY k.site_id, k.priority`),
    sql.query(`SELECT id, at, severity, message FROM hm_bekci_events WHERE kind IN ('ai_quota','ai_manset5') AND at > now() - interval '3 days' ORDER BY id DESC LIMIT 8`),
    sql.query(`SELECT site_id, count(*) FILTER (WHERE is_ai_manset AND status='published' AND coalesce(ai_model,'')<>'curate')::int AS orig, max(created_at) FILTER (WHERE coalesce(ai_model,'')<>'curate') AS last FROM hm_ai_editor_articles WHERE manset_date = (now() AT TIME ZONE 'Europe/Istanbul')::date GROUP BY 1`),
    sql.query(`SELECT site_id, domain, daily_manset_target FROM hm_ai_manset5_sites_v ORDER BY site_id`),
  ]);
  const brk = Object.fromEntries(st.map((r) => [r.breaker, r]));
  const now = Date.now();
  const shared = q.filter((r) => !r.scope.startsWith("site:")).map((r) => {
    const b = brk[r.scope === "env" ? r.provider : `${r.scope}:${r.provider}`];
    const open = b?.open_until && new Date(b.open_until).getTime() > now;
    return { ...r, breakerOpenUntil: open ? b.open_until : null, breakerReason: open ? b.last_reason : null, usable: r.status === "ok" && !open };
  }).sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "global" ? -1 : 1) || PROV_ORDER.indexOf(a.provider) - PROV_ORDER.indexOf(b.provider));
  const active = shared.find((r) => r.usable) || null;
  const siteQ = q.filter((r) => r.scope.startsWith("site:"));
  const own = keys.map((k) => { const p = siteQ.find((r) => Number(r.site_id) === Number(k.site_id) && r.provider === k.provider); return { ...k, status: p?.status || (k.enabled ? "bilinmiyor" : "kapalı"), remaining: p?.remaining || {}, checked_at: p?.checked_at || null }; });
  const m = Object.fromEntries(m5.map((r) => [Number(r.site_id), r]));
  return {
    shared, active: active ? { provider: active.provider, scope: active.scope } : null,
    exhausted: shared.filter((r) => !r.usable).map((r) => ({ provider: r.provider, scope: r.scope, status: r.status, breakerOpenUntil: r.breakerOpenUntil })),
    usage: use, own, alerts: ev,
    manset5: gen.map((g) => ({ site_id: g.site_id, domain: g.domain, target: Math.max(5, g.daily_manset_target), orig: m[Number(g.site_id)]?.orig || 0, last: m[Number(g.site_id)]?.last || null })),
    checkedAt: q.reduce((a, r) => (!a || r.checked_at > a ? r.checked_at : a), null),
  };
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function editorPage() {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>AI Haber Editörü — Yönetim</title>
<style>body{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f5f6f8;color:#1b2430}header{background:#0B2A5B;color:#fff;padding:12px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}header a{color:#cfe0ff;text-decoration:none}main{padding:16px 18px;max-width:1200px;margin:auto}.card{background:#fff;border-radius:14px;box-shadow:0 1px 3px #0001;padding:16px 18px;margin-bottom:16px}h1{font-size:20px;margin:0}h2{font-size:16px;margin:0 0 10px}table{border-collapse:collapse;width:100%}th,td{padding:7px 8px;border-bottom:1px solid #eceff3;text-align:left;font-size:13px;vertical-align:top}th{color:#556;font-weight:600}.b{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600}.on{background:#d9f5e3;color:#11683a}.off{background:#eee;color:#666}.err{background:#ffd9d9;color:#a01515}button{background:#e61e25;color:#fff;border:0;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600}button.sec{background:#fff;color:#0B2A5B;border:1px solid #c9d3e3}.sw{cursor:pointer}.m{color:#667;font-size:12px}ul{margin:6px 0 0 18px;padding:0}</style></head><body>
<header><b style="font-size:17px">🤖 AI Haber Editörü</b><span class="m" style="color:#cfe0ff">Haber sitelerini otomatik günceller · kurumsal siteler hariç</span><span style="flex:1"></span><a href="/admin/haber-siteleri-bekci">🛡️ AI Bekçi</a><a href="/admin">← Yönetim paneli</a></header>
<main>
<div class="card" id="kota" style="border:2px solid #0B2A5B"><h2>🔋 AI sağlayıcı kotaları <span id="qact" class="m"></span></h2><div id="quota" class="m">Yükleniyor…</div></div>
<div class="card"><h2>📰 Bugün özgün AI manşet (genel siteler, hedef ≥5, her site farklı haber)</h2><div id="m5" class="m">Yükleniyor…</div></div>
<div class="card"><h1>Ne yapar?</h1><ul>
<li>Günde 8 kez (yaklaşık 2,5 saatte bir, 06:17 – 23:47 arası) <b>kendiliğinden</b> çalışır. Bütün haber siteleri varsayılan olarak <b>açık</b>; istemediğiniz siteyi aşağıdan kapatabilirsiniz.</li>
<li>Kayıtlı RSS kaynaklarından ve konuya uygun kaynaklardan yeni haberleri çeker; görselsiz, mükerrer ve aynı olayın tekrarı olan haberleri eler.</li>
<li>Manşeti en yeni, görselli ve güçlü haberlerle yeniler. Yapay zekâ (önce Evren, sonra NVIDIA, Gemini, OpenAI; ucuz modeller) <b>yalnızca</b> manşet seçimi ve kategori ataması için kullanılır.</li>
<li><b>Genel haber siteleri:</b> her gün en az 5 manşet haberi yapay zekâ ile <b>özgün olarak yeniden yazılır</b> (gün boyuna yayılır; Evren → NVIDIA → Gemini → OpenAI, sitenin kendi AI anahtarı varsa önce o). Aynı haber iki sitede AI manşeti olmaz. Konsept sitelerde manşet seçimi kaynağındaki metinle yapılır. Haber uydurulmaz; Vatan Haber yasak listesi (Hüseyin Akın, Anadolu Çınarları, AÇI Partisi) uygulanır.</li>
</ul><p style="margin-top:12px"><button id="run">▶ Şimdi çalıştır</button> <span id="runmsg" class="m"></span></p></div>
<div class="card"><h2>Siteler</h2><table id="sites"><tr><td class="m">Yükleniyor…</td></tr></table></div>
<div class="card"><h2>Son çalışmalar</h2><div id="runs" class="m">Yükleniyor…</div></div>
</main>
<script>window.__BK_PAGE=1;
const f=(u,o)=>fetch(u,Object.assign({credentials:"include",cache:"no-store"},o||{})).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||("HTTP "+r.status));return d;});
const tr=d=>d?new Date(d).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}):"–";
const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function load(){try{const d=await f("/api/bekci/ai-editor");
 document.getElementById("sites").innerHTML="<tr><th>Site</th><th>Durum</th><th>Bugün manşete giren</th><th>Günlük hedef</th><th></th></tr>"+d.sites.map(s=>{const ro=s.corporate||s.suspended;return "<tr><td><b>"+e(s.domain)+"</b><br><span class=m>#"+s.site_id+" · "+e(s.concept_type)+"</span></td><td>"+(s.corporate?'<span class="b off">kurumsal — kapsam dışı</span>':s.suspended?'<span class="b off">site askıda</span>':s.enabled?'<span class="b on">AÇIK</span>':'<span class="b off">KAPALI</span>')+"</td><td>"+(s.today?(s.today.pub+" haber · son "+tr(s.today.last)):"–")+"</td><td>"+s.daily_manset_target+"</td><td>"+(ro?"":'<button class="sec sw" data-id="'+s.site_id+'" data-on="'+(s.enabled?0:1)+'">'+(s.enabled?"Kapat":"Aç")+"</button>")+"</td></tr>"}).join("");
 document.querySelectorAll(".sw").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await f("/api/bekci/ai-editor/toggle",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({siteId:+b.dataset.id,enabled:b.dataset.on==="1"})});load();}catch(x){alert(x.message);b.disabled=false;}});
 const q=d.queue.filter(x=>x.status==="pending"||x.status==="running");
 document.getElementById("runs").innerHTML=(q.length?"<p><b>Sırada / çalışıyor:</b> "+q.map(x=>"#"+x.id+" "+x.status+" ("+tr(x.at)+")").join(", ")+"</p>":"")+"<table><tr><th>Başladı</th><th>Bitti</th><th>Durum</th><th>Kaynak taraması</th><th>Site başına sonuç</th></tr>"+d.runs.map(r=>"<tr><td>"+tr(r.started_at)+"</td><td>"+tr(r.finished_at)+"</td><td>"+(r.status==="ok"?'<span class="b on">tamam</span>':'<span class="b err">'+e(r.status||"?")+"</span> "+e(r.error||""))+"</td><td>"+(r.fetch?(r.fetch.feeds+" kaynak · "+r.fetch.inserted+" yeni · "+r.fetch.dup+" mükerrer elendi"):"çekim yok (havuzdan)")+"</td><td>"+(r.perSite.filter(p=>p.made||p.todo).map(p=>e(p.site)+": "+p.made+" manşet"+(p.ai_pick?' <span class=m>(AI: '+e(p.ai_pick)+")</span>":"")).join("<br>")||'<span class=m>bu turda yeni manşet gerekmedi</span>')+"</td></tr>").join("")+"</table>";
}catch(x){document.getElementById("sites").innerHTML='<tr><td class="b err">'+e(x.message)+"</td></tr>";}}
document.getElementById("run").onclick=async()=>{const m=document.getElementById("runmsg");m.textContent="Sıraya alınıyor…";try{const d=await f("/api/bekci/ai-editor/run",{method:"POST"});m.textContent=d.queued?("Sıraya alındı (iş #"+d.id+"). 2 dakika içinde başlar; tam tur ~20 dk sürer."):("Zaten sırada/çalışıyor (iş #"+d.id+").");load();}catch(x){m.textContent=x.message;}};
const fmt=n=>n==null?"–":(n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" M":n>=1e4?Math.round(n/1e3)+" B":Math.round(n).toLocaleString("tr-TR"));
const ST={ok:'<span class="b on">çalışıyor</span>',exhausted:'<span class="b err">KOTA BİTTİ</span>',auth_error:'<span class="b err">anahtar hatalı</span>',rate_limited:'<span class="b err">hız sınırı</span>',error:'<span class="b err">hata</span>'};
function rem(p){const r=p.remaining||{},o=[];if(r.credits!=null)o.push("kredi: <b>"+fmt(r.credits)+"</b>");if(r.daily_tokens_left!=null)o.push("bugün kalan: <b>"+fmt(r.daily_tokens_left)+"</b> / "+fmt(r.daily_tokens_limit)+" token");if(r.rl_tokens_left!=null&&p.provider!=="evren")o.push("dakikalık sınır: "+fmt(r.rl_tokens_left)+" token, "+fmt(r.rl_requests_left)+" istek");return o.join(" · ")||'<span class=m>sağlayıcı kalan kotayı bildirmiyor (erişim kontrol edildi)</span>';}
async function loadQ(){try{const d=await f("/api/bekci/ai-quota");const u=Object.fromEntries((d.usage||[]).map(x=>[x.provider,x]));
 document.getElementById("qact").innerHTML=d.active?(' — şu an kullanılan: <b style="color:#11683a">'+e(({evren:"Evren.ai",nvidia:"NVIDIA NIM",gemini:"Google Gemini",openai:"OpenAI"})[d.active.provider]||d.active.provider)+"</b>"):' — <b style="color:#a01515">kullanılabilir sağlayıcı yok!</b>';
 let h="<table><tr><th>Sıra</th><th>Sağlayıcı</th><th>Durum</th><th>Kalan kota</th><th>Bugün kullanım</th><th>Son kontrol</th></tr>"+d.shared.map((p,i)=>"<tr"+(d.active&&d.active.provider===p.provider&&d.active.scope===p.scope?' style="background:#eefaf2"':"")+"><td>"+(i+1)+"</td><td><b>"+e(({evren:"Evren.ai",nvidia:"NVIDIA NIM",gemini:"Google Gemini",openai:"OpenAI"})[p.provider]||p.provider)+"</b><br><span class=m>"+e(p.scope==="global"?"ortak (Haber Merkezi)":"yedek (sunucu)")+" · "+e(p.model||"")+"</span></td><td>"+(p.breakerOpenUntil?'<span class="b err">devre dışı → '+tr(p.breakerOpenUntil)+"</span>":(ST[p.status]||e(p.status)))+(p.error?"<br><span class=m>"+e(p.error).slice(0,140)+"</span>":"")+"</td><td>"+rem(p)+"</td><td>"+(p.scope==="global"&&u[p.provider]?(u[p.provider].calls+" çağrı · "+fmt(+u[p.provider].tokens)+" token"+(u[p.provider].failed?" · "+u[p.provider].failed+" hata":"")):"–")+"</td><td>"+tr(p.checked_at)+"</td></tr>").join("")+"</table>";
 h+='<h2 style="margin-top:14px">🔑 Sitelerin kendi AI anahtarları</h2>'+(d.own.length?"<table><tr><th>Site</th><th>Sağlayıcı</th><th>Durum</th><th>Kalan kota</th><th>Kullanım</th></tr>"+d.own.map(k=>"<tr><td>"+e(k.domain||("#"+k.site_id))+"</td><td>"+e(k.provider)+"</td><td>"+(ST[k.status]||e(k.status))+(k.last_error?"<br><span class=m>"+e(k.last_error)+"</span>":"")+"</td><td>"+rem(k)+"</td><td>"+(k.usage_count||0)+" çağrı · son "+tr(k.last_used_at)+"</td></tr>").join("")+"</table>":'<p class=m>Henüz hiçbir editör kendi AI anahtarını eklemedi. Bir site editör panelinden kendi anahtarını eklerse o sitenin manşet/yeniden yazım işleri önce o anahtarla yapılır; anahtar yoksa veya kotası biterse ortak sıraya (Evren → NVIDIA → Gemini → OpenAI) geçilir.</p>');
 h+=(d.alerts.length?'<h2 style="margin-top:14px">⚠️ Uyarılar</h2><ul>'+d.alerts.map(a=>'<li><span class="b '+(a.severity==="high"?"err":"on")+'">'+tr(a.at)+"</span> "+e(a.message)+"</li>").join("")+"</ul>":'<p class=m style="margin-top:10px">Son 3 günde kota uyarısı yok. Kotalar 30 dakikada bir kontrol edilir.</p>');
 document.getElementById("quota").innerHTML=h;
 document.getElementById("m5").innerHTML="<table><tr><th>Site</th><th>Bugün özgün AI manşet</th><th>Hedef</th><th>Son</th></tr>"+d.manset5.map(s=>"<tr><td><b>"+e(s.domain)+"</b></td><td>"+(s.orig>=5?'<span class="b on">'+s.orig+"</span>":'<span class="b err">'+s.orig+"</span>")+"</td><td>"+s.target+"</td><td>"+tr(s.last)+"</td></tr>").join("")+"</table>";
}catch(x){document.getElementById("quota").innerHTML='<span class="b err">'+e(x.message)+"</span>";}}
load();loadQ();setInterval(load,60000);setInterval(loadQ,120000);</script></body></html>`;
}

// ---------------------------------------------------------------- auth + routing
async function adminSession(req) {
  const cookie = req.headers.get("cookie") || "";
  if (!/connect\.sid=/.test(cookie)) return null;
  const r = await timed("https://ahenk.net.tr/api/members/admin-panel-status", { ms: 10000, headers: { cookie, accept: "application/json" } });
  if (r.status !== 200) return null;
  try { const d = JSON.parse(r.body); if (d.panelBootstrap !== true) return null;
    const perms = Array.isArray(d.permissions) ? d.permissions : [];
    return d.panelFullAdmin || perms.includes("hm_sites") || perms.includes("haberler") || !d.permissions ? { cookie, full: !!d.panelFullAdmin } : null;
  } catch { return null; }
}
const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", "x-yekpare-frontend": "hm-bekci" } });

const INJECT = `<script id="hm-bekci-bar">(function(){try{
var L="AI Haber Editörü",R=/Haber AI \\((AI )?İçerik Robotu\\)|AI İçerik Robotu/;
function ren(){var as=document.querySelectorAll('a[href="/admin/ai-icerik-robotu"],a[href="/admin/ozel-haber-ekle"]');for(var i=0;i<as.length;i++){var a=as[i];if(!a.__bk){a.__bk=1;a.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();location.href=this.getAttribute("href");},true);}
var w=document.createTreeWalker(a,NodeFilter.SHOW_TEXT),n;while(n=w.nextNode()){if(R.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(R,L);}}}
function bar(){var p=location.pathname,b=document.getElementById("hm-bk-bar");var show=p.indexOf("/admin")===0&&p.indexOf("/admin/giris")!==0;
if((p==="/admin/ai-icerik-robotu"||p==="/admin/ozel-haber-ekle")&&!window.__BK_PAGE){if(!sessionStorage.getItem("bkR"+p)){sessionStorage.setItem("bkR"+p,"1");location.reload();}return;}
if(!show){if(b)b.style.display="none";return;}
if(!b){b=document.createElement("div");b.id="hm-bk-bar";b.style.cssText="position:fixed;right:14px;bottom:14px;z-index:2147483000;display:flex;gap:8px;font:600 13px system-ui,sans-serif";
b.innerHTML='<a href="/admin/ozel-haber-ekle" style="background:#fff;color:#0B2A5B;border:1px solid #c9d3e3;padding:9px 13px;border-radius:999px;text-decoration:none;box-shadow:0 2px 8px #0002">📝 Özel Haber ekle</a><a href="/admin/ai-icerik-robotu" style="background:#0B2A5B;color:#fff;padding:9px 13px;border-radius:999px;text-decoration:none;box-shadow:0 2px 8px #0003">🤖 AI Haber Editörü</a><a href="/admin/haber-siteleri-bekci" style="background:#e61e25;color:#fff;padding:9px 13px;border-radius:999px;text-decoration:none;box-shadow:0 2px 8px #0003">🛡️ AI Bekçi</a>';document.body.appendChild(b);}
b.style.display="flex";if(!b.__q){b.__q=1;var c=document.createElement("a");c.id="hm-bk-quota";c.href="/admin/ai-icerik-robotu#kota";c.style.cssText="background:#fff;color:#11683a;border:1px solid #c9d3e3;padding:9px 13px;border-radius:999px;text-decoration:none;box-shadow:0 2px 8px #0002";c.textContent="🔋 AI kota …";b.insertBefore(c,b.firstChild);
var lq=function(){fetch("/api/bekci/ai-quota/summary",{credentials:"include",cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(!d||!d.ok){c.style.display="none";return;}var n={evren:"Evren",nvidia:"NVIDIA",gemini:"Gemini",openai:"OpenAI"};var t="🔋 AI: "+(d.active?(n[d.active.provider]||d.active.provider):"YOK");if(d.evrenLeft!=null)t+=" · Evren "+(d.evrenLeft/1e6).toFixed(1).replace(".",",")+"M token";if(d.exhausted){var xl=(d.exhaustedList||[]).map(function(e){var u=e.until?new Date(e.until).toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit"}):"";return (n[e.provider]||e.provider)+(e.scope&&e.scope!=="global"?" ("+e.scope+")":"")+(u?" "+u+"'e kadar":"");});t+=" · ⚠️ "+(xl.length?xl.join(", ")+" kota bitti":d.exhausted+" kota bitti");}c.textContent=t;var bad=!d.active||d.exhausted||(d.active&&d.active.provider!=="evren");c.style.color=bad?"#a01515":"#11683a";c.style.borderColor=bad?"#e8a3a3":"#c9d3e3";}).catch(function(){c.style.display="none";});};lq();setInterval(lq,300000);}}
var t=0;new MutationObserver(function(){if(t)return;t=setTimeout(function(){t=0;ren();},300);}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(bar,1000);document.addEventListener("DOMContentLoaded",function(){ren();bar();});
}catch(e){}})();</script>`;

async function handleFetch(req, env) {
  const u = new URL(req.url);
  const path = u.pathname.replace(/\/+$/, "") || "/";
  // existing "Haber AI Bekçi" page API
  if (path === "/api/hm/admin/site-watchdog" && req.method === "GET") {
    const up = await fetch(req);                        // existing handler: admin auth + catalog + dualWrite flag
    if (up.status !== 200) return up;
    const base = await up.json().catch(() => ({}));
    const sql = db(env);
    const [run] = await sql.query(`SELECT results FROM hm_bekci_runs ORDER BY id DESC LIMIT 1`);
    const last = run?.results || null;
    if (last && typeof base.dualWriteReady === "boolean") last.dualWriteReady = base.dualWriteReady;
    return json(200, { ...base, last: last || base.last, engine: "hm-bekci" });
  }
  if (path === "/api/hm/admin/site-watchdog/run" && req.method === "POST") {
    const s = await adminSession(req); if (!s) return json(401, { ok: false, error: "Yönetici girişi gerekli" });
    const report = await runOnce(env, { manual: true, cookie: s.cookie });
    return json(200, { ok: true, report });
  }
  if (path.startsWith("/api/hm/admin/site-watchdog")) return fetch(req);   // sync-site / sync-all: existing handlers
  if (path.startsWith("/api/bekci/media/") && req.method === "GET") {
    const m = /^\/api\/bekci\/media\/(\d{1,12})(?:\.(?:webp|jpg|jpeg|png))?$/.exec(path);
    if (!m) return new Response("yok", { status: 404 });
    return ozelMedia(db(env), m[1]);
  }
  if (path === "/api/bekci/tick" && req.method === "POST") {      // VPS-driven schedule (CF cron fallback)
    if (!env.BEKCI_TICK_TOKEN || req.headers.get("x-bekci-token") !== env.BEKCI_TICK_TOKEN) return json(403, { ok: false });
    const kind = u.searchParams.get("kind") || "bekci";
    if (kind === "bekci") { const r = await runOnce(env); return json(200, { ok: true, skipped: !!r?.skipped, at: r?.generatedAt || null }); }
    if (kind === "ai_fetch" || kind === "ai_nofetch") return json(200, { ok: true, ...(await enqueue(db(env), "ai_editor_run", kind === "ai_fetch" ? "fetch" : "nofetch", "zamanlanmış (VPS tick)")) });
    return json(400, { ok: false });
  }
  if (path.startsWith("/api/bekci/")) {
    const s = await adminSession(req); if (!s) return json(401, { ok: false, error: "Yönetici girişi gerekli" });
    const sql = db(env);
    if (path === "/api/bekci/ozel-haber" && req.method === "GET") return json(200, { ok: true, sites: await ozelSites(sql), items: await ozelList(sql) });
    if (path === "/api/bekci/ozel-haber" && req.method === "POST") {
      const b = await req.json().catch(() => null); if (!b) return json(400, { ok: false, error: "geçersiz istek" });
      try {
        const r = await ozelCreate(sql, b, { who: s.full ? "admin" : "editor" });
        await logEvent(sql, { domain: "ahenk.net.tr", kind: "ozel_haber", severity: "info", message: `Özel haber yayımlandı: "${String(b.title).slice(0, 80)}" → ${r.rows.length} site`, detail: { group: r.group, ids: r.rows.map((x) => x.id) } });
        await purgeOzel(env, r.rows.map((x) => x.siteId), sql);
        return json(200, { ok: true, ...r });
      } catch (e) { return json(400, { ok: false, error: String(e.message || e).slice(0, 200) }); }
    }
    if (path === "/api/bekci/ozel-haber/status" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      try { const r = await ozelSetStatus(sql, b.group, !!b.live); await logEvent(sql, { domain: "ahenk.net.tr", kind: "ozel_haber", severity: "info", message: `Özel haber ${b.live ? "yayına alındı" : "gizlendi"} (${b.group}, ${r.n} satır)` }); await purgeOzel(env, r.siteIds, sql); return json(200, { ok: true, ...r }); }
      catch (e) { return json(400, { ok: false, error: String(e.message || e).slice(0, 200) }); }
    }
    if (path === "/api/bekci/ai-editor" && req.method === "GET") return json(200, { ok: true, ...(await editorData(sql)) });
    if (path === "/api/bekci/ai-quota" && req.method === "GET") return json(200, { ok: true, ...(await quotaData(sql)) });
    if (path === "/api/bekci/ai-quota/summary" && req.method === "GET") {
      const d = await quotaData(sql); const ev = d.shared.find((p) => p.provider === "evren" && p.scope === "global");
      return json(200, { ok: true, active: d.active, exhausted: d.exhausted.length, exhaustedList: d.exhausted.map((e) => ({ provider: e.provider, scope: e.scope, until: e.breakerOpenUntil })), evrenCheckedAt: ev?.checked_at ?? null, evrenLeft: ev?.remaining?.daily_tokens_left ?? null, ownKeys: d.own.length, low: d.manset5.filter((s) => s.orig < 5).length });
    }
    if (path === "/api/bekci/ai-editor/toggle" && req.method === "POST") {
      const b = await req.json().catch(() => ({})); const id = Number(b.siteId);
      if (!id) return json(400, { ok: false, error: "siteId gerekli" });
      const r = await sql.query(`UPDATE hm_ai_editor_sites SET enabled=$2, updated_at=now() WHERE site_id=$1 AND site_slug NOT IN ('vkd','trafik','tr','kirsehirhaber') RETURNING site_id, enabled`, [id, !!b.enabled]);
      if (!r.length) return json(404, { ok: false, error: "site yok veya kapsam dışı" });
      await logEvent(sql, { domain: String(id), kind: "ai_editor_toggle", severity: "info", message: `AI Haber Editörü site #${id} ${b.enabled ? "açıldı" : "kapatıldı"} (panel)` });
      return json(200, { ok: true, ...r[0] });
    }
    if (path === "/api/bekci/ai-editor/run" && req.method === "POST") return json(200, { ok: true, ...(await enqueue(sql, "ai_editor_run", "fetch", "panel: Şimdi çalıştır")) });
    if (path === "/api/bekci/ai-test" && req.method === "GET") return json(200, await aiChat(env, "Tek cümleyle yanıt ver: Türkiye'nin başkenti neresidir?"));
    return json(404, { ok: false, error: "yok" });
  }
  if (path === "/admin/ozel-haber-ekle") {
    const s = await adminSession(req);
    if (!s) return new Response(null, { status: 302, headers: { location: "/admin/giris?next=/admin/ozel-haber-ekle", "cache-control": "no-store" } });
    return new Response(ozelPage() + INJECT, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
  }
  if (path === "/admin/ai-icerik-robotu" || path.startsWith("/admin/ai-icerik-robotu/")) {
    const s = await adminSession(req);
    if (!s) return new Response(null, { status: 302, headers: { location: "/admin/giris?next=/admin/ai-icerik-robotu", "cache-control": "no-store" } });
    return new Response(editorPage() + INJECT, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
  }
  // everything else under /admin: pass through to the panel; add the shortcut bar to HTML documents
  const res = await fetch(req);
  const ct = res.headers.get("content-type") || "";
  if (req.method !== "GET" || res.status !== 200 || !ct.includes("text/html")) return res;
  return new HTMLRewriter().on("body", { element(el) { el.append(INJECT, { html: true }); } }).transform(res);
}

export default {
  async scheduled(event, env, ctx) {
    const sql = db(env);
    if (event.cron === "*/10 * * * *") { try { await runOnce(env); } catch (e) { console.error("[bekci]", e?.stack || e); } return; }   // await: waitUntil after return is cut at 30 s
    const nofetch = /^47 /.test(event.cron);
    try { await enqueue(sql, "ai_editor_run", nofetch ? "nofetch" : "fetch", `zamanlanmış (${event.cron})`); } catch (e) { console.error("[ai-editor-schedule]", e?.message || e); }
  },
  async fetch(req, env, ctx) {
    try { return await handleFetch(req, env); }
    catch (e) {
      console.error("[bekci-fetch]", e?.stack || e);
      const p = new URL(req.url).pathname;
      if (p.startsWith("/admin") && p !== "/admin/ai-icerik-robotu" && p !== "/admin/ozel-haber-ekle" && !p.startsWith("/admin/ai-icerik-robotu/")) return fetch(req);   // never break the panel
      return json(500, { ok: false, error: "bekçi hatası: " + String(e?.message || e).slice(0, 160) });
    }
  },
};
