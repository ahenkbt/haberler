/**
 * Cumha.com.tr kamu + yerel RSS katalogu — turkatahaber.com & yerel.net.tr paylaşır.
 */
import { TURKEY_CITIES } from "./seed-popular-locations.js";

type TurkeyCitySeed = {
  name: string;
  nameTr?: string;
  lat: number;
  lng: number;
  region?: string;
};

/** Seed array is inferred with required `nameTr`; optional typing keeps display-name fallback valid. */
const TURKEY_CITY_SEED = TURKEY_CITIES as unknown as readonly TurkeyCitySeed[];

export type KamuYerelCategoryDef = { slug: string; name: string; color: string };

export type KamuYerelRegionId =
  | "marmara"
  | "ege"
  | "akdeniz"
  | "ic-anadolu"
  | "karadeniz"
  | "dogu-anadolu"
  | "guneydogu-anadolu";

export const KAMU_YEREL_REGION_ORDER: readonly KamuYerelRegionId[] = [
  "marmara",
  "ege",
  "akdeniz",
  "ic-anadolu",
  "karadeniz",
  "dogu-anadolu",
  "guneydogu-anadolu",
] as const;

export const KAMU_YEREL_REGION_LABELS: Record<KamuYerelRegionId, string> = {
  marmara: "Marmara",
  ege: "Ege",
  akdeniz: "Akdeniz",
  "ic-anadolu": "İç Anadolu",
  karadeniz: "Karadeniz",
  "dogu-anadolu": "Doğu Anadolu",
  "guneydogu-anadolu": "Güneydoğu Anadolu",
};

const REGION_SEED_TO_ID: Record<string, KamuYerelRegionId> = {
  Marmara: "marmara",
  Ege: "ege",
  Akdeniz: "akdeniz",
  "İç Anadolu": "ic-anadolu",
  Karadeniz: "karadeniz",
  "Doğu Anadolu": "dogu-anadolu",
  "Güneydoğu Anadolu": "guneydogu-anadolu",
};

/** Cumha kategori RSS — https://cumha.com.tr/rss/category/{slug} */
export const CUMHA_KAMU_CATEGORY_FEEDS = [
  {
    slug: "cumhurbaskanligi",
    cumhaSlug: "cumhurbaskanligi",
    name: "Cumhurbaşkanlığı",
    color: "#8b0000",
  },
  {
    slug: "bakanliklar",
    cumhaSlug: "bakanliklar",
    name: "Bakanlıklar",
    color: "#7c1d1d",
  },
  {
    slug: "tbmm",
    cumhaSlug: "tbmm",
    name: "TBMM",
    color: "#5c1a1a",
  },
  {
    slug: "kamu-kurumlari",
    cumhaSlug: "kamu-kurumlari-ve-ust-kurullar",
    name: "Kamu Kurumları",
    color: "#0b3362",
  },
  {
    slug: "siyasi-partiler",
    cumhaSlug: "siyasi-partiler",
    name: "Siyasi Partiler",
    color: "#1a4a7a",
  },
  {
    slug: "genel-merkez",
    cumhaSlug: "genel-merkez",
    name: "Genel Merkez",
    color: "#245a8a",
  },
  {
    slug: "il-ilce-baskanliklari",
    cumhaSlug: "il-ilce-baskanliklari",
    name: "İl / İlçe Başkanlıkları",
    color: "#2e6a9a",
  },
  {
    slug: "yerel-yonetimler",
    cumhaSlug: "yerel-yonetimler",
    name: "Yerel Yönetimler",
    color: "#0a6b7a",
  },
  {
    slug: "buyuksehir-ve-iller",
    cumhaSlug: "buyuksehir-ve-iller",
    name: "Büyükşehir ve İller",
    color: "#0d6b5c",
  },
  {
    slug: "ilceler",
    cumhaSlug: "ilceler",
    name: "İlçeler",
    color: "#117a62",
  },
  {
    slug: "mulki-idare",
    cumhaSlug: "mulki-idare",
    name: "Mülki İdare",
    color: "#374151",
  },
  {
    slug: "valilikler",
    cumhaSlug: "valilikler",
    name: "Valilikler",
    color: "#4b5563",
  },
  {
    slug: "kaymakamliklar",
    cumhaSlug: "kaymakamliklar",
    name: "Kaymakamlıklar",
    color: "#525252",
  },
  {
    slug: "toplum-ve-yasam",
    cumhaSlug: "toplum-ve-yasam",
    name: "Toplum ve Yaşam",
    color: "#6b4c2a",
  },
  {
    slug: "sivil-toplum-kuruluslari",
    cumhaSlug: "sivil-toplum-kuruluslari",
    name: "Sivil Toplum Kuruluşları",
    color: "#1a5a3a",
  },
] as const;

/** Cumha «Daha» menüsü — uluslararası kuruluş / dış politika RSS. */
export const CUMHA_DAHA_CATEGORY_FEEDS = [
  { slug: "nato", cumhaSlug: "nato", name: "NATO", color: "#1e3a5f" },
  {
    slug: "uluslararasi-kuruluslar",
    cumhaSlug: "uluslararasi-kuruluslar",
    name: "Uluslararası Kuruluşlar",
    color: "#234e70",
  },
  {
    slug: "birlesmis-milletler",
    cumhaSlug: "birlesmis-milletler",
    name: "Birleşmiş Milletler",
    color: "#2a5580",
  },
  {
    slug: "avrupa-birligi",
    cumhaSlug: "avrupa-birligi",
    name: "Avrupa Birliği",
    color: "#315f90",
  },
] as const;

const CUMHA_KAMU_PARENT_SLUG: Partial<Record<string, string>> = {
  "genel-merkez": "siyasi-partiler",
  "il-ilce-baskanliklari": "siyasi-partiler",
  "buyuksehir-ve-iller": "yerel-yonetimler",
  ilceler: "yerel-yonetimler",
  /** Haberler.com Muhtar — yerel yönetim / mahalle muhtarlığı. */
  muhtar: "yerel-yonetimler",
  valilikler: "mulki-idare",
  kaymakamliklar: "mulki-idare",
  nato: "daha",
  "uluslararasi-kuruluslar": "daha",
  "birlesmis-milletler": "daha",
  "avrupa-birligi": "daha",
};

const KAMU_YEREL_HM_SITE_SLUGS = new Set(["turkatahaber", "yerelnet"]);

export function isKamuYerelHmSiteSlug(siteSlug?: string | null): boolean {
  return KAMU_YEREL_HM_SITE_SLUGS.has(
    String(siteSlug ?? "")
      .trim()
      .toLowerCase(),
  );
}

/**
 * Tepe menü üst slug'ları (ör. `daha`, `siyasi-partiler`) — alt RSS kategori slug'larını birleştirir.
 * Haberler yalnızca alt slug ile etiketlendiğinde üst menü sayfası boş kalmasın.
 */
export function expandKamuYerelListingCategorySlugs(
  categorySlug: string | null | undefined,
  siteSlug?: string | null,
): string[] {
  const slug = String(categorySlug ?? "")
    .trim()
    .toLowerCase();
  if (!slug) return [];
  if (!isKamuYerelHmSiteSlug(siteSlug)) return [slug];
  const children = Object.entries(CUMHA_KAMU_PARENT_SLUG)
    .filter(([, parent]) => parent === slug)
    .map(([child]) => child);
  if (!children.length) return [slug];
  return [slug, ...children];
}

/** Tepe menü — Cumha.com.tr kamu-yerel üst kategorileri (+ yerel manşet). */
export const KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS = [
  "yerel",
  "cumhurbaskanligi",
  "bakanliklar",
  "tbmm",
  "siyasi-partiler",
  "yerel-yonetimler",
  "mulki-idare",
  "toplum-ve-yasam",
  "daha",
  "sivil-toplum-kuruluslari",
  "kamu-kurumlari",
] as const;

export const KAMU_YEREL_SECONDARY_CATEGORIES: readonly KamuYerelCategoryDef[] = [
  { slug: "yerel", name: "Yerel", color: "#c00005" },
  { slug: "muhtar", name: "Muhtar", color: "#0a5c4a" },
  { slug: "saglik", name: "Sağlık", color: "#991b1b" },
  { slug: "teknoloji", name: "Teknoloji", color: "#4c1d95" },
  { slug: "yasam", name: "Yaşam", color: "#b45309" },
];

/** Haberler.com Muhtar kategori — RSS (kısa) + HTML liste sayfaları (toplu kazıma). */
export const HABERLER_MUHTAR_CATEGORY_SLUG = "muhtar";
export const HABERLER_MUHTAR_RSS_URL = "https://rss.haberler.com/rss.asp?kategori=muhtar";
export const HABERLER_MUHTAR_LISTING_BASE = "https://www.haberler.com/muhtar/";

/**
 * robots.txt eski sayısal sayfalama (/muhtar/4/) engeller; sN biçimi serbest.
 * Sayfa başına ~20–30 haber — 8 sayfa ≈ 100+ hedef (liste örtüşmesi için pay).
 */
export function listHaberlerMuhtarListingPages(pageCount = 8): string[] {
  const n = Math.max(1, Math.min(12, Math.trunc(pageCount) || 8));
  const pages = [HABERLER_MUHTAR_LISTING_BASE];
  for (let i = 2; i <= n; i++) {
    pages.push(`https://www.haberler.com/muhtar/s${i}/`);
  }
  return pages;
}

/** NTV + Haberler Muhtar — kamu-yerel kavramına uygun tamamlayıcı (isteğe bağlı seed). */
export const KAMU_YEREL_SUPPLEMENTAL_RSS = [
  { url: "https://www.ntv.com.tr/saglik.rss", categoryKey: "saglik", label: "Sağlık" },
  { url: "https://www.ntv.com.tr/teknoloji.rss", categoryKey: "teknoloji", label: "Teknoloji" },
  { url: "https://www.ntv.com.tr/yasam.rss", categoryKey: "yasam", label: "Yaşam" },
  {
    url: HABERLER_MUHTAR_RSS_URL,
    categoryKey: HABERLER_MUHTAR_CATEGORY_SLUG,
    label: "Muhtar",
  },
] as const;

export function cumhaCategoryRssUrl(cumhaSlug: string): string {
  return `https://cumha.com.tr/rss/category/${cumhaSlug}`;
}

export function cumhaLocationRssUrl(provinceSlug: string): string {
  return `https://cumha.com.tr/rss/lokasyon/${provinceSlug}`;
}

export function cumhaProvinceSlugFromName(name: string): string {
  return String(name ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const KAMU_YEREL_ILLER_PAGE_SLUG = "iller";

export function kamuYerelRegionCategorySlug(regionId: KamuYerelRegionId): string {
  return `bolge-${regionId}`;
}

export type KamuYerelProvinceDef = {
  slug: string;
  name: string;
  regionId: KamuYerelRegionId;
  lat: number;
  lng: number;
};

export function listKamuYerelProvinces(): KamuYerelProvinceDef[] {
  return TURKEY_CITY_SEED.map((city) => {
    const name = String(city.nameTr ?? city.name).trim();
    const regionRaw = String(city.region ?? "").trim();
    const regionId = REGION_SEED_TO_ID[regionRaw] ?? "ic-anadolu";
    return {
      slug: cumhaProvinceSlugFromName(name),
      name,
      regionId,
      lat: city.lat,
      lng: city.lng,
    };
  });
}

export function buildKamuYerelCategories(): KamuYerelCategoryDef[] {
  const kamu = [...CUMHA_KAMU_CATEGORY_FEEDS, ...CUMHA_DAHA_CATEGORY_FEEDS].map((c) => ({
    slug: c.slug,
    name: c.name,
    color: c.color,
  }));
  const dahaNav: KamuYerelCategoryDef = { slug: "daha", name: "Daha", color: "#1e3a5f" };
  const provincesByRegion: KamuYerelCategoryDef[] = [];
  for (const regionId of KAMU_YEREL_REGION_ORDER) {
    provincesByRegion.push({
      slug: kamuYerelRegionCategorySlug(regionId),
      name: KAMU_YEREL_REGION_LABELS[regionId],
      color: "#0b3362",
    });
    for (const p of listKamuYerelProvinces().filter((row) => row.regionId === regionId)) {
      provincesByRegion.push({
        slug: p.slug,
        name: p.name,
        color: "#0b3362",
      });
    }
  }
  return [...KAMU_YEREL_SECONDARY_CATEGORIES, dahaNav, ...kamu, ...provincesByRegion];
}

export function listKamuYerelNavTopCategorySlugs(): string[] {
  return [...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS];
}

export function listKamuYerelNavHiddenCategorySlugs(): string[] {
  const top = new Set(listKamuYerelNavTopCategorySlugs());
  return buildKamuYerelCategories()
    .map((c) => c.slug)
    .filter((slug) => !top.has(slug));
}

/**
 * PHP Yenişafak `hmNavOnlyCategorySlugs` is also the /kategori/:slug page allowlist.
 * Put every kamu-yerel category here; keep tepe menü compact via hmNavHiddenCategorySlugs.
 */
export function listKamuYerelCategoryPageAllowSlugs(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of [
    ...listKamuYerelNavTopCategorySlugs(),
    ...buildKamuYerelCategories().map((c) => c.slug),
  ]) {
    const key = String(slug || "")
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Tepe manşet / yerel havuz eşleşmesi — politika/gündem dışı kamu-yerel kategorileri. */
export function listKamuYerelMansetPoolCategorySlugs(): string[] {
  const slugs = new Set<string>(["yerel"]);
  for (const c of CUMHA_KAMU_CATEGORY_FEEDS) slugs.add(c.slug);
  for (const c of CUMHA_DAHA_CATEGORY_FEEDS) slugs.add(c.slug);
  slugs.add("daha");
  for (const c of KAMU_YEREL_SECONDARY_CATEGORIES) slugs.add(c.slug);
  for (const p of listKamuYerelProvinces()) slugs.add(p.slug);
  return [...slugs];
}

export type HmNewsSiteRssFeedRow = {
  id: string;
  label: string;
  url: string;
  categoryKey: string;
};

export function buildKamuYerelHmNewsSiteRssFeedRows(): HmNewsSiteRssFeedRow[] {
  const rows: HmNewsSiteRssFeedRow[] = [];
  for (const cat of [...CUMHA_KAMU_CATEGORY_FEEDS, ...CUMHA_DAHA_CATEGORY_FEEDS]) {
    rows.push({
      id: `cumha-cat-${cat.slug}`,
      label: cat.name,
      url: cumhaCategoryRssUrl(cat.cumhaSlug),
      categoryKey: cat.slug,
    });
  }
  for (const prov of listKamuYerelProvinces()) {
    rows.push({
      id: `cumha-il-${prov.slug}`,
      label: prov.name,
      url: cumhaLocationRssUrl(prov.slug),
      categoryKey: prov.slug,
    });
  }
  for (const sup of KAMU_YEREL_SUPPLEMENTAL_RSS) {
    rows.push({
      id: `sup-${sup.categoryKey}`,
      label: sup.label,
      url: sup.url,
      categoryKey: sup.categoryKey,
    });
  }
  return rows;
}

export function listKamuYerelCampaignFeedUrls(): string[] {
  return buildKamuYerelHmNewsSiteRssFeedRows().map((r) => r.url);
}

function normalizeCumhaFeedUrl(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

const CUMHA_FEED_URL_TO_CATEGORY = new Map<string, string>(
  buildKamuYerelHmNewsSiteRssFeedRows().map((r) => [normalizeCumhaFeedUrl(r.url), r.categoryKey]),
);

/** RSS kampanya çalıştırma — Cumha kategori/lokasyon feed → site kategori slug. */
export function categorySlugFromCumhaFeed(feedUrl: string): string | null {
  const key = normalizeCumhaFeedUrl(feedUrl);
  if (!key) return null;
  const direct = CUMHA_FEED_URL_TO_CATEGORY.get(key);
  if (direct) return direct;
  try {
    const u = new URL(key.startsWith("http") ? key : `https://${key}`);
    const pathKey = normalizeCumhaFeedUrl(`${u.hostname}${u.pathname}`);
    const fromPath = CUMHA_FEED_URL_TO_CATEGORY.get(pathKey);
    if (fromPath) return fromPath;
    const loc = u.pathname.match(/\/rss\/lokasyon\/([^/]+)/i);
    if (loc?.[1]) return loc[1].toLowerCase();
    const cat = u.pathname.match(/\/rss\/category\/([^/]+)/i);
    if (cat?.[1]) {
      const cumhaSlug = cat[1].toLowerCase();
      for (const row of buildKamuYerelHmNewsSiteRssFeedRows()) {
        if (row.url.includes(cumhaSlug)) return row.categoryKey;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export type KamuYerelCorporateMenuItem = {
  id: string;
  label: string;
  href: string;
  parentId?: string | null;
  enabled?: boolean;
};

export const KAMU_YEREL_DAHA_PAGE_SLUG = "daha";

/** Tepe menü — kamu/yerel kategoriler (81 il `/iller` + premium `/daha`; ana menüde il/bölge yok). */
export function buildKamuYerelCorporateMenuItems(): KamuYerelCorporateMenuItem[] {
  const items: KamuYerelCorporateMenuItem[] = [];
  items.push({
    id: "ky-cat-daha",
    label: "Daha",
    href: `/${KAMU_YEREL_DAHA_PAGE_SLUG}`,
    enabled: true,
  });
  for (const cat of [...CUMHA_KAMU_CATEGORY_FEEDS, ...CUMHA_DAHA_CATEGORY_FEEDS]) {
    const parentSlug = CUMHA_KAMU_PARENT_SLUG[cat.slug];
    items.push({
      id: `ky-cat-${cat.slug}`,
      label: cat.name,
      href: `/kategori/${cat.slug}`,
      parentId: parentSlug ? `ky-cat-${parentSlug}` : undefined,
      enabled: true,
    });
  }
  for (const cat of KAMU_YEREL_SECONDARY_CATEGORIES) {
    const parentSlug = CUMHA_KAMU_PARENT_SLUG[cat.slug];
    items.push({
      id: `ky-cat-${cat.slug}`,
      label: cat.name,
      href: `/kategori/${cat.slug}`,
      parentId: parentSlug ? `ky-cat-${parentSlug}` : undefined,
      enabled: true,
    });
  }
  return items;
}

export type KamuYerelIllerExtraPage = {
  id: string;
  title: string;
  slug: string;
  bodyHtml: string;
  enabled: boolean;
  fullWidth: boolean;
};

function buildKamuYerelRegionProvinceSections(pageClass: string): string[] {
  const sections: string[] = [];
  for (const regionId of KAMU_YEREL_REGION_ORDER) {
    const label = KAMU_YEREL_REGION_LABELS[regionId];
    const links = listKamuYerelProvinces()
      .filter((p) => p.regionId === regionId)
      .map(
        (p) =>
          `<li><a href="/kategori/${p.slug}" class="${pageClass}-il-link">${p.name}</a></li>`,
      )
      .join("");
    sections.push(
      `<section id="${regionId}" class="${pageClass}-region"><h2 class="${pageClass}-region-title">${label}</h2><ul class="${pageClass}-province-grid">${links}</ul></section>`,
    );
  }
  return sections;
}

/** `/iller` — bölge başlıkları altında il kategori bağlantıları (PHP + SPA hmExtraPages). */
export function buildKamuYerelIllerExtraPage(): KamuYerelIllerExtraPage {
  const sections: string[] = [
    `<div class="hm-iller-page"><p class="hm-iller-lead">Türkiye&#39;nin 81 ilinde kamu ve yerel gündem haberleri — il başlığına tıklayarak il kategorisindeki haberlere ulaşın.</p>`,
    ...buildKamuYerelRegionProvinceSections("hm-iller"),
    "</div>",
  ];
  return {
    id: "ky-page-iller",
    title: "İller",
    slug: KAMU_YEREL_ILLER_PAGE_SLUG,
    bodyHtml: sections.join(""),
    enabled: true,
    fullWidth: true,
  };
}

/**
 * `/daha` — premium hub: uluslararası «Daha» kategorileri + 7 bölge / 81 il.
 * Tepe menü «Daha» bu sayfaya gider; alt RSS kategorileri menüde parent olarak kalır.
 */
export function buildKamuYerelDahaExtraPage(): KamuYerelIllerExtraPage {
  const intlLinks = CUMHA_DAHA_CATEGORY_FEEDS.map(
    (c) =>
      `<li><a href="/kategori/${c.slug}" class="hm-daha-cat-link">${c.name}</a></li>`,
  ).join("");
  const sections: string[] = [
    `<div class="hm-daha-page">`,
    `<p class="hm-daha-lead">Uluslararası kuruluşlar, dış politika ve Türkiye&#39;nin 81 ili — bölge ve il başlıklarından yerel gündeme geçin.</p>`,
    `<section id="daha-uluslararasi" class="hm-daha-intl"><h2 class="hm-daha-section-title">Uluslararası</h2><ul class="hm-daha-cat-grid">${intlLinks}</ul></section>`,
    `<section id="daha-bolgeler" class="hm-daha-bolgeler"><h2 class="hm-daha-section-title">Bölgeler ve iller</h2>`,
    ...buildKamuYerelRegionProvinceSections("hm-daha"),
    `</section></div>`,
  ];
  return {
    id: "ky-page-daha",
    title: "Daha",
    slug: KAMU_YEREL_DAHA_PAGE_SLUG,
    bodyHtml: sections.join(""),
    enabled: true,
    fullWidth: true,
  };
}
