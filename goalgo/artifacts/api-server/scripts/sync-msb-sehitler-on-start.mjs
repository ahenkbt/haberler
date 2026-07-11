/**
 * Şehitlerimiz bulk JSON + MSB (Ekim 2025 sonrası) → DB sync.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
const BULK_PATH = path.resolve(goalgoRoot, "data/vkd/msb-sehitler-bulk.json");
const MARKER_KEY = "msb-sehitler-bulk";
const BULK_VERSION = 1;

dotenv.config({ path: path.join(goalgoRoot, ".env") });

function resolveDatabaseUrl() {
  for (const key of ["DATABASE_URL", "DATABASE_PRIVATE_URL", "DATABASE_PUBLIC_URL"]) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export async function syncMsbSehitlerOnStart() {
  if (process.env.SKIP_MSB_SEHITLER_SYNC === "1") {
    console.warn("[msb-sehitler-sync] SKIP_MSB_SEHITLER_SYNC=1 — atlandı");
    return;
  }

  if (!resolveDatabaseUrl()) {
    console.warn("[msb-sehitler-sync] DATABASE_URL yok — atlandı");
    return;
  }

  if (!existsSync(BULK_PATH)) {
    console.warn("[msb-sehitler-sync] bulk dosyası yok — atlandı");
    return;
  }

  const { ensureVkdModuleTables } = await import("../src/lib/ensure-vkd-module-tables.ts");
  const { upsertMsbSehitlerRecords, mergeMsbRecentFromScrape } = await import("../src/lib/msb-sehitler-db.ts");
  const { db, vkdDataSyncMarkersTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  await ensureVkdModuleTables();

  const bulk = JSON.parse(readFileSync(BULK_PATH, "utf8"));
  const bulkVersion = Number(bulk.version ?? BULK_VERSION);
  const records = Array.isArray(bulk.records) ? bulk.records : [];

  const [marker] = await db
    .select()
    .from(vkdDataSyncMarkersTable)
    .where(eq(vkdDataSyncMarkersTable.key, MARKER_KEY))
    .limit(1);

  const markerVersion = Number(marker?.version ?? 0);
  const needsBulk = markerVersion < bulkVersion || !marker;

  if (needsBulk && records.length > 0) {
    console.log(`[msb-sehitler-sync] bulk yükleniyor (${records.length} kayıt, sürüm ${bulkVersion})…`);
    const result = await upsertMsbSehitlerRecords(records, "mehmetcik-bulk");
    await db
      .insert(vkdDataSyncMarkersTable)
      .values({
        key: MARKER_KEY,
        version: bulkVersion,
        recordCount: result.total,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: vkdDataSyncMarkersTable.key,
        set: {
          version: bulkVersion,
          recordCount: result.total,
          updatedAt: new Date().toISOString(),
        },
      });
    console.log(`[msb-sehitler-sync] bulk tamam (+${result.added} / ~${result.updated} güncellendi, toplam ${result.total})`);
  } else {
    console.log("[msb-sehitler-sync] bulk güncel — atlandı");
  }

  try {
    console.log("[msb-sehitler-sync] MSB Ekim 2025 sonrası kayıtlar kontrol ediliyor…");
    const merged = await mergeMsbRecentFromScrape();
    console.log(
      `[msb-sehitler-sync] MSB merge tamam (+${merged.added} yeni, ${merged.updated} güncellendi, ${merged.scraped} kazındı)`,
    );
  } catch (err) {
    console.warn("[msb-sehitler-sync] MSB kazıma atlandı:", err instanceof Error ? err.message : err);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  syncMsbSehitlerOnStart().catch((err) => {
    console.error("[msb-sehitler-sync] hata:", err);
    process.exit(1);
  });
}
