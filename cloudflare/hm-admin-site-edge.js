/**
 * Yönetici paneli «Askıya al» ve «Aktif» anahtarları.
 * Gövde yalnızca { active } veya { layoutJson: { hmPublicSuspended } } ise
 * Container beklenmez; oturum çerezi doğrulanır ve Neon güncellenir.
 * Başka bir kayıt gövdesi null döner — tam site formu Container'da kalır.
 */
import { clearKhSuspendedFlagCache } from "./hm-public-suspended.js";

const COOKIE_NAME = "connect.sid";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-yekpare-frontend": "hm-admin-site-edge",
    },
  });
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "");
}

function timingSafeEqual(a, b) {
  const left = String(a);
  const right = String(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Base64(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(mac));
}

export function readCookie(header, name) {
  const parts = String(header || "").split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() !== name) continue;
    let value = part.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return "";
}

/** express-session çerezi: s:<sid>.<hmac>. cookie-signature ile aynı (base64, dolgusuz). */
export async function unsignConnectSid(cookieValue, secret) {
  const raw = String(cookieValue || "");
  const key = String(secret || "");
  if (!raw.startsWith("s:") || !key) return null;
  const signed = raw.slice(2);
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const sid = signed.slice(0, dot);
  const mac = signed.slice(dot + 1);
  if (!sid || sid.length > 512 || !mac) return null;
  const expected = await hmacSha256Base64(key, sid);
  if (!timingSafeEqual(expected, mac)) return null;
  return sid;
}

export function siteIdFromPath(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  const match = /^\/api\/hm\/sites\/(\d+)$/.exec(path);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

/**
 * Yalnızca askı ve aktif anahtarı. Tam form (slug, editör, layout'un geri kalanı) null.
 * @returns {{ kind: "active", active: boolean } | { kind: "suspend", suspended: boolean } | null}
 */
export function narrowAdminSitePatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1) return null;
  if (keys[0] === "active" && typeof body.active === "boolean") {
    return { kind: "active", active: body.active };
  }
  if (keys[0] !== "layoutJson") return null;
  const layout = body.layoutJson;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return null;
  const layoutKeys = Object.keys(layout);
  if (layoutKeys.length !== 1 || layoutKeys[0] !== "hmPublicSuspended") return null;
  if (typeof layout.hmPublicSuspended !== "boolean") return null;
  return { kind: "suspend", suspended: layout.hmPublicSuspended };
}

export function parseSessionRecord(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    /* bozuk oturum */
  }
  return null;
}

/** panelBootstrap ve hm_sites. İzin listesi yoksa tam yönetici. */
export function sessionGrantsHmSites(sess) {
  if (!sess || sess.panelBootstrap !== true) return false;
  const permissions = sess.panelPermissions;
  if (permissions == null) return true;
  return Array.isArray(permissions) && permissions.includes("hm_sites");
}

async function writeActive(sql, siteId, active) {
  const rows = await sql`
    UPDATE hm_news_sites
    SET active = ${active}, updated_at = now()
    WHERE id = ${siteId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function writeSuspended(sql, siteId, suspended) {
  const flag = suspended ? "true" : "false";
  try {
    const rows = await sql`
      UPDATE hm_news_sites
      SET layout_json = (
        jsonb_set(
          CASE
            WHEN layout_json IS NULL OR btrim(layout_json::text) = '' THEN '{}'::jsonb
            WHEN left(btrim(layout_json::text), 1) = '{' THEN btrim(layout_json::text)::jsonb
            ELSE '{}'::jsonb
          END,
          '{hmPublicSuspended}',
          ${flag}::jsonb,
          true
        )
      )::text,
      updated_at = now()
      WHERE id = ${siteId}
      RETURNING id
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    const rows = await sql`
      UPDATE hm_news_sites
      SET layout_json = jsonb_set(
        COALESCE(layout_json, '{}'::jsonb),
        '{hmPublicSuspended}',
        ${flag}::jsonb,
        true
      ),
      updated_at = now()
      WHERE id = ${siteId}
      RETURNING id
    `;
    return Array.isArray(rows) && rows.length > 0;
  }
}

/** @param {(strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>} sql */
export async function applyAdminSitePatch(sql, siteId, patch) {
  if (patch.kind === "active") {
    const wrote = await writeActive(sql, siteId, patch.active);
    if (!wrote) return { status: 404, body: { ok: false, error: "Bulunamadı" } };
    return { status: 200, body: { ok: true, active: patch.active } };
  }
  const wrote = await writeSuspended(sql, siteId, patch.suspended);
  if (!wrote) return { status: 404, body: { ok: false, error: "Bulunamadı" } };
  clearKhSuspendedFlagCache();
  return { status: 200, body: { ok: true, hmPublicSuspended: patch.suspended } };
}

export async function loadPanelSession(env, sid) {
  const { neonSqlClient } = await import("./neon-edge-db.js");
  const sql = neonSqlClient(env);
  if (!sql) return { sql: null, sess: null };
  const rows = await sql`
    SELECT sess
    FROM express_sessions
    WHERE sid = ${sid} AND expire > now()
    LIMIT 1
  `;
  const sess = parseSessionRecord(rows?.[0]?.sess);
  return { sql, sess };
}

export async function handleHmAdminSiteEdge(request, env, incoming) {
  if (String(request?.method || "").toUpperCase() !== "PATCH") return null;
  const pathname = incoming?.pathname || new URL(request.url).pathname;
  const siteId = siteIdFromPath(pathname);
  if (!siteId) return null;

  let body;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  const patch = narrowAdminSitePatch(body);
  if (!patch) return null;

  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) return null;
  const sid = await unsignConnectSid(readCookie(request.headers.get("cookie"), COOKIE_NAME), secret);
  if (!sid) return null;

  let sql;
  let sess;
  try {
    const loaded = await loadPanelSession(env, sid);
    sql = loaded.sql;
    sess = loaded.sess;
  } catch {
    return null;
  }
  if (!sql) return null;
  if (!sess) return null;
  if (sess.panelBootstrap !== true) {
    return jsonResponse(401, { ok: false, error: "Bu işlem için yönetici paneline giriş yapmalısınız." });
  }
  if (!sessionGrantsHmSites(sess)) {
    return jsonResponse(403, { ok: false, error: "Bu işlem için yetkiniz yok." });
  }

  try {
    const result = await applyAdminSitePatch(sql, siteId, patch);
    return jsonResponse(result.status, result.body);
  } catch {
    return jsonResponse(503, { ok: false, error: "Durum kaydı yazılamadı" });
  }
}
