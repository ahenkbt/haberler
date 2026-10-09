/**
 * Yenişafak editör sözleşmesi.
 * Anahtarlar `php-theme/src/Modules.php` ile aynı: ys anahtarı varsa o kazanır,
 * yoksa eski vitrin anahtarı, o da yoksa modül açık kalır.
 */
import { normalizeHmThemeGradient, type HmThemeGradient } from "./hmThemeGradients";
import type { HmAdSlotState, HmCorporatePageHtml, HmYsKunye, NewsSiteLayoutPrefs } from "./newsSiteLayout";

export const YS_MANSET_PRESETS = [
  {
    id: "odatv",
    label: "Odatv",
    description: "Geniş manşet, numaralı sayfa ve yan haber.",
  },
  {
    id: "sabah",
    label: "Sabah",
    description: "Üst şerit manşet ve altındaki kart dizisi.",
  },
  {
    id: "takvim",
    label: "Takvim",
    description: "Koyu manşet bandı ve sık kategori blokları.",
  },
  {
    id: "mynet",
    label: "Mynet",
    description: "Dört sütunlu portal manşeti.",
  },
  {
    id: "nefes",
    label: "Nefes",
    description: "Açık zemin, kare manşet ve noktalı sayfalama.",
  },
] as const;

export type YsMansetPresetId = (typeof YS_MANSET_PRESETS)[number]["id"];

export type YsModuleId =
  | "ysTicker"
  | "ysManset"
  | "ysSide"
  | "ysCategories"
  | "ysVideo"
  | "ysAuthors"
  | "ysMostRead"
  | "ysGallery"
  | "ysOzelHaber";

export type YsModuleDef = {
  id: YsModuleId;
  label: string;
  /** PHP `Modules::DEFS` toggles[0] — varsa bu kazanır. */
  toggleKey: keyof NewsSiteLayoutPrefs;
  /** Eski panel anahtarı. PHP aynı boolean’ı ikinci sırada okur. */
  legacyToggleKey: keyof NewsSiteLayoutPrefs;
  /** `hmNewsHomeModuleOrder` içinde eşleşen takma adlar, PHP sırasıyla. */
  aliases: readonly string[];
  defaultCategory: string;
  defaultCount: number;
  /** Anahtar hiç yoksa modül açık mı? PHP ile aynı (Özel haber: false). */
  defaultEnabled?: boolean;
};

export const YS_MODULES: readonly YsModuleDef[] = [
  {
    id: "ysTicker",
    label: "Son dakika",
    toggleKey: "hmNewsYsTickerEnabled",
    legacyToggleKey: "hmNewsBreakingBandEnabled",
    aliases: ["ysTicker", "breakingBand"],
    defaultCategory: "gundem",
    defaultCount: 12,
  },
  {
    id: "ysManset",
    label: "Manşet",
    toggleKey: "hmNewsYsMansetEnabled",
    legacyToggleKey: "hmNewsSliderEnabled",
    aliases: ["ysManset", "hero", "tepeManset"],
    defaultCategory: "gundem",
    defaultCount: 8,
  },
  {
    id: "ysSide",
    label: "Yan manşetler",
    toggleKey: "hmNewsYsSideHeadlinesEnabled",
    legacyToggleKey: "hmNewsLeadListSidebarEnabled",
    aliases: ["ysSide", "ysSideHeadlines", "leadListSidebar"],
    defaultCategory: "gundem",
    defaultCount: 4,
  },
  {
    id: "ysCategories",
    label: "Kategori blokları",
    toggleKey: "hmNewsYsCategoryBlocksEnabled",
    legacyToggleKey: "hmNewsCategorySectionsEnabled",
    aliases: ["ysCategories", "ysCategoryBlocks", "yekpareKategorilerKutusu", "featuredCategoryStrip"],
    defaultCategory: "",
    defaultCount: 4,
  },
  {
    id: "ysVideo",
    label: "Video bandı",
    toggleKey: "hmNewsYsVideoBandEnabled",
    legacyToggleKey: "hmNewsRecentVideosSidebarEnabled",
    aliases: ["ysVideo", "ysVideoBand", "recentVideosSidebar"],
    defaultCategory: "",
    defaultCount: 8,
  },
  {
    id: "ysAuthors",
    label: "Yazarlar",
    toggleKey: "hmNewsYsAuthorsEnabled",
    legacyToggleKey: "hmNewsAuthorsEnabled",
    aliases: ["ysAuthors", "authorsStrip", "ahenkGununSesiAuthors"],
    defaultCategory: "",
    defaultCount: 8,
  },
  {
    id: "ysMostRead",
    label: "Çok okunanlar",
    toggleKey: "hmNewsYsMostReadEnabled",
    legacyToggleKey: "hmNewsAhenkPopulerHaberlerEnabled",
    aliases: ["ysMostRead", "ahenkPopulerHaberler"],
    defaultCategory: "gundem",
    defaultCount: 8,
  },
  {
    id: "ysGallery",
    label: "Galeri",
    toggleKey: "hmNewsYsGalleryEnabled",
    legacyToggleKey: "hmNewsMediaDarkBlockEnabled",
    aliases: ["ysGallery", "mediaDarkBlock", "culturePortal"],
    defaultCategory: "kultur-sanat",
    defaultCount: 6,
  },
  {
    // Editörün elle eklediği haberler (Röportaj / Özel Haber formu dahil). Varsayılan kapalı.
    id: "ysOzelHaber",
    label: "Özel haber",
    toggleKey: "hmNewsYsOzelHaberEnabled",
    legacyToggleKey: "hmNewsYsOzelHaberEnabled",
    aliases: ["ysOzelHaber", "ozelHaber"],
    defaultCategory: "",
    defaultCount: 8,
    defaultEnabled: false,
  },
] as const;

/**
 * PHP temanın (`php-theme/src/App.php`, `Site.php`, `Modules.php`, `templates/*.php`)
 * `hm_news_sites.layout_json` içinden okuduğu anahtarların tamamı. Panelde haber sitesi
 * görünümü için yalnızca bu anahtarlar anlamlıdır; eski TSX tema anahtarları
 * (`mansetVariant`, `hmChromeColorMode`, `hmNews*ThemeBlockEnabled` vb.) PHP tarafından okunmaz.
 */
export const PHP_THEME_LAYOUT_KEYS = [
  // App.php → buildSite
  "hmPrimaryColor",
  "logoUrl",
  // Site.php
  "hmPublicSuspended",
  "hmYsMansetPreset",
  "hmNewsYsMansetLayout",
  "hmSecondaryColor",
  // Theme.php (site colors 2026-10-08)
  "hmThemeGradient",
  "hmNavBarBackground",
  "hmCategoryColors",
  "hmYsSlogan",
  "hmYsKunye",
  "hmAdSlots",
  "faviconUrl",
  "hmYsShareEnabled",
  "hmFooterAboutHtml",
  "hmCorporatePageHtml",
  "hmFooterSocial",
  "hmCorporateMenuItems",
  "hmNewsStripMenuEnabled",
  "hmNewsStripMenuItems",
  "hmNewsFooterMenuItems",
  "hmNewsSidebarMenuItems",
  // Modules.php → enabled
  "hmNewsHomeModuleOrder",
  "hmNewsHomeModuleCategorySlugs",
  "hmNewsHomeModuleItemCounts",
  "hmNewsYsTickerEnabled",
  "hmNewsBreakingBandEnabled",
  "hmNewsYsMansetEnabled",
  "hmNewsSliderEnabled",
  "hmNewsTepeMansetEnabled",
  "hmNewsYsSideHeadlinesEnabled",
  "hmNewsLeadListSidebarEnabled",
  "hmNewsYsCategoryBlocksEnabled",
  "hmNewsCategorySectionsEnabled",
  "hmNewsYekpareKategorilerKutusuEnabled",
  "hmNewsYsVideoBandEnabled",
  "hmNewsRecentVideosSidebarEnabled",
  "hmNewsYsAuthorsEnabled",
  "hmNewsAuthorsEnabled",
  "hmNewsYsMostReadEnabled",
  "hmNewsAhenkPopulerHaberlerEnabled",
  "hmNewsYsGalleryEnabled",
  "hmNewsYsOzelHaberEnabled",
  "hmNewsMediaDarkBlockEnabled",
  // Modules.php → navCategories
  "hmNavHiddenCategorySlugs",
  "hmNavOnlyCategorySlugs",
  "hmCategorySortSlugs",
] as const satisfies ReadonlyArray<keyof NewsSiteLayoutPrefs>;

export type PhpThemeLayoutKey = (typeof PHP_THEME_LAYOUT_KEYS)[number];

/**
 * PHP tarafından okunup paneldeki tip sözleşmesinde yer almayan eski anahtar.
 * Hiçbir panel sayfası yazmaz; kategoriler veritabanı satırlarından gelir.
 */
export const PHP_THEME_LEGACY_ONLY_LAYOUT_KEYS = ["hmNewsExtraCategories"] as const;

/** PHP okumaz; SPA `/tr/{slug}` yedek görünümünün haber sitesini tek temaya sabitlemesi için yazılır. */
export const YS_SPA_MARKER_LAYOUT_KEYS = ["hmVitrinTheme"] as const satisfies ReadonlyArray<keyof NewsSiteLayoutPrefs>;

export const YS_AD_SLOTS = [
  { slotKey: "header", name: "Üst reklam", description: "Logo yanı. PHP `data-ad-slot=header`." },
  { slotKey: "block_strip", name: "Blok şeridi", description: "Kategori blokları arası. PHP `data-ad-slot=block_strip`." },
  { slotKey: "home_block_fill", name: "Anasayfa dolgu", description: "Boş blok reklamı. PHP `data-ad-slot=home_block_fill`." },
] as const;

export type YsAdSlotKey = (typeof YS_AD_SLOTS)[number]["slotKey"];

export type YsModuleEditorRow = {
  id: YsModuleId;
  enabled: boolean;
  category: string;
  count: number;
};

const PRESET_IDS = new Set<string>(YS_MANSET_PRESETS.map((item) => item.id));

function layoutFlag(value: unknown): boolean | null {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
}

/** PHP `Modules::isOn`: listedeki ilk mevcut anahtar kazanır, hiçbiri yoksa açık. */
export function phpModuleIsOn(layout: Record<string, unknown>, keys: readonly string[], defaultOn = true): boolean {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(layout, key)) {
      return layoutFlag(layout[key]) === true;
    }
  }
  return defaultOn;
}

export function normalizeYsMansetPreset(value: unknown): YsMansetPresetId | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return PRESET_IDS.has(raw) ? (raw as YsMansetPresetId) : null;
}

export function readYsMansetPreset(prefs: NewsSiteLayoutPrefs | null | undefined): YsMansetPresetId | null {
  return normalizeYsMansetPreset(prefs?.hmYsMansetPreset) ?? normalizeYsMansetPreset(prefs?.hmNewsYsMansetLayout);
}

/** `hmNavOnlyCategorySlugs` dizi ise beyaz liste aktiftir. Alan yoksa null. */
export function readYsNavOnlySlugs(prefs: NewsSiteLayoutPrefs | null | undefined): string[] | null {
  const raw = prefs?.hmNavOnlyCategorySlugs;
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const slug = String(item ?? "").trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/** Gizli slug her zaman kapalıdır. Beyaz liste varsa slug listede olmalıdır. */
export function ysCategoryNavVisible(slug: string, hidden: ReadonlySet<string>, navOnly: readonly string[] | null): boolean {
  if (!slug || hidden.has(slug)) return false;
  if (navOnly) return navOnly.includes(slug);
  return true;
}

export function nextYsCategoryVisibilityPatch(
  hidden: readonly string[],
  navOnly: readonly string[] | null,
  slug: string,
  visible: boolean,
): { hmNavHiddenCategorySlugs: string[] | null; hmNavOnlyCategorySlugs?: string[] } {
  const nextHidden = new Set(hidden);
  if (visible) nextHidden.delete(slug);
  else nextHidden.add(slug);
  const hiddenList = [...nextHidden].sort();
  const patch: { hmNavHiddenCategorySlugs: string[] | null; hmNavOnlyCategorySlugs?: string[] } = {
    hmNavHiddenCategorySlugs: hiddenList.length > 0 ? hiddenList : null,
  };
  if (navOnly) {
    const nextOnly = navOnly.filter((item) => item !== slug);
    if (visible) nextOnly.push(slug);
    patch.hmNavOnlyCategorySlugs = nextOnly;
  }
  return patch;
}

function readMappedString(
  map: Record<string, unknown> | null | undefined,
  aliases: readonly string[],
): string {
  if (!map) return "";
  for (const alias of aliases) {
    const value = map[alias];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readMappedCount(map: Record<string, unknown> | null | undefined, aliases: readonly string[]): number | null {
  if (!map) return null;
  for (const alias of aliases) {
    const value = map[alias];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function clampYsCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(24, Math.round(value)));
}

export function readYsModuleRows(prefs: NewsSiteLayoutPrefs | null | undefined): YsModuleEditorRow[] {
  const layout = (prefs ?? {}) as Record<string, unknown>;
  const order = Array.isArray(prefs?.hmNewsHomeModuleOrder) ? prefs!.hmNewsHomeModuleOrder! : [];
  const slugs = (prefs?.hmNewsHomeModuleCategorySlugs ?? null) as Record<string, unknown> | null;
  const counts = (prefs?.hmNewsHomeModuleItemCounts ?? null) as Record<string, unknown> | null;
  const ranked = YS_MODULES.map((def) => {
    let rank = 1000 + YS_MODULES.indexOf(def);
    order.forEach((key, index) => {
      if (def.aliases.includes(String(key)) && rank >= 1000) rank = index;
    });
    const category = readMappedString(slugs, def.aliases) || def.defaultCategory;
    const count = clampYsCount(readMappedCount(counts, def.aliases) ?? def.defaultCount);
    return {
      id: def.id,
      enabled: phpModuleIsOn(layout, [def.toggleKey, def.legacyToggleKey], def.defaultEnabled ?? true),
      category,
      count,
      rank,
    };
  });
  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.map(({ rank: _rank, ...row }) => row);
}

export function normalizeYsKunye(value: unknown): HmYsKunye | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const src = value as Record<string, unknown>;
  const keys = [
    "lead",
    "yayin",
    "genelMudur",
    "yayinYonetmeni",
    "yaziIsleri",
    "address",
    "phone",
    "email",
    "tuzel",
    "yayinIlkeleri",
  ] as const;
  const out: HmYsKunye = {};
  for (const key of keys) {
    const text = typeof src[key] === "string" ? src[key].trim() : "";
    if (text) out[key] = text.slice(0, 2000);
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function readYsKunye(prefs: NewsSiteLayoutPrefs | null | undefined): HmYsKunye {
  return normalizeYsKunye(prefs?.hmYsKunye) ?? {};
}

export function readYsAdSlot(prefs: NewsSiteLayoutPrefs | null | undefined, slotKey: YsAdSlotKey): HmAdSlotState {
  const found = (prefs?.hmAdSlots ?? []).find((slot) => slot.slotKey === slotKey);
  return {
    slotKey,
    enabled: found?.enabled === true,
    html: found?.html ?? "",
    contentMode: found?.contentMode === "html" ? "html" : "image",
    imageMediaUrl: found?.imageMediaUrl ?? "",
    imageClickUrl: found?.imageClickUrl ?? "",
  };
}

export type YsEditorSnapshot = {
  preset: YsMansetPresetId | null;
  primaryColor: string;
  secondaryColor: string;
  /** Menü çubuğu geçişi (`hmThemeGradient`); null = tema/site varsayılanı. */
  gradient: HmThemeGradient | null;
  slogan: string;
  logoUrl: string;
  kunye: HmYsKunye;
  modules: YsModuleEditorRow[];
  ads: Record<YsAdSlotKey, HmAdSlotState>;
};

function stableYsEditorSnapshot(snapshot: YsEditorSnapshot): string {
  const modules = snapshot.modules.map((row) => ({
    id: row.id,
    enabled: row.enabled,
    category: row.category.trim().toLowerCase(),
    count: clampYsCount(row.count),
  }));
  const ads = YS_AD_SLOTS.map((slot) => {
    const row = snapshot.ads[slot.slotKey];
    return {
      slotKey: slot.slotKey,
      enabled: row?.enabled === true,
      imageMediaUrl: (row?.imageMediaUrl ?? "").trim(),
      imageClickUrl: (row?.imageClickUrl ?? "").trim(),
      contentMode: row?.contentMode === "html" ? "html" : "image",
    };
  });
  return JSON.stringify({
    preset: snapshot.preset,
    primaryColor: snapshot.primaryColor.trim().toLowerCase(),
    secondaryColor: snapshot.secondaryColor.trim().toLowerCase(),
    gradient: normalizeHmThemeGradient(snapshot.gradient),
    slogan: snapshot.slogan.trim(),
    logoUrl: snapshot.logoUrl.trim(),
    kunye: normalizeYsKunye(snapshot.kunye) ?? {},
    modules,
    ads,
  });
}

export function ysEditorSnapshotsEqual(a: YsEditorSnapshot, b: YsEditorSnapshot): boolean {
  return stableYsEditorSnapshot(a) === stableYsEditorSnapshot(b);
}

export function readYsEditorSnapshot(prefs: NewsSiteLayoutPrefs | null | undefined): YsEditorSnapshot {
  const ads = {} as Record<YsAdSlotKey, HmAdSlotState>;
  for (const slot of YS_AD_SLOTS) ads[slot.slotKey] = readYsAdSlot(prefs, slot.slotKey);
  return {
    preset: readYsMansetPreset(prefs),
    primaryColor: (prefs?.hmPrimaryColor ?? "").trim(),
    secondaryColor: (prefs?.hmSecondaryColor ?? "").trim(),
    gradient: normalizeHmThemeGradient(prefs?.hmThemeGradient),
    slogan: (prefs?.hmYsSlogan ?? "").trim(),
    logoUrl: (prefs?.logoUrl ?? "").trim(),
    kunye: readYsKunye(prefs),
    modules: readYsModuleRows(prefs),
    ads,
  };
}

function hexOrNull(value: string): string | null {
  const text = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : text === "" ? null : null;
}

/**
 * Editör kaydı. PHP temanın okuduğu ys anahtarlarını ve eski takma adları birlikte yazar.
 * `hmVitrinTheme` haber sitesinde `yenisafak` olur; kurumsal tema bu yama ile değişmez.
 */
export function buildYenisafakLayoutPatch(
  prefs: NewsSiteLayoutPrefs,
  snapshot: YsEditorSnapshot,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    hmVitrinTheme: "yenisafak",
    hmYsMansetPreset: snapshot.preset,
    hmNewsYsMansetLayout: snapshot.preset,
    hmYsSlogan: snapshot.slogan.trim() || null,
    hmYsKunye: normalizeYsKunye(snapshot.kunye),
    hmPrimaryColor: hexOrNull(snapshot.primaryColor),
    hmSecondaryColor: hexOrNull(snapshot.secondaryColor),
    hmThemeGradient: normalizeHmThemeGradient(snapshot.gradient),
    logoUrl: snapshot.logoUrl.trim() || null,
  };
  // Geçiş seçildiyse eski düz "menü şeridi" rengi geçişi ezmesin (Genel Ayarlar'daki şerit rengi).
  if (patch.hmThemeGradient) patch.hmNavBarBackground = null;

  const order = snapshot.modules.map((row) => row.id);
  const slugs: Record<string, string> = { ...(prefs.hmNewsHomeModuleCategorySlugs ?? {}) };
  const counts: Record<string, number> = { ...(prefs.hmNewsHomeModuleItemCounts ?? {}) };

  for (const row of snapshot.modules) {
    const def = YS_MODULES.find((item) => item.id === row.id);
    if (!def) continue;
    patch[def.toggleKey] = row.enabled;
    patch[def.legacyToggleKey] = row.enabled;
    const category = row.category.trim().toLowerCase();
    const count = clampYsCount(row.count);
    for (const alias of def.aliases) {
      if (category) slugs[alias] = category;
      else delete slugs[alias];
      counts[alias] = count;
    }
  }

  patch.hmNewsHomeModuleOrder = order;
  patch.hmNewsHomeModuleCategorySlugs = slugs;
  patch.hmNewsHomeModuleItemCounts = counts;

  const previousAds = Array.isArray(prefs.hmAdSlots) ? prefs.hmAdSlots : [];
  const ysKeys = new Set<string>(YS_AD_SLOTS.map((slot) => slot.slotKey));
  const kept = previousAds.filter((slot) => !ysKeys.has(slot.slotKey));
  const nextAds: HmAdSlotState[] = YS_AD_SLOTS.map((slot) => {
    const row = snapshot.ads[slot.slotKey];
    return {
      slotKey: slot.slotKey,
      enabled: row?.enabled === true,
      html: (row?.html ?? "").trim() || null,
      contentMode: row?.contentMode === "html" ? "html" : "image",
      imageMediaUrl: (row?.imageMediaUrl ?? "").trim() || null,
      imageClickUrl: (row?.imageClickUrl ?? "").trim() || null,
    };
  });
  patch.hmAdSlots = [...kept, ...nextAds];
  return patch;
}

function stableLayoutValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableLayoutValue).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableLayoutValue(obj[k])}`)
    .join(",")}}`;
}

/**
 * 2026-10-08: Vitrin kaydı yalnızca editörün gerçekten değiştirdiği alanları gönderir.
 * Açılıştaki snapshot ile yeni snapshot'ın yamaları karşılaştırılır; aynı kalan anahtarlar
 * (modül anahtarları, sıra, reklam alanları …) hiç yazılmaz. `hmVitrinTheme` asla gönderilmez.
 */
export function buildYenisafakLayoutDiffPatch(
  prefs: NewsSiteLayoutPrefs,
  before: YsEditorSnapshot,
  after: YsEditorSnapshot,
): Record<string, unknown> {
  const a = buildYenisafakLayoutPatch(prefs, before);
  const b = buildYenisafakLayoutPatch(prefs, after);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(b)) {
    if (key === "hmVitrinTheme") continue;
    if (stableLayoutValue(a[key]) !== stableLayoutValue(b[key])) out[key] = b[key];
  }
  return out;
}

/** PHP `Modules::enabled` sırası ve açık/kapalı sonucu. Test, tema dosyasındaki kuralla aynıdır. */
export function phpEnabledModules(layout: Record<string, unknown>): Array<{ id: string; category: string; count: number }> {
  const order = Array.isArray(layout.hmNewsHomeModuleOrder) ? layout.hmNewsHomeModuleOrder.map(String) : [];
  const slugs = layout.hmNewsHomeModuleCategorySlugs;
  const counts = layout.hmNewsHomeModuleItemCounts;
  const slugMap = slugs && typeof slugs === "object" && !Array.isArray(slugs) ? (slugs as Record<string, unknown>) : {};
  const countMap = counts && typeof counts === "object" && !Array.isArray(counts) ? (counts as Record<string, unknown>) : {};
  const rows = YS_MODULES.map((def, index) => {
    if (!phpModuleIsOn(layout, [String(def.toggleKey), String(def.legacyToggleKey)], def.defaultEnabled ?? true)) return null;
    let rank = 1000 + (index + 1) * 10;
    order.forEach((key, orderIndex) => {
      if (def.aliases.includes(key)) rank = Math.min(rank, orderIndex);
    });
    let category = def.defaultCategory;
    for (const alias of def.aliases) {
      if (typeof slugMap[alias] === "string" && String(slugMap[alias]).trim()) {
        category = String(slugMap[alias]);
        break;
      }
    }
    let count = def.defaultCount;
    for (const alias of def.aliases) {
      if (typeof countMap[alias] === "number" || (typeof countMap[alias] === "string" && countMap[alias] !== "")) {
        count = Number(countMap[alias]);
        break;
      }
    }
    return { id: def.id, category, count: clampYsCount(count), rank };
  }).filter((row): row is { id: YsModuleId; category: string; count: number; rank: number } => row != null);
  rows.sort((a, b) => a.rank - b.rank);
  return rows.map(({ rank: _rank, ...row }) => row);
}

/** PHP `page.php` rotaları. Telif şablonu bu listede yoktur. */
export const YS_SITE_PAGES = [
  { slug: "hakkimizda", title: "Hakkımızda", path: "/hakkimizda" },
  { slug: "kunye", title: "Künye", path: "/kunye" },
  { slug: "iletisim", title: "İletişim", path: "/iletisim" },
] as const;

export const YS_KUNYE_FIELDS: Array<{ key: keyof HmYsKunye; label: string; multiline?: boolean }> = [
  { key: "lead", label: "Üst not", multiline: true },
  { key: "yayin", label: "Yayın" },
  { key: "genelMudur", label: "Genel müdür" },
  { key: "yayinYonetmeni", label: "Genel yayın yönetmeni" },
  { key: "yaziIsleri", label: "Yazı işleri müdürü" },
  { key: "address", label: "Adres" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-posta" },
  { key: "tuzel", label: "Tüzel kişilik" },
  { key: "yayinIlkeleri", label: "Yayın ilkeleri", multiline: true },
];

export function buildYsAboutPagePatch(html: string): { hmFooterAboutHtml: string | null } {
  return { hmFooterAboutHtml: html.trim() || null };
}

export function buildYsKunyePagePatch(kunye: HmYsKunye): { hmYsKunye: HmYsKunye | null } {
  return { hmYsKunye: normalizeYsKunye(kunye) };
}

/** Bir sayfa HTML anahtarını günceller; diğer künye/iletişim/reklam/abonelik metinlerini korur. */
export function buildYsCorporatePageHtmlPatch(
  current: HmCorporatePageHtml | null | undefined,
  key: "kunye" | "iletisim",
  html: string,
): { hmCorporatePageHtml: HmCorporatePageHtml | null } {
  const next: HmCorporatePageHtml = { ...(current ?? {}) };
  const text = html.trim();
  if (text) next[key] = text;
  else delete next[key];
  return { hmCorporatePageHtml: Object.keys(next).length > 0 ? next : null };
}
