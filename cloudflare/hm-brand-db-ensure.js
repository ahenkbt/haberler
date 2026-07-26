/**
 * Worker kenarında: bilinen marka alanları için hm_news_sites satırını Neon'da oluştur/bağla.
 * Render API eski kaldığında bile /tr/su meta 404'ünü kırar (DATABASE_URL Worker secret).
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

function defaultLayoutJson() {
  return JSON.stringify({
    hmVitrinTheme: "esen",
    mansetVariant: "center-trio",
    showPlatformNav: false,
    hmNewsSliderEnabled: true,
    hmNewsBreakingBandEnabled: true,
    hmNewsHeaderMenuEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsEsenLeadPackEnabled: true,
    hmAllowCrossSiteManualNews: false,
    hmFooterAboutHtml:
      "Su Haber Ajansı, güncel haber akışını hızlı, tarafsız ve güvenilir bir şekilde okuyucuya ulaştırmayı hedefleyen dijital bir haber platformudur.",
  });
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
  const s = String(slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  return (
    HM_BRAND_DB_BINDINGS.find((b) => (host && b.domain === host) || (s && b.slug === s)) || null
  );
}

/**
 * @returns {Promise<{ meta: object, action: string } | null>}
 */
export async function ensureBrandHmSiteMeta(env, { domain, slug } = {}) {
  const binding = matchBrandBinding({ domain, slug });
  if (!binding) return null;
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return null;

  const sql = neon(dbUrl);
  const host = binding.domain;

  const found = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description,
           contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
       OR lower(trim(both '/' from slug)) IN (${binding.slug}, 'suhaber')
    ORDER BY id ASC
    LIMIT 1
  `;

  if (found?.[0]) {
    const row = found[0];
    const d1 = normalizeHost(row.domain);
    const d2 = normalizeHost(row.domain2);
    const d3 = normalizeHost(row.domain3);
    const hasDomain = d1 === host || d2 === host || d3 === host;
    const slugNorm = String(row.slug || "")
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "");
    const needsSlug = slugNorm !== binding.slug;
    const needsActivate = row.active !== true;

    let nextDomain = row.domain;
    let nextDomain2 = row.domain2;
    let nextDomain3 = row.domain3;
    if (!hasDomain) {
      if (!d1) nextDomain = host;
      else if (!d2) nextDomain2 = host;
      else if (!d3) nextDomain3 = host;
      else nextDomain = host;
    }

    if (needsSlug || needsActivate || !hasDomain) {
      const updated = await sql`
        UPDATE hm_news_sites
        SET
          slug = ${binding.slug},
          domain = ${nextDomain},
          domain2 = ${nextDomain2},
          domain3 = ${nextDomain3},
          display_name = COALESCE(NULLIF(display_name, ''), ${binding.displayName}),
          active = true,
          updated_at = NOW()
        WHERE id = ${row.id}
        RETURNING id, slug, domain, domain2, domain3, display_name, description,
                  contact_json, layout_json, active, created_at, updated_at
      `;
      return { meta: serializeMetaRow(updated[0] || row), action: "updated" };
    }
    return { meta: serializeMetaRow(row), action: "already" };
  }

  const layoutJson = defaultLayoutJson();
  const contactJson = JSON.stringify({
    phone: "",
    email: "editor@suhaberajansi.com",
    address: "",
  });
  const created = await sql`
    INSERT INTO hm_news_sites (
      slug, domain, domain2, domain3, display_name, description,
      contact_json, layout_json, verification_json, active, created_at, updated_at
    ) VALUES (
      ${binding.slug}, ${host}, NULL, NULL, ${binding.displayName}, ${binding.description},
      ${contactJson}, ${layoutJson}, NULL, true, NOW(), NOW()
    )
    RETURNING id, slug, domain, domain2, domain3, display_name, description,
              contact_json, layout_json, active, created_at, updated_at
  `;
  return { meta: serializeMetaRow(created[0]), action: "created" };
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
