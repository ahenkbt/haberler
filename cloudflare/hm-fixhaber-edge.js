/**
 * Fix Haber (fix.tc) — Worker kenarı Neon seed + meta fallback.
 * Katalog: goalgo/artifacts/api-server/src/lib/hm-fixhaber-site.ts ile hizalı.
 */
import bcrypt from "bcryptjs";
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";

export const FIXHABER_SLUG = "fixhaber";
export const FIXHABER_DOMAIN = "fix.tc";
export const FIXHABER_CAMPAIGN_TAG = "fixhaber";

const FIXHABER_NAV_ONLY = Object.freeze([
  "fixhaber-haberler",
  "fixhaber-mobil",
  "fixhaber-donanim",
  "fixhaber-incelemeler",
  "fixhaber-yazilim",
  "fixhaber-oyun",
]);

const FIXHABER_NAV_HIDDEN = Object.freeze([
  "fixhaber-mobil-telefonlar",
  "fixhaber-mobil-akilli-saatler",
  "fixhaber-donanim-pc-laptop",
  "fixhaber-donanim-bilesenler",
  "fixhaber-yapay-zeka",
  "fixhaber-otomobil-mobilite",
  "fixhaber-akilli-ev-iot",
  "fixhaber-siber-guvenlik",
  "fixhaber-uzay-bilim",
  "fixhaber-kripto-blockchain",
  "fixhaber-rehberler",
  "fixhaber-listeler",
  "fixhaber-videolar",
  "fixhaber-teknoloji",
]);

const FIXHABER_CATEGORIES = Object.freeze([
  { slug: "fixhaber-haberler", name: "Haberler", color: "#002B5C" },
  { slug: "fixhaber-mobil", name: "Mobil", color: "#0a5a6e" },
  { slug: "fixhaber-mobil-telefonlar", name: "Telefonlar", color: "#0c6b82" },
  { slug: "fixhaber-mobil-akilli-saatler", name: "Akıllı Saatler", color: "#0e7c96" },
  { slug: "fixhaber-donanim", name: "Donanım", color: "#1a4a7a" },
  { slug: "fixhaber-donanim-pc-laptop", name: "PC / Laptop", color: "#245a8a" },
  { slug: "fixhaber-donanim-bilesenler", name: "Bileşenler", color: "#2e6a9a" },
  { slug: "fixhaber-yazilim", name: "Yazılım & Uygulamalar", color: "#1a5a3a" },
  { slug: "fixhaber-oyun", name: "Oyun", color: "#D20000" },
  { slug: "fixhaber-incelemeler", name: "İncelemeler", color: "#6b4c2a" },
  { slug: "fixhaber-yapay-zeka", name: "Yapay Zeka", color: "#4c1d95" },
  { slug: "fixhaber-otomobil-mobilite", name: "Otomobil / Mobilite", color: "#374151" },
  { slug: "fixhaber-akilli-ev-iot", name: "Akıllı Ev & IoT", color: "#0f766e" },
  { slug: "fixhaber-siber-guvenlik", name: "Siber Güvenlik", color: "#991b1b" },
  { slug: "fixhaber-uzay-bilim", name: "Uzay & Bilim", color: "#1e3a8a" },
  { slug: "fixhaber-kripto-blockchain", name: "Kripto & Blockchain", color: "#b45309" },
  { slug: "fixhaber-rehberler", name: "Nasıl Yapılır / Rehberler", color: "#4b5563" },
  { slug: "fixhaber-listeler", name: "Listeler / Öneriler", color: "#525252" },
  { slug: "fixhaber-videolar", name: "Videolar", color: "#7c2d12" },
  { slug: "fixhaber-teknoloji", name: "Teknoloji", color: "#0a5a6e" },
]);

const FIXHABER_SAMPLE = Object.freeze([
  {
    title: "Yapay zeka gündeminde yeni model duyurusu merakla bekleniyor",
    spot: "Sektör temsilcileri kısa süre içinde resmi açıklama yapılabileceğini belirtti.",
    categorySlug: "fixhaber-yapay-zeka",
    featured: true,
  },
  {
    title: "Akıllı telefon pazarında yeni amiral gemisi modeller yarışıyor",
    spot: "Kamera, pil ve yapay zeka özellikleri öne çıkan cihazlar vitrinde.",
    categorySlug: "fixhaber-mobil-telefonlar",
  },
  {
    title: "Uzay ajansından bilim misyonuna ilişkin güncelleme paylaşıldı",
    spot: "Araştırmacılar görev takviminin önümüzdeki hafta netleşeceğini söyledi.",
    categorySlug: "fixhaber-uzay-bilim",
  },
]);

const FIXHABER_RSS_FEEDS = Object.freeze([
  "https://www.ntv.com.tr/teknoloji.rss",
  "https://www.ntv.com.tr/otomobil.rss",
  "https://www.dirilispostasi.com/rss/teknoloji",
  "https://www.dirilispostasi.com/rss/teknoloji-ve-bilim",
  "https://www.birgun.net/rss/kategori/teknoloji-28",
  "https://www.birgun.net/rss/kategori/bilim-40",
  "https://www.birgun.net/rss/kategori/bilisim-25",
  "https://www.trthaber.com/teknoloji_articles.rss",
  "https://feeds.arstechnica.com/arstechnica/index",
  "https://www.theverge.com/rss/index.xml",
  "https://techcrunch.com/feed/",
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

function slugifyTitle(title) {
  return String(title || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildFixHaberLayoutJson() {
  const categorySlugs = FIXHABER_CATEGORIES.map((c) => c.slug);
  return {
    phpTheme: true,
    frontend: "php",
    hmVitrinTheme: "yenisafak",
    hmYsMansetPreset: "odatv",
    hmPrimaryColor: "#002B5C",
    hmSecondaryColor: "#D20000",
    logoUrl: "/fix/fix-haber-logo.png",
    faviconUrl: "/fix/fix-haber-favicon.png",
    hmYsSlogan: "Teknoloji ve bilim haberleri",
    hmYsKunye: {
      lead: "Fix Haber, teknoloji, bilim ve dijital dünyanın Türkçe haber sitesidir.",
      yayin: "FIX HABER",
      email: "bilgi@fix.tc",
      phone: "0532 229 18 92",
      address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
    },
    hmFooterAboutHtml:
      "<p>Fix Haber (fix.tc), teknoloji, bilim ve dijital dünyanın Türkçe haber sitesidir.</p>",
    hmNewsYsTickerEnabled: true,
    hmNewsYsMansetEnabled: true,
    hmNewsYsSideHeadlinesEnabled: true,
    hmNewsYsCategoryBlocksEnabled: true,
    hmNewsYsVideoBandEnabled: true,
    hmNewsYsAuthorsEnabled: true,
    hmNewsYsMostReadEnabled: true,
    hmNewsYsGalleryEnabled: true,
    hmNewsBreakingBandEnabled: true,
    hmNewsSliderEnabled: true,
    hmNewsHeaderMenuEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsCategorySectionsEnabled: true,
    hmCategorySortSlugs: categorySlugs,
    hmNavOnlyCategorySlugs: [...FIXHABER_NAV_ONLY],
    hmNavHiddenCategorySlugs: [...FIXHABER_NAV_HIDDEN],
    hmNewsHomeModuleItemCounts: { ysAuthors: 13 },
    hybridRssEnabled: true,
    showPlatformNav: false,
  };
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

async function releaseFixDomainFromOthers(sql, keepId) {
  const host = FIXHABER_DOMAIN;
  try {
    await sql`
      UPDATE hm_news_sites
      SET domain = CASE WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host} THEN NULL ELSE domain END,
          domain2 = CASE WHEN lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host} THEN NULL ELSE domain2 END,
          domain3 = CASE WHEN lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host} THEN NULL ELSE domain3 END,
          updated_at = NOW()
      WHERE id <> ${keepId}
    `;
  } catch (err) {
    console.error("[hm-fixhaber-edge] domain release", String(err?.message || err).slice(0, 160));
  }
}

async function upsertFixHaberSiteRow(sql) {
  const layout = JSON.stringify(buildFixHaberLayoutJson());
  const contact = JSON.stringify({
    email: "bilgi@fix.tc",
    phone: "0532 229 18 92",
    address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
  });
  const displayName = "Fix Haber";
  const description =
    "Fix Haber — teknoloji, bilim ve dijital dünyanın Türkçe haber merkezi.";

  const byDomain = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description,
           contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${FIXHABER_DOMAIN}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${FIXHABER_DOMAIN}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${FIXHABER_DOMAIN}
    ORDER BY id ASC
    LIMIT 1
  `;
  if (byDomain?.[0]?.id) {
    const row = byDomain[0];
    await releaseFixDomainFromOthers(sql, row.id);
    await sql`
      UPDATE hm_news_sites
      SET slug = ${FIXHABER_SLUG},
          domain = ${FIXHABER_DOMAIN},
          display_name = ${displayName},
          description = ${description},
          contact_json = ${contact}::jsonb,
          layout_json = ${layout}::jsonb,
          active = true,
          updated_at = NOW()
      WHERE id = ${row.id}
    `;
    const refreshed = await sql`
      SELECT id, slug, domain, domain2, domain3, display_name, description,
             contact_json, layout_json, active, created_at, updated_at
      FROM hm_news_sites WHERE id = ${row.id} LIMIT 1
    `;
    return { row: refreshed?.[0] || row, action: "updated_domain" };
  }

  const bySlug = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description,
           contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${FIXHABER_SLUG}
    ORDER BY id ASC
    LIMIT 1
  `;
  if (bySlug?.[0]?.id) {
    const row = bySlug[0];
    await releaseFixDomainFromOthers(sql, row.id);
    await sql`
      UPDATE hm_news_sites
      SET domain = ${FIXHABER_DOMAIN},
          display_name = ${displayName},
          description = ${description},
          contact_json = ${contact}::jsonb,
          layout_json = ${layout}::jsonb,
          active = true,
          updated_at = NOW()
      WHERE id = ${row.id}
    `;
    const refreshed = await sql`
      SELECT id, slug, domain, domain2, domain3, display_name, description,
             contact_json, layout_json, active, created_at, updated_at
      FROM hm_news_sites WHERE id = ${row.id} LIMIT 1
    `;
    return { row: refreshed?.[0] || row, action: "updated_slug" };
  }

  const inserted = await sql`
    INSERT INTO hm_news_sites (
      slug, domain, domain2, domain3, display_name, description,
      contact_json, layout_json, active, created_at, updated_at
    ) VALUES (
      ${FIXHABER_SLUG},
      ${FIXHABER_DOMAIN},
      NULL,
      NULL,
      ${displayName},
      ${description},
      ${contact}::jsonb,
      ${layout}::jsonb,
      true,
      NOW(),
      NOW()
    )
    RETURNING id, slug, domain, domain2, domain3, display_name, description,
              contact_json, layout_json, active, created_at, updated_at
  `;
  return { row: inserted?.[0] || null, action: "created" };
}

async function ensureFixHaberEditor(sql, siteId) {
  const email = "bilgi@fix.tc";
  const passwordHash = await bcrypt.hash(email, 10);
  try {
    await sql`ALTER TABLE hm_site_editors ADD COLUMN IF NOT EXISTS username text`;
  } catch {
    /* ignore */
  }
  const existing = await sql`
    SELECT id FROM hm_site_editors
    WHERE site_id = ${siteId} AND lower(email) = ${email}
    LIMIT 1
  `;
  if (existing?.[0]?.id) {
    await sql`
      UPDATE hm_site_editors
      SET password_hash = ${passwordHash},
          username = ${email},
          display_name = ${"Fix Haber Editör"},
          is_active = true,
          updated_at = NOW()
      WHERE id = ${existing[0].id}
    `;
    return;
  }
  await sql`
    INSERT INTO hm_site_editors (site_id, email, username, password_hash, display_name, is_active)
    VALUES (${siteId}, ${email}, ${email}, ${passwordHash}, ${"Fix Haber Editör"}, true)
  `;
}

async function ensureFixHaberCategories(sql, siteId) {
  const map = new Map();
  let order = 10;
  for (const cat of FIXHABER_CATEGORIES) {
    const existing = await sql`
      SELECT id FROM categories WHERE slug = ${cat.slug} LIMIT 1
    `;
    if (existing?.[0]?.id) {
      await sql`
        UPDATE categories
        SET name = ${cat.name},
            color = ${cat.color},
            exclusive_site_id = ${siteId},
            sort_order = ${order}
        WHERE id = ${existing[0].id}
      `;
      map.set(cat.slug, existing[0].id);
    } else {
      const created = await sql`
        INSERT INTO categories (name, slug, color, exclusive_site_id, sort_order)
        VALUES (${cat.name}, ${cat.slug}, ${cat.color}, ${siteId}, ${order})
        RETURNING id
      `;
      if (created?.[0]?.id) map.set(cat.slug, created[0].id);
    }
    order += 10;
  }
  return map;
}

async function ensureFixHaberSampleNews(sql, siteId, categoryIds) {
  let n = 0;
  for (const item of FIXHABER_SAMPLE) {
    const baseSlug = slugifyTitle(item.title) || `haber-${n + 1}`;
    const slug = `${FIXHABER_SLUG}-${baseSlug}`.slice(0, 100);
    const categoryId = categoryIds.get(item.categorySlug) ?? null;
    const content = `<p>${item.spot}</p><p>Fix Haber örnek haberi.</p>`;
    const existing = await sql`
      SELECT id FROM news
      WHERE site_id = ${siteId} AND slug = ${slug}
      LIMIT 1
    `;
    if (existing?.[0]?.id) {
      await sql`
        UPDATE news
        SET title = ${item.title},
            spot = ${item.spot},
            content = ${content},
            category_id = ${categoryId},
            status = 'published',
            is_featured = ${item.featured === true},
            is_site_manset = ${item.featured === true},
            tags = ${[FIXHABER_CAMPAIGN_TAG]},
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO news (
          title, spot, content, slug, category_id, status,
          is_featured, is_site_manset, is_breaking, tags,
          site_id, site_only, owner_site_id, is_editor_manual, views
        ) VALUES (
          ${item.title}, ${item.spot}, ${content}, ${slug}, ${categoryId}, 'published',
          ${item.featured === true}, ${item.featured === true}, false,
          ${[FIXHABER_CAMPAIGN_TAG]},
          ${siteId}, true, ${siteId}, true, 0
        )
      `;
    }
    n += 1;
  }
  return n;
}

async function ensureFixHaberCampaign(sql, siteId) {
  const tag = `${FIXHABER_CAMPAIGN_TAG}:site`;
  const name = "Fix Haber — RSS";
  const rows = await sql`
    SELECT id, name, tags, feeds, hm_site_ids FROM rss_campaigns
    WHERE lower(name) = lower(${name})
       OR ${tag} = ANY(tags)
    LIMIT 1
  `;
  const campaignTags = [FIXHABER_CAMPAIGN_TAG, tag, "require-image"];
  if (rows?.[0]?.id) {
    await sql`
      UPDATE rss_campaigns
      SET active = true,
          category_slug = ${"fixhaber-haberler"},
          tags = ${campaignTags},
          feeds = ${[...FIXHABER_RSS_FEEDS]},
          hm_site_ids = ${[siteId]}
      WHERE id = ${rows[0].id}
    `;
    return rows[0].id;
  }
  const inserted = await sql`
    INSERT INTO rss_campaigns (
      name, active, post_type, category_slug, tags, feeds, source_type,
      interval_minutes, daily_limit, download_images, headline, hm_site_ids,
      include_yekpare_haber, days_window, breaking_keywords, min_words,
      translate_enabled, haberler_filter_by_tags, added_count
    ) VALUES (
      ${name}, true, 'news', ${"fixhaber-haberler"}, ${campaignTags}, ${[...FIXHABER_RSS_FEEDS]}, 'rss',
      180, 40, true, false, ${[siteId]},
      false, 0, ARRAY[]::text[], 0,
      false, false, 0
    )
    RETURNING id
  `;
  return inserted?.[0]?.id ?? null;
}

/**
 * Idempotent Fix Haber Neon seed — meta/by-domain 404 fallback.
 * @returns {Promise<{ meta: object, action: string } | null>}
 */
export async function ensureFixHaberBrandMetaOnSql(sql) {
  if (!sql) return null;
  const upserted = await upsertFixHaberSiteRow(sql);
  const row = upserted?.row;
  if (!row?.id) return null;
  const siteId = Number(row.id);
  try {
    await ensureFixHaberEditor(sql, siteId);
    const cats = await ensureFixHaberCategories(sql, siteId);
    await ensureFixHaberSampleNews(sql, siteId, cats);
    await ensureFixHaberCampaign(sql, siteId);
  } catch (err) {
    console.error("[hm-fixhaber-edge] extras", String(err?.message || err).slice(0, 200));
  }
  return { meta: serializeMetaRow(row), action: upserted.action || "fixhaber_ensure" };
}

/**
 * Worker env: DATABASE_URL (panel) + NEWS_DATABASE_URL (PHP twilight-pine) — ikisine de yazar.
 * @returns {Promise<{ meta: object, action: string } | null>}
 */
export async function ensureFixHaberBrandMetaOnNeon(env) {
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql && !newsSql) return null;

  let last = null;
  if (newsSql) {
    try {
      last = await ensureFixHaberBrandMetaOnSql(newsSql);
    } catch (err) {
      console.error("[hm-fixhaber-edge] news db", String(err?.message || err).slice(0, 200));
    }
  }
  if (mainSql) {
    try {
      const main = await ensureFixHaberBrandMetaOnSql(mainSql);
      last = main || last;
    } catch (err) {
      console.error("[hm-fixhaber-edge] main db", String(err?.message || err).slice(0, 200));
    }
  }
  return last;
}

export function isFixHaberHost(hostname) {
  return normalizeHost(hostname) === FIXHABER_DOMAIN;
}
