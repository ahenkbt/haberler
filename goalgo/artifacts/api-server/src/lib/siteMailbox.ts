import { eq, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db, siteSettingsTable } from "@workspace/db";
import { getSmtpEnvAuthFields, type ExplicitSmtpConfig } from "./email.js";
import { fetchRecentImapMessages, testImapConnection, type ImapConnConfig } from "./imap-inbox.js";
import { logger } from "./logger.js";

export const DEFAULT_SITE_MAILBOX_ADDRESS = "bilgi@yekpare.net";

export function getSiteMailboxAddressFromEnv(): string {
  const raw = String(process.env["SITE_MAILBOX_ADDRESS"] ?? DEFAULT_SITE_MAILBOX_ADDRESS).trim();
  return raw.includes("@") ? raw : DEFAULT_SITE_MAILBOX_ADDRESS;
}

/** Boş veya kurulum şablonu IMAP sunucusu (ör. imap.ornek.com) */
export function isBlankOrPlaceholderImapHost(host: string | null | undefined): boolean {
  const h = String(host ?? "").trim().toLowerCase();
  if (!h) return true;
  if (h === "imap.ornek.com" || h === "imap.example.com") return true;
  if (h.endsWith(".ornek.com") || h.includes("example.com")) return true;
  if (h.includes("localhost")) return true;
  return false;
}

/** SMTP sunucusundan IMAP sunucusu tahmini */
export function inferImapHostFromSmtp(smtpHost: string | null | undefined): string | null {
  const s = String(smtpHost ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("gmail.com") || s.includes("googlemail.com")) return "imap.gmail.com";
  if (s.includes("yandex")) return "imap.yandex.com";
  if (s.includes("outlook") || s.includes("hotmail") || s.includes("live.com") || s.includes("office365")) {
    return "outlook.office365.com";
  }
  if (s.includes("zoho")) {
    if (s.includes(".eu")) return s.replace(/^smtp/i, "imap").replace("smtppro", "imappro");
    return s.startsWith("smtp.") ? `imap.${s.slice("smtp.".length)}` : "imap.zoho.com";
  }
  if (s.startsWith("smtp.")) return `imap.${s.slice("smtp.".length)}`;
  return null;
}

type SiteSettingsMailSlice = {
  email: string | null;
  smtpHost: string | null;
  smtpPort: string | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  imapHost: string | null;
  imapPort: string | null;
  imapUser: string | null;
  imapPass: string | null;
  imapFolder: string | null;
};

function envSmtpHost(): string {
  return (
    String(process.env["SITE_MAILBOX_SMTP_HOST"] ?? "").trim() ||
    String(process.env["SMTP_HOST"] ?? "").trim()
  );
}

function envImapHost(smtpHost: string): string {
  const explicit =
    String(process.env["SITE_MAILBOX_IMAP_HOST"] ?? "").trim() ||
    String(process.env["IMAP_HOST"] ?? "").trim();
  if (explicit && !isBlankOrPlaceholderImapHost(explicit)) return explicit;
  const guess = inferImapHostFromSmtp(smtpHost);
  return guess ?? "";
}

function envMailboxCredentials(): {
  address: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  imapHost: string;
  imapPort: string;
  imapUser: string;
  imapPass: string;
  imapFolder: string;
} | null {
  const envSmtp = getSmtpEnvAuthFields();
  const smtpHost = envSmtpHost();
  const smtpUser = envSmtp.user || getSiteMailboxAddressFromEnv();
  const smtpPass = envSmtp.pass;
  if (!smtpHost || !smtpUser || !smtpPass) return null;

  const address = getSiteMailboxAddressFromEnv();
  const smtpFrom =
    String(process.env["SMTP_FROM"] ?? "").trim() || `Yekpare <${smtpUser.includes("@") ? smtpUser : address}>`;
  const imapHost = envImapHost(smtpHost);
  const imapUser =
    String(process.env["IMAP_USER"] ?? "").trim() ||
    smtpUser;
  const imapPass =
    String(process.env["IMAP_PASS"] ?? "").trim() ||
    smtpPass;

  return {
    address,
    smtpHost,
    smtpPort: String(process.env["SMTP_PORT"] ?? "587").trim() || "587",
    smtpUser,
    smtpPass,
    smtpFrom,
    imapHost,
    imapPort: String(process.env["IMAP_PORT"] ?? "993").trim() || "993",
    imapUser,
    imapPass,
    imapFolder: String(process.env["IMAP_FOLDER"] ?? "INBOX").trim() || "INBOX",
  };
}

async function readSiteMailSettings(): Promise<(SiteSettingsMailSlice & { id: number }) | null> {
  const rows = await db
    .select({
      id: siteSettingsTable.id,
      email: siteSettingsTable.email,
      smtpHost: siteSettingsTable.smtpHost,
      smtpPort: siteSettingsTable.smtpPort,
      smtpUser: siteSettingsTable.smtpUser,
      smtpPass: siteSettingsTable.smtpPass,
      smtpFrom: siteSettingsTable.smtpFrom,
      imapHost: siteSettingsTable.imapHost,
      imapPort: siteSettingsTable.imapPort,
      imapUser: siteSettingsTable.imapUser,
      imapPass: siteSettingsTable.imapPass,
      imapFolder: siteSettingsTable.imapFolder,
    })
    .from(siteSettingsTable)
    .limit(1);
  return rows[0] ?? null;
}

function dbSmtpReady(s: SiteSettingsMailSlice | null | undefined): boolean {
  return Boolean(String(s?.smtpHost ?? "").trim() && String(s?.smtpUser ?? "").trim() && String(s?.smtpPass ?? "").trim());
}

/**
 * Ortam değişkenlerinden site_settings SMTP/IMAP alanlarını doldurur.
 * SITE_MAILBOX_BOOTSTRAP=1 ile zorlanır; aksi halde DB boşken bir kez yazılır.
 */
export async function bootstrapSiteMailboxFromEnv(): Promise<{ updated: boolean; reason: string }> {
  const creds = envMailboxCredentials();
  if (!creds) {
    return { updated: false, reason: "SMTP ortam değişkenleri eksik (SMTP_HOST, SMTP_USER, SMTP_PASS)" };
  }

  const force = process.env["SITE_MAILBOX_BOOTSTRAP"] === "1";
  const current = await readSiteMailSettings();

  if (!force && current && dbSmtpReady(current)) {
    return { updated: false, reason: "site_settings SMTP zaten dolu" };
  }

  const patch: Partial<typeof siteSettingsTable.$inferInsert> = {
    email: creds.address,
    smtpHost: creds.smtpHost,
    smtpPort: creds.smtpPort,
    smtpUser: creds.smtpUser,
    smtpPass: creds.smtpPass,
    smtpFrom: creds.smtpFrom,
    imapHost: creds.imapHost || null,
    imapPort: creds.imapPort,
    imapUser: creds.imapUser,
    imapPass: creds.imapPass,
    imapFolder: creds.imapFolder,
  };

  if (!current) {
    await db.insert(siteSettingsTable).values({
      siteName: "Yekpare",
      ...patch,
    });
    logger.info({ address: creds.address, smtpHost: creds.smtpHost }, "[site-mailbox] site_settings oluşturuldu (env bootstrap)");
    return { updated: true, reason: "insert" };
  }

  await db.update(siteSettingsTable).set(patch).where(eq(siteSettingsTable.id, current.id));
  logger.info({ address: creds.address, smtpHost: creds.smtpHost }, "[site-mailbox] site_settings güncellendi (env bootstrap)");
  return { updated: true, reason: force ? "forced-update" : "empty-db-update" };
}

export type SiteMailboxAdminConfig = {
  address: string;
  fromDisplay: string;
  smtpConfigured: boolean;
  imapConfigured: boolean;
  ready: boolean;
  smtpHost: string | null;
  imapHost: string | null;
  imapFolder: string;
  source: "env" | "database" | "mixed";
};

export async function getSiteMailboxAdminConfig(): Promise<SiteMailboxAdminConfig> {
  const envCreds = envMailboxCredentials();
  const row = await readSiteMailSettings();
  const address =
    getSiteMailboxAddressFromEnv() ||
    String(row?.email ?? "").trim() ||
    String(row?.smtpUser ?? "").trim() ||
    DEFAULT_SITE_MAILBOX_ADDRESS;

  const smtpFromEnv = Boolean(envCreds);
  const smtpFromDb = dbSmtpReady(row);
  const smtpConfigured = smtpFromEnv || smtpFromDb;

  const imapCfg = await resolveSiteImapConfig();
  const imapConfigured = Boolean(imapCfg);

  const smtpHost =
    (smtpFromEnv ? envCreds?.smtpHost : null) ||
    String(row?.smtpHost ?? "").trim() ||
    null;
  const imapHost = imapCfg?.host ?? null;

  const fromDisplay =
    (envCreds?.smtpFrom || String(row?.smtpFrom ?? "").trim() || String(row?.smtpUser ?? "").trim() || address);

  let source: SiteMailboxAdminConfig["source"] = "database";
  if (smtpFromEnv && smtpFromDb) source = "mixed";
  else if (smtpFromEnv) source = "env";

  return {
    address,
    fromDisplay,
    smtpConfigured,
    imapConfigured,
    ready: smtpConfigured && imapConfigured,
    smtpHost,
    imapHost,
    imapFolder: imapCfg?.mailbox ?? (String(row?.imapFolder ?? "INBOX").trim() || "INBOX"),
    source,
  };
}

export async function resolveSiteImapConfig(): Promise<ImapConnConfig | null> {
  const row = await readSiteMailSettings();
  const envCreds = envMailboxCredentials();
  const envSmtp = getSmtpEnvAuthFields();

  const smtpHostForInfer =
    String(row?.smtpHost ?? "").trim() ||
    envCreds?.smtpHost ||
    envSmtp.host;

  let host = String(row?.imapHost ?? "").trim();
  if (isBlankOrPlaceholderImapHost(host)) {
    host = envCreds?.imapHost || envImapHost(smtpHostForInfer);
  }
  if (isBlankOrPlaceholderImapHost(host)) {
    const guess = inferImapHostFromSmtp(smtpHostForInfer);
    if (guess) host = guess;
  }
  if (!host || isBlankOrPlaceholderImapHost(host)) return null;

  const user =
    String(row?.imapUser ?? "").trim() ||
    String(row?.smtpUser ?? "").trim() ||
    envCreds?.imapUser ||
    envSmtp.user;
  const pass =
    String(row?.imapPass ?? "").trim() ||
    String(row?.smtpPass ?? "").trim() ||
    envCreds?.imapPass ||
    envSmtp.pass;

  if (!user || !pass) return null;

  const port = parseInt(String(row?.imapPort ?? envCreds?.imapPort ?? "993"), 10) || 993;
  const mailbox =
    (String(row?.imapFolder ?? envCreds?.imapFolder ?? "INBOX").trim() || "INBOX");

  return { host, port, user, password: pass, tls: true, mailbox };
}

export async function resolveSiteSmtpConfig(): Promise<ExplicitSmtpConfig | null> {
  const envCreds = envMailboxCredentials();
  if (envCreds) {
    const port = parseInt(envCreds.smtpPort, 10) || 587;
    return {
      host: envCreds.smtpHost,
      port,
      secure: port === 465,
      user: envCreds.smtpUser,
      pass: envCreds.smtpPass,
      from: envCreds.smtpFrom,
    };
  }

  const row = await readSiteMailSettings();
  const host = String(row?.smtpHost ?? "").trim();
  const user = String(row?.smtpUser ?? "").trim();
  const pass = String(row?.smtpPass ?? "").trim();
  if (!host || !user || !pass) return null;
  const port = parseInt(String(row?.smtpPort ?? "587"), 10) || 587;
  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from: String(row?.smtpFrom ?? "").trim() || `Yekpare <${user}>`,
  };
}

export async function getSiteMailboxFromDisplay(): Promise<string> {
  const cfg = await resolveSiteSmtpConfig();
  if (cfg?.from) return cfg.from;
  const admin = await getSiteMailboxAdminConfig();
  return admin.fromDisplay;
}

export async function testSiteMailboxConnections(): Promise<{
  smtp: { ok: boolean; error?: string };
  imap: { ok: boolean; error?: string };
}> {
  const smtpCfg = await resolveSiteSmtpConfig();
  let smtp: { ok: boolean; error?: string } = { ok: false, error: "SMTP yapılandırılmamış" };
  if (smtpCfg) {
    const transport = nodemailer.createTransport({
      host: smtpCfg.host,
      port: smtpCfg.port,
      secure: smtpCfg.secure || smtpCfg.port === 465,
      auth: { user: smtpCfg.user, pass: smtpCfg.pass },
    });
    try {
      await transport.verify();
      smtp = { ok: true };
    } catch (e) {
      smtp = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const imapCfg = await resolveSiteImapConfig();
  let imap: { ok: boolean; error?: string } = { ok: false, error: "IMAP yapılandırılmamış" };
  if (imapCfg) {
    const r = await testImapConnection(imapCfg);
    imap = r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  return { smtp, imap };
}

export async function syncSiteMailboxFromImap(maxMessages = 40): Promise<{
  ok: boolean;
  fetched?: number;
  inserted?: number;
  error?: string;
}> {
  const imapCfg = await resolveSiteImapConfig();
  if (!imapCfg) {
    return {
      ok: false,
      error:
        "Gelen kutusu (IMAP) için sunucu, kullanıcı veya şifre eksik. Railway ortam değişkenlerinde SMTP_USER/SMTP_PASS ve IMAP_HOST (veya Zoho için smtp.zoho.eu) tanımlayın.",
    };
  }

  const imap = await fetchRecentImapMessages(imapCfg, maxMessages);
  if (!imap.ok) return { ok: false, error: imap.error };

  let inserted = 0;
  for (const m of imap.messages) {
    const exRes = await db.execute(
      sql`SELECT 1 AS x FROM mailbox_messages WHERE scope = 'site' AND imap_uid = ${m.uid} LIMIT 1`,
    );
    const ex = ((exRes as { rows?: unknown[] }).rows ?? exRes) as { x?: number }[];
    if (ex[0]) continue;
    await db.execute(sql`
      INSERT INTO mailbox_messages (scope, vendor_id, direction, from_addr, to_addr, subject, body_text, body_html, is_read, imap_uid)
      VALUES ('site', NULL, 'in', ${m.fromAddr}, ${m.toAddr}, ${m.subject}, ${m.bodyText}, ${m.bodyHtml || null}, false, ${m.uid})
    `);
    inserted++;
  }

  return { ok: true, fetched: imap.messages.length, inserted };
}

let autoSyncTimer: ReturnType<typeof setInterval> | null = null;

/** Periyodik IMAP senkronu (SITE_MAILBOX_AUTO_SYNC=1). */
export function startSiteMailboxAutoSync(log: typeof logger = logger): void {
  if (process.env["SITE_MAILBOX_AUTO_SYNC"] !== "1") return;
  if (autoSyncTimer) return;

  const ms = Math.max(60_000, Number(process.env["SITE_MAILBOX_AUTO_SYNC_MS"]) || 300_000);
  autoSyncTimer = setInterval(() => {
    void syncSiteMailboxFromImap(40)
      .then((r) => {
        if (r.ok && (r.inserted ?? 0) > 0) {
          log.info({ inserted: r.inserted, fetched: r.fetched }, "[site-mailbox] otomatik IMAP senkron");
        }
      })
      .catch((err) => log.warn({ err }, "[site-mailbox] otomatik IMAP senkron hatası"));
  }, ms);
  autoSyncTimer.unref?.();
  log.info({ intervalMs: ms, address: getSiteMailboxAddressFromEnv() }, "[site-mailbox] otomatik IMAP senkron aktif");
}
