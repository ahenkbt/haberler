import { Router, type IRouter, type Request } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  transportVehiclesTable, rideOffersTable, rideBookingsTable,
  transportRequestsTable, transportRequestStatusEventsTable, transportNotificationsTable,
  shopUsersTable,
} from "@workspace/db";
import { eq, and, desc, asc, ilike, gte, sql, inArray, type SQL } from "drizzle-orm";
import { getShopUser } from "./shop-auth";
import { notifyAdminWhatsApp } from "../lib/whatsapp";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { ensureTransportSchema } from "../lib/ensure-transport-schema.js";

const router: IRouter = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureTransportSchema();
    next();
  } catch (err) {
    next(err);
  }
});

/** Admin filtreleri API anahtarlarıyla eşleşsin; eski DB değerleri için alias */
const TRANSPORT_REQUEST_TYPE_ALIASES: Record<string, string[]> = {
  taxi: ["taxi"],
  courier: ["courier", "kurye"],
  moving: ["moving", "tasima"],
  tow: ["tow", "cekici"],
  cargo: ["cargo", "kargo"],
  kargo: ["cargo", "kargo"],
};
const TRANSPORT_VEHICLE_TYPE_ALIASES: Record<string, string[]> = {
  rideshare: ["rideshare"],
  taxi: ["taxi"],
  courier: ["courier", "kurye"],
  tow: ["tow", "cekici"],
  moving: ["moving"],
  cargo: ["cargo", "kargo"],
  van: ["van"],
  truck: ["truck"],
  minibus: ["minibus"],
};

function getVendorId(req: Request): number | null {
  const id = req.headers["x-vendor-id"];
  const n = id ? Number(id) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* — MIGRATION ───────────────────────────────────────────────── */
router.post("/transport/migrate", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "ulasim")) return;
  await ensureTransportSchema();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS yekpare_service_types (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      label_tr TEXT NOT NULL,
      description_tr TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
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
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS transport_request_status_events_request_id_idx
    ON transport_request_status_events (request_id)
  `);
  res.json({ success: true, message: "Transport tabloları hazır" });
});

/**
 * POST /api/transport/admin/register-driver — panelden şoför (shop_users) + araç kaydı.
 * Oturum: site_members (`memberId`) veya yönetim paneli köprüsü (`POST /api/members/admin-panel-session`).
 */
router.post("/transport/admin/register-driver", async (req, res): Promise<void> => {
  /** Sipariş / Magnific ile aynı: panel çerezi veya ADMIN_MAINTENANCE_SECRET + X-Yekpare-Admin-Secret */
  if (!denyUnlessAdminMaintenance(req, res, "ulasim")) return;
  const body = req.body as Record<string, string | undefined>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const phone = body.phone?.trim() || null;
  const vehicleType = String(body.vehicleType ?? "").trim();
  const brand = body.brand?.trim() || null;
  const model = body.model?.trim() || null;
  const plateNumber = body.plateNumber?.trim() || null;
  const city = body.city?.trim() || null;
  const address = body.address?.trim() || null;

  if (!email || !password || password.length < 6 || !name || !vehicleType) {
    res.status(400).json({ error: "E-posta, şifre (en az 6 karakter), ad ve araç tipi zorunludur" });
    return;
  }

  const [existing] = await db.select({ id: shopUsersTable.id }).from(shopUsersTable).where(eq(shopUsersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Bu e-posta ile zaten bir şoför/hesap var" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(shopUsersTable).values({
    email,
    passwordHash,
    name,
    phone,
    address,
    city,
  }).returning();

  const [vehicle] = await db.insert(transportVehiclesTable).values({
    ownerId: user.id,
    vehicleType,
    brand,
    model,
    plateNumber,
    city,
    capacity: 4,
    isActive: true,
    isAvailable: true,
  }).returning();

  res.json({
    success: true,
    driver: { id: user.id, email: user.email, name: user.name, phone: user.phone },
    vehicle,
  });
});

/* — HELPERS ─────────────────────────────────────────────────── */
function genCode() {
  return "TRK" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

async function pushNotif(recipientId: number, recipientType: string, data: {
  type: string; title: string; body: string; requestId?: number; offerId?: number;
}) {
  await db.insert(transportNotificationsTable).values({
    recipientId, recipientType,
    type: data.type, title: data.title, body: data.body,
    requestId: data.requestId, offerId: data.offerId,
  });
}

async function appendTransportRequestStatusEvent(
  requestId: number,
  fromStatus: string | null,
  toStatus: string,
  source: string,
  note?: string | null,
): Promise<void> {
  await db.insert(transportRequestStatusEventsTable).values({
    requestId,
    fromStatus: fromStatus ?? null,
    toStatus,
    source,
    note: note ?? null,
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending:        "Bekliyor",
  accepted:       "Kabul Edildi",
  arrived_pickup: "Adrese Gelindi",
  picked_up:      "Alındı / Yola Çıkıldı",
  in_transit:     "Yolda",
  delivered:      "Teslim Edildi",
  cancelled:      "İptal",
  rated:          "Tamamlandı",
};

/* — ARAÇ PAYLAŞMA (RIDE SHARE) ─────────────────────────────── */

/* POST /api/transport/rides — yeni sefer oluştur */
router.post("/transport/rides", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const { fromCity, toCity, fromAddress, toAddress, departureTime, totalSeats, pricePerSeat, description, allowSmoke, allowPet, allowLuggage, vehicleId } = req.body;
  if (!fromCity || !toCity || !departureTime || !pricePerSeat) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" }); return;
  }
  const [offer] = await db.insert(rideOffersTable).values({
    driverId: user.id, vehicleId, fromCity, toCity, fromAddress, toAddress,
    departureTime: new Date(departureTime),
    totalSeats: totalSeats || 3, availableSeats: totalSeats || 3,
    pricePerSeat: String(pricePerSeat), description, allowSmoke, allowPet, allowLuggage,
  }).returning();
  res.json(offer);
});

/* GET /api/transport/rides — sefer listesi */
router.get("/transport/rides", async (req, res): Promise<void> => {
  const { from, to, date } = req.query as Record<string, string>;
  let q = db.select().from(rideOffersTable).where(eq(rideOffersTable.status, "active")).$dynamic();
  const conds = [eq(rideOffersTable.status, "active")];
  if (from) conds.push(ilike(rideOffersTable.fromCity, `%${from}%`));
  if (to)   conds.push(ilike(rideOffersTable.toCity, `%${to}%`));
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    conds.push(gte(rideOffersTable.departureTime, d));
  }
  q = q.where(and(...conds));
  const offers = await q.orderBy(rideOffersTable.departureTime).limit(50);
  res.json(offers);
});

/* GET /api/transport/rides/my — kendi seferlerim */
router.get("/transport/rides/my", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const offers = await db.select().from(rideOffersTable)
    .where(eq(rideOffersTable.driverId, user.id))
    .orderBy(desc(rideOffersTable.createdAt)).limit(20);
  res.json(offers);
});

/* GET /api/transport/rides/:id */
router.get("/transport/rides/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  const [offer] = await db.select().from(rideOffersTable).where(eq(rideOffersTable.id, id));
  if (!offer) { res.status(404).json({ error: "Sefer bulunamadı" }); return; }
  res.json(offer);
});

/* POST /api/transport/rides/:id/book — yolcu rezervasyonu */
router.post("/transport/rides/:id/book", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const offerId = parseInt(req.params["id"] ?? "0");
  const { seats, pickupNote } = req.body;
  const [offer] = await db.select().from(rideOffersTable).where(eq(rideOffersTable.id, offerId));
  if (!offer) { res.status(404).json({ error: "Sefer bulunamadı" }); return; }
  if (offer.availableSeats < (seats || 1)) { res.status(400).json({ error: "Yeterli koltuk yok" }); return; }
  const total = parseFloat(offer.pricePerSeat) * (seats || 1);
  const [booking] = await db.insert(rideBookingsTable).values({
    offerId, passengerId: user.id, seats: seats || 1,
    totalPrice: String(total), pickupNote, status: "pending",
  }).returning();
  await db.update(rideOffersTable)
    .set({ availableSeats: offer.availableSeats - (seats || 1) })
    .where(eq(rideOffersTable.id, offerId));
  await pushNotif(offer.driverId, "driver", {
    type: "new_booking", offerId,
    title: "Yeni Rezervasyon!",
    body: `${user.name} ${seats || 1} koltuk rezervasyonu yaptı. ${offer.fromCity} → ${offer.toCity}`,
  });
  res.json(booking);
});

/* GET /api/transport/bookings/my — kendi rezervasyonlarım */
router.get("/transport/bookings/my", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const bookings = await db.select().from(rideBookingsTable)
    .where(eq(rideBookingsTable.passengerId, user.id))
    .orderBy(desc(rideBookingsTable.createdAt)).limit(20);
  res.json(bookings);
});

/* — PROVIDER PANEL — ULAŞIM İŞLETMESİ ───────────────────── */

router.get("/transport/vendor/summary", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const rows = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM transport_vehicles WHERE vendor_id = ${vid} AND COALESCE(is_active, true) = true) AS vehicle_count,
      (SELECT COUNT(*)::int FROM transport_requests WHERE vendor_id = ${vid}) AS request_count,
      (SELECT COUNT(*)::int FROM transport_requests WHERE vendor_id = ${vid} AND status = 'pending') AS pending_request_count,
      (SELECT COUNT(*)::int FROM ride_offers WHERE vendor_id = ${vid} AND status = 'active') AS active_ride_count
  `);
  res.json(rows.rows[0] ?? {});
});

router.get("/transport/vendor/vehicles", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const r0 = await db.execute(sql`
    SELECT * FROM transport_vehicles
    WHERE vendor_id = ${vid}
    ORDER BY created_at DESC
    LIMIT 300
  `);
  res.json(r0.rows);
});

router.post("/transport/vendor/vehicles", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const body = req.body as Record<string, unknown>;
  const vehicleType = String(body.vehicleType ?? body.vehicle_type ?? "").trim();
  if (!vehicleType) { res.status(400).json({ error: "Araç/servis tipi zorunlu" }); return; }
  const r0 = await db.execute(sql`
    INSERT INTO transport_vehicles
      (vendor_id, owner_id, vehicle_type, brand, model, plate_number, capacity, description,
       photo_url, city, service_area, driver_name, driver_phone, is_active, is_available, documents_json, updated_at)
    VALUES (
      ${vid}, ${vid}, ${vehicleType}, ${String(body.brand ?? "").trim() || null},
      ${String(body.model ?? "").trim() || null}, ${String(body.plateNumber ?? body.plate_number ?? "").trim() || null},
      ${Math.max(1, Number(body.capacity) || 1)}, ${String(body.description ?? "").trim() || null},
      ${String(body.photoUrl ?? body.photo_url ?? "").trim() || null}, ${String(body.city ?? "").trim() || null},
      ${String(body.serviceArea ?? body.service_area ?? "").trim() || null},
      ${String(body.driverName ?? body.driver_name ?? "").trim() || null},
      ${String(body.driverPhone ?? body.driver_phone ?? "").trim() || null},
      ${body.isActive === false ? false : true}, ${body.isAvailable === false ? false : true},
      ${JSON.stringify(body.documents ?? {})}::jsonb, NOW()
    )
    RETURNING *
  `);
  res.json(r0.rows[0]);
});

router.patch("/transport/vendor/vehicles/:id", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const r0 = await db.execute(sql`
    UPDATE transport_vehicles SET
      vehicle_type = COALESCE(${String(body.vehicleType ?? body.vehicle_type ?? "").trim() || null}, vehicle_type),
      brand = COALESCE(${String(body.brand ?? "").trim() || null}, brand),
      model = COALESCE(${String(body.model ?? "").trim() || null}, model),
      plate_number = COALESCE(${String(body.plateNumber ?? body.plate_number ?? "").trim() || null}, plate_number),
      capacity = COALESCE(${body.capacity != null ? Math.max(1, Number(body.capacity) || 1) : null}, capacity),
      description = COALESCE(${String(body.description ?? "").trim() || null}, description),
      photo_url = COALESCE(${String(body.photoUrl ?? body.photo_url ?? "").trim() || null}, photo_url),
      city = COALESCE(${String(body.city ?? "").trim() || null}, city),
      service_area = COALESCE(${String(body.serviceArea ?? body.service_area ?? "").trim() || null}, service_area),
      driver_name = COALESCE(${String(body.driverName ?? body.driver_name ?? "").trim() || null}, driver_name),
      driver_phone = COALESCE(${String(body.driverPhone ?? body.driver_phone ?? "").trim() || null}, driver_phone),
      is_active = COALESCE(${body.isActive !== undefined ? Boolean(body.isActive) : null}, is_active),
      is_available = COALESCE(${body.isAvailable !== undefined ? Boolean(body.isAvailable) : null}, is_available),
      updated_at = NOW()
    WHERE id = ${id} AND vendor_id = ${vid}
    RETURNING *
  `);
  if (!r0.rows.length) { res.status(404).json({ error: "Araç bulunamadı" }); return; }
  res.json(r0.rows[0]);
});

router.get("/transport/vendor/rides", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const r0 = await db.execute(sql`
    SELECT ro.*, tv.brand, tv.model, tv.plate_number
    FROM ride_offers ro
    LEFT JOIN transport_vehicles tv ON tv.id = ro.vehicle_id
    WHERE ro.vendor_id = ${vid}
    ORDER BY ro.created_at DESC
    LIMIT 200
  `);
  res.json(r0.rows);
});

router.post("/transport/vendor/rides", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const body = req.body as Record<string, unknown>;
  const fromCity = String(body.fromCity ?? body.from_city ?? "").trim();
  const toCity = String(body.toCity ?? body.to_city ?? "").trim();
  const departureTime = String(body.departureTime ?? body.departure_time ?? "").trim();
  const pricePerSeat = Number(body.pricePerSeat ?? body.price_per_seat);
  if (!fromCity || !toCity || !departureTime || !Number.isFinite(pricePerSeat) || pricePerSeat <= 0) {
    res.status(400).json({ error: "Kalkış, varış, tarih ve koltuk fiyatı zorunlu" });
    return;
  }
  const vehicleId = body.vehicleId ? Number(body.vehicleId) : null;
  const r0 = await db.execute(sql`
    INSERT INTO ride_offers
      (vendor_id, driver_id, vehicle_id, from_city, to_city, from_address, to_address, departure_time,
       total_seats, available_seats, price_per_seat, description, allow_smoke, allow_pet, allow_luggage, status)
    VALUES (
      ${vid}, ${vid}, ${vehicleId}, ${fromCity}, ${toCity},
      ${String(body.fromAddress ?? body.from_address ?? "").trim() || null},
      ${String(body.toAddress ?? body.to_address ?? "").trim() || null},
      ${new Date(departureTime)}, ${Math.max(1, Number(body.totalSeats ?? body.total_seats) || 3)},
      ${Math.max(1, Number(body.totalSeats ?? body.total_seats) || 3)}, ${pricePerSeat},
      ${String(body.description ?? "").trim() || null},
      ${Boolean(body.allowSmoke ?? body.allow_smoke)}, ${Boolean(body.allowPet ?? body.allow_pet)},
      ${body.allowLuggage === false ? false : true}, 'active'
    )
    RETURNING *
  `);
  res.json(r0.rows[0]);
});

router.get("/transport/vendor/requests", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const type = String(req.query.type ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const typeValues = type ? (TRANSPORT_REQUEST_TYPE_ALIASES[type] ?? [type]) : [];
  const typeWhere = typeValues.length ? sql`AND request_type IN (${sql.join(typeValues.map((v) => sql`${v}`), sql`, `)})` : sql``;
  const statusWhere = status ? sql`AND status = ${status}` : sql``;
  const r0 = await db.execute(sql`
    SELECT * FROM transport_requests
    WHERE (vendor_id = ${vid} OR vendor_id IS NULL)
      ${typeWhere}
      ${statusWhere}
    ORDER BY created_at DESC
    LIMIT 200
  `);
  res.json(r0.rows);
});

router.patch("/transport/vendor/requests/:id", async (req, res): Promise<void> => {
  const vid = getVendorId(req);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureTransportSchema();
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const status = String(body.status ?? "").trim();
  const assignedVehicleId = body.assignedVehicleId ? Number(body.assignedVehicleId) : null;
  const finalPrice = body.finalPrice != null && body.finalPrice !== "" ? Number(body.finalPrice) : null;
  if (!status && !assignedVehicleId && finalPrice == null) { res.status(400).json({ error: "Güncellenecek alan yok" }); return; }
  const [prev] = await db.select().from(transportRequestsTable).where(eq(transportRequestsTable.id, id)).limit(1);
  if (!prev) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
  const prevWithVendor = prev as typeof prev & { vendorId?: number | null; vendor_id?: number | null };
  const previousVendorId = prevWithVendor.vendorId ?? prevWithVendor.vendor_id ?? null;
  if (previousVendorId != null && Number(previousVendorId) !== vid) { res.status(403).json({ error: "Bu talep başka işletmeye ait" }); return; }
  const nextStatus = status || prev.status;
  const r0 = await db.execute(sql`
    UPDATE transport_requests SET
      vendor_id = COALESCE(vendor_id, ${vid}),
      status = ${nextStatus},
      assigned_vehicle_id = COALESCE(${assignedVehicleId}, assigned_vehicle_id),
      final_price = COALESCE(${finalPrice}, final_price),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `);
  if (status && status !== prev.status) {
    await appendTransportRequestStatusEvent(id, prev.status, status, "vendor_panel", String(body.note ?? "Ulaşım paneli güncellemesi"));
  }
  res.json(r0.rows[0]);
});

/* — TRANSPORT REQUESTS (TAKSİ, KURYE, ÇEKİCİ, NAKLİYAT) ──── */

async function hasActiveTransportProvider(requestType: string): Promise<boolean> {
  const rt = String(requestType ?? "").trim().toLowerCase();
  if (!rt) return false;

  if (rt === "rideshare") {
    const [offerRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(rideOffersTable)
      .where(and(
        eq(rideOffersTable.status, "active"),
        gte(rideOffersTable.availableSeats, 1),
        gte(rideOffersTable.departureTime, new Date()),
      ));
    if ((offerRow?.count ?? 0) > 0) return true;
    const rideVariants = TRANSPORT_VEHICLE_TYPE_ALIASES.rideshare ?? ["rideshare"];
    const [vehicleRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(transportVehiclesTable)
      .where(and(
        eq(transportVehiclesTable.isActive, true),
        eq(transportVehiclesTable.isAvailable, true),
        inArray(transportVehiclesTable.vehicleType, rideVariants),
      ));
    return (vehicleRow?.count ?? 0) > 0;
  }

  const variants = TRANSPORT_VEHICLE_TYPE_ALIASES[rt] ?? [rt];
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transportVehiclesTable)
    .where(and(
      eq(transportVehiclesTable.isActive, true),
      eq(transportVehiclesTable.isAvailable, true),
      inArray(transportVehiclesTable.vehicleType, variants),
    ));
  return (row?.count ?? 0) > 0;
}

/* POST /api/transport/request — yeni talep oluştur */
router.post("/transport/request", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  const {
    requestType, customerName, customerPhone,
    fromAddress, fromLat, fromLng, toAddress, toLat, toLng,
    scheduledAt, note, extraData, estimatedPrice,
  } = req.body;
  if (!requestType || !customerName || !customerPhone || !fromAddress) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" }); return;
  }
  const normalizedType = String(requestType).trim().toLowerCase();
  const providerAvailable = await hasActiveTransportProvider(normalizedType);
  if (!providerAvailable) {
    res.status(503).json({ error: "no_provider", requestType: normalizedType });
    return;
  }
  const trackingCode = genCode();
  const [request] = await db.insert(transportRequestsTable).values({
    requestType, customerId: user?.id ?? null,
    customerName, customerPhone,
    fromAddress, fromLat, fromLng, toAddress, toLat, toLng,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    note, extraData, estimatedPrice: estimatedPrice ? String(estimatedPrice) : null,
    trackingCode,
    status: "pending",
    statusHistory: JSON.stringify([{ status: "pending", note: "Talep oluşturuldu", ts: new Date().toISOString() }]),
  }).returning();
  await appendTransportRequestStatusEvent(request.id, null, "pending", "customer_request", "Talep oluşturuldu");
  if (user) {
    await pushNotif(user.id, "customer", {
      type: "request_created", requestId: request.id,
      title: "Talebiniz Alındı!",
      body: `${request.requestType.toUpperCase()} talebiniz işleme alındı. Takip: ${trackingCode}`,
    });
  }
  // Admin WhatsApp bildirimi — fire and forget
  notifyAdminWhatsApp({
    eventType: `Yeni Ulaşım Talebi (${request.requestType})`,
    details: [
      `Müşteri: ${customerName} — ${customerPhone}`,
      `Nereden: ${fromAddress}`,
      toAddress ? `Nereye: ${toAddress}` : "",
      `Takip Kodu: ${trackingCode}`,
    ].filter(Boolean).join("\n"),
  }).catch(() => {});
  res.json(request);
});

/* GET /api/transport/requests — admin tümü */
router.get("/transport/requests", async (req, res): Promise<void> => {
  const { status, type, limit = "200" } = req.query as Record<string, string>;
  const conds: SQL[] = [];
  if (status) conds.push(eq(transportRequestsTable.status, status));
  if (type) {
    const variants = TRANSPORT_REQUEST_TYPE_ALIASES[type] ?? [type];
    conds.push(inArray(transportRequestsTable.requestType, variants));
  }
  const requests = await db.select().from(transportRequestsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(transportRequestsTable.createdAt)).limit(parseInt(limit));
  res.json(requests);
});

/* PATCH /api/transport/requests/:id — admin durum güncelle */
router.patch("/transport/requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0", 10);
  const { status } = req.body as { status?: string };
  if (!status) {
    res.status(400).json({ error: "status gerekli" });
    return;
  }
  const [prev] = await db.select().from(transportRequestsTable).where(eq(transportRequestsTable.id, id));
  if (!prev) {
    res.status(404).json({ error: "Talep bulunamadı" });
    return;
  }
  const oldStatus = prev.status;
  const history = (prev.statusHistory as { status: string; note?: string; ts: string }[]) || [];
  history.push({ status, note: "Yönetim paneli güncellemesi", ts: new Date().toISOString() });
  const [updated] = await db.update(transportRequestsTable)
    .set({ status, statusHistory: JSON.stringify(history), updatedAt: new Date() })
    .where(eq(transportRequestsTable.id, id))
    .returning();
  await appendTransportRequestStatusEvent(id, oldStatus, status, "admin_panel", "Yönetim paneli güncellemesi");
  res.json(updated);
});

/* GET /api/transport/bookings — admin tümü */
router.get("/transport/bookings", async (req, res): Promise<void> => {
  const { status, limit = "100" } = req.query as Record<string, string>;
  const conds: ReturnType<typeof eq>[] = [];
  if (status) conds.push(eq(rideBookingsTable.status, status) as ReturnType<typeof eq>);
  const bookings = await db.select().from(rideBookingsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(rideBookingsTable.createdAt)).limit(parseInt(limit));
  res.json(bookings);
});

/* PATCH /api/transport/bookings/:id — admin durum güncelle */
router.patch("/transport/bookings/:id", async (req, res): Promise<void> => {
  const { status } = req.body;
  const [updated] = await db.update(rideBookingsTable)
    .set({ status })
    .where(eq(rideBookingsTable.id, parseInt(req.params.id)))
    .returning();
  res.json(updated);
});

/* GET /api/transport/requests/my — kendi taleplerim */
router.get("/transport/requests/my", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const requests = await db.select().from(transportRequestsTable)
    .where(eq(transportRequestsTable.customerId, user.id))
    .orderBy(desc(transportRequestsTable.createdAt)).limit(30);
  res.json(requests);
});

/* GET /api/transport/requests/pending — sürücü için bekleyen işler */
router.get("/transport/requests/pending", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const { type } = req.query as Record<string, string>;
  const conds: SQL[] = [eq(transportRequestsTable.status, "pending")];
  if (type) {
    const variants = TRANSPORT_REQUEST_TYPE_ALIASES[type] ?? [type];
    conds.push(inArray(transportRequestsTable.requestType, variants));
  }
  const requests = await db.select().from(transportRequestsTable)
    .where(and(...conds))
    .orderBy(transportRequestsTable.createdAt).limit(30);
  res.json(requests);
});

/* GET /api/transport/requests/driver — sürücünün üstlendiği işler */
router.get("/transport/requests/driver", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const requests = await db.select().from(transportRequestsTable)
    .where(eq(transportRequestsTable.assignedDriverId, user.id))
    .orderBy(desc(transportRequestsTable.updatedAt)).limit(30);
  res.json(requests);
});

/* GET /api/transport/track/:code — takip kodu ile sorgula */
router.get("/transport/track/:code", async (req, res): Promise<void> => {
  const code = req.params["code"] ?? "";
  const [request] = await db.select().from(transportRequestsTable)
    .where(eq(transportRequestsTable.trackingCode, code));
  if (!request) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
  const statusEvents = await db.select().from(transportRequestStatusEventsTable)
    .where(eq(transportRequestStatusEventsTable.requestId, request.id))
    .orderBy(asc(transportRequestStatusEventsTable.createdAt));
  res.json({ ...request, statusEvents });
});

/* GET /api/transport/requests/:id — tek talep detay */
router.get("/transport/requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  const [request] = await db.select().from(transportRequestsTable)
    .where(eq(transportRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
  const statusEvents = await db.select().from(transportRequestStatusEventsTable)
    .where(eq(transportRequestStatusEventsTable.requestId, id))
    .orderBy(asc(transportRequestStatusEventsTable.createdAt));
  res.json({ ...request, statusEvents });
});

/* PATCH /api/transport/requests/:id/accept — sürücü üstlenir */
router.patch("/transport/requests/:id/accept", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const id = parseInt(req.params["id"] ?? "0");
  const [req2] = await db.select().from(transportRequestsTable).where(eq(transportRequestsTable.id, id));
  if (!req2 || req2.status !== "pending") { res.status(400).json({ error: "Talep uygun değil" }); return; }
  const history = (req2.statusHistory as any[]) || [];
  history.push({ status: "accepted", note: `Sürücü ${user.name} üstlendi`, ts: new Date().toISOString() });
  const [updated] = await db.update(transportRequestsTable)
    .set({ status: "accepted", assignedDriverId: user.id, statusHistory: JSON.stringify(history), updatedAt: new Date() })
    .where(eq(transportRequestsTable.id, id)).returning();
  await appendTransportRequestStatusEvent(id, req2.status, "accepted", "driver_accept", `Sürücü ${user.name} üstlendi`);
  if (req2.customerId) {
    await pushNotif(req2.customerId, "customer", {
      type: "request_accepted", requestId: id,
      title: "Sürücü Bulundu!",
      body: `${user.name} talebinizi kabul etti. Takip: ${req2.trackingCode}`,
    });
  }
  res.json(updated);
});

/* PATCH /api/transport/requests/:id/status — sürücü durum günceller */
router.patch("/transport/requests/:id/status", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const id = parseInt(req.params["id"] ?? "0");
  const { status, note } = req.body as { status: string; note?: string };
  const validStatuses = ["arrived_pickup", "picked_up", "in_transit", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: "Geçersiz durum" }); return; }
  const [req2] = await db.select().from(transportRequestsTable)
    .where(and(eq(transportRequestsTable.id, id), eq(transportRequestsTable.assignedDriverId, user.id)));
  if (!req2) { res.status(403).json({ error: "Bu talep size ait değil" }); return; }
  const history = (req2.statusHistory as any[]) || [];
  history.push({ status, note: note || STATUS_LABELS[status], ts: new Date().toISOString() });
  const [updated] = await db.update(transportRequestsTable)
    .set({ status, statusHistory: JSON.stringify(history), updatedAt: new Date() })
    .where(eq(transportRequestsTable.id, id)).returning();
  await appendTransportRequestStatusEvent(id, req2.status, status, "driver_panel", note || STATUS_LABELS[status] || status);

  const rt = String(req2.requestType ?? "").toLowerCase();
  const parcelLike = rt === "courier" || rt === "cargo" || rt === "kargo";
  const notifMessages: Record<string, { title: string; body: string }> = {
    arrived_pickup: { title: "Sürücü Geldi!", body: `Sürücünüz adresinizde. Takip: ${req2.trackingCode}` },
    picked_up:      { title: "Yola Çıkıldı!", body: `Sürücünüz ${parcelLike ? "gönderinizi aldı" : "yola çıktı"}. Takip: ${req2.trackingCode}` },
    in_transit:     { title: "Yolda!", body: `${parcelLike ? "Gönderiniz" : "Aracınız"} yolda. Takip: ${req2.trackingCode}` },
    delivered:      { title: "Teslim Edildi!", body: `${parcelLike ? "Gönderiniz teslim edildi" : "Varış noktasındasınız"}. Takip: ${req2.trackingCode}` },
    cancelled:      { title: "İptal Edildi", body: `Talep iptal edildi. Takip: ${req2.trackingCode}` },
  };

  if (req2.customerId && notifMessages[status]) {
    await pushNotif(req2.customerId, "customer", {
      type: status, requestId: id, ...notifMessages[status],
    });
  }
  res.json(updated);
});

/* — ARAÇ KAYIT ──────────────────────────────────────────────── */
router.post("/transport/vehicles", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const { vehicleType, brand, model, plateNumber, capacity, description, photoUrl, city } = req.body;
  if (!vehicleType) { res.status(400).json({ error: "Araç tipi gerekli" }); return; }
  const [vehicle] = await db.insert(transportVehiclesTable).values({
    ownerId: user.id, vehicleType, brand, model, plateNumber,
    capacity: capacity || 1, description, photoUrl, city,
  }).returning();
  res.json(vehicle);
});

router.get("/transport/vehicles/my", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  const vehicles = await db.select().from(transportVehiclesTable)
    .where(eq(transportVehiclesTable.ownerId, user.id));
  res.json(vehicles);
});

router.get("/transport/vehicles", async (req, res): Promise<void> => {
  const { type, city, admin } = req.query as Record<string, string>;
  const conds: SQL[] = [];
  if (!admin) {
    conds.push(eq(transportVehiclesTable.isActive, true));
    conds.push(eq(transportVehiclesTable.isAvailable, true));
  }
  if (type) {
    const variants = TRANSPORT_VEHICLE_TYPE_ALIASES[type] ?? [type];
    conds.push(inArray(transportVehiclesTable.vehicleType, variants));
  }
  if (city) conds.push(ilike(transportVehiclesTable.city, `%${city}%`));
  const whereSql = conds.length ? and(...conds) : undefined;

  if (admin === "1") {
    const rows = await db
      .select({ v: transportVehiclesTable, o: shopUsersTable })
      .from(transportVehiclesTable)
      .leftJoin(shopUsersTable, eq(transportVehiclesTable.ownerId, shopUsersTable.id))
      .where(whereSql)
      .orderBy(desc(transportVehiclesTable.rating))
      .limit(200);
    res.json(
      rows.map((r) => ({
        ...r.v,
        ownerName: r.o?.name ?? null,
        ownerEmail: r.o?.email ?? null,
        ownerPhone: r.o?.phone ?? null,
      })),
    );
    return;
  }

  const vehicles = await db
    .select()
    .from(transportVehiclesTable)
    .where(whereSql)
    .orderBy(desc(transportVehiclesTable.rating))
    .limit(200);
  res.json(vehicles);
});

/* — BİLDİRİMLER ────────────────────────────────────────────── */

/* GET /api/transport/notifications — okunmamış bildirimler */
router.get("/transport/notifications", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.json([]); return; }
  const notifs = await db.select().from(transportNotificationsTable)
    .where(eq(transportNotificationsTable.recipientId, user.id))
    .orderBy(desc(transportNotificationsTable.createdAt)).limit(30);
  res.json(notifs);
});

/* POST /api/transport/notifications/read — hepsini okundu işaretle */
router.post("/transport/notifications/read", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş gerekli" }); return; }
  await db.update(transportNotificationsTable)
    .set({ isRead: true })
    .where(and(
      eq(transportNotificationsTable.recipientId, user.id),
      eq(transportNotificationsTable.isRead, false),
    ));
  res.json({ success: true });
});

/* GET /api/transport/notifications/unread-count */
router.get("/transport/notifications/unread-count", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.json({ count: 0 }); return; }
  const [row] = await db.select({ count: sql<number>`COUNT(*)::int` })
    .from(transportNotificationsTable)
    .where(and(
      eq(transportNotificationsTable.recipientId, user.id),
      eq(transportNotificationsTable.isRead, false),
    ));
  res.json({ count: row?.count ?? 0 });
});

export default router;
