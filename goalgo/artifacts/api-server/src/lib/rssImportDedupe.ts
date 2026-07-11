import { and, eq, gte, isNull, isNotNull } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";

export function normalizeRssSourceUrl(link: string): string | null {
  const t = link.trim();
  if (!t) return null;
  try {
    const abs = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/\//, "")}`;
    const u = new URL(abs);
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^(utm_|fbclid$|gclid$|yclid$|mc_|ref$|ref_src$)/i.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return t.toLowerCase();
  }
}

export async function rssArticleAlreadyImported(
  siteId: number | null,
  sourceUrl: string | null,
  title: string,
): Promise<boolean> {
  if (sourceUrl) {
    const cond =
      siteId == null
        ? and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, sourceUrl))
        : and(eq(newsTable.siteId, siteId), eq(newsTable.rssSourceUrl, sourceUrl));
    const [hit] = await db.select({ id: newsTable.id }).from(newsTable).where(cond).limit(1);
    return !!hit;
  }
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cond =
    siteId == null
      ? and(isNull(newsTable.siteId), eq(newsTable.title, title), gte(newsTable.createdAt, since))
      : and(eq(newsTable.siteId, siteId), eq(newsTable.title, title), gte(newsTable.createdAt, since));
  const [hit] = await db.select({ id: newsTable.id }).from(newsTable).where(cond).limit(1);
  return !!hit;
}

/** Aynı RSS kaynak URL’si herhangi bir sitede (veya ana havuzda) varsa tekrar içe aktarma. */
export async function rssArticleSourceUrlExistsAnywhere(sourceUrl: string | null): Promise<boolean> {
  if (!sourceUrl) return false;
  const [hit] = await db
    .select({ id: newsTable.id })
    .from(newsTable)
    .where(and(isNotNull(newsTable.rssSourceUrl), eq(newsTable.rssSourceUrl, sourceUrl)))
    .limit(1);
  return !!hit;
}
