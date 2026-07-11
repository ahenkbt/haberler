/** Site geneli birleşik arama — gruplu bölümler + düz liste */
import {
  db,
  getNewsDbForRead,
  hmMakalelerTable,
  hmNewsSitesTable,
  newsTable,
  videoSourcesTable,
  videosTable,
} from "@workspace/db";
import {
  mapBusinessesTable,
  mapCategoriesTable,
  mapCitiesTable,
  vendorsTable,
} from "@workspace/db";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { searchOtomotivServiceCategories } from "../data/otomotiv-service-categories-data.js";
import { fetchDdgMediaSearch, type DdgImageResult, type DdgVideoResult } from "./ddg-media-search.js";
import { buildUnifiedSearchAiPayload, type UnifiedSearchAiMeta } from "./geminiSearchService.js";
import { TURKEY_CITIES } from "./seed-popular-locations.js";
import { toWikiAsciiSlug } from "./wikiAsciiSlug.js";
import { searchYektubeVideos } from "./yektubeVideoSearch.js";

const WIKI_SEARCH_API = "https://tr.wikipedia.org/w/api.php";
const WIKI_REST = "https://tr.wikipedia.org/api/rest_v1";
const WIKI_HEADERS = { "User-Agent": "YekpareBilgiAgaci/1.0 (https://yekpare.net; ahenkbt1@gmail.com)" };

export type PlatformSearchResultType =
  | "map_business"
  | "otomotiv"
  | "otomotiv_listing"
  | "vendor_food"
  | "vendor_grocery"
  | "vendor_shop"
  | "vendor_other"
  | "product"
  | "tourism"
  | "service"
  | "map_pin"
  | "news"
  | "hm_site"
  | "hm_makale"
  | "city"
  | "yektube_video"
  | "wiki_article"
  | "web_result";

export type PlatformSearchResult = {
  id: string;
  name: string;
  slug: string | null;
  resultType: PlatformSearchResultType;
  typeLabel: string;
  href: string;
  address: string | null;
  city: string | null;
  district: string | null;
  description: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  categoryName: string | null;
  homepageSuperCategory: string | null;
  storeType: string | null;
  hasPublicProfile: boolean;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  price?: number | null;
  subtitle?: string | null;
  hmSiteName?: string | null;
  hmSiteSlug?: string | null;
};

export type UnifiedSearchMapPreview = {
  latitude: number;
  longitude: number;
  label: string;
  href: string;
  zoom?: number;
} | null;

export type UnifiedSearchLocationCityCard = {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  href: string;
  latitude: number | null;
  longitude: number | null;
  zoom: number | null;
  district: string | null;
  region: string | null;
};

export type UnifiedSearchLocationBusinessCard = {
  id: string;
  name: string;
  href: string;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  address: string | null;
  city: string | null;
  categoryName: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type UnifiedSearchLocationWikiCard = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  href: string;
};

export type UnifiedSearchLocationContext = {
  locationIntent: boolean;
  label: string;
  city: UnifiedSearchLocationCityCard | null;
  district: string | null;
  businesses: UnifiedSearchLocationBusinessCard[];
  wiki: UnifiedSearchLocationWikiCard | null;
  mapPreview: UnifiedSearchMapPreview;
};

export type UnifiedSearchSectionKey =
  | "haberler"
  | "hm_bagli_siteler"
  | "yektube"
  | "bilgi_agaci"
  | "sehir"
  | "otomotiv"
  | "sari_sayfalar"
  | "yemek_market"
  | "seyahat"
  | "urunler"
  | "hizmetler"
  | "haritalar"
  | "internet";

export type UnifiedSearchSection = {
  key: UnifiedSearchSectionKey;
  title: string;
  total: number;
  seeAllHref: string;
  items: PlatformSearchResult[];
};

export type UnifiedSearchCityQuickFacts = {
  population?: number | null;
  plateCode?: string | null;
  areaCode?: string | null;
  areaKm2?: number | null;
  founded?: string | null;
  region?: string | null;
};

export type UnifiedSearchRelatedSearch = {
  query: string;
  href: string;
};

export type UnifiedSearchMeta = {
  ai?: UnifiedSearchAiMeta;
  elapsedMs?: number;
  media?: {
    imageCount?: number;
    videoCount?: number;
    source?: "duckduckgo";
  };
};

export type UnifiedSearchExternalImage = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string | null;
  pageUrl: string | null;
  source: string;
};

export type UnifiedSearchExternalVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  source: string;
  duration: string | null;
  publisher: string | null;
};

export type GroupedUnifiedSearchResponse = {
  query: string;
  sections: UnifiedSearchSection[];
  totalResults: number;
  aiSummary?: string | null;
  aiModel?: string | null;
  internetSearchEnabled?: boolean;
  searchMeta?: UnifiedSearchMeta;
  mapPreview?: UnifiedSearchMapPreview;
  locationContext?: UnifiedSearchLocationContext | null;
  aiGalleryImages?: string[];
  externalImages?: UnifiedSearchExternalImage[];
  externalVideos?: UnifiedSearchExternalVideo[];
  relatedSearches?: UnifiedSearchRelatedSearch[];
  cityQuickFacts?: UnifiedSearchCityQuickFacts | null;
};

type TurkeyCitySeed = {
  name: string;
  nameTr?: string;
  lat: number;
  lng: number;
  zoom: number;
  region?: string;
  districts?: readonly string[];
};

const TURKEY_CITY_SEED = TURKEY_CITIES as unknown as readonly TurkeyCitySeed[];

const LOCATION_QUERY_HINTS = [
  "sehir",
  "ilce",
  "mahalle",
  "konum",
  "harita",
  "bolge",
  "semt",
  "merkez",
  "koy",
  "kasaba",
  "yer",
  "lokasyon",
  "adres",
  "civar",
  "yakin",
  "nerede",
] as const;

const LANDMARK_PLACES: ReadonlyArray<{
  keys: string[];
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  city?: string;
  district?: string;
  description: string;
}> = [
  {
    keys: ["kapadokya", "goreme", "urgup", "uchisar", "avanos"],
    label: "Kapadokya",
    lat: 38.6431,
    lng: 34.8289,
    zoom: 11,
    city: "Nevşehir",
    description: "Peri bacaları, balon turları ve tarihi yer altı şehirleriyle ünlü bölge.",
  },
  {
    keys: ["kadikoy", "kadikoyu"],
    label: "Kadıköy",
    lat: 40.9903,
    lng: 29.0257,
    zoom: 14,
    city: "İstanbul",
    district: "Kadıköy",
    description: "İstanbul Anadolu yakasının kültür, yeme-içme ve ulaşım merkezi.",
  },
  {
    keys: ["besiktas", "besiktasi"],
    label: "Beşiktaş",
    lat: 41.0422,
    lng: 29.0067,
    zoom: 14,
    city: "İstanbul",
    district: "Beşiktaş",
    description: "Boğaz kıyısı, çarşılar ve gece hayatıyla öne çıkan ilçe.",
  },
  {
    keys: ["bodrum", "gumbet", "turgutreis"],
    label: "Bodrum",
    lat: 37.0344,
    lng: 27.4305,
    zoom: 12,
    city: "Muğla",
    district: "Bodrum",
    description: "Ege kıyısında marina, plajlar ve tarihi kale.",
  },
  {
    keys: ["pamukkale", "hierapolis"],
    label: "Pamukkale",
    lat: 37.9137,
    lng: 29.1187,
    zoom: 13,
    city: "Denizli",
    description: "Traverten terasları ve antik Hierapolis kenti.",
  },
  {
    keys: ["efes", "ephesus", "selcuk"],
    label: "Efes",
    lat: 37.9392,
    lng: 27.3408,
    zoom: 14,
    city: "İzmir",
    district: "Selçuk",
    description: "Antik dünyanın en önemli kentlerinden biri.",
  },
  {
    keys: ["uludag", "uludagi"],
    label: "Uludağ",
    lat: 40.109,
    lng: 29.222,
    zoom: 11,
    city: "Bursa",
    description: "Kış turizmi ve doğa yürüyüşleriyle bilinen dağ.",
  },
  {
    keys: ["salda", "salda golu"],
    label: "Salda Gölü",
    lat: 37.5527,
    lng: 29.6831,
    zoom: 12,
    city: "Burdur",
    description: "Türkiye'nin Maldivleri olarak anılan turkuaz göl.",
  },
  {
    keys: ["ankara kalesi", "ankara kale"],
    label: "Ankara Kalesi",
    lat: 39.9417,
    lng: 32.8642,
    zoom: 15,
    city: "Ankara",
    description: "Başkentin tarihi surları ve panoramik manzarası.",
  },
  {
    keys: ["taksim", "istiklal"],
    label: "Taksim",
    lat: 41.037,
    lng: 28.985,
    zoom: 15,
    city: "İstanbul",
    district: "Beyoğlu",
    description: "İstanbul'un kalbi; İstiklal Caddesi ve kültür noktaları.",
  },
];

const SECTION_META: Record<
  UnifiedSearchSectionKey,
  { title: string; seeAll: (q: string, city?: string) => string }
> = {
  haberler: {
    title: "Haberler",
    seeAll: (q) => `/haberler?q=${encodeURIComponent(q)}`,
  },
  hm_bagli_siteler: {
    title: "Bağlı Haber Siteleri",
    seeAll: (q) => `/ara?q=${encodeURIComponent(q)}&tab=hm_bagli_siteler`,
  },
  yektube: {
    title: "YekTube",
    seeAll: (q) => `/yektube/ara?q=${encodeURIComponent(q)}`,
  },
  bilgi_agaci: {
    title: "Bilgi Ağacı",
    seeAll: (q) => `/bilgiagaci?q=${encodeURIComponent(q)}`,
  },
  sehir: {
    title: "Şehirler",
    seeAll: (q) => `/map?q=${encodeURIComponent(q)}`,
  },
  otomotiv: {
    title: "Otomotiv",
    seeAll: (q) => `/otomotiv?q=${encodeURIComponent(q)}`,
  },
  sari_sayfalar: {
    title: "Sarı Sayfalar / Firmalar",
    seeAll: (q, city) => {
      const params = new URLSearchParams({ q });
      if (city) params.set("city", city);
      return `/kesfet/liste?${params.toString()}`;
    },
  },
  yemek_market: {
    title: "Yemek & Market",
    seeAll: (q) => `/siparis?q=${encodeURIComponent(q)}`,
  },
  seyahat: {
    title: "Seyahat",
    seeAll: (q) => `/turizm/konaklama?q=${encodeURIComponent(q)}`,
  },
  urunler: {
    title: "Ürünler",
    seeAll: (q) => `/magaza/urunler?q=${encodeURIComponent(q)}`,
  },
  hizmetler: {
    title: "Hizmetler",
    seeAll: (q) => `/kesfet/liste?q=${encodeURIComponent(q)}&superCategory=hizmet`,
  },
  haritalar: {
    title: "Haritalar",
    seeAll: (q) => `/map?q=${encodeURIComponent(q)}`,
  },
  internet: {
    title: "İnternet",
    seeAll: (q) => `/ara?q=${encodeURIComponent(q)}&tab=internet`,
  },
};

const SECTION_ORDER: UnifiedSearchSectionKey[] = [
  "internet",
  "seyahat",
  "haritalar",
  "yektube",
  "hm_bagli_siteler",
  "sehir",
  "bilgi_agaci",
  "haberler",
  "otomotiv",
  "sari_sayfalar",
  "yemek_market",
  "urunler",
  "hizmetler",
];

const HM_SITE_PUBLIC_PREFIX = "tr";

function hmSitePublicHref(siteSlug: string, subPath = ""): string {
  const base = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(siteSlug)}`;
  return subPath ? `${base}/${subPath.replace(/^\//, "")}` : base;
}

export function normalizePlatformSearchQuery(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kısa sorgular (ör. "oto") için otomotiv / servis eşanlamlıları */
export function expandPlatformSearchTerms(rawQuery: string): string[] {
  const q = rawQuery.trim();
  if (!q) return [];
  const norm = normalizePlatformSearchQuery(q);
  const terms = new Set<string>([q]);
  if (norm === "oto" || norm.startsWith("oto ") || norm.endsWith(" oto") || norm.includes(" oto ")) {
    terms.add("otomotiv");
    terms.add("oto servis");
    terms.add("oto galeri");
    terms.add("yedek parca");
    terms.add("oto yikama");
    terms.add("lastik");
  }
  if (norm.includes("otomotiv") || norm === "oto") {
    for (const row of searchOtomotivServiceCategories(norm === "oto" ? "oto" : q)) {
      terms.add(String(row.name ?? ""));
      terms.add(String(row.slug ?? "").replace(/-/g, " "));
      for (const tag of (row.tags as string[] | undefined) ?? []) terms.add(tag);
    }
  }
  return Array.from(terms).map((t) => t.trim()).filter(Boolean);
}

const MAP_HAS_PUBLIC_PROFILE = sql<boolean>`(
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.linked_map_business_id = ${mapBusinessesTable.id}
      AND v.active = TRUE
      AND lower(COALESCE(v.slug, '')) NOT LIKE 'yekpare-demo-%'
  )
  OR ${mapBusinessesTable.ownerId} IS NOT NULL
  OR ${mapBusinessesTable.isPremium} = TRUE
)`;

function mapBusinessUnifiedTextCondition(qRaw: string): SQL | null {
  const terms = expandPlatformSearchTerms(qRaw);
  if (!terms.length) return null;
  const clauses: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    clauses.push(
      ilike(mapBusinessesTable.name, pattern),
      ilike(mapBusinessesTable.description, pattern),
      ilike(mapCategoriesTable.name, pattern),
      ilike(mapCategoriesTable.slug, pattern),
      ilike(mapBusinessesTable.address, pattern),
      ilike(mapCitiesTable.name, pattern),
      ilike(mapBusinessesTable.storeType, pattern),
      ilike(mapBusinessesTable.homepageSuperCategory, pattern),
      ilike(mapBusinessesTable.importSource, pattern),
      sql`EXISTS (
        SELECT 1 FROM unnest(COALESCE(${mapBusinessesTable.tags}, ARRAY[]::text[])) AS tag
        WHERE tag ILIKE ${pattern}
      )`,
    );
  }
  const merged = or(...clauses);
  return merged ?? null;
}

function slugifyTr(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "urun";
}

function mapBusinessTypeLabel(row: {
  homepageSuperCategory?: string | null;
  storeType?: string | null;
  importSource?: string | null;
  categoryName?: string | null;
}): string {
  const superCat = String(row.homepageSuperCategory ?? "").toLowerCase();
  const storeType = String(row.storeType ?? "").toLowerCase();
  const importSource = String(row.importSource ?? "").toLowerCase();
  if (superCat === "otomotiv" || storeType.startsWith("otomotiv")) return "Otomotiv";
  if (importSource === "insaatfirmalarim" || superCat === "insaat") return "İnşaat";
  if (superCat === "turizm" || superCat === "seyahat" || storeType.includes("turizm")) return "Turizm";
  if (superCat === "siparis" || superCat === "yiyecek" || storeType.includes("restoran")) return "Yemek";
  if (superCat === "kamu") return "Kamu";
  if (superCat === "hizmet" || superCat === "servis") return "Hizmet";
  if (row.categoryName) return row.categoryName;
  return "Sarı Sayfalar";
}

function mapBusinessSectionKey(typeLabel: string, row: {
  homepageSuperCategory?: string | null;
  storeType?: string | null;
}): UnifiedSearchSectionKey {
  const superCat = String(row.homepageSuperCategory ?? "").toLowerCase();
  const storeType = String(row.storeType ?? "").toLowerCase();
  if (typeLabel === "Otomotiv" || superCat === "otomotiv" || storeType.startsWith("otomotiv")) return "otomotiv";
  if (typeLabel === "Turizm" || superCat === "turizm" || superCat === "seyahat") return "seyahat";
  if (typeLabel === "Hizmet" || superCat === "hizmet" || superCat === "servis") return "hizmetler";
  return "sari_sayfalar";
}

function mapBusinessDetailHref(slug: string | null, id: string, hasPublicProfile: boolean): string {
  if (hasPublicProfile && slug) return `/kesfet/${encodeURIComponent(slug)}`;
  if (hasPublicProfile) return `/kesfet/isletme/${encodeURIComponent(id)}`;
  return `/map?nav=${encodeURIComponent(id)}`;
}

function vendorTypeLabel(vendorType: string | null | undefined): {
  resultType: PlatformSearchResultType;
  typeLabel: string;
  hrefPrefix: string;
} {
  const type = String(vendorType ?? "").toLowerCase();
  if (["market", "grocery"].includes(type)) {
    return { resultType: "vendor_grocery", typeLabel: "Market", hrefPrefix: "/market" };
  }
  if (["alisveris", "ecommerce", "shop"].includes(type)) {
    return { resultType: "vendor_shop", typeLabel: "Mağaza", hrefPrefix: "/alisveris/magaza" };
  }
  if (["siparis", "delivery", "restaurant", "restoran", "food"].includes(type)) {
    return { resultType: "vendor_food", typeLabel: "Yemek", hrefPrefix: "/siparis/satici" };
  }
  return { resultType: "vendor_other", typeLabel: "İşletme", hrefPrefix: "/kesfet" };
}

function vendorDetailHref(slug: string | null, vendorType: string | null | undefined): string {
  const s = String(slug ?? "").trim();
  if (!s) return "/siparis";
  const { hrefPrefix } = vendorTypeLabel(vendorType);
  if (hrefPrefix === "/kesfet") return `/kesfet/${encodeURIComponent(s)}`;
  if (hrefPrefix === "/market") return `/market?q=${encodeURIComponent(s)}`;
  return `${hrefPrefix}/${encodeURIComponent(s)}`;
}

function otomotivDetailHref(businessType: string | null | undefined, slug: string | null, q: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return `/otomotiv?q=${encodeURIComponent(q)}`;
  const t = String(businessType ?? "").toLowerCase();
  const encoded = encodeURIComponent(s);
  if (t === "galeri") return `/otomotiv/galeri/${encoded}`;
  if (t === "yedek_parca") return `/otomotiv/yedek-parca/${encoded}`;
  if (t === "cikma") return `/otomotiv/cikma/${encoded}`;
  if (t === "servis") return `/otomotiv/servis/${encoded}`;
  if (t === "yikama") return `/otomotiv/yikama/${encoded}`;
  if (t === "lastik") return `/otomotiv/lastik/${encoded}`;
  return `/otomotiv/servis/${encoded}`;
}

function otomotivListingHref(businessType: string | null | undefined, listingSlug: string | null): string {
  const s = String(listingSlug ?? "").trim();
  if (!s) return "/otomotiv";
  const t = String(businessType ?? "").toLowerCase();
  const encoded = encodeURIComponent(s);
  if (t === "galeri" || t === "genel") return `/otomotiv/galeri/${encoded}`;
  if (t === "yedek_parca") return `/otomotiv/yedek-parca/${encoded}`;
  if (t === "cikma") return `/otomotiv/cikma/${encoded}`;
  return `/otomotiv/ikinci-el/${encoded}`;
}

function otomotivBusinessTypeLabel(businessType: string | null | undefined): string {
  const t = String(businessType ?? "").toLowerCase();
  if (t === "galeri") return "Oto Galeri";
  if (t === "yedek_parca") return "Yedek Parça";
  if (t === "servis") return "Oto Servis";
  if (t === "yikama") return "Oto Yıkama";
  if (t === "lastik") return "Lastik";
  return "Otomotiv";
}

function tourismListingHref(type: string | null | undefined, slug: string | null): string {
  const s = String(slug ?? "").trim();
  if (!s) return "/turizm";
  const encoded = encodeURIComponent(s);
  const t = String(type ?? "hotel").toLowerCase();
  if (t === "villa" || t === "space") return `/turizm/villa-ev/${encoded}`;
  if (t === "tour") return `/turizm/tur/${encoded}`;
  if (t === "car") return `/turizm/arac-kiralama/${encoded}`;
  if (t === "boat") return `/turizm/yat-turlari/${encoded}`;
  return `/turizm/konaklama/${encoded}`;
}

function tourismTypeLabel(type: string | null | undefined): string {
  const t = String(type ?? "hotel").toLowerCase();
  if (t === "villa" || t === "space") return "Villa & Ev";
  if (t === "tour") return "Tur";
  if (t === "car") return "Araç Kiralama";
  if (t === "boat") return "Yat & Tekne";
  return "Konaklama";
}

function emptySections(): Record<UnifiedSearchSectionKey, PlatformSearchResult[]> {
  return {
    haberler: [],
    hm_bagli_siteler: [],
    yektube: [],
    bilgi_agaci: [],
    sehir: [],
    otomotiv: [],
    sari_sayfalar: [],
    yemek_market: [],
    seyahat: [],
    urunler: [],
    hizmetler: [],
    haritalar: [],
    internet: [],
  };
}

const TR_CITY_PLATE: Readonly<Record<string, string>> = {
  adana: "01",
  adiyaman: "02",
  afyonkarahisar: "03",
  agri: "04",
  amasya: "05",
  ankara: "06",
  antalya: "07",
  artvin: "08",
  aydin: "09",
  balikesir: "10",
  bilecik: "11",
  bingol: "12",
  bitlis: "13",
  bolu: "14",
  burdur: "15",
  bursa: "16",
  canakkale: "17",
  cankiri: "18",
  corum: "19",
  denizli: "20",
  diyarbakir: "21",
  edirne: "22",
  elazig: "23",
  erzincan: "24",
  erzurum: "25",
  eskisehir: "26",
  gaziantep: "27",
  giresun: "28",
  gumushane: "29",
  hakkari: "30",
  hatay: "31",
  isparta: "32",
  mersin: "33",
  istanbul: "34",
  izmir: "35",
  kars: "36",
  kastamonu: "37",
  kayseri: "38",
  kirklareli: "39",
  kirsehir: "40",
  kocaeli: "41",
  konya: "42",
  kutahya: "43",
  malatya: "44",
  manisa: "45",
  kahramanmaras: "46",
  mardin: "47",
  mugla: "48",
  mus: "49",
  nevsehir: "50",
  nigde: "51",
  ordu: "52",
  rize: "53",
  sakarya: "54",
  samsun: "55",
  siirt: "56",
  sinop: "57",
  sivas: "58",
  tekirdag: "59",
  tokat: "60",
  trabzon: "61",
  tunceli: "62",
  sanliurfa: "63",
  usak: "64",
  van: "65",
  yozgat: "66",
  zonguldak: "67",
  aksaray: "68",
  bayburt: "69",
  karaman: "70",
  kirikkale: "71",
  batman: "72",
  sirnak: "73",
  bartin: "74",
  ardahan: "75",
  igdir: "76",
  yalova: "77",
  karabuk: "78",
  kilis: "79",
  osmaniye: "80",
  duzce: "81",
};

const TR_CITY_AREA_CODE: Readonly<Record<string, string>> = {
  ankara: "+90 312",
  istanbul: "+90 212",
  izmir: "+90 232",
  bursa: "+90 224",
  antalya: "+90 242",
  adana: "+90 322",
  gaziantep: "+90 342",
  konya: "+90 332",
  mersin: "+90 324",
  kocaeli: "+90 262",
};

const TR_CITY_EXTRA: Readonly<
  Record<string, { population?: number; areaKm2?: number; founded?: string }>
> = {
  ankara: { population: 5803482, areaKm2: 4130, founded: "MO 3000" },
  istanbul: { population: 15979000, areaKm2: 5461, founded: "MÖ 660" },
  izmir: { population: 4462056, areaKm2: 11891, founded: "MÖ 3000" },
  bursa: { population: 3194720, areaKm2: 10813 },
  antalya: { population: 2688004, areaKm2: 20177 },
  konya: { population: 2296349, areaKm2: 40838 },
  adana: { population: 2274106, areaKm2: 13844 },
  gaziantep: { population: 2159126, areaKm2: 6220 },
};

function buildRelatedSearches(q: string, cityName?: string | null): UnifiedSearchRelatedSearch[] {
  const base = (cityName ?? q).trim();
  if (!base) return [];
  const templates = [
    `${base} gezilecek yerler`,
    `${base} oteller`,
    `${base} hava durumu`,
    `${base} restoranlar`,
    `${base} ulaşım`,
    `${base} etkinlikler`,
  ];
  return templates.map((query) => ({
    query,
    href: `/ara?q=${encodeURIComponent(query)}`,
  }));
}

function buildCityQuickFacts(input: {
  cityName: string | null;
  cityCode?: string | null;
  region?: string | null;
}): UnifiedSearchCityQuickFacts | null {
  const name = String(input.cityName ?? "").trim();
  if (!name) return null;
  const norm = normalizePlatformSearchQuery(name);
  const seed = TURKEY_CITY_SEED.find(
    (c) => normalizePlatformSearchQuery(c.nameTr ?? c.name) === norm,
  );
  const plate =
    String(input.cityCode ?? "").trim().replace(/^0+/, "").padStart(2, "0") ||
    TR_CITY_PLATE[norm] ||
    null;
  const extra = TR_CITY_EXTRA[norm];
  return {
    population: extra?.population ?? null,
    plateCode: plate,
    areaCode: TR_CITY_AREA_CODE[norm] ?? null,
    areaKm2: extra?.areaKm2 ?? null,
    founded: extra?.founded ?? null,
    region: input.region ?? seed?.region ?? null,
  };
}

async function pushWikiHitsToBucket(
  hits: WikiSearchHit[],
  perSection: number,
  pushItem: (section: UnifiedSearchSectionKey, item: PlatformSearchResult) => void,
): Promise<void> {
  const wikiSlice = hits.slice(0, perSection);
  const thumbs = await Promise.all(wikiSlice.map((hit) => fetchWikiSummaryThumb(hit.title)));
  for (let i = 0; i < wikiSlice.length; i++) {
    const hit = wikiSlice[i]!;
    const thumb = thumbs[i] ?? null;
    const slug = wikiTitleToHrefSlug(hit.title);
    pushItem("bilgi_agaci", {
      id: `wiki-${hit.title}`,
      name: hit.title,
      slug,
      resultType: "wiki_article",
      typeLabel: "Ansiklopedi",
      href: `/bilgiagaci/${slug}`,
      address: null,
      city: null,
      district: null,
      description: stripHtmlTags(hit.snippet) || null,
      rating: null,
      userRatingsTotal: null,
      photoUrl: thumb,
      coverPhotoUrl: thumb,
      categoryName: "Bilgi Ağacı",
      homepageSuperCategory: null,
      storeType: null,
      hasPublicProfile: true,
      googlePlaceId: null,
      latitude: null,
      longitude: null,
      phone: null,
    });
  }
}

function collectGalleryImages(buckets: Record<UnifiedSearchSectionKey, PlatformSearchResult[]>, limit = 12): string[] {
  const keys: UnifiedSearchSectionKey[] = [
    "seyahat",
    "haberler",
    "hm_bagli_siteler",
    "bilgi_agaci",
    "haritalar",
    "sari_sayfalar",
    "hizmetler",
    "yemek_market",
    "urunler",
    "yektube",
    "otomotiv",
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    for (const item of buckets[key]) {
      const url = String(item.coverPhotoUrl ?? item.photoUrl ?? "").trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function mapDdgImages(images: DdgImageResult[]): UnifiedSearchExternalImage[] {
  return images.map((item) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
    pageUrl: item.pageUrl,
    source: item.source,
  }));
}

function mapDdgVideos(videos: DdgVideoResult[]): UnifiedSearchExternalVideo[] {
  return videos.map((item) => ({
    id: item.id,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    videoUrl: item.videoUrl,
    source: item.source,
    duration: item.duration,
    publisher: item.publisher,
  }));
}

function mergeGalleryImageUrls(siteUrls: string[], externalImages: UnifiedSearchExternalImage[], limit = 36): string[] {
  const out = [...siteUrls];
  const seen = new Set(out);
  for (const item of externalImages) {
    const url = String(item.thumbnailUrl || item.imageUrl || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

function findTurkeyProvinceInQuery(q: string): TurkeyCitySeed | null {
  const norm = normalizePlatformSearchQuery(q);
  if (!norm) return null;
  let best: { city: TurkeyCitySeed; score: number } | null = null;
  for (const city of TURKEY_CITY_SEED) {
    const names = [city.nameTr ?? city.name, city.name].filter(Boolean);
    for (const rawName of names) {
      const nameNorm = normalizePlatformSearchQuery(rawName);
      if (!nameNorm) continue;
      if (norm === nameNorm || norm.startsWith(`${nameNorm} `) || norm.endsWith(` ${nameNorm}`) || norm.includes(` ${nameNorm} `)) {
        const score = nameNorm.length;
        if (!best || score > best.score) best = { city, score };
      }
    }
  }
  return best?.city ?? null;
}

function findDistrictInQuery(q: string): { district: string; city: TurkeyCitySeed } | null {
  const norm = normalizePlatformSearchQuery(q);
  if (!norm) return null;
  let best: { district: string; city: TurkeyCitySeed; score: number } | null = null;
  for (const city of TURKEY_CITY_SEED) {
    for (const district of city.districts ?? []) {
      const dNorm = normalizePlatformSearchQuery(district);
      if (!dNorm || dNorm.length < 3) continue;
      if (norm === dNorm || norm.startsWith(`${dNorm} `) || norm.endsWith(` ${dNorm}`) || norm.includes(` ${dNorm} `)) {
        const score = dNorm.length;
        if (!best || score > best.score) best = { district, city, score };
      }
    }
  }
  return best ? { district: best.district, city: best.city } : null;
}

function findLandmarkInQuery(q: string): (typeof LANDMARK_PLACES)[number] | null {
  const norm = normalizePlatformSearchQuery(q);
  if (!norm) return null;
  let best: { landmark: (typeof LANDMARK_PLACES)[number]; score: number } | null = null;
  for (const landmark of LANDMARK_PLACES) {
    for (const key of landmark.keys) {
      const keyNorm = normalizePlatformSearchQuery(key);
      if (!keyNorm) continue;
      if (norm === keyNorm || norm.includes(keyNorm)) {
        const score = keyNorm.length;
        if (!best || score > best.score) best = { landmark, score };
      }
    }
  }
  return best?.landmark ?? null;
}

function hasLocationQueryHints(q: string): boolean {
  const norm = normalizePlatformSearchQuery(q);
  return LOCATION_QUERY_HINTS.some((hint) => norm.includes(hint));
}

/** Sorgu yalnızca il/ilçe/landmark adıysa (ör. "denizli", "ankara", "kapadokya") — işletme paneli gösterme. */
function isPureGeographicPlaceQuery(input: {
  q: string;
  province: TurkeyCitySeed | null;
  district: { district: string; city: TurkeyCitySeed } | null;
  landmark: (typeof LANDMARK_PLACES)[number] | null;
  matchedCities: Array<{ name: string }>;
  sehirCount: number;
}): boolean {
  const norm = normalizePlatformSearchQuery(input.q);
  const words = norm.split(" ").filter(Boolean);

  if (input.landmark) {
    const labelNorm = normalizePlatformSearchQuery(input.landmark.label);
    if (norm === labelNorm) return true;
    for (const key of input.landmark.keys) {
      const keyNorm = normalizePlatformSearchQuery(key);
      if (norm === keyNorm || (words.length <= 2 && norm.includes(keyNorm))) return true;
    }
  }

  if (input.district) {
    const dNorm = normalizePlatformSearchQuery(input.district.district);
    if (norm === dNorm || (words.length <= 2 && (norm.startsWith(`${dNorm} `) || norm.endsWith(` ${dNorm}`)))) {
      return true;
    }
  }

  if (input.province) {
    const names = [input.province.nameTr ?? input.province.name, input.province.name].filter(Boolean);
    for (const rawName of names) {
      const nNorm = normalizePlatformSearchQuery(rawName);
      if (norm === nNorm) return true;
    }
  }

  for (const city of input.matchedCities) {
    const cityNorm = normalizePlatformSearchQuery(city.name);
    if (norm === cityNorm) return true;
  }

  return input.sehirCount > 0 && words.length === 1;
}

function toLocationBusinessCard(item: PlatformSearchResult): UnifiedSearchLocationBusinessCard {
  return {
    id: item.id,
    name: item.name,
    href: item.href,
    photoUrl: item.photoUrl,
    coverPhotoUrl: item.coverPhotoUrl,
    address: item.address,
    city: item.city,
    categoryName: item.categoryName,
    rating: item.rating,
    userRatingsTotal: item.userRatingsTotal,
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

function detectLocationIntent(input: {
  q: string;
  matchedCities: Array<{ id: string; name: string }>;
  haritalar: PlatformSearchResult[];
  sehir: PlatformSearchResult[];
  bilgiAgaci: PlatformSearchResult[];
  province: TurkeyCitySeed | null;
  district: { district: string; city: TurkeyCitySeed } | null;
  landmark: (typeof LANDMARK_PLACES)[number] | null;
}): boolean {
  if (input.matchedCities.length > 0) return true;
  if (input.province) return true;
  if (input.district) return true;
  if (input.landmark) return true;
  if (input.sehir.length > 0) return true;
  if (input.haritalar.some((item) => item.latitude != null && item.longitude != null)) return true;
  if (hasLocationQueryHints(input.q)) return true;
  const wordCount = normalizePlatformSearchQuery(input.q).split(" ").filter(Boolean).length;
  if (input.bilgiAgaci.length > 0 && wordCount <= 4) return true;
  return false;
}

function buildLocationContext(input: {
  q: string;
  matchedCities: Array<{ id: string; name: string }>;
  buckets: Record<UnifiedSearchSectionKey, PlatformSearchResult[]>;
  province: TurkeyCitySeed | null;
  district: { district: string; city: TurkeyCitySeed } | null;
  landmark: (typeof LANDMARK_PLACES)[number] | null;
}): UnifiedSearchLocationContext | null {
  const { q, matchedCities, buckets, province, district, landmark } = input;
  const locationIntent = detectLocationIntent({
    q,
    matchedCities,
    haritalar: buckets.haritalar,
    sehir: buckets.sehir,
    bilgiAgaci: buckets.bilgi_agaci,
    province,
    district,
    landmark,
  });
  if (!locationIntent) return null;

  const sehirItem = buckets.sehir[0] ?? null;
  const provinceName = province?.nameTr ?? province?.name ?? null;
  const cityName =
    sehirItem?.name ??
    landmark?.city ??
    district?.city.nameTr ??
    district?.city.name ??
    provinceName ??
    matchedCities[0]?.name ??
    null;

  let cityCard: UnifiedSearchLocationCityCard | null = null;
  if (cityName) {
    const seed =
      province ??
      district?.city ??
      TURKEY_CITY_SEED.find(
        (c) => normalizePlatformSearchQuery(c.nameTr ?? c.name) === normalizePlatformSearchQuery(cityName),
      ) ??
      null;
    cityCard = {
      id: sehirItem?.id ?? matchedCities[0]?.id ?? `city-${normalizePlatformSearchQuery(cityName)}`,
      name: cityName,
      imageUrl: sehirItem?.coverPhotoUrl ?? sehirItem?.photoUrl ?? null,
      description:
        sehirItem?.description ??
        landmark?.description ??
        (district ? `${district.district}, ${cityName} — harita ve yakın işletmeler.` : `${cityName} — harita ve yakın işletmeler.`),
      href: sehirItem?.href ?? `/map?q=${encodeURIComponent(cityName)}`,
      latitude: seed?.lat ?? landmark?.lat ?? null,
      longitude: seed?.lng ?? landmark?.lng ?? null,
      zoom: seed?.zoom ?? landmark?.zoom ?? null,
      district: landmark?.district ?? district?.district ?? null,
      region: seed?.region ?? null,
    };
  } else if (landmark) {
    cityCard = {
      id: `landmark-${normalizePlatformSearchQuery(landmark.label)}`,
      name: landmark.label,
      imageUrl: null,
      description: landmark.description,
      href: `/map?q=${encodeURIComponent(landmark.label)}`,
      latitude: landmark.lat,
      longitude: landmark.lng,
      zoom: landmark.zoom,
      district: landmark.district ?? null,
      region: null,
    };
  }

  const pureGeographic = isPureGeographicPlaceQuery({
    q,
    province,
    district,
    landmark,
    matchedCities,
    sehirCount: buckets.sehir.length,
  });

  const businesses: UnifiedSearchLocationBusinessCard[] = [];
  if (!pureGeographic) {
    const businessPool = [
      ...buckets.haritalar,
      ...buckets.sari_sayfalar,
      ...buckets.hizmetler,
      ...buckets.yemek_market,
    ];
    const seenBiz = new Set<string>();
    for (const item of businessPool) {
      const key = item.id.replace(/^map-pin-/, "");
      if (seenBiz.has(key)) continue;
      seenBiz.add(key);
      businesses.push(toLocationBusinessCard(item));
      if (businesses.length >= 5) break;
    }
  }

  const wikiItem = buckets.bilgi_agaci[0] ?? null;
  const wiki: UnifiedSearchLocationWikiCard | null = wikiItem
    ? {
        title: wikiItem.name,
        description: wikiItem.description,
        imageUrl: wikiItem.coverPhotoUrl ?? wikiItem.photoUrl,
        href: wikiItem.href,
      }
    : landmark
      ? {
          title: landmark.label,
          description: landmark.description,
          imageUrl: null,
          href: `/bilgiagaci?q=${encodeURIComponent(landmark.label)}`,
        }
      : null;

  const mapPreview = resolveMapPreview(q, matchedCities, buckets.haritalar, {
    province,
    district,
    landmark,
    cityCard,
    businesses,
    pureGeographic,
  });

  const label =
    landmark?.label ??
    (district ? `${district.district}, ${district.city.nameTr ?? district.city.name}` : null) ??
    cityName ??
    mapPreview?.label ??
    q;

  return {
    locationIntent: true,
    label,
    city: cityCard,
    district: landmark?.district ?? district?.district ?? null,
    businesses,
    wiki,
    mapPreview,
  };
}

function resolveMapPreview(
  q: string,
  cityRows: Array<{ name: string; id: string }>,
  mapItems: PlatformSearchResult[],
  geo?: {
    province: TurkeyCitySeed | null;
    district: { district: string; city: TurkeyCitySeed } | null;
    landmark: (typeof LANDMARK_PLACES)[number] | null;
    cityCard: UnifiedSearchLocationCityCard | null;
    businesses: UnifiedSearchLocationBusinessCard[];
    pureGeographic?: boolean;
  },
): UnifiedSearchMapPreview {
  if (geo?.landmark) {
    return {
      latitude: geo.landmark.lat,
      longitude: geo.landmark.lng,
      label: geo.landmark.label,
      href: `/map?q=${encodeURIComponent(geo.landmark.label)}`,
      zoom: geo.landmark.zoom,
    };
  }

  if (geo?.cityCard?.latitude != null && geo.cityCard.longitude != null) {
    return {
      latitude: geo.cityCard.latitude,
      longitude: geo.cityCard.longitude,
      label: geo.cityCard.district ? `${geo.cityCard.district}, ${geo.cityCard.name}` : geo.cityCard.name,
      href: geo.cityCard.href,
      zoom: geo.cityCard.zoom ?? (geo.district ? 14 : 11),
    };
  }

  if (geo?.district) {
    return {
      latitude: geo.district.city.lat,
      longitude: geo.district.city.lng,
      label: `${geo.district.district}, ${geo.district.city.nameTr ?? geo.district.city.name}`,
      href: `/map?q=${encodeURIComponent(`${geo.district.district} ${geo.district.city.nameTr ?? geo.district.city.name}`)}`,
      zoom: 14,
    };
  }

  if (geo?.province) {
    return {
      latitude: geo.province.lat,
      longitude: geo.province.lng,
      label: geo.province.nameTr ?? geo.province.name,
      href: `/map?q=${encodeURIComponent(geo.province.nameTr ?? geo.province.name)}`,
      zoom: geo.province.zoom,
    };
  }

  if (!geo?.pureGeographic) {
    const withCoords = mapItems.find((item) => item.latitude != null && item.longitude != null);
    if (withCoords?.latitude != null && withCoords.longitude != null) {
      return {
        latitude: withCoords.latitude,
        longitude: withCoords.longitude,
        label: withCoords.city ?? withCoords.name ?? q,
        href: `/map?q=${encodeURIComponent(q)}`,
        zoom: 14,
      };
    }

    const bizWithCoords = geo?.businesses.find((b) => b.latitude != null && b.longitude != null);
    if (bizWithCoords?.latitude != null && bizWithCoords.longitude != null) {
      return {
        latitude: bizWithCoords.latitude,
        longitude: bizWithCoords.longitude,
        label: bizWithCoords.city ?? bizWithCoords.name ?? q,
        href: `/map?q=${encodeURIComponent(q)}`,
        zoom: 14,
      };
    }
  }

  const city = cityRows[0];
  if (city) {
    const seed = TURKEY_CITY_SEED.find(
      (c) => normalizePlatformSearchQuery(c.nameTr ?? c.name) === normalizePlatformSearchQuery(city.name),
    );
    return {
      latitude: seed?.lat ?? 39.0,
      longitude: seed?.lng ?? 35.0,
      label: city.name,
      href: `/map?q=${encodeURIComponent(city.name)}`,
      zoom: seed?.zoom ?? 11,
    };
  }
  return null;
}

function stripHtmlTags(value: string): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wikiTitleToHrefSlug(title: string): string {
  return toWikiAsciiSlug(title);
}

type WikiSearchHit = { title: string; snippet: string };

async function searchWikiHitsForUnified(query: string, limit: number): Promise<WikiSearchHit[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    srnamespace: "0",
    format: "json",
    origin: "*",
  });
  try {
    const r = await fetch(`${WIKI_SEARCH_API}?${params}`, { headers: WIKI_HEADERS });
    const d = (await r.json()) as { query?: { search?: WikiSearchHit[] } };
    return (d.query?.search ?? []).filter((h) => h.title && !/^(Dosya|Kategori|Şablon|Taslak):/i.test(h.title));
  } catch {
    return [];
  }
}

async function fetchWikiSummaryThumb(title: string): Promise<string | null> {
  try {
    const r = await fetch(`${WIKI_REST}/page/summary/${encodeURIComponent(title)}`, { headers: WIKI_HEADERS });
    if (!r.ok) return null;
    const data = (await r.json()) as { thumbnail?: { source?: string }; type?: string };
    if (data.type === "disambiguation") return null;
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

const UNIFIED_SEARCH_DEADLINE_MS = Math.min(
  Math.max(Number(process.env.UNIFIED_SEARCH_DEADLINE_MS ?? 20_000) || 20_000, 12_000),
  24_000,
);

const UNIFIED_SEARCH_AI_BUDGET_MS = Math.min(
  Math.max(Number(process.env.GEMINI_UNIFIED_SEARCH_BUDGET_MS ?? 7_000) || 7_000, 3_000),
  12_000,
);

function awaitAiPayloadWithDeadline(
  promise: Promise<Awaited<ReturnType<typeof buildUnifiedSearchAiPayload>>>,
  remainingMs: number,
): Promise<Awaited<ReturnType<typeof buildUnifiedSearchAiPayload>>> {
  const timedOutPayload = (): Awaited<ReturnType<typeof buildUnifiedSearchAiPayload>> => ({
    aiSummary: null,
    webResults: [],
    model: null,
    enabled: true,
    meta: { timedOut: true, detail: "Gemini yanıt süresi aşıldı" },
  });
  if (remainingMs <= 0) {
    return Promise.resolve({
      ...timedOutPayload(),
      meta: { timedOut: true, detail: "Gemini yanıtı edge süre limiti nedeniyle atlandı" },
    });
  }
  return Promise.race([
    promise,
    new Promise<Awaited<ReturnType<typeof buildUnifiedSearchAiPayload>>>((resolve) => {
      setTimeout(() => resolve(timedOutPayload()), remainingMs);
    }),
  ]);
}

export async function runGroupedUnifiedSearch(input: {
  q: string;
  city?: string;
  perSection?: number;
}): Promise<GroupedUnifiedSearchResponse> {
  const q = String(input.q ?? "").trim();
  const city = String(input.city ?? "").trim();
  const perSection = Math.min(Math.max(input.perSection ?? 8, 1), 24);
  const fetchLimit = Math.min(perSection * 3, 48);

  if (!q) {
    return { query: q, sections: [], totalResults: 0, aiSummary: null, internetSearchEnabled: false };
  }

  const startedAt = Date.now();
  const aiPayloadPromise = buildUnifiedSearchAiPayload(q, { budgetMs: UNIFIED_SEARCH_AI_BUDGET_MS }).catch(
    (err: unknown) => ({
      aiSummary: null,
      webResults: [],
      model: null,
      enabled: false,
      meta: {
        detail: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      },
    }),
  );
  const mediaPayloadPromise = fetchDdgMediaSearch(q, {
    imageLimit: 24,
    videoLimit: 12,
    timeoutMs: 7_000,
  }).catch(() => ({ images: [] as DdgImageResult[], videos: [] as DdgVideoResult[] }));

  const buckets = emptySections();
  const linkedMapIds = new Set<string>();
  const seenIds = new Set<string>();
  const matchedCities: Array<{ id: string; name: string; code?: string | null }> = [];

  const pushItem = (section: UnifiedSearchSectionKey, item: PlatformSearchResult) => {
    if (seenIds.has(item.id)) return;
    seenIds.add(item.id);
    buckets[section].push(item);
  };

  const textCond = mapBusinessUnifiedTextCondition(q);
  const mapConditions: SQL[] = [eq(mapBusinessesTable.isActive, true)];
  if (textCond) mapConditions.push(textCond);
  if (city) {
    mapConditions.push(or(
      ilike(mapCitiesTable.name, `%${city}%`),
      ilike(mapBusinessesTable.address, `%${city}%`),
    )!);
  }

  const mapRows = await db
    .select({
      business: mapBusinessesTable,
      category: mapCategoriesTable,
      city: mapCitiesTable,
      hasPublicProfile: MAP_HAS_PUBLIC_PROFILE,
    })
    .from(mapBusinessesTable)
    .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
    .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
    .where(and(...mapConditions))
    .orderBy(desc(mapBusinessesTable.isPremium), desc(mapBusinessesTable.userRatingsTotal), desc(mapBusinessesTable.createdAt))
    .limit(fetchLimit * 2);

  for (const row of mapRows) {
    const b = row.business;
    const id = String(b.id ?? "");
    if (!id) continue;
    linkedMapIds.add(id);
    const categoryName = row.category?.name ?? null;
    const hasPublicProfile = Boolean(row.hasPublicProfile);
    const typeLabel = mapBusinessTypeLabel({
      homepageSuperCategory: b.homepageSuperCategory,
      storeType: b.storeType,
      importSource: b.importSource,
      categoryName,
    });
    const section = mapBusinessSectionKey(typeLabel, b);
    const item: PlatformSearchResult = {
      id,
      name: String(b.name ?? ""),
      slug: b.slug ?? null,
      resultType: section === "otomotiv" ? "otomotiv" : "map_business",
      typeLabel,
      href: mapBusinessDetailHref(b.slug ?? null, id, hasPublicProfile),
      address: b.address ?? null,
      city: row.city?.name ?? null,
      district: null,
      description: b.description ?? null,
      rating: b.rating ?? null,
      userRatingsTotal: b.userRatingsTotal ?? null,
      photoUrl: b.photoUrl ?? null,
      coverPhotoUrl: b.coverPhotoUrl ?? b.photoUrl ?? null,
      categoryName,
      homepageSuperCategory: b.homepageSuperCategory ?? null,
      storeType: b.storeType ?? null,
      hasPublicProfile,
      googlePlaceId: b.googlePlaceId ?? null,
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
      phone: b.phone ?? null,
    };
    pushItem(section, item);
    if (b.latitude != null && b.longitude != null) {
      pushItem("haritalar", {
        ...item,
        id: `map-pin-${id}`,
        resultType: "map_pin",
        typeLabel: "Harita",
        href: `/map?nav=${encodeURIComponent(id)}`,
      });
    }
  }

  const terms = expandPlatformSearchTerms(q);

  try {
    const cityOrParts: SQL[] = [];
    for (const term of terms) {
      const pattern = `%${term}%`;
      cityOrParts.push(ilike(mapCitiesTable.name, pattern), ilike(mapCitiesTable.code, pattern));
    }
    const cityRows = await db
      .select({
        id: mapCitiesTable.id,
        name: mapCitiesTable.name,
        imageUrl: mapCitiesTable.imageUrl,
        code: mapCitiesTable.code,
      })
      .from(mapCitiesTable)
      .where(and(eq(mapCitiesTable.isActive, true), or(...cityOrParts)!))
      .orderBy(asc(mapCitiesTable.sortOrder), asc(mapCitiesTable.name))
      .limit(fetchLimit);
    for (const row of cityRows) {
      const id = String(row.id ?? "");
      const name = String(row.name ?? "");
      if (!id || !name) continue;
      matchedCities.push({ id, name, code: row.code ?? null });
      pushItem("sehir", {
        id: `city-${id}`,
        name,
        slug: null,
        resultType: "city",
        typeLabel: "Şehir",
        href: `/map?q=${encodeURIComponent(name)}`,
        address: null,
        city: name,
        district: null,
        description: `${name} şehri — harita, işletmeler ve rehber.`,
        rating: null,
        userRatingsTotal: null,
        photoUrl: row.imageUrl ?? null,
        coverPhotoUrl: row.imageUrl ?? null,
        categoryName: "Şehir",
        homepageSuperCategory: null,
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
      });
    }
  } catch {
    /* şehirler yok */
  }

  try {
    const otomotivOrParts: SQL[] = [];
    for (const term of terms) {
      const pattern = `%${term}%`;
      otomotivOrParts.push(
        sql`ob.name ILIKE ${pattern}`,
        sql`ob.description ILIKE ${pattern}`,
        sql`ob.city ILIKE ${pattern}`,
        sql`ob.business_type ILIKE ${pattern}`,
        sql`ob.servis_category_slug ILIKE ${pattern}`,
      );
    }
    const otomotivCityCond = city
      ? sql`AND (ob.city ILIKE ${`%${city}%`} OR ob.address ILIKE ${`%${city}%`})`
      : sql``;
    const otomotivR = await db.execute(sql`
      SELECT ob.id, ob.name, ob.slug, ob.business_type, ob.city, ob.district, ob.phone, ob.address,
             ob.description, ob.image_url, ob.map_business_id
      FROM otomotiv_businesses ob
      WHERE ob.status = 'active'
        AND (${or(...otomotivOrParts)!})
        ${otomotivCityCond}
      ORDER BY ob.is_featured DESC NULLS LAST, ob.created_at DESC
      LIMIT ${fetchLimit}
    `);
    for (const raw of otomotivR.rows) {
      const row = raw as Record<string, unknown>;
      const mapId = String(row.map_business_id ?? "").trim();
      if (mapId && linkedMapIds.has(mapId)) continue;
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "").trim() || null;
      pushItem("otomotiv", {
        id: mapId || `otomotiv-${id}`,
        name: String(row.name ?? ""),
        slug,
        resultType: "otomotiv",
        typeLabel: otomotivBusinessTypeLabel(String(row.business_type ?? "")),
        href: otomotivDetailHref(String(row.business_type ?? ""), slug, q),
        address: String(row.address ?? "") || null,
        city: String(row.city ?? "") || null,
        district: String(row.district ?? "") || null,
        description: String(row.description ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: String(row.image_url ?? "") || null,
        coverPhotoUrl: String(row.image_url ?? "") || null,
        categoryName: otomotivBusinessTypeLabel(String(row.business_type ?? "")),
        homepageSuperCategory: "otomotiv",
        storeType: null,
        hasPublicProfile: Boolean(slug),
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: String(row.phone ?? "") || null,
      });
    }
  } catch {
    /* tablo yok */
  }

  try {
    const listingOrParts: SQL[] = [];
    for (const term of terms) {
      const pattern = `%${term}%`;
      listingOrParts.push(
        sql`ol.title ILIKE ${pattern}`,
        sql`ol.description ILIKE ${pattern}`,
        sql`vb.name ILIKE ${pattern}`,
        sql`vm.name ILIKE ${pattern}`,
        sql`ob.name ILIKE ${pattern}`,
      );
    }
    const listingCityCond = city ? sql`AND ob.city ILIKE ${`%${city}%`}` : sql``;
    const listingR = await db.execute(sql`
      SELECT ol.id, ol.slug, ol.title, ol.price, ol.year, ol.km,
             (ol.photos_json->>0) AS image_url,
             ob.business_type, ob.city, vb.name AS brand_name, vm.name AS model_name
      FROM otomotiv_listings ol
      JOIN otomotiv_businesses ob ON ob.id = ol.business_id AND ob.status = 'active'
      LEFT JOIN vehicle_brands vb ON vb.id = ol.brand_id
      LEFT JOIN vehicle_models vm ON vm.id = ol.model_id
      WHERE ol.status = 'active'
        AND (${or(...listingOrParts)!})
        ${listingCityCond}
      ORDER BY ol.is_featured DESC NULLS LAST, ol.created_at DESC
      LIMIT ${fetchLimit}
    `);
    for (const raw of listingR.rows) {
      const row = raw as Record<string, unknown>;
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "").trim() || null;
      const brand = String(row.brand_name ?? "");
      const model = String(row.model_name ?? "");
      const title = String(row.title ?? (`${brand} ${model}`.trim() || "Araç ilanı"));
      pushItem("otomotiv", {
        id: `otomotiv-listing-${id}`,
        name: title,
        slug,
        resultType: "otomotiv_listing",
        typeLabel: "Araç İlanı",
        href: otomotivListingHref(String(row.business_type ?? ""), slug),
        address: null,
        city: String(row.city ?? "") || null,
        district: null,
        description: [row.year, row.km != null ? `${row.km} km` : null].filter(Boolean).join(" · ") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: String(row.image_url ?? "") || null,
        coverPhotoUrl: String(row.image_url ?? "") || null,
        categoryName: "Araç İlanı",
        homepageSuperCategory: "otomotiv",
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        price: typeof row.price === "number" ? row.price : Number(row.price) || null,
        subtitle: brand && model ? `${brand} ${model}` : null,
      });
    }
  } catch {
    /* tablo yok */
  }

  const vendorTerms = terms.length ? terms : [q];
  const vendorOr = vendorTerms.flatMap((term) => [
    ilike(vendorsTable.name, `%${term}%`),
    ilike(vendorsTable.city, `%${term}%`),
    ilike(vendorsTable.district, `%${term}%`),
    ilike(vendorsTable.address, `%${term}%`),
    ilike(vendorsTable.description, `%${term}%`),
  ]);
  const vendorConditions: SQL[] = [eq(vendorsTable.active, true), or(...vendorOr)!];
  if (city) vendorConditions.push(ilike(vendorsTable.city, `%${city}%`));

  try {
    const vendorRows = await db
      .select()
      .from(vendorsTable)
      .where(and(...vendorConditions))
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.rating))
      .limit(fetchLimit);

    for (const v of vendorRows) {
      const linked = String(v.linkedMapBusinessId ?? "").trim();
      if (linked && linkedMapIds.has(linked)) continue;
      const { resultType, typeLabel } = vendorTypeLabel(v.vendorType);
      const section: UnifiedSearchSectionKey =
        resultType === "vendor_shop" ? "urunler"
          : (resultType === "vendor_food" || resultType === "vendor_grocery") ? "yemek_market"
            : "hizmetler";
      pushItem(section, {
        id: `vendor-${v.id}`,
        name: String(v.name ?? ""),
        slug: v.slug ?? null,
        resultType,
        typeLabel,
        href: vendorDetailHref(v.slug ?? null, v.vendorType),
        address: v.address ?? null,
        city: v.city ?? null,
        district: v.district ?? null,
        description: v.description ?? null,
        rating: v.rating ?? null,
        userRatingsTotal: v.reviewCount ?? null,
        photoUrl: v.imageUrl ?? null,
        coverPhotoUrl: v.coverUrl ?? v.imageUrl ?? null,
        categoryName: typeLabel,
        homepageSuperCategory: "siparis",
        storeType: v.vendorType ?? null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: v.phone ?? null,
      });
    }
  } catch {
    /* vendors yok */
  }

  try {
    const productOrParts: SQL[] = [];
    for (const term of vendorTerms) {
      const pattern = `%${term}%`;
      productOrParts.push(
        sql`mi.name ILIKE ${pattern}`,
        sql`mi.description ILIKE ${pattern}`,
        sql`v.name ILIKE ${pattern}`,
      );
    }
    const productR = await db.execute(sql`
      SELECT mi.id, mi.name, mi.description, mi.price, mi.sale_price, mi.image_url,
             v.name AS vendor_name, v.slug AS vendor_slug
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      WHERE v.active = true
        AND mi.active = true
        AND v.vendor_type = 'ecommerce'
        AND (${or(...productOrParts)!})
      ORDER BY mi.is_popular DESC, mi.updated_at DESC NULLS LAST
      LIMIT ${fetchLimit}
    `);
    for (const raw of productR.rows) {
      const row = raw as Record<string, unknown>;
      const id = String(row.id ?? "");
      const name = String(row.name ?? "");
      pushItem("urunler", {
        id: `product-${id}`,
        name,
        slug: slugifyTr(name),
        resultType: "product",
        typeLabel: "Ürün",
        href: `/magaza/urun/${id}-${slugifyTr(name)}`,
        address: null,
        city: null,
        district: null,
        description: String(row.description ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: String(row.image_url ?? "") || null,
        coverPhotoUrl: String(row.image_url ?? "") || null,
        categoryName: "Ürün",
        homepageSuperCategory: null,
        storeType: "ecommerce",
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        price: typeof row.sale_price === "number" ? row.sale_price : Number(row.sale_price ?? row.price) || null,
        subtitle: String(row.vendor_name ?? "") || null,
      });
    }
  } catch {
    /* ürünler yok */
  }

  try {
    const tourismOrParts: SQL[] = [];
    for (const term of terms) {
      const pattern = `%${term}%`;
      tourismOrParts.push(
        sql`tl.title ILIKE ${pattern}`,
        sql`tl.description ILIKE ${pattern}`,
        sql`tl.city ILIKE ${pattern}`,
        sql`tl.slug ILIKE ${pattern}`,
      );
    }
    const tourismCityCond = city ? sql`AND tl.city ILIKE ${`%${city}%`}` : sql``;
    const tourismR = await db.execute(sql`
      SELECT tl.id, tl.slug, tl.title, tl.type, tl.city, tl.price, tl.image_url, tl.description
      FROM tourism_listings tl
      WHERE tl.status = 'active'
        AND (${or(...tourismOrParts)!})
        ${tourismCityCond}
      ORDER BY tl.created_at DESC
      LIMIT ${fetchLimit}
    `);
    for (const raw of tourismR.rows) {
      const row = raw as Record<string, unknown>;
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "").trim() || null;
      const listingType = String(row.type ?? "hotel");
      pushItem("seyahat", {
        id: `tourism-${id}`,
        name: String(row.title ?? ""),
        slug,
        resultType: "tourism",
        typeLabel: tourismTypeLabel(listingType),
        href: tourismListingHref(listingType, slug),
        address: null,
        city: String(row.city ?? "") || null,
        district: null,
        description: String(row.description ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: String(row.image_url ?? "") || null,
        coverPhotoUrl: String(row.image_url ?? "") || null,
        categoryName: tourismTypeLabel(listingType),
        homepageSuperCategory: "seyahat",
        storeType: listingType,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        price: typeof row.price === "number" ? row.price : Number(row.price) || null,
      });
    }
  } catch {
    /* turizm yok */
  }

  const newsTerms = terms.length ? terms : [q];
  try {
    const newsOr = newsTerms.flatMap((term) => [
      ilike(newsTable.title, `%${term}%`),
      ilike(newsTable.spot, `%${term}%`),
    ]);
    const newsRows = await getNewsDbForRead()
      .select({
        id: newsTable.id,
        title: newsTable.title,
        slug: newsTable.slug,
        spot: newsTable.spot,
        imageUrl: newsTable.imageUrl,
        siteId: newsTable.siteId,
        createdAt: newsTable.createdAt,
      })
      .from(newsTable)
      .where(and(eq(newsTable.status, "published"), isNull(newsTable.siteId), or(...newsOr)!))
      .orderBy(desc(newsTable.isFeatured), desc(newsTable.createdAt))
      .limit(fetchLimit);

    for (const row of newsRows) {
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "").trim() || null;
      pushItem("haberler", {
        id: `news-${id}`,
        name: String(row.title ?? ""),
        slug,
        resultType: "news",
        typeLabel: "Haber",
        href: `/haber/${encodeURIComponent(slug || id)}`,
        address: null,
        city: null,
        district: null,
        description: String(row.spot ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: row.imageUrl ?? null,
        coverPhotoUrl: row.imageUrl ?? null,
        categoryName: "Haber",
        homepageSuperCategory: null,
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
      });
    }
  } catch {
    /* haberler yok */
  }

  try {
    const hmSiteOr = newsTerms.flatMap((term) => [
      ilike(hmNewsSitesTable.displayName, `%${term}%`),
      ilike(hmNewsSitesTable.description, `%${term}%`),
      ilike(hmNewsSitesTable.slug, `%${term}%`),
      ilike(hmNewsSitesTable.domain, `%${term}%`),
    ]);
    const hmSiteRows = await getNewsDbForRead()
      .select({
        id: hmNewsSitesTable.id,
        slug: hmNewsSitesTable.slug,
        displayName: hmNewsSitesTable.displayName,
        description: hmNewsSitesTable.description,
      })
      .from(hmNewsSitesTable)
      .where(and(eq(hmNewsSitesTable.active, true), or(...hmSiteOr)!))
      .orderBy(desc(hmNewsSitesTable.updatedAt))
      .limit(fetchLimit);

    for (const site of hmSiteRows) {
      const siteId = Number(site.id ?? 0);
      const siteSlug = String(site.slug ?? "").trim();
      if (!siteId || !siteSlug) continue;
      pushItem("hm_bagli_siteler", {
        id: `hm-site-${siteId}`,
        name: String(site.displayName ?? siteSlug),
        slug: siteSlug,
        resultType: "hm_site",
        typeLabel: "Bağlı Site",
        href: hmSitePublicHref(siteSlug),
        address: null,
        city: null,
        district: null,
        description: String(site.description ?? "") || `${site.displayName} — Yekpare bağlı haber sitesi.`,
        rating: null,
        userRatingsTotal: null,
        photoUrl: null,
        coverPhotoUrl: null,
        categoryName: "Bağlı Site",
        homepageSuperCategory: null,
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        hmSiteName: String(site.displayName ?? siteSlug),
        hmSiteSlug: siteSlug,
      });
    }

    const hmNewsOr = newsTerms.flatMap((term) => [
      ilike(newsTable.title, `%${term}%`),
      ilike(newsTable.spot, `%${term}%`),
    ]);
    const hmNewsRows = await getNewsDbForRead()
      .select({
        id: newsTable.id,
        title: newsTable.title,
        slug: newsTable.slug,
        spot: newsTable.spot,
        imageUrl: newsTable.imageUrl,
        siteId: newsTable.siteId,
        siteSlug: hmNewsSitesTable.slug,
        siteName: hmNewsSitesTable.displayName,
      })
      .from(newsTable)
      .innerJoin(hmNewsSitesTable, eq(newsTable.siteId, hmNewsSitesTable.id))
      .where(
        and(
          eq(newsTable.status, "published"),
          isNotNull(newsTable.siteId),
          eq(hmNewsSitesTable.active, true),
          or(...hmNewsOr)!,
        ),
      )
      .orderBy(desc(newsTable.createdAt))
      .limit(fetchLimit);

    for (const row of hmNewsRows) {
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "").trim() || null;
      const siteSlug = String(row.siteSlug ?? "").trim();
      if (!siteSlug) continue;
      pushItem("hm_bagli_siteler", {
        id: `hm-news-${id}`,
        name: String(row.title ?? ""),
        slug,
        resultType: "news",
        typeLabel: "Haber",
        href: hmSitePublicHref(siteSlug, `haber/${encodeURIComponent(slug || id)}`),
        address: null,
        city: null,
        district: null,
        description: String(row.spot ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: row.imageUrl ?? null,
        coverPhotoUrl: row.imageUrl ?? null,
        categoryName: "Haber",
        homepageSuperCategory: null,
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        hmSiteName: String(row.siteName ?? siteSlug),
        hmSiteSlug: siteSlug,
      });
    }

    const hmMakaleOr = newsTerms.flatMap((term) => [
      ilike(hmMakalelerTable.title, `%${term}%`),
      ilike(hmMakalelerTable.spot, `%${term}%`),
      ilike(hmMakalelerTable.content, `%${term}%`),
    ]);
    const hmMakaleRows = await getNewsDbForRead()
      .select({
        id: hmMakalelerTable.id,
        title: hmMakalelerTable.title,
        slug: hmMakalelerTable.slug,
        spot: hmMakalelerTable.spot,
        imageUrl: hmMakalelerTable.imageUrl,
        siteSlug: hmNewsSitesTable.slug,
        siteName: hmNewsSitesTable.displayName,
      })
      .from(hmMakalelerTable)
      .innerJoin(hmNewsSitesTable, eq(hmMakalelerTable.siteId, hmNewsSitesTable.id))
      .where(
        and(
          eq(hmMakalelerTable.status, "published"),
          eq(hmNewsSitesTable.active, true),
          or(...hmMakaleOr)!,
        ),
      )
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(fetchLimit);

    for (const row of hmMakaleRows) {
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "").trim() || null;
      const siteSlug = String(row.siteSlug ?? "").trim();
      if (!siteSlug) continue;
      pushItem("hm_bagli_siteler", {
        id: `hm-makale-${id}`,
        name: String(row.title ?? ""),
        slug,
        resultType: "hm_makale",
        typeLabel: "Köşe Yazısı",
        href: hmSitePublicHref(siteSlug, `haber/${encodeURIComponent(slug || id)}`),
        address: null,
        city: null,
        district: null,
        description: String(row.spot ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: row.imageUrl ?? null,
        coverPhotoUrl: row.imageUrl ?? null,
        categoryName: "Köşe Yazısı",
        homepageSuperCategory: null,
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        hmSiteName: String(row.siteName ?? siteSlug),
        hmSiteSlug: siteSlug,
      });
    }
  } catch {
    /* HM siteler yok */
  }

  try {
    const searchResult = await searchYektubeVideos(q, {
      limit: fetchLimit,
      excludeStories: true,
      importFromYoutube: true,
    });

    for (const row of searchResult.items) {
      const id = String(row.id ?? "");
      const sourceId = row.sourceId;
      const youtubeId = String(row.videoId ?? "").trim();
      const href =
        sourceId && youtubeId
          ? `/yektube/kanal/${sourceId}/${encodeURIComponent(youtubeId)}`
          : sourceId
            ? `/yektube/kanal/${sourceId}`
            : "/yektube";
      pushItem("yektube", {
        id: `video-${id}`,
        name: String(row.title ?? ""),
        slug: youtubeId || null,
        resultType: "yektube_video",
        typeLabel: "Video",
        href,
        address: null,
        city: null,
        district: null,
        description: String(row.description ?? "") || null,
        rating: null,
        userRatingsTotal: null,
        photoUrl: row.thumbnail ?? null,
        coverPhotoUrl: row.thumbnail ?? null,
        categoryName: "YekTube",
        homepageSuperCategory: null,
        storeType: null,
        hasPublicProfile: true,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        phone: null,
        subtitle: String(row.channelName ?? "") || null,
      });
    }
  } catch {
    /* yektube yok */
  }

  const provinceMatch = findTurkeyProvinceInQuery(q);
  const districtMatch = findDistrictInQuery(q);
  const landmarkMatch = findLandmarkInQuery(q);

  try {
    const wikiHits = await searchWikiHitsForUnified(q, fetchLimit);
    await pushWikiHitsToBucket(wikiHits, perSection, pushItem);
  } catch {
    /* bilgi ağacı yok */
  }

  if (buckets.bilgi_agaci.length === 0) {
    const fallbackQueries = [
      landmarkMatch?.label,
      provinceMatch?.nameTr ?? provinceMatch?.name,
      districtMatch ? `${districtMatch.district} ${districtMatch.city.nameTr ?? districtMatch.city.name}` : null,
      q,
    ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
    for (const fallbackQuery of fallbackQueries) {
      try {
        const wikiHits = await searchWikiHitsForUnified(fallbackQuery, fetchLimit);
        if (!wikiHits.length) continue;
        await pushWikiHitsToBucket(wikiHits, perSection, pushItem);
        break;
      } catch {
        /* sonraki sorguyu dene */
      }
    }
  }

  const aiRemainingMs = Math.max(500, UNIFIED_SEARCH_DEADLINE_MS - (Date.now() - startedAt));
  const [aiPayload, mediaPayload] = await Promise.all([
    awaitAiPayloadWithDeadline(aiPayloadPromise, aiRemainingMs),
    mediaPayloadPromise,
  ]);
  const externalImages = mapDdgImages(mediaPayload.images);
  const externalVideos = mapDdgVideos(mediaPayload.videos);
  for (const web of aiPayload.webResults.slice(0, perSection)) {
    pushItem("internet", {
      id: web.id,
      name: web.title,
      slug: null,
      resultType: "web_result",
      typeLabel: "İnternet",
      href: web.url,
      address: null,
      city: null,
      district: null,
      description: web.snippet,
      rating: null,
      userRatingsTotal: null,
      photoUrl: null,
      coverPhotoUrl: null,
      categoryName: "Web",
      homepageSuperCategory: null,
      storeType: null,
      hasPublicProfile: false,
      googlePlaceId: null,
      latitude: null,
      longitude: null,
      phone: null,
      subtitle: web.url,
    });
  }

  const sections: UnifiedSearchSection[] = [];
  let totalResults = 0;
  for (const key of SECTION_ORDER) {
    const allItems = buckets[key];
    if (!allItems.length) continue;
    totalResults += allItems.length;
    const meta = SECTION_META[key];
    sections.push({
      key,
      title: meta.title,
      total: allItems.length,
      seeAllHref: meta.seeAll(q, city),
      items: allItems.slice(0, perSection),
    });
  }

  const locationContext = buildLocationContext({
    q,
    matchedCities,
    buckets,
    province: provinceMatch,
    district: districtMatch,
    landmark: landmarkMatch,
  });

  const mapPreview =
    locationContext?.mapPreview ??
    resolveMapPreview(q, matchedCities, buckets.haritalar, {
      province: provinceMatch,
      district: districtMatch,
      landmark: landmarkMatch,
      cityCard: null,
      businesses: [],
    });

  const cityLabel =
    locationContext?.city?.name ??
    provinceMatch?.nameTr ??
    provinceMatch?.name ??
    matchedCities[0]?.name ??
    landmarkMatch?.city ??
    null;

  const cityQuickFacts = buildCityQuickFacts({
    cityName: cityLabel,
    cityCode: matchedCities[0]?.code ?? null,
    region: locationContext?.city?.region ?? provinceMatch?.region ?? null,
  });

  const relatedSearches = buildRelatedSearches(q, cityLabel ?? landmarkMatch?.label ?? q);
  const siteGalleryImages = collectGalleryImages(buckets);

  return {
    query: q,
    sections,
    totalResults,
    aiSummary: aiPayload.aiSummary,
    aiModel: aiPayload.model,
    internetSearchEnabled: aiPayload.enabled || externalImages.length > 0 || externalVideos.length > 0,
    searchMeta: {
      ai: aiPayload.meta,
      elapsedMs: Date.now() - startedAt,
      media: {
        imageCount: externalImages.length,
        videoCount: externalVideos.length,
        source: externalImages.length || externalVideos.length ? "duckduckgo" : undefined,
      },
    },
    mapPreview,
    locationContext,
    aiGalleryImages: mergeGalleryImageUrls(siteGalleryImages, externalImages),
    externalImages,
    externalVideos,
    relatedSearches,
    cityQuickFacts: locationContext || landmarkMatch ? cityQuickFacts : null,
  };
}

/** Düz liste — Keşfet liste sayfası uyumluluğu */
export async function runPlatformUnifiedSearch(input: {
  q: string;
  city?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: PlatformSearchResult[]; total: number }> {
  const grouped = await runGroupedUnifiedSearch({ q: input.q, city: input.city, perSection: 100 });
  const flat = grouped.sections.flatMap((s) => s.items);
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  return {
    data: flat.slice(offset, offset + limit),
    total: grouped.totalResults,
  };
}
