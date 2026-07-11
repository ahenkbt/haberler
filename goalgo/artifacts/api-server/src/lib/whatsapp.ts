import { db, siteSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sitePublicOrigin } from "./site-public-origin.js";
import { logger } from "./logger.js";

function sqlFirstRow<T>(result: unknown): T | null {
  if (result == null) return null;
  const boxed = result as { rows?: T[] };
  if (Array.isArray(boxed.rows) && boxed.rows.length > 0) return boxed.rows[0] ?? null;
  if (Array.isArray(result) && (result as T[]).length > 0) return (result as T[])[0] ?? null;
  return null;
}

async function siteCallmebotApiKey(): Promise<string | null> {
  try {
    const rows = await db
      .select({ key: siteSettingsTable.adminCallmebotApiKey })
      .from(siteSettingsTable)
      .limit(1);
    const key = rows[0]?.key?.trim();
    return key || null;
  } catch {
    return null;
  }
}

function parseVendorNoteValue(notes: string | null | undefined, key: string): string {
  const raw = String(notes ?? "");
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pipe = raw.match(new RegExp(`${esc}:([^|\\n]+)`, "i"));
  if (pipe?.[1] != null) return pipe[1].trim();
  const line = raw.match(new RegExp(`(?:^|\\n)${esc}\\s*:\\s*(\\S+)`, "im"));
  return line?.[1]?.trim() ?? "";
}

function vendorNoteFlag(notes: string | null | undefined, key: string, defaultWhenAbsent = true): boolean {
  const v = parseVendorNoteValue(notes, key);
  if (!v) return defaultWhenAbsent;
  const low = v.toLowerCase();
  if (low === "0" || low === "false" || low === "off" || low === "no") return false;
  if (low === "1" || low === "true" || low === "on" || low === "yes") return true;
  return defaultWhenAbsent;
}

/** İşletmeye yeni sipariş WhatsApp bildirimi (panelde “Siparişler WhatsApp'ıma gelsin”). */
export function vendorWhatsAppNewOrderToBusinessEnabled(notes: string | null | undefined): boolean {
  if (!vendorNoteFlag(notes, "whatsapp_enabled", true)) return false;
  return vendorNoteFlag(notes, "whatsapp_feature_new_order", true);
}

export function vendorWhatsAppOrderStatusEnabled(notes: string | null | undefined): boolean {
  if (!vendorNoteFlag(notes, "whatsapp_enabled", true)) return false;
  return vendorNoteFlag(notes, "whatsapp_feature_order_status", false);
}

function callmebotPhoneParam(digits: string): string {
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits}`;
}

async function callmebotSendMessage(
  phoneDigits: string,
  message: string,
  apiKey: string,
): Promise<boolean> {
  const key = apiKey.trim();
  const normalized = digitsForWhatsAppLink(phoneDigits);
  if (!key || !normalized) return false;
  const phone = callmebotPhoneParam(normalized);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = (await res.text()).trim().toLowerCase();
    if (!res.ok) return false;
    if (
      body.includes("error")
      || body.includes("not activated")
      || body.includes("invalid")
      || body.includes("wrong")
      || body.includes("failed")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function sendViaCallmebotKeys(
  phoneRaw: string,
  message: string,
  keys: Array<string | null | undefined>,
): Promise<boolean> {
  for (const k of keys) {
    const key = k?.trim();
    if (!key) continue;
    if (await callmebotSendMessage(phoneRaw, message, key)) return true;
  }
  return false;
}

/**
 * İşletme WhatsApp numarasına sipariş / durum bildirimi (CallMeBot: işletme veya platform anahtarı).
 */
export async function notifyVendorWhatsApp(params: {
  vendorId: number;
  eventType: "new_order" | "new_request" | "new_booking" | "new_reservation" | "order_status";
  details: string;
  panelUrl?: string;
  loginEmail?: string;
}): Promise<{ sent: boolean; link?: string }> {
  try {
    const rows = await db.execute<{
      whatsapp: string | null;
      phone: string | null;
      callmebot_key: string | null;
      name: string;
      owner_email: string | null;
      email: string | null;
      vendor_type: string | null;
      notes: string | null;
    }>(
      sql`SELECT whatsapp, phone, callmebot_key, name, owner_email, email, vendor_type, notes FROM vendors WHERE id = ${params.vendorId} LIMIT 1`,
    );
    const vendor = sqlFirstRow<{
      whatsapp: string | null;
      phone: string | null;
      callmebot_key: string | null;
      name: string;
      owner_email: string | null;
      email: string | null;
      vendor_type: string | null;
      notes: string | null;
    }>(rows);

    if (!vendor) return { sent: false };

    if (params.eventType === "new_order" && !vendorWhatsAppNewOrderToBusinessEnabled(vendor.notes)) {
      return { sent: false };
    }

    const destRaw = String(vendor.whatsapp ?? "").trim() || String(vendor.phone ?? "").trim();
    const phone = digitsForWhatsAppLink(destRaw);
    if (!phone) {
      logger.info({ vendorId: params.vendorId }, "[whatsapp] işletme whatsapp/telefon yok");
      return { sent: false };
    }

    const origin = sitePublicOrigin();
    const vt = String(vendor.vendor_type ?? "").toLowerCase();
    const isShop = vt === "ecommerce" || vt === "alisveris";
    const defaultPanel = isShop ? `${origin}/isletme-paneli` : `${origin}/servis-saglayici-giris`;
    const panelUrl = params.panelUrl?.trim() || defaultPanel;

    const icons: Record<string, string> = {
      new_order: "🛒 *Yeni sipariş*",
      new_request: "📋 *Yekpare* — Yeni Talep!",
      new_booking: "🎫 *Yekpare* — Yeni Rezervasyon!",
      new_reservation: "📅 *Yekpare* — Yeni Randevu!",
      order_status: "📦 *Yekpare* — Sipariş durumu güncellendi",
    };
    const header = icons[params.eventType] ?? "📢 *Yekpare* — Bildirim";

    let message: string;
    if (params.eventType === "new_order") {
      message = `${header}\n\n${params.details}\n\nPanel: ${panelUrl}`;
    } else {
      const login =
        (params.loginEmail?.trim() ||
          String(vendor.owner_email ?? "").trim() ||
          String(vendor.email ?? "").trim()) || null;
      const forgotUrl = `${origin}/sifre-sifirla`;
      const authLines = [
        login ? `📧 *Giriş e-postası:* ${login}` : "",
        `🔐 *Şifre:* Şifreniz`,
        `↩️ *Şifremi unuttum:* ${forgotUrl}`,
        `🌐 *Panel:* ${panelUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
      message = `${header}\n\n${params.details}\n\n${authLines}`;
    }

    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const siteKey = await siteCallmebotApiKey();
    const sent = await sendViaCallmebotKeys(phone, message, [vendor.callmebot_key, siteKey]);

    if (!sent) {
      logger.info(
        { vendorId: params.vendorId, hasVendorKey: Boolean(vendor.callmebot_key?.trim()), hasSiteKey: Boolean(siteKey) },
        "[whatsapp] işletmeye otomatik gönderilemedi (CallMeBot anahtarı gerekebilir)",
      );
    }

    return { sent, link: waLink };
  } catch (e) {
    logger.warn({ err: e, vendorId: params.vendorId }, "[whatsapp] notifyVendorWhatsApp failed");
    return { sent: false };
  }
}

export async function notifyAdminWhatsApp(params: {
  eventType: string;
  details: string;
  panelUrl?: string;
}): Promise<{ sent: boolean; link?: string }> {
  try {
    const rows = await db.select().from(siteSettingsTable).limit(1);
    const settings = rows[0];
    if (!settings?.whatsapp) return { sent: false };

    const phone = digitsForWhatsAppLink(settings.whatsapp as string);
    const panelUrl = params.panelUrl ?? `${sitePublicOrigin()}/admin/transport`;
    const callmebotKey = settings.adminCallmebotApiKey?.trim() ?? null;
    const message = `📢 *Yekpare* — ${params.eventType}\n\n${params.details}\n\nPanel: ${panelUrl}`;
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    const sent = callmebotKey ? await callmebotSendMessage(phone, message, callmebotKey) : false;
    return { sent, link: waLink };
  } catch {
    return { sent: false };
  }
}

export function buildOrderMessage(order: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount?: string | number | null;
  items?: string;
}): string {
  const total = order.totalAmount ? `₺${order.totalAmount}` : "";
  const items = order.items ? (() => {
    try {
      const parsed = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      if (Array.isArray(parsed)) {
        return parsed
          .map((i: { name?: string; quantity?: number; qty?: number }) => {
            const q = i.quantity ?? i.qty ?? 1;
            return `• ${i.name} x${q}`;
          })
          .join("\n");
      }
      return "";
    } catch {
      return "";
    }
  })() : "";

  return [
    `📦 *Sipariş #${order.orderNumber}*`,
    `👤 ${order.customerName}`,
    `📞 ${order.customerPhone}`,
    items ? `\n${items}` : "",
    total ? `💰 Toplam: ${total}` : "",
  ].filter(Boolean).join("\n");
}

export function phoneDigitsVariants(raw: string): string[] {
  const d = raw.replace(/\D/g, "");
  if (!d) return [];
  const s = new Set<string>();
  s.add(d);
  if (d.startsWith("90") && d.length >= 12) {
    s.add(d.slice(0, 12));
    s.add(d.slice(-10));
  }
  if (d.startsWith("0") && d.length >= 11) s.add(`90${d.slice(1, 12)}`);
  if (d.length === 10 && d.startsWith("5")) s.add(`90${d}`);
  return [...s];
}

export function digitsForWhatsAppLink(phoneRaw: string): string {
  const d = phoneRaw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("90") && d.length >= 12) return d.slice(0, 12);
  if (d.startsWith("0") && d.length >= 11) return `90${d.slice(1, 12)}`;
  if (d.length === 10) return `90${d}`;
  return d;
}

export async function trySendCustomerWhatsApp(params: {
  customerPhone: string;
  message: string;
  vendorCallmebotApiKey: string | null | undefined;
}): Promise<{ sent: boolean; waMeLink: string }> {
  const phone = digitsForWhatsAppLink(params.customerPhone);
  if (!phone) return { sent: false, waMeLink: "" };
  const waMeLink = `https://wa.me/${phone}?text=${encodeURIComponent(params.message)}`;
  const siteKey = await siteCallmebotApiKey();
  const sent = await sendViaCallmebotKeys(phone, params.message, [params.vendorCallmebotApiKey, siteKey]);
  return { sent, waMeLink };
}

export type CustomerOrderWhatsAppEvent = "received" | "confirmed";

export async function notifyCustomerOrderWhatsApp(params: {
  vendorId: number;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  event: CustomerOrderWhatsAppEvent;
  vendorNote?: string | null;
  geliverTracking?: string | null;
}): Promise<{ sent: boolean }> {
  try {
    const rows = await db.execute<{
      name: string;
      callmebot_key: string | null;
      notes: string | null;
    }>(
      sql`SELECT name, callmebot_key, notes FROM vendors WHERE id = ${params.vendorId} LIMIT 1`,
    );
    const vendor = sqlFirstRow<{ name: string; callmebot_key: string | null; notes: string | null }>(rows);

    if (!vendor) return { sent: false };
    if (!vendorWhatsAppOrderStatusEnabled(vendor.notes)) return { sent: false };

    const track = params.orderNumber.trim();
    const name = params.customerName.trim() || "Müşterimiz";
    const vendorName = String(vendor.name ?? "").trim() || "İşletme";

    let lines: string[];
    if (params.event === "received") {
      lines = [
        `Merhaba ${name},`,
        ``,
        `*Siparişiniz alındı.*`,
        `Sipariş numaranız: *${track}*`,
        ``,
        `Teşekkürler — ${vendorName}`,
      ];
    } else {
      const gTrack = params.geliverTracking?.trim();
      lines = [
        `Merhaba ${name},`,
        ``,
        `Siparişiniz işleme alındı.`,
        `Sipariş takip numaranız: *${track}*`,
        gTrack ? `Kargo takip: *${gTrack}*` : null,
        params.vendorNote ? `\nİşletme notu:\n${String(params.vendorNote).trim()}` : null,
        ``,
        `Teşekkürler — ${vendorName}`,
      ].filter(Boolean) as string[];
    }

    const message = lines.join("\n");
    const phone = digitsForWhatsAppLink(params.customerPhone);
    if (!phone) return { sent: false };

    const siteKey = await siteCallmebotApiKey();
    const sent = await sendViaCallmebotKeys(phone, message, [vendor.callmebot_key, siteKey]);
    return { sent };
  } catch {
    return { sent: false };
  }
}

export async function trySendSiteOutboundWhatsApp(
  toPhoneRaw: string,
  message: string,
): Promise<{ sent: boolean }> {
  const phone = digitsForWhatsAppLink(toPhoneRaw);
  if (!phone) return { sent: false };
  const key = await siteCallmebotApiKey();
  if (!key) return { sent: false };
  return { sent: await callmebotSendMessage(phone, message, key) };
}
