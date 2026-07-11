import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  deliveryOrdersTable,
  deliveryOrderStatusEventsTable,
  vendorMenuItemsTable,
  vendorsTable,
} from "@workspace/db";
import { computeOrderCommissionSnapshot, parseMoney } from "./vendor-revenue.js";
import { withVendorMenuStockAndOrder } from "./order-stock.js";
import { signDeliveryTrackingToken } from "./delivery-tracking-token.js";
import { notifyVendorWhatsApp, buildOrderMessage, notifyCustomerOrderWhatsApp } from "./whatsapp.js";
import { sitePublicOrigin } from "./site-public-origin.js";
import {
  computeEcommerceShippingFee,
  groupMarketplaceLinesByVendor,
  marketplaceLineSubtotal,
  parseMarketplaceLineId,
  parseMarketplaceLinePrice,
  parseMarketplaceLineQty,
  type MarketplaceCheckoutLine,
} from "./marketplace-checkout-parse.js";

export type MarketplaceCheckoutCustomer = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  customerCity?: string;
  customerDistrict?: string;
  customerPostalCode?: string;
  paymentMethod?: string;
  notes?: string;
  legalDistanceSalesAccepted: boolean;
  legalPreinfoAccepted: boolean;
};

export type MarketplacePlacedOrder = {
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  orderId: number;
  orderNumber: string;
  trackingToken?: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
};

function orderItemsPayload(lines: MarketplaceCheckoutLine[]): Array<Record<string, unknown>> {
  return lines.map((line) => {
    const id = parseMarketplaceLineId(line)!;
    const qty = parseMarketplaceLineQty(line);
    const price = parseMarketplaceLinePrice(line);
    const baseName = String(line.name ?? "Ürün").trim() || "Ürün";
    const variant = String(line.variant ?? "").trim();
    return {
      menuItemId: id,
      id,
      name: variant ? `${baseName} (${variant})` : baseName,
      price,
      qty,
      quantity: qty,
    };
  });
}

export async function previewMarketplaceCheckout(items: MarketplaceCheckoutLine[]) {
  const menuIds = items.map(parseMarketplaceLineId).filter((id): id is number => id != null);
  if (menuIds.length === 0) {
    return { itemCount: 0, vendorGroups: [], subtotal: 0, shippingTotal: 0, grandTotal: 0 };
  }

  const rows = await db
    .select({
      id: vendorMenuItemsTable.id,
      vendorId: vendorMenuItemsTable.vendorId,
      vendorName: vendorsTable.name,
      vendorSlug: vendorsTable.slug,
      shippingFee: vendorsTable.shippingFee,
      freeShippingAbove: vendorsTable.freeShippingAbove,
    })
    .from(vendorMenuItemsTable)
    .innerJoin(vendorsTable, eq(vendorsTable.id, vendorMenuItemsTable.vendorId))
    .where(and(inArray(vendorMenuItemsTable.id, menuIds), eq(vendorsTable.active, true)));

  const vendorIdByMenuItem = new Map(rows.map((r) => [r.id, r.vendorId]));
  const vendorMeta = new Map(rows.map((r) => [r.vendorId, r]));
  const groups = groupMarketplaceLinesByVendor(items, vendorIdByMenuItem);

  const vendorGroups: Array<{
    vendorId: number;
    vendorName: string;
    vendorSlug: string;
    itemCount: number;
    subtotal: number;
    shippingFee: number;
    total: number;
  }> = [];

  let subtotal = 0;
  let shippingTotal = 0;

  for (const [vendorId, lines] of groups) {
    const meta = vendorMeta.get(vendorId);
    if (!meta) continue;
    const groupSubtotal = marketplaceLineSubtotal(lines);
    const ship = computeEcommerceShippingFee(
      groupSubtotal,
      parseMoney(meta.shippingFee),
      parseMoney(meta.freeShippingAbove),
    );
    subtotal += groupSubtotal;
    shippingTotal += ship;
    vendorGroups.push({
      vendorId,
      vendorName: meta.vendorName,
      vendorSlug: meta.vendorSlug,
      itemCount: lines.length,
      subtotal: Math.round(groupSubtotal * 100) / 100,
      shippingFee: ship,
      total: Math.round((groupSubtotal + ship) * 100) / 100,
    });
  }

  return {
    itemCount: items.length,
    vendorGroups,
    subtotal: Math.round(subtotal * 100) / 100,
    shippingTotal: Math.round(shippingTotal * 100) / 100,
    grandTotal: Math.round((subtotal + shippingTotal) * 100) / 100,
  };
}

export async function placeMarketplaceCheckout(
  items: MarketplaceCheckoutLine[],
  customer: MarketplaceCheckoutCustomer,
): Promise<
  | { ok: true; orders: MarketplacePlacedOrder[]; preview: Awaited<ReturnType<typeof previewMarketplaceCheckout>> }
  | { ok: false; statusCode: number; error: string }
> {
  if (!customer.legalDistanceSalesAccepted || !customer.legalPreinfoAccepted) {
    return {
      ok: false,
      statusCode: 400,
      error: "Mesafeli satış sözleşmesi ve ön bilgilendirme formunu onaylamanız zorunludur.",
    };
  }
  if (!customer.customerName.trim() || !customer.customerPhone.trim() || !customer.customerAddress.trim()) {
    return { ok: false, statusCode: 400, error: "Ad, telefon ve teslimat adresi zorunludur." };
  }

  const preview = await previewMarketplaceCheckout(items);
  if (preview.vendorGroups.length === 0) {
    return { ok: false, statusCode: 400, error: "Sepette geçerli ürün bulunamadı." };
  }

  const menuIds = items.map(parseMarketplaceLineId).filter((id): id is number => id != null);
  const rows = await db
    .select({
      id: vendorMenuItemsTable.id,
      vendorId: vendorMenuItemsTable.vendorId,
    })
    .from(vendorMenuItemsTable)
    .where(inArray(vendorMenuItemsTable.id, menuIds));
  const vendorIdByMenuItem = new Map(rows.map((r) => [r.id, r.vendorId]));
  const groups = groupMarketplaceLinesByVendor(items, vendorIdByMenuItem);

  const placed: MarketplacePlacedOrder[] = [];
  const origin = sitePublicOrigin();

  for (const group of preview.vendorGroups) {
    const lines = groups.get(group.vendorId) ?? [];
    if (!lines.length) continue;

    const [vRow] = await db
      .select({
        id: vendorsTable.id,
        name: vendorsTable.name,
        slug: vendorsTable.slug,
        vendorType: vendorsTable.vendorType,
        ownerEmail: vendorsTable.ownerEmail,
        revenueModel: vendorsTable.revenueModel,
        commissionRatePct: vendorsTable.commissionRatePct,
      })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, group.vendorId))
      .limit(1);
    if (!vRow) {
      return { ok: false, statusCode: 400, error: "Sepetteki bir mağaza artık aktif değil." };
    }

    const orderItems = orderItemsPayload(lines);
    const subtotal = group.subtotal;
    const deliveryFee = group.shippingFee;
    const total = group.total;
    const snap = computeOrderCommissionSnapshot({
      revenueModel: vRow.revenueModel,
      commissionRatePct: vRow.commissionRatePct,
      subtotal,
      discount: 0,
    });
    const orderNumber = `YEK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
    const itemsStr = JSON.stringify(orderItems);
    const ceTrimmed = customer.customerEmail?.trim().slice(0, 200);

    const insertRow = {
      vendorId: group.vendorId,
      customerName: customer.customerName.trim(),
      customerPhone: customer.customerPhone.trim(),
      customerAddress: customer.customerAddress.trim(),
      customerCity: customer.customerCity?.trim() || null,
      customerDistrict: customer.customerDistrict?.trim() || null,
      customerPostalCode: customer.customerPostalCode?.trim().slice(0, 16) || null,
      items: itemsStr,
      orderNumber,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      discount: "0.00",
      total: total.toFixed(2),
      paymentMethod: String(customer.paymentMethod ?? "cash"),
      notes: customer.notes?.trim() || null,
      orderSource: "marketplace",
      platformCommissionAmount: snap.platformCommissionAmount,
      revenueModelSnapshot: snap.revenueModelSnapshot,
      legalDistanceSalesAccepted: true,
      legalPreinfoAccepted: true,
      ...(ceTrimmed ? { customerEmail: ceTrimmed } : {}),
      ...(snap.commissionBaseAmount != null ? { commissionBaseAmount: snap.commissionBaseAmount } : {}),
      ...(snap.commissionRatePctSnapshot != null ? { commissionRatePctSnapshot: snap.commissionRatePctSnapshot } : {}),
    };

    const stockOrder = await withVendorMenuStockAndOrder(group.vendorId, orderItems, async (tx) => {
      const [row] = await tx.insert(deliveryOrdersTable).values(insertRow).returning();
      return row;
    });

    if (!stockOrder.ok) {
      return { ok: false, statusCode: stockOrder.statusCode, error: `${vRow.name}: ${stockOrder.error}` };
    }

    const order = stockOrder.result;
    if (order?.id) {
      await db
        .insert(deliveryOrderStatusEventsTable)
        .values({
          orderId: order.id,
          fromStatus: null,
          toStatus: "pending",
          source: "marketplace_checkout",
        })
        .catch(() => {});

      const itemsLabel = orderItems.map((x) => `${x.name} x${x.qty}`).join(", ");
      void notifyVendorWhatsApp({
        vendorId: group.vendorId,
        eventType: "new_order",
        details: buildOrderMessage({
          orderNumber,
          customerName: customer.customerName,
          customerPhone: customer.customerPhone,
          totalAmount: total.toFixed(2),
          items: itemsLabel,
        }),
        panelUrl: `${origin}/isletme-paneli`,
        loginEmail: String(vRow.ownerEmail ?? "").trim() || undefined,
      }).catch(() => {});
      void notifyCustomerOrderWhatsApp({
        vendorId: group.vendorId,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        orderNumber,
        event: "received",
      }).catch(() => {});
    }

    placed.push({
      vendorId: group.vendorId,
      vendorName: vRow.name,
      vendorSlug: vRow.slug,
      orderId: order!.id,
      orderNumber,
      trackingToken: order?.id ? signDeliveryTrackingToken(order.id, order.orderNumber) : undefined,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
    });
  }

  return { ok: true, orders: placed, preview };
}
