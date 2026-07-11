/**
 * Çanakkale şehit verisini data/vkd/canakkale-sehitleri batch dosyalarından DB'ye yazar.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
const DATA_DIR = path.resolve(goalgoRoot, "data/vkd/canakkale-sehitleri");
const MARKER_KEY = "canakkale-sehitleri";
const INSERT_BATCH = 500;

export async function syncCanakkaleSehitleriOnStart() {
  if (process.env.SKIP_VKD_SYNC === "1") return;

  const manifestPath = path.join(DATA_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.warn("[canakkale-sync] veri paketi yok — atlandı");
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const requiredVersion = Number(manifest?.dataSyncVersion ?? 1);
  const expectedCount = Number(manifest?.recordCount ?? 0);

  const { db, vkdCanakkaleSehitleriTable, vkdDataSyncMarkersTable } = await import("@workspace/db");
  const { eq, sql } = await import("drizzle-orm");
  const { ensureVkdModuleTables } = await import("../src/lib/ensure-vkd-module-tables.ts");
  await ensureVkdModuleTables();

  const [marker] = await db
    .select()
    .from(vkdDataSyncMarkersTable)
    .where(eq(vkdDataSyncMarkersTable.key, MARKER_KEY))
    .limit(1);

  if (marker && marker.version >= requiredVersion && marker.recordCount >= expectedCount) {
    console.log("[canakkale-sync] güncel — atlandı");
    return;
  }

  const batches = readdirSync(DATA_DIR)
    .filter((name) => /^batch-\d+\.json$/i.test(name))
    .sort();

  if (!batches.length) {
    console.warn("[canakkale-sync] batch dosyası yok — atlandı");
    return;
  }

  console.log(`[canakkale-sync] ${expectedCount} kayıt içe aktarılıyor (${batches.length} batch)…`);
  await db.delete(vkdCanakkaleSehitleriTable);

  let imported = 0;
  for (const name of batches) {
    const payload = JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf8"));
    const records = Array.isArray(payload?.records) ? payload.records : [];
    for (let i = 0; i < records.length; i += INSERT_BATCH) {
      const slice = records.slice(i, i + INSERT_BATCH).map((row) => ({
        serialNo: Number(row.serialNo),
        name: String(row.name ?? "—"),
        fatherName: String(row.fatherName ?? ""),
        birthYear: row.birthYear == null ? null : Number(row.birthYear),
        nickname: String(row.nickname ?? ""),
        province: String(row.province ?? ""),
        district: String(row.district ?? ""),
        bucak: String(row.bucak ?? ""),
        village: String(row.village ?? ""),
        branchClass: String(row.branchClass ?? ""),
        rank: String(row.rank ?? ""),
        unitText: String(row.unitText ?? ""),
        martyrdomPlace: String(row.martyrdomPlace ?? ""),
        martyrdomDate: String(row.martyrdomDate ?? ""),
        searchText: String(row.searchText ?? ""),
      }));
      if (slice.length) {
        await db.insert(vkdCanakkaleSehitleriTable).values(slice);
        imported += slice.length;
      }
    }
    console.log(`[canakkale-sync] ${name} tamam`);
  }

  const now = new Date().toISOString();
  if (marker) {
    await db
      .update(vkdDataSyncMarkersTable)
      .set({ version: requiredVersion, recordCount: imported, updatedAt: now })
      .where(eq(vkdDataSyncMarkersTable.key, MARKER_KEY));
  } else {
    await db.insert(vkdDataSyncMarkersTable).values({
      key: MARKER_KEY,
      version: requiredVersion,
      recordCount: imported,
      updatedAt: now,
    });
  }

  console.log(`[canakkale-sync] tamam (${imported} kayıt)`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  syncCanakkaleSehitleriOnStart().catch((err) => {
    console.error("[canakkale-sync] hata:", err);
    process.exit(1);
  });
}
