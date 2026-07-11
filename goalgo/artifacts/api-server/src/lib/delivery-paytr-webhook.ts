import { and, eq } from "drizzle-orm";
import { db, deliveryOrdersTable, paytrWebhookEventsTable, vendorsTable } from "@workspace/db";
import { paytrVerifyCallbackHash } from "./paytr-direct.js";
import { paytrCallbackEventId, paytrOrderTotalKurus } from "./delivery-paytr-webhook-parse.js";

export type PaytrCallbackPayload = {
  merchant_oid?: string;
  status?: string;
  total_amount?: string;
  hash?: string;
};

export { paytrCallbackEventId, paytrOrderTotalKurus } from "./delivery-paytr-webhook-parse.js";

export type PaytrWebhookHandleResult = {
  outcome: string;
  duplicate?: boolean;
  relatedOrderId?: number | null;
};

/**
 * PayTR 2. adım bildirimi — hash doğrulama, sipariş güncelleme, audit satırı.
 * HTTP yanıtı her zaman PayTR için "OK" olmalı (route katmanı).
 */
export async function handleDeliveryPaytrCallback(
  rawBody: PaytrCallbackPayload,
): Promise<PaytrWebhookHandleResult> {
  const merchant_oid = String(rawBody.merchant_oid ?? "").trim();
  const status = String(rawBody.status ?? "");
  const total_amount = String(rawBody.total_amount ?? "");
  const hash = paytrCallbackEventId(rawBody);

  if (!merchant_oid || !hash) {
    return { outcome: "missing_fields" };
  }

  const [dup] = await db
    .select({ id: paytrWebhookEventsTable.id })
    .from(paytrWebhookEventsTable)
    .where(eq(paytrWebhookEventsTable.paytrEventHash, hash))
    .limit(1);
  if (dup) {
    return { outcome: "duplicate", duplicate: true };
  }

  let outcome = "ignored";
  let detail: string | null = null;
  let relatedOrderId: number | null = null;

  const [ord] = await db
    .select()
    .from(deliveryOrdersTable)
    .where(eq(deliveryOrdersTable.orderNumber, merchant_oid))
    .limit(1);

  if (!ord) {
    outcome = "order_not_found";
    detail = `merchant_oid=${merchant_oid}`;
  } else {
    relatedOrderId = ord.id;
    const [v] = await db
      .select({
        paytrMerchantKey: vendorsTable.paytrMerchantKey,
        paytrMerchantSalt: vendorsTable.paytrMerchantSalt,
      })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, ord.vendorId))
      .limit(1);

    if (!v?.paytrMerchantKey || !v.paytrMerchantSalt) {
      outcome = "vendor_paytr_not_configured";
      detail = `order_id=${ord.id}`;
    } else if (
      !paytrVerifyCallbackHash({
        merchantKey: v.paytrMerchantKey,
        merchantSalt: v.paytrMerchantSalt,
        merchantOid: merchant_oid,
        status,
        totalAmount: total_amount,
        receivedHash: hash,
      })
    ) {
      outcome = "hash_invalid";
      detail = `order_id=${ord.id}`;
    } else if (status === "success") {
      const expected = paytrOrderTotalKurus(ord.total);
      const got = parseInt(total_amount, 10);
      if (!Number.isFinite(got) || got !== expected) {
        outcome = "amount_mismatch";
        detail = `order_id=${ord.id};expected_kurus=${expected};got=${total_amount}`;
      } else if (ord.paymentStatus === "paid") {
        outcome = "order_already_paid";
        detail = `order_id=${ord.id}`;
      } else {
        const updated = await db
          .update(deliveryOrdersTable)
          .set({
            paymentStatus: "paid",
            paymentMethod: "paytr",
            status: ord.status === "pending" ? "confirmed" : ord.status,
            updatedAt: new Date(),
          })
          .where(and(eq(deliveryOrdersTable.id, ord.id), eq(deliveryOrdersTable.paymentStatus, "pending")))
          .returning({ id: deliveryOrdersTable.id });
        if (updated.length > 0) {
          outcome = "delivery_order_paid";
          detail = `order_id=${ord.id};merchant_oid=${merchant_oid}`;
        } else {
          outcome = "order_not_pending";
          detail = `order_id=${ord.id};payment_status=${ord.paymentStatus}`;
        }
      }
    } else {
      outcome = "payment_failed";
      detail = `order_id=${ord.id};status=${status}`;
      if (ord.paymentStatus === "pending") {
        await db
          .update(deliveryOrdersTable)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(eq(deliveryOrdersTable.id, ord.id));
      }
    }
  }

  try {
    await db.insert(paytrWebhookEventsTable).values({
      paytrEventHash: hash,
      merchantOid: merchant_oid,
      paytrStatus: status || "unknown",
      totalAmount: total_amount || null,
      outcome,
      detail,
      relatedOrderId,
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "23505") {
      return { outcome: "duplicate", duplicate: true, relatedOrderId };
    }
    throw e;
  }

  return { outcome, relatedOrderId };
}
