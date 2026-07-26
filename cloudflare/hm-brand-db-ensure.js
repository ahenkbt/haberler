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
  "vkd",
  "tr",
  "vatanhaber",
  "ankarahabergundemi",
  "trafik",
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

async function repairSuDomainOnNeon(sql) {
  const suRows = await sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
    ORDER BY id ASC
    LIMIT 1
  `;
  const canonicalId = suRows?.[0]?.id;
  if (!canonicalId) return null;

  await sql`
    UPDATE hm_news_sites
    SET
      domain = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
        ELSE domain
      END,
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
    WHERE lower(trim(both '/' from slug)) NOT IN ('su', 'suhaber')
      AND (
        lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
      )
  `;

  await sql`
    UPDATE hm_news_sites
    SET
      domain = 'suhaberajansi.com',
      domain2 = 'www.suhaberajansi.com',
      domain3 = COALESCE(NULLIF(trim(both from domain3), ''), 'suhaberajansi.com.tr'),
      display_name = CASE
        WHEN trim(both from coalesce(display_name, '')) = '' THEN 'Su Haber Ajansı'
        ELSE display_name
      END,
      active = true,
      updated_at = NOW()
    WHERE id = ${canonicalId}
      AND lower(trim(both '/' from slug)) IN ('su', 'suhaber')
  `;

  await sql`
    DELETE FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
      AND id > ${canonicalId}
  `;

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

export function brandMetaJsonResponse(meta, extra Headers = {}) {
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
