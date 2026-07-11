/** Haritalar → Otomotiv paneli seçerek içe aktarma */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { OTOMOTIV_SERVIS_MAP_STORE_TYPES } from "./otomotiv-servis-config.js";

export type OtomotivMapImportBusinessType =
  | "galeri"
  | "yedek_parca"
  | "cikma"
  | "servis"
  | "yikama"
  | "lastik"
  | "genel";

export const OTOMOTIV_MAP_IMPORT_TYPES: {
  value: OtomotivMapImportBusinessType;
  label: string;
  storeTypes: string[];
}[] = [
  {
    value: "galeri",
    label: "Oto Galeri",
    storeTypes: ["otomotiv_galeri", "otomotiv_bayi", "hizmet_galeri"],
  },
  {
    value: "servis",
    label: "Oto Servis",
    storeTypes: OTOMOTIV_SERVIS_MAP_STORE_TYPES,
  },
  {
    value: "yikama",
    label: "Oto Yıkama",
    storeTypes: ["hizmet_yikama", "otomotiv_yikama"],
  },
  {
    value: "lastik",
    label: "Lastikçi",
    storeTypes: ["hizmet_lastik", "otomotiv_lastik"],
  },
  {
    value: "yedek_parca",
    label: "Yedek Parçacı",
    storeTypes: ["otomotiv_yedek_parca", "hizmet_parca"],
  },
  {
    value: "cikma",
    label: "Çıkma Parçacı",
    storeTypes: ["otomotiv_cikma"],
  },
  {
    value: "genel",
    label: "Genel Otomotiv",
    storeTypes: [],
  },
];

function storeTypeFilter(businessType: string): string {
  const cfg = OTOMOTIV_MAP_IMPORT_TYPES.find((t) => t.value === businessType);
  if (!cfg || cfg.storeTypes.length === 0) {
    return `AND (
      mb.store_type LIKE 'otomotiv_%'
      OR mb.store_type IN ('hizmet_tamir','hizmet_yikama','hizmet_lastik','hizmet_galeri')
      OR lower(COALESCE(mb.google_places_extras->>'primaryType','')) IN ('car_dealer','car_repair','car_wash','auto_parts_store')
      OR lower(COALESCE(mb.name,'')) LIKE '%galeri%'
      OR lower(COALESCE(mb.name,'')) LIKE '%oto %'
      OR lower(COALESCE(mb.name,'')) LIKE '%servis%'
    )`;
  }
  const list = cfg.storeTypes.map((s) => `'${s.replace(/'/g, "''")}'`).join(",");
  return `AND mb.store_type IN (${list})`;
}

async function isAlreadyImported(mapBusinessId: string, slug: string): Promise<boolean> {
  const safeId = mapBusinessId.replace(/'/g, "''");
  const safeSlug = slug.replace(/'/g, "''");
  const r = await db.execute(sql.raw(`
    SELECT id FROM otomotiv_businesses
    WHERE map_business_id = '${safeId}'
       OR slug = '${safeSlug}'
    LIMIT 1
  `));
  if (r.rows.length) return true;
  const flag = await db.execute(sql.raw(`
    SELECT id FROM map_businesses
    WHERE id = '${safeId}'
      AND COALESCE(google_places_extras->>'otomotivImported','') = 'true'
    LIMIT 1
  `));
  return flag.rows.length > 0;
}

export async function listOtomotivMapImportCandidates(opts: {
  businessType?: string;
  city?: string;
  q?: string;
  page?: number;
  limit?: number;
  excludeImported?: boolean;
}) {
  const businessType = String(opts.businessType ?? "galeri").trim().toLowerCase();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = (page - 1) * limit;
  const q = String(opts.q ?? "").trim().replace(/'/g, "''");
  const city = String(opts.city ?? "").trim().replace(/'/g, "''");

  const qWhere = q ? `AND (mb.name ILIKE '%${q}%' OR mb.address ILIKE '%${q}%' OR mb.slug ILIKE '%${q}%')` : "";
  const cityWhere = city ? `AND (COALESCE(mcity.name,'') ILIKE '%${city}%' OR mb.address ILIKE '%${city}%')` : "";
  const storeWhere = storeTypeFilter(businessType);
  const excludeWhere =
    opts.excludeImported !== false
      ? `AND COALESCE(mb.google_places_extras->>'otomotivImported','') <> 'true'
         AND NOT EXISTS (
           SELECT 1 FROM otomotiv_businesses ob
           WHERE ob.map_business_id = mb.id OR (mb.slug IS NOT NULL AND mb.slug <> '' AND ob.slug = mb.slug)
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
    SELECT mb.id, mb.name, mb.slug, mb.google_place_id, mb.store_type, mb.phone,
           COALESCE(mcity.name, '') AS city,
           COALESCE(mdist.name, '') AS district,
           COALESCE(mc.slug, '') AS category_slug,
           mb.address, mb.cover_photo_url, mb.photo_url
    ${baseFrom}
    ORDER BY mb.rating DESC NULLS LAST, mb.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `));
  const countR = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c ${baseFrom}`));
  return {
    candidates: rowsR.rows,
    total: Number((countR.rows[0] as { c?: number })?.c ?? 0),
    page,
    business_type: businessType,
  };
}

function slugify(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function createOtomotivBusinessFromMap(
  biz: Record<string, unknown>,
  businessType: OtomotivMapImportBusinessType,
): Promise<number | null> {
  const mapId = String(biz.id ?? "");
  const name = String(biz.name ?? "İşletme");
  let slug = String(biz.slug ?? slugify(name));
  if (!slug) slug = slugify(name);
  const city = String(biz.city ?? "") || null;
  const district = String(biz.district ?? "") || null;
  const phone = String(biz.phone ?? "") || null;
  const address = String(biz.address ?? "") || null;
  const imageUrl = String(biz.cover_photo_url ?? biz.photo_url ?? "") || null;
  const googlePlaceId = biz.google_place_id ? String(biz.google_place_id) : null;

  if (await isAlreadyImported(mapId, slug)) return null;

  const dupSlug = await db.execute(sql`SELECT id FROM otomotiv_businesses WHERE slug = ${slug} LIMIT 1`);
  if (dupSlug.rows.length) slug = `${slug}-${mapId.slice(0, 8)}`;

  const r = await db.execute(sql`
    INSERT INTO otomotiv_businesses (
      map_business_id, name, slug, business_type, city, district, phone, address,
      image_url, google_place_id, status
    ) VALUES (
      ${mapId}, ${name}, ${slug}, ${businessType},
      ${city}, ${district}, ${phone}, ${address},
      ${imageUrl}, ${googlePlaceId}, 'active'
    )
    RETURNING id
  `);
  const id = Number((r.rows[0] as { id?: number })?.id ?? 0);
  if (!id) return null;

  await db.execute(sql.raw(`
    UPDATE map_businesses
    SET google_places_extras = COALESCE(google_places_extras, '{}'::jsonb) || '{"otomotivImported":"true"}'::jsonb,
        updated_at = NOW()
    WHERE id = '${mapId.replace(/'/g, "''")}'
  `));
  return id;
}

export async function importOtomotivMapBusinesses(opts: {
  mapBusinessIds: string[];
  businessType?: string;
}) {
  const businessType = (opts.businessType ?? "galeri") as OtomotivMapImportBusinessType;
  const validTypes = OTOMOTIV_MAP_IMPORT_TYPES.map((t) => t.value);
  const type = validTypes.includes(businessType) ? businessType : "galeri";

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const mapId of opts.mapBusinessIds) {
    const safeId = mapId.replace(/'/g, "''");
    try {
      const bizR = await db.execute(sql.raw(`
        SELECT mb.*, COALESCE(mcity.name, '') AS city, COALESCE(mdist.name, '') AS district
        FROM map_businesses mb
        LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
        LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
        WHERE mb.id = '${safeId}' AND mb.is_active = true
        LIMIT 1
      `));
      if (!bizR.rows.length) {
        skipped += 1;
        continue;
      }
      const created = await createOtomotivBusinessFromMap(bizR.rows[0] as Record<string, unknown>, type);
      if (created) imported += 1;
      else skipped += 1;
    } catch (e) {
      skipped += 1;
      errors.push(`${mapId}: ${String((e as Error).message)}`);
    }
  }

  return { imported, skipped, errors };
}
