/**
 * Mevcut Yektube verilerini ana (veya haber) DB'den YEKTUBE_DATABASE_URL'e kopyalar (idempotent).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(goalgoRoot, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const YEKTUBE_TABLES = [
  "video_sources",
  "videos",
  "yektube_member_subscriptions",
  "yektube_watch_history",
  "yektube_playlists",
  "yektube_playlist_items",
  "yektube_member_prefs",
];

function resolveUrl(keys) {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

const mainUrl = resolveUrl(["DATABASE_URL", "DATABASE_PRIVATE_URL", "DATABASE_PUBLIC_URL"]);
const newsUrl = resolveUrl(["NEWS_DATABASE_URL", "NEWS_DATABASE_PRIVATE_URL", "NEWS_DATABASE_PUBLIC_URL"]);
const yektubeUrl = resolveUrl(["YEKTUBE_DATABASE_URL", "YEKTUBE_DATABASE_PRIVATE_URL", "YEKTUBE_DATABASE_PUBLIC_URL"]);

if (!mainUrl) {
  console.error("[yektube-data-migrate] DATABASE_URL gerekli.");
  process.exit(1);
}
if (!yektubeUrl) {
  console.error("[yektube-data-migrate] YEKTUBE_DATABASE_URL gerekli.");
  process.exit(1);
}

async function tableExists(pool, table) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table],
  );
  return (r.rowCount ?? 0) > 0;
}

async function countRows(pool, table) {
  if (!(await tableExists(pool, table))) return 0;
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return r.rows[0]?.c ?? 0;
}

async function pickSourcePool() {
  const mainPool = new pg.Pool({ connectionString: mainUrl });
  let best = { pool: mainPool, label: "main", total: 0 };
  for (const table of ["video_sources", "videos"]) {
    best.total += await countRows(mainPool, table);
  }
  if (newsUrl && newsUrl !== mainUrl) {
    const newsPool = new pg.Pool({ connectionString: newsUrl });
    let newsTotal = 0;
    for (const table of ["video_sources", "videos"]) {
      newsTotal += await countRows(newsPool, table);
    }
    if (newsTotal > best.total) {
      await mainPool.end();
      best = { pool: newsPool, label: "news", total: newsTotal };
    } else {
      await newsPool.end();
    }
  }
  console.log(`[yektube-data-migrate] kaynak: ${best.label} DB (video satır tahmini: ${best.total})`);
  return best.pool;
}

async function yektubeDbHasVideoData(pool) {
  return (await countRows(pool, "video_sources")) > 0 || (await countRows(pool, "videos")) > 0;
}

async function resetSequences(pool, table) {
  if (!(await tableExists(pool, table))) return;
  await pool.query(
    `
    SELECT setval(
      pg_get_serial_sequence($1, 'id'),
      COALESCE((SELECT MAX(id) FROM ${table}), 1),
      (SELECT MAX(id) IS NOT NULL FROM ${table})
    )
  `,
    [table],
  );
}

async function tableColumns(pool, table) {
  const { rows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );
  return rows.map((row) => String(row.column_name));
}

async function copyTable(source, target, table) {
  if (!(await tableExists(source, table))) {
    console.log(`[yektube-data-migrate] ${table}: kaynakta yok, atlandı`);
    return 0;
  }
  if (!(await tableExists(target, table))) {
    console.log(`[yektube-data-migrate] ${table}: hedefte yok, atlandı`);
    return 0;
  }
  const { rows } = await source.query(`SELECT * FROM ${table} ORDER BY id`);
  if (rows.length === 0) {
    console.log(`[yektube-data-migrate] ${table}: boş, atlandı`);
    return 0;
  }
  const sourceCols = Object.keys(rows[0]);
  const targetCols = new Set(await tableColumns(target, table));
  const cols = sourceCols.filter((col) => targetCols.has(col));
  const skippedCols = sourceCols.filter((col) => !targetCols.has(col));
  if (!cols.includes("id")) {
    throw new Error(`${table}: hedef tabloda id kolonu yok`);
  }
  if (skippedCols.length) {
    console.warn(`[yektube-data-migrate] ${table}: hedefte olmayan kolonlar atlandı: ${skippedCols.join(", ")}`);
  }
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const updateCols = cols.filter((c) => c !== "id");
  const updateSet = updateCols.length
    ? updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ")
    : `"id" = EXCLUDED."id"`;
  let copied = 0;
  for (const row of rows) {
    const vals = cols.map((_, i) => `$${i + 1}`);
    const params = cols.map((c) => row[c]);
    await target.query(
      `INSERT INTO ${table} (${colList}) VALUES (${vals.join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
      params,
    );
    copied++;
  }
  await resetSequences(target, table);
  console.log(`[yektube-data-migrate] ${table}: ${copied} satır`);
  return copied;
}

const yektubePool = new pg.Pool({ connectionString: yektubeUrl });

let exitCode = 0;
let sourcePool = null;
try {
  sourcePool = await pickSourcePool();
  const targetVideos = await countRows(yektubePool, "videos");
  const targetSources = await countRows(yektubePool, "video_sources");
  const sourceVideos = await countRows(sourcePool, "videos");
  const sourceSources = await countRows(sourcePool, "video_sources");
  const force = process.env.FORCE_YEKTUBE_DATA_MIGRATE === "1";

  if (
    !force &&
    targetVideos > 0 &&
    targetSources > 0 &&
    sourceVideos > 0 &&
    targetVideos >= sourceVideos &&
    targetSources >= sourceSources
  ) {
    console.log(
      `[yektube-data-migrate] hedefte zaten ${targetVideos} video / ${targetSources} kaynak — atlandı (FORCE_YEKTUBE_DATA_MIGRATE=1 ile zorla)`,
    );
    process.exit(0);
  }

  if (targetVideos > 0 || targetSources > 0) {
    console.log("[yektube-data-migrate] Yektube DB'de veri var — eksik satırlar için idempotent upsert.");
  }
  for (const table of YEKTUBE_TABLES) {
    await copyTable(sourcePool, yektubePool, table);
  }
  console.log("[yektube-data-migrate] tamam");
} catch (err) {
  console.error("[yektube-data-migrate] hata:", err instanceof Error ? err.message : err);
  exitCode = 1;
} finally {
  if (sourcePool) await sourcePool.end();
  await yektubePool.end();
}
process.exit(exitCode);
