/**
 * insaatfirmalarim.com scraper — rate-limited HTML crawl, robots.txt aware.
 * Kaynak: kategori×şehir listeleri + /firma/* detay sayfaları.
 */

const BASE_URL = "https://www.insaatfirmalarim.com";
const USER_AGENT = "Mozilla/5.0 (compatible; Yekpare/1.0; +https://yekpare.net; insaatfirmalarim map import)";
const DEFAULT_DELAY_MS = 1600;
const FETCH_TIMEOUT_MS = 28_000;

export const INSAATFIRMALARIM_CATEGORIES = [
  { slug: "plan-proje-ve-teknik-danismanlik", label: "Plan, Proje ve Teknik Danışmanlık", storeType: "hizmet_insaat" },
  { slug: "yazilim-ve-teknik-destek", label: "Yazılım ve Teknik Destek", storeType: "hizmet_insaat" },
  { slug: "muteahhitlik-hizmetleri", label: "Müteahhitlik Hizmetleri", storeType: "hizmet_insaat" },
  { slug: "zemin-etudu-ve-sondaj-ekipmanlari", label: "Zemin Etüdü ve Sondaj Ekipmanları", storeType: "hizmet_insaat" },
  { slug: "prefabrik-yapilar", label: "Prefabrik Yapılar", storeType: "hizmet_insaat" },
  { slug: "peyzaj-ve-cevre-duzenleme", label: "Peyzaj ve Çevre Düzenleme", storeType: "hizmet_insaat" },
  { slug: "is-ve-insaat-makinalari", label: "İş ve İnşaat Makinaları", storeType: "hizmet_insaat" },
  { slug: "iskele-ve-kalip-sistemleri", label: "İskele ve Kalıp Sistemleri", storeType: "hizmet_insaat" },
  { slug: "hazir-beton-ve-beton-malzemeleri", label: "Hazır Beton ve Beton Malzemeleri", storeType: "hizmet_insaat" },
  { slug: "yapi-elemanlari-ve-profilleri", label: "Yapı Elemanları ve Profilleri", storeType: "hizmet_insaat" },
  { slug: "yapi-kimyasallari", label: "Yapı Kimyasalları", storeType: "hizmet_insaat" },
  { slug: "kapi-pencere-sistemleri", label: "Kapı Pencere Sistemleri", storeType: "hizmet_insaat" },
  { slug: "cephe-kaplama", label: "Cephe Kaplama", storeType: "hizmet_insaat" },
  { slug: "zemin-doseme-ve-yer-kaplamalari", label: "Zemin Döşeme ve Yer Kaplamaları", storeType: "hizmet_insaat" },
  { slug: "tavan-kaplama", label: "Tavan Kaplama", storeType: "hizmet_insaat" },
  { slug: "cati-kaplama", label: "Çatı Kaplama", storeType: "hizmet_insaat" },
  { slug: "izolasyon-ve-yalitim-malzemeleri", label: "İzolasyon ve Yalıtım Malzemeleri", storeType: "hizmet_insaat" },
  { slug: "sihhi-tesisat-elemanlari", label: "Sıhhi Tesisat Elemanları", storeType: "hizmet_insaat" },
  { slug: "isitma-sogutma-ve-havalandirma-sistemleri", label: "Isıtma, Soğutma ve Havalandırma Sistemleri", storeType: "hizmet_insaat" },
  { slug: "elektrik-tesisati", label: "Elektrik Tesisatı", storeType: "hizmet_insaat" },
  { slug: "asansor-ve-yuruyen-merdivenler", label: "Asansör ve Yürüyen Merdivenler", storeType: "hizmet_insaat" },
  { slug: "bina-otomasyon-ve-enerji-sistemleri", label: "Bina Otomasyon ve Enerji Sistemleri", storeType: "hizmet_insaat" },
  { slug: "tadilat-bakim-onarim-isleri", label: "Tadilat Bakım Onarım İşleri", storeType: "hizmet_ev" },
  { slug: "dekorasyon-isleri", label: "Dekorasyon İşleri", storeType: "hizmet_ev" },
  { slug: "yardimci-insaat-malzemeleri", label: "Yardımcı İnşaat Malzemeleri", storeType: "hizmet_insaat" },
  { slug: "endustriyel-mutfak-ve-sogutma-tesisleri", label: "Endüstriyel Mutfak ve Soğutma Tesisleri", storeType: "hizmet_insaat" },
  { slug: "guvenlik-ve-kamera-sistemleri", label: "Güvenlik ve Kamera Sistemleri", storeType: "hizmet_insaat" },
  { slug: "yangin-sondurme-ve-onleme", label: "Yangın Söndürme ve Önleme", storeType: "hizmet_insaat" },
  { slug: "diger-sektorler", label: "Diğer Sektörler", storeType: "hizmet_insaat" },
] as const;

/** 81 il — URL deseni: {slug}-{id} (ör. antalya-7) */
export const INSAATFIRMALARIM_CITIES = [
  { slug: "adana", id: 1, label: "Adana" },
  { slug: "adiyaman", id: 2, label: "Adıyaman" },
  { slug: "afyon", id: 3, label: "Afyon" },
  { slug: "agri", id: 4, label: "Ağrı" },
  { slug: "amasya", id: 5, label: "Amasya" },
  { slug: "ankara", id: 6, label: "Ankara" },
  { slug: "antalya", id: 7, label: "Antalya" },
  { slug: "artvin", id: 8, label: "Artvin" },
  { slug: "aydin", id: 9, label: "Aydın" },
  { slug: "balikesir", id: 10, label: "Balıkesir" },
  { slug: "bilecik", id: 11, label: "Bilecik" },
  { slug: "bingol", id: 12, label: "Bingöl" },
  { slug: "bitlis", id: 13, label: "Bitlis" },
  { slug: "bolu", id: 14, label: "Bolu" },
  { slug: "burdur", id: 15, label: "Burdur" },
  { slug: "bursa", id: 16, label: "Bursa" },
  { slug: "canakkale", id: 17, label: "Çanakkale" },
  { slug: "cankiri", id: 18, label: "Çankırı" },
  { slug: "corum", id: 19, label: "Çorum" },
  { slug: "denizli", id: 20, label: "Denizli" },
  { slug: "diyarbakir", id: 21, label: "Diyarbakır" },
  { slug: "edirne", id: 22, label: "Edirne" },
  { slug: "elazig", id: 23, label: "Elazığ" },
  { slug: "erzincan", id: 24, label: "Erzincan" },
  { slug: "erzurum", id: 25, label: "Erzurum" },
  { slug: "eskisehir", id: 26, label: "Eskişehir" },
  { slug: "gaziantep", id: 27, label: "Gaziantep" },
  { slug: "giresun", id: 28, label: "Giresun" },
  { slug: "gumushane", id: 29, label: "Gümüşhane" },
  { slug: "hakkari", id: 30, label: "Hakkari" },
  { slug: "hatay", id: 31, label: "Hatay" },
  { slug: "isparta", id: 32, label: "Isparta" },
  { slug: "mersin", id: 33, label: "Mersin" },
  { slug: "istanbul", id: 34, label: "İstanbul" },
  { slug: "izmir", id: 35, label: "İzmir" },
  { slug: "kars", id: 36, label: "Kars" },
  { slug: "kastamonu", id: 37, label: "Kastamonu" },
  { slug: "kayseri", id: 38, label: "Kayseri" },
  { slug: "kirklareli", id: 39, label: "Kırklareli" },
  { slug: "kirsehir", id: 40, label: "Kırşehir" },
  { slug: "kocaeli", id: 41, label: "Kocaeli" },
  { slug: "konya", id: 42, label: "Konya" },
  { slug: "kutahya", id: 43, label: "Kütahya" },
  { slug: "malatya", id: 44, label: "Malatya" },
  { slug: "manisa", id: 45, label: "Manisa" },
  { slug: "kahramanmaras", id: 46, label: "Kahramanmaraş" },
  { slug: "mardin", id: 47, label: "Mardin" },
  { slug: "mugla", id: 48, label: "Muğla" },
  { slug: "mus", id: 49, label: "Muş" },
  { slug: "nevsehir", id: 50, label: "Nevşehir" },
  { slug: "nigde", id: 51, label: "Niğde" },
  { slug: "ordu", id: 52, label: "Ordu" },
  { slug: "rize", id: 53, label: "Rize" },
  { slug: "sakarya", id: 54, label: "Sakarya" },
  { slug: "samsun", id: 55, label: "Samsun" },
  { slug: "siirt", id: 56, label: "Siirt" },
  { slug: "sinop", id: 57, label: "Sinop" },
  { slug: "sivas", id: 58, label: "Sivas" },
  { slug: "tekirdag", id: 59, label: "Tekirdağ" },
  { slug: "tokat", id: 60, label: "Tokat" },
  { slug: "trabzon", id: 61, label: "Trabzon" },
  { slug: "tunceli", id: 62, label: "Tunceli" },
  { slug: "sanliurfa", id: 63, label: "Şanlıurfa" },
  { slug: "usak", id: 64, label: "Uşak" },
  { slug: "van", id: 65, label: "Van" },
  { slug: "yozgat", id: 66, label: "Yozgat" },
  { slug: "zonguldak", id: 67, label: "Zonguldak" },
  { slug: "aksaray", id: 68, label: "Aksaray" },
  { slug: "bayburt", id: 69, label: "Bayburt" },
  { slug: "karaman", id: 70, label: "Karaman" },
  { slug: "kirikkale", id: 71, label: "Kırıkkale" },
  { slug: "batman", id: 72, label: "Batman" },
  { slug: "sirnak", id: 73, label: "Şırnak" },
  { slug: "bartin", id: 74, label: "Bartın" },
  { slug: "ardahan", id: 75, label: "Ardahan" },
  { slug: "igdir", id: 76, label: "Iğdır" },
  { slug: "yalova", id: 77, label: "Yalova" },
  { slug: "karabuk", id: 78, label: "Karabük" },
  { slug: "kilis", id: 79, label: "Kilis" },
  { slug: "osmaniye", id: 80, label: "Osmaniye" },
  { slug: "duzce", id: 81, label: "Düzce" },
] as const;

export type InsaatfirmalarimScrapedFirm = {
  sourceId: string;
  sourceUrl: string;
  name: string;
  responsiblePerson: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  categories: string[];
  aboutText: string | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  seoDescription: string;
  homepageSuperCategory: string;
  storeType: string;
  /** Liste sayfası bağlamı — il + kategori ayrımı için */
  listCategorySlug?: string;
  listCategoryLabel?: string;
  listCitySlug?: string;
  listCityLabel?: string;
};

export type InsaatfirmalarimScrapeMode = "city" | "category";

export type InsaatfirmalarimScrapeOptions = {
  mode?: InsaatfirmalarimScrapeMode;
  categorySlug?: string;
  /** Virgülle ayrılmış veya dizi — birden fazla kategori (pilot taramalar için). */
  categorySlugs?: string[];
  citySlug?: string;
  /** @deprecated Tüm sayfalar kazınır; yalnızca pilot/auto-start için kullanılır */
  maxListPagesPerPair?: number;
  /** Boş/undefined = sınır yok */
  maxFirms?: number;
  geocode?: boolean;
  delayMs?: number;
  onProgress?: (msg: string) => void;
};

type InsaatfirmalarimCategory = (typeof INSAATFIRMALARIM_CATEGORIES)[number];
type InsaatfirmalarimCity = (typeof INSAATFIRMALARIM_CITIES)[number];

export type InsaatfirmalarimScrapePair = {
  category: InsaatfirmalarimCategory;
  city: InsaatfirmalarimCity;
};

export function resolveInsaatfirmalarimScrapePairs(input: {
  mode?: InsaatfirmalarimScrapeMode;
  citySlug?: string;
  categorySlug?: string;
  categorySlugs?: string[];
}): InsaatfirmalarimScrapePair[] {
  const mode = input.mode;
  if (mode === "city") {
    const slug = String(input.citySlug ?? "").trim();
    if (!slug) throw new Error("İl bazlı mod için citySlug gerekli");
    const city = INSAATFIRMALARIM_CITIES.find((c) => c.slug === slug);
    if (!city) throw new Error(`Geçersiz il slug: ${slug}`);
    return INSAATFIRMALARIM_CATEGORIES.map((category) => ({ category, city }));
  }
  if (mode === "category") {
    const slug = String(input.categorySlug ?? "").trim();
    if (!slug) throw new Error("Kategori bazlı mod için categorySlug gerekli");
    const category = INSAATFIRMALARIM_CATEGORIES.find((c) => c.slug === slug);
    if (!category) throw new Error(`Geçersiz kategori slug: ${slug}`);
    return INSAATFIRMALARIM_CITIES.map((city) => ({ category, city }));
  }

  const categories = resolveCategoryFilter({
    categorySlug: input.categorySlug,
    categorySlugs: input.categorySlugs,
  });
  const cities = INSAATFIRMALARIM_CITIES.filter((c) => !input.citySlug || c.slug === input.citySlug);
  const pairs: InsaatfirmalarimScrapePair[] = [];
  for (const category of categories) {
    for (const city of cities) pairs.push({ category, city });
  }
  return pairs;
}

function resolveCategoryFilter(opts: InsaatfirmalarimScrapeOptions) {
  const slugSet = new Set<string>();
  if (opts.categorySlug?.trim()) slugSet.add(opts.categorySlug.trim());
  for (const slug of opts.categorySlugs ?? []) {
    const s = String(slug ?? "").trim();
    if (s) slugSet.add(s);
  }
  if (slugSet.size === 0) return INSAATFIRMALARIM_CATEGORIES;
  return INSAATFIRMALARIM_CATEGORIES.filter((c) => slugSet.has(c.slug));
}

let lastFetchAt = 0;
let robotsCache: { checkedAt: number; allowedPrefixes: string[] } | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeDedupeText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildInsaatfirmalarimDedupeKey(firm: Pick<InsaatfirmalarimScrapedFirm, "name" | "address" | "phone">): string {
  return [normalizeDedupeText(firm.name), normalizeDedupeText(firm.address), normalizeDedupeText(firm.phone)].join("|");
}

function decodeCfEmail(encoded: string): string | null {
  const hex = encoded.trim();
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out.includes("@") ? out : null;
}

function absoluteUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function isValidTurkeyCoord(lat: number | null, lng: number | null): boolean {
  if (lat == null || lng == null) return false;
  return lat >= 35.5 && lat <= 42.5 && lng >= 25.5 && lng <= 45.5;
}

async function rateLimitedFetch(url: string, delayMs = DEFAULT_DELAY_MS): Promise<string> {
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < delayMs) await sleep(delayMs - elapsed);
  lastFetchAt = Date.now();
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("utf-8").decode(buf);
}

export async function checkInsaatfirmalarimRobots(): Promise<{ ok: boolean; disallowed: string[]; message: string }> {
  if (robotsCache && Date.now() - robotsCache.checkedAt < 6 * 60 * 60_000) {
    return { ok: true, disallowed: ["/etiket/", "/haber/", "/fp="], message: "robots.txt önbellekten okundu" };
  }
  try {
    const txt = await rateLimitedFetch(`${BASE_URL}/robots.txt`, 400);
    const disallowed = txt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^disallow:/i.test(l))
      .map((l) => l.replace(/^disallow:\s*/i, "").trim())
      .filter(Boolean);
    robotsCache = { checkedAt: Date.now(), allowedPrefixes: [] };
    const blocked = ["/firma/", "/plan-proje", "/muteahhitlik"].some((p) =>
      disallowed.some((d) => p.startsWith(d.replace(/\/$/, "")) || d === "/"),
    );
    return {
      ok: !blocked,
      disallowed,
      message: blocked ? "robots.txt hedef yolları engelliyor" : "robots.txt izin veriyor (/etiket/, /haber/ hariç)",
    };
  } catch (err) {
    return { ok: false, disallowed: [], message: err instanceof Error ? err.message : String(err) };
  }
}

function extractFirmUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();
  const re = /href="(?:https?:\/\/www\.insaatfirmalarim\.com)?(\/firma\/[a-z0-9-]+-f\d+\.html)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    urls.add(absoluteUrl(m[1]!));
  }
  return [...urls];
}

const MAX_LIST_PAGES_SAFETY = 500;

function extractMaxListPage(html: string, baseListUrl: string): number {
  const pages = new Set<number>([1]);
  const pathOnly = baseListUrl.replace(/^https?:\/\/[^/]+/i, "");
  for (const pattern of [
    new RegExp(`${baseListUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?p=(\\d+)`, "gi"),
    new RegExp(`${pathOnly.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?p=(\\d+)`, "gi"),
    /[?&]p=(\d+)/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const p = parseInt(m[1]!, 10);
      if (Number.isFinite(p) && p > 0 && p <= MAX_LIST_PAGES_SAFETY) pages.add(p);
    }
  }
  return Math.max(...pages);
}

export function categoryCityListUrl(categorySlug: string, city: { slug: string; id: number }): string {
  return `${BASE_URL}/${categorySlug}/${city.slug}-${city.id}.html`;
}

async function discoverInsaatfirmalarimFirmUrlsForPair(
  category: InsaatfirmalarimCategory,
  city: InsaatfirmalarimCity,
  opts: {
    maxFirms?: number;
    maxListPagesPerPair?: number;
    delayMs?: number;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<string[]> {
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const maxFirms = opts.maxFirms;
  const pageCap = opts.maxListPagesPerPair
    ? Math.max(1, Math.min(MAX_LIST_PAGES_SAFETY, opts.maxListPagesPerPair))
    : MAX_LIST_PAGES_SAFETY;
  const baseUrl = categoryCityListUrl(category.slug, city);
  const found = new Set<string>();

  opts.onProgress?.(`Liste: ${category.label} / ${city.label}`);

  let hintedMax = 1;
  for (let page = 1; page <= pageCap; page++) {
    const listUrl = page === 1 ? baseUrl : `${baseUrl}?p=${page}`;
    let html: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        html = await rateLimitedFetch(listUrl, delayMs);
        break;
      } catch (err) {
        if (attempt >= 2) {
          opts.onProgress?.(`Liste sayfa ${page} alınamadı: ${err instanceof Error ? err.message : String(err)}`.slice(0, 120));
        } else {
          await sleep(900 * (attempt + 1));
        }
      }
    }
    if (!html) break;

    const pageUrls = extractFirmUrlsFromHtml(html);
    if (pageUrls.length === 0) break;

    hintedMax = Math.max(hintedMax, extractMaxListPage(html, baseUrl));
    const sizeBefore = found.size;
    for (const u of pageUrls) {
      found.add(u);
      if (maxFirms != null && maxFirms > 0 && found.size >= maxFirms) break;
    }
    if (maxFirms != null && maxFirms > 0 && found.size >= maxFirms) break;

    opts.onProgress?.(`Liste sayfa ${page}/${hintedMax}: +${found.size - sizeBefore} firma (toplam ${found.size})`);

    if (found.size === sizeBefore) break;
    // hintedMax=1 when pagination links are missing — keep crawling until an empty page.
    if (hintedMax > 1 && page >= hintedMax) break;
  }

  return maxFirms != null && maxFirms > 0 ? [...found].slice(0, maxFirms) : [...found];
}

export async function discoverInsaatfirmalarimFirmUrls(opts: InsaatfirmalarimScrapeOptions = {}): Promise<string[]> {
  const robots = await checkInsaatfirmalarimRobots();
  if (!robots.ok) throw new Error(robots.message);

  const pairs = opts.mode
    ? resolveInsaatfirmalarimScrapePairs(opts)
    : resolveInsaatfirmalarimScrapePairs({
        citySlug: opts.citySlug,
        categorySlug: opts.categorySlug,
        categorySlugs: opts.categorySlugs,
      });
  const maxFirms = opts.maxFirms;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const found = new Set<string>();

  for (const { category, city } of pairs) {
    if (maxFirms != null && maxFirms > 0 && found.size >= maxFirms) break;
    const pairLimit =
      maxFirms != null && maxFirms > 0 ? Math.max(1, maxFirms - found.size) : undefined;
    const urls = await discoverInsaatfirmalarimFirmUrlsForPair(category, city, {
      maxFirms: pairLimit,
      maxListPagesPerPair: opts.maxListPagesPerPair,
      delayMs,
      onProgress: opts.onProgress,
    });
    for (const u of urls) {
      found.add(u);
      if (maxFirms != null && maxFirms > 0 && found.size >= maxFirms) break;
    }
  }

  return maxFirms != null && maxFirms > 0 ? [...found].slice(0, maxFirms) : [...found];
}

export type InsaatfirmalarimPairScrapeResult = {
  firms: InsaatfirmalarimScrapedFirm[];
  discovered: number;
  errors: string[];
};

export async function scrapeInsaatfirmalarimPair(
  categorySlug: string,
  citySlug: string,
  opts: InsaatfirmalarimScrapeOptions & {
    onFirmScraped?: (firm: InsaatfirmalarimScrapedFirm) => void | Promise<void>;
  } = {},
): Promise<InsaatfirmalarimPairScrapeResult> {
  const category = INSAATFIRMALARIM_CATEGORIES.find((c) => c.slug === categorySlug);
  const city = INSAATFIRMALARIM_CITIES.find((c) => c.slug === citySlug);
  if (!category) throw new Error(`Geçersiz kategori slug: ${categorySlug}`);
  if (!city) throw new Error(`Geçersiz il slug: ${citySlug}`);

  const robots = await checkInsaatfirmalarimRobots();
  if (!robots.ok) throw new Error(robots.message);

  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const urls = await discoverInsaatfirmalarimFirmUrlsForPair(category, city, {
    maxFirms: opts.maxFirms,
    maxListPagesPerPair: opts.maxListPagesPerPair,
    delayMs,
    onProgress: opts.onProgress,
  });

  const firms: InsaatfirmalarimScrapedFirm[] = [];
  const errors: string[] = [];
  const seenDedupe = new Set<string>();

  for (const url of urls) {
    if (opts.maxFirms != null && opts.maxFirms > 0 && firms.length >= opts.maxFirms) break;
    try {
      const firm = await scrapeInsaatfirmalarimDetailPage(url, { geocode: opts.geocode !== false, delayMs });
      if (!firm) continue;
      firm.listCategorySlug = category.slug;
      firm.listCategoryLabel = category.label;
      firm.listCitySlug = city.slug;
      firm.listCityLabel = city.label;
      if (!firm.city?.trim()) firm.city = city.label;
      firm.storeType = category.storeType;
      const dk = buildInsaatfirmalarimDedupeKey(firm);
      if (seenDedupe.has(dk)) continue;
      seenDedupe.add(dk);
      firms.push(firm);
      await opts.onFirmScraped?.(firm);
      opts.onProgress?.(`Detay: ${firm.name} (${category.label} / ${city.label})`);
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180));
    }
  }

  return { firms, discovered: urls.length, errors };
}

function parseJsonLdLocalBusiness(html: string): Record<string, unknown> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1]!.trim()) as Record<string, unknown>;
      if (String(obj["@type"] ?? "").toLowerCase().includes("business")) return obj;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function infoField(html: string, label: string): string | null {
  const re = new RegExp(
    `<div class="k1">${label}<\\/div>\\s*<div class="k2">([\\s\\S]*?)<\\/div>`,
    "i",
  );
  const m = html.match(re);
  if (!m?.[1]) return null;
  const val = stripTags(m[1]);
  return val || null;
}

function extractAboutText(html: string): string | null {
  const m = html.match(/class="detail_company_metin"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m?.[1]) return null;
  const text = stripTags(m[1]);
  return text || null;
}

function extractCategories(html: string): string[] {
  const cats = new Set<string>();
  const block = html.match(/Firma Faaliyet Alanlar[\s\S]*?<ul class="nm2">([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const re = /<li class="bst"><a[^>]*>([^<]+)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const label = stripTags(m[1] ?? "");
    if (label) cats.add(label);
  }
  if (!cats.size) {
    const italic = html.match(/<div class="italic">\s*([^<]+)/i)?.[1];
    if (italic) {
      for (const part of italic.split(",")) {
        const t = stripTags(part);
        if (t && t.length > 2) cats.add(t);
      }
    }
  }
  return [...cats];
}

function extractPhotoUrl(html: string, jsonLd: Record<string, unknown> | null): string | null {
  const fromLd = typeof jsonLd?.image === "string" ? jsonLd.image : null;
  if (fromLd && !fromLd.includes("logo.png")) return absoluteUrl(fromLd);
  const logoBg = html.match(/id="vip_logo"[^>]*style="[^"]*url\(([^)]+)\)/i)?.[1];
  if (logoBg && !logoBg.includes("logo.png")) return absoluteUrl(logoBg.replace(/['"]/g, ""));
  const gallery = html.match(/href="(\/images_firma\/[^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1];
  if (gallery) return absoluteUrl(gallery);
  return null;
}

function extractEmail(html: string, jsonLd: Record<string, unknown> | null): string | null {
  const fromLd = typeof jsonLd?.email === "string" ? jsonLd.email.trim() : null;
  if (fromLd && fromLd.includes("@")) return fromLd;
  const cf = html.match(/class="__cf_email__"[^>]+data-cfemail="([0-9a-f]+)"/i)?.[1];
  if (cf) return decodeCfEmail(cf);
  const mailto = html.match(/href="mailto:([^"]+)"/i)?.[1];
  if (mailto && mailto.includes("@")) return decodeHtmlEntities(mailto);
  return null;
}

function extractCoords(html: string, jsonLd: Record<string, unknown> | null): { lat: number | null; lng: number | null } {
  const geo = jsonLd?.geo as Record<string, unknown> | undefined;
  let lat = parseFloat(String(geo?.latitude ?? ""));
  let lng = parseFloat(String(geo?.longitude ?? ""));
  if (!isValidTurkeyCoord(lat, lng)) {
    const mapLink = html.match(/maps\.google\.com\/\?daddr=([0-9.+-]+),([0-9.+-]+)/i);
    if (mapLink) {
      lat = parseFloat(mapLink[1]!);
      lng = parseFloat(mapLink[2]!);
    }
  }
  if (!isValidTurkeyCoord(lat, lng)) return { lat: null, lng: null };
  return { lat, lng };
}

function extractSourceId(url: string): string {
  const m = url.match(/-f(\d+)\.html$/i);
  return m?.[1] ? `ifirm_${m[1]}` : `ifirm_${Buffer.from(url).toString("base64url").slice(0, 24)}`;
}

function pickStoreType(categories: string[]): string {
  const joined = categories.join(" ").toLocaleLowerCase("tr-TR");
  if (/dekorasyon|tadilat|emlak/.test(joined)) return "hizmet_ev";
  return "hizmet_insaat";
}

/** SEO/geo odaklı özgün açıklama — kaynak metni kopyalamaz, yeniden yazar. */
export function rewriteInsaatfirmalarimDescription(input: {
  aboutText: string | null;
  name: string;
  city: string | null;
  district: string | null;
  categories: string[];
  responsiblePerson?: string | null;
}): string {
  const loc = [input.district, input.city].filter(Boolean).join(", ");
  const catPhrase = input.categories.slice(0, 3).join(", ") || "inşaat ve yapı sektörü";
  const cityKw = input.city ? `${input.city} ` : "";
  const lead = `${input.name}${loc ? ` (${loc})` : ""}, ${cityKw}${catPhrase} alanında faaliyet gösteren yerel bir inşaat firmasıdır.`;

  const raw = (input.aboutText ?? "").trim();
  if (!raw) {
    return `${lead} Bölgedeki müşterilere güvenilir hizmet sunmayı hedefleyen firma, iletişim ve teklif talepleri için profil sayfası üzerinden ulaşılabilir.`.slice(0, 1200);
  }

  const sentences = raw
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18)
    .slice(0, 3)
    .map((s) =>
      s
        .replace(/\bfirmamız\b/gi, input.name)
        .replace(/\bmüşteri memnuniyeti\b/gi, "müşteri odaklı hizmet anlayışı")
        .replace(/\bhizmet sunmaktayız\b/gi, "profesyonel çözümler üretmektedir")
        .replace(/\bkalite\b/gi, "yüksek kalite standartları")
        .replace(/\btec[rü]be\b/gi, "sektör deneyimi"),
    );

  const who = input.responsiblePerson ? ` Yetkili: ${input.responsiblePerson}.` : "";
  const tail = `${input.city ?? "Türkiye"} genelinde ${catPhrase} ihtiyaçları için tercih edilebilecek iş ortaklarından biridir.${who}`;
  return [lead, ...sentences, tail].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 1200);
}

const NOMINATIM_UA = "Yekpare/1.0 (https://yekpare.net; insaatfirmalarim geocode)";

export async function geocodeInsaatfirmalarimAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (q.length < 6) return null;
  await sleep(1100);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "tr" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = parseFloat(String(rows?.[0]?.lat ?? ""));
    const lng = parseFloat(String(rows?.[0]?.lon ?? ""));
    if (!isValidTurkeyCoord(lat, lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function scrapeInsaatfirmalarimDetailPage(
  url: string,
  opts: { geocode?: boolean; delayMs?: number } = {},
): Promise<InsaatfirmalarimScrapedFirm | null> {
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const html = await rateLimitedFetch(url, delayMs);
  const jsonLd = parseJsonLdLocalBusiness(html);

  const name =
    stripTags(html.match(/id="vip_adi"[^>]*><h1>([^<]+)/i)?.[1] ?? "") ||
    (typeof jsonLd?.name === "string" ? jsonLd.name.trim() : "");
  if (!name || name.length < 2) return null;

  const responsiblePerson = infoField(html, "Yetkili Kişi:");
  const address = infoField(html, "Adres:");
  const city = infoField(html, "Şehir:") || infoField(html, "Sehir:");
  const phone = infoField(html, "Telefon:") || infoField(html, "Cep Telefonu:");
  const fax = infoField(html, "Faks:");
  const websiteRaw = infoField(html, "Web:");
  const website = websiteRaw && /^https?:\/\//i.test(websiteRaw)
    ? websiteRaw
    : websiteRaw
      ? (websiteRaw.startsWith("www.") ? `https://${websiteRaw}` : websiteRaw.includes(".") ? `https://${websiteRaw.replace(/^\/+/, "")}` : null)
      : (typeof jsonLd?.url === "string" ? jsonLd.url : null);

  let district: string | null = null;
  const addrBlock = html.match(/id="firm_detail"[\s\S]*?<\/div>\s*<\/div>/i)?.[0] ?? html;
  const distLink = addrBlock.match(/title="[^"]*inşaat firmaları"[^>]*>([^<]+)<\/a>/i)?.[1];
  if (distLink) district = stripTags(distLink);

  const categories = extractCategories(html);
  const aboutText = extractAboutText(html);
  let { lat, lng } = extractCoords(html, jsonLd);

  if ((lat == null || lng == null) && opts.geocode !== false) {
    const geoQ = [address, district, city, "Türkiye"].filter(Boolean).join(", ");
    const hit = await geocodeInsaatfirmalarimAddress(geoQ);
    if (hit) {
      lat = hit.lat;
      lng = hit.lng;
    }
  }

  const seoDescription = rewriteInsaatfirmalarimDescription({
    aboutText,
    name,
    city,
    district,
    categories,
    responsiblePerson,
  });

  return {
    sourceId: extractSourceId(url),
    sourceUrl: url,
    name,
    responsiblePerson,
    address,
    city,
    district,
    phone: phone || (typeof jsonLd?.telephone === "string" ? jsonLd.telephone : null),
    fax: fax || (typeof jsonLd?.faxNumber === "string" ? jsonLd.faxNumber : null),
    email: extractEmail(html, jsonLd),
    website,
    categories,
    aboutText,
    photoUrl: extractPhotoUrl(html, jsonLd),
    latitude: lat,
    longitude: lng,
    seoDescription,
    homepageSuperCategory: "hizmet",
    storeType: pickStoreType(categories),
  };
}

export async function scrapeInsaatfirmalarimBatch(
  opts: InsaatfirmalarimScrapeOptions = {},
): Promise<{ firms: InsaatfirmalarimScrapedFirm[]; discovered: number; errors: string[] }> {
  const pairs = opts.mode
    ? resolveInsaatfirmalarimScrapePairs(opts)
    : resolveInsaatfirmalarimScrapePairs({
        citySlug: opts.citySlug,
        categorySlug: opts.categorySlug,
        categorySlugs: opts.categorySlugs,
      });

  const firms: InsaatfirmalarimScrapedFirm[] = [];
  const errors: string[] = [];
  let discovered = 0;

  for (const { category, city } of pairs) {
    if (opts.maxFirms != null && opts.maxFirms > 0 && firms.length >= opts.maxFirms) break;
    const remaining =
      opts.maxFirms != null && opts.maxFirms > 0 ? Math.max(1, opts.maxFirms - firms.length) : undefined;
    const batch = await scrapeInsaatfirmalarimPair(category.slug, city.slug, {
      ...opts,
      maxFirms: remaining,
    });
    discovered += batch.discovered;
    firms.push(...batch.firms);
    errors.push(...batch.errors);
  }

  return { firms, discovered, errors };
}
