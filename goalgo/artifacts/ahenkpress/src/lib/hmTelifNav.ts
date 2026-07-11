import type { HmCorporateMenuItem, HmExtraPage, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { findHmExtraPageBySlug, normalizeHmExtraPageSlug } from "@/lib/hmExtraPageLookup";
import { HM_TELIF_KULLANIM_SLUG, HM_TELIF_MENU_LABEL } from "@/lib/hmTelifDefaults";

export function isHmTelifPageSlug(slug: string): boolean {
  return normalizeHmExtraPageSlug(slug) === HM_TELIF_KULLANIM_SLUG;
}

export function isHmCorporateVitrinSite(
  layoutPrefs: Pick<NewsSiteLayoutPrefs, "hmVitrinTheme"> | null | undefined,
): boolean {
  return layoutPrefs?.hmVitrinTheme === "corporate";
}

export function resolveHmTelifExtraPage(pages: HmExtraPage[] | null | undefined): HmExtraPage | undefined {
  return findHmExtraPageBySlug(pages, HM_TELIF_KULLANIM_SLUG);
}

/** Haber sitesinde telif sayfası menüde gösterilsin mi (yayında + kurumsal değil). */
export function shouldShowHmTelifInPublicNav(layoutPrefs: NewsSiteLayoutPrefs | null | undefined): boolean {
  if (!layoutPrefs || isHmCorporateVitrinSite(layoutPrefs)) return false;
  return resolveHmTelifExtraPage(layoutPrefs.hmExtraPages) != null;
}

export function isHmTelifMenuHref(href: string): boolean {
  const path = String(href ?? "").trim().split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return path === `/${HM_TELIF_KULLANIM_SLUG}` || path.endsWith(`/${HM_TELIF_KULLANIM_SLUG}`);
}

export function shouldHideHmTelifNavLink(layoutPrefs: NewsSiteLayoutPrefs | null | undefined): boolean {
  return !shouldShowHmTelifInPublicNav(layoutPrefs);
}

export function filterHmCorporateMenuItemsForTelifPolicy(
  items: HmCorporateMenuItem[],
  layoutPrefs: NewsSiteLayoutPrefs | null | undefined,
): HmCorporateMenuItem[] {
  if (!shouldHideHmTelifNavLink(layoutPrefs)) return items;
  return items.filter((item) => !isHmTelifMenuHref(item.href));
}

export function filterHmExtraPagesExcludingTelif(pages: HmExtraPage[]): HmExtraPage[] {
  return pages.filter((p) => p.enabled && p.title.trim() && p.slug.trim() && !isHmTelifPageSlug(p.slug));
}

export function hmTelifFooterNavItem(h: (path: string) => string): { key: string; label: string; href: string } {
  return {
    key: HM_TELIF_KULLANIM_SLUG,
    label: HM_TELIF_MENU_LABEL,
    href: h(`/${HM_TELIF_KULLANIM_SLUG}`),
  };
}
