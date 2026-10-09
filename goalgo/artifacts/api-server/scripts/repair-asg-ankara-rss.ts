/**
 * ankarasehirgazetesi.com (ASG) + AHG prod temizlik:
 * 1) Ankara kategorisindeki ulusal/uluslararası haberleri uygun kategoriye taşır
 * 2) rss-{id} slug'larını başlık tabanlı slug'a çevirir
 *
 * Dry-run:
 *   cd goalgo/artifacts/api-server && node --import tsx ./scripts/repair-asg-ankara-rss.ts --dry-run
 * Uygula:
 *   cd goalgo/artifacts/api-server && node --import tsx ./scripts/repair-asg-ankara-rss.ts --apply
 * Belirli slug'lar (önce hedef, sonra tam tarama):
 *   ... --apply --slugs=rss-341569,rss-342598
 *
 * Prod: DATABASE_URL + NEWS_DATABASE_URL; NEWS_DB_WRITE=dual (PHP twilight-pine aynası).
 */
import { getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { isAsgHmNewsSiteRow } from "../src/lib/hm-asg-editor-repair.js";
import { purgeHmSitePublicEdgeCache } from "../src/lib/hm-public-cache-purge.js";
import { recategorizeMisclassifiedAnkaraBatch } from "../src/lib/recategorizeMisclassifiedAnkara.js";
import { repairRssNumericSlugsBatch } from "../src/lib/repairRssNumericSlugs.js";
import { ensureAsgAhgLiveDomains } from "./ensure-asg-ahg-rebrand-domains.js";

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

function configureDualWriteForProd(): void {
  if (process.env.NEWS_DATABASE_URL?.trim() && !process.env.NEWS_DB_WRITE?.trim()) {
    process.env.NEWS_DB_WRITE = "dual";
  }
}

async function runRecategorizePass(label: string, slugList?: string[]) {
  const cat = await recategorizeMisclassifiedAnkaraBatch({
    dryRun,
    limit: 5000,
    slugs: slugList,
  });
  console.log(label, cat);
  return cat;
}

async function main() {
  // Existing Repair ASG workflow: --slugs=rebrand-asg-ahg-domains writes both Neons and stops.
  // It must not recategorize or rewrite news slugs.
  if (slugs?.length === 1 && slugs[0] === "rebrand-asg-ahg-domains") {
    if (dryRun) {
      console.log("[repair-asg-ankara-rss] rebrand dry-run (no writes)");
      return;
    }
    await ensureAsgAhgLiveDomains();
    return;
  }
  configureDualWriteForProd();
  console.log("[repair-asg-ankara-rss]", {
    dryRun,
    slugs: slugs ?? "(all rss-\\d+ for slug repair)",
    newsDbWrite: process.env.NEWS_DB_WRITE ?? "main",
    hasNewsDb: Boolean(process.env.NEWS_DATABASE_URL?.trim()),
  });

  if (slugs?.length) {
    await runRecategorizePass("ankara recategorize (target slugs, main DB)", slugs);
  }
  await runRecategorizePass("ankara recategorize (full, main DB)");

  if (process.env.NEWS_DATABASE_URL?.trim()) {
    const prevRead = process.env.NEWS_DB_READ;
    const prevWrite = process.env.NEWS_DB_WRITE;
    process.env.NEWS_DB_READ = "news";
    process.env.NEWS_DB_WRITE = "news";
    try {
      if (slugs?.length) {
        await runRecategorizePass("ankara recategorize (target slugs, PHP/news DB)", slugs);
      }
      await runRecategorizePass("ankara recategorize (full, PHP/news DB)");
    } finally {
      if (prevRead === undefined) delete process.env.NEWS_DB_READ;
      else process.env.NEWS_DB_READ = prevRead;
      if (prevWrite === undefined) delete process.env.NEWS_DB_WRITE;
      else process.env.NEWS_DB_WRITE = prevWrite;
    }
  }

  const slug = await repairRssNumericSlugsBatch({ dryRun, limit: 2000, slugs });
  console.log("rss slug repair", slug);

  if (!dryRun) {
    const sites = (await getNewsDbForRead().select().from(hmNewsSitesTable)).filter(isAsgHmNewsSiteRow);
    const purgeSlugs = slugs?.length ? slugs : undefined;
    for (const site of sites) {
      const purge = await purgeHmSitePublicEdgeCache({
        siteId: site.id,
        slug: site.slug,
        domain: site.domain,
        domain2: site.domain2,
        domain3: site.domain3,
        newsSlugs: purgeSlugs,
      });
      console.log("visitor cache purge", site.slug, {
        cfPurged: purge.cfPurged,
        urlCount: purge.urls.length,
        cfSkippedReason: purge.cfSkippedReason,
      });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
