import {
  HABER_HARITASI_GLOBAL_LOCATIONS,
  isTurkishProvinceName,
  matchHaberHaritasiGlobalLocation,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import { haversineDistanceKm } from "@/lib/haberHaritasiGeoFilter";
import { isNewsmapTurkeyOrKktcViewport } from "@/lib/haberHaritasiNewsmapBottomBand";
import { normalizeHmMapCityKey } from "@/lib/hmMapCityNews";

export function resolveIlCenterFromSearchQuery(
  rawQuery: string,
  ilCenters: Array<{ plaka?: number | null; adi: string; lat: number; lng: number; zoom: number }>,
): { adi: string; lat: number; lng: number; zoom: number } | null {
  const q = normalizeHmMapCityKey(rawQuery.split(",")[0]?.trim() || rawQuery);
  if (q.length < 2) return null;
  for (const il of ilCenters) {
    const key = normalizeHmMapCityKey(il.adi);
    if (key === q || key.includes(q) || q.includes(key)) return il;
  }
  return null;
}

export type NewsmapLocationContext = {
  /** Ham etiket (panel başlığı). */
  fullLabel: string;
  /** Şehir / bölge adı. */
  cityLabel: string;
  /** Ülke adı (Türkçe tercih). */
  countryLabel: string | null;
  cityKey: string;
  countryKey: string | null;
  /** Türkiye ili. */
  isTrProvince: boolean;
  /** Yabancı konum (TR ili değil). */
  isForeign: boolean;
  /** Bilinen küresel konum kaydı. */
  globalLoc: HaberHaritasiLocation | null;
};

/** "Endonezya Bali", "Bali, Endonezya", "Ankara" → şehir + ülke meta. */
export function resolveNewsmapLocationContext(
  label: string,
  countryHint?: string | null,
): NewsmapLocationContext {
  const raw = String(label ?? "").trim();
  const hint = String(countryHint ?? "").trim() || null;

  let cityLabel = raw;
  let countryLabel: string | null = hint;

  const commaParts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    cityLabel = commaParts[0]!;
    // "Keçiören, Ankara" — ikinci parça il; ülke değil.
    if (isTurkishProvinceName(commaParts[1]!)) {
      countryLabel = hint;
    } else {
      countryLabel = commaParts.slice(1).join(", ");
    }
  } else {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const firstGlobal = matchHaberHaritasiGlobalLocation(words[0]!);
      if (firstGlobal?.kind === "country") {
        countryLabel = firstGlobal.label;
        cityLabel = words.slice(1).join(" ");
      }
    }
  }

  const cityKey = normalizeHmMapCityKey(cityLabel);
  const isTrProvince = isTurkishProvinceName(cityLabel);

  let globalLoc = matchHaberHaritasiGlobalLocation(cityLabel);
  if (!globalLoc && countryLabel) {
    globalLoc = matchHaberHaritasiGlobalLocation(countryLabel);
  }

  if (!countryLabel && globalLoc) {
    if (globalLoc.kind === "country") {
      countryLabel = globalLoc.label;
    } else {
      const parent = HABER_HARITASI_GLOBAL_LOCATIONS.find(
        (loc) => loc.kind === "country" && loc.countryCode === globalLoc!.countryCode,
      );
      countryLabel = parent?.label ?? null;
    }
  }

  const countryKey = countryLabel ? normalizeHmMapCityKey(countryLabel) : null;

  return {
    fullLabel: raw,
    cityLabel,
    countryLabel,
    cityKey,
    countryKey,
    isTrProvince,
    isForeign: !isTrProvince,
    globalLoc,
  };
}

export type NewsmapLocationQueryResolution = {
  /** Panel / alt bant etiketi (ham). */
  displayLabel: string;
  /** Haber/video API sorgusu — il veya şehir adı. */
  queryLabel: string;
  countryHint: string | null;
};

/** Koordinat + etiket — ilçe/mahalle seçiminde il haberlerini çek. */
export function resolveNearestTurkishProvinceFromCoords(
  lat: number,
  lng: number,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
  maxDistKm = 120,
): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || ilCenters.length === 0) return null;
  let best: { adi: string; distKm: number } | null = null;
  for (const il of ilCenters) {
    const distKm = haversineDistanceKm(lat, lng, il.lat, il.lng);
    if (!best || distKm < best.distKm) best = { adi: il.adi, distKm };
  }
  if (!best || best.distKm > maxDistKm) return null;
  return best.adi;
}

/** Haber/video/wiki sorgusu — virgüllü etiket, ilçe ve lat/lng ile il adına çöz. */
export function resolveNewsmapLocationQueryLabel(
  label: string,
  opts?: {
    lat?: number | null;
    lng?: number | null;
    ilCenters?: Array<{ adi: string; lat: number; lng: number; zoom: number }>;
    countryHint?: string | null;
  },
): NewsmapLocationQueryResolution {
  const raw = String(label ?? "").trim();
  const ilCenters = opts?.ilCenters ?? [];
  const lat = opts?.lat;
  const lng = opts?.lng;

  if (!raw) {
    return { displayLabel: "", queryLabel: "", countryHint: null };
  }

  const commaParts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2 && isTurkishProvinceName(commaParts[1]!)) {
    return {
      displayLabel: raw,
      queryLabel: commaParts[1]!,
      countryHint: null,
    };
  }

  const ctx = resolveNewsmapLocationContext(raw, opts?.countryHint);
  let queryLabel = ctx.cityLabel;

  if (ctx.isTrProvince) {
    return { displayLabel: raw, queryLabel: ctx.cityLabel, countryHint: ctx.countryLabel };
  }

  const ilFromText = ilCenters.length > 0 ? resolveIlCenterFromSearchQuery(raw, ilCenters) : null;
  if (ilFromText) {
    queryLabel = ilFromText.adi;
  } else if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    ilCenters.length > 0 &&
    isNewsmapTurkeyOrKktcViewport(lat as number, lng as number)
  ) {
    const nearest = resolveNearestTurkishProvinceFromCoords(lat as number, lng as number, ilCenters);
    if (nearest) queryLabel = nearest;
  }

  return {
    displayLabel: raw,
    queryLabel,
    countryHint: ctx.countryLabel,
  };
}

/** Google News arama sorgusu — `{ülke} {şehir} son dakika haberleri`. */
export function buildLocationGoogleNewsQuery(ctx: NewsmapLocationContext): string {
  const city = ctx.cityLabel.trim();
  const country = ctx.countryLabel?.trim() || "";
  if (country && normalizeHmMapCityKey(country) !== ctx.cityKey) {
    return `${country} ${city} son dakika haberleri`.trim();
  }
  if (ctx.isTrProvince) {
    return `${city} son dakika haberleri`;
  }
  return `${city} son dakika haberleri`;
}

/** YouTube gezi/tanıtım sorguları — çıplak "bali" yerine bağlamlı ifadeler. */
export function buildLocationYoutubeTravelQueries(ctx: NewsmapLocationContext): string[] {
  const city = ctx.cityLabel.trim();
  const country = ctx.countryLabel?.trim() || "";
  const queries: string[] = [];

  if (ctx.isForeign && country && normalizeHmMapCityKey(country) !== ctx.cityKey) {
    queries.push(
      `${city} gezilecek yerler`,
      `${city} tatil`,
      `${city} tanıtım`,
      `${country} ${city} gezi`,
    );
    if (ctx.cityKey === "bali") {
      queries.push("baliye nasıl gidilir", "bali indonesia travel");
    }
    if (ctx.cityKey === "batum" || ctx.cityKey === "batumi") {
      queries.push("batum gezilecek yerler", "gürcistan batum tatil");
    }
  } else {
    queries.push(`${city} gezilecek yerler`, `${city} gezi tanıtım`, `${city} haber`);
  }

  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
}

/**
 * Haber haritası YouTube araması — youtube.com/results?search_query=… biçiminde.
 * Önce çıplak konum (Ankara, New York, Afganistan), sonra gezi/haber varyantları.
 */
export function buildLocationYoutubeSearchQueries(ctx: NewsmapLocationContext): string[] {
  const city = ctx.cityLabel.trim();
  const country = ctx.countryLabel?.trim() || "";
  const queries: string[] = [];

  if (ctx.cityKey !== "bali") {
    queries.push(city);
  }
  queries.push(`${city} gezi tanıtım`);

  if (ctx.isForeign && country && normalizeHmMapCityKey(country) !== ctx.cityKey) {
    queries.push(country);
  }

  for (const q of buildLocationYoutubeTravelQueries(ctx)) {
    queries.push(q);
  }

  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Kısa konum adları için kelime sınırı — "bali" ≠ "bal"/"balina". */
export function textContainsLocationTerm(text: string, term: string): boolean {
  const norm = normalizeHmMapCityKey(text);
  const termNorm = normalizeHmMapCityKey(term);
  if (!termNorm || !norm) return false;

  if (termNorm.length <= 4) {
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(termNorm)}(?:[^a-z0-9]|$)`, "i");
    return re.test(norm);
  }
  return norm.includes(termNorm);
}

/** "bali" aramasında Türkçe yanlış pozitifler (bal, balina, balık…). */
const BALI_VIDEO_FALSE_POSITIVE_RE =
  /\b(bal(?!i)|balina|balik|balikesir|balli|ball|ari\s*bali|balli)\b/i;

const GENERIC_FOREIGN_FALSE_POSITIVE_RE =
  /\b(menemen|playstation|motosiklet\s*kurye|kurye\s*motosiklet|ps5|ps4)\b/i;

export function isLocationNewsFalsePositive(title: string, spot: string, ctx: NewsmapLocationContext): boolean {
  if (!ctx.isForeign) return false;
  const hay = `${title} ${spot}`;
  if (textContainsLocationTerm(hay, ctx.cityLabel)) return false;
  if (ctx.countryLabel && textContainsLocationTerm(hay, ctx.countryLabel)) return false;

  if (ctx.cityKey === "bali" && BALI_VIDEO_FALSE_POSITIVE_RE.test(normalizeHmMapCityKey(hay))) {
    return true;
  }
  if (GENERIC_FOREIGN_FALSE_POSITIVE_RE.test(normalizeHmMapCityKey(hay))) {
    return true;
  }
  return false;
}

export function isLocationVideoFalsePositive(title: string, description: string, ctx: NewsmapLocationContext): boolean {
  const hay = `${title} ${description}`;
  if (textContainsLocationTerm(hay, ctx.cityLabel)) return false;
  if (ctx.countryLabel && textContainsLocationTerm(hay, ctx.countryLabel)) return false;

  if (ctx.cityKey === "bali") {
    if (BALI_VIDEO_FALSE_POSITIVE_RE.test(normalizeHmMapCityKey(hay))) return true;
  }
  if (GENERIC_FOREIGN_FALSE_POSITIVE_RE.test(normalizeHmMapCityKey(hay))) return true;
  return false;
}

/** Yabancı konumda haber başlığı gerçekten o yere mi ait? */
export function isNewsItemRelevantToLocation(
  title: string,
  spot: string,
  ctx: NewsmapLocationContext,
): boolean {
  if (isLocationNewsFalsePositive(title, spot, ctx)) return false;
  if (textContainsLocationTerm(title, ctx.cityLabel) || textContainsLocationTerm(spot, ctx.cityLabel)) {
    return true;
  }
  if (ctx.countryLabel) {
    const countryInTitle =
      textContainsLocationTerm(title, ctx.countryLabel) || textContainsLocationTerm(spot, ctx.countryLabel);
    if (countryInTitle && ctx.cityKey.length >= 4) {
      return textContainsLocationTerm(title, ctx.cityLabel) || textContainsLocationTerm(spot, ctx.cityLabel);
    }
    if (countryInTitle && ctx.globalLoc?.kind === "country") {
      return true;
    }
  }
  return false;
}

/** Yabancı konumda video başlığı/açıklaması gerçekten o yere mi ait? */
export function isVideoItemRelevantToLocation(
  title: string,
  description: string,
  ctx: NewsmapLocationContext,
): boolean {
  return isNewsItemRelevantToLocation(title, description, ctx);
}

/** İşletme kazıması için konum etiketi. */
export function buildLocationBusinessScrapeLabel(ctx: NewsmapLocationContext): string {
  const city = ctx.cityLabel.trim();
  const country = ctx.countryLabel?.trim();
  if (country && normalizeHmMapCityKey(country) !== ctx.cityKey) {
    return `restoran lokanta özel işletme ${city} ${country}`.slice(0, 96);
  }
  if (ctx.isTrProvince) {
    return `${city} işletmeler`.slice(0, 96);
  }
  return `restaurants ${city}`.slice(0, 96);
}
