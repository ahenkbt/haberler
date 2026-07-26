/**
 * Worker kenarı: suhaberajansi.com için BAĞIMSIZ su sitesi (asg/kirsehir id'sine yapışmaz).
 * Yanlış id=3 (ASG) meta'sını yakalar; Su editör haberlerini kirsehir(2) → su'ya taşır.
 */
import { neon } from "@neondatabase/serverless";

export const HM_BRAND_DB_BINDINGS = [
  {
    domain: "suhaberajansi.com",
    slug: "su",
    displayName: "Su Haber Ajansı",
    description: "Su Haber Ajansı dijital haber platformu",
    /** Bu id'ler asla su sitesi olarak kullanılmaz (ASG vb.). */
    forbiddenIds: [3],
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

/** Su haberlerinin yanlışlıkla bağlandığı eski site (Kırşehir). */
const KIRSEHIR_SITE_ID = 2;

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

function isForbiddenBrandId(binding, id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return true;
  const forbidden = binding.forbiddenIds || [];
  return forbidden.includes(n);
}

function rowLooksLikeProtectedSite(row) {
  const slug = normalizeSlug(row?.slug);
  if (PROTECTED_SLUGS.has(slug)) return true;
  const hosts = [row?.domain, row?.domain2, row?.domain3].map((d) => normalizeHost(d));
  if (hosts.some((h) => h.includes("ankarasehir") || h === "belediyehizmet.com")) return true;
  const name = String(row?.display_name || "").toLowerCase();
  if (name.includes("ankara şehir") || name.includes("ankara sehir")) return true;
  return false;
}

function isCleanBrandRow(row, binding) {
  if (!row) return false;
  if (isForbiddenBrandId(binding, row.id)) return false;
  if (rowLooksLikeProtectedSite(row)) return false;
  const slug = normalizeSlug(row.slug);
  return slug === binding.slug || slug === "suhaber";
}

async function clearBrandDomainFromOthers(sql, binding, keepId) {
  const host = binding.domain;
  const www = `www.${host}`;
  await sql`
    UPDATE hm_news_sites
    SET
      domain = CASE WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host} THEN NULL ELSE domain END,
      domain2 = CASE WHEN lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host} THEN NULL ELSE domain2 END,
      domain3 = CASE WHEN lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host} THEN NULL ELSE domain3 END,
      updated_at = NOW()
    WHERE id <> ${keepId}
      AND (
        lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
        OR lower(coalesce(domain, '')) = ${www}
        OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
        OR lower(coalesce(domain2, '')) = ${www}
        OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
        OR lower(coalesce(domain3, '')) = ${www}
      )
  `;
}

async function migrateSuNewsFromKirsehir(sql, suSiteId) {
  if (!Number.isFinite(Number(suSiteId)) || Number(suSiteId) <= 0) return 0;
  const moved = await sql`
    UPDATE news
    SET
      site_id = ${suSiteId},
      owner_site_id = ${suSiteId},
      site_only = true,
      updated_at = NOW()
    WHERE (site_id = ${KIRSEHIR_SITE_ID} OR owner_site_id = ${KIRSEHIR_SITE_ID})
      AND coalesce(is_editor_manual, false) = true
      AND (
        coalesce(site_only, false) = true
        OR title ILIKE ${"%Su Mengüç%"}
        OR title ILIKE ${"%Su Menguc%"}
        OR slug ILIKE ${"%su-menguc%"}
        OR slug ILIKE ${"%ahlaki-restorasyon%"}
        OR slug ILIKE ${"%gelecek-partisi-genel-merkezi%"}
      )
    RETURNING id
  `;
  // Su yazarlarını Kırşehir'den bağımsız su sitesine taşı
  await sql`
    UPDATE authors
    SET hm_site_id = ${suSiteId}
    WHERE hm_site_id = ${KIRSEHIR_SITE_ID}
      AND (
        name ILIKE ${"%Serkan Sekreter%"}
        OR name ILIKE ${"%Su Mengüç%"}
        OR name ILIKE ${"%Su Menguc%"}
      )
  `.catch(() => null);
  // Kırşehir'de çapraz site manuel haber sızıntısını kapat
  await sql`
    UPDATE hm_news_sites
    SET
      layout_json = CASE
        WHEN layout_json IS NULL OR btrim(layout_json) = '' THEN ${JSON.stringify({ hmAllowCrossSiteManualNews: false })}
        WHEN layout_json::jsonb ? 'hmAllowCrossSiteManualNews'
          THEN jsonb_set(layout_json::jsonb, '{hmAllowCrossSiteManualNews}', 'false', true)::text
        ELSE (layout_json::jsonb || '{"hmAllowCrossSiteManualNews":false}'::jsonb)::text
      END,
      updated_at = NOW()
    WHERE id = ${KIRSEHIR_SITE_ID}
  `.catch(() => null);
  return Array.isArray(moved) ? moved.length : 0;
}

async function insertCleanSuSite(sql, binding) {
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
      ${binding.slug}, ${binding.domain}, NULL, NULL, ${binding.displayName}, ${binding.description},
      ${contactJson}, ${layoutJson}, NULL, true, NOW(), NOW()
    )
    RETURNING id, slug, domain, domain2, domain3, display_name, description,
              contact_json, layout_json, active, created_at, updated_at
  `;
  return created?.[0] || null;
}

async function findCleanBrandRow(sql, binding) {
  const host = binding.domain;
  const slug = binding.slug;
  const bySlug = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description,
           contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = ${slug}
       OR lower(trim(both '/' from slug)) = ${"suhaber"}
    ORDER BY id ASC
  `;
  for (const row of bySlug || []) {
    if (isCleanBrandRow(row, binding)) return row;
  }
  const byDomain = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description,
           contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
    ORDER BY id ASC
  `;
  for (const row of byDomain || []) {
    if (isCleanBrandRow(row, binding)) return row;
  }
  return null;
}

/**
 * Upstream meta (ör. id=3 slug=su) ASG ile çakışıyorsa true.
 */
export async function upstreamBrandMetaConflicts(env, binding, upstreamMeta) {
  if (!binding || !upstreamMeta?.id) return true;
  if (isForbiddenBrandId(binding, upstreamMeta.id)) return true;
  if (normalizeSlug(upstreamMeta.slug) !== binding.slug && normalizeSlug(upstreamMeta.slug) !== "suhaber") {
    return true;
  }
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) {
    // DB yoksa id=3 / ankara domain şüphesinde çakışma say
    const dom = normalizeHost(upstreamMeta.domain);
    return isForbiddenBrandId(binding, upstreamMeta.id) || dom.includes("ankarasehir");
  }
  try {
    const sql = neon(dbUrl);
    const rows = await sql`
      SELECT id, slug, domain, domain2, domain3, display_name
      FROM hm_news_sites WHERE id = ${Number(upstreamMeta.id)} LIMIT 1
    `;
    const row = rows?.[0];
    if (!row) return true;
    if (rowLooksLikeProtectedSite(row)) return true;
    if (!isCleanBrandRow({ ...row, slug: upstreamMeta.slug }, binding) && rowLooksLikeProtectedSite(row)) {
      return true;
    }
    // DB'deki gerçek slug korumalıysa (asg) — meta yalan söylüyor
    if (PROTECTED_SLUGS.has(normalizeSlug(row.slug))) return true;
    return !isCleanBrandRow(row, binding);
  } catch {
    return isForbiddenBrandId(binding, upstreamMeta.id);
  }
}

/**
 * @returns {Promise<{ meta: object, action: string, movedNews?: number } | null>}
 */
export async function ensureBrandHmSiteMeta(env, { domain, slug } = {}) {
  const binding = matchBrandBinding({ domain, slug });
  if (!binding) return null;
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return null;

  const sql = neon(dbUrl);

  // Kirli "su" satırı: yasaklı id veya korumalı site görünümü → slug'ı boşalt / domain temizle
  const dirty = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name
    FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN (${binding.slug}, ${"suhaber"})
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${binding.domain}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${binding.domain}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${binding.domain}
  `;
  for (const row of dirty || []) {
    if (isCleanBrandRow(row, binding)) continue;
    const slugNow = normalizeSlug(row.slug);
    // ASG (id=3) Su'ya dönüşmüşse kimliği geri ver
    if (Number(row.id) === 3) {
      const suSlug = slugNow === binding.slug || slugNow === "suhaber";
      await sql`
        UPDATE hm_news_sites
        SET
          slug = ${"asg"},
          domain = ${"ankarasehirgazetesi.com"},
          domain2 = ${"www.ankarasehirgazetesi.com"},
          domain3 = NULL,
          display_name = CASE
            WHEN ${suSlug} THEN ${"Ankara Şehir Gazetesi"}
            ELSE COALESCE(NULLIF(display_name, ''), ${"Ankara Şehir Gazetesi"})
          END,
          active = true,
          updated_at = NOW()
        WHERE id = 3
      `;
      continue;
    }
    // Korumalı / yasaklı satır: yalnızca Su domainini temizle; yanlış su slug'ını orphan et
    if (PROTECTED_SLUGS.has(slugNow) || isForbiddenBrandId(binding, row.id)) {
      await sql`
        UPDATE hm_news_sites
        SET
          domain = CASE WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${binding.domain} THEN NULL ELSE domain END,
          domain2 = CASE WHEN lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${binding.domain} THEN NULL ELSE domain2 END,
          domain3 = CASE WHEN lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${binding.domain} THEN NULL ELSE domain3 END,
          slug = CASE
            WHEN lower(trim(both '/' from slug)) IN (${binding.slug}, ${"suhaber"})
              AND lower(trim(both '/' from slug)) <> ${"asg"}
            THEN ${`su-orphaned-${row.id}`}
            ELSE slug
          END,
          updated_at = NOW()
        WHERE id = ${row.id}
      `;
    }
  }

  let row = await findCleanBrandRow(sql, binding);
  let action = "already";
  if (!row) {
    // Eski kirli su slug'ı varsa (orphaned değil, temizlenebilir) — yeni INSERT
    try {
      row = await insertCleanSuSite(sql, binding);
      action = "created";
    } catch (err) {
      // unique slug: orphaned çakışması — slug'ı alıp güncelle
      const orphan = await sql`
        SELECT id, slug, domain, domain2, domain3, display_name, description,
               contact_json, layout_json, active, created_at, updated_at
        FROM hm_news_sites
        WHERE lower(trim(both '/' from slug)) LIKE ${"su-orphaned-%"}
           OR lower(trim(both '/' from slug)) = ${binding.slug}
        ORDER BY id DESC
        LIMIT 5
      `;
      const usable = (orphan || []).find((r) => !isForbiddenBrandId(binding, r.id) && !rowLooksLikeProtectedSite(r));
      if (usable) {
        const updated = await sql`
          UPDATE hm_news_sites
          SET
            slug = ${binding.slug},
            domain = ${binding.domain},
            domain2 = NULL,
            domain3 = NULL,
            display_name = ${binding.displayName},
            description = ${binding.description},
            layout_json = COALESCE(NULLIF(layout_json, ''), ${defaultLayoutJson()}),
            active = true,
            updated_at = NOW()
          WHERE id = ${usable.id}
          RETURNING id, slug, domain, domain2, domain3, display_name, description,
                    contact_json, layout_json, active, created_at, updated_at
        `;
        row = updated?.[0] || usable;
        action = "reclaimed";
      } else {
        throw err;
      }
    }
  } else {
    // Domain bağını garanti et
    const host = binding.domain;
    const hasDomain = [row.domain, row.domain2, row.domain3].some((d) => normalizeHost(d) === host);
    if (!hasDomain || normalizeSlug(row.slug) !== binding.slug || row.active !== true) {
      const updated = await sql`
        UPDATE hm_news_sites
        SET
          slug = ${binding.slug},
          domain = ${host},
          active = true,
          display_name = COALESCE(NULLIF(display_name, ''), ${binding.displayName}),
          updated_at = NOW()
        WHERE id = ${row.id}
        RETURNING id, slug, domain, domain2, domain3, display_name, description,
                  contact_json, layout_json, active, created_at, updated_at
      `;
      row = updated?.[0] || row;
      action = "updated";
    }
  }

  if (!row?.id || isForbiddenBrandId(binding, row.id)) {
    return null;
  }

  await clearBrandDomainFromOthers(sql, binding, row.id);
  const movedNews = await migrateSuNewsFromKirsehir(sql, row.id).catch((err) => {
    console.error("[hm-brand-db-ensure/migrate-news]", String(err?.message || err).slice(0, 240));
    return 0;
  });

  return { meta: serializeMetaRow(row), action, movedNews };
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
