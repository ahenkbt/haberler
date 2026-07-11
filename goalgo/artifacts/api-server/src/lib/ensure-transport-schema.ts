import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensured = false;

/** transport_requests ve ilişkili tablolar — migrate uçları + admin listesi için idempotent DDL. */
export async function ensureTransportSchema(): Promise<void> {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transport_vehicles (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER,
      owner_id INTEGER NOT NULL,
      vehicle_type TEXT NOT NULL,
      brand TEXT, model TEXT, plate_number TEXT,
      capacity INTEGER NOT NULL DEFAULT 1,
      description TEXT, photo_url TEXT,
      driver_name TEXT, driver_phone TEXT, service_area TEXT,
      documents_json JSONB DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_available BOOLEAN NOT NULL DEFAULT true,
      city TEXT, lat REAL, lng REAL,
      rating REAL NOT NULL DEFAULT 0,
      trip_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ride_offers (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER,
      driver_id INTEGER NOT NULL,
      vehicle_id INTEGER,
      from_city TEXT NOT NULL, to_city TEXT NOT NULL,
      from_address TEXT, to_address TEXT,
      departure_time TIMESTAMP NOT NULL,
      total_seats INTEGER NOT NULL DEFAULT 3,
      available_seats INTEGER NOT NULL DEFAULT 3,
      price_per_seat DECIMAL(10,2) NOT NULL,
      description TEXT,
      allow_smoke BOOLEAN NOT NULL DEFAULT false,
      allow_pet BOOLEAN NOT NULL DEFAULT false,
      allow_luggage BOOLEAN NOT NULL DEFAULT true,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ride_bookings (
      id SERIAL PRIMARY KEY,
      offer_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      seats INTEGER NOT NULL DEFAULT 1,
      total_price DECIMAL(10,2) NOT NULL,
      pickup_note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transport_requests (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER,
      request_type TEXT NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      from_address TEXT NOT NULL,
      from_lat REAL, from_lng REAL,
      to_address TEXT, to_lat REAL, to_lng REAL,
      scheduled_at TIMESTAMP,
      note TEXT,
      extra_data JSONB,
      estimated_price DECIMAL(10,2),
      final_price DECIMAL(10,2),
      assigned_driver_id INTEGER,
      assigned_vehicle_id INTEGER,
      tracking_code TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      status_history JSONB DEFAULT '[]'::jsonb,
      driver_rating INTEGER,
      customer_rating INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transport_notifications (
      id SERIAL PRIMARY KEY,
      recipient_id INTEGER NOT NULL,
      recipient_type TEXT NOT NULL DEFAULT 'customer',
      request_id INTEGER,
      offer_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transport_request_status_events (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'api',
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS vendor_id INTEGER`);
  await db.execute(sql`ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS driver_name TEXT`);
  await db.execute(sql`ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS driver_phone TEXT`);
  await db.execute(sql`ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS service_area TEXT`);
  await db.execute(sql`ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS documents_json JSONB DEFAULT '{}'::jsonb`);
  await db.execute(sql`ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE ride_offers ADD COLUMN IF NOT EXISTS vendor_id INTEGER`);
  await db.execute(sql`ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS vendor_id INTEGER`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS transport_vehicles_vendor_id_idx ON transport_vehicles (vendor_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS ride_offers_vendor_id_idx ON ride_offers (vendor_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS transport_requests_vendor_id_idx ON transport_requests (vendor_id)`);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS transport_requests_status_created_at_idx
    ON transport_requests (status, created_at DESC)
  `);

  ensured = true;
}
