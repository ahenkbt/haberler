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
import { saveMediaDataUrlToS3, s3MediaEnvReady } from "./hm-editor-media-s3-edge.js";

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
  for (const secret of collectJwtSecretStrings(env)) {
    try {
      const key = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, key);
      const editorId = asPositiveInt(payload?.eid);
      const siteId = asPositiveInt(payload?.sid);
      if (payload?.typ !== JWT_TYP || editorId == null || siteId == null) continue;
      return { editorId, siteId };
    } catch {
      /* sonraki secret */
    }
  }
  return null;
}

async function signEditorJwt(env, editorId, siteId) {
  const key = jwtSecretBytes(env);
  if (!key) throw new Error("SESSION_SECRET eksik");
  return mintEditorJwtWithSecretBytes(key, editorId, siteId);
}

function collectJwtSecretStrings(env) {
  const out = [];
  for (const raw of [env?.HM_EDITOR_JWT_SECRET, env?.SESSION_SECRET]) {
    const s = String(raw ?? "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

async function mintEditorJwtWithSecret(secret, editorId, siteId) {
  const s = String(secret ?? "").trim();
  if (!s) throw new Error("secret empty");
  return mintEditorJwtWithSecretBytes(new TextEncoder().encode(s), editorId, siteId);
}

async function mintEditorJwtWithSecretBytes(key, editorId, siteId) {
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
  if (slug === "kirsehirhaber" || slug === "kh" || slug === "kirsehir") return true;
  for (const raw of [site.domain, site.domain2, site.domain3]) {
    if (KH_HOSTS.has(normalizeHost(raw))) return true;
  }
  return false;
}

const KH_KNOWN_EDITOR_EMAILS = new Set(["kevser@gmail.com"]);

function isKhEditorCandidate(editor) {
  const email = String(editor?.email ?? "")
    .trim()
    .toLowerCase();
  const dn = String(editor?.display_name ?? "")
    .trim()
    .toLowerCase();
  if (KH_KNOWN_EDITOR_EMAILS.has(email)) return true;
  if (email.includes("kirsehirhaber") || email.includes("kirsehri")) return true;
  if (dn.includes("kırşehir") || dn.includes("kirsehir") || dn.includes("kirşehir")) return true;
  return false;
}

async function repairKhEditorForLogin(sql, emailRaw, khSiteId) {
  const email = String(emailRaw ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) return null;

  const onKh = await sql`
    SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
    FROM hm_site_editors
    WHERE site_id = ${khSiteId}
      AND is_active = true
      AND lower(email) = ${email}
    LIMIT 1
  `;
  if (onKh?.[0]?.password_hash) return onKh[0];

  const elsewhere = await sql`
    SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
    FROM hm_site_editors
    WHERE site_id <> ${khSiteId}
      AND is_active = true
      AND lower(email) = ${email}
    LIMIT 1
  `;
  const source = elsewhere?.[0];
  if (!source?.password_hash || !isKhEditorCandidate(source)) return null;

  const displayName =
    String(source.display_name ?? "").trim() ||
    (KH_KNOWN_EDITOR_EMAILS.has(email) ? "Kırşehir Haber" : null);

  const existing = await sql`
    SELECT id FROM hm_site_editors
    WHERE site_id = ${khSiteId} AND lower(email) = ${email}
    LIMIT 1
  `;
  let editorId = existing?.[0]?.id ?? null;
  if (editorId) {
    await sql`
      UPDATE hm_site_editors
      SET password_hash = ${source.password_hash},
          username = ${source.username},
          display_name = ${displayName},
          is_active = true,
          updated_at = NOW()
      WHERE id = ${editorId}
    `;
  } else {
    const inserted = await sql`
      INSERT INTO hm_site_editors (site_id, email, username, password_hash, display_name, is_active, created_at, updated_at)
      VALUES (${khSiteId}, ${email}, ${source.username}, ${source.password_hash}, ${displayName}, true, NOW(), NOW())
      RETURNING id
    `;
    editorId = inserted?.[0]?.id ?? null;
  }
  if (!editorId) return null;

  await sql`
    UPDATE hm_site_editors
    SET is_active = false, updated_at = NOW()
    WHERE id = ${source.id}
  `;

  const fixed = await sql`
    SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
    FROM hm_site_editors
    WHERE id = ${editorId}
    LIMIT 1
  `;
  return fixed?.[0] ?? null;
}

const ASG_SHARED_EMAIL = "sehirgazetesiankara@gmail.com";
const ASG_SHARED_USERNAME = "sehirgazetesi";

function isAsgSharedEditorEmail(emailRaw) {
  return String(emailRaw ?? "")
    .trim()
    .toLowerCase() === ASG_SHARED_EMAIL;
}

function isAsgHmSiteRow(site) {
  const slug = String(site?.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (
    slug === "asg" ||
    slug === "ankarahabergundemi" ||
    slug.includes("ankarasehirgazetesi") ||
    slug.includes("ankarahabergundemi")
  ) {
    return true;
  }
  for (const raw of [site?.domain, site?.domain2, site?.domain3]) {
    const h = normalizeHost(raw);
    if (h.includes("ankarasehirgazetesi") || h.includes("ankarahabergundemi")) return true;
  }
  return false;
}

async function repairAsgEditorForLoginEdge(sql, emailRaw, siteId) {
  const email = String(emailRaw ?? "")
    .trim()
    .toLowerCase();
  if (!isAsgSharedEditorEmail(email)) return null;

  const sites = await sql`
    SELECT id, slug, display_name, domain, domain2, domain3 FROM hm_news_sites
    WHERE active = true
      AND (
        lower(trim(both '/' from slug)) IN ('asg', 'ankarahabergundemi')
        OR lower(coalesce(domain, '')) LIKE '%ankarasehirgazetesi%'
        OR lower(coalesce(domain2, '')) LIKE '%ankarasehirgazetesi%'
        OR lower(coalesce(domain3, '')) LIKE '%ankarasehirgazetesi%'
        OR lower(coalesce(domain, '')) LIKE '%ankarahabergundemi%'
        OR lower(coalesce(domain2, '')) LIKE '%ankarahabergundemi%'
        OR lower(coalesce(domain3, '')) LIKE '%ankarahabergundemi%'
      )
    ORDER BY id ASC
  `;
  if (!sites?.length) return null;

  const srcRows = await sql`
    SELECT id, email, password_hash, display_name, username, site_id, updated_at
    FROM hm_site_editors
    WHERE lower(email) = ${email} AND is_active = true
    ORDER BY updated_at DESC NULLS LAST, id DESC
    LIMIT 1
  `;
  const source = srcRows?.[0];
  if (!source?.password_hash) return null;

  for (const site of sites) {
    const display =
      String(site.slug || "").toLowerCase() === "asg"
        ? "Ankara Şehir Gazetesi"
        : source.display_name || site.display_name || "Editör";
    const existing = await sql`
      SELECT id FROM hm_site_editors
      WHERE site_id = ${site.id} AND lower(email) = ${email}
      LIMIT 1
    `;
    if (existing?.[0]?.id) {
      await sql`
        UPDATE hm_site_editors
        SET password_hash = ${source.password_hash},
            username = ${ASG_SHARED_USERNAME},
            display_name = ${display},
            is_active = true,
            updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO hm_site_editors (site_id, email, username, password_hash, display_name, is_active)
        VALUES (${site.id}, ${email}, ${ASG_SHARED_USERNAME}, ${source.password_hash}, ${display}, true)
      `;
    }
  }

  const onSite = await sql`
    SELECT id, site_id, email, username, display_name, password_hash, is_active, created_at
    FROM hm_site_editors
    WHERE site_id = ${siteId} AND lower(email) = ${email} AND is_active = true
    LIMIT 1
  `;
  return onSite?.[0] ?? null;
}

async function tryAsgSharedPasswordLogin(sql, emailRaw, password, siteId) {
  const email = String(emailRaw ?? "")
    .trim()
    .toLowerCase();
  if (!isAsgSharedEditorEmail(email) || !password) return false;

  const peers = await sql`
    SELECT id, site_id, password_hash
    FROM hm_site_editors
    WHERE lower(email) = ${email} AND is_active = true
  `;
  let matchedHash = null;
  for (const peer of peers || []) {
    if (!peer.password_hash) continue;
    if (await bcrypt.compare(password, peer.password_hash)) {
      matchedHash = peer.password_hash;
      break;
    }
  }
  if (!matchedHash) return false;

  for (const peer of peers || []) {
    if (peer.password_hash === matchedHash) continue;
    await sql`
      UPDATE hm_site_editors
      SET password_hash = ${matchedHash},
          username = ${ASG_SHARED_USERNAME},
          is_active = true,
          updated_at = now()
      WHERE id = ${peer.id}
    `;
  }
  const onSite = (peers || []).find((p) => Number(p.site_id) === Number(siteId));
  if (!onSite) {
    await repairAsgEditorForLoginEdge(sql, email, siteId);
    return true;
  }
  if (onSite.password_hash !== matchedHash) {
    await sql`
      UPDATE hm_site_editors
      SET password_hash = ${matchedHash},
          username = ${ASG_SHARED_USERNAME},
          is_active = true,
          updated_at = now()
      WHERE id = ${onSite.id}
    `;
  }
  return true;
}

/**
 * Kenar JWT + Neon: tema/modül/sayfa/menü kaydı (tüm HM editör siteleri).
 * Render secret/DB ayrışınca 401 olmasın diye Neon'a yazılır.
 */
async function handleHmSiteLayoutPatch(request, env) {
  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    // Render imzalı JWT olabilir — kenar doğrulayamadıysa Render yoluna bırak.
    if (auth.startsWith("Bearer ")) return null;
    return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
  }

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });

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

async function handleHmSiteHomeModuleOrderPatch(request, env) {
  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    if (auth.startsWith("Bearer ")) return null;
    return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
  }

  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });

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
  // Yalnızca ASG+AHB ortak hesabı — diğer e-postalar site başına bağımsız.
  if (email !== "sehirgazetesiankara@gmail.com") return 0;
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

  let editor = editors?.[0];
  if (!editor?.password_hash && loginIsEmail) {
    const siteIsKh = (await isKhEditorSite(sql, site.id)) || KH_HOSTS.has(host);
    if (siteIsKh) {
      const repaired = await repairKhEditorForLogin(sql, loginRaw, site.id);
      if (repaired?.password_hash) editor = repaired;
    }
  }
  if (!editor?.password_hash && loginIsEmail && isAsgSharedEditorEmail(loginRaw) && isAsgHmSiteRow(site)) {
    const repaired = await repairAsgEditorForLoginEdge(sql, loginRaw, site.id);
    if (repaired?.password_hash) editor = repaired;
  }
  if (!editor?.password_hash) {
    if (loginIsEmail) {
      if (!isAsgSharedEditorEmail(loginRaw)) {
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
    }
    return jsonResponse(401, { error: "E-posta, kullanıcı adı veya şifre hatalı" });
  }

  let pwOk = await bcrypt.compare(password, editor.password_hash);
  if (!pwOk && isAsgSharedEditorEmail(editor.email)) {
    pwOk = await tryAsgSharedPasswordLogin(sql, editor.email, password, site.id);
    if (pwOk) {
      const refreshed = await repairAsgEditorForLoginEdge(sql, editor.email, site.id);
      if (refreshed?.password_hash) editor = refreshed;
    }
  }
  if (!pwOk) {
    return jsonResponse(401, { error: "E-posta, kullanıcı adı veya şifre hatalı" });
  }

  // Kırşehir: tercihen Render JWT (session-bridge). Yoksa Neon JWT + kenar veri API.
  // Yazar senkronu girişte YAPILMAZ — Render'dan tekrar çekmek silinen köşe yazarlarını geri getiriyordu.
  const siteIsKh = await isKhEditorSite(sql, site.id);
  if (siteIsKh || KH_HOSTS.has(host)) {
    const bridged = await exchangeKhSessionViaRenderBridge(env, {
      email: editor.email,
      passwordHash: editor.password_hash,
      displayName: editor.display_name ?? null,
      username: editor.username ?? null,
      siteSlug: site.slug || "kirsehirhaber",
      siteDomain: site.domain || host || "kirsehirhaber.org",
    });
    if (bridged) return bridged;
    console.error("[hm-kh-session-bridge] fallback neon-jwt");
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

const HM_EDGE_BRIDGE_SECRET_FALLBACK = "yekpare-hm-kh-bridge-20260727-v1";

function edgeBridgeSecret(env) {
  return String(env?.HM_EDGE_BRIDGE_SECRET || HM_EDGE_BRIDGE_SECRET_FALLBACK).trim();
}

async function hmacSha256Base64Url(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function apiOriginFromEnv(env) {
  return String(env?.API_ORIGIN || env?.RENDER_API_ORIGIN || "https://goalgo-y7ze.onrender.com").replace(
    /\/+$/,
    "",
  );
}

function khBridgeCanonical(payload) {
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const siteSlug = String(payload.siteSlug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const siteDomain = normalizeHost(payload.siteDomain || "");
  const exp = String(Number(payload.exp) || 0);
  const nonce = String(payload.nonce || "");
  const passwordHash = String(payload.passwordHash || "");
  return [email, siteSlug, siteDomain, exp, nonce, passwordHash].join("\n");
}

/** Neon'da doğrulanmış KH editörünü Render JWT'ye çevirir. */
async function exchangeKhSessionViaRenderBridge(env, opts) {
  const secret = edgeBridgeSecret(env);
  if (!secret) return null;
  const payload = {
    email: String(opts.email || "")
      .trim()
      .toLowerCase(),
    passwordHash: String(opts.passwordHash || ""),
    displayName: opts.displayName ?? null,
    username: opts.username ?? null,
    siteSlug: String(opts.siteSlug || "kirsehirhaber")
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, ""),
    siteDomain: normalizeHost(opts.siteDomain) || "kirsehirhaber.org",
    exp: Date.now() + 90_000,
    nonce: crypto.randomUUID(),
  };
  const raw = JSON.stringify(payload);
  let sig;
  try {
    sig = await hmacSha256Base64Url(secret, khBridgeCanonical(payload));
  } catch (err) {
    console.error("[hm-kh-session-bridge] hmac", String(err?.message || err).slice(0, 160));
    return null;
  }
  const url = `${apiOriginFromEnv(env)}/api/hm/editor/session-bridge`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-yekpare-hm-edge-bridge": sig,
      },
      body: raw,
    });
    const text = await res.text();
    let j = {};
    try {
      j = text ? JSON.parse(text) : {};
    } catch {
      j = {};
    }
    if (!res.ok || !j?.token || !j?.site || !j?.editor) {
      console.error(
        "[hm-kh-session-bridge]",
        res.status,
        String(j?.error || text || "").slice(0, 200),
      );
      return null;
    }
    return jsonResponse(200, {
      token: j.token,
      site: {
        id: j.site.id,
        slug: j.site.slug,
        domain: j.site.domain,
        domain2: j.site.domain2 ?? null,
        displayName: j.site.displayName,
      },
      editor: {
        id: j.editor.id,
        email: j.editor.email,
        username: j.editor.username ?? null,
        displayName: j.editor.displayName,
      },
      bridged: true,
    });
  } catch (err) {
    console.error("[hm-kh-session-bridge] fetch", String(err?.message || err).slice(0, 200));
    return null;
  }
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
  // Tüm HM siteleri: kenar JWT ile tema/modül/sayfa/menü kaydı Neon'a.
  if (path === "/api/hm/editor/site-layout" && method === "PATCH") {
    return handleHmSiteLayoutPatch(request, env);
  }
  if (path === "/api/hm/editor/site-home-module-order" && method === "PATCH") {
    return handleHmSiteHomeModuleOrderPatch(request, env);
  }
  return null;
}

/**
 * Editör görsel yükleme — kenar JWT doğrulandıktan sonra kaydet.
 * 1) Worker → R2/S3 (Render gerekmez)
 * 2) Render /api/media/upload (Bearer JWT)
 * 3) Render /api/media/edge-upload (HMAC köprüsü — yeni API deploy'u gerekir)
 */
export async function handleHmEditorMediaUploadEdge(request, env) {
  const path = String(new URL(request.url).pathname || "").replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();
  if (path !== "/api/media/upload" || method !== "POST") return null;

  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    if (auth.startsWith("Bearer ")) return null;
    return jsonResponse(401, { error: "Kimlik doğrulama gerekli" });
  }

  const sql = sqlClient(env);
  if (!sql) {
    if (auth.startsWith("Bearer ")) {
      return jsonResponse(503, {
        error: "Medya yükleme geçici olarak kullanılamıyor",
        detail: "Kenar veritabanı bağlantısı yok. Lütfen birkaç dakika sonra tekrar deneyin.",
      });
    }
    return null;
  }
  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  if (!editor) return jsonResponse(401, { error: "Geçersiz oturum" });

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
  if (!dataUrl) return jsonResponse(400, { error: "dataUrl gerekli" });

  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  const uploadSteps = [];

  // 1) Doğrudan R2/S3 — Render gerekmez.
  if (s3MediaEnvReady(env)) {
    const direct = await saveMediaDataUrlToS3(env, dataUrl, typeof body?.title === "string" ? body.title : undefined);
    if (direct.url) {
      return jsonResponse(200, { url: direct.url });
    }
    uploadSteps.push(`s3:${direct.error || "failed"}`);
    console.error("[hm-editor-media-s3]", String(direct.error || "unknown").slice(0, 200));
  } else {
    uploadSteps.push("s3:not-configured");
  }

  const origin = apiOriginFromEnv(env);

  // 2) HMAC köprüsü — JWT secret uyuşmazlığında en güvenilir Render yolu.
  const bridgeUpload = await fetchRenderMediaBridgeUpload(env, sql, ctx, editor, body, dataUrl, origin);
  if (bridgeUpload?.ok && bridgeUpload.response) return bridgeUpload.response;
  if (bridgeUpload?.response) return bridgeUpload.response;
  if (bridgeUpload?.detail) uploadSteps.push(`bridge:${bridgeUpload.detail}`);

  // 3) Render /api/media/upload — kenarda imzalanmış kısa ömürlü JWT.
  const renderUpload = await tryRenderMediaUploadAllTokens(env, origin, body, ctx, bearerToken);
  if (renderUpload?.ok) return renderUpload.response;
  if (renderUpload?.errorResponse) return renderUpload.errorResponse;
  if (renderUpload?.detail) uploadSteps.push(`render:${renderUpload.detail}`);

  return jsonResponse(502, {
    error: "Medya yüklenemedi",
    detail: uploadSteps.join("; ") || "Tüm yükleme yolları başarısız",
    hint:
      "Cloudflare Worker secret'larına Render'daki S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY ve HM_EDITOR_JWT_SECRET (veya aynı SESSION_SECRET) ekleyin. Render deploy tamamlanınca edge-upload da devreye girer.",
  });
}

async function tryRenderMediaUploadAllTokens(env, origin, body, ctx, clientBearer) {
  const tokens = [];
  if (clientBearer) tokens.push(clientBearer);
  for (const secret of collectJwtSecretStrings(env)) {
    try {
      const minted = await mintEditorJwtWithSecret(secret, ctx.editorId, ctx.siteId);
      if (!tokens.includes(minted)) tokens.push(minted);
    } catch (err) {
      console.error("[hm-editor-media-mint]", String(err?.message || err).slice(0, 120));
    }
  }
  if (!tokens.length) {
    return { detail: "no-jwt-secrets" };
  }

  let lastStatus = 0;
  let lastDetail = "";
  for (const token of tokens) {
    let upstream;
    try {
      upstream = await fetch(`${origin}/api/media/upload`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataUrl: body?.dataUrl,
          ...(typeof body?.title === "string" ? { title: body.title } : {}),
        }),
      });
    } catch (err) {
      lastDetail = String(err?.message || err).slice(0, 160);
      continue;
    }
    lastStatus = upstream.status;
    if (upstream.ok) {
      const response = await parseRenderMediaJsonResponse(upstream, "cloudflare-editor-media-jwt");
      if (response) return { ok: true, response };
    }
    const text = await upstream.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith("<")) {
      try {
        const parsed = JSON.parse(trimmed);
        lastDetail = String(parsed.error || parsed.detail || `HTTP ${upstream.status}`).slice(0, 160);
        // 400/500 JSON — kullanıcıya göster (401 ise sonraki secret dene)
        if (upstream.status !== 401) {
          const errorResponse = await parseRenderMediaJsonResponse(
            new Response(trimmed, { status: upstream.status, headers: { "content-type": "application/json" } }),
            "cloudflare-editor-media-jwt",
          );
          if (errorResponse) return { errorResponse };
        }
      } catch {
        lastDetail = trimmed.slice(0, 160);
      }
    } else {
      lastDetail = `html-${upstream.status}`;
    }
  }
  return { detail: lastDetail || `http-${lastStatus || "fail"}` };
}

async function fetchRenderMediaBridgeUpload(env, sql, ctx, editor, body, dataUrl, origin) {
  const siteRows = await sql`
    SELECT slug FROM hm_news_sites WHERE id = ${ctx.siteId} LIMIT 1
  `;
  const siteSlug = String(siteRows?.[0]?.slug || "").trim();
  const secret = edgeBridgeSecret(env);
  if (!secret) return { detail: "bridge-secret-missing" };

  const payload = {
    email: String(editor.email || "")
      .trim()
      .toLowerCase(),
    siteId: ctx.siteId,
    siteSlug,
    exp: Date.now() + 90_000,
    nonce: crypto.randomUUID(),
    dataUrlSha256: await sha256HexUtf8(dataUrl),
    dataUrl,
    title: typeof body?.title === "string" ? body.title : undefined,
  };

  let sig;
  try {
    sig = await hmacSha256Base64Url(secret, mediaBridgeCanonical(payload));
  } catch (err) {
    return { detail: String(err?.message || err).slice(0, 120) };
  }

  const paths = ["/api/media/upload", "/api/media/edge-upload"];
  let lastDetail = "";
  for (const path of paths) {
    let upstream;
    try {
      upstream = await fetch(`${origin}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-yekpare-hm-edge-bridge": sig,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      lastDetail = String(err?.message || err).slice(0, 120);
      continue;
    }
    if (upstream.ok) {
      const response = await parseRenderMediaJsonResponse(upstream, "cloudflare-editor-media-bridge");
      if (response) return { ok: true, response };
    }
    const text = await upstream.text();
    if (!text.trim().startsWith("<")) {
      lastDetail = `json-${upstream.status}`;
      if (upstream.status !== 404) {
        const response = await parseRenderMediaJsonResponse(
          new Response(text, { status: upstream.status, headers: { "content-type": "application/json" } }),
          "cloudflare-editor-media-bridge",
        );
        if (response && upstream.status !== 401) return { ok: false, response, detail: lastDetail };
      }
    } else {
      lastDetail = `html-${upstream.status}`;
    }
  }
  return { detail: lastDetail || "bridge-failed" };
}

async function parseRenderMediaJsonResponse(upstream, frontendTag) {
  const text = await upstream.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    console.error(
      `[hm-editor-media-upstream] html HTTP ${upstream.status}`,
      trimmed.slice(0, 120),
    );
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    console.error("[hm-editor-media-upstream] invalid json", trimmed.slice(0, 120));
    return null;
  }
  const outHeaders = new Headers();
  outHeaders.set("content-type", "application/json; charset=utf-8");
  outHeaders.set("x-yekpare-frontend", frontendTag);
  outHeaders.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  return new Response(JSON.stringify(parsed), { status: upstream.status, headers: outHeaders });
}

function mediaBridgeCanonical(payload) {
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const siteId = String(Number(payload.siteId) || 0);
  const siteSlug = String(payload.siteSlug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const exp = String(Number(payload.exp) || 0);
  const nonce = String(payload.nonce || "");
  const dataUrlSha256 = String(payload.dataUrlSha256 || "")
    .trim()
    .toLowerCase();
  return [email, siteId, siteSlug, exp, nonce, dataUrlSha256].join("\n");
}

async function sha256HexUtf8(raw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(raw ?? "")));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** @deprecated — login kenarda; geriye dönük no-op. */
export async function rewriteEditorLoginForUsername(request) {
  return request;
}

/** @deprecated — GET /me kenarda. */
export async function enrichEditorMeResponse() {
  return null;
}
