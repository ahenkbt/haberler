/**
 * Kenar dual-write: Worker Neon (DATABASE_URL) satırını PHP'nin okuduğu
 * Neon'a (NEWS_DATABASE_URL / twilight-pine) kopyalar. Container köprüsüne
 * ihtiyaç duymaz. Tüm HM siteleri — site_id satırdan gelir, ASG hardcode yok.
 */

function asInt(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asPositiveInt(v) {
  const n = asInt(v);
  return n != null && n > 0 ? n : null;
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null) return row[k];
  }
  return null;
}

function asText(v) {
  if (v == null) return null;
  return String(v);
}

function asBool(v, fallback = false) {
  if (v === true || v === false) return v;
  if (v == null) return fallback;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "t" || s === "1") return true;
  if (s === "false" || s === "f" || s === "0") return false;
  return fallback;
}

function asTags(v) {
  if (Array.isArray(v)) return v.map((t) => String(t).trim()).filter(Boolean);
  if (typeof v === "string" && v.startsWith("{") && v.endsWith("}")) {
    return v
      .slice(1, -1)
      .split(",")
      .map((t) => t.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

function tsOrNow(v) {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

async function applyTepeManset(sql, newsId, flag) {
  const id = asPositiveInt(newsId);
  if (!sql || !id) return;
  try {
    await sql`UPDATE news SET is_tepe_manset = ${flag} WHERE id = ${id}`;
  } catch (err) {
    console.error("[php-dual-tepe]", String(err?.message || err).slice(0, 120));
  }
}

async function resolvePhpCategoryId(sql, row) {
  const slug = String(pick(row, "category_slug", "categorySlug") || "")
    .trim()
    .toLowerCase();
  if (slug) {
    const hit = await sql`
      SELECT id FROM categories
      WHERE lower(slug) = ${slug}
      ORDER BY id ASC
      LIMIT 1
    `;
    if (hit?.[0]?.id) return Number(hit[0].id);
  }
  const given = asPositiveInt(pick(row, "category_id", "categoryId"));
  if (given) {
    const ok = await sql`SELECT id FROM categories WHERE id = ${given} LIMIT 1`;
    if (ok?.[0]?.id) return given;
  }
  const gundem = await sql`
    SELECT id FROM categories WHERE lower(slug) = 'gundem' ORDER BY id ASC LIMIT 1
  `;
  return gundem?.[0]?.id ? Number(gundem[0].id) : given;
}

export async function edgeUpsertHmMakale(sql, row) {
  const siteId = asPositiveInt(pick(row, "site_id", "siteId"));
  const title = String(pick(row, "title") || "").trim();
  const slug = String(pick(row, "slug") || "").trim();
  if (!sql || !siteId || !title || !slug) return { mirrored: false, reason: "makale-row" };
  const authorId = asPositiveInt(pick(row, "author_id", "authorId"));
  const spot = asText(pick(row, "spot"));
  const content = asText(pick(row, "content"));
  const imageUrl = asText(pick(row, "image_url", "imageUrl"));
  const status = String(pick(row, "status") || "published");
  const views = asInt(pick(row, "views")) ?? 0;
  const createdAt = tsOrNow(pick(row, "created_at", "createdAt"));
  const updatedAt = tsOrNow(pick(row, "updated_at", "updatedAt"));
  const id = asPositiveInt(pick(row, "id"));

  const bySlug = await sql`
    SELECT id FROM hm_makaleler
    WHERE site_id = ${siteId}
      AND lower(btrim(slug)) = lower(btrim(${slug}))
      AND author_id IS NOT DISTINCT FROM ${authorId}
    LIMIT 1
  `;
  if (bySlug?.[0]?.id) {
    await sql`
      UPDATE hm_makaleler SET
        title = ${title},
        spot = ${spot},
        content = ${content},
        image_url = ${imageUrl},
        status = ${status},
        views = ${views},
        updated_at = ${updatedAt}
      WHERE id = ${bySlug[0].id}
    `;
    return { mirrored: true, id: Number(bySlug[0].id), via: "slug" };
  }

  if (id) {
    const byId = await sql`SELECT id, site_id FROM hm_makaleler WHERE id = ${id} LIMIT 1`;
    if (!byId?.[0]) {
      await sql`
        INSERT INTO hm_makaleler (
          id, site_id, author_id, title, slug, spot, content, image_url, status, views, created_at, updated_at
        ) VALUES (
          ${id}, ${siteId}, ${authorId}, ${title}, ${slug}, ${spot}, ${content}, ${imageUrl},
          ${status}, ${views}, ${createdAt}, ${updatedAt}
        )
      `;
      return { mirrored: true, id, via: "same-id" };
    }
    if (Number(byId[0].site_id) === siteId) {
      await sql`
        UPDATE hm_makaleler SET
          author_id = ${authorId},
          title = ${title},
          slug = ${slug},
          spot = ${spot},
          content = ${content},
          image_url = ${imageUrl},
          status = ${status},
          views = ${views},
          updated_at = ${updatedAt}
        WHERE id = ${id}
      `;
      return { mirrored: true, id, via: "id-update" };
    }
  }

  const inserted = await sql`
    INSERT INTO hm_makaleler (
      site_id, author_id, title, slug, spot, content, image_url, status, views, created_at, updated_at
    ) VALUES (
      ${siteId}, ${authorId}, ${title}, ${slug}, ${spot}, ${content}, ${imageUrl},
      ${status}, ${views}, ${createdAt}, ${updatedAt}
    )
    RETURNING id
  `;
  return { mirrored: true, id: Number(inserted?.[0]?.id), via: "new-id" };
}

export async function edgeDeleteHmMakale(sql, id) {
  const n = asPositiveInt(id);
  if (!sql || !n) return { mirrored: false, reason: "id" };
  await sql`DELETE FROM hm_makaleler WHERE id = ${n}`;
  return { mirrored: true, id: n, via: "delete" };
}

export async function edgeUpsertNews(sql, row) {
  let siteId = asPositiveInt(pick(row, "site_id", "siteId"));
  const siteSlug = String(pick(row, "site_slug", "siteSlug") || "")
    .trim()
    .toLowerCase();
  if (sql && siteSlug) {
    try {
      const hit = await sql`SELECT id FROM hm_news_sites WHERE lower(slug) = ${siteSlug} LIMIT 1`;
      if (hit?.[0]?.id) siteId = Number(hit[0].id);
    } catch {
      /* keep worker site id */
    }
  }
  const title = String(pick(row, "title") || "").trim();
  const slug = String(pick(row, "slug") || "").trim();
  if (!sql || !siteId || !title || !slug) return { mirrored: false, reason: "news-row" };
  const categoryId = await resolvePhpCategoryId(sql, row);
  const authorId = asPositiveInt(pick(row, "author_id", "authorId"));
  const spot = asText(pick(row, "spot"));
  const content = asText(pick(row, "content"));
  const imageUrl = asText(pick(row, "image_url", "imageUrl"));
  const status = String(pick(row, "status") || "published");
  const tags = asTags(pick(row, "tags"));
  const isFeatured = asBool(pick(row, "is_featured", "isFeatured"));
  const isBreaking = asBool(pick(row, "is_breaking", "isBreaking"));
  const isSiteManset = asBool(pick(row, "is_site_manset", "isSiteManset"));
  const isTepeManset = asBool(pick(row, "is_tepe_manset", "isTepeManset", "is_featured", "isFeatured"));
  const isEditorManual = asBool(pick(row, "is_editor_manual", "isEditorManual"), true);
  const siteOnly = asBool(pick(row, "site_only", "siteOnly"), true);
  let ownerSiteId = asPositiveInt(pick(row, "owner_site_id", "ownerSiteId")) || siteId;
  if (siteSlug) ownerSiteId = siteId;
  const createdAt = tsOrNow(pick(row, "created_at", "createdAt"));
  const updatedAt = tsOrNow(pick(row, "updated_at", "updatedAt"));
  const id = asPositiveInt(pick(row, "id"));

  const bySlug = await sql`
    SELECT id FROM news
    WHERE site_id = ${siteId}
      AND lower(trim(both '/' from slug)) = lower(trim(both '/' from ${slug}))
    LIMIT 1
  `;
  if (bySlug?.[0]?.id) {
    await sql`
      UPDATE news SET
        title = ${title},
        spot = ${spot},
        content = ${content},
        image_url = ${imageUrl},
        category_id = ${categoryId},
        author_id = ${authorId},
        status = ${status},
        tags = ${tags},
        is_featured = ${isFeatured},
        is_breaking = ${isBreaking},
        is_site_manset = ${isSiteManset},
        is_tepe_manset = ${isTepeManset},
        is_editor_manual = ${isEditorManual},
        site_only = ${siteOnly},
        owner_site_id = ${ownerSiteId},
        updated_at = ${updatedAt}
      WHERE id = ${bySlug[0].id}
    `;
    await applyTepeManset(sql, bySlug[0].id, isTepeManset);
    return { mirrored: true, id: Number(bySlug[0].id), via: "slug" };
  }

  if (id) {
    const byId = await sql`SELECT id, site_id FROM news WHERE id = ${id} LIMIT 1`;
    if (!byId?.[0]) {
      await sql`
        INSERT INTO news (
          id, title, slug, spot, content, image_url, category_id, author_id,
          status, is_featured, is_breaking, is_site_manset, is_tepe_manset, tags,
          site_id, is_editor_manual, site_only, owner_site_id, created_at, updated_at
        ) VALUES (
          ${id}, ${title}, ${slug}, ${spot}, ${content}, ${imageUrl}, ${categoryId}, ${authorId},
          ${status}, ${isFeatured}, ${isBreaking}, ${isSiteManset}, ${isTepeManset}, ${tags},
          ${siteId}, ${isEditorManual}, ${siteOnly}, ${ownerSiteId}, ${createdAt}, ${updatedAt}
        )
      `;
      await applyTepeManset(sql, id, isTepeManset);
      return { mirrored: true, id, via: "same-id" };
    }
    if (Number(byId[0].site_id) === siteId) {
      await sql`
        UPDATE news SET
          title = ${title},
          slug = ${slug},
          spot = ${spot},
          content = ${content},
          image_url = ${imageUrl},
          category_id = ${categoryId},
          author_id = ${authorId},
          status = ${status},
          tags = ${tags},
          is_featured = ${isFeatured},
          is_breaking = ${isBreaking},
          is_site_manset = ${isSiteManset},
          is_tepe_manset = ${isTepeManset},
          is_editor_manual = ${isEditorManual},
          site_only = ${siteOnly},
          owner_site_id = ${ownerSiteId},
          updated_at = ${updatedAt}
        WHERE id = ${id}
      `;
      await applyTepeManset(sql, id, isTepeManset);
      return { mirrored: true, id, via: "id-update" };
    }
  }

  const inserted = await sql`
    INSERT INTO news (
      title, slug, spot, content, image_url, category_id, author_id,
      status, is_featured, is_breaking, is_site_manset, is_tepe_manset, tags,
      site_id, is_editor_manual, site_only, owner_site_id, created_at, updated_at
    ) VALUES (
      ${title}, ${slug}, ${spot}, ${content}, ${imageUrl}, ${categoryId}, ${authorId},
      ${status}, ${isFeatured}, ${isBreaking}, ${isSiteManset}, ${isTepeManset}, ${tags},
      ${siteId}, ${isEditorManual}, ${siteOnly}, ${ownerSiteId}, ${createdAt}, ${updatedAt}
    )
    RETURNING id
  `;
  await applyTepeManset(sql, inserted?.[0]?.id, isTepeManset);
  return { mirrored: true, id: Number(inserted?.[0]?.id), via: "new-id" };
}

export async function edgeDeleteNews(sql, id) {
  const n = asPositiveInt(id);
  if (!sql || !n) return { mirrored: false, reason: "id" };
  await sql`DELETE FROM news WHERE id = ${n}`;
  return { mirrored: true, id: n, via: "delete" };
}

export async function edgeUpsertAuthor(sql, row) {
  const id = asPositiveInt(pick(row, "id"));
  const name = String(pick(row, "name") || "").trim();
  const hmSiteId = asPositiveInt(pick(row, "hm_site_id", "hmSiteId"));
  if (!sql || !id || !name) return { mirrored: false, reason: "author-row" };
  const title = asText(pick(row, "title"));
  const avatarUrl = asText(pick(row, "avatar_url", "avatarUrl"));
  const bio = asText(pick(row, "bio"));
  const email = asText(pick(row, "email"));
  const passwordHash = asText(pick(row, "password_hash", "passwordHash"));
  const sort = asInt(pick(row, "hm_sort_order", "hmSortOrder"));

  const byId = await sql`SELECT id, hm_site_id FROM authors WHERE id = ${id} LIMIT 1`;
  if (byId?.[0]) {
    if (hmSiteId && Number(byId[0].hm_site_id) && Number(byId[0].hm_site_id) !== hmSiteId) {
      return { mirrored: true, id, via: "author-other-site-skip" };
    }
    await sql`
      UPDATE authors SET
        name = ${name},
        title = ${title},
        avatar_url = ${avatarUrl},
        bio = ${bio},
        email = ${email},
        password_hash = COALESCE(${passwordHash}, password_hash),
        hm_sort_order = COALESCE(${sort}, hm_sort_order),
        hm_site_id = COALESCE(${hmSiteId}, hm_site_id)
      WHERE id = ${id}
        AND (hm_site_id IS NULL OR hm_site_id = ${hmSiteId} OR ${hmSiteId}::int IS NULL)
    `;
    return { mirrored: true, id, via: "author-update" };
  }
  await sql`
    INSERT INTO authors (id, name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash)
    VALUES (${id}, ${name}, ${title}, ${avatarUrl}, ${bio}, ${hmSiteId}, ${sort ?? 0}, ${email}, ${passwordHash})
  `;
  return { mirrored: true, id, via: "author-insert" };
}

/**
 * PHP Neon yazar silme — hm_site_id zorunlu (başka site / PHP-only yazarları silme).
 * @param {number|{id?:unknown,hm_site_id?:unknown,hmSiteId?:unknown}} idOrRow
 */
export async function edgeDeleteAuthor(sql, idOrRow) {
  let id;
  let hmSiteId = null;
  if (idOrRow && typeof idOrRow === "object") {
    id = asPositiveInt(pick(idOrRow, "id"));
    hmSiteId = asPositiveInt(pick(idOrRow, "hm_site_id", "hmSiteId"));
  } else {
    id = asPositiveInt(idOrRow);
  }
  if (!sql || !id) return { mirrored: false, reason: "id" };
  if (!hmSiteId) return { mirrored: false, reason: "hm-site-id-required" };
  await sql`DELETE FROM authors WHERE id = ${id} AND hm_site_id = ${hmSiteId}`;
  return { mirrored: true, id, via: "delete-site-scoped" };
}

/**
 * @returns {Promise<{mirrored: boolean, via?: string, reason?: string, id?: number}>}
 */
function isReadOnlyTxError(err) {
  const msg = String(err?.message || err || "");
  return /read-only transaction|cannot execute \w+ in a read-only|default_transaction_read_only/i.test(msg);
}

export async function edgeMirrorNewsDbWrite(sql, table, op, rowOrId) {
  if (!sql) return { mirrored: false, reason: "no-news-sql" };
  try {
    if (table === "hm_makaleler") {
      return await (op === "delete" ? edgeDeleteHmMakale(sql, rowOrId) : edgeUpsertHmMakale(sql, rowOrId));
    }
    if (table === "news") {
      return await (op === "delete" ? edgeDeleteNews(sql, rowOrId) : edgeUpsertNews(sql, rowOrId));
    }
    if (table === "authors") {
      return await (op === "delete" ? edgeDeleteAuthor(sql, rowOrId) : edgeUpsertAuthor(sql, rowOrId));
    }
    return { mirrored: false, reason: "table" };
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 180);
    if (isReadOnlyTxError(err)) {
      console.warn("[hm-php-dual-write] NEWS_DATABASE_URL read-only — mirror atlandı", table, op, msg.slice(0, 120));
      return { mirrored: false, reason: "news-db-read-only" };
    }
    console.error("[hm-php-dual-write]", table, op, msg);
    return { mirrored: false, reason: msg.slice(0, 120) };
  }
}
