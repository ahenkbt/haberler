/**
 * Doğrudan Haberler.com /muhtar/ kazıma → turkatahaber site_id=1132, categorySlug=muhtar.
 * Kampanya shared-pool (site_id=null) sorununu atlar.
 *
 *   node --env-file=../../.env --import tsx ./scripts/bulk-import-muhtar-direct.ts
 */
import { and, eq, or, sql } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import {
  HABERLER_MUHTAR_CATEGORY_SLUG,
  HABERLER_MUHTAR_LISTING_BASE,
  listHaberlerMuhtarListingPages,
} from "../src/lib/hm-cumha-kamu-yerel-catalog.js";
import { scrapeHaberlerComListingPages } from "../src/lib/haberlerComScraper.js";
import { KAMU_YEREL_CAMPAIGN_TAG, TURKATAHABER_SLUG } from "../src/lib/hm-kamu-yerel-sites.js";
import { mirrorRssImportImageUrl } from "../src/lib/portal-rss-image-mirror.js";
import { normalizeRssSourceUrl } from "../src/lib/rssImportDedupe.js";
import { buildRssImportNewsSlug } from "../src/lib/rss-import-slug.js";
import { newsHasCoverImage } from "../src/lib/rss-campaign-dedupe.js";

const TARGET = 100;

async function main() {
  if (process.env.NEWS_DATABASE_URL?.trim() && !process.env.NEWS_DB_WRITE?.trim()) {
    process.env.NEWS_DB_WRITE = "dual";
  }

  const db = getNewsDbForRead();
  const [site] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, TURKATAHABER_SLUG))
    .limit(1);
  const [cat] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, HABERLER_MUHTAR_CATEGORY_SLUG))
    .limit(1);
  if (!site?.id || !cat?.id) {
    console.error("missing site/category", { site, cat });
    process.exit(1);
  }

  const pages = listHaberlerMuhtarListingPages(1); // listing pagination is static; page1 has ~66 unique
  console.log(JSON.stringify({ siteId: site.id, categoryId: cat.id, pages, listing: HABERLER_MUHTAR_LISTING_BASE }, null, 2));

  const articles = await scrapeHaberlerComListingPages(pages, {
    limit: TARGET,
    perPageLimit: 80,
    timeoutMs: 20_000,
  });
  console.log("scraped", articles.length);

  const existing = await db
    .select({
      id: newsTable.id,
      rssSourceUrl: newsTable.rssSourceUrl,
      title: newsTable.title,
      imageUrl: newsTable.imageUrl,
      siteId: newsTable.siteId,
    })
    .from(newsTable)
    .where(
      or(
        and(eq(newsTable.siteId, site.id), eq(newsTable.categoryId, cat.id)),
        and(eq(newsTable.categoryId, cat.id), sql`${newsTable.siteId} is null`),
      ),
    );

  const byUrl = new Map<string, (typeof existing)[0]>();
  for (const row of existing) {
    const key = row.rssSourceUrl ? normalizeRssSourceUrl(row.rssSourceUrl) : null;
    if (key) byUrl.set(key, row);
  }

  let added = 0;
  let upgraded = 0;
  let skipped = 0;
  const samples: string[] = [];

  for (const article of articles) {
    const sourceKey = normalizeRssSourceUrl(article.link);
    const title = article.title.replace(/<[^>]*>/g, "").trim().slice(0, 200);
    if (!title || title.length < 8) {
      skipped += 1;
      continue;
    }
    const imageUrl = await mirrorRssImportImageUrl(article.imageUrl, title, { force: true });
    const dup = sourceKey ? byUrl.get(sourceKey) : null;
    if (dup) {
      const patch: Record<string, unknown> = {
        siteId: site.id,
        siteOnly: true,
        ownerSiteId: site.id,
        categoryId: cat.id,
        updatedAt: new Date(),
      };
      if (!newsHasCoverImage(dup.imageUrl) && newsHasCoverImage(imageUrl)) {
        patch.imageUrl = imageUrl;
      }
      if (dup.siteId !== site.id || !newsHasCoverImage(dup.imageUrl)) {
        await dualWriteUpdate(newsTable, patch, eq(newsTable.id, dup.id));
        upgraded += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const slug = await buildRssImportNewsSlug({
      title,
      sourceUrl: sourceKey,
      siteId: site.id,
    });
    const content =
      article.contentHtml?.length > 80 ? article.contentHtml : `<p>${article.spot}</p>`;
    await dualWriteInsert(newsTable, {
      title,
      slug,
      spot: article.spot.slice(0, 500) || "Haberler.com Muhtar kategorisinden.",
      content,
      imageUrl: imageUrl ?? null,
      categoryId: cat.id,
      status: "published",
      isFeatured: false,
      isBreaking: false,
      tags: [KAMU_YEREL_CAMPAIGN_TAG, "turkata-muhtar-haberler", HABERLER_MUHTAR_CATEGORY_SLUG, TURKATAHABER_SLUG],
      siteId: site.id,
      siteOnly: true,
      ownerSiteId: site.id,
      rssSourceUrl: sourceKey,
      isEditorManual: false,
      createdAt: article.publishedAt,
      updatedAt: article.publishedAt,
    });
    if (sourceKey) {
      byUrl.set(sourceKey, {
        id: -1,
        rssSourceUrl: sourceKey,
        title,
        imageUrl: imageUrl ?? null,
        siteId: site.id,
      });
    }
    added += 1;
    if (samples.length < 5) samples.push(slug);
  }

  const countRes = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM news
    WHERE site_id = ${site.id}
      AND category_id = ${cat.id}
      AND status = 'published'
  `);
  const published = Number((countRes as { rows?: Array<{ n: number }> }).rows?.[0]?.n ?? 0);

  console.log(
    JSON.stringify(
      {
        added,
        upgraded,
        skipped,
        scraped: articles.length,
        publishedOnTurkata: published,
        target: TARGET,
        sampleSlugs: samples,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
