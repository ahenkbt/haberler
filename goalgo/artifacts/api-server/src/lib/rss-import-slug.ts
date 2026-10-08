import { and, eq, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getNewsDbForRead, newsTable } from "@workspace/db";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import { slugify } from "./news-context.js";

/** Eski içe aktarım: `rss-{newsId}` — SEO için başlık tabanlı slug kullanılmalı. */
export function isLegacyRssNumericSlug(raw: unknown): boolean {
  return /^rss-\d+$/i.test(String(raw ?? "").trim());
}

/** Kararlı SEO slug: başlık + kaynak URL hash (yeniden içe aktarmada değişmez). */
export function stableRssNewsSlug(title: string, sourceUrl: string | null, siteId?: number | null): string {
  const base = slugify(decodeHtmlEntities(title)).slice(0, 72).replace(/-+$/, "") || "haber";
  const siteSuffix =
    siteId != null && Number.isFinite(siteId) && siteId > 0 ? `-s${Math.trunc(siteId)}` : "";
  if (!sourceUrl) return `${base}${siteSuffix}-rss`;
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10);
  return `${base}${siteSuffix}-${hash}`;
}

export async function ensureUniqueNewsSlug(
  candidate: string,
  siteId?: number | null,
): Promise<string> {
  let slug = candidate;
  const scope =
    siteId != null && Number.isFinite(siteId) && siteId > 0
      ? (s: string) =>
          getNewsDbForRead()
            .select({ id: newsTable.id })
            .from(newsTable)
            .where(and(eq(newsTable.slug, s), eq(newsTable.siteId, siteId)))
            .limit(1)
      : (s: string) =>
          getNewsDbForRead()
            .select({ id: newsTable.id })
            .from(newsTable)
            .where(and(eq(newsTable.slug, s), isNull(newsTable.siteId)))
            .limit(1);

  for (let n = 0; n < 20; n += 1) {
    const [hit] = await scope(slug);
    if (!hit) return slug;
    slug = `${candidate}-${n + 1}`;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}

export async function buildRssImportNewsSlug(opts: {
  title: string;
  sourceUrl: string | null;
  siteId?: number | null;
}): Promise<string> {
  const candidate = stableRssNewsSlug(opts.title, opts.sourceUrl, opts.siteId);
  return ensureUniqueNewsSlug(candidate, opts.siteId);
}
