import { eq } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";

export type StaleSuBrandRepairResult = {
  scanned: number;
  repaired: number;
  siteIds: number[];
  dryRun: boolean;
};

const SU_PATH_RE = /\/tr\/su(?=\/|"|'|\s|$|[?#])/g;

function looksLikeStaleSuBrand(layoutRaw: string, slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (!s || s === "su" || s === "suhaber") return false;
  return (
    /\/tr\/su(?=\/|"|'|\s|$|[?#])/i.test(layoutRaw) ||
    /Su Haber Ajans[ıi]/i.test(layoutRaw) ||
    /Suhaberajansi\.com/i.test(layoutRaw) ||
    /"title"\s*:\s*"Su haber"/i.test(layoutRaw)
  );
}

function rewriteHrefPaths(value: unknown, slug: string): unknown {
  if (typeof value === "string") {
    return value.replace(SU_PATH_RE, `/tr/${slug}`);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteHrefPaths(item, slug));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteHrefPaths(v, slug);
    }
    return out;
  }
  return value;
}

function replaceBrandTitles(value: unknown, displayName: string): unknown {
  if (typeof value === "string") {
    if (/^Su Haber Ajans[ıi]$/i.test(value.trim())) return displayName;
    if (/^Su haber$/i.test(value.trim())) return displayName;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceBrandTitles(item, displayName));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = replaceBrandTitles(v, displayName);
    }
    return out;
  }
  return value;
}

/** Saf layout onarımı — test edilebilir, DB yazmaz. */
export function repairStaleSuBrandLayoutJson(
  layoutJson: string | null | undefined,
  slug: string,
  displayName: string,
): { next: string | null; changed: boolean } {
  const raw = layoutJson != null ? String(layoutJson) : "";
  if (!raw.trim() || !looksLikeStaleSuBrand(raw, slug)) {
    return { next: raw.trim() ? raw : null, changed: false };
  }

  let parsed: Record<string, unknown>;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object" || Array.isArray(j)) {
      return { next: raw, changed: false };
    }
    parsed = j as Record<string, unknown>;
  } catch {
    return { next: raw, changed: false };
  }

  const name = displayName.trim() || slug;
  let nextObj = rewriteHrefPaths(parsed, slug) as Record<string, unknown>;
  nextObj = replaceBrandTitles(nextObj, name) as Record<string, unknown>;

  const footer = typeof nextObj.hmFooterAboutHtml === "string" ? nextObj.hmFooterAboutHtml : "";
  if (/Suhaberajansi\.com/i.test(footer) || /Su Haber Ajans/i.test(footer)) {
    nextObj.hmFooterAboutHtml = `${name}, güncel haber akışını hızlı, tarafsız ve güvenilir bir şekilde okuyucuya ulaştırmayı hedefleyen dijital bir haber platformudur.`;
  }

  if (nextObj.hmAllowCrossSiteManualNews === true) {
    nextObj.hmAllowCrossSiteManualNews = false;
  }

  const next = JSON.stringify(nextObj);
  return { next, changed: next !== raw };
}

/** Yanlışlıkla Su Haber şablonundan kalan menü/marka izlerini site slug/adına çeker. */
export async function repairStaleSuBrandOnHmSites(opts?: {
  siteIds?: number[];
  dryRun?: boolean;
}): Promise<StaleSuBrandRepairResult> {
  const dryRun = opts?.dryRun === true;
  const filterIds = opts?.siteIds?.filter((n) => Number.isFinite(n) && n > 0) ?? [];
  const rows = await listHmNewsSitesCompat();
  const targets = filterIds.length ? rows.filter((r) => filterIds.includes(r.id)) : rows;

  const repairedIds: number[] = [];
  for (const row of targets) {
    const { next, changed } = repairStaleSuBrandLayoutJson(row.layoutJson, row.slug, row.displayName);
    if (!changed || next == null) continue;
    repairedIds.push(row.id);
    if (dryRun) continue;
    await dualWriteUpdate(
      hmNewsSitesTable,
      { layoutJson: next, updatedAt: new Date() },
      eq(hmNewsSitesTable.id, row.id),
    );
  }

  return {
    scanned: targets.length,
    repaired: repairedIds.length,
    siteIds: repairedIds,
    dryRun,
  };
}

export async function repairStaleSuBrandForSiteId(
  siteId: number,
  opts?: { dryRun?: boolean },
): Promise<StaleSuBrandRepairResult> {
  const [row] = await getNewsDbForRead()
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!row) {
    return { scanned: 0, repaired: 0, siteIds: [], dryRun: opts?.dryRun === true };
  }
  return repairStaleSuBrandOnHmSites({ siteIds: [siteId], dryRun: opts?.dryRun });
}
