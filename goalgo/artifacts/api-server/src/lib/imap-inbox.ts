import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ParsedMail, AddressObject } from "mailparser";

function formatImapClientError(e: unknown): string {
  if (!e || typeof e !== "object") return String(e);
  const err = e as Error & { responseText?: string; responseStatus?: string; code?: string };
  const detail = String(err.responseText ?? "").trim();
  const msg = String(err.message ?? "").trim() || "IMAP hatası";
  if (detail && (msg === "Command failed" || !msg.includes(detail))) {
    return msg === "Command failed" ? detail : `${msg}: ${detail}`;
  }
  const st = String(err.responseStatus ?? "").trim();
  if (st && st !== "OK") return `${msg} (${st})`;
  return msg;
}

export type ImapConnConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
  mailbox?: string;
};

export type FetchedImapMessage = {
  uid: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
};

function addrFromParsed(m: ParsedMail, pick: "from" | "to"): string {
  const v = pick === "from" ? m.from : m.to;
  if (!v) return "";
  const one = (o: AddressObject | undefined): string => {
    if (!o) return "";
    if (Array.isArray(o.value) && o.value[0]) {
      const a = o.value[0].address || "";
      const n = (o.value[0].name || "").trim();
      return n ? `${n} <${a}>` : a;
    }
    return typeof o.text === "string" ? o.text : "";
  };
  if (Array.isArray(v)) return v.map(one).filter(Boolean).join(", ");
  return one(v);
}

/**
 * Son N gelen postayı IMAP ile okur (UID bazlı).
 */
export async function fetchRecentImapMessages(
  cfg: ImapConnConfig,
  maxMessages: number,
): Promise<{ ok: true; messages: FetchedImapMessage[] } | { ok: false; error: string }> {
  const host = cfg.host?.trim();
  const user = cfg.user?.trim();
  const pass = cfg.password?.trim();
  if (!host || !user || !pass) {
    return { ok: false, error: "IMAP sunucu, kullanıcı veya şifre eksik." };
  }
  const port = Math.min(65535, Math.max(1, Number(cfg.port) || 993));
  /** 993/995: doğrudan TLS; diğer portlarda (ör. 143) STARTTLS için secure=false */
  const implicitTls = port === 993 || port === 995;
  const secure = cfg.tls === false ? false : implicitTls;
  const mailbox = (cfg.mailbox || "INBOX").trim() || "INBOX";
  const client = new ImapFlow({
    host,
    port,
    secure,
    servername: host,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 90_000,
  });
  try {
    await client.connect();
    const opened = await client.mailboxOpen(mailbox);
    if (!opened || typeof opened !== "object") {
      try {
        await client.logout();
      } catch {
        /* ignore */
      }
      return { ok: false, error: `IMAP klasörü açılamadı: ${mailbox}` };
    }
    const exists = Number(opened.exists ?? 0);
    const n = Math.min(Math.max(1, maxMessages), 80);
    const out: FetchedImapMessage[] = [];
    if (!Number.isFinite(exists) || exists <= 0) {
      await client.logout();
      return { ok: true, messages: [] };
    }
    const start = Math.max(1, exists - n + 1);
    const range = `${start}:*`;
    for await (const msg of client.fetch(range, { uid: true, source: true })) {
      if (!msg.source) continue;
      let parsed: ParsedMail;
      try {
        parsed = await simpleParser(msg.source);
      } catch {
        continue;
      }
      const uid = String(msg.uid ?? "");
      if (!uid) continue;
      const fromAddr = addrFromParsed(parsed, "from") || "(bilinmeyen)";
      const toAddr = addrFromParsed(parsed, "to") || user;
      const subject = String(parsed.subject || "").slice(0, 500);
      const bodyText = String(parsed.text || "").slice(0, 120000);
      const rawHtml = parsed.html;
      const bodyHtml =
        typeof rawHtml === "string" ? rawHtml.slice(0, 120000) : typeof rawHtml === "boolean" ? "" : String(rawHtml ?? "").slice(0, 120000);
      out.push({ uid, fromAddr, toAddr, subject, bodyText, bodyHtml });
    }
    await client.logout();
    return { ok: true, messages: out };
  } catch (e) {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    return { ok: false, error: formatImapClientError(e) };
  }
}

/** Bağlantı testi — gelen kutusunu açar, mesaj çekmez. */
export async function testImapConnection(
  cfg: ImapConnConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = cfg.host?.trim();
  const user = cfg.user?.trim();
  const pass = cfg.password?.trim();
  if (!host || !user || !pass) {
    return { ok: false, error: "IMAP sunucu, kullanıcı veya şifre eksik." };
  }
  const port = Math.min(65535, Math.max(1, Number(cfg.port) || 993));
  const implicitTls = port === 993 || port === 995;
  const secure = cfg.tls === false ? false : implicitTls;
  const mailbox = (cfg.mailbox || "INBOX").trim() || "INBOX";
  const client = new ImapFlow({
    host,
    port,
    secure,
    servername: host,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 45_000,
  });
  try {
    await client.connect();
    await client.mailboxOpen(mailbox);
    await client.logout();
    return { ok: true };
  } catch (e) {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    return { ok: false, error: formatImapClientError(e) };
  }
}
