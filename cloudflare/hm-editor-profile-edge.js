/**
 * Render API geride kaldığında Worker kenarında:
 * - kullanıcı adı ile giriş (login gövdesini e-postaya çevir)
 * - PATCH /api/hm/editor/me (+ password)
 * - GET /me yanıtına username ekle
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";

const JWT_TYP = "hm_editor";

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
      "x-yekpare-frontend": "cloudflare-editor-profile-edge",
    },
  });
}

function sqlClient(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return null;
  return neon(dbUrl);
}

async function ensureUsernameColumn(sql) {
  try {
    await sql`ALTER TABLE hm_site_editors ADD COLUMN IF NOT EXISTS username text`;
  } catch {
    /* ignore */
  }
}

async function parseEditorJwt(request, env) {
  const h = String(request.headers.get("authorization") || "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const secret = String(env?.HM_EDITOR_JWT_SECRET || env?.SESSION_SECRET || "").trim();
  if (!secret) return null;
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    if (payload?.typ !== JWT_TYP || typeof payload.eid !== "number" || typeof payload.sid !== "number") {
      return null;
    }
    return { editorId: payload.eid, siteId: payload.sid };
  } catch {
    return null;
  }
}

async function resolveSiteIdByHost(sql, host) {
  const h = normalizeHost(host);
  if (!h) return null;
  const rows = await sql`
    SELECT id FROM hm_news_sites
    WHERE is_active = true
      AND (
        lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', '')) = ${h}
        OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', '')) = ${h}
        OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', '')) = ${h}
      )
    ORDER BY id ASC
    LIMIT 1
  `;
  return rows?.[0]?.id ?? null;
}

/** Kullanıcı adı girildiyse login gövdesini e-postaya çevir; Request döner. */
export async function rewriteEditorLoginForUsername(request, env, incomingUrl) {
  if (request.method !== "POST") return request;
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  if (path !== "/api/hm/editor/login") return request;

  let body;
  try {
    body = await request.clone().json();
  } catch {
    return request;
  }
  if (!body || typeof body !== "object") return request;

  const loginRaw = String(body.login ?? body.email ?? body.username ?? "")
    .trim()
    .toLowerCase();
  if (!loginRaw || loginRaw.includes("@")) return request;

  const username = normalizeUsername(loginRaw);
  if (!username) return request;

  const sql = sqlClient(env);
  if (!sql) return request;

  try {
    await ensureUsernameColumn(sql);
    const host = normalizeHost(incomingUrl.hostname);
    const siteId = await resolveSiteIdByHost(sql, host);
    if (!siteId) return request;

    const rows = await sql`
      SELECT email FROM hm_site_editors
      WHERE site_id = ${siteId}
        AND is_active = true
        AND lower(coalesce(username, '')) = ${username}
      LIMIT 1
    `;
    const email = String(rows?.[0]?.email || "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) return request;

    const next = {
      ...body,
      login: email,
      email,
      username: undefined,
    };
    return new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(next),
      redirect: request.redirect,
    });
  } catch (err) {
    console.error("[hm-editor-login-username]", String(err?.message || err).slice(0, 200));
    return request;
  }
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

/** PATCH profil uçları — Response veya null. */
export async function handleHmEditorProfileEdge(request, env, incomingUrl) {
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  if (path === "/api/hm/editor/me" && method === "PATCH") {
    return patchEditorMe(request, env);
  }
  if (path === "/api/hm/editor/me/password" && method === "PATCH") {
    return patchEditorPassword(request, env);
  }
  return null;
}

/** Upstream GET /me 200 ise username alanını Neon'dan doldur. */
export async function enrichEditorMeResponse(request, env, incomingUrl, upstream) {
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  if (path !== "/api/hm/editor/me" || request.method !== "GET") return null;
  if (!upstream || upstream.status !== 200) return null;

  const sql = sqlClient(env);
  if (!sql) return null;

  try {
    const ctx = await parseEditorJwt(request, env);
    if (!ctx) return null;
    await ensureUsernameColumn(sql);
    const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
    if (!editor) return null;

    const data = await upstream.clone().json();
    if (!data || typeof data !== "object") return null;
    const next = {
      ...data,
      editor: {
        ...(data.editor || {}),
        id: editor.id,
        email: editor.email,
        username: editor.username ?? null,
        displayName: editor.display_name ?? data.editor?.displayName ?? null,
      },
    };
    const headers = new Headers(upstream.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
    headers.set("cdn-cache-control", "no-store");
    headers.set("x-yekpare-editor-me", "username-enriched");
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(JSON.stringify(next), { status: 200, headers });
  } catch (err) {
    console.error("[hm-editor-me-enrich]", String(err?.message || err).slice(0, 200));
    return null;
  }
}
