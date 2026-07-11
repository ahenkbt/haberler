import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  mapBusinessesTable,
  mapProductsTable,
  mapCampaignsTable,
  mapReservationsTable,
  mapOrdersTable,
  mapPremiumPaymentsTable,
  mapPopularLocationsTable,
  mapBusinessApplicationsTable,
  mapUsersTable,
  paymentSettingsTable,
  stripeWebhookEventsTable,
} from "@workspace/db";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe.js";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { getSessionSecret } from "../lib/secrets.js";
import bcrypt from "bcryptjs";

const MAP_OWNER_JWT_SECRET = getSessionSecret();

async function allowMapBusinessOwner(req: Request, res: Response, businessId: string): Promise<boolean> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    res.status(401).json({ success: false, error: "Giriş gerekli", code: "AUTH_REQUIRED" });
    return false;
  }
  try {
    const decoded = jwt.verify(token, MAP_OWNER_JWT_SECRET) as { userId?: string };
    if (!decoded.userId) throw new Error("missing userId");
    const [biz] = await db
      .select({ id: mapBusinessesTable.id })
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.id, businessId), eq(mapBusinessesTable.ownerId, decoded.userId)))
      .limit(1);
    if (!biz) {
      res.status(403).json({ success: false, error: "İşletme bulunamadı veya yetkiniz yok", code: "FORBIDDEN" });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: "Geçersiz oturum", code: "AUTH_INVALID" });
    return false;
  }
}

async function allowPremiumBusinessMutate(req: Request, res: Response, businessId: string): Promise<boolean> {
  if (denyUnlessAdminMaintenance(req, res, "premium")) return true;
  return allowMapBusinessOwner(req, res, businessId);
}

async function allowPremiumProductMutate(req: Request, res: Response, productId: string): Promise<boolean> {
  if (denyUnlessAdminMaintenance(req, res, "premium")) return true;
  const [prod] = await db
    .select({ businessId: mapProductsTable.businessId })
    .from(mapProductsTable)
    .where(eq(mapProductsTable.id, productId))
    .limit(1);
  if (!prod) {
    res.status(404).json({ success: false, error: "Ürün bulunamadı" });
    return false;
  }
  return allowMapBusinessOwner(req, res, prod.businessId);
}

async function allowPremiumCampaignMutate(req: Request, res: Response, campaignId: string): Promise<boolean> {
  if (denyUnlessAdminMaintenance(req, res, "premium")) return true;
  const [camp] = await db
    .select({ businessId: mapCampaignsTable.businessId })
    .from(mapCampaignsTable)
    .where(eq(mapCampaignsTable.id, campaignId))
    .limit(1);
  if (!camp) {
    res.status(404).json({ success: false, error: "Kampanya bulunamadı" });
    return false;
  }
  return allowMapBusinessOwner(req, res, camp.businessId);
}

async function allowPremiumReservationMutate(req: Request, res: Response, reservationId: string): Promise<boolean> {
  if (denyUnlessAdminMaintenance(req, res, "premium")) return true;
  const [row] = await db
    .select({ businessId: mapReservationsTable.businessId })
    .from(mapReservationsTable)
    .where(eq(mapReservationsTable.id, reservationId))
    .limit(1);
  if (!row) {
    res.status(404).json({ success: false, error: "Rezervasyon bulunamadı" });
    return false;
  }
  return allowMapBusinessOwner(req, res, row.businessId);
}

async function allowPremiumOrderMutate(req: Request, res: Response, orderId: string): Promise<boolean> {
  if (denyUnlessAdminMaintenance(req, res, "premium")) return true;
  const [row] = await db
    .select({ businessId: mapOrdersTable.businessId })
    .from(mapOrdersTable)
    .where(eq(mapOrdersTable.id, orderId))
    .limit(1);
  if (!row) {
    res.status(404).json({ success: false, error: "Sipariş bulunamadı" });
    return false;
  }
  return allowMapBusinessOwner(req, res, row.businessId);
}

function toSlug(text: string): string {
  const tr: Record<string, string> = { ğ:"g",Ğ:"G",ü:"u",Ü:"U",ş:"s",Ş:"S",ı:"i",İ:"I",ö:"o",Ö:"O",ç:"c",Ç:"C" };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, m => tr[m] || m)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function genUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name);
  let slug = base; let attempt = 1;
  while (attempt <= 200) {
    const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
    if (clash.length === 0) return slug;
    slug = `${base}-${++attempt}`;
  }
  return `${base}-${Date.now()}`;
}

async function createBusinessFromApplication(appId: string, planMonths: number): Promise<string | null> {
  try {
    const [app] = await db.select().from(mapBusinessApplicationsTable).where(eq(mapBusinessApplicationsTable.id, appId)).limit(1);
    if (!app) return null;
    if (app.status === "approved" && app.businessId) {
      return app.businessId;
    }
    // Find or create owner
    let ownerId: string;
    const existing = await db.select({ id: mapUsersTable.id }).from(mapUsersTable).where(eq(mapUsersTable.email, app.ownerEmail)).limit(1);
    if (existing.length > 0) {
      ownerId = existing[0].id;
    } else {
      const tempPass = Math.random().toString(36).slice(2, 10);
      const passwordHash = await bcrypt.hash(tempPass, 10);
      const [newUser] = await db.insert(mapUsersTable).values({
        email: app.ownerEmail, passwordHash, displayName: app.ownerName,
        phone: app.ownerPhone, provider: "email",
      }).returning({ id: mapUsersTable.id });
      ownerId = newUser.id;
    }
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + planMonths);
    const slug = await genUniqueSlug(app.businessName);
    const [biz] = await db.insert(mapBusinessesTable).values({
      name: app.businessName, slug, categoryId: app.categoryId, address: app.address,
      phone: app.phone, website: app.website, description: app.description,
      latitude: app.latitude, longitude: app.longitude,
      ownerId, isPremium: true, premiumExpiresAt: expiresAt, isActive: true,
    }).returning({ id: mapBusinessesTable.id });
    await db.update(mapBusinessApplicationsTable)
      .set({ status: "approved", businessId: biz.id, updatedAt: new Date() })
      .where(eq(mapBusinessApplicationsTable.id, appId));
    return biz.id;
  } catch { return null; }
}

const router = Router();

/* — STRIPE PUBLISHABLE KEY ─────────────────────────────────────── */
router.get("/premium/stripe-key", async (_req, res): Promise<void> => {
  try {
    const key = await getStripePublishableKey();
    res.json({ success: true, publishableKey: key });
  } catch {
    res.json({ success: false, publishableKey: null });
  }
});

/* — PREMIUM CHECKOUT ───────────────────────────────────────────── */
// Accepts either:
//   { businessId, planMonths }  — for renewing an existing business
//   { applicationId, planMonths } — for a new application (business created on payment)
router.post("/premium/checkout", async (req, res): Promise<void> => {
  try {
    const { businessId, applicationId, planMonths = 1 } = req.body;
    const months: number = Math.max(1, parseInt(String(planMonths)) || 1);

    let displayName = "";
    let resolvedBusinessId: string | null = businessId || null;
    let resolvedApplicationId: string | null = applicationId || null;

    if (businessId) {
      // Renewal / upgrade of an existing business
      const [biz] = await db.select({ name: mapBusinessesTable.name }).from(mapBusinessesTable).where(eq(mapBusinessesTable.id, businessId)).limit(1);
      if (!biz) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
      displayName = biz.name;
    } else if (applicationId) {
      // New application — business will be created after payment
      const [app] = await db.select({ businessName: mapBusinessApplicationsTable.businessName })
        .from(mapBusinessApplicationsTable).where(eq(mapBusinessApplicationsTable.id, applicationId)).limit(1);
      if (!app) { res.status(404).json({ success: false, error: "Başvuru bulunamadı" }); return; }
      displayName = app.businessName;
    } else {
      res.status(400).json({ success: false, error: "businessId veya applicationId gerekli" }); return;
    }

    const stripe = await getUncachableStripeClient();
    const unitAmount = months === 12 ? 249900 : months === 6 ? 269900 : 29900;
    const planLabel = months === 12 ? "Yıllık Premium" : months === 6 ? "6 Aylık Premium" : "Aylık Premium";
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "try",
          product_data: {
            name: `${displayName} — ${planLabel} İşletme`,
            description: `Haritalar platformunda ${months} ay premium işletme rozeti ve yönetim paneli`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/kesfet/premium-basarili?session_id={CHECKOUT_SESSION_ID}${resolvedBusinessId ? `&business=${resolvedBusinessId}` : ""}${resolvedApplicationId ? `&application=${resolvedApplicationId}` : ""}`,
      cancel_url: `${origin}/isletme-basvuru`,
      metadata: {
        businessId: resolvedBusinessId || "",
        applicationId: resolvedApplicationId || "",
        planMonths: String(months),
      },
    });

    // Record pending payment (only for existing businesses)
    if (resolvedBusinessId) {
      await db.insert(mapPremiumPaymentsTable).values({
        businessId: resolvedBusinessId,
        stripeSessionId: session.id,
        amount: unitAmount / 100,
        currency: "try",
        status: "pending",
        planMonths: months,
      }).onConflictDoNothing();
    }

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — VERIFY PAYMENT SUCCESS ─────────────────────────────────────── */
router.get("/premium/verify/:sessionId", async (req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status === "paid") {
      const { businessId, applicationId, planMonths } = session.metadata ?? {};
      const months = parseInt(planMonths || "1");
      let resolvedBusinessId = businessId || null;

      if (applicationId) {
        // Application-based payment — create business if not yet done (idempotent)
        const [app] = await db.select({ businessId: mapBusinessApplicationsTable.businessId, status: mapBusinessApplicationsTable.status })
          .from(mapBusinessApplicationsTable).where(eq(mapBusinessApplicationsTable.id, applicationId)).limit(1);
        if (app?.status !== "approved" || !app.businessId) {
          resolvedBusinessId = await createBusinessFromApplication(applicationId, months);
        } else {
          resolvedBusinessId = app.businessId;
        }
      } else if (businessId) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);
        await db.update(mapBusinessesTable)
          .set({ isPremium: true, premiumExpiresAt: expiresAt, updatedAt: new Date() })
          .where(eq(mapBusinessesTable.id, businessId));
      }
      res.json({ success: true, paid: true, businessId: resolvedBusinessId });
    } else {
      res.json({ success: true, paid: false });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — PRODUCTS ────────────────────────────────────────────────────── */
router.get("/premium/businesses/:id/products", async (req, res): Promise<void> => {
  const adminAll = String(req.query["admin"] ?? "") === "1";
  if (adminAll && !denyUnlessAdminMaintenance(req, res, "premium")) return;
  const conditions = [eq(mapProductsTable.businessId, req.params.id)];
  if (!adminAll) conditions.push(eq(mapProductsTable.isAvailable, true));
  const products = await db
    .select()
    .from(mapProductsTable)
    .where(and(...conditions))
    .orderBy(mapProductsTable.sortOrder);
  res.json({ success: true, data: products });
});

router.post("/premium/businesses/:id/products", async (req, res): Promise<void> => {
  if (!(await allowPremiumBusinessMutate(req, res, req.params.id))) return;
  const { name, description, price, discountedPrice, imageUrl, category, isDeliverable } = req.body;
  if (!name) { res.status(400).json({ success: false, error: "name gerekli" }); return; }
  const [row] = await db.insert(mapProductsTable).values({
    businessId: req.params.id, name, description, price: price ? parseFloat(price) : null,
    discountedPrice: discountedPrice ? parseFloat(discountedPrice) : null, imageUrl, category,
    isDeliverable: isDeliverable || false,
  }).returning();
  res.json({ success: true, data: row });
});

router.put("/premium/products/:id", async (req, res): Promise<void> => {
  if (!(await allowPremiumProductMutate(req, res, req.params.id))) return;
  const { name, description, price, discountedPrice, imageUrl, category, isAvailable, isDeliverable, sortOrder } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price ? parseFloat(price) : null;
  if (discountedPrice !== undefined) updates.discountedPrice = discountedPrice ? parseFloat(discountedPrice) : null;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (category !== undefined) updates.category = category;
  if (isAvailable !== undefined) updates.isAvailable = isAvailable;
  if (isDeliverable !== undefined) updates.isDeliverable = isDeliverable;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [row] = await db.update(mapProductsTable).set(updates).where(eq(mapProductsTable.id, req.params.id)).returning();
  res.json({ success: true, data: row });
});

router.delete("/premium/products/:id", async (req, res): Promise<void> => {
  if (!(await allowPremiumProductMutate(req, res, req.params.id))) return;
  await db.delete(mapProductsTable).where(eq(mapProductsTable.id, req.params.id));
  res.json({ success: true });
});

/* — CAMPAIGNS ───────────────────────────────────────────────────── */
router.get("/premium/businesses/:id/campaigns", async (req, res): Promise<void> => {
  const adminAll = String(req.query["admin"] ?? "") === "1";
  if (adminAll && !denyUnlessAdminMaintenance(req, res, "premium")) return;
  const conditions = [eq(mapCampaignsTable.businessId, req.params.id)];
  if (!adminAll) conditions.push(eq(mapCampaignsTable.isActive, true));
  const campaigns = await db
    .select()
    .from(mapCampaignsTable)
    .where(and(...conditions))
    .orderBy(desc(mapCampaignsTable.createdAt));
  res.json({ success: true, data: campaigns });
});

router.post("/premium/businesses/:id/campaigns", async (req, res): Promise<void> => {
  if (!(await allowPremiumBusinessMutate(req, res, req.params.id))) return;
  const { title, description, imageUrl, discountPercent, discountAmount, validFrom, validUntil } = req.body;
  if (!title) { res.status(400).json({ success: false, error: "title gerekli" }); return; }
  const [row] = await db.insert(mapCampaignsTable).values({
    businessId: req.params.id, title, description, imageUrl,
    discountPercent: discountPercent ? parseInt(discountPercent) : null,
    discountAmount: discountAmount ? parseFloat(discountAmount) : null,
    validFrom: validFrom ? new Date(validFrom) : null,
    validUntil: validUntil ? new Date(validUntil) : null,
  }).returning();
  res.json({ success: true, data: row });
});

router.delete("/premium/campaigns/:id", async (req, res): Promise<void> => {
  if (!(await allowPremiumCampaignMutate(req, res, req.params.id))) return;
  await db.update(mapCampaignsTable).set({ isActive: false }).where(eq(mapCampaignsTable.id, req.params.id));
  res.json({ success: true });
});

/* — RESERVATIONS ────────────────────────────────────────────────── */
router.get("/premium/businesses/:id/reservations", async (req, res): Promise<void> => {
  if (!(await allowPremiumBusinessMutate(req, res, req.params.id))) return;
  const reservations = await db.select().from(mapReservationsTable)
    .where(eq(mapReservationsTable.businessId, req.params.id))
    .orderBy(desc(mapReservationsTable.reservationDate));
  res.json({ success: true, data: reservations });
});

router.post("/premium/businesses/:id/reservations", async (req, res): Promise<void> => {
  const { guestName, guestPhone, guestEmail, reservationDate, partySize, note } = req.body;
  if (!guestName || !reservationDate) { res.status(400).json({ success: false, error: "guestName ve reservationDate gerekli" }); return; }
  const [row] = await db.insert(mapReservationsTable).values({
    businessId: req.params.id, guestName, guestPhone, guestEmail,
    reservationDate: new Date(reservationDate), partySize: partySize || 1, note,
  }).returning();
  res.json({ success: true, data: row });
});

router.put("/premium/reservations/:id/status", async (req, res): Promise<void> => {
  if (!(await allowPremiumReservationMutate(req, res, req.params.id))) return;
  const [row] = await db.update(mapReservationsTable)
    .set({ status: req.body.status, updatedAt: new Date() })
    .where(eq(mapReservationsTable.id, req.params.id))
    .returning();
  res.json({ success: true, data: row });
});

/* — ORDERS ──────────────────────────────────────────────────────── */
router.get("/premium/businesses/:id/orders", async (req, res): Promise<void> => {
  if (!(await allowPremiumBusinessMutate(req, res, req.params.id))) return;
  const orders = await db.select().from(mapOrdersTable)
    .where(eq(mapOrdersTable.businessId, req.params.id))
    .orderBy(desc(mapOrdersTable.createdAt));
  res.json({ success: true, data: orders });
});

router.post("/premium/businesses/:id/orders", async (req, res): Promise<void> => {
  const { guestName, guestPhone, items, totalAmount, deliveryAddress, note } = req.body;
  if (!items || !totalAmount) { res.status(400).json({ success: false, error: "items ve totalAmount gerekli" }); return; }
  const [row] = await db.insert(mapOrdersTable).values({
    businessId: req.params.id, guestName, guestPhone, items, totalAmount: parseFloat(totalAmount), deliveryAddress, note,
  }).returning();
  res.json({ success: true, data: row });
});

router.put("/premium/orders/:id/status", async (req, res): Promise<void> => {
  if (!(await allowPremiumOrderMutate(req, res, req.params.id))) return;
  const [row] = await db.update(mapOrdersTable)
    .set({ status: req.body.status, updatedAt: new Date() })
    .where(eq(mapOrdersTable.id, req.params.id))
    .returning();
  res.json({ success: true, data: row });
});

/* — BUSINESS OWNER PROFILE UPDATE ─────────────────────────────── */
router.put("/premium/businesses/:id/profile", async (req, res): Promise<void> => {
  if (!(await allowPremiumBusinessMutate(req, res, req.params.id))) return;
  const {
    name, description, phone, whatsappNumber, email, website,
    instagramUrl, facebookUrl, twitterUrl, youtubeUrl, menuUrl,
    workingHours, popularHours, priceLevel, hasDelivery, hasReservation, hasOnlineOrder,
    tags, coverPhotoUrl,
  } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (phone !== undefined) updates.phone = phone;
  if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
  if (email !== undefined) updates.email = email;
  if (website !== undefined) updates.website = website;
  if (instagramUrl !== undefined) updates.instagramUrl = instagramUrl;
  if (facebookUrl !== undefined) updates.facebookUrl = facebookUrl;
  if (twitterUrl !== undefined) updates.twitterUrl = twitterUrl;
  if (youtubeUrl !== undefined) updates.youtubeUrl = youtubeUrl;
  if (menuUrl !== undefined) updates.menuUrl = menuUrl;
  if (workingHours !== undefined) updates.workingHours = workingHours;
  if (popularHours !== undefined) updates.popularHours = popularHours;
  if (priceLevel !== undefined) updates.priceLevel = priceLevel;
  if (hasDelivery !== undefined) updates.hasDelivery = hasDelivery;
  if (hasReservation !== undefined) updates.hasReservation = hasReservation;
  if (hasOnlineOrder !== undefined) updates.hasOnlineOrder = hasOnlineOrder;
  if (tags !== undefined) updates.tags = tags;
  if (coverPhotoUrl !== undefined) updates.coverPhotoUrl = coverPhotoUrl;

  const [row] = await db.update(mapBusinessesTable).set(updates).where(eq(mapBusinessesTable.id, req.params.id)).returning();
  res.json({ success: true, data: row });
});

/* — POPULAR LOCATIONS — public list ──────────────────────────── */
router.get("/popular-locations", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(mapPopularLocationsTable)
      .where(eq(mapPopularLocationsTable.isActive, true))
      .orderBy(mapPopularLocationsTable.sortOrder);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — POPULAR LOCATIONS — search ───────────────────────────────── */
router.get("/popular-locations/search", async (req, res): Promise<void> => {
  const { q = "" } = req.query as Record<string, string>;
  try {
    const rows = await db
      .select()
      .from(mapPopularLocationsTable)
      .where(and(
        eq(mapPopularLocationsTable.isActive, true),
        or(
          ilike(mapPopularLocationsTable.name, `%${q}%`),
          ilike(mapPopularLocationsTable.nameTr, `%${q}%`),
          ilike(mapPopularLocationsTable.description, `%${q}%`),
        )!,
      ))
      .orderBy(mapPopularLocationsTable.sortOrder)
      .limit(10);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — POPULAR LOCATIONS — admin CRUD ───────────────────────────── */
router.get("/admin/popular-locations", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "premium")) return;
  try {
    const rows = await db
      .select()
      .from(mapPopularLocationsTable)
      .orderBy(mapPopularLocationsTable.sortOrder);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/admin/popular-locations", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "premium")) return;
  try {
    const { name, nameTr, latitude, longitude, zoomLevel = 13, imageUrl, description, sortOrder = 0 } = req.body;
    if (!name || !latitude || !longitude) {
      res.status(400).json({ success: false, error: "name, latitude, longitude zorunlu" });
      return;
    }
    const [row] = await db.insert(mapPopularLocationsTable).values({
      name, nameTr, latitude, longitude, zoomLevel, imageUrl, description, sortOrder, isActive: true,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put("/admin/popular-locations/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "premium")) return;
  try {
    const { name, nameTr, latitude, longitude, zoomLevel, imageUrl, description, sortOrder, isActive, businessCount } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (nameTr !== undefined) updates.nameTr = nameTr;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (zoomLevel !== undefined) updates.zoomLevel = zoomLevel;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (description !== undefined) updates.description = description;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (isActive !== undefined) updates.isActive = isActive;
    if (businessCount !== undefined) updates.businessCount = businessCount;
    const [row] = await db.update(mapPopularLocationsTable).set(updates).where(eq(mapPopularLocationsTable.id, req.params.id)).returning();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete("/admin/popular-locations/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "premium")) return;
  try {
    await db.delete(mapPopularLocationsTable).where(eq(mapPopularLocationsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

async function resolvePremiumStripeWebhookClient(): Promise<{ stripe: Stripe; whSecret: string } | null> {
  const [settings] = await db.select().from(paymentSettingsTable).limit(1);
  const secretKey = settings?.stripeSecretKey?.trim();
  const whDb = settings?.stripeWebhookSecret?.trim();
  if (secretKey && whDb) {
    return {
      stripe: new Stripe(secretKey, { apiVersion: "2024-06-20" as never }),
      whSecret: whDb,
    };
  }
  const whEnv = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!whEnv) return null;
  try {
    const stripe = await getUncachableStripeClient();
    return { stripe, whSecret: whEnv };
  } catch {
    return null;
  }
}

/** Ham gövde + imza doğrulama; `app.ts` içinde `express.json` öncesinde kayıtlıdır. */
export async function handlePremiumStripeWebhook(req: Request, res: Response): Promise<void> {
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).json({ error: "Raw body gerekli" });
    return;
  }
  const resolved = await resolvePremiumStripeWebhookClient();
  if (!resolved) {
    res.status(503).json({ error: "Stripe webhook yapılandırılmamış" });
    return;
  }
  const { stripe, whSecret } = resolved;
  const sig = req.headers["stripe-signature"] as string | undefined;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig || "", whSecret);
  } catch {
    res.status(400).json({ error: "İmza doğrulanamadı" });
    return;
  }

  const [dup] = await db
    .select({ id: stripeWebhookEventsTable.id })
    .from(stripeWebhookEventsTable)
    .where(eq(stripeWebhookEventsTable.stripeEventId, event.id))
    .limit(1);
  if (dup) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  let outcome = "ignored";
  let detail: string | null = event.type;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session & {
      metadata?: { businessId?: string; applicationId?: string; planMonths?: string };
    };
    const { businessId, applicationId, planMonths } = session.metadata ?? {};
    const months = Math.max(1, parseInt(planMonths || "1", 10) || 1);

    if (applicationId) {
      const bid = await createBusinessFromApplication(applicationId, months);
      outcome = bid ? "premium_application_activated" : "premium_application_failed";
      detail = `applicationId=${applicationId};session=${session.id};businessId=${bid ?? ""}`;
    } else if (businessId) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      await db.update(mapBusinessesTable)
        .set({ isPremium: true, premiumExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(mapBusinessesTable.id, businessId));
      await db.update(mapPremiumPaymentsTable)
        .set({ status: "completed", stripePaymentIntentId: String(session.payment_intent || ""), updatedAt: new Date() })
        .where(eq(mapPremiumPaymentsTable.stripeSessionId, session.id));
      outcome = "premium_renewed";
      detail = `businessId=${businessId};session=${session.id};pi=${String(session.payment_intent ?? "")}`;
    } else {
      outcome = "premium_missing_metadata";
      detail = `session=${session.id}`;
    }
  }

  try {
    await db.insert(stripeWebhookEventsTable).values({
      stripeEventId: event.id,
      eventType: event.type,
      outcome,
      detail,
      relatedOrderId: null,
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "23505") {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    res.status(500).json({ error: "Webhook audit kaydı yazılamadı" });
    return;
  }
  res.status(200).json({ received: true, outcome });
}

export default router;
