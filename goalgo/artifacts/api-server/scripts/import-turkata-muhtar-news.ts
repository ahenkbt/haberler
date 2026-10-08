/**
 * turkatahaber.com — Haberler.com /muhtar/ → kategori `muhtar` (~100 haber).
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run import:turkata-muhtar
 *
 * Ortam: DATABASE_URL + NEWS_DATABASE_URL; NEWS_DB_WRITE=dual (PHP twilight-pine).
 * İsteğe bağlı: SKIP_SEED=1 SKIP_RUN=1 SYNC_PHP=0
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { importTurkataMuhtarNews } from "../src/lib/hm-turkata-muhtar-import.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function syncPhpNewsFull(siteSlug: string) {
  if (!process.env.NEWS_DATABASE_URL?.trim()) {
    console.warn("[import:turkata-muhtar] NEWS_DATABASE_URL yok — PHP news sync atlandı");
    return;
  }
  const sync = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      path.join(scriptDir, "sync-php-neon-news.ts"),
      "--apply",
      `--site-slug=${siteSlug}`,
      "--batch=200",
    ],
    { cwd: scriptDir, stdio: "inherit" },
  );
  if (sync.status !== 0) process.exitCode = sync.status ?? 1;
}

async function main() {
  if (process.env.NEWS_DATABASE_URL?.trim() && !process.env.NEWS_DB_WRITE?.trim()) {
    process.env.NEWS_DB_WRITE = "dual";
  }

  const result = await importTurkataMuhtarNews({
    skipSeed: process.env.SKIP_SEED === "1",
    skipRun: process.env.SKIP_RUN === "1",
  });
  console.log(JSON.stringify(result, null, 2));

  if (result.siteId == null || result.campaignId == null) {
    console.error("[import:turkata-muhtar] site veya kampanya oluşturulamadı");
    process.exitCode = 1;
    return;
  }

  if (process.env.SYNC_PHP !== "0") {
    syncPhpNewsFull("turkatahaber");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
