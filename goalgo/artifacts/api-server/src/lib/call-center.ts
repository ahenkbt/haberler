import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type CallCenterPlanId = "baslangic" | "pro" | "kurumsal";

export type CallCenterPlan = {
  id: CallCenterPlanId;
  name: string;
  priceTryMonthly: number | null;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: "contact" | "subscribe";
};

/** Tanıtım sayfası ve API için sabit paket kartları (TRY aylık tahmini). */
export const CALL_CENTER_PLANS: CallCenterPlan[] = [
  {
    id: "baslangic",
    name: "Başlangıç",
    priceTryMonthly: 2490,
    priceLabel: "₺2.490 / ay",
    description: "Küçük ekipler için temel sesli arama ve kampanya yönetimi.",
    features: [
      "1 AI asistan",
      "Aylık 500 dakika arama",
      "Kampanya ve kişi listesi",
      "Çağrı kayıtları ve özet",
      "E-posta destek",
    ],
    cta: "subscribe",
  },
  {
    id: "pro",
    name: "Pro",
    priceTryMonthly: 5990,
    priceLabel: "₺5.990 / ay",
    description: "Büyüyen işletmeler için gelişmiş otomasyon ve analitik.",
    features: [
      "5 AI asistan",
      "Aylık 2.500 dakika arama",
      "Akış oluşturucu ve randevu",
      "Bilgi tabanı (RAG)",
      "Google Takvim / E-Tablolar",
      "Öncelikli destek",
    ],
    highlighted: true,
    cta: "subscribe",
  },
  {
    id: "kurumsal",
    name: "Kurumsal",
    priceTryMonthly: null,
    priceLabel: "Teklif alın",
    description: "Yüksek hacim, çoklu numara ve özel entegrasyonlar.",
    features: [
      "Sınırsız asistan (anlaşmaya göre)",
      "Özel dakika paketi",
      "SIP / REST API eklentileri",
      "Ekip yönetimi ve beyaz etiket",
      "SLA ve kurumsal destek",
    ],
    cta: "contact",
  },
];

export type CallCenterSubscriptionRow = {
  callCenterEnabled: boolean;
  callCenterPlan: string | null;
  callCenterStatus: string;
  callCenterExpiresAt: Date | null;
};

let ensuredCallCenterCols = false;

export async function ensureCallCenterSettingsColumns(): Promise<void> {
  if (ensuredCallCenterCols) return;
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_enabled BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(
    sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_subscription_plan TEXT`,
  );
  await db.execute(
    sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_subscription_status TEXT NOT NULL DEFAULT 'none'`,
  );
  await db.execute(
    sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_subscription_expires_at TIMESTAMPTZ`,
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS call_center_subscription_requests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      plan_id TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      hm_site_id INTEGER,
      hm_site_slug TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ensuredCallCenterCols = true;
}

function sqlRows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

export async function loadCallCenterSubscription(): Promise<CallCenterSubscriptionRow> {
  await ensureCallCenterSettingsColumns();
  const raw = await db.execute<{
    call_center_enabled: boolean;
    call_center_subscription_plan: string | null;
    call_center_subscription_status: string;
    call_center_subscription_expires_at: Date | null;
  }>(sql`
    SELECT
      COALESCE(call_center_enabled, false) AS call_center_enabled,
      call_center_subscription_plan,
      COALESCE(call_center_subscription_status, 'none') AS call_center_subscription_status,
      call_center_subscription_expires_at
    FROM site_settings
    ORDER BY id
    LIMIT 1
  `);
  const row = sqlRows<{
    call_center_enabled: boolean;
    call_center_subscription_plan: string | null;
    call_center_subscription_status: string;
    call_center_subscription_expires_at: Date | null;
  }>(raw)[0];
  if (!row) {
    return {
      callCenterEnabled: false,
      callCenterPlan: null,
      callCenterStatus: "none",
      callCenterExpiresAt: null,
    };
  }
  return {
    callCenterEnabled: row.call_center_enabled === true,
    callCenterPlan: row.call_center_subscription_plan,
    callCenterStatus: row.call_center_subscription_status ?? "none",
    callCenterExpiresAt: row.call_center_subscription_expires_at
      ? new Date(row.call_center_subscription_expires_at)
      : null,
  };
}

export function isCallCenterSubscriptionActive(sub: CallCenterSubscriptionRow): boolean {
  if (!sub.callCenterEnabled) return false;
  if (sub.callCenterStatus !== "active") return false;
  if (!sub.callCenterExpiresAt) return true;
  return sub.callCenterExpiresAt.getTime() > Date.now();
}

export function agentLabsBaseUrl(): string {
  return String(process.env.AGENTLABS_URL ?? process.env.AGENTLABS_EMBED_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
}

export function agentLabsHealthPath(): string {
  const raw = String(process.env.AGENTLABS_HEALTH_PATH ?? "/api/health").trim();
  if (!raw) return "/api/health";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/** AgentLabs gömme yolu — hash yok, SPA yolu. */
export function buildAgentLabsEmbedUrl(baseUrl: string, appPath?: string): string {
  const path = (appPath ?? "/app").trim();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, "")}${normalized}`;
}
