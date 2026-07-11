/**
 * Production / Railway: boş Postgres'e tam şema uygular (lib/db/migrations).
 * İdempotent — tekrar çalıştırmak güvenli. Acil durum: SKIP_DB_MIGRATE=1
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

if (process.env.SKIP_DB_MIGRATE === "1") {
  console.warn("[db-migrate] SKIP_DB_MIGRATE=1 — migrasyon atlandı.");
  console.warn(
    "[db-migrate] Şemayı güncellemek için: SKIP kaldır + redeploy, veya DATABASE_URL ile bu dizinde `pnpm run db:migrate`.",
  );
  process.exit(0);
}

function resolveDatabaseUrl() {
  for (const key of ["DATABASE_URL", "DATABASE_PRIVATE_URL", "DATABASE_PUBLIC_URL"]) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "[db-migrate] DATABASE_URL tanımlı değil (DATABASE_PRIVATE_URL / DATABASE_PUBLIC_URL da yok).",
  );
  console.error(
    "[db-migrate] Railway: PostgreSQL servisini API ile linkleyin; SKIP_DB_MIGRATE migrate’i atlar ama API yine DB ister.",
  );
  process.exit(1);
}

const migrationsFolder = path.resolve(goalgoRoot, "lib/db/migrations");

const pool = new pg.Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

let exitCode = 0;
try {
  console.log("[db-migrate] klasör:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[db-migrate] tamam");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[db-migrate] hata:", msg.slice(0, 500));
  if (msg.length > 500) console.error("[db-migrate] (mesaj kısaltıldı — tam SQL loglanmaz)");
  exitCode = 1;
} finally {
  await pool.end();
}
// Açık çıkış: Railway / pre-deploy’da asılı süreç kalmaması için
process.exit(exitCode);
