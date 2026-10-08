/**
 * Panel Neon (DATABASE_URL) → PHP Neon (NEWS_DATABASE_URL) site bazlı geriye dönük eşitleme.
 * Dual-write öncesi eklenen haber/makaleler twilight-pine'da yoksa PHP vitrin boş kalır.
 *
 * Dry-run (sayım):
 *   cd goalgo/artifacts/api-server && node --import tsx ./scripts/sync-php-neon-news.ts --dry-run --site-slug=asg
 * Uygula (tek site, tüm sayfalar):
 *   ... --apply --site-id=3 --batch=200
 * Tüm aktif PHP siteleri:
 *   ... --apply --all-php-sites --batch=200
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
dotenv.config({ path: path.join(repoRoot, "goalgo/.env") });
dotenv.config({ path: path.join(repoRoot, "goalgo/artifacts/api-server/.env") });

type PgSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

function pgSql(pool: pg.Pool): PgSql {
  return async (strings, ...values) => {
    let text = "";
    const params: unknown[] = [];
    for (let i = 0; i < strings.length; i += 1) {
      text += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    }
    const res = await pool.query(text, params);
    return res.rows as Record<string, unknown>[];
  };
}

function resolveUrl(keys: string[]): string {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const allPhp = args.includes("--all-php-sites");
  const siteIdArg = args.find((a) => a.startsWith("--site-id="));
  const siteSlugArg = args.find((a) => a.startsWith("--site-slug="));
  const batchArg = args.find((a) => a.startsWith("--batch="));
  const layoutOnly = args.includes("--layout-only");
  const siteId = siteIdArg ? Number(siteIdArg.slice("--site-id=".length)) : NaN;
  const siteSlug = siteSlugArg ? siteSlugArg.slice("--site-slug=".length).trim().toLowerCase() : "";
  const batch = batchArg ? Math.min(Math.max(Number(batchArg.slice("--batch=".length)) || 200, 50), 500) : 200;
  return { dryRun, allPhp, siteId, siteSlug, batch, layoutOnly };
}

async function resolveWorkerSiteId(main: pg.Pool, siteId: number, siteSlug: string): Promise<number | null> {
  if (Number.isFinite(siteId) && siteId > 0) return Math.trunc(siteId);
  if (!siteSlug) return null;
  const r = await main.query(`SELECT id FROM hm_news_sites WHERE lower(slug) = $1 LIMIT 1`, [siteSlug]);
  return r.rows[0]?.id != null ? Number(r.rows[0].id) : null;
}

async function resolvePhpSiteId(main: pg.Pool, news: pg.Pool, workerSiteId: number): Promise<number> {
  const w = await main.query(
    `SELECT slug, domain, domain2, domain3 FROM hm_news_sites WHERE id = $1 LIMIT 1`,
    [workerSiteId],
  );
  const slug = String(w.rows[0]?.slug || "")
    .trim()
    .toLowerCase();
  if (slug) {
    const php = await news.query(`SELECT id FROM hm_news_sites WHERE lower(slug) = $1 LIMIT 1`, [slug]);
    if (php.rows[0]?.id) return Number(php.rows[0].id);
  }
  for (const key of ["domain", "domain2", "domain3"] as const) {
    const raw = String(w.rows[0]?.[key] || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/^www\./, "");
    if (!raw) continue;
    const php = await news.query(
      `SELECT id FROM hm_news_sites
       WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = $1
          OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = $1
          OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = $1
       LIMIT 1`,
      [raw],
    );
    if (php.rows[0]?.id) return Number(php.rows[0].id);
  }
  return workerSiteId;
}

async function countForSite(main: pg.Pool, siteId: number, phpSiteId?: number) {
  const ids = [...new Set([siteId, phpSiteId].filter((n): n is number => Number.isFinite(n) && (n as number) > 0))];
  const [news, mak, auth] = await Promise.all([
    main.query(
      `SELECT count(*)::int AS c FROM news
       WHERE site_id = ANY($1::int[])
          OR (site_only = true AND owner_site_id = ANY($1::int[]))`,
      [ids],
    ),
    main.query(`SELECT count(*)::int AS c FROM hm_makaleler WHERE site_id = ANY($1::int[])`, [ids]),
    main.query(`SELECT count(*)::int AS c FROM authors WHERE hm_site_id = $1`, [siteId]),
  ]);
  return {
    news: news.rows[0]?.c ?? 0,
    makaleler: mak.rows[0]?.c ?? 0,
    authors: auth.rows[0]?.c ?? 0,
  };
}

/** Rebind orphan news written under PHP site id (230) onto panel id (1132). */
async function rebindOrphanNewsSiteIds(
  main: pg.Pool,
  workerSiteId: number,
  phpSiteId: number,
  siteSlug: string | null,
): Promise<number> {
  if (!phpSiteId || phpSiteId === workerSiteId) return 0;
  const atPhp = await main.query(`SELECT lower(slug) AS slug FROM hm_news_sites WHERE id = $1 LIMIT 1`, [
    phpSiteId,
  ]);
  const phpSlug = atPhp.rows[0]?.slug ? String(atPhp.rows[0].slug) : null;
  const wantSlug = String(siteSlug || "")
    .trim()
    .toLowerCase();
  // Full rebind only when main has no row at phpSiteId, or that row is the same site slug.
  const safeFull = !phpSlug || (wantSlug && phpSlug === wantSlug);
  if (safeFull) {
    const r = await main.query(
      `UPDATE news
       SET site_id = $1,
           owner_site_id = CASE WHEN owner_site_id = $2 THEN $1 ELSE owner_site_id END,
           updated_at = NOW()
       WHERE site_id = $2
       RETURNING id`,
      [workerSiteId, phpSiteId],
    );
    return r.rowCount ?? 0;
  }
  // Different site owns phpSiteId on panel — only move Cumha/kamu-yerel tagged rows.
  const r = await main.query(
    `UPDATE news
     SET site_id = $1,
         owner_site_id = CASE WHEN owner_site_id = $2 THEN $1 ELSE owner_site_id END,
         updated_at = NOW()
     WHERE site_id = $2
       AND (
         'kamu-yerel-cumha' = ANY(tags)
         OR EXISTS (
           SELECT 1 FROM unnest(tags) t
           WHERE lower(t) LIKE '%turkatahaber%' OR lower(t) LIKE '%kamu-yerel%'
         )
         OR coalesce(rss_source_url, '') ILIKE '%cumha.com.tr%'
       )
     RETURNING id`,
    [workerSiteId, phpSiteId],
  );
  return r.rowCount ?? 0;
}

async function syncLayoutJson(
  mainSql: PgSql,
  newsSql: PgSql,
  workerSiteId: number,
  phpSiteId: number,
  siteSlug?: string | null,
): Promise<{ mirrored: boolean; reason?: string }> {
  let rows = await mainSql`
    SELECT layout_json FROM hm_news_sites WHERE id = ${workerSiteId} LIMIT 1
  `;
  let raw = rows[0]?.layout_json;
  let layoutStr =
    raw == null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
  // PHP id ile çağrıldığında (eski ensure NEWS_DB_READ=news) panel satırı boş olabilir —
  // slug ile Worker Neon layout'unu bul.
  if (!layoutStr.trim() && siteSlug) {
    rows = await mainSql`
      SELECT layout_json FROM hm_news_sites WHERE lower(slug) = ${siteSlug} LIMIT 1
    `;
    raw = rows[0]?.layout_json;
    layoutStr = raw == null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
  }
  if (!layoutStr.trim()) return { mirrored: false, reason: "layout boş" };
  try {
    const parsed = JSON.parse(layoutStr) as Record<string, unknown>;
    const presets = new Set(["odatv", "sabah", "takvim", "mynet", "nefes"]);
    const norm = (v: unknown) => {
      const p = String(v ?? "")
        .trim()
        .toLowerCase();
      return presets.has(p) ? p : null;
    };
    const chosen = norm(parsed.hmYsMansetPreset) ?? norm(parsed.hmNewsYsMansetLayout);
    if (chosen) {
      parsed.hmYsMansetPreset = chosen;
      parsed.hmNewsYsMansetLayout = chosen;
      layoutStr = JSON.stringify(parsed);
    }
  } catch {
    /* keep raw */
  }
  try {
    await newsSql`
      UPDATE hm_news_sites
      SET layout_json = ${layoutStr}::jsonb, updated_at = now()
      WHERE id = ${phpSiteId}
    `;
    return { mirrored: true };
  } catch (err) {
    try {
      await newsSql`
        UPDATE hm_news_sites
        SET layout_json = ${layoutStr}, updated_at = now()
        WHERE id = ${phpSiteId}
      `;
      return { mirrored: true };
    } catch (err2) {
      const msg = err2 instanceof Error ? err2.message : String(err2);
      return { mirrored: false, reason: msg.slice(0, 160) };
    }
  }
}

async function syncSiteBatch(
  mainSql: PgSql,
  newsSql: PgSql,
  mirror: (table: string, op: string, row: Record<string, unknown>) => Promise<{ mirrored?: boolean; reason?: string }>,
  workerSiteId: number,
  phpSiteId: number,
  slug: string | null,
  offset: number,
  batch: number,
) {
  const out = { authors: 0, news: 0, makaleler: 0, errors: [] as string[] };

  const authors = await mainSql`
    SELECT * FROM authors WHERE hm_site_id = ${workerSiteId}
    ORDER BY id DESC LIMIT ${batch} OFFSET ${offset}
  `;
  for (const row of authors) {
    const r = await mirror("authors", "upsert", { ...row, site_slug: slug, hm_site_id: phpSiteId });
    if (r?.mirrored) out.authors += 1;
    else if (r?.reason) out.errors.push(`author ${row.id}: ${r.reason}`);
  }

  // Include legacy PHP-id orphans (site_id=230) when panel id is 1132 — Cumha RSS
  // historically wrote NEWS_DB_READ=news targets before panel rebind.
  const news = await mainSql`
    SELECT n.*, c.slug AS category_slug
    FROM news n
    LEFT JOIN categories c ON c.id = n.category_id
    WHERE n.site_id = ${workerSiteId}
       OR n.site_id = ${phpSiteId}
       OR (n.site_only = true AND n.owner_site_id IN (${workerSiteId}, ${phpSiteId}))
    ORDER BY n.updated_at DESC NULLS LAST, n.id DESC
    LIMIT ${batch} OFFSET ${offset}
  `;
  for (const row of news) {
    const r = await mirror("news", "upsert", {
      ...row,
      site_slug: slug,
      site_id: workerSiteId,
      category_slug: row.category_slug,
    });
    if (r?.mirrored) out.news += 1;
    else if (r?.reason) out.errors.push(`news ${row.id}: ${r.reason}`);
  }

  const makaleler = await mainSql`
    SELECT * FROM hm_makaleler WHERE site_id = ${workerSiteId}
    ORDER BY updated_at DESC NULLS LAST, id DESC
    LIMIT ${batch} OFFSET ${offset}
  `;
  for (const row of makaleler) {
    const r = await mirror("hm_makaleler", "upsert", { ...row, site_slug: slug, site_id: workerSiteId });
    if (r?.mirrored) out.makaleler += 1;
    else if (r?.reason) out.errors.push(`makale ${row.id}: ${r.reason}`);
  }

  const hasMore =
    authors.length >= batch || news.length >= batch || makaleler.length >= batch;
  return { ...out, hasMore };
}

async function syncCategories(mainSql: PgSql, newsSql: PgSql, workerSiteId: number, phpSiteId: number) {
  const rows = await mainSql`
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
  let copied = 0;
  for (const row of rows) {
    const ex = row.exclusive_site_id != null ? Number(row.exclusive_site_id) : null;
    const phpEx = ex === workerSiteId ? phpSiteId : ex;
    const slug = String(row.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    // twilight-pine categories often lack UNIQUE/PK on id and slug — never use ON CONFLICT.
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
      console.warn(
        "[sync-php-neon-news/categories]",
        slug,
        String(err instanceof Error ? err.message : err),
      );
    }
  }
  return copied;
}

async function listActiveSiteIds(main: pg.Pool): Promise<Array<{ id: number; slug: string }>> {
  const r = await main.query(`
    SELECT id, slug FROM hm_news_sites
    WHERE active IS DISTINCT FROM false
    ORDER BY id ASC
    LIMIT 40
  `);
  return r.rows.map((row) => ({ id: Number(row.id), slug: String(row.slug || "") }));
}

async function runSite(
  mainPool: pg.Pool,
  newsPool: pg.Pool,
  workerSiteId: number,
  opts: { dryRun: boolean; batch: number; layoutOnly: boolean },
) {
  const mainSql = pgSql(mainPool);
  const newsSql = pgSql(newsPool);
  const slugRows = await mainSql`SELECT slug FROM hm_news_sites WHERE id = ${workerSiteId} LIMIT 1`;
  const slug =
    String(slugRows[0]?.slug || "")
      .trim()
      .toLowerCase() || null;
  const phpSiteId = await resolvePhpSiteId(mainPool, newsPool, workerSiteId);
  const orphanRebound = opts.dryRun
    ? 0
    : await rebindOrphanNewsSiteIds(mainPool, workerSiteId, phpSiteId, slug);
  if (orphanRebound > 0) {
    console.log("[sync-php-neon-news] rebound orphan news", { workerSiteId, phpSiteId, orphanRebound });
  }
  const counts = await countForSite(mainPool, workerSiteId, phpSiteId);
  console.log("[sync-php-neon-news] site", { workerSiteId, phpSiteId, slug, counts, dryRun: opts.dryRun });
  if (opts.dryRun) return { workerSiteId, phpSiteId, slug, counts, synced: null, orphanRebound };

  const { edgeMirrorNewsDbWrite } = await import("../../../../cloudflare/hm-php-news-dual-write.js");
  const mirror = (table: string, op: string, row: Record<string, unknown>) =>
    edgeMirrorNewsDbWrite(newsSql, table, op, row);

  const layoutMirror = await syncLayoutJson(mainSql, newsSql, workerSiteId, phpSiteId, slug);
  if (!layoutMirror.mirrored && layoutMirror.reason) {
    console.warn("[sync-php-neon-news] layout_json", layoutMirror.reason);
  }

  const categories = await syncCategories(mainSql, newsSql, workerSiteId, phpSiteId);
  if (opts.layoutOnly) {
    return {
      workerSiteId,
      phpSiteId,
      slug,
      counts,
      orphanRebound,
      synced: { authors: 0, news: 0, makaleler: 0, categories, layoutMirrored: layoutMirror.mirrored },
    };
  }
  let offset = 0;
  let totals = { authors: 0, news: 0, makaleler: 0, categories, layoutMirrored: layoutMirror.mirrored };
  const allErrors: string[] = [];
  for (let page = 0; page < 500; page += 1) {
    const batch = await syncSiteBatch(
      mainSql,
      newsSql,
      mirror,
      workerSiteId,
      phpSiteId,
      slug,
      offset,
      opts.batch,
    );
    totals = {
      authors: totals.authors + batch.authors,
      news: totals.news + batch.news,
      makaleler: totals.makaleler + batch.makaleler,
      categories,
    };
    allErrors.push(...batch.errors.slice(0, 5));
    if (!batch.hasMore) break;
    offset += opts.batch;
    if (page % 5 === 4) {
      console.log("[sync-php-neon-news] progress", { workerSiteId, offset, ...totals });
    }
  }
  if (allErrors.length) console.warn("[sync-php-neon-news] sample errors", allErrors.slice(0, 8));
  return { workerSiteId, phpSiteId, slug, counts, synced: totals };
}

async function main() {
  const { dryRun, allPhp, siteId, siteSlug, batch, layoutOnly } = parseArgs();
  const mainUrl = resolveUrl(["DATABASE_URL", "DATABASE_PRIVATE_URL", "DATABASE_PUBLIC_URL"]);
  const newsUrl = resolveUrl(["NEWS_DATABASE_URL", "NEWS_DATABASE_PRIVATE_URL", "NEWS_DATABASE_PUBLIC_URL"]);
  if (!mainUrl) {
    console.error("[sync-php-neon-news] DATABASE_URL gerekli.");
    process.exit(1);
  }
  if (!newsUrl) {
    console.error("[sync-php-neon-news] NEWS_DATABASE_URL gerekli (PHP twilight-pine).");
    process.exit(1);
  }

  const mainPool = new pg.Pool({ connectionString: mainUrl });
  const newsPool = new pg.Pool({ connectionString: newsUrl });

  try {
    if (allPhp) {
      const sites = await listActiveSiteIds(mainPool);
      const results = [];
      for (const s of sites) {
        results.push(await runSite(mainPool, newsPool, s.id, { dryRun, batch, layoutOnly }));
      }
      console.log("[sync-php-neon-news] all sites", JSON.stringify(results, null, 2));
      return;
    }

    const workerSiteId = await resolveWorkerSiteId(mainPool, siteId, siteSlug);
    if (!workerSiteId) {
      console.error("[sync-php-neon-news] --site-id veya --site-slug gerekli (veya --all-php-sites).");
      process.exit(1);
    }
    const result = await runSite(mainPool, newsPool, workerSiteId, { dryRun, batch, layoutOnly });
    console.log("[sync-php-neon-news] done", JSON.stringify(result, null, 2));
  } finally {
    await mainPool.end();
    await newsPool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
