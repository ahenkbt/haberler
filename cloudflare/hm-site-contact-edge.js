/**
 * HM news sites: /iletisim contact form -> editor panel "İletişim" inbox (user request 2026-10-08 23:35).
 *
 * Public (same-origin form on every PHP news site; /api/* is a Worker route on those zones):
 *   POST /api/hm/public/contact   multipart: topic, name, email, phone?, title?, message, kvkk=1, files* (≤5, ≤10 MB total),
 *                                 website (honeypot, must be empty), ts (form render time, ms)
 * Editor (Authorization: Bearer <editor JWT>; only the editor's own site, like the site-mail ownership rule):
 *   GET   /api/hm/editor/site-contact?topic=&status=unread|read|all|trash&q=&limit=&offset=
 *   GET   /api/hm/editor/site-contact/:id                 (marks read)
 *   PATCH /api/hm/editor/site-contact/:id                 {isRead?, isTrashed?}   (hide, never delete)
 *   GET   /api/hm/editor/site-contact/:id/files/:fileId   attachment bytes (auth required; nosniff + sandbox)
 *   POST  /api/hm/editor/site-contact/:id/to-news         {ai?}  -> DRAFT news (hm-site-mail-to-news.js)
 *
 * Storage (mail DB = HM_MAIL_DATABASE_URL): hm_site_contact (+ hm_site_contact_files, bytea; never public).
 * Each message is also dropped into the site's own mailbox (mailbox_messages, imap_uid "contact:<id>") so it shows in
 * the embedded posta under "İletişimden gelenler" and in the bilgi@ box itself (that is the e-mail notification).
 * Files are type-checked by magic bytes (jpeg/png/gif/webp/pdf/doc/docx); the client's MIME type is ignored.
 */
import { neon } from "@neondatabase/serverless";
import { neonSqlClient, isNeonServerlessUrl, preferNeonDirectWriteUrl } from "./neon-edge-db.js";
import { parseEditorJwt, loadActiveEditor } from "./hm-editor-profile-edge.js";
import { conventionalAddressesForSite, isHmNewsSite, siteHosts } from "./hm-site-mail-convention.js";
import { convertMailToNews, conversionsFor, escapeHtml, textToParagraphHtml } from "./hm-site-mail-to-news.js";

export const PUBLIC_CONTACT_PATH = "/api/hm/public/contact";
const EDITOR_PREFIX = "/api/hm/editor/site-contact";
export const CONTACT_TOPICS = { haber: "Haber", duyuru: "Duyuru", talep: "Talep", sikayet: "Şikayet", kariyer: "Kariyer" };
const CORPORATE_IDS = new Set([7, 11, 61]);
const MAX_FILES = 5;
const MAX_TOTAL = 10 * 1024 * 1024;
const RATE = { perIp10m: 3, perIpDay: 10, perSiteHour: 60 };

export function isHmSiteContactPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "");
  return p === PUBLIC_CONTACT_PATH || p === EDITOR_PREFIX || p.startsWith(`${EDITOR_PREFIX}/`);
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-site-contact",
      ...extra,
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

function parseLayout(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const j = JSON.parse(String(raw || ""));
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function hostOf(raw) {
  return String(raw || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/:].*$/, "").replace(/^www\./, "").replace(/\.$/, "");
}

/* ---------- pure helpers (unit-tested) ---------- */

/** Magic-byte sniffing; returns {mime, ext, kind} or null. `name` only decides doc vs docx naming. */
export function sniffFile(bytes, name = "") {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const at = (i, arr) => arr.every((v, k) => b[i + k] === v);
  if (b.length < 8) return null;
  if (at(0, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png", kind: "image" };
  if (at(0, [0x47, 0x49, 0x46, 0x38])) return { mime: "image/gif", ext: "gif", kind: "image" };
  if (b.length >= 12 && at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return { mime: "image/webp", ext: "webp", kind: "image" };
  if (at(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf", kind: "pdf" };
  if (at(0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && /\.doc$/i.test(name)) {
    return { mime: "application/msword", ext: "doc", kind: "doc" };
  }
  if (at(0, [0x50, 0x4b, 0x03, 0x04]) && /\.docx$/i.test(name)) {
    // A .docx is a zip with word/document.xml; plain zips / xlsx / apk are refused.
    const probe = new TextDecoder("latin1").decode(b.subarray(0, Math.min(b.length, 2_000_000)));
    if (probe.includes("word/") && probe.includes("[Content_Types].xml")) {
      return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx", kind: "doc" };
    }
  }
  return null;
}

export function safeFileName(raw, ext) {
  const base = String(String(raw || "dosya").split(/[\\/]/).pop() || "")
    .replace(/\.[A-Za-z0-9]{1,5}$/, "")
    .replace(/^\.+/, "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${base || "dosya"}.${ext}`;
}

/** Field validation of a submission; returns {error} or {value}. */
export function validateContact(f, nowMs = Date.now()) {
  const s = (k, max) => String(f?.[k] ?? "").replace(/\u0000/g, "").trim().slice(0, max);
  const topic = s("topic", 20).toLowerCase();
  const name = s("name", 121).replace(/\s+/g, " ");
  const email = s("email", 161).toLowerCase();
  const phone = s("phone", 41);
  const title = s("title", 201).replace(/\s+/g, " ");
  const message = String(f?.message ?? "").replace(/\u0000/g, "").replace(/\r/g, "").trim();
  if (!CONTACT_TOPICS[topic]) return { error: "Lütfen bir konu seçin." };
  if (name.length < 2 || name.length > 120) return { error: "Ad soyad 2-120 karakter olmalıdır." };
  if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(email) || email.length > 160) return { error: "Geçerli bir e-posta adresi yazın." };
  if (phone && !/^[0-9+()\s.-]{7,40}$/.test(phone)) return { error: "Telefon numarası geçersiz." };
  if (title.length > 200) return { error: "Başlık en fazla 200 karakter olabilir." };
  if (message.length < 10) return { error: "Mesajınız en az 10 karakter olmalıdır." };
  if (message.length > 8000) return { error: "Mesajınız en fazla 8000 karakter olabilir." };
  if (String(f?.kvkk ?? "") !== "1" && String(f?.kvkk ?? "") !== "on") return { error: "KVKK onay kutusunu işaretleyin." };
  const ts = Number(f?.ts);
  if (Number.isFinite(ts) && ts > 0) {
    if (nowMs - ts < 3000) return { error: "Form çok hızlı gönderildi, lütfen birkaç saniye sonra tekrar deneyin.", bot: true };
  }
  return { value: { topic, name, email, phone, title, message } };
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(String(b64 || ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function kb(n) {
  return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Mailbox copy (posta "İletişimden gelenler" + bilgi@ box). Attachment bytes stay in the contact tables. */
export function contactMailBodies(c, files, siteName) {
  const topic = CONTACT_TOPICS[c.topic] || c.topic;
  const rows = [
    ["Konu", topic],
    ["Ad soyad", c.name],
    ["E-posta", c.email],
    c.phone ? ["Telefon", c.phone] : null,
    c.title ? ["Başlık", c.title] : null,
  ].filter(Boolean);
  const fileLine = files.length ? files.map((x) => `${x.name} (${kb(x.size)})`).join(", ") : "";
  const text = [
    c.message,
    "",
    "—",
    `${siteName || "Site"} iletişim formundan gönderildi.`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    fileLine ? `Ekler: ${fileLine} (Editör paneli › İletişim)` : "",
  ]
    .filter((x) => x !== null)
    .join("\n")
    .trim();
  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#14213d">${textToParagraphHtml(c.message)}
<hr style="border:0;border-top:1px solid #e5e7eb;margin:18px 0">
<p style="margin:0 0 8px;color:#64748b;font-size:13px">${escapeHtml(siteName || "Site")} iletişim formundan gönderildi.</p>
<table style="border-collapse:collapse;font-size:13px">${rows.map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#64748b">${escapeHtml(k)}</td><td style="padding:3px 0"><strong>${escapeHtml(v)}</strong></td></tr>`).join("")}${fileLine ? `<tr><td style="padding:3px 12px 3px 0;color:#64748b">Ekler</td><td style="padding:3px 0">${escapeHtml(fileLine)} — <a href="/editor/iletisim?id=${Number(c.id) || ""}">Editör paneli › İletişim</a></td></tr>` : ""}</table></div>`;
  const head = c.title || c.message.replace(/\s+/g, " ").slice(0, 80);
  return { subject: `[İletişim · ${topic}] ${head}`.slice(0, 300), text, html };
}

/* ---------- site resolution ---------- */

async function siteForHost(sql, host) {
  const h = hostOf(host);
  if (!h) return null;
  const rows = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, layout_json, active
    FROM hm_news_sites
    WHERE active = true AND (
      lower(regexp_replace(coalesce(domain, ''), '^(https?://)?(www\\.)?', '')) = ${h}
      OR lower(regexp_replace(coalesce(domain2, ''), '^(https?://)?(www\\.)?', '')) = ${h}
      OR lower(regexp_replace(coalesce(domain3, ''), '^(https?://)?(www\\.)?', '')) = ${h}
    )
    ORDER BY id ASC LIMIT 1
  `;
  const site = rows?.[0];
  if (!site || CORPORATE_IDS.has(Number(site.id)) || !isHmNewsSite(site)) return null;
  const layout = parseLayout(site.layout_json);
  if (layout.hmPublicSuspended === true) return null;
  return site;
}

/* ---------- public submit ---------- */

async function handlePublicSubmit(request, env, url) {
  const wantsJson = /json/i.test(request.headers.get("accept") || "");
  const done = (status, body) => {
    if (wantsJson) return json(status, body);
    const to = new URL("/iletisim", url.origin);
    to.searchParams.set(body.ok ? "gonderildi" : "hata", "1");
    return new Response(null, { status: 303, headers: { location: `${to.pathname}${to.search}#iletisim-formu`, "cache-control": "no-store" } });
  };
  const origin = request.headers.get("origin");
  if (origin && hostOf(origin) !== hostOf(url.hostname)) return json(403, { error: "Geçersiz kaynak." });
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_TOTAL + 512 * 1024) return done(413, { error: "Dosyaların toplamı 10 MB'ı geçemez." });

  const sql = neonSqlClient(env);
  const msql = mailSql(env);
  if (!sql || !msql) return done(503, { error: "İletişim formu şu anda kullanılamıyor." });
  const site = await siteForHost(sql, url.hostname);
  if (!site) return done(404, { error: "Bu sitede iletişim formu yok." });

  let form;
  try {
    form = await request.formData();
  } catch {
    return done(400, { error: "Form okunamadı." });
  }
  const fields = {};
  for (const k of ["topic", "name", "email", "phone", "title", "message", "kvkk", "ts", "website"]) fields[k] = form.get(k);
  // Honeypot: pretend success, store nothing.
  if (String(fields.website || "").trim()) return done(200, { ok: true, message: "Mesajınız alındı. Teşekkür ederiz." });
  const v = validateContact(fields);
  if (v.error) return done(400, { error: v.error });
  const c = v.value;

  // Files: magic-byte check, ≤5, ≤10 MB total.
  const files = [];
  let total = 0;
  for (const f of form.getAll("files")) {
    if (!f || typeof f === "string" || !f.size) continue;
    if (files.length >= MAX_FILES) return done(400, { error: "En fazla 5 dosya ekleyebilirsiniz." });
    total += f.size;
    if (total > MAX_TOTAL) return done(413, { error: "Dosyaların toplamı 10 MB'ı geçemez." });
    const bytes = new Uint8Array(await f.arrayBuffer());
    const t = sniffFile(bytes, f.name);
    if (!t) return done(415, { error: `"${String(f.name).slice(0, 60)}" desteklenmeyen dosya türü (JPG, PNG, WEBP, GIF, PDF, DOC, DOCX).` });
    files.push({ name: safeFileName(f.name, t.ext), mime: t.mime, kind: t.kind, size: bytes.length, bytes });
  }

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
  const ipHash = await sha256Hex(`hm-contact|${ip}|${String(env?.SESSION_SECRET || "").slice(0, 24)}`);
  const rl = await msql`
    SELECT
      count(*) FILTER (WHERE ip_hash = ${ipHash} AND created_at > now() - interval '10 minutes')::int AS ip10,
      count(*) FILTER (WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 day')::int AS ipday,
      count(*) FILTER (WHERE site_id = ${site.id} AND created_at > now() - interval '1 hour')::int AS sitehour
    FROM hm_site_contact WHERE created_at > now() - interval '1 day'
  `;
  const r = rl?.[0] || {};
  if (r.ip10 >= RATE.perIp10m || r.ipday >= RATE.perIpDay || r.sitehour >= RATE.perSiteHour) {
    return done(429, { error: "Çok fazla mesaj gönderildi, lütfen daha sonra tekrar deneyin." });
  }

  const box = conventionalAddressesForSite(site)[0] || "";
  const ins = await msql`
    INSERT INTO hm_site_contact (site_id, site_host, topic, name, email, phone, title, message, ip_hash, user_agent, kvkk_at)
    VALUES (${site.id}, ${hostOf(url.hostname)}, ${c.topic}, ${c.name}, ${c.email}, ${c.phone || null}, ${c.title || null}, ${c.message},
            ${ipHash}, ${String(request.headers.get("user-agent") || "").slice(0, 300)}, now())
    RETURNING id
  `;
  const id = Number(ins?.[0]?.id);
  const meta = [];
  try {
    for (const f of files) {
      const fr = await msql`
        INSERT INTO hm_site_contact_files (contact_id, site_id, name, mime, kind, size, data)
        VALUES (${id}, ${site.id}, ${f.name}, ${f.mime}, ${f.kind}, ${f.size}, decode(${bytesToBase64(f.bytes)}, 'base64'))
        RETURNING id
      `;
      meta.push({ id: Number(fr?.[0]?.id), name: f.name, mime: f.mime, kind: f.kind, size: f.size });
    }
  } catch (err) {
    console.error("[site-contact] file", String(err?.message || err).slice(0, 160));
    await msql`UPDATE hm_site_contact SET is_trashed = true, note = 'file_store_failed' WHERE id = ${id}`.catch(() => {});
    return done(500, { error: "Dosyalar kaydedilemedi, lütfen tekrar deneyin." });
  }
  let mailId = null;
  if (box) {
    try {
      const acc = (await msql`SELECT id FROM mail_accounts WHERE address = ${box} AND active = true LIMIT 1`)?.[0];
      const m = contactMailBodies({ ...c, id }, meta, site.display_name);
      const mr = await msql`
        INSERT INTO mailbox_messages (scope, hm_site_id, direction, from_addr, to_addr, subject, body_text, body_html,
                                      is_read, imap_uid, mailbox_address, mail_account_id)
        VALUES ('hm', ${site.id}, 'in', ${`${c.name.replace(/[<>"]/g, "")} <${c.email}>`}, ${box}, ${m.subject}, ${m.text}, ${m.html},
                false, ${`contact:${id}`}, ${box}, ${acc?.id ?? null})
        RETURNING id
      `;
      mailId = Number(mr?.[0]?.id) || null;
    } catch (err) {
      console.error("[site-contact] mailbox copy", String(err?.message || err).slice(0, 160));
    }
  }
  await msql`UPDATE hm_site_contact SET attachments = ${JSON.stringify(meta)}::jsonb, mail_message_id = ${mailId}, mailbox_address = ${box || null} WHERE id = ${id}`;
  return done(200, { ok: true, id, message: "Mesajınız alındı. Teşekkür ederiz, en kısa sürede dönüş yapacağız." });
}

/* ---------- editor ---------- */

async function editorContext(request, env) {
  const auth = await parseEditorJwt(request, env);
  if (!auth) return { error: json(401, { error: "Oturum gerekli" }) };
  const sql = neonSqlClient(env);
  if (!sql) return { error: json(503, { error: "Veritabanı yok" }) };
  const editor = await loadActiveEditor(sql, auth.editorId, auth.siteId);
  if (!editor) return { error: json(401, { error: "Geçersiz oturum" }) };
  const rows = await sql`SELECT id, slug, domain, domain2, domain3, display_name, layout_json, active FROM hm_news_sites WHERE id = ${auth.siteId} LIMIT 1`;
  const site = rows?.[0];
  if (!site) return { error: json(404, { error: "Site bulunamadı" }) };
  const msql = mailSql(env);
  if (!msql) return { error: json(503, { error: "Posta sistemi yapılandırılmamış." }) };
  return { sql, msql, site, editor };
}

const LIST_COLS = "id, topic, name, email, phone, title, left(message, 220) AS snippet, attachments, is_read, is_trashed, mail_message_id, site_host, created_at";

function shapeRow(r, conv) {
  const att = Array.isArray(r.attachments) ? r.attachments : [];
  return {
    id: Number(r.id),
    topic: r.topic,
    topicLabel: CONTACT_TOPICS[r.topic] || r.topic,
    name: r.name,
    email: r.email,
    phone: r.phone || null,
    title: r.title || null,
    snippet: r.snippet ?? undefined,
    message: r.message ?? undefined,
    attachments: att.map((a) => ({ id: Number(a.id), name: a.name, mime: a.mime, kind: a.kind, size: Number(a.size) })),
    isRead: !!r.is_read,
    isTrashed: !!r.is_trashed,
    host: r.site_host || null,
    createdAt: r.created_at,
    mailMessageId: r.mail_message_id ? Number(r.mail_message_id) : null,
    convertedNewsId: conv?.newsId ?? null,
  };
}

async function contactForSite(msql, siteId, id) {
  const rows = await msql`SELECT * FROM hm_site_contact WHERE id = ${id} AND site_id = ${siteId} LIMIT 1`;
  return rows?.[0] || null;
}

/**
 * Message object for convertMailToNews: the visitor's text only (no meta table), title = their title or first line,
 * image attachments inlined as data: URLs (to-news copies them to R2 media: first = cover, rest = gallery).
 */
export async function contactNewsMessage(msql, contact, mailRow) {
  const att = Array.isArray(contact.attachments) ? contact.attachments : [];
  const imgs = [];
  for (const a of att.filter((x) => x.kind === "image").slice(0, 6)) {
    const f = (await msql`SELECT mime, encode(data, 'base64') AS b64 FROM hm_site_contact_files WHERE id = ${a.id} AND contact_id = ${contact.id} LIMIT 1`)?.[0];
    // Postgres encode(...,'base64') wraps every 76 chars; data: URLs must be one line for the R2 copy.
    if (f?.b64) imgs.push(`<img src="data:${f.mime};base64,${String(f.b64).replace(/\s+/g, "")}" alt="">`);
  }
  return {
    id: mailRow.id,
    direction: "in",
    from_addr: mailRow.from_addr || `${contact.name} <${contact.email}>`,
    subject: contact.title || String(contact.message || "").split("\n").map((x) => x.trim()).find(Boolean)?.slice(0, 120) || "İletişim formundan haber",
    body_text: contact.message,
    body_html: `${textToParagraphHtml(contact.message)}\n${imgs.join("\n")}`,
  };
}

/** Posta "Habere dönüştür" on a contact copy: same conversion input as the İletişim inbox. */
export async function contactNewsMessageForMail(msql, mailRow) {
  const m = String(mailRow?.imap_uid || "").match(/^contact:(\d+)$/);
  if (!m) return null;
  const contact = (await msql`SELECT * FROM hm_site_contact WHERE id = ${Number(m[1])} LIMIT 1`)?.[0];
  if (!contact || Number(contact.site_id) !== Number(mailRow.hm_site_id)) return null;
  return contactNewsMessage(msql, contact, mailRow);
}

async function handleEditor(request, env, url, path, method) {
  const ctx = await editorContext(request, env);
  if (ctx.error) return ctx.error;
  const { msql, site, editor } = ctx;
  const siteId = Number(site.id);

  if (path === EDITOR_PREFIX && method === "GET") {
    const topic = String(url.searchParams.get("topic") || "").toLowerCase();
    const status = String(url.searchParams.get("status") || "all").toLowerCase();
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 120);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const params = [siteId];
    let where = "site_id = $1";
    where += status === "trash" ? " AND is_trashed" : " AND NOT is_trashed";
    if (status === "unread") where += " AND NOT is_read";
    else if (status === "read") where += " AND is_read";
    if (CONTACT_TOPICS[topic]) {
      params.push(topic);
      where += ` AND topic = $${params.length}`;
    }
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
      const i = params.length;
      where += ` AND (name ILIKE $${i} OR email ILIKE $${i} OR title ILIKE $${i} OR message ILIKE $${i})`;
    }
    params.push(limit, offset);
    const rows = await msql.query(`SELECT ${LIST_COLS} FROM hm_site_contact WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const counts = await msql`
      SELECT topic, count(*)::int AS n, count(*) FILTER (WHERE NOT is_read)::int AS unread
      FROM hm_site_contact WHERE site_id = ${siteId} AND NOT is_trashed GROUP BY topic
    `;
    const conv = await conversionsFor(msql, siteId, (rows || []).map((x) => x.mail_message_id).filter(Boolean));
    const byTopic = {};
    let unread = 0;
    let all = 0;
    for (const c of counts || []) {
      byTopic[c.topic] = { total: c.n, unread: c.unread };
      unread += c.unread;
      all += c.n;
    }
    return json(200, {
      site: { id: siteId, displayName: site.display_name, hosts: siteHosts(site) },
      topics: Object.entries(CONTACT_TOPICS).map(([key, label]) => ({ key, label, ...(byTopic[key] || { total: 0, unread: 0 }) })),
      total: all,
      unread,
      messages: (rows || []).map((x) => shapeRow(x, conv.get(Number(x.mail_message_id)))),
    });
  }

  const fileMatch = path.match(/^\/api\/hm\/editor\/site-contact\/(\d+)\/files\/(\d+)$/);
  if (fileMatch && method === "GET") {
    const f = (await msql`
      SELECT f.name, f.mime, f.kind, encode(f.data, 'base64') AS b64
      FROM hm_site_contact_files f JOIN hm_site_contact c ON c.id = f.contact_id
      WHERE f.id = ${Number(fileMatch[2])} AND c.id = ${Number(fileMatch[1])} AND c.site_id = ${siteId} AND f.site_id = ${siteId}
      LIMIT 1
    `)?.[0];
    if (!f) return json(404, { error: "Dosya bulunamadı" });
    const disp = f.kind === "image" || f.kind === "pdf" ? "inline" : "attachment";
    return new Response(base64ToBytes(f.b64), {
      status: 200,
      headers: {
        "content-type": f.mime,
        "content-disposition": `${disp}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      },
    });
  }

  const toNews = path.match(/^\/api\/hm\/editor\/site-contact\/(\d+)\/to-news$/);
  if (toNews && method === "POST") {
    const contact = await contactForSite(msql, siteId, Number(toNews[1]));
    if (!contact) return json(404, { error: "Mesaj bulunamadı" });
    if (!contact.mail_message_id) return json(409, { error: "Bu mesajın posta kopyası yok; habere dönüştürülemiyor." });
    const mailRow = (await msql`SELECT * FROM mailbox_messages WHERE id = ${contact.mail_message_id} AND hm_site_id = ${siteId} LIMIT 1`)?.[0];
    if (!mailRow) return json(404, { error: "Mesaj bulunamadı" });
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const message = await contactNewsMessage(msql, contact, mailRow);
    const r = await convertMailToNews(request, env, { msql, site, editor, message, ai: body?.ai === true });
    if (r.status === 200) await msql`UPDATE hm_site_contact SET is_read = true WHERE id = ${contact.id}`;
    return json(r.status, r.body);
  }

  const idMatch = path.match(/^\/api\/hm\/editor\/site-contact\/(\d+)$/);
  if (idMatch) {
    const contact = await contactForSite(msql, siteId, Number(idMatch[1]));
    if (!contact) return json(404, { error: "Mesaj bulunamadı" });
    if (method === "GET") {
      if (!contact.is_read) {
        await msql`UPDATE hm_site_contact SET is_read = true WHERE id = ${contact.id}`;
        if (contact.mail_message_id) await msql`UPDATE mailbox_messages SET is_read = true WHERE id = ${contact.mail_message_id} AND hm_site_id = ${siteId}`;
      }
      const conv = contact.mail_message_id ? (await conversionsFor(msql, siteId, [contact.mail_message_id])).get(Number(contact.mail_message_id)) : null;
      return json(200, { message: shapeRow({ ...contact, is_read: true }, conv) });
    }
    if (method === "PATCH") {
      let b = {};
      try {
        b = await request.json();
      } catch {
        b = {};
      }
      const isRead = typeof b.isRead === "boolean" ? b.isRead : null;
      const isTrashed = typeof b.isTrashed === "boolean" ? b.isTrashed : null;
      await msql`UPDATE hm_site_contact SET is_read = COALESCE(${isRead}, is_read), is_trashed = COALESCE(${isTrashed}, is_trashed) WHERE id = ${contact.id} AND site_id = ${siteId}`;
      if (contact.mail_message_id) {
        await msql`UPDATE mailbox_messages SET is_read = COALESCE(${isRead}, is_read), is_trashed = COALESCE(${isTrashed}, is_trashed) WHERE id = ${contact.mail_message_id} AND hm_site_id = ${siteId}`;
      }
      return json(200, { ok: true });
    }
  }
  return json(404, { error: "Bulunamadı" });
}

export async function handleHmSiteContactEdge(request, env, incoming) {
  const url = incoming instanceof URL ? incoming : new URL(request.url);
  const path = String(url.pathname || "").replace(/\/+$/, "");
  const method = String(request.method || "GET").toUpperCase();
  if (path === PUBLIC_CONTACT_PATH) {
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
    if (method !== "POST") return json(405, { error: "Yalnızca POST" }, { allow: "POST" });
    return handlePublicSubmit(request, env, url);
  }
  if (path === EDITOR_PREFIX || path.startsWith(`${EDITOR_PREFIX}/`)) return handleEditor(request, env, url, path, method);
  return null;
}
