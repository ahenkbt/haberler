import { Router, type IRouter, type Request } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { getSmtpEnvAuthFields, sendEmail, sendEmailViaSmtp } from "../lib/email.js";
import { fetchRecentImapMessages } from "../lib/imap-inbox.js";
import {
  getSiteMailboxAdminConfig,
  getSiteMailboxFromDisplay,
  inferImapHostFromSmtp,
  isBlankOrPlaceholderImapHost,
  syncSiteMailboxFromImap,
  testSiteMailboxConnections,
} from "../lib/siteMailbox.js";
import { trySendCustomerWhatsApp, trySendSiteOutboundWhatsApp } from "../lib/whatsapp.js";

const router: IRouter = Router();

type Row = Record<string, unknown>;
const r = (res: unknown): Row[] => ((res as { rows?: Row[] }).rows ?? res) as Row[];

function sqlVendorSessionEmailMatches(headerEmail: string) {
  const e = String(headerEmail).trim();
  return sql`(
    LOWER(TRIM(COALESCE(owner_email, ''))) = LOWER(TRIM(${e}))
    OR LOWER(TRIM(COALESCE(email, ''))) = LOWER(TRIM(${e}))
  )`;
}

function vendorFromReq(req: Request): { id: number; email: string } | null {
  const id = parseInt(String(req.headers["x-vendor-id"] ?? ""), 10);
  const email = String(req.headers["x-vendor-email"] ?? "").trim();
  if (!Number.isFinite(id) || id < 1 || !email) return null;
  return { id, email };
}

let ensured = false;
async function ensureCommsTables(): Promise<void> {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_mail_settings (
      vendor_id INTEGER PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mailbox_messages (
      id SERIAL PRIMARY KEY,
      scope TEXT NOT NULL,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      from_addr TEXT NOT NULL,
      to_addr TEXT NOT NULL,
      subject TEXT,
      body_text TEXT,
      body_html TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      imap_uid TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_public_announcements (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      announcement_type TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      show_on_home BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_home_announcements (
      id SERIAL PRIMARY KEY,
      announcement_type TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_marketing_bulk_runs (
      id SERIAL PRIMARY KEY,
      template TEXT NOT NULL,
      recipients_count INTEGER NOT NULL DEFAULT 0,
      wa_requested BOOLEAN NOT NULL DEFAULT true,
      email_requested BOOLEAN NOT NULL DEFAULT false,
      whatsapp_sent INTEGER NOT NULL DEFAULT 0,
      email_sent INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS mailbox_messages_vendor_imap_uid ON mailbox_messages (vendor_id, imap_uid) WHERE vendor_id IS NOT NULL AND imap_uid IS NOT NULL AND imap_uid <> ''`,
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS mailbox_messages_site_imap_uid ON mailbox_messages (scope, imap_uid) WHERE scope = 'site' AND imap_uid IS NOT NULL AND imap_uid <> ''`,
  );
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_host TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_port TEXT DEFAULT '993'`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_user TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_pass TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_folder TEXT DEFAULT 'INBOX'`);
  ensured = true;
}

export function personalizeMessageTemplate(template: string, fullName: string): string {
  const t = fullName.trim() || "Müşterimiz";
  const parts = t.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
  let out = template;
  const reps: [RegExp, string][] = [
    [/\{\{\s*isim\s*soyisim\s*\}\}/gi, t],
    [/\{\{\s*ad\s*\}\}/gi, first],
    [/\{\{\s*soyad\s*\}\}/gi, last],
    [/\[(isim\s*soyisim|ad\s*soyad|name\s*surname|full\s*name|musteri)\]/gi, t],
    [/\[(ad|isim|firstname|first_name|name)\]/gi, first],
    [/\[(soyad|soyisim|surname|last_name)\]/gi, last],
  ];
  for (const [rx, val] of reps) out = out.replace(rx, val);
  return out;
}

/** Anasayfa: site + mağaza duyuruları */
router.get("/site/home-announcements", async (_req, res): Promise<void> => {
  await ensureCommsTables();
  try {
    const siteRows = r(
      await db.execute(sql`
        SELECT id, title, body, announcement_type, published_at, expires_at, sort_order
        FROM site_home_announcements
        WHERE active = true AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY sort_order ASC, published_at DESC
        LIMIT 30
      `),
    );
    const vendorRows = r(
      await db.execute(sql`
        SELECT va.id, va.vendor_id, v.name AS vendor_name, v.slug AS vendor_slug,
               va.title, va.body, va.announcement_type, va.published_at, va.expires_at, va.sort_order
        FROM vendor_public_announcements va
        INNER JOIN vendors v ON v.id = va.vendor_id
        WHERE va.active = true AND va.show_on_home = true
          AND v.application_status = 'approved' AND v.active = true
          AND (va.expires_at IS NULL OR va.expires_at > NOW())
        ORDER BY va.sort_order ASC, va.published_at DESC
        LIMIT 40
      `),
    );
    res.json({ site: siteRows, vendors: vendorRows });
  } catch {
    res.json({ site: [], vendors: [] });
  }
});

/* — Vendor mail settings — */

router.get("/providers/me/mail-settings", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const rows = r(
    await db.execute(sql`
      SELECT smtp_host, smtp_port, smtp_user, smtp_from, imap_host, imap_port, imap_user, imap_folder,
        (smtp_pass IS NOT NULL AND smtp_pass <> '') AS has_smtp_pass,
        (imap_pass IS NOT NULL AND imap_pass <> '') AS has_imap_pass
      FROM vendor_mail_settings WHERE vendor_id = ${v.id} LIMIT 1
    `),
  );
  res.json({ settings: rows[0] ?? null });
});

router.put("/providers/me/mail-settings", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const smtpHost = b.smtpHost != null ? String(b.smtpHost).trim().slice(0, 256) : null;
  const smtpPort = b.smtpPort != null ? String(b.smtpPort).trim().slice(0, 8) : "587";
  const smtpUser = b.smtpUser != null ? String(b.smtpUser).trim().slice(0, 256) : null;
  const smtpPassRaw = b.smtpPass != null ? String(b.smtpPass) : null;
  const smtpFrom = b.smtpFrom != null ? String(b.smtpFrom).trim().slice(0, 512) : null;
  const imapHost = b.imapHost != null ? String(b.imapHost).trim().slice(0, 256) : null;
  const imapPort = b.imapPort != null ? String(b.imapPort).trim().slice(0, 8) : "993";
  const imapUser = b.imapUser != null ? String(b.imapUser).trim().slice(0, 256) : null;
  const imapPassRaw = b.imapPass != null ? String(b.imapPass) : null;
  const imapFolder = b.imapFolder != null ? String(b.imapFolder).trim().slice(0, 120) : "INBOX";

  const prev = r(
    await db.execute(sql`SELECT smtp_pass, imap_pass FROM vendor_mail_settings WHERE vendor_id = ${v.id} LIMIT 1`),
  )[0] as { smtp_pass?: string; imap_pass?: string } | undefined;

  const smtpPassFinal =
    smtpPassRaw === undefined || smtpPassRaw === "***"
      ? String(prev?.smtp_pass ?? "")
      : smtpPassRaw === "" || smtpPassRaw === null
        ? ""
        : String(smtpPassRaw).slice(0, 512);
  const imapPassFinal =
    imapPassRaw === undefined || imapPassRaw === "***"
      ? String(prev?.imap_pass ?? "")
      : imapPassRaw === "" || imapPassRaw === null
        ? ""
        : String(imapPassRaw).slice(0, 512);

  await db.execute(sql`
    INSERT INTO vendor_mail_settings (
      vendor_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from,
      imap_host, imap_port, imap_user, imap_pass, imap_folder, updated_at
    ) VALUES (
      ${v.id}, ${smtpHost}, ${smtpPort}, ${smtpUser}, ${smtpPassFinal}, ${smtpFrom},
      ${imapHost}, ${imapPort}, ${imapUser}, ${imapPassFinal}, ${imapFolder}, NOW()
    )
    ON CONFLICT (vendor_id) DO UPDATE SET
      smtp_host = EXCLUDED.smtp_host,
      smtp_port = EXCLUDED.smtp_port,
      smtp_user = EXCLUDED.smtp_user,
      smtp_pass = EXCLUDED.smtp_pass,
      smtp_from = EXCLUDED.smtp_from,
      imap_host = EXCLUDED.imap_host,
      imap_port = EXCLUDED.imap_port,
      imap_user = EXCLUDED.imap_user,
      imap_pass = EXCLUDED.imap_pass,
      imap_folder = EXCLUDED.imap_folder,
      updated_at = NOW()
  `);

  res.json({ ok: true });
});

router.get("/providers/me/mailbox", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "40"), 10) || 40));
  const rows = r(
    await db.execute(sql`
      SELECT id, direction, from_addr, to_addr, subject, body_text, body_html, is_read, imap_uid, created_at
      FROM mailbox_messages
      WHERE scope = 'vendor' AND vendor_id = ${v.id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `),
  );
  res.json({ messages: rows });
});

router.post("/providers/me/mailbox/send", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const { to, subject, bodyHtml, bodyText } = req.body as Record<string, unknown>;
  const toAddr = String(to ?? "").trim();
  const subj = String(subject ?? "").trim().slice(0, 500);
  const html = String(bodyHtml ?? "").trim();
  const text = String(bodyText ?? "").trim() || undefined;
  if (!toAddr || !subj || !html) {
    res.status(400).json({ error: "to, subject ve bodyHtml zorunludur." });
    return;
  }
  const cfgRows = r(
    await db.execute(sql`
      SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from
      FROM vendor_mail_settings WHERE vendor_id = ${v.id} LIMIT 1
    `),
  )[0];
  if (!cfgRows?.smtp_host || !cfgRows?.smtp_user || !cfgRows?.smtp_pass) {
    res.status(400).json({ error: "Önce mağaza SMTP bilgilerini kaydedin." });
    return;
  }
  const port = Math.min(65535, Math.max(1, parseInt(String(cfgRows.smtp_port ?? "587"), 10) || 587));
  const sent = await sendEmailViaSmtp(
    {
      host: String(cfgRows.smtp_host),
      port,
      secure: port === 465,
      user: String(cfgRows.smtp_user),
      pass: String(cfgRows.smtp_pass),
      from: String(cfgRows.smtp_from || cfgRows.smtp_user),
    },
    { to: toAddr, subject: subj, html, text },
  );
  if (!sent.sent) {
    res.status(502).json({ error: sent.error ?? "E-posta gönderilemedi" });
    return;
  }
  const fromDisp = String(cfgRows.smtp_from || cfgRows.smtp_user);
  await db.execute(sql`
    INSERT INTO mailbox_messages (scope, vendor_id, direction, from_addr, to_addr, subject, body_text, body_html, is_read)
    VALUES ('vendor', ${v.id}, 'out', ${fromDisp}, ${toAddr}, ${subj}, ${text ?? null}, ${html}, true)
  `);
  res.json({ ok: true });
});

router.post("/providers/me/mailbox/sync-imap", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const cfgRows = r(
    await db.execute(sql`
      SELECT imap_host, imap_port, imap_user, imap_pass, imap_folder, smtp_host, smtp_user, smtp_pass
      FROM vendor_mail_settings WHERE vendor_id = ${v.id} LIMIT 1
    `),
  )[0];
  let host = String(cfgRows?.imap_host ?? "").trim();
  if (isBlankOrPlaceholderImapHost(host)) {
    const guess = inferImapHostFromSmtp(String(cfgRows?.smtp_host ?? "").trim());
    if (guess) host = guess;
  }
  const user = String(cfgRows?.imap_user ?? "").trim() || String(cfgRows?.smtp_user ?? "").trim();
  const pass = String(cfgRows?.imap_pass ?? "").trim() || String(cfgRows?.smtp_pass ?? "").trim();
  if (!host || !user || !pass) {
    res.status(400).json({
      error:
        "IMAP sunucu/kullanıcı/şifre eksik. IMAP kullanıcı/şifre boşsa SMTP kullanıcı/şifresi kullanılır; IMAP sunucusu şablonsa (imap.ornek.com), SMTP sunucusundan otomatik tahmin edilir.",
    });
    return;
  }
  const max = Math.min(50, Math.max(5, parseInt(String((req.body as { max?: unknown })?.max ?? "25"), 10) || 25));
  const imap = await fetchRecentImapMessages(
    {
      host,
      port: parseInt(String(cfgRows.imap_port ?? "993"), 10) || 993,
      user,
      password: pass,
      tls: true,
      mailbox: String(cfgRows.imap_folder || "INBOX"),
    },
    max,
  );
  if (!imap.ok) {
    res.status(400).json({ error: imap.error });
    return;
  }
  let inserted = 0;
  for (const m of imap.messages) {
    const ex = r(
      await db.execute(sql`SELECT 1 AS x FROM mailbox_messages WHERE vendor_id = ${v.id} AND imap_uid = ${m.uid} LIMIT 1`),
    )[0];
    if (ex) continue;
    await db.execute(sql`
      INSERT INTO mailbox_messages (scope, vendor_id, direction, from_addr, to_addr, subject, body_text, body_html, is_read, imap_uid)
      VALUES ('vendor', ${v.id}, 'in', ${m.fromAddr}, ${m.toAddr}, ${m.subject}, ${m.bodyText}, ${m.bodyHtml || null}, false, ${m.uid})
    `);
    inserted++;
  }
  res.json({ ok: true, fetched: imap.messages.length, inserted });
});

router.patch("/providers/me/mailbox/:mid/read", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const mid = parseInt(req.params.mid, 10);
  if (!Number.isFinite(mid)) {
    res.status(400).json({ error: "Geçersiz" });
    return;
  }
  await db.execute(sql`
    UPDATE mailbox_messages SET is_read = true
    WHERE id = ${mid} AND scope = 'vendor' AND vendor_id = ${v.id}
  `);
  res.json({ ok: true });
});

/* — Vendor announcements — */

router.get("/providers/me/announcements", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const rows = r(
    await db.execute(sql`
      SELECT * FROM vendor_public_announcements WHERE vendor_id = ${v.id}
      ORDER BY sort_order ASC, published_at DESC
    `),
  );
  res.json({ announcements: rows });
});

router.post("/providers/me/announcements", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const title = String(b.title ?? "").trim().slice(0, 200);
  const body = String(b.body ?? "").trim().slice(0, 8000);
  const announcementType = String(b.announcementType ?? "general").trim().slice(0, 40) || "general";
  const active = b.active !== false;
  const showOnHome = b.showOnHome !== false;
  const sortOrder = Math.min(999, Math.max(0, parseInt(String(b.sortOrder ?? "0"), 10) || 0));
  if (!title || !body) {
    res.status(400).json({ error: "title ve body zorunlu" });
    return;
  }
  const ins = r(
    await db.execute(sql`
      INSERT INTO vendor_public_announcements (
        vendor_id, announcement_type, title, body, active, show_on_home, sort_order
      ) VALUES (${v.id}, ${announcementType}, ${title}, ${body}, ${active}, ${showOnHome}, ${sortOrder})
      RETURNING id
    `),
  );
  res.status(201).json({ ok: true, id: (ins[0] as { id?: number })?.id });
});

router.patch("/providers/me/announcements/:aid", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const aid = parseInt(req.params.aid, 10);
  if (!Number.isFinite(aid)) {
    res.status(400).json({ error: "Geçersiz" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  await db.execute(sql`
    UPDATE vendor_public_announcements SET
      title = COALESCE(${b.title != null ? String(b.title).trim().slice(0, 200) : null}, title),
      body = COALESCE(${b.body != null ? String(b.body).trim().slice(0, 8000) : null}, body),
      announcement_type = COALESCE(${b.announcementType != null ? String(b.announcementType).trim().slice(0, 40) : null}, announcement_type),
      active = COALESCE(${typeof b.active === "boolean" ? b.active : null}, active),
      show_on_home = COALESCE(${typeof b.showOnHome === "boolean" ? b.showOnHome : null}, show_on_home),
      sort_order = COALESCE(${b.sortOrder != null ? parseInt(String(b.sortOrder), 10) : null}, sort_order)
    WHERE id = ${aid} AND vendor_id = ${v.id}
  `);
  if (Object.prototype.hasOwnProperty.call(b, "expiresAt")) {
    const ev = b.expiresAt == null ? null : String(b.expiresAt).trim() || null;
    await db.execute(sql`UPDATE vendor_public_announcements SET expires_at = ${ev} WHERE id = ${aid} AND vendor_id = ${v.id}`);
  }
  res.json({ ok: true });
});

router.delete("/providers/me/announcements/:aid", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const aid = parseInt(req.params.aid, 10);
  await db.execute(sql`DELETE FROM vendor_public_announcements WHERE id = ${aid} AND vendor_id = ${v.id}`);
  res.json({ ok: true });
});

/* — Vendor marketing contacts & bulk — */

router.get("/providers/me/marketing/contacts", async (req, res): Promise<void> => {
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const rows = r(
    await db.execute(sql`
      SELECT DISTINCT ON (customer_phone)
        customer_name, customer_phone, customer_email
      FROM delivery_orders
      WHERE vendor_id = ${v.id}
        AND customer_phone IS NOT NULL AND TRIM(customer_phone) <> ''
      ORDER BY customer_phone, created_at DESC
      LIMIT 500
    `),
  );
  res.json({ contacts: rows });
});

router.post("/providers/me/marketing/bulk", async (req, res): Promise<void> => {
  await ensureCommsTables();
  const v = vendorFromReq(req);
  if (!v) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(
      sql`SELECT id, callmebot_key FROM vendors WHERE id = ${v.id} AND ${sqlVendorSessionEmailMatches(v.email)} LIMIT 1`,
    ),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const b = req.body as {
    template?: string;
    channels?: { wa?: boolean; email?: boolean };
    recipients?: { fullName?: string; phone?: string; email?: string }[];
  };
  const template = String(b.template ?? "").trim();
  const channels = b.channels ?? { wa: true, email: false };
  const recipients = Array.isArray(b.recipients) ? b.recipients : [];
  if (!template || recipients.length === 0) {
    res.status(400).json({ error: "template ve recipients gerekli" });
    return;
  }
  if (recipients.length > 200) {
    res.status(400).json({ error: "En fazla 200 alıcı" });
    return;
  }
  const cfgRows = r(
    await db.execute(sql`
      SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from
      FROM vendor_mail_settings WHERE vendor_id = ${v.id} LIMIT 1
    `),
  )[0];
  const waKey = String((own as { callmebot_key?: string }).callmebot_key ?? "").trim();
  let waOk = 0;
  let emailOk = 0;
  let n = 0;
  for (const rec of recipients) {
    const fullName = String(rec.fullName ?? "").trim() || "Müşterimiz";
    const msg = personalizeMessageTemplate(template, fullName);
    const phone = String(rec.phone ?? "").trim();
    const email = String(rec.email ?? "").trim();
    if (channels.wa && phone) {
      const rWa = await trySendCustomerWhatsApp({
        customerPhone: phone,
        message: msg,
        vendorCallmebotApiKey: waKey || null,
      });
      if (rWa.sent) waOk++;
      else if (!waKey) {
        const alt = await trySendSiteOutboundWhatsApp(phone, msg);
        if (alt.sent) waOk++;
      }
      n++;
      if (n % 5 === 0) await new Promise((x) => setTimeout(x, 150));
    }
    if (channels.email && email && cfgRows?.smtp_host && cfgRows?.smtp_user && cfgRows?.smtp_pass) {
      const port = Math.min(65535, Math.max(1, parseInt(String(cfgRows.smtp_port ?? "587"), 10) || 587));
      const se = await sendEmailViaSmtp(
        {
          host: String(cfgRows.smtp_host),
          port,
          secure: port === 465,
          user: String(cfgRows.smtp_user),
          pass: String(cfgRows.smtp_pass),
          from: String(cfgRows.smtp_from || cfgRows.smtp_user),
        },
        { to: email, subject: "İşletmemizden bilgilendirme", html: `<pre style="font-family:system-ui">${escapeHtml(msg)}</pre>`, text: msg },
      );
      if (se.sent) emailOk++;
    }
  }
  res.json({ ok: true, whatsappSent: waOk, emailSent: emailOk, processed: recipients.length });
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* — Admin: site mailbox & IMAP — */

router.get("/site/admin/mailbox", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  const rows = r(
    await db.execute(sql`
      SELECT id, direction, from_addr, to_addr, subject, body_text, is_read, imap_uid, created_at
      FROM mailbox_messages
      WHERE scope = 'site'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `),
  );
  const config = await getSiteMailboxAdminConfig();
  res.json({ messages: rows, config });
});

router.get("/site/admin/mailbox/config", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const config = await getSiteMailboxAdminConfig();
  res.json({ config });
});

router.post("/site/admin/mailbox/test-connection", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const result = await testSiteMailboxConnections();
  res.json(result);
});

router.patch("/site/admin/mailbox/:id/read", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }
  await db.execute(sql`
    UPDATE mailbox_messages SET is_read = true
    WHERE id = ${id} AND scope = 'site'
  `);
  res.json({ ok: true });
});

router.post("/site/admin/mailbox/send", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const { to, subject, bodyHtml, bodyText } = req.body as Record<string, unknown>;
  const toAddr = String(to ?? "").trim();
  const subj = String(subject ?? "").trim().slice(0, 500);
  const html = String(bodyHtml ?? "").trim();
  const text = String(bodyText ?? "").trim() || undefined;
  if (!toAddr || !subj || !html) {
    res.status(400).json({ error: "to, subject ve bodyHtml zorunlu" });
    return;
  }
  const sent = await sendEmail({ to: toAddr, subject: subj, html, text });
  if (!sent.sent) {
    res.status(502).json({ error: "SMTP yapılandırılmamış veya gönderim başarısız" });
    return;
  }
  const fromDisp = await getSiteMailboxFromDisplay();
  await db.execute(sql`
    INSERT INTO mailbox_messages (scope, vendor_id, direction, from_addr, to_addr, subject, body_text, body_html, is_read)
    VALUES ('site', NULL, 'out', ${fromDisp}, ${toAddr}, ${subj}, ${text ?? null}, ${html}, true)
  `);
  res.json({ ok: true });
});

router.post("/site/admin/mailbox/sync-imap", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const result = await syncSiteMailboxFromImap(40);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ ok: true, fetched: result.fetched, inserted: result.inserted });
});

/* Site admin announcements */

router.get("/site/admin/home-announcements", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const rows = r(
    await db.execute(sql`SELECT * FROM site_home_announcements ORDER BY sort_order ASC, published_at DESC`),
  );
  res.json({ announcements: rows });
});

router.post("/site/admin/home-announcements", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const b = req.body as Record<string, unknown>;
  const title = String(b.title ?? "").trim().slice(0, 200);
  const body = String(b.body ?? "").trim().slice(0, 8000);
  const announcementType = String(b.announcementType ?? "general").trim().slice(0, 40) || "general";
  const active = b.active !== false;
  const sortOrder = Math.min(999, Math.max(0, parseInt(String(b.sortOrder ?? "0"), 10) || 0));
  if (!title || !body) {
    res.status(400).json({ error: "title ve body zorunlu" });
    return;
  }
  const ins = r(
    await db.execute(sql`
      INSERT INTO site_home_announcements (announcement_type, title, body, active, sort_order)
      VALUES (${announcementType}, ${title}, ${body}, ${active}, ${sortOrder})
      RETURNING id
    `),
  );
  res.status(201).json({ ok: true, id: (ins[0] as { id?: number })?.id });
});

router.patch("/site/admin/home-announcements/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const id = parseInt(req.params.id, 10);
  const b = req.body as Record<string, unknown>;
  await db.execute(sql`
    UPDATE site_home_announcements SET
      title = COALESCE(${b.title != null ? String(b.title).trim().slice(0, 200) : null}, title),
      body = COALESCE(${b.body != null ? String(b.body).trim().slice(0, 8000) : null}, body),
      announcement_type = COALESCE(${b.announcementType != null ? String(b.announcementType).trim().slice(0, 40) : null}, announcement_type),
      active = COALESCE(${typeof b.active === "boolean" ? b.active : null}, active),
      sort_order = COALESCE(${b.sortOrder != null ? parseInt(String(b.sortOrder), 10) : null}, sort_order)
    WHERE id = ${id}
  `);
  if (Object.prototype.hasOwnProperty.call(b, "expiresAt")) {
    const ev = b.expiresAt == null ? null : String(b.expiresAt).trim() || null;
    await db.execute(sql`UPDATE site_home_announcements SET expires_at = ${ev} WHERE id = ${id}`);
  }
  res.json({ ok: true });
});

router.delete("/site/admin/home-announcements/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const id = parseInt(req.params.id, 10);
  await db.execute(sql`DELETE FROM site_home_announcements WHERE id = ${id}`);
  res.json({ ok: true });
});

/** Admin: kayıtlı müşterilere toplu WA / e-posta */
router.post("/site/admin/marketing/bulk-customers", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const b = req.body as {
    template?: string;
    channels?: { wa?: boolean; email?: boolean };
    recipients?: { fullName?: string; phone?: string; email?: string }[];
  };
  const template = String(b.template ?? "").trim();
  const channels = b.channels ?? { wa: true, email: false };
  const recipients = Array.isArray(b.recipients) ? b.recipients : [];
  if (!template || recipients.length === 0) {
    res.status(400).json({ error: "template ve recipients gerekli" });
    return;
  }
  if (recipients.length > 300) {
    res.status(400).json({ error: "En fazla 300 alıcı" });
    return;
  }
  let waOk = 0;
  let emailOk = 0;
  let i = 0;
  for (const rec of recipients) {
    const fullName = String(rec.fullName ?? "").trim() || "Müşterimiz";
    const msg = personalizeMessageTemplate(template, fullName);
    const phone = String(rec.phone ?? "").trim();
    const email = String(rec.email ?? "").trim();
    if (channels.wa && phone) {
      const r2 = await trySendSiteOutboundWhatsApp(phone, msg);
      if (r2.sent) waOk++;
      i++;
      if (i % 4 === 0) await new Promise((x) => setTimeout(x, 120));
    }
    if (channels.email && email) {
      const se = await sendEmail({
        to: email,
        subject: "Yekpare bilgilendirme",
        html: `<pre style="font-family:system-ui">${escapeHtml(msg)}</pre>`,
        text: msg,
      });
      if (se.sent) emailOk++;
    }
  }
  await db.execute(sql`
    INSERT INTO site_marketing_bulk_runs (
      template, recipients_count, wa_requested, email_requested, whatsapp_sent, email_sent
    ) VALUES (
      ${template.slice(0, 12000)},
      ${recipients.length},
      ${Boolean(channels.wa)},
      ${Boolean(channels.email)},
      ${waOk},
      ${emailOk}
    )
  `);
  res.json({ ok: true, whatsappSent: waOk, emailSent: emailOk });
});

router.get("/site/admin/marketing/bulk-history", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCommsTables();
  const limit = Math.min(100, Math.max(5, parseInt(String(req.query.limit ?? "25"), 10) || 25));
  const rows = r(
    await db.execute(sql`
      SELECT id, template, recipients_count, wa_requested, email_requested, whatsapp_sent, email_sent, created_at
      FROM site_marketing_bulk_runs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `),
  );
  res.json({ runs: rows });
});

router.get("/site/admin/marketing/customers-export", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const limit = Math.min(2000, Math.max(10, parseInt(String(req.query.limit ?? "500"), 10) || 500));
  const rows = r(
    await db.execute(sql`
      SELECT name, phone, email
      FROM shop_users
      WHERE active = true
        AND (NULLIF(TRIM(phone), '') IS NOT NULL OR NULLIF(TRIM(email), '') IS NOT NULL)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT ${limit}
    `),
  );
  res.json({ customers: rows });
});

export default router;
