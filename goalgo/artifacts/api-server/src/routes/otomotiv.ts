import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import {
  importOtomotivMapBusinesses,
  listOtomotivMapImportCandidates,
} from "../lib/otomotiv-map-import.js";
import { syncOtomotivBusinessToMap } from "../lib/otomotiv-map-sync.js";
import {
  searchOtomotivServiceCategories,
  OTOMOTIV_SERVICE_CATEGORY_ROWS,
} from "../data/otomotiv-service-categories-data.js";
import { findOtomotivServiceCategoryBySlug } from "../data/otomotiv-service-categories-data.js";

const router = Router();

const BUSINESS_TYPES = ["galeri", "yedek_parca", "cikma", "servis", "yikama", "lastik", "genel"] as const;

async function syncOtomotivRowById(id: number): Promise<void> {
  const r = await db.execute(sql`
    SELECT id, map_business_id, name, slug, business_type, servis_category_slug, city, district, phone, address,
           image_url, description, google_place_id, is_featured, status
    FROM otomotiv_businesses WHERE id = ${id} LIMIT 1
  `);
  const row = r.rows[0];
  if (row) await syncOtomotivBusinessToMap(row as Parameters<typeof syncOtomotivBusinessToMap>[0]);
}

/* — PUBLIC (stub / read) ─────────────────────────────── */

router.get("/otomotiv/categories", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`
      SELECT id, slug, label, description, icon, sort_order
      FROM otomotiv_categories
      WHERE is_active = true
      ORDER BY sort_order ASC, label ASC
    `);
    res.json({ categories: r.rows });
  } catch {
    res.json({ categories: [], _stub: true });
  }
});

router.get("/otomotiv/servis/categories", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  try {
    if (q) {
      const hits = searchOtomotivServiceCategories(q);
      res.json({ categories: hits, groups: null, query: q });
      return;
    }
    const r = await db.execute(sql`
      SELECT id, slug, name, group_slug, group_name, store_type, sort_order, group_sort_order, tags, icon
      FROM otomotiv_service_categories
      WHERE is_active = true
      ORDER BY group_sort_order ASC, sort_order ASC, name ASC
    `);
    const rows = r.rows.length ? r.rows : OTOMOTIV_SERVICE_CATEGORY_ROWS;
    res.json({ categories: rows, query: null });
  } catch {
    const hits = q ? searchOtomotivServiceCategories(q) : OTOMOTIV_SERVICE_CATEGORY_ROWS;
    res.json({ categories: hits, _fallback: true, query: q || null });
  }
});

router.get("/otomotiv/servis/categories/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug ?? "").trim().toLowerCase();
  try {
    const r = await db.execute(sql`
      SELECT id, slug, name, group_slug, group_name, store_type, sort_order, group_sort_order, tags, icon
      FROM otomotiv_service_categories
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    `);
    if (r.rows[0]) {
      res.json({ category: r.rows[0] });
      return;
    }
  } catch {
    /* fallback */
  }
  const hit = findOtomotivServiceCategoryBySlug(slug);
  if (!hit) {
    res.status(404).json({ error: "Kategori bulunamadı" });
    return;
  }
  res.json({
    category: {
      slug: hit.category.slug,
      name: hit.category.name,
      group_slug: hit.group.slug,
      group_name: hit.group.name,
      store_type: hit.category.storeType,
      tags: hit.category.tags,
      icon: hit.category.icon ?? null,
    },
  });
});

router.get("/otomotiv/brands", async (req, res): Promise<void> => {
  const vehicleClass = String(req.query.vehicle_class ?? "").trim();
  try {
    const r = vehicleClass
      ? await db.execute(sql`
          SELECT id, name, slug, country, logo_url, vehicle_class, sort_order
          FROM vehicle_brands
          WHERE is_active = true AND vehicle_class = ${vehicleClass}
          ORDER BY sort_order ASC, name ASC
        `)
      : await db.execute(sql`
          SELECT id, name, slug, country, logo_url, vehicle_class, sort_order
          FROM vehicle_brands
          WHERE is_active = true
          ORDER BY sort_order ASC, name ASC
        `);
    res.json({ brands: r.rows });
  } catch {
    res.json({ brands: [], _stub: true });
  }
});

router.get("/otomotiv/models", async (req, res): Promise<void> => {
  const brandId = parseInt(String(req.query.brand_id ?? ""), 10);
  if (!Number.isFinite(brandId)) {
    res.status(400).json({ error: "brand_id gerekli" });
    return;
  }
  try {
    const r = await db.execute(sql`
      SELECT id, brand_id, name, slug, year_from, year_to, vehicle_class
      FROM vehicle_models
      WHERE brand_id = ${brandId} AND is_active = true
      ORDER BY name ASC
    `);
    res.json({ models: r.rows });
  } catch {
    res.json({ models: [], _stub: true });
  }
});

router.get("/otomotiv/listings", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const {
    type,
    kind,
    business_type,
    city,
    brand,
    brand_id,
    model,
    model_id,
    fuel,
    transmission,
    price_min,
    price_max,
    year_min,
    year_max,
    km_min,
    km_max,
    is_zero_km,
    page = "1",
    limit = "20",
  } = q;
  const listingKind = type || kind || "vehicle";
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * lim;
  try {
    const conditions: string[] = ["ol.status = 'active'", `ol.listing_kind = '${String(listingKind).replace(/'/g, "")}'`];
    if (city) conditions.push(`ob.city ILIKE '%${city.replace(/'/g, "''")}%'`);
    if (business_type) conditions.push(`ob.business_type = '${business_type.replace(/'/g, "")}'`);
    if (brand_id && Number.isFinite(parseInt(brand_id, 10))) {
      conditions.push(`ol.brand_id = ${parseInt(brand_id, 10)}`);
    } else if (brand) {
      conditions.push(`(vb.slug = '${brand.replace(/'/g, "''")}' OR vb.name ILIKE '%${brand.replace(/'/g, "''")}%')`);
    }
    if (model_id && Number.isFinite(parseInt(model_id, 10))) {
      conditions.push(`ol.model_id = ${parseInt(model_id, 10)}`);
    } else if (model) {
      conditions.push(`(vm.slug = '${model.replace(/'/g, "''")}' OR vm.name ILIKE '%${model.replace(/'/g, "''")}%')`);
    }
    if (fuel) conditions.push(`ol.fuel ILIKE '%${fuel.replace(/'/g, "''")}%'`);
    if (transmission) conditions.push(`ol.transmission ILIKE '%${transmission.replace(/'/g, "''")}%'`);
    if (price_min) conditions.push(`ol.price >= ${parseFloat(price_min) || 0}`);
    if (price_max) conditions.push(`ol.price <= ${parseFloat(price_max) || 0}`);
    if (year_min) conditions.push(`ol.year >= ${parseInt(year_min, 10) || 0}`);
    if (year_max) conditions.push(`ol.year <= ${parseInt(year_max, 10) || 9999}`);
    if (km_min) conditions.push(`ol.km >= ${parseInt(km_min, 10) || 0}`);
    if (km_max) conditions.push(`ol.km <= ${parseInt(km_max, 10) || 999999999}`);
    if (is_zero_km === "1" || is_zero_km === "true") conditions.push(`ol.is_zero_km = true`);
    if (is_zero_km === "0" || is_zero_km === "false") conditions.push(`ol.is_zero_km = false`);

    const where = `WHERE ${conditions.join(" AND ")}`;
    const r = await db.execute(sql.raw(`
      SELECT ol.*, ob.name AS business_name, ob.slug AS business_slug, ob.business_type,
        ob.city AS business_city, ob.district AS business_district, ob.phone AS business_phone,
        vb.name AS brand_name, vb.slug AS brand_slug,
        vm.name AS model_name, vm.slug AS model_slug
      FROM otomotiv_listings ol
      JOIN otomotiv_businesses ob ON ob.id = ol.business_id AND ob.status = 'active'
      LEFT JOIN vehicle_brands vb ON vb.id = ol.brand_id
      LEFT JOIN vehicle_models vm ON vm.id = ol.model_id
      ${where}
      ORDER BY ol.is_featured DESC, ol.created_at DESC
      LIMIT ${lim} OFFSET ${offset}
    `));
    const countR = await db.execute(sql.raw(`
      SELECT COUNT(*)::int AS total
      FROM otomotiv_listings ol
      JOIN otomotiv_businesses ob ON ob.id = ol.business_id AND ob.status = 'active'
      LEFT JOIN vehicle_brands vb ON vb.id = ol.brand_id
      LEFT JOIN vehicle_models vm ON vm.id = ol.model_id
      ${where}
    `));
    const total = Number((countR.rows[0] as { total?: number })?.total ?? 0);
    res.json({ listings: r.rows, total, page: pageNum, limit: lim });
  } catch (e) {
    res.json({ listings: [], total: 0, page: pageNum, limit: lim, _stub: true, error: String((e as Error).message) });
  }
});

router.get("/otomotiv/listings/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ error: "slug gerekli" });
    return;
  }
  try {
    const r = await db.execute(sql`
      SELECT ol.*, ob.name AS business_name, ob.slug AS business_slug, ob.business_type,
        ob.city AS business_city, ob.district AS business_district, ob.phone AS business_phone,
        ob.email AS business_email, ob.address AS business_address, ob.image_url AS business_image_url,
        vb.name AS brand_name, vb.slug AS brand_slug,
        vm.name AS model_name, vm.slug AS model_slug
      FROM otomotiv_listings ol
      JOIN otomotiv_businesses ob ON ob.id = ol.business_id
      LEFT JOIN vehicle_brands vb ON vb.id = ol.brand_id
      LEFT JOIN vehicle_models vm ON vm.id = ol.model_id
      WHERE ol.slug = ${slug} AND ol.status = 'active'
      LIMIT 1
    `);
    if (!r.rows.length) {
      res.status(404).json({ error: "İlan bulunamadı" });
      return;
    }
    res.json({ listing: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

/* — ADMIN ─────────────────────────────────────────────── */

router.use("/otomotiv/admin", (req, res, next) => {
  if (denyUnlessAdminMaintenance(req, res, "otomotiv")) next();
});

router.get("/otomotiv/admin/business-types", (_req, res): void => {
  res.json({
    types: BUSINESS_TYPES.map((t) => ({ value: t, label: businessTypeLabel(t) })),
  });
});

router.get("/otomotiv/admin/businesses", async (req, res): Promise<void> => {
  const { business_type, status, q, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * lim;
  try {
    const conditions: string[] = ["1=1"];
    if (business_type) conditions.push(`business_type = '${business_type.replace(/'/g, "")}'`);
    if (status) conditions.push(`status = '${status.replace(/'/g, "")}'`);
    if (q) conditions.push(`(name ILIKE '%${q.replace(/'/g, "''")}%' OR city ILIKE '%${q.replace(/'/g, "''")}%')`);
    const where = `WHERE ${conditions.join(" AND ")}`;
    const r = await db.execute(sql.raw(`
      SELECT * FROM otomotiv_businesses ${where}
      ORDER BY created_at DESC
      LIMIT ${lim} OFFSET ${offset}
    `));
    const countR = await db.execute(sql.raw(`SELECT COUNT(*)::int AS total FROM otomotiv_businesses ${where}`));
    const total = Number((countR.rows[0] as { total?: number })?.total ?? 0);
    res.json({ businesses: r.rows, total, page: pageNum });
  } catch (e) {
    res.json({ businesses: [], total: 0, page: pageNum, _stub: true, error: String((e as Error).message) });
  }
});

router.post("/otomotiv/admin/businesses", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const slug = String(b.slug ?? slugify(name)).trim();
  const businessType = String(b.business_type ?? "genel");
  if (!name) {
    res.status(400).json({ error: "İşletme adı gerekli" });
    return;
  }
  if (!BUSINESS_TYPES.includes(businessType as (typeof BUSINESS_TYPES)[number])) {
    res.status(400).json({ error: "Geçersiz işletme türü" });
    return;
  }
  try {
    const servisCategorySlug =
      businessType === "servis" ? String(b.servis_category_slug ?? "").trim() || null : null;
    const r = await db.execute(sql`
      INSERT INTO otomotiv_businesses (name, slug, business_type, servis_category_slug, city, district, phone, email, address, description, status)
      VALUES (
        ${name}, ${slug}, ${businessType}, ${servisCategorySlug},
        ${String(b.city ?? "") || null}, ${String(b.district ?? "") || null},
        ${String(b.phone ?? "") || null}, ${String(b.email ?? "") || null},
        ${String(b.address ?? "") || null}, ${String(b.description ?? "") || null},
        ${String(b.status ?? "pending")}
      )
      RETURNING *
    `);
    const business = r.rows[0] as { id?: number; status?: string };
    if (business?.id && business.status === "active") {
      await syncOtomotivRowById(business.id);
    }
    res.json({ business: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.put("/otomotiv/admin/businesses/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const b = req.body as Record<string, unknown>;
  try {
    await db.execute(sql`
      UPDATE otomotiv_businesses SET
        name = COALESCE(${b.name as string | null}, name),
        business_type = COALESCE(${b.business_type as string | null}, business_type),
        servis_category_slug = COALESCE(${b.servis_category_slug as string | null}, servis_category_slug),
        city = COALESCE(${b.city as string | null}, city),
        district = COALESCE(${b.district as string | null}, district),
        phone = COALESCE(${b.phone as string | null}, phone),
        email = COALESCE(${b.email as string | null}, email),
        address = COALESCE(${b.address as string | null}, address),
        description = COALESCE(${b.description as string | null}, description),
        status = COALESCE(${b.status as string | null}, status),
        is_featured = COALESCE(${b.is_featured !== undefined ? Boolean(b.is_featured) : null}, is_featured),
        working_hours_json = COALESCE(${b.working_hours_json ? JSON.stringify(b.working_hours_json) : null}::jsonb, working_hours_json),
        cargo_settings_json = COALESCE(${b.cargo_settings_json ? JSON.stringify(b.cargo_settings_json) : null}::jsonb, cargo_settings_json),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    await syncOtomotivRowById(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.delete("/otomotiv/admin/businesses/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    await db.execute(sql`UPDATE otomotiv_businesses SET status = 'deleted', updated_at = NOW() WHERE id = ${id}`);
    await syncOtomotivRowById(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.get("/otomotiv/admin/brands", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`SELECT * FROM vehicle_brands ORDER BY sort_order ASC, name ASC`);
    res.json({ brands: r.rows });
  } catch {
    res.json({ brands: [], _stub: true });
  }
});

router.post("/otomotiv/admin/brands", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "Marka adı gerekli" });
    return;
  }
  const slug = String(b.slug ?? slugify(name));
  try {
    const r = await db.execute(sql`
      INSERT INTO vehicle_brands (name, slug, country, vehicle_class, sort_order)
      VALUES (${name}, ${slug}, ${String(b.country ?? "") || null}, ${String(b.vehicle_class ?? "otomobil")}, ${Number(b.sort_order) || 0})
      RETURNING *
    `);
    res.json({ brand: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.put("/otomotiv/admin/brands/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const b = req.body as Record<string, unknown>;
  try {
    await db.execute(sql`
      UPDATE vehicle_brands SET
        name = COALESCE(${b.name as string | null}, name),
        country = COALESCE(${b.country as string | null}, country),
        vehicle_class = COALESCE(${b.vehicle_class as string | null}, vehicle_class),
        is_active = COALESCE(${b.is_active !== undefined ? Boolean(b.is_active) : null}, is_active),
        sort_order = COALESCE(${b.sort_order !== undefined ? Number(b.sort_order) : null}, sort_order),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.delete("/otomotiv/admin/brands/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    await db.execute(sql`UPDATE vehicle_brands SET is_active = false, updated_at = NOW() WHERE id = ${id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.get("/otomotiv/admin/models", async (req, res): Promise<void> => {
  const brandId = parseInt(String(req.query.brand_id ?? ""), 10);
  try {
    const r = brandId
      ? await db.execute(sql`SELECT * FROM vehicle_models WHERE brand_id = ${brandId} ORDER BY name ASC`)
      : await db.execute(sql`
          SELECT vm.*, vb.name AS brand_name
          FROM vehicle_models vm
          JOIN vehicle_brands vb ON vb.id = vm.brand_id
          ORDER BY vb.name ASC, vm.name ASC
          LIMIT 500
        `);
    res.json({ models: r.rows });
  } catch {
    res.json({ models: [], _stub: true });
  }
});

router.post("/otomotiv/admin/models", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const brandId = parseInt(String(b.brand_id ?? ""), 10);
  const name = String(b.name ?? "").trim();
  if (!brandId || !name) {
    res.status(400).json({ error: "brand_id ve model adı gerekli" });
    return;
  }
  try {
    const r = await db.execute(sql`
      INSERT INTO vehicle_models (brand_id, name, slug, year_from, year_to, vehicle_class)
      VALUES (
        ${brandId}, ${name}, ${String(b.slug ?? slugify(name))},
        ${b.year_from ? Number(b.year_from) : null}, ${b.year_to ? Number(b.year_to) : null},
        ${String(b.vehicle_class ?? "otomobil")}
      )
      RETURNING *
    `);
    res.json({ model: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.get("/otomotiv/admin/listings", async (req, res): Promise<void> => {
  const { kind, business_id, page = "1" } = req.query as Record<string, string>;
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * 50;
  try {
    let where = sql`WHERE ol.status != 'deleted'`;
    if (kind) where = sql`${where} AND ol.listing_kind = ${kind}`;
    if (business_id) where = sql`${where} AND ol.business_id = ${parseInt(business_id, 10)}`;
    const r = await db.execute(sql`
      SELECT ol.*, ob.name AS business_name, ob.business_type, ob.city AS business_city,
        vb.name AS brand_name, vm.name AS model_name
      FROM otomotiv_listings ol
      JOIN otomotiv_businesses ob ON ob.id = ol.business_id
      LEFT JOIN vehicle_brands vb ON vb.id = ol.brand_id
      LEFT JOIN vehicle_models vm ON vm.id = ol.model_id
      ${where}
      ORDER BY ol.created_at DESC
      LIMIT 50 OFFSET ${offset}
    `);
    res.json({ listings: r.rows });
  } catch {
    res.json({ listings: [], _stub: true });
  }
});

router.post("/otomotiv/admin/listings", async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const businessId = parseInt(String(b.business_id ?? ""), 10);
  const title = String(b.title ?? "").trim();
  if (!businessId || !title) {
    res.status(400).json({ error: "business_id ve title gerekli" });
    return;
  }
  const slug = String(b.slug ?? slugify(title)).trim();
  try {
    const r = await db.execute(sql`
      INSERT INTO otomotiv_listings (
        business_id, listing_kind, title, slug, brand_id, model_id,
        year, km, fuel, transmission, condition, price, currency,
        is_zero_km, status, is_featured, photos_json, description
      ) VALUES (
        ${businessId},
        ${String(b.listing_kind ?? "vehicle")},
        ${title},
        ${slug},
        ${b.brand_id ? parseInt(String(b.brand_id), 10) : null},
        ${b.model_id ? parseInt(String(b.model_id), 10) : null},
        ${b.year ? parseInt(String(b.year), 10) : null},
        ${b.km ? parseInt(String(b.km), 10) : null},
        ${String(b.fuel ?? "") || null},
        ${String(b.transmission ?? "") || null},
        ${String(b.condition ?? "") || null},
        ${b.price != null && b.price !== "" ? Number(b.price) : null},
        ${String(b.currency ?? "TRY")},
        ${Boolean(b.is_zero_km)},
        ${String(b.status ?? "active")},
        ${Boolean(b.is_featured)},
        ${JSON.stringify(Array.isArray(b.photos_json) ? b.photos_json : [])}::jsonb,
        ${String(b.description ?? "") || null}
      )
      RETURNING *
    `);
    await db.execute(sql`
      UPDATE otomotiv_businesses
      SET listing_count = (SELECT COUNT(*)::int FROM otomotiv_listings WHERE business_id = ${businessId} AND status != 'deleted'),
          updated_at = NOW()
      WHERE id = ${businessId}
    `);
    res.json({ listing: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.put("/otomotiv/admin/listings/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const b = req.body as Record<string, unknown>;
  try {
    await db.execute(sql`
      UPDATE otomotiv_listings SET
        title = COALESCE(${b.title as string | null}, title),
        slug = COALESCE(${b.slug as string | null}, slug),
        brand_id = COALESCE(${b.brand_id !== undefined ? (b.brand_id ? parseInt(String(b.brand_id), 10) : null) : null}, brand_id),
        model_id = COALESCE(${b.model_id !== undefined ? (b.model_id ? parseInt(String(b.model_id), 10) : null) : null}, model_id),
        year = COALESCE(${b.year !== undefined ? (b.year ? parseInt(String(b.year), 10) : null) : null}, year),
        km = COALESCE(${b.km !== undefined ? (b.km ? parseInt(String(b.km), 10) : null) : null}, km),
        fuel = COALESCE(${b.fuel as string | null}, fuel),
        transmission = COALESCE(${b.transmission as string | null}, transmission),
        price = COALESCE(${b.price !== undefined ? (b.price != null && b.price !== "" ? Number(b.price) : null) : null}, price),
        is_zero_km = COALESCE(${b.is_zero_km !== undefined ? Boolean(b.is_zero_km) : null}, is_zero_km),
        status = COALESCE(${b.status as string | null}, status),
        is_featured = COALESCE(${b.is_featured !== undefined ? Boolean(b.is_featured) : null}, is_featured),
        photos_json = COALESCE(${b.photos_json ? JSON.stringify(b.photos_json) : null}::jsonb, photos_json),
        description = COALESCE(${b.description as string | null}, description),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.delete("/otomotiv/admin/listings/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const bizR = await db.execute(sql`SELECT business_id FROM otomotiv_listings WHERE id = ${id}`);
    const businessId = Number((bizR.rows[0] as { business_id?: number })?.business_id ?? 0);
    await db.execute(sql`UPDATE otomotiv_listings SET status = 'deleted', updated_at = NOW() WHERE id = ${id}`);
    if (businessId) {
      await db.execute(sql`
        UPDATE otomotiv_businesses
        SET listing_count = (SELECT COUNT(*)::int FROM otomotiv_listings WHERE business_id = ${businessId} AND status != 'deleted'),
            updated_at = NOW()
        WHERE id = ${businessId}
      `);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.get("/otomotiv/admin/services", async (req, res): Promise<void> => {
  const businessId = parseInt(String(req.query.business_id ?? ""), 10);
  try {
    const r = businessId
      ? await db.execute(sql`SELECT * FROM otomotiv_services WHERE business_id = ${businessId} ORDER BY sort_order ASC`)
      : await db.execute(sql`
          SELECT os.*, ob.name AS business_name, ob.business_type
          FROM otomotiv_services os
          JOIN otomotiv_businesses ob ON ob.id = os.business_id
          ORDER BY os.created_at DESC LIMIT 200
        `);
    res.json({ services: r.rows });
  } catch {
    res.json({ services: [], _stub: true });
  }
});

router.get("/otomotiv/admin/appointment-slots", async (req, res): Promise<void> => {
  const businessId = parseInt(String(req.query.business_id ?? ""), 10);
  try {
    const r = businessId
      ? await db.execute(sql`
          SELECT * FROM otomotiv_appointment_slots
          WHERE business_id = ${businessId}
          ORDER BY slot_date DESC, slot_time ASC LIMIT 200
        `)
      : await db.execute(sql`SELECT * FROM otomotiv_appointment_slots ORDER BY slot_date DESC LIMIT 100`);
    res.json({ slots: r.rows });
  } catch {
    res.json({ slots: [], _stub: true });
  }
});

router.get("/otomotiv/admin/map-import/candidates", async (req, res): Promise<void> => {
  const { business_type, q, city, page, limit } = req.query as Record<string, string>;
  try {
    const result = await listOtomotivMapImportCandidates({
      businessType: business_type ?? "galeri",
      q,
      city,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json(result);
  } catch (e) {
    res.json({ candidates: [], total: 0, _stub: true, error: String((e as Error).message) });
  }
});

router.post("/otomotiv/admin/map-import", async (req, res): Promise<void> => {
  const { map_business_ids, business_type } = req.body as { map_business_ids?: string[]; business_type?: string };
  if (!Array.isArray(map_business_ids) || map_business_ids.length === 0) {
    res.status(400).json({ error: "map_business_ids gerekli" });
    return;
  }
  try {
    const result = await importOtomotivMapBusinesses({
      mapBusinessIds: map_business_ids,
      businessType: business_type ?? "galeri",
    });
    for (const mapId of map_business_ids) {
      const found = await db.execute(sql`
        SELECT id FROM otomotiv_businesses WHERE map_business_id = ${mapId} LIMIT 1
      `);
      const obId = Number((found.rows[0] as { id?: number })?.id ?? 0);
      if (obId) await syncOtomotivRowById(obId);
    }
    res.json({
      ...result,
      message: `${result.imported} işletme otomotiv paneline aktarıldı, ${result.skipped} atlandı.`,
    });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

router.get("/otomotiv/admin/cargo-settings", async (req, res): Promise<void> => {
  const businessId = parseInt(String(req.query.business_id ?? ""), 10);
  try {
    if (businessId) {
      const r = await db.execute(sql`
        SELECT id, name, cargo_settings_json FROM otomotiv_businesses WHERE id = ${businessId}
      `);
      res.json({ settings: (r.rows[0] as { cargo_settings_json?: unknown })?.cargo_settings_json ?? {} });
      return;
    }
    const r = await db.execute(sql`
      SELECT id, name, business_type, cargo_settings_json
      FROM otomotiv_businesses
      WHERE business_type IN ('yedek_parca', 'cikma') AND status != 'deleted'
      ORDER BY name ASC
    `);
    res.json({ businesses: r.rows });
  } catch {
    res.json({ businesses: [], _stub: true });
  }
});

router.put("/otomotiv/admin/cargo-settings/:businessId", async (req, res): Promise<void> => {
  const businessId = parseInt(String(req.params.businessId), 10);
  const settings = req.body;
  try {
    await db.execute(sql`
      UPDATE otomotiv_businesses
      SET cargo_settings_json = ${JSON.stringify(settings)}::jsonb, updated_at = NOW()
      WHERE id = ${businessId}
    `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

function slugify(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function businessTypeLabel(t: string): string {
  const map: Record<string, string> = {
    galeri: "Oto Galeri",
    yedek_parca: "Yedek Parçacı",
    cikma: "Çıkma Parçacı",
    servis: "Oto Tamir Servisi",
    yikama: "Oto Yıkamacı",
    lastik: "Lastikçi",
    genel: "Genel Otomotiv",
  };
  return map[t] ?? t;
}

/* — SIGORTA (Faz 5 — lead yönlendirme, broker API sonrası genişler) — */

router.post("/otomotiv/sigorta/leads", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const leadType = String(body.lead_type ?? "kasko").trim();
  const allowed = ["trafik", "kasko", "trafik_kasko", "genel"];
  if (!allowed.includes(leadType)) {
    res.status(400).json({ error: "Geçersiz lead_type" });
    return;
  }
  const contactPhone = String(body.contact_phone ?? "").trim();
  const contactName = String(body.contact_name ?? "").trim();
  if (!contactPhone || !contactName) {
    res.status(400).json({ error: "Ad ve telefon zorunludur" });
    return;
  }
  try {
    const r = await db.execute(sql`
      INSERT INTO sigorta_leads (
        listing_id, lead_type, contact_name, contact_phone, contact_email,
        vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, message, source, status
      ) VALUES (
        ${body.listing_id != null ? Number(body.listing_id) : null},
        ${leadType},
        ${contactName},
        ${contactPhone},
        ${body.contact_email ? String(body.contact_email).trim() : null},
        ${body.vehicle_plate ? String(body.vehicle_plate).trim() : null},
        ${body.vehicle_brand ? String(body.vehicle_brand).trim() : null},
        ${body.vehicle_model ? String(body.vehicle_model).trim() : null},
        ${body.vehicle_year != null ? Number(body.vehicle_year) : null},
        ${body.message ? String(body.message).trim() : null},
        ${body.source ? String(body.source).trim() : "web"},
        'new'
      )
      RETURNING id, status, created_at
    `);
    res.status(201).json({ ok: true, lead: r.rows[0] });
  } catch (err) {
    console.error("[sigorta-lead]", err);
    res.status(503).json({
      error: "Sigorta lead kaydı şu an alınamıyor (migration 0081 gerekli olabilir)",
      _stub: true,
    });
  }
});

router.get("/otomotiv/sigorta/admin/agents", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "otomotiv")) return;
  try {
    const r = await db.execute(sql`
      SELECT id, name, slug, license_no, city, district, phone, email, status, is_featured, created_at
      FROM sigorta_agents
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ agents: r.rows });
  } catch {
    res.json({ agents: [], _stub: true });
  }
});

router.get("/otomotiv/sigorta/admin/leads", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "otomotiv")) return;
  try {
    const r = await db.execute(sql`
      SELECT id, agent_id, listing_id, lead_type, contact_name, contact_phone,
             vehicle_brand, vehicle_model, vehicle_year, status, source, created_at
      FROM sigorta_leads
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ leads: r.rows });
  } catch {
    res.json({ leads: [], _stub: true });
  }
});

export default router;
