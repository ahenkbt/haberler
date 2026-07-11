import crypto from "node:crypto";
import { getSessionSecret } from "./secrets.js";

export function signDeliveryTrackingToken(orderId: number, orderNumber: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${orderId}:${orderNumber}`)
    .digest("hex");
}

export function verifyDeliveryTrackingToken(orderId: number, orderNumber: string, token: string): boolean {
  const t = String(token ?? "").trim();
  if (!t) return false;
  const expected = signDeliveryTrackingToken(orderId, orderNumber);
  if (t.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(t, "utf8"));
  } catch {
    return false;
  }
}

export function normalizeDeliveryPhone(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "");
}

export function phoneLast4Matches(orderPhone: string, last4: string): boolean {
  const digits = normalizeDeliveryPhone(orderPhone);
  const l4 = normalizeDeliveryPhone(last4).slice(-4);
  return l4.length === 4 && digits.length >= 4 && digits.endsWith(l4);
}
