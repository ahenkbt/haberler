/**
 * Haber sitesi vitrin tercihleri. HM editöründe `hm_news_sites.layout_json` ile sunucuda saklanır;
 * anonim / merkez sayfa için localStorage yedek okuması kullanılabilir.
 */
import { normalizeHmRequestCategories, type HmRequestCategory } from "./hmRequestForm";
import { hmCategorySlug } from "./hmCategorySlug";
import { HM_VITRIN_THEME_FLOWER_LABELS, hmVitrinThemeFlowerLabel } from "./hmVitrinThemeTokens";
import { normalizeYekpareCategoryBoxCount, normalizeYekpareKutuItemCount } from "./hmCategoryBoxItems";
import type { HmMediaGalleryHomeModuleId, HmMediaGallerySourceId, HmNewsGallerySpotlightMode, HmNewsHomeModuleGalleryVideoTvRefs } from "./hmMediaSpotlightPool";
import { hmGallerySpotlightModeToSourceId, normalizeHmMediaGallerySourceId, normalizeHmNewsGallerySpotlightMode, normalizeHmNewsHomeModuleGalleryVideoTvRefs, resolveHmNewsGalleryVideoTvRef } from "./hmMediaSpotlightPool";
import { normalizeHmEditorLoginMenuHref } from "./hmEditorPublicLinks";
import { decodeHmDisplayText } from "./hmDisplayText";
export type MansetVariant =
  | "split"
  | "full-thumbs"
  | "center-trio"
  | "full-numbered"
  | "magazine-grid"
  | "slider-side-band";
export type AuthorsHomeVariant = "sidebar" | "under-hero";
export type HmColorPaletteId = "red" | "gold" | "blue";
export type HmCorporateLayoutWidth = "full" | "contained";

/** KURUMSAL ana haber kutusu düzeni: manşet slider + yan liste veya büyük manşet + 2 sütun küçük resim. */
export type HmCorporateMainNewsLayout = "manset-side" | "lead-side-grid";

/** Üst krom (header, nav, son dakika, piyasa): açık/koyu; `auto` = vitrin teması varsayılanı. */
export type HmChromeColorMode = "light" | "dark" | "auto";

/** Haber merkezi vitrin görünümü. `news` mevcut haber teması, dişerleri haber portalı varyantlarıdır. */
export type HmVitrinThemeId =
  | "news"
  | "classic"
  | "portal3"
  | "esen"
  | "manset24"
  | "renkli"
  | "ahenkhaber"
  | "modern"
  | "corporate"
  | "default"
  | "ankara"
  | "gold"
  | "sumbul";

/** Kaldırılan vitrin temaları (Menekşe/ajans). Sümbül eski `wsj` anahtarı ile geri geldi. */
const HM_RETIRED_VITRIN_THEME_RAW = new Set(["ajans", "agency", "aa"]);

export function isHmRetiredVitrinThemeRaw(theme: string | null | undefined): boolean {
  return HM_RETIRED_VITRIN_THEME_RAW.has(String(theme ?? "").trim().toLowerCase());
}

/** Eski ajans temalarını Papatya (news) ile değiştirir; wsj/business/gazete → classic (Sümbül yalnızca açık seçim). */
export function normalizeHmVitrinTheme(theme: string | null | undefined): HmVitrinThemeId {
  const raw = String(theme ?? "news").trim().toLowerCase();
  if (raw === "wsj" || raw === "business" || raw === "gazete") return "classic";
  if (raw === "sumbul" || raw === "yekpare") return "sumbul";
  if (raw === "ajans" || raw === "agency" || raw === "aa") return "news";
  if (raw === "corporate" || raw === "kurumsal") return "corporate";
  if (raw === "classic" || raw === "klasik" || raw === "portal") return "classic";
  if (raw === "portal3" || raw === "portal-3" || raw === "ucuncu") return "portal3";
  if (raw === "esen" || raw === "esenhaber" || raw === "esen-home") return "esen";
  if (raw === "manset24" || raw === "manset-24" || raw === "sondakika") return "manset24";
  if (raw === "renkli" || raw === "renkli-portal" || raw === "colorful") return "renkli";
  if (raw === "ahenkhaber" || raw === "ahenk-haber" || raw === "ahenk") return "ahenkhaber";
  if (raw === "modern" || raw === "modern-haber" || raw === "haber-modern") return "modern";
  if (raw === "news" || raw === "haber" || raw === "default") return "news";
  if (raw === "ankara" || raw === "gold") return raw as HmVitrinThemeId;
  return "news";
}

/** Kaldırılan anasayfa modülleri (ajans/WSJ blokları, kategori haber kutuları). */
export const HM_NEWS_RETIRED_HOME_MODULE_IDS = [
  "agencyLeadGrid",
  "agencyLatestSidebar",
  "agencyBorderedGrid",
  "agencyDarkSpotlight",
  "agencyTopicRows",
  "wsjEditorialGrid",
  "categorySections",
] as const;

const HM_NEWS_RETIRED_HOME_MODULE_SET = new Set<string>(HM_NEWS_RETIRED_HOME_MODULE_IDS);

export function isHmNewsRetiredHomeModule(moduleId: string): boolean {
  return HM_NEWS_RETIRED_HOME_MODULE_SET.has(moduleId);
}

/**
 * Yalnızca yekpare.net hub'ında (`isYekparePortalHubOnly`) açık anasayfa modülleri.
 * HM özel alan / `/tr/{slug}` sitelerinde render, lazy import ve API çağrısı yok.
 */
export const HM_HUB_ONLY_HOME_MODULE_IDS = [
  "newsMapModule",
  "recentVideosSidebar",
  "mediaDarkBlock",
  "popularCities",
  "yemekHaber",
] as const;

const HM_HUB_ONLY_HOME_MODULE_SET = new Set<string>(HM_HUB_ONLY_HOME_MODULE_IDS);

export function isHmHubOnlyHomeModule(moduleId: string): boolean {
  return HM_HUB_ONLY_HOME_MODULE_SET.has(moduleId);
}

export function filterHmHomeModulesForPortalHub<T extends string>(
  modules: readonly T[],
  portalHubOnly: boolean,
): T[] {
  if (portalHubOnly) return [...modules];
  return modules.filter((id) => !isHmHubOnlyHomeModule(id));
}

/** @deprecated `HM_HUB_ONLY_HOME_MODULE_IDS` kullanın */
export const HM_PORTAL_HUB_ONLY_HOME_MODULE_IDS = HM_HUB_ONLY_HOME_MODULE_IDS;

/** @deprecated `isHmHubOnlyHomeModule` kullanın */
export const isHmPortalHubOnlyHomeModule = isHmHubOnlyHomeModule;

/** Editör ÔåÆ Sayfalar: özel statik içerik (HTML). */
export type HmExtraPage = {
  id: string;
  title: string;
  slug: string;
  bodyHtml: string;
  enabled: boolean;
  /** true: özel sayfa içerişi `max-w-screen-xl`; false/tanımsız: okunabilir dar makale. */
  fullWidth?: boolean;
  /** WordPress PHP/HTML template importer gibi otomatik kaynak işaretleri. */
  importSource?: string;
  sourceName?: string | null;
  importedAt?: string | null;
};

export type HmAdSlotState = {
  slotKey: string;
  enabled: boolean;
  html: string | null;
  /** Editör: görsel yükleme vs ham HTML */
  contentMode?: "html" | "image";
  /** Görsel modunda sunucu medya yolu (örn. /api/media/uploads/…) */
  imageMediaUrl?: string | null;
  /** Görsel modunda isteğe başlı tıklama adresi */
  imageClickUrl?: string | null;
};

/** Künye / ıletişim / Reklam / Abonelik — HM'de şablon yerine bu HTML doluysa gösterilir. */
export type HmCorporatePageHtml = {
  kunye?: string | null;
  iletisim?: string | null;
  reklam?: string | null;
  abonelik?: string | null;
};

/** Alt şerit sağ blok: sosyal başlantılar */
export type HmFooterSocialLinks = {
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  xUrl?: string | null;
  youtubeUrl?: string | null;
};

/** Kurumsal tema üst menüsü: parentId doluysa ilgili üst öşenin dropdown'ında gösterilir. */
export type HmCorporateMenuItem = {
  id: string;
  label: string;
  href: string;
  /** Navbar'da etiket önünde gösterilir (emoji veya kısa simge). */
  icon?: string | null;
  parentId?: string | null;
  enabled?: boolean;
};

/** HABER temasında footer ve sidebar için manuel başlantı öşesi. */
export type HmNewsMenuItem = HmCorporateMenuItem;

export type HmBreakingRssFeedId =
  | "turkiye"
  | "dunya"
  | "ekonomi"
  | "teknoloji"
  | "saglik"
  | "spor"
  | "yasam"
  | "otomobil"
  | "para"
  | "egitim"
  | "savunmaSanayi";
export type HmBreakingRssFeeds = Partial<Record<HmBreakingRssFeedId, string>>;
export type HmBreakingRssLabels = Partial<Record<HmBreakingRssFeedId, string>>;
export type HmBreakingRssFeedRow = {
  id: string;
  /** Aynı kategoriye başlı birden fazla RSS URL satırını gruplar; yoksa `id` kullanılır. */
  categoryKey?: string;
  label: string;
  url: string;
};
export type PortalHybridRssFeed = {
  id: string;
  categorySlug: string;
  label: string;
  url: string;
  enabled: boolean;
  maxItems: number;
};
export type HmBreakingRssDisplayMode = "cards" | "balloons";
export type HmRssIntegrationMode = "live" | "persistent" | "manual";

export const HM_BREAKING_RSS_FEED_CATEGORIES: Array<{ id: HmBreakingRssFeedId; label: string }> = [
  { id: "turkiye", label: "Türkiye" },
  { id: "dunya", label: "Dünya" },
  { id: "ekonomi", label: "Ekonomi" },
  { id: "teknoloji", label: "Teknoloji" },
  { id: "saglik", label: "Sağlık" },
  { id: "spor", label: "Spor" },
  { id: "yasam", label: "Yaşam" },
  { id: "otomobil", label: "Otomobil" },
  { id: "para", label: "Para" },
  { id: "egitim", label: "Eğitim" },
  { id: "savunmaSanayi", label: "Savunma Sanayi" },
];

export const defaultHmBreakingRssFeeds: HmBreakingRssFeeds = {
  turkiye: "https://www.ntv.com.tr/turkiye.rss",
  dunya: "https://www.ntv.com.tr/dunya.rss",
  ekonomi: "https://www.ntv.com.tr/ekonomi.rss",
  teknoloji: "https://www.ntv.com.tr/teknoloji.rss",
  saglik: "https://www.ntv.com.tr/saglik.rss",
  spor: "",
  yasam: "https://www.ntv.com.tr/yasam.rss",
  otomobil: "https://www.ntv.com.tr/otomobil.rss",
  para: "https://www.ntv.com.tr/ntvpara.rss",
  egitim: "https://www.ntv.com.tr/egitim.rss",
  savunmaSanayi: "https://www.dirilispostasi.com/rss/savunma-sanayi",
};

/** Kurumsal tema anasayfa hızlı erişim kutuları. */
export type HmCorporateQuickLink = {
  id: string;
  label: string;
  href: string;
  icon?: string | null;
  subtitle?: string | null;
  enabled?: boolean;
};

/** Kurumsal tema ana slider öşeleri; haber bayraklarından başımsızdır. */
export type HmCorporateSliderItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  order?: number | null;
  active?: boolean;
};

/** Kurumsal tema slider altı bant öşeleri; haber bayraklarından başımsızdır. */
export type HmCorporateBandItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  order?: number | null;
  active?: boolean;
};

export type HmCorporateDonationSupportBand = {
  enabled?: boolean;
  title?: string | null;
  /** Eski düz paragraf; vitrinde gösterilmez. */
  text?: string | null;
  /** Madde işaretli kısa destek metni (HTML, sanitize edilir). */
  highlightsHtml?: string | null;
  items?: string[] | null;
};

/** Kurumsal tema bağış kutusu ve alt destek bandı ayarları. */
export type HmCorporateDonationSettings = {
  enabled: boolean;
  title?: string | null;
  description?: string | null;
  amounts?: number[] | null;
  iban?: string | null;
  accountName?: string | null;
  buttonText?: string | null;
  supportBand?: HmCorporateDonationSupportBand | null;
};

/** Yekpare yatay ikon menü ön ayarı (P2-HM-Editor). */
export type YekpareMenuPresetId = "default" | "yekpare-icons" | "custom";

/** Haber header vitrin ön ayarı (P2-HM-Editor). */
export type HmHeaderPresetId = "default" | "trabzonik" | "classic" | "minimal";

/** Piyasa / hava bandı konumu (P2-HM-Editor). */
export type HmTickerPlacementId = "logo-side" | "below-menu" | "sidebar";

/** Logo satırı sağ alanı — editörde yazi/banner/hava/doviz/arama. */
export type HmHeaderRightSlotId =
  | "text"
  | "banner"
  | "weather"
  | "finance"
  | "search"
  | "text-search"
  | "finance-weather";

export const HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS: { value: HmHeaderRightSlotId; label: string }[] = [
  { value: "text", label: "Yazı (site açıklaması)" },
  { value: "banner", label: "Banner görseli" },
  { value: "weather", label: "Hava durumu" },
  { value: "finance", label: "Döviz / piyasa" },
  { value: "search", label: "Arama kutusu" },
  { value: "text-search", label: "Yazı + arama (kurumsal varsayılan)" },
  { value: "finance-weather", label: "Piyasa + hava (haber varsayılan)" },
];

export function parseHmHeaderRightSlot(raw: unknown): HmHeaderRightSlotId | undefined {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!v) return undefined;
  const aliases: Record<string, HmHeaderRightSlotId> = {
    text: "text",
    yazi: "text",
    banner: "banner",
    weather: "weather",
    hava: "weather",
    finance: "finance",
    doviz: "finance",
    search: "search",
    arama: "search",
    "text-search": "text-search",
    "yazi-arama": "text-search",
    "finance-weather": "finance-weather",
    "piyasa-hava": "finance-weather",
  };
  return aliases[v];
}

/** Tanımsızsa kurumsal → yazı+arama; haber logo-yanı piyasa/hava → finance-weather. */
export function resolveHmHeaderRightSlot(
  prefs: NewsSiteLayoutPrefs | null | undefined,
): HmHeaderRightSlotId | null {
  const explicit = parseHmHeaderRightSlot(prefs?.hmHeaderRightSlot);
  if (explicit) return explicit;
  if (normalizeHmVitrinTheme(prefs?.hmVitrinTheme) === "corporate") return "text-search";
  if (
    resolveFinanceWeatherAtLogoSide(prefs) &&
    (normalizeHmVitrinTheme(prefs?.hmVitrinTheme) === "sumbul" ||
      resolveTickerFinanceEnabled(prefs) ||
      resolveTickerWeatherEnabled(prefs))
  ) {
    return "finance-weather";
  }
  return null;
}

export function resolveHmHeaderRightSlotText(
  prefs: NewsSiteLayoutPrefs | null | undefined,
  siteDescription?: string | null,
): string {
  const custom = (prefs?.hmHeaderRightCustomText ?? "").trim();
  if (custom) return custom;
  const desc = (siteDescription ?? "").trim();
  if (desc) return desc;
  return "Kurumsal haberler, duyurular ve uzman yazıları tek merkezde.";
}

export function resolveHmHeaderRightBannerUrl(prefs: NewsSiteLayoutPrefs | null | undefined): string | null {
  const direct = (prefs?.hmHeaderRightBannerUrl ?? "").trim();
  return direct || null;
}

export function parseYekpareMenuPreset(raw: unknown): YekpareMenuPresetId {
  const v = String(raw ?? "default").trim().toLowerCase();
  if (v === "yekpare-icons" || v === "custom") return v;
  return "default";
}

export function parseHeaderPreset(raw: unknown): HmHeaderPresetId {
  const v = String(raw ?? "default").trim().toLowerCase();
  if (v === "trabzonik" || v === "classic" || v === "minimal") return v;
  return "default";
}

export function parseTickerPlacement(raw: unknown): HmTickerPlacementId {
  const v = String(raw ?? "logo-side").trim().toLowerCase();
  if (v === "below-menu" || v === "sidebar") return v;
  return "logo-side";
}

/** Yatay ikon kategori şeridi — `yekpareMenuPreset=yekpare-icons` (hub ve HM özel alan). */
export function resolveShowYekpareIconMenu(
  prefs: NewsSiteLayoutPrefs | null | undefined,
): boolean {
  return parseYekpareMenuPreset(prefs?.yekpareMenuPreset) === "yekpare-icons";
}

/** Şeffaf üst menü şeridi — Yekpare ikon/özel menü ön ayarı (kurumsal ve trabzonik hariç). */
export function resolveHmNavStripTransparent(
  prefs: NewsSiteLayoutPrefs | null | undefined,
): boolean {
  if (normalizeHmVitrinTheme(prefs?.hmVitrinTheme) === "corporate") return false;
  if (parseHeaderPreset(prefs?.headerPreset) === "trabzonik") return false;
  const preset = parseYekpareMenuPreset(prefs?.yekpareMenuPreset);
  return preset === "yekpare-icons" || preset === "custom";
}

export function resolveHeaderPreset(prefs: NewsSiteLayoutPrefs | null | undefined): HmHeaderPresetId {
  return parseHeaderPreset(prefs?.headerPreset);
}

export function resolveTickerPlacement(prefs: NewsSiteLayoutPrefs | null | undefined): HmTickerPlacementId {
  return parseTickerPlacement(prefs?.tickerPlacement);
}

export function resolveFinanceWeatherAtLogoSide(prefs: NewsSiteLayoutPrefs | null | undefined): boolean {
  return resolveTickerPlacement(prefs) === "logo-side";
}

export function resolveFinanceWeatherBelowMenu(prefs: NewsSiteLayoutPrefs | null | undefined): boolean {
  return resolveTickerPlacement(prefs) === "below-menu";
}

export function resolveFinanceWeatherInSidebar(prefs: NewsSiteLayoutPrefs | null | undefined): boolean {
  return resolveTickerPlacement(prefs) === "sidebar";
}

export type NewsSiteLayoutPrefs = {
  mansetVariant: MansetVariant;
  /** Manşet orta slider kategori filtresi; boşsa tüm kategoriler + yalnızca manşet alanında son dakika. */
  mansetCategorySlug?: string | null;
  authorsHomeVariant: AuthorsHomeVariant;
  tickerFinance: boolean;
  tickerWeather: boolean;
  moduleMacSonuclari: boolean;
  /** true: /tr/{slug} vitrinde üstte Yekpare AppNav (Haberler, Yektube, …) gösterilir */
  showPlatformNav?: boolean;
  /** HABER teması: Video TV / Yektube (yekpare.net/yp) modülü; tanımsızsa açık kabul edilir. */
  hmNewsVideoTvEnabled?: boolean;
  /** HM site: üst şeritte logo (URL) */
  logoUrl?: string | null;
  /** HM site: tarayıcı sekmesi ikonu; boşsa logo kullanılır */
  faviconUrl?: string | null;
  /** HM site: kategori şeridi / vurgu rengi (hex); boşsa portal teması */
  hmPrimaryColor?: string | null;
  /** P2: Yekpare yatay ikon menü ön ayarı (Gündem, Ekonomi, …). */
  yekpareMenuPreset?: YekpareMenuPresetId | null;
  /** P2: Header vitrin ön ayarı (Trabzonik: logo sol, banner sağ, bordo nav). */
  headerPreset?: HmHeaderPresetId | null;
  /** P2: Piyasa / hava bandı konumu. */
  tickerPlacement?: HmTickerPlacementId | null;
  /** Logo satırı sağ alanı: yazı, banner, hava, döviz, arama veya birleşik modlar. */
  hmHeaderRightSlot?: HmHeaderRightSlotId | null;
  /** Logo sağı banner modu: doğrudan görsel URL (boşsa `header_logo_side` reklam slotu). */
  hmHeaderRightBannerUrl?: string | null;
  /** Logo sağı yazı modu: özel metin (boşsa site açıklaması). */
  hmHeaderRightCustomText?: string | null;
  /** HM site: ikincil vurgu rengi (hex); boşsa vitrin teması accent2 veya çiçek preset'i */
  hmSecondaryColor?: string | null;
  /** Kategori slug ÔåÆ vitrin çubuşu / etiket rengi (#rrggbb). îrn. magazin, gundem, dunya, spor */
  hmCategoryColors?: Record<string, string> | null;
  /** HM site: manşet bloğunun hemen altında gösterilecek güvenli HTML (isteğe başlı) */
  hmMansetBelowAdHtml?: string | null;
  /** HABER teması: manşet altı reklam slot modülü; tanımsızsa açık kabul edilir. */
  hmNewsMansetAdModuleEnabled?: boolean;
  /** HABER teması: orta reklam slot modülü; tanımsızsa açık kabul edilir. */
  hmNewsHomeMiddleAdModuleEnabled?: boolean;
  /** HM site: tüm vitrin kromuna yayılan premium renk paleti. Boşsa vurgu renginden tahmin edilir. */
  hmColorPalette?: HmColorPaletteId | null;
  /** HM site: yan sütun üstü HTML (isteğe başlı) */
  hmSidebarAdHtml?: string | null;
  /** Siteye özel reklam slotları (Yekpare Reklam Alanları ile aynı slotKey'ler) */
  hmAdSlots?: HmAdSlotState[] | null;
  /** îzel sayfalar — `/tr/{site}/{slug}` */
  hmExtraPages?: HmExtraPage[] | null;
  /** Vitrin alt bilgi (Site hakkında) — güvenli HTML, kısa metin */
  hmFooterAboutHtml?: string | null;
  /** Alt şerit sağ: sosyal medya URL'leri */
  hmFooterSocial?: HmFooterSocialLinks | null;
  /** Alt şerit: WhatsApp ihbar (ülke kodu ile rakamlar, örn. 905551112233) */
  hmFooterWhatsappIhbar?: string | null;
  /** Sabit kurumsal sayfalar için siteye özel HTML */
  hmCorporatePageHtml?: HmCorporatePageHtml | null;
  /** Kurumsal temada kategori yerine kullanılan manuel üst menü. */
  hmCorporateMenuItems?: HmCorporateMenuItem[] | null;
  /** Kurumsal üst menüde yalnızca «Kurumsal» ve «Sosyal Hizmetler» kökleri (VKD). */
  hmCorporateMenuPrimaryOnly?: boolean;
  /** Kurumsal temada slider/bant altında gösterilen hızlı erişimler. */
  hmCorporateQuickLinks?: HmCorporateQuickLink[] | null;
  /** Kurumsal temada ana slider öşeleri (`Manşette göster` haber bayraşından başımsız). */
  corporateSliderItems?: HmCorporateSliderItem[] | null;
  /** Kurumsal temada slider altı bant öşeleri (`Son dakika` haber bayraşından başımsız). */
  corporateBandItems?: HmCorporateBandItem[] | null;
  /** Kurumsal temada hero bağış kutusu ve alt destek bandı. */
  hmCorporateDonation?: HmCorporateDonationSettings | null;
  /** Kurumsal temada "ATATÜRK KÖŞESİ" anasayfa bölümü; tanımsızsa kapalı kabul edilir. */
  hmCorporateAtaturkCornerEnabled?: boolean;
  /** Kurumsal tema kültür portalı bandı; tanımsızsa kapalı kabul edilir. */
  hmCorporateCulturePortalBandEnabled?: boolean;
  /** Kurumsal tema tarih/savaşlar bilgi bölümü; tanımsızsa kapalı kabul edilir. */
  hmCorporateWarsSectionEnabled?: boolean;
  /** Kurumsal tema millî günler bilgi bölümü; tanımsızsa kapalı kabul edilir. */
  hmCorporateNationalDaysSectionEnabled?: boolean;
  /** Kurumsal tema tarih/savaşlar bilgi bölümü alt başlantısı. */
  hmCorporateWarsSectionHref?: string | null;
  /** Kurumsal tema millî günler bilgi bölümü alt başlantısı. */
  hmCorporateNationalDaysSectionHref?: string | null;
  /** KURUMSAL tema: anasayfa kategori haber blokları; tanımsızsa açık kabul edilir. */
  hmCorporateCategorySectionsEnabled?: boolean;
  /** KURUMSAL tema: RSS güven bandı; tanımsızsa kapalı kabul edilir. */
  hmCorporateRssBandEnabled?: boolean;
  /** KURUMSAL tema: Güncel Haberler listesi; tanımsızsa açık kabul edilir. */
  hmCorporateLatestNewsEnabled?: boolean;
  /** KURUMSAL tema: Güncel Gelişmeler sidebar; tanımsızsa açık kabul edilir. */
  hmCorporateLatestDevelopmentsEnabled?: boolean;
  /** KURUMSAL tema: site özeti kutusu ve Künye/ıletişim/Reklam/Abonelik linkleri; tanımsızsa açık kabul edilir. */
  hmCorporateSidebarInfoEnabled?: boolean;
  /** KURUMSAL tema: RSS son dakika kart bandı; tanımsızsa kapalı kabul edilir. */
  hmCorporateGoogleNewsBandEnabled?: boolean;
  /** KURUMSAL tema: köşe yazarları şeridi, menü ve vitrin; tanımsızsa kapalı kabul edilir. */
  hmCorporateAuthorsEnabled?: boolean;
  /** KURUMSAL tema: manuel hero slider; tanımsızsa açık kabul edilir. */
  hmCorporateHeroEnabled?: boolean;
  /** KURUMSAL tema: slider altı ikon / hızlı erişim bandı; tanımsızsa açık kabul edilir. */
  hmCorporateQuickAccessEnabled?: boolean;
  /** KURUMSAL tema: manşet haber grid (haber kutuları); tanımsızsa açık kabul edilir. */
  hmCorporateMainNewsEnabled?: boolean;
  /** KURUMSAL tema: slider altı reklam slot modülü; tanımsızsa açık kabul edilir. */
  hmCorporateMansetAdModuleEnabled?: boolean;
  /** KURUMSAL tema: orta / alt reklam slot modülü; tanımsızsa açık kabul edilir. */
  hmCorporateHomeMiddleAdModuleEnabled?: boolean;
  /** KURUMSAL ana haber kutusu düzeni; boşsa manset-side. */
  hmCorporateMainNewsLayout?: HmCorporateMainNewsLayout | null;
  /** Editör siteleri: Şehit sorgulama modülü; tanımsızsa kapalı kabul edilir. */
  hmSehitSearchEnabled?: boolean;
  /** KURUMSAL üst menüde kategori sekmesi olarak gösterilecek slug listesi; boşsa varsayılan üçlü kullanılır. */
  /** HABER teması: logo yanındaki üst menü (kategori / kısayol); tanımsızsa açık kabul edilir. */
  hmNewsHeaderMenuEnabled?: boolean;
  /** HABER teması: mobil alt sabit şerit menü; tanımsızsa kapalı kabul edilir. */
  hmNewsStripMenuEnabled?: boolean;
  /** Mobil şerit menü öğeleri; boşsa varsayılan kısayollar kullanılır. */
  hmNewsStripMenuItems?: HmCorporateMenuItem[] | null;
  /** HABER teması: anasayfada Yekpare birleşik arama kutusu; tanımsızsa kapalı kabul edilir. */
  hmNewsSearchBoxEnabled?: boolean;
  /** HABER teması: domain kökünde dinamik index sayfası (site arka planda yüklenir); tanımsızsa kapalı. */
  hmNewsIndexLandingEnabled?: boolean;
  /** HABER teması: Yekpare servis kutuları (Sipariş, Alışveriş, Otomotiv…); tanımsızsa kapalı kabul edilir. */
  hmNewsYekpareFeaturesEnabled?: boolean;
  /** HABER teması: anasayfa manşet sliderı; tanımsızsa açık kabul edilir. */
  hmNewsSliderEnabled?: boolean;
  /** HABER teması: üst tepe manşet bandı (numaralı 1–5); tanımsızsa kapalı kabul edilir. */
  hmNewsTepeMansetEnabled?: boolean;
  /** HABER teması: manşet havuzuna RSS kategorilerinden temsilci haber ekle; tanımsızsa kapalı kabul edilir. */
  hmNewsRssHeadlineEnabled?: boolean;
  /** HABER teması: son dakika / finans / hava durumu bandı; tanımsızsa açık kabul edilir. */
  hmNewsBreakingBandEnabled?: boolean;
  /** HABER teması: RSS kaynaklı, veritabanına yazmayan son dakika kart bandı; tanımsızsa kapalı kabul edilir. */
  hmNewsGoogleNewsBandEnabled?: boolean;
  /** HABER teması: son dakika kart bandı RSS URL'leri. Boş kategori vitrinde gizlenir. */
  hmNewsBreakingRssFeeds?: HmBreakingRssFeeds | null;
  /** HABER teması: son dakika RSS kategori sekmeleri için özel adlar. Tanımsızsa varsayılan ad kullanılır. */
  hmNewsBreakingRssLabels?: HmBreakingRssLabels | null;
  /** HABER teması: son dakika RSS satırları (kategori adı + URL). Birincil kaynak; ekle/sil buradan yönetilir. */
  hmNewsBreakingRssFeedRows?: HmBreakingRssFeedRow[] | null;
  /** HABER teması: site içi RSS / hibrit haber akışı kaynakları. Boşsa eski kart bandı RSS satırları yedek alınır. */
  hmNewsSiteRssFeedRows?: HmBreakingRssFeedRow[] | null;
  /** Yekpare `/haberler` hibrit vitrin: kategori bazlı harici RSS kaynakları (DB'ye yazılmaz). */
  portalHybridRssFeeds?: PortalHybridRssFeed[] | null;
  /** HM haber sitesi: site-içi RSS hibrit haber akışı; tanımsızsa kapalı. Entegrasyon modu: hmRssIntegrationMode. */
  hybridRssEnabled?: boolean;
  /** HABER teması: RSS son dakika kart bandı başlışı; tanımsızsa "Haber Bandı" kullanılır. */
  hmNewsBreakingRssBandTitle?: string | null;
  /** HABER teması: RSS son dakika vitrin görünümü — kart grid veya hareketli haber balonu. */
  hmNewsBreakingRssDisplayMode?: HmBreakingRssDisplayMode | null;
  /** HABER teması: RSS son dakika kartlarında "Habere Git" başlantısı; tanımsızsa kapalı kabul edilir. */
  hmNewsBreakingRssArticleLinkEnabled?: boolean;
  /**
   * Site RSS entegrasyon modu:
   * - live: ziyaret tetiklemeli, DB yok (kutu içi RSS gibi)
   * - persistent: yeni öğede otomatik DB + 6 ay saklama
   * - manual: yalnızca editör «Güncelle» ile DB + 6 ay saklama
   */
  hmRssIntegrationMode?: HmRssIntegrationMode | null;
  /** Yekpare merkez havuzundan haber alımı; tanımsız veya true = al (varsayılan). false = havuz kapalı. */
  hmYekparePoolReceiveEnabled?: boolean;
  /** Site haberlerini merkez havuza gönder; tanımsız veya true = gönder (varsayılan). false = gönderme. */
  hmYekparePoolSendEnabled?: boolean;
  /** HABER teması: anasayfadaki kategori haber blokları; tanımsızsa açık kabul edilir. */
  hmNewsCategorySectionsEnabled?: boolean;
  /** HABER teması: slider yanındaki hızlı erişim kutusu; tanımsızsa açık kabul edilir. */
  hmNewsQuickLinksEnabled?: boolean;
  /** HABER teması: köşe yazarları modülü ve menü linki; tanımsızsa açık kabul edilir. Legacy genel anahtar. */
  hmNewsAuthorsEnabled?: boolean;
  /** HABER teması: yatay köşe yazarları şeridi; tanımsızsa legacy genel anahtara göre açık kabul edilir. */
  hmNewsHorizontalAuthorsEnabled?: boolean;
  /** HABER teması: sağ sidebar köşe yazarları widgetı; tanımsızsa legacy genel anahtara göre açık kabul edilir. */
  hmNewsSidebarAuthorsEnabled?: boolean;
  /** HABER teması: sağ sidebar alanı; tanımsızsa açık kabul edilir. */
  hmNewsSidebarEnabled?: boolean;
  /** HABER teması: sidebar kategori listesi; tanımsızsa açık kabul edilir. */
  hmNewsSidebarCategoriesEnabled?: boolean;
  /** HABER teması: «Güncel Haberler + Gelişmeler» kutusu orta son haberler bandı; tanımsızsa açık kabul edilir. */
  hmNewsLatestGridMainEnabled?: boolean;
  /** HABER teması: «Güncel Haberler + Gelişmeler» kutusu sağ sidebar; tanımsızsa açık kabul edilir. */
  hmNewsLatestGridSidebarEnabled?: boolean;
  /** HABER teması: footer alanı; tanımsızsa açık kabul edilir. */
  hmNewsFooterEnabled?: boolean;
  /** HABER teması: footer kategori listesi; tanımsızsa açık kabul edilir. */
  hmNewsFooterCategoriesEnabled?: boolean;
  /** HABER teması: RSS linkleri ve RSS başlantıları sayfası; tanımsızsa açık kabul edilir. */
  hmNewsRssLinksEnabled?: boolean;
  /** @deprecated Artık yalnızca menü editöründen eklenir; otomatik enjeksiyon yok. */
  hmNewsSubmitLinkEnabled?: boolean;
  /** KURUMSAL: talep formu menü bağlantısı; tanımsızsa açık kabul edilir. */
  hmCorporateRequestFormEnabled?: boolean;
  /** KURUMSAL: talep formu konu listesi. */
  hmCorporateRequestCategories?: HmRequestCategory[] | null;
  /** HABER teması: isteğe bağlı talep formu; tanımsızsa kapalı. */
  hmNewsRequestFormEnabled?: boolean;
  /** HABER teması: talep formu konu listesi. */
  hmNewsRequestCategories?: HmRequestCategory[] | null;
  /** HABER teması: teklif formu konu listesi (Teklif ediyorum). */
  hmNewsOfferCategories?: HmRequestCategory[] | null;
  /** HABER teması: üst şeritte PWA yükleme butonu; tanımsızsa kapalı kabul edilir. */
  hmNewsPwaInstallEnabled?: boolean;
  /** HABER teması: Portal 3 / Yekpare Merkezi bloğu; tanımsızsa kapalı kabul edilir. */
  hmNewsPortal3ThemeBlockEnabled?: boolean;
  /** HABER teması: MANŞET HABER kutusu (yalnızca manuel haberler); tanımsızsa kapalı kabul edilir. */
  hmNewsEsenThemeBlockEnabled?: boolean;
  /** HABER teması: renkli kategori şeridi; tanımsızsa kapalı kabul edilir. */
  hmNewsFeaturedCategoryStripEnabled?: boolean;
  /** HABER teması: Yekpare Kategoriler Kutusu (yekpare.net/haberler grid); tanımsızsa kapalı kabul edilir. */
  hmNewsYekpareKategorilerKutusuEnabled?: boolean;
  /** HABER teması: büyük haber + sağ liste bloğu; tanımsızsa kapalı kabul edilir. */
  hmNewsLeadListSidebarEnabled?: boolean;
  /** HABER teması: video/galeri koyu blok; tanımsızsa kapalı kabul edilir. */
  hmNewsMediaDarkBlockEnabled?: boolean;
  /** HABER teması: sol kategorili son eklenen videolar kutusu; tanımsızsa kapalı kabul edilir. */
  hmNewsRecentVideosSidebarEnabled?: boolean;
  /** HABER teması: Haber Haritası anasayfa modülü; tanımsızsa açık kabul edilir. */
  hmNewsMapModuleEnabled?: boolean;
  /** SPOR haber + Süper Lig puan durumu modülü; tanımsızsa kapalı kabul edilir. */
  hmNewsSporModuleEnabled?: boolean;
  /** HABER teması: Dünyadan Kısa Kısa (küresel RSS); tanımsızsa açık kabul edilir. */
  hmNewsWorldBriefsEnabled?: boolean;
  /** HABER teması: Yemek tarifleri modülü (yemek.net vitrin + tarif haberleri); tanımsızsa kapalı. */
  hmNewsYemekHaberEnabled?: boolean;
  /** HABER teması: Ajans büyük manşet + yan son haberler bloğu; tanımsızsa kapalı kabul edilir. */
  hmNewsAgencyLeadGridEnabled?: boolean;
  /** HABER teması: Ajans ince çizgili kategori gridleri; tanımsızsa kapalı kabul edilir. */
  hmNewsAgencyBorderedGridEnabled?: boolean;
  /** HABER teması: Ajans koyu video/odak şeridi; tanımsızsa kapalı kabul edilir. */
  hmNewsAgencyDarkSpotlightEnabled?: boolean;
  /** HABER teması: Ajans son haber/sidebar listesi; tanımsızsa kapalı kabul edilir. */
  hmNewsAgencyLatestSidebarEnabled?: boolean;
  /** HABER teması: Ajans kompakt konu satırları; tanımsızsa kapalı kabul edilir. */
  hmNewsAgencyTopicRowsEnabled?: boolean;
  /** HABER teması: WSJ editoryal gazete grid bloğu; tanımsızsa kapalı kabul edilir. */
  hmNewsWsjEditorialGridEnabled?: boolean;
  /** HABER teması: Ahenk Haber ikon kategori şeridi; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkIconCategoryRowEnabled?: boolean;
  /** HABER teması: Ahenk Haber Günün Sesi + köşe yazarları; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkGununSesiAuthorsEnabled?: boolean;
  /** HABER teması: Ahenk Haber ANKARA 4'lü grid; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkAnkaraGridEnabled?: boolean;
  /** HABER teması: Ahenk Haber GÜNDEM büyük + 3 yan; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkGundemLeadSideEnabled?: boolean;
  /** HABER teması: Ahenk Haber SPOR 2×3 grid; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkSporGridEnabled?: boolean;
  /** HABER teması: Ahenk Haber DÜNYA bloğu; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkDunyaBlockEnabled?: boolean;
  /** HABER teması: Ahenk Haber EKONOMİ 4×2 grid; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkEkonomiGridEnabled?: boolean;
  /** HABER teması: Ahenk Haber Son Eklenenler listesi; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkSonEklenenlerEnabled?: boolean;
  /** HABER teması: Ahenk Haber Popüler Haberler listesi; tanımsızsa kapalı kabul edilir. */
  hmNewsAhenkPopulerHaberlerEnabled?: boolean;
  /** Klasik / Portal3: manşet yanı «Son Haberler» numaralı liste; tanımsızsa tema varsayılanı. */
  hmNewsClassicHeroLatestEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: kamu bilgi kartları (namaz / günün sözü); tanımsızsa kapalı kabul edilir. */
  sadeNewsPublicInfoEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: bülten CTA; tanımsızsa açık kabul edilir. */
  sadeNewsNewsletterEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: son gelişmeler zaman çizgisi; tanımsızsa kapalı kabul edilir. */
  sadeNewsTimelineEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: son haberler kart ızgarası; tanımsızsa açık kabul edilir. */
  sadeNewsLatestGridEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: popüler haberler sidebar; tanımsızsa açık kabul edilir. */
  sadeNewsPopularSidebarEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: Atatürk bandı; tanımsızsa açık kabul edilir. */
  sadeNewsAtaturkBandEnabled?: boolean;
  /** @deprecated Kültür bandı kaldırıldı — yalnızca legacy JSON uyumluluğu. */
  sadeNewsCultureBandEnabled?: boolean;
  /** Yekpare anasayfa (`/`) Türkiye Şehirleri bandı; tanımsızsa kapalı kabul edilir. */
  sadeNewsCitiesBandEnabled?: boolean;
  /** @deprecated Savaşlar bandı — `historyNationalDaysBand` ile birleştirildi. */
  sadeNewsWarsBandEnabled?: boolean;
  /** @deprecated Millî günler bandı — `historyNationalDaysBand` ile birleştirildi. */
  sadeNewsNationalDaysBandEnabled?: boolean;
  /** Yekpare `/haberler` Sade tema: Tarih ve Millî Günler birleşik bandı; tanımsızsa kapalı kabul edilir. */
  sadeNewsHistoryNationalDaysBandEnabled?: boolean;
  /** Yekpare `/haberler` Sade editoryal modül sırası. */
  sadeNewsPortalModuleOrder?: string[] | null;
  /** HABER teması anasayfa modül sırası. Bilinmeyen/eksik modüller varsayılan sıraya tamamlanır. */
  hmNewsHomeModuleOrder?: string[] | null;
  /** HABER teması: anasayfa haber modülü -> kategori slug filtresi. Boşsa modül tüm haber havuzunu kullanır. */
  hmNewsHomeModuleCategorySlugs?: HmNewsHomeModuleCategorySlugs | null;
  /** HABER teması: galeri koyu blokları için kaynak (Foto / Video Galeri / Video TV / Karma). */
  hmNewsHomeModuleGallerySources?: HmNewsHomeModuleGallerySources | null;
  /** Video TV seçiliyken kanal / oynatma listesi; Video Galeri seçiliyken manuel Video TV bağlantısı. */
  hmNewsHomeModuleGalleryVideoTvRefs?: HmNewsHomeModuleGalleryVideoTvRefs | null;
  /** Galeri vitrin varsayılan modu; modül ayarı yoksa kullanılır (`mixed` = karma, Video TV öncelikli). */
  hmNewsGallerySpotlightMode?: HmNewsGallerySpotlightMode | null;
  /** Video TV kanal kaynağı (global varsayılan). */
  hmNewsVideoTvChannelId?: number | null;
  /** Video TV oynatma listesi kaynağı (global varsayılan). */
  hmNewsVideoTvPlaylistId?: number | null;
  /** Video Galeri modunda öne çıkarılacak manuel Video TV bağlantısı (global varsayılan). */
  hmNewsVideoTvManualLink?: string | null;
  /** KURUMSAL tema anasayfa modül sırası. Bilinmeyen/eksik modüller varsayılan sıraya tamamlanır. */
  hmCorporateHomeModuleOrder?: string[] | null;
  /** HABER teması footer sayfa menüsü. Boşsa varsayılan footer sayfaları kullanılır. */
  hmNewsFooterMenuItems?: HmNewsMenuItem[] | null;
  /** HABER teması sağ sidebar manuel başlantıları. */
  hmNewsSidebarMenuItems?: HmNewsMenuItem[] | null;
  /**
   * Bu slug'lar HM vitrininde üst şerit ve anasayfa kategori bloklarında gizlenir.
   * Haber eklerken kategori seçimi etkilenmez (tüm portal kategorileri).
   */
  hmNavHiddenCategorySlugs?: string[] | null;
  /**
   * Editörün bu sitede AKTİF ettiği GENEL (Yekpare) kategori slug'ları.
   * Boş/null = tüm genel kategoriler aktif (varsayılan). Dolu = yalnızca bu kategorilerin
   * Yekpare havuzu haberleri bu sitede gösterilir.
   */
  hmActivatedCategorySlugs?: string[] | null;
  /**
   * Editörün RSS panelinden «siteden kaldır» ile gizlediği merkez RSS öğe kimlikleri.
   * Merkez havuz silinmez; yalnızca bu sitede listelenmez.
   */
  hmHiddenRssItemIds?: string[] | null;
  /**
   * Diğer HM editör sitelerinden manuel eklenip merkez havuza sync/pool ile gelen haberler
   * bu sitede gösterilsin mi? Tanımsız veya true = göster (varsayılan). false = gizle.
   */
  hmAllowCrossSiteManualNews?: boolean;
  /** HM vitrin menü / anasayfa bloklarında kategori sırası (slug listesi, üstten alta). */
  hmCategorySortSlugs?: string[] | null;
  /** Klasik haber temasında ara manşet kategori blokları için seçili slug listesi. Boşsa otomatik kategori akışı kullanılır. */
  hmClassicAraMansetCategorySlugs?: string[] | null;
  /** Renkli kategori şeridi (featuredCategoryStrip) için gösterilecek kategori slug listesi. Boşsa otomatik dağıtım. */
  hmNewsFeaturedCategoryStripSlugs?: string[] | null;
  /** Yekpare Kategoriler Kutusu modülü için kategori slug listesi. Boşsa otomatik dağıtım. */
  hmYekpareKategorilerKutusuSlugs?: string[] | null;
  /** Yekpare Kategoriler Kutusu: anasayfada gösterilecek kategori kutusu sayısı (2, 4, 6, 8). */
  hmYekpareCategoryBoxCount?: number | null;
  /** Yekpare Kategoriler Kutusu: kutu başına haber sayısı (1 öne çıkan + liste). Varsayılan 5. */
  hmYekpareKategorilerKutusuItemCount?: number | null;
  /** Vitrin zemini ve üst şerit tonları (`styles/hmVitrinThemes.css`). */
  hmVitrinTheme?: HmVitrinThemeId | null;
  /** Kurumsal temada gövde genişlişi: `full` kenardan kenara, `contained` ortalı/max-width. */
  hmCorporateLayoutWidth?: HmCorporateLayoutWidth | null;
  /**
   * true: logo şeridi ve kategori menüsü yatayda kenardan kenara (eski görünüm).
   * false veya tanımsız: şeritler `max-w-screen-xl` ile ana vitrin içerişiyle aynı genişlikte.
   */
  hmHeaderChromeFullBleed?: boolean;
  /** Logo şeridi arka planı (#rgb veya #rrggbb). Boşsa vitrin teması (`--hm-header-bg`). */
  hmLogoBarBackground?: string | null;
  /** Kategori menü şeridi arka planı. Boşsa `--hm-nav-strip-bg` / tema. */
  hmNavBarBackground?: string | null;
  /** Üst krom açık/koyu modu; tanımsız veya `auto` = tema varsayılanı. */
  hmChromeColorMode?: HmChromeColorMode | null;
};

export const HM_NEWS_HOME_MODULE_ORDER = [
  "breakingBand",
  "yekpareSearchBox",
  "googleNewsBand",
  "tepeManset",
  "hero",
  "newsMapModule",
  "worldBriefs",
  "yemekHaber",
  "ahenkGununSesiAuthors",
  "ahenkIconCategoryRow",
  "ahenkAnkaraGrid",
  "ahenkGundemLeadSide",
  "ahenkSporGrid",
  "sporModule",
  "ahenkDunyaBlock",
  "ahenkEkonomiGrid",
  "ahenkSonEklenenler",
  "ahenkPopulerHaberler",
  "portal3ThemeBlock",
  "esenThemeBlock",
  "featuredCategoryStrip",
  "yekpareKategorilerKutusu",
  "leadListSidebar",
  "mediaDarkBlock",
  "recentVideosSidebar",
  "mansetAd",
  "authorsStrip",
  "popularCities",
  "culturePortal",
  "ataturkCorner",
  "sehitSearch",
  "heritageInfo",
  "homeMiddleAd",
  "latestGrid",
  "donationSupport",
] as const;

/** Anasayfa site içi RSS / son haberler bandı: sabit kutu sayısı (3 sütun × 4 satır). */
export const HM_HOME_LATEST_BAND_ITEM_COUNT = 12;

export const HM_CORPORATE_HOME_MODULE_ORDER = [
  "hero",
  "quickAccess",
  "googleNewsBand",
  "sehitSearch",
  "culturePortal",
  "ataturkCorner",
  "mansetAd",
  "mainNews",
  "popularCities",
  "rssBand",
  "authorsStrip",
  "homeMiddleAd",
  "latestGrid",
  "heritageInfo",
  "donationSupport",
] as const;

export type HmNewsHomeModuleId = (typeof HM_NEWS_HOME_MODULE_ORDER)[number];
export type HmCorporateHomeModuleId = (typeof HM_CORPORATE_HOME_MODULE_ORDER)[number];
export type HmNewsHomeModuleCategorySlugs = Partial<Record<HmNewsHomeModuleId, string>>;

export type HmNewsHomeModuleGallerySources = Partial<Record<HmMediaGalleryHomeModuleId, HmMediaGallerySourceId>>;

const HM_NEWS_THEME_DEFAULT_MODULES: Partial<Record<HmVitrinThemeId, HmNewsHomeModuleId[]>> = {
  news: ["yekpareKategorilerKutusu", "recentVideosSidebar"],
  default: ["yekpareKategorilerKutusu", "recentVideosSidebar"],
  classic: ["yekpareKategorilerKutusu", "recentVideosSidebar", "featuredCategoryStrip"],
  portal3: ["portal3ThemeBlock", "yekpareKategorilerKutusu", "recentVideosSidebar"],
  esen: ["esenThemeBlock"],
  renkli: ["featuredCategoryStrip"],
  ahenkhaber: [
    "ahenkIconCategoryRow",
    "ahenkGununSesiAuthors",
    "ahenkAnkaraGrid",
    "ahenkGundemLeadSide",
    "ahenkSporGrid",
    "ahenkDunyaBlock",
    "ahenkEkonomiGrid",
    "ahenkSonEklenenler",
    "ahenkPopulerHaberler",
  ],
  modern: ["featuredCategoryStrip", "leadListSidebar", "mediaDarkBlock"],
  sumbul: ["hero", "authorsStrip", "yekpareKategorilerKutusu", "worldBriefs", "latestGrid"],
};

/** Modül sırası editöründe gösterilmez — yapısal üst bant (döviz/hava ayrı şeritte). */
export const HM_NEWS_STRUCTURAL_HOME_MODULE_IDS = ["breakingBand"] as const;

/** Editör modül sırası listesi (yapısal modüller hariç). */
export const HM_NEWS_EDITOR_HOME_MODULE_ORDER = HM_NEWS_HOME_MODULE_ORDER.filter(
  (id) => !(HM_NEWS_STRUCTURAL_HOME_MODULE_IDS as readonly string[]).includes(id),
);

const HM_NEWS_THEME_MODULE_TOGGLE_KEYS: Partial<Record<HmNewsHomeModuleId, keyof NewsSiteLayoutPrefs>> = {
  ahenkIconCategoryRow: "hmNewsAhenkIconCategoryRowEnabled",
  ahenkGununSesiAuthors: "hmNewsAhenkGununSesiAuthorsEnabled",
  ahenkAnkaraGrid: "hmNewsAhenkAnkaraGridEnabled",
  ahenkGundemLeadSide: "hmNewsAhenkGundemLeadSideEnabled",
  ahenkSporGrid: "hmNewsAhenkSporGridEnabled",
  ahenkDunyaBlock: "hmNewsAhenkDunyaBlockEnabled",
  ahenkEkonomiGrid: "hmNewsAhenkEkonomiGridEnabled",
  ahenkSonEklenenler: "hmNewsAhenkSonEklenenlerEnabled",
  ahenkPopulerHaberler: "hmNewsAhenkPopulerHaberlerEnabled",
  portal3ThemeBlock: "hmNewsPortal3ThemeBlockEnabled",
  esenThemeBlock: "hmNewsEsenThemeBlockEnabled",
  featuredCategoryStrip: "hmNewsFeaturedCategoryStripEnabled",
  yekpareKategorilerKutusu: "hmNewsYekpareKategorilerKutusuEnabled",
  leadListSidebar: "hmNewsLeadListSidebarEnabled",
  mediaDarkBlock: "hmNewsMediaDarkBlockEnabled",
  recentVideosSidebar: "hmNewsRecentVideosSidebarEnabled",
};

const HM_NEWS_THEME_TOGGLE_MODULE_IDS = Object.keys(HM_NEWS_THEME_MODULE_TOGGLE_KEYS) as HmNewsHomeModuleId[];

export function buildHmNewsThemeModuleOrder(theme: HmVitrinThemeId | string | null | undefined): HmNewsHomeModuleId[] {
  const themeId = String(theme ?? "") as HmVitrinThemeId;
  const themeModules = HM_NEWS_THEME_DEFAULT_MODULES[themeId] ?? [];
  if (themeModules.length === 0) return [...HM_NEWS_HOME_MODULE_ORDER];
  const base = [...HM_NEWS_HOME_MODULE_ORDER];
  const themeSet = new Set(themeModules);
  const rest = base.filter((id) => !themeSet.has(id));
  const heroIdx = rest.indexOf("hero");
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 1;
  const orderedThemeModules = themeModules.filter((id) => base.includes(id));
  rest.splice(insertAt, 0, ...orderedThemeModules);
  return rest;
}

/** Editörde açık/kapalı toggle ile yönetilen anasayfa haber kutuları. */
export const HM_NEWS_VITRIN_TOGGLE_MODULE_LABELS: Partial<Record<HmNewsHomeModuleId, string>> = {
  ahenkIconCategoryRow: "İkon Kategori Şeridi",
  ahenkGununSesiAuthors: "Günün Sesi + Köşe Yazarları",
  ahenkAnkaraGrid: "ANKARA (4'lü grid)",
  ahenkGundemLeadSide: "GÜNDEM (büyük + 3 yan)",
  ahenkSporGrid: "SPOR (2×3 grid)",
  ahenkDunyaBlock: "DÜNYA bloğu",
  ahenkEkonomiGrid: "EKONOMİ (4×2 grid)",
  ahenkSonEklenenler: "Son Eklenenler",
  ahenkPopulerHaberler: "Popüler Haberler",
  portal3ThemeBlock: "Yekpare Haberler",
  esenThemeBlock: "MANŞET HABER",
  featuredCategoryStrip: "Kategori Vitrini",
  yekpareKategorilerKutusu: "Yekpare Kategoriler Kutusu",
  leadListSidebar: "Öne Çıkan Haber Dosyası",
  mediaDarkBlock: "Video / Galeri",
  recentVideosSidebar: "Son Eklenen Videolar",
};

export const HM_NEWS_VITRIN_TOGGLE_MODULE_IDS = Object.keys(
  HM_NEWS_VITRIN_TOGGLE_MODULE_LABELS,
) as HmNewsHomeModuleId[];

/** Editör modül etiketlerinde tema çiçek adları (`HM_VITRIN_THEME_FLOWER_LABELS`). */
export const HM_VITRIN_THEME_SHORT_LABELS: Partial<Record<HmVitrinThemeId, string>> = {
  news: HM_VITRIN_THEME_FLOWER_LABELS.news,
  default: HM_VITRIN_THEME_FLOWER_LABELS.default,
  classic: HM_VITRIN_THEME_FLOWER_LABELS.classic,
  portal3: HM_VITRIN_THEME_FLOWER_LABELS.portal3,
  esen: HM_VITRIN_THEME_FLOWER_LABELS.esen,
  manset24: HM_VITRIN_THEME_FLOWER_LABELS.manset24,
  renkli: HM_VITRIN_THEME_FLOWER_LABELS.renkli,
  ahenkhaber: HM_VITRIN_THEME_FLOWER_LABELS.ahenkhaber,
  modern: HM_VITRIN_THEME_FLOWER_LABELS.modern,
  corporate: HM_VITRIN_THEME_FLOWER_LABELS.corporate,
  ankara: HM_VITRIN_THEME_FLOWER_LABELS.ankara,
  gold: HM_VITRIN_THEME_FLOWER_LABELS.gold,
  sumbul: HM_VITRIN_THEME_FLOWER_LABELS.sumbul,
};

/** Haber vitrin editörü — tema seçici satırları (depolama anahtarı + çiçek adı). */
export const HM_VITRIN_THEME_NEWS_EDITOR_OPTIONS = [
  { value: "news", label: `${HM_VITRIN_THEME_FLOWER_LABELS.news} (mevcut varsayılan tema)` },
  {
    value: "classic",
    label: `${HM_VITRIN_THEME_FLOWER_LABELS.classic} — klasik haber portalı (lacivert / kırmızı)`,
  },
  {
    value: "portal3",
    label: `${HM_VITRIN_THEME_FLOWER_LABELS.portal3} — gazete portalı (gri zemin / kırmızı vurgu)`,
  },
  { value: "esen", label: `${HM_VITRIN_THEME_FLOWER_LABELS.esen} — uzun magazin ana sayfa` },
  {
    value: "manset24",
    label: `${HM_VITRIN_THEME_FLOWER_LABELS.manset24} — koyu son dakika teması (kırmızı vurgu)`,
  },
  { value: "renkli", label: `${HM_VITRIN_THEME_FLOWER_LABELS.renkli} — renkli kategori teması` },
  {
    value: "ahenkhaber",
    label: `${HM_VITRIN_THEME_FLOWER_LABELS.ahenkhaber} — Ahenk Haber (koyu nav / kırmızı vurgu)`,
  },
  { value: "modern", label: `${HM_VITRIN_THEME_FLOWER_LABELS.modern} — modern haber vitrini` },
  {
    value: "sumbul",
    label: `${HM_VITRIN_THEME_FLOWER_LABELS.sumbul} — Yekpare haber teması (mavi vurgu, kategori kutuları)`,
  },
] as const satisfies ReadonlyArray<{ value: HmVitrinThemeId; label: string }>;

export { hmVitrinThemeFlowerLabel, HM_VITRIN_THEME_FLOWER_LABELS };

/** Modülün birincil / tipik kullanıldığı vitrin temaları (editör etiketi için). */
export const HM_NEWS_MODULE_THEME_MAP: Partial<Record<HmNewsHomeModuleId, HmVitrinThemeId[]>> = {
  ahenkGununSesiAuthors: ["ahenkhaber"],
  ahenkAnkaraGrid: ["ahenkhaber"],
  ahenkGundemLeadSide: ["ahenkhaber"],
  ahenkSporGrid: ["ahenkhaber"],
  ahenkDunyaBlock: ["ahenkhaber"],
  ahenkEkonomiGrid: ["ahenkhaber"],
  ahenkSonEklenenler: ["ahenkhaber"],
  ahenkPopulerHaberler: ["ahenkhaber"],
  portal3ThemeBlock: ["portal3"],
  esenThemeBlock: ["esen"],
  featuredCategoryStrip: ["classic", "renkli", "modern"],
  yekpareKategorilerKutusu: ["news", "sumbul"],
  yemekHaber: ["sumbul", "news"],
  ahenkIconCategoryRow: ["ahenkhaber"],
  leadListSidebar: ["modern"],
  mediaDarkBlock: ["modern", "esen"],
  recentVideosSidebar: ["classic", "portal3"],
};

export function formatHmNewsModuleEditorLabel(
  moduleId: HmNewsHomeModuleId,
  baseLabel: string,
  currentTheme?: HmVitrinThemeId | string | null,
): string {
  const themes = HM_NEWS_MODULE_THEME_MAP[moduleId];
  if (themes?.length) {
    const prefix = themes
      .map((themeId) => HM_VITRIN_THEME_SHORT_LABELS[themeId] ?? hmVitrinThemeFlowerLabel(themeId))
      .join(" / ");
    return `${prefix}: ${baseLabel}`;
  }
  if (currentTheme) {
    return `${hmVitrinThemeFlowerLabel(currentTheme)}: ${baseLabel}`;
  }
  return baseLabel;
}

/** Modül yalnızca belirli vitrin temalarında kullanılıyorsa seçili tema ile uyumlu mu? */
export function isHmNewsModuleCompatibleWithTheme(
  theme: HmVitrinThemeId | string | null | undefined,
  moduleId: HmNewsHomeModuleId,
): boolean {
  const mapped = HM_NEWS_MODULE_THEME_MAP[moduleId];
  if (!mapped?.length) return true;
  return mapped.includes(normalizeHmVitrinTheme(theme));
}

/** Editörde modül aç/kapa — tema kısıtlı modüller yanlış temada etkinleştirilemez. */
export function canEnableHmNewsEditorModuleForTheme(
  theme: HmVitrinThemeId | string | null | undefined,
  moduleId: HmNewsHomeModuleId,
): boolean {
  return isHmNewsModuleCompatibleWithTheme(theme, moduleId);
}

/** Haber vitrinlerinde manşet sağ «Son Haberler» kutusu — editör toggle. */
export function resolveHmNewsClassicHeroLatestEnabled(
  p: Pick<NewsSiteLayoutPrefs, "hmVitrinTheme" | "hmNewsClassicHeroLatestEnabled"> | null | undefined,
): boolean {
  if (!p) return false;
  if (p.hmNewsClassicHeroLatestEnabled === true) return true;
  if (p.hmNewsClassicHeroLatestEnabled === false) return false;
  const theme = normalizeHmVitrinTheme(p.hmVitrinTheme);
  if (theme === "corporate" || theme === "ahenkhaber") return false;
  return (
    theme === "classic" ||
    theme === "portal3" ||
    theme === "news" ||
    theme === "modern" ||
    theme === "esen" ||
    theme === "manset24" ||
    theme === "renkli"
  );
}

const HM_NEWS_VITRIN_TOGGLE_MODULE_SET = new Set<HmNewsHomeModuleId>(HM_NEWS_VITRIN_TOGGLE_MODULE_IDS);

export function isHmNewsVitrinToggleModule(moduleId: HmNewsHomeModuleId): boolean {
  return HM_NEWS_VITRIN_TOGGLE_MODULE_SET.has(moduleId);
}

/** Haber anasayfa modülleri — yalnızca kurumsal vitrin temasında editörde gösterilir. */
export const HM_NEWS_CORPORATE_ONLY_HOME_MODULE_IDS = [
  "culturePortal",
  "ataturkCorner",
  "sehitSearch",
  "heritageInfo",
  "donationSupport",
] as const satisfies readonly HmNewsHomeModuleId[];

export function isHmNewsCorporateOnlyHomeModule(moduleId: HmNewsHomeModuleId): boolean {
  return (HM_NEWS_CORPORATE_ONLY_HOME_MODULE_IDS as readonly string[]).includes(moduleId);
}

/** Haber vitrin editöründe modül satırı / toggle gösterilsin mi? */
export function shouldShowHmNewsEditorModule(
  theme: HmVitrinThemeId | string | null | undefined,
  moduleId: HmNewsHomeModuleId,
): boolean {
  if (normalizeHmVitrinTheme(theme) !== "corporate" && isHmNewsCorporateOnlyHomeModule(moduleId)) {
    return false;
  }
  if (isHmNewsVitrinToggleModule(moduleId)) {
    return isHmNewsModuleCompatibleWithTheme(theme, moduleId);
  }
  return true;
}

export function hasAnyHmNewsVitrinToggleModuleEnabled(
  p: Parameters<typeof resolveHmNewsHomeModuleEnabled>[0],
): boolean {
  return HM_NEWS_VITRIN_TOGGLE_MODULE_IDS.some((moduleId) => resolveHmNewsHomeModuleEnabled(p, moduleId));
}

export function isHmNewsHomeModuleDefaultEnabledForTheme(
  theme: HmVitrinThemeId | string | null | undefined,
  moduleId: HmNewsHomeModuleId,
): boolean {
  const list = HM_NEWS_THEME_DEFAULT_MODULES[String(theme ?? "") as HmVitrinThemeId] ?? [];
  return list.includes(moduleId);
}

export function resolveHmNewsHomeModuleEnabled(
  p: Pick<
    NewsSiteLayoutPrefs,
    | "hmVitrinTheme"
    | "hmNewsAgencyLeadGridEnabled"
    | "hmNewsAgencyLatestSidebarEnabled"
    | "hmNewsAgencyBorderedGridEnabled"
    | "hmNewsAgencyDarkSpotlightEnabled"
    | "hmNewsAgencyTopicRowsEnabled"
    | "hmNewsWsjEditorialGridEnabled"
    | "hmNewsAhenkIconCategoryRowEnabled"
    | "hmNewsAhenkGununSesiAuthorsEnabled"
    | "hmNewsAhenkAnkaraGridEnabled"
    | "hmNewsAhenkGundemLeadSideEnabled"
    | "hmNewsAhenkSporGridEnabled"
    | "hmNewsAhenkDunyaBlockEnabled"
    | "hmNewsAhenkEkonomiGridEnabled"
    | "hmNewsAhenkSonEklenenlerEnabled"
    | "hmNewsAhenkPopulerHaberlerEnabled"
    | "hmNewsPortal3ThemeBlockEnabled"
    | "hmNewsEsenThemeBlockEnabled"
    | "hmNewsFeaturedCategoryStripEnabled"
    | "hmNewsYekpareKategorilerKutusuEnabled"
    | "hmNewsLeadListSidebarEnabled"
    | "hmNewsMediaDarkBlockEnabled"
    | "hmNewsRecentVideosSidebarEnabled"
  > | null | undefined,
  moduleId: HmNewsHomeModuleId,
): boolean {
  if (isHmNewsRetiredHomeModule(moduleId)) return false;
  if (!p) return false;
  const explicitByModule: Partial<Record<HmNewsHomeModuleId, boolean | undefined>> = {
    ahenkIconCategoryRow: p.hmNewsAhenkIconCategoryRowEnabled,
    ahenkGununSesiAuthors: p.hmNewsAhenkGununSesiAuthorsEnabled,
    ahenkAnkaraGrid: p.hmNewsAhenkAnkaraGridEnabled,
    ahenkGundemLeadSide: p.hmNewsAhenkGundemLeadSideEnabled,
    ahenkSporGrid: p.hmNewsAhenkSporGridEnabled,
    ahenkDunyaBlock: p.hmNewsAhenkDunyaBlockEnabled,
    ahenkEkonomiGrid: p.hmNewsAhenkEkonomiGridEnabled,
    ahenkSonEklenenler: p.hmNewsAhenkSonEklenenlerEnabled,
    ahenkPopulerHaberler: p.hmNewsAhenkPopulerHaberlerEnabled,
    portal3ThemeBlock: p.hmNewsPortal3ThemeBlockEnabled,
    esenThemeBlock: p.hmNewsEsenThemeBlockEnabled,
    featuredCategoryStrip: p.hmNewsFeaturedCategoryStripEnabled,
    yekpareKategorilerKutusu: p.hmNewsYekpareKategorilerKutusuEnabled,
    leadListSidebar: p.hmNewsLeadListSidebarEnabled,
    mediaDarkBlock: p.hmNewsMediaDarkBlockEnabled,
    recentVideosSidebar: p.hmNewsRecentVideosSidebarEnabled,
  };
  const explicit = explicitByModule[moduleId];
  if (explicit === true) return true;
  if (explicit === false) return false;
  return isHmNewsHomeModuleDefaultEnabledForTheme(p.hmVitrinTheme, moduleId);
}

/** Editör «Haber modül sırası» satırında görünen modülün anasayfada aktif olup olmadığı. */
export function resolveHmNewsEditorModuleEnabled(
  p: NewsSiteLayoutPrefs | null | undefined,
  moduleId: HmNewsHomeModuleId,
  opts?: { portalHubOnly?: boolean },
): boolean {
  if (isHmNewsRetiredHomeModule(moduleId)) return false;
  if (opts?.portalHubOnly === false && isHmHubOnlyHomeModule(moduleId)) return false;
  if (!p) return true;
  if (moduleId === "recentVideosSidebar" && !resolveHmNewsVideoTvEnabled(p)) return false;
  if (isHmNewsVitrinToggleModule(moduleId)) {
    return resolveHmNewsHomeModuleEnabled(p, moduleId);
  }
  switch (moduleId) {
    case "breakingBand":
      return p.hmNewsBreakingBandEnabled !== false;
    case "yekpareSearchBox":
      if (normalizeHmVitrinTheme(p.hmVitrinTheme) === "sumbul") return false;
      return p.hmNewsSearchBoxEnabled === true;
    case "googleNewsBand":
      return p.hmNewsGoogleNewsBandEnabled === true;
    case "hero":
      return p.hmNewsSliderEnabled !== false;
    case "tepeManset":
      return p.hmNewsTepeMansetEnabled === true;
    case "mansetAd":
      return p.hmNewsMansetAdModuleEnabled !== false;
    case "authorsStrip":
      return resolveHmNewsHorizontalAuthorsEnabled(p);
    case "popularCities":
      return p.sadeNewsCitiesBandEnabled === true;
    case "newsMapModule":
      return p.hmNewsMapModuleEnabled !== false;
    case "sporModule":
      return p.hmNewsSporModuleEnabled === true;
    case "worldBriefs":
      return p.hmNewsWorldBriefsEnabled !== false;
    case "yemekHaber":
      return p.hmNewsYemekHaberEnabled === true;
    case "culturePortal":
      return p.hmCorporateCulturePortalBandEnabled === true;
    case "ataturkCorner":
      return p.hmCorporateAtaturkCornerEnabled === true;
    case "sehitSearch":
      return p.hmSehitSearchEnabled === true;
    case "heritageInfo":
      return p.hmCorporateWarsSectionEnabled === true || p.hmCorporateNationalDaysSectionEnabled === true;
    case "homeMiddleAd":
      return p.hmNewsHomeMiddleAdModuleEnabled !== false;
    case "latestGrid":
      return resolveHmNewsLatestGridMainEnabled(p) || resolveHmNewsLatestGridSidebarEnabled(p);
    case "donationSupport":
      return p.hmCorporateDonation?.enabled === true;
    default:
      return true;
  }
}

/** Editör modül sırası satırından aç/kapa — mevcut tercih anahtarlarına yansıtılır. */
export function applyHmNewsEditorModuleTogglePatch(
  p: NewsSiteLayoutPrefs,
  moduleId: HmNewsHomeModuleId,
  checked: boolean,
): Partial<NewsSiteLayoutPrefs> {
  const themeToggleKey = HM_NEWS_THEME_MODULE_TOGGLE_KEYS[moduleId];
  if (themeToggleKey) {
    return { [themeToggleKey]: checked };
  }
  switch (moduleId) {
    case "breakingBand":
      return { hmNewsBreakingBandEnabled: checked };
    case "yekpareSearchBox":
      return { hmNewsSearchBoxEnabled: checked };
    case "googleNewsBand":
      return { hmNewsGoogleNewsBandEnabled: checked };
    case "hero":
      return { hmNewsSliderEnabled: checked };
    case "tepeManset":
      return { hmNewsTepeMansetEnabled: checked };
    case "mansetAd":
      return { hmNewsMansetAdModuleEnabled: checked };
    case "authorsStrip":
      return { hmNewsHorizontalAuthorsEnabled: checked };
    case "popularCities":
      return { sadeNewsCitiesBandEnabled: checked };
    case "newsMapModule":
      return { hmNewsMapModuleEnabled: checked };
    case "sporModule":
      return { hmNewsSporModuleEnabled: checked };
    case "worldBriefs":
      return { hmNewsWorldBriefsEnabled: checked };
    case "yemekHaber":
      return { hmNewsYemekHaberEnabled: checked };
    case "culturePortal":
      return { hmCorporateCulturePortalBandEnabled: checked };
    case "ataturkCorner":
      return { hmCorporateAtaturkCornerEnabled: checked };
    case "sehitSearch":
      return { hmSehitSearchEnabled: checked };
    case "heritageInfo":
      return {
        hmCorporateWarsSectionEnabled: checked,
        hmCorporateNationalDaysSectionEnabled: checked,
      };
    case "homeMiddleAd":
      return { hmNewsHomeMiddleAdModuleEnabled: checked };
    case "latestGrid":
      return {
        hmNewsLatestGridMainEnabled: checked,
        hmNewsLatestGridSidebarEnabled: checked,
      };
    case "donationSupport":
      return {
        hmCorporateDonation: {
          ...(p.hmCorporateDonation ?? {}),
          enabled: checked,
        },
      };
    default:
      return {};
  }
}

export function parseHmCorporateMainNewsLayout(raw: unknown): HmCorporateMainNewsLayout | undefined {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "manset-side" || v === "manset_side" || v === "split") return "manset-side";
  if (v === "lead-side-grid" || v === "lead_side_grid" || v === "grid-2col" || v === "grid_2col") {
    return "lead-side-grid";
  }
  return undefined;
}

export function resolveHmCorporateMainNewsLayout(
  prefs: NewsSiteLayoutPrefs | null | undefined,
): HmCorporateMainNewsLayout {
  return parseHmCorporateMainNewsLayout(prefs?.hmCorporateMainNewsLayout) ?? "manset-side";
}

/** Editör «Kurumsal modül sırası» satırında görünen modülün anasayfada aktif olup olmadığı. */
export function resolveHmCorporateEditorModuleEnabled(
  p: NewsSiteLayoutPrefs | null | undefined,
  moduleId: HmCorporateHomeModuleId,
): boolean {
  if (!p) return true;
  switch (moduleId) {
    case "hero":
      return p.hmCorporateHeroEnabled !== false;
    case "quickAccess":
      return p.hmCorporateQuickAccessEnabled !== false;
    case "googleNewsBand":
      return p.hmCorporateGoogleNewsBandEnabled === true;
    case "culturePortal":
      return p.hmCorporateCulturePortalBandEnabled === true;
    case "mansetAd":
      return p.hmCorporateMansetAdModuleEnabled !== false;
    case "mainNews":
      return p.hmCorporateMainNewsEnabled !== false;
    case "popularCities":
      return p.sadeNewsCitiesBandEnabled === true;
    case "ataturkCorner":
      return p.hmCorporateAtaturkCornerEnabled === true;
    case "rssBand":
      return p.hmCorporateRssBandEnabled === true;
    case "authorsStrip":
      return resolveHmCorporateAuthorsEnabled(p);
    case "homeMiddleAd":
      return p.hmCorporateHomeMiddleAdModuleEnabled !== false;
    case "latestGrid":
      return p.hmCorporateLatestNewsEnabled !== false || p.hmCorporateLatestDevelopmentsEnabled !== false || p.hmCorporateSidebarInfoEnabled !== false;
    case "heritageInfo":
      return p.hmCorporateWarsSectionEnabled === true || p.hmCorporateNationalDaysSectionEnabled === true;
    case "sehitSearch":
      return p.hmSehitSearchEnabled === true;
    case "donationSupport":
      return p.hmCorporateDonation?.enabled === true;
    default:
      return true;
  }
}

/** Editör kurumsal modül sırası satırından aç/kapa — mevcut tercih anahtarlarına yansıtılır. */
export function applyHmCorporateEditorModuleTogglePatch(
  p: NewsSiteLayoutPrefs,
  moduleId: HmCorporateHomeModuleId,
  checked: boolean,
): Partial<NewsSiteLayoutPrefs> {
  switch (moduleId) {
    case "hero":
      return { hmCorporateHeroEnabled: checked };
    case "quickAccess":
      return { hmCorporateQuickAccessEnabled: checked };
    case "googleNewsBand":
      return { hmCorporateGoogleNewsBandEnabled: checked };
    case "culturePortal":
      return { hmCorporateCulturePortalBandEnabled: checked };
    case "mansetAd":
      return { hmCorporateMansetAdModuleEnabled: checked };
    case "mainNews":
      return { hmCorporateMainNewsEnabled: checked };
    case "popularCities":
      return { sadeNewsCitiesBandEnabled: checked };
    case "ataturkCorner":
      return { hmCorporateAtaturkCornerEnabled: checked };
    case "rssBand":
      return { hmCorporateRssBandEnabled: checked };
    case "authorsStrip":
      return { hmCorporateAuthorsEnabled: checked };
    case "homeMiddleAd":
      return { hmCorporateHomeMiddleAdModuleEnabled: checked };
    case "latestGrid":
      return {
        hmCorporateLatestNewsEnabled: checked,
        hmCorporateLatestDevelopmentsEnabled: checked,
        hmCorporateSidebarInfoEnabled: checked,
      };
    case "heritageInfo":
      return {
        hmCorporateWarsSectionEnabled: checked,
        hmCorporateNationalDaysSectionEnabled: checked,
      };
    case "sehitSearch":
      return { hmSehitSearchEnabled: checked };
    case "donationSupport":
      return {
        hmCorporateDonation: {
          ...(p.hmCorporateDonation ?? {}),
          enabled: checked,
        },
      };
    default:
      return {};
  }
}

/** Tema değişiminde varsayılan modül aç/kapa + sıra; RSS ve genel tercihler korunur. */
export function hmNewsThemePresetPatch(theme: HmVitrinThemeId | string | null | undefined): Partial<NewsSiteLayoutPrefs> {
  const themeId = normalizeHmVitrinTheme(theme);
  const enabledSet = new Set(HM_NEWS_THEME_DEFAULT_MODULES[themeId] ?? []);
  const patch: Partial<NewsSiteLayoutPrefs> = {
    hmNewsHomeModuleOrder: buildHmNewsThemeModuleOrder(themeId),
  };
  for (const moduleId of HM_NEWS_THEME_TOGGLE_MODULE_IDS) {
    const key = HM_NEWS_THEME_MODULE_TOGGLE_KEYS[moduleId];
    if (!key) continue;
    (patch as Record<string, boolean>)[key] = enabledSet.has(moduleId);
  }
  if (themeId === "classic" || themeId === "portal3") {
    patch.hmNewsClassicHeroLatestEnabled = true;
  } else if (themeId === "ahenkhaber") {
    patch.mansetVariant = "split";
    patch.hmNewsClassicHeroLatestEnabled = false;
    patch.hmNewsHomeModuleCategorySlugs = {
      ahenkAnkaraGrid: "ankara",
      ahenkGundemLeadSide: "gundem",
      ahenkSporGrid: "spor",
      sporModule: "spor",
      ahenkDunyaBlock: "dunya",
      ahenkEkonomiGrid: "ekonomi",
    };
  } else if (themeId === "esen") {
    patch.mansetVariant = "center-trio";
    patch.hmChromeColorMode = "light";
    patch.hmNewsRssHeadlineEnabled = false;
  } else if (themeId !== "news") {
    patch.hmNewsClassicHeroLatestEnabled = false;
  }
  return patch;
}

/** Yekpare `/haberler` — varsayılan vitrin sırası (kullanıcıya görünür modüller). */
export const SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER = [
  "financeWeather",
  "headlineGrid",
  "newsMapModule",
  "worldBriefs",
  "yekpareHaberler",
  "recentVideosSidebar",
  "authorsStrip",
  "ataturkBand",
  "historyNationalDaysBand",
  "categoryModules",
  "newsletter",
  "latestGrid",
  "popularSidebar",
] as const;

/**
 * `/haberler` sayfasından kaldırılan modüller — admin açsa bile render edilmez.
 * (Son gelişmeler, son dakika, namaz/günün sözü, RSS son dakika kart bandı.)
 */
export const SADE_NEWS_PORTAL_RETIRED_MODULE_IDS = [
  "breakingBand",
  "googleNewsBand",
  "publicInfo",
  "timeline",
] as const;

/** Legacy JSON uyumluluğu için tam modül listesi. */
export const SADE_NEWS_PORTAL_MODULE_ORDER = [
  ...SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER,
  ...SADE_NEWS_PORTAL_RETIRED_MODULE_IDS,
] as const;

export type SadeNewsPortalModuleId = (typeof SADE_NEWS_PORTAL_MODULE_ORDER)[number];

const SADE_NEWS_PORTAL_RETIRED_SET = new Set<string>(SADE_NEWS_PORTAL_RETIRED_MODULE_IDS);

export function isSadeNewsPortalRetiredModule(moduleId: string): boolean {
  return SADE_NEWS_PORTAL_RETIRED_SET.has(moduleId);
}

export const SADE_NEWS_PORTAL_MODULE_LABELS: Record<SadeNewsPortalModuleId, string> = {
  financeWeather: "Piyasa / hava özeti",
  breakingBand: "Son dakika haber bandı (kaldırıldı)",
  googleNewsBand: "RSS son dakika kart bandı (kaldırıldı)",
  headlineGrid: "Manşet grid + yan kartlar",
  newsMapModule: "Haber Haritası",
  worldBriefs: "Dünyadan Kısa Kısa",
  yekpareHaberler: "Yekpare Haberler",
  recentVideosSidebar: "Son eklenen videolar (kategori + grid)",
  authorsStrip: "Köşe yazarları şeridi",
  ataturkBand: "Atatürk bandı",
  historyNationalDaysBand: "Tarih ve Millî Günler bandı",
  publicInfo: "Kamu bilgi kartları (kaldırıldı)",
  timeline: "Son gelişmeler zaman çizgisi (kaldırıldı)",
  categoryModules: "Kategori haber modülleri",
  newsletter: "Bülten abonelik CTA",
  latestGrid: "Orta son haberler + sidebar kutusu",
  popularSidebar: "Popüler haberler sidebar",
};

/** Anasayfada IBAN kutusu yalnızca destek bandında (kurumsal tema). */
export const HM_CORPORATE_DONATION_IBAN_MODULE_PRIORITY = ["donationSupport"] as const;
export type HmCorporateDonationIbanModuleId = (typeof HM_CORPORATE_DONATION_IBAN_MODULE_PRIORITY)[number];

export function isHmDonationActive(donation?: HmCorporateDonationSettings | null): boolean {
  return !!donation && donation.enabled !== false;
}

export function resolveHmDonationIbanModule(
  orderedModules: readonly string[],
  theme: "corporate" | "news",
): HmCorporateDonationIbanModuleId | "donationSupport" | null {
  if (theme === "news") {
    return orderedModules.includes("donationSupport") ? "donationSupport" : null;
  }
  for (const moduleId of HM_CORPORATE_DONATION_IBAN_MODULE_PRIORITY) {
    if (orderedModules.includes(moduleId)) return moduleId;
  }
  return null;
}

export function shouldShowHmDonationIbanCard(
  moduleId: string,
  orderedModules: readonly string[],
  theme: "corporate" | "news",
  donation?: HmCorporateDonationSettings | null,
): boolean {
  if (!isHmDonationActive(donation)) return false;
  return resolveHmDonationIbanModule(orderedModules, theme) === moduleId;
}

function normalizeHomeModuleOrder(raw: unknown, defaults: readonly string[]): string[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set(defaults);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (id === "donationFooter") continue;
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of defaults) {
    if (!seen.has(id)) next.push(id);
  }
  return next.length ? next : null;
}

export function resolveHmHomeModuleOrder<T extends string>(
  stored: readonly string[] | null | undefined,
  defaults: readonly T[],
): T[] {
  const allowed = new Set<string>(defaults);
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of Array.isArray(stored) ? stored : []) {
    const id = String(item ?? "").trim();
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id as T);
  }
  for (const id of defaults) {
    if (!seen.has(id)) next.push(id);
  }
  return next;
}

function normalizeHmNewsHomeModuleCategorySlugs(raw: unknown): HmNewsHomeModuleCategorySlugs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const allowed = new Set<string>(HM_NEWS_HOME_MODULE_ORDER);
  const galleryModules = new Set<string>(["mediaDarkBlock", "agencyDarkSpotlight"]);
  const out: HmNewsHomeModuleCategorySlugs = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key) || galleryModules.has(key)) continue;
    const slug = String(value ?? "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9şüşöçıı-]/gi, "")
      .slice(0, 80);
    if (slug) out[key as HmNewsHomeModuleId] = slug;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function normalizeHmNewsHomeModuleGallerySources(raw: unknown): HmNewsHomeModuleGallerySources | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: HmNewsHomeModuleGallerySources = {};
  for (const moduleId of ["mediaDarkBlock", "agencyDarkSpotlight"] as const) {
    const source = normalizeHmMediaGallerySourceId((raw as Record<string, unknown>)[moduleId]);
    if (source) out[moduleId] = source;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveHmNewsHomeModuleGallerySource(
  p: Pick<NewsSiteLayoutPrefs, "hmNewsHomeModuleGallerySources" | "hmNewsGallerySpotlightMode"> | null | undefined,
  moduleId: HmMediaGalleryHomeModuleId,
): HmMediaGallerySourceId {
  const perModule = normalizeHmMediaGallerySourceId(p?.hmNewsHomeModuleGallerySources?.[moduleId]);
  if (perModule) return perModule;
  return hmGallerySpotlightModeToSourceId(p?.hmNewsGallerySpotlightMode ?? undefined) ?? "mixed";
}

function resolveHmNewsGlobalGalleryVideoTvRef(
  p: Pick<NewsSiteLayoutPrefs, "hmNewsVideoTvChannelId" | "hmNewsVideoTvPlaylistId" | "hmNewsVideoTvManualLink"> | null | undefined,
) {
  const channelSourceId = Number(p?.hmNewsVideoTvChannelId);
  const playlistSourceId = Number(p?.hmNewsVideoTvPlaylistId);
  const manualLink = typeof p?.hmNewsVideoTvManualLink === "string" ? p.hmNewsVideoTvManualLink.trim() : "";
  const out: { channelSourceId?: number; playlistSourceId?: number; manualLink?: string } = {};
  if (Number.isFinite(channelSourceId) && channelSourceId > 0) out.channelSourceId = channelSourceId;
  if (Number.isFinite(playlistSourceId) && playlistSourceId > 0) out.playlistSourceId = playlistSourceId;
  if (manualLink) out.manualLink = manualLink.slice(0, 500);
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveHmNewsHomeModuleGalleryVideoTvRef(
  p: Pick<
    NewsSiteLayoutPrefs,
    | "hmNewsHomeModuleGalleryVideoTvRefs"
    | "hmNewsVideoTvChannelId"
    | "hmNewsVideoTvPlaylistId"
    | "hmNewsVideoTvManualLink"
  > | null | undefined,
  moduleId: HmMediaGalleryHomeModuleId,
) {
  return resolveHmNewsGalleryVideoTvRef(p?.hmNewsHomeModuleGalleryVideoTvRefs ?? null, moduleId) ?? resolveHmNewsGlobalGalleryVideoTvRef(p);
}

const STORAGE_KEY = "yekpare_news_layout_v1";

function normalizeHmCorporatePageHtml(raw: unknown): HmCorporatePageHtml | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const keys = ["kunye", "iletisim", "reklam", "abonelik"] as const;
  const out: HmCorporatePageHtml = {};
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

function normalizeHmFooterSocial(raw: unknown): HmFooterSocialLinks | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: HmFooterSocialLinks = {};
  const add = (k: keyof HmFooterSocialLinks, v: unknown) => {
    if (typeof v === "string" && v.trim()) (out as Record<string, string>)[k] = v.trim();
  };
  add("instagramUrl", o.instagramUrl);
  add("facebookUrl", o.facebookUrl);
  add("xUrl", o.xUrl);
  add("youtubeUrl", o.youtubeUrl);
  return Object.keys(out).length > 0 ? out : null;
}

function normalizeId(raw: unknown, fallback: string): string {
  const t = String(raw ?? "").trim();
  return t.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || fallback;
}

function normalizeHref(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (t === "#") return "#";
  if (/^(https?:|mailto:|tel:)/i.test(t)) return normalizeHmEditorLoginMenuHref(t);
  const rel = t.startsWith("/") ? t : `/${t}`;
  return normalizeHmEditorLoginMenuHref(rel);
}

function normalizeBreakingRssUrl(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t.slice(0, 500) : "";
}

function normalizeHmBreakingRssFeeds(raw: unknown): HmBreakingRssFeeds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...defaultHmBreakingRssFeeds };
  const o = raw as Record<string, unknown>;
  const out: HmBreakingRssFeeds = {};
  for (const category of HM_BREAKING_RSS_FEED_CATEGORIES) {
    if (Object.prototype.hasOwnProperty.call(o, category.id)) {
      out[category.id] = normalizeBreakingRssUrl(o[category.id]);
    } else {
      out[category.id] = defaultHmBreakingRssFeeds[category.id] ?? "";
    }
  }
  return out;
}

function normalizeBreakingRssLabel(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, 40);
}

function normalizeHmBreakingRssLabels(raw: unknown): HmBreakingRssLabels | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: HmBreakingRssLabels = {};
  let hasAny = false;
  for (const category of HM_BREAKING_RSS_FEED_CATEGORIES) {
    if (!Object.prototype.hasOwnProperty.call(o, category.id)) continue;
    const label = normalizeBreakingRssLabel(o[category.id]);
    if (!label || label === category.label) continue;
    out[category.id] = label;
    hasAny = true;
  }
  return hasAny ? out : null;
}

export function resolveHmBreakingRssLabel(
  id: HmBreakingRssFeedId,
  labels?: HmBreakingRssLabels | null,
): string {
  const custom = normalizeBreakingRssLabel(labels?.[id]);
  if (custom) return custom;
  return HM_BREAKING_RSS_FEED_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function cleanHmBreakingRssLabels(labels: Record<HmBreakingRssFeedId, string>): HmBreakingRssLabels | null {
  const out: HmBreakingRssLabels = {};
  let hasAny = false;
  for (const category of HM_BREAKING_RSS_FEED_CATEGORIES) {
    const label = normalizeBreakingRssLabel(labels[category.id]);
    if (!label || label === category.label) continue;
    out[category.id] = label;
    hasAny = true;
  }
  return hasAny ? out : null;
}

const PRESET_BREAKING_RSS_IDS = new Set<HmBreakingRssFeedId>(HM_BREAKING_RSS_FEED_CATEGORIES.map((category) => category.id));

export function defaultHmBreakingRssFeedRows(): HmBreakingRssFeedRow[] {
  return HM_BREAKING_RSS_FEED_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    url: defaultHmBreakingRssFeeds[category.id] ?? "",
  }));
}

function slugifyBreakingRssRowId(label: string): string {
  const base = label
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "rss";
}

export function resolveHmBreakingRssCategoryKey(row: Pick<HmBreakingRssFeedRow, "id" | "categoryKey">): string {
  return String(row.categoryKey ?? row.id ?? "").trim();
}

export function groupHmBreakingRssFeedRowsByCategory(rows: HmBreakingRssFeedRow[]): Array<{
  categoryKey: string;
  label: string;
  rows: HmBreakingRssFeedRow[];
}> {
  const groups: Array<{ categoryKey: string; label: string; rows: HmBreakingRssFeedRow[] }> = [];
  const indexByKey = new Map<string, number>();
  for (const row of rows) {
    const categoryKey = resolveHmBreakingRssCategoryKey(row);
    if (!categoryKey) continue;
    const idx = indexByKey.get(categoryKey);
    if (idx == null) {
      indexByKey.set(categoryKey, groups.length);
      groups.push({
        categoryKey,
        label: normalizeBreakingRssLabel(row.label) || categoryKey,
        rows: [row],
      });
    } else {
      groups[idx]!.rows.push(row);
      const label = normalizeBreakingRssLabel(row.label);
      if (label) groups[idx]!.label = label;
    }
  }
  return groups;
}

export function createHmBreakingRssFeedRow(label = "Yeni kategori"): HmBreakingRssFeedRow {
  const trimmed = normalizeBreakingRssLabel(label) || "Yeni kategori";
  const id = `${slugifyBreakingRssRowId(trimmed)}-${Date.now().toString(36)}`;
  return {
    id,
    categoryKey: id,
    label: trimmed,
    url: "",
  };
}

export function createHmBreakingRssFeedUrlRow(categoryKey: string, label: string): HmBreakingRssFeedRow {
  const key = String(categoryKey ?? "").trim() || "rss";
  const trimmed = normalizeBreakingRssLabel(label) || key;
  return {
    id: `${slugifyBreakingRssRowId(key)}-${Date.now().toString(36)}`,
    categoryKey: key,
    label: trimmed,
    url: "",
  };
}

export function collectHmRssCategoryNavItems(rows: HmBreakingRssFeedRow[]): Array<{ slug: string; label: string }> {
  const seen = new Set<string>();
  const out: Array<{ slug: string; label: string }> = [];
  for (const row of rows) {
    const slug = hmCategorySlug(row.label, resolveHmBreakingRssCategoryKey(row));
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, label: decodeHmDisplayText(String(row.label ?? slug).trim() || slug) });
  }
  return out;
}

export function groupPortalHybridRssFeedsByCategory(rows: PortalHybridRssFeed[]): Array<{
  categorySlug: string;
  label: string;
  rows: PortalHybridRssFeed[];
}> {
  const groups: Array<{ categorySlug: string; label: string; rows: PortalHybridRssFeed[] }> = [];
  const indexBySlug = new Map<string, number>();
  for (const row of rows) {
    const categorySlug = normalizePortalHybridCategorySlug(row.categorySlug);
    if (!categorySlug) continue;
    const idx = indexBySlug.get(categorySlug);
    if (idx == null) {
      indexBySlug.set(categorySlug, groups.length);
      groups.push({
        categorySlug,
        label: normalizeBreakingRssLabel(row.label) || categorySlug,
        rows: [row],
      });
    } else {
      groups[idx]!.rows.push(row);
      const label = normalizeBreakingRssLabel(row.label);
      if (label) groups[idx]!.label = label;
    }
  }
  return groups;
}

export function createPortalHybridRssFeedUrlRow(categorySlug: string, label: string): PortalHybridRssFeed {
  const slug = normalizePortalHybridCategorySlug(categorySlug) || "gundem";
  return {
    id: `portal-hybrid-${slug}-${Date.now().toString(36)}`,
    categorySlug: slug,
    label: normalizeBreakingRssLabel(label) || slug,
    url: "",
    enabled: true,
    maxItems: PORTAL_HYBRID_RSS_DEFAULT_MAX_ITEMS,
  };
}

const PORTAL_HYBRID_RSS_DEFAULT_MAX_ITEMS = 10;

function normalizePortalHybridCategorySlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

export function createPortalHybridRssFeed(categorySlug = "gundem"): PortalHybridRssFeed {
  const slug = normalizePortalHybridCategorySlug(categorySlug) || "gundem";
  return {
    id: `portal-hybrid-${slug}-${Date.now().toString(36)}`,
    categorySlug: slug,
    label: "Yeni RSS kaynağı",
    url: "",
    enabled: true,
    maxItems: PORTAL_HYBRID_RSS_DEFAULT_MAX_ITEMS,
  };
}

export function normalizePortalHybridRssFeeds(raw: unknown): PortalHybridRssFeed[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: PortalHybridRssFeed[] = [];

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Partial<PortalHybridRssFeed>;
    const id = String(row.id ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || `portal-hybrid-${index + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const categorySlug = normalizePortalHybridCategorySlug(row.categorySlug);
    const label = normalizeBreakingRssLabel(row.label) || categorySlug || "RSS";
    const url = normalizeBreakingRssUrl(row.url);
    const enabled = row.enabled === false ? false : true;
    const maxRaw = Number(row.maxItems ?? PORTAL_HYBRID_RSS_DEFAULT_MAX_ITEMS);
    const maxItems = Number.isFinite(maxRaw)
      ? Math.min(PORTAL_HYBRID_RSS_DEFAULT_MAX_ITEMS, Math.max(1, Math.round(maxRaw)))
      : PORTAL_HYBRID_RSS_DEFAULT_MAX_ITEMS;

    if (!categorySlug || !url) continue;
    out.push({ id, categorySlug, label, url, enabled, maxItems });
  }

  return out.length ? out : null;
}

export function cleanPortalHybridRssFeeds(rows: PortalHybridRssFeed[]): PortalHybridRssFeed[] | null {
  return normalizePortalHybridRssFeeds(rows);
}

export function resolvePortalHybridRssFeeds(
  p?: Pick<NewsSiteLayoutPrefs, "portalHybridRssFeeds"> | null,
): PortalHybridRssFeed[] {
  return normalizePortalHybridRssFeeds(p?.portalHybridRssFeeds) ?? [];
}

export function normalizeHmBreakingRssFeedRows(
  rawRows: unknown,
  legacyFeeds?: HmBreakingRssFeeds | null,
  legacyLabels?: HmBreakingRssLabels | null,
): HmBreakingRssFeedRow[] {
  if (Array.isArray(rawRows) && rawRows.length > 0) {
    const seen = new Set<string>();
    const out: HmBreakingRssFeedRow[] = [];
    for (const item of rawRows) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<HmBreakingRssFeedRow>;
      const id = String(row.id ?? "").trim().slice(0, 48);
      const categoryKeyRaw = String(row.categoryKey ?? "").trim().slice(0, 48);
      const categoryKey = categoryKeyRaw || undefined;
      const label = normalizeBreakingRssLabel(row.label) || "Kategori";
      const url = normalizeBreakingRssUrl(row.url);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, categoryKey, label, url });
    }
    if (out.length) return out;
  }

  const feeds = legacyFeeds ?? defaultHmBreakingRssFeeds;
  return HM_BREAKING_RSS_FEED_CATEGORIES.map((category) => ({
    id: category.id,
    label: resolveHmBreakingRssLabel(category.id, legacyLabels),
    url: feeds[category.id] ?? defaultHmBreakingRssFeeds[category.id] ?? "",
  }));
}

function resolveHmBreakingRssFeedRowsOnly(
  p?: Pick<NewsSiteLayoutPrefs, "hmNewsBreakingRssFeedRows" | "hmNewsBreakingRssFeeds" | "hmNewsBreakingRssLabels"> | null,
): HmBreakingRssFeedRow[] {
  return normalizeHmBreakingRssFeedRows(p?.hmNewsBreakingRssFeedRows, p?.hmNewsBreakingRssFeeds, p?.hmNewsBreakingRssLabels);
}

function resolveHmSiteRssFeedRowsOnly(
  p?: Pick<NewsSiteLayoutPrefs, "hmNewsSiteRssFeedRows"> | null,
): HmBreakingRssFeedRow[] {
  const raw = p?.hmNewsSiteRssFeedRows;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return normalizeHmBreakingRssFeedRows(raw, null, null);
}

/** Kutu içi + site içi RSS listelerini kategori slug ile birleştirir; aynı URL yalnızca bir kez kalır. */
export function mergeHmRssFeedRowsByCategorySlug(...sources: HmBreakingRssFeedRow[][]): HmBreakingRssFeedRow[] {
  type PendingRow = { url: string; id: string };
  const order: string[] = [];
  const groups = new Map<string, { categoryKey: string; label: string; rows: PendingRow[] }>();

  for (const source of sources) {
    for (const row of source) {
      const categoryKey = resolveHmBreakingRssCategoryKey(row);
      const categorySlug = hmCategorySlug(row.label, categoryKey) || hmCategorySlug(categoryKey);
      if (!categorySlug) continue;

      let group = groups.get(categorySlug);
      if (!group) {
        order.push(categorySlug);
        const key = PRESET_BREAKING_RSS_IDS.has(categoryKey as HmBreakingRssFeedId) ? categoryKey : categoryKey || categorySlug;
        group = { categoryKey: key, label: normalizeBreakingRssLabel(row.label) || categorySlug, rows: [] };
        groups.set(categorySlug, group);
      } else {
        const label = normalizeBreakingRssLabel(row.label);
        if (label && label.length > group.label.length) group.label = label;
        if (PRESET_BREAKING_RSS_IDS.has(categoryKey as HmBreakingRssFeedId)) group.categoryKey = categoryKey;
      }

      group.rows.push({
        url: normalizeBreakingRssUrl(row.url),
        id: String(row.id ?? "").trim().slice(0, 48),
      });
    }
  }

  const globalSeenIds = new Set<string>();
  const out: HmBreakingRssFeedRow[] = [];

  for (const slug of order) {
    const group = groups.get(slug)!;
    const seenUrls = new Set<string>();
    let emptyAdded = false;

    for (const pending of group.rows) {
      const url = pending.url;
      if (url) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
      } else if (emptyAdded) {
        continue;
      } else {
        emptyAdded = true;
      }

      let id = pending.id;
      if (!id || globalSeenIds.has(id)) {
        id = `${slugifyBreakingRssRowId(group.label)}-${Date.now().toString(36)}-${out.length}`;
      }
      globalSeenIds.add(id);

      out.push({
        id: id.slice(0, 48),
        categoryKey: group.categoryKey,
        label: group.label,
        url,
      });
    }
  }

  return out;
}

export function resolveHmUnifiedRssFeedRows(
  p?: Pick<
    NewsSiteLayoutPrefs,
    "hmNewsBreakingRssFeedRows" | "hmNewsBreakingRssFeeds" | "hmNewsBreakingRssLabels" | "hmNewsSiteRssFeedRows"
  > | null,
): HmBreakingRssFeedRow[] {
  return mergeHmRssFeedRowsByCategorySlug(
    resolveHmBreakingRssFeedRowsOnly(p),
    resolveHmSiteRssFeedRowsOnly(p),
  );
}

export function resolveHmBreakingRssFeedRows(
  p?: Pick<NewsSiteLayoutPrefs, "hmNewsBreakingRssFeedRows" | "hmNewsBreakingRssFeeds" | "hmNewsBreakingRssLabels" | "hmNewsSiteRssFeedRows"> | null,
): HmBreakingRssFeedRow[] {
  return resolveHmUnifiedRssFeedRows(p);
}

export function resolveHmSiteRssFeedRows(
  p?: Pick<
    NewsSiteLayoutPrefs,
    "hmNewsSiteRssFeedRows" | "hmNewsBreakingRssFeedRows" | "hmNewsBreakingRssFeeds" | "hmNewsBreakingRssLabels"
  > | null,
): HmBreakingRssFeedRow[] {
  return resolveHmUnifiedRssFeedRows(p);
}

export function saveUnifiedHmRssFeedRows(rows: HmBreakingRssFeedRow[]): {
  hmNewsBreakingRssFeedRows: HmBreakingRssFeedRow[];
  hmNewsSiteRssFeedRows: HmBreakingRssFeedRow[];
  hmNewsBreakingRssFeeds: HmBreakingRssFeeds;
  hmNewsBreakingRssLabels: HmBreakingRssLabels | null;
} {
  const cleaned = cleanHmBreakingRssFeedRows(rows) ?? [];
  return {
    hmNewsBreakingRssFeedRows: cleaned,
    hmNewsSiteRssFeedRows: cleaned,
    ...syncBreakingRssLegacyFieldsFromRows(cleaned),
  };
}

export function cleanHmBreakingRssFeedRows(rows: HmBreakingRssFeedRow[]): HmBreakingRssFeedRow[] | null {
  const seen = new Set<string>();
  const out: HmBreakingRssFeedRow[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "").trim().slice(0, 48);
    const categoryKeyRaw = String(row.categoryKey ?? "").trim().slice(0, 48);
    const categoryKey = categoryKeyRaw || undefined;
    const label = normalizeBreakingRssLabel(row.label) || "Kategori";
    const url = normalizeBreakingRssUrl(row.url);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, categoryKey, label, url });
  }
  return out.length ? out : null;
}

export function resolveHmBreakingRssRowLabel(
  id: string,
  rows?: HmBreakingRssFeedRow[] | null,
  legacyLabels?: HmBreakingRssLabels | null,
): string {
  const fromRow = rows?.find((row) => row.id === id)?.label;
  if (fromRow && fromRow.trim()) return fromRow.trim();
  if (PRESET_BREAKING_RSS_IDS.has(id as HmBreakingRssFeedId)) {
    return resolveHmBreakingRssLabel(id as HmBreakingRssFeedId, legacyLabels);
  }
  return id;
}

export function syncBreakingRssLegacyFieldsFromRows(rows: HmBreakingRssFeedRow[]): {
  hmNewsBreakingRssFeeds: HmBreakingRssFeeds;
  hmNewsBreakingRssLabels: HmBreakingRssLabels | null;
} {
  const feeds: HmBreakingRssFeeds = { ...defaultHmBreakingRssFeeds };
  const labelDraft = {} as Record<HmBreakingRssFeedId, string>;
  const syncedPresetIds = new Set<HmBreakingRssFeedId>();
  for (const row of rows) {
    const key = resolveHmBreakingRssCategoryKey(row);
    if (!PRESET_BREAKING_RSS_IDS.has(key as HmBreakingRssFeedId)) continue;
    const id = key as HmBreakingRssFeedId;
    if (!syncedPresetIds.has(id)) {
      feeds[id] = row.url;
      syncedPresetIds.add(id);
    }
    labelDraft[id] = row.label;
  }
  return {
    hmNewsBreakingRssFeeds: feeds,
    hmNewsBreakingRssLabels: cleanHmBreakingRssLabels(labelDraft),
  };
}

export const DEFAULT_HM_BREAKING_RSS_BAND_TITLE = "Haber Bandı";
export const DEFAULT_HM_BREAKING_RSS_BALLOON_TITLE = "Haber Balonu";

function normalizeHmBreakingRssDisplayMode(raw: unknown): HmBreakingRssDisplayMode {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "balloons" || value === "balon" || value === "balloon" ? "balloons" : "cards";
}

export function resolveHmBreakingRssDisplayMode(
  p?: Pick<NewsSiteLayoutPrefs, "hmNewsBreakingRssDisplayMode"> | null,
): HmBreakingRssDisplayMode {
  return normalizeHmBreakingRssDisplayMode(p?.hmNewsBreakingRssDisplayMode);
}

export function cleanHmBreakingRssDisplayMode(mode: HmBreakingRssDisplayMode): HmBreakingRssDisplayMode | null {
  return mode === "balloons" ? "balloons" : null;
}

function normalizeHmRssIntegrationMode(raw: unknown): HmRssIntegrationMode {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "persistent" || v === "kalici" || v === "kalıcı") return "persistent";
  if (v === "manual" || v === "manuel") return "manual";
  return "live";
}

export function resolveHmRssIntegrationMode(
  p?: Pick<NewsSiteLayoutPrefs, "hmRssIntegrationMode"> | null,
): HmRssIntegrationMode {
  return normalizeHmRssIntegrationMode(p?.hmRssIntegrationMode);
}

export function cleanHmRssIntegrationMode(mode: HmRssIntegrationMode): HmRssIntegrationMode {
  return mode;
}

export function resolveHmYekparePoolReceiveEnabled(
  p?: Pick<NewsSiteLayoutPrefs, "hmYekparePoolReceiveEnabled"> | null,
): boolean {
  return p?.hmYekparePoolReceiveEnabled !== false;
}

export function resolveHmYekparePoolSendEnabled(
  p?: Pick<NewsSiteLayoutPrefs, "hmYekparePoolSendEnabled"> | null,
): boolean {
  return p?.hmYekparePoolSendEnabled !== false;
}

export function resolveHmBreakingRssBandTitle(p?: Pick<NewsSiteLayoutPrefs, "hmNewsBreakingRssBandTitle"> | null): string {
  const custom = String(p?.hmNewsBreakingRssBandTitle ?? "").trim().slice(0, 80);
  return custom || DEFAULT_HM_BREAKING_RSS_BAND_TITLE;
}

export function resolveHmBreakingRssSectionTitle(
  p?: Pick<NewsSiteLayoutPrefs, "hmNewsBreakingRssBandTitle" | "hmNewsBreakingRssDisplayMode"> | null,
): string {
  if (resolveHmBreakingRssDisplayMode(p) === "balloons") {
    return DEFAULT_HM_BREAKING_RSS_BALLOON_TITLE;
  }
  return resolveHmBreakingRssBandTitle(p);
}

function normalizeHmBreakingRssBandTitle(raw: unknown): string | null {
  const title = String(raw ?? "").trim().slice(0, 80);
  if (!title || title === DEFAULT_HM_BREAKING_RSS_BAND_TITLE) return null;
  return title;
}

function normalizeHmExtraPages(raw: unknown): HmExtraPage[] | null {
  if (!Array.isArray(raw)) return null;
  const pages = raw
    .map((item, index): HmExtraPage | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const title = String(o.title ?? "").trim().slice(0, 160);
      const slug = String(o.slug ?? "").trim().replace(/^\/+|\/+$/g, "").slice(0, 160);
      if (!title || !slug) return null;
      return {
        id: normalizeId(o.id, `page-${index + 1}`),
        title,
        slug,
        bodyHtml: String(o.bodyHtml ?? ""),
        enabled: o.enabled === false ? false : true,
        fullWidth: o.fullWidth === false ? false : true,
        importSource: typeof o.importSource === "string" && o.importSource.trim() ? o.importSource.trim().slice(0, 80) : undefined,
        sourceName: typeof o.sourceName === "string" && o.sourceName.trim() ? o.sourceName.trim().slice(0, 240) : undefined,
        importedAt: typeof o.importedAt === "string" && o.importedAt.trim() ? o.importedAt.trim().slice(0, 80) : undefined,
      };
    })
    .filter((item): item is HmExtraPage => item != null)
    .slice(0, 50);
  return pages.length ? pages : null;
}

function normalizeHmCorporateMenuItems(raw: unknown): HmCorporateMenuItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((item, index): HmCorporateMenuItem | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const label = String(o.label ?? "").trim().slice(0, 80);
      const href = normalizeHref(o.href);
      if (!label) return null;
      const id = normalizeId(o.id, `menu-${index + 1}`);
      const parentIdRaw = normalizeId(o.parentId, "");
      const iconRaw = String(o.icon ?? "").trim().slice(0, 8);
      const out: HmCorporateMenuItem = {
        id,
        label,
        href,
        enabled: o.enabled === false ? false : true,
      };
      if (iconRaw) out.icon = iconRaw;
      if (parentIdRaw && parentIdRaw !== id) out.parentId = parentIdRaw;
      return out;
    })
    .filter((item): item is HmCorporateMenuItem => item != null)
    .slice(0, 40);
  return items.length ? items : null;
}

function normalizeHmCorporateQuickLinks(raw: unknown): HmCorporateQuickLink[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((item, index): HmCorporateQuickLink | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const label = String(o.label ?? "").trim().slice(0, 80);
      const href = normalizeHref(o.href);
      if (!label || !href) return null;
      const icon = String(o.icon ?? "").trim().slice(0, 12);
      const subtitle = String(o.subtitle ?? o.description ?? "").trim().slice(0, 120);
      return {
        id: normalizeId(o.id, `quick-${index + 1}`),
        label,
        href,
        icon: icon || null,
        subtitle: subtitle || null,
        enabled: o.enabled === false ? false : true,
      } satisfies HmCorporateQuickLink;
    })
    .filter((item): item is HmCorporateQuickLink => item != null)
    .slice(0, 12);
  return items.length ? items : null;
}

function normalizeOptionalText(raw: unknown, max: number): string | null {
  const t = String(raw ?? "").trim();
  return t ? t.slice(0, max) : null;
}

function normalizeOptionalHex(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) ? t : null;
}

function normalizeLayoutOrder(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(-999, Math.min(999, Math.round(n))) : fallback;
}

function normalizeHmCorporateSliderItems(raw: unknown): HmCorporateSliderItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((item, index): HmCorporateSliderItem | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const title = String(o.title ?? "").trim().slice(0, 120);
      if (!title) return null;
      const href = normalizeHref(o.href ?? o.url);
      return {
        id: normalizeId(o.id, `slider-${index + 1}`),
        title,
        subtitle: normalizeOptionalText(o.subtitle, 260),
        href: href || null,
        imageUrl: normalizeOptionalText(o.imageUrl ?? o.image, 500),
        color: normalizeOptionalHex(o.color),
        order: normalizeLayoutOrder(o.order, index + 1),
        active: o.active === false || o.enabled === false ? false : true,
      } satisfies HmCorporateSliderItem;
    })
    .filter((item): item is HmCorporateSliderItem => item != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 12);
  return items.length ? items : null;
}

function normalizeHmCorporateBandItems(raw: unknown): HmCorporateBandItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((item, index): HmCorporateBandItem | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const title = String(o.title ?? "").trim().slice(0, 120);
      if (!title) return null;
      const href = normalizeHref(o.href ?? o.url);
      return {
        id: normalizeId(o.id, `band-${index + 1}`),
        title,
        subtitle: normalizeOptionalText(o.subtitle, 180),
        href: href || null,
        imageUrl: normalizeOptionalText(o.imageUrl ?? o.image, 500),
        color: normalizeOptionalHex(o.color),
        order: normalizeLayoutOrder(o.order, index + 1),
        active: o.active === false || o.enabled === false ? false : true,
      } satisfies HmCorporateBandItem;
    })
    .filter((item): item is HmCorporateBandItem => item != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 20);
  return items.length ? items : null;
}

const DEFAULT_DONATION_AMOUNTS = [500, 1000, 2500];

const defaultHmCorporateDonation: HmCorporateDonationSettings = {
  enabled: true,
  title: "Kurumsal yayıncılığa destek olun",
  description: "Bağışınız bağımsız haber üretimi, yerel içerik ve okur odaklı yayınların sürdürülebilirliği için kullanılır.",
  amounts: DEFAULT_DONATION_AMOUNTS,
  iban: null,
  accountName: null,
  buttonText: "Bağış Yap",
  supportBand: {
    enabled: true,
    title: "Desteğiniz haber merkezinin yanında",
    text: "Bağışlar şeffaf, güvenli ve doğrudan yayın faaliyetlerine destek olacak şekilde değerlendirilir.",
    items: ["Yerel habercilik", "Bağımsız yayın", "Toplumsal fayda"],
  },
};

function normalizeDonationAmounts(raw: unknown): number[] {
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,\n;]/)
      : [];
  const unique = new Set<number>();
  for (const item of source) {
    const n = Math.round(Number(String(item).replace(/[^\d.,]/g, "").replace(",", ".")));
    if (Number.isFinite(n) && n >= 20 && n <= 100_000) unique.add(n);
  }
  return Array.from(unique).slice(0, 8);
}

function normalizeDonationText(raw: unknown, max = 240): string | null {
  const t = String(raw ?? "").trim();
  return t ? t.slice(0, max) : null;
}

function extractDonationSupportHighlights(textRaw: unknown, highlightsRaw?: unknown): string | null {
  const fromField = normalizeDonationText(highlightsRaw, 4000);
  if (fromField) return fromField;
  const t = String(textRaw ?? "").trim();
  if (!t) return null;
  if (/<(ul|ol|li|p)\b/i.test(t)) return t.slice(0, 4000);
  const lines = t
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletish = lines.filter((line) => /^[🎖️🎓📜⭐•\-*]|\bfa[\s-]/iu.test(line));
  if (bulletish.length >= 2) {
    return `<ul class="vkv-donation-bullets">${bulletish.map((line) => `<li>${line}</li>`).join("")}</ul>`;
  }
  if (lines.length === 1) {
    return `<p class="vkv-donation-lead">${lines[0]}</p>`;
  }
  return `<p class="vkv-donation-lead">${t.slice(0, 2000)}</p>`;
}

function normalizeHmCorporateDonationSupportBand(raw: unknown): HmCorporateDonationSupportBand {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const itemsRaw = Array.isArray(o.items) ? o.items : typeof o.items === "string" ? String(o.items).split(/\r?\n/) : [];
  const items = itemsRaw
    .map((item) => normalizeDonationText(item, 80))
    .filter((item): item is string => item != null)
    .slice(0, 3);
  const highlightsHtml = extractDonationSupportHighlights(o.text, o.highlightsHtml);
  return {
    enabled: o.enabled === false ? false : true,
    title: normalizeDonationText(o.title, 120) ?? defaultHmCorporateDonation.supportBand?.title ?? null,
    text: highlightsHtml ? null : normalizeDonationText(o.text, 2000),
    highlightsHtml,
    items: items.length ? items : defaultHmCorporateDonation.supportBand?.items ?? null,
  };
}

/** Bağış açıkken alt bağış modülünü listeden çıkarır (tek kutu: destek bandı). */
export function filterCorporateHomeModulesForDonation(
  modules: string[] | null | undefined,
  donation?: HmCorporateDonationSettings | null,
): string[] | null {
  if (!modules?.length || !isHmDonationActive(donation)) return modules ?? null;
  const filtered = modules.filter((id) => id !== "donationFooter");
  return filtered.length ? filtered : modules;
}

function normalizeHmCorporateDonation(raw: unknown): HmCorporateDonationSettings {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const buttonRaw = normalizeDonationText(o.buttonText, 40);
  const buttonText =
    !buttonRaw || /^bağış\s*yap$/i.test(buttonRaw) ? "IBAN Kopyala" : buttonRaw;
  return {
    enabled: o.enabled === true,
    title: normalizeDonationText(o.title, 120) ?? defaultHmCorporateDonation.title ?? null,
    description: null,
    amounts: [],
    iban: normalizeDonationText(o.iban, 64),
    accountName: normalizeDonationText(o.accountName, 120),
    buttonText,
    supportBand: normalizeHmCorporateDonationSupportBand(o.supportBand),
  };
}

const VKD_DONATION_SUPPORT_HIGHLIGHTS_HTML = `<ul class="vkv-donation-bullets"><li>🎖️ Gazilerimizin haklarının korunması ve iyileştirilmesi için hukuki ve sosyal destek</li><li>🎓 Şehit ve gazi çocuklarına eğitim bursları</li><li>📜 Türk kahramanlarının hikâyelerinin gelecek nesillere aktarılması</li></ul>`;

const VKD_DONATION_CHIP_ITEMS = ["🎖️ GAZİ HAKLARI", "🎓 EĞİTİM BURSU", "📜 TOPLUMSAL FAYDA"];

/** VKD sitesi: API/DB boşsa destek bandı + IBAN varsayılanları (canlı vitrin). */
export function applyVkdDonationToLayoutPrefs(prefs: NewsSiteLayoutPrefs): NewsSiteLayoutPrefs {
  if (!isHmDonationActive(prefs.hmCorporateDonation)) return prefs;
  const prev = prefs.hmCorporateDonation!;
  const band = { ...(prev.supportBand ?? {}) };
  const items = (band.items ?? []).map((i) => String(i).trim()).filter(Boolean);
  const genericItems =
    items.length === 3 &&
    items.every((line) => /^(yerel habercilik|bağımsız yayın|toplumsal fayda)$/i.test(line));

  const title = (prev.title ?? "").trim();
  const bandTitle = (band.title ?? "").trim();
  const highlightsHtml = (band.highlightsHtml ?? "").trim();
  const leadText = (band.text ?? "").trim();

  return {
    ...prefs,
    hmCorporateDonation: {
      ...prev,
      title: !title || /^kurumsal yayıncılı[ğş]a destek/i.test(title) ? "Çalışmalarımıza Destek Olun." : prev.title,
      iban: (prev.iban ?? "").trim() || "TR66 0010 3000 0000 0084 0744 71",
      accountName: (prev.accountName ?? "").trim() || "VATAN KAHRAMANLARI SAVUNMA HİZMETLERİ",
      buttonText: prev.buttonText || "IBAN Kopyala",
      supportBand: {
        ...band,
        title:
          !bandTitle || /^deste[ğş]iniz haber merkezinin yanında$/i.test(bandTitle)
            ? "Çalışmalarımıza Destek Olun."
            : band.title,
        highlightsHtml: highlightsHtml
          ? band.highlightsHtml
          : leadText
            ? null
            : VKD_DONATION_SUPPORT_HIGHLIGHTS_HTML,
        text: highlightsHtml ? null : leadText || null,
        items: !items.length || genericItems ? VKD_DONATION_CHIP_ITEMS : band.items,
      },
    },
  };
}

export const defaultNewsSiteLayoutPrefs: NewsSiteLayoutPrefs = {
  mansetVariant: "center-trio",
  mansetCategorySlug: null,
  authorsHomeVariant: "sidebar",
  tickerFinance: true,
  tickerWeather: true,
  moduleMacSonuclari: false,
  showPlatformNav: false,
  hmVitrinTheme: "esen",
  hmCorporateLayoutWidth: "contained",
  hmCorporateAtaturkCornerEnabled: false,
  hmCorporateCulturePortalBandEnabled: false,
  hmCorporateWarsSectionEnabled: false,
  hmCorporateNationalDaysSectionEnabled: false,
  hmCorporateCategorySectionsEnabled: false,
  hmCorporateRssBandEnabled: false,
  hmCorporateLatestNewsEnabled: true,
  hmCorporateLatestDevelopmentsEnabled: true,
  hmCorporateSidebarInfoEnabled: true,
  hmCorporateGoogleNewsBandEnabled: false,
  hmCorporateAuthorsEnabled: false,
  hmCorporateHeroEnabled: true,
  hmCorporateQuickAccessEnabled: true,
  hmCorporateMainNewsEnabled: true,
  hmCorporateMansetAdModuleEnabled: true,
  hmCorporateHomeMiddleAdModuleEnabled: true,
  hmCorporateMainNewsLayout: "manset-side",
  hmSehitSearchEnabled: false,
  hmNewsHeaderMenuEnabled: true,
  hmChromeColorMode: "light",
  hmNewsStripMenuEnabled: false,
  hmNewsVideoTvEnabled: true,
  hmNewsSearchBoxEnabled: false,
  hmNewsIndexLandingEnabled: false,
  hmNewsYekpareFeaturesEnabled: false,
  hmNewsSliderEnabled: true,
  hmNewsTepeMansetEnabled: false,
  hmNewsRssHeadlineEnabled: false,
  hmNewsBreakingBandEnabled: true,
  hmNewsGoogleNewsBandEnabled: false,
  hmNewsBreakingRssFeeds: { ...defaultHmBreakingRssFeeds },
  hmNewsSiteRssFeedRows: defaultHmBreakingRssFeedRows(),
  hmNewsBreakingRssArticleLinkEnabled: false,
  hmRssIntegrationMode: "live",
  hmYekparePoolReceiveEnabled: true,
  hmYekparePoolSendEnabled: true,
  hybridRssEnabled: false,
  hmNewsCategorySectionsEnabled: true,
  hmNewsQuickLinksEnabled: true,
  hmNewsAuthorsEnabled: true,
  hmNewsHorizontalAuthorsEnabled: true,
  hmNewsSidebarAuthorsEnabled: true,
  hmNewsSidebarEnabled: true,
  hmNewsSidebarCategoriesEnabled: true,
  hmNewsLatestGridMainEnabled: true,
  hmNewsLatestGridSidebarEnabled: true,
  hmNewsFooterEnabled: true,
  hmNewsFooterCategoriesEnabled: true,
  hmNewsRssLinksEnabled: true,
  hmNewsSubmitLinkEnabled: false,
  hmCorporateRequestFormEnabled: true,
  hmNewsRequestFormEnabled: false,
  hmNewsPwaInstallEnabled: false,
  hmAllowCrossSiteManualNews: true,
  hmNewsPortal3ThemeBlockEnabled: false,
  hmNewsEsenThemeBlockEnabled: false,
  hmNewsFeaturedCategoryStripEnabled: false,
  hmNewsYekpareKategorilerKutusuEnabled: false,
  hmNewsLeadListSidebarEnabled: false,
  hmNewsMediaDarkBlockEnabled: false,
  hmNewsRecentVideosSidebarEnabled: false,
  hmNewsMapModuleEnabled: false,
  hmNewsSporModuleEnabled: false,
  hmNewsWorldBriefsEnabled: true,
  hmNewsYemekHaberEnabled: false,
  hmNewsAgencyLeadGridEnabled: false,
  hmNewsAgencyBorderedGridEnabled: false,
  hmNewsAgencyDarkSpotlightEnabled: false,
  hmNewsAgencyLatestSidebarEnabled: false,
  hmNewsAgencyTopicRowsEnabled: false,
  hmNewsWsjEditorialGridEnabled: false,
  hmNewsHomeModuleOrder: [...HM_NEWS_HOME_MODULE_ORDER],
  hmCorporateHomeModuleOrder: [...HM_CORPORATE_HOME_MODULE_ORDER],
  sadeNewsPublicInfoEnabled: false,
  sadeNewsNewsletterEnabled: true,
  sadeNewsTimelineEnabled: false,
  sadeNewsLatestGridEnabled: true,
  sadeNewsPopularSidebarEnabled: true,
  sadeNewsAtaturkBandEnabled: false,
  sadeNewsCultureBandEnabled: false,
  sadeNewsCitiesBandEnabled: false,
  sadeNewsWarsBandEnabled: false,
  sadeNewsNationalDaysBandEnabled: false,
  sadeNewsHistoryNationalDaysBandEnabled: false,
  sadeNewsPortalModuleOrder: [...SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER],
  hmCorporateDonation: { ...defaultHmCorporateDonation, enabled: false },
};

function normalizeDefaultVisibleToggle(raw: unknown): boolean {
  return raw === false ? false : true;
}

/** Döviz / borsa bandı — varsayılan açık. */
export function resolveTickerFinanceEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.tickerFinance !== false;
}

/** Hava özeti bandı — varsayılan açık. */
export function resolveTickerWeatherEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.tickerWeather !== false;
}

const SADE_PORTAL_LEGACY_MODULE_ALIASES: Record<string, SadeNewsPortalModuleId | null> = {
  cultureBand: null,
  citiesBand: null,
  warsBand: "historyNationalDaysBand",
  nationalDaysBand: "historyNationalDaysBand",
};

function migrateSadeNewsPortalModuleOrder(raw: readonly string[] | null | undefined): string[] | null {
  if (!raw?.length) return null;
  const allowed = new Set<string>(SADE_NEWS_PORTAL_MODULE_ORDER);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id) continue;
    const mapped = SADE_PORTAL_LEGACY_MODULE_ALIASES[id];
    if (mapped === null) continue;
    const resolved = mapped ?? (allowed.has(id) ? id : null);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    next.push(resolved);
  }
  return next.length ? next : null;
}

export function resolveSadeNewsPortalModuleOrder(
  p: NewsSiteLayoutPrefs | null | undefined,
): SadeNewsPortalModuleId[] {
  const migrated = migrateSadeNewsPortalModuleOrder(p?.sadeNewsPortalModuleOrder ?? null);
  const resolved = resolveHmHomeModuleOrder(migrated, SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER);
  return resolved.filter((id) => !isSadeNewsPortalRetiredModule(id));
}

/** Yekpare anasayfa (`/`) Türkiye Şehirleri bandı görünürlüğü — varsayılan kapalı. */
export function isSadeHomeCitiesBandEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.sadeNewsCitiesBandEnabled === true;
}

/** Yekpare `/haberler` Sade modül görünürlüğü. Kaldırılan modüller her zaman kapalıdır. */
export function isSadeNewsPortalModuleEnabled(
  p: NewsSiteLayoutPrefs | null | undefined,
  moduleId: SadeNewsPortalModuleId,
): boolean {
  if (isSadeNewsPortalRetiredModule(moduleId)) return false;
  if (!p) return true;
  switch (moduleId) {
    case "financeWeather":
      return resolveTickerFinanceEnabled(p) || resolveTickerWeatherEnabled(p);
    case "breakingBand":
      return p.hmNewsBreakingBandEnabled === true;
    case "googleNewsBand":
      return p.hmNewsGoogleNewsBandEnabled === true;
    case "headlineGrid":
      return p.hmNewsSliderEnabled !== false;
    case "newsMapModule":
      return p.hmNewsMapModuleEnabled !== false;
    case "worldBriefs":
      return p.hmNewsWorldBriefsEnabled !== false;
    case "yekpareHaberler":
      return p.hmNewsPortal3ThemeBlockEnabled !== false;
    case "recentVideosSidebar":
      return p.hmNewsRecentVideosSidebarEnabled !== false;
    case "authorsStrip":
      return resolveHmNewsHorizontalAuthorsEnabled(p);
    case "publicInfo":
      return p.sadeNewsPublicInfoEnabled === true;
    case "timeline":
      return p.sadeNewsTimelineEnabled === true;
    case "categoryModules":
      return p.hmNewsCategorySectionsEnabled !== false;
    case "newsletter":
      return p.sadeNewsNewsletterEnabled !== false;
    case "latestGrid":
      return p.sadeNewsLatestGridEnabled !== false;
    case "popularSidebar":
      return p.sadeNewsPopularSidebarEnabled !== false && p.hmNewsSidebarEnabled !== false;
    case "ataturkBand":
      return p.sadeNewsAtaturkBandEnabled === true;
    case "historyNationalDaysBand":
      return p.sadeNewsHistoryNationalDaysBandEnabled === true;
    default:
      return true;
  }
}

export function sadeNewsPortalModuleToggleKey(
  moduleId: SadeNewsPortalModuleId,
): keyof NewsSiteLayoutPrefs | null {
  switch (moduleId) {
    case "financeWeather":
      return null;
    case "breakingBand":
      return "hmNewsBreakingBandEnabled";
    case "googleNewsBand":
      return "hmNewsGoogleNewsBandEnabled";
    case "headlineGrid":
      return "hmNewsSliderEnabled";
    case "newsMapModule":
      return "hmNewsMapModuleEnabled";
    case "worldBriefs":
      return "hmNewsWorldBriefsEnabled";
    case "yekpareHaberler":
      return "hmNewsPortal3ThemeBlockEnabled";
    case "recentVideosSidebar":
      return "hmNewsRecentVideosSidebarEnabled";
    case "authorsStrip":
      return "hmNewsHorizontalAuthorsEnabled";
    case "publicInfo":
      return "sadeNewsPublicInfoEnabled";
    case "timeline":
      return "sadeNewsTimelineEnabled";
    case "categoryModules":
      return "hmNewsCategorySectionsEnabled";
    case "newsletter":
      return "sadeNewsNewsletterEnabled";
    case "latestGrid":
      return "sadeNewsLatestGridEnabled";
    case "popularSidebar":
      return "sadeNewsPopularSidebarEnabled";
    case "ataturkBand":
      return "sadeNewsAtaturkBandEnabled";
    case "historyNationalDaysBand":
      return "sadeNewsHistoryNationalDaysBandEnabled";
    default:
      return null;
  }
}

/** KURUMSAL vitrinde köşe yazarları modülü / menü görünürlüğü. */
export function resolveHmCorporateAuthorsEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmCorporateAuthorsEnabled === true;
}

function resolveHmNewsAuthorsSetting(
  p: NewsSiteLayoutPrefs | null | undefined,
  key: "hmNewsHorizontalAuthorsEnabled" | "hmNewsSidebarAuthorsEnabled",
): boolean {
  if (!p) return true;
  const raw = p[key];
  if (raw === true || raw === false) return raw;
  return p.hmNewsAuthorsEnabled !== false;
}

/** HABER vitrinde yatay köşe yazarları şeridi görünürlüğü. */
export function resolveHmNewsHorizontalAuthorsEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return resolveHmNewsAuthorsSetting(p, "hmNewsHorizontalAuthorsEnabled");
}

/** HABER vitrinde sidebar köşe yazarları widgetı görünürlüğü. */
export function resolveHmNewsSidebarAuthorsEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return resolveHmNewsAuthorsSetting(p, "hmNewsSidebarAuthorsEnabled");
}

/** HABER vitrinde üst menü — editör sitelerinde her zaman açık. */
export function resolveHmNewsHeaderMenuEnabled(_p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return true;
}

/** HABER vitrinde «Güncel Haberler + Gelişmeler» kutusu orta son haberler bandı görünürlüğü. */
export function resolveHmNewsLatestGridMainEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmNewsLatestGridMainEnabled !== false;
}

/** HABER vitrinde «Güncel Haberler + Gelişmeler» kutusu sağ sidebar görünürlüğü. */
export function resolveHmNewsLatestGridSidebarEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  if (!p || p.hmNewsLatestGridSidebarEnabled === false) return false;
  return p.hmNewsSidebarEnabled !== false;
}

/** HABER vitrinde yazarlar başlantısı/veri sorgusu için genel görünürlük. */
export function resolveHmNewsAnyAuthorsEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return resolveHmNewsHorizontalAuthorsEnabled(p) || resolveHmNewsSidebarAuthorsEnabled(p);
}

/** KURUMSAL vitrinde RSS linkleri yalnızca panelden özellikle açılırsa görünür. */
export function resolveHmCorporateRssLinksEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmNewsRssLinksEnabled === true;
}

function isHmVideoTvNavHref(href: string): boolean {
  const raw = String(href ?? "").trim().toLowerCase();
  if (!raw || raw === "#") return false;
  return /\/video-tv(?:\/|$|\?)/.test(raw) || raw === "video-tv" || raw.endsWith("/video-tv");
}

function isHmVideoTvNavLabel(label: string): boolean {
  const norm = String(label ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return norm === "video tv" || norm.includes("videotv") || norm.includes("yektube");
}

/** Özel menüde etkin Video TV bağlantısı var mı? (vitrin bayrağı kapalı olsa bile) */
export function hasHmConfiguredVideoTvNavLink(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  if (!p) return false;
  const items = [
    ...(p.hmCorporateMenuItems ?? []),
    ...(p.hmNewsFooterMenuItems ?? []),
    ...(p.hmNewsSidebarMenuItems ?? []),
  ];
  return items.some((item) => {
    if (item.enabled === false) return false;
    const href = String(item.href ?? "").trim();
    const label = String(item.label ?? "").trim();
    if (!label && !href) return false;
    return isHmVideoTvNavHref(href) || isHmVideoTvNavLabel(label);
  });
}

/** Vitrin bayrağı — yalnızca `hmNewsVideoTvEnabled` alanı. */
export function isHmNewsVideoTvFlagEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmNewsVideoTvEnabled !== false;
}

/** HABER vitrinde Video TV / Yektube (yekpare.net/yp) modülü açık mı? */
export function resolveHmNewsVideoTvEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  if (isHmNewsVideoTvFlagEnabled(p)) return true;
  return hasHmConfiguredVideoTvNavLink(p);
}

function normalizeDefaultHiddenToggle(raw: unknown): boolean {
  return raw === true ? true : false;
}

function normalizeThemeDefaultHiddenToggle(
  raw: unknown,
  theme: HmVitrinThemeId | undefined,
  moduleId: HmNewsHomeModuleId,
): boolean {
  if (raw === true || raw === false) return raw;
  return isHmNewsHomeModuleDefaultEnabledForTheme(theme, moduleId);
}

/** Site-içi RSS hibrit vitrin — editör vitrininde «Site içi RSS» anahtarı (hybridRssEnabled). */
export function isHmHybridRssEnabled(p?: Pick<NewsSiteLayoutPrefs, "hybridRssEnabled"> | null): boolean {
  return p?.hybridRssEnabled === true;
}

/** Anasayfa hibrit haber havuzu — site-içi RSS açıkken entegrasyon moduna göre API'den çekilir. */
export function resolveHmHomeHybridNewsFetchEnabled(
  p?: Pick<
    NewsSiteLayoutPrefs,
    "hybridRssEnabled" | "hmNewsBreakingRssFeedRows" | "hmNewsBreakingRssFeeds" | "hmNewsBreakingRssLabels" | "hmNewsSiteRssFeedRows"
  > | null,
  _siteId?: number | null,
): boolean {
  return isHmHybridRssEnabled(p);
}

export function readNewsSiteLayoutPrefs(): NewsSiteLayoutPrefs {
  if (typeof window === "undefined") return { ...defaultNewsSiteLayoutPrefs };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultNewsSiteLayoutPrefs };
    const j = JSON.parse(raw) as Partial<NewsSiteLayoutPrefs>;
    const merged = { ...defaultNewsSiteLayoutPrefs, ...j };
    return { ...merged, showPlatformNav: merged.showPlatformNav === true };
  } catch {
    return { ...defaultNewsSiteLayoutPrefs };
  }
}

export function writeNewsSiteLayoutPrefs(p: NewsSiteLayoutPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("yekpare-news-layout"));
}

function normalizeLayoutHexColor(raw: unknown): string | null {
  return typeof raw === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.trim()) ? raw.trim() : null;
}

/** API'den gelen `layout_json` metnini güvenli biçimde tercihlere çevirir. */
export function parseNewsSiteLayoutFromJson(
  raw: string | null | undefined,
  siteSlug?: string | null,
): NewsSiteLayoutPrefs {
  if (!raw || !String(raw).trim()) {
    const base = { ...defaultNewsSiteLayoutPrefs };
    return siteSlug?.trim().toLowerCase() === "vkd" ? applyVkdDonationToLayoutPrefs(base) : base;
  }
  try {
    const j = JSON.parse(raw) as Partial<NewsSiteLayoutPrefs>;
    const merged = { ...defaultNewsSiteLayoutPrefs, ...j };
    const logoUrl =
      (typeof merged.logoUrl === "string" && merged.logoUrl.trim().length > 0
        ? merged.logoUrl.trim()
        : null) ??
      (typeof (j as { logo?: unknown }).logo === "string" && String((j as { logo?: string }).logo).trim().length > 0
        ? String((j as { logo?: string }).logo).trim()
        : null);
    const faviconUrl =
      typeof merged.faviconUrl === "string" && merged.faviconUrl.trim().length > 0
        ? merged.faviconUrl.trim()
        : null;
    const hmCorporatePageHtml = normalizeHmCorporatePageHtml((j as { hmCorporatePageHtml?: unknown }).hmCorporatePageHtml);
    const hmExtraPages = normalizeHmExtraPages((j as { hmExtraPages?: unknown }).hmExtraPages);
    const hmFooterSocial = normalizeHmFooterSocial((j as { hmFooterSocial?: unknown }).hmFooterSocial);
    const paletteRaw = String((j as { hmColorPalette?: unknown }).hmColorPalette ?? "").trim().toLowerCase();
    const hmColorPalette: HmColorPaletteId | null =
      paletteRaw === "red" || paletteRaw === "gold" || paletteRaw === "blue" ? paletteRaw : null;
    const hmCorporateMenuItems = normalizeHmCorporateMenuItems((j as { hmCorporateMenuItems?: unknown }).hmCorporateMenuItems);
    const hmCorporateMenuPrimaryOnlyRaw = (j as { hmCorporateMenuPrimaryOnly?: unknown }).hmCorporateMenuPrimaryOnly;
    const hmCorporateMenuPrimaryOnly =
      hmCorporateMenuPrimaryOnlyRaw === true || hmCorporateMenuPrimaryOnlyRaw === "true";
    const hmNewsFooterMenuItems = normalizeHmCorporateMenuItems((j as { hmNewsFooterMenuItems?: unknown }).hmNewsFooterMenuItems);
    const hmNewsSidebarMenuItems = normalizeHmCorporateMenuItems((j as { hmNewsSidebarMenuItems?: unknown }).hmNewsSidebarMenuItems);
    const hmNewsStripMenuItems = normalizeHmCorporateMenuItems((j as { hmNewsStripMenuItems?: unknown }).hmNewsStripMenuItems);
    const hmNewsBreakingRssFeeds = normalizeHmBreakingRssFeeds((j as { hmNewsBreakingRssFeeds?: unknown }).hmNewsBreakingRssFeeds);
    const hmNewsBreakingRssLabels = normalizeHmBreakingRssLabels((j as { hmNewsBreakingRssLabels?: unknown }).hmNewsBreakingRssLabels);
    const hmNewsBreakingRssFeedRows = normalizeHmBreakingRssFeedRows(
      (j as { hmNewsBreakingRssFeedRows?: unknown }).hmNewsBreakingRssFeedRows,
      hmNewsBreakingRssFeeds,
      hmNewsBreakingRssLabels,
    );
    const hmNewsSiteRssFeedRows = normalizeHmBreakingRssFeedRows(
      (j as { hmNewsSiteRssFeedRows?: unknown }).hmNewsSiteRssFeedRows,
      hmNewsBreakingRssFeeds,
      hmNewsBreakingRssLabels,
    );
    const portalHybridRssFeeds = normalizePortalHybridRssFeeds((j as { portalHybridRssFeeds?: unknown }).portalHybridRssFeeds);
    const hybridRssEnabledRaw = (j as { hybridRssEnabled?: unknown }).hybridRssEnabled;
    const hmNewsBreakingRssBandTitle = normalizeHmBreakingRssBandTitle(
      (j as { hmNewsBreakingRssBandTitle?: unknown }).hmNewsBreakingRssBandTitle,
    );
    const hmNewsBreakingRssDisplayMode = cleanHmBreakingRssDisplayMode(
      normalizeHmBreakingRssDisplayMode((j as { hmNewsBreakingRssDisplayMode?: unknown }).hmNewsBreakingRssDisplayMode),
    );
    const newsBreakingRssArticleLinkEnabledRaw = (j as { hmNewsBreakingRssArticleLinkEnabled?: unknown })
      .hmNewsBreakingRssArticleLinkEnabled;
    const hmRssIntegrationMode = cleanHmRssIntegrationMode(
      normalizeHmRssIntegrationMode((j as { hmRssIntegrationMode?: unknown }).hmRssIntegrationMode),
    );
    const yekparePoolReceiveRaw = (j as { hmYekparePoolReceiveEnabled?: unknown }).hmYekparePoolReceiveEnabled;
    const yekparePoolSendRaw = (j as { hmYekparePoolSendEnabled?: unknown }).hmYekparePoolSendEnabled;
    const hmCorporateQuickLinks = normalizeHmCorporateQuickLinks((j as { hmCorporateQuickLinks?: unknown }).hmCorporateQuickLinks);
    const corporateSliderItems = normalizeHmCorporateSliderItems((j as { corporateSliderItems?: unknown }).corporateSliderItems);
    const corporateBandItems = normalizeHmCorporateBandItems((j as { corporateBandItems?: unknown }).corporateBandItems);
    const hmCorporateDonation = normalizeHmCorporateDonation((j as { hmCorporateDonation?: unknown }).hmCorporateDonation);
    const ataturkCornerEnabledRaw = (j as { hmCorporateAtaturkCornerEnabled?: unknown }).hmCorporateAtaturkCornerEnabled;
    const culturePortalBandEnabledRaw = (j as { hmCorporateCulturePortalBandEnabled?: unknown }).hmCorporateCulturePortalBandEnabled;
    const warsSectionEnabledRaw = (j as { hmCorporateWarsSectionEnabled?: unknown }).hmCorporateWarsSectionEnabled;
    const nationalDaysSectionEnabledRaw = (j as { hmCorporateNationalDaysSectionEnabled?: unknown }).hmCorporateNationalDaysSectionEnabled;
    const corporateCategorySectionsEnabledRaw = (j as { hmCorporateCategorySectionsEnabled?: unknown })
      .hmCorporateCategorySectionsEnabled;
    const corporateRssBandEnabledRaw = (j as { hmCorporateRssBandEnabled?: unknown }).hmCorporateRssBandEnabled;
    const corporateLatestNewsEnabledRaw = (j as { hmCorporateLatestNewsEnabled?: unknown }).hmCorporateLatestNewsEnabled;
    const corporateLatestDevelopmentsEnabledRaw = (j as { hmCorporateLatestDevelopmentsEnabled?: unknown })
      .hmCorporateLatestDevelopmentsEnabled;
    const corporateSidebarInfoEnabledRaw = (j as { hmCorporateSidebarInfoEnabled?: unknown }).hmCorporateSidebarInfoEnabled;
    const corporateGoogleNewsBandEnabledRaw = (j as { hmCorporateGoogleNewsBandEnabled?: unknown }).hmCorporateGoogleNewsBandEnabled;
    const corporateRequestFormEnabledRaw = (j as { hmCorporateRequestFormEnabled?: unknown }).hmCorporateRequestFormEnabled;
    const newsRequestFormEnabledRaw = (j as { hmNewsRequestFormEnabled?: unknown }).hmNewsRequestFormEnabled;
    const corporateAuthorsEnabledRaw = (j as { hmCorporateAuthorsEnabled?: unknown }).hmCorporateAuthorsEnabled;
    const corporateHeroEnabledRaw = (j as { hmCorporateHeroEnabled?: unknown }).hmCorporateHeroEnabled;
    const corporateQuickAccessEnabledRaw = (j as { hmCorporateQuickAccessEnabled?: unknown }).hmCorporateQuickAccessEnabled;
    const corporateMainNewsEnabledRaw = (j as { hmCorporateMainNewsEnabled?: unknown }).hmCorporateMainNewsEnabled;
    const corporateMansetAdModuleEnabledRaw = (j as { hmCorporateMansetAdModuleEnabled?: unknown }).hmCorporateMansetAdModuleEnabled;
    const corporateHomeMiddleAdModuleEnabledRaw = (j as { hmCorporateHomeMiddleAdModuleEnabled?: unknown })
      .hmCorporateHomeMiddleAdModuleEnabled;
    const hmCorporateMainNewsLayout = parseHmCorporateMainNewsLayout(
      (j as { hmCorporateMainNewsLayout?: unknown }).hmCorporateMainNewsLayout,
    );
    const hmSehitSearchEnabledRaw = (j as { hmSehitSearchEnabled?: unknown }).hmSehitSearchEnabled;
    const newsHeaderMenuEnabledRaw = (j as { hmNewsHeaderMenuEnabled?: unknown }).hmNewsHeaderMenuEnabled;
    const newsStripMenuEnabledRaw = (j as { hmNewsStripMenuEnabled?: unknown }).hmNewsStripMenuEnabled;
    const newsVideoTvEnabledRaw = (j as { hmNewsVideoTvEnabled?: unknown }).hmNewsVideoTvEnabled;
    const newsSearchBoxEnabledRaw = (j as { hmNewsSearchBoxEnabled?: unknown }).hmNewsSearchBoxEnabled;
    const newsIndexLandingEnabledRaw = (j as { hmNewsIndexLandingEnabled?: unknown }).hmNewsIndexLandingEnabled;
    const newsYekpareFeaturesEnabledRaw = (j as { hmNewsYekpareFeaturesEnabled?: unknown }).hmNewsYekpareFeaturesEnabled;
    const newsSliderEnabledRaw = (j as { hmNewsSliderEnabled?: unknown }).hmNewsSliderEnabled;
    const newsTepeMansetEnabledRaw = (j as { hmNewsTepeMansetEnabled?: unknown }).hmNewsTepeMansetEnabled;
    const newsRssHeadlineEnabledRaw = (j as { hmNewsRssHeadlineEnabled?: unknown }).hmNewsRssHeadlineEnabled;
    const newsBreakingBandEnabledRaw = (j as { hmNewsBreakingBandEnabled?: unknown }).hmNewsBreakingBandEnabled;
    const newsGoogleNewsBandEnabledRaw = (j as { hmNewsGoogleNewsBandEnabled?: unknown }).hmNewsGoogleNewsBandEnabled;
    const newsCategorySectionsEnabledRaw = (j as { hmNewsCategorySectionsEnabled?: unknown }).hmNewsCategorySectionsEnabled;
    const newsQuickLinksEnabledRaw = (j as { hmNewsQuickLinksEnabled?: unknown }).hmNewsQuickLinksEnabled;
    const newsAuthorsEnabledRaw = (j as { hmNewsAuthorsEnabled?: unknown }).hmNewsAuthorsEnabled;
    const newsHorizontalAuthorsEnabledRaw = (j as { hmNewsHorizontalAuthorsEnabled?: unknown })
      .hmNewsHorizontalAuthorsEnabled;
    const newsSidebarAuthorsEnabledRaw = (j as { hmNewsSidebarAuthorsEnabled?: unknown }).hmNewsSidebarAuthorsEnabled;
    const newsSidebarEnabledRaw = (j as { hmNewsSidebarEnabled?: unknown }).hmNewsSidebarEnabled;
    const newsSidebarCategoriesEnabledRaw = (j as { hmNewsSidebarCategoriesEnabled?: unknown }).hmNewsSidebarCategoriesEnabled;
    const newsLatestGridMainEnabledRaw = (j as { hmNewsLatestGridMainEnabled?: unknown }).hmNewsLatestGridMainEnabled;
    const newsLatestGridSidebarEnabledRaw = (j as { hmNewsLatestGridSidebarEnabled?: unknown }).hmNewsLatestGridSidebarEnabled;
    const newsFooterEnabledRaw = (j as { hmNewsFooterEnabled?: unknown }).hmNewsFooterEnabled;
    const newsFooterCategoriesEnabledRaw = (j as { hmNewsFooterCategoriesEnabled?: unknown }).hmNewsFooterCategoriesEnabled;
    const newsRssLinksEnabledRaw = (j as { hmNewsRssLinksEnabled?: unknown }).hmNewsRssLinksEnabled;
    const newsSubmitLinkEnabledRaw = (j as { hmNewsSubmitLinkEnabled?: unknown }).hmNewsSubmitLinkEnabled;
    const newsPwaInstallEnabledRaw = (j as { hmNewsPwaInstallEnabled?: unknown }).hmNewsPwaInstallEnabled;
    const newsPortal3ThemeBlockEnabledRaw = (j as { hmNewsPortal3ThemeBlockEnabled?: unknown }).hmNewsPortal3ThemeBlockEnabled;
    const newsEsenThemeBlockEnabledRaw = (j as { hmNewsEsenThemeBlockEnabled?: unknown }).hmNewsEsenThemeBlockEnabled;
    const newsFeaturedCategoryStripEnabledRaw = (j as { hmNewsFeaturedCategoryStripEnabled?: unknown }).hmNewsFeaturedCategoryStripEnabled;
    const newsYekpareKategorilerKutusuEnabledRaw = (j as { hmNewsYekpareKategorilerKutusuEnabled?: unknown }).hmNewsYekpareKategorilerKutusuEnabled;
    const newsLeadListSidebarEnabledRaw = (j as { hmNewsLeadListSidebarEnabled?: unknown }).hmNewsLeadListSidebarEnabled;
    const newsMediaDarkBlockEnabledRaw = (j as { hmNewsMediaDarkBlockEnabled?: unknown }).hmNewsMediaDarkBlockEnabled;
    const newsRecentVideosSidebarEnabledRaw = (j as { hmNewsRecentVideosSidebarEnabled?: unknown }).hmNewsRecentVideosSidebarEnabled;
    const newsAgencyLeadGridEnabledRaw = (j as { hmNewsAgencyLeadGridEnabled?: unknown }).hmNewsAgencyLeadGridEnabled;
    const newsAgencyBorderedGridEnabledRaw = (j as { hmNewsAgencyBorderedGridEnabled?: unknown }).hmNewsAgencyBorderedGridEnabled;
    const newsAgencyDarkSpotlightEnabledRaw = (j as { hmNewsAgencyDarkSpotlightEnabled?: unknown }).hmNewsAgencyDarkSpotlightEnabled;
    const newsAgencyLatestSidebarEnabledRaw = (j as { hmNewsAgencyLatestSidebarEnabled?: unknown }).hmNewsAgencyLatestSidebarEnabled;
    const newsAgencyTopicRowsEnabledRaw = (j as { hmNewsAgencyTopicRowsEnabled?: unknown }).hmNewsAgencyTopicRowsEnabled;
    const newsWsjEditorialGridEnabledRaw = (j as { hmNewsWsjEditorialGridEnabled?: unknown }).hmNewsWsjEditorialGridEnabled;
    const newsAhenkIconCategoryRowEnabledRaw = (j as { hmNewsAhenkIconCategoryRowEnabled?: unknown })
      .hmNewsAhenkIconCategoryRowEnabled;
    const newsAhenkGununSesiAuthorsEnabledRaw = (j as { hmNewsAhenkGununSesiAuthorsEnabled?: unknown })
      .hmNewsAhenkGununSesiAuthorsEnabled;
    const newsAhenkAnkaraGridEnabledRaw = (j as { hmNewsAhenkAnkaraGridEnabled?: unknown }).hmNewsAhenkAnkaraGridEnabled;
    const newsAhenkGundemLeadSideEnabledRaw = (j as { hmNewsAhenkGundemLeadSideEnabled?: unknown })
      .hmNewsAhenkGundemLeadSideEnabled;
    const newsAhenkSporGridEnabledRaw = (j as { hmNewsAhenkSporGridEnabled?: unknown }).hmNewsAhenkSporGridEnabled;
    const newsAhenkDunyaBlockEnabledRaw = (j as { hmNewsAhenkDunyaBlockEnabled?: unknown }).hmNewsAhenkDunyaBlockEnabled;
    const newsAhenkEkonomiGridEnabledRaw = (j as { hmNewsAhenkEkonomiGridEnabled?: unknown }).hmNewsAhenkEkonomiGridEnabled;
    const newsAhenkSonEklenenlerEnabledRaw = (j as { hmNewsAhenkSonEklenenlerEnabled?: unknown })
      .hmNewsAhenkSonEklenenlerEnabled;
    const newsAhenkPopulerHaberlerEnabledRaw = (j as { hmNewsAhenkPopulerHaberlerEnabled?: unknown })
      .hmNewsAhenkPopulerHaberlerEnabled;
    const warsSectionHref = normalizeHref((j as { hmCorporateWarsSectionHref?: unknown }).hmCorporateWarsSectionHref);
    const nationalDaysSectionHref = normalizeHref(
      (j as { hmCorporateNationalDaysSectionHref?: unknown }).hmCorporateNationalDaysSectionHref,
    );
    const waRaw = (j as { hmFooterWhatsappIhbar?: unknown }).hmFooterWhatsappIhbar;
    const hmFooterWhatsappIhbar =
      typeof waRaw === "string" && waRaw.replace(/\D/g, "").length > 0 ? waRaw.replace(/\D/g, "") : null;
    const themeRaw = String((j as { hmVitrinTheme?: unknown }).hmVitrinTheme ?? "").trim().toLowerCase();
    const retiredTheme = isHmRetiredVitrinThemeRaw(themeRaw);
    const hmVitrinTheme = normalizeHmVitrinTheme(themeRaw || "news");
    const mansetRaw = String((j as { mansetVariant?: unknown }).mansetVariant ?? "").trim().toLowerCase();
    const mansetVariant: MansetVariant =
      mansetRaw === "full-thumbs" ||
      mansetRaw === "center-trio" ||
      mansetRaw === "full-numbered" ||
      mansetRaw === "magazine-grid" ||
      mansetRaw === "slider-side-band"
        ? mansetRaw
        : "split";
    const mansetCategoryRaw = String((j as { mansetCategorySlug?: unknown }).mansetCategorySlug ?? "").trim().toLowerCase();
    const mansetCategorySlug = mansetCategoryRaw || null;
    const yekpareMenuPreset = parseYekpareMenuPreset((j as { yekpareMenuPreset?: unknown }).yekpareMenuPreset);
    const headerPreset = parseHeaderPreset((j as { headerPreset?: unknown }).headerPreset);
    const tickerPlacement = parseTickerPlacement((j as { tickerPlacement?: unknown }).tickerPlacement);
    const hmHeaderRightSlot = parseHmHeaderRightSlot((j as { hmHeaderRightSlot?: unknown }).hmHeaderRightSlot);
    const hmHeaderRightBannerUrlRaw = String((j as { hmHeaderRightBannerUrl?: unknown }).hmHeaderRightBannerUrl ?? "").trim();
    const hmHeaderRightBannerUrl = hmHeaderRightBannerUrlRaw ? hmHeaderRightBannerUrlRaw.slice(0, 2000) : null;
    const hmHeaderRightCustomTextRaw = String((j as { hmHeaderRightCustomText?: unknown }).hmHeaderRightCustomText ?? "").trim();
    const hmHeaderRightCustomText = hmHeaderRightCustomTextRaw ? hmHeaderRightCustomTextRaw.slice(0, 500) : null;
    const isCorporateTheme = hmVitrinTheme === "corporate";
    const corporateLayoutWidthRaw = String((j as { hmCorporateLayoutWidth?: unknown }).hmCorporateLayoutWidth ?? "")
      .trim()
      .toLowerCase();
    const hmCorporateLayoutWidth: HmCorporateLayoutWidth =
      corporateLayoutWidthRaw === "contained" ||
      corporateLayoutWidthRaw === "centered" ||
      corporateLayoutWidthRaw === "ortali" ||
      corporateLayoutWidthRaw === "ortalı"
        ? "contained"
        : "full";
    const logoBarBgRaw = (j as { hmLogoBarBackground?: unknown }).hmLogoBarBackground;
    const navBarBgRaw = (j as { hmNavBarBackground?: unknown }).hmNavBarBackground;
    const logoBarBg =
      typeof logoBarBgRaw === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(logoBarBgRaw.trim())
        ? logoBarBgRaw.trim()
        : null;
    const navBarBg =
      typeof navBarBgRaw === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(navBarBgRaw.trim()) ? navBarBgRaw.trim() : null;
    const primaryColorRaw = (j as { hmPrimaryColor?: unknown }).hmPrimaryColor ?? merged.hmPrimaryColor;
    const secondaryColorRaw = (j as { hmSecondaryColor?: unknown }).hmSecondaryColor ?? merged.hmSecondaryColor;
    const hmPrimaryColor = normalizeLayoutHexColor(primaryColorRaw);
    const hmSecondaryColor = normalizeLayoutHexColor(secondaryColorRaw);
    const fullBleedRaw = (j as { hmHeaderChromeFullBleed?: unknown }).hmHeaderChromeFullBleed;
    const hmHeaderChromeFullBleed = fullBleedRaw === true;
    const chromeColorModeRaw = String((j as { hmChromeColorMode?: unknown }).hmChromeColorMode ?? "")
      .trim()
      .toLowerCase();
    const hmChromeColorMode: HmChromeColorMode | undefined =
      chromeColorModeRaw === "light" || chromeColorModeRaw === "dark" || chromeColorModeRaw === "auto"
        ? chromeColorModeRaw
        : undefined;
    const sortRaw = (j as { hmCategorySortSlugs?: unknown }).hmCategorySortSlugs;
    const hmCategorySortSlugs = Array.isArray(sortRaw)
      ? sortRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : null;
    const activatedRaw = (j as { hmActivatedCategorySlugs?: unknown }).hmActivatedCategorySlugs;
    const hmActivatedCategorySlugs = Array.isArray(activatedRaw)
      ? activatedRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : null;
    const hiddenRssRaw = (j as { hmHiddenRssItemIds?: unknown }).hmHiddenRssItemIds;
    const hmHiddenRssItemIds = Array.isArray(hiddenRssRaw)
      ? hiddenRssRaw
          .map((s) => {
            const id = String(s ?? "").trim();
            return id.startsWith("rss:") ? id.slice(4) : id;
          })
          .filter(Boolean)
      : null;
    const allowCrossSiteManualNewsRaw = (j as { hmAllowCrossSiteManualNews?: unknown }).hmAllowCrossSiteManualNews;
    const classicAraRaw = (j as { hmClassicAraMansetCategorySlugs?: unknown }).hmClassicAraMansetCategorySlugs;
    const hmClassicAraMansetCategorySlugs = Array.isArray(classicAraRaw)
      ? classicAraRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : null;
    const featuredStripSlugsRaw = (j as { hmNewsFeaturedCategoryStripSlugs?: unknown }).hmNewsFeaturedCategoryStripSlugs;
    const hmNewsFeaturedCategoryStripSlugs = Array.isArray(featuredStripSlugsRaw)
      ? featuredStripSlugsRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : null;
    const yekpareKutuSlugsRaw = (j as { hmYekpareKategorilerKutusuSlugs?: unknown }).hmYekpareKategorilerKutusuSlugs;
    const hmYekpareKategorilerKutusuSlugs = Array.isArray(yekpareKutuSlugsRaw)
      ? yekpareKutuSlugsRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : null;
    const yekpareKutuCountRaw = (j as { hmYekpareKategorilerKutusuItemCount?: unknown }).hmYekpareKategorilerKutusuItemCount;
    const hmYekpareKategorilerKutusuItemCount =
      typeof yekpareKutuCountRaw === "number" && Number.isFinite(yekpareKutuCountRaw)
        ? normalizeYekpareKutuItemCount(Math.round(yekpareKutuCountRaw))
        : undefined;
    const yekpareBoxCountRaw = (j as { hmYekpareCategoryBoxCount?: unknown }).hmYekpareCategoryBoxCount;
    const hmYekpareCategoryBoxCount =
      typeof yekpareBoxCountRaw === "number" && Number.isFinite(yekpareBoxCountRaw)
        ? normalizeYekpareCategoryBoxCount(Math.round(yekpareBoxCountRaw))
        : undefined;
    const hmNewsHomeModuleOrder = normalizeHomeModuleOrder(
      (j as { hmNewsHomeModuleOrder?: unknown }).hmNewsHomeModuleOrder,
      HM_NEWS_HOME_MODULE_ORDER,
    );
    const hmNewsHomeModuleCategorySlugs = normalizeHmNewsHomeModuleCategorySlugs(
      (j as { hmNewsHomeModuleCategorySlugs?: unknown }).hmNewsHomeModuleCategorySlugs,
    );
    const hmNewsHomeModuleGallerySources = normalizeHmNewsHomeModuleGallerySources(
      (j as { hmNewsHomeModuleGallerySources?: unknown }).hmNewsHomeModuleGallerySources,
    );
    const hmNewsHomeModuleGalleryVideoTvRefs = normalizeHmNewsHomeModuleGalleryVideoTvRefs(
      (j as { hmNewsHomeModuleGalleryVideoTvRefs?: unknown }).hmNewsHomeModuleGalleryVideoTvRefs,
    );
    const hmNewsGallerySpotlightMode = normalizeHmNewsGallerySpotlightMode(
      (j as { hmNewsGallerySpotlightMode?: unknown }).hmNewsGallerySpotlightMode,
    );
    const hmNewsVideoTvChannelIdRaw = Number((j as { hmNewsVideoTvChannelId?: unknown }).hmNewsVideoTvChannelId);
    const hmNewsVideoTvChannelId =
      Number.isFinite(hmNewsVideoTvChannelIdRaw) && hmNewsVideoTvChannelIdRaw > 0 ? hmNewsVideoTvChannelIdRaw : undefined;
    const hmNewsVideoTvPlaylistIdRaw = Number((j as { hmNewsVideoTvPlaylistId?: unknown }).hmNewsVideoTvPlaylistId);
    const hmNewsVideoTvPlaylistId =
      Number.isFinite(hmNewsVideoTvPlaylistIdRaw) && hmNewsVideoTvPlaylistIdRaw > 0 ? hmNewsVideoTvPlaylistIdRaw : undefined;
    const hmNewsVideoTvManualLinkRaw = String((j as { hmNewsVideoTvManualLink?: unknown }).hmNewsVideoTvManualLink ?? "").trim();
    const hmNewsVideoTvManualLink = hmNewsVideoTvManualLinkRaw ? hmNewsVideoTvManualLinkRaw.slice(0, 500) : undefined;
    const hmCorporateHomeModuleOrder = filterCorporateHomeModulesForDonation(
      normalizeHomeModuleOrder(
        (j as { hmCorporateHomeModuleOrder?: unknown }).hmCorporateHomeModuleOrder,
        HM_CORPORATE_HOME_MODULE_ORDER,
      ),
      hmCorporateDonation,
    );
    const sadeNewsPortalModuleOrderRaw = (j as { sadeNewsPortalModuleOrder?: unknown }).sadeNewsPortalModuleOrder;
    const sadeNewsPortalModuleOrder = migrateSadeNewsPortalModuleOrder(
      Array.isArray(sadeNewsPortalModuleOrderRaw)
        ? sadeNewsPortalModuleOrderRaw.map((item) => String(item ?? "").trim()).filter(Boolean)
        : null,
    );
    const sadeNewsPublicInfoEnabledRaw = (j as { sadeNewsPublicInfoEnabled?: unknown }).sadeNewsPublicInfoEnabled;
    const sadeNewsTimelineEnabledRaw = (j as { sadeNewsTimelineEnabled?: unknown }).sadeNewsTimelineEnabled;
    const sadeNewsNewsletterEnabledRaw = (j as { sadeNewsNewsletterEnabled?: unknown }).sadeNewsNewsletterEnabled;
    const sadeNewsLatestGridEnabledRaw = (j as { sadeNewsLatestGridEnabled?: unknown }).sadeNewsLatestGridEnabled;
    const sadeNewsPopularSidebarEnabledRaw = (j as { sadeNewsPopularSidebarEnabled?: unknown }).sadeNewsPopularSidebarEnabled;
    const sadeNewsAtaturkBandEnabledRaw = (j as { sadeNewsAtaturkBandEnabled?: unknown }).sadeNewsAtaturkBandEnabled;
    const sadeNewsHistoryNationalDaysBandEnabledRaw = (j as { sadeNewsHistoryNationalDaysBandEnabled?: unknown })
      .sadeNewsHistoryNationalDaysBandEnabled;
    const parsed: NewsSiteLayoutPrefs = {
      ...merged,
      mansetVariant,
      mansetCategorySlug,
      logoUrl: logoUrl ?? undefined,
      faviconUrl: faviconUrl ?? undefined,
      showPlatformNav: merged.showPlatformNav === true,
      hmColorPalette: hmColorPalette ?? undefined,
      hmCorporatePageHtml: hmCorporatePageHtml ?? undefined,
      hmExtraPages: hmExtraPages ?? undefined,
      hmCorporateMenuItems: hmCorporateMenuItems ?? undefined,
      hmCorporateMenuPrimaryOnly: hmCorporateMenuPrimaryOnly ? true : undefined,
      hmNewsFooterMenuItems: hmNewsFooterMenuItems ?? undefined,
      hmNewsSidebarMenuItems: hmNewsSidebarMenuItems ?? undefined,
      hmNewsStripMenuItems: hmNewsStripMenuItems ?? undefined,
      hmNewsBreakingRssFeeds,
      hmNewsBreakingRssLabels: hmNewsBreakingRssLabels ?? undefined,
      hmNewsBreakingRssFeedRows,
      hmNewsSiteRssFeedRows,
      portalHybridRssFeeds: portalHybridRssFeeds ?? undefined,
      hybridRssEnabled: hybridRssEnabledRaw === true ? true : undefined,
      hmNewsBreakingRssBandTitle: hmNewsBreakingRssBandTitle ?? undefined,
      hmNewsBreakingRssDisplayMode: hmNewsBreakingRssDisplayMode ?? undefined,
      hmNewsBreakingRssArticleLinkEnabled: normalizeDefaultHiddenToggle(newsBreakingRssArticleLinkEnabledRaw),
      hmRssIntegrationMode,
      hmYekparePoolReceiveEnabled: normalizeDefaultVisibleToggle(yekparePoolReceiveRaw),
      hmYekparePoolSendEnabled: normalizeDefaultVisibleToggle(yekparePoolSendRaw),
      hmCorporateQuickLinks: hmCorporateQuickLinks ?? undefined,
      corporateSliderItems: corporateSliderItems ?? undefined,
      corporateBandItems: corporateBandItems ?? undefined,
      hmCorporateDonation,
      hmCorporateAtaturkCornerEnabled: normalizeDefaultHiddenToggle(ataturkCornerEnabledRaw),
      hmCorporateCulturePortalBandEnabled: normalizeDefaultHiddenToggle(culturePortalBandEnabledRaw),
      hmCorporateWarsSectionEnabled: normalizeDefaultHiddenToggle(warsSectionEnabledRaw),
      hmCorporateNationalDaysSectionEnabled: normalizeDefaultHiddenToggle(nationalDaysSectionEnabledRaw),
      hmCorporateCategorySectionsEnabled: normalizeDefaultVisibleToggle(corporateCategorySectionsEnabledRaw),
      hmCorporateRssBandEnabled: normalizeDefaultHiddenToggle(corporateRssBandEnabledRaw),
      hmCorporateLatestNewsEnabled: normalizeDefaultVisibleToggle(corporateLatestNewsEnabledRaw),
      hmCorporateLatestDevelopmentsEnabled: normalizeDefaultVisibleToggle(corporateLatestDevelopmentsEnabledRaw),
      hmCorporateSidebarInfoEnabled: normalizeDefaultVisibleToggle(corporateSidebarInfoEnabledRaw),
      hmCorporateGoogleNewsBandEnabled: normalizeDefaultHiddenToggle(corporateGoogleNewsBandEnabledRaw),
      hmCorporateRequestFormEnabled: normalizeDefaultVisibleToggle(corporateRequestFormEnabledRaw),
      hmCorporateRequestCategories:
        normalizeHmRequestCategories((j as { hmCorporateRequestCategories?: unknown }).hmCorporateRequestCategories) ??
        undefined,
      hmCorporateAuthorsEnabled: isCorporateTheme
        ? normalizeDefaultHiddenToggle(corporateAuthorsEnabledRaw)
        : normalizeDefaultVisibleToggle(corporateAuthorsEnabledRaw),
      hmCorporateHeroEnabled: normalizeDefaultVisibleToggle(corporateHeroEnabledRaw),
      hmCorporateQuickAccessEnabled: normalizeDefaultVisibleToggle(corporateQuickAccessEnabledRaw),
      hmCorporateMainNewsEnabled: normalizeDefaultVisibleToggle(corporateMainNewsEnabledRaw),
      hmCorporateMansetAdModuleEnabled: normalizeDefaultVisibleToggle(corporateMansetAdModuleEnabledRaw),
      hmCorporateHomeMiddleAdModuleEnabled: normalizeDefaultVisibleToggle(corporateHomeMiddleAdModuleEnabledRaw),
      hmCorporateMainNewsLayout: hmCorporateMainNewsLayout ?? undefined,
      hmSehitSearchEnabled: normalizeDefaultHiddenToggle(hmSehitSearchEnabledRaw),
      hmNewsHeaderMenuEnabled: normalizeDefaultVisibleToggle(newsHeaderMenuEnabledRaw),
      hmNewsStripMenuEnabled: normalizeDefaultHiddenToggle(newsStripMenuEnabledRaw),
      hmNewsVideoTvEnabled: normalizeDefaultVisibleToggle(newsVideoTvEnabledRaw),
      hmNewsSearchBoxEnabled: normalizeDefaultHiddenToggle(newsSearchBoxEnabledRaw),
      hmNewsIndexLandingEnabled: normalizeDefaultHiddenToggle(newsIndexLandingEnabledRaw),
      hmNewsYekpareFeaturesEnabled: normalizeDefaultHiddenToggle(newsYekpareFeaturesEnabledRaw),
      hmNewsSliderEnabled: normalizeDefaultVisibleToggle(newsSliderEnabledRaw),
      hmNewsTepeMansetEnabled: normalizeDefaultHiddenToggle(newsTepeMansetEnabledRaw),
      hmNewsRssHeadlineEnabled: normalizeDefaultHiddenToggle(newsRssHeadlineEnabledRaw),
      hmNewsBreakingBandEnabled: normalizeDefaultVisibleToggle(newsBreakingBandEnabledRaw),
      hmNewsGoogleNewsBandEnabled: normalizeDefaultHiddenToggle(newsGoogleNewsBandEnabledRaw),
      hmNewsCategorySectionsEnabled: normalizeDefaultVisibleToggle(newsCategorySectionsEnabledRaw),
      hmNewsQuickLinksEnabled: normalizeDefaultVisibleToggle(newsQuickLinksEnabledRaw),
      hmNewsAuthorsEnabled: normalizeDefaultVisibleToggle(newsAuthorsEnabledRaw),
      hmNewsHorizontalAuthorsEnabled:
        newsHorizontalAuthorsEnabledRaw === true || newsHorizontalAuthorsEnabledRaw === false
          ? newsHorizontalAuthorsEnabledRaw
          : normalizeDefaultVisibleToggle(newsAuthorsEnabledRaw),
      hmNewsSidebarAuthorsEnabled:
        newsSidebarAuthorsEnabledRaw === true || newsSidebarAuthorsEnabledRaw === false
          ? newsSidebarAuthorsEnabledRaw
          : normalizeDefaultVisibleToggle(newsAuthorsEnabledRaw),
      hmNewsSidebarEnabled: normalizeDefaultVisibleToggle(newsSidebarEnabledRaw),
      hmNewsSidebarCategoriesEnabled: normalizeDefaultVisibleToggle(newsSidebarCategoriesEnabledRaw),
      hmNewsLatestGridMainEnabled: normalizeDefaultVisibleToggle(newsLatestGridMainEnabledRaw),
      hmNewsLatestGridSidebarEnabled: normalizeDefaultVisibleToggle(newsLatestGridSidebarEnabledRaw),
      hmNewsFooterEnabled: normalizeDefaultVisibleToggle(newsFooterEnabledRaw),
      hmNewsFooterCategoriesEnabled: normalizeDefaultVisibleToggle(newsFooterCategoriesEnabledRaw),
      hmNewsRssLinksEnabled: isCorporateTheme
        ? normalizeDefaultHiddenToggle(newsRssLinksEnabledRaw)
        : normalizeDefaultVisibleToggle(newsRssLinksEnabledRaw),
      hmNewsSubmitLinkEnabled: normalizeDefaultHiddenToggle(newsSubmitLinkEnabledRaw),
      hmNewsRequestFormEnabled: normalizeDefaultHiddenToggle(newsRequestFormEnabledRaw),
      hmNewsRequestCategories:
        normalizeHmRequestCategories((j as { hmNewsRequestCategories?: unknown }).hmNewsRequestCategories) ??
        undefined,
      hmNewsOfferCategories:
        normalizeHmRequestCategories((j as { hmNewsOfferCategories?: unknown }).hmNewsOfferCategories) ??
        undefined,
      hmNewsPwaInstallEnabled: normalizeDefaultHiddenToggle(newsPwaInstallEnabledRaw),
      hmNewsPortal3ThemeBlockEnabled: normalizeThemeDefaultHiddenToggle(
        newsPortal3ThemeBlockEnabledRaw,
        hmVitrinTheme,
        "portal3ThemeBlock",
      ),
      hmNewsEsenThemeBlockEnabled: normalizeThemeDefaultHiddenToggle(newsEsenThemeBlockEnabledRaw, hmVitrinTheme, "esenThemeBlock"),
      hmNewsFeaturedCategoryStripEnabled: normalizeThemeDefaultHiddenToggle(
        newsFeaturedCategoryStripEnabledRaw,
        hmVitrinTheme,
        "featuredCategoryStrip",
      ),
      hmNewsAhenkIconCategoryRowEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkIconCategoryRowEnabledRaw,
        hmVitrinTheme,
        "ahenkIconCategoryRow",
      ),
      hmNewsYekpareKategorilerKutusuEnabled: normalizeThemeDefaultHiddenToggle(
        newsYekpareKategorilerKutusuEnabledRaw,
        hmVitrinTheme,
        "yekpareKategorilerKutusu",
      ),
      hmNewsLeadListSidebarEnabled: normalizeThemeDefaultHiddenToggle(newsLeadListSidebarEnabledRaw, hmVitrinTheme, "leadListSidebar"),
      hmNewsMediaDarkBlockEnabled: normalizeThemeDefaultHiddenToggle(newsMediaDarkBlockEnabledRaw, hmVitrinTheme, "mediaDarkBlock"),
      hmNewsRecentVideosSidebarEnabled: normalizeThemeDefaultHiddenToggle(newsRecentVideosSidebarEnabledRaw, hmVitrinTheme, "recentVideosSidebar"),
      hmNewsAhenkGununSesiAuthorsEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkGununSesiAuthorsEnabledRaw,
        hmVitrinTheme,
        "ahenkGununSesiAuthors",
      ),
      hmNewsAhenkAnkaraGridEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkAnkaraGridEnabledRaw,
        hmVitrinTheme,
        "ahenkAnkaraGrid",
      ),
      hmNewsAhenkGundemLeadSideEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkGundemLeadSideEnabledRaw,
        hmVitrinTheme,
        "ahenkGundemLeadSide",
      ),
      hmNewsAhenkSporGridEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkSporGridEnabledRaw,
        hmVitrinTheme,
        "ahenkSporGrid",
      ),
      hmNewsAhenkDunyaBlockEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkDunyaBlockEnabledRaw,
        hmVitrinTheme,
        "ahenkDunyaBlock",
      ),
      hmNewsAhenkEkonomiGridEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkEkonomiGridEnabledRaw,
        hmVitrinTheme,
        "ahenkEkonomiGrid",
      ),
      hmNewsAhenkSonEklenenlerEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkSonEklenenlerEnabledRaw,
        hmVitrinTheme,
        "ahenkSonEklenenler",
      ),
      hmNewsAhenkPopulerHaberlerEnabled: normalizeThemeDefaultHiddenToggle(
        newsAhenkPopulerHaberlerEnabledRaw,
        hmVitrinTheme,
        "ahenkPopulerHaberler",
      ),
      hmCorporateWarsSectionHref: warsSectionHref || undefined,
      hmCorporateNationalDaysSectionHref: nationalDaysSectionHref || undefined,
      hmFooterSocial: hmFooterSocial ?? undefined,
      hmFooterWhatsappIhbar: hmFooterWhatsappIhbar ?? undefined,
      hmVitrinTheme,
      hmCorporateLayoutWidth,
      hmHeaderChromeFullBleed: hmHeaderChromeFullBleed ? true : undefined,
      hmLogoBarBackground: logoBarBg ?? undefined,
      hmNavBarBackground: navBarBg ?? undefined,
      hmPrimaryColor: hmPrimaryColor ?? undefined,
      hmSecondaryColor: hmSecondaryColor ?? undefined,
      yekpareMenuPreset: yekpareMenuPreset !== "default" ? yekpareMenuPreset : undefined,
      headerPreset: headerPreset !== "default" ? headerPreset : undefined,
      tickerPlacement: tickerPlacement !== "logo-side" ? tickerPlacement : undefined,
      hmHeaderRightSlot: hmHeaderRightSlot ?? undefined,
      hmHeaderRightBannerUrl: hmHeaderRightBannerUrl ?? undefined,
      hmHeaderRightCustomText: hmHeaderRightCustomText ?? undefined,
      hmChromeColorMode: hmChromeColorMode ?? merged.hmChromeColorMode,
      hmCategorySortSlugs: hmCategorySortSlugs?.length ? hmCategorySortSlugs : undefined,
      hmActivatedCategorySlugs: hmActivatedCategorySlugs?.length ? hmActivatedCategorySlugs : undefined,
      hmHiddenRssItemIds: hmHiddenRssItemIds?.length ? hmHiddenRssItemIds : undefined,
      hmAllowCrossSiteManualNews: normalizeDefaultVisibleToggle(allowCrossSiteManualNewsRaw),
      hmClassicAraMansetCategorySlugs: hmClassicAraMansetCategorySlugs?.length ? hmClassicAraMansetCategorySlugs : undefined,
      hmNewsFeaturedCategoryStripSlugs: hmNewsFeaturedCategoryStripSlugs?.length ? hmNewsFeaturedCategoryStripSlugs : undefined,
      hmYekpareKategorilerKutusuSlugs: hmYekpareKategorilerKutusuSlugs?.length ? hmYekpareKategorilerKutusuSlugs : undefined,
      hmYekpareCategoryBoxCount: hmYekpareCategoryBoxCount ?? undefined,
      hmYekpareKategorilerKutusuItemCount: hmYekpareKategorilerKutusuItemCount ?? undefined,
      hmNewsHomeModuleOrder: hmNewsHomeModuleOrder ?? [...HM_NEWS_HOME_MODULE_ORDER],
      hmNewsHomeModuleCategorySlugs: hmNewsHomeModuleCategorySlugs ?? undefined,
      hmNewsHomeModuleGallerySources: hmNewsHomeModuleGallerySources ?? undefined,
      hmNewsHomeModuleGalleryVideoTvRefs: hmNewsHomeModuleGalleryVideoTvRefs ?? undefined,
      hmNewsGallerySpotlightMode: hmNewsGallerySpotlightMode ?? undefined,
      hmNewsVideoTvChannelId,
      hmNewsVideoTvPlaylistId,
      hmNewsVideoTvManualLink,
      hmCorporateHomeModuleOrder: hmCorporateHomeModuleOrder ?? [...HM_CORPORATE_HOME_MODULE_ORDER],
      sadeNewsPortalModuleOrder: resolveHmHomeModuleOrder(
        sadeNewsPortalModuleOrder,
        SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER,
      ).filter((id) => !isSadeNewsPortalRetiredModule(id)),
      sadeNewsPublicInfoEnabled: normalizeDefaultHiddenToggle(sadeNewsPublicInfoEnabledRaw),
      sadeNewsTimelineEnabled: normalizeDefaultHiddenToggle(sadeNewsTimelineEnabledRaw),
      sadeNewsNewsletterEnabled: normalizeDefaultVisibleToggle(sadeNewsNewsletterEnabledRaw),
      sadeNewsLatestGridEnabled: normalizeDefaultVisibleToggle(sadeNewsLatestGridEnabledRaw),
      sadeNewsPopularSidebarEnabled: normalizeDefaultVisibleToggle(sadeNewsPopularSidebarEnabledRaw),
      sadeNewsAtaturkBandEnabled: normalizeDefaultHiddenToggle(sadeNewsAtaturkBandEnabledRaw),
      sadeNewsHistoryNationalDaysBandEnabled: normalizeDefaultHiddenToggle(sadeNewsHistoryNationalDaysBandEnabledRaw),
      tickerFinance: (j as { tickerFinance?: unknown }).tickerFinance === false ? false : true,
      tickerWeather: (j as { tickerWeather?: unknown }).tickerWeather === false ? false : true,
    };
    let layoutResult: NewsSiteLayoutPrefs = parsed;
    if (retiredTheme) {
      layoutResult = { ...layoutResult, ...hmNewsThemePresetPatch(hmVitrinTheme) };
    }
    layoutResult = {
      ...layoutResult,
      hmNewsHomeModuleOrder: resolveHmHomeModuleOrder(layoutResult.hmNewsHomeModuleOrder, HM_NEWS_HOME_MODULE_ORDER).filter(
        (id) => !isHmNewsRetiredHomeModule(id),
      ),
      hmCorporateHomeModuleOrder: resolveHmHomeModuleOrder(
        layoutResult.hmCorporateHomeModuleOrder,
        HM_CORPORATE_HOME_MODULE_ORDER,
      ).filter((id) => !isHmNewsRetiredHomeModule(id)),
    };
    return siteSlug?.trim().toLowerCase() === "vkd" ? applyVkdDonationToLayoutPrefs(layoutResult) : layoutResult;
  } catch {
    const base = { ...defaultNewsSiteLayoutPrefs };
    return siteSlug?.trim().toLowerCase() === "vkd" ? applyVkdDonationToLayoutPrefs(base) : base;
  }
}

export type NewsSiteLayoutSaveOptions = {
  /** Tüm özel sayfalar bilinçli siliniyorsa true gönderin. */
  allowClearExtraPages?: boolean;
  /** Sabit sayfa HTML alanları bilinçle temizleniyorsa true gönderin. */
  allowClearCorporatePageHtml?: boolean;
  /** Vitrin ayarları: özel sayfa HTML'ini istek gövdesine ekleme (sunucuda korunur). */
  vitrinOnly?: boolean;
  /** Yalnızca değişen alanları sunucuya gönder (çapraz sekme stale state ezmesini önler). */
  layoutPatch?: Partial<NewsSiteLayoutPrefs>;
};

const HM_LAYOUT_HEAVY_SAVE_KEYS = ["hmExtraPages", "hmCorporatePageHtml"] as const;
const HM_LAYOUT_MENU_SAVE_KEYS = [
  "hmCorporateMenuItems",
  "hmCorporateMenuPrimaryOnly",
  "hmNewsFooterMenuItems",
  "hmNewsSidebarMenuItems",
  "hmNewsStripMenuItems",
] as const;

/** Vitrin PATCH — sayfa HTML + menü alanları sunucudaki kayıttan kalır. */
export function pickVitrinLayoutPatchForSave(prefs: NewsSiteLayoutPrefs): Record<string, unknown> {
  const raw = { ...prefs } as Record<string, unknown>;
  for (const k of HM_LAYOUT_HEAVY_SAVE_KEYS) delete raw[k];
  for (const k of HM_LAYOUT_MENU_SAVE_KEYS) delete raw[k];
  delete raw.vkdEditorTouchedAt;
  delete raw.vkdPageSyncVersion;
  delete raw.vkdMenuSyncVersion;
  return raw;
}

/** Editör kaydında eski sekme / stale state yüzünden sayfa listesinin silinmesini önler. */
export function mergeNewsSiteLayoutForSave(
  base: NewsSiteLayoutPrefs,
  patch: NewsSiteLayoutPrefs,
  opts?: NewsSiteLayoutSaveOptions,
): NewsSiteLayoutPrefs {
  const merged: NewsSiteLayoutPrefs = { ...base, ...patch };

  if (
    base.hmExtraPages?.length &&
    Array.isArray(patch.hmExtraPages) &&
    patch.hmExtraPages.length === 0 &&
    opts?.allowClearExtraPages !== true
  ) {
    merged.hmExtraPages = base.hmExtraPages;
  }

  if (patch.hmCorporatePageHtml === null && base.hmCorporatePageHtml && opts?.allowClearCorporatePageHtml !== true) {
    merged.hmCorporatePageHtml = base.hmCorporatePageHtml;
  } else if (patch.hmCorporatePageHtml && typeof patch.hmCorporatePageHtml === "object") {
    const next = { ...(opts?.allowClearCorporatePageHtml ? {} : (base.hmCorporatePageHtml ?? {})), ...patch.hmCorporatePageHtml };
    for (const k of ["kunye", "iletisim", "reklam", "abonelik"] as const) {
      const v = next[k];
      if (typeof v === "string" && !v.trim()) delete next[k];
    }
    merged.hmCorporatePageHtml = Object.keys(next).length > 0 ? next : undefined;
  } else if (patch.hmCorporatePageHtml === null && opts?.allowClearCorporatePageHtml === true) {
    merged.hmCorporatePageHtml = undefined;
  }

  return merged;
}
