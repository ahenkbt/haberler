/**
 * Fix Haber (fix.tc) HM satırını Neon/Postgres'e yazar.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:fixhaber
 *   DRY_RUN=1 … (yalnızca katalog yazdırır; DB gerekmez)
 */
import {
  buildFixHaberLayoutJson,
  FIXHABER_DOMAIN,
  FIXHABER_SITE,
  FIXHABER_SLUG,
  listFixHaberDomains,
} from "../src/lib/hm-fixhaber-site.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    const layout = buildFixHaberLayoutJson(FIXHABER_SITE);
    console.log(
      JSON.stringify(
        {
          slug: FIXHABER_SLUG,
          domain: FIXHABER_DOMAIN,
          domains: listFixHaberDomains(),
          displayName: FIXHABER_SITE.displayName,
          phpTheme: layout.phpTheme,
          frontend: layout.frontend,
          hmVitrinTheme: layout.hmVitrinTheme,
          hmYsSlogan: layout.hmYsSlogan,
          categories: FIXHABER_SITE.categories.map((c) => c.slug),
          sampleHeadlines: FIXHABER_SITE.sampleHeadlines.length,
        },
        null,
        2,
      ),
    );
    return;
  }
  const { ensureFixHaberSite } = await import("../src/lib/hm-fixhaber-seed.js");
  const row = await ensureFixHaberSite();
  console.log(JSON.stringify(row, null, 2));
  if (row.action === "error") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
