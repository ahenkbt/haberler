/** Sipariş / sağlayıcı gelir modeli: abonelik veya site üzerinden komisyon */

export type RevenueModel = "subscription" | "commission";

export function normalizeRevenueModel(v: unknown): RevenueModel {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "commission" ? "commission" : "subscription";
}

export function parseMoney(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function sanitizeTrIban(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

/** Komisyon matrahı: ürün/hizmet ara toplamı − indirim (kargo/delivery ücreti dahil değil). */
export function computeOrderCommissionSnapshot(params: {
  revenueModel: unknown;
  commissionRatePct: unknown;
  subtotal: number;
  discount: number;
}): {
  revenueModelSnapshot: RevenueModel;
  commissionRatePctSnapshot: string | null;
  commissionBaseAmount: string | null;
  platformCommissionAmount: string;
} {
  const model = normalizeRevenueModel(params.revenueModel);
  const discount = Math.max(0, params.discount);
  const subtotal = Math.max(0, params.subtotal);
  const base = Math.max(0, subtotal - discount);

  if (model !== "commission") {
    return {
      revenueModelSnapshot: "subscription",
      commissionRatePctSnapshot: null,
      commissionBaseAmount: null,
      platformCommissionAmount: "0",
    };
  }

  const rate = parseFloat(String(params.commissionRatePct ?? "").replace(",", "."));
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
    return {
      revenueModelSnapshot: "commission",
      commissionRatePctSnapshot: null,
      commissionBaseAmount: base.toFixed(2),
      platformCommissionAmount: "0",
    };
  }

  const amt = Math.round(base * (rate / 100) * 100) / 100;
  return {
    revenueModelSnapshot: "commission",
    commissionRatePctSnapshot: rate.toFixed(4),
    commissionBaseAmount: base.toFixed(2),
    platformCommissionAmount: amt.toFixed(2),
  };
}

/** Mağaza sayfası: şifre ve hakediş bankası müşteriye çıkmaz */
export function publicVendorForMenu(v: Record<string, unknown>): Record<string, unknown> {
  const out = { ...v };
  delete out.passwordHash;
  delete out.payoutBankHolder;
  delete out.payoutBankIban;
  delete out.payoutBankBranch;
  delete out.geliverApiToken;
  delete out.geliverSenderAddressId;
  const paytrReady = !!(
    String(out.paytrMerchantId ?? "").trim() &&
    String(out.paytrMerchantKey ?? "").trim() &&
    String(out.paytrMerchantSalt ?? "").trim()
  );
  const iyzReady = !!(
    String(out.iyzicoApiKey ?? "").trim() && String(out.iyzicoSecretKey ?? "").trim()
  );
  delete out.paytrMerchantId;
  delete out.paytrMerchantKey;
  delete out.paytrMerchantSalt;
  delete out.iyzicoApiKey;
  delete out.iyzicoSecretKey;
  delete out.preferredTrGateway;
  const rm = normalizeRevenueModel(out.revenueModel);
  (out as Record<string, unknown>).subscriptionTrOnlinePay = rm === "subscription" && (paytrReady || iyzReady);
  (out as Record<string, unknown>).trPaytrConfigured = paytrReady;
  (out as Record<string, unknown>).trIyzicoConfigured = iyzReady;
  (out as Record<string, unknown>).trPreferredGateway = out.preferredTrGateway ?? null;
  return out;
}

export function deriveOrderTotalsFromBody(body: Record<string, unknown>): {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  customerAddress: string;
} {
  const items = body["items"];
  let subtotal = parseMoney(body["subtotal"]);
  if ((!Number.isFinite(subtotal) || subtotal < 0) && Array.isArray(items)) {
    subtotal = items.reduce((s: number, it: Record<string, unknown>) => {
      const p = parseMoney(it["price"]);
      const q = Math.max(1, parseInt(String(it["qty"] ?? it["quantity"] ?? 1), 10) || 1);
      return s + p * q;
    }, 0);
  }

  const discount = Math.max(0, parseMoney(body["discount"]));
  const deliveryFee = Math.max(0, parseMoney(body["deliveryFee"] ?? body["delivery_fee"]));
  let total = parseMoney(body["total"]);
  const recomputed = Math.max(0, subtotal - discount + deliveryFee);
  if (!Number.isFinite(total) || total <= 0) total = recomputed;

  const customerAddress = String(
    body["customerAddress"] ?? body["deliveryAddress"] ?? body["customer_address"] ?? "",
  ).trim();

  return {
    subtotal,
    discount,
    deliveryFee,
    total,
    customerAddress,
  };
}
