/**
 * Cumha.com.tr kamu + yerel RSS katalogu — turkatahaber.com & yerel.net.tr paylaşır.
 */
import { TURKEY_CITIES } from "./seed-popular-locations.js";

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
  return TURKEY_CITIES.map((city) => {
    const name = String(city.nameTr ?? city.name).trim();
    const regionRaw = String((city as { region?: string }).region ?? "").trim();
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

export type KamuYerelCorporateMenuItem = {
  id: string;
  label: string;
  href: string;
  parentId?: string | null;
  enabled?: boolean;
};

/** Tepe menü — İller + 7 bölge (81 il yalnızca `/iller` sayfasında; editör 40 kayıt sınırına sığar). */
export function buildKamuYerelCorporateMenuItems(): KamuYerelCorporateMenuItem[] {
  const items: KamuYerelCorporateMenuItem[] = [];
  const illerRoot = "ky-menu-iller";
  items.push({
    id: illerRoot,
    label: "İller",
    href: `/${KAMU_YEREL_ILLER_PAGE_SLUG}`,
    enabled: true,
  });
  for (const regionId of KAMU_YEREL_REGION_ORDER) {
    const regionMenuId = `ky-region-${regionId}`;
    items.push({
      id: regionMenuId,
      label: KAMU_YEREL_REGION_LABELS[regionId],
      href: `/${KAMU_YEREL_ILLER_PAGE_SLUG}#${regionId}`,
      parentId: illerRoot,
      enabled: true,
    });
  }
  items.push({
    id: "ky-cat-daha",
    label: "Daha",
    href: "/kategori/daha",
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

/** `/iller` — bölge başlıkları altında il kategori bağlantıları (PHP + SPA hmExtraPages). */
export function buildKamuYerelIllerExtraPage(): KamuYerelIllerExtraPage {
  const sections: string[] = [
    `<div class="hm-iller-page"><p class="hm-iller-lead">Türkiye&#39;nin 81 ilinde kamu ve yerel gündem haberleri — il başlığına tıklayarak il kategorisindeki haberlere ulaşın.</p>`,
  ];
  for (const regionId of KAMU_YEREL_REGION_ORDER) {
    const label = KAMU_YEREL_REGION_LABELS[regionId];
    const links = listKamuYerelProvinces()
      .filter((p) => p.regionId === regionId)
      .map(
        (p) =>
          `<li><a href="/kategori/${p.slug}" class="hm-iller-il-link">${p.name}</a></li>`,
      )
      .join("");
    sections.push(
      `<section id="${regionId}" class="hm-iller-region"><h2 class="hm-iller-region-title">${label}</h2><ul class="hm-iller-province-grid">${links}</ul></section>`,
    );
  }
  sections.push("</div>");
  return {
    id: "ky-page-iller",
    title: "İller",
    slug: KAMU_YEREL_ILLER_PAGE_SLUG,
    bodyHtml: sections.join(""),
    enabled: true,
    fullWidth: true,
  };
}
