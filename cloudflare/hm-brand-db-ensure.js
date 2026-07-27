/**
 * Worker kenarı: bilinen marka alanları için meta lookup + Su domain onarımı.
 * /tr/su (en düşük id) → suhaberajansi.com; sahte slug=su satırlarını temizler.
 */
import { neon } from "@neondatabase/serverless";

export const HM_BRAND_DB_BINDINGS = [
  {
    domain: "suhaberajansi.com",
    slug: "su",
    displayName: "Su Haber Ajansı",
    description: "Su Haber Ajansı dijital haber platformu",
  },
];

const PROTECTED_SLUGS = new Set([
  "asg",
  "kirsehir",
  "kh",
  "vkd",
  "tr",
  "vatanhaber",
  "ankarahabergundemi",
  "trafik",
  "su",
]);

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

function normalizeSlug(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function serializeMetaRow(row) {
  let layout = null;
  try {
    layout = row.layout_json ? JSON.parse(String(row.layout_json)) : null;
  } catch {
    layout = null;
  }
  let contact = null;
  try {
    contact = row.contact_json ? JSON.parse(String(row.contact_json)) : null;
  } catch {
    contact = null;
  }
  return {
    id: row.id,
    slug: row.slug,
    domain: row.domain ?? null,
    domain2: row.domain2 ?? null,
    domain3: row.domain3 ?? null,
    displayName: row.display_name,
    description: row.description ?? null,
    contact,
    layout,
    seoVerification: null,
    createdAt: row.created_at ?? null,
    layoutUpdatedAt: row.updated_at ?? null,
    _edgeEnsured: true,
  };
}

export function matchBrandBinding({ domain, slug } = {}) {
  const host = normalizeHost(domain || "");
  const s = normalizeSlug(slug || "");
  return (
    HM_BRAND_DB_BINDINGS.find((b) => (host && b.domain === host) || (s && b.slug === s)) || null
  );
}

/** Eski belediyehizmet satırı / editör haber siteId — kanonik Su. */
const SU_CANONICAL_SITE_ID = 2;

/**
 * sehirgazetesiankara@gmail.com yanlışlıkla ankarahabergundemi'ye bağlı;
 * aynı şifre hash'i ile ASG (slug=asg) üzerine kopyala (AHB kaydı silinmez).
 */
export async function repairAsgEditorMisassignmentOnNeon(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return { ok: false, reason: "no-db" };
  const sql = neon(dbUrl);
  const asg = await sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = 'asg'
    ORDER BY id ASC
    LIMIT 1
  `;
  const asgId = asg?.[0]?.id;
  if (!asgId) return { ok: false, reason: "asg-missing" };

  const src = await sql`
    SELECT id, email, password_hash, display_name, is_active, site_id
    FROM hm_site_editors
    WHERE lower(email) = 'sehirgazetesiankara@gmail.com'
      AND is_active = true
    ORDER BY id ASC
    LIMIT 1
  `;
  const row = src?.[0];
  if (!row) return { ok: false, reason: "editor-missing" };
  if (Number(row.site_id) === Number(asgId)) {
    return { ok: true, action: "already", siteId: asgId, editorId: row.id };
  }

  const existingOnAsg = await sql`
    SELECT id FROM hm_site_editors
    WHERE site_id = ${asgId} AND lower(email) = 'sehirgazetesiankara@gmail.com'
    LIMIT 1
  `;
  if (existingOnAsg?.[0]?.id) {
    await sql`
      UPDATE hm_site_editors
      SET password_hash = ${row.password_hash},
          display_name = 'Ankara Şehir Gazetesi',
          is_active = true,
          updated_at = now()
      WHERE id = ${existingOnAsg[0].id}
    `;
    return { ok: true, action: "updated", siteId: asgId, editorId: existingOnAsg[0].id };
  }

  const inserted = await sql`
    INSERT INTO hm_site_editors (site_id, email, password_hash, display_name, is_active)
    VALUES (
      ${asgId},
      'sehirgazetesiankara@gmail.com',
      ${row.password_hash},
      'Ankara Şehir Gazetesi',
      true
    )
    RETURNING id
  `;
  return {
    ok: true,
    action: "copied",
    siteId: asgId,
    editorId: inserted?.[0]?.id ?? null,
    fromSiteId: row.site_id,
  };
}

async function repairSuDomainOnNeon(sql) {
  const id2 = await sql`SELECT id FROM hm_news_sites WHERE id = ${SU_CANONICAL_SITE_ID} LIMIT 1`;
  const suRows = await sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
    ORDER BY id ASC
    LIMIT 1
  `;
  const canonicalId = id2?.[0]?.id || suRows?.[0]?.id;
  if (!canonicalId) return null;

  // belediyehizmet.com tamamen kaldır
  await sql`
    UPDATE hm_news_sites
    SET
      domain = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('belediyehizmet.com', 'belediyehizzmet.com') THEN NULL
        ELSE domain
      END,
      domain2 = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          IN ('belediyehizmet.com', 'belediyehizzmet.com') THEN NULL
        ELSE domain2
      END,
      domain3 = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          IN ('belediyehizmet.com', 'belediyehizzmet.com') THEN NULL
        ELSE domain3
      END,
      updated_at = NOW()
    WHERE
      lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
        IN ('belediyehizmet.com', 'belediyehizzmet.com')
      OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
        IN ('belediyehizmet.com', 'belediyehizzmet.com')
      OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
        IN ('belediyehizmet.com', 'belediyehizzmet.com')
  `;

  // Diğer sitelerden suhaber* temizle (kanonik id=2'ye dokunma).
  await sql`
    UPDATE hm_news_sites
    SET
      domain = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
        ELSE domain
      END,
      updated_at = NOW()
    WHERE id <> ${canonicalId}
      AND lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
        IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
  `;
  try {
    await sql`
      UPDATE hm_news_sites
      SET
        domain2 = CASE
          WHEN lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
            IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
          ELSE domain2
        END,
        domain3 = CASE
          WHEN lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
            IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
          ELSE domain3
        END,
        updated_at = NOW()
      WHERE id <> ${canonicalId}
        AND (
          lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
            IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
          OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
            IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        )
    `;
  } catch {
    /* domain2/domain3 yoksa yoksay */
  }

  await sql`
    DELETE FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
      AND id <> ${canonicalId}
  `;

  // Önce yalnızca domain (her zaman var) — domain2/3 ayrı (eksik kolon kırılmasın)
  await sql`
    UPDATE hm_news_sites
    SET
      slug = 'su',
      domain = 'suhaberajansi.com',
      display_name = CASE
        WHEN trim(both from coalesce(display_name, '')) = '' THEN 'Su Haber Ajansı'
        ELSE display_name
      END,
      active = true,
      updated_at = NOW()
    WHERE id = ${canonicalId}
  `;
  try {
    await sql`
      UPDATE hm_news_sites
      SET
        domain2 = 'www.suhaberajansi.com',
        domain3 = 'suhaberajansi.com.tr',
        updated_at = NOW()
      WHERE id = ${canonicalId}
    `;
  } catch {
    /* domain2/domain3 yoksa yoksay */
  }

  return canonicalId;
}

/**
 * Domain/slug ile bak; Su markası için domain sahipliğini onar, kanonik satırı dön.
 */
export async function ensureBrandHmSiteMeta(env, { domain, slug } = {}) {
  const binding = matchBrandBinding({ domain, slug });
  if (!binding) return null;
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return null;

  const sql = neon(dbUrl);
  const host = normalizeHost(domain || binding.domain);
  const wantSlug = normalizeSlug(slug || "");

  // Su markası: domaini /tr/su (min id) üzerine sabitle
  if (binding.slug === "su" || host === "suhaberajansi.com") {
    try {
      await repairSuDomainOnNeon(sql);
    } catch (err) {
      console.error("[hm-brand-db-ensure] su domain repair", String(err?.message || err).slice(0, 240));
    }
  }

  // 1) Domain ile bul — admin hangi siteye verdiyse onu döndür
  if (host) {
    const byDomain = await sql`
      SELECT id, slug, domain, domain2, domain3, display_name, description,
             contact_json, layout_json, active, created_at, updated_at
      FROM hm_news_sites
      WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
         OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
         OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
      ORDER BY id ASC
      LIMIT 1
    `;
    if (byDomain?.[0] && !PROTECTED_SLUGS.has(normalizeSlug(byDomain[0].slug))) {
      return { meta: serializeMetaRow(byDomain[0]), action: "lookup_domain" };
    }
    if (byDomain?.[0]) {
      return { meta: serializeMetaRow(byDomain[0]), action: "lookup_domain" };
    }
  }

  // 2) Slug ile bul — en düşük id (kanonik /tr/su)
  const slugKey = wantSlug || binding.slug;
  if (slugKey) {
    const bySlug = await sql`
      SELECT id, slug, domain, domain2, domain3, display_name, description,
             contact_json, layout_json, active, created_at, updated_at
      FROM hm_news_sites
      WHERE lower(trim(both '/' from slug)) = ${slugKey}
         OR lower(trim(both '/' from slug)) = ${"suhaber"}
      ORDER BY id ASC
      LIMIT 1
    `;
    if (bySlug?.[0] && !PROTECTED_SLUGS.has(normalizeSlug(bySlug[0].slug))) {
      return { meta: serializeMetaRow(bySlug[0]), action: "lookup_slug" };
    }
  }

  return null;
}

export function brandMetaJsonResponse(meta, extraHeaders = {}) {
  return new Response(JSON.stringify(meta), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-render-proxy",
      "x-yekpare-hm-brand-ensure": "1",
      ...extraHeaders,
    },
  });
}
