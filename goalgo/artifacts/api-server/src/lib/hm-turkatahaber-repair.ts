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

/**
 * Idempotent kamu-yerel seed + PHP Neon layout aynası.
 * STABILIZE: ensureOneSite mirrors locked layout; skip second wipe pass by default.
 * SKIP_LAYOUT_MIRROR=1 hard-stops PHP layout writes.
 */
export async function wakeTurkatahaberCatalogRepair(siteId?: number): Promise<{
  seed: Awaited<ReturnType<typeof ensureKamuYerelSites>>;
  layoutMirror: Awaited<ReturnType<typeof mirrorHmSiteLayoutJsonToPhpNeon>> | {
    mirrored: false;
    reason: string;
    skipped?: boolean;
  };
}> {
  if (String(process.env.SKIP_LAYOUT_MIRROR ?? "").trim() === "1") {
    const seed = await ensureKamuYerelSites();
    return { seed, layoutMirror: { mirrored: false, reason: "SKIP_LAYOUT_MIRROR=1", skipped: true } };
  }
  const seed = await ensureKamuYerelSites();
  const turkata = seed.sites.find((s) => s.slug === TURKATAHABER_SLUG);
  const sid = Math.trunc(siteId ?? turkata?.siteId ?? 0);
  const layoutJson = String(turkata?.layoutJson ?? "").trim();
  if (String(process.env.FORCE_LAYOUT_MIRROR ?? "").trim() !== "1") {
    return {
      seed,
      layoutMirror: {
        mirrored: false,
        reason: "ensureOneSite already mirrored locked layout (set FORCE_LAYOUT_MIRROR=1 to redo)",
        skipped: true,
      },
    };
  }
  if (!(sid > 0)) return { seed, layoutMirror: { mirrored: false, reason: "turkata siteId yok" } };
  if (!layoutJson) {
    return {
      seed,
      layoutMirror: {
        mirrored: false,
        reason: "locked layoutJson yok — skinny canonical mirror reddedildi",
        skipped: true,
      },
    };
  }
  const layoutMirror = await mirrorHmSiteLayoutJsonToPhpNeon(sid, layoutJson).catch((err: unknown) => ({
    mirrored: false,
    reason: err instanceof Error ? err.message : String(err),
  }));
  return { seed, layoutMirror };
}

export function isTurkatahaberSiteRow(row: TurkataSiteRowLike | null | undefined): boolean {
  return normalizeSlug(row?.slug ?? "") === TURKATAHABER_SLUG;
}

export { parseLayoutNavSlugs };
