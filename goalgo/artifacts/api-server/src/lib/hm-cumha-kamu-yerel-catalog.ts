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
  const kamu = CUMHA_KAMU_CATEGORY_FEEDS.map((c) => ({
    slug: c.slug,
    name: c.name,
    color: c.color,
  }));
  const provinces = listKamuYerelProvinces().map((p) => ({
    slug: p.slug,
    name: p.name,
    color: "#0b3362",
  }));
  return [...KAMU_YEREL_SECONDARY_CATEGORIES, ...kamu, ...provinces];
}

export function listKamuYerelNavTopCategorySlugs(): string[] {
  return [
    "yerel",
    ...CUMHA_KAMU_CATEGORY_FEEDS.slice(0, 6).map((c) => c.slug),
    "saglik",
    "teknoloji",
    "yasam",
  ];
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

/** 7 bölge + 81 il — PHP vitrin menüsü (editör normalize 40 sınırına takılmaz). */
export function buildKamuYerelCorporateMenuItems(): KamuYerelCorporateMenuItem[] {
  const items: KamuYerelCorporateMenuItem[] = [];
  const illerRoot = "ky-menu-iller";
  items.push({
    id: illerRoot,
    label: "İller",
    href: "/kategori/yerel",
    enabled: true,
  });
  for (const regionId of KAMU_YEREL_REGION_ORDER) {
    const regionMenuId = `ky-region-${regionId}`;
    items.push({
      id: regionMenuId,
      label: KAMU_YEREL_REGION_LABELS[regionId],
      href: "/kategori/yerel",
      parentId: illerRoot,
      enabled: true,
    });
    for (const prov of listKamuYerelProvinces().filter((p) => p.regionId === regionId)) {
      items.push({
        id: `ky-il-${prov.slug}`,
        label: prov.name,
        href: `/kategori/${prov.slug}`,
        parentId: regionMenuId,
        enabled: true,
      });
    }
  }
  for (const cat of CUMHA_KAMU_CATEGORY_FEEDS) {
    items.push({
      id: `ky-cat-${cat.slug}`,
      label: cat.name,
      href: `/kategori/${cat.slug}`,
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
