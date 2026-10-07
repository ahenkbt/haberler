/**
 * gundemi.org 8 bölgesel HM sitesini idempotent oluşturur / günceller:
 * site satırı, editör, özel kategoriler, örnek haberler, RSS kampanyası.
 */
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  categoriesTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
  newsTable,
  rssCampaignsTable,
} from "@workspace/db";
import { normalizeHmSiteIds } from "./hm-rss-campaigns.js";
import { logger } from "./logger.js";
import {
  buildGundemiRegionalLayoutJson,
  GUNDEMI_APEX_TURKATA_ALIAS,
  GUNDEMI_REGIONAL_CAMPAIGN_TAG,
  GUNDEMI_REGIONAL_SITES,
  TURKATA_HM_SLUG,
  type GundemiRegionalSiteDef,
} from "./hm-gundemi-regional-sites.js";

export type GundemiRegionalSeedSiteResult = {
  slug: string;
  domain: string;
  siteId: number | null;
  action: "created" | "updated" | "unchanged" | "error";
  categories: number;
  sampleNews: number;
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
 * Apex gundemi.org (+ www) → turkatahaber HM satırının domain2’si.
 * 9. boş gundemi sitesi oluşturulmaz; bölgesel alt alanlar ayrı kalır.
 */
export async function ensureTurkataGundemiApexAlias(): Promise<GundemiRegionalSeedSiteResult> {
  const alias = GUNDEMI_APEX_TURKATA_ALIAS;
  const [turkata] = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, TURKATA_HM_SLUG))
    .limit(1);

  if (!turkata?.id) {
    return {
      slug: TURKATA_HM_SLUG,
      domain: alias,
      siteId: null,
      action: "error",
      categories: 0,
      sampleNews: 0,
      campaignId: null,
      detail: "turkatahaber site row missing — bind gundemi.org domain2 after site exists",
    };
  }

  const already =
    normalizeDomainHost(turkata.domain) === alias ||
    normalizeDomainHost(turkata.domain2) === alias ||
    normalizeDomainHost(turkata.domain3) === alias;
  if (already) {
    return {
      slug: TURKATA_HM_SLUG,
      domain: alias,
      siteId: turkata.id,
      action: "unchanged",
      categories: 0,
      sampleNews: 0,
      campaignId: null,
      detail: "apex alias already on turkatahaber",
    };
  }

  // Alias başka sitede ise serbest bırak (bölgesel ege.* dokunulmaz — farklı host).
  const claimants = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable);
  for (const row of claimants) {
    if (row.id === turkata.id) continue;
    const patch: { domain?: null; domain2?: null; domain3?: null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    let touch = false;
    if (normalizeDomainHost(row.domain) === alias) {
      patch.domain = null;
      touch = true;
    }
    if (normalizeDomainHost(row.domain2) === alias) {
      patch.domain2 = null;
      touch = true;
    }
    if (normalizeDomainHost(row.domain3) === alias) {
      patch.domain3 = null;
      touch = true;
    }
    if (touch) {
      await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, row.id));
    }
  }

  const d2 = normalizeDomainHost(turkata.domain2);
  const d3 = normalizeDomainHost(turkata.domain3);
  const bind: { domain2?: string; domain3?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (!d2) bind.domain2 = alias;
  else if (!d3) bind.domain3 = alias;
  else bind.domain2 = alias; // domain2 doluysa da apex alias öncelikli

  await dualWriteUpdate(hmNewsSitesTable, bind, eq(hmNewsSitesTable.id, turkata.id));
  return {
    slug: TURKATA_HM_SLUG,
    domain: alias,
    siteId: turkata.id,
    action: "updated",
    categories: 0,
    sampleNews: 0,
    campaignId: null,
    detail: `turkatahaber.${bind.domain2 ? "domain2" : "domain3"}=${alias}`,
  };
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
  const contactJson = JSON.stringify({
    email: `editor@${def.domain}`,
    phone: "",
    address: def.displayName,
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
  const email = `editor@${def.domain}`;
  const [existing] = await getNewsDbForRead()
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, siteId), eq(hmSiteEditorsTable.email, email)))
    .limit(1);
  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      {
        displayName: `${def.displayName} Editör`,
        isActive: true,
        updatedAt: new Date(),
      },
      eq(hmSiteEditorsTable.id, existing.id),
    );
    return;
  }
  const passwordHash = await bcrypt.hash(`Gundemi!${def.slug}-${siteId}`, 10);
  await dualWriteInsert(hmSiteEditorsTable, {
    siteId,
    email,
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

export async function ensureGundemiRegionalSites(): Promise<GundemiRegionalSeedSiteResult[]> {
  const results: GundemiRegionalSeedSiteResult[] = [];
  try {
    results.push(await ensureTurkataGundemiApexAlias());
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e }, "[gundemi-bolge] turkatahaber apex alias failed");
    results.push({
      slug: TURKATA_HM_SLUG,
      domain: GUNDEMI_APEX_TURKATA_ALIAS,
      siteId: null,
      action: "error",
      categories: 0,
      sampleNews: 0,
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
      const campaignId = await ensureRegionalCampaign(siteId, def);
      results.push({
        slug: def.slug,
        domain: def.domain,
        siteId,
        action,
        categories: cats.size,
        sampleNews,
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
