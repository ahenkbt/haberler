/**
 * turkatahaber.com & yerel.net.tr — Cumha kamu-yerel seed.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:kamu-yerel
 *   DRY_RUN=1 … (katalog özeti; DB gerekmez)
 */
import {
  buildKamuYerelLayoutJson,
  KAMU_YEREL_SITES,
  TURKATAHABER_DOMAIN,
  TURKATAHABER_SLUG,
} from "../src/lib/hm-kamu-yerel-sites.js";
import { buildKamuYerelHmNewsSiteRssFeedRows } from "../src/lib/hm-cumha-kamu-yerel-catalog.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    const layout = buildKamuYerelLayoutJson(KAMU_YEREL_SITES[0]!);
    console.log(
      JSON.stringify(
        {
          slugs: KAMU_YEREL_SITES.map((s) => s.slug),
          domains: KAMU_YEREL_SITES.map((s) => s.domain),
          rssRowCount: buildKamuYerelHmNewsSiteRssFeedRows().length,
          sample: { slug: TURKATAHABER_SLUG, domain: TURKATAHABER_DOMAIN, mansetCategorySlug: layout.mansetCategorySlug },
        },
        null,
        2,
      ),
    );
    return;
  }
  const { ensureKamuYerelSites } = await import("../src/lib/hm-kamu-yerel-seed.js");
  const row = await ensureKamuYerelSites();
  console.log(JSON.stringify(row, null, 2));
  if (row.sites.some((s) => s.action === "error")) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
