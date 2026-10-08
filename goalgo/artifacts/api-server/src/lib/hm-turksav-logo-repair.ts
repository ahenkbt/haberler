/**
 * TürkSav — layout_json logo/favicon onarımı (panel Neon + PHP twilight-pine).
 * Mevcut layout alanlarını korur; yalnızca logoUrl / faviconUrl hizalar.
 * Yerel / Yeşil Vatan satırlarına dokunmaz.
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
  applyTurksavLogoToLayout,
  TURKSAV_DOMAIN,
  TURKSAV_SLUG,
  turksavLayoutNeedsLogoRepair,
} from "./hm-turksav-site.js";

export type TurksavLogoRepairResult = {
  slug: typeof TURKSAV_SLUG;
  domain: typeof TURKSAV_DOMAIN;
  siteId: number | null;
  action: "updated" | "unchanged" | "missing" | "error";
  phpMirrored: boolean;
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

async function findTurksavSite(): Promise<{
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

  const byDomain = rows.find(
    (r) =>
      normalizeHost(r.domain) === TURKSAV_DOMAIN ||
      normalizeHost(r.domain2) === TURKSAV_DOMAIN ||
      normalizeHost(r.domain3) === TURKSAV_DOMAIN,
  );
  if (byDomain) return byDomain;

  const bySlug = rows
    .filter((r) => String(r.slug || "").trim().toLowerCase() === TURKSAV_SLUG)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.id - b.id)[0];
  return bySlug ?? null;
}

export async function ensureTurksavLogo(): Promise<TurksavLogoRepairResult> {
  try {
    const site = await findTurksavSite();
    if (!site?.id) {
      return {
        slug: TURKSAV_SLUG,
        domain: TURKSAV_DOMAIN,
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
    const { layout: next, changed } = applyTurksavLogoToLayout(layout);
    const layoutJson = JSON.stringify(next);

    if (changed || turksavLayoutNeedsLogoRepair(site.layoutJson)) {
      await dualWriteUpdate(
        hmNewsSitesTable,
        { layoutJson, updatedAt: new Date() },
        eq(hmNewsSitesTable.id, site.id),
      );
      const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.id, layoutJson).catch((err: unknown) => ({
        mirrored: false,
        reason: err instanceof Error ? err.message : String(err),
      }));
      logger.info(
        { siteId: site.id, mirrored: mirror.mirrored, reason: (mirror as { reason?: string }).reason },
        "[turksav] logo layout güncellendi",
      );
      return {
        slug: TURKSAV_SLUG,
        domain: TURKSAV_DOMAIN,
        siteId: site.id,
        action: "updated",
        phpMirrored: !!mirror.mirrored,
      };
    }

    const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.id, layoutJson).catch(() => ({
      mirrored: false,
    }));
    return {
      slug: TURKSAV_SLUG,
      domain: TURKSAV_DOMAIN,
      siteId: site.id,
      action: "unchanged",
      phpMirrored: !!mirror.mirrored,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e }, "[turksav] logo repair failed");
    return {
      slug: TURKSAV_SLUG,
      domain: TURKSAV_DOMAIN,
      siteId: null,
      action: "error",
      phpMirrored: false,
      detail,
    };
  }
}

/** Meta/wake yolları: slug veya domain ile TürkSav mı? */
export function isTurksavSiteRef(slugOrDomain: string | null | undefined): boolean {
  const key = String(slugOrDomain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return key === TURKSAV_SLUG || key === TURKSAV_DOMAIN;
}
