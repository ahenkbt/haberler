import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { decryptSecret, encryptSecret, hasEncryptedValue, maskSecret } from "../ai-call/crypto.js";
import {
  defaultThreeCxWssUrl,
  normalizeThreeCxFqdn,
  testThreeCxConnection,
  type ThreeCxConfig,
} from "./threecx-client.js";

export type ThreeCxSettingsPublic = {
  enabled: boolean;
  fqdn: string | null;
  hasClientId: boolean;
  clientIdMasked: string;
  hasClientSecret: boolean;
  clientSecretMasked: string;
  defaultWssUrl: string | null;
  licenseNote: string;
  setupSteps: string[];
};

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

export async function ensureThreeCxTables(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE pbx_settings
      ADD COLUMN IF NOT EXISTS threecx_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS threecx_fqdn TEXT,
      ADD COLUMN IF NOT EXISTS threecx_client_id_enc TEXT,
      ADD COLUMN IF NOT EXISTS threecx_client_secret_enc TEXT
  `);
}

export async function loadThreeCxSettingsRow(): Promise<{
  enabled: boolean;
  fqdn: string | null;
  clientIdEnc: string | null;
  clientSecretEnc: string | null;
}> {
  await ensureThreeCxTables();
  const row = rows<{
    threecx_enabled: boolean;
    threecx_fqdn: string | null;
    threecx_client_id_enc: string | null;
    threecx_client_secret_enc: string | null;
  }>(
    await db.execute(sql`
      SELECT threecx_enabled, threecx_fqdn, threecx_client_id_enc, threecx_client_secret_enc
      FROM pbx_settings WHERE id = 1 LIMIT 1
    `),
  )[0];
  return {
    enabled: row?.threecx_enabled === true,
    fqdn: row?.threecx_fqdn ?? null,
    clientIdEnc: row?.threecx_client_id_enc ?? null,
    clientSecretEnc: row?.threecx_client_secret_enc ?? null,
  };
}

export async function getThreeCxConfig(): Promise<ThreeCxConfig | null> {
  const row = await loadThreeCxSettingsRow();
  if (!row.enabled || !row.fqdn) return null;

  const envId = String(process.env.THREECX_CLIENT_ID ?? "").trim();
  const envSecret = String(process.env.THREECX_CLIENT_SECRET ?? "").trim();
  const envFqdn = String(process.env.THREECX_FQDN ?? "").trim();

  const clientId = envId || (row.clientIdEnc ? decryptSecret(row.clientIdEnc) : "");
  const clientSecret = envSecret || (row.clientSecretEnc ? decryptSecret(row.clientSecretEnc) : "");
  const fqdn = normalizeThreeCxFqdn(envFqdn || row.fqdn || "");

  if (!fqdn || !clientId || !clientSecret) return null;
  return { fqdn, clientId, clientSecret };
}

export async function isPbxThreeCxActive(): Promise<boolean> {
  if (String(process.env.THREECX_CLIENT_ID ?? "").trim() && String(process.env.THREECX_CLIENT_SECRET ?? "").trim()) {
    return true;
  }
  const row = await loadThreeCxSettingsRow();
  if (!row.enabled) return false;
  return hasEncryptedValue(row.clientIdEnc) && hasEncryptedValue(row.clientSecretEnc) && Boolean(row.fqdn);
}

function setupSteps(): string[] {
  return [
    "3CX Admin Console → Integrations → API → Add",
    "Client ID belirleyin; «3CX Configuration API Access» işaretleyin",
    "Department/Role: System Admin veya uygun yetki",
    "Oluşan API key'i bir kez kopyalayın (Client Secret)",
    "8SC ve üzeri lisans gerekir; yoksa manuel dahili + Yekpare softphone kullanın",
  ];
}

export async function getThreeCxSettingsPublic(): Promise<ThreeCxSettingsPublic> {
  const row = await loadThreeCxSettingsRow();
  const config = await getThreeCxConfig();
  const fqdn = row.fqdn ? normalizeThreeCxFqdn(row.fqdn) : null;
  const plainId = config?.clientId ?? "";
  const plainSecret = config?.clientSecret ?? "";

  return {
    enabled: row.enabled,
    fqdn,
    hasClientId: hasEncryptedValue(row.clientIdEnc) || Boolean(process.env.THREECX_CLIENT_ID),
    clientIdMasked: plainId ? maskSecret(plainId) : "",
    hasClientSecret: hasEncryptedValue(row.clientSecretEnc) || Boolean(process.env.THREECX_CLIENT_SECRET),
    clientSecretMasked: plainSecret ? maskSecret(plainSecret) : "",
    defaultWssUrl: fqdn ? defaultThreeCxWssUrl(fqdn) : null,
    licenseNote:
      "3CX Configuration API için 8SC+ lisans ve Integrations → API üzerinde Configuration scope gerekir.",
    setupSteps: setupSteps(),
  };
}

export async function updateThreeCxSettings(input: {
  enabled?: boolean;
  fqdn?: string | null;
  clientId?: string;
  clientSecret?: string;
}): Promise<ThreeCxSettingsPublic> {
  await ensureThreeCxTables();

  if (input.enabled !== undefined) {
    await db.execute(sql`UPDATE pbx_settings SET threecx_enabled = ${input.enabled}, updated_at = NOW() WHERE id = 1`);
  }
  if (input.fqdn !== undefined) {
    const fqdn = input.fqdn ? normalizeThreeCxFqdn(input.fqdn) : null;
    await db.execute(sql`UPDATE pbx_settings SET threecx_fqdn = ${fqdn}, updated_at = NOW() WHERE id = 1`);
  }
  if (input.clientId !== undefined && input.clientId.trim()) {
    await db.execute(sql`
      UPDATE pbx_settings SET threecx_client_id_enc = ${encryptSecret(input.clientId.trim())}, updated_at = NOW() WHERE id = 1
    `);
  }
  if (input.clientSecret !== undefined && input.clientSecret.trim()) {
    await db.execute(sql`
      UPDATE pbx_settings SET threecx_client_secret_enc = ${encryptSecret(input.clientSecret.trim())}, updated_at = NOW() WHERE id = 1
    `);
  }

  return getThreeCxSettingsPublic();
}

export async function runThreeCxConnectionTest(): Promise<{ ok: boolean; message: string; userCount?: number }> {
  const config = await getThreeCxConfig();
  if (!config) {
    return { ok: false, message: "3CX yapılandırılmamış. FQDN, Client ID ve API key kaydedin." };
  }
  return testThreeCxConnection(config);
}
