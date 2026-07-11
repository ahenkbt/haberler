import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import { normalizeHmMapCityKey } from "@/lib/hmMapCityKey";
import {
  allHaberHaritasiMatchLocations,
  isTurkishProvinceName,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import {
  buildHaberHaritasiVideoIndex,
  findLocationForVideoItem,
  parseHaberHaritasiPublishedAt,
  type HaberHaritasiVideoItem,
} from "@/lib/haberHaritasiVideos";
import { yektubeWatchPath } from "@/lib/yektubeUrls";

export type HaberHaritasiContentKind = "news" | "video";

export type HmMapCityHeadline = {
  city: string;
  title: string;
  href: string;
  publishedAt?: string | null;
  countryCode?: string;
  flagEmoji?: string;
  isTurkish?: boolean;
  kind: HaberHaritasiContentKind;
  thumbnail?: string | null;
  videoId?: string;
  sourceId?: number;
  spot?: string | null;
  content?: string | null;
  source?: "db" | "rss";
  rssSourceUrl?: string | null;
  originUrl?: string | null;
  sourceSiteUrl?: string | null;
  publishedOnSiteId?: number | null;
  sourceSiteSlug?: string | null;
  feedLabel?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  regionKey?: string | null;
  /** Portal kategori slug — global yalnızca harita Global sekmesinde. */
  categorySlug?: string | null;
};

export type HmMapCityContentMatch = {
  kind: HaberHaritasiContentKind;
  title: string;
  href: string;
  thumbnail?: string | null;
  publishedAt?: string | null;
  videoId?: string | null;
  sourceId?: number | null;
  spot?: string | null;
  content?: string | null;
  source?: "db" | "rss";
  rssSourceUrl?: string | null;
  originUrl?: string | null;
  sourceSiteUrl?: string | null;
  publishedOnSiteId?: number | null;
  sourceSiteSlug?: string | null;
  feedLabel?: string | null;
  /** Portal kategori slug — global yalnızca harita Global sekmesinde. */
  categorySlug?: string | null;
};

export type HaberHaritasiNewsMatch = {
  location: HaberHaritasiLocation;
  item: HomeHybridNewsItem;
};

/** Konum adı eşleştirme — Türkçe normalize (döngü kırma için yaprak modülden gelir, yeniden dışa aktarılır). */
export { normalizeHmMapCityKey };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TR_WORD_CHAR = /[\p{L}\p{N}]/u;

function isTrWordChar(ch: string): boolean {
  return TR_WORD_CHAR.test(ch);
}

/** Unicode sözcük sınırı — «Er» ⊂ «Er Gaziler» / «Ermenistan» yanlış eşleşmesini engeller. */
function hasTermAtWordBoundary(normText: string, normTerm: string): boolean {
  if (!normTerm) return false;
  let idx = 0;
  while (idx <= normText.length) {
    const found = normText.indexOf(normTerm, idx);
    if (found === -1) return false;
    const before = found > 0 ? normText[found - 1]! : "";
    const afterIdx = found + normTerm.length;
    const after = afterIdx < normText.length ? normText[afterIdx]! : "";
    const beforeOk = !before || !isTrWordChar(before);
    const afterOk = !after || !isTrWordChar(after);
    if (beforeOk && afterOk) return true;
    idx = found + 1;
  }
  return false;
}

export function matchLocationTermInText(text: string, term: string): boolean {
  const normText = normalizeHmMapCityKey(text);
  const normTerm = normalizeHmMapCityKey(term);
  if (!normTerm || normTerm.length < 2) return false;
  const escaped = escapeRegExp(normTerm);
  if (new RegExp(`^${escaped}\\s*[:\\-–—]`, "i").test(normText)) return true;
  return hasTermAtWordBoundary(normText, normTerm);
}

/** TBMM, Meclis vb. — başlık/gövdede geçince Ankara (feed il etiketini geçersiz kılar). */
const TURKISH_CAPITAL_INSTITUTION_TERMS = [
  "TBMM",
  "Büyük Millet Meclisi",
  "Buyuk Millet Meclisi",
  "Meclis",
  "Cumhurbaşkanlığı",
  "Cumhurbaskanligi",
  "Beştepe",
  "Bestepe",
  "Külliye",
  "Kulliye",
  "Ankara",
];

/** Ankara ilçe / semt — başlıkta geçince Ankara. */
const TURKISH_CAPITAL_DISTRICT_TERMS = [
  "Mamak",
  "Tandoğan",
  "Tandogan",
  "Kızılay",
  "Kizilay",
  "Çankaya",
  "Cankaya",
  "Ulus",
  "Keçiören",
  "Kecioren",
  "Yenimahalle",
  "Etimesgut",
  "Sincan",
  "Gölbaşı",
  "Golbasi",
];

export function hasTurkishCapitalInstitutionKeyword(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  for (const term of [...TURKISH_CAPITAL_INSTITUTION_TERMS, ...TURKISH_CAPITAL_DISTRICT_TERMS]) {
    if (matchLocationTermInText(raw, term)) return true;
  }
  const norm = normalizeHmMapCityKey(raw);
  return norm.includes("tbmm");
}

function findAnkaraLocation(locations: HaberHaritasiLocation[]): HaberHaritasiLocation | null {
  return (
    locations.find(
      (loc) => loc.key === "ankara" || normalizeHmMapCityKey(loc.label) === "ankara",
    ) ?? null
  );
}

function findCapitalInstitutionLocation(
  text: string,
  locations: HaberHaritasiLocation[],
): HaberHaritasiLocation | null {
  if (!hasTurkishCapitalInstitutionKeyword(text)) return null;
  return findAnkaraLocation(locations);
}

export type HybridNewsLocationSource = "institution" | "title" | "body" | "feed";

export type HybridNewsLocationMatch = {
  location: HaberHaritasiLocation;
  source: HybridNewsLocationSource;
};

function locationMatchPriority(source: HybridNewsLocationSource): number {
  switch (source) {
    case "institution":
      return 4;
    case "title":
      return 3;
    case "body":
      return 2;
    case "feed":
      return 1;
    default:
      return 0;
  }
}

function locationKindPriority(kind: HaberHaritasiLocation["kind"]): number {
  if (kind === "tr-province" || kind === "global-city") return 2;
  return 1;
}

const TURKISH_CHAR_RE = /[çğıöşüÇĞİÖŞÜ]/;
const DUTCH_WORD_RE =
  /\b(het|de|een|niet|met|voor|naar|bij|zijn|wordt|door|neemt|omstreden|gebruik|amerikaans|bedrijf)\b/i;
const ENGLISH_NEWS_WORD_RE =
  /\b(the|and|for|with|from|news|breaking|live|report|says|world|global|update|today|latest|company|system)\b/i;

/** Yabancı dil başlık — kısa TR il adları (Van/van vb.) yanlış eşleşmesini engeller. */
export function isLikelyNonTurkishNewsText(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (TURKISH_CHAR_RE.test(raw)) return false;
  // Dutch preposition «van» — lowercase only (do not flag Turkish «Van'da»)
  if (/(?:^|[\s.,;:!?('"[\-–—])van(?:[\s.,;:!?'"\\)\]\-–—]|$)/.test(raw)) return true;
  if (DUTCH_WORD_RE.test(raw)) return true;
  if (ENGLISH_NEWS_WORD_RE.test(raw)) return true;
  if (/[àâäæéèêëïîôùûüÿœ]/i.test(raw)) return true;
  return false;
}

/** Küresel / dünya RSS — Cumha dünya, NOS, global-map-news; TR il pin'i yasak (başlıkta il geçmedikçe). */
export function isGlobalScopeHybridNewsItem(item: HomeHybridNewsItem): boolean {
  const regionKey = String(item.regionKey ?? "").trim().toLowerCase();
  if (regionKey.startsWith("global-")) return true;
  const cc = String(item.countryCode ?? "").trim().toUpperCase();
  if (cc && cc !== "TR" && cc !== "CY") return true;
  const feed = String(item.feedLabel ?? "").trim();
  if (/cumha\s+d[uü]nya|global|nos\b|bbc|reuters|dw\.com|france24|d[uü]nya|netherlands|hollanda|english|international|world news|al jazeera/i.test(feed)) {
    return true;
  }
  return false;
}

function isStrictTrProvinceTerm(provinceKey: string, term: string): boolean {
  const normKey = normalizeHmMapCityKey(provinceKey);
  const normTerm = normalizeHmMapCityKey(term);
  return normKey.length <= 3 || normTerm.length <= 3;
}

/** Van/van — Hollanda «van» ile çakışmayı önler; yalnızca Türkçe bağlam veya büyük harf «Van». */
function matchTrProvinceTermInText(raw: string, term: string, provinceKey: string): boolean {
  if (!isStrictTrProvinceTerm(provinceKey, term)) {
    return matchLocationTermInText(raw, term);
  }

  const label = String(term ?? "").trim();
  if (!label) return false;
  const escaped = escapeRegExp(label);

  if (new RegExp(`\\b${escaped}'?(?:da|de|ta|te|dan|den|daki|deki|lı|li|lu|lü|ın|in|a|e|i|u|ü|o)\\b`, "i").test(raw)) {
    return true;
  }
  if (new RegExp(`\\b${escaped}\\s+(?:il|ili|ilinde|ilinden|ilçe|ilçesi)\\b`, "i").test(raw)) {
    return true;
  }

  const caseRe = new RegExp(`(?:^|[\\s.,;:!?('"\\-–—])(${escaped})(?:'|[\\s.,;:!?'"\\)\\]\\-–—]|$)`, "u");
  const match = raw.match(caseRe);
  if (match?.[1] === label) return true;

  return false;
}

function shouldBlockForeignFeedGeo(
  item: HomeHybridNewsItem,
  feedLocation: HaberHaritasiLocation,
): boolean {
  const searchable = `${item.title} ${getHybridNewsSearchableBody(item)}`.trim();
  // KKTC / Kıbrıs (CY) Türkçe içerik üretir; Türkiye'ye komşu sayılır, yabancı olarak engellenmez.
  if (feedLocation.countryCode === "TR" || feedLocation.countryCode === "CY" || feedLocation.kind === "tr-province") {
    if (isGlobalScopeHybridNewsItem(item) && isLikelyNonTurkishNewsText(searchable)) {
      for (const term of feedLocation.searchTerms) {
        if (matchTrProvinceTermInText(searchable, term, feedLocation.key)) return false;
      }
      return true;
    }
    if (isLikelyNonTurkishNewsText(searchable) && !hasTurkishCapitalInstitutionKeyword(searchable)) {
      for (const term of feedLocation.searchTerms) {
        if (matchTrProvinceTermInText(searchable, term, feedLocation.key)) return false;
      }
      return true;
    }
    return false;
  }
  if (!searchable) return false;
  if (hasTurkishCapitalInstitutionKeyword(searchable)) return true;
  const titleNorm = normalizeHmMapCityKey(item.title);
  if (/[çğıöşü]/.test(item.title) || titleNorm.includes("turkiye") || titleNorm.includes("turk")) {
    return true;
  }
  return false;
}

function resolveFeedGeoLocation(
  item: HomeHybridNewsItem,
  locations: HaberHaritasiLocation[],
): HaberHaritasiLocation | null {
  const regionLabel = String(item.regionLabel ?? "").trim();
  const geoLat = item.geoLat;
  const geoLng = item.geoLng;
  if (!regionLabel || !Number.isFinite(geoLat) || !Number.isFinite(geoLng)) return null;

  const key = normalizeHmMapCityKey(regionLabel);
  const existing = locations.find((loc) => loc.key === key || normalizeHmMapCityKey(loc.label) === key);
  const feedLocation =
    existing ??
    ({
      key,
      label: regionLabel,
      searchTerms: [regionLabel],
      lat: geoLat as number,
      lng: geoLng as number,
      zoom: isTurkishProvinceName(regionLabel) ? 10 : 8,
      countryCode: String(item.countryCode ?? "TR").trim().slice(0, 2) || "TR",
      kind: isTurkishProvinceName(regionLabel) ? "tr-province" : "global-city",
    } satisfies HaberHaritasiLocation);

  if (shouldBlockForeignFeedGeo(item, feedLocation)) return null;
  if (shouldBlockWrongTrFeedGeo(item, feedLocation, locations)) return null;
  if (
    isGlobalScopeHybridNewsItem(item) &&
    (feedLocation.kind === "tr-province" || feedLocation.countryCode === "TR")
  ) {
    return null;
  }
  return feedLocation;
}

function shouldBlockWrongTrFeedGeo(
  item: HomeHybridNewsItem,
  feedLocation: HaberHaritasiLocation,
  locations: HaberHaritasiLocation[],
): boolean {
  const body = getHybridNewsSearchableBody(item);
  const textLoc = resolveHeadlineLocationFromText(item.title, body, locations);
  if (!textLoc) return false;
  if (textLoc.key === feedLocation.key) return false;
  // KKTC/Kıbrıs (CY): aynı ülke içindeki alt konumlar (Lefkoşa/Girne/Mağusa) arasında engelleme yapma.
  if (feedLocation.countryCode === "CY" && textLoc.countryCode === "CY") return false;
  return textLoc.key !== feedLocation.key;
}

/** Başlık/gövde metninden konum — ülke eşleşmesi için daha uzun terim şartı. */
export function findLocationInText(
  text: string,
  locations: HaberHaritasiLocation[],
): HaberHaritasiLocation | null {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  const institution = findCapitalInstitutionLocation(raw, locations);
  if (institution) return institution;

  for (const location of locations) {
    if (location.kind === "tr-province") {
      if (isLikelyNonTurkishNewsText(raw) && !hasTurkishCapitalInstitutionKeyword(raw)) continue;
      for (const term of location.searchTerms) {
        const normTerm = normalizeHmMapCityKey(term);
        if (normTerm.length < 3) continue;
        if (matchTrProvinceTermInText(raw, term, location.key)) return location;
      }
      continue;
    }
    for (const term of location.searchTerms) {
      const normTerm = normalizeHmMapCityKey(term);
      if (location.kind === "country" && normTerm.length < 5) continue;
      if (matchLocationTermInText(raw, term)) return location;
    }
  }
  return null;
}

/** Başlık/gövde — feed metadata yok sayılır (alt bant / callout metin eşleşmesi). */
export function resolveHeadlineLocationFromText(
  title: string,
  body: string,
  locations: HaberHaritasiLocation[],
): HaberHaritasiLocation | null {
  const institution = findCapitalInstitutionLocation(`${title} ${body}`.trim(), locations);
  if (institution) return institution;
  const titleMatch = findLocationInText(title, locations);
  if (titleMatch) return titleMatch;
  return body ? findLocationInText(body, locations) : null;
}

/**
 * Konum çözümlemesi (metin taraması + regex) her item için pahalıdır ve newsmap oluşturucularında
 * aynı item için ~8× tekrarlanır — haritayı açarken ana thread donması ("Sayfa yanıt vermiyor").
 * `locations` dizisi kimliği (bkz. allHaberHaritasiMatchLocations önbelleği) + item nesnesine göre
 * önbelleğe alıp tekrar hesaplamayı önleriz. `locations` değişirse önbellek doğal olarak geçersizleşir.
 */
const resolveLocationCache = new WeakMap<
  object,
  WeakMap<object, HybridNewsLocationMatch | null>
>();

export function resolveLocationForHybridNewsItem(
  item: HomeHybridNewsItem,
  locations: HaberHaritasiLocation[],
): HybridNewsLocationMatch | null {
  let perLocations = resolveLocationCache.get(locations);
  if (!perLocations) {
    perLocations = new WeakMap<object, HybridNewsLocationMatch | null>();
    resolveLocationCache.set(locations, perLocations);
  } else if (perLocations.has(item)) {
    return perLocations.get(item) ?? null;
  }
  const resolved = resolveLocationForHybridNewsItemUncached(item, locations);
  perLocations.set(item, resolved);
  return resolved;
}

function resolveLocationForHybridNewsItemUncached(
  item: HomeHybridNewsItem,
  locations: HaberHaritasiLocation[],
): HybridNewsLocationMatch | null {
  const body = getHybridNewsSearchableBody(item);
  const institution = findCapitalInstitutionLocation(`${item.title} ${body}`.trim(), locations);
  if (institution) return { location: institution, source: "institution" };

  const titleMatch = findLocationInText(item.title, locations);
  if (titleMatch) return { location: titleMatch, source: "title" };

  const bodyMatch = body ? findLocationInText(body, locations) : null;
  if (bodyMatch) return { location: bodyMatch, source: "body" };

  const feedLocation = resolveFeedGeoLocation(item, locations);
  if (feedLocation) return { location: feedLocation, source: "feed" };

  return null;
}

/** Aynı haber (URL/başlık) — tek kayıt, metinden çıkarılan konum feed etiketine baskın. */
export function hybridNewsStoryDedupeKey(item: HomeHybridNewsItem): string {
  const rssUrl = String(item.rssSourceUrl ?? "").trim().toLowerCase();
  if (rssUrl) return `url:${rssUrl}`;
  const titleKey = normalizeHmMapCityKey(item.title).replace(/\s+/g, " ").slice(0, 160);
  if (titleKey.length >= 12) return `title:${titleKey}`;
  const id = String(item.id ?? "").trim();
  if (id) return `id:${id}`;
  return `title:${titleKey || "unknown"}`;
}

export function pickBestHybridNewsDuplicate(
  group: HomeHybridNewsItem[],
  locations: HaberHaritasiLocation[],
): HomeHybridNewsItem {
  if (group.length <= 1) return group[0]!;
  let best = group[0]!;
  let bestResolved = resolveLocationForHybridNewsItem(best, locations);
  let bestScore =
    (bestResolved ? locationMatchPriority(bestResolved.source) : 0) * 10 +
    (bestResolved ? locationKindPriority(bestResolved.location.kind) : 0);

  for (let i = 1; i < group.length; i += 1) {
    const candidate = group[i]!;
    const resolved = resolveLocationForHybridNewsItem(candidate, locations);
    const score =
      (resolved ? locationMatchPriority(resolved.source) : 0) * 10 +
      (resolved ? locationKindPriority(resolved.location.kind) : 0);
    if (score > bestScore) {
      best = candidate;
      bestResolved = resolved;
      bestScore = score;
      continue;
    }
    if (score === bestScore) {
      const bestTs = Date.parse(best.publishedAt ?? "") || 0;
      const candTs = Date.parse(candidate.publishedAt ?? "") || 0;
      if (candTs > bestTs) {
        best = candidate;
        bestResolved = resolved;
      }
    }
  }

  if (bestResolved && bestResolved.source !== "feed") return best;
  return best;
}

export function dedupeHybridNewsItemsForMap(
  items: HomeHybridNewsItem[],
  locations: HaberHaritasiLocation[],
): HomeHybridNewsItem[] {
  const groups = new Map<string, HomeHybridNewsItem[]>();
  for (const item of items) {
    const key = hybridNewsStoryDedupeKey(item);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.values()].map((group) => pickBestHybridNewsDuplicate(group, locations));
}

export function stripHtmlToPlainText(html: string): string {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getHybridNewsSearchableBody(item: HomeHybridNewsItem): string {
  const parts: string[] = [];
  if (item.spot?.trim()) parts.push(item.spot.trim());
  if (item.content?.trim()) parts.push(stripHtmlToPlainText(item.content));
  return parts.join(" ");
}

/** Önce başlık/gövde metni, yoksa RSS feed geo metadata. */
export function findLocationForHybridNewsItem(
  item: HomeHybridNewsItem,
  locations: HaberHaritasiLocation[],
): HaberHaritasiLocation | null {
  return resolveLocationForHybridNewsItem(item, locations)?.location ?? null;
}

function hybridNewsMapSlotScore(
  item: HomeHybridNewsItem,
  locations: HaberHaritasiLocation[],
): number {
  const resolved = resolveLocationForHybridNewsItem(item, locations);
  let score = parseHaberHaritasiPublishedAt(item.publishedAt) / 1e12;
  if (resolved) score += locationMatchPriority(resolved.source) * 100;
  if (resolved) score += locationKindPriority(resolved.location.kind);
  return score;
}

function shouldReplaceHybridNewsMapSlot(
  current: HomeHybridNewsItem,
  candidate: HomeHybridNewsItem,
  locations: HaberHaritasiLocation[],
): boolean {
  return hybridNewsMapSlotScore(candidate, locations) > hybridNewsMapSlotScore(current, locations);
}

/** Konum anahtarı → en güncel haber (metin çözümlemesi feed geo'dan önce). */
export function buildHmMapCityNewsIndex(
  items: HomeHybridNewsItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): Map<string, HomeHybridNewsItem> {
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const deduped = dedupeHybridNewsItemsForMap(items, locations);
  const index = new Map<string, HomeHybridNewsItem>();
  for (const item of deduped) {
    const location = findLocationForHybridNewsItem(item, locations);
    if (!location) continue;
    const existing = index.get(location.key);
    if (!existing || shouldReplaceHybridNewsMapSlot(existing, item, locations)) {
      index.set(location.key, item);
    }
  }
  return index;
}

export function buildHmMapCityNewsMatches(
  items: HomeHybridNewsItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): Map<string, HaberHaritasiNewsMatch> {
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const deduped = dedupeHybridNewsItemsForMap(items, locations);
  const index = new Map<string, HaberHaritasiNewsMatch>();
  for (const item of deduped) {
    const location = findLocationForHybridNewsItem(item, locations);
    if (!location) continue;
    const existing = index.get(location.key);
    if (!existing || shouldReplaceHybridNewsMapSlot(existing.item, item, locations)) {
      index.set(location.key, { location, item });
    }
  }
  return index;
}

function headlineFromNewsMatch(
  location: HaberHaritasiLocation,
  item: HomeHybridNewsItem,
): HmMapCityHeadline {
  return {
    city: location.label,
    title: item.title,
    href: item.href,
    publishedAt: item.publishedAt ?? null,
    countryCode: location.countryCode,
    flagEmoji: countryCodeToFlagEmoji(location.countryCode),
    isTurkish: location.kind === "tr-province" || isTurkishProvinceName(location.label),
    kind: "news",
    thumbnail: item.imageUrl ?? null,
    spot: item.spot ?? null,
    content: item.content ?? null,
    source: item.source,
    rssSourceUrl: item.rssSourceUrl ?? null,
    originUrl: item.originUrl ?? null,
    sourceSiteUrl: item.sourceSiteUrl ?? null,
    publishedOnSiteId: item.publishedOnSiteId ?? null,
    sourceSiteSlug: item.sourceSiteSlug ?? null,
    feedLabel: item.feedLabel ?? null,
    categorySlug: item.categorySlug ?? null,
    geoLat: location.lat,
    geoLng: location.lng,
    regionKey: item.regionKey ?? null,
  };
}

function headlineFromVideoMatch(
  location: HaberHaritasiLocation,
  item: HaberHaritasiVideoItem,
  videoHome: string,
): HmMapCityHeadline {
  return {
    city: location.label,
    title: item.title,
    href: yektubeWatchPath(item.sourceId, item.videoId, videoHome),
    publishedAt: item.publishedAt ?? null,
    countryCode: location.countryCode,
    flagEmoji: countryCodeToFlagEmoji(location.countryCode),
    isTurkish: location.kind === "tr-province" || isTurkishProvinceName(location.label),
    kind: "video",
    thumbnail: item.thumbnail ?? null,
    videoId: item.videoId,
    sourceId: item.sourceId,
  };
}

export function buildHmMapCityHeadlinesPerCity(
  newsItems: HomeHybridNewsItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  videoItems: HaberHaritasiVideoItem[] = [],
  videoHome = "/yektube",
): HmMapCityHeadline[] {
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const locByKey = new Map(locations.map((loc) => [loc.key, loc]));
  const contentIndex = buildHmMapCityContentIndex(newsItems, videoItems, ilCenters, videoHome);
  const rows: HmMapCityHeadline[] = [];
  for (const [key, match] of contentIndex) {
    const loc = locByKey.get(key);
    const label = loc?.label ?? key;
    rows.push({
      city: label,
      title: match.title,
      href: match.href,
      publishedAt: match.publishedAt,
      countryCode: loc?.countryCode,
      flagEmoji: loc ? countryCodeToFlagEmoji(loc.countryCode) : undefined,
      isTurkish: loc ? loc.kind === "tr-province" || isTurkishProvinceName(loc.label) : undefined,
      kind: match.kind,
      thumbnail: match.thumbnail,
      spot: match.spot ?? null,
      content: match.content ?? null,
      source: match.source,
      rssSourceUrl: match.rssSourceUrl ?? null,
      originUrl: match.originUrl ?? null,
      sourceSiteUrl: match.sourceSiteUrl ?? null,
      publishedOnSiteId: match.publishedOnSiteId ?? null,
      sourceSiteSlug: match.sourceSiteSlug ?? null,
      feedLabel: match.feedLabel ?? null,
      categorySlug: match.categorySlug ?? null,
      geoLat: loc?.lat,
      geoLng: loc?.lng,
      regionKey: null,
    });
  }
  rows.sort(
    (a, b) => parseHaberHaritasiPublishedAt(b.publishedAt) - parseHaberHaritasiPublishedAt(a.publishedAt),
  );
  return rows;
}

export function buildHmMapCityKindCounts(
  newsItems: HomeHybridNewsItem[],
  videoItems: HaberHaritasiVideoItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): { news: Map<string, number>; video: Map<string, number> } {
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const deduped = dedupeHybridNewsItemsForMap(newsItems, locations);
  const news = new Map<string, number>();
  const video = new Map<string, number>();
  for (const item of deduped) {
    const location = findLocationForHybridNewsItem(item, locations);
    if (!location) continue;
    news.set(location.key, (news.get(location.key) ?? 0) + 1);
  }
  for (const item of videoItems) {
    const location = findLocationForVideoItem(item, locations);
    if (!location) continue;
    video.set(location.key, (video.get(location.key) ?? 0) + 1);
  }
  return { news, video };
}

export function mergeHmMapCityContentIndexes(
  ...indexes: Array<Map<string, HmMapCityContentMatch>>
): Map<string, HmMapCityContentMatch> {
  const merged = new Map<string, HmMapCityContentMatch>();
  for (const index of indexes) {
    for (const [key, match] of index) {
      const existing = merged.get(key);
      if (
        !existing ||
        parseHaberHaritasiPublishedAt(match.publishedAt) >= parseHaberHaritasiPublishedAt(existing.publishedAt)
      ) {
        merged.set(key, match);
      }
    }
  }
  return merged;
}

export function buildHmMapCityHeadlines(
  items: HomeHybridNewsItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  limit = 24,
  videoItems: HaberHaritasiVideoItem[] = [],
  videoHome = "/yektube",
): HmMapCityHeadline[] {
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const deduped = dedupeHybridNewsItemsForMap(items, locations);
  const rows: HmMapCityHeadline[] = [];
  for (const item of deduped) {
    const location = findLocationForHybridNewsItem(item, locations);
    if (!location) continue;
    rows.push(headlineFromNewsMatch(location, item));
  }
  for (const item of videoItems) {
    const location = findLocationForVideoItem(item, locations);
    if (!location) continue;
    rows.push(headlineFromVideoMatch(location, item, videoHome));
  }
  rows.sort(
    (a, b) => parseHaberHaritasiPublishedAt(b.publishedAt) - parseHaberHaritasiPublishedAt(a.publishedAt),
  );
  return dedupeHeadlinesByStory(rows).slice(0, limit);
}

function headlineStoryKey(headline: HmMapCityHeadline): string {
  return hybridNewsStoryDedupeKey({
    id: headline.href,
    title: headline.title,
    href: headline.href,
    rssSourceUrl: headline.rssSourceUrl ?? null,
  });
}

function headlineLocationPreferScore(headline: HmMapCityHeadline, locations: HaberHaritasiLocation[]): number {
  const body = `${headline.spot ?? ""} ${headline.content ?? ""}`.trim();
  const resolved = resolveHeadlineLocationFromText(headline.title, body, locations);
  const resolvedKey = resolved ? normalizeHmMapCityKey(resolved.label) : "";
  const rowKey = normalizeHmMapCityKey(headline.city);
  let score = 0;
  if (resolvedKey && rowKey === resolvedKey) score += 20;
  if (headline.isTurkish) score += 4;
  if (rowKey === "ankara") score += 2;
  return score;
}

/** Ticker/callout — aynı haber başlığı tek satır (en iyi metin-konum etiketi). */
export function dedupeHeadlinesByStory(
  headlines: HmMapCityHeadline[],
  locations: HaberHaritasiLocation[] = allHaberHaritasiMatchLocations([]),
): HmMapCityHeadline[] {
  const seen = new Map<string, HmMapCityHeadline>();
  for (const row of headlines) {
    const key = headlineStoryKey(row);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, row);
      continue;
    }
    if (headlineLocationPreferScore(row, locations) > headlineLocationPreferScore(existing, locations)) {
      seen.set(key, row);
    }
  }
  return [...seen.values()];
}

export function buildHmMapCityContentIndex(
  newsItems: HomeHybridNewsItem[],
  videoItems: HaberHaritasiVideoItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  videoHome = "/yektube",
): Map<string, HmMapCityContentMatch> {
  const newsIndex = buildHmMapCityNewsIndex(newsItems, ilCenters);
  const videoIndex = buildHaberHaritasiVideoIndex(videoItems, ilCenters);
  const merged = new Map<string, HmMapCityContentMatch>();
  const keys = new Set([...newsIndex.keys(), ...videoIndex.keys()]);
  for (const key of keys) {
    const news = newsIndex.get(key);
    const video = videoIndex.get(key);
    const newsTs = news ? parseHaberHaritasiPublishedAt(news.publishedAt) : 0;
    const videoTs = video ? parseHaberHaritasiPublishedAt(video.publishedAt) : 0;
    if (video && (!news || videoTs >= newsTs)) {
      merged.set(key, {
        kind: "video",
        title: video.title,
        href: yektubeWatchPath(video.sourceId, video.videoId, videoHome),
        thumbnail: video.thumbnail ?? null,
        publishedAt: video.publishedAt ?? null,
        videoId: video.videoId,
        sourceId: video.sourceId,
      });
    } else if (news) {
      merged.set(key, {
        kind: "news",
        title: news.title,
        href: news.href,
        thumbnail: news.imageUrl ?? null,
        publishedAt: news.publishedAt ?? null,
        spot: news.spot ?? null,
        content: news.content ?? null,
        source: news.source,
        rssSourceUrl: news.rssSourceUrl ?? null,
        originUrl: news.originUrl ?? null,
        sourceSiteUrl: news.sourceSiteUrl ?? null,
        publishedOnSiteId: news.publishedOnSiteId ?? null,
        sourceSiteSlug: news.sourceSiteSlug ?? null,
        feedLabel: news.feedLabel ?? null,
        categorySlug: news.categorySlug ?? null,
      });
    }
  }
  return merged;
}

export function formatHmMapCityHeadlineLabel(row: HmMapCityHeadline): string {
  const prefix = row.kind === "video" ? "▶ " : "";
  return `${row.city}: ${prefix}${row.title}`;
}

export function formatHmMapCityHeadlineExcerpt(headline: Pick<HmMapCityHeadline, "spot" | "content">): string {
  const spot = String(headline.spot ?? "").trim();
  if (spot) return spot;
  const plain = stripHtmlToPlainText(String(headline.content ?? ""));
  if (!plain) return "";
  return plain.length > 480 ? `${plain.slice(0, 477).trim()}…` : plain;
}

export function formatHmMapCityHeadlineTime(value?: string | null): string {
  const ts = parseHaberHaritasiPublishedAt(value);
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function truncateHmMapNewsText(text: string, max = 56): string {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** RSS / haberler/rss önizleme — haritada site-içi /haber slug yerine overlay. */
export function shouldNewsmapHeadlineOpenOverlay(
  headline: Pick<HmMapCityHeadline, "kind" | "source" | "href" | "rssSourceUrl">,
): boolean {
  if (headline.kind === "video") return false;
  if (headline.source === "rss") return true;
  const href = String(headline.href ?? "").trim();
  if (/\/haberler\/rss\//i.test(href)) return true;
  const rssUrl = String(headline.rssSourceUrl ?? "").trim();
  if (rssUrl && (/^https?:\/\//i.test(rssUrl) || /^\/\//.test(rssUrl))) return true;
  return false;
}

/** @deprecated use matchLocationTermInText */
export function matchHybridNewsTitleToCity(title: string, cityName: string): boolean {
  return matchLocationTermInText(title, cityName);
}

/** @deprecated use findLocationForHybridNewsItem */
export function findCityForHybridNewsTitle(title: string): string | null {
  const loc = findLocationInText(title, allHaberHaritasiMatchLocations([]));
  return loc?.label ?? null;
}
