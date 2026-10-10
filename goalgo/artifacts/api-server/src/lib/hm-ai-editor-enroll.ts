/**
 * Yeni haber sitesi → hm_ai_editor_sites.
 * İçerik modu curate: AI manşet seçer ve kategori atar, haberi yeniden yazmaz.
 * Mevcut satırlara INSERT yapılmaz; PATCH yalnız var olan kaydı günceller.
 */
import { normalizeHmConceptTopic, type HmConceptTopic } from "./hm-site-kind.js";

export type AiEditorSql = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export type PgQueryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows?: Record<string, unknown>[] }>;
};

const PROMPT_MAX = 4000;

/** Konsept konusundan AI editör anahtar kelimeleri. Genel sitede boş. */
const TOPIC_KEYWORDS: Record<HmConceptTopic, readonly string[]> = {
  spor: ["spor", "futbol", "basketbol", "voleybol", "süper lig", "milli takım"],
  savunma: ["savunma", "savunma sanayii", "msb", "tsk", "aselsan", "baykar", "siha"],
  "sehit-gazi": ["şehit", "gazi", "şehit ailesi", "msb", "tsk", "jandarma", "emniyet"],
  cevre: ["çevre", "doğa", "ekoloji", "orman", "iklim", "tarım"],
  saglik: ["sağlık", "hastane", "hekim", "aşı", "salgın"],
  ekonomi: ["ekonomi", "enflasyon", "faiz", "borsa", "döviz", "merkez bankası", "piyasa"],
  teknoloji: ["teknoloji", "yazılım", "donanım", "yapay zeka", "siber"],
  yerel: ["belediye", "vali", "kaymakam", "muhtar", "ilçe", "mahalle"],
  bolge: ["bölge", "ege", "marmara", "karadeniz", "akdeniz", "anadolu"],
  diger: [],
};

export type KeywordSqlKind = "text[]" | "jsonb" | "json" | "text";

export function aiEditorSql(pools: { news?: PgQueryable | null; main?: PgQueryable | null }): AiEditorSql | null {
  const p = pools.news ?? pools.main;
  if (!p) return null;
  return async (text, params = []) => {
    const result = await p.query(text, params);
    return result.rows ?? [];
  };
}

/** İstekte yoksa açık. Yalnız açık false kapatır. */
export function parseAiEditorEnabled(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === "") return true;
  if (raw === false || raw === 0 || raw === "0" || raw === "false") return false;
  return true;
}

export function normalizeConceptPrompt(raw: unknown): string | null {
  const s = String(raw ?? "")
    .replace(/\0/g, "")
    .trim();
  if (!s) return null;
  return s.slice(0, PROMPT_MAX);
}

export function aiEditorConceptType(conceptSite: boolean): "topical" | "general" {
  return conceptSite ? "topical" : "general";
}

export function keywordsForConceptTopic(conceptSite: boolean, topicRaw: unknown): string[] {
  if (!conceptSite) return [];
  const topic = normalizeHmConceptTopic(topicRaw);
  if (!topic) return [];
  return [...TOPIC_KEYWORDS[topic]];
}

export function keywordSqlExpr(index: number, kind: KeywordSqlKind): string {
  if (kind === "text[]") return `$${index}::text[]`;
  if (kind === "jsonb") return `$${index}::jsonb`;
  if (kind === "json") return `$${index}::json`;
  return `$${index}`;
}

export function keywordSqlValue(kind: KeywordSqlKind, keywords: readonly string[]): unknown {
  if (kind === "jsonb" || kind === "json") return JSON.stringify(keywords);
  if (kind === "text") return keywords.join(", ");
  return [...keywords];
}

function pgMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/\s+/g, " ").slice(0, 240);
}

function pgCode(err: unknown): string {
  return err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
}

async function tableExists(sql: AiEditorSql): Promise<boolean> {
  const rows = await sql(`SELECT to_regclass('public.hm_ai_editor_sites') AS rel`);
  return Boolean(rows[0]?.rel);
}

/** Kolon ekler. Satır güncellemez. Tablo yoksa false. */
export async function ensureAiEditorSiteColumns(sql: AiEditorSql): Promise<boolean> {
  if (!(await tableExists(sql))) return false;
  await sql(`ALTER TABLE hm_ai_editor_sites ADD COLUMN IF NOT EXISTS concept_prompt text`);
  await sql(`ALTER TABLE hm_ai_editor_sites ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'curate'`);
  await sql(`ALTER TABLE hm_ai_editor_sites ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false`);
  const chk = await sql(
    `SELECT 1 AS ok FROM pg_constraint WHERE conname = 'hm_ai_editor_sites_content_mode_chk' LIMIT 1`,
  );
  if (!chk.length) {
    await sql(
      `ALTER TABLE hm_ai_editor_sites ADD CONSTRAINT hm_ai_editor_sites_content_mode_chk CHECK (content_mode IN ('curate', 'generate'))`,
    );
  }
  return true;
}

export async function keywordColumnKind(sql: AiEditorSql): Promise<KeywordSqlKind> {
  const rows = await sql(
    `SELECT data_type, udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'hm_ai_editor_sites' AND column_name = 'keywords'
     LIMIT 1`,
  );
  const dataType = String(rows[0]?.data_type ?? "").toLowerCase();
  const udt = String(rows[0]?.udt_name ?? "").toLowerCase();
  if (dataType === "array" || udt.startsWith("_")) return "text[]";
  if (dataType === "jsonb" || udt === "jsonb") return "jsonb";
  if (dataType === "json" || udt === "json") return "json";
  return "text";
}

async function resolveEditorSiteId(sql: AiEditorSql, siteId: number, siteSlug: string): Promise<number> {
  try {
    const rows = await sql(`SELECT id FROM hm_news_sites WHERE slug = $1 ORDER BY id ASC LIMIT 1`, [siteSlug]);
    const id = Number(rows[0]?.id);
    if (Number.isFinite(id) && id > 0) return id;
  } catch {
    /* haber site tablosu okunamadı — panel id */
  }
  return siteId;
}

export type NewAiEditorSiteInput = {
  siteId: number;
  siteSlug: string;
  domain: string | null;
  conceptSite: boolean;
  conceptTopic?: unknown;
  conceptPrompt?: unknown;
  /** Yoksa true. */
  enabled?: unknown;
};

export type AiEditorWriteResult = {
  ok: boolean;
  warning?: string;
  siteId?: number;
};

/**
 * Yeni haber sitesi için tek satır. Hata site oluşturmayı bozmasın diye warning döner.
 * content_mode her zaman curate; auto_created true. Başka sitelerin satırına yazılmaz.
 */
export async function enrollNewNewsSiteAiEditor(
  sql: AiEditorSql | null,
  input: NewAiEditorSiteInput,
): Promise<AiEditorWriteResult> {
  if (!sql) {
    return { ok: false, warning: "AI editör kaydı yazılamadı: haber veritabanı yapılandırılmamış" };
  }
  const siteSlug = String(input.siteSlug ?? "").trim();
  if (!siteSlug || !Number.isFinite(input.siteId) || input.siteId <= 0) {
    return { ok: false, warning: "AI editör kaydı yazılamadı: site kimliği eksik" };
  }
  try {
    const ready = await ensureAiEditorSiteColumns(sql);
    if (!ready) {
      return { ok: false, warning: "AI editör kaydı yazılamadı: hm_ai_editor_sites tablosu yok" };
    }
    const siteId = await resolveEditorSiteId(sql, input.siteId, siteSlug);
    const conceptType = aiEditorConceptType(input.conceptSite);
    const keywords = keywordsForConceptTopic(input.conceptSite, input.conceptTopic);
    const kind = await keywordColumnKind(sql);
    const prompt = normalizeConceptPrompt(input.conceptPrompt);
    const enabled = parseAiEditorEnabled(input.enabled);
    const kwExpr = keywordSqlExpr(5, kind);
    const params: unknown[] = [
      siteId,
      siteSlug,
      input.domain ?? null,
      conceptType,
      keywordSqlValue(kind, keywords),
      enabled,
      prompt,
    ];
    const updatedCol = await sql(
      `SELECT 1 AS ok FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'hm_ai_editor_sites' AND column_name = 'updated_at'
       LIMIT 1`,
    );
    const cols = "site_id, site_slug, domain, concept_type, keywords, enabled, content_mode, auto_created, concept_prompt";
    const values = `$1,$2,$3,$4,${kwExpr},$6,'curate',true,$7`;
    const insert = updatedCol.length
      ? `INSERT INTO hm_ai_editor_sites (${cols}, updated_at) VALUES (${values},now())`
      : `INSERT INTO hm_ai_editor_sites (${cols}) VALUES (${values})`;
    try {
      await sql(`${insert} ON CONFLICT (site_id) DO NOTHING`, params);
    } catch (err) {
      const code = pgCode(err);
      const msg = pgMessage(err);
      if (code === "42P10" || /no unique or exclusion constraint/i.test(msg)) {
        await sql(insert, params);
      } else if (code === "23505" || /duplicate key|unique/i.test(msg)) {
        return { ok: true, siteId };
      } else {
        throw err;
      }
    }
    return { ok: true, siteId };
  } catch (err) {
    return { ok: false, warning: `AI editör kaydı yazılamadı: ${pgMessage(err)}` };
  }
}

export type AiEditorEnrollment = {
  siteId: number;
  siteSlug: string;
  enabled: boolean;
  conceptPrompt: string | null;
  contentMode: string;
  autoCreated: boolean;
};

export async function loadAiEditorEnrollments(
  sql: AiEditorSql | null,
): Promise<{ ok: true; rows: AiEditorEnrollment[] } | { ok: false; warning: string }> {
  if (!sql) return { ok: false, warning: "haber veritabanı yapılandırılmamış" };
  try {
    const rows = await sql(
      `SELECT site_id, site_slug, enabled, concept_prompt, content_mode, auto_created
       FROM hm_ai_editor_sites`,
    );
    return {
      ok: true,
      rows: rows.map((r) => ({
        siteId: Number(r.site_id),
        siteSlug: String(r.site_slug ?? ""),
        enabled: r.enabled === true || r.enabled === "t" || r.enabled === "true",
        conceptPrompt: r.concept_prompt == null || r.concept_prompt === "" ? null : String(r.concept_prompt),
        contentMode: String(r.content_mode ?? "curate"),
        autoCreated: r.auto_created === true || r.auto_created === "t" || r.auto_created === "true",
      })),
    };
  } catch (err) {
    return { ok: false, warning: pgMessage(err) };
  }
}

export type PatchAiEditorSiteInput = {
  siteId: number;
  siteSlug: string;
  domain: string | null;
  /** Alan gövdede yoksa undefined — kolon değişmez. */
  enabled?: boolean;
  conceptPrompt?: string | null;
  updateConcept?: boolean;
  conceptSite?: boolean;
  conceptTopic?: unknown;
};

/**
 * Var olan AI editör satırını günceller. Satır yoksa INSERT yapmaz (mevcut siteye kayıt açılmaz).
 * content_mode ve auto_created değişmez.
 */
export async function patchAiEditorSite(
  sql: AiEditorSql | null,
  input: PatchAiEditorSiteInput,
): Promise<AiEditorWriteResult & { updated?: boolean }> {
  if (!sql) {
    return { ok: false, warning: "AI editör kaydı güncellenemedi: haber veritabanı yapılandırılmamış" };
  }
  const siteSlug = String(input.siteSlug ?? "").trim();
  try {
    const ready = await ensureAiEditorSiteColumns(sql);
    if (!ready) {
      return { ok: false, warning: "AI editör kaydı güncellenemedi: hm_ai_editor_sites tablosu yok" };
    }
    const siteId = await resolveEditorSiteId(sql, input.siteId, siteSlug);
    const byId = await sql(`SELECT site_id FROM hm_ai_editor_sites WHERE site_id = $1 LIMIT 1`, [siteId]);
    let targetId = byId.length ? siteId : 0;
    if (!targetId && siteSlug) {
      const bySlug = await sql(`SELECT site_id FROM hm_ai_editor_sites WHERE site_slug = $1 LIMIT 2`, [siteSlug]);
      if (bySlug.length === 1) targetId = Number(bySlug[0]?.site_id);
    }
    if (!targetId) {
      const asked =
        input.enabled === true || (typeof input.conceptPrompt === "string" && input.conceptPrompt.length > 0);
      return asked
        ? {
            ok: true,
            updated: false,
            warning:
              "Bu sitenin AI editör kaydı yok. Mevcut siteler otomatik eklenmez; kayıt yeni haber sitesi açılırken yazılır.",
          }
        : { ok: true, updated: false };
    }
    const sets = ["site_slug = $2", "domain = $3", "updated_at = now()"];
    const params: unknown[] = [targetId, siteSlug, input.domain ?? null];
    if (input.enabled !== undefined) {
      params.push(input.enabled);
      sets.push(`enabled = $${params.length}`);
    }
    if (input.conceptPrompt !== undefined) {
      params.push(input.conceptPrompt);
      sets.push(`concept_prompt = $${params.length}`);
    }
    if (input.updateConcept) {
      const conceptType = aiEditorConceptType(input.conceptSite === true);
      params.push(conceptType);
      sets.push(`concept_type = $${params.length}`);
      const keywords = keywordsForConceptTopic(input.conceptSite === true, input.conceptTopic);
      const kind = await keywordColumnKind(sql);
      params.push(keywordSqlValue(kind, keywords));
      sets.push(`keywords = ${keywordSqlExpr(params.length, kind)}`);
    }
    await sql(`UPDATE hm_ai_editor_sites SET ${sets.join(", ")} WHERE site_id = $1`, params);
    return { ok: true, updated: true, siteId: targetId };
  } catch (err) {
    return { ok: false, warning: `AI editör kaydı güncellenemedi: ${pgMessage(err)}` };
  }
}
