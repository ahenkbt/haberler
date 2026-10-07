/**
 * gundemi.org 8 bölgesel HM sitesini idempotent oluşturur / günceller:
 * site satırı, editör, künye/hakkımızda, turkatahaber yazarları, kategoriler, örnek haberler, RSS.
 *
 * Varsayılan HM editör girişi (seed — panelden değiştirilebilir):
 * - apex gundemi.org → bilgi@gundemi.org / şifre = e-posta (bilgi@gundemi.org)
 * - bölgesel *.gundemi.org → editor@{domain} / Gundemi!{slug}-{siteId}
 *   (bkz. gundemiHmEditorEmail / gundemiHmEditorSeedPassword)
 */
import { and, asc, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  authorsTable,
  categoriesTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmMakalelerTable,
  hmNewsSitesTable,
  hmSiteEditorsTable,
  newsTable,
  rssCampaignsTable,
} from "@workspace/db";
import { normalizeHmSiteIds } from "./hm-rss-campaigns.js";
import { logger } from "./logger.js";
import {
  buildGundemiApexLayoutJson,
  buildGundemiRegionalLayoutJson,
  GUNDEMI_APEX_DOMAIN,
  GUNDEMI_APEX_SITE,
  GUNDEMI_APEX_SLUG,
  GUNDEMI_APEX_YS_KUNYE,
  GUNDEMI_REGIONAL_CAMPAIGN_TAG,
  GUNDEMI_REGIONAL_SITES,
  TURKATA_HM_SLUG,
  TURKATA_YS_KUNYE,
  gundemiHmEditorEmail,
  gundemiHmEditorSeedPassword,
  type GundemiRegionalSiteDef,
} from "./hm-gundemi-regional-sites.js";

export type GundemiRegionalSeedSiteResult = {
  slug: string;
  domain: string;
  siteId: number | null;
  action: "created" | "updated" | "unchanged" | "error";
  categories: number;
  sampleNews: number;
  authors: number;
  campaignId: number | null;
  detail?: string;
};

function normalizeDomainHost(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "") ?? "";
}

/**
 * turkatahaber domain2/domain3 üzerinden gundemi.org alias’ını kaldırır.
 * Apex artık kendi HM satırı (`slug=gundemi`).
 */
export async function clearTurkataGundemiApexAlias(): Promise<{
  cleared: boolean;
  detail: string;
}> {
  const alias = GUNDEMI_APEX_DOMAIN;
  const [turkata] = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, TURKATA_HM_SLUG))
    .limit(1);

  if (!turkata?.id) {
    return { cleared: false, detail: "turkatahaber row missing — nothing to clear" };
  }

  const patch: { domain2?: null; domain3?: null; updatedAt: Date } = { updatedAt: new Date() };
  let touch = false;
  // domain (primary) turkatahaber.com kalmalı — sadece domain2/3 alias temizlenir
  if (normalizeDomainHost(turkata.domain2) === alias) {
    patch.domain2 = null;
    touch = true;
  }
  if (normalizeDomainHost(turkata.domain3) === alias) {
    patch.domain3 = null;
    touch = true;
  }
  if (!touch) {
    return { cleared: false, detail: "turkatahaber had no gundemi.org domain2/3" };
  }
  await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, turkata.id));
  return { cleared: true, detail: "cleared gundemi.org from turkatahaber domain2/3" };
}

/**
 * Apex gundemi.org — bağımsız HM sitesi (turkatahaber alias değil).
 * Idempotent: slug `gundemi`, domain `gundemi.org`, phpTheme + slogan + logo.
 */
export async function ensureGundemiApexSite(): Promise<GundemiRegionalSeedSiteResult> {
  const clear = await clearTurkataGundemiApexAlias();
  const def = GUNDEMI_APEX_SITE;
  const layoutJson = JSON.stringify(buildGundemiApexLayoutJson(def));
  const contactJson = JSON.stringify({
    email: GUNDEMI_APEX_YS_KUNYE.email,
    phone: GUNDEMI_APEX_YS_KUNYE.phone,
    address: GUNDEMI_APEX_YS_KUNYE.address,
  });

  // Başka sitede apex domain tutan satırları serbest bırak (turkatahaber zaten temizlendi).
  const claimants = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable);
  for (const row of claimants) {
    if (row.slug === GUNDEMI_APEX_SLUG) continue;
    const patch: { domain?: null; domain2?: null; domain3?: null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    let touch = false;
    if (normalizeDomainHost(row.domain) === GUNDEMI_APEX_DOMAIN) {
      patch.domain = null;
      touch = true;
    }
    if (normalizeDomainHost(row.domain2) === GUNDEMI_APEX_DOMAIN) {
      patch.domain2 = null;
      touch = true;
    }
    if (normalizeDomainHost(row.domain3) === GUNDEMI_APEX_DOMAIN) {
      patch.domain3 = null;
      touch = true;
    }
    if (touch) {
      await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, row.id));
    }
  }

  const rows = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      displayName: hmNewsSitesTable.displayName,
      description: hmNewsSitesTable.description,
      layoutJson: hmNewsSitesTable.layoutJson,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, def.slug))
    .limit(1);
  const existing = rows[0];

  let siteId: number;
  let action: "created" | "updated" | "unchanged";
  if (!existing) {
    const [created] = await dualWriteInsert(hmNewsSitesTable, {
      slug: def.slug,
      domain: def.domain,
      domain2: "www.gundemi.org",
      domain3: null,
      displayName: def.displayName,
      description: def.description,
      contactJson,
      layoutJson,
      verificationJson: null,
      active: true,
    });
    if (!created?.id) throw new Error(`Site insert failed: ${def.slug}`);
    siteId = created.id;
    action = "created";
  } else {
    const needs =
      existing.domain !== def.domain ||
      normalizeDomainHost(existing.domain2) !== "www.gundemi.org" ||
      existing.displayName !== def.displayName ||
      existing.description !== def.description ||
      existing.active !== true ||
      String(existing.layoutJson || "") !== layoutJson;
    if (needs) {
      await dualWriteUpdate(
        hmNewsSitesTable,
        {
          domain: def.domain,
          domain2: "www.gundemi.org",
          displayName: def.displayName,
          description: def.description,
          contactJson,
          layoutJson,
          active: true,
          updatedAt: new Date(),
        },
        eq(hmNewsSitesTable.id, existing.id),
      );
      action = "updated";
    } else {
      action = "unchanged";
    }
    siteId = existing.id;
  }

  await ensureEditor(siteId, def);
  const cats = await ensureCategories(siteId, def);
  const sampleNews = await ensureSampleNews(siteId, def, cats);
  const authors = await ensureTurkataAuthorsOnRegionalSite(siteId);
  const campaignId = await ensureRegionalCampaign(siteId, def);

  return {
    slug: def.slug,
    domain: def.domain,
    siteId,
    action,
    categories: cats.size,
    sampleNews,
    authors,
    campaignId,
    detail: clear.cleared
      ? `${clear.detail}; apex site ${action}`
      : `apex site ${action} (${clear.detail})`,
  };
}

/** @deprecated Apex is a dedicated site — prefer ensureGundemiApexSite. */
export async function ensureTurkataGundemiApexAlias(): Promise<GundemiRegionalSeedSiteResult> {
  return ensureGundemiApexSite();
}

function slugifyTitle(title: string): string {
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

async function upsertSite(def: GundemiRegionalSiteDef): Promise<{
  siteId: number;
  action: "created" | "updated" | "unchanged";
}> {
  const layoutJson = JSON.stringify(buildGundemiRegionalLayoutJson(def));
  /** İletişim / künye — turkatahaber.com ile aynı. */
  const contactJson = JSON.stringify({
    email: TURKATA_YS_KUNYE.email,
    phone: TURKATA_YS_KUNYE.phone,
    address: TURKATA_YS_KUNYE.address,
  });
  const rows = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      displayName: hmNewsSitesTable.displayName,
      description: hmNewsSitesTable.description,
      layoutJson: hmNewsSitesTable.layoutJson,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, def.slug))
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    const [created] = await dualWriteInsert(hmNewsSitesTable, {
      slug: def.slug,
      domain: def.domain,
      domain2: null,
      domain3: null,
      displayName: def.displayName,
      description: def.description,
      contactJson,
      layoutJson,
      verificationJson: null,
      active: true,
    });
    if (!created?.id) throw new Error(`Site insert failed: ${def.slug}`);
    return { siteId: created.id, action: "created" };
  }

  const needs =
    existing.domain !== def.domain ||
    existing.displayName !== def.displayName ||
    existing.description !== def.description ||
    existing.active !== true ||
    String(existing.layoutJson || "") !== layoutJson;
  if (needs) {
    await dualWriteUpdate(
      hmNewsSitesTable,
      {
        domain: def.domain,
        displayName: def.displayName,
        description: def.description,
        contactJson,
        layoutJson,
        active: true,
        updatedAt: new Date(),
      },
      eq(hmNewsSitesTable.id, existing.id),
    );
    return { siteId: existing.id, action: "updated" };
  }
  return { siteId: existing.id, action: "unchanged" };
}

async function ensureEditor(siteId: number, def: GundemiRegionalSiteDef): Promise<void> {
  const email = gundemiHmEditorEmail(def);
  const passwordPlain = gundemiHmEditorSeedPassword(email, def, siteId);
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const [existing] = await getNewsDbForRead()
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, siteId), eq(hmSiteEditorsTable.email, email)))
    .limit(1);
  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      {
        username: email,
        passwordHash,
        displayName: `${def.displayName} Editör`,
        isActive: true,
        updatedAt: new Date(),
      },
      eq(hmSiteEditorsTable.id, existing.id),
    );
    return;
  }
  await dualWriteInsert(hmSiteEditorsTable, {
    siteId,
    email,
    username: email,
    passwordHash,
    displayName: `${def.displayName} Editör`,
    isActive: true,
  });
}

async function ensureCategories(
  siteId: number,
  def: GundemiRegionalSiteDef,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let order = 10;
  for (const cat of def.regionalCategories) {
    const [existing] = await getNewsDbForRead()
      .select({
        id: categoriesTable.id,
        exclusiveSiteId: categoriesTable.exclusiveSiteId,
        name: categoriesTable.name,
        color: categoriesTable.color,
        sortOrder: categoriesTable.sortOrder,
      })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, cat.slug))
      .limit(1);
    if (existing) {
      if (
        existing.exclusiveSiteId !== siteId ||
        existing.name !== cat.name ||
        existing.color !== cat.color ||
        existing.sortOrder !== order
      ) {
        await dualWriteUpdate(
          categoriesTable,
          {
            name: cat.name,
            color: cat.color,
            exclusiveSiteId: siteId,
            sortOrder: order,
          },
          eq(categoriesTable.id, existing.id),
        );
      }
      map.set(cat.slug, existing.id);
    } else {
      const [created] = await dualWriteInsert(categoriesTable, {
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        exclusiveSiteId: siteId,
        sortOrder: order,
      });
      if (created?.id) map.set(cat.slug, created.id);
    }
    order += 10;
  }
  return map;
}

async function ensureSampleNews(
  siteId: number,
  def: GundemiRegionalSiteDef,
  categoryIds: Map<string, number>,
): Promise<number> {
  let upserted = 0;
  for (const item of def.sampleHeadlines) {
    const baseSlug = slugifyTitle(item.title) || `haber-${upserted + 1}`;
    const slug = `${def.slug}-${baseSlug}`.slice(0, 100);
    const categoryId = categoryIds.get(item.categorySlug) ?? null;
    const [existing] = await getNewsDbForRead()
      .select({ id: newsTable.id })
      .from(newsTable)
      .where(and(eq(newsTable.siteId, siteId), eq(newsTable.slug, slug)))
      .limit(1);
    const patch = {
      title: item.title,
      spot: item.spot,
      content: `<p>${item.spot}</p><p>${def.displayName} bölgesel haber özeti. Canlı içerik RSS kampanyası ve editör paneli ile güncellenir.</p>`,
      categoryId,
      status: "published" as const,
      isFeatured: item.featured === true,
      isSiteManset: item.featured === true,
      isBreaking: false,
      tags: [GUNDEMI_REGIONAL_CAMPAIGN_TAG, def.regionLabel],
      siteId,
      siteOnly: true,
      ownerSiteId: siteId,
      isEditorManual: true,
      updatedAt: new Date(),
    };
    if (existing) {
      await dualWriteUpdate(newsTable, patch, eq(newsTable.id, existing.id));
    } else {
      await dualWriteInsert(newsTable, {
        ...patch,
        slug,
        views: 0,
        isAiGenerated: false,
        isFoodRecipe: false,
      });
    }
    upserted += 1;
  }
  return upserted;
}

async function ensureRegionalCampaign(
  siteId: number,
  def: GundemiRegionalSiteDef,
): Promise<number | null> {
  const tag = `${GUNDEMI_REGIONAL_CAMPAIGN_TAG}:${def.slug}`;
  const name = `${def.displayName} — bölgesel RSS`;
  const rows = await getNewsDbForRead().select().from(rssCampaignsTable);
  const existing = rows.find((r: { name: string; tags: string[] | null }) => {
    const tags = Array.isArray(r.tags) ? r.tags.map((t: string) => String(t).toLowerCase()) : [];
    return tags.includes(tag) || r.name === name;
  });
  const values = {
    name,
    active: true,
    postType: "news",
    categorySlug: def.regionalCategories[0]?.slug || "gundem",
    tags: [GUNDEMI_REGIONAL_CAMPAIGN_TAG, tag, "require-image"],
    feeds: def.rssFeeds,
    sourceType: "rss",
    intervalMinutes: 180,
    dailyLimit: 40,
    downloadImages: true,
    headline: false,
    hmSiteIds: [siteId],
    includeYekpareHaber: false,
  };
  if (existing) {
    const needs =
      existing.name !== values.name ||
      existing.active !== values.active ||
      existing.categorySlug !== values.categorySlug ||
      !normalizeHmSiteIds(existing.hmSiteIds).includes(siteId) ||
      JSON.stringify(existing.feeds) !== JSON.stringify(values.feeds);
    if (needs) {
      await dualWriteUpdate(
        rssCampaignsTable,
        {
          name: values.name,
          active: values.active,
          categorySlug: values.categorySlug,
          tags: values.tags,
          feeds: values.feeds,
          sourceType: values.sourceType,
          intervalMinutes: values.intervalMinutes,
          dailyLimit: values.dailyLimit,
          downloadImages: values.downloadImages,
          hmSiteIds: values.hmSiteIds,
          includeYekpareHaber: false,
        },
        eq(rssCampaignsTable.id, existing.id),
      );
    }
    return existing.id;
  }
  const [inserted] = await dualWriteInsert(rssCampaignsTable, {
    ...values,
    daysWindow: 0,
    breakingKeywords: [],
    minWords: 0,
    translateEnabled: false,
    haberlerFilterByTags: false,
    addedCount: 0,
  });
  return inserted?.id ?? null;
}

function makeRegionalAuthorCopySlug(
  base: string | null | undefined,
  targetSiteId: number,
  sourceId: number,
): string {
  const raw = String(base ?? "makale")
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${raw || "makale"}-hm${targetSiteId}-src${sourceId}`;
}

/**
 * turkatahaber yazarlarını (+ yayınlanmış makaleleri) bölge sitesine kopyalar.
 * Havuz `POST .../authors/:id/publish` ile aynı: isim dedupe.
 */
export async function ensureTurkataAuthorsOnRegionalSite(targetSiteId: number): Promise<number> {
  const [turkata] = await getNewsDbForRead()
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, TURKATA_HM_SLUG))
    .limit(1);
  if (!turkata?.id || turkata.id === targetSiteId) return 0;

  const sourceAuthors = await getNewsDbForRead()
    .select()
    .from(authorsTable)
    .where(eq(authorsTable.hmSiteId, turkata.id))
    .orderBy(asc(authorsTable.hmSortOrder), asc(authorsTable.id));

  let ensured = 0;
  for (const source of sourceAuthors) {
    const normalizedName = String(source.name ?? "")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("tr-TR");
    if (!normalizedName) continue;

    let [targetAuthor] = await getNewsDbForRead()
      .select()
      .from(authorsTable)
      .where(
        and(
          eq(authorsTable.hmSiteId, targetSiteId),
          sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalizedName}`,
        ),
      )
      .limit(1);

    if (!targetAuthor) {
      const [maxRow] = await getNewsDbForRead()
        .select({ m: sql<number>`coalesce(max(${authorsTable.hmSortOrder}), 0)::int` })
        .from(authorsTable)
        .where(eq(authorsTable.hmSiteId, targetSiteId));
      [targetAuthor] = await dualWriteInsert(authorsTable, {
        name: source.name,
        title: source.title ?? null,
        avatarUrl: source.avatarUrl ?? null,
        bio: source.bio ?? null,
        hmSiteId: targetSiteId,
        hmSortOrder: (maxRow?.m ?? 0) + 1,
        email: null,
        passwordHash: null,
      });
    } else {
      await dualWriteUpdate(
        authorsTable,
        {
          title: source.title ?? targetAuthor.title ?? null,
          avatarUrl: source.avatarUrl ?? targetAuthor.avatarUrl ?? null,
          bio: source.bio ?? targetAuthor.bio ?? null,
        },
        eq(authorsTable.id, targetAuthor.id),
      );
    }
    if (!targetAuthor?.id) continue;
    ensured += 1;

    const sourcePosts = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, source.hmSiteId!),
          eq(hmMakalelerTable.authorId, source.id),
          eq(hmMakalelerTable.status, "published"),
        ),
      )
      .orderBy(asc(hmMakalelerTable.createdAt))
      .limit(500);

    for (const post of sourcePosts) {
      const slug = makeRegionalAuthorCopySlug(post.slug || post.title, targetSiteId, post.id);
      const [exists] = await getNewsDbForRead()
        .select({ id: hmMakalelerTable.id })
        .from(hmMakalelerTable)
        .where(and(eq(hmMakalelerTable.siteId, targetSiteId), eq(hmMakalelerTable.slug, slug)))
        .limit(1);
      if (exists) continue;
      await dualWriteInsert(hmMakalelerTable, {
        siteId: targetSiteId,
        authorId: targetAuthor.id,
        title: post.title,
        slug,
        spot: post.spot,
        content: post.content,
        imageUrl: post.imageUrl,
        status: "published",
      });
    }
  }
  return ensured;
}

export async function ensureGundemiRegionalSites(): Promise<GundemiRegionalSeedSiteResult[]> {
  const results: GundemiRegionalSeedSiteResult[] = [];
  try {
    results.push(await ensureGundemiApexSite());
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e }, "[gundemi-bolge] gundemi apex site seed failed");
    results.push({
      slug: GUNDEMI_APEX_SLUG,
      domain: GUNDEMI_APEX_DOMAIN,
      siteId: null,
      action: "error",
      categories: 0,
      sampleNews: 0,
      authors: 0,
      campaignId: null,
      detail,
    });
  }
  for (const def of GUNDEMI_REGIONAL_SITES) {
    try {
      const { siteId, action } = await upsertSite(def);
      await ensureEditor(siteId, def);
      const cats = await ensureCategories(siteId, def);
      const sampleNews = await ensureSampleNews(siteId, def, cats);
      const authors = await ensureTurkataAuthorsOnRegionalSite(siteId);
      const campaignId = await ensureRegionalCampaign(siteId, def);
      results.push({
        slug: def.slug,
        domain: def.domain,
        siteId,
        action,
        categories: cats.size,
        sampleNews,
        authors,
        campaignId,
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      logger.warn({ err: e, slug: def.slug }, "[gundemi-bolge] site seed failed");
      results.push({
        slug: def.slug,
        domain: def.domain,
        siteId: null,
        action: "error",
        categories: 0,
        sampleNews: 0,
        authors: 0,
        campaignId: null,
        detail,
      });
    }
  }
  logger.info(
    { ok: results.filter((r) => r.action !== "error").length, total: results.length },
    "[gundemi-bolge] bölgesel siteler hazır",
  );
  return results;
}
