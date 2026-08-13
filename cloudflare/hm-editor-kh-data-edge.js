/**
 * HM editör veri API — kenar JWT + Neon.
 * Tanımsız rotalar: null → Worker Container vekili.
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { fetchApi, resolveApiOrigin } from "./api-upstream.js";

const JWT_TYP = "hm_editor";
const KH_HOSTS = new Set(["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"]);

const STANDARD_CATEGORIES = [
  { name: "Gündem", slug: "gundem", color: "#e61e25" },
  { name: "Dünya", slug: "dunya", color: "#2563eb" },
  { name: "Ekonomi", slug: "ekonomi", color: "#f97316" },
  { name: "Politika", slug: "politika", color: "#7c3aed" },
  { name: "Spor", slug: "spor", color: "#16a34a" },
  { name: "Teknoloji", slug: "teknoloji", color: "#9333ea" },
];

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

function collectJwtSecretStrings(env) {
  const out = [];
  for (const raw of [env?.HM_EDITOR_JWT_SECRET, env?.SESSION_SECRET]) {
    const s = String(raw ?? "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

async function parseEditorJwt(request, env) {
  const { jwtVerify } = await import("jose");
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

function normalizeHost(raw) {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

function slugify(input) {
  const map = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  let s = String(input || "").trim();
  s = s.replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => map[ch] || ch);
  s = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return s || `haber-${Date.now().toString(36)}`;
}

/** Neon HTTP: JS dizisini tek text[] parametresi olarak güvenle bağla. */
function toPgTextArrayLiteral(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "{}";
  return `{${tags
    .map((t) => `"${String(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;
}

let newsColumnsEnsured = false;

/** Haber insert/update için eksik kolonları (özellikle news-cluster) tamamla. */
async function ensureNewsWritableColumns(sql) {
  if (newsColumnsEnsured || !sql) return;
  const stmts = [
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS sender_full_name text",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS sender_email text",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS sender_phone text",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS is_site_manset boolean NOT NULL DEFAULT false",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS is_editor_manual boolean NOT NULL DEFAULT false",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS site_only boolean NOT NULL DEFAULT false",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS owner_site_id integer",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS is_food_recipe boolean NOT NULL DEFAULT false",
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS food_recipe_category_slug text",
  ];
  for (const q of stmts) {
    try {
      await sql.query(q);
    } catch (err) {
      console.error("[kh-news-ensure-col]", String(err?.message || err).slice(0, 140));
    }
  }
  newsColumnsEnsured = true;
}

function createFailResponse(detail) {
  const d = String(detail || "").trim().slice(0, 180);
  return jsonResponse(500, {
    error: d ? `Kayıt oluşturulamadı: ${d}` : "Kayıt oluşturulamadı",
    detail: d || undefined,
  });
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
  if (slug === "kirsehirhaber" || slug === "kh" || slug === "kirsehir") return true;
  for (const d of [s.domain, s.domain2, s.domain3]) {
    if (KH_HOSTS.has(normalizeHost(d))) return true;
  }
  return false;
}

async function isHmNewsSite(sql, siteId) {
  const rows = await sql`SELECT id FROM hm_news_sites WHERE id = ${siteId} LIMIT 1`;
  return Boolean(rows?.[0]?.id);
}

let authorsSortColumnEnsured = false;

async function ensureAuthorsSortOrderColumn(sql) {
  if (authorsSortColumnEnsured || !sql) return;
  try {
    await sql.query("ALTER TABLE authors ADD COLUMN IF NOT EXISTS hm_sort_order INTEGER");
  } catch (err) {
    console.error("[hm-authors-ensure-col]", String(err?.message || err).slice(0, 140));
  }
  authorsSortColumnEnsured = true;
}

function makeHmCopySlug(base, targetSiteId, sourceId) {
  const raw = String(base ?? "haber")
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${raw || "haber"}-hm${targetSiteId}-src${sourceId}`;
}

async function loadActiveEditor(sql, editorId, siteId) {
  const rows = await sql`
    SELECT id, site_id, email FROM hm_site_editors
    WHERE id = ${editorId} AND site_id = ${siteId} AND is_active = true
    LIMIT 1
  `;
  return rows?.[0] || null;
}

function apiOrigin(env, incoming) {
  return resolveApiOrigin(env, incoming?.origin);
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

function serializeNewsRow(row, categorySlug = null) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    spot: row.spot ?? null,
    content: row.content ?? null,
    imageUrl: row.image_url ?? null,
    categoryId: row.category_id ?? null,
    categorySlug: categorySlug ?? row.category_slug ?? null,
    authorId: row.author_id ?? null,
    status: row.status,
    isFeatured: row.is_featured === true,
    isSiteManset: row.is_site_manset === true,
    isBreaking: row.is_breaking === true,
    views: row.views ?? 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    siteId: row.site_id ?? null,
    isEditorManual: row.is_editor_manual === true,
    siteOnly: row.site_only === true,
    ownerSiteId: row.owner_site_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureStandardCategories(sql) {
  for (const std of STANDARD_CATEGORIES) {
    try {
      await sql`
        INSERT INTO categories (name, slug, color, exclusive_site_id, sort_order)
        VALUES (${std.name}, ${std.slug}, ${std.color}, NULL, 0)
        ON CONFLICT (slug) DO NOTHING
      `;
    } catch (err) {
      console.error("[kh-cat-ensure]", std.slug, String(err?.message || err).slice(0, 120));
    }
  }
}

async function handleCategories(sql, siteId) {
  await ensureStandardCategories(sql);
  const rows = await sql`
    SELECT id, name, slug, color, exclusive_site_id, sort_order
    FROM categories
    WHERE exclusive_site_id IS NULL OR exclusive_site_id = ${siteId}
    ORDER BY sort_order ASC, id ASC
  `;
  const out = (rows || []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    color: r.color || "#e61e25",
    exclusiveSiteId: r.exclusive_site_id ?? null,
    sortOrder: r.sort_order ?? 0,
    newsCount: 0,
  }));
  if (out.length === 0) {
    return jsonResponse(
      200,
      STANDARD_CATEGORIES.map((c, i) => ({
        id: -(i + 1),
        name: c.name,
        slug: c.slug,
        color: c.color,
        exclusiveSiteId: null,
        sortOrder: i,
        newsCount: 0,
      })),
    );
  }
  return jsonResponse(200, out);
}

async function resolveCategoryId(sql, siteId, categorySlug) {
  const slug = String(categorySlug || "")
    .trim()
    .toLowerCase();
  if (!slug) return null;
  await ensureStandardCategories(sql);
  const rows = await sql`
    SELECT id FROM categories
    WHERE lower(slug) = ${slug}
      AND (exclusive_site_id IS NULL OR exclusive_site_id = ${siteId})
    ORDER BY CASE WHEN exclusive_site_id = ${siteId} THEN 0 ELSE 1 END, id ASC
    LIMIT 1
  `;
  return rows?.[0]?.id ?? null;
}

async function loadNewsWithCategory(sql, siteId, id) {
  await ensureNewsWritableColumns(sql);
  try {
    const rows = await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE n.id = ${id}
        AND (
          n.site_id = ${siteId}
          OR (n.site_only = true AND n.owner_site_id = ${siteId})
        )
      LIMIT 1
    `;
    return rows?.[0] || null;
  } catch (err) {
    console.error("[kh-news-load]", String(err?.message || err).slice(0, 160));
    const rows = await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE n.id = ${id} AND n.site_id = ${siteId}
      LIMIT 1
    `;
    return rows?.[0] || null;
  }
}

async function handleAuthorsList(sql, siteId) {
  await ensureAuthorsSortOrderColumn(sql);
  const rows = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    FROM authors
    WHERE hm_site_id = ${siteId}
    ORDER BY COALESCE(hm_sort_order, 2147483647) ASC, id ASC
  `;
  return jsonResponse(200, (rows || []).map(serializeAuthor));
}

async function handleCreateAuthor(sql, siteId, body) {
  await ensureAuthorsSortOrderColumn(sql);
  const name = String(body?.name ?? "").trim();
  if (!name) return jsonResponse(400, { error: "Yazar adı gerekli" });

  const emailRaw = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const passwordRaw = String(body?.password ?? "");
  if ((emailRaw && !passwordRaw) || (!emailRaw && passwordRaw)) {
    return jsonResponse(400, { error: "E-posta ve şifre birlikte girilmeli (veya ikisi de boş)." });
  }
  if (emailRaw && passwordRaw.length < 8) {
    return jsonResponse(400, { error: "Şifre en az 8 karakter olmalı." });
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return jsonResponse(400, { error: "Geçerli e-posta girin." });
  }

  const title = String(body?.title ?? "").trim() || null;
  const avatarUrl = String(body?.avatarUrl ?? "").trim() || null;
  const bio = String(body?.bio ?? "").trim() || null;
  const passwordHash = emailRaw ? await bcrypt.hash(passwordRaw, 10) : null;
  const normalizedName = name.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");

  const existingName = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    FROM authors
    WHERE hm_site_id = ${siteId}
      AND lower(regexp_replace(btrim(name), '\\s+', ' ', 'g')) = ${normalizedName}
    LIMIT 1
  `;
  if (existingName?.[0]) {
    return jsonResponse(200, serializeAuthor(existingName[0]));
  }

  try {
    const maxRows = await sql`
      SELECT coalesce(max(hm_sort_order), 0)::int AS m
      FROM authors
      WHERE hm_site_id = ${siteId}
    `;
    const nextSort = (maxRows?.[0]?.m ?? 0) + 1;
    const rows = await sql`
      INSERT INTO authors (name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash)
      VALUES (${name}, ${title}, ${avatarUrl}, ${bio}, ${siteId}, ${nextSort}, ${emailRaw || null}, ${passwordHash})
      RETURNING id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    `;
    const row = rows?.[0];
    if (!row) return jsonResponse(500, { error: "Yazar oluşturulamadı" });
    return jsonResponse(201, serializeAuthor(row));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "23505") {
      return jsonResponse(409, { error: "Bu e-posta bu haber sitesinde zaten kayıtlı." });
    }
    console.error("[hm-author-create]", String(err?.message || err).slice(0, 200));
    return jsonResponse(500, { error: "Yazar oluşturulamadı" });
  }
}

async function handleUpdateAuthor(sql, siteId, id, body) {
  await ensureAuthorsSortOrderColumn(sql);
  const existingRows = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash
    FROM authors
    WHERE id = ${id}
    LIMIT 1
  `;
  const existing = existingRows?.[0];
  if (!existing || existing.hm_site_id !== siteId) {
    return jsonResponse(404, { error: "Yazar bulunamadı" });
  }

  const name = String(body?.name ?? "").trim();
  if (!name) return jsonResponse(400, { error: "Yazar adı gerekli" });

  const title = String(body?.title ?? "").trim() || null;
  const avatarUrl = String(body?.avatarUrl ?? "").trim() || null;
  const bio = String(body?.bio ?? "").trim() || null;
  const emailRaw = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const passwordRaw = String(body?.password ?? "");
  const prevEmail = String(existing.email ?? "")
    .trim()
    .toLowerCase();

  let nextEmail = existing.email;
  let nextHash = existing.password_hash;

  if (passwordRaw.length > 0) {
    if (passwordRaw.length < 8) {
      return jsonResponse(400, { error: "Şifre en az 8 karakter olmalı." });
    }
    const mailToUse = emailRaw || prevEmail;
    if (!mailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailToUse)) {
      return jsonResponse(400, { error: "Geçerli e-posta girin (şifre değişimi için)." });
    }
    const dup = await sql`
      SELECT id FROM authors
      WHERE hm_site_id = ${siteId} AND email = ${mailToUse} AND id <> ${id}
      LIMIT 1
    `;
    if (dup?.[0]) {
      return jsonResponse(409, { error: "Bu e-posta bu haber sitesinde başka bir yazara ait." });
    }
    nextEmail = mailToUse;
    nextHash = await bcrypt.hash(passwordRaw, 10);
  } else if (emailRaw && emailRaw !== prevEmail) {
    return jsonResponse(400, {
      error: "E-posta değiştirmek için yeni şifre girin (veya şifreyi boş bırakıp e-postayı olduğu gibi bırakın).",
    });
  }

  try {
    const rows = await sql`
      UPDATE authors
      SET name = ${name},
          title = ${title},
          avatar_url = ${avatarUrl},
          bio = ${bio},
          email = ${nextEmail},
          password_hash = ${nextHash}
      WHERE id = ${id} AND hm_site_id = ${siteId}
      RETURNING id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    `;
    const row = rows?.[0];
    if (!row) return jsonResponse(404, { error: "Yazar bulunamadı" });
    return jsonResponse(200, serializeAuthor(row));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "23505") {
      return jsonResponse(409, { error: "Bu e-posta bu haber sitesinde zaten kayıtlı." });
    }
    console.error("[hm-author-update]", String(err?.message || err).slice(0, 200));
    return jsonResponse(500, { error: "Yazar güncellenemedi" });
  }
}

async function handlePoolAuthorPublish(sql, siteId, sourceId) {
  await ensureAuthorsSortOrderColumn(sql);
  const sourceRows = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id
    FROM authors
    WHERE id = ${sourceId}
    LIMIT 1
  `;
  const source = sourceRows?.[0];
  if (!source || source.hm_site_id == null || source.hm_site_id === siteId) {
    return jsonResponse(404, { error: "Havuz yazarı bulunamadı" });
  }

  const normalizedName = String(source.name ?? "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
  let targetRows = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    FROM authors
    WHERE hm_site_id = ${siteId}
      AND lower(regexp_replace(btrim(name), '\\s+', ' ', 'g')) = ${normalizedName}
    LIMIT 1
  `;
  let targetAuthor = targetRows?.[0];

  if (!targetAuthor) {
    const maxRows = await sql`
      SELECT coalesce(max(hm_sort_order), 0)::int AS m
      FROM authors
      WHERE hm_site_id = ${siteId}
    `;
    const nextSort = (maxRows?.[0]?.m ?? 0) + 1;
    const inserted = await sql`
      INSERT INTO authors (name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash)
      VALUES (${source.name}, ${source.title ?? null}, ${source.avatar_url ?? null}, ${source.bio ?? null}, ${siteId}, ${nextSort}, NULL, NULL)
      RETURNING id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    `;
    targetAuthor = inserted?.[0];
  }

  if (!targetAuthor) {
    return jsonResponse(500, { error: "Yazar kopyalanamadı" });
  }

  const sourcePosts = await sql`
    SELECT id, title, slug, spot, content, image_url
    FROM hm_makaleler
    WHERE site_id = ${source.hm_site_id}
      AND author_id = ${source.id}
      AND status = 'published'
    ORDER BY created_at ASC
    LIMIT 500
  `;

  let copied = 0;
  for (const post of sourcePosts || []) {
    const slug = makeHmCopySlug(post.slug || post.title, siteId, post.id);
    const exists = await sql`
      SELECT id FROM hm_makaleler
      WHERE site_id = ${siteId} AND slug = ${slug}
      LIMIT 1
    `;
    if (exists?.[0]) continue;
    await sql`
      INSERT INTO hm_makaleler (site_id, author_id, title, slug, spot, content, image_url, status, created_at, updated_at)
      VALUES (${siteId}, ${targetAuthor.id}, ${post.title}, ${slug}, ${post.spot ?? null}, ${post.content ?? null}, ${post.image_url ?? null}, 'published', NOW(), NOW())
    `;
    copied += 1;
  }

  return jsonResponse(201, { author: serializeAuthor(targetAuthor), copied });
}

/** Neon ANY(array) güvenilir değil — satır satır sil. */
async function handleBulkDelete(sql, siteId, body) {
  const clearAll = body?.all === true || body?.clearAll === true;
  let ownedIds = [];

  if (clearAll) {
    const all = await sql`SELECT id FROM authors WHERE hm_site_id = ${siteId}`;
    ownedIds = (all || []).map((r) => r.id);
  } else {
    const ids = Array.isArray(body?.ids)
      ? Array.from(
          new Set(
            body.ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0),
          ),
        )
      : [];
    if (!ids.length) return jsonResponse(400, { error: "Silinecek yazar seçilmedi." });

    const localAuthors = await sql`
      SELECT id, name FROM authors WHERE hm_site_id = ${siteId}
    `;
    const localById = new Map((localAuthors || []).map((a) => [a.id, a]));
    const nameKeys = new Set();
    for (const id of ids) {
      const row = localById.get(id);
      if (!row) continue;
      ownedIds.push(id);
      const key = String(row.name || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("tr-TR");
      if (key) nameKeys.add(key);
    }
    for (const a of localAuthors || []) {
      const key = String(a.name || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("tr-TR");
      if (key && nameKeys.has(key) && !ownedIds.includes(a.id)) ownedIds.push(a.id);
    }
  }

  ownedIds = Array.from(new Set(ownedIds));
  let deleted = 0;
  for (const id of ownedIds) {
    try {
      await sql`DELETE FROM hm_makaleler WHERE site_id = ${siteId} AND author_id = ${id}`;
    } catch {
      /* ignore */
    }
    try {
      await sql`UPDATE news SET author_id = NULL WHERE site_id = ${siteId} AND author_id = ${id}`;
    } catch {
      /* ignore */
    }
    const r = await sql`DELETE FROM authors WHERE hm_site_id = ${siteId} AND id = ${id} RETURNING id`;
    if (r?.length) deleted += 1;
  }
  return jsonResponse(200, { ok: true, deleted, detached: 0 });
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

async function fetchKhPublicNewsForEditor(env, siteId, limit, offset) {
  try {
    const qs = new URLSearchParams({
      siteId: String(siteId),
      limit: String(limit),
      offset: String(offset),
      includeHiddenCategories: "1",
    });
    const res = await fetchApi(env, `${apiOrigin(env)}/api/news?${qs.toString()}`, {
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
  const limit = Math.min(Number(url.searchParams.get("limit") || 500) || 500, 1000);
  const offset = Number(url.searchParams.get("offset") || 0) || 0;
  const submitted =
    url.searchParams.get("submitted") === "1" || url.searchParams.get("submitted") === "true";
  const q = String(url.searchParams.get("q") || "")
    .trim()
    .slice(0, 120)
    .replace(/[%_]/g, "");
  const categorySlug = String(url.searchParams.get("categorySlug") || "").trim();
  const like = q ? `%${q}%` : null;

  await ensureNewsWritableColumns(sql);

  try {
    if (submitted) {
      const rows = like
        ? await sql`
        SELECT n.*, c.slug AS category_slug
        FROM news n
        LEFT JOIN categories c ON c.id = n.category_id
        WHERE n.site_id = ${siteId}
          AND (n.sender_full_name IS NOT NULL OR n.sender_email IS NOT NULL OR n.sender_phone IS NOT NULL)
          AND (n.title ILIKE ${like} OR n.slug ILIKE ${like} OR COALESCE(n.spot, '') ILIKE ${like})
        ORDER BY n.updated_at DESC, n.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
        : await sql`
        SELECT n.*, c.slug AS category_slug
        FROM news n
        LEFT JOIN categories c ON c.id = n.category_id
        WHERE n.site_id = ${siteId}
          AND (n.sender_full_name IS NOT NULL OR n.sender_email IS NOT NULL OR n.sender_phone IS NOT NULL)
        ORDER BY n.updated_at DESC, n.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countRows = like
        ? await sql`
        SELECT count(*)::int AS count FROM news
        WHERE site_id = ${siteId}
          AND (sender_full_name IS NOT NULL OR sender_email IS NOT NULL OR sender_phone IS NOT NULL)
          AND (title ILIKE ${like} OR slug ILIKE ${like} OR COALESCE(spot, '') ILIKE ${like})
      `
        : await sql`
        SELECT count(*)::int AS count FROM news
        WHERE site_id = ${siteId}
          AND (sender_full_name IS NOT NULL OR sender_email IS NOT NULL OR sender_phone IS NOT NULL)
      `;
      return jsonResponse(200, {
        items: (rows || []).map((r) => serializeNewsRow(r, r.category_slug)),
        total: countRows?.[0]?.count ?? 0,
      });
    }

    let categoryId = null;
    if (categorySlug) {
      categoryId = await resolveCategoryId(sql, siteId, categorySlug);
      if (!categoryId) return jsonResponse(200, { items: [], total: 0, source: "neon" });
    }

    const rows = like
      ? categoryId
        ? await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE (n.site_id = ${siteId} OR (n.site_only = true AND n.owner_site_id = ${siteId}))
        AND n.category_id = ${categoryId}
        AND (n.title ILIKE ${like} OR n.slug ILIKE ${like} OR COALESCE(n.spot, '') ILIKE ${like})
      ORDER BY n.updated_at DESC, n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
        : await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE (n.site_id = ${siteId} OR (n.site_only = true AND n.owner_site_id = ${siteId}))
        AND (n.title ILIKE ${like} OR n.slug ILIKE ${like} OR COALESCE(n.spot, '') ILIKE ${like})
      ORDER BY n.updated_at DESC, n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
      : categoryId
        ? await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE (n.site_id = ${siteId} OR (n.site_only = true AND n.owner_site_id = ${siteId}))
        AND n.category_id = ${categoryId}
      ORDER BY n.updated_at DESC, n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
        : await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE n.site_id = ${siteId}
         OR (n.site_only = true AND n.owner_site_id = ${siteId})
      ORDER BY n.updated_at DESC, n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countRows = like
      ? categoryId
        ? await sql`
      SELECT count(*)::int AS count FROM news
      WHERE (site_id = ${siteId} OR (site_only = true AND owner_site_id = ${siteId}))
        AND category_id = ${categoryId}
        AND (title ILIKE ${like} OR slug ILIKE ${like} OR COALESCE(spot, '') ILIKE ${like})
    `
        : await sql`
      SELECT count(*)::int AS count FROM news
      WHERE (site_id = ${siteId} OR (site_only = true AND owner_site_id = ${siteId}))
        AND (title ILIKE ${like} OR slug ILIKE ${like} OR COALESCE(spot, '') ILIKE ${like})
    `
      : categoryId
        ? await sql`
      SELECT count(*)::int AS count FROM news
      WHERE (site_id = ${siteId} OR (site_only = true AND owner_site_id = ${siteId}))
        AND category_id = ${categoryId}
    `
        : await sql`
      SELECT count(*)::int AS count FROM news
      WHERE site_id = ${siteId}
         OR (site_only = true AND owner_site_id = ${siteId})
    `;
    const neonTotal = countRows?.[0]?.count ?? 0;
    if (neonTotal > 0 || like || categoryId) {
      const byId = new Map();
      for (const r of rows || []) {
        const id = Number(r.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        if (!byId.has(id)) byId.set(id, r);
      }
      const uniqueRows = Array.from(byId.values());
      return jsonResponse(200, {
        items: uniqueRows.map((r) => serializeNewsRow(r, r.category_slug)),
        total: neonTotal,
        source: "neon",
      });
    }
  } catch (err) {
    console.error("[kh-editor-news-list]", String(err?.message || err).slice(0, 200));
  }

  const pub = await fetchKhPublicNewsForEditor(env, siteId, limit, offset);
  if (pub) return jsonResponse(200, pub);
  return jsonResponse(200, { items: [], total: 0, source: "neon-empty" });
}

async function handleCreateNews(sql, siteId, body) {
  await ensureNewsWritableColumns(sql);

  const title = String(body?.title || "").trim();
  if (!title) return jsonResponse(400, { error: "Başlık gerekli" });
  const categorySlug = String(body?.categorySlug || "").trim();
  if (!categorySlug) return jsonResponse(400, { error: "Kategori gerekli" });
  const categoryId = await resolveCategoryId(sql, siteId, categorySlug);
  if (!categoryId) return jsonResponse(400, { error: "Kategori bulunamadı" });

  let slug = String(body?.slug || "").trim() || slugify(title);
  slug = slugify(slug);
  const status = String(body?.status || "published").trim() || "published";
  const tags = Array.isArray(body?.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const tagsLiteral = toPgTextArrayLiteral(tags);
  let authorId = asPositiveInt(body?.authorId);
  const imageUrl = body?.imageUrl != null ? String(body.imageUrl).trim() || null : null;
  const spot = body?.spot != null ? String(body.spot) : null;
  const content = body?.content != null ? String(body.content) : null;
  const isFeatured = body?.isFeatured === true;
  const isSiteManset = body?.isSiteManset === true;
  const isBreaking = body?.isBreaking === true;
  const senderFullName = body?.senderFullName != null ? String(body.senderFullName) : null;
  const senderEmail = body?.senderEmail != null ? String(body.senderEmail) : null;
  const senderPhone = body?.senderPhone != null ? String(body.senderPhone) : null;
  const isFoodRecipe = body?.isFoodRecipe === true;
  const foodRecipeCategorySlug = isFoodRecipe
    ? String(body?.foodRecipeCategorySlug || "")
        .trim()
        .toLowerCase() || null
    : null;

  // slug çakışırsa benzersizleştir; aynı slug zaten varsa idempotent dön (çift kayıt önleme)
  let lastErr = "";
  for (let i = 0; i < 8; i += 1) {
    const trySlug = i === 0 ? slug : `${slug}-${i + 1}`;
    try {
      const existing = await sql`
        SELECT n.*, c.slug AS category_slug
        FROM news n
        LEFT JOIN categories c ON c.id = n.category_id
        WHERE n.site_id = ${siteId}
          AND lower(trim(both '/' from n.slug)) = lower(trim(both '/' from ${trySlug}))
        ORDER BY n.id DESC
        LIMIT 1
      `;
      const hit = Array.isArray(existing) ? existing[0] : existing?.rows?.[0];
      if (hit) {
        return jsonResponse(200, serializeNewsRow(hit, hit.category_slug || categorySlug));
      }

      const rows = await sql`
        INSERT INTO news (
          title, slug, spot, content, image_url, category_id, author_id,
          sender_full_name, sender_email, sender_phone,
          status, is_featured, is_site_manset, is_breaking, tags,
          site_id, is_editor_manual, site_only, owner_site_id,
          is_food_recipe, food_recipe_category_slug,
          created_at, updated_at
        ) VALUES (
          ${title}, ${trySlug}, ${spot}, ${content}, ${imageUrl}, ${categoryId}, ${authorId},
          ${senderFullName}, ${senderEmail}, ${senderPhone},
          ${status}, ${isFeatured}, ${isSiteManset}, ${isBreaking}, ${tagsLiteral}::text[],
          ${siteId}, true, true, ${siteId},
          ${isFoodRecipe}, ${foodRecipeCategorySlug},
          NOW(), NOW()
        )
        RETURNING *
      `;
      const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
      if (!row) return createFailResponse("INSERT boş döndü");
      return jsonResponse(201, serializeNewsRow(row, categorySlug));
    } catch (err) {
      const msg = String(err?.message || err);
      lastErr = msg;
      // Silinmiş yazar FK'si — yazarsız tekrar dene
      if (/author_id|authors/i.test(msg) && /foreign key|violates/i.test(msg) && authorId != null) {
        authorId = null;
        i -= 1;
        continue;
      }
      if (/unique|duplicate/i.test(msg) && i < 7) continue;
      // Eksik kolon kalmış olabilir — ensure tekrar + sade INSERT
      if (/column .* does not exist/i.test(msg)) {
        newsColumnsEnsured = false;
        await ensureNewsWritableColumns(sql);
        try {
          const rows = await sql`
            INSERT INTO news (
              title, slug, spot, content, image_url, category_id, author_id,
              status, is_featured, is_breaking, tags,
              site_id, is_editor_manual, created_at, updated_at
            ) VALUES (
              ${title}, ${trySlug}, ${spot}, ${content}, ${imageUrl}, ${categoryId}, ${authorId},
              ${status}, ${isFeatured}, ${isBreaking}, ${tagsLiteral}::text[],
              ${siteId}, true, NOW(), NOW()
            )
            RETURNING *
          `;
          const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
          if (row) {
            // site_only / manşet bayraklarını mümkünse sonradan yaz
            try {
              await sql`
                UPDATE news SET
                  is_site_manset = ${isSiteManset},
                  is_breaking = ${isBreaking},
                  site_only = true,
                  owner_site_id = ${siteId},
                  updated_at = NOW()
                WHERE id = ${row.id}
              `;
            } catch {
              /* kolon yoksa yok say */
            }
            return jsonResponse(201, serializeNewsRow(row, categorySlug));
          }
        } catch (err2) {
          lastErr = String(err2?.message || err2);
        }
      }
      console.error("[kh-news-create]", msg.slice(0, 200));
      return createFailResponse(msg);
    }
  }
  return createFailResponse(lastErr || "slug çakışması");
}

async function handleUpdateNews(sql, siteId, id, body) {
  await ensureNewsWritableColumns(sql);
  const existing = await loadNewsWithCategory(sql, siteId, id);
  if (!existing) return jsonResponse(404, { error: "Haber bulunamadı" });

  const title = body?.title != null ? String(body.title).trim() : existing.title;
  if (!title) return jsonResponse(400, { error: "Başlık gerekli" });
  let categoryId = existing.category_id;
  let categorySlug = existing.category_slug;
  if (body?.categorySlug != null) {
    categorySlug = String(body.categorySlug).trim();
    categoryId = await resolveCategoryId(sql, siteId, categorySlug);
    if (!categoryId) return jsonResponse(400, { error: "Kategori bulunamadı" });
  }
  const slug =
    body?.slug != null && String(body.slug).trim()
      ? slugify(String(body.slug).trim())
      : existing.slug;
  const status = body?.status != null ? String(body.status).trim() : existing.status;
  const tags = Array.isArray(body?.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : existing.tags || [];
  const tagsLiteral = toPgTextArrayLiteral(tags);
  const authorId =
    body?.authorId !== undefined ? asPositiveInt(body.authorId) : existing.author_id;
  const imageUrl =
    body?.imageUrl !== undefined
      ? body.imageUrl
        ? String(body.imageUrl).trim()
        : null
      : existing.image_url;
  const spot = body?.spot !== undefined ? (body.spot != null ? String(body.spot) : null) : existing.spot;
  const content =
    body?.content !== undefined ? (body.content != null ? String(body.content) : null) : existing.content;
  const isFeatured = typeof body?.isFeatured === "boolean" ? body.isFeatured : existing.is_featured === true;
  const isSiteManset =
    typeof body?.isSiteManset === "boolean" ? body.isSiteManset : existing.is_site_manset === true;
  const isBreaking =
    typeof body?.isBreaking === "boolean" ? body.isBreaking : existing.is_breaking === true;

  try {
    const rows = await sql`
      UPDATE news SET
        title = ${title},
        slug = ${slug},
        spot = ${spot},
        content = ${content},
        image_url = ${imageUrl},
        category_id = ${categoryId},
        author_id = ${authorId},
        status = ${status},
        is_featured = ${isFeatured},
        is_site_manset = ${isSiteManset},
        is_breaking = ${isBreaking},
        tags = ${tagsLiteral}::text[],
        is_editor_manual = true,
        site_only = true,
        owner_site_id = ${siteId},
        site_id = ${siteId},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (!row) return jsonResponse(404, { error: "Haber bulunamadı" });
    return jsonResponse(200, serializeNewsRow(row, categorySlug));
  } catch (err) {
    const msg = String(err?.message || err);
    console.error("[kh-news-update]", msg.slice(0, 200));
    return jsonResponse(500, {
      error: msg ? `Güncellenemedi: ${msg.slice(0, 160)}` : "Güncellenemedi",
      detail: msg.slice(0, 160),
    });
  }
}

async function handlePatchNewsFlags(sql, siteId, id, body) {
  await ensureNewsWritableColumns(sql);
  const existing = await loadNewsWithCategory(sql, siteId, id);
  if (!existing) return jsonResponse(404, { error: "Haber bulunamadı" });
  const isFeatured =
    typeof body?.isFeatured === "boolean" ? body.isFeatured : existing.is_featured === true;
  const isSiteManset =
    typeof body?.isSiteManset === "boolean" ? body.isSiteManset : existing.is_site_manset === true;
  const isBreaking =
    typeof body?.isBreaking === "boolean" ? body.isBreaking : existing.is_breaking === true;
  if (
    typeof body?.isFeatured !== "boolean" &&
    typeof body?.isSiteManset !== "boolean" &&
    typeof body?.isBreaking !== "boolean"
  ) {
    return jsonResponse(400, { error: "isFeatured, isSiteManset veya isBreaking gerekli" });
  }
  const rows = await sql`
    UPDATE news SET
      is_featured = ${isFeatured},
      is_site_manset = ${isSiteManset},
      is_breaking = ${isBreaking},
      is_editor_manual = true,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const row = rows?.[0];
  if (!row) return jsonResponse(404, { error: "Haber bulunamadı" });
  return jsonResponse(200, serializeNewsRow(row, existing.category_slug));
}

async function handleDeleteNews(sql, siteId, id) {
  const existing = await loadNewsWithCategory(sql, siteId, id);
  if (!existing) return jsonResponse(404, { error: "Haber bulunamadı" });
  await sql`DELETE FROM news WHERE id = ${id}`;
  return jsonResponse(200, { ok: true });
}

function serializeMakaleRow(r) {
  return {
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
    contentKind: "makale",
    categorySlug: "kose",
    categoryName: "Köşe yazısı",
    categoryId: null,
    categoryColor: "#0ea5e9",
    isFeatured: false,
    isSiteManset: false,
    isBreaking: false,
    tags: [],
    isEditorManual: false,
  };
}

function parseMakaleAuthorId(body) {
  if (body?.authorId === null) return null;
  if (typeof body?.authorId === "number" && Number.isFinite(body.authorId)) {
    return body.authorId > 0 ? Math.trunc(body.authorId) : null;
  }
  if (typeof body?.authorId === "string" && /^\d+$/.test(body.authorId)) {
    const n = parseInt(body.authorId, 10);
    return n > 0 ? n : null;
  }
  return undefined;
}

async function handleEditorMakale(sql, siteId, url) {
  const limit = Math.min(Number(url.searchParams.get("limit") || 200) || 200, 500);
  const rows = await sql`
    SELECT * FROM hm_makaleler
    WHERE site_id = ${siteId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  const items = (rows || []).map((r) => serializeMakaleRow(r));
  return jsonResponse(200, { items, total: items.length });
}

async function handleGetMakale(sql, siteId, id) {
  const rows = await sql`
    SELECT * FROM hm_makaleler
    WHERE id = ${id} AND site_id = ${siteId}
    LIMIT 1
  `;
  const row = rows?.[0];
  if (!row) return jsonResponse(404, { error: "Makale bulunamadı" });
  return jsonResponse(200, serializeMakaleRow(row));
}

async function handleCreateMakale(sql, siteId, body) {
  const title = String(body?.title || "").trim();
  if (!title) return jsonResponse(400, { error: "title gerekli" });
  const slugRaw = typeof body?.slug === "string" ? body.slug.trim() : "";
  let slug = slugify(slugRaw || title);
  const spot = typeof body?.spot === "string" ? body.spot : null;
  const content = typeof body?.content === "string" ? body.content : null;
  const imageUrl =
    typeof body?.imageUrl === "string" ? body.imageUrl.trim() || null : null;
  let authorId = parseMakaleAuthorId(body);
  if (authorId === undefined) authorId = null;
  const status = body?.status === "published" || body?.status === "draft" ? body.status : "draft";

  let lastErr = "";
  for (let i = 0; i < 8; i += 1) {
    const trySlug = i === 0 ? slug : `${slug}-${i + 1}`;
    try {
      const rows = await sql`
        INSERT INTO hm_makaleler (
          site_id, author_id, title, slug, spot, content, image_url, status, created_at, updated_at
        ) VALUES (
          ${siteId}, ${authorId}, ${title}, ${trySlug}, ${spot}, ${content}, ${imageUrl}, ${status}, NOW(), NOW()
        )
        RETURNING *
      `;
      const row = rows?.[0];
      if (!row) return jsonResponse(500, { error: "Kayıt oluşturulamadı" });
      return jsonResponse(201, serializeMakaleRow(row));
    } catch (err) {
      const msg = String(err?.message || err);
      lastErr = msg;
      if (/author_id|authors/i.test(msg) && /foreign key|violates/i.test(msg) && authorId != null) {
        // Yazarsız sessiz kayıt yapma — yazar sayfasında görünmez kalıyordu.
        return jsonResponse(400, {
          error: "Seçilen yazar bu sitede bulunamadı. Köşe yazarları listesinden geçerli bir yazar seçin.",
        });
      }
      if (/unique|duplicate/i.test(msg)) {
        if (i < 7) continue;
        return jsonResponse(409, { error: "Bu slug bu sitede zaten kullanılıyor" });
      }
      console.error("[hm-makale-create]", msg.slice(0, 200));
      return jsonResponse(500, { error: "Kayıt oluşturulamadı", detail: msg.slice(0, 160) });
    }
  }
  return jsonResponse(500, {
    error: lastErr ? `Kayıt oluşturulamadı: ${lastErr.slice(0, 160)}` : "Kayıt oluşturulamadı",
  });
}

async function handleUpdateMakale(sql, siteId, id, body) {
  const existingRows = await sql`
    SELECT * FROM hm_makaleler
    WHERE id = ${id} AND site_id = ${siteId}
    LIMIT 1
  `;
  const existing = existingRows?.[0];
  if (!existing) return jsonResponse(404, { error: "Makale bulunamadı" });

  const title =
    typeof body?.title === "string" ? body.title.trim() : existing.title;
  if (!title) return jsonResponse(400, { error: "title gerekli" });
  const slug =
    typeof body?.slug === "string" && body.slug.trim()
      ? slugify(body.slug.trim())
      : existing.slug;
  const spot =
    "spot" in (body || {})
      ? typeof body.spot === "string"
        ? body.spot
        : null
      : existing.spot;
  const content =
    "content" in (body || {})
      ? typeof body.content === "string"
        ? body.content
        : null
      : existing.content;
  const imageUrl =
    "imageUrl" in (body || {})
      ? typeof body.imageUrl === "string"
        ? body.imageUrl.trim() || null
        : null
      : existing.image_url;
  let authorId = existing.author_id ?? null;
  if ("authorId" in (body || {})) {
    const parsed = parseMakaleAuthorId(body);
    authorId = parsed === undefined ? null : parsed;
  }
  const status =
    body?.status === "published" || body?.status === "draft" ? body.status : existing.status;

  try {
    const rows = await sql`
      UPDATE hm_makaleler SET
        title = ${title},
        slug = ${slug},
        spot = ${spot},
        content = ${content},
        image_url = ${imageUrl},
        author_id = ${authorId},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${id} AND site_id = ${siteId}
      RETURNING *
    `;
    const row = rows?.[0];
    if (!row) return jsonResponse(404, { error: "Makale bulunamadı" });
    return jsonResponse(200, serializeMakaleRow(row));
  } catch (err) {
    const msg = String(err?.message || err);
    if (/unique|duplicate/i.test(msg)) {
      return jsonResponse(409, { error: "Bu slug bu sitede zaten kullanılıyor" });
    }
    if (/author_id|authors/i.test(msg) && /foreign key|violates/i.test(msg)) {
      try {
        const rows = await sql`
          UPDATE hm_makaleler SET
            title = ${title},
            slug = ${slug},
            spot = ${spot},
            content = ${content},
            image_url = ${imageUrl},
            author_id = NULL,
            status = ${status},
            updated_at = NOW()
          WHERE id = ${id} AND site_id = ${siteId}
          RETURNING *
        `;
        const row = rows?.[0];
        if (row) return jsonResponse(200, serializeMakaleRow(row));
      } catch (err2) {
        console.error("[hm-makale-update-retry]", String(err2?.message || err2).slice(0, 200));
      }
    }
    console.error("[hm-makale-update]", msg.slice(0, 200));
    return jsonResponse(500, { error: "Güncellenemedi", detail: msg.slice(0, 160) });
  }
}

async function handleDeleteMakale(sql, siteId, id) {
  const rows = await sql`
    DELETE FROM hm_makaleler
    WHERE id = ${id} AND site_id = ${siteId}
    RETURNING id
  `;
  if (!rows?.[0]) return jsonResponse(404, { error: "Makale bulunamadı" });
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-kh-editor-data-edge",
    },
  });
}

async function handleBulkDeleteMakale(sql, siteId, body) {
  const ids = Array.isArray(body?.ids)
    ? Array.from(
        new Set(body.ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)),
      )
    : [];
  if (!ids.length) return jsonResponse(400, { error: "ids dizisi gerekli" });
  let deleted = 0;
  for (const id of ids) {
    const rows = await sql`
      DELETE FROM hm_makaleler
      WHERE id = ${id} AND site_id = ${siteId}
      RETURNING id
    `;
    if (rows?.[0]) deleted += 1;
  }
  return jsonResponse(200, { deleted });
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/** Public /api/news listesine Neon'daki KH haberlerini öne ekle. */
export async function injectKhNeonNewsIntoPublicResponse(env, incomingUrl, response) {
  try {
    if (!response) return null;
    const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
    if (path !== "/api/news" && path !== "/api/news/hybrid") return null;
    const siteId =
      asPositiveInt(incomingUrl.searchParams.get("siteId")) ||
      asPositiveInt(incomingUrl.searchParams.get("site_id"));
    if (!siteId) return null;
    const sql = sqlClient(env);
    if (!sql) return null;
    if (!(await isKhSite(sql, siteId))) return null;

    const ct = String(response.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) return null;
    const payload = await response.clone().json();
    if (!payload || typeof payload !== "object") return null;

    const limit = Math.min(Number(incomingUrl.searchParams.get("limit") || 40) || 40, 100);
    const neonRows = await sql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE n.site_id = ${siteId}
        AND n.status = 'published'
      ORDER BY n.created_at DESC
      LIMIT ${limit}
    `;
    if (!neonRows?.length) return null;

    const neonItems = neonRows.map((r) => ({
      ...serializeNewsRow(r, r.category_slug),
      source: "editor",
    }));
    const existing = Array.isArray(payload.items) ? payload.items : [];
    const seen = new Set(neonItems.map((i) => i.id));
    const merged = [...neonItems, ...existing.filter((i) => !seen.has(i.id))];
    const headers = new Headers(response.headers);
    headers.set("x-yekpare-kh-neon-news", String(neonItems.length));
    headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
    headers.set("cdn-cache-control", "no-store");
    return new Response(
      JSON.stringify({
        ...payload,
        items: merged,
        total: Math.max(Number(payload.total) || 0, merged.length),
      }),
      { status: response.status, headers },
    );
  } catch (err) {
    console.error("[kh-neon-news-inject]", String(err?.message || err).slice(0, 200));
    return null;
  }
}

/**
 * KH sitesindeki tüm köşe yazarlarını sil + vitrin yazar modüllerini kapat.
 * Brand ensure / meta isteğinde bir kez (rev) uygulanır.
 */
export async function clearKhAuthorsAndDisableModules(sql, siteId) {
  if (!sql || !siteId) return { deleted: 0 };
  const rows = await sql`SELECT id FROM authors WHERE hm_site_id = ${siteId}`;
  let deleted = 0;
  for (const row of rows || []) {
    try {
      await sql`DELETE FROM hm_makaleler WHERE site_id = ${siteId} AND author_id = ${row.id}`;
    } catch {
      /* ignore */
    }
    try {
      await sql`UPDATE news SET author_id = NULL WHERE site_id = ${siteId} AND author_id = ${row.id}`;
    } catch {
      /* ignore */
    }
    const r = await sql`DELETE FROM authors WHERE id = ${row.id} AND hm_site_id = ${siteId} RETURNING id`;
    if (r?.length) deleted += 1;
  }
  return { deleted };
}

/**
 * @returns {Promise<Response|null>}
 */
export async function handleKhEditorDataEdge(request, env, incomingUrl) {
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  // Public authors — hmSiteId veya siteId (tüm HM siteleri)
  if (path === "/api/authors" && method === "GET") {
    const hmSiteId =
      asPositiveInt(incomingUrl.searchParams.get("hmSiteId")) ||
      asPositiveInt(incomingUrl.searchParams.get("siteId"));
    if (!hmSiteId) return null;
    const sql = sqlClient(env);
    if (!sql) return null;
    if (!(await isHmNewsSite(sql, hmSiteId))) return null;
    return handleAuthorsList(sql, hmSiteId);
  }

  if (!path.startsWith("/api/hm/editor/")) return null;

  // Oturumsuz uçlar — profile edge null döndüğünde Render'a düşmeli (login captcha yedek vb.).
  if (
    (path === "/api/hm/editor/login" || path === "/api/hm/editor/session-bridge") &&
    method === "POST"
  ) {
    return null;
  }

  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    if (!auth.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
    }
    return null; // Render imzalı JWT → Render proxy
  }

  const sql = sqlClient(env);
  if (!sql) return null;

  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  // Eski Render-bridge JWT: eid Neon'da yoksa 401 yerine Render proxy (oturum düşmesin).
  if (!editor) return auth.startsWith("Bearer ") ? null : jsonResponse(401, { error: "Geçersiz oturum" });

  if (path === "/api/hm/editor/categories" && method === "GET") {
    return handleCategories(sql, ctx.siteId);
  }

  if (path === "/api/hm/editor/authors/bulk-delete" && method === "POST") {
    return handleBulkDelete(sql, ctx.siteId, await readJsonBody(request));
  }

  if (path === "/api/hm/editor/authors" && method === "POST") {
    return handleCreateAuthor(sql, ctx.siteId, await readJsonBody(request));
  }

  const authorIdMatch = path.match(/^\/api\/hm\/editor\/authors\/(\d+)$/);
  if (authorIdMatch && method === "PUT") {
    const id = asPositiveInt(authorIdMatch[1]);
    if (id == null) return jsonResponse(400, { error: "Geçersiz id" });
    return handleUpdateAuthor(sql, ctx.siteId, id, await readJsonBody(request));
  }

  const poolPublishMatch = path.match(/^\/api\/hm\/editor\/pool\/authors\/(\d+)\/publish$/);
  if (poolPublishMatch && method === "POST") {
    const id = asPositiveInt(poolPublishMatch[1]);
    if (id == null) return jsonResponse(400, { error: "Geçersiz yazar id" });
    return handlePoolAuthorPublish(sql, ctx.siteId, id);
  }

  if (path === "/api/hm/editor/pool/authors" && method === "GET") {
    return handlePoolAuthors(sql, ctx.siteId, incomingUrl);
  }

  if (path === "/api/hm/editor/news" && method === "GET") {
    return handleEditorNews(sql, ctx.siteId, incomingUrl, env);
  }

  if (path === "/api/hm/editor/news" && method === "POST") {
    return handleCreateNews(sql, ctx.siteId, await readJsonBody(request));
  }

  const newsIdMatch = path.match(/^\/api\/hm\/editor\/news\/(\d+)$/);
  if (newsIdMatch) {
    const id = asPositiveInt(newsIdMatch[1]);
    if (id == null) return jsonResponse(400, { error: "id" });
    if (method === "GET") {
      const row = await loadNewsWithCategory(sql, ctx.siteId, id);
      if (!row) return jsonResponse(404, { error: "Haber bulunamadı" });
      return jsonResponse(200, serializeNewsRow(row, row.category_slug));
    }
    if (method === "PUT") {
      return handleUpdateNews(sql, ctx.siteId, id, await readJsonBody(request));
    }
    if (method === "DELETE") {
      return handleDeleteNews(sql, ctx.siteId, id);
    }
  }

  const flagsMatch = path.match(/^\/api\/hm\/editor\/news\/(\d+)\/flags$/);
  if (flagsMatch && method === "PATCH") {
    const id = asPositiveInt(flagsMatch[1]);
    if (id == null) return jsonResponse(400, { error: "id" });
    return handlePatchNewsFlags(sql, ctx.siteId, id, await readJsonBody(request));
  }

  if (path === "/api/hm/editor/makale" && method === "GET") {
    return handleEditorMakale(sql, ctx.siteId, incomingUrl);
  }

  if (path === "/api/hm/editor/makale" && method === "POST") {
    return handleCreateMakale(sql, ctx.siteId, await readJsonBody(request));
  }

  if (path === "/api/hm/editor/makale/bulk-delete" && method === "POST") {
    return handleBulkDeleteMakale(sql, ctx.siteId, await readJsonBody(request));
  }

  const makaleIdMatch = path.match(/^\/api\/hm\/editor\/makale\/(\d+)$/);
  if (makaleIdMatch) {
    const id = asPositiveInt(makaleIdMatch[1]);
    if (id == null) return jsonResponse(400, { error: "id" });
    if (method === "GET") return handleGetMakale(sql, ctx.siteId, id);
    if (method === "PUT") return handleUpdateMakale(sql, ctx.siteId, id, await readJsonBody(request));
    if (method === "DELETE") return handleDeleteMakale(sql, ctx.siteId, id);
  }

  if (path === "/api/hm/editor/authors/order" && method === "PATCH") {
    const body = await readJsonBody(request);
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
