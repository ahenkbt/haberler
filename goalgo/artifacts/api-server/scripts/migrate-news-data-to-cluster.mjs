/**
 * Mevcut haber verilerini ana DB'den NEWS_DATABASE_URL'e kopyalar (tek seferlik, idempotent).
 * Çalıştırma: NEWS_DATABASE_URL dolu iken `node scripts/migrate-news-data-to-cluster.mjs`
 * pg_dump yoksa Node ile satır satır kopyalar; pg_dump varsa şema-dışı dump da denenebilir.
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

const NEWS_TABLES = [
  "hm_news_sites",
  "categories",
  "authors",
  "news",
  "hm_site_editors",
  "hm_makaleler",
  "hm_content_pool_items",
  "hm_ai_jobs",
  "rss_campaigns",
  "rss_logs",
  "ai_settings",
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

if (!mainUrl) {
  console.error("[news-data-migrate] DATABASE_URL gerekli.");
  process.exit(1);
}
if (!newsUrl) {
  console.error("[news-data-migrate] NEWS_DATABASE_URL gerekli.");
  process.exit(1);
}

async function newsDbHasAnyData(pool) {
  for (const table of NEWS_TABLES) {
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
    if ((r.rows[0]?.c ?? 0) > 0) return true;
  }
  return false;
}

async function resetSequences(pool, table) {
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence($1, 'id'),
      COALESCE((SELECT MAX(id) FROM ${table}), 1),
      (SELECT MAX(id) IS NOT NULL FROM ${table})
    )
  `, [table]);
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

async function copyTable(main, news, table) {
  const { rows } = await main.query(`SELECT * FROM ${table} ORDER BY id`);
  if (rows.length === 0) {
    console.log(`[news-data-migrate] ${table}: boş, atlandı`);
    return 0;
  }
  const sourceCols = Object.keys(rows[0]);
  const targetCols = new Set(await tableColumns(news, table));
  const cols = sourceCols.filter((col) => targetCols.has(col));
  const skippedCols = sourceCols.filter((col) => !targetCols.has(col));
  if (!cols.includes("id")) {
    throw new Error(`${table}: hedef tabloda id kolonu yok`);
  }
  if (skippedCols.length) {
    console.warn(`[news-data-migrate] ${table}: hedefte olmayan kolonlar atlandı: ${skippedCols.join(", ")}`);
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
    await news.query(
      `INSERT INTO ${table} (${colList}) VALUES (${vals.join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
      params,
    );
    copied++;
  }
  await resetSequences(news, table);
  console.log(`[news-data-migrate] ${table}: ${copied} satır`);
  return copied;
}

async function copyWikiSettings(main, news) {
  const { rows } = await main.query(`
    SELECT wiki_featured, wiki_encyclopedia_ui
    FROM site_settings
    ORDER BY id
    LIMIT 1
  `);
  const row = rows[0] ?? {};
  await news.query(
    `INSERT INTO wiki_settings (id, wiki_featured, wiki_encyclopedia_ui, updated_at)
     VALUES (1, COALESCE($1::jsonb, '[]'::jsonb), $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET
       wiki_featured = EXCLUDED.wiki_featured,
       wiki_encyclopedia_ui = EXCLUDED.wiki_encyclopedia_ui,
       updated_at = now()`,
    [JSON.stringify(row.wiki_featured ?? []), row.wiki_encyclopedia_ui == null ? null : JSON.stringify(row.wiki_encyclopedia_ui)],
  );
  console.log("[news-data-migrate] wiki_settings: 1 satır");
}

function tryPgDumpRestore() {
  const tableArgs = NEWS_TABLES.flatMap((t) => ["-t", t]);
  const dump = spawnSync(
    "pg_dump",
    [mainUrl, "--data-only", "--inserts", "--no-owner", "--no-privileges", ...tableArgs],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (dump.error || dump.status !== 0) {
    console.log("[news-data-migrate] pg_dump kullanılamadı, Node kopyasına geçiliyor.");
    return false;
  }
  const restore = spawnSync("psql", [newsUrl], { input: dump.stdout, encoding: "utf8" });
  if (restore.error || restore.status !== 0) {
    console.warn("[news-data-migrate] pg_restore/psql başarısız, Node kopyasına geçiliyor.");
    return false;
  }
  console.log("[news-data-migrate] pg_dump ile veri aktarımı tamam");
  return true;
}

const mainPool = new pg.Pool({ connectionString: mainUrl });
const newsPool = new pg.Pool({ connectionString: newsUrl });

let exitCode = 0;
try {
  const targetHasData = await newsDbHasAnyData(newsPool);
  if (targetHasData && process.env.FORCE_NEWS_DATA_MIGRATE !== "1") {
    console.log(
      "[news-data-migrate] Haber DB'de veri var — atlanıyor (zorlamak için FORCE_NEWS_DATA_MIGRATE=1 veya SKIP_NEWS_DATA_MIGRATE=1)",
    );
    process.exit(0);
  }
  const usedDump = targetHasData ? false : tryPgDumpRestore();
  if (targetHasData) {
    console.log("[news-data-migrate] Haber DB'de veri var — idempotent Node upsert kopyası kullanılacak.");
  }
  if (!usedDump) {
    for (const table of NEWS_TABLES) {
      await copyTable(mainPool, newsPool, table);
    }
    await copyWikiSettings(mainPool, newsPool);
  } else {
    for (const table of NEWS_TABLES) {
      await resetSequences(newsPool, table);
    }
    await copyWikiSettings(mainPool, newsPool);
  }
  console.log("[news-data-migrate] tamam");
} catch (err) {
  console.error("[news-data-migrate] hata:", err instanceof Error ? err.message : err);
  exitCode = 1;
} finally {
  await mainPool.end();
  await newsPool.end();
}
process.exit(exitCode);
