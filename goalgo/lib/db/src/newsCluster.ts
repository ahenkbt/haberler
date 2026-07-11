import { eq, getTableColumns, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "./connection";
import { isNewsDatabaseConfigured, newsDb } from "./newsDb";
import * as schema from "./schema";

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

async function mirrorRowsToNewsDb<T extends PgTable>(table: T, rows: T["$inferSelect"][]): Promise<void> {
  if (!isNewsDatabaseConfigured || !newsDb || rows.length === 0) return;
  const cluster = newsDb as NewsDatabase;
  for (const row of rows) {
    try {
      await cluster.insert(table).values(row as T["$inferInsert"]);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const id = (row as { id?: number }).id;
      if (id == null) continue;
      const { id: _id, ...rest } = row as T["$inferSelect"] & { id: number };
      const cols = getTableColumns(table);
      await cluster.update(table).set(rest as unknown as Partial<T["$inferInsert"]>).where(eq(cols.id, id));
    }
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

/** UPDATE — hedef bayrağa göre ana ve/veya haber DB. */
export async function dualWriteUpdate<T extends PgTable>(
  table: T,
  set: Partial<T["$inferInsert"]>,
  where: SQL | undefined,
): Promise<T["$inferSelect"][]> {
  const mode = getNewsDbWriteMode();
  const cluster = getNewsDbInstance();

  if (mode === "news") {
    const rows = await cluster.update(table).set(set).where(where).returning();
    return rows as T["$inferSelect"][];
  }

  const primary = (await db.update(table).set(set).where(where).returning()) as T["$inferSelect"][];
  if (shouldMirrorMainWriteToNewsDb(mode) && where) {
    try {
      await cluster.update(table).set(set).where(where);
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
  if (shouldMirrorMainWriteToNewsDb(mode) && where) {
    try {
      await cluster.delete(table).where(where);
    } catch (err) {
      logMirrorFailure("delete", err);
    }
  }
}
