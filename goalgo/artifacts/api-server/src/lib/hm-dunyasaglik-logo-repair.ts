/**
 * Dünya Sağlık — layout_json logo/favicon onarımı (panel Neon + PHP twilight-pine).
 * Mevcut layout alanlarını korur; yalnızca logoUrl / faviconUrl hizalar.
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
  applyDunyaSaglikLogoToLayout,
  DUNYASAGLIK_DOMAIN,
  DUNYASAGLIK_SLUG,
  dunyaSaglikLayoutNeedsLogoRepair,
} from "./hm-dunyasaglik-site.js";

export type DunyaSaglikLogoRepairResult = {
  slug: typeof DUNYASAGLIK_SLUG;
  domain: typeof DUNYASAGLIK_DOMAIN;
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

async function findDunyaSaglikSite(): Promise<{
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
      normalizeHost(r.domain) === DUNYASAGLIK_DOMAIN ||
      normalizeHost(r.domain2) === DUNYASAGLIK_DOMAIN ||
      normalizeHost(r.domain3) === DUNYASAGLIK_DOMAIN,
  );
  if (byDomain) return byDomain;

  const bySlug = rows
    .filter((r) => String(r.slug || "").trim().toLowerCase() === DUNYASAGLIK_SLUG)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.id - b.id)[0];
  return bySlug ?? null;
}

export async function ensureDunyaSaglikLogo(): Promise<DunyaSaglikLogoRepairResult> {
  try {
    const site = await findDunyaSaglikSite();
    if (!site?.id) {
      return {
        slug: DUNYASAGLIK_SLUG,
        domain: DUNYASAGLIK_DOMAIN,
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
    const { layout: next, changed } = applyDunyaSaglikLogoToLayout(layout);
    const layoutJson = JSON.stringify(next);

    if (changed || dunyaSaglikLayoutNeedsLogoRepair(site.layoutJson)) {
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
        "[dunyasaglik] logo layout güncellendi",
      );
      return {
        slug: DUNYASAGLIK_SLUG,
        domain: DUNYASAGLIK_DOMAIN,
        siteId: site.id,
        action: "updated",
        phpMirrored: !!mirror.mirrored,
      };
    }

    const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.id, layoutJson).catch(() => ({
      mirrored: false,
    }));
    return {
      slug: DUNYASAGLIK_SLUG,
      domain: DUNYASAGLIK_DOMAIN,
      siteId: site.id,
      action: "unchanged",
      phpMirrored: !!mirror.mirrored,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e }, "[dunyasaglik] logo repair failed");
    return {
      slug: DUNYASAGLIK_SLUG,
      domain: DUNYASAGLIK_DOMAIN,
      siteId: null,
      action: "error",
      phpMirrored: false,
      detail,
    };
  }
}

/** Meta/wake yolları: slug veya domain ile Dünya Sağlık mı? */
export function isDunyaSaglikSiteRef(slugOrDomain: string | null | undefined): boolean {
  const key = String(slugOrDomain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return key === DUNYASAGLIK_SLUG || key === DUNYASAGLIK_DOMAIN;
}
