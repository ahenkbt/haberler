/**
 * Cumha.com.tr kamu + yerel RSS katalogu — turkatahaber.com & yerel.net.tr paylaşır.
 */
import { TURKATA_HAKKIMIZDA_HTML } from "./hm-gundemi-regional-sites.js";
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
  { slug: "saglik", name: "Sağlık", color: "#991b1b" },
  { slug: "teknoloji", name: "Teknoloji", color: "#4c1d95" },
  { slug: "yasam", name: "Yaşam", color: "#b45309" },
];

/** NTV — kamu-yerel kavramına uygun tamamlayıcı (isteğe bağlı seed). */
export const KAMU_YEREL_SUPPLEMENTAL_RSS = [
  { url: "https://www.ntv.com.tr/saglik.rss", categoryKey: "saglik", label: "Sağlık" },
  { url: "https://www.ntv.com.tr/teknoloji.rss", categoryKey: "teknoloji", label: "Teknoloji" },
  { url: "https://www.ntv.com.tr/yasam.rss", categoryKey: "yasam", label: "Yaşam" },
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
    items.push({
      id: `ky-cat-${cat.slug}`,
      label: cat.name,
      href: `/kategori/${cat.slug}`,
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

/** Ajans ağı siteleri — `/daha` sol sütun logo ızgarası (canlı marka asset URL’leri). */
export type KamuYerelDahaNetworkSite = {
  name: string;
  href: string;
  logoUrl: string;
};

export const KAMU_YEREL_DAHA_NETWORK_SITES: readonly KamuYerelDahaNetworkSite[] = [
  {
    name: "TürAta Haber",
    href: "https://turkatahaber.com/",
    logoUrl: "https://turkatahaber.com/turkata/turkata-logo.webp",
  },
  {
    name: "Yerel Net",
    href: "https://yerel.net.tr/",
    logoUrl: "https://yerel.net.tr/yerel/yerel-logo.png",
  },
  {
    name: "Yeşil Vatan",
    href: "https://yesilvatan.gen.tr/",
    logoUrl: "https://yesilvatan.gen.tr/yesilvatan/yesilvatan-logo.png",
  },
  {
    name: "TürkSav",
    href: "https://turksav.org/",
    logoUrl: "https://turksav.org/turksav/turksav-logo.png",
  },
  {
    name: "Şehit Gazi",
    href: "https://sehitgazi.org.tr/",
    logoUrl: "https://sehitgazi.org.tr/sehitgazi/sehitgazi-logo.png",
  },
  {
    name: "Dünya Sağlık",
    href: "https://dunyasaglik.org/",
    logoUrl: "https://dunyasaglik.org/dunyasaglik/dunyasaglik-logo.png",
  },
  {
    name: "Fix Haber",
    href: "https://fix.tc/",
    logoUrl: "https://fix.tc/fix/fix-haber-logo.png",
  },
  {
    name: "Sosyal Hizmetler Haber Sitesi",
    href: "https://sosyalhizmetler.tr/",
    logoUrl: "https://sosyalhizmetler.tr/sosyalhizmetler/sosyalhizmetler-logo.webp",
  },
  {
    name: "Ankara Şehir Gazetesi",
    href: "https://ankarasehirgazetesi.com/",
    logoUrl: "https://ankarasehirgazetesi.com/favicon.ico",
  },
  {
    name: "Ankara Haber Gündemi",
    href: "https://ankarahabergundemi.com/",
    logoUrl: "https://ankarahabergundemi.com/favicon.ico",
  },
  {
    name: "Vatan Haber",
    href: "https://vatanhaber.net/",
    logoUrl: "https://vatanhaber.net/media/logos/vatanhaber.net-logo.png",
  },
  {
    name: "Gündemi.org",
    href: "https://gundemi.org/",
    logoUrl: "https://gundemi.org/gundemi/logos/gundemi-org.png",
  },
  {
    name: "Ege Gündemi",
    href: "https://ege.gundemi.org/",
    logoUrl: "https://ege.gundemi.org/gundemi/logos/ege-gundemi.png",
  },
  {
    name: "Marmara Gündemi",
    href: "https://marmara.gundemi.org/",
    logoUrl: "https://marmara.gundemi.org/gundemi/logos/marmara-gundemi.png",
  },
  {
    name: "Karadeniz Gündemi",
    href: "https://karadeniz.gundemi.org/",
    logoUrl: "https://karadeniz.gundemi.org/gundemi/logos/karadeniz-gundemi.png",
  },
  {
    name: "Doğu Anadolu Gündemi",
    href: "https://doguanadolu.gundemi.org/",
    logoUrl: "https://doguanadolu.gundemi.org/gundemi/logos/doguanadolu-gundemi.png",
  },
  {
    name: "Güneydoğu Gündemi",
    href: "https://guneydogu.gundemi.org/",
    logoUrl: "https://guneydogu.gundemi.org/gundemi/logos/guneydogu-gundemi.png",
  },
] as const;

/** `/daha` gövdesinde tanıtım bloğu var mı? (layout lock / seed onarım işareti) */
export const KAMU_YEREL_DAHA_PROMO_MARKER = "hm-daha-proje";

const KAMU_YEREL_DAHA_PAGE_STYLE = `<style>
.ys-extra-page.ys-page:has(.hm-daha-page){grid-template-columns:minmax(0,1fr);gap:8px}
.hm-daha-page{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:32px;align-items:start;max-width:none;margin:0;padding:0 0 36px;color:var(--ys-text,#1a1a1a)}
.hm-daha-main{min-width:0}
.hm-daha-about{font-size:1.02rem;line-height:1.65;margin:0 0 1.5rem}
.hm-daha-about p{margin:0 0 .85rem}
.hm-daha-about h2{font-size:1.15rem;margin:1.25rem 0 .55rem;color:var(--ys-navy,#0b3362)}
.hm-daha-section-title{font-size:1.2rem;margin:0 0 .75rem;padding-bottom:.35rem;border-bottom:1px solid var(--ys-line,rgba(0,0,0,.12));color:var(--ys-navy,#0b3362)}
.hm-daha-concept{margin:0 0 1.75rem;padding:1rem 1.1rem;background:linear-gradient(135deg,rgba(11,51,98,.06),rgba(11,51,98,.02));border-left:3px solid var(--ys-navy,#0b3362);border-radius:0 8px 8px 0;line-height:1.6}
.hm-daha-concept p{margin:0}
.hm-daha-sites{margin:0 0 2rem}
.hm-daha-site-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.85rem}
.hm-daha-site-link{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.45rem;min-height:108px;padding:.75rem .6rem;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--ys-line,rgba(0,0,0,.1));border-radius:8px;transition:border-color .15s ease,box-shadow .15s ease}
.hm-daha-site-link:hover{border-color:rgba(11,51,98,.35);box-shadow:0 4px 14px rgba(11,51,98,.08)}
.hm-daha-site-link img{max-width:112px;max-height:48px;width:auto;height:auto;object-fit:contain}
.hm-daha-site-name{font-size:.78rem;font-weight:700;text-align:center;line-height:1.25;color:var(--ys-navy,#0b3362)}
.hm-daha-proje{margin:0 0 1rem;padding:1.25rem 1.35rem;background:#fff;border:1px solid var(--ys-line,rgba(0,0,0,.1));border-radius:10px;box-shadow:0 1px 0 rgba(11,51,98,.04)}
.hm-daha-proje-title{font-size:clamp(1.25rem,2.2vw,1.55rem);margin:0 0 .35rem;line-height:1.25;color:var(--ys-navy,#0b3362);font-weight:900}
.hm-daha-proje-sub{margin:0 0 1.15rem;font-size:.95rem;line-height:1.5;opacity:.88}
.hm-daha-proje h3{font-size:1.05rem;margin:1.15rem 0 .45rem;color:var(--ys-navy,#0b3362)}
.hm-daha-proje p{margin:0 0 .75rem;line-height:1.65;font-size:.98rem}
.hm-daha-proje ul{margin:.25rem 0 .85rem;padding:0 0 0 1.15rem;line-height:1.6}
.hm-daha-proje li{margin:0 0 .45rem}
.hm-daha-aside{display:grid;gap:1.25rem;min-width:0;position:sticky;top:62px;padding:1rem 1.05rem;background:rgba(11,51,98,.03);border:1px solid var(--ys-line,rgba(0,0,0,.08));border-radius:10px}
.hm-daha-lead{font-size:.95rem;line-height:1.5;margin:0;opacity:.9}
.hm-daha-intl,.hm-daha-bolgeler,.hm-daha-region{margin:0}
.hm-daha-aside .hm-daha-section-title,.hm-daha-aside .hm-daha-region-title{font-size:1.05rem;margin:0 0 .55rem;padding-bottom:.3rem;border-bottom:1px solid var(--ys-line,rgba(0,0,0,.12))}
.hm-daha-province-grid,.hm-daha-cat-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.4rem .5rem}
.hm-daha-il-link,.hm-daha-cat-link{display:block;padding:.4rem .55rem;border-radius:6px;text-decoration:none;color:inherit;background:rgba(255,255,255,.85);border:1px solid transparent;font-size:.9rem}
.hm-daha-il-link:hover,.hm-daha-cat-link:hover{background:#fff;border-color:rgba(11,51,98,.2)}
.hm-daha-bolgeler{display:grid;gap:1rem}
@media (max-width:900px){
  .hm-daha-page{grid-template-columns:minmax(0,1fr);gap:1.5rem}
  .hm-daha-aside{position:static}
}
</style>`;

function escapeDahaAttr(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildKamuYerelDahaNetworkSitesHtml(): string {
  const items = KAMU_YEREL_DAHA_NETWORK_SITES.map((site) => {
    const name = escapeDahaAttr(site.name);
    return `<li><a class="hm-daha-site-link" href="${escapeDahaAttr(site.href)}" target="_blank" rel="noopener noreferrer"><img src="${escapeDahaAttr(site.logoUrl)}" alt="${name}" width="120" height="48" loading="lazy" decoding="async"><span class="hm-daha-site-name">${name}</span></a></li>`;
  }).join("");
  return `<section id="daha-haber-siteleri" class="hm-daha-sites"><h2 class="hm-daha-section-title">TürAta Haber Ajansı Haber sitelerimiz</h2><ul class="hm-daha-site-grid">${items}</ul></section>`;
}

function buildKamuYerelDahaProjeHtml(): string {
  return [
    `<section id="daha-81-il-projesi" class="hm-daha-proje ${KAMU_YEREL_DAHA_PROMO_MARKER}">`,
    `<h2 class="hm-daha-proje-title">81 İl 81 Haber Sitesi Projesi</h2>`,
    `<p class="hm-daha-proje-sub">TürkAta Haber Ajansı &amp; Türk Kültürünü Araştırma ve Tanıtma Vakfı İş Birliğiyle</p>`,
    `<h3>Proje Amacı</h3>`,
    `<p>81 İl 81 Haber Sitesi Projesi; Türkiye’nin her bir köşesini, köklü tarihini, zengin kültürünü ve eşsiz güzelliklerini il il, ilçe ilçe ve mahalle mahalle tüm dünyaya tanıtmak amacıyla hayata geçirilmiş milli bir yayıncılık ve kültür hareketidir.</p>`,
    `<p>TürkAta Haber Ajansı’nın güçlü habercilik altyapısı ile Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın akademik ve kültürel birikimini bir araya getiren bu proje, yerel değerlerimizi ulusal ve uluslararası alanda hak ettiği noktaya taşımayı hedefler.</p>`,
    `<h3>Projenin Temel Kapsamı</h3>`,
    `<ul>`,
    `<li><strong>Yerel Kültür ve Envanter:</strong> Her ilin, ilçenin ve mahallenin kendine özgü tarihi dokusunu, mimarisini, sözlü kültürünü, geleneklerini ve el sanatlarını dijital kayıt altına almak.</li>`,
    `<li><strong>Turizm ve Gastronomi Tanıtımı:</strong> Bölgesel lezzetleri, doğal güzellikleri, tarihi ören yerlerini ve tescilli coğrafi işaretli ürünleri detaylı rehberlerle öne çıkarmak.</li>`,
    `<li><strong>Doğru ve Tarafsız Yerel Habercilik:</strong> Her ilin kendi yerel dinamiklerini, başarılarını, sosyal ve kültürel etkinliklerini tarafsız habercilik anlayışıyla dijital mecralara taşımak.</li>`,
    `<li><strong>Sözlü Tarih ve Yerel Portreler:</strong> Mahallelerimizin ve köylerimizin hafızası olan yaşlılarımızın, yerel zanaatkârlarımızın ve değerlerimizin hikâyelerini gelecek nesillere aktarmak.</li>`,
    `</ul>`,
    `<h3>Proje Odak Noktaları</h3>`,
    `<ul>`,
    `<li><strong>81 İl Genel Tanıtımı:</strong> İllerin tarihi gelişimi, sosyo-ekonomik yapısı ve genel kültür profili.</li>`,
    `<li><strong>İlçe Rehberleri:</strong> Her ilçenin öne çıkan simgeleri, gezilecek yerleri ve ekonomik değerleri.</li>`,
    `<li><strong>Mahalle ve Köy Biyografileri:</strong> Unutulmaya yüz tutmuş mahalle kültürleri, yerel isimlerin hikâyeleri ve mikro kültür çalışmaları.</li>`,
    `<li><strong>Kültür Etkinlikleri ve Haber:</strong> Yerel festivaller, fuarlar, sergiler ve anma günlerinin anlık takibi.</li>`,
    `</ul>`,
    `</section>`,
  ].join("");
}

/**
 * `/daha` — sol: ajans tanıtımı + site logoları + 81 İl projesi; sağ: uluslararası + 81 il.
 * Tepe menü «Daha» bu sayfaya gider; alt RSS kategorileri menüde parent olarak kalır.
 */
export function buildKamuYerelDahaExtraPage(): KamuYerelIllerExtraPage {
  const intlLinks = CUMHA_DAHA_CATEGORY_FEEDS.map(
    (c) =>
      `<li><a href="/kategori/${c.slug}" class="hm-daha-cat-link">${c.name}</a></li>`,
  ).join("");
  const sections: string[] = [
    KAMU_YEREL_DAHA_PAGE_STYLE,
    `<div class="hm-daha-page hm-extra-page-root">`,
    `<div class="hm-daha-main">`,
    `<section id="daha-hakkimizda" class="hm-daha-about">${TURKATA_HAKKIMIZDA_HTML}</section>`,
    buildKamuYerelDahaNetworkSitesHtml(),
    `<section id="daha-konsept" class="hm-daha-concept"><p>TürAta Haber Ajansı kamu ve yerel gündemi bir arada sunar: cumhurbaşkanlığı, bakanlıklar, TBMM ve kamu kurumlarından belediye, valilik ve 81 il haberine — yerelin sesini ulusal ve uluslararası okura taşıyan güvenilir bir yayın ağı.</p></section>`,
    buildKamuYerelDahaProjeHtml(),
    `</div>`,
    `<aside class="hm-daha-aside ys-aside" aria-label="Uluslararası ve iller">`,
    `<p class="hm-daha-lead">Uluslararası kuruluşlar, dış politika ve Türkiye&#39;nin 81 ili — bölge ve il başlıklarından yerel gündeme geçin.</p>`,
    `<section id="daha-uluslararasi" class="hm-daha-intl"><h2 class="hm-daha-section-title">Uluslararası</h2><ul class="hm-daha-cat-grid">${intlLinks}</ul></section>`,
    `<section id="daha-bolgeler" class="hm-daha-bolgeler"><h2 class="hm-daha-section-title">Bölgeler ve iller</h2>`,
    ...buildKamuYerelRegionProvinceSections("hm-daha"),
    `</section></aside></div>`,
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
