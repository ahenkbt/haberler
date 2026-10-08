/**
 * turkatahaber.com — PHP Neon (twilight-pine) layout/menü onarımı.
 * Canlı PHP yalnızca NEWS_DATABASE_URL layout_json okur; panel seed tek başına yetmez.
 */
import { inArray } from "drizzle-orm";
import { categoriesTable, getNewsDbForRead } from "@workspace/db";
import { listKamuYerelNavTopCategorySlugs } from "./hm-cumha-kamu-yerel-catalog.js";
import {
  kamuYerelLayoutNeedsCatalogRepair,
  kamuYerelLogoExpectation,
  parseLayoutNavSlugs,
} from "./hm-kamu-yerel-layout-lock.js";
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

/** Tepe menü yalnızca İller/yerel kalır — Cumha hmNavOnly eksik veya eski. */
export function turkataLayoutNeedsCatalogRepair(layoutJson: string | null | undefined): boolean {
  return kamuYerelLayoutNeedsCatalogRepair(layoutJson, kamuYerelLogoExpectation(TURKATAHABER_SITE));
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

export { parseLayoutNavSlugs };
