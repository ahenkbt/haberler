/** vip_service_vehicles + map_businesses → VIP transfer liste/detay */

import { db, vipServiceVehiclesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

export type VipVehicleAmenity = "wifi" | "minibar" | "baby_seat" | "meet_greet" | "water" | "charger";

export type VipVehiclePayload = {
  id?: number;
  mapBusinessId: string;
  segment: string;
  name: string;
  slug: string;
  maxPassengers: number;
  maxLuggage: number;
  amenities: string[];
  imageUrl?: string | null;
  hourlyPrice?: number | null;
  dailyPrice?: number | null;
  zonePrice?: number | null;
  kdvDahil?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export const VIP_VEHICLE_SEGMENTS = ["Premium Sedan", "VIP Vito", "Lüks SUV", "Minibüs VIP", "Limuzin"] as const;

export const DEFAULT_VIP_VEHICLES: Omit<VipVehiclePayload, "mapBusinessId">[] = [
  {
    segment: "Premium Sedan",
    name: "Premium Sedan",
    slug: "premium-sedan",
    maxPassengers: 3,
    maxLuggage: 2,
    amenities: ["wifi", "water", "charger"],
    hourlyPrice: 2500,
    zonePrice: 1800,
    kdvDahil: true,
    sortOrder: 0,
  },
  {
    segment: "VIP Vito",
    name: "Mercedes VIP Vito",
    slug: "vip-vito",
    maxPassengers: 6,
    maxLuggage: 6,
    amenities: ["wifi", "minibar", "baby_seat", "water"],
    hourlyPrice: 3500,
    zonePrice: 2400,
    kdvDahil: true,
    sortOrder: 1,
  },
  {
    segment: "Lüks SUV",
    name: "Lüks SUV",
    slug: "luks-suv",
    maxPassengers: 4,
    maxLuggage: 4,
    amenities: ["wifi", "water", "charger", "baby_seat"],
    hourlyPrice: 4200,
    zonePrice: 2900,
    kdvDahil: true,
    sortOrder: 2,
  },
];

function parseNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function slugifySegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureVipServiceTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vip_service_vehicles (
      id SERIAL PRIMARY KEY,
      map_business_id VARCHAR NOT NULL REFERENCES map_businesses(id) ON DELETE CASCADE,
      segment TEXT NOT NULL DEFAULT 'Premium Sedan',
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      max_passengers INTEGER NOT NULL DEFAULT 4,
      max_luggage INTEGER NOT NULL DEFAULT 2,
      amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_url TEXT,
      hourly_price NUMERIC(12, 2),
      daily_price NUMERIC(12, 2),
      zone_price NUMERIC(12, 2),
      kdv_dahil BOOLEAN NOT NULL DEFAULT true,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (map_business_id, slug)
    )
  `);
  await db.execute(sql`
    ALTER TABLE tourism_listings DROP CONSTRAINT IF EXISTS tourism_listings_type_check
  `);
  await db.execute(sql`
    ALTER TABLE tourism_listings ADD CONSTRAINT tourism_listings_type_check
      CHECK (type IN ('hotel', 'car', 'villa', 'tour', 'boat', 'vip'))
  `);
}

export async function fetchVipVehicles(mapBusinessId: string, activeOnly = true) {
  await ensureVipServiceTables();
  const rows = await db
    .select()
    .from(vipServiceVehiclesTable)
    .where(
      activeOnly
        ? and(
            eq(vipServiceVehiclesTable.mapBusinessId, mapBusinessId),
            eq(vipServiceVehiclesTable.isActive, true),
          )
        : eq(vipServiceVehiclesTable.mapBusinessId, mapBusinessId),
    )
    .orderBy(vipServiceVehiclesTable.sortOrder);
  return rows.map(vipVehicleRowToJson);
}

export function vipVehicleRowToJson(row: typeof vipServiceVehiclesTable.$inferSelect) {
  const amenities = Array.isArray(row.amenities)
    ? (row.amenities as string[])
    : [];
  const hourly = parseNum(row.hourlyPrice);
  const daily = parseNum(row.dailyPrice);
  const zone = parseNum(row.zonePrice);
  const netPrice = zone ?? hourly ?? daily ?? 0;
  return {
    id: row.id,
    mapBusinessId: row.mapBusinessId,
    segment: row.segment,
    name: row.name,
    slug: row.slug,
    maxPassengers: row.maxPassengers,
    maxLuggage: row.maxLuggage,
    amenities,
    imageUrl: row.imageUrl,
    hourlyPrice: hourly,
    dailyPrice: daily,
    zonePrice: zone,
    netPrice,
    kdvDahil: row.kdvDahil,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function seedDefaultVipVehicles(mapBusinessId: string, coverImage?: string | null) {
  await ensureVipServiceTables();
  const existing = await fetchVipVehicles(mapBusinessId, false);
  if (existing.length > 0) return existing;
  const seeded: ReturnType<typeof vipVehicleRowToJson>[] = [];
  for (const v of DEFAULT_VIP_VEHICLES) {
    const [row] = await db
      .insert(vipServiceVehiclesTable)
      .values({
        mapBusinessId,
        segment: v.segment,
        name: v.name,
        slug: v.slug || slugifySegment(v.name),
        maxPassengers: v.maxPassengers,
        maxLuggage: v.maxLuggage,
        amenities: v.amenities,
        imageUrl: coverImage ?? null,
        hourlyPrice: v.hourlyPrice != null ? String(v.hourlyPrice) : null,
        zonePrice: v.zonePrice != null ? String(v.zonePrice) : null,
        kdvDahil: v.kdvDahil ?? true,
        sortOrder: v.sortOrder ?? 0,
      })
      .returning();
    seeded.push(vipVehicleRowToJson(row));
  }
  return seeded;
}

export async function saveVipVehicle(payload: VipVehiclePayload) {
  await ensureVipServiceTables();
  const slug = payload.slug || slugifySegment(payload.name);
  if (payload.id) {
    await db
      .update(vipServiceVehiclesTable)
      .set({
        segment: payload.segment,
        name: payload.name,
        slug,
        maxPassengers: payload.maxPassengers,
        maxLuggage: payload.maxLuggage,
        amenities: payload.amenities,
        imageUrl: payload.imageUrl ?? null,
        hourlyPrice: payload.hourlyPrice != null ? String(payload.hourlyPrice) : null,
        dailyPrice: payload.dailyPrice != null ? String(payload.dailyPrice) : null,
        zonePrice: payload.zonePrice != null ? String(payload.zonePrice) : null,
        kdvDahil: payload.kdvDahil ?? true,
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(vipServiceVehiclesTable.id, payload.id));
    const rows = await fetchVipVehicles(payload.mapBusinessId, false);
    return rows.find((r) => r.id === payload.id) ?? null;
  }
  const [row] = await db
    .insert(vipServiceVehiclesTable)
    .values({
      mapBusinessId: payload.mapBusinessId,
      segment: payload.segment,
      name: payload.name,
      slug,
      maxPassengers: payload.maxPassengers,
      maxLuggage: payload.maxLuggage,
      amenities: payload.amenities,
      imageUrl: payload.imageUrl ?? null,
      hourlyPrice: payload.hourlyPrice != null ? String(payload.hourlyPrice) : null,
      dailyPrice: payload.dailyPrice != null ? String(payload.dailyPrice) : null,
      zonePrice: payload.zonePrice != null ? String(payload.zonePrice) : null,
      kdvDahil: payload.kdvDahil ?? true,
      isActive: payload.isActive ?? true,
      sortOrder: payload.sortOrder ?? 0,
    })
    .returning();
  return vipVehicleRowToJson(row);
}

export async function enrichVipListingRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return rows;
  await ensureVipServiceTables();
  const ids = rows.map((r) => String(r.id ?? "")).filter(Boolean);
  if (!ids.length) return rows;
  const idList = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
  const vRes = await db.execute(sql.raw(`
    SELECT * FROM vip_service_vehicles
    WHERE map_business_id IN (${idList}) AND is_active = true
    ORDER BY sort_order ASC, id ASC
  `));
  const byBiz = new Map<string, ReturnType<typeof vipVehicleRowToJson>[]>();
  for (const raw of vRes.rows as Record<string, unknown>[]) {
    const bizId = String(raw.map_business_id ?? "");
    const mapped = vipVehicleRowToJson({
      id: Number(raw.id),
      mapBusinessId: bizId,
      segment: String(raw.segment ?? ""),
      name: String(raw.name ?? ""),
      slug: String(raw.slug ?? ""),
      maxPassengers: Number(raw.max_passengers ?? 4),
      maxLuggage: Number(raw.max_luggage ?? 2),
      amenities: raw.amenities,
      imageUrl: raw.image_url as string | null,
      hourlyPrice: raw.hourly_price as string | null,
      dailyPrice: raw.daily_price as string | null,
      zonePrice: raw.zone_price as string | null,
      kdvDahil: Boolean(raw.kdv_dahil ?? true),
      isActive: Boolean(raw.is_active ?? true),
      sortOrder: Number(raw.sort_order ?? 0),
      createdAt: new Date(String(raw.created_at ?? Date.now())),
      updatedAt: new Date(String(raw.updated_at ?? Date.now())),
    });
    const list = byBiz.get(bizId) ?? [];
    list.push(mapped);
    byBiz.set(bizId, list);
  }
  return rows.map((row) => {
    const bizId = String(row.id ?? "");
    const vehicles = byBiz.get(bizId) ?? [];
    const minPrice = vehicles.reduce((min, v) => {
      const p = v.netPrice ?? 0;
      return p > 0 && (min === 0 || p < min) ? p : min;
    }, 0);
    return {
      ...row,
      vehicles,
      vehicle_count: vehicles.length,
      price: minPrice > 0 ? String(minPrice) : row.price,
      price_unit: "transfer",
    };
  });
}

export async function fetchVipSearchResults(opts: {
  passengers?: number;
  luggage?: number;
  segment?: string;
  city?: string;
  limit?: number;
}) {
  await ensureVipServiceTables();
  const passengers = Math.max(1, opts.passengers ?? 1);
  const luggage = Math.max(0, opts.luggage ?? 0);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 48));
  const cityWhere = opts.city?.trim()
    ? `AND (COALESCE(mcity.name,'') ILIKE '%${opts.city.replace(/'/g, "''")}%' OR COALESCE(mb.address,'') ILIKE '%${opts.city.replace(/'/g, "''")}%')`
    : "";
  const segmentWhere = opts.segment?.trim()
    ? `AND EXISTS (
        SELECT 1 FROM vip_service_vehicles vsv
        WHERE vsv.map_business_id = mb.id AND vsv.is_active = true
          AND vsv.segment ILIKE '%${opts.segment.replace(/'/g, "''")}%'
          AND vsv.max_passengers >= ${passengers}
          AND vsv.max_luggage >= ${luggage}
      )`
    : `AND EXISTS (
        SELECT 1 FROM vip_service_vehicles vsv
        WHERE vsv.map_business_id = mb.id AND vsv.is_active = true
          AND vsv.max_passengers >= ${passengers}
          AND vsv.max_luggage >= ${luggage}
      )`;
  const r = await db.execute(sql.raw(`
    SELECT mb.id, mb.name AS title, COALESCE(NULLIF(mb.slug,''), mb.id::text) AS slug,
           COALESCE(mcity.name, '') AS city, COALESCE(mdist.name, '') AS district,
           mb.address, mb.latitude AS lat, mb.longitude AS lng,
           COALESCE(mb.cover_photo_url, mb.photo_url) AS image_url,
           mb.rating, mb.user_ratings_total AS review_count,
           mb.store_type, mb.phone, mb.website
    FROM map_businesses mb
    LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
    LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
    WHERE mb.is_active = true
      AND (
        mb.store_type IN ('turizm_vip_servis', 'turizm_transfer', 'ulasim_ozel_tasima', 'ulasim_minibus_servis')
        OR COALESCE(mb.google_places_extras->>'tourismImported','') = 'true'
      )
      ${cityWhere}
      ${segmentWhere}
    ORDER BY mb.is_premium DESC, mb.rating DESC NULLS LAST
    LIMIT ${limit}
  `));
  let rows = r.rows as Record<string, unknown>[];
  rows = rows.map((row) => ({ ...row, type: "vip", href: `/turizm/servis/${row.slug}` }));
  return enrichVipListingRows(rows);
}
