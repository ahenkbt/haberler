/**
 * POST /api/members/admin-panel-session at the Worker edge (2026-10-08).
 * Like the editor edge login: credentials are checked without waiting for the API container, so
 * ahenk.net.tr/admin/giris no longer shows "Sunucuya şu an ulaşılamıyor" / "Sunucu uyanıyor"
 * while the container is cold or rolling after a deploy.
 *
 * Accepts exactly what the container accepts from configured sources:
 *  - Worker secrets ADMIN_PANEL_USERNAMES (comma list) + ADMIN_PANEL_PASSWORD
 *  - panel_admin_users (bcrypt) in YEKTUBE_DATABASE_URL when it is a Neon URL, else DATABASE_URL
 * On success it writes the same express-session row (express_sessions, main DB) and signed connect.sid
 * cookie the container would. Anything else (no match, DB unreachable, missing secrets) returns null so
 * the request falls through to the container unchanged (its messages and legacy behaviour stay intact).
 */
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { neonSqlClient } from "./neon-edge-db.js";
import { isNeonServerlessUrl, preferNeonDirectWriteUrl } from "./neon-edge-url.js";
import { wakeApiContainerBackground } from "./hm-admin-panel-wake.js";
import { fetchApi } from "./api-upstream.js";

/** Wrong credentials (checked definitively at the edge) wait at most this long for the container's own answer. */
export const ADMIN_LOGIN_CONTAINER_WAIT_MS = 12000;

const COOKIE_NAME = "connect.sid";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const ALIASES = { ahenkbt: ["ahenbt"], ahenbt: ["ahenkbt"] };

export function isAdminPanelSessionPath(pathname) {
  return (String(pathname || "").replace(/\/+$/, "").toLowerCase() || "/") === "/api/members/admin-panel-session";
}

export function normalizeLoginPassword(raw) {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n]+$/g, "")
    .trimEnd();
}

export function adminUsernamesMatch(allowed, input) {
  const a = String(allowed ?? "").trim();
  const u = String(input ?? "").trim();
  if (!a || !u) return false;
  if (a.includes("@") || u.includes("@")) return a.toLowerCase() === u.toLowerCase();
  const al = a.toLowerCase();
  const ul = u.toLowerCase();
  return al === ul || Boolean(ALIASES[al]?.includes(ul));
}

function timingSafeEqualStr(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

/** Env secrets only (no hard-coded bootstrap passwords at the edge). */
export function verifyEnvAdminCredentials(env, username, password) {
  const users = String(env?.ADMIN_PANEL_USERNAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pass = String(env?.ADMIN_PANEL_PASSWORD || "").trim();
  if (!users.length || !pass || !password) return false;
  if (!users.some((a) => adminUsernamesMatch(a, username))) return false;
  return timingSafeEqualStr(pass, password);
}

export function permissionsFromJson(raw) {
  if (raw == null || !String(raw).trim()) return { kind: "full" };
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return { kind: "full" };
    const perms = parsed.map((p) => String(p ?? "").trim()).filter(Boolean);
    return { kind: "limited", permissions: perms };
  } catch {
    return { kind: "full" };
  }
}

function panelAdminSql(env) {
  const yek = String(env?.YEKTUBE_DATABASE_URL || "").trim();
  if (yek) {
    if (!isNeonServerlessUrl(yek)) return null; // container reads a non-Neon DB → let it decide
    return neon(preferNeonDirectWriteUrl(yek) || yek);
  }
  return neonSqlClient(env);
}

/** @returns {Promise<{ login: object|null, definitive: boolean }>} definitive = the DB was really asked. */
async function verifyDbAdminCredentials(env, username, password) {
  const sql = panelAdminSql(env);
  if (!sql) return { login: null, definitive: false };
  const u = String(username).trim();
  const ul = u.toLowerCase();
  const alias = ALIASES[ul]?.[0] ?? null;
  const rows = await sql`
    SELECT password_hash, permissions_json
    FROM panel_admin_users
    WHERE is_active = true
      AND (username = ${u} OR lower(username) = ${ul} OR lower(email) = ${ul}
           OR (${alias}::text IS NOT NULL AND lower(username) = ${alias}))
    LIMIT 5
  `;
  for (const row of rows || []) {
    const hash = String(row?.password_hash || "");
    if (!hash) continue;
    if (await bcrypt.compare(password, hash)) return { login: permissionsFromJson(row?.permissions_json), definitive: true };
  }
  return { login: null, definitive: true };
}

function bytesToBase64NoPad(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "");
}

function randomSid() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return bytesToBase64NoPad(b).replace(/\+/g, "-").replace(/\//g, "_");
}

/** cookie-signature: s:<sid>.<base64(hmac-sha256(sid)) without padding> */
export async function signConnectSid(sid, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(sid)));
  return `s:${sid}.${bytesToBase64NoPad(new Uint8Array(mac))}`;
}

export function buildSessionRecord(login, expires) {
  const sess = {
    cookie: {
      originalMaxAge: SESSION_MAX_AGE_MS,
      expires: expires.toISOString(),
      secure: true,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    },
    panelBootstrap: true,
  };
  if (login?.kind === "limited") sess.panelPermissions = login.permissions;
  return sess;
}

function jsonResponse(status, body, extraHeaders) {
  const h = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, no-store, max-age=0, must-revalidate",
    "cdn-cache-control": "no-store",
    "x-yekpare-frontend": "cloudflare-admin-login-edge",
  });
  for (const [k, v] of Object.entries(extraHeaders || {})) h.append(k, v);
  return new Response(JSON.stringify(body), { status, headers: h });
}

/**
 * Credentials matched neither the env secrets nor panel_admin_users. The container may still accept legacy logins,
 * so ask it, but never hang: a cold/rolling container answers within ADMIN_LOGIN_CONTAINER_WAIT_MS or the user gets
 * the container's own "wrong credentials" message instead of "Sunucuya şu an ulaşılamıyor".
 */
export async function adminLoginContainerOrReject(request, env, waitMs = ADMIN_LOGIN_CONTAINER_WAIT_MS, fetcher = fetchApi) {
  let timer;
  try {
    const body = await request.clone().text();
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    const upstream = await Promise.race([
      fetcher(env, request.url, { method: "POST", headers, body }).catch(() => null),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), waitMs);
      }),
    ]);
    if (upstream && upstream.status < 500) return upstream;
  } catch (err) {
    console.error("[admin-login-edge] container", String(err?.message || err).slice(0, 160));
  } finally {
    clearTimeout(timer);
  }
  return jsonResponse(401, { success: false, error: "Kullanıcı adı veya şifre hatalı.", edge: true });
}

/** @returns {Promise<Response|null>} */
export async function handleAdminPanelSessionEdge(request, env, ctx) {
  if (String(request.method || "").toUpperCase() !== "POST") return null;
  if (!isAdminPanelSessionPath(new URL(request.url).pathname)) return null;
  const secret = String(env?.SESSION_SECRET || "").trim();
  if (secret.length < 16) return null;

  let body;
  try {
    body = await request.clone().json();
  } catch {
    return null;
  }
  const username = String(body?.username ?? "").trim().replace(/^\uFEFF/, "");
  const password = normalizeLoginPassword(body?.password);
  if (!username || !password) return null;

  wakeApiContainerBackground(env, ctx);

  let login = null;
  let definitive = false;
  try {
    if (verifyEnvAdminCredentials(env, username, password)) login = { kind: "full" };
    else ({ login, definitive } = await verifyDbAdminCredentials(env, username, password));
  } catch (err) {
    console.error("[admin-login-edge] verify", String(err?.message || err).slice(0, 160));
    return null;
  }
  if (!login) {
    if (!definitive) return null;
    return adminLoginContainerOrReject(request, env);
  }

  const main = neonSqlClient(env);
  if (!main) return null;
  const sid = randomSid();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  try {
    await main`
      INSERT INTO express_sessions (sid, sess, expire)
      VALUES (${sid}, ${JSON.stringify(buildSessionRecord(login, expires))}::json, ${expires.toISOString()}::timestamp)
    `;
  } catch (err) {
    console.error("[admin-login-edge] session", String(err?.message || err).slice(0, 160));
    return null;
  }
  const cookieValue = encodeURIComponent(await signConnectSid(sid, secret));
  const cookie = `${COOKIE_NAME}=${cookieValue}; Path=/; Expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Lax`;
  return jsonResponse(200, { success: true, edge: true }, { "set-cookie": cookie });
}
