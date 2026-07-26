/**
 * Worker kenarı: bilinen marka alanları için meta lookup.
 * Domain sahipliği ADMIN panelinden yönetilir — silinen domain'i /su'ya geri bağlama.
 * Yalnızca DB'de mevcut satırı okur; domain boşsa zorla yazmaz.
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

/**
 * Sadece okuma: domain veya slug ile mevcut satır.
 * Domain'i slug satırına yazmaz; admin silmişse geri bağlama.
 */
export async function ensureBrandHmSiteMeta(env, { domain, slug } = {}) {
  const binding = matchBrandBinding({ domain, slug });
  if (!binding) return null;
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return null;

  const sql = neon(dbUrl);
  const host = normalizeHost(domain || binding.domain);
  const wantSlug = normalizeSlug(slug || "");

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

  // 2) Slug ile bul — domain ekleme/yazma YOK
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

  // Domain/slug yok — admin oluştursun; kenarda INSERT/UPDATE yok
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
