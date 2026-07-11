/** etkinlik.io mekan → map_businesses (Haritalar + Sarı Sayfalar) — otomotiv-map-sync deseni */

import { db } from "@workspace/db";
import { etkinlikEventCacheTable, mapBusinessesTable, mapCategoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const ETKINLIK_CATEGORY_SLUG = "eglence";
const STORE_TYPE = "etkinlik_mekan";
const HOMEPAGE_SUPER = "turizm";
const IMPORT_SLUG = "etkinlik-mekan";

let cachedCategoryId: string | null | undefined;

function toSlug(text: string): string {
  const tr: Record<string, string> = {
    ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ı: "i", İ: "I", ö: "o", Ö: "O", ç: "c", Ç: "C",
  };
  return text
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (m) => tr[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeVenueKey(name: string, city: string | null, address: string | null): string {
  const parts = [name, city, address].map((p) => String(p ?? "").trim().toLowerCase()).filter(Boolean);
  return parts.join("|");
}

function venueSlug(name: string, city: string | null): string {
  const base = toSlug(name) || "mekan";
  const cityPart = city ? toSlug(city) : "";
  return cityPart ? `${IMPORT_SLUG}-${base}-${cityPart}` : `${IMPORT_SLUG}-${base}`;
}

async function resolveEtkinlikCategoryId(): Promise<string | null> {
  if (cachedCategoryId !== undefined) return cachedCategoryId;
  const rows = await db
    .select({ id: mapCategoriesTable.id })
    .from(mapCategoriesTable)
    .where(eq(mapCategoriesTable.slug, ETKINLIK_CATEGORY_SLUG))
    .limit(1);
  cachedCategoryId = rows[0]?.id ?? null;
  return cachedCategoryId;
}

export type EtkinlikVenueInput = {
  etkinlikId: number;
  mapBusinessId?: string | null;
  /** etkinlik.io venue_data.id — aynı mekan tekrar eklenmesin */
  etkinlikVenueId?: number | null;
  venueName: string | null;
  venueCity: string | null;
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  posterUrl?: string | null;
};

export type EtkinlikVenueSyncAction = "skipped" | "created" | "updated" | "linked";

export type EtkinlikVenueSyncResult = EtkinlikVenueMapLinks & { action: EtkinlikVenueSyncAction };

export type EtkinlikVenueResyncStats = {
  processed: number;
  skipped: number;
  created: number;
  updated: number;
  linked: number;
  errors: number;
};

export type EtkinlikVenueMapLinks = {
  mapBusinessId: string | null;
  mapBusinessSlug: string | null;
  haritalarUrl: string | null;
  sariSayfalarUrl: string | null;
};

export function buildEtkinlikVenueHaritalarUrl(opts: {
  mapBusinessId?: string | null;
  mapBusinessSlug?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  venueName?: string | null;
}): string | null {
  const params = new URLSearchParams();
  const id = String(opts.mapBusinessId ?? "").trim();
  const slug = String(opts.mapBusinessSlug ?? "").trim();
  if (id) params.set("nav", id);
  else if (slug) params.set("nav", slug);
  const lat = Number(opts.lat);
  const lng = Number(opts.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  const city = String(opts.city ?? "").trim();
  if (city) params.set("city", city);
  const name = String(opts.venueName ?? "").trim();
  if (name) params.set("location", name);
  params.set("layers", "serverCluster");
  const q = params.toString();
  return q ? `/haritalar?${q}` : null;
}

export function buildEtkinlikVenueSariSayfalarUrl(opts: {
  mapBusinessId?: string | null;
  mapBusinessSlug?: string | null;
}): string | null {
  const slug = String(opts.mapBusinessSlug ?? "").trim();
  const id = String(opts.mapBusinessId ?? "").trim();
  if (slug) return `/kesfet/sarisayfalar/${encodeURIComponent(slug)}`;
  if (id) return `/kesfet/sarisayfalar/${encodeURIComponent(id)}`;
  return null;
}

function isOnlineVenue(name: string | null): boolean {
  const n = String(name ?? "").trim().toLowerCase();
  return !n || n === "online etkinlik" || n.includes("online etkinlik");
}

const COORD_EPS = 0.0001;

type MapBizRef = { id: string; slug: string | null };

async function findExistingEtkinlikVenueMapBusiness(input: {
  mapBusinessId?: string | null;
  slug: string;
  venueKey: string;
  etkinlikVenueId?: number | null;
  venueName: string;
  venueAddress?: string | null;
  lat?: number;
  lng?: number;
}): Promise<MapBizRef | null> {
  const linkId = String(input.mapBusinessId ?? "").trim();
  if (linkId) {
    const rows = await db
      .select({ id: mapBusinessesTable.id, slug: mapBusinessesTable.slug })
      .from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.id, linkId))
      .limit(1);
    if (rows[0]) return rows[0];
  }

  const bySlug = await db
    .select({ id: mapBusinessesTable.id, slug: mapBusinessesTable.slug })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.slug, input.slug))
    .limit(1);
  if (bySlug[0]) return bySlug[0];

  const venueId = input.etkinlikVenueId;
  if (venueId != null && Number.isFinite(venueId) && venueId > 0) {
    const byVenueId = await db.execute(sql`
      SELECT id, slug FROM map_businesses
      WHERE store_type = ${STORE_TYPE}
        AND google_places_extras->>'etkinlikVenueId' = ${String(venueId)}
      LIMIT 1
    `);
    const row = (byVenueId.rows as MapBizRef[])[0];
    if (row?.id) return row;
  }

  const byVenueKey = await db.execute(sql`
    SELECT id, slug FROM map_businesses
    WHERE store_type = ${STORE_TYPE}
      AND google_places_extras->>'etkinlikVenueKey' = ${input.venueKey}
    LIMIT 1
  `);
  const keyRow = (byVenueKey.rows as MapBizRef[])[0];
  if (keyRow?.id) return keyRow;

  if (input.lat != null && input.lng != null && Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    const byCoords = await db.execute(sql`
      SELECT id, slug FROM map_businesses
      WHERE store_type = ${STORE_TYPE}
        AND LOWER(TRIM(name)) = LOWER(TRIM(${input.venueName}))
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND ABS(latitude::double precision - ${input.lat}) < ${COORD_EPS}
        AND ABS(longitude::double precision - ${input.lng}) < ${COORD_EPS}
      LIMIT 1
    `);
    const coordRow = (byCoords.rows as MapBizRef[])[0];
    if (coordRow?.id) return coordRow;
  }

  const addr = String(input.venueAddress ?? "").trim();
  if (addr) {
    const byAddr = await db.execute(sql`
      SELECT id, slug FROM map_businesses
      WHERE store_type = ${STORE_TYPE}
        AND LOWER(TRIM(name)) = LOWER(TRIM(${input.venueName}))
        AND LOWER(TRIM(COALESCE(address, ''))) = LOWER(TRIM(${addr}))
      LIMIT 1
    `);
    const addrRow = (byAddr.rows as MapBizRef[])[0];
    if (addrRow?.id) return addrRow;
  }

  return null;
}

function buildVenueExtras(input: EtkinlikVenueInput, venueKey: string) {
  return {
    etkinlikVenueKey: venueKey,
    etkinlikEventId: input.etkinlikId,
    ...(input.etkinlikVenueId != null && Number.isFinite(input.etkinlikVenueId) && input.etkinlikVenueId > 0
      ? { etkinlikVenueId: input.etkinlikVenueId }
      : {}),
    importWorkflow: { category: { slug: IMPORT_SLUG, label: "Etkinlik Mekanı" } },
  };
}

export async function syncEtkinlikVenueToMap(input: EtkinlikVenueInput): Promise<EtkinlikVenueSyncResult> {
  const empty: EtkinlikVenueSyncResult = {
    mapBusinessId: input.mapBusinessId ?? null,
    mapBusinessSlug: null,
    haritalarUrl: null,
    sariSayfalarUrl: null,
    action: "skipped",
  };

  if (isOnlineVenue(input.venueName)) return empty;

  const venueName = String(input.venueName ?? "").trim();
  if (!venueName) return empty;

  try {
    const categoryId = await resolveEtkinlikCategoryId();
    const slug = venueSlug(venueName, input.venueCity);
    const venueKey = normalizeVenueKey(venueName, input.venueCity, input.venueAddress);
    const address =
      input.venueAddress?.trim() ||
      [venueName, input.venueCity].filter(Boolean).join(", ") ||
      undefined;

    const lat = input.venueLat != null && Number.isFinite(input.venueLat) ? input.venueLat : undefined;
    const lng = input.venueLng != null && Number.isFinite(input.venueLng) ? input.venueLng : undefined;

    const existing = await findExistingEtkinlikVenueMapBusiness({
      mapBusinessId: input.mapBusinessId,
      slug,
      venueKey,
      etkinlikVenueId: input.etkinlikVenueId,
      venueName,
      venueAddress: input.venueAddress,
      lat,
      lng,
    });

    const common = {
      name: venueName,
      address,
      photoUrl: input.posterUrl ?? undefined,
      coverPhotoUrl: input.posterUrl ?? undefined,
      latitude: lat,
      longitude: lng,
      storeType: STORE_TYPE,
      homepageSuperCategory: HOMEPAGE_SUPER,
      categoryId: categoryId ?? undefined,
      isActive: true,
      importSource: "etkinlik" as const,
      updatedAt: new Date(),
    };
    const extras = buildVenueExtras(input, venueKey);

    let mapBusinessId: string;
    let mapBusinessSlug: string | null;
    let action: EtkinlikVenueSyncAction;

    if (existing) {
      mapBusinessId = existing.id;
      mapBusinessSlug = existing.slug ?? slug;
      await db
        .update(mapBusinessesTable)
        .set({
          ...common,
          googlePlacesExtras: extras,
          tags: ["etkinlik", IMPORT_SLUG, "turizm"],
        })
        .where(eq(mapBusinessesTable.id, existing.id));
      action = "updated";
    } else {
      const [ins] = await db
        .insert(mapBusinessesTable)
        .values({
          slug,
          ...common,
          googlePlacesExtras: extras,
          tags: ["etkinlik", IMPORT_SLUG, "turizm"],
        })
        .returning({ id: mapBusinessesTable.id, slug: mapBusinessesTable.slug });
      if (!ins?.id) return empty;
      mapBusinessId = ins.id;
      mapBusinessSlug = ins.slug ?? slug;
      action = "created";
    }

    const prevLink = String(input.mapBusinessId ?? "").trim();
    if (prevLink !== mapBusinessId) {
      await db
        .update(etkinlikEventCacheTable)
        .set({ mapBusinessId, updatedAt: new Date() })
        .where(eq(etkinlikEventCacheTable.etkinlikId, input.etkinlikId));
      if (action === "updated") action = "linked";
    }

    return {
      mapBusinessId,
      mapBusinessSlug,
      haritalarUrl: buildEtkinlikVenueHaritalarUrl({
        mapBusinessId,
        mapBusinessSlug,
        lat: input.venueLat,
        lng: input.venueLng,
        city: input.venueCity,
        venueName,
      }),
      sariSayfalarUrl: buildEtkinlikVenueSariSayfalarUrl({ mapBusinessId, mapBusinessSlug }),
      action,
    };
  } catch {
    return { ...empty, action: "skipped" };
  }
}

export async function resolveEtkinlikVenueMapLinks(input: EtkinlikVenueInput): Promise<EtkinlikVenueMapLinks> {
  const { action: _action, ...synced } = await syncEtkinlikVenueToMap(input);
  if (synced.mapBusinessId && synced.mapBusinessSlug) return synced;

  const linkId = String(input.mapBusinessId ?? synced.mapBusinessId ?? "").trim();
  if (!linkId) {
    return {
      ...synced,
      haritalarUrl:
        buildEtkinlikVenueHaritalarUrl({
          lat: input.venueLat,
          lng: input.venueLng,
          city: input.venueCity,
          venueName: input.venueName,
        }) ?? synced.haritalarUrl,
    };
  }

  const rows = await db
    .select({ id: mapBusinessesTable.id, slug: mapBusinessesTable.slug })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.id, linkId))
    .limit(1);
  const row = rows[0];
  if (!row) return synced;

  return {
    mapBusinessId: row.id,
    mapBusinessSlug: row.slug ?? null,
    haritalarUrl: buildEtkinlikVenueHaritalarUrl({
      mapBusinessId: row.id,
      mapBusinessSlug: row.slug,
      lat: input.venueLat,
      lng: input.venueLng,
      city: input.venueCity,
      venueName: input.venueName,
    }),
    sariSayfalarUrl: buildEtkinlikVenueSariSayfalarUrl({ mapBusinessId: row.id, mapBusinessSlug: row.slug }),
  };
}

function pickEtkinlikVenueIdFromApiPayload(payload: unknown): number | null {
  const raw = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!raw) return null;
  const venueData = raw.venue_data && typeof raw.venue_data === "object" ? (raw.venue_data as Record<string, unknown>) : null;
  const id = Number(venueData?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Boot / admin: önbellekteki tüm fiziksel mekanları haritaya hizala */
export async function resyncAllEtkinlikVenuesToMap(
  logger?: { info: (o: object, msg?: string) => void },
): Promise<EtkinlikVenueResyncStats> {
  const r = await db.execute(sql`
    SELECT etkinlik_id, map_business_id, venue_name, venue_city, venue_address, venue_lat, venue_lng, poster_url, api_payload
    FROM etkinlik_event_cache
    WHERE venue_name IS NOT NULL AND TRIM(venue_name) <> ''
  `);
  const stats: EtkinlikVenueResyncStats = {
    processed: 0,
    skipped: 0,
    created: 0,
    updated: 0,
    linked: 0,
    errors: 0,
  };

  for (const row of r.rows as Array<{
    etkinlik_id: number;
    map_business_id: string | null;
    venue_name: string | null;
    venue_city: string | null;
    venue_address: string | null;
    venue_lat: string | null;
    venue_lng: string | null;
    poster_url: string | null;
    api_payload: unknown;
  }>) {
    stats.processed += 1;
    if (isOnlineVenue(row.venue_name)) {
      stats.skipped += 1;
      continue;
    }

    try {
      const result = await syncEtkinlikVenueToMap({
        etkinlikId: row.etkinlik_id,
        mapBusinessId: row.map_business_id,
        etkinlikVenueId: pickEtkinlikVenueIdFromApiPayload(row.api_payload),
        venueName: row.venue_name,
        venueCity: row.venue_city,
        venueAddress: row.venue_address,
        venueLat: row.venue_lat != null ? Number(row.venue_lat) : null,
        venueLng: row.venue_lng != null ? Number(row.venue_lng) : null,
        posterUrl: row.poster_url,
      });
      if (result.action === "skipped") stats.skipped += 1;
      else if (result.action === "created") stats.created += 1;
      else if (result.action === "updated") stats.updated += 1;
      else if (result.action === "linked") stats.linked += 1;
    } catch {
      stats.errors += 1;
    }
  }

  logger?.info(stats, "etkinlik→map venue resync (boot)");
  return stats;
}
