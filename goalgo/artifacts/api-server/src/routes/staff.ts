import { Router } from "express";
import { db, deliveryOrderStatusEventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();
type Row = Record<string, unknown>;
const r = (res: { rows: Row[] }) => res.rows;

/* — Auto-migrate ──────────────────────────────────────────────── */
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_staff (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'servis',
        password_hash TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS staff_messages (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL,
        channel TEXT NOT NULL DEFAULT 'general',
        sender_type TEXT NOT NULL,
        sender_id INTEGER,
        sender_name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS table_number TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'customer'`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS created_by_staff TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS assigned_usta_id INTEGER`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS usta_name TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS assigned_servis_id INTEGER`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS servis_name TEXT`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_customers (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL DEFAULT '',
        company_name TEXT,
        address TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        tax_office TEXT,
        tax_number TEXT,
        notes TEXT,
        tag TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  } catch { /* ignore */ }
})();

/* — Helpers ──────────────────────────────────────────────────── */

async function verifyVendorByHeaders(h: Record<string, string | string[] | undefined>): Promise<number | null> {
  const vid = parseInt(String(h["x-vendor-id"] ?? ""));
  const email = String(h["x-vendor-email"] ?? "");
  if (!vid || !email) return null;
  const rows = r(await db.execute<Row>(sql`SELECT id FROM vendors WHERE id = ${vid} AND owner_email = ${email} LIMIT 1`));
  return rows[0] ? vid : null;
}

async function authenticateStaff(phone: string, password: string): Promise<Row | null> {
  if (!phone || !password) return null;
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, phone, role, vendor_id, active, password_hash
    FROM vendor_staff WHERE phone = ${phone.trim()} AND active = true LIMIT 1
  `));
  if (!rows[0]) return null;
  const s = rows[0];
  const hash = s.password_hash as string | null;
  let ok = false;
  if (hash) { ok = await bcrypt.compare(password, hash); }
  else { ok = password.trim() === phone.trim(); }
  return ok ? s : null;
}

/* — Auth ─────────────────────────────────────────────────────── */

router.post("/staff/login", async (req, res): Promise<void> => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  if (!phone || !password) { res.status(400).json({ error: "Telefon ve şifre zorunlu" }); return; }
  const staff = await authenticateStaff(phone, password);
  if (!staff) { res.status(401).json({ error: "Telefon veya şifre yanlış. Şifreniz bilinmiyorsa işletme yetkilisiyle iletişime geçin." }); return; }
  const [vendor] = r(await db.execute<Row>(sql`SELECT name, slug FROM vendors WHERE id = ${staff.vendor_id as number} LIMIT 1`));
  res.json({ id: staff.id, name: staff.name, phone: staff.phone, role: staff.role, vendorId: staff.vendor_id, vendorName: vendor?.name ?? "" });
});

router.patch("/staff/change-password", async (req, res): Promise<void> => {
  const { phone, currentPassword, newPassword } = req.body as { phone?: string; currentPassword?: string; newPassword?: string };
  if (!phone || !currentPassword || !newPassword) { res.status(400).json({ error: "Eksik bilgi" }); return; }
  if (newPassword.length < 4) { res.status(400).json({ error: "Yeni şifre en az 4 karakter olmalı" }); return; }
  const staff = await authenticateStaff(phone, currentPassword);
  if (!staff) { res.status(401).json({ error: "Mevcut şifre yanlış" }); return; }
  const hash = await bcrypt.hash(newPassword, 10);
  await db.execute(sql`UPDATE vendor_staff SET password_hash = ${hash} WHERE id = ${staff.id as number}`);
  res.json({ success: true });
});

/* — Usta: Atanan Siparişler ──────────────────────────────────── */

router.get("/staff/usta/orders", async (req, res): Promise<void> => {
  const { phone, password } = req.query as Record<string, string>;
  const staff = await authenticateStaff(phone, password);
  if (!staff || staff.role !== "usta") { res.status(401).json({ error: "Yetki hatası" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT o.*, v.name as vendor_name FROM delivery_orders o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.assigned_usta_id = ${staff.id as number}
    AND o.status NOT IN ('cancelled')
    ORDER BY o.created_at DESC LIMIT 50
  `));
  res.json(rows);
});

/* Usta siparişi hazırladı → ready + mesaj gönder */
router.post("/staff/usta/orders/:id/ready-notify", async (req, res): Promise<void> => {
  const { phone, password, notifyMessage } = req.body as { phone: string; password: string; notifyMessage?: string };
  const staff = await authenticateStaff(phone, password);
  if (!staff || staff.role !== "usta") { res.status(401).json({ error: "Yetki hatası" }); return; }
  const orderId = parseInt(req.params.id);
  const msg = notifyMessage?.trim() || "✅ Sipariş hazır! Lütfen teslim alın.";
  const prevRows = r(await db.execute<Row>(sql`
    SELECT status FROM delivery_orders WHERE id = ${orderId} AND assigned_usta_id = ${staff.id as number} LIMIT 1
  `));
  if (!prevRows[0]) { res.status(404).json({ error: "Sipariş bulunamadı veya size atanmamış" }); return; }
  const fromStatus = String(prevRows[0].status ?? "");
  await db.execute(sql`UPDATE delivery_orders SET status = 'ready', updated_at = now() WHERE id = ${orderId} AND assigned_usta_id = ${staff.id as number}`);
  if (fromStatus !== "ready") {
    await db.insert(deliveryOrderStatusEventsTable).values({
      orderId,
      fromStatus,
      toStatus: "ready",
      source: "staff_usta",
      note: null,
    }).catch(() => {});
  }
  const [inserted] = r(await db.execute<Row>(sql`
    INSERT INTO order_messages (order_id, sender_type, sender_name, message)
    VALUES (${orderId}, 'usta', ${(staff.name as string) || "Usta"}, ${msg})
    RETURNING *
  `));
  res.json({ success: true, message: inserted });
});

/* — Servis Elemanı: Sipariş Listesi ─────────────────────────── */

router.get("/staff/servis/orders", async (req, res): Promise<void> => {
  const { phone, password } = req.query as Record<string, string>;
  const staff = await authenticateStaff(phone, password);
  if (!staff || staff.role !== "servis") { res.status(401).json({ error: "Yetki hatası" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT o.*, v.name as vendor_name FROM delivery_orders o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.vendor_id = ${staff.vendor_id as number}
    AND o.created_by_staff = ${phone.trim()}
    ORDER BY o.created_at DESC LIMIT 50
  `));
  res.json(rows);
});

/* Servis Elemanı: Yeni Sipariş Oluştur */
router.post("/staff/servis/orders", async (req, res): Promise<void> => {
  const { phone, password, orderType, tableNumber, customerName, customerPhone, customerAddress, items, notes } = req.body as Record<string, unknown>;
  const staff = await authenticateStaff(String(phone ?? ""), String(password ?? ""));
  if (!staff || staff.role !== "servis") { res.status(401).json({ error: "Yetki hatası" }); return; }

  let parsedItems: Array<{ name: string; price: number; qty: number }>;
  try {
    parsedItems = typeof items === "string" ? JSON.parse(items) : (items as typeof parsedItems);
  } catch { res.status(400).json({ error: "Ürün listesi geçersiz" }); return; }
  if (!parsedItems?.length) { res.status(400).json({ error: "En az bir ürün gerekli" }); return; }

  const subtotal = parsedItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const orderNum = `SRV${Date.now().toString(36).toUpperCase()}`;
  const isTable = orderType === "table";
  const address = isTable ? `MASA: ${tableNumber}` : String(customerAddress || "Belirtilmedi");
  const cName = String(customerName || (isTable ? `Masa ${tableNumber}` : "Servis Siparişi"));
  const cPhone = String(customerPhone || "0000000000");
  const tblNum = isTable ? String(tableNumber) : null;

  const [order] = r(await db.execute<Row>(sql`
    INSERT INTO delivery_orders (
      order_number, vendor_id, customer_name, customer_phone, customer_address,
      items, subtotal, total, delivery_fee, discount,
      status, payment_method, order_source, table_number, created_by_staff, notes
    ) VALUES (
      ${orderNum}, ${staff.vendor_id as number}, ${cName}, ${cPhone}, ${address},
      ${JSON.stringify(parsedItems)}, ${subtotal}, ${subtotal}, 0, 0,
      'pending', 'cash', 'staff', ${tblNum}, ${String(phone).trim()}, ${notes ? String(notes) : null}
    ) RETURNING *
  `));
  res.status(201).json(order);
});

/* — Vendor Menü (servis elemanı ürün seçimi için) ────────────── */

router.get("/staff/vendors/:vendorId/menu", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.vendorId);
  const rows = r(await db.execute<Row>(sql`
    SELECT mi.id, mi.name, COALESCE(mi.sale_price, mi.price) as price,
           mi.description, mi.image_url, mc.name as category_name
    FROM vendor_menu_items mi
    LEFT JOIN vendor_menu_categories mc ON mc.id = mi.menu_category_id
    WHERE mi.vendor_id = ${vendorId} AND mi.active = true
    ORDER BY mc.position ASC NULLS LAST, mi.name ASC
  `));
  res.json(rows);
});

/* — Staff Mesajlaşma ─────────────────────────────────────────── */

router.get("/staff/messages", async (req, res): Promise<void> => {
  const { vendorId, channel } = req.query as { vendorId?: string; channel?: string };
  if (!vendorId || !channel) { res.status(400).json({ error: "Parametre eksik" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT * FROM staff_messages
    WHERE vendor_id = ${parseInt(vendorId)} AND channel = ${channel}
    ORDER BY created_at ASC LIMIT 200
  `));
  res.json(rows);
});

router.post("/staff/messages", async (req, res): Promise<void> => {
  const { vendorId, channel, senderType, senderId, senderName, message } = req.body as Record<string, unknown>;
  if (!vendorId || !channel || !senderType || !senderName || !String(message ?? "").trim()) {
    res.status(400).json({ error: "Eksik bilgi" }); return;
  }
  const [msg] = r(await db.execute<Row>(sql`
    INSERT INTO staff_messages (vendor_id, channel, sender_type, sender_id, sender_name, message)
    VALUES (
      ${parseInt(String(vendorId))}, ${String(channel)}, ${String(senderType)},
      ${senderId ? parseInt(String(senderId)) : null},
      ${String(senderName)}, ${String(message).trim()}
    ) RETURNING *
  `));
  res.status(201).json(msg);
});

/* — Vendor: Staff Yönetimi ───────────────────────────────────── */

router.get("/providers/staff", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, phone, role, active, created_at FROM vendor_staff
    WHERE vendor_id = ${vid} ORDER BY role ASC, name ASC
  `));
  res.json(rows);
});

router.post("/providers/staff", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { name, phone, role, password } = req.body as { name: string; phone: string; role: string; password?: string };
  if (!name || !phone || !role) { res.status(400).json({ error: "Ad, telefon ve rol zorunlu" }); return; }
  if (!["usta", "servis", "kasiyer"].includes(role)) { res.status(400).json({ error: "Geçersiz rol: usta, servis veya kasiyer olmalı" }); return; }
  const rawPassword = password?.trim() || phone.trim();
  const hash = await bcrypt.hash(rawPassword, 10);
  const [row] = r(await db.execute<Row>(sql`
    INSERT INTO vendor_staff (vendor_id, name, phone, role, password_hash)
    VALUES (${vid}, ${name}, ${phone}, ${role}, ${hash})
    RETURNING id, name, phone, role, active, created_at
  `));
  res.status(201).json({ ...row, _defaultPassword: rawPassword });
});

router.delete("/providers/staff/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`DELETE FROM vendor_staff WHERE id = ${parseInt(req.params.id)} AND vendor_id = ${vid}`);
  res.json({ success: true });
});

/* Siparişe usta ata */
router.patch("/providers/orders/:id/assign-usta", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { ustaId } = req.body as { ustaId?: number };
  if (!ustaId) { res.status(400).json({ error: "ustaId zorunlu" }); return; }
  const [usta] = r(await db.execute<Row>(sql`SELECT id, name FROM vendor_staff WHERE id = ${ustaId} AND vendor_id = ${vid} AND role = 'usta' LIMIT 1`));
  if (!usta) { res.status(404).json({ error: "Usta bulunamadı" }); return; }
  await db.execute(sql`
    UPDATE delivery_orders SET assigned_usta_id = ${ustaId}, usta_name = ${usta.name as string}, updated_at = now()
    WHERE id = ${parseInt(req.params.id)} AND vendor_id = ${vid}
  `);
  res.json({ success: true, ustaName: usta.name });
});

/* Siparişe servis elemanı ata */
router.patch("/providers/orders/:id/assign-servis", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { servisId } = req.body as { servisId?: number };
  if (!servisId) { res.status(400).json({ error: "servisId zorunlu" }); return; }
  const [servis] = r(await db.execute<Row>(sql`
    SELECT id, name, phone
    FROM vendor_staff
    WHERE id = ${servisId} AND vendor_id = ${vid} AND role = 'servis'
    LIMIT 1
  `));
  if (!servis) { res.status(404).json({ error: "Servis elemanı bulunamadı" }); return; }
  await db.execute(sql`
    UPDATE delivery_orders
    SET assigned_servis_id = ${servisId},
        servis_name = ${servis.name as string},
        created_by_staff = ${servis.phone as string},
        updated_at = now()
    WHERE id = ${parseInt(req.params.id)} AND vendor_id = ${vid}
  `);
  res.json({ success: true, servisName: servis.name, servisPhone: servis.phone });
});

/* — Vendor Customers CRUD ────────────────────────────────────── */

router.get("/providers/customers", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT * FROM vendor_customers WHERE vendor_id = ${vid}
    ORDER BY first_name ASC, last_name ASC
  `));
  res.json(rows);
});

router.post("/providers/customers", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { first_name, last_name, company_name, address, phone, email, tax_office, tax_number, notes } = req.body as Record<string, string>;
  if (!first_name?.trim() || !phone?.trim()) { res.status(400).json({ error: "Ad ve telefon zorunlu" }); return; }
  const [row] = r(await db.execute<Row>(sql`
    INSERT INTO vendor_customers (vendor_id, first_name, last_name, company_name, address, phone, email, tax_office, tax_number, notes)
    VALUES (${vid}, ${first_name.trim()}, ${(last_name || "").trim()},
            ${company_name?.trim() || null}, ${address?.trim() || null}, ${phone.trim()},
            ${email?.trim() || null}, ${tax_office?.trim() || null}, ${tax_number?.trim() || null}, ${notes?.trim() || null})
    RETURNING *
  `));
  res.status(201).json(row);
});

router.put("/providers/customers/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = parseInt(req.params.id);
  const { first_name, last_name, company_name, address, phone, email, tax_office, tax_number, notes, tag } = req.body as Record<string, string>;
  await db.execute(sql`
    UPDATE vendor_customers SET
      first_name = ${first_name?.trim() || ""},
      last_name = ${(last_name || "").trim()},
      company_name = ${company_name?.trim() || null},
      address = ${address?.trim() || null},
      phone = ${phone?.trim() || ""},
      email = ${email?.trim() || null},
      tax_office = ${tax_office?.trim() || null},
      tax_number = ${tax_number?.trim() || null},
      notes = ${notes?.trim() || null},
      tag = ${tag?.trim() || null}
    WHERE id = ${id} AND vendor_id = ${vid}
  `);
  const [row] = r(await db.execute<Row>(sql`SELECT * FROM vendor_customers WHERE id = ${id} LIMIT 1`));
  res.json(row ?? {});
});

router.delete("/providers/customers/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`DELETE FROM vendor_customers WHERE id = ${parseInt(req.params.id)} AND vendor_id = ${vid}`);
  res.json({ success: true });
});

/* Cashier: read/create customers (no vendor auth needed, uses vendorId param) */
router.get("/cashier/customers", async (req, res): Promise<void> => {
  const { vendorId } = req.query as { vendorId?: string };
  if (!vendorId) { res.status(400).json({ error: "vendorId zorunlu" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, first_name, last_name, company_name, address, phone, email
    FROM vendor_customers WHERE vendor_id = ${parseInt(vendorId)}
    ORDER BY first_name ASC, last_name ASC
  `));
  res.json(rows);
});

router.post("/cashier/customers", async (req, res): Promise<void> => {
  const { vendorId, first_name, last_name, company_name, address, phone, email } = req.body as Record<string, string>;
  if (!vendorId || !first_name?.trim() || !phone?.trim()) { res.status(400).json({ error: "Eksik bilgi" }); return; }
  const [row] = r(await db.execute<Row>(sql`
    INSERT INTO vendor_customers (vendor_id, first_name, last_name, company_name, address, phone, email)
    VALUES (${parseInt(vendorId)}, ${first_name.trim()}, ${(last_name || "").trim()},
            ${company_name?.trim() || null}, ${address?.trim() || null}, ${phone.trim()}, ${email?.trim() || null})
    RETURNING *
  `));
  res.status(201).json(row);
});

/* — Cashier (Kasiyer) Endpoints ─────────────────────────────── */

/* GET /cashier/tables?vendorId=X — load vendor's configured tables from service settings */
router.get("/cashier/tables", async (req, res): Promise<void> => {
  const { vendorId } = req.query as { vendorId?: string };
  if (!vendorId) { res.status(400).json({ error: "vendorId zorunlu" }); return; }
  const [row] = r(await db.execute<Row>(sql`SELECT table_sections FROM vendors WHERE id = ${parseInt(vendorId)} LIMIT 1`));
  if (!row) { res.json([]); return; }
  try {
    const sections = row.table_sections ? JSON.parse(String(row.table_sections)) : [];
    res.json(Array.isArray(sections) ? sections : []);
  } catch { res.json([]); }
});

/* GET /cashier/orders?vendorId=X&date=YYYY-MM-DD */
router.get("/cashier/orders", async (req, res): Promise<void> => {
  const { vendorId, date } = req.query as { vendorId?: string; date?: string };
  if (!vendorId) { res.status(400).json({ error: "vendorId zorunlu" }); return; }
  const vid = parseInt(vendorId);
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const rows = r(await db.execute<Row>(sql`
    SELECT id, order_number, customer_name, customer_phone, table_number,
           items, subtotal, total, status, payment_method, order_source,
           notes, created_by_staff, created_at
    FROM delivery_orders
    WHERE vendor_id = ${vid}
      AND order_source IN ('cashier', 'staff')
      AND DATE(created_at) = ${dateStr}
    ORDER BY created_at DESC
    LIMIT 200
  `));
  res.json(rows);
});

/* GET /staff/vendors/:vendorId/couriers */
router.get("/staff/vendors/:vendorId/couriers", async (req, res): Promise<void> => {
  const vendorId = Number(req.params.vendorId);
  if (!vendorId) { res.status(400).json({ error: "vendorId geçersiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, phone, active
    FROM vendor_couriers
    WHERE vendor_id = ${vendorId} AND active = true
    ORDER BY created_at DESC
  `));
  res.json(rows);
});

/* POST /cashier/orders — create POS order */
router.post("/cashier/orders", async (req, res): Promise<void> => {
  const {
    vendorId, staffPhone, staffId,
    orderType, tableNumber, customerName, customerPhone, customerAddress,
    items, paymentMethod, notes, paid, courierId,
  } = req.body as Record<string, unknown>;

  if (!vendorId || !items) { res.status(400).json({ error: "Eksik bilgi" }); return; }

  let parsedItems: Array<{ name: string; price: number; qty: number }>;
  try { parsedItems = typeof items === "string" ? JSON.parse(items) : (items as typeof parsedItems); }
  catch { res.status(400).json({ error: "Ürün listesi geçersiz" }); return; }
  if (!parsedItems?.length) { res.status(400).json({ error: "En az bir ürün gerekli" }); return; }

  const subtotal = parsedItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const orderNum = `KSY${Date.now().toString(36).toUpperCase()}`;
  const isTable = orderType === "table";
  const isPhone = orderType === "phone";
  const isPaid = paid !== false;

  const cName = String(customerName || (isTable ? `Masa ${tableNumber || "?"}` : "Gel-Al"));
  const cPhone = String(customerPhone || "");
  const address = isTable
    ? `MASA: ${tableNumber || "?"}`
    : isPhone
      ? String(customerAddress || "")
      : "Gel-Al / Paket";
  const tblNum = isTable ? String(tableNumber || "") : null;
  const method = isPaid ? String(paymentMethod || "cash") : "pending";
  const status = isPaid ? "delivered" : "preparing";
  const staffRef = staffPhone ? String(staffPhone) : (staffId ? `id:${staffId}` : "kasiyer");
  let driverName: string | null = null;
  let driverPhone: string | null = null;
  if ((orderType === "takeaway" || isPhone) && courierId) {
    const courier = r(await db.execute<Row>(sql`
      SELECT name, phone
      FROM vendor_couriers
      WHERE id = ${Number(courierId)} AND vendor_id = ${parseInt(String(vendorId))}
      LIMIT 1
    `))[0];
    if (courier) {
      driverName = String(courier.name || "");
      driverPhone = String(courier.phone || "");
    }
  }

  const [order] = r(await db.execute<Row>(sql`
    INSERT INTO delivery_orders (
      order_number, vendor_id, customer_name, customer_phone, customer_address,
      items, subtotal, total, delivery_fee, discount,
      status, payment_method, order_source, table_number, created_by_staff, notes, driver_name, driver_phone
    ) VALUES (
      ${orderNum}, ${parseInt(String(vendorId))}, ${cName}, ${cPhone}, ${address},
      ${JSON.stringify(parsedItems)}, ${subtotal}, ${subtotal}, 0, 0,
      ${status}, ${method}, 'cashier', ${tblNum}, ${staffRef}, ${notes ? String(notes) : null}, ${driverName}, ${driverPhone}
    ) RETURNING *
  `));
  res.status(201).json(order);
});

/* Vendor: Staff kanalında mesaj gönder */
router.post("/providers/staff/messages", async (req, res): Promise<void> => {
  const vid = await verifyVendorByHeaders(req.headers as Record<string, string>);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { channel, senderName, message } = req.body as { channel: string; senderName: string; message: string };
  if (!channel || !message?.trim()) { res.status(400).json({ error: "Eksik bilgi" }); return; }
  const [msg] = r(await db.execute<Row>(sql`
    INSERT INTO staff_messages (vendor_id, channel, sender_type, sender_name, message)
    VALUES (${vid}, ${channel}, 'vendor', ${senderName || "İşletme"}, ${message.trim()})
    RETURNING *
  `));
  res.status(201).json(msg);
});

export default router;
