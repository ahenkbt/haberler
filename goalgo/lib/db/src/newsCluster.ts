import { and, eq, getTableColumns, isNull, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "./connection";
import { isNewsDatabaseConfigured, newsDb } from "./newsDb";
import * as schema from "./schema";
import { hmNewsSitesTable } from "./schema/hm";
import { newsTable } from "./schema/news";
import { categoriesTable } from "./schema/categories";
import { phpSiteIdFromWorker } from "./phpSiteIdMap";
import { resolvePhpSiteForPanelRow, type PanelSiteKeys } from "./phpSiteResolve";

export type NewsDbReadMode = "main" | "news";
export type NewsDbWriteMode = "main" | "news" | "dual";

type NewsDatabase = NodePgDatabase<typeof schema>;

let readModeDualWarned = false;

function parseMode<T extends string>(raw: string | undefined, allowed: readonly T[], fallback: T): T {
  const v = raw?.trim().toLowerCase();
  return (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback;
}

export function getNewsDbReadMode(): NewsDbReadMode {
  const raw = process.env.NEWS_DB_READ?.trim().toLowerCase();
  if (raw === "dual") {
    if (!readModeDualWarned) {
      console.warn(
        "[news-db] NEWS_DB_READ=dual geçersiz; dual yalnızca NEWS_DB_WRITE içindir. Okuma ana DB'den (main) yapılıyor.",
      );
      readModeDualWarned = true;
    }
    return "main";
  }
  return parseMode(process.env.NEWS_DB_READ, ["main", "news"] as const, "main");
}

export function getNewsDbWriteMode(): NewsDbWriteMode {
  return parseMode(process.env.NEWS_DB_WRITE, ["main", "news", "dual"] as const, "main");
}

function shouldMirrorMainWriteToNewsDb(mode: NewsDbWriteMode): boolean {
  return isNewsDatabaseConfigured && !!newsDb && (mode === "dual" || getNewsDbReadMode() === "news");
}

/** Haber cluster drizzle örneği; yapılandırılmamışsa ana DB. */
export function getNewsDbInstance(): NewsDatabase {
  return (newsDb ?? db) as NewsDatabase;
}

/** Okuma hedefi — NEWS_DB_READ bayrağına göre (`main` veya `news`; `dual` geçersiz, main sayılır). */
export function getNewsDbForRead(): NewsDatabase {
  const mode = getNewsDbReadMode();
  if (mode === "news" && isNewsDatabaseConfigured && newsDb) {
    return newsDb as NewsDatabase;
  }
  return db as NewsDatabase;
}

/** Yazma primary hedefi. Dual-write modunda primary hâlâ ana DB'dir; mirror işlemleri dualWrite* ile yapılır. */
export function getNewsDbForPrimaryWrite(): NewsDatabase {
  const mode = getNewsDbWriteMode();
  if (mode === "news" && isNewsDatabaseConfigured && newsDb) {
    return newsDb as NewsDatabase;
  }
  return db as NewsDatabase;
}

let mirrorFailureWarnedAt = 0;

/**
 * Dual-write mirror hatası ana yazmayı BOZMAMALI: haber cluster DB'si erişilemezse
 * (ör. taşınmış/kapatılmış Postgres) haber ekleme/güncelleme 500 dönmesin.
 * Ana DB kaynak doğrudur; mirror en-iyi-çaba olarak loglanır.
 */
function logMirrorFailure(op: string, err: unknown): void {
  const now = Date.now();
  const msg = err instanceof Error ? err.message : String(err);
  if (now - mirrorFailureWarnedAt > 60_000) {
    mirrorFailureWarnedAt = now;
    console.error(
      `[news-db] UYARI: haber DB mirror yazımı başarısız (${op}): ${msg.slice(0, 300)} — ` +
        "ana DB yazımı tamamlandı; NEWS_DATABASE_URL / NEWS_DB_WRITE ayarını kontrol edin.",
    );
  }
}

/** Haber şeması raw SQL bakım işlemleri için write-mode uyumlu yürütme. */
export async function executeNewsDbWrite(query: SQL): Promise<void> {
  const mode = getNewsDbWriteMode();
  const cluster = getNewsDbInstance();

  if (mode === "news") {
    await cluster.execute(query);
    return;
  }

  await db.execute(query);
  if (mode === "dual" && isNewsDatabaseConfigured && newsDb) {
    try {
      await cluster.execute(query);
    } catch (err) {
      logMirrorFailure("execute", err);
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

async function resolvePhpCategoryIdForMirror(
  cluster: NewsDatabase,
  phpSiteId: number | null,
  workerCategoryId: number | null | undefined,
): Promise<number | null> {
  const catId = Number(workerCategoryId);
  if (!Number.isFinite(catId) || catId <= 0) return null;
  const [workerCat] = await db
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, catId))
    .limit(1);
  const slug = String(workerCat?.slug ?? "")
    .trim()
    .toLowerCase();
  if (!slug) return catId;
  if (phpSiteId) {
    const [scoped] = await cluster
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.slug, slug), eq(categoriesTable.exclusiveSiteId, phpSiteId)))
      .limit(1);
    if (scoped?.id) return Number(scoped.id);
  }
  const [global] = await cluster
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.slug, slug), isNull(categoriesTable.exclusiveSiteId)))
    .limit(1);
  if (global?.id) return Number(global.id);
  const [any] = await cluster
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);
  return any?.id != null ? Number(any.id) : null;
}

/**
 * Remap Worker site/category ids → PHP twilight-pine before mirror insert.
 * turkatahaber 1132→230; raw id copy leaves PHP category pages empty.
 */
async function remapNewsRowForPhpMirror(
  cluster: NewsDatabase,
  row: typeof newsTable.$inferSelect,
): Promise<typeof newsTable.$inferSelect> {
  const workerSiteId = row.siteId != null ? Number(row.siteId) : null;
  let phpSiteId = phpSiteIdFromWorker(workerSiteId);
  if (workerSiteId && phpSiteId === workerSiteId) {
    const [w] = await db
      .select({ slug: hmNewsSitesTable.slug })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.id, workerSiteId))
      .limit(1);
    const slug = String(w?.slug ?? "")
      .trim()
      .toLowerCase();
    if (slug) {
      const [php] = await cluster
        .select({ id: hmNewsSitesTable.id })
        .from(hmNewsSitesTable)
        .where(eq(hmNewsSitesTable.slug, slug))
        .limit(1);
      if (php?.id) phpSiteId = Number(php.id);
    }
  }
  const categoryId = await resolvePhpCategoryIdForMirror(cluster, phpSiteId, row.categoryId);
  const ownerWorker = row.ownerSiteId != null ? Number(row.ownerSiteId) : null;
  const ownerPhp = phpSiteIdFromWorker(ownerWorker) ?? phpSiteId;
  return {
    ...row,
    siteId: phpSiteId,
    ownerSiteId: ownerPhp,
    categoryId,
  };
}

async function mirrorRowsToNewsDb<T extends PgTable>(table: T, rows: T["$inferSelect"][]): Promise<void> {
  if (!isNewsDatabaseConfigured || !newsDb || rows.length === 0) return;
  const cluster = newsDb as NewsDatabase;
  const isHmNewsSites = table === (hmNewsSitesTable as unknown as T);
  const isNews = table === (newsTable as unknown as T);
  for (const raw of rows) {
    const row = isNews
      ? ((await remapNewsRowForPhpMirror(cluster, raw as typeof newsTable.$inferSelect)) as T["$inferSelect"])
      : raw;
    try {
      await cluster.insert(table).values(row as T["$inferInsert"]);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const id = (row as { id?: number }).id;
      if (id == null) continue;
      const { id: _id, ...rest } = row as T["$inferSelect"] & { id: number };
      const cols = getTableColumns(table);

      // hm_news_sites: aynı id farklı slug üzerine UPDATE yapma (tr ↔ kirsehirhaber çakışması).
      if (isHmNewsSites) {
        const incomingSlug = String((row as { slug?: unknown }).slug ?? "")
          .trim()
          .toLowerCase()
          .replace(/^\/+|\/+$/g, "");
        const existingAtId = await cluster
          .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug })
          .from(hmNewsSitesTable)
          .where(eq(hmNewsSitesTable.id, id))
          .limit(1);
        const existingSlug = String(existingAtId[0]?.slug ?? "")
          .trim()
          .toLowerCase()
          .replace(/^\/+|\/+$/g, "");
        if (existingSlug && incomingSlug && existingSlug !== incomingSlug) {
          const bySlug = await cluster
            .select({ id: hmNewsSitesTable.id })
            .from(hmNewsSitesTable)
            .where(eq(hmNewsSitesTable.slug, (row as { slug: string }).slug))
            .limit(1);
          if (bySlug[0]) {
            await cluster
              .update(hmNewsSitesTable)
              .set(rest as unknown as Partial<typeof hmNewsSitesTable.$inferInsert>)
              .where(eq(hmNewsSitesTable.id, bySlug[0].id));
          } else {
            // Yeni id ile ekle — kök sitenin satırını ezme.
            await cluster.insert(hmNewsSitesTable).values(rest as typeof hmNewsSitesTable.$inferInsert);
          }
          continue;
        }
      }

      // news: same Worker id may already exist under PHP site_id — upsert by site+slug too.
      if (isNews) {
        const newsRow = row as typeof newsTable.$inferSelect;
        const siteId = newsRow.siteId != null ? Number(newsRow.siteId) : null;
        const slug = String(newsRow.slug ?? "")
          .trim()
          .toLowerCase()
          .replace(/^\/+|\/+$/g, "");
        if (siteId && slug) {
          const bySlug = await cluster
            .select({ id: newsTable.id })
            .from(newsTable)
            .where(and(eq(newsTable.siteId, siteId), eq(newsTable.slug, newsRow.slug)))
            .limit(1);
          if (bySlug[0]?.id) {
            await cluster
              .update(newsTable)
              .set(rest as unknown as Partial<typeof newsTable.$inferInsert>)
              .where(eq(newsTable.id, bySlug[0].id));
            continue;
          }
        }
      }

      await cluster.update(table).set(rest as unknown as Partial<T["$inferInsert"]>).where(eq(cols.id, id));
    }
  }
}

/** Ayrı haber DB'si (NEWS_DATABASE_URL) tanımlı ve yazma modu onu besliyor mu? */
export function shouldMirrorToNewsDb(): boolean {
  return shouldMirrorMainWriteToNewsDb(getNewsDbWriteMode());
}

/**
 * Kenar (Worker/Neon) yazdığı satırı aynı id ile haber DB'sine kopyalar (varsa günceller).
 * Mirror kapalıysa false döner; hata fırlatmaz.
 */
export async function mirrorRowToNewsDb<T extends PgTable>(table: T, row: T["$inferSelect"]): Promise<boolean> {
  if (!shouldMirrorToNewsDb()) return false;
  try {
    await mirrorRowsToNewsDb(table, [row]);
    return true;
  } catch (err) {
    logMirrorFailure("mirror-row", err);
    return false;
  }
}

/** Kenar silmesini haber DB'sine yansıt (id ile). */
export async function deleteRowFromNewsDb<T extends PgTable>(table: T, id: number): Promise<boolean> {
  if (!shouldMirrorToNewsDb() || !newsDb) return false;
  try {
    const cols = getTableColumns(table);
    await (newsDb as NewsDatabase).delete(table).where(eq(cols.id, id));
    return true;
  } catch (err) {
    logMirrorFailure("mirror-delete", err);
    return false;
  }
}

/** INSERT — dual-write: önce ana DB, sonra aynı id ile haber DB. */
export async function dualWriteInsert<T extends PgTable>(
  table: T,
  values: T["$inferInsert"] | T["$inferInsert"][],
): Promise<T["$inferSelect"][]> {
  const mode = getNewsDbWriteMode();
  const cluster = getNewsDbInstance();

  if (mode === "news") {
    const rows = await cluster.insert(table).values(values as T["$inferInsert"]).returning();
    return rows as T["$inferSelect"][];
  }

  const primary = (await db.insert(table).values(values as T["$inferInsert"]).returning()) as T["$inferSelect"][];
  if (shouldMirrorMainWriteToNewsDb(mode)) {
    try {
      await mirrorRowsToNewsDb(table, primary);
    } catch (err) {
      logMirrorFailure("insert", err);
    }
  }
  return primary;
}

export type DualWriteUpdateOptions = {
  /** hm_news_sites only: columns never mirrored to the PHP row (e.g. layoutJson, mirrored by changed keys instead). */
  skipMirrorColumns?: readonly string[];
};

/**
 * brand-shift 2026-10-11: hm_news_sites mirror. Panel ids ≠ PHP ids, so the PHP row is resolved per updated row by
 * its (pre-update) domain via resolvePhpSiteForPanelRow — never by the same numeric id. Unresolved/ambiguous → skip.
 * layoutJson is mirrored only when the PHP id equals the panel id AND the domain matched (legacy seeds); other callers
 * must use mirrorHmSiteLayoutJsonToPhpNeon with changed keys.
 */
async function mirrorHmNewsSitesUpdate(
  before: Array<Record<string, unknown>>,
  set: Record<string, unknown>,
  opts: DualWriteUpdateOptions,
): Promise<void> {
  if (!newsDb) return;
  const skip = new Set(opts.skipMirrorColumns ?? []);
  for (const row of before) {
    const panelId = Number(row.id);
    const res = await resolvePhpSiteForPanelRow(row as PanelSiteKeys);
    if (!res.ok) {
      console.warn(`[news-db] hm_news_sites mirror atlandı (panel ${panelId}): ${res.reason}`);
      continue;
    }
    const mirrorSet: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(set)) {
      if (k === "id" || skip.has(k)) continue;
      if (k === "layoutJson" && res.phpSiteId !== panelId) continue;
      mirrorSet[k] = v;
    }
    if (Object.keys(mirrorSet).length === 0) continue;
    await (newsDb as NewsDatabase)
      .update(hmNewsSitesTable)
      .set(mirrorSet as Partial<typeof hmNewsSitesTable.$inferInsert>)
      .where(eq(hmNewsSitesTable.id, res.phpSiteId));
  }
}

/** UPDATE — hedef bayrağa göre ana ve/veya haber DB. */
export async function dualWriteUpdate<T extends PgTable>(
  table: T,
  set: Partial<T["$inferInsert"]>,
  where: SQL | undefined,
  opts: DualWriteUpdateOptions = {},
): Promise<T["$inferSelect"][]> {
  const mode = getNewsDbWriteMode();
  const cluster = getNewsDbInstance();
  const isSites = (table as unknown) === (hmNewsSitesTable as unknown);

  if (mode === "news") {
    const rows = await cluster.update(table).set(set).where(where).returning();
    return rows as T["$inferSelect"][];
  }

  const mirror = shouldMirrorMainWriteToNewsDb(mode) && where;
  // hm_news_sites: remember the pre-update keys (domain may change in this very update).
  const before =
    mirror && isSites
      ? ((await db
          .select({
            id: hmNewsSitesTable.id,
            slug: hmNewsSitesTable.slug,
            domain: hmNewsSitesTable.domain,
            domain2: hmNewsSitesTable.domain2,
            domain3: hmNewsSitesTable.domain3,
          })
          .from(hmNewsSitesTable)
          .where(where)) as Array<Record<string, unknown>>)
      : [];
  const primary = (await db.update(table).set(set).where(where).returning()) as T["$inferSelect"][];
  if (mirror) {
    try {
      if (isSites) await mirrorHmNewsSitesUpdate(before, set as Record<string, unknown>, opts);
      else await cluster.update(table).set(set).where(where);
    } catch (err) {
      logMirrorFailure("update", err);
    }
  }
  return primary;
}

/** DELETE — hedef bayrağa göre ana ve/veya haber DB. */
export async function dualWriteDelete<T extends PgTable>(
  table: T,
  where: SQL | undefined,
): Promise<void> {
  const mode = getNewsDbWriteMode();
  const cluster = getNewsDbInstance();

  if (mode === "news") {
    await cluster.delete(table).where(where);
    return;
  }

  await db.delete(table).where(where);
  if ((table as unknown) === (hmNewsSitesTable as unknown)) {
    // brand-shift 2026-10-11: panel ids ≠ PHP ids — never delete a live PHP site row by the panel id.
    if (shouldMirrorMainWriteToNewsDb(mode)) console.warn("[news-db] hm_news_sites silme PHP veritabanına yansıtılmadı (id eşlemesi güvenli değil)");
    return;
  }
  if (shouldMirrorMainWriteToNewsDb(mode) && where) {
    try {
      await cluster.delete(table).where(where);
    } catch (err) {
      logMirrorFailure("delete", err);
    }
  }
}
