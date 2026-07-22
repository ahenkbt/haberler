import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  authorsTable,
  dualWriteInsert,
  getNewsDbForRead,
  hmMakalelerTable,
} from "@workspace/db";
import { isDistributedFromNewsKey, normalizeMakaleTitleKey } from "./hm-makale-dedupe";

type AuthorRow = typeof authorsTable.$inferSelect;
type MakaleRow = typeof hmMakalelerTable.$inferSelect;
const db = getNewsDbForRead();

export type AuthorArticleDistributeResult = {
  articlesAdded: number;
  articlesSkipped: number;
};

type SourceArticle = {
  title: string;
  slug: string;
  spot: string | null;
  content: string | null;
  imageUrl: string | null;
  externalKey: string;
  createdAt: Date;
  updatedAt: Date;
};

async function resolveTargetAuthorId(source: AuthorRow, targetSiteId: number): Promise<number | null> {
  const name = String(source.name ?? "").trim();
  if (!name) return null;
  const [existing] = await db
    .select({ id: authorsTable.id })
    .from(authorsTable)
    .where(and(eq(authorsTable.name, name), eq(authorsTable.hmSiteId, targetSiteId)))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await dualWriteInsert(authorsTable, {
      name: source.name,
      title: source.title ?? null,
      avatarUrl: source.avatarUrl ?? null,
      bio: source.bio ?? null,
      hmSiteId: targetSiteId,
      email: null,
      passwordHash: null,
    });
  return created?.id ?? null;
}

function makaleToSource(m: MakaleRow): SourceArticle | null {
  const slug = String(m.slug ?? "").trim();
  if (!slug) return null;
  const ext = String(m.externalKey ?? "").trim();
  return {
    title: String(m.title ?? ""),
    slug,
    spot: m.spot ?? null,
    content: m.content ?? null,
    imageUrl: m.imageUrl ?? null,
    externalKey: ext || `makale:${m.id}`,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}


async function loadMakalelerForAuthor(sourceAuthorId: number, sourceSiteId: number | null): Promise<MakaleRow[]> {
  const baseConds = [eq(hmMakalelerTable.authorId, sourceAuthorId), eq(hmMakalelerTable.status, "published")];
  if (sourceSiteId != null) {
    return db
      .select()
      .from(hmMakalelerTable)
      .where(and(...baseConds, eq(hmMakalelerTable.siteId, sourceSiteId)))
      .orderBy(desc(hmMakalelerTable.createdAt));
  }
  return db
    .select()
    .from(hmMakalelerTable)
    .where(and(...baseConds))
    .orderBy(desc(hmMakalelerTable.createdAt));
}


async function loadSourceArticles(source: AuthorRow): Promise<SourceArticle[]> {
  // Yalnızca köşe makaleleri (hm_makaleler). Haber (news) köşe vitrinine kopyalanmaz.
  const directMak = await loadMakalelerForAuthor(source.id, source.hmSiteId ?? null);

  const merged: SourceArticle[] = [];
  const seen = new Set<string>();
  const seenTitles = new Set<string>();

  const push = (item: SourceArticle | null) => {
    if (!item) return;
    if (isDistributedFromNewsKey(item.externalKey)) return;
    const titleKey = normalizeMakaleTitleKey(item.title);
    const key = item.externalKey.trim() || `${item.slug}::${item.title}`;
    if (seen.has(key)) return;
    if (titleKey && seenTitles.has(titleKey)) return;
    seen.add(key);
    if (titleKey) seenTitles.add(titleKey);
    merged.push(item);
  };

  for (const row of directMak) push(makaleToSource(row));

  if (merged.length > 0) {
    return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const name = String(source.name ?? "").trim();
  if (!name) return [];
  const normalizedName = name.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");

  const peers = await db
    .select({ id: authorsTable.id, hmSiteId: authorsTable.hmSiteId })
    .from(authorsTable)
    .where(sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalizedName}`);

  for (const peer of peers) {
    if (peer.id === source.id) continue;
    const makRows = await loadMakalelerForAuthor(peer.id, peer.hmSiteId ?? null);
    for (const row of makRows) push(makaleToSource(row));
  }

  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Yazar ataması sonrası kaynak yazarın yayınlı köşe makalelerini hedef HM sitelerine kopyalar. */
export async function distributeAuthorArticlesToHmSites(
  sourceAuthorIds: number[],
  targetSiteIds: number[],
): Promise<AuthorArticleDistributeResult> {
  if (sourceAuthorIds.length === 0 || targetSiteIds.length === 0) {
    return { articlesAdded: 0, articlesSkipped: 0 };
  }

  let articlesAdded = 0;
  let articlesSkipped = 0;

  const sources = await db.select().from(authorsTable).where(inArray(authorsTable.id, sourceAuthorIds));

  for (const source of sources) {
    const articles = await loadSourceArticles(source);
    if (articles.length === 0) continue;

    for (const targetSiteId of targetSiteIds) {
      if (source.hmSiteId === targetSiteId) continue;

      const targetAuthorId = await resolveTargetAuthorId(source, targetSiteId);
      if (targetAuthorId == null) continue;

      const existingRows = await db
        .select({
          slug: hmMakalelerTable.slug,
          externalKey: hmMakalelerTable.externalKey,
          title: hmMakalelerTable.title,
        })
        .from(hmMakalelerTable)
        .where(eq(hmMakalelerTable.siteId, targetSiteId));
      const slugSet = new Set(existingRows.map((r) => String(r.slug ?? "").trim()).filter(Boolean));
      const extSet = new Set(existingRows.map((r) => String(r.externalKey ?? "").trim()).filter(Boolean));
      const titleSet = new Set(
        existingRows.map((r) => normalizeMakaleTitleKey(r.title)).filter(Boolean),
      );

      for (const m of articles) {
        const ext = m.externalKey.trim();
        const slug = m.slug.trim();
        const titleKey = normalizeMakaleTitleKey(m.title);
        if (!slug) {
          articlesSkipped += 1;
          continue;
        }
        if ((ext && extSet.has(ext)) || slugSet.has(slug) || (titleKey && titleSet.has(titleKey))) {
          articlesSkipped += 1;
          continue;
        }

        await dualWriteInsert(hmMakalelerTable, {
          siteId: targetSiteId,
          authorId: targetAuthorId,
          title: m.title,
          slug,
          spot: m.spot,
          content: m.content,
          imageUrl: m.imageUrl,
          status: "published",
          views: 0,
          externalKey: ext || `dist:${source.id}:${slug}`,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        });
        slugSet.add(slug);
        if (ext) extSet.add(ext);
        if (titleKey) titleSet.add(titleKey);
        articlesAdded += 1;
      }
    }
  }

  return { articlesAdded, articlesSkipped };
}
