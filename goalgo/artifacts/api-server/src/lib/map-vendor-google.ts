import axios from "axios";
import { db } from "@workspace/db";
import { mapBusinessesTable, mapBusinessImagesTable, vendorsTable } from "@workspace/db";
import { desc, eq, or, sql, and, inArray } from "drizzle-orm";
import { resolveGooglePlacesApiKey } from "./google-places-key.js";
import { appendPlacesReferrerHint } from "./google-places-hints.js";
import { syncVendorToMapBusiness } from "./vendor-map-sync.js";
import {
  fetchPlaceDetailsNew,
  buildNewApiPhotoMediaUrls,
  sanitizePlacesNewForExtras,
  buildPopularHoursFromPlacesNew,
} from "./google-places-new.js";

let ensuredCols = false;

export async function ensureMapVendorGoogleColumns(): Promise<void> {
  if (ensuredCols) return;
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS import_source TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_place_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS linked_map_business_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_import_kind TEXT`);
  ensuredCols = true;
}

export type PortalVendorType = "delivery" | "ecommerce" | "turizm" | "ulasim";

export function inferMapImportSource(row: {
  googlePlaceId?: string | null;
  scrapedAt?: Date | null;
  scrapedPhotos?: unknown;
  scrapedReviews?: unknown;
}): "gmaps_scrape" | "places_api" | "osm" | null {
  const gid = row.googlePlaceId?.trim() || "";
  if (gid.startsWith("osm_")) return "osm";
  if (gid.startsWith("gmaps_")) return "gmaps_scrape";
  if (row.scrapedAt || row.scrapedPhotos || row.scrapedReviews) return "gmaps_scrape";
  if (gid) return "places_api";
  return null;
}

export function vendorTypeFromMapSuper(
  homepageSuperCategory: string | null | undefined,
  storeType: string | null | undefined,
): PortalVendorType {
  const hp = (homepageSuperCategory || "").toLowerCase();
  const st = (storeType || "").toLowerCase();
  const s = `${hp} ${st}`;

  if (s.includes("turizm")) return "turizm";
  if (s.includes("ulasim") || s.includes("ulaşım")) return "ulasim";
  if (s.includes("seyahat")) return "ulasim";

  /** Konaklama, tur, yat, kiralık araç vb. — Places’ta «Otel» servis türü + mekan_dukkan üst şerit sık görülür */
  if (
    /\b(otel|hotel|motel|hostel|pansiyon|resort|lodging|konaklama|tatil\s*koyu|tatil\s*köyü)\b/.test(s) ||
    /\b(bungalov|bungalow|villa|chalet|glamping|kamp\s*alan|campground)\b/.test(s) ||
    /\b(rent\s*a\s*car|rentacar|ara[cç]\s*kiral|oto\s*kiral|car\s*rental)\b/.test(s) ||
    /\b(yat|tekne|marina|gulet|boat\s*tour|tekne\s*tur)\b/.test(s) ||
    /\b(günübirlik|gunubirlik|city\s*tour|privat\s*tur|gezi\s*tur|package\s*tour)\b/.test(s)
  ) {
    return "turizm";
  }

  /** E-ticaret / mağaza (sipariş / yemek ile karışmasın) */
  if (hp === "alisveris" || st === "alisveris" || st.startsWith("alisveris_")) return "ecommerce";
  if (st === "hizmet" || st === "hizmetler") return "ecommerce";

  /**
   * Sipariş & mahalle dükkanı: `mekan_dukkan` üst kategoride bile `mekan_restoran` vb. store_type
   * varken önceki mantık yanlışlıkla e‑ticarete düşürüyordu.
   */
  if (
    hp === "siparis" ||
    s.includes("sipariş") ||
    s.includes("siparis") ||
    s.includes("yiyecek") ||
    st === "siparis" ||
    st.startsWith("siparis_") ||
    st.startsWith("mekan_restoran") ||
    st.startsWith("mekan_kafe") ||
    st.startsWith("mekan_fastfood") ||
    st.startsWith("mekan_market") ||
    st.startsWith("mekan_kuruyemis") ||
    st.startsWith("mekan_manav") ||
    st.startsWith("mekan_kasap") ||
    st.startsWith("mekan_tavuk") ||
    st.startsWith("mekan_balik") ||
    st.startsWith("mekan_firin") ||
    st.startsWith("mekan_simit") ||
    st.startsWith("mekan_eczane") ||
    st.startsWith("mekan_icecek") ||
    st.startsWith("mekan_cicek") ||
    st.startsWith("mekan_petshop") ||
    st.startsWith("mekan_kitap") ||
    st.startsWith("mekan_dukkan_diger")
  ) {
    return "delivery";
  }

  /** Keşfet / harita üst şeridi: `mekan_dukkan`, `mekan_*` → teslimat paneli (önceden yanlışlıkla e‑ticarete düşüyordu). */
  if (hp === "mekan_dukkan" || hp.startsWith("mekan_")) return "delivery";

  if (s.includes("alisveris") || s.includes("alışveriş")) return "ecommerce";

  return "delivery";
}

/**
 * Harita satırındaki Google Places `types` (legacy `extras.types` veya `placesApiNew.types`).
 * Üst şerit alanları yanlış/eksik olsa bile konaklama vb. tespiti için kullanılır.
 */
export function collectGooglePlaceTypeStrings(googlePlacesExtras?: unknown): string[] {
  const out: string[] = [];
  try {
    const ex = googlePlacesExtras as Record<string, unknown> | null | undefined;
    if (!ex || typeof ex !== "object") return out;
    const fromNew = ex.placesApiNew as { types?: string[] } | undefined;
    if (Array.isArray(fromNew?.types)) {
      for (const x of fromNew!.types) out.push(String(x).toLowerCase());
    }
    const top = ex.types;
    if (Array.isArray(top)) {
      for (const x of top) out.push(String(x).toLowerCase());
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Places `types` dizisinden portal modülü; yalnızca turizm sinyali güvenilirse dolu döner. */
function portalVendorTypeFromGooglePlaceTypes(types: string[]): PortalVendorType | null {
  if (!types.length) return null;
  const joined = types.join(" ");
  if (/\b(lodging|hotel|motel|hostel|campground|resort_hotel|rv_park|guest_house)\b/.test(joined)) return "turizm";
  if (types.some((t) => t.includes("car_rental"))) return "turizm";
  if (types.some((t) => t.includes("travel_agency") || t.includes("tourist_attraction"))) return "turizm";
  if (types.some((t) => t.includes("marina") || t.includes("boat_rental"))) return "turizm";
  return null;
}

/** `vendorTypeFromMapSuper` + Places `types` (konaklama oteli «mekan_dukkan» altında kalsa bile turizm). */
export function vendorTypeFromMapBusiness(mb: {
  homepageSuperCategory?: string | null;
  storeType?: string | null;
  googlePlacesExtras?: unknown;
}): PortalVendorType {
  const fromTypes = portalVendorTypeFromGooglePlaceTypes(collectGooglePlaceTypeStrings(mb.googlePlacesExtras));
  if (fromTypes) return fromTypes;
  return vendorTypeFromMapSuper(mb.homepageSuperCategory, mb.storeType);
}

const TURIZM_SUBTYPES = new Set(["otel", "arac", "villa", "tur", "yat"]);

/** Turizm vendor `provider_subtype` — admin override veya harita storeType / Places türleri */
export function inferTourismProviderSubtype(
  mb: { storeType?: string | null; googlePlacesExtras?: unknown },
  override?: string | null,
): string {
  const o = (override || "").toLowerCase().trim();
  if (o && TURIZM_SUBTYPES.has(o)) return o;

  const st = (mb.storeType || "").toLowerCase();
  if (/\b(rent|kiral|arac|araç|oto\s*kiral|car\s*rental)\b/.test(st)) return "arac";
  if (/\b(villa|bungalov|bungalow|chalet)\b/.test(st)) return "villa";
  if (/\b(tur|tour|gezi|excursion)\b/.test(st)) return "tur";
  if (/\b(yat|tekne|marina|gulet|boat)\b/.test(st)) return "yat";
  if (/\b(otel|hotel|motel|hostel|pansiyon|lodging|resort|konaklama|kamp)\b/.test(st)) return "otel";

  try {
    const ex = mb.googlePlacesExtras as Record<string, unknown> | null | undefined;
    const pn = ex?.placesApiNew as { types?: string[] } | undefined;
    const types = (pn?.types || []).map((x) => String(x).toLowerCase());
    if (types.some((t) => t.includes("car_rental"))) return "arac";
    if (types.some((t) => t.includes("lodging") || t.includes("hotel") || t.includes("campground"))) return "otel";
    if (types.some((t) => t.includes("travel_agency") || t.includes("tourist_attraction"))) return "tur";
    if (types.some((t) => t.includes("marina") || t.includes("boat"))) return "yat";
  } catch {
    /* ignore */
  }
  return "otel";
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueVendorSlug(base: string): Promise<string> {
  let slug = base || "isletme";
  let n = 1;
  while (true) {
    const ex = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.slug, slug)).limit(1);
    if (ex.length === 0) return slug;
    slug = `${base}-${++n}`;
    if (n > 200) return `${base}-${Date.now().toString(36)}`;
  }
}

const PLACE_DETAIL_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "geometry",
  "formatted_phone_number",
  "international_phone_number",
  "website",
  "opening_hours",
  "utc_offset",
  "types",
  "business_status",
  "url",
  "reviews",
  "photos",
  "editorial_summary",
  "current_opening_hours",
  "wheelchair_accessible_entrance",
  "price_level",
  "rating",
  "user_ratings_total",
  "adr_address",
  "vicinity",
].join(",");

export async function resolvePlaceIdWithKey(
  apiKey: string,
  opts: { placeId?: string; query?: string; lat?: number; lng?: number },
): Promise<string> {
  if (opts.placeId?.trim()) return opts.placeId.trim();
  const q = opts.query?.trim();
  if (!q) throw new Error("placeId veya arama metni (query) gerekli");
  const bias =
    Number.isFinite(opts.lat) && Number.isFinite(opts.lng)
      ? `&locationbias=circle:8000@${opts.lat},${opts.lng}`
      : "";
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id${bias}&key=${apiKey}`;
  const { data } = await axios.get<{
    status: string;
    candidates?: Array<{ place_id?: string }>;
    error_message?: string;
  }>(url);
  if (data.status !== "OK" || !data.candidates?.[0]?.place_id) {
    throw new Error(appendPlacesReferrerHint(data.error_message || data.status || "Place bulunamadı"));
  }
  return data.candidates[0].place_id!;
}

export async function fetchPlaceDetailsJson(
  apiKey: string,
  placeId: string,
): Promise<Record<string, unknown>> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${PLACE_DETAIL_FIELDS}&language=tr&key=${apiKey}`;
  const { data } = await axios.get<{
    status: string;
    result?: Record<string, unknown>;
    error_message?: string;
  }>(url);
  if (data.status !== "OK" || !data.result) {
    throw new Error(appendPlacesReferrerHint(data.error_message || data.status || "Place Details başarısız"));
  }
  return data.result;
}

/** Google Place Details → map_businesses + vendors; haritada zaten varsa günceller ve vendor bağlar. */
export async function importGooglePlaceAsVendor(opts: {
  placeId?: string;
  query?: string;
  lat?: number;
  lng?: number;
  vendorType: PortalVendorType;
  /** turizm için provider_subtype (otel, arac, …) */
  tourismSubtype?: string;
}): Promise<{ vendorId: number; mapBusinessId: string; placeId: string; createdVendor: boolean }> {
  await ensureMapVendorGoogleColumns();
  const apiKey = await resolveGooglePlacesApiKey();
  if (!apiKey) {
    throw new Error(
      "Google Places API anahtarı tanımlı değil. Sunucuda GOOGLE_PLACES_API_KEY veya panelde referrer’sız sunucu anahtarı ayarlayın.",
    );
  }

  const placeId = await resolvePlaceIdWithKey(apiKey, opts);
  const result = await fetchPlaceDetailsJson(apiKey, placeId);
  const newDetails = await fetchPlaceDetailsNew(apiKey, placeId);

  const name = String(result.name || "İşletme").trim();
  const formattedAddress = (result.formatted_address as string | undefined) || (result.vicinity as string | undefined) || null;
  const phone =
    (result.formatted_phone_number as string | undefined) ||
    (result.international_phone_number as string | undefined) ||
    null;
  const website = (result.website as string | undefined) || null;
  const url = (result.url as string | undefined) || null;
  const rating = typeof result.rating === "number" ? result.rating : null;
  const userRatingsTotal = typeof result.user_ratings_total === "number" ? result.user_ratings_total : null;
  const priceLevel = typeof result.price_level === "number" ? result.price_level : null;
  const geom = result.geometry as { location?: { lat?: number; lng?: number } } | undefined;
  const lat = geom?.location?.lat ?? opts.lat ?? null;
  const lng = geom?.location?.lng ?? opts.lng ?? null;
  const editorial = (result.editorial_summary as { overview?: string } | undefined)?.overview;
  const types = Array.isArray(result.types) ? (result.types as string[]).join(", ") : null;
  const descParts = [editorial, types, url].filter(Boolean);
  const description = descParts.length ? descParts.join("\n\n") : null;

  let photoUrl: string | null = null;
  const photos = result.photos as Array<{ photo_reference?: string }> | undefined;
  if (photos?.[0]?.photo_reference) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(photos[0].photo_reference!)}&key=${apiKey}`;
  }
  if (!photoUrl && newDetails.ok) {
    const nu = buildNewApiPhotoMediaUrls(newDetails.place.photos, apiKey, 3, 1200);
    if (nu[0]) photoUrl = nu[0]!;
  }

  const extrasNew = newDetails.ok
    ? (sanitizePlacesNewForExtras(newDetails.place) as Record<string, unknown>)
    : ({ fetchFailed: true, message: newDetails.message, status: newDetails.status } as Record<string, unknown>);
  const popularHoursJson = newDetails.ok ? buildPopularHoursFromPlacesNew(newDetails.place) : null;

  let workingHoursText: string | null = null;
  const oh = result.opening_hours as { weekday_text?: string[] } | undefined;
  if (oh?.weekday_text?.length) workingHoursText = oh.weekday_text.join("\n");

  const [existingMap] = await db
    .select()
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.googlePlaceId, placeId))
    .limit(1);

  const superForType =
    opts.vendorType === "delivery"
      ? "siparis"
      : opts.vendorType === "ecommerce"
        ? "alisveris"
        : opts.vendorType === "turizm"
          ? "turizm"
          : "ulasim";

  let mapId: string;
  if (existingMap) {
    mapId = existingMap.id;
    const prevExtras = existingMap.googlePlacesExtras as Record<string, unknown> | null | undefined;
    const mergedExtras = {
      ...(prevExtras && typeof prevExtras === "object" ? prevExtras : {}),
      placesApiNew: extrasNew,
    };
    await db
      .update(mapBusinessesTable)
      .set({
        name,
        address: formattedAddress,
        phone,
        website: website || undefined,
        description: description || undefined,
        rating: rating ?? undefined,
        userRatingsTotal: userRatingsTotal ?? undefined,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        photoUrl: photoUrl || undefined,
        coverPhotoUrl: photoUrl || undefined,
        priceLevel: priceLevel ?? undefined,
        workingHours: oh?.weekday_text?.length
          ? ({ weekdayText: oh.weekday_text } as unknown as Record<string, unknown>)
          : undefined,
        importSource: "places_api",
        homepageSuperCategory: existingMap.homepageSuperCategory || superForType,
        storeType: existingMap.storeType || superForType,
        googlePlacesExtras: mergedExtras as unknown as Record<string, unknown>,
        popularHours: popularHoursJson ? (popularHoursJson as unknown as Record<string, unknown>) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(mapBusinessesTable.id, mapId));
  } else {
    const baseSlug = toSlug(name);
    const slug = await (async () => {
      let s = baseSlug || "isletme";
      let n = 1;
      while (true) {
        const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, s)).limit(1);
        if (clash.length === 0) return s;
        s = `${baseSlug}-${++n}`;
        if (n > 200) return `${baseSlug}-${Date.now().toString(36)}`;
      }
    })();

    const [ins] = await db
      .insert(mapBusinessesTable)
      .values({
        googlePlaceId: placeId,
        slug,
        name,
        address: formattedAddress,
        phone,
        website: website || undefined,
        description: description || undefined,
        rating: rating ?? undefined,
        userRatingsTotal: userRatingsTotal ?? undefined,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        photoUrl: photoUrl || undefined,
        coverPhotoUrl: photoUrl || undefined,
        priceLevel: priceLevel ?? undefined,
        importSource: "places_api",
        homepageSuperCategory: superForType,
        storeType: superForType,
        isActive: true,
        isPremium: false,
        googlePlacesExtras: { placesApiNew: extrasNew } as unknown as Record<string, unknown>,
        popularHours: popularHoursJson ? (popularHoursJson as unknown as Record<string, unknown>) : undefined,
      })
      .returning({ id: mapBusinessesTable.id });
    mapId = ins!.id;

    const galleryUrls: string[] = [];
    if (photos && photos.length > 1) {
      for (const p of photos.slice(1, 9)) {
        if (!p.photo_reference) continue;
        galleryUrls.push(
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(p.photo_reference)}&key=${apiKey}`,
        );
      }
    }
    if (galleryUrls.length < 2 && newDetails.ok) {
      for (const u of buildNewApiPhotoMediaUrls(newDetails.place.photos, apiKey, 8, 1000)) {
        if (!galleryUrls.includes(u)) galleryUrls.push(u);
      }
    }
    let i = 0;
    for (const u of galleryUrls.slice(0, 8)) {
      await db
        .insert(mapBusinessImagesTable)
        .values({ businessId: mapId, imageUrl: u, sortOrder: i, isPrimary: i === 0 })
        .catch(() => {});
      i++;
    }
  }

  const [byLink] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.linkedMapBusinessId, mapId))
    .limit(1);
  if (byLink) {
    await db
      .update(vendorsTable)
      .set({
        name,
        phone: phone || undefined,
        address: formattedAddress || undefined,
        lat: lat != null ? Number(lat) : undefined,
        lng: lng != null ? Number(lng) : undefined,
        imageUrl: photoUrl || undefined,
        coverUrl: photoUrl || undefined,
        description: description || undefined,
        workingHours: workingHoursText || undefined,
        rating: rating != null ? Number(rating) : undefined,
        reviewCount: userRatingsTotal != null ? userRatingsTotal : undefined,
        googlePlaceId: placeId,
        googleImportKind: "places_api",
        updatedAt: new Date(),
      })
      .where(eq(vendorsTable.id, byLink.id));
    await syncVendorToMapBusiness((await db.select().from(vendorsTable).where(eq(vendorsTable.id, byLink.id)).limit(1))[0]!);
    return { vendorId: byLink.id, mapBusinessId: mapId, placeId, createdVendor: false };
  }

  const [byPlace] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.googlePlaceId, placeId))
    .limit(1);
  if (byPlace) {
    await db
      .update(vendorsTable)
      .set({
        linkedMapBusinessId: mapId,
        name,
        phone: phone || undefined,
        address: formattedAddress || undefined,
        lat: lat != null ? Number(lat) : undefined,
        lng: lng != null ? Number(lng) : undefined,
        imageUrl: photoUrl || undefined,
        coverUrl: photoUrl || undefined,
        description: description || undefined,
        workingHours: workingHoursText || undefined,
        rating: rating != null ? Number(rating) : undefined,
        reviewCount: userRatingsTotal != null ? userRatingsTotal : undefined,
        googleImportKind: "places_api",
        updatedAt: new Date(),
      })
      .where(eq(vendorsTable.id, byPlace.id));
    await syncVendorToMapBusiness((await db.select().from(vendorsTable).where(eq(vendorsTable.id, byPlace.id)).limit(1))[0]!);
    return { vendorId: byPlace.id, mapBusinessId: mapId, placeId, createdVendor: false };
  }

  const vSlug = await uniqueVendorSlug(toSlug(name));
  const tourismSubtype = (opts.tourismSubtype || "otel").toLowerCase();
  const allowedTurizm = new Set(["otel", "arac", "villa", "tur", "yat"]);
  const sub = opts.vendorType === "turizm" && allowedTurizm.has(tourismSubtype) ? tourismSubtype : opts.vendorType === "turizm" ? "otel" : null;

  const [vRow] = await db
    .insert(vendorsTable)
    .values({
      name,
      slug: vSlug,
      description: description || undefined,
      phone: phone || undefined,
      address: formattedAddress || undefined,
      city: null,
      district: null,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
      imageUrl: photoUrl || undefined,
      coverUrl: photoUrl || undefined,
      workingHours: workingHoursText || undefined,
      vendorType: opts.vendorType,
      rating: rating != null ? Number(rating) : 0,
      reviewCount: userRatingsTotal != null ? userRatingsTotal : 0,
      isOpen: true,
      featured: false,
      active: true,
      googlePlaceId: placeId,
      linkedMapBusinessId: mapId,
      googleImportKind: "places_api",
      catalogMenuGap: true,
      catalogContactGap: !phone && !website,
      status: opts.vendorType === "turizm" ? "approved" : "active",
    } as typeof vendorsTable.$inferInsert)
    .returning();

  if (opts.vendorType === "turizm" && sub) {
    await db.execute(sql`
      UPDATE vendors SET provider_subtype = ${sub}, provider_type = 'turizm'
      WHERE id = ${vRow!.id}
    `);
  }
  if (opts.vendorType === "ulasim") {
    await db.execute(sql`
      UPDATE vendors SET provider_type = 'ulasim', provider_subtype = 'taksi'
      WHERE id = ${vRow!.id}
    `);
  }

  const [fullVendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vRow!.id)).limit(1);
  if (fullVendor) await syncVendorToMapBusiness(fullVendor);

  return { vendorId: vRow!.id, mapBusinessId: mapId, placeId, createdVendor: true };
}

/** Haritada olup vendors ile bağlı olmayan kayıtları ilgili modüle taşır. */
export async function promoteUnlinkedMapBusinesses(opts: {
  limit?: number;
  /** Doluysa yalnızca bu vendor türleri için kayıt açılır (yanlış modüle düşmeyi önler). */
  onlyVendorTypes?: PortalVendorType[];
  mapBusinessIds?: string[];
  forceVendorType?: PortalVendorType;
  tourismSubtype?: string | null;
}): Promise<{
  promoted: number;
  reassignedToTurizm: number;
  skipped: number;
  skippedVendorType: number;
  errors: string[];
  promotedByType: Partial<Record<PortalVendorType, number>>;
}> {
  await ensureMapVendorGoogleColumns();
  const limit = Math.min(Math.max(opts.limit ?? 80, 1), 5000);
  const typeFilter =
    Array.isArray(opts.onlyVendorTypes) && opts.onlyVendorTypes.length > 0
      ? new Set(opts.onlyVendorTypes)
      : null;
  const idList = Array.isArray(opts.mapBusinessIds)
    ? [...new Set(opts.mapBusinessIds.map((x) => String(x || "").trim()).filter(Boolean))]
    : [];

  let rows: (typeof mapBusinessesTable.$inferSelect)[];
  if (idList.length > 0) {
    const found = await db
      .select()
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.isActive, true), inArray(mapBusinessesTable.id, idList)));
    const order = new Map(idList.map((id, i) => [id, i]));
    rows = found.slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } else {
    rows = await db
      .select()
      .from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.isActive, true))
      .orderBy(desc(mapBusinessesTable.createdAt))
      .limit(5000);
  }

  let promoted = 0;
  let reassignedToTurizm = 0;
  let skipped = 0;
  let skippedVendorType = 0;
  const errors: string[] = [];
  const promotedByType: Partial<Record<PortalVendorType, number>> = {};

  const turizmOnlyRetarget =
    typeFilter?.size === 1 &&
    typeFilter.has("turizm") &&
    !opts.mapBusinessIds?.length &&
    !opts.forceVendorType;

  for (const mb of rows) {
    if (promoted >= limit) break;
    try {
      const inferred = vendorTypeFromMapBusiness(mb);
      const vType: PortalVendorType = opts.forceVendorType ?? inferred;
      if (typeFilter && !typeFilter.has(vType)) {
        skippedVendorType++;
        continue;
      }

      const [linkedVendor] = await db
        .select({ id: vendorsTable.id, vendorType: vendorsTable.vendorType })
        .from(vendorsTable)
        .where(eq(vendorsTable.linkedMapBusinessId, mb.id))
        .limit(1);
      const pid = mb.googlePlaceId?.trim() || "";
      const [placeVendor] =
        pid && !pid.startsWith("osm_")
          ? await db
              .select({ id: vendorsTable.id, vendorType: vendorsTable.vendorType })
              .from(vendorsTable)
              .where(eq(vendorsTable.googlePlaceId, pid))
              .limit(1)
          : [];
      const [slugVendor] = mb.slug?.trim()
        ? await db
            .select({ id: vendorsTable.id, vendorType: vendorsTable.vendorType })
            .from(vendorsTable)
            .where(eq(vendorsTable.slug, mb.slug.trim()))
            .limit(1)
        : [];

      /** Yalnızca harita / Place ile güvenilir eşleşme; slug tek başına yanlış modül taşımaz. */
      const evStrong = linkedVendor ?? placeVendor ?? null;

      if (evStrong) {
        if (turizmOnlyRetarget && vType === "turizm" && evStrong.vendorType !== "turizm") {
          const sub = inferTourismProviderSubtype(mb, opts.tourismSubtype ?? null);
          await db
            .update(vendorsTable)
            .set({
              vendorType: "turizm",
              linkedMapBusinessId: mb.id,
              googlePlaceId: mb.googlePlaceId?.startsWith("osm_") ? null : mb.googlePlaceId || null,
              status: "approved",
              updatedAt: new Date(),
            })
            .where(eq(vendorsTable.id, evStrong.id));
          await db.execute(sql`UPDATE vendors SET provider_type = 'turizm', provider_subtype = ${sub} WHERE id = ${evStrong.id}`);
          const [fullVendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, evStrong.id)).limit(1);
          if (fullVendor) await syncVendorToMapBusiness(fullVendor);
          reassignedToTurizm++;
          promoted++;
          promotedByType.turizm = (promotedByType.turizm ?? 0) + 1;
          continue;
        }
        skipped++;
        continue;
      }

      if (slugVendor) {
        skipped++;
        continue;
      }

      const importKind = mb.importSource || inferMapImportSource(mb);
      const vSlug = await uniqueVendorSlug(toSlug(mb.name));

      const [vRow] = await db
        .insert(vendorsTable)
        .values({
          name: mb.name,
          slug: vSlug,
          description: mb.description || undefined,
          phone: mb.phone || undefined,
          email: mb.email || undefined,
          address: mb.address || undefined,
          lat: mb.latitude != null ? Number(mb.latitude) : undefined,
          lng: mb.longitude != null ? Number(mb.longitude) : undefined,
          imageUrl: mb.photoUrl || undefined,
          coverUrl: mb.coverPhotoUrl || mb.photoUrl || undefined,
          workingHours:
            mb.workingHours && typeof mb.workingHours === "object"
              ? JSON.stringify(mb.workingHours)
              : typeof mb.workingHours === "string"
                ? mb.workingHours
                : undefined,
          vendorType: vType,
          rating: mb.rating != null ? Number(mb.rating) : 0,
          reviewCount: mb.userRatingsTotal != null ? mb.userRatingsTotal : 0,
          isOpen: true,
          featured: false,
          active: true,
          googlePlaceId: mb.googlePlaceId?.startsWith("osm_") ? null : mb.googlePlaceId || null,
          linkedMapBusinessId: mb.id,
          googleImportKind: importKind || null,
          catalogMenuGap: true,
          catalogContactGap: !mb.phone && !mb.website && !mb.email,
          status: vType === "turizm" ? "approved" : "active",
        } as typeof vendorsTable.$inferInsert)
        .returning();

      if (vType === "turizm") {
        const sub = inferTourismProviderSubtype(mb, opts.tourismSubtype ?? null);
        await db.execute(sql`UPDATE vendors SET provider_type = 'turizm', provider_subtype = ${sub} WHERE id = ${vRow!.id}`);
      }
      if (vType === "ulasim") {
        await db.execute(sql`UPDATE vendors SET provider_type = 'ulasim', provider_subtype = 'taksi' WHERE id = ${vRow!.id}`);
      }

      const [fullVendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vRow!.id)).limit(1);
      if (fullVendor) await syncVendorToMapBusiness(fullVendor);
      promoted++;
      promotedByType[vType] = (promotedByType[vType] ?? 0) + 1;
    } catch (e) {
      errors.push(`${mb.name}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200));
    }
  }

  return { promoted, reassignedToTurizm, skipped, skippedVendorType, errors, promotedByType };
}
