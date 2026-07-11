import { eq, getTableColumns, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "./connection";
import { isYektubeDatabaseConfigured, yektubeDb } from "./yektubeDb";
import * as schema from "./schema";

/** Yektube cluster eksikse okumayı ana DB'ye al (deploy sonrası startup'ta ayarlanır). */
let readUsesMainFallback = false;

export type YektubeDbReadMode = "main" | "yektube";
export type YektubeDbWriteMode = "main" | "yektube" | "dual";

type YektubeDatabase = NodePgDatabase<typeof schema>;

let readModeDualWarned = false;

function parseMode<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = raw?.trim().toLowerCase();
  return (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback;
}

function defaultReadMode(): YektubeDbReadMode {
  return isYektubeDatabaseConfigured ? "yektube" : "main";
}

function defaultWriteMode(): YektubeDbWriteMode {
  return isYektubeDatabaseConfigured ? "yektube" : "main";
}

export function getYektubeDbReadMode(): YektubeDbReadMode {
  const raw = process.env.YEKTUBE_DB_READ?.trim().toLowerCase();
  if (raw === "dual") {
    if (!readModeDualWarned) {
      console.warn(
        "[yektube-db] YEKTUBE_DB_READ=dual geçersiz; dual yalnızca YEKTUBE_DB_WRITE içindir. Okuma ana DB'den (main) yapılıyor.",
      );
      readModeDualWarned = true;
    }
    return "main";
  }
  if (!raw) return defaultReadMode();
  return parseMode(raw, ["main", "yektube"] as const, defaultReadMode());
}

export function getYektubeDbWriteMode(): YektubeDbWriteMode {
  const raw = process.env.YEKTUBE_DB_WRITE?.trim().toLowerCase();
  if (!raw) return defaultWriteMode();
  return parseMode(raw, ["main", "yektube", "dual"] as const, defaultWriteMode());
}

/** Yektube cluster drizzle örneği; yapılandırılmamışsa ana DB. */
export function getYektubeDbInstance(): YektubeDatabase {
  return (yektubeDb ?? db) as YektubeDatabase;
}

function pickYektubeReadDatabase(): YektubeDatabase {
  const mode = getYektubeDbReadMode();
  if (mode === "yektube" && isYektubeDatabaseConfigured && yektubeDb && !readUsesMainFallback) {
    return yektubeDb as YektubeDatabase;
  }
  return db as YektubeDatabase;
}

const readDbProxy: YektubeDatabase = new Proxy({} as YektubeDatabase, {
  get(_target, prop) {
    const real = pickYektubeReadDatabase();
    const value = (real as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
});

export function setYektubeReadMainFallback(enabled: boolean): void {
  readUsesMainFallback = enabled;
}

export function isYektubeReadMainFallback(): boolean {
  return readUsesMainFallback;
}

/** Okuma hedefi — YEKTUBE_DB_READ (`main` veya `yektube`); proxy ile startup fallback destekler. */
export function getYektubeDbForRead(): YektubeDatabase {
  return readDbProxy;
}

/** Yazma primary hedefi. Dual-write modunda primary hâlâ ana DB'dir. */
export function getYektubeDbForPrimaryWrite(): YektubeDatabase {
  const mode = getYektubeDbWriteMode();
  if (mode === "yektube" && isYektubeDatabaseConfigured && yektubeDb) {
    return yektubeDb as YektubeDatabase;
  }
  return db as YektubeDatabase;
}

export async function executeYektubeDbWrite(query: SQL): Promise<void> {
  const mode = getYektubeDbWriteMode();
  const cluster = getYektubeDbInstance();

  if (mode === "yektube") {
    await cluster.execute(query);
    return;
  }

  await db.execute(query);
  if (mode === "dual" && isYektubeDatabaseConfigured && yektubeDb) {
    await cluster.execute(query);
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

async function mirrorRowsToYektubeDb<T extends PgTable>(table: T, rows: T["$inferSelect"][]): Promise<void> {
  if (!isYektubeDatabaseConfigured || !yektubeDb || rows.length === 0) return;
  const cluster = yektubeDb as YektubeDatabase;
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

async function mirrorRowsToMainDb<T extends PgTable>(table: T, rows: T["$inferSelect"][]): Promise<void> {
  if (rows.length === 0) return;
  const mainDb = db as YektubeDatabase;
  for (const row of rows) {
    try {
      await mainDb.insert(table).values(row as T["$inferInsert"]);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const id = (row as { id?: number }).id;
      if (id == null) continue;
      const { id: _id, ...rest } = row as T["$inferSelect"] & { id: number };
      const cols = getTableColumns(table);
      await mainDb.update(table).set(rest as unknown as Partial<T["$inferInsert"]>).where(eq(cols.id, id));
    }
  }
}

function preferYektubeClusterWrite(): boolean {
  return getYektubeDbReadMode() === "yektube" && isYektubeDatabaseConfigured && !!yektubeDb;
}

function shouldMirrorMainWriteToYektubeDb(mode: YektubeDbWriteMode): boolean {
  return mode === "dual" && isYektubeDatabaseConfigured && !!yektubeDb;
}

function otherWriteTargets(primary: YektubeDatabase): YektubeDatabase[] {
  const seen = new Set<YektubeDatabase>([primary]);
  const out: YektubeDatabase[] = [];
  const add = (target: YektubeDatabase) => {
    if (seen.has(target)) return;
    seen.add(target);
    out.push(target);
  };
  add(getYektubeDbForRead());
  add(getYektubeDbForPrimaryWrite());
  add(db as YektubeDatabase);
  if (yektubeDb) add(yektubeDb as YektubeDatabase);
  return out;
}

async function updateWithReturning<T extends PgTable>(
  target: YektubeDatabase,
  table: T,
  set: Partial<T["$inferInsert"]>,
  where: SQL,
): Promise<T["$inferSelect"][]> {
  return (await target.update(table).set(set).where(where).returning()) as T["$inferSelect"][];
}

async function mirrorUpdate<T extends PgTable>(
  primary: YektubeDatabase,
  table: T,
  set: Partial<T["$inferInsert"]>,
  where: SQL,
): Promise<void> {
  for (const target of otherWriteTargets(primary)) {
    await target.update(table).set(set).where(where).catch(() => undefined);
  }
}

export async function dualWriteYektubeInsert<T extends PgTable>(
  table: T,
  values: T["$inferInsert"] | T["$inferInsert"][],
): Promise<T["$inferSelect"][]> {
  const mode = getYektubeDbWriteMode();
  const readDb = getYektubeDbForRead();
  const primaryWrite = getYektubeDbForPrimaryWrite();

  const insertOn = async (target: YektubeDatabase): Promise<T["$inferSelect"][]> => {
    return (await target.insert(table).values(values as T["$inferInsert"]).returning()) as T["$inferSelect"][];
  };

  if (mode === "yektube" || preferYektubeClusterWrite()) {
    let rows: T["$inferSelect"][] = [];
    try {
      rows = await insertOn(readDb);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
    if (rows.length === 0 && readDb !== primaryWrite) {
      rows = await insertOn(primaryWrite);
    }
    if (rows.length > 0) {
      await mirrorRowsToMainDb(table, rows).catch(() => undefined);
      await mirrorRowsToYektubeDb(table, rows).catch(() => undefined);
    }
    return rows;
  }

  const rows = await insertOn(db as YektubeDatabase);
  if (rows.length > 0 && shouldMirrorMainWriteToYektubeDb(mode)) {
    await mirrorRowsToYektubeDb(table, rows).catch(() => undefined);
  }
  return rows;
}

export async function dualWriteYektubeUpdate<T extends PgTable>(
  table: T,
  set: Partial<T["$inferInsert"]>,
  where: SQL | undefined,
): Promise<T["$inferSelect"][]> {
  if (!where) return [];

  const mode = getYektubeDbWriteMode();
  const readDb = getYektubeDbForRead();

  if (mode === "yektube" || preferYektubeClusterWrite()) {
    const rows = await updateWithReturning(readDb, table, set, where);
    await mirrorUpdate(readDb, table, set, where);
    return rows;
  }

  const rows = await updateWithReturning(db as YektubeDatabase, table, set, where);
  if (shouldMirrorMainWriteToYektubeDb(mode)) {
    await getYektubeDbInstance()
      .update(table)
      .set(set)
      .where(where)
      .catch(() => undefined);
  }
  return rows;
}

export async function dualWriteYektubeDelete<T extends PgTable>(
  table: T,
  where: SQL | undefined,
): Promise<void> {
  if (!where) return;

  const mode = getYektubeDbWriteMode();
  const readDb = getYektubeDbForRead();

  if (mode === "yektube" || preferYektubeClusterWrite()) {
    await readDb.delete(table).where(where);
    for (const target of otherWriteTargets(readDb)) {
      await target.delete(table).where(where).catch(() => undefined);
    }
    return;
  }

  await db.delete(table).where(where);
  if (shouldMirrorMainWriteToYektubeDb(mode)) {
    await getYektubeDbInstance()
      .delete(table)
      .where(where)
      .catch(() => undefined);
  }
}
