import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { db, ordersTable, productsTable, paymentSettingsTable, stripeWebhookEventsTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import Stripe from "stripe";
import { getShopUser } from "./shop-auth";
import { withProductsStockAndOrder } from "../lib/order-stock.js";

const router: IRouter = Router();

let ensuredOrdersLegalCols = false;
async function ensureShopOrdersLegalColumns() {
  if (ensuredOrdersLegalCols) return;
  await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS legal_distance_sales_accepted BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS legal_preinfo_accepted BOOLEAN NOT NULL DEFAULT false`);
  ensuredOrdersLegalCols = true;
}

function genOrderNumber() {
  return `AHK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function genTrackingCode() {
  return `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

async function getStripe(): Promise<Stripe | null> {
  const rows = await db.select().from(paymentSettingsTable).limit(1);
  const settings = rows[0];
  if (!settings?.stripeEnabled || !settings?.stripeSecretKey) return null;
  return new Stripe(settings.stripeSecretKey, { apiVersion: "2024-06-20" as any });
}

/* — Create Payment Intent ───────────────────────────────────────── */

router.post("/shop/checkout/intent", async (req, res): Promise<void> => {
  const { items } = req.body; // [{ productId, qty }]
  if (!items?.length) { res.status(400).json({ error: "Sepet boş" }); return; }

  const ids: number[] = items.map((i: any) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, ids));

  let subtotal = 0;
  for (const item of items) {
    const p = products.find((pr: any) => pr.id === item.productId);
    if (!p) continue;
    const price = parseFloat(p.salePrice ?? p.price ?? "0");
    subtotal += price * item.qty;
  }

  const payRows = await db.select().from(paymentSettingsTable).limit(1);
  const taxRate = parseFloat(payRows[0]?.taxRate ?? "20") / 100;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const stripe = await getStripe();
  if (!stripe) {
    // Stripe not configured - return total for display only
    res.json({ clientSecret: null, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), total: total.toFixed(2), stripeConfigured: false });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "try",
    payment_method_types: ["card"],
    metadata: {
      items: JSON.stringify(items),
      checkout_source: "ahenk_shop",
      created_ts: String(Date.now()),
    },
  });

  res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), total: total.toFixed(2), stripeConfigured: true });
});

/* — Stripe Publishable Key ──────────────────────────────────────── */

router.get("/shop/checkout/stripe-key", async (_req, res): Promise<void> => {
  const rows = await db.select().from(paymentSettingsTable).limit(1);
  const settings = rows[0];
  if (!settings?.stripeEnabled || !settings?.stripePublishableKey) {
    res.json({ key: null, enabled: false });
    return;
  }
  res.json({ key: settings.stripePublishableKey, enabled: true });
});

/* — Place Order ─────────────────────────────────────────────────── */

type CheckoutCartItem = { productId: number; qty: number };

router.post("/shop/checkout/order", async (req, res): Promise<void> => {
  await ensureShopOrdersLegalColumns();
  const user = await getShopUser(req);

  const body = req.body as Record<string, unknown>;
  const itemsRaw = body.items;
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const customerAddress = typeof body.customerAddress === "string" ? body.customerAddress.trim() : "";
  const customerCity = typeof body.customerCity === "string" ? body.customerCity.trim() : "";
  const customerDistrict =
    typeof body.customerDistrict === "string" ? body.customerDistrict.trim() || null : null;
  const customerPostal = typeof body.customerPostal === "string" ? body.customerPostal.trim() : "";
  const billingName = typeof body.billingName === "string" ? body.billingName.trim() : "";
  const billingAddress = typeof body.billingAddress === "string" ? body.billingAddress.trim() : "";
  const billingCity = typeof body.billingCity === "string" ? body.billingCity.trim() : "";
  const billingTaxId = typeof body.billingTaxId === "string" ? body.billingTaxId.trim() || null : null;
  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : null;
  const legalDistanceSalesAccepted = Boolean(body.legalDistanceSalesAccepted);
  const legalPreinfoAccepted = Boolean(body.legalPreinfoAccepted);

  if (!customerName || !customerEmail || !customerPhone || !customerAddress || !customerCity) {
    res.status(400).json({ error: "Tüm zorunlu alanlar doldurulmalıdır" }); return;
  }
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    res.status(400).json({ error: "Sepet boş veya geçersiz" }); return;
  }
  const items = itemsRaw as CheckoutCartItem[];
  if (!legalDistanceSalesAccepted || !legalPreinfoAccepted) {
    res.status(400).json({
      error: "Mesafeli satış sözleşmesi ve ön bilgilendirme formunu onaylamanız zorunludur.",
    });
    return;
  }

  const ids: number[] = items.map((i) => Number(i.productId)).filter((n) => Number.isFinite(n));
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, ids));

  let subtotal = 0;
  const orderItems: any[] = [];
  for (const item of items) {
    const p = products.find((pr: any) => pr.id === item.productId);
    if (!p) continue;
    const unitPrice = parseFloat(p.salePrice ?? p.price ?? "0");
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;
    orderItems.push({ productId: p.id, name: p.name, qty: item.qty, unitPrice, total: lineTotal, imageUrl: p.imageUrl });
  }

  const payRows = await db.select().from(paymentSettingsTable).limit(1);
  const taxRate = parseFloat(payRows[0]?.taxRate ?? "20") / 100;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const orderNumber = genOrderNumber();
  const trackingCode = genTrackingCode();

  // Stripe etkinse ödeme intent zorunlu — istemci stripeConfigured bayrağına güvenilmez.
  let paymentStatus = "pending";
  let stripeId: string | null = null;

  const stripe = await getStripe();
  if (stripe) {
    if (!paymentIntentId) {
      res.status(402).json({ error: "Kart ödemesi gerekli (Stripe yapılandırılmış)." });
      return;
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      res.status(402).json({ error: "Ödeme doğrulanamadı. Lütfen kart işlemini tamamlayın." });
      return;
    }
    paymentStatus = "paid";
    stripeId = paymentIntentId;
  }

  const stockOrder = await withProductsStockAndOrder(items, async (tx) => {
    const [row] = await tx.insert(ordersTable).values({
      orderNumber,
      trackingCode,
      userId: user?.id ?? null,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerDistrict: customerDistrict ?? null,
      customerPostal,
      billingName: billingName || customerName,
      billingAddress: billingAddress || customerAddress,
      billingCity: billingCity || customerCity,
      billingTaxId: billingTaxId || null,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: total.toFixed(2),
      paymentMethod: "credit_card",
      paymentStatus,
      stripePaymentIntentId: stripeId,
      status: paymentStatus === "paid" ? "processing" : "pending",
      items: JSON.stringify(orderItems),
      legalDistanceSalesAccepted: true,
      legalPreinfoAccepted: true,
    }).returning();
    return row;
  });

  if (!stockOrder.ok) {
    res.status(stockOrder.statusCode).json({ error: stockOrder.error });
    return;
  }

  const order = stockOrder.result;
  res.status(201).json({ order, trackingCode, orderNumber });
});

/* — Track Order (public) ────────────────────────────────────────── */

router.get("/shop/track/:code", async (req, res): Promise<void> => {
  const { code } = req.params;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.trackingCode, code));
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }

  const safe = {
    id: order.id, orderNumber: order.orderNumber, trackingCode: order.trackingCode,
    customerName: order.customerName, status: order.status, paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount, subtotal: order.subtotal, taxAmount: order.taxAmount,
    cargoCompany: order.cargoCompany, cargoTrackingNumber: order.cargoTrackingNumber, cargoTrackingUrl: order.cargoTrackingUrl,
    shippedAt: order.shippedAt, deliveredAt: order.deliveredAt, estimatedDelivery: order.estimatedDelivery,
    createdAt: order.createdAt, items: order.items,
  };
  res.json(safe);
});

/* — My Orders (auth) ────────────────────────────────────────────── */

router.get("/shop/my-orders", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .orderBy(ordersTable.createdAt)
    .limit(50);

  const safe = orders.map(o => ({
    id: o.id, orderNumber: o.orderNumber, trackingCode: o.trackingCode,
    status: o.status, paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount, cargoCompany: o.cargoCompany,
    cargoTrackingNumber: o.cargoTrackingNumber, cargoTrackingUrl: o.cargoTrackingUrl,
    shippedAt: o.shippedAt, deliveredAt: o.deliveredAt, estimatedDelivery: o.estimatedDelivery,
    createdAt: o.createdAt, items: o.items,
  }));
  res.json(safe);
});

/**
 * Stripe → mağaza siparişi: imza doğrulama + event id idempotency + audit satırı.
 * Ham JSON gövdesi için `app.ts` içinde bu yola `express.raw` uygulanır.
 */
export async function handleShopStripeWebhook(req: Request, res: Response): Promise<void> {
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).json({ error: "Raw body gerekli" }); return;
  }

  const [settings] = await db.select().from(paymentSettingsTable).limit(1);
  const whSecret = settings?.stripeWebhookSecret?.trim();
  const stripe = await getStripe();
  if (!stripe || !whSecret) {
    res.status(503).json({ error: "Stripe webhook yapılandırılmamış" }); return;
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig || "", whSecret);
  } catch {
    res.status(400).json({ error: "İmza doğrulanamadı" }); return;
  }

  const [dup] = await db.select({ id: stripeWebhookEventsTable.id }).from(stripeWebhookEventsTable)
    .where(eq(stripeWebhookEventsTable.stripeEventId, event.id)).limit(1);
  if (dup) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  let outcome = "ignored";
  let detail: string | null = null;
  let relatedOrderId: number | null = null;

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const src = (pi.metadata && typeof pi.metadata["checkout_source"] === "string")
      ? pi.metadata["checkout_source"]
      : "";
    const updated = await db.update(ordersTable).set({
      paymentStatus: "paid",
      status: "processing",
      updatedAt: new Date(),
    }).where(and(
      eq(ordersTable.stripePaymentIntentId, pi.id),
      eq(ordersTable.paymentStatus, "pending"),
    )).returning({ id: ordersTable.id });
    if (updated.length) {
      outcome = "order_updated";
      relatedOrderId = updated[0].id;
      detail = src ? `order_id=${updated[0].id};source=${src}` : `order_id=${updated[0].id}`;
    } else {
      outcome = "no_matching_order";
      detail = src ? `pi=${pi.id};source=${src}` : `pi=${pi.id}`;
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const src = (pi.metadata && typeof pi.metadata["checkout_source"] === "string")
      ? pi.metadata["checkout_source"]
      : "";
    const updated = await db.update(ordersTable).set({
      paymentStatus: "failed",
      updatedAt: new Date(),
    }).where(and(
      eq(ordersTable.stripePaymentIntentId, pi.id),
      eq(ordersTable.paymentStatus, "pending"),
    )).returning({ id: ordersTable.id });
    outcome = updated.length ? "order_marked_failed" : "no_matching_order";
    detail = src ? `pi=${pi.id};source=${src}` : `pi=${pi.id}`;
    if (updated.length) {
      relatedOrderId = updated[0].id;
      detail = src ? `order_id=${updated[0].id};source=${src}` : `order_id=${updated[0].id}`;
    }
  }

  try {
    await db.insert(stripeWebhookEventsTable).values({
      stripeEventId: event.id,
      eventType: event.type,
      outcome,
      detail,
      relatedOrderId,
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    res.status(500).json({ error: "Audit kaydı yazılamadı" });
    return;
  }

  res.status(200).json({ received: true, outcome });
}

export default router;
