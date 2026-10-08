/**
 * PHP konsept siteleri — layout_json hmPrimaryColor/hmSecondaryColor onarımı + PHP Neon mirror.
 */
import { eq } from "drizzle-orm";
import {
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { mirrorHmSiteLayoutJsonToPhpNeon } from "./hm-php-layout-sync.js";
import {
  applyPhpConceptColorsToLayout,
  HM_PHP_CONCEPT_PALETTES,
  normalizePhpConceptHost,
  type PhpConceptPalette,
} from "./hm-php-concept-colors.js";

export type PhpConceptColorRepairRow = {
  slug: string;
  domain: string;
  siteId: number | null;
  action: "updated" | "unchanged" | "missing" | "error";
  phpMirrored: boolean;
  before?: { primary?: string; secondary?: string };
  after?: { primary?: string; secondary?: string };
  detail?: string;
};

function findSiteRow(
  rows: Array<{
    id: number;
    slug: string | null;
    domain: string | null;
    domain2: string | null;
    domain3: string | null;
    layoutJson: string | null;
    active: boolean | null;
  }>,
  palette: PhpConceptPalette,
) {
  const byDomain = rows.find(
    (r) =>
      normalizePhpConceptHost(r.domain) === palette.domain ||
      normalizePhpConceptHost(r.domain2) === palette.domain ||
      normalizePhpConceptHost(r.domain3) === palette.domain,
  );
  if (byDomain) return byDomain;
  return (
    rows
      .filter((r) => String(r.slug || "").trim().toLowerCase() === palette.slug)
      .sort((a, b) => Number(b.active) - Number(a.active) || a.id - b.id)[0] ?? null
  );
}

export async function ensurePhpConceptColorsForPalette(
  palette: PhpConceptPalette,
): Promise<PhpConceptColorRepairRow> {
  try {
    const rows = await getNewsDbForRead()
      .select({
        id: hmNewsSitesTable.id,
        slug: hmNewsSitesTable.slug,
        domain: hmNewsSitesTable.domain,
        domain2: hmNewsSitesTable.domain2,
        domain3: hmNewsSitesTable.domain3,
        layoutJson: hmNewsSitesTable.layoutJson,
        active: hmNewsSitesTable.active,
      })
      .from(hmNewsSitesTable);

    const site = findSiteRow(rows, palette);
    if (!site?.id) {
      return {
        slug: palette.slug,
        domain: palette.domain,
        siteId: null,
        action: "missing",
        phpMirrored: false,
        detail: "hm_news_sites satırı yok",
      };
    }

    let layout: Record<string, unknown> = {};
    try {
      layout = site.layoutJson ? (JSON.parse(String(site.layoutJson)) as Record<string, unknown>) : {};
    } catch {
      layout = {};
    }
    const before = {
      primary: String(layout.hmPrimaryColor ?? "") || undefined,
      secondary: String(layout.hmSecondaryColor ?? "") || undefined,
    };
    const { layout: next, changed } = applyPhpConceptColorsToLayout(layout, palette);
    const layoutJson = JSON.stringify(next);
    const after = { primary: palette.primary, secondary: palette.secondary };

    if (changed) {
      await dualWriteUpdate(
        hmNewsSitesTable,
        { layoutJson, updatedAt: new Date() },
        eq(hmNewsSitesTable.id, site.id),
      );
      const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.id, layoutJson).catch(
        (err: unknown) => ({
          mirrored: false,
          reason: err instanceof Error ? err.message : String(err),
        }),
      );
      logger.info(
        { siteId: site.id, slug: palette.slug, mirrored: mirror.mirrored },
        "[php-concept-colors] layout güncellendi",
      );
      return {
        slug: palette.slug,
        domain: palette.domain,
        siteId: site.id,
        action: "updated",
        phpMirrored: !!mirror.mirrored,
        before,
        after,
      };
    }

    const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.id, layoutJson).catch(() => ({
      mirrored: false,
    }));
    return {
      slug: palette.slug,
      domain: palette.domain,
      siteId: site.id,
      action: "unchanged",
      phpMirrored: !!mirror.mirrored,
      before,
      after,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e, slug: palette.slug }, "[php-concept-colors] repair failed");
    return {
      slug: palette.slug,
      domain: palette.domain,
      siteId: null,
      action: "error",
      phpMirrored: false,
      detail,
    };
  }
}

export async function ensureAllPhpConceptColors(): Promise<PhpConceptColorRepairRow[]> {
  const out: PhpConceptColorRepairRow[] = [];
  for (const palette of HM_PHP_CONCEPT_PALETTES) {
    out.push(await ensurePhpConceptColorsForPalette(palette));
  }
  return out;
}
