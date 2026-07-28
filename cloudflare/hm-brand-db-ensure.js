/**
 * Worker kenarı: bilinen marka alanları için meta lookup + Su domain onarımı.
 * /tr/su (en düşük id) → suhaberajansi.com; sahte slug=su satırlarını temizler.
 */
import { neon } from "@neondatabase/serverless";
import {
  HM_BREAKING_RSS_DEFAULTS_REV,
  cloneDefaultHmBreakingRssFeedRows,
} from "./hm-breaking-rss-defaults.js";
import {
  HM_SITE_RSS_DEFAULTS_REV,
  cloneDefaultHmSiteRssFeedRows,
} from "./hm-site-rss-defaults.js";

export const HM_BRAND_DB_BINDINGS = [
  {
    domain: "suhaberajansi.com",
    domains: ["suhaberajansi.com"],
    slug: "su",
    displayName: "Su Haber Ajansı",
    description: "Su Haber Ajansı dijital haber platformu",
  },
  /** Kırşehir: editör layout kenarda Neon'a yazılıyor — meta da Neon'dan gelsin. */
  {
    domain: "kirsehirhaber.org",
    domains: ["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"],
    slug: "kirsehirhaber",
    displayName: "KIRŞEHİR HABER PORTALI",
    description: "Kırşehir’in dijital haber platformu",
  },
];

const PROTECTED_SLUGS = new Set([
  "asg",
  "kirsehir",
  "kirsehirhaber",
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

function bindingHosts(binding) {
  const out = new Set();
  if (binding?.domain) out.add(normalizeHost(binding.domain));
  for (const d of binding?.domains || []) {
    const h = normalizeHost(d);
    if (h) out.add(h);
  }
  return out;
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
    HM_BRAND_DB_BINDINGS.find((b) => {
      if (host && bindingHosts(b).has(host)) return true;
      if (s && b.slug === s) return true;
      return false;
    }) || null
  );
}

/** Eski belediyehizmet satırı / editör haber siteId — kanonik Su. */
const SU_CANONICAL_SITE_ID = 2;

let _breakingRssDefaultsPassAt = 0;
let _breakingRssDefaultsPassDone = false;
let _siteRssDefaultsPassAt = 0;
let _siteRssDefaultsPassDone = false;

/**
 * Tüm editör sitelerinde site içi RSS varsayılanlarını uygular ve hibrit RSS’i açar (bir kerelik rev).
 * Rev yazıldıktan sonra editör panelden değişen değerler korunur.
 */
export async function ensureHmSiteRssDefaultsOnNeon(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return { ok: false, reason: "no-db" };
  const now = Date.now();
  if (_siteRssDefaultsPassDone) return { ok: true, action: "cached-done" };
  if (now - _siteRssDefaultsPassAt < 15_000) return { ok: true, action: "throttled" };
  _siteRssDefaultsPassAt = now;

  const sql = neon(dbUrl);
  try {
    const sites = await sql`
      SELECT id, layout_json FROM hm_news_sites
      ORDER BY id ASC
    `;
    if (!sites?.length) return { ok: false, reason: "sites-missing" };

    let patched = 0;
    let skipped = 0;
    const defaults = cloneDefaultHmSiteRssFeedRows();

    for (const site of sites) {
      let layout = {};
      try {
        layout = site.layout_json ? JSON.parse(String(site.layout_json)) : {};
      } catch {
        layout = {};
      }
      if (!layout || typeof layout !== "object" || Array.isArray(layout)) layout = {};

      if (String(layout.hmSiteRssDefaultsRev || "") === HM_SITE_RSS_DEFAULTS_REV) {
        skipped += 1;
        continue;
      }

      const next = {
        ...layout,
        hmNewsSiteRssFeedRows: defaults.map((row) => ({ ...row })),
        hybridRssEnabled: true,
        hmSiteRssDefaultsRev: HM_SITE_RSS_DEFAULTS_REV,
      };
      await sql`
        UPDATE hm_news_sites
        SET layout_json = ${JSON.stringify(next)}::jsonb,
            updated_at = NOW()
        WHERE id = ${site.id}
      `;
      patched += 1;
    }

    if (skipped === sites.length) _siteRssDefaultsPassDone = true;
    return { ok: true, action: "pass", patched, skipped, total: sites.length };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err).slice(0, 200) };
  }
}

/**
 * Tüm editör sitelerinde kutu içi RSS’i standart varsayılana çeker (bir kerelik rev).
 * Rev yazıldıktan sonra editör panelden değişen değerler korunur.
 */
export async function ensureHmBreakingRssDefaultsOnNeon(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return { ok: false, reason: "no-db" };
  const now = Date.now();
  if (_breakingRssDefaultsPassDone) return { ok: true, action: "cached-done" };
  if (now - _breakingRssDefaultsPassAt < 15_000) return { ok: true, action: "throttled" };
  _breakingRssDefaultsPassAt = now;

  const sql = neon(dbUrl);
  try {
    const sites = await sql`
      SELECT id, layout_json FROM hm_news_sites
      ORDER BY id ASC
    `;
    if (!sites?.length) return { ok: false, reason: "sites-missing" };

    let patched = 0;
    let skipped = 0;
    const defaults = cloneDefaultHmBreakingRssFeedRows();

    for (const site of sites) {
      let layout = {};
      try {
        layout = site.layout_json ? JSON.parse(String(site.layout_json)) : {};
      } catch {
        layout = {};
      }
      if (!layout || typeof layout !== "object" || Array.isArray(layout)) layout = {};

      if (String(layout.hmBreakingRssDefaultsRev || "") === HM_BREAKING_RSS_DEFAULTS_REV) {
        skipped += 1;
        continue;
      }

      const next = {
        ...layout,
        hmNewsBreakingRssFeedRows: defaults.map((row) => ({ ...row })),
        hmBreakingRssDefaultsRev: HM_BREAKING_RSS_DEFAULTS_REV,
      };
      await sql`
        UPDATE hm_news_sites
        SET layout_json = ${JSON.stringify(next)}::jsonb,
            updated_at = NOW()
        WHERE id = ${site.id}
      `;
      patched += 1;
    }

    if (skipped === sites.length) _breakingRssDefaultsPassDone = true;
    return { ok: true, action: "pass", patched, skipped, total: sites.length };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err).slice(0, 200) };
  }
}

/**
 * sehirgazetesiankara@gmail.com — ASG + ankarahabergundemi ortak hesap.
 * username=sehirgazetesi; aynı şifre hash her iki sitede.
 */
export async function repairAsgEditorMisassignmentOnNeon(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl) return { ok: false, reason: "no-db" };
  const sql = neon(dbUrl);
  const EMAIL = "sehirgazetesiankara@gmail.com";
  const USERNAME = "sehirgazetesi";

  try {
    await sql`ALTER TABLE hm_site_editors ADD COLUMN IF NOT EXISTS username text`;
  } catch {
    /* ignore */
  }

  const sites = await sql`
    SELECT id, slug, display_name, domain, domain2, domain3 FROM hm_news_sites
    WHERE active = true
      AND (
        lower(trim(both '/' from slug)) IN ('asg', 'ankarahabergundemi')
        OR lower(coalesce(domain, '')) LIKE '%ankarasehirgazetesi%'
        OR lower(coalesce(domain2, '')) LIKE '%ankarasehirgazetesi%'
        OR lower(coalesce(domain3, '')) LIKE '%ankarasehirgazetesi%'
        OR lower(coalesce(domain, '')) LIKE '%ankarahabergundemi%'
        OR lower(coalesce(domain2, '')) LIKE '%ankarahabergundemi%'
        OR lower(coalesce(domain3, '')) LIKE '%ankarahabergundemi%'
      )
    ORDER BY id ASC
  `;
  if (!sites?.length) return { ok: false, reason: "sites-missing" };

  const src = await sql`
    SELECT id, email, password_hash, display_name, is_active, site_id, updated_at
    FROM hm_site_editors
    WHERE lower(email) = ${EMAIL} AND is_active = true
    ORDER BY updated_at DESC NULLS LAST, id DESC
    LIMIT 1
  `;
  const row = src?.[0];
  if (!row) return { ok: false, reason: "editor-missing" };

  const editorIds = [];
  for (const site of sites) {
    const display =
      String(site.slug || "").toLowerCase() === "asg"
        ? "Ankara Şehir Gazetesi"
        : row.display_name || site.display_name || "Editör";
    const existing = await sql`
      SELECT id FROM hm_site_editors
      WHERE site_id = ${site.id} AND lower(email) = ${EMAIL}
      LIMIT 1
    `;
    if (existing?.[0]?.id) {
      await sql`
        UPDATE hm_site_editors
        SET password_hash = ${row.password_hash},
            username = ${USERNAME},
            display_name = ${display},
            is_active = true,
            updated_at = now()
        WHERE id = ${existing[0].id}
      `;
      editorIds.push(existing[0].id);
      continue;
    }
    const inserted = await sql`
      INSERT INTO hm_site_editors (site_id, email, username, password_hash, display_name, is_active)
      VALUES (${site.id}, ${EMAIL}, ${USERNAME}, ${row.password_hash}, ${display}, true)
      RETURNING id
    `;
    if (inserted?.[0]?.id) editorIds.push(inserted[0].id);
  }
  return { ok: editorIds.length > 0, action: "synced", editorIds, siteIds: sites.map((s) => s.id) };
}

async function repairSuDomainOnNeon(sql) {
  const SU_DEFAULT_EMAIL = "editor@suhaberajansi.com";
  const canonicalId = SU_CANONICAL_SITE_ID;

  const id2 = await sql`SELECT id, slug FROM hm_news_sites WHERE id = ${canonicalId} LIMIT 1`;
  const suRows = await sql`
    SELECT id, slug FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
    ORDER BY id ASC
  `;
  const id2Row = id2?.[0] ?? null;
  const id2IsSu =
    id2Row &&
    ["su", "suhaber"].includes(
      String(id2Row.slug ?? "")
        .trim()
        .toLowerCase()
        .replace(/^\/+|\/+$/g, ""),
    );
  const phantomSuIds = (suRows ?? [])
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0 && id !== canonicalId);

  if (!id2Row && !(suRows?.length)) return null;

  // id=2 başka slug'taysa yeni id'ye taşı.
  if (id2Row && !id2IsSu) {
    const maxRow = await sql`SELECT COALESCE(MAX(id), 1) AS max_id FROM hm_news_sites`;
    const newId = Number(maxRow?.[0]?.max_id ?? 0) + 1;
    await sql`UPDATE hm_news_sites SET id = ${newId}, updated_at = NOW() WHERE id = ${canonicalId}`;
    await sql`UPDATE hm_site_editors SET site_id = ${newId} WHERE site_id = ${canonicalId}`.catch(() => undefined);
    await sql`UPDATE news SET site_id = ${newId} WHERE site_id = ${canonicalId}`.catch(() => undefined);
    await sql`UPDATE news SET owner_site_id = ${newId} WHERE owner_site_id = ${canonicalId}`.catch(() => undefined);
  }

  const primaryPhantom = phantomSuIds[0];
  if (!id2IsSu && primaryPhantom != null) {
    await sql`
      UPDATE hm_news_sites SET id = ${canonicalId}, updated_at = NOW()
      WHERE id = ${primaryPhantom}
    `;
  }

  for (const phantomId of phantomSuIds) {
    if (phantomId === primaryPhantom && !id2IsSu) continue;
    await sql`UPDATE news SET site_id = ${canonicalId} WHERE site_id = ${phantomId}`.catch(() => undefined);
    await sql`UPDATE news SET owner_site_id = ${canonicalId} WHERE owner_site_id = ${phantomId}`.catch(() => undefined);
    await sql`UPDATE hm_site_editors SET site_id = ${canonicalId} WHERE site_id = ${phantomId}`.catch(() => undefined);
  }

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
      contact_json = CASE
        WHEN coalesce(contact_json::text, '') IN ('', '{}', 'null')
          OR coalesce(contact_json->>'email', '') = ''
        THEN jsonb_build_object(
          'phone', coalesce(contact_json->>'phone', ''),
          'email', ${SU_DEFAULT_EMAIL},
          'address', coalesce(contact_json->>'address', '')
        )
        ELSE contact_json
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

  // hm_news_sites silinince FK ON DELETE SET NULL → manuel haberler merkez havuzuna düşer.
  await sql`
    UPDATE news
    SET site_id = ${canonicalId}, owner_site_id = COALESCE(owner_site_id, ${canonicalId}), site_only = true, updated_at = NOW()
    WHERE site_id IS NULL AND status = 'published'
      AND (
        coalesce(rss_source_url, '') LIKE 'yekpare-hm-sync:2:%'
        OR coalesce(rss_source_url, '') LIKE 'yekpare-hm-sync:24:%'
        OR owner_site_id IN (2, 24)
      )
  `.catch(() => undefined);
  await sql`
    UPDATE news n
    SET site_id = ${canonicalId}, owner_site_id = ${canonicalId}, site_only = true, updated_at = NOW()
    FROM authors a
    WHERE n.site_id IS NULL AND n.status = 'published'
      AND n.author_id = a.id AND a.hm_site_id = ${canonicalId}
  `.catch(() => undefined);
  await sql`
    UPDATE news n
    SET site_id = ${canonicalId}, owner_site_id = ${canonicalId}, site_only = true, updated_at = NOW()
    FROM news_site_overrides o
    WHERE n.site_id IS NULL AND n.status = 'published'
      AND o.site_id = ${canonicalId} AND o.article_id = n.id
  `.catch(() => undefined);
  await sql`
    UPDATE news n
    SET site_id = ${canonicalId}, owner_site_id = ${canonicalId}, site_only = true, updated_at = NOW()
    FROM categories c
    WHERE n.site_id IS NULL AND n.status = 'published'
      AND n.category_id = c.id AND c.exclusive_site_id = ${canonicalId}
  `.catch(() => undefined);
  await sql`
    UPDATE news
    SET site_id = ${canonicalId}, owner_site_id = ${canonicalId}, site_only = true, updated_at = NOW()
    WHERE site_id IS NULL AND status = 'published' AND is_editor_manual = true
      AND (coalesce(image_url, '') LIKE '%/api/media/uploads/%' OR coalesce(image_url, '') LIKE '/api/media/uploads/%')
  `.catch(() => undefined);
  await sql`
    UPDATE news
    SET site_id = ${canonicalId}, owner_site_id = ${canonicalId}, site_only = true, updated_at = NOW()
    WHERE site_id IS NULL AND status = 'published'
      AND (is_featured = true OR is_site_manset = true OR is_breaking = true)
      AND (coalesce(image_url, '') LIKE '%/api/media/uploads/%' OR coalesce(image_url, '') LIKE '/api/media/uploads/%')
  `.catch(() => undefined);

  return canonicalId;
}

/**
 * Domain/slug ile bak; Su markası için domain sahipliğini onar, kanonik satırı dön.
 */
async function ensureKhVideoMenuOnRow(sql, row) {
  if (!row) return row;
  const slug = normalizeSlug(row.slug);
  const hosts = [row.domain, row.domain2, row.domain3].map(normalizeHost);
  const isKh =
    slug === "kirsehirhaber" ||
    slug === "kh" ||
    slug === "kirsehir" ||
    hosts.some((h) => h === "kirsehirhaber.org" || h === "kirsehri.com" || h === "kirsehir.net");
  if (!isKh) return row;

  let layout = {};
  try {
    layout = row.layout_json ? JSON.parse(String(row.layout_json)) : {};
  } catch {
    layout = {};
  }
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) layout = {};

  const items = Array.isArray(layout.hmCorporateMenuItems) ? layout.hmCorporateMenuItems : [];
  const isVideoItem = (item) => {
    const href = String(item?.href ?? "").trim().toLowerCase();
    const label = String(item?.label ?? "")
      .trim()
      .toLocaleLowerCase("tr-TR");
    const id = String(item?.id ?? "").trim().toLowerCase();
    return (
      id === "menu-video-tv" ||
      id.includes("video-tv") ||
      label === "video" ||
      label.includes("video tv") ||
      href === "/video" ||
      /\/video(?:-tv)?(?:\/|$|\?)/.test(href)
    );
  };
  const hasVideo = items.some(isVideoItem);
  const videoOn = layout.hmNewsVideoTvEnabled !== false;
  let nextItems = items;
  let changed = false;

  if (videoOn && items.length > 0 && !hasVideo) {
    nextItems = [
      ...items,
      { id: "menu-video-tv", label: "Video", href: "/video", enabled: true },
    ];
    changed = true;
  } else if (videoOn && hasVideo) {
    nextItems = items.map((item) => {
      if (!isVideoItem(item)) return item;
      const next = { ...item, enabled: item.enabled !== false };
      if (!String(next.label || "").trim()) next.label = "Video";
      const href = String(next.href || "").trim();
      if (!href || href.includes("video-tv")) next.href = "/video";
      if (next.label && /video\s*tv/i.test(next.label)) next.label = "Video";
      if (next.label !== item.label || next.href !== item.href) changed = true;
      return next;
    });
  }

  if (layout.hmNewsVideoTvEnabled === false) {
    // kullanıcı kapattıysa dokunma
  } else if (layout.hmNewsVideoTvEnabled !== true) {
    layout.hmNewsVideoTvEnabled = true;
    changed = true;
  }

  if (!changed && nextItems === items) return row;
  const next = { ...layout, hmCorporateMenuItems: nextItems, hmNewsVideoTvEnabled: true };
  await sql`
    UPDATE hm_news_sites
    SET layout_json = ${JSON.stringify(next)}::jsonb,
        updated_at = NOW()
    WHERE id = ${row.id}
  `;
  return { ...row, layout_json: JSON.stringify(next) };
}

const KH_AUTHORS_CLEAR_REV = "kh-authors-clear-20260727b";
const HM_LAYOUT_SANITIZE_REV = "hm-layout-sanitize-20260727a";

const CORPORATE_ONLY_MODULES = new Set([
  "culturePortal",
  "ataturkCorner",
  "sehitSearch",
  "heritageInfo",
  "donationSupport",
]);

const VKD_MENU_PREFIX = "vkd-menu-";
const VKD_ONLY_PATH_PREFIXES = [
  "/faaliyetler",
  "/baskan",
  "/dernegimiz",
  "/sehit-gazi",
  "/bagis",
  "/yonetim-kurulu",
  "/tuzuk",
];

function isCorporateLayoutTheme(theme) {
  const t = String(theme ?? "")
    .trim()
    .toLowerCase();
  return t === "corporate" || t === "kurumsal";
}

function pathOnlyMenuHref(href) {
  const raw = String(href ?? "").trim();
  if (!raw || raw === "#") return raw;
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname.toLowerCase();
  } catch {
    /* relative */
  }
  return raw.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
}

function isForeignCorporateMenuItem(item, siteSlug) {
  const slug = normalizeSlug(siteSlug);
  if (slug === "vkd") return false;
  const id = String(item?.id ?? "")
    .trim()
    .toLowerCase();
  const href = pathOnlyMenuHref(item?.href);
  if (id.startsWith(VKD_MENU_PREFIX)) return true;
  for (const p of VKD_ONLY_PATH_PREFIXES) {
    if (href === p || href.startsWith(`${p}/`)) return true;
  }
  if (href.includes("/ansiklopedi/t")) return true;
  return false;
}

function sanitizeHmLayoutRecord(layout, siteSlug) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return {};
  const slug = normalizeSlug(siteSlug);
  if (isCorporateLayoutTheme(layout.hmVitrinTheme) && slug === "vkd") return layout;

  const next = { ...layout };

  if (Array.isArray(next.hmCorporateMenuItems)) {
    next.hmCorporateMenuItems = next.hmCorporateMenuItems.filter(
      (item) => item && typeof item === "object" && !isForeignCorporateMenuItem(item, slug),
    );
  }
  for (const key of ["hmNewsFooterMenuItems", "hmNewsSidebarMenuItems", "hmNewsStripMenuItems"]) {
    if (Array.isArray(next[key])) {
      next[key] = next[key].filter(
        (item) => item && typeof item === "object" && !isForeignCorporateMenuItem(item, slug),
      );
    }
  }
  if (Array.isArray(next.hmNewsHomeModuleOrder)) {
    next.hmNewsHomeModuleOrder = next.hmNewsHomeModuleOrder.filter((id) => !CORPORATE_ONLY_MODULES.has(String(id)));
  }
  if (!isCorporateLayoutTheme(layout.hmVitrinTheme)) {
    next.hmCorporateAtaturkCornerEnabled = false;
    next.hmCorporateCulturePortalBandEnabled = false;
    next.hmCorporateWarsSectionEnabled = false;
    next.hmCorporateNationalDaysSectionEnabled = false;
    next.hmSehitSearchEnabled = false;
    next.sadeNewsAtaturkBandEnabled = false;
    next.sadeNewsHistoryNationalDaysBandEnabled = false;
  }
  next.hmLayoutSanitizeRev = HM_LAYOUT_SANITIZE_REV;
  return next;
}

/** Tüm HM siteler — VKD/kurumsal şablon sızıntısını Neon layout_json'dan temizle. */
async function ensureHmLayoutSanitizedOnRow(sql, row) {
  if (!row) return row;
  let layout = {};
  try {
    layout = row.layout_json ? JSON.parse(String(row.layout_json)) : {};
  } catch {
    layout = {};
  }
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) layout = {};
  if (String(layout.hmLayoutSanitizeRev || "") === HM_LAYOUT_SANITIZE_REV) return row;

  const next = sanitizeHmLayoutRecord(layout, row.slug);
  await sql`
    UPDATE hm_news_sites
    SET layout_json = ${JSON.stringify(next)}::jsonb,
        updated_at = NOW()
    WHERE id = ${row.id}
  `;
  return { ...row, layout_json: JSON.stringify(next) };
}

/** KH: köşe yazarlarını Neon'dan sil + vitrin yazar modüllerini kapat (bir kerelik rev). */
async function ensureKhAuthorsClearedOnRow(sql, row) {
  if (!row) return row;
  const slug = normalizeSlug(row.slug);
  const hosts = [row.domain, row.domain2, row.domain3].map(normalizeHost);
  const isKh =
    slug === "kirsehirhaber" ||
    slug === "kh" ||
    slug === "kirsehir" ||
    hosts.some((h) => h === "kirsehirhaber.org" || h === "kirsehri.com" || h === "kirsehir.net");
  if (!isKh) return row;

  let layout = {};
  try {
    layout = row.layout_json ? JSON.parse(String(row.layout_json)) : {};
  } catch {
    layout = {};
  }
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) layout = {};

  const already = String(layout.hmKhAuthorsClearRev || "") === KH_AUTHORS_CLEAR_REV;
  // Rev uygulanmış olsa bile kalan yazarları temizle (senkron sızıntısı)
  try {
    const { clearKhAuthorsAndDisableModules } = await import("./hm-editor-kh-data-edge.js");
    await clearKhAuthorsAndDisableModules(sql, row.id);
  } catch (err) {
    console.error("[hm-brand-db-ensure] kh authors clear", String(err?.message || err).slice(0, 200));
  }

  if (already) return row;

  const order = Array.isArray(layout.hmNewsHomeModuleOrder)
    ? layout.hmNewsHomeModuleOrder.filter((id) => id !== "authorsStrip")
    : layout.hmNewsHomeModuleOrder;
  const next = {
    ...layout,
    hmNewsAuthorsEnabled: false,
    hmNewsHorizontalAuthorsEnabled: false,
    hmNewsSidebarAuthorsEnabled: false,
    hmNewsHomeModuleOrder: order,
    hmKhAuthorsClearRev: KH_AUTHORS_CLEAR_REV,
  };
  await sql`
    UPDATE hm_news_sites
    SET layout_json = ${JSON.stringify(next)}::jsonb,
        updated_at = NOW()
    WHERE id = ${row.id}
  `;
  return { ...row, layout_json: JSON.stringify(next) };
}

async function ensureKhSiteRow(sql, row) {
  let next = await ensureKhVideoMenuOnRow(sql, row);
  next = await ensureKhAuthorsClearedOnRow(sql, next);
  next = await ensureHmLayoutSanitizedOnRow(sql, next);
  return next;
}

/** ankarahabergundemi → ankarasehirgazetesi (asg) yazar listesi; yalnızca authors tablosu. */
async function repairAsgAuthorsFromAhgOnNeon(sql) {
  const sourceRows = await sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = 'ankarahabergundemi'
    LIMIT 1
  `;
  const targetRows = await sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) = 'asg'
    LIMIT 1
  `;
  const sourceSiteId = sourceRows?.[0]?.id;
  const targetSiteId = targetRows?.[0]?.id;
  if (!sourceSiteId || !targetSiteId) return;

  const sourceAuthors = await sql`
    SELECT id, name, title, avatar_url, bio, hm_sort_order
    FROM authors
    WHERE hm_site_id = ${sourceSiteId} AND hm_sort_order IS NOT NULL
    ORDER BY hm_sort_order ASC, id DESC
  `;
  const seen = new Set();
  const canonical = [];
  for (const row of sourceAuthors || []) {
    const key = String(row.name ?? "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    canonical.push(row);
  }
  if (!canonical.length) return;

  await sql`UPDATE news SET author_id = NULL WHERE site_id = ${targetSiteId}`.catch(() => undefined);
  await sql`UPDATE hm_makaleler SET author_id = NULL WHERE site_id = ${targetSiteId}`.catch(() => undefined);
  await sql`DELETE FROM authors WHERE hm_site_id = ${targetSiteId}`;

  for (const row of canonical) {
    await sql`
      INSERT INTO authors (name, title, avatar_url, bio, hm_site_id, hm_sort_order, email, password_hash)
      VALUES (
        ${row.name},
        ${row.title},
        ${row.avatar_url},
        ${row.bio},
        ${targetSiteId},
        ${row.hm_sort_order},
        NULL,
        NULL
      )
    `;
  }
}

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

  // ASG: ankarahabergundemi yazarlarını kopyala (yalnızca authors)
  if (binding.slug === "asg" || host.includes("ankarasehirgazetesi")) {
    try {
      await repairAsgAuthorsFromAhgOnNeon(sql);
    } catch (err) {
      console.error("[hm-brand-db-ensure] asg authors repair", String(err?.message || err).slice(0, 240));
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
      const row = await ensureKhSiteRow(sql, byDomain[0]);
      return { meta: serializeMetaRow(row), action: "lookup_domain" };
    }
    if (byDomain?.[0]) {
      const row = await ensureKhSiteRow(sql, byDomain[0]);
      return { meta: serializeMetaRow(row), action: "lookup_domain" };
    }
  }

  // 2) Slug ile bul — en düşük id (kanonik /tr/su; KH: kirsehirhaber|kh|kirsehir)
  const slugKey = wantSlug || binding.slug;
  if (slugKey) {
    const isSuSlug = slugKey === "su" || slugKey === "suhaber";
    const isKhSlug =
      slugKey === "kirsehirhaber" || slugKey === "kh" || slugKey === "kirsehir";
    const bySlug = isSuSlug
      ? await sql`
          SELECT id, slug, domain, domain2, domain3, display_name, description,
                 contact_json, layout_json, active, created_at, updated_at
          FROM hm_news_sites
          WHERE lower(trim(both '/' from slug)) = ${slugKey}
             OR lower(trim(both '/' from slug)) = ${"suhaber"}
             OR lower(trim(both '/' from slug)) = ${"su"}
          ORDER BY id ASC
          LIMIT 1
        `
      : isKhSlug
        ? await sql`
          SELECT id, slug, domain, domain2, domain3, display_name, description,
                 contact_json, layout_json, active, created_at, updated_at
          FROM hm_news_sites
          WHERE lower(trim(both '/' from slug)) = ${"kirsehirhaber"}
             OR lower(trim(both '/' from slug)) = ${"kirsehir"}
             OR lower(trim(both '/' from slug)) = ${"kh"}
          ORDER BY
            CASE lower(trim(both '/' from slug))
              WHEN 'kirsehirhaber' THEN 0
              WHEN 'kirsehir' THEN 1
              ELSE 2
            END,
            id ASC
          LIMIT 1
        `
      : await sql`
          SELECT id, slug, domain, domain2, domain3, display_name, description,
                 contact_json, layout_json, active, created_at, updated_at
          FROM hm_news_sites
          WHERE lower(trim(both '/' from slug)) = ${slugKey}
          ORDER BY id ASC
          LIMIT 1
        `;
    if (bySlug?.[0] && !PROTECTED_SLUGS.has(normalizeSlug(bySlug[0].slug))) {
      const row = await ensureKhSiteRow(sql, bySlug[0]);
      return { meta: serializeMetaRow(row), action: "lookup_slug" };
    }
    if (bySlug?.[0]) {
      const row = await ensureKhSiteRow(sql, bySlug[0]);
      return { meta: serializeMetaRow(row), action: "lookup_slug" };
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
