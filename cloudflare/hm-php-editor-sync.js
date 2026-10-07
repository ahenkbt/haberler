/**
 * PHP Neon (NEWS_DATABASE_URL) kategorileri ve yazarlarını
 * Worker Neon'a (editör listesi) kopyalar / birleştirir.
 */

function asPositiveInt(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function catRow(r, id) {
  return {
    id: id ?? r.id,
    name: r.name,
    slug: r.slug,
    color: r.color || "#e61e25",
    exclusiveSiteId: r.exclusive_site_id ?? r.exclusiveSiteId ?? null,
    sortOrder: r.sort_order ?? r.sortOrder ?? 0,
    newsCount: 0,
  };
}

function normalizeHostName(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** Worker Neon hm_news_sites.id → PHP twilight-pine id (slug/domain lookup still preferred). */
export const WORKER_TO_PHP_SITE_ID = Object.freeze({
  1: 1, // vatanhaber.net
  2: 2, // suhaber.net
  3: 3, // ankarasehirgazetesi.com
  8: 8, // ankarahabergundemi.com
  1087: 231, // yerel.net.tr
  1088: 232, // sehitgazi.org.tr
  1089: 233, // turksav.org
  1090: 236, // yesilvatan.gen.tr
  1091: 237, // dunyasaglik.org
  1132: 230, // turkatahaber.com
});

function mappedPhpSiteId(sid) {
  if (!sid) return null;
  const hit = WORKER_TO_PHP_SITE_ID[sid];
  return hit ? Number(hit) : null;
}

export async function resolvePhpSiteId(newsSql, workerSql, siteId, hostname) {
  const sid = asPositiveInt(siteId);
  if (!newsSql) return mappedPhpSiteId(sid) || sid;
  // 1) Worker site id → slug/domain → PHP id (editor hmSiteId for every HM site)
  if (workerSql && sid) {
    try {
      const w = await workerSql`SELECT slug, domain, domain2, domain3 FROM hm_news_sites WHERE id = ${sid} LIMIT 1`;
      const slug = String(w?.[0]?.slug || "")
        .trim()
        .toLowerCase();
      if (slug) {
        const php = await newsSql`SELECT id FROM hm_news_sites WHERE lower(slug) = ${slug} LIMIT 1`;
        if (php?.[0]?.id) return Number(php[0].id);
      }
      for (const key of ["domain", "domain2", "domain3"]) {
        const domain = normalizeHostName(w?.[0]?.[key]);
        if (!domain) continue;
        const php = await newsSql`
          SELECT id FROM hm_news_sites
          WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${domain}
             OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${domain}
             OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${domain}
          LIMIT 1
        `;
        if (php?.[0]?.id) return Number(php[0].id);
      }
    } catch (err) {
      console.error("[php-site-id]", String(err?.message || err).slice(0, 140));
    }
  }
  const mapped = mappedPhpSiteId(sid);
  if (mapped) return mapped;
  const host = normalizeHostName(hostname);
  if (host && host !== "ahenk.net.tr" && !host.endsWith(".workers.dev")) {
    try {
      const phpHost = await newsSql`
        SELECT id FROM hm_news_sites
        WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
           OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
           OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
        LIMIT 1
      `;
      if (phpHost?.[0]?.id) return Number(phpHost[0].id);
    } catch (err) {
      console.error("[php-site-host]", String(err?.message || err).slice(0, 140));
    }
  }
  try {
    const phpSame = await newsSql`SELECT id FROM hm_news_sites WHERE id = ${sid} LIMIT 1`;
    if (phpSame?.[0]?.id) return Number(phpSame[0].id);
  } catch {
    /* ignore */
  }
  return sid;
}

export async function loadPhpSiteCategories(newsSql, siteId, workerSql) {
  const phpSiteId = (await resolvePhpSiteId(newsSql, workerSql, siteId)) || asPositiveInt(siteId);
  if (!newsSql || !phpSiteId) return [];
  const exclusive = await newsSql`
    SELECT id, name, slug, color, exclusive_site_id, sort_order
    FROM categories
    WHERE exclusive_site_id = ${phpSiteId}
    ORDER BY sort_order ASC, id ASC
  `;
  if (exclusive?.length) return exclusive;
  try {
    const layout = await newsSql`
      SELECT layout_json FROM hm_news_sites WHERE id = ${phpSiteId} LIMIT 1
    `;
    const raw = layout?.[0]?.layout_json;
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw || {};
    const slugs = []
      .concat(obj.hmNavOnlyCategorySlugs || [])
      .concat(obj.hmNewsCategoryBarItems || [])
      .concat(obj.hmNewsNavItems || [])
      .concat(obj.hmNewsExtraCategories || [])
      .flatMap((x) => {
        if (typeof x === "string") return [x];
        if (Array.isArray(x)) return [x[0]];
        return [x?.slug, x?.href];
      })
      .map((s) => String(s || "").replace(/^\/kategori\//, "").trim().toLowerCase())
      .filter((s) => s && !s.includes("/"));
    const unique = [...new Set(slugs)];
    if (unique.length) {
      const rows = await newsSql`
        SELECT id, name, slug, color, exclusive_site_id, sort_order
        FROM categories
        WHERE lower(slug) = ANY(${unique})
        ORDER BY sort_order ASC, id ASC
      `;
      if (rows?.length) return rows;
    }
  } catch (err) {
    console.error("[php-cat-layout]", String(err?.message || err).slice(0, 140));
  }
  const shared = await newsSql`
    SELECT id, name, slug, color, exclusive_site_id, sort_order
    FROM categories
    WHERE exclusive_site_id IS NULL OR exclusive_site_id = ${phpSiteId}
    ORDER BY CASE WHEN exclusive_site_id = ${phpSiteId} THEN 0 ELSE 1 END, sort_order ASC, id ASC
  `;
  return shared || [];
}

export async function syncPhpCategoriesToWorker(workerSql, newsSql, siteId) {
  const phpRows = await loadPhpSiteCategories(newsSql, siteId, workerSql);
  if (!phpRows.length) return [];
  const out = [];
  for (const r of phpRows) {
    const slug = String(r.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    const exclusive = siteId;
    let hit = await workerSql`
      SELECT id, name, slug, color, exclusive_site_id, sort_order
      FROM categories
      WHERE lower(slug) = ${slug}
        AND (exclusive_site_id IS NULL OR exclusive_site_id = ${siteId})
      ORDER BY CASE WHEN exclusive_site_id = ${siteId} THEN 0 ELSE 1 END, id ASC
      LIMIT 1
    `;
    if (!hit?.[0]) {
      try {
        hit = await workerSql`
          INSERT INTO categories (name, slug, color, exclusive_site_id, sort_order)
          VALUES (${r.name}, ${slug}, ${r.color || "#e61e25"}, ${exclusive}, ${r.sort_order ?? 0})
          RETURNING id, name, slug, color, exclusive_site_id, sort_order
        `;
      } catch {
        hit = await workerSql`
          SELECT id, name, slug, color, exclusive_site_id, sort_order
          FROM categories WHERE lower(slug) = ${slug} ORDER BY id ASC LIMIT 1
        `;
      }
    }
    if (hit?.[0]) out.push(catRow(hit[0]));
    else out.push(catRow(r));
  }
  return out;
}

export async function loadPhpSiteAuthors(newsSql, siteId, workerSql, hostname) {
  const phpSiteId =
    (await resolvePhpSiteId(newsSql, workerSql, siteId, hostname)) || asPositiveInt(siteId);
  if (!newsSql || !phpSiteId) return [];
  const rows = await newsSql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email
    FROM authors
    WHERE hm_site_id = ${phpSiteId}
    ORDER BY COALESCE(hm_sort_order, 2147483647) ASC, id ASC
  `;
  return rows || [];
}

export async function syncPhpAuthorsToWorker(workerSql, newsSql, siteId) {
  const phpRows = await loadPhpSiteAuthors(newsSql, siteId, workerSql);
  for (const r of phpRows) {
    const email = r.email ? String(r.email).trim().toLowerCase() : null;
    let existing = [];
    if (email) {
      existing = await workerSql`
        SELECT id FROM authors
        WHERE hm_site_id = ${siteId} AND lower(email) = ${email}
        LIMIT 1
      `;
    }
    if (!existing?.[0] && r.name) {
      existing = await workerSql`
        SELECT id FROM authors
        WHERE hm_site_id = ${siteId} AND name = ${r.name}
        LIMIT 1
      `;
    }
    if (existing?.[0]) {
      await workerSql`
        UPDATE authors SET
          name = ${r.name},
          title = ${r.title ?? null},
          avatar_url = ${r.avatar_url ?? null},
          bio = ${r.bio ?? null},
          email = COALESCE(${email}, email),
          password_hash = COALESCE(${r.password_hash ?? null}, password_hash),
          hm_sort_order = COALESCE(${r.hm_sort_order ?? null}, hm_sort_order),
          hm_site_id = ${siteId}
        WHERE id = ${existing[0].id}
      `;
      continue;
    }
    const taken = r.id
      ? await workerSql`SELECT id, hm_site_id FROM authors WHERE id = ${r.id} LIMIT 1`
      : [];
    if (r.id && !taken?.[0]) {
      await workerSql`
        INSERT INTO authors (id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash)
        VALUES (${r.id}, ${r.name}, ${r.title ?? null}, ${r.avatar_url ?? null}, ${r.bio ?? null},
          ${siteId}, ${r.hm_sort_order ?? 0}, ${email}, ${r.password_hash ?? null})
      `;
    } else {
      await workerSql`
        INSERT INTO authors (name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash)
        VALUES (${r.name}, ${r.title ?? null}, ${r.avatar_url ?? null}, ${r.bio ?? null},
          ${siteId}, ${r.hm_sort_order ?? 0}, ${email}, ${r.password_hash ?? null})
      `;
    }
  }
  return phpRows.length;
}
