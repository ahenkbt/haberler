/**
 * turkatahaber.com & yerel.net.tr — idempotent Neon seed.
 */
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  categoriesTable,
  db,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
  newsTable,
  rssCampaignsTable,
} from "@workspace/db";
import { filterBlockedHmRssFeedUrls } from "./rssBlockedFeeds.js";
import { normalizeHmSiteIds } from "./hm-rss-campaigns.js";
import { logger } from "./logger.js";
import { ensureTurkataAuthorsOnRegionalSite } from "./hm-gundemi-regional-seed.js";
import {
  buildKamuYerelLayoutJson,
  KAMU_YEREL_CAMPAIGN_TAG,
  KAMU_YEREL_SITES,
  type KamuYerelSiteDef,
} from "./hm-kamu-yerel-sites.js";
import { hmLayoutLogoUsesInlineDataUrl } from "./hm-domain-lookup.js";
import {
  applyKamuYerelLayoutLock,
  kamuYerelLayoutNeedsCatalogRepair,
  kamuYerelLogoExpectation,
} from "./hm-kamu-yerel-layout-lock.js";
import { mirrorHmSiteLayoutJsonToPhpNeon } from "./hm-php-layout-sync.js";

export type KamuYerelSeedSiteResult = {
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

export type KamuYerelSeedResult = {
  sites: KamuYerelSeedSiteResult[];
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

function buildLockedKamuYerelLayoutJson(
  def: KamuYerelSiteDef,
  existingLayoutJson: string | null | undefined,
): string {
  const canonicalLayout = buildKamuYerelLayoutJson(def);
  const raw = String(existingLayoutJson ?? "").trim();
  if (!raw) return JSON.stringify(canonicalLayout);
  try {
    const prev = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify(applyKamuYerelLayoutLock(prev, canonicalLayout));
  } catch {
    return JSON.stringify(canonicalLayout);
  }
}

async function upsertSite(def: KamuYerelSiteDef): Promise<{
  siteId: number;
  action: "created" | "updated" | "unchanged";
}> {
  const contactJson = JSON.stringify({
    email: def.kunyeEmail,
    phone: TURKATA_CONTACT.phone,
    address: TURKATA_CONTACT.address,
  });

  // Panel Neon (DATABASE_URL) kimliği kullan — NEWS_DB_READ=news iken PHP id 230
  // bulunup dual-write yanlış ana satırı (veya 1132'yi atlayarak) güncelliyordu.
  const claimants = await db
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

  const layoutJson = buildLockedKamuYerelLayoutJson(def, existing?.layoutJson);

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

  const logoExpect = kamuYerelLogoExpectation(def);
  const needs =
    normalizeDomainHost(existing.domain) !== def.domain ||
    existing.displayName !== def.displayName ||
    existing.description !== def.description ||
    existing.active !== true ||
    String(existing.layoutJson || "") !== layoutJson ||
    hmLayoutLogoUsesInlineDataUrl(existing.layoutJson) ||
    kamuYerelLayoutNeedsCatalogRepair(existing.layoutJson, logoExpect) ||
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

const TURKATA_CONTACT = {
  phone: "0532 229 18 92",
  address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
};

async function ensureEditor(siteId: number, def: KamuYerelSiteDef): Promise<void> {
  const email = def.kunyeEmail;
  const passwordHash = await bcrypt.hash(email, 10);
  // Panel DB only — NEWS_DB_READ=news misses PHP-absent editors and dualWriteInsert
  // then hits hm_site_editors_site_id_username_key on the panel row.
  const [byEmail] = await db
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, siteId), eq(hmSiteEditorsTable.email, email)))
    .limit(1);
  const [byUsername] = byEmail
    ? [null]
    : await db
        .select({ id: hmSiteEditorsTable.id })
        .from(hmSiteEditorsTable)
        .where(and(eq(hmSiteEditorsTable.siteId, siteId), eq(hmSiteEditorsTable.username, email)))
        .limit(1);
  const existing = byEmail ?? byUsername;
  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      {
        email,
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
  try {
    await dualWriteInsert(hmSiteEditorsTable, {
      siteId,
      email,
      username: email,
      passwordHash,
      displayName: `${def.displayName} Editör`,
      isActive: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/hm_site_editors_site_id_username_key|duplicate key/i.test(msg)) throw err;
    logger.warn({ siteId, email }, "[kamu-yerel] editor insert race — treating as existing");
  }
}

async function ensureCategories(siteId: number, def: KamuYerelSiteDef): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let order = 10;
  for (const cat of def.categories) {
    // Panel Neon slug kimliği — NEWS_DB_READ=news PHP id ile dual-write sapmasını önler.
    const [existing] = await db
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
      if (existing.name !== cat.name || existing.color !== cat.color || existing.sortOrder !== order) {
        await dualWriteUpdate(
          categoriesTable,
          {
            name: cat.name,
            color: cat.color,
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
        exclusiveSiteId: null,
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
  def: KamuYerelSiteDef,
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
      content: `<p>${item.spot}</p><p>${def.displayName} örnek haberi. Canlı içerik Cumha RSS kampanyası ve editör paneli ile güncellenir.</p>`,
      categoryId,
      status: "published" as const,
      isFeatured: item.featured === true,
      isSiteManset: item.featured === true,
      isBreaking: false,
      tags: [KAMU_YEREL_CAMPAIGN_TAG, def.slug],
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

async function ensureCampaign(siteId: number, def: KamuYerelSiteDef): Promise<number | null> {
  const tag = `${KAMU_YEREL_CAMPAIGN_TAG}:${def.slug}`;
  const name = `${def.displayName} — Cumha kamu-yerel RSS`;
  const feeds = filterBlockedHmRssFeedUrls(def.rssFeeds);
  const rows = await getNewsDbForRead().select().from(rssCampaignsTable);
  const existing = rows.find((r: { name: string; tags: string[] | null }) => {
    const tags = Array.isArray(r.tags) ? r.tags.map((t: string) => String(t).toLowerCase()) : [];
    return tags.includes(tag) || r.name === name;
  });
  const values = {
    name,
    active: true,
    postType: "news",
    categorySlug: "yerel",
    tags: [KAMU_YEREL_CAMPAIGN_TAG, tag, "require-image"],
    feeds,
    sourceType: "rss",
    intervalMinutes: 180,
    dailyLimit: 200,
    downloadImages: true,
    headline: false,
    hmSiteIds: [siteId],
    includeYekpareHaber: false,
  };
  if (existing) {
    const existingTargets = normalizeHmSiteIds(existing.hmSiteIds);
    // Drop legacy PHP-only targets (230) so campaign always binds panel id (1132).
    const needs =
      existing.name !== values.name ||
      existing.active !== values.active ||
      existing.categorySlug !== values.categorySlug ||
      Number(existing.dailyLimit) !== values.dailyLimit ||
      existing.downloadImages !== values.downloadImages ||
      !existingTargets.includes(siteId) ||
      existingTargets.some((id) => id !== siteId) ||
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

async function ensureOneSite(def: KamuYerelSiteDef): Promise<KamuYerelSeedSiteResult> {
  try {
    const { siteId, action } = await upsertSite(def);
    await ensureEditor(siteId, def);
    const cats = await ensureCategories(siteId, def);
    const sampleNews = await ensureSampleNews(siteId, def, cats);
    const authors = def.slug === "turkatahaber" ? await ensureTurkataAuthorsOnRegionalSite(siteId) : 0;
    const campaignId = await ensureCampaign(siteId, def);
    const layoutJson = JSON.stringify(buildKamuYerelLayoutJson(def));
    await mirrorHmSiteLayoutJsonToPhpNeon(siteId, layoutJson).catch((err: unknown) => {
      logger.warn(
        { siteId, slug: def.slug, err: err instanceof Error ? err.message : String(err) },
        "[kamu-yerel] php layout mirror",
      );
    });
    logger.info({ siteId, action, slug: def.slug }, "[kamu-yerel] site hazır");
    return {
      slug: def.slug,
      domain: def.domain,
      siteId,
      action,
      categories: cats.size,
      sampleNews,
      authors,
      campaignId,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e, slug: def.slug }, "[kamu-yerel] site seed failed");
    return {
      slug: def.slug,
      domain: def.domain,
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

export async function ensureKamuYerelSites(): Promise<KamuYerelSeedResult> {
  const sites: KamuYerelSeedSiteResult[] = [];
  for (const def of KAMU_YEREL_SITES) {
    sites.push(await ensureOneSite(def));
  }
  return { sites };
}
