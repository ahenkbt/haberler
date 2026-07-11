import { KESFET_DISCOVER_GROUPS, type KesfetDiscoverGroup } from "./kesfetDiscoverCategories";

export type SariSayfalarListParams = {
  q?: string;
  city?: string;
  district?: string;
  category?: string;
  page?: number;
  featured?: boolean;
  superCategory?: string;
};

export type InsaatfirmalarimCatalogCategory = {
  slug: string;
  label: string;
  storeType?: string;
};

export type SariSayfalarSidebarSub = {
  id: string;
  slug: string;
  name: string;
  /** `/map/businesses?category=` değeri */
  filterCategory: string;
  /** Alt kategori anahtar-kelime araması gerekiyorsa */
  filterKeyword?: string;
};

export type SariSayfalarSidebarTop = {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  kind: "map" | "insaat" | "discover";
  subcategories: SariSayfalarSidebarSub[];
};

/** Sarı Sayfalar üst kategori — insaatfirmalarim.com 29 alt kategori */
export const SARI_SAYFALAR_INSAAT_TOP: SariSayfalarSidebarTop = {
  id: "insaat-firmalari",
  slug: "insaat-firmalari",
  name: "İnşaat Firmaları",
  icon: "🏗️",
  kind: "insaat",
  subcategories: [],
};

/** map_categories.slug → Keşfet dizin grubu anahtarı */
export const MAP_CATEGORY_DISCOVER_GROUP_KEY: Record<string, string> = {
  kafeler: "eglence",
  restoranlar: "eglence",
  hastaneler: "saglik",
  otomotiv: "otomotiv",
  marketler: "ev",
  hizmetler: "hizmetler",
  eglence: "eglence",
  elektronik: "ev",
  "moda-giyim": "ev",
  "alisveris-merkezleri": "ev",
  oteller: "eglence",
  "benzin-istasyonu": "hizmetler",
};

export function isInsaatfirmalarimCategorySlug(slug: string): boolean {
  const s = slug.trim().toLocaleLowerCase("tr-TR");
  return s === SARI_SAYFALAR_INSAAT_TOP.slug || s.startsWith("insaat:");
}

export function buildInsaatSidebarSubcategories(
  catalog: InsaatfirmalarimCatalogCategory[],
): SariSayfalarSidebarSub[] {
  return catalog.map((cat) => ({
    id: `insaat:${cat.slug}`,
    slug: cat.slug,
    name: cat.label,
    filterCategory: cat.slug,
  }));
}

function discoverSubsForGroup(group: KesfetDiscoverGroup): SariSayfalarSidebarSub[] {
  return (group.subcategories ?? []).map((sub) => ({
    id: `discover:${group.key}:${sub.slug}`,
    slug: sub.slug,
    name: sub.name,
    filterCategory: "",
    filterKeyword: sub.googleKeyword || sub.name,
  }));
}

export function buildSariSayfalarSidebarTops(input: {
  mapCategories: Array<{ id: string; name: string; slug?: string | null; icon?: string | null }>;
  insaatCatalog?: InsaatfirmalarimCatalogCategory[];
  discoverGroups?: KesfetDiscoverGroup[];
}): SariSayfalarSidebarTop[] {
  const discoverGroups = input.discoverGroups ?? KESFET_DISCOVER_GROUPS;
  const discoverByKey = new Map(discoverGroups.map((g) => [g.key, g]));
  const tops: SariSayfalarSidebarTop[] = input.mapCategories.map((cat) => {
    const slug = String(cat.slug || cat.id).trim();
    const groupKey = MAP_CATEGORY_DISCOVER_GROUP_KEY[slug.toLocaleLowerCase("tr-TR")];
    const group = groupKey ? discoverByKey.get(groupKey) : undefined;
    return {
      id: cat.id,
      slug,
      name: cat.name,
      icon: cat.icon,
      kind: "map",
      subcategories: group ? discoverSubsForGroup(group) : [],
    };
  });

  const insaatTop: SariSayfalarSidebarTop = {
    ...SARI_SAYFALAR_INSAAT_TOP,
    subcategories: buildInsaatSidebarSubcategories(input.insaatCatalog ?? []),
  };
  if (!tops.some((t) => t.slug === insaatTop.slug)) {
    tops.push(insaatTop);
  }
  return tops.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function resolveSariSayfalarActiveTop(
  appliedCategory: string,
  appliedQ: string,
  tops: SariSayfalarSidebarTop[],
): SariSayfalarSidebarTop | null {
  const cat = appliedCategory.trim();
  if (cat) {
    if (isInsaatfirmalarimCategorySlug(cat) || tops.some((t) => t.kind === "insaat" && t.subcategories.some((s) => s.filterCategory === cat))) {
      return tops.find((t) => t.kind === "insaat") ?? SARI_SAYFALAR_INSAAT_TOP;
    }
    const direct = tops.find((t) => t.id === cat || t.slug === cat);
    if (direct) return direct;
    for (const top of tops) {
      if (top.subcategories.some((s) => s.filterCategory === cat || s.slug === cat)) return top;
    }
  }
  const q = appliedQ.trim();
  if (q) {
    for (const top of tops) {
      if (top.subcategories.some((s) => s.name === q || s.filterKeyword === q)) return top;
    }
  }
  return null;
}

export function resolveSariSayfalarActiveSubSlug(
  appliedCategory: string,
  appliedQ: string,
  activeTop: SariSayfalarSidebarTop | null,
): string {
  const cat = appliedCategory.trim();
  if (!activeTop) return "";
  if (cat && cat !== activeTop.slug && cat !== activeTop.id) {
    const sub = activeTop.subcategories.find(
      (s) => s.filterCategory === cat || s.slug === cat || s.filterKeyword === cat,
    );
    if (sub) return sub.slug;
    if (activeTop.kind === "insaat") return cat;
  }
  const q = appliedQ.trim();
  if (q) {
    const sub = activeTop.subcategories.find((s) => s.name === q || s.filterKeyword === q);
    if (sub) return sub.slug;
  }
  return "";
}

export function buildSariSayfalarListPath({
  q = "",
  city = "",
  district = "",
  category = "",
  page = 1,
  featured = false,
  superCategory = "",
}: SariSayfalarListParams): string {
  const params = new URLSearchParams();
  const kw = q.trim();
  const c = city.trim();
  const d = district.trim();
  const cat = category.trim();
  const superCat = superCategory.trim();
  if (kw) params.set("q", kw);
  if (c) params.set("city", c);
  if (d) params.set("district", d);
  if (cat) params.set("category", cat);
  if (featured) params.set("featured", "1");
  if (superCat) params.set("superCategory", superCat);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/kesfet/sarisayfalar?${qs}` : "/kesfet/sarisayfalar";
}

export function buildSariSayfalarResultTitle(
  city: string,
  district: string,
  keywords: string,
  categoryLabel: string,
  total: number,
): string {
  const loc = district.trim() || city.trim();
  const subject = keywords.trim() || categoryLabel.trim() || "Firmalar";
  return `${loc} ${subject} — ${total.toLocaleString("tr-TR")} sonuç`;
}

/** Detay sayfası — slug varsa SEO-dostu URL, yoksa tam UUID. */
export function buildSariSayfalarDetailPath(biz: { id: string; slug?: string | null }): string {
  const slug = String(biz.slug ?? "").trim();
  if (slug) return `/kesfet/sarisayfalar/${encodeURIComponent(slug)}`;
  const id = String(biz.id ?? "").trim();
  return `/kesfet/sarisayfalar/${encodeURIComponent(id)}`;
}

export function buildSariSayfalarSeoTitle(
  city: string,
  district: string,
  keywords: string,
  categoryLabel: string,
): string {
  const loc = [district.trim(), city.trim()].filter(Boolean).join(", ");
  const subject = keywords.trim() || categoryLabel.trim() || "Firma rehberi";
  return loc ? `${subject} — ${loc} | Sarı Sayfalar` : `${subject} | Yekpare Sarı Sayfalar`;
}

export function buildSariSayfalarGeoSeoText(
  cityName: string,
  districtName: string,
  categoryName: string,
  resultCount: number,
): string {
  const location = districtName.trim()
    ? `${districtName.trim()}, ${cityName.trim()}`
    : cityName.trim() || "Türkiye";
  const category = categoryName.trim() || "işletme ve hizmet";
  if (!cityName.trim()) {
    return "Yekpare Sarı Sayfalar ile şehir ve kategori seçerek bölgenizdeki firmaların telefon, adres ve harita bilgilerine ulaşın. Tüm kayıtlar gerçek veritabanından listelenir.";
  }
  if (resultCount === 0) {
    return `${location} bölgesinde ${category} aramanız için kayıtlı firma bulunamadı. Farklı ilçe veya kategori deneyebilir; işletmenizi ücretsiz ekleyerek dizine dahil olabilirsiniz.`;
  }
  return `${location} ve çevresinde ${category} arayanlar için Yekpare Sarı Sayfalar'da ${resultCount.toLocaleString("tr-TR")} firma listelenmektedir. Telefon numarası, açık adres ve harita bağlantılarına tek ekrandan ulaşabilirsiniz. ${cityName.trim()} genelinde ${category} hizmeti veren işletmeleri karşılaştırın — kayıtlar güncel API verisinden çekilir, uydurma firma gösterilmez.`;
}

export function readSariSayfalarSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** wouter useSearch() çıktısı veya `?` ile başlayan query string. */
export function parseSariSayfalarSearchParams(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

/** wouter `useSearch()` bazen boş döner; canlı `window.location.search` ile birleştir. */
export function resolveSariSayfalarSearchParams(routeSearch = "", browserSearch = ""): URLSearchParams {
  const raw = String(routeSearch || browserSearch || "").trim();
  if (raw) return parseSariSayfalarSearchParams(raw);
  return readSariSayfalarSearchParams();
}

export function sariSayfalarUrlFingerprint(params: URLSearchParams): string {
  const q = params.get("q") ?? params.get("keywords") ?? "";
  return sariSayfalarFiltersFingerprint(
    q,
    params.get("city") ?? "",
    params.get("district") ?? "",
    params.get("category") ?? "",
    Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1),
  );
}

export function sariSayfalarFiltersFingerprint(
  q = "",
  city = "",
  district = "",
  category = "",
  page = 1,
): string {
  return [q.trim(), city.trim(), district.trim(), category.trim(), String(Math.max(1, page))].join("\0");
}

/** True when URL has city, category, or keyword — results view only. */
export function hasSariSayfalarActiveFilters(
  q = "",
  city = "",
  category = "",
): boolean {
  return Boolean(q.trim() || city.trim() || category.trim());
}

const TR_PHONE_CANDIDATE_RE = /(?:\+90\s?|0\s?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/;

function normalizeTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return raw.trim();
}

function extractPhoneFromScraperText(text: string | null | undefined): string | null {
  const raw = String(text ?? "").trim();
  if (!raw || /açılış|acilis|⋅|kapalı|closed|pzt|sal|çar|per|cum|cmt|paz/i.test(raw)) return null;
  const match = raw.match(TR_PHONE_CANDIDATE_RE);
  return match ? normalizeTrPhone(match[0]) : null;
}

type SariSayfalarContactRow = {
  phone?: string | null;
  address?: string | null;
  googlePlacesExtras?: Record<string, unknown> | null;
  city?: { name?: string | null; nameTr?: string | null } | null;
  district?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  categoryName?: string | null;
  tags?: string[] | null;
};

export function resolveSariSayfalarPhone(biz: SariSayfalarContactRow): string {
  const direct = String(biz.phone ?? "").trim();
  if (direct) return direct;
  const extras = biz.googlePlacesExtras ?? null;
  if (!extras) return "";
  for (const key of ["phone", "telephone", "scraperCategory"]) {
    const parsed = extractPhoneFromScraperText(String(extras[key] ?? ""));
    if (parsed) return parsed;
  }
  const scraperRaw = extras.scraperRaw;
  if (scraperRaw && typeof scraperRaw === "object") {
    for (const key of ["phone", "telephone"]) {
      const parsed = extractPhoneFromScraperText(String((scraperRaw as Record<string, unknown>)[key] ?? ""));
      if (parsed) return parsed;
    }
  }
  return "";
}

export function resolveSariSayfalarAddress(biz: SariSayfalarContactRow): string {
  const direct = String(biz.address ?? "").trim();
  if (direct) return direct;
  const extras = biz.googlePlacesExtras ?? null;
  if (extras?.scraperRaw && typeof extras.scraperRaw === "object") {
    for (const key of ["address", "description", "formattedAddress"]) {
      const val = String((extras.scraperRaw as Record<string, unknown>)[key] ?? "").trim();
      if (val.length > 8 && !/^https?:\/\//i.test(val) && !/açılış|acilis/i.test(val)) return val;
    }
  }
  const city = String(biz.city?.nameTr || biz.city?.name || "").trim();
  const district = String(biz.district?.name || "").trim();
  if (district && city) return `${district}/${city}`;
  return city;
}

export function resolveSariSayfalarCategoryLabel(biz: SariSayfalarContactRow): string {
  const fromApi = String(biz.category?.name || biz.categoryName || "").trim();
  if (fromApi) return fromApi;
  const extras = biz.googlePlacesExtras ?? null;
  const wf = extras?.importWorkflow;
  if (wf && typeof wf === "object") {
    const cat = (wf as Record<string, unknown>).category;
    if (cat && typeof cat === "object") {
      const label = String((cat as Record<string, unknown>).label ?? "").trim();
      if (label) return label;
    }
  }
  const scraperCat = String(extras?.scraperCategory ?? "").trim();
  if (scraperCat && !extractPhoneFromScraperText(scraperCat) && !/açılış|acilis|⋅/i.test(scraperCat)) {
    return scraperCat;
  }
  return "";
}
