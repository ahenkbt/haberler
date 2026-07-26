/**
 * Worker kenarında: bilinen marka alanları için hm_news_sites satırını Neon'da oluştur/bağla.
 * Render API eski kaldığında bile /tr/su meta 404'ünü kırar (DATABASE_URL Worker secret).
 *
 * GÜVENLİK: Başka sitelerin satırını (asg vb.) ASLA slug/domain ile ezme — yalnız
 * slug=su/suhaber veya domain=suhaberajansi olan satırı güncelle; aksi halde INSERT.
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

/** Bu slug'lar asla marka-ensure UPDATE hedefi olamaz. */
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
  const s = normalizeSlug(slug || "");
  return (
    HM_BRAND_DB_BINDINGS.find((b) => (host && b.domain === host) || (s && b.slug === s)) || null
  );
}

function rowOwnsBrand(row, binding) {
  if (!row || !binding) return false;
  const slug = normalizeSlug(row.slug);
  if (slug === binding.slug || slug === "suhaber") return true;
  const host = binding.domain;
  return [row.domain, row.domain2, row.domain3].some((d) => normalizeHost(d) === host);
}

async function findBrandRow(sql, binding) {
  const host = binding.domain;
  const slug = binding.slug;
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
  if (byDomain?.[0] && rowOwnsBrand(byDomain[0], binding)) return byDomain[0];

  const bySlug = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description,
           contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = ${slug}
       OR lower(trim(both '/' from slug)) = ${"suhaber"}
    ORDER BY id ASC
    LIMIT 1
  `;
  if (bySlug?.[0] && !PROTECTED_SLUGS.has(normalizeSlug(bySlug[0].slug))) {
    return bySlug[0];
  }
  return null;
}

/**
 * Yanlışlıkla asg satırını su'ya çevirdiysek: su satırını silip asg'yi API'den geri yükle,
 * ardından temiz su INSERT et.
 */
async function repairIfStoleProtectedSite(sql, binding, apiOrigin) {
  const stolen = await sql`
    SELECT id, slug, domain, layout_json
    FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = ${binding.slug}
      AND (
        lower(coalesce(domain, '')) LIKE ${"%ankarasehir%"}
        OR lower(coalesce(display_name, '')) LIKE ${"%ankara şehir%"}
        OR (layout_json IS NOT NULL AND layout_json LIKE ${"%ahenkAnkaraGrid%"})
      )
    LIMIT 1
  `;
  // Daha sık görülen bozulma: slug=su ama id daha önce asg idi; asg slug'ı bu DB'de yok.
  const suRows = await sql`
    SELECT id, slug, domain, display_name, layout_json
    FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = ${binding.slug}
    LIMIT 1
  `;
  const asgRows = await sql`
    SELECT id FROM hm_news_sites WHERE lower(trim(both '/' from slug)) = ${"asg"} LIMIT 1
  `;
  const su = suRows?.[0];
  if (!su || asgRows?.[0]) return null;

  // asg yok + su var → muhtemel ezme. Render/news'ten asg meta çekip id'yi geri ver, su'yu yeni id yap.
  const origin = String(apiOrigin || "https://goalgo-y7ze.onrender.com").replace(/\/+$/, "");
  let asgMeta = null;
  try {
    const res = await fetch(`${origin}/api/hm/meta/by-slug/asg?includePageContent=1`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) asgMeta = await res.json();
  } catch {
    asgMeta = null;
  }
  if (!asgMeta?.id || normalizeSlug(asgMeta.slug) !== "asg") return null;

  const layoutJson = JSON.stringify(asgMeta.layout || {});
  const contactJson = JSON.stringify(asgMeta.contact || {});
  const description = asgMeta.description ?? null;
  const displayName = asgMeta.displayName || "Ankara Şehir Gazetesi";
  const domain = normalizeHost(asgMeta.domain) || "ankarasehirgazetesi.com";
  const domain2 = asgMeta.domain2 ? normalizeHost(asgMeta.domain2) : "www.ankarasehirgazetesi.com";
  const domain3 = asgMeta.domain3 ? normalizeHost(asgMeta.domain3) : null;
  const keepId = su.id;

  await sql`
    UPDATE hm_news_sites
    SET
      slug = ${"asg"},
      domain = ${domain},
      domain2 = ${domain2},
      domain3 = ${domain3},
      display_name = ${displayName},
      description = ${description},
      contact_json = ${contactJson},
      layout_json = ${layoutJson},
      active = true,
      updated_at = NOW()
    WHERE id = ${keepId}
  `;

  const layoutSu = defaultLayoutJson();
  const contactSu = JSON.stringify({
    phone: "",
    email: "editor@suhaberajansi.com",
    address: "",
  });
  const created = await sql`
    INSERT INTO hm_news_sites (
      slug, domain, domain2, domain3, display_name, description,
      contact_json, layout_json, verification_json, active, created_at, updated_at
    ) VALUES (
      ${binding.slug}, ${binding.domain}, NULL, NULL, ${binding.displayName}, ${binding.description},
      ${contactSu}, ${layoutSu}, NULL, true, NOW(), NOW()
    )
    RETURNING id, slug, domain, domain2, domain3, display_name, description,
              contact_json, layout_json, active, created_at, updated_at
  `;
  return { meta: serializeMetaRow(created[0]), action: "repaired_asg_and_created_su" };
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
  const apiOrigin = String(env?.API_ORIGIN || env?.RENDER_API_ORIGIN || "").trim();

  const repaired = await repairIfStoleProtectedSite(sql, binding, apiOrigin).catch((err) => {
    console.error("[hm-brand-db-ensure/repair]", String(err?.message || err).slice(0, 240));
    return null;
  });
  if (repaired) return repaired;

  const row = await findBrandRow(sql, binding);
  if (row) {
    if (PROTECTED_SLUGS.has(normalizeSlug(row.slug)) && normalizeSlug(row.slug) !== binding.slug) {
      // Korunan site — dokunma, yeni satır aç
    } else {
      const host = binding.domain;
      const d1 = normalizeHost(row.domain);
      const d2 = normalizeHost(row.domain2);
      const d3 = normalizeHost(row.domain3);
      const hasDomain = d1 === host || d2 === host || d3 === host;
      let nextDomain = row.domain;
      let nextDomain2 = row.domain2;
      let nextDomain3 = row.domain3;
      if (!hasDomain) {
        if (!d1) nextDomain = host;
        else if (!d2) nextDomain2 = host;
        else if (!d3) nextDomain3 = host;
        else nextDomain = host;
      }
      const needsSlug = normalizeSlug(row.slug) !== binding.slug;
      const needsActivate = row.active !== true;
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
            AND lower(trim(both '/' from slug)) IN (${binding.slug}, ${"suhaber"})
          RETURNING id, slug, domain, domain2, domain3, display_name, description,
                    contact_json, layout_json, active, created_at, updated_at
        `;
        if (updated?.[0]) {
          return { meta: serializeMetaRow(updated[0]), action: "updated" };
        }
      } else {
        return { meta: serializeMetaRow(row), action: "already" };
      }
    }
  }

  const layoutJson = defaultLayoutJson();
  const contactJson = JSON.stringify({
    phone: "",
    email: "editor@suhaberajansi.com",
    address: "",
  });
  try {
    const created = await sql`
      INSERT INTO hm_news_sites (
        slug, domain, domain2, domain3, display_name, description,
        contact_json, layout_json, verification_json, active, created_at, updated_at
      ) VALUES (
        ${binding.slug}, ${binding.domain}, NULL, NULL, ${binding.displayName}, ${binding.description},
        ${contactJson}, ${layoutJson}, NULL, true, NOW(), NOW()
      )
      RETURNING id, slug, domain, domain2, domain3, display_name, description,
                contact_json, layout_json, active, created_at, updated_at
    `;
    return { meta: serializeMetaRow(created[0]), action: "created" };
  } catch (err) {
    // slug/domain unique — tekrar oku
    const again = await findBrandRow(sql, binding);
    if (again) return { meta: serializeMetaRow(again), action: "already_after_conflict" };
    throw err;
  }
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
