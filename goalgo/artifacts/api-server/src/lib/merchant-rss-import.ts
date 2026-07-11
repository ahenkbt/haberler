import { readFile } from "node:fs/promises";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { parseMerchantRssXml, type MerchantRssItem } from "./merchant-rss-parse.js";
import {
  ensureVendorMenuCategoryForEcommerce,
  ensureCustomVendorMenuCategory,
  resolveEcommerceCategoryIdByPath,
  seedEcommerceProductCategoriesIfNeeded,
} from "./ecommerce-product-categories.js";

export type { MerchantRssItem } from "./merchant-rss-parse.js";
export { parseMerchantRssXml } from "./merchant-rss-parse.js";

type Row = Record<string, unknown>;
const r = <T>(res: { rows?: T[] } | T[]): T[] =>
  (Array.isArray(res) ? res : (res.rows ?? [])) as T[];

export type MerchantRssImportResult = {
  vendorId: number;
  categories: number;
  items: number;
  skipped: number;
};

async function resolveMenuCategoryForImport(
  vendorId: number,
  categoryPath: string,
  cache: Map<string, number>,
): Promise<number | null> {
  const key = categoryPath.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const ecommerceCategoryId = await resolveEcommerceCategoryIdByPath(categoryPath);
  let menuCategoryId: number | null = null;
  if (ecommerceCategoryId) {
    menuCategoryId = await ensureVendorMenuCategoryForEcommerce(vendorId, ecommerceCategoryId);
  } else if (categoryPath.trim()) {
    menuCategoryId = await ensureCustomVendorMenuCategory(vendorId, categoryPath.trim());
  }
  if (menuCategoryId) cache.set(key, menuCategoryId);
  return menuCategoryId;
}

export async function importMerchantRssIntoVendor(
  vendorId: number,
  items: MerchantRssItem[],
  opts?: { clearExisting?: boolean },
): Promise<MerchantRssImportResult> {
  await db.execute(sql`
    ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS images TEXT[];
    ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER;
  `);
  await seedEcommerceProductCategoriesIfNeeded();

  if (opts?.clearExisting) {
    await db.execute(sql`DELETE FROM vendor_menu_items WHERE vendor_id = ${vendorId}`);
    await db.execute(sql`DELETE FROM vendor_menu_categories WHERE vendor_id = ${vendorId}`);
  }

  const catCache = new Map<string, number>();
  let categoryCount = 0;
  const uniquePaths = [...new Set(items.map((i) => i.category).filter(Boolean))];
  for (const path of uniquePaths) {
    const id = await resolveMenuCategoryForImport(vendorId, path, catCache);
    if (id) categoryCount++;
  }

  let itemCount = 0;
  let skipped = 0;
  const BATCH = 80;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    for (const item of slice) {
      const menuCategoryId = await resolveMenuCategoryForImport(vendorId, item.category, catCache);
      if (!menuCategoryId) {
        skipped++;
        continue;
      }

      const ecommerceCategoryId = await resolveEcommerceCategoryIdByPath(item.category);
      const description =
        item.description && item.description.length > 8000
          ? `${item.description.slice(0, 8000)}…`
          : item.description || null;

      try {
        const ins = r<{ id: number }>(
          await db.execute(sql`
            INSERT INTO vendor_menu_items (
              vendor_id, menu_category_id, ecommerce_category_id, name, description, price, sale_price,
              image_url, sku, stock, active
            )
            VALUES (
              ${vendorId},
              ${menuCategoryId},
              ${ecommerceCategoryId},
              ${item.name},
              ${description},
              ${item.price},
              ${item.salePrice},
              ${item.imageUrl},
              ${item.sku},
              ${item.stock},
              ${item.active}
            )
            RETURNING id
          `),
        );

        if (ins[0]?.id) {
          itemCount++;
          continue;
        }

        if (item.sku) {
          const ex = r<{ id: number }>(
            await db.execute(sql`
              SELECT id FROM vendor_menu_items
              WHERE vendor_id = ${vendorId} AND sku = ${item.sku}
              LIMIT 1
            `),
          );
          if (ex[0]?.id) {
            await db.execute(sql`
              UPDATE vendor_menu_items SET
                menu_category_id = ${menuCategoryId},
                ecommerce_category_id = COALESCE(${ecommerceCategoryId}, ecommerce_category_id),
                name = ${item.name},
                description = COALESCE(${description}, description),
                price = ${item.price},
                sale_price = ${item.salePrice},
                image_url = COALESCE(${item.imageUrl}, image_url),
                stock = COALESCE(${item.stock}, stock),
                active = ${item.active},
                updated_at = now()
              WHERE id = ${Number(ex[0].id)} AND vendor_id = ${vendorId}
            `);
            itemCount++;
            continue;
          }
        }
        skipped++;
      } catch {
        skipped++;
      }
    }
    if (i > 0 && i % 400 === 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return { vendorId, categories: categoryCount, items: itemCount, skipped };
}

export async function importMerchantRssFileForVendorSlug(
  vendorSlug: string,
  xmlPath: string,
  opts?: { clearExisting?: boolean },
): Promise<MerchantRssImportResult> {
  const vendors = r<{ id: number }>(
    await db.execute(sql`SELECT id FROM vendors WHERE slug = ${vendorSlug} LIMIT 1`),
  );
  const vendorId = vendors[0]?.id;
  if (!vendorId) throw new Error(`İşletme bulunamadı: slug=${vendorSlug}`);
  return importMerchantRssForVendorId(vendorId, xmlPath, opts);
}

export async function importMerchantRssForVendorId(
  vendorId: number,
  xmlPath: string,
  opts?: { clearExisting?: boolean },
): Promise<MerchantRssImportResult> {
  const xml = await readFile(xmlPath, "utf8");
  const items = parseMerchantRssXml(xml);
  if (items.length === 0) throw new Error("XML içinde ürün bulunamadı");
  return importMerchantRssIntoVendor(vendorId, items, opts);
}

const GELIVER_DEMO_SLUG = "geliver-demo-magaza";
const DEFAULT_MERCHANT_XML_URL = "https://www.tahtakaletoptanticaret.com/export.xml";
const MERCHANT_IMPORT_MIN_ITEMS = 50;

export async function importMerchantRssFromUrl(
  vendorId: number,
  xmlUrl: string,
  opts?: { clearExisting?: boolean },
): Promise<MerchantRssImportResult> {
  const axios = (await import("axios")).default;
  const fetched = await axios.get<string>(xmlUrl, {
    timeout: 180_000,
    responseType: "text",
    maxContentLength: 120 * 1024 * 1024,
  });
  const items = parseMerchantRssXml(String(fetched.data ?? ""));
  if (items.length === 0) throw new Error("XML içinde ürün bulunamadı");
  return importMerchantRssIntoVendor(vendorId, items, opts);
}

/** geliver-demo-magaza: demo ürün sayısı düşükse Tahtakale XML’ini arka planda içe aktarır */
export async function seedGeliverMerchantCatalogIfNeeded(logger?: {
  info: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
}): Promise<void> {
  const log = (msg: string, obj?: object) =>
    logger ? logger.info(obj ?? {}, msg) : console.log(msg, obj ?? "");
  const logErr = (msg: string, err: unknown) =>
    logger ? logger.error({ err }, msg) : console.error(msg, err);

  try {
    await seedEcommerceProductCategoriesIfNeeded();
    const vendors = r<{ id: number }>(
      await db.execute(sql`SELECT id FROM vendors WHERE slug = ${GELIVER_DEMO_SLUG} LIMIT 1`),
    );
    const vendorId = vendors[0]?.id;
    if (!vendorId) {
      log("[geliver-xml-import] vendor yok, atlandı");
      return;
    }
    const countRows = r<{ c: number }>(
      await db.execute(sql`
        SELECT COUNT(*)::int AS c FROM vendor_menu_items
        WHERE vendor_id = ${vendorId} AND active = true
      `),
    );
    const existing = Number(countRows[0]?.c ?? 0);
    if (existing >= MERCHANT_IMPORT_MIN_ITEMS) {
      log("[geliver-xml-import] yeterli ürün var, atlandı", { vendorId, existing });
      return;
    }
    log("[geliver-xml-import] başlıyor", { vendorId, existing, xmlUrl: DEFAULT_MERCHANT_XML_URL });
    const result = await importMerchantRssFromUrl(vendorId, DEFAULT_MERCHANT_XML_URL, {
      clearExisting: existing > 0,
    });
    log("[geliver-xml-import] tamamlandı", { ...result });
  } catch (err) {
    logErr("[geliver-xml-import] başarısız", err);
  }
}
