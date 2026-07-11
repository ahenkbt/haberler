/**
 * Site slug önekli yanlış global kategorileri siteye özel kategorilere taşır.
 *
 *   pnpm exec tsx scripts/consolidate-site-prefix-categories.ts
 *   pnpm exec tsx scripts/consolidate-site-prefix-categories.ts --apply
 *   pnpm exec tsx scripts/consolidate-site-prefix-categories.ts --apply --site=vkd,asg
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, "../../../.env") });
dotenvConfig({ path: path.join(__dirname, "../.env") });

function argVal(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL tanımlı değil.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const siteRaw = argVal("--site");
  const siteSlugs = siteRaw
    ? siteRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : undefined;

  const { runConsolidateSitePrefixCategories } = await import("../src/lib/consolidate-site-prefix-categories");
  const result = await runConsolidateSitePrefixCategories({ dryRun: !apply, siteSlugs });

  console.log(JSON.stringify(result, null, 2));
  if (!apply) {
    console.log("\nUygulamak için: --apply ekleyin");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
