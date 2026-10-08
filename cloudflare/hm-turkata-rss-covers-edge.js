/**
 * turkatahaber.com — resimsiz RSS haberlerine kapak yaz (content <img> / og:image) + R2.
 * PHP tema `image_url` doluysa ys-media-hero gösterir.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";
import { saveMediaDataUrlToS3 } from "./hm-editor-media-s3-edge.js";
import { TURKATAHABER_SLUG } from "./hm-turkatahaber-edge.js";

const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** @param {string | null | undefined} html */
export function extractFirstContentImageUrl(html) {
  const raw = String(html ?? "");
  if (!raw) return null;
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const tag = m[0];
    const src =
      tag.match(/\b(?:src|data-src|data-original)=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bsrcset=["']([^"'\s,]+)/i)?.[1];
    if (!src) continue;
    const url = src.trim().replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(url)) continue;
    if (/\/(?:logo|favicon|icon|sprite|placeholder)\b/i.test(url)) continue;
    return url;
  }
  return null;
}

/** @param {string} html @param {string} pageUrl */
export function extractOgImageFromHtml(html, pageUrl) {
  const head = String(html ?? "").slice(0, 120_000);
  const patterns = [
    /<meta\s+property=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image(?::secure_url)?["']/i,
  ];
  for (const re of patterns) {
    const m = head.match(re);
    const raw = m?.[1]?.trim().replace(/&amp;/g, "&");
    if (!raw || raw.toLowerCase().startsWith("data:")) continue;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    try {
      return new URL(raw, pageUrl).href;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * @param {any} env
 * @param {string} imageUrl
 * @param {string} title
 */
export async function mirrorRemoteImageToR2(env, imageUrl, title) {
  const url = String(imageUrl ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (url.startsWith("/api/media/uploads/")) return url;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://turkatahaber.com/",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 64 || buf.length > 6 * 1024 * 1024) return null;
    const ctype = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const mime =
      ctype.startsWith("image/") && ctype !== "image/svg+xml"
        ? ctype
        : /\.webp(\?|$)/i.test(url)
          ? "image/webp"
          : /\.png(\?|$)/i.test(url)
            ? "image/png"
            : "image/jpeg";
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const dataUrl = `data:${mime};base64,${btoa(binary)}`;
    const saved = await saveMediaDataUrlToS3(env, dataUrl, title || "rss-cover");
    if (saved?.url) return saved.url;
  } catch (err) {
    console.warn("[turkata-rss-covers] mirror", String(err?.message || err).slice(0, 160));
  }
  return null;
}

async function resolveTurkataSiteIds(sql) {
  if (!sql) return [];
  const rows = await sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${TURKATAHABER_SLUG}
    ORDER BY id ASC
    LIMIT 4
  `;
  return (rows || [])
    .map((r) => Number(r.id))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * @param {any} env
 * @param {{ limit?: number, mirrorToR2?: boolean }} [opts]
 */
export async function backfillTurkataRssCoversOnEdge(env, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 40, 1), 120);
  const mirrorToR2 = opts.mirrorToR2 !== false;
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql && !newsSql) {
    return { ok: false, scanned: 0, updated: 0, error: "Neon SQL yok" };
  }

  const siteIds = [
    ...new Set([
      ...(await resolveTurkataSiteIds(mainSql)),
      ...(await resolveTurkataSiteIds(newsSql)),
    ]),
  ];
  if (!siteIds.length) {
    return { ok: false, scanned: 0, updated: 0, error: "turkatahaber site id yok" };
  }

  const readSql = newsSql || mainSql;
  const rows = await readSql`
    SELECT id, title, slug, content, image_url, rss_source_url
    FROM news
    WHERE site_id = ANY(${siteIds})
      AND status = 'published'
      AND coalesce(is_editor_manual, false) = false
      AND nullif(btrim(coalesce(rss_source_url, '')), '') IS NOT NULL
      AND (
        nullif(btrim(coalesce(image_url, '')), '') IS NULL
        OR image_url LIKE 'data:%'
        OR image_url LIKE '%haber-gorsel-hazirlaniyor%'
      )
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT ${limit}
  `;

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const samples = [];

  for (const row of rows || []) {
    const id = Number(row.id);
    const pageUrl = String(row.rss_source_url || "").trim();
    let cover = extractFirstContentImageUrl(row.content);
    if (!cover && /^https?:\/\//i.test(pageUrl)) {
      try {
        const res = await fetch(pageUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": FETCH_UA,
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (res.ok) {
          const html = await res.text();
          cover = extractOgImageFromHtml(html, pageUrl) || extractFirstContentImageUrl(html);
        }
      } catch {
        /* scrape fail */
      }
    }
    if (!cover) {
      skipped += 1;
      continue;
    }

    let stored = cover;
    if (mirrorToR2) {
      const mirrored = await mirrorRemoteImageToR2(env, cover, String(row.title || row.slug || ""));
      if (mirrored) stored = mirrored;
    }

    try {
      if (mainSql) {
        await mainSql`
          UPDATE news SET image_url = ${stored}, updated_at = NOW() WHERE id = ${id}
        `;
      }
      if (newsSql) {
        await newsSql`
          UPDATE news SET image_url = ${stored}, updated_at = NOW() WHERE id = ${id}
        `;
      }
      updated += 1;
      if (samples.length < 8) {
        samples.push({ id, slug: row.slug, imageUrl: stored });
      }
    } catch (err) {
      failed += 1;
      console.warn("[turkata-rss-covers] update", id, String(err?.message || err).slice(0, 120));
    }
  }

  return {
    ok: failed === 0,
    scanned: (rows || []).length,
    updated,
    skipped,
    failed,
    siteIds,
    samples,
    detail: `${(rows || []).length} resimsiz tarandı, ${updated} kapak yazıldı`,
  };
}

/**
 * Admin / wake: POST /api/hm/admin/repair-turkata-rss-covers
 * @param {Request} request
 * @param {any} env
 * @param {{ pathname?: string }} incoming
 */
export async function handleTurkataRssCoversRepairEdge(request, env, incoming) {
  const path = String(incoming?.pathname || new URL(request.url).pathname || "");
  if (path !== "/api/hm/admin/repair-turkata-rss-covers") return null;
  if (String(request.method || "GET").toUpperCase() !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST gerekli" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  let limit = 40;
  let mirrorToR2 = true;
  try {
    const body = await request.clone().json();
    if (Number.isFinite(Number(body?.limit))) limit = Number(body.limit);
    if (body?.mirrorToR2 === false) mirrorToR2 = false;
  } catch {
    /* empty body ok */
  }
  const result = await backfillTurkataRssCoversOnEdge(env, { limit, mirrorToR2 });
  return new Response(JSON.stringify({ ok: result.ok !== false, ...result }), {
    status: result.error ? 503 : 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
