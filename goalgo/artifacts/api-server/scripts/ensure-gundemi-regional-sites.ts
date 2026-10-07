/**
 * gundemi.org 8 bölgesel HM sitesini Neon/Postgres'e yazar.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:gundemi-bolge
 *   DRY_RUN=1 … (yalnızca katalog yazdırır; DB gerekmez)
 */
import { GUNDEMI_REGIONAL_SITES } from "../src/lib/hm-gundemi-regional-sites.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    console.log(
      JSON.stringify(
        GUNDEMI_REGIONAL_SITES.map((s) => ({
          slug: s.slug,
          domain: s.domain,
          displayName: s.displayName,
          theme: s.hmYsMansetPreset,
          primary: s.hmPrimaryColor,
          logoPath: s.logoPath,
        })),
        null,
        2,
      ),
    );
    return;
  }
  // Dynamic import: `@workspace/db` import-time bağlantı kurar; DRY_RUN DB istemez.
  const { ensureGundemiRegionalSites } = await import("../src/lib/hm-gundemi-regional-seed.js");
  const rows = await ensureGundemiRegionalSites();
  console.log(JSON.stringify(rows, null, 2));
  if (rows.some((r) => r.action === "error")) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
