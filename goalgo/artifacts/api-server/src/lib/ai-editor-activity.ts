/**
 * AI editör olay günlüğü ve durum raporu.
 * Okuma: hm_ai_editor_articles, hm_ai_editor_runs, hm_bekci_requests, kota tabloları,
 * rssrw_state_YYYYMMDD (varsa) ve ai_editor_activity.
 * Sırlar yanıta ve detail jsonb içine yazılmaz.
 */

export type Sql = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export const PROVIDER_CHAIN = [
  { id: "evren", label: "Evren" },
  { id: "evren2", label: "Evren yedek" },
  { id: "nvidia", label: "NVIDIA" },
  { id: "gemini", label: "Gemini" },
  { id: "openai", label: "OpenAI" },
] as const;

const SECRET_KEY = /api[_-]?key|secret|token|password|authorization|cookie|database_url|php_db/i;
const SECRET_VAL = /\b(sk-|sk-proj-|nvapi-|AIza)[A-Za-z0-9_\-]{6,}/g;
const SECRET_ASSIGN = /(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*\S+/gi;
const BEARER = /(bearer\s+)[A-Za-z0-9._\-]{8,}/gi;

export const ACTIVITY_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ai_editor_activity (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL DEFAULT 'system',
  site_id integer,
  site_domain text,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'done',
  summary text NOT NULL DEFAULT '',
  target_ref text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  undo jsonb,
  undone_at timestamptz,
  provider text,
  source text NOT NULL DEFAULT 'hook'
)`,
  `CREATE INDEX IF NOT EXISTS ai_editor_activity_created_idx ON ai_editor_activity (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS ai_editor_activity_site_idx ON ai_editor_activity (site_id, created_at DESC)`,
  `CREATE OR REPLACE FUNCTION ai_editor_activity_write(
  p_action text,
  p_summary text,
  p_site_id integer DEFAULT NULL,
  p_site_domain text DEFAULT NULL,
  p_status text DEFAULT 'done',
  p_target_ref text DEFAULT NULL,
  p_detail jsonb DEFAULT '{}'::jsonb,
  p_actor text DEFAULT 'ai-editor',
  p_source text DEFAULT 'editor'
) RETURNS bigint
LANGUAGE plpgsql
AS $fn$
DECLARE
  new_id bigint;
BEGIN
  INSERT INTO ai_editor_activity (actor, site_id, site_domain, action, status, summary, target_ref, detail, source)
  VALUES (
    left(coalesce(p_actor, 'ai-editor'), 80),
    p_site_id,
    left(coalesce(p_site_domain, ''), 200),
    left(coalesce(p_action, 'skip'), 80),
    left(coalesce(p_status, 'done'), 40),
    left(coalesce(p_summary, ''), 500),
    left(coalesce(p_target_ref, ''), 300),
    coalesce(p_detail, '{}'::jsonb),
    left(coalesce(p_source, 'editor'), 40)
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$fn$`,
];

let schemaReady = false;

export function resetAiEditorActivityCacheForTests(): void {
  schemaReady = false;
}

export function scrubSecrets<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(SECRET_VAL, "••••").replace(SECRET_ASSIGN, "$1=••••").replace(BEARER, "$1••••").slice(0, 4000);
  }
  if (Array.isArray(value)) return value.slice(0, 80).map(walk);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(key)) continue;
      out[key] = walk(child);
    }
    return out;
  }
  return value;
}

export async function ensureAiEditorActivity(sql: Sql): Promise<{ ok: boolean; error?: string }> {
  if (schemaReady) return { ok: true };
  try {
    for (const statement of ACTIVITY_DDL) {
      try {
        await sql(statement);
      } catch (err) {
        if (/FUNCTION/i.test(statement)) continue;
        throw err;
      }
    }
    schemaReady = true;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: String(scrubSecrets(message)).slice(0, 200) };
  }
}

export type ActivityInput = {
  actor?: string;
  siteId?: number | null;
  siteDomain?: string | null;
  action: string;
  status?: string;
  summary: string;
  targetRef?: string | null;
  detail?: unknown;
  undo?: unknown;
  provider?: string | null;
  source?: string;
};

export async function recordEditorActivity(sql: Sql, event: ActivityInput): Promise<number | null> {
  const detail = JSON.stringify(scrubSecrets(event.detail ?? {}));
  const undo = event.undo == null ? null : JSON.stringify(scrubSecrets(event.undo));
  try {
    const rows = await sql(
      `INSERT INTO ai_editor_activity (actor, site_id, site_domain, action, status, summary, target_ref, detail, undo, provider, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11) RETURNING id`,
      [
        String(event.actor || "system").slice(0, 80),
        event.siteId ?? null,
        event.siteDomain ? String(event.siteDomain).slice(0, 200) : null,
        String(event.action).slice(0, 80),
        String(event.status || "done").slice(0, 40),
        String(event.summary || "").slice(0, 500),
        event.targetRef ? String(event.targetRef).slice(0, 300) : null,
        detail,
        undo,
        event.provider ? String(event.provider).slice(0, 40) : null,
        String(event.source || "hook").slice(0, 40),
      ],
    );
    const id = Number(rows[0]?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function classifyArticleRow(row: Record<string, unknown>): { action: string; label: string } {
  const status = String(row.status || "").toLowerCase();
  const model = String(row.ai_model || row.aiModel || "").toLowerCase();
  const category = String(row.category_slug || row.categorySlug || "");
  if (status === "error" || status === "failed") return { action: "error", label: "hata" };
  if (status === "skipped" || status === "skip") return { action: "skip", label: "atlandı" };
  if (status === "hidden" || status === "draft") return { action: "hide", label: "haber gizledi" };
  if (/kose|köşe|column|yazar/i.test(category)) return { action: "column", label: "köşe yazısı üretti" };
  if (model && model !== "curate") return { action: "rewrite", label: "haber yeniden yazdı" };
  if (model === "curate" || row.is_ai_manset === true || row.is_ai_manset === "t") {
    return { action: "curate", label: "manşete aldı (kaynak metin)" };
  }
  return { action: "skip", label: "atlandı" };
}

export function dedupeCountFromStats(stats: unknown): number {
  if (!stats || typeof stats !== "object") return 0;
  const root = stats as Record<string, unknown>;
  const fetchPart = root.fetch && typeof root.fetch === "object" ? (root.fetch as Record<string, unknown>) : {};
  const parts = num(fetchPart.dup_link) + num(fetchPart.dup_title);
  if (parts > 0) return parts;
  if (num(fetchPart.dup) > 0) return num(fetchPart.dup);
  return num(root.deduped) + num(root.duplicates);
}

export function quotaUsedPercent(remaining: unknown): number | null {
  if (!remaining || typeof remaining !== "object") return null;
  const row = remaining as Record<string, unknown>;
  const limit = Number(row.daily_tokens_limit);
  const left = Number(row.daily_tokens_left);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const used = Number.isFinite(left) ? Math.max(0, limit - Math.max(0, left)) : limit;
  return Math.round((used / limit) * 1000) / 10;
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function optionalQuery(sql: Sql, text: string, params: unknown[] = []) {
  try {
    return { ok: true as const, rows: await sql(text, params) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, rows: [] as Record<string, unknown>[], error: String(scrubSecrets(message)).slice(0, 200) };
  }
}

const ACTION_LABEL: Record<string, string> = {
  rewrite: "haber yeniden yazdı",
  column: "köşe yazısı üretti",
  hide: "haber gizledi",
  hide_article: "haber gizledi",
  show: "haber gösterdi",
  show_article: "haber gösterdi",
  error: "hata",
  skip: "atlandı",
  skipped: "atlandı",
  distribute_article: "haberi başka sitelere ekledi",
  edit_article: "haber metnini düzenledi",
  edit_page: "sayfa metnini düzenledi",
  curate: "manşete aldı (kaynak metin)",
};

function labelOf(action: string): string {
  return ACTION_LABEL[action] || action;
}

export async function loadEditorStatus(sql: Sql): Promise<Record<string, unknown>> {
  const warnings: string[] = [];
  const schema = await ensureAiEditorActivity(sql);
  if (!schema.ok && schema.error) warnings.push(`Olay tablosu: ${schema.error}`);

  const articles = await optionalQuery(
    sql,
    `SELECT id, site_id, title, status, created_at, ai_model, is_ai_manset, category_slug
     FROM hm_ai_editor_articles ORDER BY created_at DESC NULLS LAST LIMIT 40`,
  );
  let articleRows = articles.rows;
  if (!articles.ok) {
    warnings.push(`hm_ai_editor_articles: ${articles.error}`);
    const slim = await optionalQuery(
      sql,
      `SELECT id, site_id, title, status, published_at FROM hm_ai_editor_articles ORDER BY published_at DESC NULLS LAST LIMIT 40`,
    );
    if (slim.ok) articleRows = slim.rows;
  }

  const activity = await optionalQuery(
    sql,
    `SELECT id, created_at, site_id, site_domain, action, status, summary, target_ref, source,
            (undo IS NOT NULL AND undone_at IS NULL) AS reversible, undone_at
     FROM ai_editor_activity
     WHERE action <> 'chat_plan'
     ORDER BY id DESC LIMIT 40`,
  );
  if (!activity.ok) warnings.push(`ai_editor_activity: ${activity.error}`);

  const runningReq = await optionalQuery(
    sql,
    `SELECT id, at, status, reason, site_slug FROM hm_bekci_requests
     WHERE kind = 'ai_editor_run' AND status IN ('pending','running')
     ORDER BY id DESC LIMIT 20`,
  );
  if (!runningReq.ok) warnings.push(`çalışan işler: ${runningReq.error}`);

  const runningRuns = await optionalQuery(
    sql,
    `SELECT id, started_at, status FROM hm_ai_editor_runs
     WHERE finished_at IS NULL AND started_at > now() - interval '8 hours'
     ORDER BY id DESC LIMIT 10`,
  );
  if (!runningRuns.ok) warnings.push(`açık tur: ${runningRuns.error}`);

  const todayArticles = await optionalQuery(
    sql,
    `SELECT
       count(*) FILTER (WHERE coalesce(ai_model,'') NOT IN ('','curate') AND status = 'published')::int AS rewritten,
       count(*) FILTER (WHERE status = 'published')::int AS published,
       count(*) FILTER (WHERE status IN ('error','failed'))::int AS errors,
       count(*) FILTER (WHERE status IN ('skipped','skip'))::int AS skipped,
       count(*) FILTER (WHERE category_slug ILIKE '%kose%' OR category_slug ILIKE '%yazar%')::int AS columns
     FROM hm_ai_editor_articles
     WHERE coalesce(manset_date, (created_at AT TIME ZONE 'Europe/Istanbul')::date)
           = (now() AT TIME ZONE 'Europe/Istanbul')::date`,
  );
  if (!todayArticles.ok) warnings.push(`günlük sayım: ${todayArticles.error}`);

  const todayRuns = await optionalQuery(
    sql,
    `SELECT stats, status, error FROM hm_ai_editor_runs
     WHERE started_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul')`,
  );
  if (!todayRuns.ok) warnings.push(`tur özeti: ${todayRuns.error}`);

  const sites = await optionalQuery(
    sql,
    `SELECT s.site_id, s.domain, s.site_slug,
        count(a.id) FILTER (WHERE a.status = 'published')::int AS published,
        count(a.id) FILTER (WHERE coalesce(a.ai_model,'') NOT IN ('','curate') AND a.status = 'published')::int AS rewritten,
        count(a.id) FILTER (WHERE a.status IN ('error','failed'))::int AS errors,
        count(a.id) FILTER (WHERE a.status IN ('skipped','skip'))::int AS skipped
     FROM hm_ai_editor_sites s
     LEFT JOIN hm_ai_editor_articles a
       ON a.site_id = s.site_id
      AND coalesce(a.manset_date, (a.created_at AT TIME ZONE 'Europe/Istanbul')::date)
          = (now() AT TIME ZONE 'Europe/Istanbul')::date
     GROUP BY s.site_id, s.domain, s.site_slug
     ORDER BY s.site_id`,
  );
  if (!sites.ok) warnings.push(`site kırılımı: ${sites.error}`);

  const quota = await optionalQuery(
    sql,
    `SELECT scope, provider, model, status, remaining, error, checked_at
     FROM hm_ai_provider_quota
     WHERE coalesce(scope,'') NOT LIKE 'site:%'`,
  );
  if (!quota.ok) warnings.push(`kota: ${quota.error}`);

  const usage = await optionalQuery(
    sql,
    `SELECT provider, sum(calls)::int AS calls, sum(failed)::int AS failed,
            sum(coalesce(prompt_tokens,0) + coalesce(completion_tokens,0))::bigint AS tokens
     FROM hm_ai_provider_usage
     WHERE day = (now() AT TIME ZONE 'Europe/Istanbul')::date
     GROUP BY 1`,
  );
  if (!usage.ok) warnings.push(`kullanım: ${usage.error}`);

  const hiddenToday = await optionalQuery(
    sql,
    `SELECT
       count(*) FILTER (WHERE action IN ('hide','hide_article') AND status = 'done')::int AS hidden,
       count(*) FILTER (WHERE action IN ('error') OR status = 'error')::int AS errors,
       count(*) FILTER (WHERE action IN ('skip','skipped') OR status = 'skipped')::int AS skipped,
       count(*) FILTER (WHERE action = 'column' AND status = 'done')::int AS columns
     FROM ai_editor_activity
     WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul')`,
  );

  const rssNames = await optionalQuery(
    sql,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name ~ '^rssrw_state_[0-9]{8}$'
     ORDER BY table_name DESC LIMIT 3`,
  );
  const rss: Array<Record<string, unknown>> = [];
  if (rssNames.ok) {
    for (const row of rssNames.rows) {
      const name = String(row.table_name || "");
      if (!/^rssrw_state_[0-9]{8}$/.test(name)) continue;
      const count = await optionalQuery(sql, `SELECT count(*)::int AS n FROM ${name}`);
      const cols = await optionalQuery(
        sql,
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [name],
      );
      const hasStatus = cols.rows.some((c) => String(c.column_name) === "status");
      let byStatus: Record<string, unknown>[] = [];
      if (hasStatus) {
        const grouped = await optionalQuery(sql, `SELECT status, count(*)::int AS n FROM ${name} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
        if (grouped.ok) byStatus = grouped.rows.map((g) => ({ status: String(g.status ?? ""), n: Number(g.n) || 0 }));
      }
      rss.push({
        table: name,
        rows: count.ok ? Number(count.rows[0]?.n) || 0 : null,
        byStatus,
        error: count.ok ? null : count.error,
      });
    }
  }

  const usageByProvider = new Map(usage.rows.map((r) => [String(r.provider), r]));
  const seen = new Set<string>();
  const providers = quota.rows
    .map((row) => {
      const provider = String(row.provider || "");
      seen.add(provider);
      const use = usageByProvider.get(provider);
      const chain = PROVIDER_CHAIN.find((p) => p.id === provider);
      return {
        provider,
        label: chain?.label || provider,
        scope: String(row.scope || ""),
        model: row.model ? String(row.model) : "",
        status: String(row.status || ""),
        tokens: Number(use?.tokens) || 0,
        calls: Number(use?.calls) || 0,
        failed: Number(use?.failed) || 0,
        quotaPercent: quotaUsedPercent(row.remaining),
        dailyTokensLeft: remainingNum(row.remaining, "daily_tokens_left"),
        dailyTokensLimit: remainingNum(row.remaining, "daily_tokens_limit"),
        error: row.error ? String(scrubSecrets(String(row.error))).slice(0, 180) : "",
        checkedAt: row.checked_at || null,
      };
    })
    .sort((a, b) => chainIndex(a.provider) - chainIndex(b.provider) || String(a.scope).localeCompare(String(b.scope)));

  for (const item of PROVIDER_CHAIN) {
    if (seen.has(item.id)) continue;
    const use = usageByProvider.get(item.id);
    providers.push({
      provider: item.id,
      label: item.label,
      scope: "global",
      model: "",
      status: use ? "kullanıldı" : "kayıt yok",
      tokens: Number(use?.tokens) || 0,
      calls: Number(use?.calls) || 0,
      failed: Number(use?.failed) || 0,
      quotaPercent: null,
      dailyTokensLeft: null,
      dailyTokensLimit: null,
      error: "",
      checkedAt: null,
    });
  }
  providers.sort((a, b) => chainIndex(a.provider) - chainIndex(b.provider) || String(a.scope).localeCompare(String(b.scope)));

  const today = todayArticles.rows[0] || {};
  const act = hiddenToday.rows[0] || {};
  let deduped = 0;
  let runErrors = 0;
  for (const run of todayRuns.rows) {
    deduped += dedupeCountFromStats(run.stats);
    if (String(run.status || "") && String(run.status) !== "ok") runErrors += 1;
  }

  const recent = [
    ...activity.rows.map((row) => ({
      id: Number(row.id) || null,
      at: row.created_at,
      site: row.site_domain || (row.site_id != null ? `#${row.site_id}` : ""),
      action: String(row.action || ""),
      label: labelOf(String(row.action || "")),
      summary: String(row.summary || ""),
      status: String(row.status || ""),
      source: String(row.source || "activity"),
      reversible: row.reversible === true || row.reversible === "t",
      undone: Boolean(row.undone_at),
    })),
    ...articleRows.map((row) => {
      const kind = classifyArticleRow(row);
      return {
        id: null,
        at: row.created_at || row.published_at || null,
        site: row.site_id != null ? `#${row.site_id}` : "",
        action: kind.action,
        label: kind.label,
        summary: String(row.title || "").slice(0, 180),
        status: String(row.status || ""),
        source: "hm_ai_editor_articles",
        reversible: false,
        undone: false,
      };
    }),
  ].slice(0, 60);

  const running = [
    ...runningReq.rows.map((row) => ({
      id: Number(row.id) || null,
      kind: "kuyruk",
      status: String(row.status || ""),
      at: row.at,
      detail: String(row.reason || row.site_slug || "").slice(0, 180),
    })),
    ...runningRuns.rows.map((row) => ({
      id: Number(row.id) || null,
      kind: "tur",
      status: String(row.status || "çalışıyor"),
      at: row.started_at,
      detail: "hm_ai_editor_runs bitmedi",
    })),
  ];

  return scrubSecrets({
    ok: true,
    generatedAt: new Date().toISOString(),
    warnings,
    running,
    providers,
    recent,
    rss,
    daily: {
      rewritten: Number(today.rewritten) || 0,
      published: Number(today.published) || 0,
      deduped,
      hidden: Number(act.hidden) || 0,
      errors: (Number(today.errors) || 0) + (Number(act.errors) || 0) + runErrors,
      skipped: (Number(today.skipped) || 0) + (Number(act.skipped) || 0),
      columns: (Number(today.columns) || 0) + (Number(act.columns) || 0),
    },
    sites: sites.rows.map((row) => ({
      siteId: Number(row.site_id) || 0,
      domain: String(row.domain || ""),
      slug: String(row.site_slug || ""),
      published: Number(row.published) || 0,
      rewritten: Number(row.rewritten) || 0,
      errors: Number(row.errors) || 0,
      skipped: Number(row.skipped) || 0,
    })),
    catalog: [
      { action: "hide_article", label: "Haberi siteden gizle", state: "ready" },
      { action: "show_article", label: "Haberi sitede göster", state: "ready" },
      { action: "distribute_article", label: "Haberi başka sitelere ekle", state: "ready" },
      { action: "edit_article", label: "Başlık / özet / gövde düzenle", state: "ready" },
      { action: "edit_page", label: "Künye veya hakkımızda metnini düzenle", state: "ready" },
      { action: "add_column_article", label: "Köşe yazarına makale ekle", state: "soon" },
      { action: "fill_ai_authors", label: "Eksik AI yazarlara makale ekle", state: "soon" },
      { action: "add_ad", label: "Reklam görseli / kodu ekle", state: "soon" },
    ],
  });
}

function chainIndex(provider: string): number {
  const i = PROVIDER_CHAIN.findIndex((p) => p.id === provider);
  return i === -1 ? 50 : i;
}

function remainingNum(remaining: unknown, key: string): number | null {
  if (!remaining || typeof remaining !== "object") return null;
  const n = Number((remaining as Record<string, unknown>)[key]);
  return Number.isFinite(n) ? n : null;
}
