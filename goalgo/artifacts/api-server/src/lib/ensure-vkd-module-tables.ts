import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

let ensurePromise: Promise<void> | null = null;

/** Production'da drizzle migrate gecikse bile VKD modül tablolarını oluşturur. */
export function ensureVkdModuleTables(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vkd_msb_sehitler (
        id serial PRIMARY KEY NOT NULL,
        msb_id text NOT NULL,
        name text NOT NULL,
        rank text DEFAULT '' NOT NULL,
        registry text DEFAULT '' NOT NULL,
        notice text DEFAULT '' NOT NULL,
        martyrdom_date text DEFAULT '' NOT NULL,
        year integer,
        image_path text DEFAULT '' NOT NULL,
        search_text text DEFAULT '' NOT NULL,
        first_seen_at text DEFAULT '' NOT NULL,
        updated_at text DEFAULT '' NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS vkd_msb_sehitler_msb_id_idx ON vkd_msb_sehitler (msb_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS vkd_msb_sehitler_year_idx ON vkd_msb_sehitler (year);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS vkd_msb_sehitler_search_idx ON vkd_msb_sehitler (search_text);
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vkd_canakkale_sehitleri (
        id serial PRIMARY KEY NOT NULL,
        serial_no integer NOT NULL,
        name text NOT NULL,
        father_name text DEFAULT '' NOT NULL,
        birth_year integer,
        nickname text DEFAULT '' NOT NULL,
        province text DEFAULT '' NOT NULL,
        district text DEFAULT '' NOT NULL,
        bucak text DEFAULT '' NOT NULL,
        village text DEFAULT '' NOT NULL,
        branch_class text DEFAULT '' NOT NULL,
        rank text DEFAULT '' NOT NULL,
        unit_text text DEFAULT '' NOT NULL,
        martyrdom_place text DEFAULT '' NOT NULL,
        martyrdom_date text DEFAULT '' NOT NULL,
        search_text text DEFAULT '' NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_serial_idx ON vkd_canakkale_sehitleri (serial_no);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_province_idx ON vkd_canakkale_sehitleri (province);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_district_idx ON vkd_canakkale_sehitleri (province, district);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_search_idx ON vkd_canakkale_sehitleri (search_text);
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vkd_data_sync_markers (
        key text PRIMARY KEY NOT NULL,
        version integer DEFAULT 0 NOT NULL,
        record_count integer DEFAULT 0 NOT NULL,
        updated_at text DEFAULT '' NOT NULL
      );
    `);
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });
  return ensurePromise;
}

export function isMissingRelationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /relation .* does not exist|does not exist/i.test(msg);
}
