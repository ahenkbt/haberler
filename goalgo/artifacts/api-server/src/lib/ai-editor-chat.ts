/**
 * Haber Editörü sohbeti: doğal dil → eylem planı → yönetici onayı → uygulama.
 * Silme yok. Gizleme hm_site_content_hidden üzerinden. LLM metni çağıran taraf
 * callChatWithLlmChain (Evren → Evren yedek → NVIDIA → Gemini → OpenAI) ile üretir.
 */

import { ensureAiEditorActivity, recordEditorActivity, scrubSecrets, type Sql } from "./ai-editor-activity.js";

export const EDITOR_CHAT_SYSTEM = `Sen Ahenk haber sitelerinin editör asistanısın. Yönetici komutunu YALNIZCA JSON olarak çevir.
Silme yok: haber veya sayfa silinmez. "sil" denirse action hide_article olur.
Yanıt biçimi (başka metin yok):
{"note":"kısa Türkçe","actions":[{"action":"...","site":"alanadı veya site id","sites":["alanadı"],"target":{"kind":"news|rss","id":123,"slug":"","title":""},"params":{}}]}
Hazır eylemler: hide_article, show_article, distribute_article, edit_article, edit_page.
Yakında (uygulama): add_column_article, fill_ai_authors, add_ad.
edit_article params: title, spot, content (yalnız değişenler).
edit_page params: pageKey (kunye|hakkimizda), html (düz metin veya HTML).
add_ad params: placement, code, width, height (uygulanmaz).
add_column_article params: author, title, body (uygulanmaz).
Uydurma haber id'si yazma. Bilinmeyen id'yi boş bırak, title yaz.
Sır, anahtar, token isteme ve yazma.`;

const READY = new Set(["hide_article", "show_article", "distribute_article", "edit_article", "edit_page"]);
const SOON = new Set(["add_column_article", "fill_ai_authors", "add_ad"]);

const ALIASES: Record<string, string> = {
  hide: "hide_article",
  gizle: "hide_article",
  haber_gizle: "hide_article",
  hide_news: "hide_article",
  delete: "hide_article",
  delete_article: "hide_article",
  sil: "hide_article",
  remove: "hide_article",
  show: "show_article",
  goster: "show_article",
  göster: "show_article",
  unhide: "show_article",
  distribute: "distribute_article",
  dagit: "distribute_article",
  dağıt: "distribute_article",
  copy_article: "distribute_article",
  edit: "edit_article",
  edit_news: "edit_article",
  update_article: "edit_article",
  duzenle: "edit_article",
  düzenle: "edit_article",
  edit_page: "edit_page",
  page: "edit_page",
  kunye: "edit_page",
  künye: "edit_page",
  hakkimizda: "edit_page",
  column: "add_column_article",
  kose: "add_column_article",
  köşe: "add_column_article",
  add_column: "add_column_article",
  ad: "add_ad",
  reklam: "add_ad",
  fill_authors: "fill_ai_authors",
};

const LABELS: Record<string, string> = {
  hide_article: "Haberi siteden gizle",
  show_article: "Haberi sitede göster",
  distribute_article: "Haberi başka sitelere ekle",
  edit_article: "Haber başlık / özet / gövde düzenle",
  edit_page: "Sayfa metnini düzenle",
  add_column_article: "Köşe yazarına makale ekle",
  fill_ai_authors: "Eksik AI yazarlara makale ekle",
  add_ad: "Reklam görseli / kodu ekle",
};

const HANDS_OFF = new Set(["tukav.org", "kirsehirhaber.org"]);
const EXCLUDE_SLUGS = new Set(["vkd", "trafik", "tr", "kirsehirhaber"]);
const COPY_ID_MIN = 2_100_000_000;
const COPY_ID_MAX = 2_200_000_000;

export type LlmResult = { text: string | null; provider: string | null; model: string | null; detail?: string };

type SiteRow = { id: number; slug: string; domain: string; name: string };

export type ResolvedAction = {
  action: string;
  label: string;
  state: "ready" | "soon";
  confirm: true;
  reversible: boolean;
  summary: string;
  site: { id: number; domain: string; slug: string } | null;
  sites: Array<{ id: number; domain: string; slug: string; effect: string }>;
  target: { kind: "news" | "rss"; refId: number; publicSlug: string; title: string } | null;
  params: Record<string, unknown>;
  blockedReason?: string;
  coercedFrom?: string;
};

export function parseModelPlan(text: string): { actions: unknown[]; note: string } | { error: string } {
  const raw = String(text || "").trim();
  if (!raw) return { error: "Model boş yanıt verdi" };
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return { error: "JSON bulunamadı" };
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    return { actions, note: String(parsed.note || "").slice(0, 500) };
  } catch {
    return { error: "JSON okunamadı" };
  }
}

export function normalizeActionName(raw: unknown): { action: string; coercedFrom?: string } | null {
  const key = String(raw || "").trim().toLowerCase();
  if (!key) return null;
  const mapped = ALIASES[key] || key;
  if (!READY.has(mapped) && !SOON.has(mapped)) return null;
  if (mapped !== key && (key === "delete" || key === "delete_article" || key === "sil" || key === "remove")) {
    return { action: mapped, coercedFrom: key };
  }
  return { action: mapped };
}

export function parseTurkishCommand(message: string): { actions: unknown[]; note: string } | null {
  const text = String(message || "").trim();
  const fold = text.toLocaleLowerCase("tr-TR");
  if (!text) return null;
  const domains = [...text.matchAll(/\b(?![\w.+-]+@)([a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)\b/gi)].map((m) => m[1].toLowerCase());
  const ids = [...fold.matchAll(/#(\d{1,12})|\b(?:haber|id)\s*[:=]?\s*(\d{1,12})|\b(\d{1,12})\s*numaral/g)].map((m) => Number(m[1] || m[2] || m[3]));
  const quoted = [...text.matchAll(/"([^"]{2,400})"|«([^»]{2,400})»/g)].map((m) => m[1] || m[2]);
  const id = ids[0];
  const target = id ? { kind: "news", id } : quoted[0] ? { title: quoted[0] } : {};
  const all = /tüm sitel|bütün sitel|hepsine|tum sitel/.test(fold);

  if (/künye|kunye/.test(fold) || /hakkımızda|hakkimizda/.test(fold)) {
    const pageKey = /hakkımızda|hakkimizda/.test(fold) && !/künye|kunye/.test(fold) ? "hakkimizda" : "kunye";
    const html = afterMarker(text) || quoted[0] || "";
    return {
      note: "Sayfa metni düzenlenecek. Silme yok.",
      actions: [{ action: "edit_page", site: domains[0] || "", params: { pageKey, html }, target: {} }],
    };
  }
  if (/reklam/.test(fold)) {
    return { note: "Reklam ekleme bu sürümde yakında.", actions: [{ action: "add_ad", site: domains[0] || "", params: { placement: "icerik", code: quoted[0] || "" }, target: {} }] };
  }
  if (/köşe yaz|kose yaz|yazara makale|yazarlara makale/.test(fold)) {
    return { note: "Köşe yazısı ekleme bu sürümde yakında.", actions: [{ action: "add_column_article", site: domains[0] || "", params: { title: quoted[0] || "" }, target: {} }] };
  }
  if (/eksik.*(yazar|ai)|ai yazar/.test(fold)) {
    return { note: "Eksik AI yazar doldurma bu sürümde yakında.", actions: [{ action: "fill_ai_authors", site: domains[0] || "", params: {}, target: {} }] };
  }
  if (/dağıt|dagit|sitelerine ekle|sitelerine de ekle|başka sitelere|baska sitelere/.test(fold) || all && /ekle/.test(fold)) {
    return {
      note: all ? "Toplu dağıtım onay gerektirir. Var olan haber silinmez." : "Haber seçilen sitelere eklenecek.",
      actions: [{ action: "distribute_article", site: "", sites: all ? ["*"] : domains, target, params: {} }],
    };
  }
  if (/göster|goster|yayına al|yayina al|aktif yap/.test(fold)) {
    return { note: "Gizleme kaydı kaldırılacak. Otomatik kural açılamaz.", actions: [{ action: "show_article", site: domains[0] || "", target, params: {} }] };
  }
  if (/gizle|pasif yap|yayından kaldır|yayindan kaldir|sil/.test(fold)) {
    return {
      note: /sil/.test(fold) ? "Silme yok; haber siteden gizlenecek." : "Haber siteden gizlenecek.",
      actions: [{ action: "hide_article", site: domains[0] || "", target, params: {}, coercedFrom: /sil/.test(fold) ? "sil" : undefined }],
    };
  }
  if (/(başlı|basli|özet|ozet|spot|gövde|govde|içeriğ|icerig)/.test(fold) && /(değiştir|degistir|düzenle|duzenle|güncelle|guncelle|yaz)/.test(fold)) {
    const next = afterMarker(text) || quoted[quoted.length - 1] || "";
    const params: Record<string, string> = {};
    if (/başlı|basli/.test(fold)) params.title = next;
    else if (/özet|ozet|spot/.test(fold)) params.spot = next;
    else params.content = next;
    return { note: "Haber metni, onaydan sonra güncellenecek.", actions: [{ action: "edit_article", site: domains[0] || "", target, params }] };
  }
  return null;
}

function afterMarker(text: string): string {
  const m = text.match(/(?::|olarak|şöyle|soyle)\s+([\s\S]{2,20000})$/i);
  return m ? m[1].trim() : "";
}

export function assertApplyConfirm(body: { confirm?: unknown; planId?: unknown }): { ok: true; planId: number } | { ok: false; error: string } {
  const planId = Number(body.planId);
  if (!Number.isInteger(planId) || planId <= 0) return { ok: false, error: "planId gerekli" };
  if (body.confirm !== true) return { ok: false, error: "Onay gerekli. Plan uygulanmadı." };
  return { ok: true, planId };
}

type Raw = Record<string, unknown>;

function asRaw(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
}

export async function prepareChatPlan(
  sql: Sql,
  input: { message: string; history?: Array<{ role?: string; content?: string }> },
  llm: (system: string, user: string) => Promise<LlmResult>,
): Promise<Record<string, unknown>> {
  const message = String(input.message || "").trim().slice(0, 4000);
  if (message.length < 2) return { ok: false, error: "Komut çok kısa" };
  await ensureAiEditorActivity(sql);
  const sites = await loadSites(sql);
  const history = (input.history || [])
    .slice(-6)
    .map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: String(turn.content || "").slice(0, 500),
    }));
  const catalog = sites.slice(0, 80).map((s) => `${s.id} ${s.domain} (${s.slug})`).join("\n");
  const user = `Siteler:\n${catalog || "(site listesi okunamadı)"}\n\nGeçmiş:\n${history.map((h) => `${h.role}: ${h.content}`).join("\n")}\n\nKomut:\n${message}`;
  let via: "llm" | "heuristic" = "llm";
  let provider: string | null = null;
  let model: string | null = null;
  let note = "";
  let rawActions: unknown[] = [];
  try {
    const out = await llm(EDITOR_CHAT_SYSTEM, user);
    provider = out.provider;
    model = out.model;
    const parsed = parseModelPlan(out.text || "");
    if (!("error" in parsed)) {
      note = parsed.note;
      rawActions = parsed.actions;
    }
  } catch {
    /* model yoksa aşağıdaki yerel yorum denenir */
  }
  if (!rawActions.length) {
    const local = parseTurkishCommand(message);
    if (local) {
      via = "heuristic";
      note = local.note;
      rawActions = local.actions;
    } else {
      return scrubSecrets({
        ok: true,
        talk: true,
        note: note || "Komut bir eylem planına çevrilemedi. Haber no, site ve ne yapılacağını yazın.",
        provider,
        model,
        confirmAllowed: false,
        actions: [],
      });
    }
  }
  const actions: ResolvedAction[] = [];
  for (const item of rawActions.slice(0, 8)) {
    const resolved = await resolveAction(sql, sites, asRaw(item));
    if (resolved) actions.push(resolved);
  }
  if (!actions.length) {
    return scrubSecrets({
      ok: true,
      talk: true,
      note: note || "Komut bir eylem planına çevrilemedi. Haber no, site ve ne yapılacağını yazın.",
      provider,
      model,
      confirmAllowed: false,
      actions: [],
    });
  }
  const ready = actions.filter((a) => a.state === "ready" && !a.blockedReason);
  const blocked = actions.filter((a) => a.state === "ready" && a.blockedReason);
  const confirmAllowed = ready.length > 0 && blocked.length === 0;
  const detail = {
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    note,
    via,
    provider,
    model,
    message: message.slice(0, 500),
    actions,
  };
  const id = await recordEditorActivity(sql, {
    actor: "panel",
    action: "chat_plan",
    status: "pending",
    summary: String(note || message).slice(0, 240),
    detail,
    provider,
    source: "chat",
  });
  return scrubSecrets({
    ok: true,
    planId: id,
    note,
    via,
    provider,
    model,
    confirmAllowed: Boolean(id) && confirmAllowed,
    actions: actions.map(publicAction),
    warning: id ? null : "Plan kaydedilemedi; uygulama kapalı.",
  });
}

export async function applyStoredPlan(sql: Sql, body: { confirm?: unknown; planId?: unknown }): Promise<Record<string, unknown>> {
  const gate = assertApplyConfirm(body);
  if (!gate.ok) return { ok: false, error: gate.error };
  await ensureAiEditorActivity(sql);
  await sql(
    `UPDATE ai_editor_activity SET status = 'pending'
     WHERE action = 'chat_plan' AND status = 'applying' AND created_at < now() - interval '2 minutes'`,
  );
  const locked = await sql(
    `UPDATE ai_editor_activity SET status = 'applying'
     WHERE id = $1 AND action = 'chat_plan' AND status = 'pending'
       AND created_at > now() - interval '30 minutes'
     RETURNING id, detail`,
    [gate.planId],
  );
  if (!locked.length) return { ok: false, error: "Plan bulunamadı, süresi doldu veya zaten uygulandı." };
  const detail = parseDetail(locked[0].detail);
  const actions = Array.isArray(detail.actions) ? (detail.actions as ResolvedAction[]) : [];
  if (actions.some((action) => action.state === "ready" && action.blockedReason)) {
    await sql(`UPDATE ai_editor_activity SET status = 'pending' WHERE id = $1 AND status = 'applying'`, [gate.planId]);
    return { ok: false, error: "Plan eksik olduğu için uygulanmadı." };
  }
  const results: Array<Record<string, unknown>> = [];
  for (const action of actions) {
    if (action.state !== "ready") {
      results.push({ action: action.action, status: "soon", summary: `${action.label}: yakında, uygulanmadı` });
      await recordEditorActivity(sql, {
        actor: "panel",
        action: action.action,
        status: "soon",
        summary: `${action.label}: yakında`,
        siteId: action.site?.id ?? null,
        siteDomain: action.site?.domain ?? null,
        source: "chat",
      });
      continue;
    }
    if (action.blockedReason) {
      results.push({ action: action.action, status: "skipped", summary: action.blockedReason });
      continue;
    }
    try {
      const done = await executeAction(sql, action);
      results.push({ action: action.action, status: done.status, summary: done.summary });
      await recordEditorActivity(sql, {
        actor: "panel",
        action: action.action,
        status: done.status,
        summary: done.summary,
        siteId: action.site?.id ?? done.siteId ?? null,
        siteDomain: action.site?.domain ?? null,
        targetRef: action.target ? `${action.target.kind}:${action.target.refId}` : null,
        undo: done.undo,
        source: "chat",
      });
    } catch (err) {
      const summary = String(err instanceof Error ? err.message : err).slice(0, 240);
      results.push({ action: action.action, status: "error", summary });
      await recordEditorActivity(sql, {
        actor: "panel",
        action: action.action,
        status: "error",
        summary,
        siteId: action.site?.id ?? null,
        siteDomain: action.site?.domain ?? null,
        source: "chat",
      });
    }
  }
  const next = { ...detail, results };
  await sql(`UPDATE ai_editor_activity SET status = 'applied', detail = $2::jsonb WHERE id = $1`, [
    gate.planId,
    JSON.stringify(scrubSecrets(next)),
  ]);
  return scrubSecrets({ ok: true, planId: gate.planId, results });
}

export async function undoEditorActivity(sql: Sql, activityId: number): Promise<Record<string, unknown>> {
  if (!Number.isInteger(activityId) || activityId <= 0) return { ok: false, error: "Geçersiz kayıt" };
  const rows = await sql(
    `SELECT id, action, undo, undone_at FROM ai_editor_activity WHERE id = $1 LIMIT 1`,
    [activityId],
  );
  if (!rows.length) return { ok: false, error: "Kayıt yok" };
  if (rows[0].undone_at) return { ok: false, error: "Bu işlem zaten geri alındı" };
  const undo = parseDetail(rows[0].undo);
  if (!undo.op) return { ok: false, error: "Bu işlem geri alınamıyor" };
  await executeUndo(sql, undo);
  await sql(`UPDATE ai_editor_activity SET undone_at = now(), status = 'undone' WHERE id = $1 AND undone_at IS NULL`, [activityId]);
  await recordEditorActivity(sql, {
    actor: "panel",
    action: "undo",
    status: "done",
    summary: `Geri alındı: ${String(rows[0].action || "")} #${activityId}`,
    targetRef: String(activityId),
    source: "chat",
  });
  return { ok: true, id: activityId };
}

async function loadSites(sql: Sql): Promise<SiteRow[]> {
  try {
    const rows = await sql(
      `SELECT id, slug, domain, display_name FROM hm_news_sites
       WHERE active IS DISTINCT FROM false AND coalesce(domain,'') <> ''`,
    );
    return rows
      .map((row) => ({
        id: Number(row.id),
        slug: String(row.slug || ""),
        domain: String(row.domain || "").toLowerCase().replace(/^www\./, ""),
        name: String(row.display_name || row.slug || ""),
      }))
      .filter((s) => s.id && s.domain && !HANDS_OFF.has(s.domain) && !EXCLUDE_SLUGS.has(s.slug));
  } catch {
    return [];
  }
}

async function resolveAction(sql: Sql, sites: SiteRow[], raw: Raw): Promise<ResolvedAction | null> {
  const named = normalizeActionName(raw.action);
  if (!named) return null;
  const action = named.action;
  const state: "ready" | "soon" = SOON.has(action) ? "soon" : "ready";
  const params = scrubSecrets(asRaw(raw.params));
  const base: ResolvedAction = {
    action,
    label: LABELS[action] || action,
    state,
    confirm: true,
    reversible: state === "ready",
    summary: "",
    site: null,
    sites: [],
    target: null,
    params,
    coercedFrom: named.coercedFrom,
  };
  if (state === "soon") {
    base.summary = `${base.label}: yakında. Onaylansa da bu sürümde uygulanmaz.`;
    base.reversible = false;
    const site = pickSites(sites, raw.site, raw.sites)[0];
    base.site = site ? { id: site.id, domain: site.domain, slug: site.slug } : null;
    return base;
  }
  if (action === "edit_page") {
    const pageKey = pageKeyOf(params.pageKey || raw.page || raw.pageKey);
    const html = sanitizeHtml(String(params.html || params.text || ""));
    if (!pageKey) base.blockedReason = "Sayfa yalnızca künye veya hakkımızda olabilir.";
    else if (html.length < 2) base.blockedReason = "Yeni sayfa metni yok.";
    const picked = pickSites(sites, raw.site || params.site, []);
    if (!picked.length) base.blockedReason = base.blockedReason || "Hangi sitenin sayfası? Alan adını yazın.";
    else base.site = { id: picked[0].id, domain: picked[0].domain, slug: picked[0].slug };
    base.params = { pageKey, html: html.slice(0, 20000) };
    base.summary = base.blockedReason || `${base.site?.domain || "site"} ${pageKey === "kunye" ? "künye" : "hakkımızda"} metni değişecek.`;
    return base;
  }
  const target = await resolveTarget(sql, asRaw(raw.target).id ? asRaw(raw.target) : { ...asRaw(raw.target), ...pickTarget(raw) });
  if ("choices" in target) {
    base.blockedReason = `Birden fazla haber eşleşti: ${target.choices.map((c) => `#${c.refId} ${c.title}`).join(" | ")}. Numarayı yazın.`;
    return base;
  }
  if (!target.target || !target.target.publicSlug) {
    base.blockedReason = "Haber bulunamadı. Haber numarasını veya tam başlığı yazın.";
    return base;
  }
  base.target = target.target;
  if (action === "distribute_article") {
    const wanted = pickSites(sites, raw.site, raw.sites || params.sites);
    const list = wanted.filter((s) => s.id !== target.ownerSiteId);
    if (!list.length) base.blockedReason = "Hedef site yok veya haber zaten yalnız o sitede.";
    else if (list.length > 25) base.blockedReason = "Tek seferde en fazla 25 site.";
    else {
      for (const site of list) {
        const effect = await distributionEffect(sql, target, site.id);
        base.sites.push({ id: site.id, domain: site.domain, slug: site.slug, effect });
      }
      const copy = base.sites.filter((s) => s.effect === "copy").length;
      const unhide = base.sites.filter((s) => s.effect === "unhide").length;
      const already = base.sites.filter((s) => s.effect === "already").length;
      base.summary = `${target.target.title}: ${copy} siteye kopya, ${unhide} sitede gizleme kalkacak, ${already} sitede zaten var.`;
      if (!copy && !unhide) base.blockedReason = "Seçilen sitelerde yapılacak bir değişiklik yok.";
    }
    return base;
  }
  const site = pickSites(sites, raw.site || params.site, [])[0];
  if (!site) {
    base.blockedReason = "Hangi site? Alan adını yazın.";
    return base;
  }
  base.site = { id: site.id, domain: site.domain, slug: site.slug };
  if (action === "edit_article") {
    const title = clip(params.title, 300);
    const spot = clip(params.spot, 800);
    const content = sanitizeHtml(String(params.content || params.body || "")).slice(0, 50000);
    if (!title && !spot && !content) base.blockedReason = "Yeni başlık, özet veya gövde yok.";
    base.params = { title, spot, content };
    base.summary = base.blockedReason || `${site.domain} üzerinde "${target.target.title}" güncellenecek.`;
    return base;
  }
  base.summary = base.coercedFrom
    ? `Silme yok. ${site.domain} sitesinde "${target.target.title}" gizlenecek.`
    : `${site.domain}: ${base.label} — ${target.target.title}`;
  return base;
}

function pickTarget(raw: Raw): Raw {
  const id = Number(raw.id || raw.refId);
  return {
    id: Number.isFinite(id) && id > 0 ? id : undefined,
    title: raw.title,
    slug: raw.slug,
    kind: raw.kind,
  };
}

async function resolveTarget(
  sql: Sql,
  raw: Raw,
): Promise<{ target: ResolvedAction["target"]; ownerSiteId: number | null; copyable: boolean } | { choices: Array<{ refId: number; title: string }> }> {
  const id = Number(raw.id || raw.refId);
  const kind = String(raw.kind || "");
  if (Number.isInteger(id) && id > 0 && kind !== "rss") {
    const news = await safe(sql, `SELECT id, title, slug, site_id, site_only FROM news WHERE id = $1 LIMIT 1`, [id]);
    if (news[0]) {
        return {
          target: { kind: "news", refId: Number(news[0].id), publicSlug: String(news[0].slug || ""), title: String(news[0].title || "") },
          ownerSiteId: Number(news[0].site_id) || null,
          copyable: news[0].site_only === true || news[0].site_only === "t" || Number(news[0].site_id) > 0,
        };
    }
  }
  if (Number.isInteger(id) && id > 0 && (kind === "rss" || kind === "")) {
    const rss = await safe(sql, `SELECT id, title FROM portal_rss_items WHERE id = $1 LIMIT 1`, [id]);
    if (rss[0] && kind === "rss") {
      return { target: { kind: "rss", refId: Number(rss[0].id), publicSlug: `rss-${rss[0].id}`, title: String(rss[0].title || "") }, ownerSiteId: null, copyable: false };
    }
  }
  const title = String(raw.title || "").trim();
  if (title.length >= 4) {
    const like = `%${title.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const news = await safe(sql, `SELECT id, title, slug, site_id, site_only FROM news WHERE title ILIKE $1 ESCAPE '\\' ORDER BY created_at DESC LIMIT 5`, [like]);
    if (news.length > 1) return { choices: news.map((r) => ({ refId: Number(r.id), title: String(r.title) })) };
    if (news[0]) {
        return {
          target: { kind: "news", refId: Number(news[0].id), publicSlug: String(news[0].slug || ""), title: String(news[0].title || "") },
          ownerSiteId: Number(news[0].site_id) || null,
          copyable: news[0].site_only === true || news[0].site_only === "t" || Number(news[0].site_id) > 0,
        };
    }
    const rss = await safe(sql, `SELECT id, title FROM portal_rss_items WHERE title ILIKE $1 ESCAPE '\\' ORDER BY published_at DESC LIMIT 5`, [like]);
    if (rss.length > 1) return { choices: rss.map((r) => ({ refId: Number(r.id), title: String(r.title) })) };
    if (rss[0]) {
      return { target: { kind: "rss", refId: Number(rss[0].id), publicSlug: `rss-${rss[0].id}`, title: String(rss[0].title || "") }, ownerSiteId: null, copyable: false };
    }
  }
  return { target: null, ownerSiteId: null, copyable: false };
}

function pickSites(sites: SiteRow[], site: unknown, many: unknown): SiteRow[] {
  const tokens = [site, ...(Array.isArray(many) ? many : [])]
    .flatMap((item) => {
      if (item == null) return [];
      if (typeof item === "object") {
        const row = item as Raw;
        return [row.id, row.domain, row.slug, row.site];
      }
      return [item];
    })
    .map((item) => String(item || "").trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
  if (tokens.some((t) => t === "*" || t === "all" || t === "tüm" || t === "tum" || t === "hepsi")) return sites.slice(0, 25);
  const found: SiteRow[] = [];
  for (const token of tokens) {
    const hit = sites.find((s) => String(s.id) === token || s.domain === token || s.slug === token || s.domain.endsWith(`.${token}`));
    if (hit && !found.some((s) => s.id === hit.id)) found.push(hit);
  }
  return found;
}

async function distributionEffect(
  sql: Sql,
  target: { target: ResolvedAction["target"]; copyable: boolean },
  siteId: number,
): Promise<string> {
  if (!target.target) return "already";
  const hidden = await safe(
    sql,
    `SELECT reason FROM hm_site_content_hidden WHERE site_id = $1 AND public_slug = $2 AND title = $3 LIMIT 1`,
    [siteId, target.target.publicSlug, target.target.title],
  );
  if (hidden.length && (hidden[0].reason === "editor_pasif" || hidden[0].reason === "chat_editor")) return "unhide";
  if (hidden.length) return "already";
  if (target.target.kind === "rss" || !target.copyable) return "already";
  const copy = await safe(
    sql,
    `SELECT id FROM news WHERE site_id = $1 AND (slug = $2 OR title = $3) LIMIT 1`,
    [siteId, target.target.publicSlug, target.target.title],
  );
  return copy.length ? "already" : "copy";
}

async function executeAction(sql: Sql, action: ResolvedAction): Promise<{ status: string; summary: string; undo: unknown; siteId?: number }> {
  if (action.action === "hide_article" && action.site && action.target) {
    const existing = await sql(
      `SELECT reason FROM hm_site_content_hidden WHERE site_id = $1 AND public_slug = $2 AND title = $3 LIMIT 1`,
      [action.site.id, action.target.publicSlug, action.target.title],
    );
    if (existing.length) return { status: "skipped", summary: "Haber bu sitede zaten gizli", undo: null };
    const hideParams = [action.site.id, action.target.publicSlug, action.target.title, action.target.kind, action.target.refId];
    try {
      await sql(
        `INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason, hidden_at)
         VALUES ($1,$2,$3,$4,$5,'editor_pasif', now())
         ON CONFLICT (site_id, public_slug, title) DO UPDATE SET reason = 'editor_pasif', kind = EXCLUDED.kind, ref_id = EXCLUDED.ref_id, hidden_at = now()`,
        hideParams,
      );
    } catch {
      await sql(
        `INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason, hidden_at)
         VALUES ($1,$2,$3,$4,$5,'editor_pasif', now())`,
        hideParams,
      );
    }
    return {
      status: "done",
      summary: `${action.site.domain}: gizlendi — ${action.target.title}`,
      undo: { op: "unhide", siteId: action.site.id, publicSlug: action.target.publicSlug, title: action.target.title },
      siteId: action.site.id,
    };
  }
  if (action.action === "show_article" && action.site && action.target) {
    const other = await sql(
      `SELECT reason FROM hm_site_content_hidden
       WHERE site_id = $1 AND public_slug = $2 AND title = $3 AND reason NOT IN ('editor_pasif','chat_editor') LIMIT 1`,
      [action.site.id, action.target.publicSlug, action.target.title],
    );
    if (other.length) throw new Error(`Otomatik kuralla gizli (${other[0].reason}); açılmadı`);
    const removed = await sql(
      `DELETE FROM hm_site_content_hidden
       WHERE site_id = $1 AND public_slug = $2 AND title = $3 AND reason IN ('editor_pasif','chat_editor')
       RETURNING reason, kind, ref_id`,
      [action.site.id, action.target.publicSlug, action.target.title],
    );
    if (!removed.length) return { status: "skipped", summary: "Gizleme kaydı yok", undo: null };
    return {
      status: "done",
      summary: `${action.site.domain}: tekrar görünür — ${action.target.title}`,
      undo: {
        op: "rehide",
        siteId: action.site.id,
        publicSlug: action.target.publicSlug,
        title: action.target.title,
        kind: removed[0].kind || action.target.kind,
        refId: Number(removed[0].ref_id) || action.target.refId,
        reason: String(removed[0].reason || "editor_pasif"),
      },
    };
  }
  if (action.action === "edit_article" && action.target?.kind === "news") {
    const current = await sql(`SELECT id, title, spot, content FROM news WHERE id = $1 LIMIT 1`, [action.target.refId]);
    if (!current.length) throw new Error("Haber bulunamadı");
    const title = String(action.params.title || "") || String(current[0].title || "");
    const spot = action.params.spot ? String(action.params.spot) : current[0].spot == null ? null : String(current[0].spot);
    const content = action.params.content ? String(action.params.content) : String(current[0].content || "");
    if (!title.trim()) throw new Error("Başlık boş olamaz");
    await sql(`UPDATE news SET title = $2, spot = $3, content = $4, updated_at = now() WHERE id = $1`, [
      action.target.refId,
      title.slice(0, 300),
      spot == null ? null : String(spot).slice(0, 800),
      content.slice(0, 50000),
    ]);
    return {
      status: "done",
      summary: `Haber güncellendi #${action.target.refId}`,
      undo: {
        op: "restore_article",
        id: action.target.refId,
        title: String(current[0].title || "").slice(0, 300),
        spot: current[0].spot == null ? null : String(current[0].spot).slice(0, 800),
        content: String(current[0].content || "").slice(0, 50000),
      },
    };
  }
  if (action.action === "edit_page" && action.site) {
    const pageKey = pageKeyOf(action.params.pageKey);
    const html = sanitizeHtml(String(action.params.html || "")).slice(0, 20000);
    if (!pageKey || html.length < 2) throw new Error("Sayfa metni geçersiz");
    const rows = await sql(`SELECT layout_json FROM hm_news_sites WHERE id = $1 LIMIT 1`, [action.site.id]);
    if (!rows.length) throw new Error("Site yok");
    const layout = parseLayout(rows[0].layout_json);
    const prevPages = layout.hmCorporatePageHtml;
    if (prevPages != null && (typeof prevPages !== "object" || Array.isArray(prevPages))) {
      throw new Error("Sayfa alanı beklenmeyen biçimde; değiştirilmedi");
    }
    const prev = prevPages && typeof prevPages === "object" ? (prevPages as Raw)[pageKey] ?? null : null;
    layout.hmCorporatePageHtml = { ...(asRaw(prevPages)), [pageKey]: html };
    const raw = JSON.stringify(layout);
    if (raw.length > 1_500_000) throw new Error("Sayfa verisi çok büyük");
    try {
      await sql(`UPDATE hm_news_sites SET layout_json = $2::jsonb, updated_at = now() WHERE id = $1`, [action.site.id, raw]);
    } catch {
      await sql(`UPDATE hm_news_sites SET layout_json = $2, updated_at = now() WHERE id = $1`, [action.site.id, raw]);
    }
    return {
      status: "done",
      summary: `${action.site.domain} ${pageKey === "kunye" ? "künye" : "hakkımızda"} güncellendi`,
      undo: { op: "restore_page", siteId: action.site.id, pageKey, html: prev == null ? null : String(prev).slice(0, 20000) },
    };
  }
  if (action.action === "distribute_article" && action.target) {
    const created: number[] = [];
    const unhidden: Array<Record<string, unknown>> = [];
    let skipped = 0;
    for (const site of action.sites) {
      if (site.effect === "already") {
        skipped += 1;
        continue;
      }
      if (site.effect === "unhide") {
        const removed = await sql(
          `DELETE FROM hm_site_content_hidden
           WHERE site_id = $1 AND public_slug = $2 AND title = $3 AND reason IN ('editor_pasif','chat_editor')
           RETURNING reason, kind, ref_id`,
          [site.id, action.target.publicSlug, action.target.title],
        );
        if (removed[0]) unhidden.push({ siteId: site.id, ...removed[0], publicSlug: action.target.publicSlug, title: action.target.title });
        continue;
      }
      if (site.effect === "copy" && action.target.kind === "news") {
        const id = await insertCopy(sql, action.target.refId, site.id);
        if (id) created.push(id);
      }
    }
    return {
      status: created.length || unhidden.length ? "done" : "skipped",
      summary: `Dağıtım: ${created.length} kopya, ${unhidden.length} gizleme kalktı, ${skipped} sitede zaten vardı`,
      undo: created.length || unhidden.length ? { op: "undo_distribute", ids: created, rehide: unhidden } : null,
    };
  }
  throw new Error("Eylem uygulanamadı");
}

async function insertCopy(sql: Sql, sourceId: number, siteId: number): Promise<number | null> {
  const src = await sql(
    `SELECT title, slug, spot, content, image_url, category_id, tags FROM news WHERE id = $1 LIMIT 1`,
    [sourceId],
  );
  if (!src.length) return null;
  const nextRows = await sql(
    `SELECT GREATEST(COALESCE(max(id), $1), $1) + 1 AS next FROM news WHERE id >= $1 AND id < $2`,
    [COPY_ID_MIN, COPY_ID_MAX],
  );
  const id = Number(nextRows[0]?.next) || COPY_ID_MIN + 1;
  const group = `chatdist:${id.toString(36)}`;
  const slug = `${String(src[0].slug || "haber").slice(0, 60)}-d${siteId}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 90);
  const tags = [group, ...(Array.isArray(src[0].tags) ? src[0].tags : []).map(String).slice(0, 8)];
  await sql(
    `INSERT INTO news (id, title, slug, spot, content, image_url, category_id, status, is_featured, is_breaking, views, tags, is_ai_generated, created_at, updated_at, site_id, is_editor_manual, site_only, owner_site_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'published',false,false,0,$8,false,now(),now(),$9,true,true,$9)`,
    [id, src[0].title, slug, src[0].spot, src[0].content, src[0].image_url || "", src[0].category_id, tags, siteId],
  );
  return id;
}

async function executeUndo(sql: Sql, undo: Raw): Promise<void> {
  if (undo.op === "unhide") {
    await sql(
      `DELETE FROM hm_site_content_hidden WHERE site_id = $1 AND public_slug = $2 AND title = $3 AND reason = 'editor_pasif'`,
      [undo.siteId, undo.publicSlug, undo.title],
    );
    return;
  }
  if (undo.op === "rehide") {
    await sql(
      `INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason, hidden_at)
       VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (site_id, public_slug, title) DO UPDATE SET reason = EXCLUDED.reason, hidden_at = now()`,
      [undo.siteId, undo.publicSlug, undo.title, undo.kind || "news", undo.refId || null, undo.reason || "editor_pasif"],
    );
    return;
  }
  if (undo.op === "restore_article") {
    await sql(`UPDATE news SET title = $2, spot = $3, content = $4, updated_at = now() WHERE id = $1`, [
      undo.id,
      undo.title,
      undo.spot,
      undo.content,
    ]);
    return;
  }
  if (undo.op === "restore_page") {
    const rows = await sql(`SELECT layout_json FROM hm_news_sites WHERE id = $1 LIMIT 1`, [undo.siteId]);
    const layout = parseLayout(rows[0]?.layout_json);
    const pages = asRaw(layout.hmCorporatePageHtml);
    if (undo.html == null) delete pages[String(undo.pageKey)];
    else pages[String(undo.pageKey)] = undo.html;
    layout.hmCorporatePageHtml = pages;
    const raw = JSON.stringify(layout);
    try {
      await sql(`UPDATE hm_news_sites SET layout_json = $2::jsonb, updated_at = now() WHERE id = $1`, [undo.siteId, raw]);
    } catch {
      await sql(`UPDATE hm_news_sites SET layout_json = $2, updated_at = now() WHERE id = $1`, [undo.siteId, raw]);
    }
    return;
  }
  if (undo.op === "undo_distribute") {
    const ids = Array.isArray(undo.ids) ? undo.ids.map(Number).filter((n) => n >= COPY_ID_MIN && n < COPY_ID_MAX) : [];
    if (ids.length) {
      await sql(
        `UPDATE news SET status = 'draft', updated_at = now()
         WHERE id = ANY($1::int[]) AND id >= $2 AND id < $3 AND tags[1] LIKE 'chatdist:%'`,
        [ids, COPY_ID_MIN, COPY_ID_MAX],
      );
    }
    for (const row of Array.isArray(undo.rehide) ? undo.rehide : []) {
      const item = asRaw(row);
      await executeUndo(sql, { op: "rehide", ...item });
    }
    return;
  }
  throw new Error("Geri alma tanınmadı");
}

function publicAction(action: ResolvedAction) {
  return {
    action: action.action,
    label: action.label,
    state: action.state,
    confirm: true,
    reversible: action.reversible,
    summary: action.summary,
    site: action.site,
    sites: action.sites,
    target: action.target,
    blockedReason: action.blockedReason || null,
    coercedFrom: action.coercedFrom || null,
    preview: previewParams(action.params),
  };
}

function previewParams(params: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    out[key] = typeof value === "string" ? value.slice(0, 2000) : value;
  }
  return out;
}

function pageKeyOf(value: unknown): "kunye" | "hakkimizda" | null {
  const key = String(value || "").trim().toLocaleLowerCase("tr-TR");
  if (key === "kunye" || key === "künye") return "kunye";
  if (key === "hakkimizda" || key === "hakkımızda" || key === "about") return "hakkimizda";
  return null;
}

export function sanitizeHtml(input: string): string {
  let html = String(input || "");
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript:/gi, "");
  if (!html.trim()) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .split(/\n{2,}/)
      .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }
  return html;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

function clip(value: unknown, max: number): string {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : "";
}

function parseLayout(value: unknown): Raw {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...(value as Raw) };
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { ...(parsed as Raw) };
    } catch {
      return {};
    }
  }
  return {};
}

function parseDetail(value: unknown): Raw {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Raw;
  if (typeof value === "string" && value.trim()) {
    try {
      return asRaw(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return {};
}

async function safe(sql: Sql, text: string, params: unknown[]): Promise<Record<string, unknown>[]> {
  try {
    return await sql(text, params);
  } catch {
    return [];
  }
}
