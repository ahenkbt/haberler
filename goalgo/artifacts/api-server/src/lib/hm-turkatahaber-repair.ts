/**
 * turkatahaber.com — PHP Neon (twilight-pine) layout/menü onarımı.
 * Canlı PHP yalnızca NEWS_DATABASE_URL layout_json okur; panel seed tek başına yetmez.
 */
import { inArray } from "drizzle-orm";
import { categoriesTable, getNewsDbForRead } from "@workspace/db";
import { listKamuYerelNavTopCategorySlugs } from "./hm-cumha-kamu-yerel-catalog.js";
import { ensureKamuYerelSites } from "./hm-kamu-yerel-seed.js";
import {
  buildKamuYerelLayoutJson,
  TURKATAHABER_SITE,
  TURKATAHABER_SLUG,
} from "./hm-kamu-yerel-sites.js";
import { mirrorHmSiteLayoutJsonToPhpNeon } from "./hm-php-layout-sync.js";

export type TurkataSiteRowLike = {
  id: number;
  slug: string | null;
  active?: boolean | null;
  layoutJson?: string | null;
};

function normalizeSlug(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function parseLayoutNavSlugs(layoutJson: string | null | undefined): string[] | null {
  const raw = String(layoutJson ?? "").trim();
  if (!raw) return null;
  try {
    const layout = JSON.parse(raw) as { hmNavOnlyCategorySlugs?: unknown };
    const nav = layout?.hmNavOnlyCategorySlugs;
    if (!Array.isArray(nav)) return null;
    return nav.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    return null;
  }
}

/** Tepe menü yalnızca İller/yerel kalır — Cumha hmNavOnly eksik veya eski. */
export function turkataLayoutNeedsCatalogRepair(layoutJson: string | null | undefined): boolean {
  const nav = parseLayoutNavSlugs(layoutJson);
  if (!nav || nav.length === 0) return true;
  const expected = listKamuYerelNavTopCategorySlugs();
  if (nav.length !== expected.length) return true;
  for (let i = 0; i < expected.length; i += 1) {
    if (nav[i] !== expected[i]) return true;
  }
  const logoUrl = (() => {
    try {
      const layout = JSON.parse(String(layoutJson ?? "")) as { logoUrl?: unknown };
      return String(layout?.logoUrl ?? "").trim();
    } catch {
      return "";
    }
  })();
  if (logoUrl.startsWith("/turkata/")) return true;
  return false;
}

export async function countTurkataNavCategories(): Promise<number> {
  const slugs = listKamuYerelNavTopCategorySlugs();
  const rows = await getNewsDbForRead()
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(inArray(categoriesTable.slug, slugs));
  return rows.length;
}

export async function turkataSiteNeedsCatalogRepair(row: TurkataSiteRowLike): Promise<boolean> {
  if (normalizeSlug(row.slug) !== TURKATAHABER_SLUG) return false;
  if (turkataLayoutNeedsCatalogRepair(row.layoutJson)) return true;
  const navCount = await countTurkataNavCategories();
  return navCount < listKamuYerelNavTopCategorySlugs().length;
}

/** Idempotent kamu-yerel seed + PHP Neon layout aynası (site #230). */
export async function wakeTurkatahaberCatalogRepair(siteId?: number): Promise<{
  seed: Awaited<ReturnType<typeof ensureKamuYerelSites>>;
  layoutMirror: Awaited<ReturnType<typeof mirrorHmSiteLayoutJsonToPhpNeon>>;
}> {
  const seed = await ensureKamuYerelSites();
  const turkata = seed.sites.find((s) => s.slug === TURKATAHABER_SLUG);
  const sid = Math.trunc(siteId ?? turkata?.siteId ?? 0);
  const layoutJson = JSON.stringify(buildKamuYerelLayoutJson(TURKATAHABER_SITE));
  const layoutMirror =
    sid > 0
      ? await mirrorHmSiteLayoutJsonToPhpNeon(sid, layoutJson).catch((err: unknown) => ({
          mirrored: false,
          reason: err instanceof Error ? err.message : String(err),
        }))
      : { mirrored: false, reason: "turkata siteId yok" };
  return { seed, layoutMirror };
}

export function isTurkatahaberSiteRow(row: TurkataSiteRowLike | null | undefined): boolean {
  return normalizeSlug(row?.slug ?? "") === TURKATAHABER_SLUG;
}
