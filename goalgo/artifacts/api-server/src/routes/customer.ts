import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customerFavoritesTable, vendorsTable, deliveryOrdersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getShopUser } from "./shop-auth";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();

/* — MIGRATION ──────────────────────────────────────────────────── */
router.post("/customer/migrate", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customer_favorites (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, vendor_id)
    )
  `);
  await db.execute(sql`
    ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_id INTEGER
  `);
  res.json({ success: true, message: "Müşteri tabloları oluşturuldu" });
});

/* — FAVORITES ──────────────────────────────────────────────────── */

/* GET /api/customer/favorites — kullanıcının favori satıcıları */
router.get("/customer/favorites", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const favRows = await db
    .select({ vendorId: customerFavoritesTable.vendorId, createdAt: customerFavoritesTable.createdAt })
    .from(customerFavoritesTable)
    .where(eq(customerFavoritesTable.customerId, user.id))
    .orderBy(desc(customerFavoritesTable.createdAt));

  if (!favRows.length) { res.json([]); return; }

  const vendorIds = favRows.map(f => f.vendorId);
  const vendors = await db.select().from(vendorsTable)
    .where(sql`${vendorsTable.id} = ANY(${vendorIds})`);

  res.json(vendors);
});

/* GET /api/customer/favorites/ids — sadece favori id listesi */
router.get("/customer/favorites/ids", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.json([]); return; }

  const favRows = await db
    .select({ vendorId: customerFavoritesTable.vendorId })
    .from(customerFavoritesTable)
    .where(eq(customerFavoritesTable.customerId, user.id));

  res.json(favRows.map(f => f.vendorId));
});

/* POST /api/customer/favorites/:vendorId — favori ekle */
router.post("/customer/favorites/:vendorId", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const vendorId = parseInt(req.params["vendorId"] ?? "0");
  if (!vendorId) { res.status(400).json({ error: "Geçersiz satıcı" }); return; }

  await db.insert(customerFavoritesTable)
    .values({ customerId: user.id, vendorId })
    .onConflictDoNothing();

  res.json({ success: true });
});

/* DELETE /api/customer/favorites/:vendorId — favoriden çıkar */
router.delete("/customer/favorites/:vendorId", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const vendorId = parseInt(req.params["vendorId"] ?? "0");
  await db.delete(customerFavoritesTable)
    .where(and(eq(customerFavoritesTable.customerId, user.id), eq(customerFavoritesTable.vendorId, vendorId)));

  res.json({ success: true });
});

/* — ORDER HISTORY ──────────────────────────────────────────────── */

/* GET /api/customer/orders — kullanıcının siparişleri */
router.get("/customer/orders", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const orders = await db.select().from(deliveryOrdersTable)
    .where(eq(deliveryOrdersTable.customerId, user.id))
    .orderBy(desc(deliveryOrdersTable.createdAt))
    .limit(50);

  res.json(orders);
});

export default router;
