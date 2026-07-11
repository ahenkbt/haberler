import crypto from "node:crypto";
import axios from "axios";

export type PaytrTokenParams = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  userIp: string;
  merchantOid: string;
  email: string;
  /** kuruş, string veya tam sayı PayTR örneğiyle uyumlu */
  paymentAmountKurus: number;
  userBasketBase64: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  merchantOkUrl: string;
  merchantFailUrl: string;
  testMode: boolean;
  currency?: string;
  timeoutMinutes?: number;
  debugOn?: boolean;
};

function paytrSignToken(hashStr: string, merchantKey: string, merchantSalt: string): string {
  const data = hashStr + merchantSalt;
  return crypto.createHmac("sha256", merchantKey).update(data, "utf8").digest("base64");
}

/** PayTR iFrame/Direkt API 1. adım — token al */
export async function paytrGetIframeToken(p: PaytrTokenParams): Promise<{ token: string } | { error: string }> {
  const currency = p.currency ?? "TL";
  const test_mode = p.testMode ? "1" : "0";
  const no_installment = "0";
  const max_installment = "0";
  const payment_amount = String(Math.max(1, Math.round(p.paymentAmountKurus)));
  const debug_on = p.debugOn !== false && p.testMode ? 1 : 0;

  const hash_str =
    p.merchantId +
    p.userIp +
    p.merchantOid +
    p.email +
    payment_amount +
    p.userBasketBase64 +
    no_installment +
    max_installment +
    currency +
    test_mode;
  const paytr_token = paytrSignToken(hash_str, p.merchantKey, p.merchantSalt);

  const form = new URLSearchParams();
  form.set("merchant_id", p.merchantId);
  form.set("user_ip", p.userIp.slice(0, 39));
  form.set("merchant_oid", p.merchantOid);
  form.set("email", p.email.slice(0, 100));
  form.set("payment_amount", payment_amount);
  form.set("paytr_token", paytr_token);
  form.set("user_basket", p.userBasketBase64);
  form.set("debug_on", String(debug_on));
  form.set("no_installment", no_installment);
  form.set("max_installment", max_installment);
  form.set("user_name", p.userName.slice(0, 60));
  form.set("user_address", p.userAddress.slice(0, 400));
  form.set("user_phone", p.userPhone.replace(/\s/g, "").slice(0, 20));
  form.set("merchant_ok_url", p.merchantOkUrl.slice(0, 400));
  form.set("merchant_fail_url", p.merchantFailUrl.slice(0, 400));
  form.set("timeout_limit", String(p.timeoutMinutes ?? 30));
  form.set("currency", currency);
  form.set("test_mode", test_mode);
  form.set("lang", "tr");

  try {
    const res = await axios.post<string>("https://www.paytr.com/odeme/api/get-token", form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 25000,
      responseType: "text",
      transformResponse: [(d) => d],
    });
    const data = JSON.parse(String(res.data || "{}")) as { status?: string; token?: string; reason?: string };
    if (data.status === "success" && data.token) return { token: data.token };
    return { error: data.reason || "PayTR token alınamadı" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "PayTR bağlantı hatası" };
  }
}

/** PayTR sunucu bildirimi (2. adım) — hash doğrula */
export function paytrVerifyCallbackHash(params: {
  merchantKey: string;
  merchantSalt: string;
  merchantOid: string;
  status: string;
  totalAmount: string;
  receivedHash: string;
}): boolean {
  const raw = params.merchantOid + params.merchantSalt + params.status + params.totalAmount;
  const token = crypto.createHmac("sha256", params.merchantKey).update(raw, "utf8").digest("base64");
  return token === params.receivedHash;
}

/** Sepet: [["Ürün","12.34",2],...] → base64 */
export function paytrEncodeBasket(rows: [string, string, number][]): string {
  return Buffer.from(JSON.stringify(rows), "utf8").toString("base64");
}
