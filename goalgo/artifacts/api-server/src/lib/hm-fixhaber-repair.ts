/**
 * Fix Haber (fix.tc) — canlı sitede boş menü: site satırı var, kategoriler/PHP Neon eksik.
 */
import { and, eq, inArray } from "drizzle-orm";
import { categoriesTable, getNewsDbForRead } from "@workspace/db";
import { ensureFixHaberSite } from "./hm-fixhaber-seed.js";
import {
  buildFixHaberLayoutJson,
  FIXHABER_NAV_ONLY_CATEGORY_SLUGS,
  FIXHABER_SLUG,
  listFixHaberCategorySlugs,
} from "./hm-fixhaber-site.js";
import { mirrorHmSiteLayoutJsonToPhpNeon } from "./hm-php-layout-sync.js";

export type FixHaberSiteRowLike = {
  id: number;
  slug: string | null;
  active: boolean | null;
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

/** Menü boş kalır: hmNavOnly beyaz listesi var ama DB'de eşleşen kategori yok. */
export function fixHaberLayoutNeedsCatalogRepair(layoutJson: string | null | undefined): boolean {
  const nav = parseLayoutNavSlugs(layoutJson);
  if (!nav || nav.length === 0) return true;
  const expected = [...FIXHABER_NAV_ONLY_CATEGORY_SLUGS];
  if (nav.length !== expected.length) return true;
  for (let i = 0; i < expected.length; i += 1) {
    if (nav[i] !== expected[i]) return true;
  }
  return false;
}

export async function countFixHaberNavCategoriesForSite(siteId: number): Promise<number> {
  const sid = Math.trunc(siteId);
  if (!Number.isFinite(sid) || sid <= 0) return 0;
  const rows = await getNewsDbForRead()
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.exclusiveSiteId, sid),
        inArray(categoriesTable.slug, [...FIXHABER_NAV_ONLY_CATEGORY_SLUGS]),
      ),
    );
  return rows.length;
}

export async function fixHaberSiteNeedsCatalogRepair(row: FixHaberSiteRowLike): Promise<boolean> {
  if (normalizeSlug(row.slug) !== FIXHABER_SLUG) return false;
  if (fixHaberLayoutNeedsCatalogRepair(row.layoutJson)) return true;
  const navCount = await countFixHaberNavCategoriesForSite(row.id);
  return navCount < FIXHABER_NAV_ONLY_CATEGORY_SLUGS.length;
}

/** Idempotent seed + PHP Neon layout aynası (twilight-pine menü). */
export async function wakeFixHaberCatalogRepair(siteId: number): Promise<void> {
  const sid = Math.trunc(siteId);
  await ensureFixHaberSite().catch(() => null);
  if (!Number.isFinite(sid) || sid <= 0) return;
  const layoutJson = JSON.stringify(buildFixHaberLayoutJson());
  await mirrorHmSiteLayoutJsonToPhpNeon(sid, layoutJson).catch(() => null);
}

export function isFixHaberSiteRow(row: FixHaberSiteRowLike | null | undefined): boolean {
  return normalizeSlug(row?.slug ?? "") === FIXHABER_SLUG;
}

/** Tam katalog slug sayısı — ensure sonrası doğrulama / log. */
export function expectedFixHaberCategoryCount(): number {
  return listFixHaberCategorySlugs().length;
}
