/**
 * Haber cluster şeması — NEWS_DATABASE_URL üzerinde (ana DB'den ayrı).
 * İdempotent. Acil durum: SKIP_NEWS_DB_MIGRATE=1
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const goalgoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(goalgoRoot, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

if (process.env.SKIP_NEWS_DB_MIGRATE === "1") {
  console.warn("[news-db-migrate] SKIP_NEWS_DB_MIGRATE=1 — haber migrasyonu atlandı.");
  process.exit(0);
}

function resolveNewsDatabaseUrl() {
  for (const key of ["NEWS_DATABASE_URL", "NEWS_DATABASE_PRIVATE_URL", "NEWS_DATABASE_PUBLIC_URL"]) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

const newsDatabaseUrl = resolveNewsDatabaseUrl();
if (!newsDatabaseUrl) {
  console.log("[news-db-migrate] NEWS_DATABASE_URL tanımlı değil — atlanıyor (ana DB kullanılıyor).");
  process.exit(0);
}

const migrationsFolder = path.resolve(goalgoRoot, "lib/db/migrations-news");
const pool = new pg.Pool({ connectionString: newsDatabaseUrl });
const db = drizzle(pool);

let exitCode = 0;
try {
  console.log("[news-db-migrate] klasör:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[news-db-migrate] tamam");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[news-db-migrate] hata:", msg.slice(0, 500));
  exitCode = 1;
} finally {
  await pool.end();
}
process.exit(exitCode);
