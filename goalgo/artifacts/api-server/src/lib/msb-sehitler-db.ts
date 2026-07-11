import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { asc, desc, count, eq, inArray } from "drizzle-orm";
import { db, vkdMsbSehitlerTable } from "@workspace/db";
import { scrapeMsbSehitlerimiz, type MsbSehitRecord } from "./msb-sehitlerimiz.js";
import { isMartyrdomAfterOctober2025 } from "./mehmetcik-sehitler-parse.js";
import { ensureVkdModuleTables, isMissingRelationError } from "./ensure-vkd-module-tables.js";
import { resolveGoalgoDataPath } from "./goalgo-root.js";

const MSB_LIST_URL = "https://www.msb.gov.tr/SehitVefat/Sehitlerimiz";
const MEHMETCIK_SOURCE = "https://www.mehmetcik.org.tr/sehitlerimiz";

const BULK_PATH = resolveGoalgoDataPath("vkd", "msb-sehitler-bulk.json");

function buildSearchText(row: MsbSehitRecord): string {
  return `${row.name} ${row.rank} ${row.registry} ${row.notice} ${row.martyrdomDate ?? ""}`
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRecord(raw: unknown): MsbSehitRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? o.msbId ?? "").trim();
  const name = String(o.name ?? "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    rank: String(o.rank ?? "").trim(),
    registry: String(o.registry ?? "").trim(),
    notice: String(o.notice ?? "").trim(),
    martyrdomDate: o.martyrdomDate != null ? String(o.martyrdomDate) : null,
    year: o.year != null && Number.isFinite(Number(o.year)) ? Number(o.year) : null,
    imagePath: String(o.imagePath ?? "").trim(),
  };
}

function loadBundledRecords(): MsbSehitRecord[] {
  if (!existsSync(BULK_PATH)) return [];
  try {
    const bulk = JSON.parse(readFileSync(BULK_PATH, "utf8")) as { records?: unknown[] };
    return (bulk.records ?? []).map(normalizeRecord).filter((r): r is MsbSehitRecord => r != null);
  } catch {
    return [];
  }
}

export type MsbSehitlerSyncResult = {
  added: number;
  updated: number;
  total: number;
  fetchedAt: string;
  sourceUrl: string;
  scraped?: number;
};

export async function upsertMsbSehitlerRecords(
  records: unknown[],
  sourceLabel = "import",
): Promise<MsbSehitlerSyncResult> {
  await ensureVkdModuleTables();
  const parsed = records.map(normalizeRecord).filter((r): r is MsbSehitRecord => r != null);
  const now = new Date().toISOString();
  const ids = parsed.map((r) => r.id).filter(Boolean);
  const existingRows =
    ids.length > 0
      ? await db
          .select({ msbId: vkdMsbSehitlerTable.msbId })
          .from(vkdMsbSehitlerTable)
          .where(inArray(vkdMsbSehitlerTable.msbId, ids))
      : [];
  const existingSet = new Set(existingRows.map((r) => r.msbId));

  let added = 0;
  let updated = 0;

  for (const row of parsed) {
    const payload = {
      msbId: row.id,
      name: row.name,
      rank: row.rank,
      registry: row.registry,
      notice: row.notice,
      martyrdomDate: row.martyrdomDate ?? "",
      year: row.year,
      imagePath: row.imagePath,
      searchText: buildSearchText(row),
      updatedAt: now,
    };
    if (existingSet.has(row.id)) {
      await db.update(vkdMsbSehitlerTable).set(payload).where(eq(vkdMsbSehitlerTable.msbId, row.id));
      updated += 1;
    } else {
      await db.insert(vkdMsbSehitlerTable).values({ ...payload, firstSeenAt: now });
      existingSet.add(row.id);
      added += 1;
    }
  }

  const [totalRow] = await db.select({ total: count() }).from(vkdMsbSehitlerTable);

  return {
    added,
    updated,
    total: Number(totalRow?.total ?? 0),
    fetchedAt: now,
    sourceUrl: sourceLabel === "mehmetcik-bulk" ? MEHMETCIK_SOURCE : MSB_LIST_URL,
  };
}

/** MSB'den yalnızca Ekim 2025 sonrası şehitleri kazır ve DB'ye yazar. */
export async function mergeMsbRecentFromScrape(): Promise<MsbSehitlerSyncResult & { scraped: number }> {
  const scraped = await scrapeMsbSehitlerimiz();
  const recent = scraped.filter(isMartyrdomAfterOctober2025);
  const result = await upsertMsbSehitlerRecords(recent, "msb-recent");
  return { ...result, scraped: recent.length, sourceUrl: MSB_LIST_URL };
}

export async function syncMsbSehitlerToDb(): Promise<MsbSehitlerSyncResult & { msbScrapeError?: string }> {
  let bulkResult: MsbSehitlerSyncResult | null = null;
  const bundled = loadBundledRecords();
  if (bundled.length > 0) {
    bulkResult = await upsertMsbSehitlerRecords(bundled, "mehmetcik-bulk");
  }

  try {
    const recent = await mergeMsbRecentFromScrape();
    if (bulkResult) {
      return {
        ...recent,
        added: bulkResult.added + recent.added,
        updated: bulkResult.updated + recent.updated,
        total: recent.total,
      };
    }
    return recent;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (bulkResult) {
      return { ...bulkResult, msbScrapeError: message, scraped: 0 };
    }
    throw err;
  }
}

export async function listMsbSehitlerFromDb(): Promise<{
  items: Array<{
    id: string;
    name: string;
    rank: string;
    registry: string;
    notice: string;
    martyrdomDate: string | null;
    year: number | null;
    imagePath: string;
  }>;
  total: number;
  fetchedAt: string | null;
  sourceUrl: string;
}> {
  try {
    await ensureVkdModuleTables();
    const rows = await db
      .select({
        msbId: vkdMsbSehitlerTable.msbId,
        name: vkdMsbSehitlerTable.name,
        rank: vkdMsbSehitlerTable.rank,
        registry: vkdMsbSehitlerTable.registry,
        notice: vkdMsbSehitlerTable.notice,
        martyrdomDate: vkdMsbSehitlerTable.martyrdomDate,
        year: vkdMsbSehitlerTable.year,
        imagePath: vkdMsbSehitlerTable.imagePath,
        updatedAt: vkdMsbSehitlerTable.updatedAt,
      })
      .from(vkdMsbSehitlerTable)
      .orderBy(desc(vkdMsbSehitlerTable.year), asc(vkdMsbSehitlerTable.name));

    const latest = rows.reduce<string | null>((acc, row) => {
      if (!row.updatedAt) return acc;
      if (!acc || row.updatedAt > acc) return row.updatedAt;
      return acc;
    }, null);

    return {
      items: rows.map((row) => ({
        id: row.msbId,
        name: row.name,
        rank: row.rank,
        registry: row.registry,
        notice: row.notice,
        martyrdomDate: row.martyrdomDate || null,
        year: row.year,
        imagePath: row.imagePath,
      })),
      total: rows.length,
      fetchedAt: latest,
      sourceUrl: MEHMETCIK_SOURCE,
    };
  } catch (err) {
    if (isMissingRelationError(err)) {
      await ensureVkdModuleTables();
      return listMsbSehitlerFromDb();
    }
    throw err;
  }
}

export async function getMsbSehitlerimizPayload(forceRefresh = false) {
  try {
    if (forceRefresh) {
      const listedBefore = await listMsbSehitlerFromDb();
      const bundled = loadBundledRecords();
      if (listedBefore.total === 0 && bundled.length > 0) {
        await upsertMsbSehitlerRecords(bundled, "mehmetcik-bulk");
      }
      const sync = await mergeMsbRecentFromScrape();
      const listed = await listMsbSehitlerFromDb();
      return {
        items: listed.items,
        fetchedAt: sync.fetchedAt,
        sourceUrl: listed.sourceUrl,
        total: listed.total,
        sync,
      };
    }

    const listed = await listMsbSehitlerFromDb();
    if (listed.total > 0) {
      return {
        items: listed.items,
        fetchedAt: listed.fetchedAt ?? new Date().toISOString(),
        sourceUrl: listed.sourceUrl,
        total: listed.total,
      };
    }

    const bundledRecords = loadBundledRecords();
    if (bundledRecords.length > 0) {
      try {
        const sync = await upsertMsbSehitlerRecords(bundledRecords, "mehmetcik-bulk");
        const afterSync = await listMsbSehitlerFromDb();
        if (afterSync.total > 0) {
          return {
            items: afterSync.items,
            fetchedAt: sync.fetchedAt,
            sourceUrl: afterSync.sourceUrl,
            total: afterSync.total,
          };
        }
      } catch {
        // DB yazılamazsa dosyadan döndür
      }
      return {
        items: bundledRecords.map((row) => ({
          id: row.id,
          name: row.name,
          rank: row.rank,
          registry: row.registry,
          notice: row.notice,
          martyrdomDate: row.martyrdomDate,
          year: row.year,
          imagePath: row.imagePath,
        })),
        fetchedAt: new Date().toISOString(),
        sourceUrl: MEHMETCIK_SOURCE,
        total: bundledRecords.length,
        source: "file-fallback" as const,
      };
    }

    return {
      items: [],
      fetchedAt: new Date().toISOString(),
      sourceUrl: MEHMETCIK_SOURCE,
      total: 0,
    };
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
    await ensureVkdModuleTables();
    const bundledRecords = loadBundledRecords();
    if (bundledRecords.length > 0) {
      return {
        items: bundledRecords.map((row) => ({
          id: row.id,
          name: row.name,
          rank: row.rank,
          registry: row.registry,
          notice: row.notice,
          martyrdomDate: row.martyrdomDate,
          year: row.year,
          imagePath: row.imagePath,
        })),
        fetchedAt: new Date().toISOString(),
        sourceUrl: MEHMETCIK_SOURCE,
        total: bundledRecords.length,
        source: "file-fallback" as const,
      };
    }
    throw err;
  }
}
