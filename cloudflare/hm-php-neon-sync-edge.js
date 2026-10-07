/**
 * Worker Neon (bitter-mouse / DATABASE_URL) → PHP Neon (twilight-pine / NEWS_DATABASE_URL)
 * geriye dönük senkron.
 *
 * POST /api/hm/editor/php-neon-sync  (editör JWT — site oturumdan)
 * POST /api/hm/admin/php-neon-sync   { siteId, limit? } (panel oturumu)
 */
import { neonNewsSqlClient, neonSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { edgeMirrorNewsDbWrite } from "./hm-php-news-dual-write.js";
import { resolvePhpSiteId } from "./hm-php-editor-sync.js";
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
  return String(rows?.[0]?.slug || "")
    .trim()
    .toLowerCase() || null;
}

/**
 * @returns {Promise<{authors:number,news:number,makaleler:number,phpSiteId:number|null,errors:string[]}>}
 */
export async function syncSiteToPhpNeon(env, workerSiteId, opts = {}) {
  const limit = Math.min(Math.max(asPositiveInt(opts.limit) || 80, 1), 300);
  const workerSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  const out = { authors: 0, news: 0, makaleler: 0, phpSiteId: null, errors: [] };
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
    const authors = await workerSql`
      SELECT * FROM authors
      WHERE hm_site_id = ${siteId}
      ORDER BY id DESC
      LIMIT ${limit}
    `;
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
    const news = await workerSql`
      SELECT n.*, c.slug AS category_slug
      FROM news n
      LEFT JOIN categories c ON c.id = n.category_id
      WHERE n.site_id = ${siteId}
        AND (
          n.is_editor_manual = true
          OR n.is_featured = true
          OR n.is_site_manset = true
          OR n.is_breaking = true
          OR n.updated_at > NOW() - INTERVAL '45 days'
        )
      ORDER BY n.updated_at DESC NULLS LAST, n.id DESC
      LIMIT ${limit}
    `;
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
      LIMIT ${limit}
    `;
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
  const result = await syncSiteToPhpNeon(env, siteId, { limit: body?.limit });
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

  const result = await syncSiteToPhpNeon(env, siteId, { limit: body?.limit });
  const ok = result.news + result.makaleler + result.authors > 0 || result.errors.length === 0;
  return jsonResponse(ok ? 200 : 503, {
    ok,
    workerSiteId: siteId,
    ...result,
  });
}
