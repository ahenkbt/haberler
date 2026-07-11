import { Router } from "express";
import { mergeThemeConfig, resolveDefaultThemeKey } from "../lib/vendor-storefront.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { normalizeImageUrlValue } from "../lib/map-image-proxy.js";
import {
  fetchMapBusinessGallery,
  normalizeTourismGalleryUrls,
  TOURISM_HOTEL_IMAGE_FALLBACK,
  isTourismBcPlaceholderImage,
  resolveMapBusinessCoverImageFromRow,
  enrichMapBusinessListingImages,
} from "../lib/tourism-map-gallery.js";
import { enrichYatportMapListing, isYatportMapBusiness } from "../lib/yatport-tourism-enrich.js";
import {
  enrichBoatListingRows,
  fetchRelatedYachtListings,
  fetchYachtExtras,
  mergeYachtExtrasIntoListing,
  saveYachtExtras,
  upsertYachtExtrasFromYatport,
  yachtRowMeta,
  type YachtListingExtrasPayload,
} from "../lib/yacht-listing-extras.js";
import {
  enrichVipListingRows,
  fetchVipSearchResults,
  fetchVipVehicles,
  saveVipVehicle,
  seedDefaultVipVehicles,
  VIP_VEHICLE_SEGMENTS,
  type VipVehiclePayload,
} from "../lib/vip-service-vehicles.js";
import {
  importTourismMapBusinesses,
  listTourismMapImportCandidates,
  TOURISM_MAP_IMPORT_CATEGORIES,
} from "../lib/tourism-map-import.js";
import bcDemo from "../data/tourism-bc-demo.json";
import {
  defaultHotelCheckIn,
  defaultHotelCheckOut,
  fetchHotellookTourismListings,
  getTravelpayoutsConfig,
  isInternationalHotelDestination,
  resolveHotellookLocation,
} from "../lib/travelpayouts.js";

const router = Router();

type GoogleHotelLinkSeed = { mapSlug: string; roomCarrierSlug: string };
const BC_GOOGLE_HOTEL_LINKS: GoogleHotelLinkSeed[] =
  (bcDemo as { googleHotelLinks?: GoogleHotelLinkSeed[] }).googleHotelLinks ?? [];

/** Kesfet public map ile uyumlu: BC demo bağlantılı ve seed vitrin slug'ları otel listesinde gösterilmez. */
const PUBLIC_TOURISM_DEMO_MAP_SLUGS = new Set<string>([
  ...BC_GOOGLE_HOTEL_LINKS.map((l) => l.mapSlug.toLowerCase()),
  ...((bcDemo as { vendors?: { slug: string }[] }).vendors ?? []).map((v) => v.slug.toLowerCase()),
  "four-seasons-bosphorus",
  "four-seasons-hotel-istanbul-at-the-bosphorus",
  "four-seasons-hotel-istanbul-at-sultanahmet",
  "yekpare-bosphorus-demo-hotel",
]);

function slugify(s: string) {
  return s.toLowerCase().replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ç/g,"c")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

function normalizeDetailSlug(raw: string): string {
  try {
    return decodeURIComponent(String(raw ?? "")).trim();
  } catch {
    return String(raw ?? "").trim();
  }
}

function sqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

const YATPORT_TYPE_SQL = `(
  lower(COALESCE(mb.import_source,'')) = 'yatport'
  OR COALESCE(mb.google_place_id,'') LIKE 'yatport:%'
  OR lower(COALESCE(mb.google_places_extras->>'importSource','')) = 'yatport'
  OR lower(COALESCE(mb.store_type,'')) = 'turizm_yat'
)`;

/** map_businesses → turizm detay satırı (mb.status yok — is_active kullanılır). */
function mapBusinessDetailSelectSql(): string {
  return `
    SELECT
      mb.id,
      CASE
        WHEN ${YATPORT_TYPE_SQL} THEN 'boat'
        WHEN lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('car_rental') THEN 'car'
        WHEN lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('travel_agency','tour_agency','tour_operator','sightseeing_tour_agency','tourist_information_center') THEN 'tour'
        WHEN lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('lodging','hotel','motel','resort_hotel','guest_house','bed_and_breakfast','inn','hostel','cottage','campground','rv_park','extended_stay_hotel','farmstay','budget_japanese_inn','japanese_inn','private_guest_room') THEN 'hotel'
        WHEN lower(COALESCE(mb.store_type,'')) LIKE '%yat%' OR lower(COALESCE(mb.store_type,'')) LIKE '%tekne%' OR lower(COALESCE(mb.store_type,'')) LIKE '%boat%' OR lower(COALESCE(mc.name,'')) LIKE '%yat%' OR lower(COALESCE(mc.name,'')) LIKE '%tekne%' THEN 'boat'
        WHEN lower(COALESCE(mb.store_type,'')) LIKE '%arac%' OR lower(COALESCE(mb.store_type,'')) LIKE '%araç%' OR lower(COALESCE(mb.store_type,'')) LIKE '%car%' OR lower(COALESCE(mb.store_type,'')) LIKE '%rent%' THEN 'car'
        WHEN lower(COALESCE(mb.store_type,'')) LIKE '%villa%' OR lower(COALESCE(mc.name,'')) LIKE '%villa%' THEN 'villa'
        WHEN (lower(COALESCE(mb.store_type,'')) LIKE '%tur%' AND lower(COALESCE(mb.store_type,'')) NOT LIKE '%otel%') OR lower(COALESCE(mb.store_type,'')) LIKE '%seyahat%' OR lower(COALESCE(mb.store_type,'')) LIKE '%acent%' THEN 'tour'
        WHEN lower(COALESCE(mb.store_type,'')) LIKE '%otel%' OR lower(COALESCE(mb.store_type,'')) LIKE '%hotel%' OR lower(COALESCE(mc.name,'')) LIKE '%otel%' OR lower(COALESCE(mc.name,'')) LIKE '%hotel%' OR lower(COALESCE(mb.google_places_extras::text,'')) LIKE '%"lodging"%' THEN 'hotel'
        ELSE 'hotel'
      END AS type,
      mb.name AS title,
      COALESCE(NULLIF(mb.slug,''), mb.id::text) AS slug,
      mb.description,
      COALESCE(mcity.name, '') AS city,
      COALESCE(mdist.name, '') AS district,
      mb.address,
      mb.latitude AS lat,
      mb.longitude AS lng,
      COALESCE(mb.cover_photo_url, mb.photo_url) AS image_url,
      mb.cover_photo_url,
      mb.photo_url,
      mb.scraped_photos,
      '[]'::jsonb AS gallery,
      '[]'::jsonb AS amenities,
      '{}'::jsonb AS features,
      COALESCE(mb.google_places_extras->>'priceAmount', '0') AS price,
      NULL AS sale_price,
      CASE WHEN ${YATPORT_TYPE_SQL} THEN 'saat' ELSE 'gece' END AS price_unit,
      NULL AS star_rating,
      NULL AS capacity,
      COALESCE(mb.rating, 0) AS rating,
      COALESCE(mb.user_ratings_total, 0) AS review_count,
      mb.google_places_extras->>'priceLevel' AS price_level,
      mb.google_place_id AS google_place_id,
      mb.google_places_extras,
      mb.import_source,
      mb.store_type,
      mb.website,
      mb.whatsapp_number AS vendor_whatsapp,
      '{}'::jsonb AS extra_info,
      mb.name AS vendor_name,
      mb.phone AS vendor_phone,
      CASE WHEN mb.is_active THEN 'active' ELSE 'inactive' END AS status,
      true AS map_business_fallback
    FROM map_businesses mb
    LEFT JOIN map_categories mc ON mc.id = mb.category_id
    LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
    LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
  `;
}

async function fetchMapBusinessDetailWhere(
  whereClause: string,
  orderLimit = "LIMIT 1",
): Promise<Record<string, unknown> | null> {
  const mapR = await db.execute(sql.raw(`
    ${mapBusinessDetailSelectSql()}
    WHERE mb.is_active = true AND (${whereClause})
    ${orderLimit}
  `));
  return (mapR.rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** Google otel kartı slug'ını map_businesses kaydına çöz (Türkçe/kısaltılmış alias dahil). */
async function resolveMapBusinessBySlug(rawSlug: string): Promise<Record<string, unknown> | null> {
  const slug = normalizeDetailSlug(rawSlug);
  if (!slug) return null;
  const safe = sqlLiteral(slug);
  const slugNorm = sqlLiteral(slugify(slug));

  let row = await fetchMapBusinessDetailWhere(`
    LOWER(COALESCE(mb.slug,'')) = LOWER('${safe}')
    OR mb.id::text = '${safe}'
  `);
  if (row) return row;

  try {
    const linkR = await db.execute(sql`
      SELECT map_business_id FROM tourism_google_hotel_links
      WHERE LOWER(map_slug) = LOWER(${slug})
      LIMIT 1
    `);
    const bizId = String((linkR.rows[0] as { map_business_id?: string } | undefined)?.map_business_id ?? "");
    if (bizId) {
      row = await fetchMapBusinessDetailWhere(`mb.id::text = '${sqlLiteral(bizId)}'`);
      if (row) return row;
    }
  } catch {
    /* links table optional until seed runs */
  }

  for (const link of BC_GOOGLE_HOTEL_LINKS) {
    if (link.mapSlug.toLowerCase() !== slug.toLowerCase()) continue;
    row = await fetchMapBusinessDetailWhere(`
      LOWER(COALESCE(mb.slug,'')) = LOWER('${sqlLiteral(link.mapSlug)}')
      OR mb.id::text = '${sqlLiteral(link.mapSlug)}'
    `);
    if (row) return row;
  }

  if (slug.length >= 8) {
    row = await fetchMapBusinessDetailWhere(`
      COALESCE(mb.slug,'') <> ''
      AND (
        LOWER(mb.slug) LIKE LOWER('${safe}') || '%'
        OR LOWER('${safe}') LIKE LOWER(mb.slug) || '%'
      )
    `, `ORDER BY ABS(LENGTH(COALESCE(mb.slug,'')) - LENGTH('${safe}')) ASC, mb.rating DESC NULLS LAST LIMIT 1`);
    if (row) return row;
  }

  row = await fetchMapBusinessDetailWhere(`
    COALESCE(mb.slug,'') <> ''
    AND REGEXP_REPLACE(LOWER(COALESCE(mb.slug,'')), '[^a-z0-9]+', '-', 'g') = '${slugNorm}'
  `);
  if (row) return row;

  row = await fetchMapBusinessDetailWhere(`
    COALESCE(mb.slug,'') <> ''
    AND REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(LOWER(COALESCE(mb.slug,'')), 'ğ', 'g', 'g'),
            'ü', 'u', 'g'),
          'ş', 's', 'g'),
        'ı|i̇', 'i', 'g'),
      'ö', 'o', 'g'),
    'ç', 'c', 'g') = '${slugNorm}'
  `);
  return row;
}

/** yatport import kaydı — sayısal slug (eski_id) veya yatport slug ile eşleştir. */
async function resolveYatportMapBusinessBySlug(rawSlug: string): Promise<Record<string, unknown> | null> {
  const slug = normalizeDetailSlug(rawSlug);
  if (!slug) return null;
  const safe = sqlLiteral(slug);

  if (/^\d+$/.test(slug)) {
    const byEskiId = await fetchMapBusinessDetailWhere(`
      mb.google_place_id = 'yatport:${safe}'
      OR (
        mb.import_source = 'yatport'
        AND COALESCE(mb.google_places_extras->'rawYatport'->>'eskiId', mb.google_places_extras->>'yatportId', '') = '${safe}'
      )
    `);
    if (byEskiId) return byEskiId;
  }

  const bySlug = await fetchMapBusinessDetailWhere(`
    mb.import_source = 'yatport'
    AND (
      LOWER(COALESCE(mb.slug,'')) = LOWER('${safe}')
      OR LOWER(COALESCE(mb.google_places_extras->'rawYatport'->>'detailSlug','')) LIKE '%/${safe}'
    )
  `);
  if (bySlug) return bySlug;

  return null;
}

async function buildYatportMapDetailResponse(
  mapRow: Record<string, unknown>,
  slug: string,
): Promise<Record<string, unknown>> {
  const bizId = String(mapRow.id ?? "");
  const gallery = await fetchMapBusinessGallery(bizId);
  const enriched = enrichYatportMapListing({
    ...mapRow,
    gallery,
    image_url: gallery[0] ?? mapRow.image_url,
  });
  let extras = await fetchYachtExtras(bizId);
  if (!extras) {
    await upsertYachtExtrasFromYatport(bizId, enriched).catch(() => {});
    extras = await fetchYachtExtras(bizId);
  }
  const merged = mergeYachtExtrasIntoListing(enriched, extras);
  const relatedRaw = await fetchRelatedYachtListings(merged, extras, 8);
  const related = await enrichBoatListingRows(
    relatedRaw.map((r) =>
      enrichYatportMapListing({
        ...r,
        type: "boat",
        price: String(
          (r.google_places_extras as Record<string, unknown> | undefined)?.priceAmount ?? "0",
        ),
      }),
    ),
  );
  const mapListing = normalizeTourismListingRow(merged);
  mapListing.is_yatport = true;
  mapListing.import_source = "yatport";
  mapListing.reservation_enabled = false;
  mapListing.themeKey = "bookingcore";
  mapListing.themeConfig = mergeThemeConfig("bookingcore", {});
  mapListing.map_business_fallback = true;
  mapListing.related_listings = related.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    type: "boat",
    city: r.city,
    district: r.district,
    image_url: r.image_url,
    price: String(r.price ?? "0"),
    rating: r.rating ?? 0,
    review_count: r.review_count ?? 0,
    yacht_summary: r.yacht_summary,
  }));
  return mapListing;
}

/**
 * Bu map_businesses kaydına bağlı aktif (doğrulanmış/sahiplenilmiş) bir vendor var mı?
 * Rezervasyon kapısı için kullanılır. vendors tablosundaki opsiyonel kolonlar yoksa
 * sessizce false döner.
 */
async function hasActiveLinkedVendor(bizId: string, googlePlaceId: string): Promise<boolean> {
  if (!bizId && !googlePlaceId) return false;
  try {
    const r = await db.execute(sql`
      SELECT 1
      FROM vendors v
      WHERE COALESCE(v.is_active, true) = true
        AND (
          (${bizId} <> '' AND v.linked_map_business_id = ${bizId})
          OR (${googlePlaceId} <> '' AND v.google_place_id = ${googlePlaceId})
        )
      LIMIT 1
    `);
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

function bookingRef() {
  return "TR" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
}
function getVendorId(req: Parameters<Parameters<typeof router.get>[1]>[0]): number | null {
  const id = req.headers["x-vendor-id"];
  return id ? Number(id) : null;
}

const TYPE_LABELS: Record<string,string> = {
  hotel:"Otel", car:"Rent a Car", villa:"Villa & Ev", tour:"Tur", boat:"Yat & Tekne",
};
const PRICE_UNITS: Record<string,string> = {
  hotel:"gece", car:"gün", villa:"gece", tour:"kişi", boat:"gün",
};

let ensuredTourismVendorColumns = false;
async function ensureTourismVendorColumns() {
  if (ensuredTourismVendorColumns) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS provider_type TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS provider_subtype TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_contact_gap BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_menu_gap BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_place_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS linked_map_business_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_import_kind TEXT`);
  ensuredTourismVendorColumns = true;
}

const TOURISM_VENDOR_SUBTYPES = ["otel", "hotel", "arac", "car", "rentacar", "villa", "tur", "tour", "yat", "boat", "tekne"];

function tourismSubtypeAliases(raw: string): string[] {
  const subtype = raw.replace(/'/g, "").trim().toLowerCase();
  if (!subtype) return [];
  const aliases: Record<string, string[]> = {
    otel: ["otel", "hotel"],
    arac: ["arac", "car", "rentacar"],
    villa: ["villa"],
    tur: ["tur", "tour"],
    yat: ["yat", "boat", "tekne"],
  };
  return aliases[subtype] ?? [subtype];
}

function isTourismVendorRow(row: Record<string, unknown>): boolean {
  const vendorType = String(row.vendor_type ?? row.vendorType ?? "").toLowerCase();
  const providerType = String(row.provider_type ?? row.providerType ?? "").toLowerCase();
  const providerSubtype = String(row.provider_subtype ?? row.providerSubtype ?? "").toLowerCase();
  const listingCount = Number(row.listing_count ?? 0);
  return (
    vendorType === "turizm" ||
    vendorType === "tourism" ||
    providerType === "turizm" ||
    providerType === "tourism" ||
    TOURISM_VENDOR_SUBTYPES.includes(providerSubtype) ||
    listingCount > 0
  );
}

const TYPE_ALIASES: Record<string, string> = {
  "car-rental": "car",
  "rent-a-car": "car",
  rentacar: "car",
  arac: "car",
  "boat-rental": "boat",
  "yat-tekne": "boat",
  tekne: "boat",
  yat: "boat",
  space: "villa",
  uzay: "villa",
  "villa-ev": "villa",
};

function normalizeTourismType(raw: string | null | undefined): string {
  const key = String(raw ?? "").trim().toLowerCase();
  return TYPE_ALIASES[key] || key;
}

type TourismDemoListing = {
  id: number;
  type: "hotel" | "villa" | "tour" | "boat" | "car";
  title: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  image_url: string;
  gallery: string[];
  description: string;
  price: string;
  sale_price: string | null;
  price_unit: string;
  star_rating: number | null;
  rating: number;
  review_count: number;
  capacity: number | null;
  amenities: string[];
  features: Record<string, string>;
  extra_info: Record<string, string>;
  themeKey: string;
  themeConfig: Record<string, string>;
};

const TOURISM_DEMO_LISTINGS: TourismDemoListing[] = [
  {
    id: -9101,
    type: "hotel",
    title: "Yekpare Bosphorus Demo Hotel",
    slug: "yekpare-bosphorus-demo-hotel",
    city: "İstanbul",
    district: "Beşiktaş",
    address: "Boğaz manzaralı demo otel vitrini",
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80",
    ],
    description: "Vacation Rental temasını göstermek için hazırlanmış örnek otel vitrini. Oda, rezervasyon ve konaklama alanlarını temsil eder.",
    price: "3250",
    sale_price: "2890",
    price_unit: "gece",
    star_rating: 5,
    rating: 4.9,
    review_count: 126,
    capacity: 120,
    amenities: ["Boğaz manzarası", "Kahvaltı", "Spa", "Havalimanı transferi"],
    features: { checkIn: "14:00", checkOut: "12:00" },
    extra_info: { demo: "true" },
    themeKey: "vacation-rental",
    themeConfig: {
      heroTitle: "Boğazda örnek otel deneyimi",
      heroSubtitle: "Turizm teması, oda vitrini ve rezervasyon akışını bu demo mağazada inceleyin.",
      heroImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&q=80",
      ctaText: "Müsaitlik sor",
      accentColor: "#bf925a",
    },
  },
  {
    id: -9102,
    type: "villa",
    title: "Yekpare Kaş Demo Villa",
    slug: "yekpare-kas-demo-villa",
    city: "Antalya",
    district: "Kaş",
    address: "Deniz manzaralı demo villa vitrini",
    image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1400&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    ],
    description: "Villa ve günlük ev kiralama temasını göstermek için hazırlanmış örnek konaklama vitrini.",
    price: "5750",
    sale_price: null,
    price_unit: "gece",
    star_rating: null,
    rating: 4.8,
    review_count: 84,
    capacity: 8,
    amenities: ["Özel havuz", "Bahçe", "Mutfak", "Otopark"],
    features: { bedrooms: "4", pool: "Özel havuz" },
    extra_info: { demo: "true" },
    themeKey: "vacation-rental",
    themeConfig: {
      heroTitle: "Akdeniz villası demo vitrini",
      heroSubtitle: "Villa, apart ve günlük ev kiralama sunumunu tema içinde görün.",
      heroImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1400&q=80",
      ctaText: "Rezervasyon iste",
      accentColor: "#bf925a",
    },
  },
  {
    id: -9103,
    type: "tour",
    title: "Yekpare Kapadokya Demo Turu",
    slug: "yekpare-kapadokya-demo-turu",
    city: "Nevşehir",
    district: "Göreme",
    address: "Kapadokya kültür ve balon turu demo vitrini",
    image_url: "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=1400&q=80",
      "https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1200&q=80",
    ],
    description: "Tur ve etkinlik satışlarını göstermek için hazırlanmış örnek turizm vitrini.",
    price: "1850",
    sale_price: "1490",
    price_unit: "kişi",
    star_rating: null,
    rating: 4.7,
    review_count: 211,
    capacity: 18,
    amenities: ["Rehber", "Transfer", "Müze rotası", "Fotoğraf molaları"],
    features: { duration: "1 gün", language: "Türkçe / İngilizce" },
    extra_info: { demo: "true" },
    themeKey: "vacation-rental",
    themeConfig: {
      heroTitle: "Kapadokya turu demo vitrini",
      heroSubtitle: "Tur, aktivite ve günlük gezi satışlarını tema görünümüyle test edin.",
      heroImage: "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=1400&q=80",
      ctaText: "Tura katıl",
      accentColor: "#0ea5e9",
    },
  },
  {
    id: -9104,
    type: "boat",
    title: "Yekpare Bodrum Demo Yat",
    slug: "yekpare-bodrum-demo-yat",
    city: "Muğla",
    district: "Bodrum",
    address: "Bodrum çıkışlı günlük yat kiralama demo vitrini",
    image_url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&q=80",
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1200&q=80",
    ],
    description: "Yat ve tekne kiralama temasını göstermek için hazırlanmış Carbook demo vitrini.",
    price: "12000",
    sale_price: null,
    price_unit: "gün",
    star_rating: null,
    rating: 4.9,
    review_count: 67,
    capacity: 12,
    amenities: ["Kaptan dahil", "Yüzme molası", "Yemek opsiyonu", "Rota planı"],
    features: { length: "18 m", cabins: "3 kabin" },
    extra_info: { demo: "true" },
    themeKey: "carbook",
    themeConfig: {
      heroTitle: "Bodrum yat kiralama demo vitrini",
      heroSubtitle: "Tekne ve yat kiralama teklif akışını Carbook temasıyla görün.",
      heroImage: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&q=80",
      ctaText: "Teklif al",
      accentColor: "#01d28e",
    },
  },
  {
    id: -9105,
    type: "car",
    title: "Yekpare Airport Demo Rent a Car",
    slug: "yekpare-airport-demo-rent-a-car",
    city: "İstanbul",
    district: "Havalimanı",
    address: "Havalimanı teslim demo araç kiralama vitrini",
    image_url: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=1400&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1549924231-f129b911e442?w=1400&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
    ],
    description: "Rent a car temasını göstermek için hazırlanmış örnek araç kiralama vitrini.",
    price: "1450",
    sale_price: "1190",
    price_unit: "gün",
    star_rating: null,
    rating: 4.6,
    review_count: 153,
    capacity: 5,
    amenities: ["Havalimanı teslim", "Sınırsız km opsiyonu", "Kasko", "7/24 destek"],
    features: { transmission: "Otomatik", fuel: "Benzin" },
    extra_info: { demo: "true" },
    themeKey: "carbook",
    themeConfig: {
      heroTitle: "Rent a car demo vitrini",
      heroSubtitle: "Araç kiralama, günlük fiyat ve teklif akışını Carbook temasıyla inceleyin.",
      heroImage: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=1400&q=80",
      ctaText: "Hemen kirala",
      accentColor: "#01d28e",
    },
  },
];

function demoForType(type: string): TourismDemoListing | undefined {
  return TOURISM_DEMO_LISTINGS.find((d) => d.type === normalizeTourismType(type));
}

function demoForSlug(slug: string): TourismDemoListing | undefined {
  return TOURISM_DEMO_LISTINGS.find((d) => d.slug === slug);
}

function demoListRow(d: TourismDemoListing): Record<string, unknown> {
  return {
    id: d.id,
    type: d.type,
    title: d.title,
    slug: d.slug,
    city: d.city,
    district: d.district,
    address: d.address,
    image_url: d.image_url,
    price: d.price,
    sale_price: d.sale_price,
    price_unit: d.price_unit,
    star_rating: d.star_rating,
    rating: d.rating,
    review_count: d.review_count,
    is_featured: true,
    vendor_name: d.title,
    href: d.type === "tour"
      ? `/turizm/tur/${d.slug}`
      : d.type === "hotel"
        ? `/turizm/konaklama/${d.slug}`
        : d.type === "villa"
          ? `/turizm/villa-ev/${d.slug}`
          : d.type === "car"
            ? `/turizm/arac-kiralama/${d.slug}`
            : d.type === "boat"
              ? `/turizm/yat-turlari/${d.slug}`
              : `/turizm/konaklama/${d.slug}`,
    tourism_theme_demo: true,
  };
}

function demoDetailRow(d: TourismDemoListing): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...d,
    vendor_name: d.title,
    vendor_phone: "+90 555 000 00 00",
    vendor_whatsapp: "+90 555 000 00 00",
    themeKey: d.themeKey,
    themeConfig: mergeThemeConfig(d.themeKey, d.themeConfig),
    status: "active",
    tourism_theme_demo: true,
    rooms: d.type === "hotel"
      ? [
          {
            id: -9201,
            name: "Demo Deluxe Oda",
            description: "Tema görünümü için örnek oda.",
            beds: 1,
            adults: 2,
            children: 1,
            size_sqm: 34,
            price: d.sale_price || d.price,
            count: 8,
            amenities: ["Wi-Fi", "Kahvaltı", "Manzara"],
            image_url: d.gallery[1] ?? d.image_url,
            status: "active",
          },
        ]
      : [],
  };
  if (d.type === "tour") {
    return enrichTourRow({ ...base, duration_days: 3, duration_nights: 2 });
  }
  if (d.type === "car") {
    return enrichCarRow(base);
  }
  return base;
}

function safeTourismNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function tourismDetailHref(type: string, slug: string, id: string | number): string {
  const s = String(slug || id);
  switch (type) {
    case "hotel":
      return `/turizm/konaklama/${encodeURIComponent(s)}`;
    case "villa":
      return `/turizm/villa-ev/${encodeURIComponent(s)}`;
    case "car":
      return `/turizm/arac-kiralama/${encodeURIComponent(s)}`;
    case "boat":
      return `/turizm/yat-turlari/${encodeURIComponent(s)}`;
    case "tour":
      return `/turizm/tur/${encodeURIComponent(s)}`;
    default:
      return `/turizm/konaklama/${encodeURIComponent(s)}`;
  }
}

function normalizeTourismListingRow(r: Record<string, unknown>): Record<string, unknown> {
  const type = String(r.type ?? "hotel");
  const slug = String(r.slug ?? r.id ?? "");
  const href = r.href ? String(r.href) : tourismDetailHref(type, slug, slug || String(r.id ?? ""));
  const starRaw = r.star_rating;
  const isMapBiz = Boolean(r.map_business_fallback);
  let imageUrl = normalizeImageUrlValue(r.image_url);
  if (imageUrl && isTourismBcPlaceholderImage(imageUrl)) imageUrl = null;
  if (!imageUrl && !isMapBiz) {
    imageUrl = TOURISM_HOTEL_IMAGE_FALLBACK;
  }
  const gallery = normalizeTourismGalleryUrls(r.gallery, imageUrl ?? undefined, {
    allowFallback: !isMapBiz,
  });
  return {
    ...r,
    image_url: imageUrl,
    gallery,
    rating: safeTourismNum(r.rating, 0),
    review_count: Math.round(safeTourismNum(r.review_count, 0)),
    star_rating:
      starRaw != null && starRaw !== ""
        ? Math.min(5, Math.max(0, Math.round(safeTourismNum(starRaw))))
        : null,
    price: String(r.price ?? "0"),
    sale_price: r.sale_price != null && r.sale_price !== "" ? String(r.sale_price) : null,
    href,
    map_business_fallback: Boolean(r.map_business_fallback),
  };
}

function normalizeTourismImageRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(normalizeTourismListingRow);
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeTourismRoomRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    price: String(r.price ?? "0"),
    image_url: normalizeImageUrlValue(r.image_url),
    amenities: parseJsonArray(r.amenities),
    beds: safeTourismNum(r.beds, 1),
    adults: safeTourismNum(r.adults, 2),
    children: safeTourismNum(r.children, 0),
    count: safeTourismNum(r.count, 1),
  }));
}

async function fetchRoomsForCarrierListingId(listingId: number): Promise<Record<string, unknown>[]> {
  try {
    const roomRows = await db.execute(sql`
      SELECT tr.*
      FROM tourism_rooms tr
      JOIN tourism_listings tl ON tl.id = tr.listing_id
      WHERE tr.status = 'active'
        AND tl.status = 'active'
        AND tl.type = 'hotel'
        AND tl.id = ${listingId}
      ORDER BY tr.price ASC
      LIMIT 24
    `);
    return normalizeTourismRoomRows(roomRows.rows as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

async function fetchRoomsForCarrierSlug(carrierSlug: string): Promise<Record<string, unknown>[]> {
  try {
    const carrier = await db.execute<{ id: number }>(sql`
      SELECT id FROM tourism_listings
      WHERE slug = ${carrierSlug} AND type = 'hotel' AND status = 'active'
      LIMIT 1
    `);
    const carrierId = (carrier.rows[0] as { id: number } | undefined)?.id;
    if (!carrierId) return [];
    return fetchRoomsForCarrierListingId(carrierId);
  } catch {
    return [];
  }
}

/**
 * Google Places (New) primaryType grupları. Kategori sızıntısını (ör. tur şirketinin
 * otel listesinde çıkması) önlemek için kategorizasyon önce Google primaryType'a,
 * sonra store_type / kategori adına bakar. Tip grupları birbirini dışlar.
 */
const GP_PRIMARY_TYPE_SQL = "lower(COALESCE(mb.google_places_extras->>'primaryType',''))";
const GP_EXTRAS_TEXT_SQL = "lower(COALESCE(mb.google_places_extras::text,''))";
const GP_STORE_TYPE_SQL = "lower(COALESCE(mb.store_type,''))";
const GP_CAT_NAME_SQL = "lower(COALESCE(mc.name,''))";
const GP_CAT_SLUG_SQL = "lower(COALESCE(mc.slug,''))";

const GP_LODGING_TYPES_SQL =
  "('lodging','hotel','motel','resort_hotel','guest_house','bed_and_breakfast','inn','hostel','cottage','campground','rv_park','extended_stay_hotel','farmstay','budget_japanese_inn','japanese_inn','private_guest_room')";
const GP_TOUR_TYPES_SQL =
  "('travel_agency','tour_agency','tour_operator','sightseeing_tour_agency','tourist_information_center')";
const GP_CAR_TYPES_SQL = "('car_rental')";

function mapBusinessTypeWhere(cleanType: string): string {
  const pt = GP_PRIMARY_TYPE_SQL;
  const extras = GP_EXTRAS_TEXT_SQL;
  const store = GP_STORE_TYPE_SQL;
  const catName = GP_CAT_NAME_SQL;
  const catSlug = GP_CAT_SLUG_SQL;

  if (cleanType === "hotel") {
    // Otel = Google lodging primaryType, ya da (primaryType tur/araç DEĞİLSE) otel ipuçları.
    // Seyahat acentesi / tur şirketi / rent-a-car primaryType'ları kesin olarak dışlanır.
    // Ek koruma: Google lodging primaryType ile ONAYLANMAMIŞ kayıtlarda işletme ADI tur/seyahat
    // acentesine işaret ediyorsa (ve adı açıkça otel/konaklama değilse) listeden çıkar.
    const name = "lower(COALESCE(mb.name,''))";
    // KESİN acente sinyali: adında "acent"/"seyahat"/"travel agency"/"tur(/tour) operatör"/
    // "transfer" geçen kayıt Google lodging primaryType ile ONAYLANMAMIŞSA, adında otel/villa/tatil
    // gibi konaklama kelimeleri olsa BİLE otel listesinden çıkar (gerçek otel adı "Seyahat Acentası"
    // içermez). "turizm" tek başına çok geniş olduğundan yumuşak listede tutulur.
    const nameHardAgency = `(
      ${name} LIKE '%acent%' OR ${name} LIKE '%seyahat%'
      OR ${name} LIKE '%travel agency%'
      OR ${name} LIKE '%tur operat%' OR ${name} LIKE '%tour operat%'
      OR ${name} LIKE '%transfer%'
      OR ${name} LIKE '%umre%' OR ${name} LIKE '% hac%' OR ${name} LIKE '%hac %'
      OR ${name} LIKE '%hac ve%' OR ${name} LIKE '%hac-umre%'
      OR ${name} LIKE '%turları%' OR ${name} LIKE '%turlari%'
    )`;
    const nameHardAgencyAlways = `(
      ${name} LIKE '%umre%' OR ${name} LIKE '%acent%' OR ${name} LIKE '%seyahat%'
      OR ${name} LIKE '%travel agency%'
      OR ${name} LIKE '%tur operat%' OR ${name} LIKE '%tour operat%'
      OR ${name} LIKE '%transfer%'
      OR ${name} LIKE '% hac%' OR ${name} LIKE '%hac %'
      OR ${name} LIKE '%hac ve%' OR ${name} LIKE '%hac-umre%'
      OR ${name} LIKE '%turları%' OR ${name} LIKE '%turlari%'
      OR (
        ${name} LIKE '%turizm%'
        AND (
          ${name} LIKE '%tur %' OR ${name} LIKE '% turlar%'
          OR ${name} LIKE '%turları%' OR ${name} LIKE '%turlari%'
          OR ${name} ~ '(^|[^a-zçğıöşü])tur([^a-zçğıöşü]|$)'
        )
      )
    )`;
    const nameLooksAgency = `(
      ${name} LIKE '%tour%' OR ${name} LIKE '%travel%'
      OR ${name} LIKE '%operat%' OR ${name} LIKE '%turizm%'
      OR ${name} ~ '(^|[^a-zçğıöşü])tur([^a-zçğıöşü]|$)'
    )`;
    const nameLooksLodging = `(
      ${name} LIKE '%otel%' OR ${name} LIKE '%hotel%' OR ${name} LIKE '%resort%'
      OR ${name} LIKE '%pansiyon%' OR ${name} LIKE '%konaklama%' OR ${name} LIKE '%suit%'
      OR ${name} LIKE '%apart%' OR ${name} LIKE '%residence%' OR ${name} LIKE '%tatil%'
      OR ${name} LIKE '%hostel%' OR ${name} LIKE '%motel%' OR ${name} LIKE '%butik%'
    )`;
    return `AND (
        ${pt} IN ${GP_LODGING_TYPES_SQL}
        OR (
          ${pt} NOT IN ${GP_TOUR_TYPES_SQL} AND ${pt} NOT IN ${GP_CAR_TYPES_SQL}
          AND (
            ${store} LIKE '%otel%' OR ${store} LIKE '%hotel%'
            OR ${catName} LIKE '%otel%' OR ${catName} LIKE '%hotel%'
            OR ${catSlug} LIKE '%otel%' OR ${catSlug} LIKE '%hotel%'
            OR ${nameLooksLodging}
            OR ${extras} LIKE '%"lodging"%' OR ${extras} LIKE '%"hotel"%'
            OR ${extras} LIKE '%"motel"%' OR ${extras} LIKE '%"resort_hotel"%' OR ${extras} LIKE '%"guest_house"%'
          )
        )
      )
      AND ${pt} NOT IN ${GP_TOUR_TYPES_SQL}
      AND ${pt} NOT IN ${GP_CAR_TYPES_SQL}
      AND ${store} NOT LIKE '%seyahat%'
      AND ${store} NOT LIKE '%acent%'
      AND NOT (
        ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
        AND ${nameHardAgency}
      )
      AND NOT (
        ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
        AND ${nameLooksAgency}
        AND NOT ${nameLooksLodging}
      )
      AND NOT (
        ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
        AND (
          ${extras} LIKE '%"travel_agency"%'
          OR ${extras} LIKE '%"tour_agency"%'
          OR ${extras} LIKE '%"tour_operator"%'
          OR ${extras} LIKE '%"sightseeing_tour_agency"%'
          OR ${extras} LIKE '%"tourist_information_center"%'
        )
      )
      AND NOT (${nameHardAgencyAlways})`;
  }
  if (cleanType === "car") {
    return `AND (
        ${pt} IN ${GP_CAR_TYPES_SQL}
        OR (
          ${pt} NOT IN ${GP_LODGING_TYPES_SQL} AND ${pt} NOT IN ${GP_TOUR_TYPES_SQL}
          AND (
            ${store} LIKE '%arac%' OR ${store} LIKE '%araç%' OR ${store} LIKE '%car%' OR ${store} LIKE '%rent%'
            OR ${catName} LIKE '%rent%' OR ${catName} LIKE '%arac%' OR ${catName} LIKE '%araç%'
            OR ${extras} LIKE '%"car_rental"%'
          )
        )
      )
      AND ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
      AND ${pt} NOT IN ${GP_TOUR_TYPES_SQL}`;
  }
  if (cleanType === "villa") {
    return `AND (${store} LIKE '%villa%' OR ${catName} LIKE '%villa%')
      AND ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
      AND ${pt} NOT IN ${GP_TOUR_TYPES_SQL}
      AND ${pt} NOT IN ${GP_CAR_TYPES_SQL}`;
  }
  if (cleanType === "tour") {
    // Tur / seyahat acentesi = Google travel_agency vb., ya da store_type "turizm"/"seyahat"
    // (otel hariç). Otel ve rent-a-car primaryType'ları dışlanır.
    return `AND (
        ${pt} IN ${GP_TOUR_TYPES_SQL}
        OR (
          ${pt} NOT IN ${GP_LODGING_TYPES_SQL} AND ${pt} NOT IN ${GP_CAR_TYPES_SQL}
          AND (
            (${store} LIKE '%tur%' AND ${store} NOT LIKE '%otel%')
            OR ${store} LIKE '%seyahat%' OR ${store} LIKE '%acent%'
            OR (${catName} LIKE '%tur%' AND ${catName} NOT LIKE '%otel%')
            OR ${extras} LIKE '%"travel_agency"%'
          )
        )
      )
      AND ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
      AND ${pt} NOT IN ${GP_CAR_TYPES_SQL}`;
  }
  if (cleanType === "boat") {
    return `AND (
        ${YATPORT_TYPE_SQL}
        OR ${store} LIKE '%yat%' OR ${store} LIKE '%tekne%' OR ${store} LIKE '%boat%'
        OR ${catName} LIKE '%yat%' OR ${catName} LIKE '%tekne%'
        OR ${extras} LIKE '%"boat_rental"%'
      )
      AND ${pt} NOT IN ${GP_LODGING_TYPES_SQL}
      AND ${pt} NOT IN ${GP_TOUR_TYPES_SQL}
      AND ${pt} NOT IN ${GP_CAR_TYPES_SQL}`;
  }
  if (cleanType === "vip") {
    return `AND (
        ${store} IN ('turizm_vip_servis','turizm_transfer','ulasim_ozel_tasima','ulasim_minibus_servis')
        OR ${store} LIKE '%vip%' OR ${store} LIKE '%transfer%'
        OR ${catName} LIKE '%vip%' OR ${catName} LIKE '%transfer%'
        OR COALESCE(${extras}->>'tourismImportCategory','') = 'vip'
        OR COALESCE(${extras}->>'tourismImported','') = 'true'
      )`;
  }
  return "";
}

function mapBusinessHrefSql(fallbackType: string): string {
  const slugExpr = "COALESCE(NULLIF(mb.slug,''), mb.id::text)";
  if (fallbackType === "hotel") return `'/turizm/konaklama/' || ${slugExpr}`;
  if (fallbackType === "villa") return `'/turizm/villa-ev/' || ${slugExpr}`;
  if (fallbackType === "car") return `'/turizm/arac-kiralama/' || ${slugExpr}`;
  if (fallbackType === "boat") return `'/turizm/yat-turlari/' || ${slugExpr}`;
  if (fallbackType === "tour") return `'/turizm/tur/' || ${slugExpr}`;
  if (fallbackType === "vip") return `'/turizm/servis/' || ${slugExpr}`;
  return `CASE WHEN mb.slug IS NOT NULL AND mb.slug <> '' THEN '/kesfet/' || mb.slug ELSE '/kesfet/isletme/' || mb.id END`;
}

function tourismListingDisplayName(row: Record<string, unknown>): string {
  return String(row.title ?? row.vendor_name ?? row.name ?? "").trim();
}

function tourismNameLooksLodging(name: string): boolean {
  const n = name.toLowerCase();
  return (
    /\b(otel|hotel|resort|pansiyon|konaklama|motel|hostel|butik|apart|residence|tatil)\b/.test(n)
    || n.includes(" suit")
  );
}

/** Tur acentesi / umre-hac operatörü / transfer — public otel listesinde ASLA gösterilmez (lodging primaryType dahil). */
function isTourismAgencyBusinessName(name: string): boolean {
  const n = name.toLowerCase();
  if (!n) return false;
  // Kesin sinyaller — konaklama kelimesi geçse bile (butik/5 yıldızlı vb.) otel sayılmaz.
  if (
    /\b(acent|seyahat|travel agency|tur operat|tour operat|transfer)\b/.test(n)
    || /\b(umre|hac ve umre|hac-umre)\b/.test(n)
    || /\bhac\b/.test(n)
    || /\bturları\b/.test(n)
    || /\bturlari\b/.test(n)
  ) {
    return true;
  }
  if (/\bturizm\b/.test(n) && (/\btur(lar|u|ları|izm)?\b/.test(n) || /\btour\b/.test(n))) {
    return true;
  }
  if (tourismNameLooksLodging(n)) return false;
  if (/\b(turizm|tur operator|tur operatör)\b/.test(n)) return true;
  if (/\btour\b/.test(n) && !/\b(hotel|resort)\b/.test(n)) return true;
  if (/\b(travel|operatör|operator)\b/.test(n)) return true;
  return false;
}

function isPublicTourismDemoMapRow(row: Record<string, unknown>): boolean {
  const slug = String(row.slug ?? "").toLowerCase();
  const name = tourismListingDisplayName(row).toLowerCase();
  if (slug && PUBLIC_TOURISM_DEMO_MAP_SLUGS.has(slug)) return true;
  if (slug && (/^yekpare-.*-demo/.test(slug) || slug.includes("demo-otel") || slug.includes("demo-hotel"))) {
    return true;
  }
  if (/yekpare\s+demo/.test(name)) return true;
  if (/four\s*seasons?/.test(name) || /four-season/.test(slug)) return true;
  return false;
}

/** Tek kök filtre: carousel, /turizm/konaklama tam liste ve destinasyon otel yollarının hepsi bunu kullanır. */
function applyPublicHotelListingFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.filter((row) => {
    if (isPublicTourismDemoMapRow(row)) return false;
    if (isTourismAgencyBusinessName(tourismListingDisplayName(row))) return false;
    return true;
  });
}

function isTourismAdminDemoRow(row: Record<string, unknown>): boolean {
  if (isPublicTourismDemoMapRow(row)) return true;
  const title = String(row.title ?? row.name ?? "").toLowerCase();
  const vendor = String(row.vendor_name ?? "").toLowerCase();
  const slug = String(row.slug ?? "").toLowerCase();
  if (/yekpare\s+demo/.test(title) || /yekpare\s+demo/.test(vendor)) return true;
  if (slug.startsWith("yekpare-demo") || slug.includes("demo-otel") || slug.includes("demo-hotel")) return true;
  if (/four\s*seasons?/.test(title)) return true;
  const extra = row.extra_info;
  if (extra && typeof extra === "object" && String((extra as Record<string, unknown>).demo ?? "") === "true") {
    return true;
  }
  return false;
}

/** @deprecated — use applyPublicHotelListingFilters */
function filterPublicHotelMapRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return applyPublicHotelListingFilters(rows);
}

async function fetchMapBusinessListings(
  cleanType: string,
  cleanCity: string,
  limit: number,
  cityMatch?: string[],
): Promise<Record<string, unknown>[]> {
  const fallbackType = cleanType || "hotel";
  const mapTypeWhere = mapBusinessTypeWhere(cleanType);
  const cityWhere = cityMatch?.length
    ? `AND ${mapCityMatchSql(cityMatch)}`
    : cleanCity
      ? `AND (COALESCE(mb.name,'') ILIKE '%${cleanCity.replace(/'/g, "''")}%' OR COALESCE(mb.address,'') ILIKE '%${cleanCity.replace(/'/g, "''")}%' OR COALESCE(mcity.name,'') ILIKE '%${cleanCity.replace(/'/g, "''")}%')`
      : "";
  const hrefSql = mapBusinessHrefSql(fallbackType);
  const mapRows = await db.execute(sql.raw(`
    SELECT
      mb.id,
      '${fallbackType}' AS type,
      mb.name AS title,
      COALESCE(NULLIF(mb.slug,''), mb.id::text) AS slug,
      COALESCE(mcity.name, '') AS city,
      COALESCE(mdist.name, '') AS district,
      mb.address,
      mb.latitude AS lat,
      mb.longitude AS lng,
      COALESCE(mb.cover_photo_url, mb.photo_url) AS image_url,
      mb.cover_photo_url,
      mb.photo_url,
      mb.scraped_photos,
      mb.google_places_extras,
      mb.google_place_id,
      mb.import_source,
      '0' AS price,
      NULL AS sale_price,
      CASE WHEN '${fallbackType}' IN ('hotel','villa') THEN 'gece' WHEN '${fallbackType}' = 'tour' THEN 'kişi' WHEN '${fallbackType}' = 'boat' THEN 'saat' WHEN '${fallbackType}' = 'vip' THEN 'transfer' ELSE 'gün' END AS price_unit,
      NULL AS star_rating,
      COALESCE(mb.rating, 0) AS rating,
      COALESCE(mb.user_ratings_total, 0) AS review_count,
      mb.google_places_extras->>'priceLevel' AS price_level,
      mb.is_premium AS is_featured,
      mb.name AS vendor_name,
      ${hrefSql} AS href,
      true AS map_business_fallback
    FROM map_businesses mb
    LEFT JOIN map_categories mc ON mc.id = mb.category_id
    LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
    LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
    WHERE mb.is_active = true
      AND (
        mb.homepage_super_category IN ('turizm', 'seyahat')
        OR mb.store_type LIKE 'turizm%'
        OR mb.store_type LIKE 'seyahat%'
      )
      ${mapTypeWhere}
      ${cityWhere}
    ORDER BY
      CASE WHEN mb.google_place_id IS NOT NULL OR COALESCE(mb.import_source,'') ILIKE '%google%' THEN 0 ELSE 1 END,
      mb.is_premium DESC,
      mb.rating DESC NULLS LAST,
      mb.created_at DESC
    LIMIT ${limit}
  `));
  let rawRows = mapRows.rows as Record<string, unknown>[];
  if (fallbackType === "hotel" || fallbackType === "boat") {
    rawRows = await enrichMapBusinessListingImages(rawRows);
    rawRows = rawRows.map((row) => {
      const enriched = fallbackType === "boat" ? enrichYatportMapListing(row) : row;
      const resolved = resolveMapBusinessCoverImageFromRow(row);
      const imageUrl = resolved || enriched.image_url || row.image_url;
      return {
        ...enriched,
        image_url: imageUrl,
        is_yatport: fallbackType === "boat" && isYatportMapBusiness(enriched),
        import_source: enriched.import_source ?? row.import_source ?? null,
      };
    });
  }
  let rows = normalizeTourismImageRows(rawRows);
  if (fallbackType === "hotel") {
    rows = applyPublicHotelListingFilters(rows);
  }
  if (fallbackType === "vip") {
    rows = await enrichVipListingRows(rows);
  }
  return rows;
}

function mergeTourismListings(
  mapRows: Record<string, unknown>[],
  dbRows: Record<string, unknown>[],
  limit: number,
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const r of [...mapRows, ...dbRows]) {
    const key = String(r.slug ?? r.id ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
    if (merged.length >= limit) break;
  }
  return merged;
}

const HOTEL_FILTER_AMENITIES = [
  "Ücretsiz WiFi",
  "Havuz",
  "Spa",
  "Otopark",
  "Kahvaltı dahil",
  "Klima",
  "Fitness",
  "Deniz manzarası",
];

const HOTEL_PRICE_FILTER_MAX = 25000;
const VILLA_PRICE_FILTER_MAX = 50000;
const TOUR_PRICE_FILTER_MAX = 15000;
const CAR_PRICE_FILTER_MAX = 10000;
const BOAT_PRICE_FILTER_MAX = 50000;

const VILLA_FILTER_AMENITIES = [
  "Özel havuz",
  "Bahçe",
  "Mutfak",
  "Otopark",
  "Deniz manzarası",
  "Wi-Fi",
  "Klima",
  "Barbekü",
];

const TOUR_FILTER_AMENITIES = [
  "Rehber",
  "Transfer",
  "Yemek dahil",
  "Müze bileti",
  "Fotoğraf molaları",
  "Sigorta",
];

const CAR_FILTER_FEATURES = [
  "Otomatik",
  "Manuel",
  "Benzin",
  "Dizel",
  "Elektrik",
  "Havalimanı teslim",
  "Kasko",
];

const BOAT_FILTER_AMENITIES = [
  "Kaptan dahil",
  "Yüzme molası",
  "Yemek opsiyonu",
  "Klima",
  "Wi-Fi",
  "Jakuzi",
];

const TOUR_DURATION_OPTIONS = ["1 gün", "2 gün", "3 gün", "4+ gün"];

type TourismListingFilterQuery = {
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  stars: number[];
  amenities: string[];
  features: string[];
  capacityMin?: number;
  sort: string;
  rentalType?: string;
  cabinMin?: number;
  yearMin?: number;
  yearMax?: number;
  lengthMin?: number;
  lengthMax?: number;
  kaptanli?: boolean;
  kaptansiz?: boolean;
  activeOnly?: boolean;
};

/** @deprecated alias — use TourismListingFilterQuery */
type HotelListingFilterQuery = TourismListingFilterQuery;

function parseTourismListingFilters(query: Record<string, string>): TourismListingFilterQuery {
  const priceMinRaw = query.priceMin ?? query.minPrice;
  const priceMaxRaw = query.priceMax ?? query.maxPrice;
  const priceMin = priceMinRaw != null && priceMinRaw !== "" ? Number(priceMinRaw) : undefined;
  const priceMax = priceMaxRaw != null && priceMaxRaw !== "" ? Number(priceMaxRaw) : undefined;
  const ratingMinRaw = query.ratingMin ?? query.minRating;
  const ratingMin =
    ratingMinRaw != null && ratingMinRaw !== "" ? Number(ratingMinRaw) : undefined;
  const starsRaw = query.stars ?? query.star;
  const stars =
    starsRaw != null && starsRaw !== ""
      ? starsRaw
          .split(",")
          .map((s) => Math.round(Number(s.trim())))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5)
      : [];
  const amenitiesRaw = query.amenities ?? query.amenity;
  const amenities =
    amenitiesRaw != null && amenitiesRaw !== ""
      ? amenitiesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const featuresRaw = query.features ?? query.feature;
  const features =
    featuresRaw != null && featuresRaw !== ""
      ? featuresRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const capacityMinRaw = query.capacityMin ?? query.guestsMin ?? query.minGuests;
  const capacityMin =
    capacityMinRaw != null && capacityMinRaw !== "" ? Number(capacityMinRaw) : undefined;
  const cabinMinRaw = query.cabinMin ?? query.cabinsMin;
  const cabinMin = cabinMinRaw != null && cabinMinRaw !== "" ? Number(cabinMinRaw) : undefined;
  const yearMinRaw = query.yearMin;
  const yearMaxRaw = query.yearMax;
  const yearMin = yearMinRaw != null && yearMinRaw !== "" ? Number(yearMinRaw) : undefined;
  const yearMax = yearMaxRaw != null && yearMaxRaw !== "" ? Number(yearMaxRaw) : undefined;
  const lengthMinRaw = query.lengthMin;
  const lengthMaxRaw = query.lengthMax;
  const lengthMin = lengthMinRaw != null && lengthMinRaw !== "" ? Number(lengthMinRaw) : undefined;
  const lengthMax = lengthMaxRaw != null && lengthMaxRaw !== "" ? Number(lengthMaxRaw) : undefined;
  const rentalType = String(query.rentalType ?? "").trim() || undefined;
  const kaptanli = query.kaptanli === "1" || query.kaptanli === "true";
  const kaptansiz = query.kaptansiz === "1" || query.kaptansiz === "true";
  const activeOnly = query.activeOnly === "1" || query.activeOnly === "true";
  const sort = String(query.sort ?? "recommended").trim() || "recommended";
  return {
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    ratingMin: Number.isFinite(ratingMin) ? ratingMin : undefined,
    stars,
    amenities,
    features,
    capacityMin: Number.isFinite(capacityMin) ? capacityMin : undefined,
    sort,
    rentalType,
    cabinMin: Number.isFinite(cabinMin) ? cabinMin : undefined,
    yearMin: Number.isFinite(yearMin) ? yearMin : undefined,
    yearMax: Number.isFinite(yearMax) ? yearMax : undefined,
    lengthMin: Number.isFinite(lengthMin) ? lengthMin : undefined,
    lengthMax: Number.isFinite(lengthMax) ? lengthMax : undefined,
    kaptanli: kaptanli || undefined,
    kaptansiz: kaptansiz || undefined,
    activeOnly: activeOnly || undefined,
  };
}

function parseHotelListingFilters(query: Record<string, string>): TourismListingFilterQuery {
  return parseTourismListingFilters(query);
}

function parseFeaturesObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v != null && v !== "") out[k] = String(v);
  }
  return out;
}

function rowFeatureTokens(row: Record<string, unknown>): string[] {
  const feats = parseFeaturesObject(row.features);
  const fromFeatures = Object.values(feats);
  const fromAmenities = parseJsonArray(row.amenities);
  const durationDays = row.duration_days != null ? `${row.duration_days} gün` : "";
  const durationNights = row.duration_nights != null ? `${row.duration_nights} gece` : "";
  return [...fromFeatures, ...fromAmenities, durationDays, durationNights].filter(Boolean);
}

function listingNightlyPrice(row: Record<string, unknown>): number {
  const sale = parseFloat(String(row.sale_price ?? ""));
  const base = parseFloat(String(row.base_price ?? row.price ?? "0"));
  if (Number.isFinite(sale) && sale > 0) return sale;
  if (Number.isFinite(base) && base > 0) return base;
  return 0;
}

async function enrichHotelListingRow(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bizId = String(row.id ?? "");
  const slug = String(row.slug ?? "");
  const enriched: Record<string, unknown> = { ...row, price_unit: row.price_unit ?? "gece" };

  if (row.map_business_fallback) {
    const linked = await fetchLinkedHotelListingForMap(bizId, slug);
    let imageUrl = normalizeImageUrlValue(row.image_url);
    if (imageUrl && isTourismBcPlaceholderImage(imageUrl)) imageUrl = null;
    if (!imageUrl) {
      imageUrl =
        normalizeImageUrlValue(linked?.image_url) ||
        normalizeImageUrlValue(parseJsonArray(linked?.gallery)[0]) ||
        null;
    }
    if (imageUrl && !isTourismBcPlaceholderImage(imageUrl)) {
      enriched.image_url = imageUrl;
      enriched.gallery = normalizeTourismGalleryUrls(linked?.gallery ?? [imageUrl], imageUrl, {
        allowFallback: false,
      });
    }
    if (linked?.star_rating != null && linked.star_rating !== "") {
      enriched.star_rating = linked.star_rating;
    }
    const linkedAmenities = linked?.amenities;
    if (linkedAmenities) enriched.amenities = parseJsonArray(linkedAmenities);
    return normalizeTourismListingRow(enriched);
  }

  const nightly = listingNightlyPrice(row);
  if (nightly > 0) {
    enriched.base_price = String(nightly);
    enriched.has_nightly_price = true;
  }
  if (row.amenities) enriched.amenities = parseJsonArray(row.amenities);
  return normalizeTourismListingRow(enriched);
}

async function enrichHotelListingsWithNightlyPrice(
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const batchSize = 12;
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const enriched = await Promise.all(batch.map(enrichHotelListingRow));
    out.push(...enriched);
  }
  return out;
}

function applyTourismListingFilters(
  rows: Record<string, unknown>[],
  filters: TourismListingFilterQuery,
  type?: string,
): Record<string, unknown>[] {
  const cleanType = type ? normalizeTourismType(type) : "";
  return rows.filter((row) => {
    const price = listingNightlyPrice(row);
    if (filters.priceMin != null && (price <= 0 || price < filters.priceMin)) return false;
    if (filters.priceMax != null && price > 0 && price > filters.priceMax) return false;
    if (filters.priceMax != null && price <= 0) return false;

    const rating = safeTourismNum(row.rating);
    if (filters.ratingMin != null && rating < filters.ratingMin) return false;

    if (filters.stars.length && (!cleanType || cleanType === "hotel" || cleanType === "villa")) {
      const starCount = Math.round(safeTourismNum(row.star_rating));
      if (!filters.stars.includes(starCount)) return false;
    }

    if (filters.capacityMin != null) {
      const cap = safeTourismNum(row.capacity);
      if (cap <= 0 || cap < filters.capacityMin) return false;
    }

    if (filters.amenities.length) {
      const rowAmenities = parseJsonArray(row.amenities).map((a) => a.toLowerCase());
      const ok = filters.amenities.every((needle) =>
        rowAmenities.some((a) => a.includes(needle.toLowerCase())),
      );
      if (!ok) return false;
    }

    if (filters.features.length) {
      const tokens = rowFeatureTokens(row).map((t) => t.toLowerCase());
      const ok = filters.features.every((needle) =>
        tokens.some((t) => t.includes(needle.toLowerCase())),
      );
      if (!ok) return false;
    }

    if (cleanType === "boat") {
      const meta = yachtRowMeta(row);
      if (filters.cabinMin != null && (meta.kabin <= 0 || meta.kabin < filters.cabinMin)) return false;
      if (filters.yearMin != null && (meta.yapimYili <= 0 || meta.yapimYili < filters.yearMin)) return false;
      if (filters.yearMax != null && meta.yapimYili > 0 && meta.yapimYili > filters.yearMax) return false;
      if (filters.lengthMin != null && (meta.uzunluk <= 0 || meta.uzunluk < filters.lengthMin)) return false;
      if (filters.lengthMax != null && meta.uzunluk > 0 && meta.uzunluk > filters.lengthMax) return false;
      if (filters.rentalType) {
        const rt = meta.rentalType.toLowerCase();
        const want = filters.rentalType.toLowerCase();
        if (!rt.includes(want.replace("lik", "")) && !rt.includes(want)) return false;
      }
      if (filters.kaptanli && !meta.kaptanli) return false;
      if (filters.kaptansiz && meta.kaptanli) return false;
    }

    return true;
  });
}

function applyHotelListingFilters(
  rows: Record<string, unknown>[],
  filters: TourismListingFilterQuery,
): Record<string, unknown>[] {
  return applyTourismListingFilters(rows, filters, "hotel");
}

function sortHotelListings(rows: Record<string, unknown>[], sort: string): Record<string, unknown>[] {
  const copy = [...rows];
  switch (sort) {
    case "price_asc":
    case "price-low":
      return copy.sort(
        (a, b) =>
          listingNightlyPrice(a) - listingNightlyPrice(b) ||
          safeTourismNum(b.rating) - safeTourismNum(a.rating),
      );
    case "price_desc":
    case "price-high":
      return copy.sort(
        (a, b) =>
          listingNightlyPrice(b) - listingNightlyPrice(a) ||
          safeTourismNum(b.rating) - safeTourismNum(a.rating),
      );
    case "rating":
    case "rating-high":
      return copy.sort(
        (a, b) =>
          safeTourismNum(b.rating) - safeTourismNum(a.rating) ||
          Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)),
      );
    case "popular":
      return copy.sort(
        (a, b) =>
          safeTourismNum(b.review_count) - safeTourismNum(a.review_count) ||
          safeTourismNum(b.rating) - safeTourismNum(a.rating),
      );
    case "recommended":
    default:
      return copy.sort((a, b) => {
        const prem = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
        if (prem !== 0) return prem;
        const priceA = listingNightlyPrice(a);
        const priceB = listingNightlyPrice(b);
        if (priceA > 0 && priceB <= 0) return -1;
        if (priceB > 0 && priceA <= 0) return 1;
        return safeTourismNum(b.rating) - safeTourismNum(a.rating);
      });
  }
}

function tourismListingFilterMeta(type?: string) {
  const cleanType = type ? normalizeTourismType(type) : "hotel";
  const base = {
    sortOptions: [
      { value: "recommended", label: "Önerilen" },
      { value: "price_asc", label: "Fiyat (düşükten yükseğe)" },
      { value: "price_desc", label: "Fiyat (yüksekten düşüğe)" },
      { value: "rating", label: "Puan (yüksek)" },
    ],
  };
  switch (cleanType) {
    case "villa":
      return {
        ...base,
        amenities: VILLA_FILTER_AMENITIES,
        priceMax: VILLA_PRICE_FILTER_MAX,
        priceUnit: "gece",
        showStars: false,
        showCapacity: true,
      };
    case "tour":
      return {
        ...base,
        amenities: TOUR_FILTER_AMENITIES,
        features: TOUR_DURATION_OPTIONS,
        priceMax: TOUR_PRICE_FILTER_MAX,
        priceUnit: "kişi",
        showDuration: true,
      };
    case "car":
      return {
        ...base,
        amenities: [],
        features: CAR_FILTER_FEATURES,
        priceMax: CAR_PRICE_FILTER_MAX,
        priceUnit: "gün",
        showFeatures: true,
      };
    case "boat":
      return {
        ...base,
        amenities: BOAT_FILTER_AMENITIES,
        priceMax: BOAT_PRICE_FILTER_MAX,
        priceUnit: "gün",
        showCapacity: true,
      };
    case "hotel":
    default:
      return {
        ...base,
        amenities: HOTEL_FILTER_AMENITIES,
        priceMax: HOTEL_PRICE_FILTER_MAX,
        priceUnit: "gece",
        showStars: true,
      };
  }
}

function hotelListingFilterMeta() {
  return tourismListingFilterMeta("hotel");
}

function enrichBcListingRow(row: Record<string, unknown>, type: string): Record<string, unknown> {
  const normalized = normalizeTourismListingRow(row);
  if (type === "tour") return enrichTourRow(normalized);
  if (type === "car") return enrichCarRow(normalized);
  return normalized;
}

/** BC catalog types — never mixed with map_businesses in public list endpoints. */
const BC_CATALOG_TYPES = new Set(["villa", "tour", "car", "boat", "vip"]);

function isGoogleHotelType(cleanType: string): boolean {
  return !cleanType || cleanType === "hotel";
}

function prependDemoRows(rows: Record<string, unknown>[], type: string, limit: number): Record<string, unknown>[] {
  if (type === "hotel") return rows.slice(0, limit);
  const demos = type ? [demoForType(type)].filter(Boolean) as TourismDemoListing[] : TOURISM_DEMO_LISTINGS.filter((d) => d.type !== "hotel");
  const seen = new Set(rows.map((r) => String(r.slug ?? "")));
  const additions = demos.filter((d) => !seen.has(d.slug)).map(demoListRow);
  return [...additions, ...rows].slice(0, limit);
}

async function fetchRoomsForMapBusiness(
  bizId: string,
  slug: string,
): Promise<Record<string, unknown>[]> {
  const safeId = bizId.replace(/'/g, "''");
  const safeSlug = slug.replace(/'/g, "''");
  try {
    const roomRows = await db.execute(sql.raw(`
      SELECT tr.*
      FROM tourism_rooms tr
      JOIN tourism_listings tl ON tl.id = tr.listing_id
      WHERE tr.status = 'active'
        AND tl.status = 'active'
        AND tl.type = 'hotel'
        AND (
          tl.extra_info->>'linked_map_business_id' = '${safeId}'
          OR LOWER(COALESCE(tl.extra_info->>'linked_map_slug','')) = LOWER('${safeSlug}')
          OR LOWER(tl.slug) = LOWER('${safeSlug}')
          OR EXISTS (
            SELECT 1 FROM map_businesses mb2
            WHERE mb2.id::text = '${safeId}'
              AND LOWER(COALESCE(mb2.slug,'')) = LOWER(COALESCE(tl.extra_info->>'linked_map_slug',''))
          )
          OR EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.id = tl.vendor_id
              AND (v.linked_map_business_id = '${safeId}' OR LOWER(v.slug) = LOWER(tl.slug))
          )
        )
      ORDER BY tr.price ASC
      LIMIT 24
    `));
    if ((roomRows.rows as unknown[]).length) {
      return normalizeTourismRoomRows(roomRows.rows as Record<string, unknown>[]);
    }
  } catch {
    /* tourism tables optional */
  }

  try {
    const linkedRows = await db.execute(sql`
      SELECT tr.*
      FROM tourism_rooms tr
      JOIN tourism_google_hotel_links tgl ON tgl.carrier_listing_id = tr.listing_id
      JOIN tourism_listings tl ON tl.id = tr.listing_id
      WHERE tr.status = 'active'
        AND tl.status = 'active'
        AND tl.type = 'hotel'
        AND (
          tgl.map_business_id = ${bizId}
          OR LOWER(tgl.map_slug) = LOWER(${slug})
        )
      ORDER BY tr.price ASC
      LIMIT 24
    `);
    if ((linkedRows.rows as unknown[]).length) {
      return normalizeTourismRoomRows(linkedRows.rows as Record<string, unknown>[]);
    }
  } catch {
    /* links table optional until seed runs */
  }

  const demoLink = BC_GOOGLE_HOTEL_LINKS.find(
    (l) => l.mapSlug.toLowerCase() === slug.toLowerCase() || l.mapSlug === bizId,
  );
  if (demoLink) {
    const demoRooms = await fetchRoomsForCarrierSlug(demoLink.roomCarrierSlug);
    if (demoRooms.length) return demoRooms;
  }

  try {
    const vendorRooms = await db.execute(sql.raw(`
      SELECT tr.*
      FROM tourism_rooms tr
      JOIN tourism_listings tl ON tl.id = tr.listing_id
      JOIN vendors v ON v.id = tl.vendor_id
      WHERE tr.status = 'active'
        AND tl.status = 'active'
        AND tl.type = 'hotel'
        AND v.linked_map_business_id = '${safeId}'
      ORDER BY tr.price ASC
      LIMIT 24
    `));
    if ((vendorRooms.rows as unknown[]).length) {
      return normalizeTourismRoomRows(vendorRooms.rows as Record<string, unknown>[]);
    }
  } catch {
    /* vendor link optional */
  }

  try {
    const fallback = await db.execute(sql`
      SELECT tr.*
      FROM tourism_rooms tr
      JOIN tourism_listings tl ON tl.id = tr.listing_id
      WHERE tr.status = 'active'
        AND tl.status = 'active'
        AND tl.type = 'hotel'
        AND COALESCE(tl.extra_info->>'room_carrier', 'false') = 'true'
      ORDER BY tr.price ASC
      LIMIT 24
    `);
    return normalizeTourismRoomRows(fallback.rows as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

async function fetchLinkedHotelListingForMap(
  bizId: string,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const safeId = bizId.replace(/'/g, "''");
  const safeSlug = slug.replace(/'/g, "''");
  try {
    const r = await db.execute(sql.raw(`
      SELECT tl.*
      FROM tourism_listings tl
      LEFT JOIN vendors v ON v.id = tl.vendor_id
      WHERE tl.status = 'active'
        AND tl.type = 'hotel'
        AND (
          tl.extra_info->>'linked_map_business_id' = '${safeId}'
          OR LOWER(COALESCE(tl.extra_info->>'linked_map_slug','')) = LOWER('${safeSlug}')
          OR v.linked_map_business_id = '${safeId}'
        )
      ORDER BY tl.is_featured DESC, tl.id ASC
      LIMIT 1
    `));
    if (r.rows[0]) return r.rows[0] as Record<string, unknown>;
  } catch {
    /* direct link optional */
  }

  try {
    const linked = await db.execute(sql`
      SELECT tl.*
      FROM tourism_listings tl
      JOIN tourism_google_hotel_links tgl ON tgl.carrier_listing_id = tl.id
      WHERE tl.status = 'active'
        AND tl.type = 'hotel'
        AND (
          tgl.map_business_id = ${bizId}
          OR LOWER(tgl.map_slug) = LOWER(${slug})
        )
      ORDER BY tl.is_featured DESC, tl.id ASC
      LIMIT 1
    `);
    if (linked.rows[0]) return linked.rows[0] as Record<string, unknown>;
  } catch {
    /* links table optional */
  }

  const demoLink = BC_GOOGLE_HOTEL_LINKS.find(
    (l) => l.mapSlug.toLowerCase() === slug.toLowerCase() || l.mapSlug === bizId,
  );
  if (demoLink) {
    try {
      const carrier = await db.execute(sql`
        SELECT tl.*
        FROM tourism_listings tl
        WHERE tl.slug = ${demoLink.roomCarrierSlug}
          AND tl.type = 'hotel'
          AND tl.status = 'active'
        LIMIT 1
      `);
      if (carrier.rows[0]) return carrier.rows[0] as Record<string, unknown>;
    } catch {
      /* demo carrier optional */
    }
  }

  try {
    const fallback = await db.execute(sql`
      SELECT tl.*
      FROM tourism_listings tl
      WHERE tl.status = 'active'
        AND tl.type = 'hotel'
        AND COALESCE(tl.extra_info->>'room_carrier', 'false') = 'true'
      ORDER BY tl.is_featured DESC, tl.id ASC
      LIMIT 1
    `);
    return (fallback.rows[0] as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

type TravllaDestinationSeed = {
  id: number;
  title: string;
  slug: string;
  image: string;
  listings: number;
  hotels: number;
  tours: number;
  villas: number;
  excerpt: string;
  detailTitle: string;
  gallery: string[];
  cityMatch: string[];
};

const FALLBACK_DESTINATIONS: TravllaDestinationSeed[] = [
  {
    id: 1,
    title: "Antalya",
    slug: "antalya",
    image: "/assets/turizm-bc/hotel/hotel-featured-1.jpg",
    listings: 42,
    hotels: 18,
    tours: 14,
    villas: 10,
    excerpt: "Akdeniz kıyıları, antik kentler ve yatırım turları.",
    detailTitle: "Antalya Seyahat Rehberi",
    gallery: ["/assets/turizm-bc/hotel/hotel-gallery-1.jpg", "/assets/turizm-bc/hotel/hotel-gallery-2.jpg"],
    cityMatch: ["Antalya", "Muratpaşa", "Kaş", "Kemer", "Manavgat", "Lara"],
  },
  {
    id: 2,
    title: "İstanbul",
    slug: "istanbul",
    image: "/assets/turizm-bc/hotel/hotel-featured-2.jpg",
    listings: 58,
    hotels: 24,
    tours: 20,
    villas: 14,
    excerpt: "İki kıtanın buluştuğu şehir — kültür ve gastronomi turları.",
    detailTitle: "İstanbul Keşif Rotası",
    gallery: ["/assets/turizm-bc/hotel/hotel-gallery-3.jpg", "/assets/turizm-bc/tour/gallery-3.jpg"],
    cityMatch: ["İstanbul", "Istanbul", "Beşiktaş", "Beyoğlu", "Fatih"],
  },
  {
    id: 3,
    title: "Kapadokya",
    slug: "kapadokya",
    image: "/assets/turizm-bc/tour/tour-1.jpg",
    listings: 36,
    hotels: 8,
    tours: 18,
    villas: 10,
    excerpt: "Balon turları, vadiler ve peri bacaları.",
    detailTitle: "Kapadokya Tur Paketleri",
    gallery: ["/assets/turizm-bc/tour/gallery-1.jpg", "/assets/turizm-bc/tour/gallery-2.jpg"],
    cityMatch: ["Nevşehir", "Kapadokya", "Göreme", "Ürgüp"],
  },
  {
    id: 4,
    title: "Bodrum",
    slug: "bodrum",
    image: "/assets/turizm-bc/boat/boat-2.jpg",
    listings: 31,
    hotels: 12,
    tours: 11,
    villas: 8,
    excerpt: "Ege koyları, yat turları ve yaz festivalleri.",
    detailTitle: "Bodrum & Muğla Turları",
    gallery: ["/assets/turizm-bc/boat/gallery-3.jpg", "/assets/turizm-bc/space/space-3.jpg"],
    cityMatch: ["Bodrum", "Muğla", "Yalıkavak"],
  },
  {
    id: 5,
    title: "Fethiye",
    slug: "fethiye",
    image: "/assets/turizm-bc/boat/boat-4.jpg",
    listings: 27,
    hotels: 6,
    tours: 12,
    villas: 9,
    excerpt: "Ölüdeniz, tekne turları ve Likya yolu yürüyüşleri.",
    detailTitle: "Fethiye Aktivite Turları",
    gallery: ["/assets/turizm-bc/boat/gallery-5.jpg", "/assets/turizm-bc/space/space-4.jpg"],
    cityMatch: ["Fethiye", "Ölüdeniz"],
  },
  {
    id: 6,
    title: "Trabzon",
    slug: "trabzon",
    image: "/assets/turizm-bc/tour/tour-4.jpg",
    listings: 22,
    hotels: 5,
    tours: 10,
    villas: 7,
    excerpt: "Karadeniz yaylaları, Sümela ve doğa turları.",
    detailTitle: "Trabzon & Karadeniz",
    gallery: ["/assets/turizm-bc/tour/gallery-5.jpg", "/assets/turizm-bc/tour/gallery-6.jpg"],
    cityMatch: ["Trabzon", "Uzungöl"],
  },
  {
    id: 7,
    title: "İzmir",
    slug: "izmir",
    image: "/assets/turizm-bc/hotel/hotel-featured-3.jpg",
    listings: 28,
    hotels: 11,
    tours: 9,
    villas: 8,
    excerpt: "Ege kıyısı, Alsancak ve antik Efes rotaları.",
    detailTitle: "İzmir & Ege Keşfi",
    gallery: ["/assets/turizm-bc/hotel/hotel-gallery-4.jpg", "/assets/turizm-bc/car/gallery-4.jpg"],
    cityMatch: ["İzmir", "Izmir", "Alsancak", "Bornova", "Konak"],
  },
  {
    id: 8,
    title: "Marmaris",
    slug: "marmaris",
    image: "/assets/turizm-bc/boat/boat-3.jpg",
    listings: 24,
    hotels: 7,
    tours: 10,
    villas: 7,
    excerpt: "Mavi yolculuk, marina ve gece hayatı.",
    detailTitle: "Marmaris Koy Turları",
    gallery: ["/assets/turizm-bc/boat/gallery-4.jpg", "/assets/turizm-bc/boat/gallery-6.jpg"],
    cityMatch: ["Marmaris"],
  },
];

function parseCityMatch(raw: unknown, title: string): string[] {
  if (Array.isArray(raw) && raw.length) return raw.map(String);
  return [title];
}

function cityMatchSql(alias: string, cityMatch: string[]): string {
  const parts = cityMatch
    .filter(Boolean)
    .map((c) => {
      const safe = c.replace(/'/g, "''");
      return `(
        COALESCE(${alias}.city, '') ILIKE '%${safe}%'
        OR COALESCE(${alias}.district, '') ILIKE '%${safe}%'
        OR COALESCE(${alias}.address, '') ILIKE '%${safe}%'
      )`;
    });
  return parts.length ? `(${parts.join(" OR ")})` : "TRUE";
}

function mapCityMatchSql(cityMatch: string[]): string {
  const parts = cityMatch
    .filter(Boolean)
    .map((c) => {
      const safe = c.replace(/'/g, "''");
      return `(
        COALESCE(mcity.name, '') ILIKE '%${safe}%'
        OR COALESCE(mdist.name, '') ILIKE '%${safe}%'
        OR COALESCE(mb.address, '') ILIKE '%${safe}%'
      )`;
    });
  return parts.length ? `(${parts.join(" OR ")})` : "TRUE";
}

async function loadDestinationsFromDb(): Promise<TravllaDestinationSeed[]> {
  try {
    const rows = await db.execute(sql`
      SELECT id, title, slug, image_url, excerpt, detail_title, gallery, city_match, sort_order
      FROM tourism_destinations
      WHERE is_active = true
      ORDER BY sort_order ASC, title ASC
    `);
    const dbRows = rows.rows as Record<string, unknown>[];
    if (!dbRows.length) return FALLBACK_DESTINATIONS;
    return dbRows.map((r, idx) => ({
      id: Number(r.id ?? idx + 1),
      title: String(r.title ?? ""),
      slug: String(r.slug ?? ""),
      image: normalizeImageUrlValue(r.image_url) || String(r.image_url ?? ""),
      listings: 0,
      hotels: 0,
      tours: 0,
      villas: 0,
      excerpt: String(r.excerpt ?? ""),
      detailTitle: String(r.detail_title ?? r.title ?? ""),
      gallery: Array.isArray(r.gallery)
        ? (r.gallery as unknown[]).map((u) => normalizeImageUrlValue(u) || String(u)).filter(Boolean)
        : [],
      cityMatch: parseCityMatch(r.city_match, String(r.title ?? "")),
    }));
  } catch {
    return FALLBACK_DESTINATIONS;
  }
}

async function countHotelsForDestination(cityMatch: string[]): Promise<number> {
  try {
    const mapRows = await fetchMapBusinessListings("hotel", "", 500, cityMatch);
    return mapRows.length;
  } catch {
    return 0;
  }
}

async function countListingsForDestination(type: string, cityMatch: string[]): Promise<number> {
  try {
    const where = cityMatchSql("tl", cityMatch);
    const r = await db.execute(sql.raw(`
      SELECT COUNT(*)::int AS c FROM tourism_listings tl
      WHERE tl.status = 'active'
        AND tl.type = '${type.replace(/'/g, "")}'
        AND COALESCE(tl.extra_info->>'room_carrier','false') <> 'true'
        AND ${where}
    `));
    return Number((r.rows[0] as { c: number }).c ?? 0);
  } catch {
    return 0;
  }
}

async function enrichDestinationCounts(d: TravllaDestinationSeed): Promise<TravllaDestinationSeed> {
  const [hotels, tours, villas] = await Promise.all([
    countHotelsForDestination(d.cityMatch),
    countListingsForDestination("tour", d.cityMatch),
    countListingsForDestination("villa", d.cityMatch),
  ]);
  return {
    ...d,
    hotels,
    tours,
    villas,
    listings: hotels + tours + villas,
  };
}

async function fetchDestinationListings(
  cityMatch: string[],
  type: "hotel" | "tour" | "villa" | "car",
  limit = 12,
  filters?: TourismListingFilterQuery,
): Promise<Record<string, unknown>[]> {
  if (type === "hotel") {
    try {
      const fetchLimit = filters ? 300 : Math.max(limit, 48);
      let mapRows = await fetchMapBusinessListings("hotel", "", fetchLimit, cityMatch);
      mapRows = await enrichHotelListingsWithNightlyPrice(mapRows);
      mapRows = applyPublicHotelListingFilters(mapRows);
      if (filters) {
        mapRows = applyHotelListingFilters(mapRows, filters);
        mapRows = sortHotelListings(mapRows, filters.sort);
      }
      return mapRows.slice(0, limit);
    } catch {
      return [];
    }
  }
  try {
    const fetchLimit = filters ? 300 : limit;
    const where = cityMatchSql("tl", cityMatch);
    const rows = await db.execute(sql.raw(`
      SELECT tl.id, tl.type, tl.title, tl.slug, tl.city, tl.district, tl.image_url, tl.gallery,
             tl.price, tl.sale_price, tl.price_unit, tl.star_rating, tl.rating, tl.review_count,
             tl.description, tl.amenities, tl.features, tl.capacity, tl.is_featured
      FROM tourism_listings tl
      WHERE tl.status = 'active'
        AND tl.type = '${type}'
        AND COALESCE(tl.extra_info->>'room_carrier','false') <> 'true'
        AND ${where}
      ORDER BY tl.is_featured DESC, tl.rating DESC NULLS LAST
      LIMIT ${fetchLimit}
    `));
    let out = (rows.rows as Record<string, unknown>[]).map((r) => {
      const row = { ...r, image_url: normalizeImageUrlValue(r.image_url) };
      return enrichBcListingRow(type === "tour" ? enrichTourRow(row) : row, type);
    });
    if (filters) {
      out = applyTourismListingFilters(out, filters, type);
      out = sortHotelListings(out, filters.sort);
    }
    return out.slice(0, limit);
  } catch {
    return [];
  }
}

/** @deprecated use FALLBACK_DESTINATIONS / DB */
const TRAVLLA_DEMO_DESTINATIONS = FALLBACK_DESTINATIONS;

function defaultItineraryFor(title: string, city: string | null) {
  const place = city || title;
  return [
    { day: "1. Gün", title: `${place} varış & transfer`, body: "Havalimanı veya otogar karşılama, konaklamaya yerleşme ve kısa şehir turu." },
    { day: "2. Gün", title: "Ana tur programı", body: "Rehber eşliğinde öne çıkan noktalar, fotoğraf molaları ve öğle yemeği molası." },
    { day: "3. Gün", title: "Serbest zaman / dönüş", body: "İsteğe bağlı aktiviteler ve dönüş transferi." },
  ];
}

function defaultCarExtras() {
  return [
    { name: "Tam kasko", price: "450", unit: "gün" },
    { name: "GPS navigasyon", price: "120", unit: "gün" },
    { name: "Çocuk koltuğu", price: "90", unit: "gün" },
    { name: "Ek sürücü", price: "75", unit: "gün" },
  ];
}

function enrichCarRow(row: Record<string, unknown>): Record<string, unknown> {
  const city = row.city ? String(row.city) : null;
  return {
    ...row,
    pickup_info: row.pickup_info ?? (city ? `${city} havalimanı veya şehir merkezi teslim.` : "Havalimanı veya şehir merkezi teslim."),
    extras: Array.isArray(row.extras) && row.extras.length ? row.extras : defaultCarExtras(),
    features: row.features && typeof row.features === "object" && Object.keys(row.features as object).length
      ? row.features
      : { vites: "Otomatik", yakit: "Benzin", koltuk: "5", bagaj: "2 bavul" },
  };
}

function defaultReviewsFor(rating: number, count: number) {
  return [
    { author: "Ayşe Y.", rating: Math.min(5, Math.round(rating)), text: "Program yoğun ama akıcıydı; rehber bilgiliydi.", date: "2026-03-12" },
    { author: "Can D.", rating: Math.max(4, Math.round(rating) - 1), text: "Fiyat/performans iyi; Yekpare üzerinden rezervasyon kolaydı.", date: "2026-02-28" },
    { author: "Elif S.", rating: Math.round(rating), text: "Ailece katıldık, çocuklar için de uygundu.", date: "2026-01-15" },
  ].slice(0, Math.min(3, Math.max(1, Math.floor(count / 40))));
}

function enrichTourRow(row: Record<string, unknown>): Record<string, unknown> {
  const title = String(row.title ?? "");
  const city = row.city ? String(row.city) : null;
  const rating = Number(row.rating ?? 4.5);
  const reviewCount = Number(row.review_count ?? 0);
  const gallery = Array.isArray(row.gallery) && row.gallery.length
    ? row.gallery
    : row.image_url
      ? [row.image_url]
      : [];
  return {
    ...row,
    href: `/turizm/tur/${String(row.slug ?? "")}`,
    gallery,
    duration_days: row.duration_days ?? 3,
    duration_nights: row.duration_nights ?? 2,
    itinerary: Array.isArray(row.itinerary) && row.itinerary.length
      ? row.itinerary
      : defaultItineraryFor(title, city),
    reviews: Array.isArray(row.reviews) && row.reviews.length
      ? row.reviews
      : defaultReviewsFor(rating, reviewCount),
  };
}

function demoTourEnriched(d: TourismDemoListing): Record<string, unknown> {
  return enrichTourRow({
    ...demoDetailRow(d),
    duration_days: d.type === "tour" ? 3 : 2,
    duration_nights: d.type === "tour" ? 2 : 1,
  });
}

/* — PUBLIC ─────────────────────────────── */

router.get("/tourism/listings", async (req, res): Promise<void> => {
  const { type, city, page = "1", limit = "12", featured } = req.query as Record<string,string>;
  const limitNum = Math.max(1, Math.min(50, parseInt(limit) || 12));
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * limitNum;
  const cleanType = normalizeTourismType(type ? type.replace(/'/g,"").trim() : "");
  const cleanCity = city ? city.replace(/'/g,"").trim() : "";
  const wantFeatured = featured === "1" || featured === "true";
  const listingFilters = parseTourismListingFilters(req.query as Record<string, string>);
  try {
    let listings: Record<string, unknown>[] = [];
    let totalCount = 0;

    // Konaklama = TR için map_businesses; yurtdışı (cc≠TR / IATA) için Hotellook ana liste.
    if (isGoogleHotelType(cleanType)) {
      const q = req.query as Record<string, string>;
      const iata = (q.iata ?? "").trim().toUpperCase();
      const countryCode = (q.cc ?? "").trim().toUpperCase();
      const locLabel = (q.loc ?? cleanCity).trim();
      const international = isInternationalHotelDestination(countryCode);
      let checkIn = (q.checkIn ?? "").trim();
      let checkOut = (q.checkOut ?? "").trim();
      if (!checkIn) checkIn = defaultHotelCheckIn();
      if (!checkOut) checkOut = defaultHotelCheckOut(checkIn);
      if (checkOut <= checkIn) checkOut = defaultHotelCheckOut(checkIn);

      const hotellookLocation = resolveHotellookLocation({
        city: cleanCity || locLabel,
        iata,
        name: locLabel,
      });
      const tpCfg = await getTravelpayoutsConfig();
      let hotellookMeta: Record<string, unknown> = {
        source: international ? "hotellook" : "map",
        configured: tpCfg.configured,
        affiliateUrl: null as string | null,
        checkIn,
        checkOut,
      };

      let mapRows: Record<string, unknown>[] = [];
      if (!international) {
        const mapLimit = wantFeatured ? Math.max(limitNum, 24) : 400;
        mapRows = await fetchMapBusinessListings("hotel", cleanCity, mapLimit);
        mapRows = await enrichHotelListingsWithNightlyPrice(mapRows);
        mapRows = applyPublicHotelListingFilters(mapRows);
        if (wantFeatured) {
          let featuredRows = mapRows.filter((r) => Boolean(r.is_featured));
          if (featuredRows.length === 0) featuredRows = mapRows;
          mapRows = featuredRows
            .sort((a, b) => safeTourismNum(b.rating) - safeTourismNum(a.rating))
            .slice(0, limitNum);
        } else {
          mapRows = applyHotelListingFilters(mapRows, listingFilters);
          mapRows = sortHotelListings(mapRows, listingFilters.sort);
        }
      }

      const useHotellookPrimary = international || (mapRows.length === 0 && Boolean(hotellookLocation));
      let hotellookRows: Record<string, unknown>[] = [];
      if (useHotellookPrimary && hotellookLocation) {
        const hl = await fetchHotellookTourismListings({
          location: hotellookLocation,
          cityLabel: locLabel || cleanCity || hotellookLocation,
          checkIn,
          checkOut,
          limit: Math.min(50, limitNum),
        });
        hotellookRows = hl.rows;
        hotellookMeta = {
          ...hotellookMeta,
          source: international || mapRows.length === 0 ? "hotellook" : "mixed",
          configured: hl.configured,
          affiliateUrl: hl.affiliateUrl,
          currency: hl.currency,
          location: hotellookLocation,
        };
      }

      if (international && hotellookRows.length > 0) {
        totalCount = hotellookRows.length;
        listings = normalizeTourismImageRows(hotellookRows.slice(offset, offset + limitNum));
      } else if (mapRows.length > 0) {
        totalCount = mapRows.length;
        listings = normalizeTourismImageRows(mapRows.slice(offset, offset + limitNum));
        hotellookMeta.source = "map";
      } else if (hotellookRows.length > 0) {
        totalCount = hotellookRows.length;
        listings = normalizeTourismImageRows(hotellookRows.slice(offset, offset + limitNum));
      } else {
        listings = [];
        totalCount = 0;
        if (useHotellookPrimary) {
          hotellookMeta.error = tpCfg.configured
            ? "Bu destinasyon için Hotellook sonucu bulunamadı."
            : "Hotellook entegrasyonu yapılandırılmadı (token/marker eksik).";
        }
      }

      res.json({
        listings,
        total: totalCount,
        page: pageNum,
        filterMeta: hotelListingFilterMeta(),
        hotellookMeta,
      });
      return;
    }

    // Rent a car / Tur / Yat-tekne / Villa-ev = oteller gibi önce Google Places (map_businesses).
    // Google sonucu varsa onu döneriz; yoksa BC katalog/demo'ya düşeriz (sayfa boş kalmasın).
    if (cleanType === "car" || cleanType === "tour" || cleanType === "boat" || cleanType === "villa" || cleanType === "vip") {
      const mapLimit = wantFeatured ? Math.max(limitNum, 24) : 400;
      let mapRows = await fetchMapBusinessListings(cleanType, cleanCity, mapLimit);
      if (cleanType === "boat") {
        mapRows = await enrichBoatListingRows(mapRows);
      }
      if (wantFeatured) {
        mapRows = mapRows
          .filter((r) => Boolean(r.is_featured))
          .sort((a, b) => safeTourismNum(b.rating) - safeTourismNum(a.rating))
          .slice(0, limitNum);
      } else {
        mapRows = applyTourismListingFilters(mapRows, listingFilters, cleanType);
        mapRows = sortHotelListings(mapRows, listingFilters.sort);
      }
      if (mapRows.length > 0) {
        totalCount = mapRows.length;
        listings = normalizeTourismImageRows(mapRows.slice(offset, offset + limitNum));
        res.json({
          listings,
          total: totalCount,
          page: pageNum,
          filterMeta: tourismListingFilterMeta(cleanType),
        });
        return;
      }
      // Google'da kayıt yoksa aşağıdaki BC katalog akışına devam.
    }

    // Tour, villa (space), car, yacht = strict BC tourism_listings type filter.
    if (!BC_CATALOG_TYPES.has(cleanType)) {
      res.json({ listings: [], total: 0, page: pageNum });
      return;
    }

    let where = `WHERE tl.status = 'active' AND tl.type = '${cleanType}'`;
    if (cleanCity) where += ` AND tl.city ILIKE '%${cleanCity.replace(/'/g, "")}%'`;
    if (wantFeatured) where += " AND tl.is_featured = true";
    where += " AND COALESCE(tl.extra_info->>'room_carrier','false') <> 'true'";

    const hasFilters =
      listingFilters.priceMin != null ||
      listingFilters.priceMax != null ||
      listingFilters.ratingMin != null ||
      listingFilters.stars.length > 0 ||
      listingFilters.amenities.length > 0 ||
      listingFilters.features.length > 0 ||
      listingFilters.capacityMin != null ||
      listingFilters.sort !== "recommended";
    const fetchLimit = wantFeatured ? limitNum : hasFilters ? 400 : limitNum;
    const fetchOffset = wantFeatured || hasFilters ? 0 : offset;

    try {
      const rows = await db.execute(sql.raw(`
        SELECT tl.id, tl.type, tl.title, tl.slug, tl.city, tl.district, tl.address,
               tl.image_url, tl.price, tl.sale_price, tl.price_unit,
               tl.star_rating, tl.rating, tl.review_count, tl.is_featured,
               tl.amenities, tl.features, tl.capacity,
               v.name as vendor_name
        FROM tourism_listings tl
        LEFT JOIN vendors v ON v.id = tl.vendor_id
        ${where}
        ORDER BY tl.is_featured DESC, tl.rating DESC NULLS LAST, tl.created_at DESC
        LIMIT ${fetchLimit} OFFSET ${fetchOffset}
      `));
      let allRows = normalizeTourismImageRows([...rows.rows] as Record<string, unknown>[]).map((r) =>
        enrichBcListingRow(r, cleanType),
      );

      if (!wantFeatured && hasFilters) {
        allRows = applyTourismListingFilters(allRows, listingFilters, cleanType);
        allRows = sortHotelListings(allRows, listingFilters.sort);
      }

      totalCount = allRows.length;
      listings = allRows.slice(offset, offset + limitNum);
    } catch {
      listings = [];
      totalCount = 0;
    }

    if (pageNum === 1 && listings.length === 0) {
      listings = prependDemoRows(listings, cleanType, limitNum);
      totalCount = Math.max(totalCount, listings.length);
    }

    res.json({ listings, total: totalCount, page: pageNum, filterMeta: tourismListingFilterMeta(cleanType) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/tourism/listings/:slug", async (req, res): Promise<void> => {
  const slug = normalizeDetailSlug(req.params.slug ?? "");
  try {
    const demoBeforeDb = demoForSlug(slug);
    if (demoBeforeDb) {
      res.json(demoDetailRow(demoBeforeDb));
      return;
    }

    const yatportRow = await resolveYatportMapBusinessBySlug(slug);
    if (yatportRow) {
      res.json(await buildYatportMapDetailResponse(yatportRow, slug));
      return;
    }

    const r = await db.execute(sql`
      SELECT tl.*, v.name as vendor_name, v.phone as vendor_phone, v.whatsapp as vendor_whatsapp,
             v.slug as vendor_slug, v.theme_key, v.theme_config, v.provider_subtype,
             v.vendor_type, v.provider_type
      FROM tourism_listings tl
      LEFT JOIN vendors v ON v.id = tl.vendor_id
      WHERE LOWER(tl.slug) = LOWER(${slug})
        AND tl.status = 'active'
        AND COALESCE(tl.extra_info->>'room_carrier','false') <> 'true'
      LIMIT 1
    `);
    if (!r.rows.length) {
      const mapRow = await resolveMapBusinessBySlug(slug);
      if (!mapRow) {
        res.status(404).json({ error: "Bulunamadı" });
        return;
      }
      const bizId = String(mapRow.id ?? "");
      const bizSlug = String(mapRow.slug ?? slug);
      const gallery = await fetchMapBusinessGallery(bizId);
      const isYatport = isYatportMapBusiness(mapRow);
      const mapListing = normalizeTourismListingRow(
        isYatport
          ? enrichYatportMapListing({
              ...mapRow,
              gallery,
              image_url: gallery[0] ?? mapRow.image_url,
            })
          : {
              ...mapRow,
              gallery,
              image_url: gallery[0] ?? mapRow.image_url,
            },
      );
      if (isYatport) {
        mapListing.is_yatport = true;
        mapListing.import_source = "yatport";
        mapListing.reservation_enabled = false;
        mapListing.themeKey = "bookingcore";
        mapListing.themeConfig = mergeThemeConfig("bookingcore", {});
        res.json(mapListing);
        return;
      }
      const linked = await fetchLinkedHotelListingForMap(bizId, bizSlug);
      const rooms = await fetchRoomsForMapBusiness(bizId, bizSlug);
      if (rooms.length) mapListing.rooms = rooms;
      if (linked) {
        mapListing.linked_listing_id = linked.id;
        if (linked.price) mapListing.price = String(linked.price);
        if (linked.sale_price) mapListing.sale_price = String(linked.sale_price);
        if (linked.star_rating != null) mapListing.star_rating = linked.star_rating;
        if (linked.description && !mapListing.description) mapListing.description = linked.description;
        if (Array.isArray(linked.amenities) && linked.amenities.length) {
          mapListing.amenities = linked.amenities;
        }
      }
      // Rezervasyon kapısı: yalnızca doğrulanmış/sahiplenilmiş (aktif vendor'a bağlı ya da
      // oda/ilan kurulmuş) işletmeler rezervasyon alabilir. Scrape edilen Google işletmeleri
      // varsayılan olarak rezervasyona kapalıdır; kullanıcı işletme paneline yönlendirilir.
      mapListing.reservation_enabled = Boolean(linked) || (await hasActiveLinkedVendor(bizId, String(mapRow.google_place_id ?? "")));
      mapListing.themeKey = "bookingcore";
      mapListing.themeConfig = mergeThemeConfig("bookingcore", {});
      res.json(mapListing);
      return;
    }
    const listing = r.rows[0] as Record<string,unknown>;
    listing.image_url = normalizeImageUrlValue(listing.image_url);
    if (Array.isArray(listing.gallery)) {
      listing.gallery = listing.gallery.map((u) => normalizeImageUrlValue(u)).filter(Boolean);
    }
    const themeKey =
      String(listing.theme_key ?? "").trim() ||
      resolveDefaultThemeKey({
        vendorType: String(listing.vendor_type ?? ""),
        providerType: String(listing.provider_type ?? ""),
        providerSubtype: String(listing.provider_subtype ?? listing.type ?? ""),
      });
    const saved =
      listing.theme_config && typeof listing.theme_config === "object"
        ? (listing.theme_config as Record<string, unknown>)
        : {};
    listing.themeKey = themeKey;
    listing.themeConfig = mergeThemeConfig(themeKey, saved);
    if (listing.type === "hotel") {
      const rooms = await db.execute(sql`SELECT * FROM tourism_rooms WHERE listing_id = ${listing.id} AND status = 'active' ORDER BY price`);
      (listing as Record<string,unknown>).rooms = normalizeTourismRoomRows(rooms.rows as Record<string, unknown>[]);
    }
    await db.execute(sql`UPDATE tourism_listings SET view_count = view_count + 1 WHERE id = ${listing.id}`);
    let payload: Record<string, unknown> = listing;
    if (listing.type === "tour") {
      payload = enrichTourRow(listing);
    } else if (listing.type === "car") {
      payload = enrichCarRow(listing);
    }
    // Katalog/vendor ilanları rezervasyon sistemine kayıtlıdır → rezervasyona açık.
    payload.reservation_enabled = true;
    res.json(normalizeTourismListingRow(payload));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/tourism/listings/:id/availability", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { start, end, room_id } = req.query as Record<string,string>;
  try {
    let q = sql`SELECT * FROM tourism_availability WHERE listing_id = ${id}`;
    if (start && end) q = sql`SELECT * FROM tourism_availability WHERE listing_id = ${id} AND end_date >= ${start} AND start_date <= ${end}`;
    const r = await db.execute(q);
    const bookings = await db.execute(sql`
      SELECT check_in, check_out, room_id FROM tourism_bookings
      WHERE listing_id = ${id} AND status NOT IN ('cancelled')
      ${start ? sql`AND check_out > ${start} AND check_in < ${end}` : sql``}
    `);
    res.json({ availability: r.rows, bookings: bookings.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/tourism/bookings", async (req, res): Promise<void> => {
  const { listingId, roomId, customerName, customerPhone, customerEmail, checkIn, checkOut, guests, notes, paymentMethod } = req.body as Record<string,string>;
  if (!listingId || !customerName || !customerPhone) { res.status(400).json({ error: "Eksik bilgi" }); return; }
  try {
    const listingIdNum = Number(listingId);
    if (listingIdNum < 0) {
      const demo = TOURISM_DEMO_LISTINGS.find((d) => d.id === listingIdNum);
      if (!demo) { res.status(404).json({ error: "İlan bulunamadı" }); return; }
      const price = Number(demo.sale_price || demo.price || 0);
      let nights = 1;
      if (checkIn && checkOut) {
        const d1 = new Date(checkIn), d2 = new Date(checkOut);
        nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      }
      const totalPrice = demo.price_unit === "kişi" ? price * Number(guests || 1) : price * nights;
      const ref = bookingRef();
      res.json({ success: true, bookingRef: ref, total: totalPrice, demo: true, listingTitle: demo.title });
      return;
    }
    const listing = await db.execute(sql`SELECT * FROM tourism_listings WHERE id = ${listingIdNum} AND status='active' LIMIT 1`);
    if (!listing.rows.length) { res.status(404).json({ error: "İlan bulunamadı" }); return; }
    const l = listing.rows[0] as Record<string,unknown>;
    let nights = 1;
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn), d2 = new Date(checkOut);
      nights = Math.max(1, Math.ceil((d2.getTime()-d1.getTime())/(1000*60*60*24)));
    }
    const price = Number(l.sale_price || l.price || 0);
    const totalPrice = l.price_unit === "person" ? price * Number(guests||1) : price * nights;
    const ref = bookingRef();
    await db.execute(sql`
      INSERT INTO tourism_bookings
        (booking_ref, listing_id, room_id, listing_type, listing_title,
         customer_name, customer_phone, customer_email,
         check_in, check_out, guests, nights, subtotal, total_price, notes, vendor_id)
      VALUES (
        ${ref}, ${Number(listingId)}, ${roomId ? Number(roomId) : null},
        ${String(l.type)}, ${String(l.title)},
        ${customerName}, ${customerPhone}, ${customerEmail||null},
        ${checkIn||null}, ${checkOut||null}, ${Number(guests)||1}, ${nights},
        ${totalPrice}, ${totalPrice}, ${notes||null}, ${Number(l.vendor_id)||null}
      )
    `);
    res.json({ success: true, bookingRef: ref, total: totalPrice });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/tourism/bookings/:ref", async (req, res): Promise<void> => {
  const r = await db.execute(sql`
    SELECT tb.*, tl.image_url, tl.city, tl.address
    FROM tourism_bookings tb
    LEFT JOIN tourism_listings tl ON tl.id = tb.listing_id
    WHERE tb.booking_ref = ${req.params.ref}
    LIMIT 1
  `);
  if (!r.rows.length) { res.status(404).json({ error: "Rezervasyon bulunamadı" }); return; }
  res.json(r.rows[0]);
});

const TOURISM_SEED_CITIES = [
  "İstanbul", "Ankara", "Antalya", "İzmir", "Bodrum", "Kapadokya", "Fethiye",
  "Trabzon", "Bursa", "Muğla", "Kaş", "Alanya", "Marmaris", "Gaziantep", "Konya",
];

router.get("/tourism/cities", async (req, res): Promise<void> => {
  const cleanType = normalizeTourismType(String(req.query.type ?? "").trim());
  const cities = new Set<string>();

  for (const d of TRAVLLA_DEMO_DESTINATIONS) cities.add(d.title);
  for (const c of TOURISM_SEED_CITIES) cities.add(c);
  for (const d of TOURISM_DEMO_LISTINGS) {
    if (!cleanType || d.type === cleanType) cities.add(d.city);
  }

  try {
    let where = "WHERE status = 'active' AND city IS NOT NULL AND TRIM(city) <> ''";
    if (cleanType) where += ` AND type = '${cleanType.replace(/'/g, "")}'`;
    const rows = await db.execute(sql.raw(`
      SELECT DISTINCT TRIM(city) AS city FROM tourism_listings
      ${where}
      ORDER BY city
    `));
    for (const row of rows.rows as { city: string }[]) {
      const name = String(row.city ?? "").trim();
      if (name) cities.add(name);
    }
  } catch {
    /* tourism_listings may be empty */
  }

  try {
    const mapRows = await db.execute(sql`
      SELECT DISTINCT TRIM(mcity.name) AS city
      FROM map_businesses mb
      JOIN map_cities mcity ON mcity.id = mb.city_id
      WHERE mb.is_active = true AND mcity.name IS NOT NULL AND TRIM(mcity.name) <> ''
      ORDER BY city
      LIMIT 120
    `);
    for (const row of mapRows.rows as { city: string }[]) {
      const name = String(row.city ?? "").trim();
      if (name) cities.add(name);
    }
  } catch {
    /* map tables optional */
  }

  const sorted = [...cities]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "tr"));
  res.json({ cities: sorted.length ? sorted : TOURISM_SEED_CITIES });
});

router.get("/tourism/destinations", async (_req, res): Promise<void> => {
  try {
    const base = await loadDestinationsFromDb();
    const destinations = await Promise.all(base.map((d) => enrichDestinationCounts(d)));
    res.json({ destinations });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/destinations/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug || "").toLowerCase();
  const listingFilters = parseTourismListingFilters(req.query as Record<string, string>);
  try {
    const base = await loadDestinationsFromDb();
    const raw = base.find((d) => d.slug === slug);
    if (!raw) {
      res.status(404).json({ error: "Destinasyon bulunamadı" });
      return;
    }
    const destination = await enrichDestinationCounts(raw);
    const hotelLimit = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? "12")) || 12));
    const [hotels, tours, villas] = await Promise.all([
      fetchDestinationListings(destination.cityMatch, "hotel", hotelLimit, listingFilters),
      fetchDestinationListings(destination.cityMatch, "tour", hotelLimit, listingFilters),
      fetchDestinationListings(destination.cityMatch, "villa", hotelLimit, listingFilters),
    ]);

    const demoTours = TOURISM_DEMO_LISTINGS.filter((d) => d.type === "tour")
      .filter((d) =>
        destination.cityMatch.some(
          (c) =>
            d.city.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(d.city.toLowerCase()) ||
            (d.district && c.toLowerCase().includes(d.district.toLowerCase())),
        ),
      )
      .map((d) => enrichTourRow(demoListRow(d)));
    const seenTours = new Set(tours.map((t) => String(t.slug)));
    for (const d of demoTours) {
      if (!seenTours.has(String(d.slug))) tours.unshift(d);
    }

    res.json({
      destination,
      hotels,
      tours,
      villas,
      listings: [...hotels, ...tours, ...villas],
      filterMeta: tourismListingFilterMeta("hotel"),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/tours", async (req, res): Promise<void> => {
  const { city, page = "1", limit = "12" } = req.query as Record<string, string>;
  const limitNum = Math.max(1, Math.min(50, parseInt(limit) || 12));
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * limitNum;
  const cleanCity = city ? city.replace(/'/g, "").trim() : "";
  try {
    let tours: Record<string, unknown>[] = [];
    let totalCount = 0;
    let where = "WHERE tl.status = 'active' AND tl.type = 'tour'";
    if (cleanCity) where += ` AND tl.city ILIKE '%${cleanCity.replace(/'/g, "")}%'`;
    try {
      const rows = await db.execute(sql.raw(`
        SELECT tl.id, tl.type, tl.title, tl.slug, tl.city, tl.district, tl.image_url, tl.gallery,
               tl.price, tl.sale_price, tl.price_unit, tl.star_rating, tl.rating, tl.review_count, tl.description
        FROM tourism_listings tl
        ${where}
        ORDER BY tl.is_featured DESC, tl.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `));
      const total = await db.execute(sql.raw(`SELECT COUNT(*)::int FROM tourism_listings tl ${where}`));
      tours = (rows.rows as Record<string, unknown>[]).map((r) =>
        enrichTourRow({ ...r, image_url: normalizeImageUrlValue(r.image_url) }),
      );
      totalCount = Number((total.rows[0] as { count: number }).count ?? 0);
    } catch {
      tours = [];
      totalCount = 0;
    }
    if (pageNum === 1) {
      const demos = TOURISM_DEMO_LISTINGS.filter((d) => d.type === "tour")
        .filter((d) => !cleanCity || d.city.toLowerCase().includes(cleanCity.toLowerCase()) || cleanCity.toLowerCase().includes(d.city.toLowerCase()))
        .map((d) => enrichTourRow(demoListRow(d)));
      const seen = new Set(tours.map((t) => String(t.slug)));
      for (const d of demos) {
        if (!seen.has(String(d.slug))) tours.unshift(d);
      }
      totalCount = Math.max(totalCount, tours.length);
    }
    res.json({ tours, listings: tours, total: totalCount, page: pageNum });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/tours/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug || "");
  const demo = demoForSlug(slug);
  if (demo && demo.type === "tour") {
    res.json(demoTourEnriched(demo));
    return;
  }
  try {
    const r = await db.execute(sql`
      SELECT tl.*, v.name as vendor_name, v.phone as vendor_phone, v.whatsapp as vendor_whatsapp
      FROM tourism_listings tl
      LEFT JOIN vendors v ON v.id = tl.vendor_id
      WHERE tl.slug = ${slug} AND tl.status = 'active' AND tl.type = 'tour'
      LIMIT 1
    `);
    if (!r.rows.length) {
      const anyDemo = TOURISM_DEMO_LISTINGS.find((d) => d.slug === slug);
      if (anyDemo) {
        res.json(demoTourEnriched(anyDemo));
        return;
      }
      res.status(404).json({ error: "Tur bulunamadı" });
      return;
    }
    const listing = r.rows[0] as Record<string, unknown>;
    listing.image_url = normalizeImageUrlValue(listing.image_url);
    if (Array.isArray(listing.gallery)) {
      listing.gallery = listing.gallery.map((u) => normalizeImageUrlValue(u)).filter(Boolean);
    }
    await db.execute(sql`UPDATE tourism_listings SET view_count = view_count + 1 WHERE id = ${listing.id}`);
    res.json(enrichTourRow(listing));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* — VENDOR ─────────────────────────────── */

router.get("/tourism/vendor/listings", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const r = await db.execute(sql`
    SELECT tl.*, (SELECT COUNT(*)::int FROM tourism_bookings tb WHERE tb.listing_id = tl.id) as booking_count
    FROM tourism_listings tl WHERE tl.vendor_id = ${vid} ORDER BY tl.created_at DESC
  `);
  res.json(r.rows);
});

router.post("/tourism/vendor/listings", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { type, title, description, city, district, address, lat, lng, imageUrl, gallery,
          amenities, features, price, salePrice, starRating, capacity, extraInfo } = req.body as Record<string,unknown>;
  if (!type || !title || !price) { res.status(400).json({ error: "Tür, başlık ve fiyat zorunlu" }); return; }
  const baseSlug = slugify(String(title));
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const ex = await db.execute(sql`SELECT id FROM tourism_listings WHERE slug = ${slug} LIMIT 1`);
    if (!ex.rows.length) break;
    slug = `${baseSlug}-${n++}`;
  }
  const priceUnit = PRICE_UNITS[String(type)] || "gece";
  const r = await db.execute(sql`
    INSERT INTO tourism_listings
      (type, title, slug, description, city, district, address, lat, lng, image_url, gallery,
       amenities, features, price, sale_price, price_unit, star_rating, capacity, extra_info, vendor_id, status)
    VALUES (
      ${String(type)}, ${String(title)}, ${slug}, ${description||null},
      ${city||null}, ${district||null}, ${address||null},
      ${lat ? Number(lat) : null}, ${lng ? Number(lng) : null},
      ${imageUrl||null},
      ${JSON.stringify(gallery||[])}::jsonb,
      ${JSON.stringify(amenities||[])}::jsonb,
      ${JSON.stringify(features||{})}::jsonb,
      ${Number(price)}, ${salePrice ? Number(salePrice) : null},
      ${priceUnit}, ${starRating ? Number(starRating) : null},
      ${capacity ? Number(capacity) : null},
      ${JSON.stringify(extraInfo||{})}::jsonb,
      ${vid}, 'active'
    ) RETURNING *
  `);
  res.json(r.rows[0]);
});

router.put("/tourism/vendor/listings/:id", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = Number(req.params.id);
  const check = await db.execute(sql`SELECT id FROM tourism_listings WHERE id = ${id} AND vendor_id = ${vid} LIMIT 1`);
  if (!check.rows.length) { res.status(403).json({ error: "Erişim yok" }); return; }
  const { title, description, city, district, address, lat, lng, imageUrl, gallery,
          amenities, features, price, salePrice, starRating, capacity, status, extraInfo } = req.body as Record<string,unknown>;
  await db.execute(sql`
    UPDATE tourism_listings SET
      title = COALESCE(${title as string||null}, title),
      description = ${description as string||null},
      city = ${city as string||null},
      district = ${district as string||null},
      address = ${address as string||null},
      lat = ${lat ? Number(lat) : null},
      lng = ${lng ? Number(lng) : null},
      image_url = ${imageUrl as string||null},
      gallery = ${JSON.stringify(gallery||[])}::jsonb,
      amenities = ${JSON.stringify(amenities||[])}::jsonb,
      features = ${JSON.stringify(features||{})}::jsonb,
      price = ${price ? Number(price) : null},
      sale_price = ${salePrice ? Number(salePrice) : null},
      star_rating = ${starRating ? Number(starRating) : null},
      capacity = ${capacity ? Number(capacity) : null},
      status = COALESCE(${status as string||null}, status),
      extra_info = ${JSON.stringify(extraInfo||{})}::jsonb,
      updated_at = NOW()
    WHERE id = ${id} AND vendor_id = ${vid}
  `);
  res.json({ success: true });
});

router.delete("/tourism/vendor/listings/:id", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = Number(req.params.id);
  await db.execute(sql`UPDATE tourism_listings SET status = 'deleted' WHERE id = ${id} AND vendor_id = ${vid}`);
  res.json({ success: true });
});

router.get("/tourism/vendor/listings/:id/rooms", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = Number(req.params.id);
  const check = await db.execute(sql`SELECT id FROM tourism_listings WHERE id = ${id} AND vendor_id = ${vid} LIMIT 1`);
  if (!check.rows.length) { res.status(403).json({ error: "Erişim yok" }); return; }
  const r = await db.execute(sql`SELECT * FROM tourism_rooms WHERE listing_id = ${id} ORDER BY price`);
  res.json(r.rows);
});

router.post("/tourism/vendor/listings/:id/rooms", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = Number(req.params.id);
  const check = await db.execute(sql`SELECT id FROM tourism_listings WHERE id = ${id} AND vendor_id = ${vid} LIMIT 1`);
  if (!check.rows.length) { res.status(403).json({ error: "Erişim yok" }); return; }
  const { name, description, beds, adults, children, sizeSqm, price, count, amenities, imageUrl } = req.body as Record<string,unknown>;
  const r = await db.execute(sql`
    INSERT INTO tourism_rooms (listing_id, name, description, beds, adults, children, size_sqm, price, count, amenities, image_url)
    VALUES (${id}, ${String(name)}, ${description as string||null},
      ${beds ? Number(beds) : 1}, ${adults ? Number(adults) : 2}, ${children ? Number(children) : 0},
      ${sizeSqm ? Number(sizeSqm) : null}, ${price ? Number(price) : null},
      ${count ? Number(count) : 1},
      ${JSON.stringify(amenities||[])}::jsonb,
      ${imageUrl as string||null}
    ) RETURNING *
  `);
  res.json(r.rows[0]);
});

router.delete("/tourism/vendor/rooms/:id", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`
    UPDATE tourism_rooms SET status = 'deleted'
    WHERE id = ${Number(req.params.id)}
      AND listing_id IN (SELECT id FROM tourism_listings WHERE vendor_id = ${vid})
  `);
  res.json({ success: true });
});

router.get("/tourism/vendor/bookings", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { status } = req.query as Record<string,string>;
  let q = sql`SELECT * FROM tourism_bookings WHERE vendor_id = ${vid}`;
  if (status) q = sql`SELECT * FROM tourism_bookings WHERE vendor_id = ${vid} AND status = ${status}`;
  const r = await db.execute(sql`${q} ORDER BY created_at DESC LIMIT 100`);
  res.json(r.rows);
});

router.patch("/tourism/vendor/bookings/:id", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { status, notes } = req.body as Record<string,string>;
  await db.execute(sql`
    UPDATE tourism_bookings SET status = ${status}, notes = COALESCE(${notes||null}, notes), updated_at = NOW()
    WHERE id = ${Number(req.params.id)} AND vendor_id = ${vid}
  `);
  res.json({ success: true });
});

/* — ADMIN ─────────────────────────────── */

router.use("/tourism/admin", (req, res, next) => {
  if (denyUnlessAdminMaintenance(req, res, "turizm")) next();
});

router.get("/tourism/admin/listings", async (req, res): Promise<void> => {
  const { type, status, page = "1", includeGoogle } = req.query as Record<string,string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * 20;
  const cleanType = normalizeTourismType(type ? type.replace(/'/g, "") : "");
  const mergeGoogle = includeGoogle === "1" || includeGoogle === "true" || cleanType === "hotel";

  let where = "WHERE 1=1";
  if (cleanType) where += ` AND tl.type='${cleanType.replace(/'/g, "")}'`;
  if (status) where += ` AND tl.status='${status.replace(/'/g, "")}'`;
  const r = await db.execute(sql.raw(`
    SELECT tl.*, v.name as vendor_name,
      (SELECT COUNT(*)::int FROM tourism_bookings tb WHERE tb.listing_id = tl.id) as booking_count,
      (SELECT COUNT(*)::int FROM tourism_rooms tr WHERE tr.listing_id = tl.id AND tr.status = 'active') as room_count,
      'bc' as source
    FROM tourism_listings tl
    LEFT JOIN vendors v ON v.id = tl.vendor_id
    ${where}
    ORDER BY tl.created_at DESC
  `));
  let allRows = [...(r.rows as Record<string, unknown>[])];

  if (mergeGoogle && (!cleanType || cleanType === "hotel")) {
    const mapRows = await fetchMapBusinessListings("hotel", "", 300);
    for (const row of mapRows) {
      const bizId = String(row.id ?? "");
      const rooms = await fetchRoomsForMapBusiness(bizId, String(row.slug ?? ""));
      allRows.unshift({
        ...row,
        id: `google-${bizId}`,
        status: "active",
        source: "google",
        booking_count: 0,
        room_count: rooms.length,
        vendor_name: row.vendor_name ?? row.title,
        description: row.description ?? null,
        created_at: null,
      });
    }
  }

  const total = allRows.length;
  const pageRows = allRows.slice(offset, offset + 20).map((row) => ({
    ...row,
    is_demo: isTourismAdminDemoRow(row),
  }));
  res.json({ listings: pageRows, total });
});

router.patch("/tourism/admin/listings/:id", async (req, res): Promise<void> => {
  const { status, isFeatured } = req.body as Record<string,unknown>;
  await db.execute(sql`
    UPDATE tourism_listings SET
      status = COALESCE(${status as string||null}, status),
      is_featured = COALESCE(${isFeatured !== undefined ? Boolean(isFeatured) : null}, is_featured),
      updated_at = NOW()
    WHERE id = ${Number(req.params.id)}
  `);
  res.json({ success: true });
});

router.delete("/tourism/admin/listings/:id", async (req, res): Promise<void> => {
  await db.execute(sql`UPDATE tourism_listings SET status = 'deleted' WHERE id = ${Number(req.params.id)}`);
  res.json({ success: true });
});

router.get("/tourism/admin/bookings", async (req, res): Promise<void> => {
  const { status, type, page = "1" } = req.query as Record<string,string>;
  const offset = (parseInt(page)-1)*20;
  let where = "WHERE 1=1";
  if (status) where += ` AND tb.status='${status.replace(/'/g,"")}'`;
  if (type) where += ` AND tb.listing_type='${type.replace(/'/g,"")}'`;
  const r = await db.execute(sql.raw(`
    SELECT tb.*, v.name as vendor_name
    FROM tourism_bookings tb
    LEFT JOIN vendors v ON v.id = tb.vendor_id
    ${where}
    ORDER BY tb.created_at DESC LIMIT 20 OFFSET ${offset}
  `));
  const total = await db.execute(sql.raw(`SELECT COUNT(*)::int FROM tourism_bookings tb ${where}`));
  res.json({ bookings: r.rows, total: (total.rows[0] as {count:number}).count });
});

router.patch("/tourism/admin/bookings/:id", async (req, res): Promise<void> => {
  const { status } = req.body as Record<string,string>;
  await db.execute(sql`UPDATE tourism_bookings SET status = ${status}, updated_at = NOW() WHERE id = ${Number(req.params.id)}`);
  res.json({ success: true });
});

/* — ADMIN VENDORS ──────────────────────── */

router.get("/tourism/admin/vendors", async (req, res): Promise<void> => {
  await ensureTourismVendorColumns();
  const { subtype, status, q, page = "1", limit: limitRaw } = req.query as Record<string,string>;
  const limit = Math.min(Math.max(parseInt(String(limitRaw || "30"), 10) || 30, 1), 200);
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const offset = (pageNum - 1) * limit;
  try {
    const r = await db.execute(sql.raw(`
      SELECT v.*
      FROM vendors v
      ORDER BY v.id
      LIMIT 5000
    `));
    const subtypeSet = new Set(tourismSubtypeAliases(String(subtype ?? "")));
    const statusFilter = String(status ?? "").replace(/'/g, "").trim().toLowerCase();
    const qFilter = String(q ?? "").trim().toLowerCase();
    const rows = ((r.rows as Record<string, unknown>[])
      .map((v) => ({
        listing_count: 0,
        booking_count: 0,
        ...v,
      })) as Record<string, unknown>[])
      .filter(isTourismVendorRow)
      .filter((v) => {
        if (subtypeSet.size > 0 && !subtypeSet.has(String(v.provider_subtype ?? "").toLowerCase())) return false;
        if (statusFilter && String(v.status ?? "").toLowerCase() !== statusFilter) return false;
        if (qFilter) {
          const haystack = `${v.name ?? ""} ${v.city ?? ""} ${v.district ?? ""}`.toLowerCase();
          if (!haystack.includes(qFilter)) return false;
        }
        return true;
      });
    res.json({ vendors: rows.slice(offset, offset + limit), total: rows.length });
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

router.post("/tourism/admin/vendors", async (req, res): Promise<void> => {
  await ensureTourismVendorColumns();
  const { name, subtype, city, district, address, phone, email, website, imageUrl, notes } = req.body as Record<string,string>;
  if (!name) { res.status(400).json({ error: "Firma adı zorunlu" }); return; }
  const baseSlug = slugify(name);
  let slug = baseSlug; let n = 1;
  while (true) {
    const ex = await db.execute(sql`SELECT id FROM vendors WHERE slug = ${slug} LIMIT 1`);
    if (!ex.rows.length) break;
    slug = `${baseSlug}-${n++}`;
  }
  try {
    const r = await db.execute(sql`
      INSERT INTO vendors (name, slug, city, district, address, phone, email, image_url,
        vendor_type, provider_subtype, status, active, notes, created_at, updated_at)
      VALUES (${name}, ${slug}, ${city||null}, ${district||null}, ${address||null},
        ${phone||null}, ${email||null}, ${imageUrl||null},
        'turizm', ${subtype||'otel'}, 'approved', true,
        ${notes||null}, NOW(), NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

router.put("/tourism/admin/vendors/:id", async (req, res): Promise<void> => {
  await ensureTourismVendorColumns();
  const id = Number(req.params.id);
  const { name, subtype, city, district, address, phone, email, imageUrl, status, notes, active, isOpen } = req.body as Record<string,unknown>;
  try {
    await db.execute(sql`
      UPDATE vendors SET
        name = COALESCE(${name as string||null}, name),
        provider_subtype = COALESCE(${subtype as string||null}, provider_subtype),
        city = ${city as string||null},
        district = ${district as string||null},
        address = ${address as string||null},
        phone = ${phone as string||null},
        email = ${email as string||null},
        image_url = ${imageUrl as string||null},
        status = COALESCE(${status as string||null}, status),
        active = COALESCE(${active !== undefined ? Boolean(active) : null}, active),
        is_open = COALESCE(${isOpen !== undefined ? Boolean(isOpen) : null}, is_open),
        notes = ${notes as string||null},
        updated_at = NOW()
      WHERE id = ${id} AND (
        vendor_type IN ('turizm', 'tourism')
        OR provider_type IN ('turizm', 'tourism')
        OR provider_subtype IN ('otel', 'hotel', 'arac', 'car', 'rentacar', 'villa', 'tur', 'tour', 'yat', 'boat', 'tekne')
        OR EXISTS (SELECT 1 FROM tourism_listings tlx WHERE tlx.vendor_id = vendors.id)
      )
    `);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/tourism/admin/vendors/:id", async (req, res): Promise<void> => {
  await ensureTourismVendorColumns();
  const id = Number(req.params.id);
  try {
    await db.execute(sql`
      UPDATE vendors SET active = false, status = 'rejected', updated_at = NOW()
      WHERE id = ${id} AND (
        vendor_type IN ('turizm', 'tourism')
        OR provider_type IN ('turizm', 'tourism')
        OR provider_subtype IN ('otel', 'hotel', 'arac', 'car', 'rentacar', 'villa', 'tur', 'tour', 'yat', 'boat', 'tekne')
        OR EXISTS (SELECT 1 FROM tourism_listings tlx WHERE tlx.vendor_id = vendors.id)
      )
    `);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

/** Toplu onay: pending turizm firmalarını (isteğe bağlı subtype) limit kadar approved yapar */
router.post("/tourism/admin/vendors/bulk-approve", async (req, res): Promise<void> => {
  await ensureTourismVendorColumns();
  const body = req.body as Record<string, unknown>;
  const rawLimit = body.limit != null ? Number(body.limit) : 500;
  const lim = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 500, 1), 5000);
  const subtype = body.subtype != null ? String(body.subtype).trim().toLowerCase() : "";
  const allowed = new Set(["otel", "arac", "villa", "tur", "yat"]);
  try {
    if (subtype && !allowed.has(subtype)) {
      res.status(400).json({ error: "Geçersiz firma türü (subtype)." });
      return;
    }
    if (subtype) {
      const r = await db.execute(sql`
        UPDATE vendors SET status = 'approved', active = true, updated_at = NOW()
        WHERE id IN (
          SELECT id FROM vendors
          WHERE status = 'pending'
            AND (
              vendor_type IN ('turizm', 'tourism')
              OR provider_type IN ('turizm', 'tourism')
              OR provider_subtype IN ('otel', 'hotel', 'arac', 'car', 'rentacar', 'villa', 'tur', 'tour', 'yat', 'boat', 'tekne')
              OR EXISTS (SELECT 1 FROM tourism_listings tlx WHERE tlx.vendor_id = vendors.id)
            )
            AND provider_subtype = ${subtype}
          ORDER BY id ASC LIMIT ${lim}
        )
        RETURNING id
      `);
      res.json({ updated: r.rows.length, ids: (r.rows as { id: number }[]).map((x) => x.id) });
      return;
    }
    const r = await db.execute(sql`
      UPDATE vendors SET status = 'approved', active = true, updated_at = NOW()
      WHERE id IN (
        SELECT id FROM vendors
        WHERE status = 'pending'
          AND (
            vendor_type IN ('turizm', 'tourism')
            OR provider_type IN ('turizm', 'tourism')
            OR provider_subtype IN ('otel', 'hotel', 'arac', 'car', 'rentacar', 'villa', 'tur', 'tour', 'yat', 'boat', 'tekne')
            OR EXISTS (SELECT 1 FROM tourism_listings tlx WHERE tlx.vendor_id = vendors.id)
          )
        ORDER BY id ASC LIMIT ${lim}
      )
      RETURNING id
    `);
    res.json({ updated: r.rows.length, ids: (r.rows as { id: number }[]).map((x) => x.id) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* — ADMIN LISTINGS FULL CRUD ───────────── */

router.post("/tourism/admin/listings", async (req, res): Promise<void> => {
  const { type, title, description, vendorId, city, district, address, lat, lng,
          imageUrl, price, salePrice, starRating, capacity, priceUnit, status } = req.body as Record<string,unknown>;
  if (!type || !title || !price) { res.status(400).json({ error: "Tür, başlık ve fiyat zorunlu" }); return; }
  const baseSlug = slugify(String(title));
  let slug = baseSlug; let n = 1;
  while (true) {
    const ex = await db.execute(sql`SELECT id FROM tourism_listings WHERE slug = ${slug} LIMIT 1`);
    if (!ex.rows.length) break;
    slug = `${baseSlug}-${n++}`;
  }
  const unit = (priceUnit as string) || PRICE_UNITS[String(type)] || "gece";
  try {
    const r = await db.execute(sql`
      INSERT INTO tourism_listings
        (type, title, slug, description, vendor_id, city, district, address, lat, lng,
         image_url, price, sale_price, price_unit, star_rating, capacity, status,
         amenities, features, gallery, extra_info)
      VALUES (
        ${String(type)}, ${String(title)}, ${slug}, ${description as string||null},
        ${vendorId ? Number(vendorId) : null},
        ${city as string||null}, ${district as string||null}, ${address as string||null},
        ${lat ? Number(lat) : null}, ${lng ? Number(lng) : null},
        ${imageUrl as string||null}, ${Number(price)},
        ${salePrice ? Number(salePrice) : null}, ${unit},
        ${starRating ? Number(starRating) : null}, ${capacity ? Number(capacity) : null},
        ${status as string||'active'}, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb
      ) RETURNING *
    `);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

router.put("/tourism/admin/listings/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { title, description, vendorId, city, district, address, lat, lng,
          imageUrl, price, salePrice, starRating, capacity, priceUnit, status, isFeatured } = req.body as Record<string,unknown>;
  try {
    await db.execute(sql`
      UPDATE tourism_listings SET
        title = COALESCE(${title as string||null}, title),
        description = ${description as string||null},
        vendor_id = ${vendorId ? Number(vendorId) : null},
        city = ${city as string||null},
        district = ${district as string||null},
        address = ${address as string||null},
        lat = ${lat ? Number(lat) : null},
        lng = ${lng ? Number(lng) : null},
        image_url = ${imageUrl as string||null},
        price = COALESCE(${price ? Number(price) : null}, price),
        sale_price = ${salePrice ? Number(salePrice) : null},
        price_unit = COALESCE(${priceUnit as string||null}, price_unit),
        star_rating = ${starRating ? Number(starRating) : null},
        capacity = ${capacity ? Number(capacity) : null},
        status = COALESCE(${status as string||null}, status),
        is_featured = COALESCE(${isFeatured !== undefined ? Boolean(isFeatured) : null}, is_featured),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

/* — ADMIN ROOMS CRUD ───────────────────── */

router.get("/tourism/admin/rooms", async (req, res): Promise<void> => {
  const { listingId } = req.query as Record<string,string>;
  if (!listingId) { res.status(400).json({ error: "listingId gerekli" }); return; }
  const r = await db.execute(sql`SELECT * FROM tourism_rooms WHERE listing_id = ${Number(listingId)} ORDER BY price`);
  res.json(r.rows);
});

router.post("/tourism/admin/rooms", async (req, res): Promise<void> => {
  const { listingId, name, description, beds, adults, children, sizeSqm, price, count, amenities, imageUrl } = req.body as Record<string,unknown>;
  if (!listingId || !name || !price) { res.status(400).json({ error: "Oda adı ve fiyat zorunlu" }); return; }
  try {
    const r = await db.execute(sql`
      INSERT INTO tourism_rooms (listing_id, name, description, beds, adults, children, size_sqm, price, count, amenities, image_url, status)
      VALUES (${Number(listingId)}, ${String(name)}, ${description as string||null},
        ${beds ? Number(beds) : 1}, ${adults ? Number(adults) : 2}, ${children ? Number(children) : 0},
        ${sizeSqm ? Number(sizeSqm) : null}, ${Number(price)}, ${count ? Number(count) : 1},
        ${JSON.stringify(amenities||[])}::jsonb, ${imageUrl as string||null}, 'active')
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

router.put("/tourism/admin/rooms/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, description, beds, adults, children, sizeSqm, price, count, imageUrl, status } = req.body as Record<string,unknown>;
  try {
    await db.execute(sql`
      UPDATE tourism_rooms SET
        name = COALESCE(${name as string||null}, name),
        description = ${description as string||null},
        beds = COALESCE(${beds ? Number(beds) : null}, beds),
        adults = COALESCE(${adults ? Number(adults) : null}, adults),
        children = COALESCE(${children !== undefined ? Number(children) : null}, children),
        size_sqm = ${sizeSqm ? Number(sizeSqm) : null},
        price = COALESCE(${price ? Number(price) : null}, price),
        count = COALESCE(${count ? Number(count) : null}, count),
        image_url = ${imageUrl as string||null},
        status = COALESCE(${status as string||null}, status)
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/tourism/admin/rooms/:id", async (req, res): Promise<void> => {
  await db.execute(sql`DELETE FROM tourism_rooms WHERE id = ${Number(req.params.id)}`);
  res.json({ success: true });
});

/* — ADMIN DESTINATIONS ─────────────────── */

router.get("/tourism/admin/destinations", async (_req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM tourism_destinations ORDER BY sort_order ASC, title ASC
    `);
    res.json({ destinations: rows.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/tourism/admin/destinations", async (req, res): Promise<void> => {
  const { title, slug, imageUrl, excerpt, detailTitle, gallery, cityMatch, sortOrder, isActive } =
    req.body as Record<string, unknown>;
  if (!title || !slug) {
    res.status(400).json({ error: "Başlık ve slug zorunlu" });
    return;
  }
  try {
    const r = await db.execute(sql`
      INSERT INTO tourism_destinations (
        title, slug, image_url, excerpt, detail_title, gallery, city_match, sort_order, is_active
      ) VALUES (
        ${String(title)}, ${String(slug)}, ${imageUrl ? String(imageUrl) : null},
        ${excerpt ? String(excerpt) : null}, ${detailTitle ? String(detailTitle) : String(title)},
        ${JSON.stringify(Array.isArray(gallery) ? gallery : [])}::jsonb,
        ${JSON.stringify(Array.isArray(cityMatch) ? cityMatch : [String(title)])}::jsonb,
        ${Number(sortOrder ?? 0)}, ${isActive !== false}
      )
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/tourism/admin/destinations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { title, slug, imageUrl, excerpt, detailTitle, gallery, cityMatch, sortOrder, isActive } =
    req.body as Record<string, unknown>;
  try {
    const existing = await db.execute(sql`SELECT * FROM tourism_destinations WHERE id = ${id} LIMIT 1`);
    const row = (existing.rows[0] ?? {}) as Record<string, unknown>;
    await db.execute(sql`
      UPDATE tourism_destinations SET
        title = ${title ? String(title) : String(row.title ?? "")},
        slug = ${slug ? String(slug) : String(row.slug ?? "")},
        image_url = ${imageUrl !== undefined ? (imageUrl ? String(imageUrl) : null) : (row.image_url as string | null)},
        excerpt = ${excerpt !== undefined ? (excerpt ? String(excerpt) : null) : (row.excerpt as string | null)},
        detail_title = ${detailTitle ? String(detailTitle) : String(row.detail_title ?? row.title ?? "")},
        gallery = ${JSON.stringify(Array.isArray(gallery) ? gallery : row.gallery ?? [])}::jsonb,
        city_match = ${JSON.stringify(Array.isArray(cityMatch) ? cityMatch : row.city_match ?? [])}::jsonb,
        sort_order = ${sortOrder !== undefined ? Number(sortOrder) : Number(row.sort_order ?? 0)},
        is_active = ${isActive !== undefined ? Boolean(isActive) : Boolean(row.is_active ?? true)},
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/tourism/admin/destinations/:id", async (req, res): Promise<void> => {
  try {
    await db.execute(sql`DELETE FROM tourism_destinations WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* — PUBLIC CMS (intro, banners, blog) ─────────────────── */

function turizmSlugifyTitle(title: string): string {
  return title
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

router.get("/tourism/cms/:categorySlug", async (req, res): Promise<void> => {
  const categorySlug = String(req.params.categorySlug ?? "").trim();
  if (!categorySlug) {
    res.status(400).json({ error: "categorySlug zorunlu" });
    return;
  }
  try {
    const [cards, banners, featured] = await Promise.all([
      db.execute(sql`
        SELECT id, category_slug, title, description, image_url, link_url, placement,
               section_title, section_description, filter_json, sort_order, blog_slug
        FROM turizm_intro_cards
        WHERE category_slug = ${categorySlug} AND is_active = true
        ORDER BY sort_order ASC, id ASC
      `),
      db.execute(sql`
        SELECT id, category_slug, image_url, link_url, title, sort_order
        FROM turizm_category_banners
        WHERE category_slug = ${categorySlug} AND is_active = true
        ORDER BY sort_order ASC, id ASC
      `),
      db.execute(sql`
        SELECT id, slug, title, excerpt, cover_image_url, category_slug, published_at
        FROM turizm_blog_posts
        WHERE is_published = true AND is_featured = true
          AND (category_slug IS NULL OR category_slug = ${categorySlug})
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT 6
      `),
    ]);
    res.json({
      categorySlug,
      introCards: cards.rows,
      banners: banners.rows,
      featuredPosts: featured.rows,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/blog", async (req, res): Promise<void> => {
  const { category, page = "1", limit = "12" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(50, Math.max(1, parseInt(limit) || 12));
  const offset = (pageNum - 1) * lim;
  try {
    const rows = category
      ? await db.execute(sql`
          SELECT id, slug, title, excerpt, meta_title, meta_description,
                 cover_image_url, category_slug, is_featured, published_at
          FROM turizm_blog_posts
          WHERE is_published = true AND category_slug = ${category}
          ORDER BY published_at DESC NULLS LAST, id DESC
          LIMIT ${lim} OFFSET ${offset}
        `)
      : await db.execute(sql`
          SELECT id, slug, title, excerpt, meta_title, meta_description,
                 cover_image_url, category_slug, is_featured, published_at
          FROM turizm_blog_posts
          WHERE is_published = true
          ORDER BY published_at DESC NULLS LAST, id DESC
          LIMIT ${lim} OFFSET ${offset}
        `);
    const count = category
      ? await db.execute(sql`
          SELECT COUNT(*)::int AS total FROM turizm_blog_posts
          WHERE is_published = true AND category_slug = ${category}
        `)
      : await db.execute(sql`
          SELECT COUNT(*)::int AS total FROM turizm_blog_posts WHERE is_published = true
        `);
    res.json({
      posts: rows.rows,
      total: Number((count.rows[0] as { total?: number })?.total ?? 0),
      page: pageNum,
      limit: lim,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/blog/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ error: "slug zorunlu" });
    return;
  }
  try {
    const r = await db.execute(sql`
      SELECT id, slug, title, meta_title, meta_description, excerpt,
             body_html, cover_image_url, category_slug, is_featured, published_at
      FROM turizm_blog_posts
      WHERE slug = ${slug} AND is_published = true
      LIMIT 1
    `);
    if (!r.rows[0]) {
      res.status(404).json({ error: "Yazı bulunamadı" });
      return;
    }
    res.json({ post: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* — ADMIN CMS ───────────────────────────────────────────── */

router.get("/tourism/admin/cms/intro-cards", async (req, res): Promise<void> => {
  const { categorySlug } = req.query as Record<string, string>;
  try {
    const rows = categorySlug
      ? await db.execute(sql`
          SELECT * FROM turizm_intro_cards
          WHERE category_slug = ${categorySlug}
          ORDER BY sort_order ASC, id ASC
        `)
      : await db.execute(sql`
          SELECT * FROM turizm_intro_cards ORDER BY category_slug ASC, sort_order ASC, id ASC
        `);
    res.json({ cards: rows.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/tourism/admin/cms/intro-cards", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.categorySlug || !b.title) {
    res.status(400).json({ error: "categorySlug ve title zorunlu" });
    return;
  }
  const blogSlug = b.blogSlug ? String(b.blogSlug) : turizmSlugifyTitle(String(b.title));
  try {
    const r = await db.execute(sql`
      INSERT INTO turizm_intro_cards (
        category_slug, title, description, image_url, link_url, placement,
        section_title, section_description, filter_json, sort_order, is_active, blog_slug
      ) VALUES (
        ${String(b.categorySlug)}, ${String(b.title)},
        ${b.description ? String(b.description) : null},
        ${b.imageUrl ? String(b.imageUrl) : null},
        ${b.linkUrl ? String(b.linkUrl) : null},
        ${b.placement === "sidebar" ? "sidebar" : "main"},
        ${b.sectionTitle ? String(b.sectionTitle) : null},
        ${b.sectionDescription ? String(b.sectionDescription) : null},
        ${JSON.stringify(b.filterJson && typeof b.filterJson === "object" ? b.filterJson : {})}::jsonb,
        ${Number(b.sortOrder ?? 0)},
        ${b.isActive !== false},
        ${blogSlug || null}
      )
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/tourism/admin/cms/intro-cards/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  try {
    const existing = await db.execute(sql`SELECT * FROM turizm_intro_cards WHERE id = ${id} LIMIT 1`);
    const row = (existing.rows[0] ?? {}) as Record<string, unknown>;
    await db.execute(sql`
      UPDATE turizm_intro_cards SET
        category_slug = ${b.categorySlug ? String(b.categorySlug) : String(row.category_slug ?? "")},
        title = ${b.title ? String(b.title) : String(row.title ?? "")},
        description = ${b.description !== undefined ? (b.description ? String(b.description) : null) : (row.description as string | null)},
        image_url = ${b.imageUrl !== undefined ? (b.imageUrl ? String(b.imageUrl) : null) : (row.image_url as string | null)},
        link_url = ${b.linkUrl !== undefined ? (b.linkUrl ? String(b.linkUrl) : null) : (row.link_url as string | null)},
        placement = ${b.placement === "sidebar" || b.placement === "main" ? String(b.placement) : String(row.placement ?? "main")},
        section_title = ${b.sectionTitle !== undefined ? (b.sectionTitle ? String(b.sectionTitle) : null) : (row.section_title as string | null)},
        section_description = ${b.sectionDescription !== undefined ? (b.sectionDescription ? String(b.sectionDescription) : null) : (row.section_description as string | null)},
        filter_json = ${JSON.stringify(b.filterJson !== undefined ? b.filterJson : row.filter_json ?? {})}::jsonb,
        sort_order = ${b.sortOrder !== undefined ? Number(b.sortOrder) : Number(row.sort_order ?? 0)},
        is_active = ${b.isActive !== undefined ? Boolean(b.isActive) : Boolean(row.is_active ?? true)},
        blog_slug = ${b.blogSlug !== undefined ? (b.blogSlug ? String(b.blogSlug) : null) : (row.blog_slug as string | null)},
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/tourism/admin/cms/intro-cards/:id", async (req, res): Promise<void> => {
  try {
    await db.execute(sql`DELETE FROM turizm_intro_cards WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/admin/cms/banners", async (req, res): Promise<void> => {
  const { categorySlug } = req.query as Record<string, string>;
  try {
    const rows = categorySlug
      ? await db.execute(sql`
          SELECT * FROM turizm_category_banners
          WHERE category_slug = ${categorySlug}
          ORDER BY sort_order ASC, id ASC
        `)
      : await db.execute(sql`
          SELECT * FROM turizm_category_banners ORDER BY category_slug ASC, sort_order ASC
        `);
    res.json({ banners: rows.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/tourism/admin/cms/banners", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.categorySlug || !b.imageUrl) {
    res.status(400).json({ error: "categorySlug ve imageUrl zorunlu" });
    return;
  }
  try {
    const r = await db.execute(sql`
      INSERT INTO turizm_category_banners (category_slug, image_url, link_url, title, sort_order, is_active)
      VALUES (
        ${String(b.categorySlug)}, ${String(b.imageUrl)},
        ${b.linkUrl ? String(b.linkUrl) : null},
        ${b.title ? String(b.title) : null},
        ${Number(b.sortOrder ?? 0)},
        ${b.isActive !== false}
      )
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/tourism/admin/cms/banners/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  try {
    const existing = await db.execute(sql`SELECT * FROM turizm_category_banners WHERE id = ${id} LIMIT 1`);
    const row = (existing.rows[0] ?? {}) as Record<string, unknown>;
    await db.execute(sql`
      UPDATE turizm_category_banners SET
        category_slug = ${b.categorySlug ? String(b.categorySlug) : String(row.category_slug ?? "")},
        image_url = ${b.imageUrl ? String(b.imageUrl) : String(row.image_url ?? "")},
        link_url = ${b.linkUrl !== undefined ? (b.linkUrl ? String(b.linkUrl) : null) : (row.link_url as string | null)},
        title = ${b.title !== undefined ? (b.title ? String(b.title) : null) : (row.title as string | null)},
        sort_order = ${b.sortOrder !== undefined ? Number(b.sortOrder) : Number(row.sort_order ?? 0)},
        is_active = ${b.isActive !== undefined ? Boolean(b.isActive) : Boolean(row.is_active ?? true)},
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/tourism/admin/cms/banners/:id", async (req, res): Promise<void> => {
  try {
    await db.execute(sql`DELETE FROM turizm_category_banners WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/admin/cms/blog-posts", async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM turizm_blog_posts ORDER BY updated_at DESC, id DESC
    `);
    res.json({ posts: rows.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/tourism/admin/cms/blog-posts", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.title) {
    res.status(400).json({ error: "title zorunlu" });
    return;
  }
  const slug = b.slug ? String(b.slug) : turizmSlugifyTitle(String(b.title));
  try {
    const r = await db.execute(sql`
      INSERT INTO turizm_blog_posts (
        slug, title, meta_title, meta_description, excerpt, body_html,
        cover_image_url, category_slug, is_featured, is_published, published_at
      ) VALUES (
        ${slug}, ${String(b.title)},
        ${b.metaTitle ? String(b.metaTitle) : String(b.title)},
        ${b.metaDescription ? String(b.metaDescription) : null},
        ${b.excerpt ? String(b.excerpt) : null},
        ${b.bodyHtml ? String(b.bodyHtml) : null},
        ${b.coverImageUrl ? String(b.coverImageUrl) : null},
        ${b.categorySlug ? String(b.categorySlug) : null},
        ${Boolean(b.isFeatured)},
        ${Boolean(b.isPublished)},
        ${b.isPublished ? new Date().toISOString() : null}
      )
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/tourism/admin/cms/blog-posts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  try {
    const existing = await db.execute(sql`SELECT * FROM turizm_blog_posts WHERE id = ${id} LIMIT 1`);
    const row = (existing.rows[0] ?? {}) as Record<string, unknown>;
    const willPublish = b.isPublished !== undefined ? Boolean(b.isPublished) : Boolean(row.is_published);
    await db.execute(sql`
      UPDATE turizm_blog_posts SET
        slug = ${b.slug ? String(b.slug) : String(row.slug ?? "")},
        title = ${b.title ? String(b.title) : String(row.title ?? "")},
        meta_title = ${b.metaTitle !== undefined ? (b.metaTitle ? String(b.metaTitle) : null) : (row.meta_title as string | null)},
        meta_description = ${b.metaDescription !== undefined ? (b.metaDescription ? String(b.metaDescription) : null) : (row.meta_description as string | null)},
        excerpt = ${b.excerpt !== undefined ? (b.excerpt ? String(b.excerpt) : null) : (row.excerpt as string | null)},
        body_html = ${b.bodyHtml !== undefined ? (b.bodyHtml ? String(b.bodyHtml) : null) : (row.body_html as string | null)},
        cover_image_url = ${b.coverImageUrl !== undefined ? (b.coverImageUrl ? String(b.coverImageUrl) : null) : (row.cover_image_url as string | null)},
        category_slug = ${b.categorySlug !== undefined ? (b.categorySlug ? String(b.categorySlug) : null) : (row.category_slug as string | null)},
        is_featured = ${b.isFeatured !== undefined ? Boolean(b.isFeatured) : Boolean(row.is_featured ?? false)},
        is_published = ${willPublish},
        published_at = ${willPublish ? (row.published_at ? String(row.published_at) : new Date().toISOString()) : null},
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/tourism/admin/cms/blog-posts/:id", async (req, res): Promise<void> => {
  try {
    await db.execute(sql`DELETE FROM turizm_blog_posts WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/admin/yacht-extras", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20")) || 20));
  const offset = (page - 1) * limit;
  try {
    const where = q
      ? `AND (mb.name ILIKE '%${q.replace(/'/g, "''")}%' OR mb.slug ILIKE '%${q.replace(/'/g, "''")}%')`
      : "";
    const r = await db.execute(sql.raw(`
      SELECT mb.id, mb.name, mb.slug, mb.is_active,
             COALESCE(mcity.name, '') AS city,
             COALESCE(mdist.name, '') AS district,
             yle.id AS extras_id, yle.saatlik_fiyat, yle.ilan_no, yle.updated_at AS extras_updated_at
      FROM map_businesses mb
      LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
      LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
      LEFT JOIN yacht_listing_extras yle ON yle.map_business_id = mb.id
      WHERE mb.is_active = true
        AND (mb.import_source = 'yatport' OR mb.store_type = 'turizm_yat')
        ${where}
      ORDER BY yle.updated_at DESC NULLS LAST, mb.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `));
    const countR = await db.execute(sql.raw(`
      SELECT COUNT(*)::int AS c FROM map_businesses mb
      WHERE mb.is_active = true
        AND (mb.import_source = 'yatport' OR mb.store_type = 'turizm_yat')
        ${where}
    `));
    res.json({
      items: r.rows,
      total: Number((countR.rows[0] as { c?: number })?.c ?? 0),
      page,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/admin/yacht-extras/:mapBusinessId", async (req, res): Promise<void> => {
  const mapBusinessId = String(req.params.mapBusinessId ?? "");
  try {
    const bizR = await db.execute(sql`
      SELECT mb.id, mb.name, mb.slug, mb.description, mb.google_places_extras, mb.import_source
      FROM map_businesses mb WHERE mb.id = ${mapBusinessId} LIMIT 1
    `);
    if (!bizR.rows.length) {
      res.status(404).json({ error: "İşletme bulunamadı" });
      return;
    }
    const biz = bizR.rows[0] as Record<string, unknown>;
    const enriched = enrichYatportMapListing({ ...biz, type: "boat" });
    let extras = await fetchYachtExtras(mapBusinessId);
    if (!extras) {
      await upsertYachtExtrasFromYatport(mapBusinessId, enriched);
      extras = await fetchYachtExtras(mapBusinessId);
    }
    res.json({ business: biz, enriched, extras });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/tourism/admin/yacht-extras/:mapBusinessId", async (req, res): Promise<void> => {
  const mapBusinessId = String(req.params.mapBusinessId ?? "");
  try {
    const saved = await saveYachtExtras(mapBusinessId, req.body as Partial<YachtListingExtrasPayload>);
    res.json({ success: true, extras: saved });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* — ADMIN: Haritalardan turizme içe aktar — */

router.get("/tourism/admin/map-import/candidates", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "turizm")) return;
  try {
    const q = req.query as Record<string, string>;
    const result = await listTourismMapImportCandidates({
      category: q.category,
      city: q.city,
      q: q.q,
      storeType: q.storeType,
      page: parseInt(q.page ?? "1", 10) || 1,
      limit: parseInt(q.limit ?? "50", 10) || 50,
      excludeImported: q.excludeImported !== "0",
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/tourism/admin/map-import", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "turizm")) return;
  const body = req.body as Record<string, unknown>;
  const ids = body.mapBusinessIds ?? body.map_business_ids;
  if (!Array.isArray(ids) || !ids.length) {
    res.status(400).json({ error: "mapBusinessIds zorunlu" });
    return;
  }
  try {
    const result = await importTourismMapBusinesses({
      mapBusinessIds: ids.map((x) => String(x)),
      category: String(body.category ?? "otel"),
      createVendors: body.createVendors !== false,
    });
    res.json({ success: true, ...result, categories: TOURISM_MAP_IMPORT_CATEGORIES });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* — ADMIN / PUBLIC: VIP servis araçları — */

router.get("/tourism/vip/search", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  try {
    const listings = await fetchVipSearchResults({
      passengers: parseInt(q.passengers ?? q.pax ?? "1", 10) || 1,
      luggage: parseInt(q.luggage ?? q.bags ?? "0", 10) || 0,
      segment: q.segment,
      city: q.city || q.from,
      limit: parseInt(q.limit ?? "48", 10) || 48,
    });
    res.json({ listings, total: listings.length, segments: VIP_VEHICLE_SEGMENTS });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/vip/vehicles/:mapBusinessId", async (req, res): Promise<void> => {
  try {
    const vehicles = await fetchVipVehicles(String(req.params.mapBusinessId));
    res.json({ vehicles, segments: VIP_VEHICLE_SEGMENTS });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tourism/admin/vip-vehicles/:mapBusinessId", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "turizm")) return;
  try {
    const mapBusinessId = String(req.params.mapBusinessId ?? "");
    const bizR = await db.execute(sql`
      SELECT mb.id, mb.name, mb.slug FROM map_businesses mb WHERE mb.id = ${mapBusinessId} LIMIT 1
    `);
    if (!bizR.rows.length) {
      res.status(404).json({ error: "İşletme bulunamadı" });
      return;
    }
    let vehicles = await fetchVipVehicles(mapBusinessId, false);
    if (!vehicles.length) {
      const biz = bizR.rows[0] as Record<string, unknown>;
      vehicles = await seedDefaultVipVehicles(mapBusinessId, String(biz.cover_photo_url ?? biz.photo_url ?? "") || null);
    }
    res.json({ business: bizR.rows[0], vehicles, segments: VIP_VEHICLE_SEGMENTS });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/tourism/admin/vip-vehicles/:mapBusinessId", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "turizm")) return;
  const mapBusinessId = String(req.params.mapBusinessId ?? "");
  const body = req.body as Record<string, unknown>;
  try {
    const saved = await saveVipVehicle({
      ...(body as VipVehiclePayload),
      mapBusinessId,
    });
    res.json({ success: true, vehicle: saved });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
