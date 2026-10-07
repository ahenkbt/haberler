/**
 * Fix Haber (fix.tc) — idempotent Neon seed: site, editör, kategoriler, örnek haber, RSS.
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
import { ensureTurkataAuthorsOnRegionalSite } from "./hm-gundemi-regional-seed.js";
import {
  buildFixHaberLayoutJson,
  FIXHABER_CAMPAIGN_TAG,
  FIXHABER_DOMAIN,
  FIXHABER_KUNYE,
  FIXHABER_SITE,
  FIXHABER_SLUG,
  type FixHaberSiteDef,
} from "./hm-fixhaber-site.js";

export type FixHaberSeedResult = {
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

function normalizeDomainHost(raw: string | null | undefined): string {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

async function upsertSite(def: FixHaberSiteDef): Promise<{
  siteId: number;
  action: "created" | "updated" | "unchanged";
}> {
  const layoutJson = JSON.stringify(buildFixHaberLayoutJson(def));
  const contactJson = JSON.stringify({
    email: FIXHABER_KUNYE.email,
    phone: FIXHABER_KUNYE.phone,
    address: FIXHABER_KUNYE.address,
  });

  // Domain claim first (any slot), then slug.
  const claimants = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      displayName: hmNewsSitesTable.displayName,
      description: hmNewsSitesTable.description,
      layoutJson: hmNewsSitesTable.layoutJson,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable);

  let existing = claimants.find(
    (r) =>
      normalizeDomainHost(r.domain) === def.domain ||
      normalizeDomainHost(r.domain2) === def.domain ||
      normalizeDomainHost(r.domain3) === def.domain,
  );
  if (!existing) {
    existing = claimants.find((r) => String(r.slug || "").toLowerCase() === def.slug);
  }

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

  // Free domain from other rows if slug-matched row is different.
  for (const row of claimants) {
    if (row.id === existing.id) continue;
    const patch: { domain?: null; domain2?: null; domain3?: null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    let touch = false;
    if (normalizeDomainHost(row.domain) === def.domain) {
      patch.domain = null;
      touch = true;
    }
    if (normalizeDomainHost(row.domain2) === def.domain) {
      patch.domain2 = null;
      touch = true;
    }
    if (normalizeDomainHost(row.domain3) === def.domain) {
      patch.domain3 = null;
      touch = true;
    }
    if (touch) {
      await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, row.id));
    }
  }

  const needs =
    normalizeDomainHost(existing.domain) !== def.domain ||
    existing.displayName !== def.displayName ||
    existing.description !== def.description ||
    existing.active !== true ||
    String(existing.layoutJson || "") !== layoutJson ||
    String(existing.slug || "").toLowerCase() !== def.slug;
  if (needs) {
    await dualWriteUpdate(
      hmNewsSitesTable,
      {
        slug: def.slug,
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

async function ensureEditor(siteId: number, def: FixHaberSiteDef): Promise<void> {
  const email = `bilgi@${def.domain}`;
  const passwordHash = await bcrypt.hash(email, 10);
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
  def: FixHaberSiteDef,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let order = 10;
  for (const cat of def.categories) {
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
  def: FixHaberSiteDef,
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
      content: `<p>${item.spot}</p><p>${def.displayName} örnek haberi. Canlı içerik RSS kampanyası ve editör paneli ile güncellenir.</p>`,
      categoryId,
      status: "published" as const,
      isFeatured: item.featured === true,
      isSiteManset: item.featured === true,
      isBreaking: false,
      tags: [FIXHABER_CAMPAIGN_TAG],
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

async function ensureCampaign(siteId: number, def: FixHaberSiteDef): Promise<number | null> {
  const tag = `${FIXHABER_CAMPAIGN_TAG}:site`;
  const name = `${def.displayName} — RSS`;
  const rows = await getNewsDbForRead().select().from(rssCampaignsTable);
  const existing = rows.find((r: { name: string; tags: string[] | null }) => {
    const tags = Array.isArray(r.tags) ? r.tags.map((t: string) => String(t).toLowerCase()) : [];
    return tags.includes(tag) || r.name === name;
  });
  const values = {
    name,
    active: true,
    postType: "news",
    categorySlug: def.categories[0]?.slug || "fixhaber-haberler",
    tags: [FIXHABER_CAMPAIGN_TAG, tag, "require-image"],
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

export async function ensureFixHaberSite(): Promise<FixHaberSeedResult> {
  const def = FIXHABER_SITE;
  try {
    const { siteId, action } = await upsertSite(def);
    await ensureEditor(siteId, def);
    const cats = await ensureCategories(siteId, def);
    const sampleNews = await ensureSampleNews(siteId, def, cats);
    const authors = await ensureTurkataAuthorsOnRegionalSite(siteId);
    const campaignId = await ensureCampaign(siteId, def);
    logger.info({ siteId, action, slug: FIXHABER_SLUG, authors }, "[fixhaber] site hazır");
    return {
      slug: FIXHABER_SLUG,
      domain: FIXHABER_DOMAIN,
      siteId,
      action,
      categories: cats.size,
      sampleNews,
      authors,
      campaignId,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e }, "[fixhaber] site seed failed");
    return {
      slug: FIXHABER_SLUG,
      domain: FIXHABER_DOMAIN,
      siteId: null,
      action: "error",
      categories: 0,
      sampleNews: 0,
      authors: 0,
      campaignId: null,
      detail,
    };
  }
}
