/**
 * Railway / Docker açılışında: drizzle klasöründeki SQL migrasyonlarını uygular.
 * drizzle-kit üretim imajında gerekmez.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const url = process.env["DATABASE_URL"]?.trim();
if (!url) {
  console.error("[db-migrate] DATABASE_URL yok");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../drizzle");

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder });
  console.log("[db-migrate] tamam");
} catch (e) {
  console.error("[db-migrate] hata", e);
  process.exit(1);
} finally {
  await pool.end();
}
