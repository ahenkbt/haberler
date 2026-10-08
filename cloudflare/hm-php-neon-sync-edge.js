/**
 * Worker Neon (bitter-mouse / DATABASE_URL) → PHP Neon (twilight-pine / NEWS_DATABASE_URL)
 * geriye dönük senkron.
 *
 * POST /api/hm/editor/php-neon-sync  (editör JWT — site oturumdan)
 * POST /api/hm/admin/php-neon-sync   { siteId, limit?, full?, offset? } (panel oturumu)
 */
import { neonNewsSqlClient, neonSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { edgeMirrorNewsDbWrite } from "./hm-php-news-dual-write.js";
import { resolvePhpSiteId } from "./hm-php-editor-sync.js";
import { mirrorHmSiteLayoutJsonToPhpNeon } from "./hm-php-layout-sync.js";
import {
  loadPanelSession,
  readCookie,
  sessionGrantsHmSites,
  unsignConnectSid,
} from "./hm-admin-site-edge.js";

function asPositiveInt(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function asNonNegativeInt(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
}

function truthyFlag(v) {
  if (v === true || v === 1) return true;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "full";
}

/** @param {Record<string, unknown>} opts */
export function normalizePhpNeonSyncOpts(opts = {}) {
  const full = truthyFlag(opts.full);
  const cap = full ? 500 : 300;
  const limit = Math.min(Math.max(asPositiveInt(opts.limit) || (full ? 200 : 80), 1), cap);
  const offset = asNonNegativeInt(opts.offset);
  return { full, limit, offset, syncCategories: opts.syncCategories !== false };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-yekpare-frontend": "cloudflare-php-neon-sync",
    },
  });
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function siteSlugFor(workerSql, siteId) {
  const rows = await workerSql`SELECT slug FROM hm_news_sites WHERE id = ${siteId} LIMIT 1`;
  return (
    String(rows?.[0]?.slug || "")
      .trim()
      .toLowerCase() || null
  );
}

/**
 * Site haberlerinde kullanılan + siteye özel kategorileri PHP Neon'a kopyalar (slug eşlemesi için).
 */
async function syncCategoriesForSite(workerSql, newsSql, workerSiteId, phpSiteId) {
  let copied = 0;
  const rows = await workerSql`
    SELECT DISTINCT c.*
    FROM categories c
    WHERE c.exclusive_site_id IS NULL
       OR c.exclusive_site_id = ${workerSiteId}
       OR c.id IN (
         SELECT DISTINCT n.category_id FROM news n
         WHERE n.site_id = ${workerSiteId} AND n.category_id IS NOT NULL
       )
    ORDER BY c.id ASC
    LIMIT 400
  `;
  for (const row of rows || []) {
    const ex = row.exclusive_site_id != null ? Number(row.exclusive_site_id) : null;
    const phpEx = ex === workerSiteId ? phpSiteId : ex;
    const slug = String(row.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    // twilight-pine categories often lack UNIQUE/PK — UPDATE by slug then INSERT.
    try {
      const updated = await newsSql`
        UPDATE categories
        SET name = ${row.name},
            color = ${row.color ?? "#e61e25"},
            exclusive_site_id = ${phpEx},
            sort_order = ${row.sort_order ?? 0}
        WHERE lower(slug) = ${slug}
          AND exclusive_site_id IS NULL
        RETURNING id
      `;
      if (updated?.[0]?.id) {
        copied += 1;
        continue;
      }
      await newsSql`
        INSERT INTO categories (name, slug, color, exclusive_site_id, sort_order)
        VALUES (
          ${row.name},
          ${slug},
          ${row.color ?? "#e61e25"},
          ${phpEx},
          ${row.sort_order ?? 0}
        )
      `;
      copied += 1;
    } catch (err) {
      console.warn("[php-neon-sync/categories]", slug, String(err?.message || err).slice(0, 100));
    }
  }
  return copied;
}

/**
 * @returns {Promise<{authors:number,news:number,makaleler:number,categories:number,phpSiteId:number|null,errors:string[],hasMore?:{news:boolean,makaleler:boolean,authors:boolean},full?:boolean,offset?:number,limit?:number}>}
 */
export async function syncSiteToPhpNeon(env, workerSiteId, opts = {}) {
  const { full, limit, offset, syncCategories } = normalizePhpNeonSyncOpts(opts);
  const workerSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  const out = {
    authors: 0,
    news: 0,
    makaleler: 0,
    categories: 0,
    layoutMirrored: false,
    phpSiteId: null,
    errors: [],
    full,
    offset,
    limit,
    hasMore: { news: false, makaleler: false, authors: false },
  };
  if (!workerSql || !newsSql || !shouldEdgeDualWriteNewsDb(env)) {
    out.errors.push("NEWS_DATABASE_URL veya NEWS_DB_WRITE=dual yok");
    return out;
  }
  const siteId = asPositiveInt(workerSiteId);
  if (!siteId) {
    out.errors.push("siteId gerekli");
    return out;
  }
  const phpSiteId = (await resolvePhpSiteId(newsSql, workerSql, siteId)) || siteId;
  out.phpSiteId = phpSiteId;
  const slug = await siteSlugFor(workerSql, siteId);

  try {
    const layoutRows = await workerSql`
      SELECT layout_json FROM hm_news_sites WHERE id = ${siteId} LIMIT 1
    `;
    const layoutRaw = layoutRows?.[0]?.layout_json;
    const layoutStr =
      layoutRaw == null
        ? ""
        : typeof layoutRaw === "string"
          ? layoutRaw
          : JSON.stringify(layoutRaw);
    const layoutMirror = await mirrorHmSiteLayoutJsonToPhpNeon(env, workerSql, siteId, layoutStr);
    out.layoutMirrored = layoutMirror.mirrored === true;
    if (!layoutMirror.mirrored && layoutMirror.reason) {
      out.errors.push(`layout_json: ${layoutMirror.reason}`);
    }
  } catch (err) {
    out.errors.push(`layout_json: ${String(err?.message || err).slice(0, 120)}`);
  }

  if (syncCategories) {
    try {
      out.categories = await syncCategoriesForSite(workerSql, newsSql, siteId, phpSiteId);
    } catch (err) {
      out.errors.push(`categories: ${String(err?.message || err).slice(0, 120)}`);
    }
  }

  try {
    const authors = await workerSql`
      SELECT * FROM authors
      WHERE hm_site_id = ${siteId}
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    out.hasMore.authors = (authors || []).length >= limit;
    for (const row of authors || []) {
      const r = await edgeMirrorNewsDbWrite(newsSql, "authors", "upsert", {
        ...row,
        site_slug: slug,
        hm_site_id: phpSiteId,
      });
      if (r?.mirrored) out.authors += 1;
      else if (r?.reason) out.errors.push(`author ${row.id}: ${r.reason}`);
    }
  } catch (err) {
    out.errors.push(`authors: ${String(err?.message || err).slice(0, 120)}`);
  }

  try {
    const news = full
      ? await workerSql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE n.site_id = ${siteId}
         OR (n.site_only = true AND n.owner_site_id = ${siteId})
      ORDER BY n.updated_at DESC NULLS LAST, n.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `
      : await workerSql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE (n.site_id = ${siteId} OR (n.site_only = true AND n.owner_site_id = ${siteId}))
        AND (
          n.is_editor_manual = true
          OR n.is_featured = true
          OR n.is_site_manset = true
          OR n.is_breaking = true
          OR n.updated_at > NOW() - INTERVAL '45 days'
        )
      ORDER BY n.updated_at DESC NULLS LAST, n.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    out.hasMore.news = (news || []).length >= limit;
    for (const row of news || []) {
      const r = await edgeMirrorNewsDbWrite(newsSql, "news", "upsert", {
        ...row,
        site_slug: slug,
        site_id: siteId,
      });
      if (r?.mirrored) out.news += 1;
      else if (r?.reason) out.errors.push(`news ${row.id}: ${r.reason}`);
    }
  } catch (err) {
    out.errors.push(`news: ${String(err?.message || err).slice(0, 120)}`);
  }

  try {
    const makaleler = await workerSql`
      SELECT * FROM hm_makaleler
      WHERE site_id = ${siteId}
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    out.hasMore.makaleler = (makaleler || []).length >= limit;
    for (const row of makaleler || []) {
      const r = await edgeMirrorNewsDbWrite(newsSql, "hm_makaleler", "upsert", {
        ...row,
        site_slug: slug,
        site_id: siteId,
      });
      if (r?.mirrored) out.makaleler += 1;
      else if (r?.reason) out.errors.push(`makale ${row.id}: ${r.reason}`);
    }
  } catch (err) {
    out.errors.push(`makaleler: ${String(err?.message || err).slice(0, 120)}`);
  }

  return out;
}

/** Editör JWT ctx ile — handleKhEditorDataEdge içinden. */
export async function runEditorPhpNeonSync(env, siteId, body = {}) {
  const result = await syncSiteToPhpNeon(env, siteId, {
    limit: body?.limit,
    full: body?.full,
    offset: body?.offset,
  });
  const ok = result.news + result.makaleler + result.authors > 0 || result.errors.length === 0;
  return jsonResponse(ok ? 200 : 503, {
    ok,
    workerSiteId: siteId,
    ...result,
  });
}

export async function handleAdminPhpNeonSyncEdge(request, env, incoming) {
  const method = String(request.method || "").toUpperCase();
  const path = String(incoming?.pathname || "").replace(/\/+$/, "") || "/";
  if (method !== "POST" || path !== "/api/hm/admin/php-neon-sync") return null;

  if (!shouldEdgeDualWriteNewsDb(env) || !neonNewsSqlClient(env) || !neonSqlClient(env)) {
    return jsonResponse(503, {
      ok: false,
      error: "PHP Neon (NEWS_DATABASE_URL) yapılandırılmamış",
      hint: "Worker secret NEWS_DATABASE_URL + NEWS_DB_WRITE=dual",
    });
  }

  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) return jsonResponse(503, { ok: false, error: "SESSION_SECRET yok" });
  const sid = await unsignConnectSid(readCookie(request.headers.get("cookie"), "connect.sid"), secret);
  if (!sid) return jsonResponse(401, { ok: false, error: "Yönetici girişi gerekli" });
  let sess;
  try {
    ({ sess } = await loadPanelSession(env, sid));
  } catch {
    return jsonResponse(503, { ok: false, error: "Oturum okunamadı" });
  }
  if (!sess || sess.panelBootstrap !== true) {
    return jsonResponse(401, { ok: false, error: "Yönetici girişi gerekli" });
  }
  if (!sessionGrantsHmSites(sess)) {
    return jsonResponse(403, { ok: false, error: "Bu işlem için yetkiniz yok" });
  }

  const body = await readJsonBody(request);
  const siteId = asPositiveInt(body?.siteId ?? body?.site_id);
  if (!siteId) return jsonResponse(400, { ok: false, error: "siteId gerekli" });

  const result = await syncSiteToPhpNeon(env, siteId, {
    limit: body?.limit,
    full: body?.full,
    offset: body?.offset,
  });
  const ok = result.news + result.makaleler + result.authors > 0 || result.errors.length === 0;
  return jsonResponse(ok ? 200 : 503, {
    ok,
    workerSiteId: siteId,
    ...result,
  });
}
