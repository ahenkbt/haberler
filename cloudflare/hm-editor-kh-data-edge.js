/**
 * Kırşehir (kh) editör veri API — kenar JWT + Neon.
 * Render secret ayrışınca Bearer 401 olmasın diye Worker'da karşılanır.
 * Diğer siteler: null → Render proxy.
 */
import { neon } from "@neondatabase/serverless";

const JWT_TYP = "hm_editor";
const KH_HOSTS = new Set(["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"]);

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-kh-editor-data-edge",
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

function asPositiveInt(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

async function parseEditorJwt(request, env) {
  const { jwtVerify } = await import("jose");
  const h = String(request.headers.get("authorization") || "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const key = jwtSecretBytes(env);
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const editorId = asPositiveInt(payload?.eid);
    const siteId = asPositiveInt(payload?.sid);
    if (payload?.typ !== JWT_TYP || editorId == null || siteId == null) return null;
    return { editorId, siteId };
  } catch {
    return null;
  }
}

function normalizeHost(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "") ?? "";
}

async function isKhSite(sql, siteId) {
  const rows = await sql`
    SELECT slug, domain, domain2, domain3 FROM hm_news_sites WHERE id = ${siteId} LIMIT 1
  `;
  const s = rows?.[0];
  if (!s) return false;
  const slug = String(s.slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (slug === "kh" || slug === "kirsehir") return true;
  for (const d of [s.domain, s.domain2, s.domain3]) {
    if (KH_HOSTS.has(normalizeHost(d))) return true;
  }
  return false;
}

async function loadActiveEditor(sql, editorId, siteId) {
  const rows = await sql`
    SELECT id, site_id, email FROM hm_site_editors
    WHERE id = ${editorId} AND site_id = ${siteId} AND is_active = true
    LIMIT 1
  `;
  return rows?.[0] || null;
}

function apiOrigin(env) {
  return String(env?.API_ORIGIN || "https://goalgo-y7ze.onrender.com").replace(/\/+$/, "");
}

/** Render'daki KH yazarlarını Neon'a id koruyarak çeker. */
export async function syncKhAuthorsFromRender(env, siteId) {
  const sql = sqlClient(env);
  if (!sql || !siteId) return { ok: false, synced: 0 };
  try {
    const res = await fetch(`${apiOrigin(env)}/api/authors?hmSiteId=${encodeURIComponent(String(siteId))}`, {
      headers: { Accept: "application/json", "User-Agent": "yekpare-kh-sync/1" },
    });
    if (!res.ok) return { ok: false, synced: 0, status: res.status };
    const authors = await res.json();
    if (!Array.isArray(authors)) return { ok: false, synced: 0 };
    let n = 0;
    for (const a of authors) {
      const id = asPositiveInt(a.id);
      if (id == null) continue;
      const name = String(a.name || "").trim() || "Yazar";
      const title = a.title != null ? String(a.title) : null;
      const avatar = a.avatarUrl != null ? String(a.avatarUrl) : null;
      const bio = a.bio != null ? String(a.bio) : null;
      const email = a.email != null ? String(a.email).trim().toLowerCase() : null;
      const sort = Number.isFinite(Number(a.hmSortOrder)) ? Number(a.hmSortOrder) : null;
      await sql`
        INSERT INTO authors (id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email)
        VALUES (${id}, ${name}, ${title}, ${avatar}, ${bio}, ${siteId}, ${sort}, ${email})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          title = EXCLUDED.title,
          avatar_url = EXCLUDED.avatar_url,
          bio = EXCLUDED.bio,
          hm_site_id = ${siteId},
          hm_sort_order = COALESCE(EXCLUDED.hm_sort_order, authors.hm_sort_order),
          email = COALESCE(EXCLUDED.email, authors.email)
      `;
      n += 1;
    }
    try {
      await sql`SELECT setval(pg_get_serial_sequence('authors', 'id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM authors), 1))`;
    } catch {
      /* sequence yoksa yoksay */
    }
    return { ok: true, synced: n };
  } catch (err) {
    console.error("[kh-author-sync]", String(err?.message || err).slice(0, 200));
    return { ok: false, synced: 0 };
  }
}

function serializeAuthor(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? null,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    hmSiteId: row.hm_site_id ?? null,
    hmSortOrder: row.hm_sort_order ?? null,
    email: row.email ?? null,
  };
}

function serializeNewsRow(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    spot: row.spot ?? null,
    content: row.content ?? null,
    imageUrl: row.image_url ?? null,
    categoryId: row.category_id ?? null,
    authorId: row.author_id ?? null,
    status: row.status,
    isFeatured: row.is_featured === true,
    isSiteManset: row.is_site_manset === true,
    isBreaking: row.is_breaking === true,
    views: row.views ?? 0,
    siteId: row.site_id ?? null,
    isEditorManual: row.is_editor_manual === true,
    siteOnly: row.site_only === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handleAuthorsList(sql, siteId) {
  const rows = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    FROM authors
    WHERE hm_site_id = ${siteId}
    ORDER BY COALESCE(hm_sort_order, 2147483647) ASC, id ASC
  `;
  return jsonResponse(200, (rows || []).map(serializeAuthor));
}

async function handleBulkDelete(sql, siteId, body) {
  const ids = Array.isArray(body?.ids)
    ? Array.from(
        new Set(
          body.ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0),
        ),
      )
    : [];
  if (!ids.length) return jsonResponse(400, { error: "Silinecek yazar seçilmedi." });

  const selected = await sql`
    SELECT id, name, hm_site_id FROM authors WHERE id = ANY(${ids})
  `;
  const nameKeys = new Set();
  for (const row of selected || []) {
    const key = String(row.name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("tr-TR");
    if (key) nameKeys.add(key);
  }
  const ownedById = new Set(
    (selected || []).filter((r) => Number(r.hm_site_id) === Number(siteId)).map((r) => r.id),
  );
  const foreignIds = ids.filter((id) => !ownedById.has(id));

  const localAuthors = await sql`
    SELECT id, name FROM authors WHERE hm_site_id = ${siteId}
  `;
  const cloneIds = (localAuthors || [])
    .filter((a) => {
      const key = String(a.name || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("tr-TR");
      return key && nameKeys.has(key);
    })
    .map((a) => a.id);

  const ownedIds = Array.from(new Set([...ownedById, ...cloneIds]));
  const contentAuthorIds = Array.from(new Set([...ids, ...ownedIds]));

  if (contentAuthorIds.length) {
    await sql`
      DELETE FROM hm_makaleler
      WHERE site_id = ${siteId} AND author_id = ANY(${contentAuthorIds})
    `;
    await sql`
      UPDATE news SET author_id = NULL
      WHERE site_id = ${siteId} AND author_id = ANY(${contentAuthorIds})
    `;
  }
  if (ownedIds.length) {
    await sql`
      DELETE FROM authors WHERE hm_site_id = ${siteId} AND id = ANY(${ownedIds})
    `;
  }
  return jsonResponse(200, { ok: true, deleted: ownedIds.length, detached: foreignIds.length });
}

async function handlePoolAuthors(sql, siteId, url) {
  const q = String(url.searchParams.get("q") || "")
    .trim()
    .toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit") || 80) || 80, 200);
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = await sql`
      SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
      FROM authors
      WHERE hm_site_id IS DISTINCT FROM ${siteId}
        AND (
          lower(coalesce(name,'')) LIKE ${like}
          OR lower(coalesce(email,'')) LIKE ${like}
          OR lower(coalesce(title,'')) LIKE ${like}
        )
      ORDER BY id DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
      FROM authors
      WHERE hm_site_id IS DISTINCT FROM ${siteId}
      ORDER BY id DESC
      LIMIT ${limit}
    `;
  }
  return jsonResponse(200, { items: (rows || []).map(serializeAuthor) });
}

function mapPublicNewsItemToEditor(item, siteId) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    spot: item.spot ?? null,
    content: item.content ?? null,
    imageUrl: item.imageUrl ?? item.image_url ?? null,
    categoryId: item.categoryId ?? item.category_id ?? null,
    categorySlug: item.categorySlug ?? item.category_slug ?? null,
    authorId: item.authorId ?? item.author_id ?? null,
    status: item.status || "published",
    isFeatured: item.isFeatured === true || item.is_featured === true,
    isSiteManset: item.isSiteManset === true || item.is_site_manset === true,
    isBreaking: item.isBreaking === true || item.is_breaking === true,
    views: item.views ?? 0,
    siteId: item.siteId ?? item.site_id ?? siteId,
    isEditorManual: item.isEditorManual === true || item.is_editor_manual === true,
    siteOnly: item.siteOnly === true || item.site_only === true,
    rssSourceUrl: item.rssSourceUrl ?? item.rss_source_url ?? null,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  };
}

/** Sitede görünen hibrit/RSS akışını editör Haberler listesine yansıt (Neon boşken). */
async function fetchKhPublicNewsForEditor(env, siteId, limit, offset) {
  try {
    const qs = new URLSearchParams({
      siteId: String(siteId),
      limit: String(limit),
      offset: String(offset),
      includeHiddenCategories: "1",
    });
    const res = await fetch(`${apiOrigin(env)}/api/news?${qs.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "yekpare-kh-editor-news/1" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return {
      items: items.map((item) => mapPublicNewsItemToEditor(item, siteId)),
      total: Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length,
      source: "public-hybrid",
    };
  } catch (err) {
    console.error("[kh-editor-news-public]", String(err?.message || err).slice(0, 200));
    return null;
  }
}

async function handleEditorNews(sql, siteId, url, env) {
  const limit = Math.min(Number(url.searchParams.get("limit") || 200) || 200, 500);
  const offset = Number(url.searchParams.get("offset") || 0) || 0;
  const submitted =
    url.searchParams.get("submitted") === "1" || url.searchParams.get("submitted") === "true";
  let rows;
  let countRows;
  if (submitted) {
    rows = await sql`
      SELECT * FROM news
      WHERE site_id = ${siteId}
        AND (sender_full_name IS NOT NULL OR sender_email IS NOT NULL OR sender_phone IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`
      SELECT count(*)::int AS count FROM news
      WHERE site_id = ${siteId}
        AND (sender_full_name IS NOT NULL OR sender_email IS NOT NULL OR sender_phone IS NOT NULL)
    `;
    return jsonResponse(200, {
      items: (rows || []).map(serializeNewsRow),
      total: countRows?.[0]?.count ?? 0,
    });
  }

  rows = await sql`
    SELECT * FROM news
    WHERE site_id = ${siteId}
       OR (site_only = true AND owner_site_id = ${siteId})
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  countRows = await sql`
    SELECT count(*)::int AS count FROM news
    WHERE site_id = ${siteId}
       OR (site_only = true AND owner_site_id = ${siteId})
  `;
  const neonTotal = countRows?.[0]?.count ?? 0;
  if (neonTotal > 0) {
    return jsonResponse(200, {
      items: (rows || []).map(serializeNewsRow),
      total: neonTotal,
      source: "neon",
    });
  }

  // Neon'da siteye ait satır yok — sitedeki hibrit/RSS akışını göster (kullanıcı boş liste görmesin).
  const pub = await fetchKhPublicNewsForEditor(env, siteId, limit, offset);
  if (pub) return jsonResponse(200, pub);
  return jsonResponse(200, { items: [], total: 0, source: "neon-empty" });
}

async function handleEditorMakale(sql, siteId, url) {
  const limit = Math.min(Number(url.searchParams.get("limit") || 200) || 200, 500);
  const rows = await sql`
    SELECT * FROM hm_makaleler
    WHERE site_id = ${siteId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  const items = (rows || []).map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    spot: r.spot ?? null,
    content: r.content ?? null,
    imageUrl: r.image_url ?? null,
    authorId: r.author_id ?? null,
    status: r.status,
    views: r.views ?? 0,
    siteId: r.site_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    kind: "makale",
  }));
  return jsonResponse(200, { items, total: items.length });
}

/**
 * @returns {Promise<Response|null>}
 */
export async function handleKhEditorDataEdge(request, env, incomingUrl) {
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  // Public authors list for KH — Neon (silme sonrası tutarlı liste)
  if (path === "/api/authors" && method === "GET") {
    const hmSiteId = asPositiveInt(incomingUrl.searchParams.get("hmSiteId"));
    if (!hmSiteId) return null;
    const sql = sqlClient(env);
    if (!sql) return null;
    if (!(await isKhSite(sql, hmSiteId))) return null;
    return handleAuthorsList(sql, hmSiteId);
  }

  if (!path.startsWith("/api/hm/editor/")) return null;

  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    if (auth.startsWith("Bearer ")) return null; // Render JWT
    return null;
  }

  const sql = sqlClient(env);
  if (!sql) return null;
  if (!(await isKhSite(sql, ctx.siteId))) return null;

  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  if (!editor) return jsonResponse(401, { error: "Geçersiz oturum" });

  // Yazarları Render'dan otomatik senkron ETME — silinen köşe yazarlarını geri getiriyordu.
  // (İlk kurulum için syncKhAuthorsFromRender manuel / tek seferlik kullanılabilir.)

  if (path === "/api/hm/editor/authors/bulk-delete" && method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    return handleBulkDelete(sql, ctx.siteId, body);
  }

  if (path === "/api/hm/editor/pool/authors" && method === "GET") {
    return handlePoolAuthors(sql, ctx.siteId, incomingUrl);
  }

  if (path === "/api/hm/editor/news" && method === "GET") {
    return handleEditorNews(sql, ctx.siteId, incomingUrl, env);
  }

  if (path === "/api/hm/editor/makale" && method === "GET") {
    return handleEditorMakale(sql, ctx.siteId, incomingUrl);
  }

  if (path === "/api/hm/editor/authors/order" && method === "PATCH") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const ids = Array.isArray(body.ids)
      ? body.ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    if (!ids.length) return jsonResponse(400, { error: "Yazar sırası için ids gerekli." });
    let order = 0;
    for (const id of ids) {
      await sql`
        UPDATE authors SET hm_sort_order = ${order}
        WHERE id = ${id} AND hm_site_id = ${ctx.siteId}
      `;
      order += 1;
    }
    return jsonResponse(200, { ok: true });
  }

  return null;
}
