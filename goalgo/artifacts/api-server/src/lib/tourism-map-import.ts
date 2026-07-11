/** Haritalar → Turizm paneli seçerek içe aktarma */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { promoteUnlinkedMapBusinesses } from "./map-vendor-google.js";
import { seedDefaultVipVehicles } from "./vip-service-vehicles.js";

export type TourismMapImportCategory =
  | "otel"
  | "pansiyon"
  | "arac"
  | "tur"
  | "vip";

export const TOURISM_MAP_IMPORT_CATEGORIES: {
  value: TourismMapImportCategory;
  label: string;
  storeType: string;
  listingType: string;
  homepageCategory: string;
  tourismSubtype: string;
}[] = [
  { value: "otel", label: "Oteller", storeType: "turizm_otel", listingType: "hotel", homepageCategory: "turizm", tourismSubtype: "otel" },
  { value: "pansiyon", label: "Pansiyon", storeType: "turizm_pansiyon", listingType: "hotel", homepageCategory: "turizm", tourismSubtype: "otel" },
  { value: "arac", label: "Rent a Car", storeType: "turizm_rentacar", listingType: "car", homepageCategory: "seyahat", tourismSubtype: "arac" },
  { value: "tur", label: "Tur şirketleri", storeType: "turizm_tur_sirketi", listingType: "tour", homepageCategory: "turizm", tourismSubtype: "tur" },
  { value: "vip", label: "VIP servis araçları", storeType: "turizm_vip_servis", listingType: "vip", homepageCategory: "seyahat", tourismSubtype: "vip" },
];

function categoryByValue(value: string) {
  return TOURISM_MAP_IMPORT_CATEGORIES.find((c) => c.value === value) ?? TOURISM_MAP_IMPORT_CATEGORIES[0];
}

function storeTypeFilter(category: string): string {
  const cat = categoryByValue(category);
  if (category === "otel") {
    return `AND (mb.store_type IN ('turizm_otel','turizm_pansiyon') OR lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('lodging','hotel','motel','guest_house','resort_hotel'))`;
  }
  if (category === "pansiyon") {
    return `AND (mb.store_type = 'turizm_pansiyon' OR lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('guest_house','bed_and_breakfast','inn'))`;
  }
  if (category === "arac") {
    return `AND (mb.store_type IN ('turizm_rentacar','seyahat_rentacar') OR lower(COALESCE(mb.google_places_extras->>'primaryType','')) = 'car_rental')`;
  }
  if (category === "tur") {
    return `AND (mb.store_type IN ('turizm_tur_sirketi','seyahat_acenta') OR lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('travel_agency','tour_agency','tour_operator'))`;
  }
  if (category === "vip") {
    return `AND (mb.store_type IN ('turizm_vip_servis','turizm_transfer','ulasim_ozel_tasima','ulasim_minibus_servis','seyahat_otobus')
      OR lower(COALESCE(mb.name,'')) LIKE '%transfer%'
      OR lower(COALESCE(mb.name,'')) LIKE '%vip%'
      OR lower(COALESCE(mb.name,'')) LIKE '%şoförlü%'
      OR lower(COALESCE(mb.name,'')) LIKE '%soforlu%')`;
  }
  return `AND mb.store_type = '${cat.storeType.replace(/'/g, "''")}'`;
}

async function isAlreadyImported(mapBusinessId: string, googlePlaceId: string | null, slug: string): Promise<boolean> {
  const safeId = mapBusinessId.replace(/'/g, "''");
  const safeSlug = slug.replace(/'/g, "''");
  const gp = googlePlaceId ? googlePlaceId.replace(/'/g, "''") : "";
  const vendorR = await db.execute(sql.raw(`
    SELECT id FROM vendors WHERE linked_map_business_id = '${safeId}' LIMIT 1
  `));
  if (vendorR.rows.length) return true;
  const extrasGp = gp
    ? `OR tl.extra_info->>'google_place_id' = '${gp}'`
    : "";
  const listingR = await db.execute(sql.raw(`
    SELECT id FROM tourism_listings tl
    WHERE tl.slug = '${safeSlug}'
       OR tl.extra_info->>'linked_map_business_id' = '${safeId}'
       ${extrasGp}
    LIMIT 1
  `));
  if (listingR.rows.length) return true;
  const importedFlag = await db.execute(sql.raw(`
    SELECT id FROM map_businesses
    WHERE id = '${safeId}'
      AND COALESCE(google_places_extras->>'tourismImported','') = 'true'
    LIMIT 1
  `));
  return importedFlag.rows.length > 0;
}

export async function listTourismMapImportCandidates(opts: {
  category?: string;
  city?: string;
  q?: string;
  storeType?: string;
  page?: number;
  limit?: number;
  excludeImported?: boolean;
}) {
  const category = String(opts.category ?? "otel").trim().toLowerCase();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = (page - 1) * limit;
  const q = String(opts.q ?? "").trim().replace(/'/g, "''");
  const city = String(opts.city ?? "").trim().replace(/'/g, "''");
  const storeType = String(opts.storeType ?? "").trim().replace(/'/g, "''");

  const qWhere = q ? `AND (mb.name ILIKE '%${q}%' OR mb.address ILIKE '%${q}%' OR mb.slug ILIKE '%${q}%')` : "";
  const cityWhere = city ? `AND (COALESCE(mcity.name,'') ILIKE '%${city}%' OR mb.address ILIKE '%${city}%')` : "";
  const storeWhere = storeType ? `AND mb.store_type = '${storeType}'` : storeTypeFilter(category);
  const excludeWhere = opts.excludeImported !== false
    ? `AND COALESCE(mb.google_places_extras->>'tourismImported','') <> 'true'
       AND NOT EXISTS (SELECT 1 FROM vendors v WHERE v.linked_map_business_id = mb.id)
       AND NOT EXISTS (
         SELECT 1 FROM tourism_listings tl
         WHERE tl.extra_info->>'linked_map_business_id' = mb.id
            OR (mb.slug IS NOT NULL AND mb.slug <> '' AND tl.slug = mb.slug)
       )`
    : "";

  const baseFrom = `
    FROM map_businesses mb
    LEFT JOIN map_categories mc ON mc.id = mb.category_id
    LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
    LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
    WHERE mb.is_active = true
      ${storeWhere}
      ${qWhere}
      ${cityWhere}
      ${excludeWhere}
  `;

  const rowsR = await db.execute(sql.raw(`
    SELECT mb.id, mb.name, mb.slug, mb.google_place_id, mb.store_type,
           mb.homepage_super_category, mb.import_source,
           COALESCE(mcity.name, '') AS city,
           COALESCE(mdist.name, '') AS district,
           mb.address, mb.rating, mb.cover_photo_url, mb.photo_url,
           COALESCE(mc.name, '') AS category_name
    ${baseFrom}
    ORDER BY mb.rating DESC NULLS LAST, mb.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `));
  const countR = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c ${baseFrom}`));
  const items = (rowsR.rows as Record<string, unknown>[]).map((row) => ({
    ...row,
    already_imported: false,
  }));
  return {
    items,
    total: Number((countR.rows[0] as { c?: number })?.c ?? 0),
    page,
    categories: TOURISM_MAP_IMPORT_CATEGORIES,
  };
}

async function createTourismListingFromMap(
  biz: Record<string, unknown>,
  listingType: string,
): Promise<number | null> {
  const mapId = String(biz.id ?? "");
  const title = String(biz.name ?? "İşletme");
  const slug = String(biz.slug ?? mapId);
  const city = String(biz.city ?? "") || null;
  const district = String(biz.district ?? "") || null;
  const address = String(biz.address ?? "") || null;
  const imageUrl = String(biz.cover_photo_url ?? biz.photo_url ?? "") || null;
  const googlePlaceId = biz.google_place_id ? String(biz.google_place_id) : null;
  const priceUnit =
    listingType === "hotel" || listingType === "villa"
      ? "gece"
      : listingType === "tour"
        ? "kişi"
        : listingType === "vip"
          ? "transfer"
          : listingType === "boat"
            ? "saat"
            : "gün";

  const dup = await db.execute(sql`
    SELECT id FROM tourism_listings
    WHERE slug = ${slug}
       OR extra_info->>'linked_map_business_id' = ${mapId}
    LIMIT 1
  `);
  if (dup.rows.length) return Number((dup.rows[0] as { id: number }).id);

  const vendorR = await db.execute(sql`
    SELECT id FROM vendors WHERE linked_map_business_id = ${mapId} LIMIT 1
  `);
  const vendorId = vendorR.rows.length ? Number((vendorR.rows[0] as { id: number }).id) : null;

  const extraInfo = JSON.stringify({
    linked_map_business_id: mapId,
    linked_map_slug: slug,
    google_place_id: googlePlaceId,
    source: "map_import",
  });

  const r = await db.execute(sql.raw(`
    INSERT INTO tourism_listings (
      type, title, slug, vendor_id, city, district, address, image_url,
      price, price_unit, status, is_featured, extra_info, created_at, updated_at
    ) VALUES (
      '${listingType.replace(/'/g, "''")}',
      '${title.replace(/'/g, "''")}',
      '${slug.replace(/'/g, "''")}',
      ${vendorId ?? "NULL"},
      ${city ? `'${city.replace(/'/g, "''")}'` : "NULL"},
      ${district ? `'${district.replace(/'/g, "''")}'` : "NULL"},
      ${address ? `'${address.replace(/'/g, "''")}'` : "NULL"},
      ${imageUrl ? `'${imageUrl.replace(/'/g, "''")}'` : "NULL"},
      0, '${priceUnit}', 'active', false,
      '${extraInfo.replace(/'/g, "''")}'::jsonb,
      NOW(), NOW()
    )
    RETURNING id
  `));
  return Number((r.rows[0] as { id: number })?.id ?? 0) || null;
}

export async function importTourismMapBusinesses(opts: {
  mapBusinessIds: string[];
  category: string;
  createVendors?: boolean;
}) {
  const ids = opts.mapBusinessIds.map((x) => String(x || "").trim()).filter(Boolean);
  if (!ids.length) return { imported: 0, skipped: 0, errors: [] as string[], details: [] as Record<string, unknown>[] };

  const cat = categoryByValue(opts.category);
  const results: Record<string, unknown>[] = [];
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (opts.createVendors !== false) {
    try {
      await promoteUnlinkedMapBusinesses({
        limit: ids.length,
        mapBusinessIds: ids,
        forceVendorType: "turizm",
        tourismSubtype: cat.tourismSubtype === "vip" ? "arac" : cat.tourismSubtype,
        onlyVendorTypes: ["turizm"],
      });
    } catch (e) {
      errors.push(`Vendor oluşturma: ${String(e)}`);
    }
  }

  for (const id of ids) {
    try {
      const bizR = await db.execute(sql`
        SELECT mb.*, COALESCE(mcity.name, '') AS city, COALESCE(mdist.name, '') AS district
        FROM map_businesses mb
        LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
        WHERE mb.id = ${id}
        LIMIT 1
      `);
      if (!bizR.rows.length) {
        skipped++;
        errors.push(`${id}: kayıt bulunamadı`);
        continue;
      }
      const biz = bizR.rows[0] as Record<string, unknown>;
      const slug = String(biz.slug ?? id);
      const gp = biz.google_place_id ? String(biz.google_place_id) : null;
      if (await isAlreadyImported(id, gp, slug)) {
        skipped++;
        continue;
      }

      const extras = (biz.google_places_extras && typeof biz.google_places_extras === "object"
        ? { ...(biz.google_places_extras as Record<string, unknown>) }
        : {}) as Record<string, unknown>;
      extras.tourismImported = "true";
      extras.tourismImportCategory = cat.value;
      extras.tourismImportAt = new Date().toISOString();

      await db.execute(sql`
        UPDATE map_businesses SET
          store_type = ${cat.storeType},
          homepage_super_category = ${cat.homepageCategory},
          google_places_extras = ${JSON.stringify(extras)}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}
      `);

      const listingId = await createTourismListingFromMap(biz, cat.listingType);
      if (cat.value === "vip") {
        const cover = String(biz.cover_photo_url ?? biz.photo_url ?? "") || null;
        await seedDefaultVipVehicles(id, cover);
      }

      imported++;
      results.push({ mapBusinessId: id, listingId, category: cat.value, storeType: cat.storeType });
    } catch (e) {
      skipped++;
      errors.push(`${id}: ${String(e)}`);
    }
  }

  return { imported, skipped, errors, details: results };
}
