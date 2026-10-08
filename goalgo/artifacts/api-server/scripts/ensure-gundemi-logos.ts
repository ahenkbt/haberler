/**
 * gundemi.org apex + bölgesel logoUrl/faviconUrl onarımı (panel + PHP Neon).
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:gundemi-logos
 *   DRY_RUN=1 … (katalog)
 */
import {
  GUNDEMI_APEX_SITE,
  GUNDEMI_REGIONAL_SITES,
} from "../src/lib/hm-gundemi-regional-sites.js";
import { applyGundemiSiteLogoToLayout } from "../src/lib/hm-gundemi-logo-repair.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    const catalog = [GUNDEMI_APEX_SITE, ...GUNDEMI_REGIONAL_SITES];
    console.log(
      JSON.stringify(
        catalog.map((s) => {
          const { layout } = applyGundemiSiteLogoToLayout({}, s);
          return {
            slug: s.slug,
            domain: s.domain,
            logoUrl: layout.logoUrl,
            faviconUrl: layout.faviconUrl,
          };
        }),
        null,
        2,
      ),
    );
    return;
  }

  const { ensureAllGundemiLogos } = await import("../src/lib/hm-gundemi-logo-repair.js");
  const rows = await ensureAllGundemiLogos();
  console.log(JSON.stringify(rows, null, 2));
  if (rows.some((r) => r.action === "error" || r.action === "missing")) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
