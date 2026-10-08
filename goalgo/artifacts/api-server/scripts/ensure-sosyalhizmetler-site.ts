/**
 * Sosyal Hizmetler Haber (sosyalhizmetler.tr) HM satırını Neon/Postgres'e yazar.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:sosyalhizmetler
 *   DRY_RUN=1 … (yalnızca katalog yazdırır; DB gerekmez)
 */
import {
  buildSosyalHizmetlerLayoutJson,
  SOSYALHIZMETLER_DOMAIN,
  SOSYALHIZMETLER_SITE,
  SOSYALHIZMETLER_SLUG,
  listSosyalHizmetlerDomains,
} from "../src/lib/hm-sosyalhizmetler-site.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    const layout = buildSosyalHizmetlerLayoutJson(SOSYALHIZMETLER_SITE);
    console.log(
      JSON.stringify(
        {
          slug: SOSYALHIZMETLER_SLUG,
          domain: SOSYALHIZMETLER_DOMAIN,
          domains: listSosyalHizmetlerDomains(),
          displayName: SOSYALHIZMETLER_SITE.displayName,
          phpTheme: layout.phpTheme,
          frontend: layout.frontend,
          hmVitrinTheme: layout.hmVitrinTheme,
          hmYsSlogan: layout.hmYsSlogan,
          categories: SOSYALHIZMETLER_SITE.categories.map((c) => c.slug),
          sampleHeadlines: SOSYALHIZMETLER_SITE.sampleHeadlines.length,
        },
        null,
        2,
      ),
    );
    return;
  }
  const { ensureSosyalHizmetlerSite } = await import("../src/lib/hm-sosyalhizmetler-seed.js");
  const row = await ensureSosyalHizmetlerSite();
  console.log(JSON.stringify(row, null, 2));
  if (row.action === "error") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
