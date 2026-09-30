/**
 * Vatan public home/chrome bindings to HM editor layout fields.
 * Defaults keep the current VKD look when the editor has not customized a surface.
 * Trafik (TGD) sites fall back to traffic-safety copy via hmVatanHomeCopy.
 */
import type { HmCorporateBandItem, HmCorporateSliderItem, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { findHmExtraPageBySlug } from "@/lib/hmExtraPageLookup";
import {
  needsTgdCorporateSliderUpgrade,
  TGD_DEFAULT_SLIDER_ITEMS,
  VATAN_DEFAULT_SLIDER_ITEMS,
} from "@/lib/hmVatanTheme";
import {
  VATAN_HOME_HERO_V2,
  VATAN_MOSAIC_TILES,
  type VatanHeroSlide,
  type VatanMosaicTile,
} from "@/lib/hmVatanHomeContent";
import {
  isTgdHmSiteSlug,
  resolveVatanHeroCopyDefaults,
  resolveVatanMosaicTilesFromCopy,
} from "@/lib/hmVatanHomeCopy";

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
  mosaic: "Mozaik / vitrin kutuları (bant veya Vatan kopya)",
  dernek: "Dernek bandı",
  rights: "Haklar / uzmanlık ve destek",
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

/** "Yolumuz hayat, önceliğimiz güvenlik." → title + italik accent. */
export function splitVatanHeroHeadline(raw: string): { title: string; accent: string } {
  const text = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) return { title: "", accent: "" };
  const pipe = text.split("|").map((part) => part.trim()).filter(Boolean);
  if (pipe.length >= 2) return { title: pipe[0]!, accent: pipe.slice(1).join(" ") };
  const m = /^(.+?,)\s+(.+)$/.exec(text);
  if (m) return { title: m[1]!.trim(), accent: m[2]!.trim() };
  return { title: text, accent: "" };
}

function sliderItemToHeroSlide(
  item: HmCorporateSliderItem,
  index: number,
  opts?: { preferTitleAsHeadline?: boolean },
): VatanHeroSlide | null {
  const image = String(item.imageUrl ?? "").trim();
  if (!image) return null;
  const ctaLabel = String(item.title ?? "").trim();
  const headlineRaw =
    String(item.headline ?? "").trim() || (opts?.preferTitleAsHeadline ? ctaLabel : "");
  const split = headlineRaw ? splitVatanHeroHeadline(headlineRaw) : { title: "", accent: "" };
  const lead = String(item.subtitle ?? "").trim();
  const ctaHref = String(item.href ?? "").trim();
  return {
    id: item.id || `slide-${index + 1}`,
    image,
    alt: lead || ctaLabel || `Slider ${index + 1}`,
    title: split.title || undefined,
    accent: split.accent || undefined,
    lead: lead || undefined,
    ctaLabel: ctaLabel || undefined,
    ctaHref: ctaHref && ctaHref !== "#" ? ctaHref : undefined,
  };
}

function tgdFallbackSlides(): VatanHeroSlide[] {
  return TGD_DEFAULT_SLIDER_ITEMS.map((item, index) =>
    sliderItemToHeroSlide(item, index, { preferTitleAsHeadline: true }),
  ).filter((item): item is VatanHeroSlide => item != null);
}

/** Background slides: editor Tepe Manşet images, else branded Vatan / TGD set. */
export function resolveVatanHeroSlides(prefs: NewsSiteLayoutPrefs, siteSlug?: string | null): VatanHeroSlide[] {
  const isTgd = isTgdHmSiteSlug(siteSlug);
  const items = activeSliderItems(prefs);
  if (isTgd && (!items.length || isStockVatanSlider(items) || needsTgdCorporateSliderUpgrade(items))) {
    return tgdFallbackSlides();
  }
  if (!items.length || isStockVatanSlider(items)) return [...VATAN_HOME_HERO_V2.slides];
  const fromEditor = items
    .map((item, index) => sliderItemToHeroSlide(item, index, { preferTitleAsHeadline: isTgd }))
    .filter((item): item is VatanHeroSlide => item != null);
  if (fromEditor.length) return fromEditor;
  return isTgd ? tgdFallbackSlides() : [...VATAN_HOME_HERO_V2.slides];
}

/**
 * Hero copy from hmVatanHomeCopy (or site defaults); Tepe Manşet slides carry
 * per-slide title/lead/CTAs when the editor customized them (or TGD defaults).
 */
export function resolveVatanHero(prefs: NewsSiteLayoutPrefs, siteSlug?: string | null): VatanResolvedHero {
  const copyDefaults = resolveVatanHeroCopyDefaults(prefs.hmVatanHomeCopy, siteSlug);
  const isTgd = isTgdHmSiteSlug(siteSlug);
  const items = activeSliderItems(prefs);
  const useTgdSlides = isTgd && (!items.length || isStockVatanSlider(items) || needsTgdCorporateSliderUpgrade(items));
  const effectiveItems = useTgdSlides ? [...TGD_DEFAULT_SLIDER_ITEMS] : items;
  const custom = effectiveItems.length > 0 && (useTgdSlides || !isStockVatanSlider(items));
  const slides = resolveVatanHeroSlides(prefs, siteSlug);
  const first = custom ? slides[0] : undefined;
  const second = custom ? slides[1] : undefined;
  const firstHref = String(first?.ctaHref ?? "").trim();
  const secondHref = String(second?.ctaHref ?? "").trim();
  const firstHeadline = first?.title?.trim();
  const firstAccent = first?.accent?.trim() ?? "";
  const firstLead = first?.lead?.trim();
  return {
    eyebrow: copyDefaults.eyebrow,
    title: firstHeadline || copyDefaults.title,
    accent: firstHeadline ? firstAccent : copyDefaults.accent,
    lead: firstLead || copyDefaults.lead,
    primaryHref: firstHref && firstHref !== "#" ? firstHref : copyDefaults.primaryHref,
    primaryLabel:
      firstHref && firstHref !== "#" && first?.ctaLabel?.trim() ? first.ctaLabel.trim() : copyDefaults.primaryLabel,
    secondaryHref: secondHref && secondHref !== "#" ? secondHref : copyDefaults.secondaryHref,
    secondaryLabel:
      secondHref && secondHref !== "#" && second?.ctaLabel?.trim()
        ? second.ctaLabel.trim()
        : copyDefaults.secondaryLabel,
    scrollCueLabel: copyDefaults.scrollCueLabel,
    slides,
    slideIntervalMs: VATAN_HOME_HERO_V2.slideIntervalMs,
  };
}

export function resolveVatanMosaicTiles(prefs: NewsSiteLayoutPrefs, siteSlug?: string | null): VatanMosaicTile[] {
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
  const fromCopy = resolveVatanMosaicTilesFromCopy(prefs.hmVatanHomeCopy, siteSlug);
  if (fromCopy?.length) return fromCopy;
  return VATAN_MOSAIC_TILES.map((tile) => {
    const page = findHmExtraPageBySlug(prefs.hmExtraPages, tile.slug);
    const title = page?.title?.trim();
    return title ? { ...tile, title } : tile;
  });
}

export function resolveVatanHomeHiddenModules(prefs: NewsSiteLayoutPrefs): Set<VatanHomeModuleId> {
  const hidden = new Set<VatanHomeModuleId>();
  const hasVatanOverrides = Array.isArray(prefs.hmVatanHomeHiddenModules);
  const allowed = new Set<string>(VATAN_HOME_MODULE_ORDER);
  for (const raw of prefs.hmVatanHomeHiddenModules ?? []) {
    const id = String(raw ?? "").trim();
    if (allowed.has(id)) hidden.add(id as VatanHomeModuleId);
  }
  if (hasVatanOverrides) return hidden;
  if (prefs.hmSehitSearchEnabled === false) hidden.add("sehitSearch");
  if (prefs.hmCorporateAtaturkCornerEnabled === false) hidden.add("ataturk");
  if (prefs.hmCorporateWarsSectionEnabled === false) hidden.add("wars");
  if (prefs.hmCorporateNationalDaysSectionEnabled === false) hidden.add("nationalDays");
  if (prefs.hmCorporateDonation?.enabled === false) hidden.add("donation");
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
