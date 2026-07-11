import webpush from "web-push";
import { logger } from "./logger.js";

let configured = false;

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() && process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim(),
  );
}

function ensureWebPushConfigured(): void {
  if (configured) return;
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) throw new Error("WEB_PUSH_VAPID anahtarları yapılandırılmamış.");
  const contact = process.env.WEB_PUSH_VAPID_CONTACT?.trim() || "mailto:support@yektube.com";
  webpush.setVapidDetails(contact, pub, priv);
  configured = true;
}

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendWebPushNotification(
  subscriptionJson: string,
  payload: WebPushPayload,
): Promise<void> {
  ensureWebPushConfigured();
  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
  } catch {
    throw new Error("Geçersiz push aboneliği JSON.");
  }
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

/** Abonelik süresi dolmuşsa true döner — silinmeli */
export function isWebPushSubscriptionExpired(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { statusCode?: number }).statusCode;
  return status === 404 || status === 410;
}

export async function sendWebPushSafe(
  subscriptionJson: string,
  payload: WebPushPayload,
): Promise<{ ok: true } | { ok: false; expired: boolean; error: string }> {
  try {
    await sendWebPushNotification(subscriptionJson, payload);
    return { ok: true };
  } catch (err) {
    const expired = isWebPushSubscriptionExpired(err);
    logger.warn({ err, expired }, "[web-push] send failed");
    return { ok: false, expired, error: err instanceof Error ? err.message : String(err) };
  }
}
