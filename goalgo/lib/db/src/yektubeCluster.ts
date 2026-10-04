import { eq, getTableColumns, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "./connection";
import { isYektubeDatabaseConfigured, yektubeDb } from "./yektubeDb";
import * as schema from "./schema";

/**
 * Yektube cluster okunamıyorsa okumayı ana DB'ye al.
 * Startup probe ve istek içi sorgu hatası (bağlantı veya eksik tablo/kolon) aynı bayrağı açar.
 */
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

const YEKTUBE_READ_FALLBACK_CODES = new Set([
  "42P01", // undefined_table
  "42703", // undefined_column
  "3F000", // invalid_schema_name
  "3D000", // invalid_catalog_name
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "57P01",
  "57P02",
  "57P03",
  "53300",
  "28P01",
  "28000",
  "42501", // insufficient_privilege
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

const YEKTUBE_READ_FALLBACK_MESSAGE =
  /does not exist|connection terminated|connection refused|timeout exceeded when trying to connect|password authentication failed|too many clients|remaining connection slots|the database system is (?:starting up|shutting down)|getaddrinfo|socket hang up|Client has encountered a connection error|ECONNRESET|ECONNREFUSED/i;

type ReadCall = { prop: PropertyKey; args: unknown[] };

function walkErrorNodes(err: unknown): object[] {
  const out: object[] = [];
  const seen = new Set<unknown>();
  const stack: unknown[] = [err];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    out.push(current);
    const rec = current as { cause?: unknown; errors?: unknown };
    if (rec.cause) stack.push(rec.cause);
    if (Array.isArray(rec.errors)) stack.push(...rec.errors);
  }
  return out;
}

/** Bağlantı kopması veya eksik tablo/kolon — ana DB'ye düşülebilir. Sözdizimi ve unique ihlali değil. */
export function isYektubeReadFallbackError(err: unknown): boolean {
  for (const node of walkErrorNodes(err)) {
    const code = "code" in node && typeof (node as { code?: unknown }).code === "string" ? (node as { code: string }).code : "";
    if (code && YEKTUBE_READ_FALLBACK_CODES.has(code)) return true;
    const message = node instanceof Error ? node.message : "";
    if (message && YEKTUBE_READ_FALLBACK_MESSAGE.test(message)) return true;
  }
  if (typeof err === "string" && YEKTUBE_READ_FALLBACK_MESSAGE.test(err)) return true;
  return false;
}

/**
 * Startup'ın okuma hedefini seçmesi.
 * Ana DB probe'u başarısızsa yektube'a yapışmayı bırakma: eski kod her hatada
 * `setYektubeReadMainFallback(true)` diyordu; ana DB'de video tablosu yoksa
 * (haber kümesi ayrılmış DATABASE_URL) tüm /video okumaları 500 oluyordu.
 */
export function decideYektubeReadFallback(input: {
  readMode: YektubeDbReadMode;
  configured: boolean;
  yektubeProbeOk: boolean;
  mainProbeOk: boolean;
  yektubeLagging: boolean;
}): boolean {
  if (input.readMode !== "yektube" || !input.configured) return false;
  if (!input.mainProbeOk) return false;
  if (!input.yektubeProbeOk) return true;
  return input.yektubeLagging;
}

function replayReadCalls(root: object, calls: ReadCall[]): unknown {
  let current: unknown = root;
  for (const call of calls) {
    const fn = (current as Record<PropertyKey, unknown>)[call.prop];
    if (typeof fn !== "function") {
      throw new Error(`[yektube-db] fallback replay: ${String(call.prop)} fonksiyon değil`);
    }
    current = (fn as (...args: unknown[]) => unknown).apply(current, call.args);
  }
  return current;
}

let lastReadFallbackLogAt = 0;
let suppressedReadFallbackLogs = 0;

function logYektubeReadFallback(err: unknown): void {
  const now = Date.now();
  const message = err instanceof Error ? err.message : String(err);
  const code = walkErrorNodes(err)
    .map((node) => ("code" in node && typeof (node as { code?: unknown }).code === "string" ? (node as { code: string }).code : ""))
    .find(Boolean);
  if (now - lastReadFallbackLogAt < 15_000) {
    suppressedReadFallbackLogs += 1;
    return;
  }
  const extra = suppressedReadFallbackLogs > 0 ? ` (önceki ${suppressedReadFallbackLogs} benzer hata özetlendi)` : "";
  suppressedReadFallbackLogs = 0;
  lastReadFallbackLogAt = now;
  console.error(
    `[yektube-db] sorgu başarısız${code ? ` [${code}]` : ""} (${message.slice(0, 240)})${extra} — bu istek ana DB'den deneniyor.`,
  );
}

type QueryFallbackOptions = {
  onRecovered?: () => void;
  shouldFallback?: (err: unknown) => boolean;
};

async function recoverReadQuery(
  err: unknown,
  calls: ReadCall[],
  fallback: object,
  opts: QueryFallbackOptions | undefined,
): Promise<unknown> {
  const shouldFallback = opts?.shouldFallback ?? isYektubeReadFallbackError;
  if (!shouldFallback(err)) throw err;
  logYektubeReadFallback(err);
  const value = await Promise.resolve(replayReadCalls(fallback, calls));
  opts?.onRecovered?.();
  return value;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function withReadFallback(result: unknown, calls: ReadCall[], fallback: object, opts: QueryFallbackOptions | undefined): unknown {
  if (result instanceof Promise) {
    return result.then(
      (value) => value,
      (err) => recoverReadQuery(err, calls, fallback, opts),
    );
  }
  if (!isThenable(result)) return result;

  return new Proxy(result as object, {
    get(target, prop, receiver) {
      if (prop === "then") {
        return (
          onFulfilled?: ((value: unknown) => unknown) | null,
          onRejected?: ((reason: unknown) => unknown) | null,
        ) =>
          Promise.resolve(target as PromiseLike<unknown>).then(
            (value) => (onFulfilled ? onFulfilled(value) : value),
            (err) => recoverReadQuery(err, calls, fallback, opts).then(onFulfilled ?? undefined, onRejected ?? undefined),
          );
      }
      if (prop === "catch") {
        return (onRejected?: ((reason: unknown) => unknown) | null) =>
          (receiver as PromiseLike<unknown>).then(undefined, onRejected ?? undefined);
      }
      if (prop === "finally") {
        return (onFinally?: (() => void) | null) =>
          (receiver as PromiseLike<unknown>).then(
            (value) => {
              onFinally?.();
              return value;
            },
            (err) => {
              onFinally?.();
              throw err;
            },
          );
      }
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const nextCalls = [...calls, { prop, args }];
        try {
          const next = (value as (...a: unknown[]) => unknown).apply(target, args);
          return withReadFallback(next, nextCalls, fallback, opts);
        } catch (err) {
          return recoverReadQuery(err, nextCalls, fallback, opts);
        }
      };
    },
  });
}

/** Sorgu zincirini primary'de çalıştırır; bağlantı veya eksik tablo/kolon hatasında aynı zinciri fallback'te tekrarlar. */
export function createQueryFallbackProxy<T extends object>(primary: T, fallback: T, opts?: QueryFallbackOptions): T {
  return new Proxy(primary, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const calls: ReadCall[] = [{ prop, args }];
        try {
          const result = (value as (...a: unknown[]) => unknown).apply(target, args);
          return withReadFallback(result, calls, fallback, opts);
        } catch (err) {
          return recoverReadQuery(err, calls, fallback, opts);
        }
      };
    },
  }) as T;
}

let yektubeReadPinnedLogged = false;

const yektubeReadFallbackProxy: YektubeDatabase | null = yektubeDb
  ? createQueryFallbackProxy(yektubeDb as YektubeDatabase, db as YektubeDatabase, {
      onRecovered: () => {
        if (!readUsesMainFallback && !yektubeReadPinnedLogged) {
          yektubeReadPinnedLogged = true;
          console.error(
            "[yektube-db] yektube okuması bu süreçte başarısız; sonraki istekler ana DB'den gidecek (konteyner yeniden açılınca yektube tekrar denenir).",
          );
        }
        setYektubeReadMainFallback(true);
      },
    })
  : null;

function pickYektubeReadDatabase(): YektubeDatabase {
  const mode = getYektubeDbReadMode();
  if (mode === "yektube" && isYektubeDatabaseConfigured && yektubeReadFallbackProxy && !readUsesMainFallback) {
    return yektubeReadFallbackProxy;
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

/** Okuma hedefi — YEKTUBE_DB_READ (`main` veya `yektube`); startup ve istek içi fallback destekler. */
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
