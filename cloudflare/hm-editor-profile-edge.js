/**
 * Editör oturumu kenarda (Neon):
 * - POST /api/hm/editor/login (e-posta veya kullanıcı adı)
 * - GET/PATCH /api/hm/editor/me
 * - PATCH /api/hm/editor/me/password
 *
 * Render API geride kalsa bile giriş + oturum doğrulama çalışır.
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_TYP = "hm_editor";
const JWT_TTL = "7d";

function normalizeHost(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

function normalizeUsername(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);
  if (!s || s.length < 3 || s.includes("@")) return null;
  return s;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      vary: "Origin, Authorization, Cookie",
      "x-yekpare-frontend": "cloudflare-editor-profile-edge",
    },
  });
}

function sqlClient(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return null;
  return neon(dbUrl);
}

function jwtSecretBytes(env) {
  const secret = String(env?.HM_EDITOR_JWT_SECRET || env?.SESSION_SECRET || "").trim();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function ensureUsernameColumn(sql) {
  try {
    await sql`ALTER TABLE hm_site_editors ADD COLUMN IF NOT EXISTS username text`;
  } catch {
    /* ignore */
  }
}

function asPositiveInt(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

async function parseEditorJwt(request, env) {
  const h = String(request.headers.get("authorization") || "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const key = jwtSecretBytes(env);
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const editorId = asPositiveInt(payload?.eid);
    const siteId = asPositiveInt(payload?.sid);
    if (payload?.typ !== JWT_TYP || editorId == null || siteId == null) {
      return null;
    }
    return { editorId, siteId };
  } catch {
    return null;
  }
}

async function signEditorJwt(env, editorId, siteId) {
  const key = jwtSecretBytes(env);
  if (!key) throw new Error("SESSION_SECRET eksik");
  const eid = asPositiveInt(editorId);
  const sid = asPositiveInt(siteId);
  if (eid == null || sid == null) throw new Error("Geçersiz editör/site id");
  return new SignJWT({ typ: JWT_TYP, eid, sid, v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_TTL)
    .sign(key);
}

const KH_HOSTS = new Set(["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"]);
const HM_LAYOUT_JSON_MAX_CHARS = 2_000_000;
const HM_LAYOUT_HEAVY_KEYS = ["hmExtraPages", "hmCorporatePageHtml"];
const HM_LAYOUT_MENU_KEYS = [
  "hmCorporateMenuItems",
  "hmCorporateMenuPrimaryOnly",
  "hmNewsFooterMenuItems",
  "hmNewsSidebarMenuItems",
  "hmNewsStripMenuItems",
];

function parseLayoutRecord(raw) {
  try {
    if (raw == null || !String(raw).trim()) return {};
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (j && typeof j === "object" && !Array.isArray(j)) return { ...j };
  } catch {
    /* ignore */
  }
  return {};
}

function stripNonVitrinLayoutKeys(incoming) {
  const out = { ...incoming };
  for (const k of HM_LAYOUT_HEAVY_KEYS) delete out[k];
  for (const k of HM_LAYOUT_MENU_KEYS) delete out[k];
  delete out.vkdEditorTouchedAt;
  delete out.vkdPageSyncVersion;
  delete out.vkdMenuSyncVersion;
  return out;
}

function mergeLayoutPatch(prev, incoming, opts = {}) {
  const inc = opts.vitrinOnly ? stripNonVitrinLayoutKeys(incoming) : incoming;
  const merged = { ...prev, ...inc };
  if (
    Array.isArray(inc.hmCorporateMenuItems) &&
    inc.hmCorporateMenuItems.length > 0 &&
    inc.hmCorporateMenuPrimaryOnly === undefined
  ) {
    merged.hmCorporateMenuPrimaryOnly = false;
  }
  if (
    prev.hmCategoryColors &&
    inc.hmCategoryColors &&
    typeof inc.hmCategoryColors === "object" &&
    !Array.isArray(inc.hmCategoryColors)
  ) {
    merged.hmCategoryColors = {
      ...(prev.hmCategoryColors || {}),
      ...inc.hmCategoryColors,
    };
  }
  return merged;
}

async function isKhEditorSite(sql, siteId) {
  const rows = await sql`
    SELECT slug, domain, domain2, domain3
    FROM hm_news_sites
    WHERE id = ${siteId}
    LIMIT 1
  `;
  const site = rows?.[0];
  if (!site) return false;
  const slug = String(site.slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (slug === "kh" || slug === "kirsehir") return true;
  for (const raw of [site.domain, site.domain2, site.domain3]) {
    if (KH_HOSTS.has(normalizeHost(raw))) return true;
  }
  return false;
}

/**
 * Kenar JWT + Neon: yalnızca Kırşehir (kh) — Render secret/DB ayrışınca
 * tema/modül/sayfa/menü kaydı 401 olmasın.
 * Diğer editör siteleri: null → Render proxy (dokunulmaz).
 */
async function handleKhSiteLayoutPatch(request, env) {
  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    // Render imzalı JWT olabilir — KH dışı / Render yoluna bırak.
    if (auth.startsWith("Bearer ")) return null;
    return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
  }

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });

  if (!(await isKhEditorSite(sql, ctx.siteId))) {
    // ASG/Su/diğer: mevcut Render akışı.
    return null;
  }

  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  if (!editor) return jsonResponse(401, { error: "Geçersiz oturum" });

  let b;
  try {
    b = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }

  const sites = await sql`
    SELECT id, layout_json
    FROM hm_news_sites
    WHERE id = ${ctx.siteId}
    LIMIT 1
  `;
  const site = sites?.[0];
  if (!site) return jsonResponse(404, { error: "Site bulunamadı" });

  const prev = parseLayoutRecord(site.layout_json);
  const incoming = b?.layout;
  let inc =
    incoming && typeof incoming === "object" && !Array.isArray(incoming) ? { ...incoming } : {};

  if (b?.vitrinOnly !== true) {
    if (
      prev.hmExtraPages &&
      Array.isArray(inc.hmExtraPages) &&
      inc.hmExtraPages.length === 0 &&
      b?.allowClearExtraPages !== true
    ) {
      delete inc.hmExtraPages;
    }
    if (inc.hmCorporatePageHtml === null && prev.hmCorporatePageHtml && b?.allowClearCorporatePageHtml !== true) {
      delete inc.hmCorporatePageHtml;
    }
  }

  const merged = mergeLayoutPatch(prev, inc, { vitrinOnly: b?.vitrinOnly === true });
  let raw;
  try {
    raw = JSON.stringify(merged);
  } catch (e) {
    return jsonResponse(400, {
      error: "layout JSON'a çevrilemedi",
      detail: String(e?.message || e).slice(0, 200),
    });
  }
  if (raw.length > HM_LAYOUT_JSON_MAX_CHARS) {
    return jsonResponse(400, {
      error: "layout çok büyük",
      maxChars: HM_LAYOUT_JSON_MAX_CHARS,
      sizeChars: raw.length,
    });
  }

  try {
    await sql`
      UPDATE hm_news_sites
      SET layout_json = ${raw}::jsonb, updated_at = now()
      WHERE id = ${ctx.siteId}
    `;
  } catch {
    // layout_json text olan eski şema
    await sql`
      UPDATE hm_news_sites
      SET layout_json = ${raw}, updated_at = now()
      WHERE id = ${ctx.siteId}
    `;
  }

  return jsonResponse(200, { ok: true, layoutJson: raw });
}

async function handleKhSiteHomeModuleOrderPatch(request, env) {
  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    if (auth.startsWith("Bearer ")) return null;
    return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
  }

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });
  if (!(await isKhEditorSite(sql, ctx.siteId))) return null;

  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  if (!editor) return jsonResponse(401, { error: "Geçersiz oturum" });

  let b;
  try {
    b = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }

  const patch = {};
  if (Array.isArray(b?.hmNewsHomeModuleOrder)) {
    patch.hmNewsHomeModuleOrder = b.hmNewsHomeModuleOrder.map((x) => String(x).trim()).filter(Boolean);
  }
  if (Array.isArray(b?.hmCorporateHomeModuleOrder)) {
    patch.hmCorporateHomeModuleOrder = b.hmCorporateHomeModuleOrder
      .map((x) => String(x).trim())
      .filter(Boolean);
  }
  if (Object.keys(patch).length === 0) {
    return jsonResponse(400, {
      error: "hmNewsHomeModuleOrder veya hmCorporateHomeModuleOrder gerekli",
    });
  }

  const sites = await sql`
    SELECT id, layout_json
    FROM hm_news_sites
    WHERE id = ${ctx.siteId}
    LIMIT 1
  `;
  const site = sites?.[0];
  if (!site) return jsonResponse(404, { error: "Site bulunamadı" });

  const prev = parseLayoutRecord(site.layout_json);
  const merged = mergeLayoutPatch(prev, patch, { vitrinOnly: true });
  let raw;
  try {
    raw = JSON.stringify(merged);
  } catch (e) {
    return jsonResponse(400, {
      error: "layout JSON'a çevrilemedi",
      detail: String(e?.message || e).slice(0, 200),
    });
  }
  if (raw.length > HM_LAYOUT_JSON_MAX_CHARS) {
    return jsonResponse(400, {
      error: "layout çok büyük",
      maxChars: HM_LAYOUT_JSON_MAX_CHARS,
      sizeChars: raw.length,
    });
  }

  try {
    await sql`
      UPDATE hm_news_sites
      SET layout_json = ${raw}::jsonb, updated_at = now()
      WHERE id = ${ctx.siteId}
    `;
  } catch {
    await sql`
      UPDATE hm_news_sites
      SET layout_json = ${raw}, updated_at = now()
      WHERE id = ${ctx.siteId}
    `;
  }

  return jsonResponse(200, { ok: true, layoutJson: raw });
}

async function resolveSiteByHost(sql, host) {
  const h = normalizeHost(host);
  if (!h) return null;
  const rows = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, contact_json, layout_json, verification_json, created_at, active
    FROM hm_news_sites
    WHERE active = true
      AND (
        lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', '')) = ${h}
        OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', '')) = ${h}
        OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', '')) = ${h}
      )
    ORDER BY id ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function resolveSiteBySlug(sql, slugRaw) {
  const slug = String(slugRaw || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return null;
  const rows = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, contact_json, layout_json, verification_json, created_at, active
    FROM hm_news_sites
    WHERE active = true
      AND lower(trim(both '/' from slug)) = ${slug}
    ORDER BY id ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function loadActiveEditor(sql, editorId, siteId) {
  const rows = await sql`
    SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
    FROM hm_site_editors
    WHERE id = ${editorId} AND site_id = ${siteId} AND is_active = true
    LIMIT 1
  `;
  return rows?.[0] || null;
}

function parseSeoVerification(raw) {
  if (raw == null || raw === "") return null;
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

async function syncSharedCredentials(sql, opts) {
  const email = String(opts.email || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) return 0;
  const excludeId = Number(opts.excludeEditorId) || 0;
  const peers = await sql`
    SELECT id, username, display_name, email FROM hm_site_editors
    WHERE lower(email) = ${email}
      AND is_active = true
      AND id <> ${excludeId}
  `;
  let n = 0;
  for (const peer of peers || []) {
    const nextUsername = opts.username !== undefined ? opts.username ?? null : peer.username;
    const nextDisplay =
      opts.displayName !== undefined ? opts.displayName ?? null : peer.display_name;
    const nextEmail =
      typeof opts.nextEmail === "string" && opts.nextEmail.includes("@")
        ? opts.nextEmail.trim().toLowerCase()
        : peer.email;
    const nextHash = opts.passwordHash || null;
    if (nextHash) {
      await sql`
        UPDATE hm_site_editors
        SET password_hash = ${nextHash},
            username = ${nextUsername},
            display_name = ${nextDisplay},
            email = ${nextEmail},
            updated_at = now()
        WHERE id = ${peer.id}
      `;
    } else {
      await sql`
        UPDATE hm_site_editors
        SET username = ${nextUsername},
            display_name = ${nextDisplay},
            email = ${nextEmail},
            updated_at = now()
        WHERE id = ${peer.id}
      `;
    }
    n += 1;
  }
  return n;
}

function bytesToBase64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSignBase64Url(secret, raw) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return bytesToBase64Url(new Uint8Array(mac));
}

/** Kenarda captcha üret — Worker SESSION_SECRET ile; login kenarda doğrulanır. */
async function issueLoginMathCaptcha(env) {
  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) return null;
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const op = Math.random() < 0.5 ? "add" : "mul";
  const payload = { a, b, op, exp: Date.now() + 10 * 60 * 1000 };
  const raw = JSON.stringify(payload);
  const rawBytes = new TextEncoder().encode(raw);
  const payloadB64 = bytesToBase64Url(rawBytes);
  const sig = await hmacSignBase64Url(secret, raw);
  const question = op === "add" ? `${a} + ${b} = ?` : `${a} × ${b} = ?`;
  return { token: `${payloadB64}.${sig}`, question };
}

/** Captcha token = base64url(JSON).HMAC_SHA256 (SESSION_SECRET) — API ile aynı. */
async function verifyLoginMathCaptcha(env, tokenRaw, answerRaw) {
  const token = String(tokenRaw ?? "").trim();
  const answer = Number(String(answerRaw ?? "").trim());
  if (!token || !Number.isFinite(answer)) return false;
  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let raw;
  try {
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    raw = new TextDecoder().decode(bytes);
  } catch {
    return false;
  }

  const expectedSig = await hmacSignBase64Url(secret, raw);
  if (sig.length !== expectedSig.length) return false;
  let ok = true;
  for (let i = 0; i < sig.length; i += 1) {
    if (sig.charCodeAt(i) !== expectedSig.charCodeAt(i)) ok = false;
  }
  if (!ok) return false;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!payload || Number(payload.exp) < Date.now()) return false;
  if (!Number.isInteger(payload.a) || !Number.isInteger(payload.b)) return false;
  if (payload.op !== "add" && payload.op !== "mul") return false;
  const expected = payload.op === "add" ? payload.a + payload.b : payload.a * payload.b;
  return answer === expected;
}

async function handleEditorLogin(request, env, incomingUrl) {
  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });
  if (!jwtSecretBytes(env)) return jsonResponse(503, { error: "Oturum anahtarı eksik." });

  let b;
  try {
    b = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }

  if (!(await verifyLoginMathCaptcha(env, b.captchaToken, b.captchaAnswer))) {
    // Eski (Render imzalı) captcha olabilir — Render login'e düş.
    return null;
  }

  // Captcha Worker'da doğrulandıktan sonra Render'a düşme — secret uyuşmazlığında
  // "Güvenlik doğrulaması hatalı" döner. Hata olursa burada 503 ver.
  try {
    return await completeEditorLoginAfterCaptcha(request, env, incomingUrl, sql, b);
  } catch (err) {
    console.error("[hm-editor-login-edge]", String(err?.message || err).slice(0, 200));
    return jsonResponse(503, { error: "Giriş servisi geçici olarak kullanılamıyor. Lütfen tekrar deneyin." });
  }
}

async function completeEditorLoginAfterCaptcha(request, env, incomingUrl, sql, b) {
  const loginRaw = String(b.login ?? b.email ?? b.username ?? "")
    .trim()
    .toLowerCase();
  const password = String(b.password ?? "");
  if (!loginRaw || !password) {
    return jsonResponse(400, { error: "slug, e-posta/kullanıcı adı ve şifre gerekli" });
  }

  await ensureUsernameColumn(sql);

  const host = normalizeHost(b.domain || incomingUrl.hostname);
  let site = host ? await resolveSiteByHost(sql, host) : null;
  if (!site) {
    site = await resolveSiteBySlug(sql, b.slug);
  }
  if (!site) {
    return jsonResponse(401, { error: "Site veya hesap bulunamadı" });
  }

  const loginIsEmail = loginRaw.includes("@");
  const loginUsername = loginIsEmail ? null : normalizeUsername(loginRaw);
  let editors;
  if (loginIsEmail) {
    editors = await sql`
      SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
      FROM hm_site_editors
      WHERE site_id = ${site.id}
        AND is_active = true
        AND lower(email) = ${loginRaw}
      LIMIT 1
    `;
  } else if (loginUsername) {
    editors = await sql`
      SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
      FROM hm_site_editors
      WHERE site_id = ${site.id}
        AND is_active = true
        AND lower(coalesce(username, '')) = ${loginUsername}
      LIMIT 1
    `;
  } else {
    return jsonResponse(401, { error: "E-posta, kullanıcı adı veya şifre hatalı" });
  }

  const editor = editors?.[0];
  if (!editor?.password_hash) {
    if (loginIsEmail) {
      const elsewhere = await sql`
        SELECT e.site_id, s.display_name, s.domain, s.slug
        FROM hm_site_editors e
        JOIN hm_news_sites s ON s.id = e.site_id
        WHERE lower(e.email) = ${loginRaw} AND e.is_active = true
        LIMIT 1
      `;
      const other = elsewhere?.[0];
      if (other && Number(other.site_id) !== Number(site.id)) {
        const otherHost = normalizeHost(other.domain) || other.slug || "";
        return jsonResponse(401, {
          error: otherHost
            ? `Bu e-posta «${other.display_name || otherHost}» sitesine kayıtlı. Giriş: ${
                otherHost.includes(".")
                  ? `https://${otherHost}/editor/giris`
                  : `/tr/${otherHost}/editor/giris`
              }`
            : "E-posta, kullanıcı adı veya şifre hatalı",
        });
      }
    }
    return jsonResponse(401, { error: "E-posta, kullanıcı adı veya şifre hatalı" });
  }

  const pwOk = await bcrypt.compare(password, editor.password_hash);
  if (!pwOk) {
    return jsonResponse(401, { error: "E-posta, kullanıcı adı veya şifre hatalı" });
  }

  const token = await signEditorJwt(env, editor.id, site.id);
  return jsonResponse(200, {
    token,
    site: {
      id: site.id,
      slug: site.slug,
      domain: site.domain,
      domain2: site.domain2 ?? null,
      displayName: site.display_name,
    },
    editor: {
      id: editor.id,
      email: editor.email,
      username: editor.username ?? null,
      displayName: editor.display_name,
    },
  });
}

async function handleEditorMeGet(request, env) {
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });

  await ensureUsernameColumn(sql);
  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  const sites = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, contact_json, layout_json, verification_json, created_at
    FROM hm_news_sites
    WHERE id = ${ctx.siteId}
    LIMIT 1
  `;
  const site = sites?.[0];
  if (!editor || !site || Number(editor.site_id) !== Number(site.id)) {
    return jsonResponse(401, { error: "Geçersiz oturum" });
  }

  return jsonResponse(200, {
    editor: {
      id: editor.id,
      email: editor.email,
      username: editor.username ?? null,
      displayName: editor.display_name,
      createdAt: editor.created_at,
    },
    site: {
      id: site.id,
      slug: site.slug,
      domain: site.domain,
      domain2: site.domain2 ?? null,
      domain3: site.domain3 ?? null,
      displayName: site.display_name,
      contactJson: site.contact_json,
      layoutJson: site.layout_json,
      seoVerification: parseSeoVerification(site.verification_json),
      createdAt: site.created_at,
    },
  });
}

async function patchEditorMe(request, env) {
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });

  let b;
  try {
    b = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }

  await ensureUsernameColumn(sql);
  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  if (!editor) return jsonResponse(401, { error: "Geçersiz oturum" });

  const wantsEmail = typeof b.email === "string";
  const wantsUsername = b.username !== undefined;
  const wantsDisplay = typeof b.displayName === "string";
  if (!wantsEmail && !wantsUsername && !wantsDisplay) {
    return jsonResponse(400, { error: "Güncellenecek alan yok" });
  }

  const nextEmail = wantsEmail ? String(b.email).trim().toLowerCase() : editor.email;
  if (wantsEmail && (!nextEmail.includes("@") || nextEmail.length < 5)) {
    return jsonResponse(400, { error: "Geçerli bir e-posta girin" });
  }

  let nextUsername;
  if (wantsUsername) {
    const raw = String(b.username ?? "").trim();
    if (!raw) nextUsername = null;
    else {
      nextUsername = normalizeUsername(raw);
      if (!nextUsername) {
        return jsonResponse(400, {
          error: "Kullanıcı adı en az 3 karakter; yalnızca harf, rakam, nokta, tire, alt çizgi.",
        });
      }
    }
  }

  const nextDisplay = wantsDisplay ? String(b.displayName).trim() || null : undefined;
  const sensitive =
    (wantsEmail && nextEmail !== String(editor.email || "").toLowerCase()) ||
    (wantsUsername && nextUsername !== (editor.username ?? null));

  if (sensitive) {
    const current = String(b.currentPassword ?? "");
    if (!current || !(await bcrypt.compare(current, editor.password_hash || ""))) {
      return jsonResponse(401, { error: "Mevcut şifre yanlış." });
    }
  }

  if (wantsEmail && nextEmail !== String(editor.email || "").toLowerCase()) {
    const taken = await sql`
      SELECT id FROM hm_site_editors
      WHERE site_id = ${ctx.siteId}
        AND lower(email) = ${nextEmail}
        AND id <> ${editor.id}
      LIMIT 1
    `;
    if (taken?.[0]?.id) {
      return jsonResponse(409, { error: "Bu e-posta bu sitede zaten kayıtlı." });
    }
  }

  if (wantsUsername && nextUsername) {
    const takenU = await sql`
      SELECT id FROM hm_site_editors
      WHERE site_id = ${ctx.siteId}
        AND lower(coalesce(username, '')) = ${nextUsername}
        AND id <> ${editor.id}
      LIMIT 1
    `;
    if (takenU?.[0]?.id) {
      return jsonResponse(409, { error: "Bu kullanıcı adı bu sitede kullanımda." });
    }
  }

  await sql`
    UPDATE hm_site_editors
    SET
      email = ${wantsEmail ? nextEmail : editor.email},
      username = ${wantsUsername ? nextUsername ?? null : editor.username},
      display_name = ${wantsDisplay ? nextDisplay : editor.display_name},
      updated_at = now()
    WHERE id = ${editor.id}
  `;

  await syncSharedCredentials(sql, {
    email: editor.email,
    excludeEditorId: editor.id,
    nextEmail: wantsEmail && nextEmail !== String(editor.email || "").toLowerCase() ? nextEmail : undefined,
    username: wantsUsername ? (nextUsername ?? null) : undefined,
    displayName: wantsDisplay ? (nextDisplay ?? null) : undefined,
  }).catch(() => 0);

  const fresh = await loadActiveEditor(sql, editor.id, ctx.siteId);
  return jsonResponse(200, {
    ok: true,
    editor: {
      id: fresh.id,
      email: fresh.email,
      username: fresh.username ?? null,
      displayName: fresh.display_name,
      createdAt: fresh.created_at,
    },
  });
}

async function patchEditorPassword(request, env) {
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });

  let b;
  try {
    b = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }

  const current = String(b.currentPassword ?? "");
  const nextPw = String(b.newPassword ?? "");
  if (nextPw.length < 8) {
    return jsonResponse(400, { error: "Yeni şifre en az 8 karakter olmalı." });
  }

  await ensureUsernameColumn(sql);
  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  if (!editor?.password_hash) {
    return jsonResponse(400, { error: "Şifre bu hesap için tanımlı değil." });
  }
  if (!current || !(await bcrypt.compare(current, editor.password_hash))) {
    return jsonResponse(401, { error: "Mevcut şifre yanlış." });
  }

  const passwordHash = await bcrypt.hash(nextPw, 10);
  await sql`
    UPDATE hm_site_editors
    SET password_hash = ${passwordHash}, updated_at = now()
    WHERE id = ${editor.id}
  `;
  await syncSharedCredentials(sql, {
    email: editor.email,
    excludeEditorId: editor.id,
    passwordHash,
  }).catch(() => 0);

  return jsonResponse(200, { ok: true });
}

/**
 * Login / me / profil / captcha (+ KH layout) — Response veya null (null = Render'a proxy).
 * Login için request.clone() ile çağırın; body tüketilmesin.
 */
export async function handleHmEditorProfileEdge(request, env, incomingUrl) {
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  if (path === "/api/public/login-captcha" && method === "GET") {
    const issued = await issueLoginMathCaptcha(env);
    if (!issued) return null;
    return jsonResponse(200, issued);
  }
  if (path === "/api/hm/editor/login" && method === "POST") {
    return handleEditorLogin(request, env, incomingUrl);
  }
  if (path === "/api/hm/editor/me" && method === "GET") {
    const auth = String(request.headers.get("authorization") || "").trim();
    const ctx = await parseEditorJwt(request, env);
    if (!ctx) {
      // Worker secret ile doğrulanamadı — Render imzalı JWT olabilir.
      if (auth.startsWith("Bearer ")) return null;
      return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
    }
    return handleEditorMeGet(request, env);
  }
  if (path === "/api/hm/editor/me" && method === "PATCH") {
    const auth = String(request.headers.get("authorization") || "").trim();
    const ctx = await parseEditorJwt(request, env);
    if (!ctx) {
      if (auth.startsWith("Bearer ")) return null; // Render imzalı JWT
      return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
    }
    return patchEditorMe(request, env);
  }
  if (path === "/api/hm/editor/me/password" && method === "PATCH") {
    const auth = String(request.headers.get("authorization") || "").trim();
    const ctx = await parseEditorJwt(request, env);
    if (!ctx) {
      if (auth.startsWith("Bearer ")) return null;
      return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
    }
    return patchEditorPassword(request, env);
  }
  // Kırşehir: kenar JWT ile tema/modül/sayfa/menü kaydı Neon'a (Render 401 olmasın).
  if (path === "/api/hm/editor/site-layout" && method === "PATCH") {
    return handleKhSiteLayoutPatch(request, env);
  }
  if (path === "/api/hm/editor/site-home-module-order" && method === "PATCH") {
    return handleKhSiteHomeModuleOrderPatch(request, env);
  }
  return null;
}

/** @deprecated — login kenarda; geriye dönük no-op. */
export async function rewriteEditorLoginForUsername(request) {
  return request;
}

/** @deprecated — GET /me kenarda. */
export async function enrichEditorMeResponse() {
  return null;
}
