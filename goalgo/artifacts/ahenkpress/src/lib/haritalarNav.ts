/**
 * Kazıyıcıdan gelen `googlePlaceId` çoğu zaman gerçek place_id değil, Google Maps
 * URL'sinin `data=!4m...!19s<place_id>` bloğudur (ör.
 * `data=!4m10!3m9!1s0x14d34...!19sChIJ1fMZmfpO0xQRCo3CDL39H2g`). Bu blob bütün
 * Ankara işletmelerinde ortak `!1s0x14d34...` ön ekiyle başladığından her kartın
 * "İncele" bağlantısı aynı/yanlış place_id taşıyormuş gibi görünür ve Google
 * Places API'ya gönderildiğinde INVALID_REQUEST döner. Burada gerçek place_id'yi
 * (`ChIJ...` / `GhIJ...`) ayıklarız; ayıklanamıyorsa (sentetik `gmaps_...` veya
 * çözülemeyen blob) `null` döneriz ki URL'ye bozuk bir place_id eklenmesin.
 */
function isGoogleMapsHexCid(value: string): boolean {
  return /^0x[0-9a-f]+$/i.test(value) || value.includes(":0x");
}

/** Gerçek Google place_id (ChIJ… / GhIJ…) mi — paylaşılan !1s0x… hex CID değil. */
function isLikelyGooglePlaceId(value: string): boolean {
  if (!value || isGoogleMapsHexCid(value)) return false;
  if (/^(ChI|GhI|Ei)[A-Za-z0-9_-]{10,}$/.test(value)) return true;
  return /^[A-Za-z0-9_-]{15,}$/.test(value) && !value.startsWith("gmaps_");
}

export function extractGooglePlaceId(raw?: string | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const marker = value.indexOf("!19s");
  if (marker >= 0) {
    const rest = value.slice(marker + 4);
    const candidate = rest.split("!")[0]?.trim() ?? "";
    return isLikelyGooglePlaceId(candidate) ? candidate : null;
  }
  // Sentetik veya çözülemeyen Google Maps data blob'ları gerçek place_id değildir.
  if (value.startsWith("gmaps_")) return null;
  if (value.includes("data=") || value.includes("!") || value.includes("/")) return null;
  return isLikelyGooglePlaceId(value) ? value : null;
}

/** Eski `/haritalar?…` ve `/haritalar/…` bağlantılarını `/map` ile değiştir. */
export function rewriteHaritalarPathToMap(href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "/map";
  if (/^\/haritalar\?/i.test(raw)) return raw.replace(/^\/haritalar/i, "/map");
  if (/^\/haritalar(?:\/|$)/i.test(raw)) return raw.replace(/^\/haritalar/i, "/map");
  return raw;
}

/** Arama/konum niyeti → tam ekran harita rotası */
export function buildMapSearchHref(opts: {
  q?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  zoom?: number | null;
  superCategory?: string | null;
  nav?: string | number | null;
}): string {
  const params = new URLSearchParams();
  const q = String(opts.q ?? "").trim();
  if (q) params.set("q", q);
  const city = String(opts.city ?? "").trim();
  if (city) params.set("city", city);
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  const zoom = Number(opts.zoom);
  if (Number.isFinite(zoom)) params.set("zoom", String(Math.max(1, Math.min(20, Math.round(zoom)))));
  const superCat = String(opts.superCategory ?? "").trim();
  if (superCat) params.set("superCategory", superCat);
  const nav = String(opts.nav ?? "").trim();
  if (nav) params.set("nav", nav);
  const qs = params.toString();
  return qs ? `/map?${qs}` : "/map";
}

/** Haritalar / Keşfet harita rotası — Google dış link yerine dahili navigasyon. */
export function haritalarNavHref(opts: {
  id?: string | number | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  district?: string | null;
  /** Varsayılan: tüm aktif işletmeler küme modunda (serverCluster). */
  cluster?: boolean;
}): string {
  const params = new URLSearchParams();
  const id = String(opts.id ?? "").trim();
  const slug = String(opts.slug ?? "").trim();
  const city = String(opts.city ?? "").trim();
  const district = String(opts.district ?? "").trim();
  if (id) params.set("nav", id);
  else if (slug) params.set("nav", slug);
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  if (city) params.set("city", city);
  if (district) params.set("district", district);
  const locParts = [district, city].filter(Boolean).join(", ");
  if (locParts) params.set("location", `${locParts}, Türkiye`);
  if (opts.cluster !== false) params.set("layers", "serverCluster");
  const q = params.toString();
  return q ? `/map?${q}` : "/map";
}

/** Yekpare Haritalar'da yol tarifi modu — `directions=1` (SariSayfalarDetay "Yol tarifi al"). */
export function haritalarDirectionsHref(opts: {
  id?: string | number | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Koordinat yoksa hedef adres metni (geocode / işletme getirimi için). */
  location?: string | null;
}): string | null {
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const id = String(opts.id ?? "").trim();
  const slug = String(opts.slug ?? "").trim();
  const location = String(opts.location ?? "").trim();
  if (!id && !slug && !hasCoords && !location) return null;

  const params = new URLSearchParams();
  if (id) params.set("nav", id);
  else if (slug) params.set("nav", slug);
  if (hasCoords) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  if (location) params.set("location", location);
  params.set("directions", "1");
  return `/map?${params.toString()}`;
}

/**
 * Kazınan (doğrulanmamış) işletmeler özel `/kesfet/:slug` sayfası almaz; doğrudan tam ekran
 * harita penceresine yönlendirilir: `/map?lat&lng&zoom&location&place_id`.
 */
export function kesfetBusinessMapHref(opts: {
  id?: string | number | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
  googlePlaceId?: string | null;
  zoom?: number | null;
}): string {
  const params = new URLSearchParams();
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    const zoom = Number.isFinite(Number(opts.zoom)) ? Math.round(Number(opts.zoom)) : 17;
    params.set("zoom", String(Math.max(1, Math.min(20, zoom))));
  }
  const name = String(opts.name ?? "").trim();
  if (name) params.set("location", name);
  const id = String(opts.id ?? "").trim();
  if (id) params.set("nav", id);
  // nav + koordinat varken place_id ekleme: kazıyıcıdan gelen paylaşımlı 0x… CID veya
  // bozuk blob yanlış Google geocode'a (tüm kartlar aynı işletmeye) yol açabilir.
  if (!id) {
    const placeId = extractGooglePlaceId(opts.googlePlaceId);
    if (placeId) params.set("place_id", placeId);
  }
  const q = params.toString();
  return q ? `/map?${q}` : "/map";
}

/** Mevcut sorgu parametrelerini koruyarak tam ekran harita rotası. */
export function haritalarFullscreenHref(search?: string): string {
  const q = (search ?? (typeof window !== "undefined" ? window.location.search : "")).trim();
  return q ? `/map${q}` : "/map";
}

function decodePlacePathSegment(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, "%20")).trim();
  } catch {
    return raw.replace(/\+/g, " ").trim();
  }
}

function parseMapCoord(raw: string | null, min: number, max: number): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

function parseMapZoom(raw: string | null, fallback = 13): number {
  const value = Number(String(raw ?? "").replace(/z$/i, ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(20, Math.round(value)));
}

/** Canonical tam ekran harita URL'si — `/maps?city=…&lat=…&lng=…&zoom=…` */
export function buildYekpareMapUrl(opts: {
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  zoom?: number | null;
  location?: string | null;
  q?: string | null;
}): string {
  const params = new URLSearchParams();
  const city = String(opts.city ?? "").trim();
  if (city) params.set("city", city);
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  const zoom = Number(opts.zoom);
  if (Number.isFinite(zoom)) {
    params.set("zoom", String(Math.max(1, Math.min(20, Math.round(zoom)))));
  }
  const location = String(opts.location ?? "").trim();
  if (location) params.set("location", location);
  const q = String(opts.q ?? "").trim();
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/maps?${qs}` : "/maps";
}

/** Eski Google-benzeri `/maps/place/Ad/@lat,lng,13z` yolunu ayrıştırır (`%40` dahil). */
export function parseLegacyMapsPlacePath(path: string): { name: string; lat: number; lng: number; zoom: number } | null {
  const normalized = path.replace(/%40/gi, "@");
  const match = normalized.match(/^\/maps\/place\/([^/]+)\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d{1,2})z(?:\/.*)?$/i);
  if (!match) return null;
  const lat = parseMapCoord(match[2] ?? null, -90, 90);
  const lng = parseMapCoord(match[3] ?? null, -180, 180);
  if (lat == null || lng == null) return null;
  return {
    name: decodePlacePathSegment(match[1] ?? "") || "Konum",
    lat,
    lng,
    zoom: parseMapZoom(match[4] ?? null),
  };
}

/** Eski `/maps/@lat,lng,13z` yolunu ayrıştırır. */
export function parseLegacyMapsSyncedPath(path: string): { name: string; lat: number; lng: number; zoom: number } | null {
  const normalized = path.replace(/%40/gi, "@");
  const match = normalized.match(/^\/maps\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d{1,2})z(?:\/.*)?$/i);
  if (!match) return null;
  const lat = parseMapCoord(match[1] ?? null, -90, 90);
  const lng = parseMapCoord(match[2] ?? null, -180, 180);
  if (lat == null || lng == null) return null;
  return {
    name: "Harita konumu",
    lat,
    lng,
    zoom: parseMapZoom(match[3] ?? null),
  };
}

/** Eski `/maps/place/…/@…` veya `/maps/@…` → kanonik `/maps?…` sorgu dizesi. */
export function legacyMapsPathToCanonicalHref(path: string, existingQuery = ""): string | null {
  const place = parseLegacyMapsPlacePath(path) ?? parseLegacyMapsSyncedPath(path);
  if (!place) return null;
  const params = new URLSearchParams(existingQuery.replace(/^\?/, ""));
  if (!params.get("city") && place.name !== "Harita konumu") params.set("city", place.name);
  params.set("lat", String(place.lat));
  params.set("lng", String(place.lng));
  params.set("zoom", String(place.zoom));
  if (!params.get("location") && place.name !== "Harita konumu") params.set("location", place.name);
  return `/maps?${params.toString()}`;
}

export function haritalarPlaceHref(opts: {
  name: string;
  lat: number;
  lng: number;
  zoom?: number | null;
  fullscreen?: boolean;
}): string {
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "/maps";
  }
  const zoom = Number.isFinite(Number(opts.zoom)) ? Math.round(Number(opts.zoom)) : 13;
  const safeZoom = Math.max(1, Math.min(20, zoom));
  const name = String(opts.name ?? "").trim() || "Konum";
  return buildYekpareMapUrl({
    city: name,
    lat,
    lng,
    zoom: safeZoom,
    location: name,
  });
}
