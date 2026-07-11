import { Router, type IRouter } from "express";
import { db, productsTable, productCategoriesTable, ordersTable, paymentSettingsTable, shopSettingsTable } from "@workspace/db";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { getShopUser } from "./shop-auth";

const router: IRouter = Router();

/* — PRODUCT CATEGORIES ─────────────────────────────────────────── */

router.get("/shop/categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(productCategoriesTable).orderBy(productCategoriesTable.position);
  res.json(rows);
});

router.post("/shop/categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { name, slug, description, imageUrl, parentId, position } = req.body;
  if (!name || !slug) { res.status(400).json({ error: "name and slug required" }); return; }
  const [row] = await db.insert(productCategoriesTable).values({
    name, slug, description, imageUrl, parentId: parentId ?? null,
    position: position ?? 0,
  }).returning();
  res.status(201).json(row);
});

router.put("/shop/categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { name, slug, description, imageUrl, parentId, position, active } = req.body;
  const [row] = await db.update(productCategoriesTable)
    .set({ name, slug, description, imageUrl, parentId, position, active })
    .where(eq(productCategoriesTable.id, id))
    .returning();
  res.json(row);
});

router.delete("/shop/categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  await db.delete(productCategoriesTable).where(eq(productCategoriesTable.id, id));
  res.status(204).end();
});

/* — PRODUCTS ───────────────────────────────────────────────────── */

/* — CATEGORY SHOWCASE: one product per category ────────────────── */

router.get("/shop/showcase", async (_req, res): Promise<void> => {
  const rows = await db.execute<{
    id: number; name: string; slug: string; price: string; sale_price: string | null;
    image_url: string | null; category_id: number | null; featured: boolean;
    cat_name: string; cat_slug: string;
  }>(sql`
    SELECT DISTINCT ON (pc.id)
      p.id, p.name, p.slug, p.price, p.sale_price, p.image_url, p.category_id, p.featured,
      pc.name as cat_name, pc.slug as cat_slug
    FROM products p
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.active = true AND pc.active = true
    ORDER BY pc.id, p.featured DESC, p.id ASC
  `);
  res.json(rows.rows ?? rows);
});

router.get("/shop/products", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 200);
  const offset = parseInt(String(req.query.offset ?? "0"));
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined;
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug : undefined;
  const featured = req.query.featured === "true" ? true : undefined;

  const conds: any[] = [];
  if (search) conds.push(or(ilike(productsTable.name, `%${search}%`), ilike(productsTable.description ?? "", `%${search}%`)));
  if (categoryId) conds.push(eq(productsTable.categoryId, categoryId));
  if (featured) conds.push(eq(productsTable.featured, true));

  if (categorySlug) {
    const [cat] = await db.select().from(productCategoriesTable).where(eq(productCategoriesTable.slug, categorySlug));
    if (cat) conds.push(eq(productsTable.categoryId, cat.id));
    else { res.json({ items: [], total: 0 }); return; }
  }

  const query = db.select().from(productsTable);
  const rows = await (conds.length ? query.where(and(...conds)) : query)
    .orderBy(desc(productsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ items: rows, total: rows.length });
});

router.get("/shop/products/slug/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [row] = await db.select().from(productsTable).where(eq(productsTable.slug, slug));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.get("/shop/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [row] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/shop/products", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { name, slug, description, shortDescription, price, salePrice, sku, stock, imageUrl, images, categoryId, tags, featured, active } = req.body;
  if (!name || !slug || price === undefined) { res.status(400).json({ error: "name, slug, price required" }); return; }
  const [row] = await db.insert(productsTable).values({
    name, slug, description, shortDescription,
    price: String(price),
    salePrice: salePrice ? String(salePrice) : null,
    sku, stock: stock ?? 0,
    imageUrl, images: images ?? [],
    categoryId: categoryId ?? null,
    tags: tags ?? [],
    featured: featured ?? false,
    active: active ?? true,
  }).returning();
  res.status(201).json(row);
});

router.put("/shop/products/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { name, slug, description, shortDescription, price, salePrice, sku, stock, imageUrl, images, categoryId, tags, featured, active } = req.body;
  const [row] = await db.update(productsTable).set({
    name, slug, description, shortDescription,
    price: price !== undefined ? String(price) : undefined,
    salePrice: salePrice !== undefined ? (salePrice ? String(salePrice) : null) : undefined,
    sku, stock,
    imageUrl, images, categoryId,
    tags, featured, active,
    updatedAt: new Date(),
  }).where(eq(productsTable.id, id)).returning();
  res.json(row);
});

router.delete("/shop/products/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).end();
});

/* — ORDERS ─────────────────────────────────────────────────────── */

router.get("/shop/orders", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 200);
  const offset = parseInt(String(req.query.offset ?? "0"));
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const query = db.select().from(ordersTable);
  const rows = await (status ? query.where(eq(ordersTable.status, status)) : query)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ items: rows, total: rows.length });
});

router.get("/shop/orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz sipariş" });
    return;
  }
  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  if (denyUnlessAdminMaintenance(req, res, "teslimat")) {
    res.json(row);
    return;
  }

  const user = await getShopUser(req);
  if (user && row.userId != null && row.userId === user.id) {
    res.json({
      id: row.id,
      orderNumber: row.orderNumber,
      trackingCode: row.trackingCode,
      customerName: row.customerName,
      status: row.status,
      paymentStatus: row.paymentStatus,
      totalAmount: row.totalAmount,
      subtotal: row.subtotal,
      taxAmount: row.taxAmount,
      cargoCompany: row.cargoCompany,
      cargoTrackingNumber: row.cargoTrackingNumber,
      cargoTrackingUrl: row.cargoTrackingUrl,
      shippedAt: row.shippedAt,
      deliveredAt: row.deliveredAt,
      estimatedDelivery: row.estimatedDelivery,
      createdAt: row.createdAt,
      items: row.items,
    });
    return;
  }

  res.status(403).json({ error: "Bu siparişe erişim yetkiniz yok", code: "FORBIDDEN" });
});

router.post("/shop/orders", async (req, res): Promise<void> => {
  const { customerName, customerEmail, customerPhone, customerAddress, customerCity, customerPostal, totalAmount, paymentMethod, items, notes } = req.body;
  if (!customerName || !customerEmail || totalAmount === undefined) {
    res.status(400).json({ error: "customerName, customerEmail, totalAmount required" }); return;
  }
  const orderNumber = `AHK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const [row] = await db.insert(ordersTable).values({
    orderNumber, customerName, customerEmail, customerPhone, customerAddress,
    customerCity, customerPostal,
    totalAmount: String(totalAmount),
    paymentMethod: paymentMethod ?? "stripe",
    items: items ? JSON.stringify(items) : null,
    notes,
  }).returning();
  res.status(201).json(row);
});

router.put("/shop/orders/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const {
    status, paymentStatus, notes, adminNote,
    cargoCompany, cargoTrackingNumber, cargoTrackingUrl,
    estimatedDelivery, shippedAt, deliveredAt,
  } = req.body;

  const updateData: any = { status, paymentStatus, notes, adminNote, cargoCompany, cargoTrackingNumber, cargoTrackingUrl, estimatedDelivery, updatedAt: new Date() };
  if (shippedAt !== undefined) updateData.shippedAt = shippedAt ? new Date(shippedAt) : null;
  if (deliveredAt !== undefined) updateData.deliveredAt = deliveredAt ? new Date(deliveredAt) : null;

  // Auto-set shipped/delivered timestamps if status changes
  if (status === "shipped" && !updateData.shippedAt) updateData.shippedAt = new Date();
  if (status === "delivered" && !updateData.deliveredAt) updateData.deliveredAt = new Date();

  const [row] = await db.update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, id))
    .returning();
  res.json(row);
});

/* — PAYMENT SETTINGS ───────────────────────────────────────────── */

async function getOrCreatePaymentSettings() {
  const rows = await db.select().from(paymentSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(paymentSettingsTable).values({}).returning();
  return row;
}

router.get("/shop/payment-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const row = await getOrCreatePaymentSettings();
  const safe = { ...row, stripeSecretKey: row.stripeSecretKey ? "***" : null, stripeWebhookSecret: row.stripeWebhookSecret ? "***" : null };
  res.json(safe);
});

router.put("/shop/payment-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const current = await getOrCreatePaymentSettings();
  const { stripeEnabled, stripePublishableKey, stripeSecretKey, stripeWebhookSecret, bankTransferEnabled, bankName, bankIban, bankAccountName, bankBranch, currency, taxRate, orderEmailFrom } = req.body;
  const updateData: any = {
    stripeEnabled, stripePublishableKey, bankTransferEnabled,
    bankName, bankIban, bankAccountName, bankBranch, currency,
    taxRate: taxRate !== undefined ? String(taxRate) : undefined,
    orderEmailFrom, updatedAt: new Date(),
  };
  if (stripeSecretKey && stripeSecretKey !== "***") updateData.stripeSecretKey = stripeSecretKey;
  if (stripeWebhookSecret && stripeWebhookSecret !== "***") updateData.stripeWebhookSecret = stripeWebhookSecret;
  const [row] = await db.update(paymentSettingsTable)
    .set(updateData)
    .where(eq(paymentSettingsTable.id, current.id))
    .returning();
  res.json({ ...row, stripeSecretKey: row.stripeSecretKey ? "***" : null, stripeWebhookSecret: row.stripeWebhookSecret ? "***" : null });
});

/* — SHOP SETTINGS ─────────────────────────────────────────────── */

async function getOrCreateShopSettings() {
  const rows = await db.select().from(shopSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(shopSettingsTable).values({}).returning();
  return row;
}

router.get("/shop/settings", async (_req, res): Promise<void> => {
  const row = await getOrCreateShopSettings();
  res.json(row);
});

router.put("/shop/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const current = await getOrCreateShopSettings();
  const { storeName, storeDescription, bannerImageUrl, bannerSubtext, returnPolicy, shippingInfo, contactPhone, contactEmail, contactAddress, workingHours, whatsapp, featuredCategorySlug } = req.body;
  const [row] = await db.update(shopSettingsTable)
    .set({ storeName, storeDescription, bannerImageUrl, bannerSubtext, returnPolicy, shippingInfo, contactPhone, contactEmail, contactAddress, workingHours, whatsapp, featuredCategorySlug, updatedAt: new Date() })
    .where(eq(shopSettingsTable.id, current.id))
    .returning();
  res.json(row);
});

export default router;
