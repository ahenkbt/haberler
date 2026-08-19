import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  executeNewsDbWrite,
  getNewsDbForRead,
  newsSlugRedirectsTable,
  newsTable,
  type NewsRow,
} from "@workspace/db";
import { loadNewsContext } from "./news-context.js";
import { logger } from "./logger.js";

const HM_PREFIX = "tr";

let newsSlugRedirectsTablePromise: Promise<void> | null = null;

/** Neon'da 0117 henüz uygulanmadıysa page-bundle 500 olmasın. */
export function ensureNewsSlugRedirectsTable(): Promise<void> {
  if (newsSlugRedirectsTablePromise) return newsSlugRedirectsTablePromise;

  newsSlugRedirectsTablePromise = (async () => {
    await executeNewsDbWrite(sql`
      CREATE TABLE IF NOT EXISTS "news_slug_redirects" (
        "id" serial PRIMARY KEY NOT NULL,
        "slug" text NOT NULL,
        "site_id" integer,
        "title" text,
        "category_slug" text,
        "search_query" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    try {
      await executeNewsDbWrite(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "news_slug_redirects_slug_site_unique"
          ON "news_slug_redirects" ("slug", "site_id")
      `);
    } catch {
      /* NULL site_id tekrarları eski PG'de unique index'i düşürebilir */
    }
    try {
      await executeNewsDbWrite(sql`
        CREATE INDEX IF NOT EXISTS "news_slug_redirects_slug_idx"
          ON "news_slug_redirects" ("slug")
      `);
    } catch {
      /* index zaten varsa */
    }
    const readDb = getNewsDbForRead();
    if (readDb !== db) {
      await readDb.execute(sql`CREATE TABLE IF NOT EXISTS "news_slug_redirects" (
        "id" serial PRIMARY KEY NOT NULL,
        "slug" text NOT NULL,
        "site_id" integer,
        "title" text,
        "category_slug" text,
        "search_query" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    }
  })().catch((e) => {
    newsSlugRedirectsTablePromise = null;
    throw e;
  });

  return newsSlugRedirectsTablePromise;
}

/** Slug parçalarından arama sorgusu türet (Türkçe karakter geri yüklemesi sınırlı). */
export function deriveSearchQueryFromSlug(slug: string): string {
  const cleaned = String(slug ?? "")
    .trim()
    .replace(/-[a-f0-9]{8,12}$/i, "")
    .replace(/-\d+$/i, "");
  const words = cleaned
    .split("-")
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  return words.join(" ").slice(0, 120) || cleaned.replace(/-/g, " ").slice(0, 120) || "haber";
}

export function buildMissingNewsSearchQuery(opts: {
  title?: string | null;
  slug?: string | null;
  categorySlug?: string | null;
  tags?: string[] | null;
}): string {
  const title = String(opts.title ?? "").trim();
  if (title.length >= 4) return title.slice(0, 120);
  const displayTags = (opts.tags ?? [])
    .filter((t) => t && !["rss-auto", "rss-hybrid", "meta-ai", "haber-gonder", "haber"].includes(t))
    .slice(0, 5);
  if (displayTags.length >= 2) return displayTags.join(" ").slice(0, 120);
  if (opts.categorySlug) {
    const fromSlug = deriveSearchQueryFromSlug(String(opts.slug ?? ""));
    return fromSlug.slice(0, 120);
  }
  return deriveSearchQueryFromSlug(String(opts.slug ?? "haber"));
}

export function buildMissingNewsRedirectPath(opts: {
  searchQuery: string;
  categorySlug?: string | null;
  siteSlug?: string | null;
  hmDomain?: boolean;
}): string {
  const q = encodeURIComponent(opts.searchQuery.trim() || "haber");
  const cat = String(opts.categorySlug ?? "").trim().toLowerCase();
  if (opts.siteSlug) {
    if (cat) {
      return `/${HM_PREFIX}/${encodeURIComponent(opts.siteSlug)}/kategori/${encodeURIComponent(cat)}?q=${q}`;
    }
    return `/${HM_PREFIX}/${encodeURIComponent(opts.siteSlug)}/ara?q=${q}`;
  }
  if (cat) {
    return `/haberler?hmTab=${encodeURIComponent(cat)}&q=${q}`;
  }
  return `/haberler?q=${q}`;
}

export async function upsertNewsSlugRedirectFromRow(
  row: Pick<NewsRow, "slug" | "siteId" | "title" | "categoryId" | "tags">,
): Promise<void> {
  const slug = String(row.slug ?? "").trim();
  if (!slug) return;

  let categorySlug: string | null = null;
  if (row.categoryId != null) {
    const ctx = await loadNewsContext();
    categorySlug = ctx.categories.get(row.categoryId)?.slug ?? null;
  }

  const searchQuery = buildMissingNewsSearchQuery({
    title: row.title,
    slug,
    categorySlug,
    tags: row.tags,
  });

  const siteId = row.siteId ?? null;
  const values = {
    slug,
    siteId,
    title: row.title ?? null,
    categorySlug,
    searchQuery,
    updatedAt: new Date(),
  };

  await ensureNewsSlugRedirectsTable();
  await db
    .insert(newsSlugRedirectsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [newsSlugRedirectsTable.slug, newsSlugRedirectsTable.siteId],
      set: {
        title: values.title,
        categorySlug: values.categorySlug,
        searchQuery: values.searchQuery,
        updatedAt: values.updatedAt,
      },
    });
}

export async function removeNewsSlugRedirect(slug: string, siteId: number | null): Promise<void> {
  const s = String(slug ?? "").trim();
  if (!s) return;
  await ensureNewsSlugRedirectsTable();
  const cond =
    siteId == null
      ? and(eq(newsSlugRedirectsTable.slug, s), isNull(newsSlugRedirectsTable.siteId))
      : and(eq(newsSlugRedirectsTable.slug, s), eq(newsSlugRedirectsTable.siteId, siteId));
  await db.delete(newsSlugRedirectsTable).where(cond);
}

export type NewsMissingRedirect = {
  status: 301;
  location: string;
  searchQuery: string;
};

export async function resolveMissingNewsRedirect(
  slug: string,
  siteId: number | null,
  siteSlug?: string | null,
): Promise<NewsMissingRedirect | null> {
  const s = String(slug ?? "").trim();
  if (!s) return null;

  const readDb = getNewsDbForRead();
  let row: {
    searchQuery?: string | null;
    categorySlug?: string | null;
  } | undefined;

  try {
    await ensureNewsSlugRedirectsTable();
    const scopeCond =
      siteId != null && siteId > 0
        ? and(eq(newsSlugRedirectsTable.slug, s), eq(newsSlugRedirectsTable.siteId, siteId))
        : and(eq(newsSlugRedirectsTable.slug, s), isNull(newsSlugRedirectsTable.siteId));

    [row] = await db.select().from(newsSlugRedirectsTable).where(scopeCond).limit(1);
    if (!row && siteId != null && siteId > 0) {
      [row] = await db
        .select()
        .from(newsSlugRedirectsTable)
        .where(and(eq(newsSlugRedirectsTable.slug, s), isNull(newsSlugRedirectsTable.siteId)))
        .limit(1);
    }
  } catch (err) {
    logger.warn({ err, slug: s }, "news_slug_redirects okunamadı; türetilmiş aramaya düşülüyor");
    row = undefined;
  }

  let searchQuery = row?.searchQuery?.trim() ?? "";
  let categorySlug = row?.categorySlug ?? null;

  if (!searchQuery) {
    const [newsHit] = await readDb
      .select({
        title: newsTable.title,
        categoryId: newsTable.categoryId,
        tags: newsTable.tags,
      })
      .from(newsTable)
      .where(eq(newsTable.slug, s))
      .limit(1);
    if (newsHit) return null;
    searchQuery = deriveSearchQueryFromSlug(s);
  }

  if (!categorySlug && row?.categorySlug) categorySlug = row.categorySlug;

  const location = buildMissingNewsRedirectPath({
    searchQuery,
    categorySlug,
    siteSlug: siteSlug ?? null,
  });

  return { status: 301, location, searchQuery };
}

/** Silme öncesi tam satır + kategori slug ile yönlendirme kaydı oluştur. */
export async function recordNewsSlugRedirectBeforeDelete(newsId: number): Promise<void> {
  const readDb = getNewsDbForRead();
  const [row] = await readDb.select().from(newsTable).where(eq(newsTable.id, newsId)).limit(1);
  if (!row) return;
  await upsertNewsSlugRedirectFromRow(row);
}
