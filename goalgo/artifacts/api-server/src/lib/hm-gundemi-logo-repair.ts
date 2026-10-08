/**
 * gundemi.org apex + bölgesel siteler — logoUrl/faviconUrl onarımı
 * (panel Neon + PHP twilight-pine mirror).
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
  GUNDEMI_APEX_SITE,
  GUNDEMI_REGIONAL_SITES,
  type GundemiRegionalSiteDef,
} from "./hm-gundemi-regional-sites.js";

export type GundemiLogoRepairResult = {
  slug: string;
  domain: string;
  siteId: number | null;
  action: "updated" | "unchanged" | "missing" | "error";
  phpMirrored: boolean;
  logoPath?: string;
  detail?: string;
};

function normalizeHost(raw: string | null | undefined): string {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

export function applyGundemiSiteLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
  def: GundemiRegionalSiteDef,
): { layout: Record<string, unknown>; changed: boolean } {
  const next =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  const logoPath = def.logoPath;
  let changed = false;
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const badLogo =
    !logo ||
    logo.toLowerCase().startsWith("data:image/") ||
    logo.includes("/sh/") ||
    logo.includes("/sosyalhizmetler/") ||
    logo.includes("/turkata/") ||
    (logo !== logoPath && !logo.endsWith(logoPath));
  const badFav =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon.includes("/sh/") ||
    favicon.includes("/sosyalhizmetler/") ||
    (favicon !== logoPath && !favicon.endsWith(logoPath));
  if (badLogo) {
    next.logoUrl = logoPath;
    changed = true;
  }
  if (badFav) {
    next.faviconUrl = logoPath;
    changed = true;
  }
  return { layout: next, changed };
}

async function findSiteByDef(def: GundemiRegionalSiteDef): Promise<{
  id: number;
  slug: string | null;
  layoutJson: string | null;
} | null> {
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

  const host = normalizeHost(def.domain);
  const byDomain = rows.find(
    (r) =>
      normalizeHost(r.domain) === host ||
      normalizeHost(r.domain2) === host ||
      normalizeHost(r.domain3) === host,
  );
  if (byDomain) return byDomain;

  const bySlug = rows
    .filter((r) => String(r.slug || "").trim().toLowerCase() === def.slug)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.id - b.id)[0];
  return bySlug ?? null;
}

export async function ensureGundemiSiteLogo(
  def: GundemiRegionalSiteDef,
): Promise<GundemiLogoRepairResult> {
  try {
    const site = await findSiteByDef(def);
    if (!site?.id) {
      return {
        slug: def.slug,
        domain: def.domain,
        siteId: null,
        action: "missing",
        phpMirrored: false,
        logoPath: def.logoPath,
        detail: "hm_news_sites satırı yok",
      };
    }

    let layout: Record<string, unknown> = {};
    try {
      layout = site.layoutJson
        ? (JSON.parse(String(site.layoutJson)) as Record<string, unknown>)
        : {};
    } catch {
      layout = {};
    }
    const { layout: next, changed } = applyGundemiSiteLogoToLayout(layout, def);
    const layoutJson = JSON.stringify(next);

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
        {
          siteId: site.id,
          slug: def.slug,
          mirrored: mirror.mirrored,
          reason: (mirror as { reason?: string }).reason,
        },
        "[gundemi] logo layout güncellendi",
      );
      return {
        slug: def.slug,
        domain: def.domain,
        siteId: site.id,
        action: "updated",
        phpMirrored: !!mirror.mirrored,
        logoPath: def.logoPath,
      };
    }

    const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.id, layoutJson).catch(() => ({
      mirrored: false,
    }));
    return {
      slug: def.slug,
      domain: def.domain,
      siteId: site.id,
      action: "unchanged",
      phpMirrored: !!mirror.mirrored,
      logoPath: def.logoPath,
    };
  } catch (err) {
    return {
      slug: def.slug,
      domain: def.domain,
      siteId: null,
      action: "error",
      phpMirrored: false,
      logoPath: def.logoPath,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Apex + 8 bölgesel. */
export async function ensureAllGundemiLogos(): Promise<GundemiLogoRepairResult[]> {
  const catalog = [GUNDEMI_APEX_SITE, ...GUNDEMI_REGIONAL_SITES];
  const out: GundemiLogoRepairResult[] = [];
  for (const def of catalog) {
    out.push(await ensureGundemiSiteLogo(def));
  }
  return out;
}
