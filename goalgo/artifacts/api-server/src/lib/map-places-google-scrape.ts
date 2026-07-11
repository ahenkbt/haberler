import { db } from "@workspace/db";
import { mapBusinessesTable, mapBusinessImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { appendPlacesReferrerHint } from "./google-places-hints.js";
import {
  collectPlaceIdsFromNearby,
  collectPlaceIdsFromTextQuery,
  fetchPlaceDetails,
  buildPhotoUrls,
  openingHoursJson,
  googlePlacesExtras,
  inferServiceFlags,
  sanitizePlaceReviews,
  tagsForImport,
  slugifyMapBusinessName,
} from "./google-places-bulk-import.js";
import {
  fetchPlaceDetailsNew,
  buildNewApiPhotoMediaUrls,
  sanitizePlacesNewForExtras,
  buildPopularHoursFromPlacesNew,
} from "./google-places-new.js";
import { resolveGooglePlaceMapLocation } from "./google-places-location.js";
import { resolveCachedCoverPhoto } from "./map-scraped-image-cache.js";

export class MapPlacesScrapeHttpError extends Error {
  readonly name = "MapPlacesScrapeHttpError";
  constructor(
    readonly statusCode: number,
    readonly payload: Record<string, unknown>,
  ) {
    super(String(payload.error ?? "scrape"));
  }
}

export type MapPlacesGoogleScrapeArgs = {
  textQuery: string;
  lat: number;
  lng: number;
  radius: number;
  category: string;
  keyword: string;
  homepageSuperCategory: string;
  storeType: string;
  maxResults: number;
  markOpeningAll: boolean;
  hybridScrapeOn: boolean;
  placesKey: string;
  mediaLimit?: number;
};

type HybridRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type MapPlacesScrapeLog = { warn: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void };

const GOOGLE_IMPORT_MEDIA_LIMIT = 1;

const PRIVATE_GOOGLE_PLACE_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "meal_takeaway",
  "meal_delivery",
  "food",
  "supermarket",
  "grocery_or_supermarket",
  "convenience_store",
  "store",
  "shopping_mall",
  "clothing_store",
  "shoe_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "jewelry_store",
  "book_store",
  "florist",
  "beauty_salon",
  "hair_care",
  "spa",
  "bar",
  "car_repair",
  "car_rental",
  "electrician",
  "plumber",
  "hardware_store",
  "laundry",
  "lawyer",
  "insurance_agency",
  "real_estate_agency",
  "moving_company",
  "gym",
  "pet_store",
  "lodging",
  "hotel",
  "motel",
  "resort_hotel",
  "guest_house",
  "travel_agency",
  "tourist_information_center",
]);

const PUBLIC_GOOGLE_PLACE_TYPES = new Set([
  "atm",
  "bank",
  "finance",
  "hospital",
  "doctor",
  "health_post",
  "school",
  "primary_school",
  "secondary_school",
  "university",
  "local_government_office",
  "city_hall",
  "community_center",
  "courthouse",
  "department_of_motor_vehicles",
  "embassy",
  "police",
  "fire_station",
  "post_office",
  "park",
  "place_of_worship",
  "mosque",
  "church",
  "notary",
  "pharmacy",
  "drugstore",
  "gas_station",
  "fuel",
  "liquor_store",
  "internet_cafe",
  "amusement_center",
  "video_arcade",
  "casino",
  "night_club",
]);

const PUBLIC_OR_LOW_VALUE_NAME_PATTERNS = [
  /\b(atm|bank|banka|bankamatik|bankasi|kredi|finans)\b/i,
  /\b(arabulucu|arabuluculuk|mediator|mediation|noter|noterligi|notary)\b/i,
  /\b(hastane|hastanesi|devlet hastanesi|kamu hastanesi|public hospital|government hospital)\b/i,
  /\b(saglik merkezi|saglik ocagi|aile sagligi|aile sagligi merkezi|aile hekimi|aile hekimligi|family physician|family health center|public health clinic|toplum sagligi|ilce saglik)\b/i,
  /\b(belediye|kaymakamlik|valilik|hukumet konagi|adliye|tapu|nufus mudurlugu|muhtarlik|muhtar|vergi dairesi|sgk|ptt|emniyet|polis|jandarma|zabita|itfaiye|kamu kurumu|resmi kurum|devlet dairesi|resmi|kamu|devlet)\b/i,
  /\b(okul|ilkokul|lise|universite|devlet okulu|resmi okul|public school|government school|halk egitim)\b/i,
  /\b(cami|mosque|park|eczane|pharmacy|benzinlik|akaryakit|petrol|opet|shell|bp|total|petrol ofisi)\b/i,
  /\b(kiraathane|kiraat hane|kahvehane|coffeehouse|tea house|cay ocagi|cay evi|oyun salonu|oyun evi|internet kafe|internet cafe|game center|arcade|bufe|tekel|tekel bayi|tekel bayii|tobacco shop)\b/i,
];

function normalizeBusinessFilterText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isPrivateBusinessCandidate(name: string, types: string[]): boolean {
  const normalizedName = normalizeBusinessFilterText(name);
  if (!normalizedName || PUBLIC_OR_LOW_VALUE_NAME_PATTERNS.some((pattern) => pattern.test(normalizedName))) return false;
  const normalizedTypes = types.map((type) => normalizeBusinessFilterText(type)).filter(Boolean);
  if (normalizedTypes.some((type) => PUBLIC_GOOGLE_PLACE_TYPES.has(type))) return false;
  return normalizedTypes.some((type) => PRIVATE_GOOGLE_PLACE_TYPES.has(type));
}

function hasPublicImportQuality(input: { photos: string[]; rating: number | null; userRatingsTotal: number | null; reviews: unknown[] }): boolean {
  const hasPhoto = input.photos.some((photo) => Boolean(String(photo ?? "").trim()));
  const hasRating = Number(input.rating) > 0 && Number(input.userRatingsTotal) > 0;
  const hasReview = input.reviews.some(Boolean);
  return hasPhoto || hasRating || hasReview;
}

/**
 * Google Places Text/Nearby → `map_businesses` içe aktarma (admin).
 * @throws MapPlacesScrapeHttpError — 400 benzeri istemci hataları
 */
export async function runMapPlacesGoogleScrape(
  args: MapPlacesGoogleScrapeArgs,
  log: MapPlacesScrapeLog,
  runHybrid: (rows: HybridRow[], lg: MapPlacesScrapeLog) => void,
): Promise<Record<string, unknown>> {
  const {
    textQuery,
    lat,
    lng,
    radius,
    category,
    keyword,
    homepageSuperCategory,
    storeType,
    maxResults,
    markOpeningAll,
    hybridScrapeOn,
    placesKey,
  } = args;
  void hybridScrapeOn;

  const locationBias =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, radius }
      : undefined;

  let placeIds: string[] = [];
  try {
    placeIds = textQuery
      ? await collectPlaceIdsFromTextQuery(placesKey, textQuery, maxResults, locationBias)
      : await collectPlaceIdsFromNearby(placesKey, lat, lng, radius, maxResults, category || undefined, keyword || undefined);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = appendPlacesReferrerHint(raw);
    const hint = /referrer|API keys with|GOOGLE_PLACES_API_KEY/i.test(msg)
      ? "Haritalar Veri Kazıyıcı ile Sipariş/Alışveriş «Google’dan işletme» aynı sunucu anahtarını kullanır."
      : undefined;
    throw new MapPlacesScrapeHttpError(400, { success: false, error: msg, hint });
  }

  const scrapeDebug = {
    mode: textQuery ? ("text" as const) : ("nearby" as const),
    textQuery: textQuery || null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    radius: textQuery ? null : radius,
    category: category || null,
    keyword: keyword || null,
    placeIdCount: placeIds.length,
  };

  if (placeIds.length === 0) {
    return {
      success: true,
      message:
        "0 place_id bulundu. Metin sorgusunu genişletin veya enlem/boylam + yarıçap deneyin; Nearby’de kategori Google türü küçük harf olmalı (örn. cafe, restaurant).",
      imported: 0,
      skipped: 0,
      total: 0,
      errors: [],
      debug: scrapeDebug,
    };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const hybridQueue: HybridRow[] = [];

  async function uniqueSlug(base: string): Promise<string> {
    let s = slugifyMapBusinessName(base) || "isletme";
    const root = s;
    let n = 1;
    while (true) {
      const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, s)).limit(1);
      if (clash.length === 0) return s;
      s = `${root}-${++n}`;
      if (n > 200) return `${root}-${Date.now().toString(36)}`;
    }
  }

  const PLACES_FETCH_CONCURRENCY = 4;

  type FetchedPlace = {
    pid: string;
    skip: boolean;
    d?: Record<string, unknown>;
    newD?: Awaited<ReturnType<typeof fetchPlaceDetailsNew>>;
    err?: string;
  };

  async function fetchOnePlace(pid: string): Promise<FetchedPlace> {
    try {
      const existing = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.googlePlaceId, pid)).limit(1);
      if (existing.length > 0) return { pid, skip: true };
      const d = (await fetchPlaceDetails(placesKey, pid)) as Record<string, unknown>;
      const placeId = String(d.place_id || pid);
      const newD = await fetchPlaceDetailsNew(placesKey, placeId);
      return { pid, skip: false, d, newD };
    } catch (e) {
      return { pid, skip: false, err: `${pid}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200) };
    }
  }

  for (let off = 0; off < placeIds.length; off += PLACES_FETCH_CONCURRENCY) {
    const chunk = placeIds.slice(off, off + PLACES_FETCH_CONCURRENCY);
    const fetched = await Promise.all(chunk.map((pid) => fetchOnePlace(pid)));
    for (const fp of fetched) {
      if (fp.err) {
        errors.push(fp.err);
        continue;
      }
      if (fp.skip) {
        skipped++;
        continue;
      }
      if (!fp.d) continue;
      try {
        const d = fp.d;
        const newD = fp.newD!;
        const placeId = String(d.place_id || fp.pid);
        const name = String(d.name || "İşletme").trim();
        const formattedAddress = (d.formatted_address as string | undefined) || (d.vicinity as string | undefined) || null;
        const resolvedLocation = await resolveGooglePlaceMapLocation(d, textQuery);
        const phone =
          (d.formatted_phone_number as string | undefined) ||
          (d.international_phone_number as string | undefined) ||
          null;
        const website = (d.website as string | undefined) || null;
        const rating = typeof d.rating === "number" ? d.rating : null;
        const userRatingsTotal = typeof d.user_ratings_total === "number" ? d.user_ratings_total : null;
        const geom = d.geometry as { location?: { lat?: number; lng?: number } } | undefined;
        const plat = geom?.location?.lat ?? null;
        const plng = geom?.location?.lng ?? null;
        const types = Array.isArray(d.types) ? (d.types as string[]) : [];
        if (!isPrivateBusinessCandidate(name, types)) {
          skipped++;
          continue;
        }
        const { hasDelivery, hasReservation, hasOnlineOrder } = inferServiceFlags(types);
        const mediaLimit = Math.max(0, Math.min(5, Math.round(Number(args.mediaLimit ?? GOOGLE_IMPORT_MEDIA_LIMIT) || GOOGLE_IMPORT_MEDIA_LIMIT)));
        let photos = buildPhotoUrls(placesKey, d.photos as Array<{ photo_reference?: string }> | undefined, mediaLimit);
        if (newD.ok) {
          const alt = buildNewApiPhotoMediaUrls(newD.place.photos, placesKey, mediaLimit);
          if (alt.length && (!photos.length || alt.length > photos.length)) {
            photos = alt.slice(0, mediaLimit);
          }
        }
        const reviews = sanitizePlaceReviews(d.reviews as Parameters<typeof sanitizePlaceReviews>[0], mediaLimit);
        if (!hasPublicImportQuality({ photos, rating, userRatingsTotal, reviews })) {
          skipped++;
          continue;
        }
        const wh = openingHoursJson(d);
        const extrasBase = googlePlacesExtras(d) as Record<string, unknown>;
        const extras: Record<string, unknown> = { ...extrasBase, actualLocation: resolvedLocation };
        if (newD.ok) {
          extras.placesApiNew = sanitizePlacesNewForExtras(newD.place);
        } else {
          extras.placesApiNewFetch = {
            ok: false,
            status: newD.status,
            message: newD.message,
            bodySnippet: newD.bodySnippet,
          };
        }
        const popularHoursVal = newD.ok ? buildPopularHoursFromPlacesNew(newD.place) : null;
        const businessStatus = d.business_status as string | undefined;
        const tags = tagsForImport(businessStatus, markOpeningAll);
        const priceLevel = typeof d.price_level === "number" ? d.price_level : null;
        const storeVal = storeType || homepageSuperCategory;
        const photoUrl = photos[0] || null;
        const resolvedGallery = await resolveCachedCoverPhoto(photos, {
          homepageSuperCategory,
          storeType: storeVal,
        });
        const coverPhoto = resolvedGallery.coverUrl || photoUrl;
        const galleryPhotos = resolvedGallery.galleryPhotos.length ? resolvedGallery.galleryPhotos : photos;
        const slug = await uniqueSlug(name);

        const [ins] = await db
          .insert(mapBusinessesTable)
          .values({
            googlePlaceId: placeId,
            slug,
            name,
            cityId: resolvedLocation.cityId,
            districtId: resolvedLocation.districtId,
            address: formattedAddress,
            phone: phone || undefined,
            website: website || undefined,
            rating: rating ?? undefined,
            userRatingsTotal: userRatingsTotal ?? undefined,
            latitude: plat ?? undefined,
            longitude: plng ?? undefined,
            photoUrl: coverPhoto || undefined,
            coverPhotoUrl: coverPhoto || undefined,
            description: undefined,
            priceLevel: priceLevel ?? undefined,
            workingHours: wh ?? undefined,
            scrapedPhotos: photos.length ? (photos as unknown as Record<string, unknown>) : undefined,
            scrapedReviews: reviews.length ? (reviews as unknown as Record<string, unknown>) : undefined,
            importSource: "places_api",
            homepageSuperCategory,
            storeType: storeVal,
            isActive: true,
            isPremium: false,
            hasDelivery,
            hasReservation,
            hasOnlineOrder,
            tags,
            googlePlacesExtras: Object.keys(extras).length ? (extras as unknown as Record<string, unknown>) : undefined,
            popularHours: popularHoursVal ? (popularHoursVal as unknown as Record<string, unknown>) : undefined,
          })
          .returning({ id: mapBusinessesTable.id });

        const bid = ins?.id;

        if (bid) {
          for (let i = 0; i < galleryPhotos.length; i++) {
            const imageUrl = galleryPhotos[i];
            if (!imageUrl) continue;
            await db.insert(mapBusinessImagesTable).values({
              businessId: bid,
              imageUrl,
              sortOrder: i,
              isPrimary: i === 0,
            }).onConflictDoNothing().catch(() => {});
          }
          hybridQueue.push({
            id: bid,
            name,
            address: formattedAddress,
            latitude: plat,
            longitude: plng,
          });
        }

        imported++;
      } catch (e) {
        errors.push(`${fp.pid}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200));
      }
    }
  }

  void log;
  void runHybrid;

  return {
    success: true,
    message: `${imported} işletme eklendi, ${skipped} zaten vardı veya filtrelendi${errors.length ? `, ${errors.length} hata` : ""}. Otomatik import varsayılan olarak 1 fotoğraf ve 1 yorum önizlemesiyle temel işletme bilgilerini kaydeder.`,
    imported,
    skipped,
    errors: errors.length ? errors.slice(0, 15) : undefined,
    total: placeIds.length,
    hybridEnqueued: 0,
    debug: { ...scrapeDebug, imported, skipped, errorCount: errors.length },
  };
}
