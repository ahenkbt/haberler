import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  getNewsDbForRead,
  newsSlugRedirectsTable,
  newsTable,
  type NewsRow,
} from "@workspace/db";
import { loadNewsContext } from "./news-context.js";

const HM_PREFIX = "tr";

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
  const scopeCond =
    siteId != null && siteId > 0
      ? and(eq(newsSlugRedirectsTable.slug, s), eq(newsSlugRedirectsTable.siteId, siteId))
      : and(eq(newsSlugRedirectsTable.slug, s), isNull(newsSlugRedirectsTable.siteId));

  let [row] = await db.select().from(newsSlugRedirectsTable).where(scopeCond).limit(1);
  if (!row && siteId != null && siteId > 0) {
    [row] = await db
      .select()
      .from(newsSlugRedirectsTable)
      .where(and(eq(newsSlugRedirectsTable.slug, s), isNull(newsSlugRedirectsTable.siteId)))
      .limit(1);
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
