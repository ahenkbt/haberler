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

/** Cumha uluslararası kuruluş / dış politika RSS — Dünya altında. */
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

/**
 * Tepe menü şemsiye kategorileri — Cumha alt RSS slug'larını birleştirir.
 * Siyaset = CB+bakanlık+TBMM+partiler; Kamu = mülki idare+kamu kurumları;
 * STK = sivil toplum; Dünya = NATO/BM/AB; Röportajlar = editöryel.
 */
export const KAMU_YEREL_UMBRELLA_CATEGORIES: readonly KamuYerelCategoryDef[] = [
  { slug: "siyaset", name: "Siyaset", color: "#8b0000" },
  { slug: "kamu", name: "Kamu", color: "#0b3362" },
  { slug: "stk", name: "STK", color: "#1a5a3a" },
  { slug: "dunya", name: "Dünya", color: "#1e3a5f" },
  { slug: "roportajlar", name: "Röportajlar", color: "#7c2d12" },
];

/**
 * Alt kategori → tepe/şemsiye parent.
 * Listing expand transitive: ara parent'lar da şemsiyeye açılır.
 */
const CUMHA_KAMU_PARENT_SLUG: Partial<Record<string, string>> = {
  // Siyaset ← cumhurbaşkanlığı + bakanlıklar + tbmm + siyasi partiler
  cumhurbaskanligi: "siyaset",
  bakanliklar: "siyaset",
  tbmm: "siyaset",
  "siyasi-partiler": "siyaset",
  "genel-merkez": "siyaset",
  "il-ilce-baskanliklari": "siyaset",
  // Kamu ← mülki idare + kamu kurumları
  "mulki-idare": "kamu",
  "kamu-kurumlari": "kamu",
  valilikler: "kamu",
  kaymakamliklar: "kamu",
  // STK ← sivil toplum (+ toplum ve yaşam)
  "sivil-toplum-kuruluslari": "stk",
  "toplum-ve-yasam": "stk",
  // Yerel Yönetimler ← belediye + muhtar + büyükşehir/ilçe
  "buyuksehir-ve-iller": "yerel-yonetimler",
  ilceler: "yerel-yonetimler",
  belediye: "yerel-yonetimler",
  muhtar: "yerel-yonetimler",
  // Dünya ← NATO / BM / AB / uluslararası kuruluşlar
  nato: "dunya",
  "uluslararasi-kuruluslar": "dunya",
  "birlesmis-milletler": "dunya",
  "avrupa-birligi": "dunya",
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
 * Tepe menü üst slug'ları (ör. `siyaset`, `dunya`) — alt RSS kategori slug'larını
 * geçişli (transitive) birleştirir. Haberler yalnızca alt slug ile etiketlendiğinde
 * üst menü sayfası boş kalmasın.
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
  const out: string[] = [slug];
  const seen = new Set<string>([slug]);
  const queue = [slug];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const [child, p] of Object.entries(CUMHA_KAMU_PARENT_SLUG)) {
      if (p !== parent || seen.has(child)) continue;
      seen.add(child);
      out.push(child);
      queue.push(child);
    }
  }
  return out;
}

/**
 * Tepe menü — birleşik kamu-yerel + genel haber kategorileri.
 * `/daha` ve `/iller` sayfa olarak corporate menu / hmExtraPages'te kalır.
 */
export const KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS = [
  "siyaset",
  "kamu",
  "stk",
  "yerel-yonetimler",
  "yerel",
  "gundem",
  "dunya",
  "spor",
  "teknoloji",
  "saglik",
  "roportajlar",
] as const;

/** Genel / tamamlayıcı tepe kategorileri (+ yerel manşet). */
export const KAMU_YEREL_SECONDARY_CATEGORIES: readonly KamuYerelCategoryDef[] = [
  { slug: "yerel", name: "Yerel", color: "#c00005" },
  { slug: "gundem", name: "Gündem", color: "#b91c1c" },
  { slug: "spor", name: "Spor", color: "#166534" },
  { slug: "teknoloji", name: "Teknoloji", color: "#4c1d95" },
  { slug: "saglik", name: "Sağlık", color: "#991b1b" },
  { slug: "belediye", name: "Belediye", color: "#0a6b7a" },
  { slug: "muhtar", name: "Muhtar", color: "#0d6b5c" },
];

/** Haberler.com Muhtar — belediye/muhtarlık; yerel-yonetimler listing'e yazılır. */
export const HABERLER_MUHTAR_CATEGORY_SLUG = "muhtar";
export const HABERLER_MUHTAR_RSS_URL = "https://rss.haberler.com/rss.asp?kategori=muhtar";
export const HABERLER_MUHTAR_LISTING_BASE = "https://www.haberler.com/muhtar/";

/**
 * robots.txt eski sayısal sayfalama (/muhtar/4/) engeller; sN biçimi serbest.
 * Sayfa başına ~20–30 haber — 8 sayfa ≈ 100+ hedef.
 */
export function listHaberlerMuhtarListingPages(pageCount = 8): string[] {
  const n = Math.max(1, Math.min(12, Math.trunc(pageCount) || 8));
  const pages = [HABERLER_MUHTAR_LISTING_BASE];
  for (let i = 2; i <= n; i++) {
    pages.push(`https://www.haberler.com/muhtar/s${i}/`);
  }
  return pages;
}

/** NTV Atom + Haberler Muhtar — genel haber / yerel yönetim tamamlayıcı. */
export const KAMU_YEREL_SUPPLEMENTAL_RSS = [
  { id: "sup-gundem", url: "https://www.ntv.com.tr/gundem.rss", categoryKey: "gundem", label: "Gündem" },
  { id: "sup-turkiye", url: "https://www.ntv.com.tr/turkiye.rss", categoryKey: "gundem", label: "Türkiye" },
  { id: "sup-dunya", url: "https://www.ntv.com.tr/dunya.rss", categoryKey: "dunya", label: "Dünya" },
  { id: "sup-spor", url: "https://www.ntv.com.tr/sporskor.rss", categoryKey: "spor", label: "Spor" },
  { id: "sup-teknoloji", url: "https://www.ntv.com.tr/teknoloji.rss", categoryKey: "teknoloji", label: "Teknoloji" },
  { id: "sup-saglik", url: "https://www.ntv.com.tr/saglik.rss", categoryKey: "saglik", label: "Sağlık" },
  {
    id: "sup-muhtar",
    url: HABERLER_MUHTAR_RSS_URL,
    // PHP /kategori/yerel-yonetimler tek category_id ile sorgular — muhtar haberleri buraya yazılır.
    categoryKey: "yerel-yonetimler",
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
  return [
    ...KAMU_YEREL_SECONDARY_CATEGORIES,
    ...KAMU_YEREL_UMBRELLA_CATEGORIES,
    dahaNav,
    ...kamu,
    ...provincesByRegion,
  ];
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
  for (const c of KAMU_YEREL_UMBRELLA_CATEGORIES) slugs.add(c.slug);
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
  for (const cat of CUMHA_KAMU_CATEGORY_FEEDS) {
    rows.push({
      id: `cumha-cat-${cat.slug}`,
      label: cat.name,
      url: cumhaCategoryRssUrl(cat.cumhaSlug),
      categoryKey: cat.slug,
    });
  }
  // Cumha nato / BM / AB / uluslararası → site «dunya» (alt slug menü + expand).
  for (const cat of CUMHA_DAHA_CATEGORY_FEEDS) {
    rows.push({
      id: `cumha-cat-${cat.slug}`,
      label: cat.name,
      url: cumhaCategoryRssUrl(cat.cumhaSlug),
      categoryKey: "dunya",
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
      id: sup.id,
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

/** Tepe menü — birleşik nav (81 il `/daha`/`/iller`; ana menüde il/bölge yok). */
export function buildKamuYerelCorporateMenuItems(): KamuYerelCorporateMenuItem[] {
  const items: KamuYerelCorporateMenuItem[] = [];
  const labelBySlug = new Map<string, string>([
    ...KAMU_YEREL_UMBRELLA_CATEGORIES.map((c) => [c.slug, c.name] as const),
    ...KAMU_YEREL_SECONDARY_CATEGORIES.map((c) => [c.slug, c.name] as const),
    ["yerel-yonetimler", "Yerel Yönetimler"],
    ["daha", "Daha"],
  ]);
  for (const slug of KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS) {
    items.push({
      id: `ky-cat-${slug}`,
      label: labelBySlug.get(slug) ?? slug,
      href: `/kategori/${slug}`,
      enabled: true,
    });
  }
  // /daha hub — tepe kategori değil; corporate menüde ayrı sayfa linki
  items.push({
    id: "ky-cat-daha",
    label: "Daha",
    href: `/${KAMU_YEREL_DAHA_PAGE_SLUG}`,
    enabled: true,
  });
  for (const cat of [...CUMHA_KAMU_CATEGORY_FEEDS, ...CUMHA_DAHA_CATEGORY_FEEDS]) {
    if (labelBySlug.has(cat.slug)) continue;
    const parentSlug = CUMHA_KAMU_PARENT_SLUG[cat.slug];
    items.push({
      id: `ky-cat-${cat.slug}`,
      label: cat.name,
      href: `/kategori/${cat.slug}`,
      parentId: parentSlug ? `ky-cat-${parentSlug}` : undefined,
      enabled: true,
    });
  }
  // Belediye / Muhtar — Yerel Yönetimler altında
  items.push({
    id: "ky-cat-belediye",
    label: "Belediye",
    href: "/kategori/belediye",
    parentId: "ky-cat-yerel-yonetimler",
    enabled: true,
  });
  items.push({
    id: "ky-cat-muhtar",
    label: "Muhtar",
    href: "/kategori/muhtar",
    parentId: "ky-cat-yerel-yonetimler",
    enabled: true,
  });
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
 * `/daha` — premium hub: 7 bölge / 81 il.
 * Uluslararası (NATO/BM/AB) «Dünya» tepe kategorisi altında.
 */
export function buildKamuYerelDahaExtraPage(): KamuYerelIllerExtraPage {
  const sections: string[] = [
    `<div class="hm-daha-page">`,
    `<p class="hm-daha-lead">Türkiye&#39;nin 81 ili — bölge ve il başlıklarından yerel gündeme geçin. Uluslararası kuruluş haberleri için <a href="/kategori/dunya">Dünya</a> kategorisine bakın.</p>`,
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
