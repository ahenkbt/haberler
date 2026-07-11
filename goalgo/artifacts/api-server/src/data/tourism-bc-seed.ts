import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcDemo from "./tourism-bc-demo.json";

type BcRoom = {
  name: string;
  description?: string;
  beds?: number;
  adults?: number;
  children?: number;
  sizeSqm?: number;
  price: number;
  count?: number;
  amenities?: string[];
  image?: string;
};

type BcListing = {
  type: string;
  slug: string;
  title: string;
  vendorSlug: string;
  roomCarrier?: boolean;
  linkedMapSlug?: string | null;
  city: string;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
  image: string;
  gallery?: string[];
  description: string;
  price: number;
  salePrice?: number | null;
  priceUnit: string;
  starRating?: number | null;
  rating?: number;
  reviewCount?: number;
  capacity?: number;
  amenities?: string[];
  features?: Record<string, string>;
  isFeatured?: boolean;
  rooms?: BcRoom[];
};

type BcVendor = {
  slug: string;
  name: string;
  subtype: string;
  city: string;
  image?: string;
};

type BcDestination = {
  title: string;
  slug: string;
  image: string;
  excerpt: string;
  detailTitle: string;
  gallery?: string[];
  cityMatch?: string[];
};

type GoogleHotelLink = {
  mapSlug: string;
  roomCarrierSlug: string;
};

const SEED = bcDemo as unknown as {
  seedVersion: string;
  vendors: BcVendor[];
  listings: BcListing[];
  destinations?: BcDestination[];
  googleHotelLinks?: GoogleHotelLink[];
};

export async function ensureTourismTables(logger?: { info: (msg: string, obj?: object) => void }) {
  const log = (msg: string) => (logger ? logger.info(msg, {}) : console.log(msg));
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tourism_listings (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('hotel','car','villa','tour','boat','vip')),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      city TEXT,
      district TEXT,
      address TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      image_url TEXT,
      gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      sale_price DECIMAL(12,2),
      price_unit TEXT NOT NULL DEFAULT 'gece',
      star_rating INTEGER,
      rating DECIMAL(3,1) NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      capacity INTEGER,
      amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
      features JSONB NOT NULL DEFAULT '{}'::jsonb,
      extra_info JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'active',
      is_featured BOOLEAN NOT NULL DEFAULT false,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tourism_destinations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      image_url TEXT,
      excerpt TEXT,
      detail_title TEXT,
      gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
      city_match JSONB NOT NULL DEFAULT '[]'::jsonb,
      extra_info JSONB NOT NULL DEFAULT '{}'::jsonb,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tourism_rooms (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES tourism_listings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      beds INTEGER NOT NULL DEFAULT 1,
      adults INTEGER NOT NULL DEFAULT 2,
      children INTEGER NOT NULL DEFAULT 0,
      size_sqm INTEGER,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      count INTEGER NOT NULL DEFAULT 1,
      amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS tourism_availability (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES tourism_listings(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES tourism_rooms(id) ON DELETE CASCADE,
      start_date DATE,
      end_date DATE,
      price_override DECIMAL(12,2),
      blocked BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS tourism_bookings (
      id SERIAL PRIMARY KEY,
      booking_ref TEXT NOT NULL UNIQUE,
      listing_id INTEGER REFERENCES tourism_listings(id) ON DELETE SET NULL,
      room_id INTEGER REFERENCES tourism_rooms(id) ON DELETE SET NULL,
      listing_type TEXT,
      listing_title TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      check_in DATE,
      check_out DATE,
      guests INTEGER NOT NULL DEFAULT 1,
      nights INTEGER NOT NULL DEFAULT 1,
      subtotal DECIMAL(12,2),
      total_price DECIMAL(12,2),
      notes TEXT,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tourism_listings_type_status ON tourism_listings(type, status);
    CREATE INDEX IF NOT EXISTS idx_tourism_listings_city ON tourism_listings(city);
    CREATE INDEX IF NOT EXISTS idx_tourism_listings_featured ON tourism_listings(is_featured) WHERE is_featured = true;
    CREATE INDEX IF NOT EXISTS idx_tourism_destinations_slug ON tourism_destinations(slug);

    CREATE TABLE IF NOT EXISTS tourism_google_hotel_links (
      id SERIAL PRIMARY KEY,
      map_business_id TEXT NOT NULL,
      map_slug TEXT NOT NULL,
      carrier_listing_id INTEGER NOT NULL REFERENCES tourism_listings(id) ON DELETE CASCADE,
      bc_seed TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(map_slug),
      UNIQUE(map_business_id)
    );
    CREATE INDEX IF NOT EXISTS idx_tourism_google_hotel_links_carrier
      ON tourism_google_hotel_links(carrier_listing_id);
  `);
  log("ensureTourismTables: tourism_listings / destinations / rooms ready");
  await db.execute(sql`
    ALTER TABLE tourism_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
  `);
}

async function ensureDemoAvailabilityBlocks(log: (msg: string, obj?: object) => void) {
  const cnt = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM tourism_availability
    WHERE listing_id IN (
      SELECT id FROM tourism_listings WHERE extra_info->>'bc_seed' = ${SEED.seedVersion}
    )
  `);
  if (parseInt((cnt.rows ?? cnt)[0]?.count ?? "0", 10) > 0) return;

  const listingRow = await db.execute<{ id: number }>(sql`
    SELECT id FROM tourism_listings WHERE slug = 'bc-bogazici-luks-otel' LIMIT 1
  `);
  const listingId = (listingRow.rows ?? listingRow)[0]?.id;
  if (!listingId) return;

  const roomRow = await db.execute<{ id: number }>(sql`
    SELECT id FROM tourism_rooms WHERE listing_id = ${listingId} ORDER BY id ASC LIMIT 1
  `);
  const roomId = (roomRow.rows ?? roomRow)[0]?.id ?? null;

  const start = new Date();
  start.setDate(start.getDate() + 30);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  await db.execute(sql`
    INSERT INTO tourism_availability (listing_id, room_id, start_date, end_date, blocked)
    VALUES (${listingId}, ${roomId}, ${startIso}::date, ${endIso}::date, true)
  `);

  const villaRow = await db.execute<{ id: number }>(sql`
    SELECT id FROM tourism_listings
    WHERE type = 'villa' AND extra_info->>'bc_seed' = ${SEED.seedVersion}
    ORDER BY id ASC LIMIT 1
  `);
  const villaId = (villaRow.rows ?? villaRow)[0]?.id;
  if (villaId) {
    const vStart = new Date();
    vStart.setDate(vStart.getDate() + 14);
    const vEnd = new Date(vStart);
    vEnd.setDate(vEnd.getDate() + 3);
    await db.execute(sql`
      INSERT INTO tourism_availability (listing_id, room_id, start_date, end_date, blocked)
      VALUES (
        ${villaId}, NULL,
        ${vStart.toISOString().slice(0, 10)}::date,
        ${vEnd.toISOString().slice(0, 10)}::date,
        true
      )
    `);
  }

  log("Tourism BC seed: demo availability blocks inserted", { listingId, version: SEED.seedVersion });
}

async function insertRoomsForListing(listingId: number, rooms: BcRoom[]) {
  for (const room of rooms) {
    await db.execute(sql`
      INSERT INTO tourism_rooms (
        listing_id, name, description, beds, adults, children, size_sqm,
        price, count, amenities, image_url, status
      ) VALUES (
        ${listingId}, ${room.name}, ${room.description ?? null},
        ${room.beds ?? 1}, ${room.adults ?? 2}, ${room.children ?? 0},
        ${room.sizeSqm ?? null}, ${room.price}, ${room.count ?? 1},
        ${JSON.stringify(room.amenities ?? [])}::jsonb,
        ${room.image ?? null}, 'active'
      )
    `);
  }
}

async function ensureHotelRoomsFromSeed(log: (msg: string, obj?: object) => void) {
  let added = 0;
  for (const l of SEED.listings.filter((x) => x.type === "hotel" && Array.isArray(x.rooms) && x.rooms.length)) {
    const row = await db.execute<{ id: number }>(sql`
      SELECT id FROM tourism_listings WHERE slug = ${l.slug} LIMIT 1
    `);
    const listingId = (row.rows ?? row)[0]?.id;
    if (!listingId) continue;
    const cnt = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count FROM tourism_rooms WHERE listing_id = ${listingId}
    `);
    if (parseInt((cnt.rows ?? cnt)[0]?.count ?? "0", 10) > 0) continue;
    await insertRoomsForListing(listingId, l.rooms!);
    added += l.rooms!.length;
  }
  if (added) log("Tourism BC seed: ensured hotel rooms", { added });
}

async function upsertGoogleHotelLink(
  mapBusinessId: string,
  mapSlug: string,
  carrierListingId: number,
): Promise<void> {
  const safeSlug = mapSlug || mapBusinessId;
  await db.execute(sql`
    INSERT INTO tourism_google_hotel_links (map_business_id, map_slug, carrier_listing_id, bc_seed)
    VALUES (${mapBusinessId}, ${safeSlug}, ${carrierListingId}, ${SEED.seedVersion})
    ON CONFLICT (map_slug) DO UPDATE SET
      map_business_id = EXCLUDED.map_business_id,
      carrier_listing_id = EXCLUDED.carrier_listing_id,
      bc_seed = EXCLUDED.bc_seed
  `);
}

async function findMapBusinessForLinkSlug(mapSlug: string): Promise<{ id: string; slug: string | null } | null> {
  const slug = String(mapSlug ?? "").trim();
  if (!slug) return null;

  const exact = await db.execute<{ id: string; slug: string | null }>(sql`
    SELECT id::text AS id, slug FROM map_businesses
    WHERE is_active = true
      AND (
        LOWER(COALESCE(slug,'')) = LOWER(${slug})
        OR id::text = ${slug}
      )
    LIMIT 1
  `);
  const hit = (exact.rows ?? exact)[0];
  if (hit) return hit;

  if (slug.length >= 8) {
    const prefix = await db.execute<{ id: string; slug: string | null }>(sql`
      SELECT id::text AS id, slug FROM map_businesses
      WHERE is_active = true
        AND COALESCE(slug,'') <> ''
        AND (
          LOWER(slug) LIKE LOWER(${slug}) || '%'
          OR LOWER(${slug}) LIKE LOWER(slug) || '%'
        )
      ORDER BY ABS(LENGTH(COALESCE(slug,'')) - LENGTH(${slug})), rating DESC NULLS LAST
      LIMIT 1
    `);
    const fuzzy = (prefix.rows ?? prefix)[0];
    if (fuzzy) return fuzzy;
  }

  const norm = slug
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!norm) return null;

  const byNorm = await db.execute<{ id: string; slug: string | null }>(sql`
    SELECT id::text AS id, slug FROM map_businesses
    WHERE is_active = true
      AND COALESCE(slug,'') <> ''
      AND REGEXP_REPLACE(LOWER(COALESCE(slug,'')), '[^a-z0-9]+', '-', 'g') = ${norm}
    LIMIT 1
  `);
  return (byNorm.rows ?? byNorm)[0] ?? null;
}

async function linkExplicitGoogleHotels(log: (msg: string, obj?: object) => void) {
  const links = SEED.googleHotelLinks ?? [];
  let linked = 0;
  for (const link of links) {
    const carrier = await db.execute<{ id: number }>(sql`
      SELECT id FROM tourism_listings WHERE slug = ${link.roomCarrierSlug} AND type = 'hotel' LIMIT 1
    `);
    const carrierId = (carrier.rows ?? carrier)[0]?.id;
    if (!carrierId) continue;

    const hit = await findMapBusinessForLinkSlug(link.mapSlug);
    if (!hit) continue;

    await upsertGoogleHotelLink(String(hit.id), hit.slug ?? link.mapSlug, carrierId);
    linked++;
  }
  if (linked) log("Tourism BC seed: explicit Google hotel links", { linked });
}

async function linkAllGoogleHotelsToRoomCarriers(log: (msg: string, obj?: object) => void) {
  try {
    const carriers = await db.execute<{ id: number; slug: string }>(sql`
      SELECT tl.id, tl.slug
      FROM tourism_listings tl
      WHERE tl.type = 'hotel'
        AND tl.status = 'active'
        AND COALESCE(tl.extra_info->>'room_carrier', 'false') = 'true'
        AND EXISTS (
          SELECT 1 FROM tourism_rooms tr
          WHERE tr.listing_id = tl.id AND tr.status = 'active'
        )
      ORDER BY tl.is_featured DESC, tl.id ASC
    `);
    const carrierRows = (carriers.rows ?? carriers) as { id: number; slug: string }[];
    if (!carrierRows.length) {
      log("Tourism BC seed: no room carriers for Google hotel linking");
      return;
    }

    const hotels = await db.execute<{ id: number; slug: string | null }>(sql`
      SELECT mb.id, mb.slug
      FROM map_businesses mb
      LEFT JOIN map_categories mc ON mc.id = mb.category_id
      WHERE mb.is_active = true
        AND (
          COALESCE(mb.store_type, '') ILIKE '%otel%'
          OR COALESCE(mb.store_type, '') ILIKE '%hotel%'
          OR COALESCE(mc.name, '') ILIKE '%otel%'
          OR COALESCE(mc.name, '') ILIKE '%hotel%'
          OR COALESCE(mb.google_places_extras::text, '') ILIKE '%lodging%'
        )
      ORDER BY mb.is_premium DESC, mb.rating DESC NULLS LAST, mb.created_at DESC
    `);
    const hotelRows = (hotels.rows ?? hotels) as { id: number; slug: string | null }[];
    let linked = 0;
    let idx = 0;
    for (const hotel of hotelRows) {
      const carrier = carrierRows[idx % carrierRows.length];
      await upsertGoogleHotelLink(String(hotel.id), hotel.slug ?? String(hotel.id), carrier.id);
      linked++;
      idx++;
    }
    log("Tourism BC seed: linked all Google hotels to BC room carriers", {
      linked,
      carriers: carrierRows.length,
      hotels: hotelRows.length,
    });
  } catch (err) {
    log("Tourism BC seed: linkAllGoogleHotelsToRoomCarriers skipped", { err: String(err) });
  }
}

async function linkBcHotelRoomsToGoogle(log: (msg: string, obj?: object) => void) {
  try {
    const carriers = await db.execute<{ id: number; slug: string; city: string | null; linked_slug: string | null }>(sql`
      SELECT id, slug, city, extra_info->>'linked_map_slug' AS linked_slug
      FROM tourism_listings
      WHERE type = 'hotel'
        AND COALESCE(extra_info->>'room_carrier', 'false') = 'true'
    `);
    let linked = 0;
    for (const row of (carriers.rows ?? carriers) as { id: number; slug: string; city: string | null; linked_slug: string | null }[]) {
      if (row.linked_slug && row.linked_slug !== "null") {
        const verify = await db.execute(sql`
          SELECT id FROM map_businesses
          WHERE is_active = true
            AND (slug = ${row.linked_slug} OR id::text = ${row.linked_slug})
          LIMIT 1
        `);
        if ((verify.rows ?? verify).length) continue;
      }

      const city = String(row.city ?? "").trim();
      if (!city) continue;

      const mb = await db.execute<{ id: number; slug: string | null }>(sql`
        SELECT mb.id, mb.slug
        FROM map_businesses mb
        LEFT JOIN map_cities mc ON mc.id = mb.city_id
        LEFT JOIN map_districts md ON md.id = mb.district_id
        WHERE mb.is_active = true
          AND (
            COALESCE(mc.name, '') ILIKE ${`%${city}%`}
            OR COALESCE(md.name, '') ILIKE ${`%${city}%`}
            OR COALESCE(mb.address, '') ILIKE ${`%${city}%`}
          )
          AND (
            COALESCE(mb.store_type, '') ILIKE '%otel%'
            OR COALESCE(mb.store_type, '') ILIKE '%hotel%'
            OR COALESCE(mb.google_places_extras::text, '') ILIKE '%lodging%'
          )
          AND NOT EXISTS (
            SELECT 1 FROM tourism_listings tl2
            WHERE tl2.id <> ${row.id}
              AND tl2.extra_info->>'linked_map_business_id' = mb.id::text
          )
        ORDER BY mb.is_premium DESC, mb.rating DESC NULLS LAST, mb.created_at DESC
        LIMIT 1
      `);
      const hit = (mb.rows ?? mb)[0] as { id: number; slug: string | null } | undefined;
      if (!hit) continue;
      await db.execute(sql`
        UPDATE tourism_listings SET
          extra_info = COALESCE(extra_info, '{}'::jsonb) || ${JSON.stringify({
            linked_map_business_id: String(hit.id),
            linked_map_slug: hit.slug ?? String(hit.id),
          })}::jsonb,
          updated_at = NOW()
        WHERE id = ${row.id}
      `);
      linked++;
    }
    log("Tourism BC seed: linked hotel room carriers to Google map businesses", { linked });
  } catch (err) {
    log("Tourism BC seed: linkBcHotelRoomsToGoogle skipped", { err: String(err) });
  }
}

async function seedDestinations(log: (msg: string, obj?: object) => void) {
  const destinations = SEED.destinations ?? [];
  if (!destinations.length) return;

  let upserted = 0;
  for (let i = 0; i < destinations.length; i++) {
    const d = destinations[i];
    const extraInfo = { bc_seed: SEED.seedVersion, demo: "true" };
    await db.execute(sql`
      INSERT INTO tourism_destinations (
        title, slug, image_url, excerpt, detail_title, gallery, city_match, extra_info, sort_order, is_active
      ) VALUES (
        ${d.title}, ${d.slug}, ${d.image}, ${d.excerpt}, ${d.detailTitle},
        ${JSON.stringify(d.gallery ?? [])}::jsonb,
        ${JSON.stringify(d.cityMatch ?? [d.title])}::jsonb,
        ${JSON.stringify(extraInfo)}::jsonb,
        ${i + 1}, true
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        image_url = EXCLUDED.image_url,
        excerpt = EXCLUDED.excerpt,
        detail_title = EXCLUDED.detail_title,
        gallery = EXCLUDED.gallery,
        city_match = EXCLUDED.city_match,
        extra_info = EXCLUDED.extra_info,
        sort_order = EXCLUDED.sort_order,
        is_active = true,
        updated_at = NOW()
    `);
    upserted++;
  }
  log("Tourism BC seed: destinations upserted", { upserted, version: SEED.seedVersion });
}

async function refreshListingSeedMeta(log: (msg: string, obj?: object) => void) {
  for (const l of SEED.listings) {
    const extraPatch: Record<string, unknown> = {
      bc_seed: SEED.seedVersion,
      bc_source: "booking-core-v4.0.2",
    };
    if (l.type === "hotel") {
      extraPatch.room_carrier = Boolean(l.roomCarrier ?? true);
      if (l.linkedMapSlug) extraPatch.linked_map_slug = l.linkedMapSlug;
    }
    await db.execute(sql`
      UPDATE tourism_listings SET
        extra_info = COALESCE(extra_info, '{}'::jsonb) || ${JSON.stringify(extraPatch)}::jsonb,
        updated_at = NOW()
      WHERE slug = ${l.slug}
    `);
  }
  log("Tourism BC seed: listing meta refreshed", { version: SEED.seedVersion });
}

export async function seedTourismBcDemoIfNeeded(logger?: {
  info: (msg: string, obj?: object) => void;
  error: (obj: object, msg: string) => void;
}) {
  const log = (msg: string, obj?: object) =>
    logger ? logger.info(msg, obj ?? {}) : console.log(msg, obj ?? "");
  const logErr = (msg: string, err: unknown) =>
    logger ? logger.error({ err }, msg) : console.error(msg, err);

  try {
    await ensureTourismTables(logger);
    await seedDestinations(log);

    const expected = SEED.listings.length;
    const countRes = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count FROM tourism_listings
      WHERE extra_info->>'bc_seed' = ${SEED.seedVersion}
    `);
    const existing = parseInt((countRes.rows ?? countRes)[0]?.count ?? "0", 10);

    await refreshListingSeedMeta(log);
    await ensureHotelRoomsFromSeed(log);
    await ensureDemoAvailabilityBlocks(log);
    await linkExplicitGoogleHotels(log);
    await linkAllGoogleHotelsToRoomCarriers(log);
    await linkBcHotelRoomsToGoogle(log);

    if (existing >= expected) {
      log("Tourism BC seed: already seeded, maintenance complete", { existing, expected, version: SEED.seedVersion });
      return { skipped: true, listings: existing, vendors: SEED.vendors.length, version: SEED.seedVersion };
    }

    log("Tourism BC seed: inserting demo vendors and listings", {
      version: SEED.seedVersion,
      vendors: SEED.vendors.length,
      listings: expected,
    });

    const vendorIdBySlug: Record<string, number> = {};

    for (const v of SEED.vendors) {
      const existingVendor = await db.execute<{ id: number }>(sql`
        SELECT id FROM vendors WHERE slug = ${v.slug} LIMIT 1
      `);
      const row = (existingVendor.rows ?? existingVendor)[0] as { id: number } | undefined;
      if (row?.id) {
        vendorIdBySlug[v.slug] = row.id;
        continue;
      }
      const inserted = await db.execute<{ id: number }>(sql`
        INSERT INTO vendors (
          name, slug, description, image_url, city, vendor_type, provider_type, provider_subtype,
          application_status, status, active, is_open, featured, created_at, updated_at
        ) VALUES (
          ${v.name}, ${v.slug},
          ${"Booking Core v4 demo turizm işletmesi — Yekpare vitrin verisi"},
          ${v.image ?? null}, ${v.city},
          'turizm', 'turizm', ${v.subtype},
          'approved', 'approved', true, true, true, NOW(), NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          image_url = COALESCE(EXCLUDED.image_url, vendors.image_url),
          vendor_type = 'turizm',
          provider_type = 'turizm',
          active = true,
          updated_at = NOW()
        RETURNING id
      `);
      const ins = (inserted.rows ?? inserted)[0] as { id: number };
      vendorIdBySlug[v.slug] = ins.id;
    }

    let insertedListings = 0;
    let insertedRooms = 0;

    for (const l of SEED.listings) {
      const slugCheck = await db.execute(sql`
        SELECT id FROM tourism_listings WHERE slug = ${l.slug} LIMIT 1
      `);
      if ((slugCheck.rows ?? slugCheck).length > 0) continue;

      const vendorId = vendorIdBySlug[l.vendorSlug] ?? null;
      const extraInfo = {
        bc_seed: SEED.seedVersion,
        bc_source: "booking-core-v4.0.2",
        demo: "true",
        room_carrier: l.type === "hotel" ? Boolean(l.roomCarrier ?? true) : false,
        linked_map_slug: l.linkedMapSlug ?? null,
      };

      const ins = await db.execute<{ id: number }>(sql`
        INSERT INTO tourism_listings (
          type, title, slug, description, vendor_id, city, district, address, lat, lng,
          image_url, gallery, price, sale_price, price_unit, star_rating, rating, review_count,
          capacity, amenities, features, extra_info, status, is_featured
        ) VALUES (
          ${l.type}, ${l.title}, ${l.slug}, ${l.description},
          ${vendorId}, ${l.city}, ${l.district ?? null}, ${l.address ?? null},
          ${l.lat ?? null}, ${l.lng ?? null},
          ${l.image},
          ${JSON.stringify(l.gallery ?? [])}::jsonb,
          ${l.price}, ${l.salePrice ?? null}, ${l.priceUnit},
          ${l.starRating ?? null}, ${l.rating ?? 4.5}, ${l.reviewCount ?? 0},
          ${l.capacity ?? null},
          ${JSON.stringify(l.amenities ?? [])}::jsonb,
          ${JSON.stringify(l.features ?? {})}::jsonb,
          ${JSON.stringify(extraInfo)}::jsonb,
          'active', ${Boolean(l.isFeatured)}
        )
        RETURNING id
      `);
      const listingId = ((ins.rows ?? ins)[0] as { id: number }).id;
      insertedListings++;

      if (l.type === "hotel" && Array.isArray(l.rooms)) {
        await insertRoomsForListing(listingId, l.rooms);
        insertedRooms += l.rooms.length;
      }
    }

    await ensureHotelRoomsFromSeed(log);
    await ensureDemoAvailabilityBlocks(log);
    await linkExplicitGoogleHotels(log);
    await linkAllGoogleHotelsToRoomCarriers(log);
    await linkBcHotelRoomsToGoogle(log);

    log("Tourism BC seed: complete", {
      version: SEED.seedVersion,
      listings: insertedListings,
      rooms: insertedRooms,
      vendors: Object.keys(vendorIdBySlug).length,
    });

    return {
      skipped: false,
      listings: insertedListings,
      rooms: insertedRooms,
      vendors: Object.keys(vendorIdBySlug).length,
      version: SEED.seedVersion,
    };
  } catch (err) {
    logErr("Tourism BC seed failed", err);
    throw err;
  }
}
