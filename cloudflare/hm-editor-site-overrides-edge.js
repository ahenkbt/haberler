/**
 * Per-site overrides for the shared news pool (user rules 2026-10-08 20:23), served at the edge so they work
 * while the panel container is cold:
 *   GET  /api/hm/editor/site-feed?q=&cat=&from=&to=&state=all|aktif|pasif&kind=all|rss|news&limit=&offset=
 *        → automatically added items visible on the editor's site (portal_rss_items scope + non-manual news rows)
 *   POST /api/hm/editor/site-feed/state  {publicSlug, title, kind, refId, active}
 *        → Pasif = row in TP hm_site_content_hidden (reason 'editor_pasif'); Aktif = row deleted. Shared rows untouched.
 *   GET  /api/hm/editor/site-categories  → categories of the site with on/off
 *   POST /api/hm/editor/site-categories/state {slug, active}
 *        → TP hm_site_category_overrides (active=false hides menu item, home block and items on that site only)
 * Every write bumps TP hm_site_override_rev(site_id) so the PHP theme can drop page/widget cache built before it,
 * and purges the site's Cloudflare home/category/article URLs.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";
import { parseEditorJwt, loadActiveEditor } from "./hm-editor-profile-edge.js";
import { purgeHmSitePublicEdgeCache } from "./hm-public-cache-purge-edge.js";

const PATHS = new Set([
  "/api/hm/editor/site-feed",
  "/api/hm/editor/site-feed/state",
  "/api/hm/editor/site-categories",
  "/api/hm/editor/site-categories/state",
]);

export function isHmEditorSiteOverridesPath(pathname) {
  return PATHS.has(String(pathname || "").replace(/\/+$/, ""));
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      vary: "Origin, Authorization",
      "x-yekpare-frontend": "cloudflare-editor-site-overrides",
    },
  });
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
// PHP theme App::CANONICAL_CATEGORIES: always in the nav even without a categories row for the site.
export const CANONICAL_CATEGORIES = {
  gundem: "Gündem", ekonomi: "Ekonomi", dunya: "Dünya", politika: "Politika", spor: "Spor", teknoloji: "Teknoloji",
  "kultur-sanat": "Kültür-Sanat", saglik: "Sağlık", yasam: "Yaşam", egitim: "Eğitim", yerel: "Yerel", ankara: "Ankara",
};

/** Categories an editor can switch: canonical + categories rows (global/site) + slugs used by the site's feed. */
async function siteCategoryList(news, siteId, pools) {
  const rows = await news.query(
    `WITH used AS (
       SELECT category_slug AS slug, count(*)::int AS n FROM portal_rss_items
       WHERE (site_id IS NULL OR site_id = $1 OR site_id = ANY($2::int[])) AND published_at > now() - interval '14 days'
         AND category_slug IS NOT NULL AND category_slug <> ''
       GROUP BY 1),
     cats AS (
       SELECT slug, min(name) AS name, bool_or(exclusive_site_id = $1) AS own FROM categories
       WHERE (exclusive_site_id IS NULL OR exclusive_site_id = $1) AND slug IS NOT NULL GROUP BY slug),
     allslugs AS (SELECT slug FROM cats UNION SELECT slug FROM used UNION SELECT unnest($3::text[]))
     SELECT a.slug, c.name, COALESCE(c.own, false) AS own, COALESCE(u.n, 0) AS recent,
            (SELECT co.active FROM hm_site_category_overrides co WHERE co.site_id = $1 AND co.category_slug = a.slug) AS active
     FROM allslugs a LEFT JOIN cats c ON c.slug = a.slug LEFT JOIN used u ON u.slug = a.slug
     ORDER BY COALESCE(u.n, 0) DESC, a.slug`,
    [siteId, pools, Object.keys(CANONICAL_CATEGORIES)],
  );
  return rows
    .filter((r) => SLUG_RE.test(String(r.slug || "")))
    .map((r) => ({
      slug: r.slug,
      name: r.name || CANONICAL_CATEGORIES[r.slug] || r.slug,
      own: !!r.own,
      recent: Number(r.recent),
      active: r.active !== false,
    }));
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shared RSS pools the PHP theme reads for this site (App::rssSharedFor): layout hmNewsRssSources, default [230]. */
export function rssSourcesFromLayout(layoutRaw) {
  let layout = layoutRaw;
  if (typeof layout === "string") {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = null;
    }
  }
  const v = layout && typeof layout === "object" ? layout.hmNewsRssSources : undefined;
  if (Array.isArray(v)) return v.map((x) => Math.trunc(Number(x))).filter((x) => Number.isFinite(x) && x > 0);
  return [230];
}

async function loadSite(news, siteId) {
  const rows = await news.query(`SELECT id, slug, domain, layout_json FROM hm_news_sites WHERE id = $1 LIMIT 1`, [siteId]);
  return rows?.[0] || null;
}

async function bump(news, siteId) {
  await news.query(
    `INSERT INTO hm_site_override_rev (site_id, rev_at) VALUES ($1, now())
     ON CONFLICT (site_id) DO UPDATE SET rev_at = now()`,
    [siteId],
  );
}

async function purge(env, site, extraPaths) {
  try {
    await purgeHmSitePublicEdgeCache(env, {
      siteId: Number(site.id),
      slug: String(site.slug || ""),
      domain: site.domain,
      extraPaths,
    });
  } catch (e) {
    console.warn("[site-overrides] purge", String(e?.message || e).slice(0, 160));
  }
}

export function buildFeedQuery(siteId, pools, f) {
  const params = [siteId];
  const p = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  const poolSql = pools.length ? ` OR r.site_id = ANY(${p(pools)}::int[])` : "";
  const rssWhere = [`(r.site_id IS NULL OR r.site_id = $1${poolSql})`];
  const newsWhere = [
    `n.status = 'published'`,
    `(n.site_id IS NULL OR n.site_id = $1 OR n.owner_site_id = $1)`,
    `COALESCE(n.is_editor_manual, false) = false`,
  ];
  if (f.cat) {
    const c = p(f.cat);
    rssWhere.push(`r.category_slug = ${c}`);
    newsWhere.push(`c.slug = ${c}`);
  }
  if (f.q) {
    const q = p(`%${f.q}%`);
    rssWhere.push(`(r.title ILIKE ${q} OR COALESCE(r.source_name,'') ILIKE ${q})`);
    newsWhere.push(`n.title ILIKE ${q}`);
  }
  if (f.from) {
    const d = p(f.from);
    rssWhere.push(`r.published_at >= (${d}::date::timestamp AT TIME ZONE 'Europe/Istanbul')`);
    newsWhere.push(`n.created_at >= (${d}::date::timestamp AT TIME ZONE 'Europe/Istanbul')`);
  }
  if (f.to) {
    const d = p(f.to);
    rssWhere.push(`r.published_at < ((${d}::date + 1)::timestamp AT TIME ZONE 'Europe/Istanbul')`);
    newsWhere.push(`n.created_at < ((${d}::date + 1)::timestamp AT TIME ZONE 'Europe/Istanbul')`);
  }
  // Without a date filter keep the scan light: last 14 days.
  if (!f.from && !f.to) {
    rssWhere.push(`r.published_at > now() - interval '14 days'`);
    newsWhere.push(`n.created_at > now() - interval '14 days'`);
  }
  const parts = [];
  if (f.kind !== "news") {
    parts.push(`SELECT 'rss' AS kind, r.id::bigint AS ref_id, 'rss-' || r.id::text AS public_slug, r.title, r.category_slug,
        COALESCE(r.source_name, '') AS source, COALESCE(r.link, '') AS link, r.image_url, r.published_at AS at
      FROM portal_rss_items r WHERE ${rssWhere.join(" AND ")}`);
  }
  if (f.kind !== "rss") {
    parts.push(`SELECT 'news' AS kind, n.id::bigint AS ref_id, n.slug AS public_slug, n.title, COALESCE(c.slug, '') AS category_slug,
        CASE WHEN n.is_ai_generated THEN 'AI Haber Editörü' ELSE 'Havuz' END AS source, COALESCE(n.rss_source_url, '') AS link,
        n.image_url, n.created_at AS at
      FROM news n
      LEFT JOIN LATERAL (SELECT cx.slug FROM categories cx WHERE cx.id = n.category_id
        AND (cx.exclusive_site_id IS NULL OR cx.exclusive_site_id = $1)
        ORDER BY CASE WHEN cx.exclusive_site_id = $1 THEN 0 ELSE 1 END, cx.id LIMIT 1) c ON TRUE
      WHERE ${newsWhere.join(" AND ")}`);
  }
  let stateSql = "";
  if (f.state === "pasif") stateSql = "WHERE h.site_id IS NOT NULL OR co.active = false";
  else if (f.state === "aktif") stateSql = "WHERE h.site_id IS NULL AND co.active IS DISTINCT FROM false";
  const limit = p(f.limit);
  const offset = p(f.offset);
  const text = `SELECT x.*, h.reason AS hidden_reason, (co.active = false) AS category_off
    FROM (${parts.join(" UNION ALL ")}) x
    LEFT JOIN LATERAL (SELECT hh.site_id, hh.reason FROM hm_site_content_hidden hh
      WHERE hh.site_id = $1 AND hh.public_slug = x.public_slug AND (x.kind = 'rss' OR hh.title = x.title) LIMIT 1) h ON TRUE
    LEFT JOIN hm_site_category_overrides co ON co.site_id = $1 AND co.category_slug = x.category_slug
    ${stateSql}
    ORDER BY x.at DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}`;
  return { text, params };
}

function feedFilters(url) {
  const sp = url.searchParams;
  const q = String(sp.get("q") || "").trim().slice(0, 80);
  const cat = String(sp.get("cat") || "").trim().toLowerCase();
  const from = String(sp.get("from") || "").trim();
  const to = String(sp.get("to") || "").trim();
  const state = ["aktif", "pasif"].includes(sp.get("state")) ? sp.get("state") : "all";
  const kind = ["rss", "news"].includes(sp.get("kind")) ? sp.get("kind") : "all";
  const limit = Math.min(100, Math.max(1, Math.trunc(Number(sp.get("limit")) || 50)));
  const offset = Math.min(5000, Math.max(0, Math.trunc(Number(sp.get("offset")) || 0)));
  return {
    q,
    cat: SLUG_RE.test(cat) ? cat : "",
    from: DATE_RE.test(from) ? from : "",
    to: DATE_RE.test(to) ? to : "",
    state,
    kind,
    limit,
    offset,
  };
}

async function readBody(request) {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

export async function handleHmEditorSiteOverridesEdge(request, env, incomingUrl) {
  const url = incomingUrl instanceof URL ? incomingUrl : new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  if (!PATHS.has(path)) return null;
  const method = String(request.method || "GET").toUpperCase();
  if (method === "OPTIONS") return null;

  const ctx = await parseEditorJwt(request, env);
  if (!ctx) return json(401, { error: "Editör oturumu gerekli." });
  const panel = neonSqlClient(env);
  const news = neonNewsSqlClient(env);
  if (!panel || !news) return json(503, { error: "Veritabanı yapılandırması eksik." });
  const editor = await loadActiveEditor(panel, ctx.editorId, ctx.siteId);
  if (!editor) return json(401, { error: "Geçersiz oturum" });
  const siteId = ctx.siteId;
  const site = await loadSite(news, siteId);
  if (!site) return json(404, { error: "Site bulunamadı" });
  const who = `editor:${ctx.editorId}`;

  if (path === "/api/hm/editor/site-feed" && method === "GET") {
    const f = feedFilters(url);
    const { text, params } = buildFeedQuery(siteId, rssSourcesFromLayout(site.layout_json), f);
    const rows = await news.query(text, params);
    // Lasting per-site block rules (hm_site_blocked_terms, e.g. vatanhaber) are applied by the theme at read time.
    const blocked = [];
    try {
      for (const r of await news.query(`SELECT pattern FROM hm_site_blocked_terms WHERE site_id = $1`, [siteId])) {
        try {
          blocked.push(new RegExp(String(r.pattern), "iu"));
        } catch {
          /* PCRE-only pattern: theme still applies it */
        }
      }
    } catch {
      /* table missing */
    }
    for (const r of rows) {
      if (!r.hidden_reason && blocked.some((re) => re.test(String(r.title || "")))) r.hidden_reason = "blocked_terms";
    }
    return json(200, {
      siteId,
      items: rows.map((r) => ({
        kind: r.kind,
        refId: Number(r.ref_id),
        publicSlug: r.public_slug,
        title: r.title,
        category: r.category_slug || "",
        source: r.source || "",
        link: r.link || "",
        imageUrl: r.image_url || "",
        at: r.at,
        active: !r.hidden_reason && r.category_off !== true,
        hiddenReason: r.hidden_reason || null,
        categoryOff: r.category_off === true,
        url: `https://${site.domain}/haber/${r.public_slug}`,
      })),
      limit: f.limit,
      offset: f.offset,
    });
  }

  if (path === "/api/hm/editor/site-feed/state" && method === "POST") {
    const b = await readBody(request);
    const kind = b.kind === "news" ? "news" : b.kind === "rss" ? "rss" : "";
    const publicSlug = String(b.publicSlug || "").trim().slice(0, 300);
    const title = String(b.title || "").slice(0, 1000);
    const refId = Math.trunc(Number(b.refId));
    if (!kind || !publicSlug || !title || !Number.isFinite(refId)) return json(400, { error: "Eksik alan" });
    // The item must really be visible on this site (no writing hides for foreign rows).
    const check =
      kind === "rss"
        ? await news.query(
            `SELECT 1 FROM portal_rss_items WHERE id = $1 AND 'rss-' || id::text = $2 AND (site_id IS NULL OR site_id = $3 OR site_id = ANY($4::int[])) LIMIT 1`,
            [refId, publicSlug, siteId, rssSourcesFromLayout(site.layout_json)],
          )
        : await news.query(
            `SELECT 1 FROM news WHERE id = $1 AND slug = $2 AND title = $3 AND (site_id IS NULL OR site_id = $4 OR owner_site_id = $4) LIMIT 1`,
            [refId, publicSlug, title, siteId],
          );
    if (!check.length) return json(404, { error: "Haber bu sitede bulunamadı" });
    if (b.active === false) {
      await news.query(
        `INSERT INTO hm_site_content_hidden (site_id, public_slug, title, kind, ref_id, reason, hidden_at)
         VALUES ($1, $2, $3, $4, $5, 'editor_pasif', now())
         ON CONFLICT (site_id, public_slug, title) DO UPDATE SET reason = 'editor_pasif', hidden_at = now()`,
        [siteId, publicSlug, title, kind, refId],
      );
    } else {
      // Aktif removes only the editor's own hide. Strict-topic hides (off_topic:*, live_wrong_cat:*, not_city:*) and
      // blocked_terms stay: the importer guard would re-hide them anyway (user rule: off-topic is never placed).
      const other = await news.query(
        `SELECT reason FROM hm_site_content_hidden WHERE site_id = $1 AND public_slug = $2 AND title = $3 AND reason <> 'editor_pasif' LIMIT 1`,
        [siteId, publicSlug, title],
      );
      if (other.length) return json(409, { error: `Bu haber otomatik kuralla gizli (${other[0].reason}); editör açamaz.` });
      await news.query(
        `DELETE FROM hm_site_content_hidden WHERE site_id = $1 AND public_slug = $2 AND title = $3 AND reason = 'editor_pasif'`,
        [siteId, publicSlug, title],
      );
    }
    await bump(news, siteId);
    await purge(env, site, [`/haber/${publicSlug}`]);
    console.log(`[site-overrides] site ${siteId} ${who} ${kind} ${publicSlug} -> ${b.active === false ? "pasif" : "aktif"}`);
    return json(200, { ok: true, active: b.active !== false });
  }

  if (path === "/api/hm/editor/site-categories" && method === "GET") {
    const categories = await siteCategoryList(news, siteId, rssSourcesFromLayout(site.layout_json));
    return json(200, { siteId, categories });
  }

  if (path === "/api/hm/editor/site-categories/state" && method === "POST") {
    const b = await readBody(request);
    const slug = String(b.slug || "").trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return json(400, { error: "Geçersiz kategori" });
    const known = (await siteCategoryList(news, siteId, rssSourcesFromLayout(site.layout_json))).some((c) => c.slug === slug);
    if (!known) return json(404, { error: "Kategori bulunamadı" });
    if (b.active === false) {
      await news.query(
        `INSERT INTO hm_site_category_overrides (site_id, category_slug, active, updated_at, updated_by)
         VALUES ($1, $2, false, now(), $3)
         ON CONFLICT (site_id, category_slug) DO UPDATE SET active = false, updated_at = now(), updated_by = $3`,
        [siteId, slug, who],
      );
    } else {
      await news.query(`DELETE FROM hm_site_category_overrides WHERE site_id = $1 AND category_slug = $2`, [siteId, slug]);
    }
    await bump(news, siteId);
    await purge(env, site, [`/kategori/${slug}`]);
    console.log(`[site-overrides] site ${siteId} ${who} category ${slug} -> ${b.active === false ? "kapalı" : "açık"}`);
    return json(200, { ok: true, active: b.active !== false });
  }

  return json(405, { error: "Yöntem desteklenmiyor" });
}
