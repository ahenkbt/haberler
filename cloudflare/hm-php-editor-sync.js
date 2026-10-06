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

export async function loadPhpSiteCategories(newsSql, siteId) {
  if (!newsSql || !asPositiveInt(siteId)) return [];
  const exclusive = await newsSql`
    SELECT id, name, slug, color, exclusive_site_id, sort_order
    FROM categories
    WHERE exclusive_site_id = ${siteId}
    ORDER BY sort_order ASC, id ASC
  `;
  if (exclusive?.length) return exclusive;
  const shared = await newsSql`
    SELECT id, name, slug, color, exclusive_site_id, sort_order
    FROM categories
    WHERE exclusive_site_id IS NULL OR exclusive_site_id = ${siteId}
    ORDER BY CASE WHEN exclusive_site_id = ${siteId} THEN 0 ELSE 1 END, sort_order ASC, id ASC
  `;
  return shared || [];
}

export async function syncPhpCategoriesToWorker(workerSql, newsSql, siteId) {
  const phpRows = await loadPhpSiteCategories(newsSql, siteId);
  if (!phpRows.length) return [];
  const out = [];
  for (const r of phpRows) {
    const slug = String(r.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    const exclusive = asPositiveInt(r.exclusive_site_id) || siteId;
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

export async function loadPhpSiteAuthors(newsSql, siteId) {
  if (!newsSql || !asPositiveInt(siteId)) return [];
  const rows = await newsSql`
    SELECT id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash
    FROM authors
    WHERE hm_site_id = ${siteId}
    ORDER BY COALESCE(hm_sort_order, 2147483647) ASC, id ASC
  `;
  return rows || [];
}

export async function syncPhpAuthorsToWorker(workerSql, newsSql, siteId) {
  const phpRows = await loadPhpSiteAuthors(newsSql, siteId);
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
    if (!existing?.[0] && r.id) {
      existing = await workerSql`
        SELECT id FROM authors
        WHERE id = ${r.id} AND (hm_site_id IS NULL OR hm_site_id = ${siteId})
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
