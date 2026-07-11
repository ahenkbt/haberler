import { eq, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db, hmNewsSitesTable } from "@workspace/db";
import { sendEmailViaSmtp, type ExplicitSmtpConfig } from "./email.js";
import { fetchRecentImapMessages, testImapConnection, type ImapConnConfig } from "./imap-inbox.js";
import { inferImapHostFromSmtp, isBlankOrPlaceholderImapHost } from "./siteMailbox.js";

type Row = Record<string, unknown>;
const r = (res: unknown): Row[] => ((res as { rows?: Row[] }).rows ?? res) as Row[];

export type HmSiteMailboxAdminConfig = {
  address: string;
  fromDisplay: string;
  smtpConfigured: boolean;
  imapConfigured: boolean;
  ready: boolean;
  smtpHost: string | null;
  imapHost: string | null;
  imapFolder: string;
};

let ensured = false;

export async function ensureHmMailboxTables(): Promise<void> {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hm_site_mail_settings (
      site_id INTEGER PRIMARY KEY REFERENCES hm_news_sites(id) ON DELETE CASCADE,
      smtp_host TEXT,
      smtp_port TEXT DEFAULT '587',
      smtp_user TEXT,
      smtp_pass TEXT,
      smtp_from TEXT,
      imap_host TEXT,
      imap_port TEXT DEFAULT '993',
      imap_user TEXT,
      imap_pass TEXT,
      imap_folder TEXT DEFAULT 'INBOX',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE mailbox_messages ADD COLUMN IF NOT EXISTS hm_site_id INTEGER REFERENCES hm_news_sites(id) ON DELETE CASCADE`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_mailbox_messages_hm_site_created ON mailbox_messages (hm_site_id, created_at DESC) WHERE hm_site_id IS NOT NULL`,
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS mailbox_messages_hm_site_imap_uid ON mailbox_messages (hm_site_id, imap_uid) WHERE hm_site_id IS NOT NULL AND imap_uid IS NOT NULL AND imap_uid <> ''`,
  );
  ensured = true;
}

function contactEmailFromJson(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const c = JSON.parse(raw) as { email?: unknown };
    return String(c?.email ?? "").trim();
  } catch {
    return "";
  }
}

async function readHmMailSettings(siteId: number) {
  const rows = r(
    await db.execute(sql`
      SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from,
             imap_host, imap_port, imap_user, imap_pass, imap_folder
      FROM hm_site_mail_settings WHERE site_id = ${siteId} LIMIT 1
    `),
  )[0];
  return rows ?? null;
}

async function readHmSiteContactEmail(siteId: number): Promise<string> {
  const [row] = await db
    .select({ contactJson: hmNewsSitesTable.contactJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  return contactEmailFromJson(row?.contactJson);
}

export async function resolveHmSiteImapConfig(siteId: number): Promise<ImapConnConfig | null> {
  const row = await readHmMailSettings(siteId);
  let host = String(row?.imap_host ?? "").trim();
  if (isBlankOrPlaceholderImapHost(host)) {
    const guess = inferImapHostFromSmtp(String(row?.smtp_host ?? "").trim());
    if (guess) host = guess;
  }
  const user = String(row?.imap_user ?? "").trim() || String(row?.smtp_user ?? "").trim();
  const pass = String(row?.imap_pass ?? "").trim() || String(row?.smtp_pass ?? "").trim();
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(String(row?.imap_port ?? "993"), 10) || 993,
    user,
    password: pass,
    tls: true,
    mailbox: String(row?.imap_folder ?? "INBOX").trim() || "INBOX",
  };
}

export async function resolveHmSiteSmtpConfig(siteId: number): Promise<ExplicitSmtpConfig | null> {
  const row = await readHmMailSettings(siteId);
  const host = String(row?.smtp_host ?? "").trim();
  const user = String(row?.smtp_user ?? "").trim();
  const pass = String(row?.smtp_pass ?? "").trim();
  if (!host || !user || !pass) return null;
  const port = parseInt(String(row?.smtp_port ?? "587"), 10) || 587;
  const from =
    String(row?.smtp_from ?? "").trim() ||
    (user.includes("@") ? user : (await readHmSiteContactEmail(siteId)) || user);
  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from,
  };
}

export async function getHmSiteMailboxAdminConfig(siteId: number): Promise<HmSiteMailboxAdminConfig> {
  const row = await readHmMailSettings(siteId);
  const contactEmail = await readHmSiteContactEmail(siteId);
  const smtpUser = String(row?.smtp_user ?? "").trim();
  const address = smtpUser || contactEmail || "—";
  const fromDisplay = String(row?.smtp_from ?? "").trim() || smtpUser || contactEmail || address;
  const smtpConfigured = Boolean(
    String(row?.smtp_host ?? "").trim() && smtpUser && String(row?.smtp_pass ?? "").trim(),
  );
  const imapCfg = await resolveHmSiteImapConfig(siteId);
  const imapConfigured = Boolean(imapCfg);
  return {
    address,
    fromDisplay,
    smtpConfigured,
    imapConfigured,
    ready: smtpConfigured && imapConfigured,
    smtpHost: String(row?.smtp_host ?? "").trim() || null,
    imapHost: imapCfg?.host ?? null,
    imapFolder: imapCfg?.mailbox ?? (String(row?.imap_folder ?? "INBOX").trim() || "INBOX"),
  };
}

export async function testHmSiteMailboxConnections(siteId: number): Promise<{
  smtp: { ok: boolean; error?: string };
  imap: { ok: boolean; error?: string };
}> {
  const smtpCfg = await resolveHmSiteSmtpConfig(siteId);
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

  const imapCfg = await resolveHmSiteImapConfig(siteId);
  let imap: { ok: boolean; error?: string } = { ok: false, error: "IMAP yapılandırılmamış" };
  if (imapCfg) {
    const result = await testImapConnection(imapCfg);
    imap = result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  return { smtp, imap };
}

export async function syncHmSiteMailboxFromImap(
  siteId: number,
  maxMessages = 40,
): Promise<{ ok: boolean; fetched?: number; inserted?: number; error?: string }> {
  const imapCfg = await resolveHmSiteImapConfig(siteId);
  if (!imapCfg) {
    return {
      ok: false,
      error:
        "Gelen kutusu (IMAP) için sunucu, kullanıcı veya şifre eksik. Posta kutusu ayarlarından SMTP ve IMAP bilgilerini kaydedin.",
    };
  }

  const imap = await fetchRecentImapMessages(imapCfg, maxMessages);
  if (!imap.ok) return { ok: false, error: imap.error };

  let inserted = 0;
  for (const m of imap.messages) {
    const ex = r(
      await db.execute(
        sql`SELECT 1 AS x FROM mailbox_messages WHERE hm_site_id = ${siteId} AND imap_uid = ${m.uid} LIMIT 1`,
      ),
    )[0];
    if (ex) continue;
    await db.execute(sql`
      INSERT INTO mailbox_messages (scope, hm_site_id, direction, from_addr, to_addr, subject, body_text, body_html, is_read, imap_uid)
      VALUES ('hm', ${siteId}, 'in', ${m.fromAddr}, ${m.toAddr}, ${m.subject}, ${m.bodyText}, ${m.bodyHtml || null}, false, ${m.uid})
    `);
    inserted++;
  }
  return { ok: true, fetched: imap.messages.length, inserted };
}

export async function sendHmSiteMailboxEmail(
  siteId: number,
  opts: { to: string; subject: string; html: string; text?: string },
): Promise<{ sent: boolean; error?: string; fromDisplay?: string }> {
  const smtpCfg = await resolveHmSiteSmtpConfig(siteId);
  if (!smtpCfg) return { sent: false, error: "SMTP yapılandırılmamış. Posta kutusu ayarlarını kaydedin." };
  const sent = await sendEmailViaSmtp(smtpCfg, {
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (!sent.sent) return { sent: false, error: sent.error ?? "E-posta gönderilemedi" };
  const fromDisp = smtpCfg.from || smtpCfg.user;
  await db.execute(sql`
    INSERT INTO mailbox_messages (scope, hm_site_id, direction, from_addr, to_addr, subject, body_text, body_html, is_read)
    VALUES ('hm', ${siteId}, 'out', ${fromDisp}, ${opts.to}, ${opts.subject}, ${opts.text ?? null}, ${opts.html}, true)
  `);
  return { sent: true, fromDisplay: fromDisp };
}
