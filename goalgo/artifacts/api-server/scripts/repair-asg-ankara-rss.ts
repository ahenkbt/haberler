/**
 * ankarasehirgazetesi.com (ASG) + AHG prod temizlik:
 * 1) Ankara kategorisindeki ulusal/uluslararası haberleri gündem'e taşır
 * 2) rss-{id} slug'larını başlık tabanlı slug'a çevirir
 *
 * Dry-run:
 *   cd goalgo/artifacts/api-server && node --import tsx ./scripts/repair-asg-ankara-rss.ts --dry-run
 * Uygula:
 *   cd goalgo/artifacts/api-server && node --import tsx ./scripts/repair-asg-ankara-rss.ts --apply
 * Belirli slug'lar:
 *   ... --apply --slugs=rss-340170,rss-340174
 */
import { recategorizeMisclassifiedAnkaraBatch } from "../src/lib/recategorizeMisclassifiedAnkara.js";
import { repairRssNumericSlugsBatch } from "../src/lib/repairRssNumericSlugs.js";

const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");
const slugsArg = args.find((a) => a.startsWith("--slugs="));
const slugs = slugsArg
  ? slugsArg
      .slice("--slugs=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : undefined;

async function main() {
  console.log("[repair-asg-ankara-rss]", { dryRun, slugs: slugs ?? "(all rss-\\d+)" });

  const cat = await recategorizeMisclassifiedAnkaraBatch({ dryRun, limit: 5000 });
  console.log("ankara recategorize", cat);

  const slug = await repairRssNumericSlugsBatch({ dryRun, limit: 2000, slugs });
  console.log("rss slug repair", slug);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
