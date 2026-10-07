/**
 * HM editör veri API — kenar JWT + Neon.
 * Tanımsız rotalar: null → Worker Container vekili.
 */
import { neonNewsSqlClient, neonSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { edgeMirrorNewsDbWrite } from "./hm-php-news-dual-write.js";
import {
  loadPhpSiteAuthors,
  loadPhpSiteCategories,
  resolvePhpSiteId,
  syncPhpAuthorsToWorker,
  syncPhpCategoriesToWorker,
} from "./hm-php-editor-sync.js";
import bcrypt from "bcryptjs";
import { fetchApi, resolveApiOrigin } from "./api-upstream.js";

const JWT_TYP = "hm_editor";
const JWT_TYP_AUTHOR = "hm_author";
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
  return neonSqlClient(env);
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

async function parseAuthorJwt(request, env) {
  const { jwtVerify } = await import("jose");
  const h = String(request.headers.get("authorization") || "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  for (const secret of collectJwtSecretStrings(env)) {
    try {
      const key = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, key);
      const authorId = asPositiveInt(payload?.aid);
      const siteId = asPositiveInt(payload?.sid);
      if (payload?.typ !== JWT_TYP_AUTHOR || authorId == null || siteId == null) continue;
      return { authorId, siteId };
    } catch {
      /* sonraki secret */
    }
  }
  return null;
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

/** Yayın adresi /haber/:slug hem news hem hm_makaleler'den çözülür; iki tabloda da aynı site için slug tek olmalı. */
function slugCandidate(base, i) {
  return i === 0 ? base : `${base}-${i + 1}`;
}

/** Bu site için /haber/:slug adresini news satırı (site veya merkez havuz) karşılıyor mu? */
async function newsSlugTaken(sql, siteId, slug) {
  try {
    const rows = await sql`
      SELECT id FROM news
      WHERE lower(trim(both '/' from slug)) = lower(trim(both '/' from ${slug}))
        AND (site_id = ${siteId} OR site_id IS NULL OR (site_only = true AND owner_site_id = ${siteId}))
      LIMIT 1
    `;
    return Boolean(rows?.[0]);
  } catch (err) {
    console.error("[hm-slug-news]", String(err?.message || err).slice(0, 120));
    return false;
  }
}

/** Bu site için slug hm_makaleler'de kullanılıyor mu? (excludeId: güncellenen makalenin kendisi) */
async function makaleSlugTaken(sql, siteId, slug, excludeId = null) {
  try {
    const rows = await sql`
      SELECT id FROM hm_makaleler
      WHERE site_id = ${siteId}
        AND lower(trim(both '/' from slug)) = lower(trim(both '/' from ${slug}))
        AND (${excludeId}::int IS NULL OR id <> ${excludeId}::int)
      LIMIT 1
    `;
    return Boolean(rows?.[0]);
  } catch (err) {
    console.error("[hm-slug-makale]", String(err?.message || err).slice(0, 120));
    return false;
  }
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
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS is_tepe_manset boolean NOT NULL DEFAULT false",
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
    await raceTimeout(sql.query("ALTER TABLE authors ADD COLUMN IF NOT EXISTS hm_sort_order INTEGER"), 700, "authors-col");
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

const MIRROR_BUDGET_MS = 2500;
/** Aynı isolate içinde env nesnesi tek olduğundan istek girişinde set edilir; handler imzaları değişmez. */
let mirrorEnv = null;

export function setNewsMirrorEnv(env) {
  mirrorEnv = env || null;
}

/**
 * Neon yazımından sonra PHP tema DB'sine (NEWS_DATABASE_URL) kopya.
 * 1) Kenar ikinci Neon istemcisi — Container'a ihtiyaç yok.
 * 2) Container /api/hm/bridge/mirror yedek (NEWS_DB_WRITE=dual).
 * Hata/zaman aşımı yutulur; panel yanıtı etkilenmez.
 * @param {"hm_makaleler"|"news"|"authors"} table
 * @param {"upsert"|"delete"} op
 * @param {Record<string, unknown>|number} rowOrId
 */
/**
 * PHP Neon (NEWS_DATABASE_URL) ayna. Dual RO / başarısız olsa bile primary kaydı
 * bozmaz — false döner; çağıran yalnızca primary hatasında 5xx vermeli.
 */
export async function mirrorNewsDbWrite(table, op, rowOrId) {
  const env = mirrorEnv;
  if (!env) return false;

  try {
    if (shouldEdgeDualWriteNewsDb(env)) {
      const newsSql = neonNewsSqlClient(env);
      if (newsSql) {
        let payload = rowOrId;
        if (table === "news" && op !== "delete" && payload && typeof payload === "object") {
          const workerSql = sqlClient(env);
          const sid = asPositiveInt(payload.site_id ?? payload.siteId);
          if (workerSql && sid && !payload.site_slug && !payload.siteSlug) {
            try {
              const s = await workerSql`SELECT slug FROM hm_news_sites WHERE id = ${sid} LIMIT 1`;
              if (s?.[0]?.slug) payload = { ...payload, site_slug: s[0].slug };
            } catch (err) {
              console.error("[hm-news-mirror-slug]", String(err?.message || err).slice(0, 120));
            }
          }
          // Tepe manşet: Editör isFeatured → PHP is_tepe_manset (+ is_featured)
          if (payload.is_tepe_manset == null && payload.isTepeManset == null) {
            const feat = payload.is_featured === true || payload.isFeatured === true;
            payload = { ...payload, is_tepe_manset: feat, isTepeManset: feat };
          }
        }
        const direct = await edgeMirrorNewsDbWrite(newsSql, table, op, payload);
        if (direct?.mirrored === true) return true;
        // Dual RO/ayna hatası primary'yi bozmaz; bridge fallback dene.
        console.warn(
          "[hm-news-mirror] kenar dual-write atlandı (primary OK)",
          table,
          op,
          String(direct?.reason || "unknown").slice(0, 160),
        );
      }
    }

    if (!env.GOALGO_API && !String(env.API_ORIGIN || "").trim()) return false;
    const secret = String(env.HM_EDGE_BRIDGE_SECRET || "").trim();
    if (!secret) return false;
    const payload = op === "delete" ? { table, op, id: Number(rowOrId) } : { table, op: "upsert", row: rowOrId };
    const res = await Promise.race([
      fetchApi(env, `${apiOrigin(env)}/api/hm/bridge/mirror`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-yekpare-hm-edge-bridge": secret,
        },
        body: JSON.stringify(payload),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("mirror-timeout")), MIRROR_BUDGET_MS)),
    ]);
    if (!res?.ok) {
      console.error("[hm-news-mirror]", table, op, res?.status);
      return false;
    }
    const data = await res.json().catch(() => ({}));
    if (data?.mirrored !== true) {
      console.warn("[hm-news-mirror] atlandı", table, op, String(data?.reason || "unknown"));
    }
    return data?.mirrored === true;
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 120);
    if (/read-only transaction|news-db-read-only/i.test(msg)) {
      console.warn("[hm-news-mirror] PHP dual-write read-only — panel yanıtı etkilenmez", table, op, msg);
      return false;
    }
    console.error("[hm-news-mirror]", table, op, msg);
    return false;
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

async function handleCategories(sql, siteId, env) {
  const newsSql = neonNewsSqlClient(env);
  if (newsSql) {
    try {
      const phpMapped = await syncPhpCategoriesToWorker(sql, newsSql, siteId);
      if (phpMapped.length) return jsonResponse(200, phpMapped);
    } catch (err) {
      console.error("[kh-cat-php]", String(err?.message || err).slice(0, 160));
    }
    try {
      const phpOnly = await loadPhpSiteCategories(newsSql, siteId, sql);
      if (phpOnly.length) {
        return jsonResponse(
          200,
          phpOnly.map((r) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            color: r.color || "#e61e25",
            exclusiveSiteId: r.exclusive_site_id ?? null,
            sortOrder: r.sort_order ?? 0,
            newsCount: 0,
          })),
        );
      }
    } catch (err) {
      console.error("[kh-cat-php-list]", String(err?.message || err).slice(0, 160));
    }
  }
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

/**
 * Yazar başına yayımlı makale sayısı + son yazı (önce hm_makaleler, yoksa yazara bağlı news).
 * Container /api/authors?hmSiteId ile aynı alanlar: articleCount, latestArticle {id,title,slug}.
 */
async function loadAuthorArticleStats(sql, siteId) {
  const countMap = new Map();
  const latestMap = new Map();
  try {
    const stats = await sql`
      SELECT author_id, count(*)::int AS c
      FROM hm_makaleler
      WHERE site_id = ${siteId} AND status = 'published' AND author_id IS NOT NULL
      GROUP BY author_id
    `;
    for (const r of stats || []) countMap.set(Number(r.author_id), r.c ?? 0);
    const latestMakale = await sql`
      SELECT DISTINCT ON (author_id) author_id, id, title, slug
      FROM hm_makaleler
      WHERE site_id = ${siteId} AND status = 'published' AND author_id IS NOT NULL
      ORDER BY author_id, created_at DESC, id DESC
    `;
    for (const r of latestMakale || []) {
      latestMap.set(Number(r.author_id), { id: r.id, title: String(r.title ?? ""), slug: String(r.slug ?? "") });
    }
    const latestNews = await sql`
      SELECT DISTINCT ON (author_id) author_id, id, title, slug
      FROM news
      WHERE site_id = ${siteId} AND status = 'published' AND author_id IS NOT NULL
      ORDER BY author_id, created_at DESC, id DESC
    `;
    for (const r of latestNews || []) {
      const aid = Number(r.author_id);
      if (latestMap.has(aid)) continue;
      latestMap.set(aid, { id: r.id, title: String(r.title ?? ""), slug: String(r.slug ?? "") });
    }
  } catch (err) {
    console.error("[hm-authors-stats]", String(err?.message || err).slice(0, 160));
  }
  return { countMap, latestMap };
}

export async function handleAuthorsList(sql, siteId, env) {
  await ensureAuthorsSortOrderColumn(sql);
  const newsSql = neonNewsSqlClient(env);
  if (newsSql) {
    try {
      await syncPhpAuthorsToWorker(sql, newsSql, siteId);
    } catch (err) {
      console.error("[hm-authors-php]", String(err?.message || err).slice(0, 160));
    }
  }
  const rows = await sql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    FROM authors
    WHERE hm_site_id = ${siteId}
    ORDER BY COALESCE(hm_sort_order, 2147483647) ASC, id ASC
  `;
  let list = rows || [];
  if (newsSql) {
    try {
      const phpAuthors = await loadPhpSiteAuthors(newsSql, siteId, sql);
      const seenEmail = new Set(list.map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean));
      const seenId = new Set(list.map((r) => Number(r.id)));
      for (const p of phpAuthors) {
        const em = String(p.email || "").trim().toLowerCase();
        if ((em && seenEmail.has(em)) || seenId.has(Number(p.id))) continue;
        list.push(p);
        if (em) seenEmail.add(em);
        seenId.add(Number(p.id));
      }
    } catch (err) {
      console.error("[hm-authors-php-list]", String(err?.message || err).slice(0, 160));
    }
  }
  const { countMap, latestMap } = list.length ? await loadAuthorArticleStats(sql, siteId) : { countMap: new Map(), latestMap: new Map() };
  return jsonResponse(
    200,
    list.map((r) => ({
      ...serializeAuthor(r),
      articleCount: countMap.get(Number(r.id)) ?? 0,
      latestArticle: latestMap.get(Number(r.id)) ?? null,
    })),
  );
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
    await mirrorNewsDbWrite("authors", "upsert", row);
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
    await mirrorNewsDbWrite("authors", "upsert", row);
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

function authorNameKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

/** Editör yazar yazma uçları — Container origin-budget'a asla düşmesin. */
function isEditorAuthorWritePath(path, method) {
  if (path === "/api/hm/editor/authors/bulk-delete" && method === "POST") return true;
  if (path === "/api/hm/editor/authors" && method === "POST") return true;
  if (path === "/api/hm/editor/authors/order" && method === "PATCH") return true;
  if (/^\/api\/hm\/editor\/authors\/\d+$/.test(path) && (method === "PUT" || method === "DELETE")) {
    return true;
  }
  return false;
}

/** Haber/makale yazmaları Container'a (eski NEWS RO secret) düşmesin — kenarda kal. */
function isEditorNewsWritePath(path, method) {
  if (path === "/api/hm/editor/news" && method === "POST") return true;
  if (/^\/api\/hm\/editor\/news\/\d+$/.test(path) && (method === "PUT" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/hm\/editor\/news\/\d+\/flags$/.test(path) && method === "PATCH") return true;
  if (path === "/api/hm/editor/makaleler" && method === "POST") return true;
  if (/^\/api\/hm\/editor\/makaleler\/\d+$/.test(path) && (method === "PUT" || method === "DELETE")) {
    return true;
  }
  return false;
}

/**
 * Neon ANY(array) güvenilir değil — satır satır sil.
 * UI çoğu zaman PHP twilight-pine id gönderir; Worker + PHP site-scoped silinir.
 */
async function handleBulkDelete(sql, siteId, body, env, hostname) {
  const clearAll = body?.all === true || body?.clearAll === true;
  let ownedIds = [];
  let requestIds = [];

  const newsSql = shouldEdgeDualWriteNewsDb(env) ? neonNewsSqlClient(env) : null;
  const phpSiteId = newsSql
    ? (await resolvePhpSiteId(newsSql, sql, siteId, hostname)) || siteId
    : null;

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
    requestIds = ids;

    const nameKeys = new Set();
    // PHP listesinden gelen id'ler → isim anahtarı (Worker id eşleşmese bile)
    if (newsSql && phpSiteId) {
      for (const id of ids) {
        try {
          const hit = await newsSql`
            SELECT id, name FROM authors
            WHERE id = ${id} AND hm_site_id = ${phpSiteId}
            LIMIT 1
          `;
          const key = authorNameKey(hit?.[0]?.name);
          if (key) nameKeys.add(key);
        } catch (err) {
          console.error("[hm-author-bulk-php-lookup]", String(err?.message || err).slice(0, 120));
        }
      }
    }

    const localAuthors = await sql`
      SELECT id, name FROM authors WHERE hm_site_id = ${siteId}
    `;
    const localById = new Map((localAuthors || []).map((a) => [a.id, a]));
    for (const id of ids) {
      const row = localById.get(id);
      if (!row) continue;
      ownedIds.push(id);
      const key = authorNameKey(row.name);
      if (key) nameKeys.add(key);
    }
    for (const a of localAuthors || []) {
      const key = authorNameKey(a.name);
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

  // PHP Neon dual-write — yalnızca JWT sitesinin phpSiteId'si; başka site yazarına dokunma.
  let phpDeleted = 0;
  if (newsSql && phpSiteId) {
    let phpIds = [];
    if (clearAll) {
      try {
        const allPhp = await newsSql`SELECT id FROM authors WHERE hm_site_id = ${phpSiteId}`;
        phpIds = (allPhp || []).map((r) => Number(r.id)).filter((n) => Number.isFinite(n) && n > 0);
      } catch (err) {
        console.error("[hm-author-bulk-php-all]", String(err?.message || err).slice(0, 120));
      }
    } else {
      phpIds = Array.from(new Set(requestIds));
    }
    for (const id of phpIds) {
      try {
        const owned = await newsSql`
          SELECT id FROM authors WHERE id = ${id} AND hm_site_id = ${phpSiteId} LIMIT 1
        `;
        if (!owned?.[0]) continue;
        try {
          await newsSql`DELETE FROM hm_makaleler WHERE site_id = ${phpSiteId} AND author_id = ${id}`;
        } catch {
          /* ignore */
        }
        try {
          await newsSql`UPDATE news SET author_id = NULL WHERE site_id = ${phpSiteId} AND author_id = ${id}`;
        } catch {
          /* ignore */
        }
        const del = await newsSql`
          DELETE FROM authors WHERE id = ${id} AND hm_site_id = ${phpSiteId} RETURNING id
        `;
        if (del?.length) phpDeleted += 1;
      } catch (err) {
        console.error("[hm-author-bulk-php-del]", id, String(err?.message || err).slice(0, 120));
      }
    }
  }

  return jsonResponse(200, {
    ok: true,
    deleted: Math.max(deleted, phpDeleted),
    detached: 0,
    phpDeleted,
  });
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

/**
 * Köşe yazarı `news` satırı PHP yazar sayfasında görünsün diye hm_makaleler'e de yazılır.
 */
async function upsertMakaleFromAuthorNews(sql, row) {
  const siteId = asPositiveInt(row?.site_id);
  const authorId = asPositiveInt(row?.author_id);
  const title = String(row?.title || "").trim();
  const slug = String(row?.slug || "").trim();
  if (!sql || !siteId || !authorId || !title || !slug) return;
  const spot = row?.spot != null ? String(row.spot) : null;
  const content = row?.content != null ? String(row.content) : null;
  const imageUrl = row?.image_url != null ? String(row.image_url) : null;
  const status = String(row?.status || "published");
  try {
    const existing = await sql`
      SELECT * FROM hm_makaleler
      WHERE site_id = ${siteId}
        AND author_id = ${authorId}
        AND lower(trim(both '/' from slug)) = lower(trim(both '/' from ${slug}))
      LIMIT 1
    `;
    let makale = existing?.[0];
    if (makale) {
      const updated = await sql`
        UPDATE hm_makaleler SET
          title = ${title},
          spot = ${spot},
          content = ${content},
          image_url = ${imageUrl},
          status = ${status},
          updated_at = NOW()
        WHERE id = ${makale.id}
        RETURNING *
      `;
      makale = updated?.[0] || makale;
    } else {
      const inserted = await sql`
        INSERT INTO hm_makaleler (
          site_id, author_id, title, slug, spot, content, image_url, status, created_at, updated_at
        ) VALUES (
          ${siteId}, ${authorId}, ${title}, ${slug}, ${spot}, ${content}, ${imageUrl}, ${status}, NOW(), NOW()
        )
        RETURNING *
      `;
      makale = inserted?.[0];
    }
    if (makale) await mirrorNewsDbWrite("hm_makaleler", "upsert", makale);
  } catch (err) {
    console.error("[hm-author-news-makale]", String(err?.message || err).slice(0, 180));
  }
}

async function handleCreateNews(sql, siteId, body, opts = {}) {
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
  let authorId = opts.lockAuthorId != null ? opts.lockAuthorId : asPositiveInt(body?.authorId);
  const imageUrl = body?.imageUrl != null ? String(body.imageUrl).trim() || null : null;
  const spot = body?.spot != null ? String(body.spot) : null;
  const content = body?.content != null ? String(body.content) : null;
  const isFeatured = opts.lockAuthorId != null ? false : body?.isFeatured === true;
  const isSiteManset = opts.lockAuthorId != null ? false : body?.isSiteManset === true;
  const isBreaking = opts.lockAuthorId != null ? false : body?.isBreaking === true;
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
    const trySlug = slugCandidate(slug, i);
    try {
      // Aynı site köşe yazısı (hm_makaleler) bu slug'ı kullanıyorsa /haber/:slug onu gölgelemesin.
      if (await makaleSlugTaken(sql, siteId, trySlug)) continue;
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
        if (opts.lockAuthorId != null && Number(hit.author_id) !== Number(opts.lockAuthorId)) {
          continue;
        }
        return jsonResponse(200, serializeNewsRow(hit, hit.category_slug || categorySlug));
      }

      const rows = await sql`
        INSERT INTO news (
          title, slug, spot, content, image_url, category_id, author_id,
          sender_full_name, sender_email, sender_phone,
          status, is_featured, is_site_manset, is_breaking, is_tepe_manset, tags,
          site_id, is_editor_manual, site_only, owner_site_id,
          is_food_recipe, food_recipe_category_slug,
          created_at, updated_at
        ) VALUES (
          ${title}, ${trySlug}, ${spot}, ${content}, ${imageUrl}, ${categoryId}, ${authorId},
          ${senderFullName}, ${senderEmail}, ${senderPhone},
          ${status}, ${isFeatured}, ${isSiteManset}, ${isBreaking}, ${isFeatured}, ${tagsLiteral}::text[],
          ${siteId}, true, true, ${siteId},
          ${isFoodRecipe}, ${foodRecipeCategorySlug},
          NOW(), NOW()
        )
        RETURNING *
      `;
      const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
      if (!row) return createFailResponse("INSERT boş döndü");
      // Primary (DATABASE_URL) başarılı — PHP mirror RO olsa bile 201 dön.
      try {
        await mirrorNewsDbWrite("news", "upsert", {
          ...row,
          category_slug: categorySlug,
          is_tepe_manset: isFeatured,
          is_featured: isFeatured,
          is_site_manset: isSiteManset,
          is_breaking: isBreaking,
        });
      } catch (mirrorErr) {
        console.warn(
          "[kh-news-create-mirror]",
          String(mirrorErr?.message || mirrorErr).slice(0, 160),
        );
      }
      await upsertMakaleFromAuthorNews(sql, row);
      return jsonResponse(201, serializeNewsRow(row, categorySlug));
    } catch (err) {
      const msg = String(err?.message || err);
      lastErr = msg;
      // Silinmiş yazar FK'si — yazarsız tekrar dene
      if (/author_id|authors/i.test(msg) && /foreign key|violates/i.test(msg) && authorId != null) {
        if (opts.lockAuthorId != null) {
          return jsonResponse(400, {
            error: "Köşe yazarı kaydı bulunamadı. Editör panelinden yazarın bu siteye bağlı olduğundan emin olun.",
          });
        }
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
            try {
              await mirrorNewsDbWrite("news", "upsert", { ...row, category_slug: categorySlug });
            } catch (mirrorErr) {
              console.warn(
                "[kh-news-create-mirror]",
                String(mirrorErr?.message || mirrorErr).slice(0, 160),
              );
            }
            await upsertMakaleFromAuthorNews(sql, row);
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
    let rows;
    try {
      rows = await sql`
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
          is_tepe_manset = ${isFeatured},
          tags = ${tagsLiteral}::text[],
          is_editor_manual = true,
          site_only = true,
          owner_site_id = ${siteId},
          site_id = ${siteId},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } catch (colErr) {
      const cm = String(colErr?.message || colErr);
      if (!/column .* does not exist/i.test(cm)) throw colErr;
      rows = await sql`
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
          is_breaking = ${isBreaking},
          is_tepe_manset = ${isFeatured},
          tags = ${tagsLiteral}::text[],
          is_editor_manual = true,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }
    const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (!row) return jsonResponse(404, { error: "Haber bulunamadı" });
    await mirrorNewsDbWrite("news", "upsert", {
      ...row,
      category_slug: categorySlug,
      is_tepe_manset: isFeatured,
      is_featured: isFeatured,
      is_site_manset: isSiteManset,
      is_breaking: isBreaking,
    });
    await upsertMakaleFromAuthorNews(sql, row);
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
  let rows;
  try {
    rows = await sql`
      UPDATE news SET
        is_featured = ${isFeatured},
        is_site_manset = ${isSiteManset},
        is_breaking = ${isBreaking},
        is_tepe_manset = ${isFeatured},
        is_editor_manual = true,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
  } catch (colErr) {
    const cm = String(colErr?.message || colErr);
    if (!/column .* does not exist/i.test(cm)) throw colErr;
    rows = await sql`
      UPDATE news SET
        is_featured = ${isFeatured},
        is_breaking = ${isBreaking},
        is_tepe_manset = ${isFeatured},
        is_editor_manual = true,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
  }
  const row = rows?.[0];
  if (!row) return jsonResponse(404, { error: "Haber bulunamadı" });
  await mirrorNewsDbWrite("news", "upsert", {
    ...row,
    category_slug: existing.category_slug,
    is_tepe_manset: isFeatured,
    is_featured: isFeatured,
    is_site_manset: isSiteManset,
    is_breaking: isBreaking,
  });
  return jsonResponse(200, serializeNewsRow(row, existing.category_slug));
}

async function handleDeleteNews(sql, siteId, id) {
  const existing = await loadNewsWithCategory(sql, siteId, id);
  if (!existing) return jsonResponse(404, { error: "Haber bulunamadı" });
  await sql`DELETE FROM news WHERE id = ${id}`;
  await mirrorNewsDbWrite("news", "delete", id);
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

export async function handleCreateMakale(sql, siteId, body) {
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

  // Panel kaydı tekrar denendiğinde (zaman aşımı / çift tıklama) aynı yazı üç kez açılmasın:
  // aynı site + yazar + başlık son 10 dakikada varsa onu döndür.
  try {
    const dup = await sql`
      SELECT * FROM hm_makaleler
      WHERE site_id = ${siteId}
        AND author_id IS NOT DISTINCT FROM ${authorId}
        AND lower(regexp_replace(btrim(title), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(${title}), '\\s+', ' ', 'g'))
        AND created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (dup?.[0]) return jsonResponse(200, serializeMakaleRow(dup[0]));
  } catch (err) {
    console.error("[hm-makale-dup-check]", String(err?.message || err).slice(0, 160));
  }

  let lastErr = "";
  for (let i = 0; i < 12; i += 1) {
    const trySlug = slugCandidate(slug, i);
    // /haber/:slug önce news'ten çözülür; news veya başka bir makale bu slug'ı aldıysa -2, -3 … ekle.
    if (await newsSlugTaken(sql, siteId, trySlug)) continue;
    if (await makaleSlugTaken(sql, siteId, trySlug)) continue;
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
      await mirrorNewsDbWrite("hm_makaleler", "upsert", row);
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
        if (i < 11) continue;
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
  let slug =
    typeof body?.slug === "string" && body.slug.trim()
      ? slugify(body.slug.trim())
      : existing.slug;
  if (slug !== existing.slug) {
    const base = slug;
    for (let i = 0; i < 12; i += 1) {
      const candidate = slugCandidate(base, i);
      if (await newsSlugTaken(sql, siteId, candidate)) continue;
      if (await makaleSlugTaken(sql, siteId, candidate, id)) continue;
      slug = candidate;
      break;
    }
  }
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
    await mirrorNewsDbWrite("hm_makaleler", "upsert", row);
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
  await mirrorNewsDbWrite("hm_makaleler", "delete", id);
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
    if (rows?.[0]) {
      deleted += 1;
      await mirrorNewsDbWrite("hm_makaleler", "delete", id);
    }
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
 * KH sitesindeki köşe yazarlarını siler. Yalnızca kayıtlı rev henüz yokken,
 * ensureKhAuthorsClearedOnRow içinden bir kez çağrılır. Yazar modül bayraklarına dokunmaz.
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

function normalizeHmSiteIdsEdge(raw) {
  if (raw == null) return [];
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return [Math.trunc(raw)];
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (/^\d+$/.test(s)) return [parseInt(s, 10)];
    const inner = s.replace(/^[{\[]\s*/, "").replace(/\s*[}\]]$/, "");
    return inner
      .split(/[\s,]+/)
      .map((x) => parseInt(x.replace(/^["']|["']$/g, ""), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  if (Array.isArray(raw)) {
    return raw.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  }
  return [];
}

function serializeRssCampaignEdge(row) {
  const last = row.last_run_at ? new Date(row.last_run_at) : null;
  return {
    id: Number(row.id),
    name: row.name,
    active: !!row.active,
    postType: row.post_type,
    categorySlug: row.category_slug,
    tags: Array.isArray(row.tags) ? row.tags : [],
    feeds: Array.isArray(row.feeds) ? row.feeds : [],
    sourceType: row.source_type,
    intervalMinutes: Number(row.interval_minutes) || 30,
    daysWindow: Number(row.days_window) || 0,
    dailyLimit: Number(row.daily_limit) || 0,
    downloadImages: !!row.download_images,
    headline: !!row.headline,
    breakingKeywords: Array.isArray(row.breaking_keywords) ? row.breaking_keywords : [],
    minWords: Number(row.min_words) || 0,
    translateEnabled: !!row.translate_enabled,
    sourceLang: row.source_lang ?? null,
    targetLang: row.target_lang ?? null,
    translateEngine: row.translate_engine ?? null,
    addedCount: Number(row.added_count) || 0,
    lastRunAt: last && !Number.isNaN(last.getTime()) ? last.toISOString() : null,
    hmSiteIds: normalizeHmSiteIdsEdge(row.hm_site_ids),
    includeYekpareHaber: !!row.include_yekpare_haber,
    haberlerFilterByTags: !!row.haberler_filter_by_tags,
  };
}

function asStringArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
}

const RSS_SOURCE_TYPES = new Set(["rss", "html", "haberler", "youtube_channel", "youtube_playlist", "youtube_video"]);
const RSS_POST_TYPES = new Set(["news", "blog", "column"]);

function campaignFieldsFromBody(body, siteId, existing) {
  const name = String(body?.name ?? existing?.name ?? "").trim();
  const categorySlug = String(body?.categorySlug ?? existing?.category_slug ?? "").trim();
  const feeds = Array.isArray(body?.feeds) ? asStringArray(body.feeds) : asStringArray(existing?.feeds);
  let sourceType = String(body?.sourceType ?? existing?.source_type ?? "rss").trim().toLowerCase();
  if (!RSS_SOURCE_TYPES.has(sourceType)) sourceType = "rss";
  let postType = String(body?.postType ?? existing?.post_type ?? "news").trim().toLowerCase();
  if (!RSS_POST_TYPES.has(postType)) postType = "news";
  return {
    name,
    categorySlug,
    feeds,
    sourceType,
    postType,
    active: body?.active !== undefined ? body.active !== false : existing?.active !== false,
    tags: Array.isArray(body?.tags) ? asStringArray(body.tags) : asStringArray(existing?.tags),
    intervalMinutes: Number(body?.intervalMinutes ?? existing?.interval_minutes) || 60,
    daysWindow: Number(body?.daysWindow ?? existing?.days_window) || 0,
    dailyLimit: Number(body?.dailyLimit ?? existing?.daily_limit) || 0,
    downloadImages: body?.downloadImages === true,
    headline: body?.headline === true,
    breakingKeywords: Array.isArray(body?.breakingKeywords)
      ? asStringArray(body.breakingKeywords)
      : asStringArray(existing?.breaking_keywords),
    minWords: Number(body?.minWords ?? existing?.min_words) || 0,
    translateEnabled: body?.translateEnabled === true,
    haberlerFilterByTags: body?.haberlerFilterByTags === true,
    siteId,
  };
}

async function ensureRssCampaignColumns(sql) {
  try {
    await sql`ALTER TABLE rss_campaigns ADD COLUMN IF NOT EXISTS hm_site_ids integer[] NOT NULL DEFAULT '{}'`;
    await sql`ALTER TABLE rss_campaigns ADD COLUMN IF NOT EXISTS include_yekpare_haber boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE rss_campaigns ADD COLUMN IF NOT EXISTS haberler_filter_by_tags boolean NOT NULL DEFAULT false`;
  } catch {
    /* best-effort */
  }
}

async function loadOwnedRssCampaignRow(sql, siteId, id) {
  const owned = await sql`
    SELECT * FROM rss_campaigns
    WHERE id = ${id} AND ${siteId} = ANY(hm_site_ids)
    LIMIT 1
  `;
  if (owned?.length) return owned[0];
  const rows = await sql`SELECT * FROM rss_campaigns WHERE id = ${id} LIMIT 1`;
  if (!rows?.length) return null;
  const ids = normalizeHmSiteIdsEdge(rows[0].hm_site_ids);
  if (ids.includes(siteId) || ids.length === 0) return rows[0];
  return null;
}

/**
 * Kampanya bulundu ve bu siteye aitse JSON; aksi halde null → Container.
 * @returns {Promise<Response|null>}
 */
async function handleEditorRssCampaignGet(sql, siteId, id) {
  try {
    await ensureRssCampaignColumns(sql);
    const row = await loadOwnedRssCampaignRow(sql, siteId, id);
    if (!row) return null;
    return jsonResponse(200, serializeRssCampaignEdge(row));
  } catch {
    return null;
  }
}

async function handleEditorRssCampaignList(sql, siteId) {
  try {
    await ensureRssCampaignColumns(sql);
    const rows = await sql`SELECT * FROM rss_campaigns ORDER BY id`;
    const items = (rows || [])
      .filter((r) => {
        const ids = normalizeHmSiteIdsEdge(r.hm_site_ids);
        return ids.includes(siteId);
      })
      .map(serializeRssCampaignEdge);
    const totalActive = items.filter((r) => r.active).length;
    const totalAdded = items.reduce((s, r) => s + (r.addedCount ?? 0), 0);
    return jsonResponse(200, {
      items,
      totalActive,
      totalAdded,
      nextRunAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch {
    return null;
  }
}

async function handleEditorRssCampaignPut(sql, siteId, id, body) {
  try {
    await ensureRssCampaignColumns(sql);
    const existing = await loadOwnedRssCampaignRow(sql, siteId, id);
    if (!existing) return jsonResponse(404, { error: "Campaign not found" });
    const f = campaignFieldsFromBody(body, siteId, existing);
    if (!f.name || !f.categorySlug || !f.feeds.length) {
      return jsonResponse(400, { error: "Lütfen zorunlu alanları doldurun" });
    }
    const tagsLiteral = toPgTextArrayLiteral(f.tags);
    const feedsLiteral = toPgTextArrayLiteral(f.feeds);
    const kwLiteral = toPgTextArrayLiteral(f.breakingKeywords);
    const rows = await sql`
      UPDATE rss_campaigns SET
        name = ${f.name},
        active = ${f.active},
        post_type = ${f.postType},
        category_slug = ${f.categorySlug},
        tags = ${tagsLiteral}::text[],
        feeds = ${feedsLiteral}::text[],
        source_type = ${f.sourceType},
        interval_minutes = ${f.intervalMinutes},
        days_window = ${f.daysWindow},
        daily_limit = ${f.dailyLimit},
        download_images = ${f.downloadImages},
        headline = ${f.headline},
        breaking_keywords = ${kwLiteral}::text[],
        min_words = ${f.minWords},
        translate_enabled = ${f.translateEnabled},
        hm_site_ids = ARRAY[${siteId}]::integer[],
        include_yekpare_haber = false,
        haberler_filter_by_tags = ${f.haberlerFilterByTags}
      WHERE id = ${id}
      RETURNING *
    `;
    const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (!row) return jsonResponse(404, { error: "Campaign not found" });
    return jsonResponse(200, serializeRssCampaignEdge(row));
  } catch (err) {
    const msg = String(err?.message || err);
    console.error("[hm-rss-campaign-put]", msg.slice(0, 200));
    return jsonResponse(500, { error: msg ? `Kaydedilemedi: ${msg.slice(0, 160)}` : "Kaydedilemedi" });
  }
}

async function handleEditorRssCampaignCreate(sql, siteId, body) {
  try {
    await ensureRssCampaignColumns(sql);
    const f = campaignFieldsFromBody(body, siteId, null);
    if (!f.name || !f.categorySlug || !f.feeds.length) {
      return jsonResponse(400, { error: "Lütfen zorunlu alanları doldurun" });
    }
    const tagsLiteral = toPgTextArrayLiteral(f.tags);
    const feedsLiteral = toPgTextArrayLiteral(f.feeds);
    const kwLiteral = toPgTextArrayLiteral(f.breakingKeywords);
    const rows = await sql`
      INSERT INTO rss_campaigns (
        name, active, post_type, category_slug, tags, feeds, source_type,
        interval_minutes, days_window, daily_limit, download_images, headline,
        breaking_keywords, min_words, translate_enabled, hm_site_ids,
        include_yekpare_haber, haberler_filter_by_tags
      ) VALUES (
        ${f.name}, ${f.active}, ${f.postType}, ${f.categorySlug},
        ${tagsLiteral}::text[], ${feedsLiteral}::text[], ${f.sourceType},
        ${f.intervalMinutes}, ${f.daysWindow}, ${f.dailyLimit}, ${f.downloadImages}, ${f.headline},
        ${kwLiteral}::text[], ${f.minWords}, ${f.translateEnabled}, ARRAY[${siteId}]::integer[],
        false, ${f.haberlerFilterByTags}
      )
      RETURNING *
    `;
    const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (!row) return jsonResponse(500, { error: "Kampanya oluşturulamadı" });
    return jsonResponse(201, serializeRssCampaignEdge(row));
  } catch (err) {
    const msg = String(err?.message || err);
    console.error("[hm-rss-campaign-create]", msg.slice(0, 200));
    return jsonResponse(500, { error: msg ? `Kaydedilemedi: ${msg.slice(0, 160)}` : "Kaydedilemedi" });
  }
}

async function handleEditorRssCampaignDelete(sql, siteId, id) {
  try {
    await ensureRssCampaignColumns(sql);
    const existing = await loadOwnedRssCampaignRow(sql, siteId, id);
    if (!existing) return jsonResponse(404, { error: "Campaign not found" });
    await sql`DELETE FROM rss_logs WHERE campaign_id = ${id}`;
    await sql`DELETE FROM rss_campaigns WHERE id = ${id}`;
    return new Response(null, {
      status: 204,
      headers: {
        "cache-control": "private, no-store, max-age=0, must-revalidate",
        "cdn-cache-control": "no-store",
        "x-yekpare-frontend": "cloudflare-kh-editor-data-edge",
      },
    });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error("[hm-rss-campaign-delete]", msg.slice(0, 200));
    return jsonResponse(500, { error: "Silinemedi" });
  }
}

async function handleEditorRssCampaignRun(sql, env, request, siteId, id) {
  try {
    await ensureRssCampaignColumns(sql);
    const existing = await loadOwnedRssCampaignRow(sql, siteId, id);
    if (!existing) return jsonResponse(404, { error: "Campaign not found" });
    await sql`
      UPDATE rss_campaigns
      SET hm_site_ids = ARRAY[${siteId}]::integer[], include_yekpare_haber = false
      WHERE id = ${id}
    `;
    const origin = apiOrigin(env);
    const res = await fetchApi(env, `${origin}/api/hm/editor/rss/campaigns/${id}/run`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("authorization") || "",
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-yekpare-rss-run-proxy": "1",
      },
      body: "{}",
    });
    const text = await res.text();
    const headers = {
      "content-type": res.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-kh-editor-data-edge",
    };
    return new Response(text, { status: res.status, headers });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error("[hm-rss-campaign-run]", msg.slice(0, 200));
    return jsonResponse(500, { error: "Kampanya çalıştırılamadı" });
  }
}

async function loadAuthorOnSite(sql, authorId, siteId) {
  const rows = await sql`
    SELECT id, name, email, hm_site_id
    FROM authors
    WHERE id = ${authorId} AND hm_site_id = ${siteId}
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function signAuthorJwt(env, authorId, siteId) {
  const { SignJWT } = await import("jose");
  const key = jwtSecretBytes(env);
  if (!key) throw new Error("SESSION_SECRET eksik");
  const aid = asPositiveInt(authorId);
  const sid = asPositiveInt(siteId);
  if (aid == null || sid == null) throw new Error("Geçersiz yazar/site id");
  return new SignJWT({ typ: JWT_TYP_AUTHOR, aid, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60d")
    .sign(key);
}

async function resolveActiveSiteBySlug(sql, slugRaw) {
  const slug = String(slugRaw || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return null;
  const rows = await sql`
    SELECT id, slug, domain, domain2, display_name
    FROM hm_news_sites
    WHERE active = true
      AND lower(trim(both '/' from slug)) = ${slug}
    ORDER BY id ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

function raceTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    }),
  ]);
}

async function handleAuthorLogin(request, env, incomingUrl) {
  let b;
  try {
    b = await request.json();
  } catch {
    return jsonResponse(400, { error: "Geçersiz JSON" });
  }

  const siteSlug = String(b.siteSlug ?? b.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const emailRaw = String(b.email ?? "")
    .trim()
    .toLowerCase();
  const passwordRaw = String(b.password ?? "");
  if (!siteSlug || !emailRaw || !passwordRaw) {
    return jsonResponse(400, { error: "siteSlug, e-posta ve şifre gerekli." });
  }

  const sql = sqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!sql && !newsSql) return jsonResponse(401, { error: "E-posta veya şifre hatalı." });
  if (!jwtSecretBytes(env)) return jsonResponse(401, { error: "E-posta veya şifre hatalı." });

  try {
  let site = sql ? await raceTimeout(resolveActiveSiteBySlug(sql, siteSlug), 1800, "site-worker") : null;
  if (!site && newsSql) site = await raceTimeout(resolveActiveSiteBySlug(newsSql, siteSlug), 1800, "site-php");
  if (!site) {
    const host = normalizeHost(b.domain || incomingUrl?.hostname);
    const db = sql || newsSql;
    if (host && db) {
      const byHost = await raceTimeout(
        db`
        SELECT id, slug, domain, domain2, display_name
        FROM hm_news_sites
        WHERE active = true
          AND (
            lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', '')) = ${host}
            OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', '')) = ${host}
            OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', '')) = ${host}
          )
        ORDER BY id ASC
        LIMIT 1
      `,
        1800,
        "site-host",
      );
      site = byHost?.[0] || null;
    }
  }
  if (!site) return jsonResponse(404, { error: "Haber sitesi bulunamadı." });

  const lookupAuthor = async (db, hmSiteId) => {
    if (!db) return null;
    const authors = await db`
      SELECT id, name, email, password_hash
      FROM authors
      WHERE hm_site_id = ${hmSiteId}
        AND lower(email) = ${emailRaw}
        AND password_hash IS NOT NULL
      LIMIT 1
    `;
    return authors?.[0] || null;
  };
  const phpSiteId = newsSql
    ? await raceTimeout(resolvePhpSiteId(newsSql, sql, site.id, incomingUrl?.hostname), 1800, "php-site")
    : site.id;
  let author = sql ? await raceTimeout(lookupAuthor(sql, site.id), 1800, "author-worker") : null;
  if (!author?.password_hash && newsSql) {
    author = await raceTimeout(lookupAuthor(newsSql, phpSiteId || site.id), 1800, "author-php");
  }
  if (!author?.password_hash) {
    return jsonResponse(401, { error: "E-posta veya şifre hatalı." });
  }
  const ok = await bcrypt.compare(passwordRaw, author.password_hash);
  if (!ok) return jsonResponse(401, { error: "E-posta veya şifre hatalı." });

  const token = await signAuthorJwt(env, author.id, site.id);
  return jsonResponse(200, {
    token,
    site: {
      id: site.id,
      slug: site.slug,
      domain: site.domain,
      domain2: site.domain2 ?? null,
      displayName: site.display_name,
    },
    author: { id: author.id, name: author.name, email: author.email ?? emailRaw },
  });
  } catch (err) {
    console.error("[hm-author-login]", String(err?.message || err).slice(0, 180));
    return jsonResponse(401, { error: "E-posta veya şifre hatalı." });
  }
}

async function handleAuthorMeGet(request, env) {
  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseAuthorJwt(request, env);
  if (!ctx) {
    return jsonResponse(401, { error: "Köşe yazarı oturumu gerekli (Bearer token)." });
  }
  const sql = sqlClient(env);
  if (!sql) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });
  const author = await loadAuthorOnSite(sql, ctx.authorId, ctx.siteId);
  if (!author) return jsonResponse(404, { error: "Yazar bulunamadı." });
  void auth;
  return jsonResponse(200, serializeAuthor(author));
}

async function handleAuthorPasswordPatch(request, env) {
  const ctx = await parseAuthorJwt(request, env);
  if (!ctx) {
    return jsonResponse(401, { error: "Köşe yazarı oturumu gerekli (Bearer token)." });
  }
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
  const rows = await sql`
    SELECT id, password_hash FROM authors
    WHERE id = ${ctx.authorId} AND hm_site_id = ${ctx.siteId}
    LIMIT 1
  `;
  const author = rows?.[0];
  if (!author?.password_hash) {
    return jsonResponse(400, { error: "Şifre bu hesap için tanımlı değil." });
  }
  if (!current || !(await bcrypt.compare(current, author.password_hash))) {
    return jsonResponse(401, { error: "Mevcut şifre yanlış." });
  }
  const passwordHash = await bcrypt.hash(nextPw, 10);
  const updated = await sql`
    UPDATE authors SET password_hash = ${passwordHash}
    WHERE id = ${author.id}
    RETURNING id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash
  `;
  if (updated?.[0]) await mirrorNewsDbWrite("authors", "upsert", updated[0]);
  return jsonResponse(200, { ok: true });
}

async function handleAuthorNewsList(sql, siteId, authorId, incomingUrl) {
  const limit = Math.min(asPositiveInt(incomingUrl.searchParams.get("limit")) || 50, 200);
  const offsetRaw = parseInt(String(incomingUrl.searchParams.get("offset") || "0"), 10);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  const rows = await sql`
    SELECT n.*, c.slug AS category_slug
    FROM news n
    LEFT JOIN categories c ON c.id = n.category_id
    WHERE n.site_id = ${siteId} AND n.author_id = ${authorId}
    ORDER BY n.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const countRows = await sql`
    SELECT count(*)::int AS count
    FROM news
    WHERE site_id = ${siteId} AND author_id = ${authorId}
  `;
  return jsonResponse(200, {
    items: (rows || []).map((r) => serializeNewsRow(r, r.category_slug)),
    total: countRows?.[0]?.count ?? 0,
  });
}

async function handleAuthorNewsGet(sql, siteId, authorId, id) {
  const row = await loadNewsWithCategory(sql, siteId, id);
  if (!row || Number(row.author_id) !== authorId) {
    return jsonResponse(404, { error: "Haber bulunamadı." });
  }
  return jsonResponse(200, serializeNewsRow(row, row.category_slug));
}

async function handleAuthorNewsDelete(sql, siteId, authorId, id) {
  const rows = await sql`
    DELETE FROM news
    WHERE id = ${id} AND site_id = ${siteId} AND author_id = ${authorId}
    RETURNING id
  `;
  if (!rows?.[0]) return jsonResponse(404, { error: "Haber bulunamadı." });
  await mirrorNewsDbWrite("news", "delete", id);
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-kh-editor-data-edge",
    },
  });
}

/**
 * Köşe yazarı makalesi Container zaman aşımına düşmeden Neon'a yazılır.
 * @returns {Promise<Response|null>}
 */
async function handleAuthorArticleEdge(request, env, incomingUrl, path, method) {
  const isNews =
    path === "/api/hm/author/news" || /^\/api\/hm\/author\/news\/\d+$/.test(path);
  const isCategories = path === "/api/hm/author/categories";
  if (!isNews && !isCategories) return null;

  const auth = String(request.headers.get("authorization") || "").trim();
  const author = await parseAuthorJwt(request, env);
  if (!author) {
    if (!auth.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Köşe yazarı oturumu gerekli (Bearer token)." });
    }
    return null;
  }
  const sql = sqlClient(env);
  if (!sql) return null;
  const owned = await loadAuthorOnSite(sql, author.authorId, author.siteId);
  if (!owned) return jsonResponse(401, { error: "Köşe yazarı oturumu gerekli (Bearer token)." });

  if (isCategories && method === "GET") return handleCategories(sql, author.siteId, env);
  if (isCategories) return jsonResponse(405, { error: "Yöntem desteklenmiyor" });

  if (path === "/api/hm/author/news" && method === "GET") {
    return handleAuthorNewsList(sql, author.siteId, author.authorId, incomingUrl);
  }
  if (path === "/api/hm/author/news" && method === "POST") {
    const body = await readJsonBody(request);
    return handleCreateNews(
      sql,
      author.siteId,
      { ...body, authorId: author.authorId },
      { lockAuthorId: author.authorId },
    );
  }

  const idMatch = path.match(/^\/api\/hm\/author\/news\/(\d+)$/);
  const id = asPositiveInt(idMatch?.[1]);
  if (id == null) return jsonResponse(400, { error: "id" });
  if (method === "GET") return handleAuthorNewsGet(sql, author.siteId, author.authorId, id);
  if (method === "PUT") {
    const body = await readJsonBody(request);
    const existing = await loadNewsWithCategory(sql, author.siteId, id);
    if (!existing || Number(existing.author_id) !== author.authorId) {
      return jsonResponse(404, { error: "Haber bulunamadı." });
    }
    const {
      isFeatured: _featured,
      isSiteManset: _manset,
      isBreaking: _breaking,
      authorId: _authorId,
      ...authorUpdate
    } = body || {};
    return handleUpdateNews(sql, author.siteId, id, {
      ...authorUpdate,
      authorId: author.authorId,
    });
  }
  if (method === "DELETE") return handleAuthorNewsDelete(sql, author.siteId, author.authorId, id);
  return jsonResponse(405, { error: "Yöntem desteklenmiyor" });
}

/**
 * @returns {Promise<Response|null>}
 */
export async function handleKhEditorDataEdge(request, env, incomingUrl) {
  setNewsMirrorEnv(env);
  const path = String(incomingUrl.pathname || "").replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  // Public authors — hmSiteId veya siteId (tüm HM siteleri)
  if (path === "/api/authors" && method === "GET") {
    const hmSiteId =
      asPositiveInt(incomingUrl.searchParams.get("hmSiteId")) ||
      asPositiveInt(incomingUrl.searchParams.get("siteId"));
    if (!hmSiteId) return jsonResponse(200, []);
    const sql = sqlClient(env);
    const newsSql = neonNewsSqlClient(env);
    if (newsSql) {
      try {
        const phpAuthors = await raceTimeout(
          loadPhpSiteAuthors(newsSql, hmSiteId, sql, incomingUrl?.hostname),
          1800,
          "php-authors",
        );
        if (phpAuthors?.length) {
          if (sql) {
            void syncPhpAuthorsToWorker(sql, newsSql, hmSiteId).catch((err) => {
              console.error("[hm-authors-php]", String(err?.message || err).slice(0, 160));
            });
          }
          return jsonResponse(
            200,
            phpAuthors.map((r) => serializeAuthor(r)),
          );
        }
      } catch (err) {
        console.error("[hm-authors-php-fast]", String(err?.message || err).slice(0, 160));
      }
    }
    if (!sql) return jsonResponse(200, []);
    try {
      return await raceTimeout(handleAuthorsList(sql, hmSiteId, env), 2000, "authors-list");
    } catch (err) {
      console.error("[hm-authors-list]", String(err?.message || err).slice(0, 160));
      return jsonResponse(200, []);
    }
  }

  if (path.startsWith("/api/hm/author/")) {
    if (path === "/api/hm/author/login" && method === "POST") {
      return handleAuthorLogin(request, env, incomingUrl);
    }
    if (path === "/api/hm/author/me" && method === "GET") {
      return handleAuthorMeGet(request, env);
    }
    if (path === "/api/hm/author/me/password" && method === "PATCH") {
      return handleAuthorPasswordPatch(request, env);
    }
    const authorArticle = await handleAuthorArticleEdge(request, env, incomingUrl, path, method);
    if (authorArticle) return authorArticle;
    if (path === "/api/hm/author/news" || path.startsWith("/api/hm/author/news/") || path === "/api/hm/author/categories") {
      return null;
    }
  }

  if (!path.startsWith("/api/hm/editor/")) return null;

  // Oturumsuz uçlar — profile edge null döndüğünde Render'a düşmeli (login captcha yedek vb.).
  if (
    (path === "/api/hm/editor/login" || path === "/api/hm/editor/session-bridge") &&
    method === "POST"
  ) {
    return null;
  }

  const authorWrite = isEditorAuthorWritePath(path, method);
  const newsWrite = isEditorNewsWritePath(path, method);
  const edgeWrite = authorWrite || newsWrite;
  const auth = String(request.headers.get("authorization") || "").trim();
  const ctx = await parseEditorJwt(request, env);
  if (!ctx) {
    // Yazar/haber yazma: Container origin-budget 503 / RO NEWS yerine hızlı 401.
    if (!auth.startsWith("Bearer ") || edgeWrite) {
      return jsonResponse(401, { error: "Editör oturumu gerekli (Bearer token)." });
    }
    return null; // Render imzalı JWT → Render proxy (okuma uçları)
  }

  const sql = sqlClient(env);
  if (!sql) {
    if (edgeWrite) return jsonResponse(503, { error: "Veritabanı yapılandırması eksik." });
    return null;
  }

  const editor = await loadActiveEditor(sql, ctx.editorId, ctx.siteId);
  // Yazar/haber yazma asla Container'a (eski NEWS RO) düşmesin. Diğer uçlar: eski Render-bridge JWT → proxy.
  if (!editor) {
    if (edgeWrite || !auth.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Geçersiz oturum" });
    }
    return null;
  }

  if (path === "/api/hm/editor/categories" && method === "GET") {
    return handleCategories(sql, ctx.siteId, env);
  }

  if (path === "/api/hm/editor/authors/bulk-delete" && method === "POST") {
    return handleBulkDelete(sql, ctx.siteId, await readJsonBody(request), env, incomingUrl?.hostname);
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
  if (authorIdMatch && method === "DELETE") {
    const id = asPositiveInt(authorIdMatch[1]);
    if (id == null) return jsonResponse(400, { error: "Geçersiz id" });
    return handleBulkDelete(sql, ctx.siteId, { ids: [id] }, env, incomingUrl?.hostname);
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
    const newsSql = shouldEdgeDualWriteNewsDb(env) ? neonNewsSqlClient(env) : null;
    const phpSiteId = newsSql
      ? (await resolvePhpSiteId(newsSql, sql, ctx.siteId, incomingUrl?.hostname)) || ctx.siteId
      : null;
    let order = 0;
    for (const id of ids) {
      const updated = await sql`
        UPDATE authors SET hm_sort_order = ${order}
        WHERE id = ${id} AND hm_site_id = ${ctx.siteId}
        RETURNING id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
      `;
      if (updated?.[0]) await mirrorNewsDbWrite("authors", "upsert", updated[0]);
      // UI id'leri çoğu zaman PHP — Worker'da yoksa doğrudan PHP site-scoped sıra.
      if (newsSql && phpSiteId) {
        try {
          await newsSql`
            UPDATE authors SET hm_sort_order = ${order}
            WHERE id = ${id} AND hm_site_id = ${phpSiteId}
          `;
        } catch (err) {
          console.error("[hm-author-order-php]", String(err?.message || err).slice(0, 120));
        }
      }
      order += 1;
    }
    return jsonResponse(200, { ok: true });
  }

  if (path === "/api/hm/editor/rss/campaigns" && method === "GET") {
    return handleEditorRssCampaignList(sql, ctx.siteId);
  }
  if (path === "/api/hm/editor/rss/campaigns" && method === "POST") {
    return handleEditorRssCampaignCreate(sql, ctx.siteId, await readJsonBody(request));
  }

  const rssRun = path.match(/^\/api\/hm\/editor\/rss\/campaigns\/(\d+)\/run$/);
  if (rssRun && method === "POST") {
    if (String(request.headers.get("x-yekpare-rss-run-proxy") || "") === "1") {
      return null;
    }
    const id = asPositiveInt(rssRun[1]);
    if (id == null) return jsonResponse(400, { error: "Invalid id" });
    return handleEditorRssCampaignRun(sql, env, request, ctx.siteId, id);
  }

  const rssNewsDel = path.match(/^\/api\/hm\/editor\/rss\/campaigns\/(\d+)\/news$/);
  if (rssNewsDel && method === "DELETE") {
    return null;
  }

  const rssOne = path.match(/^\/api\/hm\/editor\/rss\/campaigns\/(\d+)$/);
  if (rssOne) {
    const id = asPositiveInt(rssOne[1]);
    if (id == null) return jsonResponse(400, { error: "Invalid id" });
    if (method === "GET") return handleEditorRssCampaignGet(sql, ctx.siteId, id);
    if (method === "PUT") return handleEditorRssCampaignPut(sql, ctx.siteId, id, await readJsonBody(request));
    if (method === "DELETE") return handleEditorRssCampaignDelete(sql, ctx.siteId, id);
  }

  return null;
}
