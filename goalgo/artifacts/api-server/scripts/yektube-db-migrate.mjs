/**
 * Yektube cluster şeması — YEKTUBE_DATABASE_URL üzerinde (ana DB'den ayrı).
 * İdempotent. Acil durum: SKIP_YEKTUBE_DB_MIGRATE=1
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolveYektubeDatabaseUrlFromEnv } from "./yektube-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const goalgoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(goalgoRoot, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

if (process.env.SKIP_YEKTUBE_DB_MIGRATE === "1") {
  console.warn("[yektube-db-migrate] SKIP_YEKTUBE_DB_MIGRATE=1 — yektube migrasyonu atlandı.");
  process.exit(0);
}

function resolveYektubeDatabaseUrl() {
  return resolveYektubeDatabaseUrlFromEnv(process.env);
}

const yektubeDatabaseUrl = resolveYektubeDatabaseUrl();
if (!yektubeDatabaseUrl) {
  console.log("[yektube-db-migrate] YEKTUBE_DATABASE_URL tanımlı değil — atlanıyor (ana DB kullanılıyor).");
  process.exit(0);
}

const migrationsFolder = path.resolve(goalgoRoot, "lib/db/migrations-yektube");
const pool = new pg.Pool({ connectionString: yektubeDatabaseUrl });
const db = drizzle(pool);

let exitCode = 0;
try {
  console.log("[yektube-db-migrate] klasör:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[yektube-db-migrate] tamam");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[yektube-db-migrate] hata:", msg.slice(0, 500));
  exitCode = 1;
} finally {
  await pool.end();
}
process.exit(exitCode);
