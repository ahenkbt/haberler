/**
 * Post-migrate smoke: kritik migration etiketleri ve transport tabloları.
 * Kullanım: DATABASE_URL=... pnpm --filter @workspace/api-server run db:smoke
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(goalgoRoot, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_PRIVATE_URL?.trim() ||
  process.env.DATABASE_PUBLIC_URL?.trim() ||
  "";

if (!databaseUrl) {
  console.error("[db-smoke] DATABASE_URL gerekli.");
  process.exit(1);
}

const REQUIRED_TABLES = [
  "transport_requests",
  "transport_vehicles",
  "transport_request_status_events",
];

function journalTagsOnDisk(): Set<string> {
  const dir = path.join(goalgoRoot, "lib/db/migrations");
  return new Set(readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => f.slice(0, -4)));
}

const journal = JSON.parse(readFileSync(path.join(goalgoRoot, "lib/db/migrations/meta/_journal.json"), "utf8")) as {
  entries: { tag: string }[];
};
const journalTags = new Set(journal.entries.map((e) => e.tag));
const diskTags = journalTagsOnDisk();
const orphans = [...diskTags].filter((t) => !journalTags.has(t)).sort();
const missingFiles = [...journalTags].filter((t) => !diskTags.has(t)).sort();

if (orphans.length || missingFiles.length) {
  console.error("[db-smoke] journal drift:");
  if (orphans.length) console.error("  disk without journal:", orphans.join(", "));
  if (missingFiles.length) console.error("  journal without file:", missingFiles.join(", "));
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
let failed = false;

try {
  const { rows: applied } = await pool.query(`SELECT COUNT(*)::int AS n FROM drizzle.__drizzle_migrations`);
  const appliedCount = applied[0]?.n ?? 0;
  if (appliedCount < journal.entries.length) {
    console.error(
      `[db-smoke] FAIL migrations pending: applied ${appliedCount}, journal ${journal.entries.length} — run pnpm run db:migrate`,
    );
    failed = true;
  } else {
    console.log(`[db-smoke] OK migrations applied: ${appliedCount}/${journal.entries.length}`);
  }

  for (const table of REQUIRED_TABLES) {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
      [table],
    );
    if (!rows.length) {
      console.error(`[db-smoke] FAIL missing table: ${table}`);
      failed = true;
    } else {
      console.log(`[db-smoke] OK table exists: ${table}`);
    }
  }

  const { rows: vendorCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name IN ('membership_tier', 'about_html')`,
  );
  const colSet = new Set(vendorCols.map((r: { column_name: string }) => r.column_name));
  for (const col of ["membership_tier", "about_html"]) {
    if (!colSet.has(col)) {
      console.error(`[db-smoke] FAIL vendors.${col} missing (0027/0028)`);
      failed = true;
    } else {
      console.log(`[db-smoke] OK vendors.${col}`);
    }
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[db-smoke] error:", msg);
  failed = true;
} finally {
  await pool.end();
}

if (failed) {
  console.error("[db-smoke] FAILED");
  process.exit(1);
}
console.log("[db-smoke] PASS");
