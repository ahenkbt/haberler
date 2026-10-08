/**
 * HM news sites: site mailbox inside the editor panel (user request 2026-10-08 21:02).
 *
 * Mail lives in the Yekpare Posta tables (mail_accounts / mailbox_messages, bitter-mouse Neon) that
 * yekpare.net/posta also uses: Cloudflare Email Routing -> Worker yekpare-mailbox-email -> mailbox_messages.
 * The editor never types mail credentials: the editor JWT decides which boxes are reachable, and the
 * Worker reads/writes the mail DB server-side (secret HM_MAIL_DATABASE_URL) and sends via Cloudflare
 * Email Sending (secret HM_MAIL_SEND_TOKEN). Routing rules for new boxes: secret HM_MAIL_ROUTING_TOKEN.
 *
 * Editor (Authorization: Bearer <editor JWT>):
 *   GET   /api/hm/editor/site-mail                      boxes of the site (+ default box auto-created)
 *   GET   /api/hm/editor/site-mail/messages?box=&folder=inbox|sent|starred|trash&q=&limit=&offset=
 *   GET   /api/hm/editor/site-mail/messages/:id
 *   PATCH /api/hm/editor/site-mail/messages/:id         {isRead?, isStarred?, isTrashed?}
 *   POST  /api/hm/editor/site-mail/send                 {from, to, cc?, bcc?, subject, text, html?}
 *   POST  /api/hm/editor/site-mail/boxes                {localPart, domain, displayName?}
 *   POST  /api/hm/editor/site-mail/messages/:id/to-news {ai?}  incoming mail -> DRAFT news (hm-site-mail-to-news.js)
 * Admin (panel session cookie, hm_sites permission):
 *   GET   /api/hm/admin/site-mail/boxes                 all news sites with their boxes
 *   POST  /api/hm/admin/site-mail/boxes                 {siteId, localPart, domain, displayName?}
 *
 * Access rule: a site reaches only its conventional address(es) (bilgi@<domain> / <sub>@gundemi.org) and
 * boxes opened for it through this module (requested_by 'hm-site:<id> ...'). Other boxes on the same domain
 * (e.g. personal staff boxes made in Yekpare Posta) stay private. New boxes: editor on the site's own custom
 * domains, admin also on the shared zone of a subdomain site.
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { neonSqlClient, isNeonServerlessUrl, preferNeonDirectWriteUrl } from "./neon-edge-db.js";
import { parseEditorJwt, loadActiveEditor } from "./hm-editor-profile-edge.js";
import { readCookie, unsignConnectSid, loadPanelSession, sessionGrantsHmSites } from "./hm-admin-site-edge.js";
import {
  conventionalAddressesForSite,
  isHmNewsSite,
  normalizeMailHost,
  ownedMailDomainsForSite,
  registrableDomain,
  siteHosts,
} from "./hm-site-mail-convention.js";
import { conversionsFor, convertMailToNews } from "./hm-site-mail-to-news.js";

const CF_ACCOUNT_ID = "16f5b996194174624e7969a3658bd2bb";
const INBOUND_WORKER = "yekpare-mailbox-email";
const EDITOR_PREFIX = "/api/hm/editor/site-mail";
const ADMIN_PREFIX = "/api/hm/admin/site-mail";
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const RESERVED_LOCAL = new Set(["postmaster", "abuse", "hostmaster", "mailer-daemon", "noreply", "no-reply", "root"]);

export function isHmSiteMailPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "");
  return p === EDITOR_PREFIX || p.startsWith(`${EDITOR_PREFIX}/`) || p === ADMIN_PREFIX || p.startsWith(`${ADMIN_PREFIX}/`);
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      vary: "Origin, Authorization, Cookie",
      "x-yekpare-frontend": "cloudflare-site-mail",
    },
  });
}

function mailSql(env) {
  const raw = String(env?.HM_MAIL_DATABASE_URL || "").trim();
  if (!raw) return null;
  const url = preferNeonDirectWriteUrl(raw);
  if (!url || !isNeonServerlessUrl(url)) return null;
  return neon(url);
}

export function normalizeAddress(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  const m = s.match(/<([^>]+)>/);
  const a = (m?.[1] || s).trim();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(a) ? a : "";
}

function splitAddresses(raw) {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(/[,;\n]/);
  const out = [];
  for (const piece of list) {
    const a = normalizeAddress(piece);
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

function likeEscape(s) {
  return String(s).replace(/[\\%_]/g, (c) => `\\${c}`);
}

function reEscape(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-address match inside a header list ("Ad <a@b.c>, x@y.z"). */
function addrRegex(box) {
  return `(^|[^a-z0-9._%+-])${reEscape(box)}($|[^a-z0-9.-])`;
}

/** Some stored bodies are still quoted-printable (=C3=B6...); decode for display when clearly encoded. */
export function decodeQpIfEncoded(raw) {
  const s = String(raw ?? "");
  if (!s || /[^\x00-\x7f]/.test(s)) return s;
  const hits = s.match(/=[0-9A-F]{2}/g);
  if (!hits || hits.length < 2) return s;
  try {
    const bytes = [];
    const src = s.replace(/=\r?\n/g, "");
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) {
        bytes.push(parseInt(src.slice(i + 1, i + 3), 16));
        i += 2;
      } else bytes.push(c.charCodeAt(0) & 0xff);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return s;
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/* ---------- Cloudflare zone / routing helpers (cached per isolate) ---------- */

const cfCache = new Map();
async function cfGet(env, path, ttlMs = 600_000) {
  const token = String(env?.HM_MAIL_ROUTING_TOKEN || "").trim();
  if (!token) return null;
  const hit = cfCache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  const value = data && data.success !== false ? data.result ?? null : null;
  cfCache.set(path, { at: Date.now(), value });
  return value;
}

async function zoneIdFor(env, domain) {
  const zones = await cfGet(env, `/zones?name=${encodeURIComponent(domain)}`);
  return Array.isArray(zones) && zones[0]?.id ? zones[0].id : null;
}

/** {ok, note, code} — can this address receive mail into the Yekpare mailbox tables? */
export async function receiveStatus(env, address) {
  const domain = String(address).split("@")[1] || "";
  const zoneName = registrableDomain(domain) || domain;
  if (!String(env?.HM_MAIL_ROUTING_TOKEN || "").trim()) return { ok: null, code: "unknown", note: "" };
  try {
    const zid = await zoneIdFor(env, zoneName);
    if (!zid) {
      return {
        ok: false,
        code: "no_zone",
        note: `${zoneName} Cloudflare hesabında değil; bu adrese gelen e-posta kutuya düşmez.`,
      };
    }
    const routing = await cfGet(env, `/zones/${zid}/email/routing`);
    if (!routing?.enabled) {
      return {
        ok: false,
        code: "routing_off",
        note: `${zoneName} için e-posta alma (Email Routing) kapalı; gelen e-posta kutuya düşmez. Yönetici açmalı.`,
      };
    }
    const catchAll = await cfGet(env, `/zones/${zid}/email/routing/rules/catch_all`, 300_000);
    const catchWorker = catchAll?.enabled && (catchAll.actions || []).some((a) => a.type === "worker" && (a.value || []).includes(INBOUND_WORKER));
    if (catchWorker) return { ok: true, code: "catch_all", note: "" };
    const rules = await cfGet(env, `/zones/${zid}/email/routing/rules?per_page=100`, 120_000);
    const has = (rules || []).some(
      (r) =>
        r.enabled !== false &&
        (r.matchers || []).some((m) => m.type === "literal" && String(m.value || "").toLowerCase() === address) &&
        (r.actions || []).some((a) => a.type === "worker" && (a.value || []).includes(INBOUND_WORKER)),
    );
    if (has) return { ok: true, code: "rule", note: "" };
    return { ok: false, code: "no_rule", note: "Bu adres için yönlendirme kuralı yok; gelen e-posta kutuya düşmez.", zoneId: zid };
  } catch (err) {
    return { ok: null, code: "unknown", note: String(err?.message || err).slice(0, 120) };
  }
}

/** Adds a literal routing rule address -> yekpare-mailbox-email when the zone has routing on. */
async function ensureRoutingRule(env, address) {
  const st = await receiveStatus(env, address);
  if (st.ok || st.code !== "no_rule" || !st.zoneId) return st;
  const token = String(env?.HM_MAIL_ROUTING_TOKEN || "").trim();
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${st.zoneId}/email/routing/rules`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `hm-site-mail ${address}`.slice(0, 120),
      enabled: true,
      matchers: [{ type: "literal", field: "to", value: address }],
      actions: [{ type: "worker", value: [INBOUND_WORKER] }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  for (const k of [...cfCache.keys()]) if (k.startsWith(`/zones/${st.zoneId}/email/routing/rules`)) cfCache.delete(k);
  if (res.ok && data.success !== false) return { ok: true, code: "rule", note: "", created: true };
  return { ok: false, code: "rule_failed", note: `Yönlendirme kuralı eklenemedi: ${String(data?.errors?.[0]?.message || res.status).slice(0, 120)}` };
}

/* ---------- mail DB ---------- */

async function ensureMailDomain(msql, domain, displayName) {
  const rows = await msql`
    INSERT INTO mail_domains (domain, display_name, kind, enabled)
    VALUES (${domain}, ${displayName || domain}, 'owned', true)
    ON CONFLICT (domain) DO UPDATE SET enabled = true
    RETURNING id
  `;
  return rows?.[0]?.id ?? null;
}

async function createMailAccount(msql, { address, displayName, siteId, by }) {
  const [local, domain] = address.split("@");
  const existing = await msql`SELECT * FROM mail_accounts WHERE address = ${address} LIMIT 1`;
  if (existing?.[0]) return { account: existing[0], created: false };
  const domainId = await ensureMailDomain(msql, domain, domain);
  if (!domainId) throw new Error("Alan adı kaydı açılamadı");
  // Random password: the box is opened from the panel without credentials; an admin can set one for yekpare.net/posta.
  const rnd = crypto.getRandomValues(new Uint8Array(24));
  const hash = await bcrypt.hash(btoa(String.fromCharCode(...rnd)), 8);
  const rows = await msql`
    INSERT INTO mail_accounts (domain_id, address, local_part, display_name, password_hash, kind, hm_site_id, is_admin, active,
                               approved, approved_at, requested_by)
    VALUES (${domainId}, ${address}, ${local}, ${displayName || local}, ${hash}, 'hm', ${siteId || null}, false, true,
            true, NOW(), ${`hm-site:${siteId}${by ? ` ${by}` : ""}`.slice(0, 200)})
    ON CONFLICT (address) DO NOTHING
    RETURNING *
  `;
  if (rows?.[0]) return { account: rows[0], created: true };
  const again = await msql`SELECT * FROM mail_accounts WHERE address = ${address} LIMIT 1`;
  return { account: again?.[0] || null, created: false };
}

function siteMailScope(site) {
  return {
    defaults: conventionalAddressesForSite(site),
    domains: ownedMailDomainsForSite(site),
    marker: `hm-site:${site.id}`,
  };
}

async function listSiteAccounts(msql, site) {
  const sc = siteMailScope(site);
  const rows = await msql`
    SELECT id, address, display_name, active, requested_by, created_at
    FROM mail_accounts
    WHERE active = true
      AND (
        address = ANY(${sc.defaults})
        OR requested_by = ${sc.marker}
        OR requested_by LIKE ${`${likeEscape(sc.marker)} %`}
      )
    ORDER BY (address = ANY(${sc.defaults})) DESC, address
  `;
  return rows || [];
}

function canSiteUseAddress(site, address) {
  const sc = siteMailScope(site);
  return sc.defaults.includes(address) || sc.domains.includes(address.split("@")[1] || "");
}

async function boxesForSite(env, msql, site, { autoCreate = true } = {}) {
  let accounts = await listSiteAccounts(msql, site);
  const sc = siteMailScope(site);
  const primary = sc.defaults[0] || "";
  if (autoCreate && primary && !accounts.some((a) => a.address === primary)) {
    const st = await receiveStatus(env, primary);
    if (st.ok !== false || st.code === "no_rule") {
      await createMailAccount(msql, { address: primary, displayName: site.display_name || primary, siteId: site.id, by: "auto" });
      if (st.code === "no_rule") await ensureRoutingRule(env, primary);
      accounts = await listSiteAccounts(msql, site);
    }
  }
  const out = [];
  for (const a of accounts) {
    let st = await receiveStatus(env, a.address);
    if (st.code === "no_rule") st = await ensureRoutingRule(env, a.address);
    out.push({
      address: a.address,
      displayName: a.display_name || a.address,
      isDefault: sc.defaults.includes(a.address),
      canReceive: st.ok,
      note: st.note || "",
    });
  }
  if (primary && !out.some((b) => b.address === primary)) {
    const st = await receiveStatus(env, primary);
    out.unshift({ address: primary, displayName: site.display_name || primary, isDefault: true, canReceive: false, missing: true, note: st.note || "Posta kutusu henüz açılmadı." });
  }
  return out;
}

const MSG_COLS = "id, direction, from_addr, to_addr, subject, is_read, is_starred, is_trashed, created_at, mailbox_address";

function boxMatchSql(paramIndex) {
  // Incoming: addressed to the box; outgoing: sent from the box (another site's sent copy never leaks in).
  return `(lower(mailbox_address) = $${paramIndex} OR (direction = 'in' AND to_addr ~* $${paramIndex + 1}) OR (direction = 'out' AND from_addr ~* $${paramIndex + 1}))`;
}

async function listMessages(msql, box, folder, q, limit, offset) {
  const like = addrRegex(box);
  const params = [box, like];
  let where = boxMatchSql(1);
  if (folder === "sent") where += " AND direction = 'out' AND NOT is_trashed";
  else if (folder === "starred") where += " AND is_starred AND NOT is_trashed";
  else if (folder === "trash") where += " AND is_trashed";
  else where += " AND direction = 'in' AND NOT is_trashed";
  if (q) {
    params.push(`%${likeEscape(q)}%`);
    const i = params.length;
    where += ` AND (subject ILIKE $${i} OR from_addr ILIKE $${i} OR to_addr ILIKE $${i} OR body_text ILIKE $${i})`;
  }
  params.push(limit, offset);
  const rows = await msql.query(
    `SELECT ${MSG_COLS}, left(coalesce(body_text, regexp_replace(coalesce(body_html, ''), '<[^>]+>', ' ', 'g')), 180) AS snippet
     FROM mailbox_messages WHERE ${where}
     ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const unread = await msql.query(
    `SELECT count(*)::int AS n FROM mailbox_messages WHERE ${boxMatchSql(1)} AND direction = 'in' AND NOT is_read AND NOT is_trashed`,
    [box, like],
  );
  const messages = (rows || []).map((r) => ({ ...r, snippet: decodeQpIfEncoded(r.snippet) }));
  return { messages, unread: unread?.[0]?.n ?? 0 };
}

async function messageForBoxes(msql, id, boxes) {
  const rows = await msql`SELECT * FROM mailbox_messages WHERE id = ${id} LIMIT 1`;
  const m = rows?.[0];
  if (!m) return null;
  const hdr = String((m.direction === "out" ? m.from_addr : m.to_addr) || "");
  const box = boxes.find(
    (b) => String(m.mailbox_address || "").toLowerCase() === b || new RegExp(addrRegex(b), "i").test(hdr),
  );
  return box ? { message: m, box } : null;
}

async function sendMail(env, msql, site, account, body) {
  const token = String(env?.HM_MAIL_SEND_TOKEN || "").trim();
  if (!token) return json(503, { error: "Gönderim yapılandırılmamış (HM_MAIL_SEND_TOKEN)." });
  const to = splitAddresses(body.to);
  const cc = splitAddresses(body.cc);
  const bcc = splitAddresses(body.bcc);
  const subject = String(body.subject ?? "").trim().slice(0, 500);
  const text = String(body.text ?? body.bodyText ?? "").slice(0, 200_000);
  const html = String(body.html ?? body.bodyHtml ?? "").slice(0, 400_000);
  if (!to.length && !cc.length && !bcc.length) return json(400, { error: "Alıcı adresi geçersiz." });
  if (to.length + cc.length + bcc.length > 50) return json(400, { error: "En fazla 50 alıcı." });
  if (!subject) return json(400, { error: "Konu gerekli." });
  if (!text.trim() && !html.trim()) return json(400, { error: "Mesaj boş." });
  const fromName = String(account.display_name || site.display_name || "").trim().slice(0, 120);
  const payload = {
    from: fromName ? { address: account.address, name: fromName } : account.address,
    subject,
    text: text || html.replace(/<[^>]+>/g, " "),
  };
  if (html.trim()) payload.html = html;
  if (to.length) payload.to = to;
  if (cc.length) payload.cc = cc;
  if (bcc.length) payload.bcc = bcc;
  const inReplyTo = String(body.inReplyTo ?? "").trim();
  if (/^<[^<>\s]{3,300}>$/.test(inReplyTo)) payload.headers = { "In-Reply-To": inReplyTo, References: inReplyTo };
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/email/sending/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = String(data?.errors?.[0]?.message || `HTTP ${res.status}`).slice(0, 200);
    return json(502, { error: `Gönderilemedi: ${msg}` });
  }
  const messageId = String(data?.result?.message_id || "").slice(0, 300);
  const fromDisp = fromName ? `${fromName} <${account.address}>` : account.address;
  // imap_uid "out:<Message-ID>": a self-send's incoming copy carries the bare Message-ID, so the two rows
  // never hit the (mailbox_address, imap_uid) unique index.
  try {
    await msql`
      INSERT INTO mailbox_messages (scope, hm_site_id, direction, from_addr, to_addr, subject, body_text, body_html,
                                    is_read, imap_uid, mailbox_address, mail_account_id)
      VALUES ('hm', ${account.hm_site_id ?? null}, 'out', ${fromDisp}, ${[...to, ...cc].join(", ") || bcc.join(", ")},
              ${subject}, ${text || null}, ${html || null}, true, ${messageId ? `out:${messageId}` : `out-${account.id}-${Date.now()}`},
              ${account.address}, ${account.id})
    `;
  } catch (err) {
    if (!/unique|duplicate/i.test(String(err?.message || err))) console.error("[site-mail] sent copy", String(err?.message || err).slice(0, 160));
  }
  return json(200, { ok: true, messageId, queued: data?.result?.queued || [], delivered: data?.result?.delivered || [] });
}

function validateNewAddress(localRaw, domainRaw) {
  const local = String(localRaw ?? "").trim().toLowerCase();
  const domain = normalizeMailHost(domainRaw);
  if (!LOCAL_RE.test(local) || local.includes("..")) return { error: "Adres adı yalnızca harf, rakam, nokta, tire ve alt çizgi içerebilir." };
  if (RESERVED_LOCAL.has(local)) return { error: "Bu adres ayrılmış, başka bir ad seçin." };
  if (!domain) return { error: "Alan adı geçersiz." };
  return { address: `${local}@${domain}`, local, domain };
}

/* ---------- auth ---------- */

async function editorContext(request, env) {
  const auth = await parseEditorJwt(request, env);
  if (!auth) return { error: json(401, { error: "Oturum gerekli" }) };
  const sql = neonSqlClient(env);
  if (!sql) return { error: json(503, { error: "Veritabanı yok" }) };
  const editor = await loadActiveEditor(sql, auth.editorId, auth.siteId);
  if (!editor) return { error: json(401, { error: "Geçersiz oturum" }) };
  const rows = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, layout_json, active
    FROM hm_news_sites WHERE id = ${auth.siteId} LIMIT 1
  `;
  const site = rows?.[0];
  if (!site) return { error: json(404, { error: "Site bulunamadı" }) };
  if (!isHmNewsSite(site)) return { error: json(403, { error: "Posta kutusu yalnızca haber sitelerinde açılır." }) };
  const msql = mailSql(env);
  if (!msql) return { error: json(503, { error: "Posta sistemi yapılandırılmamış." }) };
  return { sql, msql, site, editor };
}

async function adminContext(request, env) {
  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) return { error: json(503, { error: "Oturum yapılandırılmamış" }) };
  const sid = await unsignConnectSid(readCookie(request.headers.get("cookie"), "connect.sid"), secret);
  if (!sid) return { error: json(401, { error: "Yönetici girişi gerekli" }) };
  const { sql, sess } = await loadPanelSession(env, sid);
  if (!sql || !sess || sess.panelBootstrap !== true) return { error: json(401, { error: "Yönetici girişi gerekli" }) };
  if (!sessionGrantsHmSites(sess)) return { error: json(403, { error: "Bu işlem için yetkiniz yok." }) };
  const msql = mailSql(env);
  if (!msql) return { error: json(503, { error: "Posta sistemi yapılandırılmamış." }) };
  return { sql, msql };
}

/* ---------- handler ---------- */

export async function handleHmSiteMailEdge(request, env, incoming) {
  const path = String(incoming?.pathname || new URL(request.url).pathname).replace(/\/+$/, "");
  const method = String(request.method || "GET").toUpperCase();
  const url = incoming instanceof URL ? incoming : new URL(request.url);

  if (path.startsWith(ADMIN_PREFIX)) {
    const ctx = await adminContext(request, env);
    if (ctx.error) return ctx.error;
    if (path === `${ADMIN_PREFIX}/boxes` && method === "GET") {
      const sites = await ctx.sql`
        SELECT id, slug, domain, domain2, domain3, display_name, layout_json, active
        FROM hm_news_sites WHERE active = true ORDER BY id
      `;
      const out = [];
      for (const s of sites || []) {
        if (!isHmNewsSite(s)) continue;
        const accounts = await listSiteAccounts(ctx.msql, s);
        out.push({
          siteId: s.id,
          slug: s.slug,
          displayName: s.display_name,
          hosts: siteHosts(s),
          defaults: conventionalAddressesForSite(s),
          editorLogin: conventionalAddressesForSite(s)[0] || null,
          createDomains: ownedMailDomainsForSite(s),
          boxes: accounts.map((a) => ({ address: a.address, displayName: a.display_name, createdAt: a.created_at })),
        });
      }
      return json(200, { sites: out });
    }
    if (path === `${ADMIN_PREFIX}/boxes` && method === "POST") {
      const b = await readJson(request);
      const siteId = Number(b.siteId);
      const rows = await ctx.sql`
        SELECT id, slug, domain, domain2, domain3, display_name, layout_json, active
        FROM hm_news_sites WHERE id = ${siteId} LIMIT 1
      `;
      const site = rows?.[0];
      if (!site || !isHmNewsSite(site)) return json(404, { error: "Haber sitesi bulunamadı" });
      const v = validateNewAddress(b.localPart, b.domain);
      if (v.error) return json(400, { error: v.error });
      // Admin may also open <x>@gundemi.org style boxes for a platform-zone site; it is assigned to that site.
      const allowed =
        canSiteUseAddress(site, v.address) ||
        siteHosts(site).some((h) => registrableDomain(h) === v.domain);
      if (!allowed) return json(400, { error: "Bu alan adı bu siteye ait değil." });
      const r = await createMailAccount(ctx.msql, { address: v.address, displayName: String(b.displayName || "").trim() || v.local, siteId: site.id, by: "admin" });
      if (!r.account) return json(500, { error: "Posta kutusu açılamadı" });
      if (!r.created) return json(409, { error: "Bu adres zaten var." });
      const routing = await ensureRoutingRule(env, v.address);
      return json(200, { ok: true, address: v.address, canReceive: routing.ok, note: routing.note || "" });
    }
    return json(404, { error: "Bulunamadı" });
  }

  const ctx = await editorContext(request, env);
  if (ctx.error) return ctx.error;
  const { msql, site, editor } = ctx;

  if (path === EDITOR_PREFIX && method === "GET") {
    const boxes = await boxesForSite(env, msql, site);
    return json(200, {
      site: { id: site.id, displayName: site.display_name, hosts: siteHosts(site) },
      boxes,
      createDomains: ownedMailDomainsForSite(site),
      canSend: Boolean(String(env?.HM_MAIL_SEND_TOKEN || "").trim()),
    });
  }

  const allowedBoxes = (await listSiteAccounts(msql, site)).map((a) => a.address);

  if (path === `${EDITOR_PREFIX}/messages` && method === "GET") {
    const box = normalizeAddress(url.searchParams.get("box")) || allowedBoxes[0] || "";
    if (!box || !allowedBoxes.includes(box)) return json(403, { error: "Bu posta kutusuna erişiminiz yok." });
    const folder = String(url.searchParams.get("folder") || "inbox");
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 120);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const r = await listMessages(msql, box, folder, q, limit, offset);
    const conv = await conversionsFor(msql, site.id, r.messages.map((m) => m.id));
    r.messages = r.messages.map((m) => ({ ...m, converted_news_id: conv.get(Number(m.id))?.newsId ?? null }));
    return json(200, { box, folder, ...r });
  }

  // "Habere dönüştür": incoming mail -> draft news of this site (never published automatically).
  const toNewsMatch = path.match(/^\/api\/hm\/editor\/site-mail\/messages\/(\d+)\/to-news$/);
  if (toNewsMatch && method === "POST") {
    const found = await messageForBoxes(msql, Number(toNewsMatch[1]), allowedBoxes);
    if (!found) return json(404, { error: "Mesaj bulunamadı" });
    const b = await readJson(request);
    const r = await convertMailToNews(request, env, { msql, site, editor, message: found.message, ai: b?.ai === true });
    return json(r.status, r.body);
  }

  const idMatch = path.match(/^\/api\/hm\/editor\/site-mail\/messages\/(\d+)$/);
  if (idMatch) {
    const found = await messageForBoxes(msql, Number(idMatch[1]), allowedBoxes);
    if (!found) return json(404, { error: "Mesaj bulunamadı" });
    if (method === "GET") {
      const m = found.message;
      if (!m.is_read && m.direction === "in") await msql`UPDATE mailbox_messages SET is_read = true WHERE id = ${m.id}`;
      const conv = (await conversionsFor(msql, site.id, [m.id])).get(Number(m.id)) || null;
      return json(200, {
        message: {
          id: m.id,
          direction: m.direction,
          from: m.from_addr,
          to: m.to_addr,
          subject: m.subject,
          text: decodeQpIfEncoded(m.body_text),
          html: decodeQpIfEncoded(m.body_html),
          isStarred: !!m.is_starred,
          isTrashed: !!m.is_trashed,
          createdAt: m.created_at,
          messageId: (() => {
            const id = String(m.imap_uid || "").replace(/^out:/, "");
            return id.startsWith("<") ? id : null;
          })(),
          box: found.box,
          convertedNewsId: conv?.newsId ?? null,
        },
      });
    }
    if (method === "PATCH") {
      const b = await readJson(request);
      const isRead = typeof b.isRead === "boolean" ? b.isRead : null;
      const isStarred = typeof b.isStarred === "boolean" ? b.isStarred : null;
      const isTrashed = typeof b.isTrashed === "boolean" ? b.isTrashed : null;
      await msql`
        UPDATE mailbox_messages SET
          is_read = COALESCE(${isRead}, is_read),
          is_starred = COALESCE(${isStarred}, is_starred),
          is_trashed = COALESCE(${isTrashed}, is_trashed)
        WHERE id = ${found.message.id}
      `;
      return json(200, { ok: true });
    }
  }

  if (path === `${EDITOR_PREFIX}/send` && method === "POST") {
    const b = await readJson(request);
    const from = normalizeAddress(b.from) || allowedBoxes[0] || "";
    if (!from || !allowedBoxes.includes(from)) return json(403, { error: "Bu adresten gönderemezsiniz." });
    const rows = await msql`SELECT * FROM mail_accounts WHERE address = ${from} AND active = true LIMIT 1`;
    if (!rows?.[0]) return json(404, { error: "Gönderen kutu yok" });
    return sendMail(env, msql, site, rows[0], b);
  }

  if (path === `${EDITOR_PREFIX}/boxes` && method === "POST") {
    const b = await readJson(request);
    const v = validateNewAddress(b.localPart, b.domain);
    if (v.error) return json(400, { error: v.error });
    if (!ownedMailDomainsForSite(site).includes(v.domain)) {
      return json(403, { error: "Yeni adres yalnızca sitenin kendi alan adında açılabilir. Ortak alan adları (gundemi.org, fix.tc) için yöneticiye başvurun." });
    }
    const r = await createMailAccount(msql, {
      address: v.address,
      displayName: String(b.displayName || "").trim().slice(0, 120) || v.local,
      siteId: site.id,
      by: `editor:${editor.id}`,
    });
    if (!r.account) return json(500, { error: "Posta kutusu açılamadı" });
    if (!r.created) return json(409, { error: "Bu adres zaten var." });
    const routing = await ensureRoutingRule(env, v.address);
    return json(200, { ok: true, address: v.address, canReceive: routing.ok, note: routing.note || "" });
  }

  return json(404, { error: "Bulunamadı" });
}
