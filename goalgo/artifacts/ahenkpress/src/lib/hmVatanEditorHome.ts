/**
 * Vatan public home/chrome bindings to HM editor layout fields.
 * Defaults keep the current VKD look when the editor has not customized a surface.
 */
import type { HmCorporateBandItem, HmCorporateSliderItem, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { findHmExtraPageBySlug } from "@/lib/hmExtraPageLookup";
import { VATAN_DEFAULT_SLIDER_ITEMS } from "@/lib/hmVatanTheme";
import {
  VATAN_HOME_HERO_V2,
  VATAN_MOSAIC_TILES,
  type VatanHeroSlide,
  type VatanMosaicTile,
} from "@/lib/hmVatanHomeContent";

export const VATAN_HOME_MODULE_ORDER = [
  "hero",
  "sehitSearch",
  "mosaic",
  "dernek",
  "rights",
  "nationalDays",
  "ataturk",
  "wars",
  "donation",
] as const;

export type VatanHomeModuleId = (typeof VATAN_HOME_MODULE_ORDER)[number];

export const VATAN_HOME_MODULE_LABELS: Record<VatanHomeModuleId, string> = {
  hero: "Anasayfa slider (Tepe Manşet)",
  sehitSearch: "Şehit sorgulama",
  mosaic: "Şehitlik / kahraman mozaği (bant yönetimi)",
  dernek: "Dernek bandı",
  rights: "Haklar ve destek",
  nationalDays: "Millî günler",
  ataturk: "Atatürk Köşesi",
  wars: "Tarih panelleri",
  donation: "Destek Ol / IBAN",
};

export type VatanResolvedHero = {
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  scrollCueLabel: string;
  slides: VatanHeroSlide[];
  slideIntervalMs: number;
};

function activeSliderItems(prefs: NewsSiteLayoutPrefs): HmCorporateSliderItem[] {
  return (prefs.corporateSliderItems ?? [])
    .filter((item) => item && item.active !== false && String(item.title ?? "").trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function activeBandItems(prefs: NewsSiteLayoutPrefs): HmCorporateBandItem[] {
  return (prefs.corporateBandItems ?? [])
    .filter((item) => item && item.active !== false && String(item.title ?? "").trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function isStockVatanSlider(items: HmCorporateSliderItem[]): boolean {
  if (!items.length) return true;
  const defaults = VATAN_DEFAULT_SLIDER_ITEMS;
  if (items.length !== defaults.length) return false;
  const byId = new Map(defaults.map((row) => [row.id, row]));
  return items.every((item) => {
    const stock = byId.get(item.id);
    if (!stock) return false;
    return String(item.imageUrl ?? "").trim() === stock.imageUrl && String(item.href ?? "").trim() === stock.href;
  });
}

/** Background slides: editor Tepe Manşet images, else the branded Vatan set. */
export function resolveVatanHeroSlides(prefs: NewsSiteLayoutPrefs): VatanHeroSlide[] {
  const items = activeSliderItems(prefs);
  if (!items.length || isStockVatanSlider(items)) return [...VATAN_HOME_HERO_V2.slides];
  const fromEditor = items
    .map((item, index): VatanHeroSlide | null => {
      const image = String(item.imageUrl ?? "").trim();
      if (!image) return null;
      return {
        id: item.id || `slide-${index + 1}`,
        image,
        alt: String(item.subtitle ?? item.title ?? "").trim() || `Slider ${index + 1}`,
      };
    })
    .filter((item): item is VatanHeroSlide => item != null);
  return fromEditor.length ? fromEditor : [...VATAN_HOME_HERO_V2.slides];
}

/**
 * Keep the branded H1; CTAs follow the first two slider links when the editor set them.
 */
export function resolveVatanHero(prefs: NewsSiteLayoutPrefs): VatanResolvedHero {
  const items = activeSliderItems(prefs);
  const custom = items.length > 0 && !isStockVatanSlider(items);
  const first = custom ? items[0] : undefined;
  const second = custom ? items[1] : undefined;
  const firstHref = String(first?.href ?? "").trim();
  const secondHref = String(second?.href ?? "").trim();
  return {
    eyebrow: VATAN_HOME_HERO_V2.eyebrow,
    title: VATAN_HOME_HERO_V2.title,
    accent: VATAN_HOME_HERO_V2.accent,
    lead: VATAN_HOME_HERO_V2.lead,
    primaryHref: firstHref && firstHref !== "#" ? firstHref : VATAN_HOME_HERO_V2.primaryHref,
    primaryLabel: firstHref && firstHref !== "#" && first?.title?.trim() ? first.title.trim() : VATAN_HOME_HERO_V2.primaryLabel,
    secondaryHref: secondHref && secondHref !== "#" ? secondHref : VATAN_HOME_HERO_V2.secondaryHref,
    secondaryLabel:
      secondHref && secondHref !== "#" && second?.title?.trim() ? second.title.trim() : VATAN_HOME_HERO_V2.secondaryLabel,
    scrollCueLabel: VATAN_HOME_HERO_V2.scrollCueLabel,
    slides: resolveVatanHeroSlides(prefs),
    slideIntervalMs: VATAN_HOME_HERO_V2.slideIntervalMs,
  };
}

export function resolveVatanMosaicTiles(prefs: NewsSiteLayoutPrefs): VatanMosaicTile[] {
  const bands = activeBandItems(prefs).filter((item) => String(item.imageUrl ?? "").trim());
  if (bands.length >= 2) {
    return bands.slice(0, 5).map((item, index): VatanMosaicTile => {
      const href = String(item.href ?? "").trim() || "/";
      const subtitle = String(item.subtitle ?? "").trim();
      return {
        slug: item.id || `band-${index + 1}`,
        href,
        title: item.title.trim(),
        kicker: subtitle || "Vitrin",
        excerpt: index === 0 ? subtitle || undefined : undefined,
        image: String(item.imageUrl).trim(),
        imageAlt: item.title.trim(),
        size: index === 0 ? "xl" : "sm",
      };
    });
  }
  return VATAN_MOSAIC_TILES.map((tile) => {
    const page = findHmExtraPageBySlug(prefs.hmExtraPages, tile.slug);
    const title = page?.title?.trim();
    return title ? { ...tile, title } : tile;
  });
}

export function resolveVatanHomeHiddenModules(prefs: NewsSiteLayoutPrefs): Set<VatanHomeModuleId> {
  const hidden = new Set<VatanHomeModuleId>();
  const allowed = new Set<string>(VATAN_HOME_MODULE_ORDER);
  for (const raw of prefs.hmVatanHomeHiddenModules ?? []) {
    const id = String(raw ?? "").trim();
    if (allowed.has(id)) hidden.add(id as VatanHomeModuleId);
  }
  return hidden;
}

export function resolveVatanHomeModuleOrder(prefs: NewsSiteLayoutPrefs): VatanHomeModuleId[] {
  const allowed = new Set<string>(VATAN_HOME_MODULE_ORDER);
  const seen = new Set<string>();
  const next: VatanHomeModuleId[] = [];
  for (const raw of prefs.hmVatanHomeModuleOrder ?? []) {
    const id = String(raw ?? "").trim();
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id as VatanHomeModuleId);
  }
  for (const id of VATAN_HOME_MODULE_ORDER) {
    if (!seen.has(id)) next.push(id);
  }
  return next;
}

export function resolveVatanVisibleHomeModules(prefs: NewsSiteLayoutPrefs): VatanHomeModuleId[] {
  const hidden = resolveVatanHomeHiddenModules(prefs);
  return resolveVatanHomeModuleOrder(prefs).filter((id) => !hidden.has(id));
}

export function vatanHomeNumeral(index: number): string {
  return String(index + 1).padStart(2, "0");
}
