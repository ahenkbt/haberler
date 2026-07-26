import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { executeNewsDbWrite, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";

export type HmNewsSiteCompatRow = typeof hmNewsSitesTable.$inferSelect;

type LegacyHmNewsSiteRow = Omit<
  HmNewsSiteCompatRow,
  "description" | "verificationJson" | "domain2" | "domain3"
>;

const hmNewsSiteLegacyColumnsNoDomain2 = {
  id: hmNewsSitesTable.id,
  slug: hmNewsSitesTable.slug,
  domain: hmNewsSitesTable.domain,
  displayName: hmNewsSitesTable.displayName,
  contactJson: hmNewsSitesTable.contactJson,
  layoutJson: hmNewsSitesTable.layoutJson,
  active: hmNewsSitesTable.active,
  createdAt: hmNewsSitesTable.createdAt,
  updatedAt: hmNewsSitesTable.updatedAt,
};

const hmNewsSiteLegacyColumns = {
  ...hmNewsSiteLegacyColumnsNoDomain2,
  domain2: hmNewsSitesTable.domain2,
  domain3: hmNewsSitesTable.domain3,
};

let hmNewsSiteSeoColumnsPromise: Promise<void> | null = null;
let hmNewsSiteSeoColumnsExistPromise: Promise<boolean> | null = null;

export function ensureHmNewsSiteSeoColumns(): Promise<void> {
  if (hmNewsSiteSeoColumnsPromise) return hmNewsSiteSeoColumnsPromise;
  hmNewsSiteSeoColumnsPromise = executeNewsDbWrite(sql`
      ALTER TABLE hm_news_sites
        ADD COLUMN IF NOT EXISTS description text,
        ADD COLUMN IF NOT EXISTS verification_json text;
    `)
    .then(() => {
      hmNewsSiteSeoColumnsExistPromise = Promise.resolve(true);
      return undefined;
    })
    .catch((e) => {
      hmNewsSiteSeoColumnsPromise = null;
      throw e;
    });
  return hmNewsSiteSeoColumnsPromise;
}

export function dbErrorCode(e: unknown): string {
  return e && typeof e === "object" && "code" in e ? String((e as { code?: unknown }).code ?? "") : "";
}

/** Drizzle "Failed query: ..." sarmalayıcısından Postgres code/message çıkar. */
export function postgresErrorMeta(err: unknown): { code?: string; message?: string } {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur != null; depth++) {
    if (typeof cur === "object") {
      const o = cur as Record<string, unknown>;
      const code = typeof o.code === "string" ? o.code : undefined;
      const message = typeof o.message === "string" ? o.message : undefined;
      // Drizzle üst mesajı genelde "Failed query: ..."; asıl PG mesajı cause'ta.
      if (code && code.length <= 8) return { code, message };
      if (message && !/^Failed query:/i.test(message) && (code || /does not exist|duplicate|unique|violates/i.test(message))) {
        return { code, message };
      }
      cur = o.cause ?? o.originalError ?? o.error;
      continue;
    }
    break;
  }
  const fallback = err instanceof Error ? err.message : String(err);
  return { message: fallback };
}

export function formatHmSitesDbError(err: unknown, maxLen = 400): string {
  const { code, message } = postgresErrorMeta(err);
  const top = err instanceof Error ? err.message : String(err);
  const detail = message && message !== top ? message : top;
  const withCode = code ? `[${code}] ${detail}` : detail;
  if (/cannot insert multiple commands into a prepared statement/i.test(withCode)) {
    return "Veritabanı şema güncellemesi başarısız (çoklu SQL). Sunucuyu yeniden deneyin; sorun sürerse domain2/domain3 migration uygulayın.";
  }
  if (code === "42703" || /does not exist/i.test(withCode)) {
    return `Eksik sütun: ${detail}`.slice(0, maxLen);
  }
  if (code === "23505" || /unique|duplicate/i.test(withCode)) {
    return "Bu slug veya domain zaten kayıtlı.";
  }
  return withCode.slice(0, maxLen);
}

export function isMissingHmSeoColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const { code, message } = postgresErrorMeta(e);
  return code === "42703" || /(?:description|verification_json).*does not exist/i.test(message || msg);
}

export function isMissingHmBaseTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return dbErrorCode(e) === "42P01" || /relation .*hm_(?:news_sites|site_editors).*does not exist|no such table/i.test(msg);
}

function withSeoDefaults(row: LegacyHmNewsSiteRow): HmNewsSiteCompatRow {
  return {
    ...row,
    domain2: "domain2" in row ? (row as HmNewsSiteCompatRow).domain2 : null,
    domain3: "domain3" in row ? (row as HmNewsSiteCompatRow).domain3 : null,
    description: null,
    verificationJson: null,
  };
}

let hmNewsSiteDomain2ColumnPromise: Promise<void> | null = null;
let hmNewsSiteDomain3ColumnPromise: Promise<void> | null = null;

/**
 * node-pg prepared statement tek komut kabul eder; ALTER + CREATE INDEX
 * aynı execute içinde "cannot insert multiple commands" ile düşer.
 */
export function ensureHmNewsSiteDomain2Column(): Promise<void> {
  if (hmNewsSiteDomain2ColumnPromise) return hmNewsSiteDomain2ColumnPromise;
  hmNewsSiteDomain2ColumnPromise = (async () => {
    await executeNewsDbWrite(sql`
      ALTER TABLE hm_news_sites ADD COLUMN IF NOT EXISTS domain2 text;
    `);
    await executeNewsDbWrite(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS hm_news_sites_domain2_key
        ON hm_news_sites (domain2) WHERE domain2 IS NOT NULL;
    `);
  })()
    .then(() => undefined)
    .catch((e) => {
      hmNewsSiteDomain2ColumnPromise = null;
      throw e;
    });
  return hmNewsSiteDomain2ColumnPromise;
}

export function isMissingHmDomain2ColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const { code, message } = postgresErrorMeta(e);
  return code === "42703" || /domain2.*does not exist/i.test(message || msg);
}

export function ensureHmNewsSiteDomain3Column(): Promise<void> {
  if (hmNewsSiteDomain3ColumnPromise) return hmNewsSiteDomain3ColumnPromise;
  hmNewsSiteDomain3ColumnPromise = (async () => {
    await executeNewsDbWrite(sql`
      ALTER TABLE hm_news_sites ADD COLUMN IF NOT EXISTS domain3 text;
    `);
    await executeNewsDbWrite(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS hm_news_sites_domain3_key
        ON hm_news_sites (domain3) WHERE domain3 IS NOT NULL;
    `);
  })()
    .then(() => undefined)
    .catch((e) => {
      hmNewsSiteDomain3ColumnPromise = null;
      throw e;
    });
  return hmNewsSiteDomain3ColumnPromise;
}

export function isMissingHmDomain3ColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const { code, message } = postgresErrorMeta(e);
  return code === "42703" || /domain3.*does not exist/i.test(message || msg);
}

export function isMissingHmSiteColumnError(e: unknown): boolean {
  return (
    isMissingHmSeoColumnError(e) ||
    isMissingHmDomain2ColumnError(e) ||
    isMissingHmDomain3ColumnError(e)
  );
}

/** PATCH/POST öncesi: SEO + domain2 + domain3 sütunlarını garantile. */
export async function ensureHmNewsSiteWritableColumns(): Promise<void> {
  await ensureHmNewsSiteSeoColumns();
  await ensureHmNewsSiteDomain2Column();
  await ensureHmNewsSiteDomain3Column();
}

/** Başarısız ensure sonrası cache'i temizleyip yeniden dene. */
export function resetHmNewsSiteColumnEnsureCache(): void {
  hmNewsSiteSeoColumnsPromise = null;
  hmNewsSiteSeoColumnsExistPromise = null;
  hmNewsSiteDomain2ColumnPromise = null;
  hmNewsSiteDomain3ColumnPromise = null;
}

async function hmNewsSiteSeoColumnsExist(): Promise<boolean> {
  if (hmNewsSiteSeoColumnsExistPromise) return hmNewsSiteSeoColumnsExistPromise;
  hmNewsSiteSeoColumnsExistPromise = getNewsDbForRead()
    .execute<{ count: number | string }>(sql`
      SELECT count(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'hm_news_sites'
        AND column_name IN ('description', 'verification_json');
    `)
    .then((result) => Number(result.rows[0]?.count ?? 0) >= 2)
    .catch((e) => {
      hmNewsSiteSeoColumnsExistPromise = null;
      throw e;
    });
  return hmNewsSiteSeoColumnsExistPromise;
}

async function ensureSeoColumnsBestEffort(): Promise<boolean> {
  try {
    await ensureHmNewsSiteSeoColumns();
    return true;
  } catch (e) {
    if (isMissingHmBaseTableError(e)) throw e;
    return false;
  }
}

async function withSeoColumnFallback(
  fullQuery: () => Promise<HmNewsSiteCompatRow[]>,
  legacyQuery: () => Promise<LegacyHmNewsSiteRow[]>,
): Promise<HmNewsSiteCompatRow[]> {
  if (!(await hmNewsSiteSeoColumnsExist())) {
    const ensured = await ensureSeoColumnsBestEffort();
    if (!ensured) return (await legacyQuery()).map(withSeoDefaults);
  }
  try {
    return await fullQuery();
  } catch (e) {
    if (!isMissingHmSeoColumnError(e)) throw e;
    hmNewsSiteSeoColumnsExistPromise = Promise.resolve(false);
    return (await legacyQuery()).map(withSeoDefaults);
  }
}

export async function listHmNewsSitesCompat(): Promise<HmNewsSiteCompatRow[]> {
  return withSeoColumnFallback(
    () => getNewsDbForRead().select().from(hmNewsSitesTable).orderBy(desc(hmNewsSitesTable.createdAt)),
    () => getNewsDbForRead().select(hmNewsSiteLegacyColumns).from(hmNewsSitesTable).orderBy(desc(hmNewsSitesTable.createdAt)),
  );
}

export async function listActiveHmNewsSitesByUpdatedCompat(): Promise<HmNewsSiteCompatRow[]> {
  return withSeoColumnFallback(
    () =>
      getNewsDbForRead()
        .select()
        .from(hmNewsSitesTable)
        .where(eq(hmNewsSitesTable.active, true))
        .orderBy(desc(hmNewsSitesTable.updatedAt)),
    () =>
      getNewsDbForRead()
        .select(hmNewsSiteLegacyColumns)
        .from(hmNewsSitesTable)
        .where(eq(hmNewsSitesTable.active, true))
        .orderBy(desc(hmNewsSitesTable.updatedAt)),
  );
}

export async function getHmNewsSiteByIdCompat(id: number): Promise<HmNewsSiteCompatRow | undefined> {
  const rows = await withSeoColumnFallback(
    () => getNewsDbForRead().select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.id, id)).limit(1),
    () => getNewsDbForRead().select(hmNewsSiteLegacyColumns).from(hmNewsSitesTable).where(eq(hmNewsSitesTable.id, id)).limit(1),
  );
  return rows[0];
}

function normalizeHmSlugLookup(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getActiveHmNewsSiteBySlugCompat(slug: string): Promise<HmNewsSiteCompatRow | undefined> {
  const normalized = normalizeHmSlugLookup(slug);
  if (!normalized) return undefined;
  const rows = await withSeoColumnFallback(
    () =>
      getNewsDbForRead()
        .select()
        .from(hmNewsSitesTable)
        .where(and(eq(hmNewsSitesTable.slug, normalized), eq(hmNewsSitesTable.active, true)))
        .limit(1),
    () =>
      getNewsDbForRead()
        .select(hmNewsSiteLegacyColumns)
        .from(hmNewsSitesTable)
        .where(and(eq(hmNewsSitesTable.slug, normalized), eq(hmNewsSitesTable.active, true)))
        .limit(1),
  );
  if (rows[0]) return rows[0];

  // DB'de "/su" veya "Su" gibi normalize edilmemiş slug kalmış olabilir.
  const active = await withSeoColumnFallback(
    () =>
      getNewsDbForRead()
        .select()
        .from(hmNewsSitesTable)
        .where(eq(hmNewsSitesTable.active, true)),
    () =>
      getNewsDbForRead()
        .select(hmNewsSiteLegacyColumns)
        .from(hmNewsSitesTable)
        .where(eq(hmNewsSitesTable.active, true)),
  );
  return active.find((row) => normalizeHmSlugLookup(String(row.slug ?? "")) === normalized);
}

export async function getActiveHmNewsSiteByDomainCompat(
  domains: string[],
): Promise<HmNewsSiteCompatRow | undefined> {
  if (!domains.length) return undefined;
  const domainWhere = or(
    inArray(hmNewsSitesTable.domain, domains),
    inArray(hmNewsSitesTable.domain2, domains),
    inArray(hmNewsSitesTable.domain3, domains),
  );
  try {
    await ensureHmNewsSiteDomain2Column();
    await ensureHmNewsSiteDomain3Column();
    const rows = await withSeoColumnFallback(
      () =>
        getNewsDbForRead()
          .select()
          .from(hmNewsSitesTable)
          .where(and(eq(hmNewsSitesTable.active, true), domainWhere))
          .limit(1),
      () =>
        getNewsDbForRead()
          .select(hmNewsSiteLegacyColumns)
          .from(hmNewsSitesTable)
          .where(and(eq(hmNewsSitesTable.active, true), domainWhere))
          .limit(1),
    );
    return rows[0];
  } catch (e) {
    if (!isMissingHmDomain2ColumnError(e)) throw e;
    const rows = await withSeoColumnFallback(
      () =>
        getNewsDbForRead()
          .select()
          .from(hmNewsSitesTable)
          .where(and(eq(hmNewsSitesTable.active, true), inArray(hmNewsSitesTable.domain, domains)))
          .limit(1),
      () =>
        getNewsDbForRead()
          .select(hmNewsSiteLegacyColumnsNoDomain2)
          .from(hmNewsSitesTable)
          .where(and(eq(hmNewsSitesTable.active, true), inArray(hmNewsSitesTable.domain, domains)))
          .limit(1),
    );
    return rows[0] ? withSeoDefaults(rows[0] as LegacyHmNewsSiteRow) : undefined;
  }
}
