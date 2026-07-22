import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  authorsTable,
  dualWriteInsert,
  getNewsDbForRead,
  hmMakalelerTable,
  newsTable,
} from "@workspace/db";

type AuthorRow = typeof authorsTable.$inferSelect;
type MakaleRow = typeof hmMakalelerTable.$inferSelect;
type NewsRow = typeof newsTable.$inferSelect;
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

function newsToSource(n: NewsRow): SourceArticle | null {
  const slug = String(n.slug ?? "").trim();
  if (!slug) return null;
  return {
    title: String(n.title ?? ""),
    slug,
    spot: n.spot ?? null,
    content: n.content ?? null,
    imageUrl: n.imageUrl ?? null,
    externalKey: `news:${n.id}`,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
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

async function loadNewsForAuthor(sourceAuthorId: number, sourceSiteId: number | null): Promise<NewsRow[]> {
  const baseConds = [eq(newsTable.authorId, sourceAuthorId), eq(newsTable.status, "published")];
  if (sourceSiteId != null) {
    return db
      .select()
      .from(newsTable)
      .where(and(...baseConds, eq(newsTable.siteId, sourceSiteId)))
      .orderBy(desc(newsTable.createdAt));
  }
  return db
    .select()
    .from(newsTable)
    .where(and(...baseConds, isNull(newsTable.siteId)))
    .orderBy(desc(newsTable.createdAt));
}

async function loadSourceArticles(source: AuthorRow): Promise<SourceArticle[]> {
  const directMak = await loadMakalelerForAuthor(source.id, source.hmSiteId ?? null);
  const directNews = await loadNewsForAuthor(source.id, source.hmSiteId ?? null);

  const merged: SourceArticle[] = [];
  const seen = new Set<string>();

  const push = (item: SourceArticle | null) => {
    if (!item) return;
    const key = item.externalKey.trim() || `${item.slug}::${item.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };

  for (const row of directMak) push(makaleToSource(row));
  for (const row of directNews) push(newsToSource(row));

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
    const newsRows = await loadNewsForAuthor(peer.id, peer.hmSiteId ?? null);
    for (const row of newsRows) push(newsToSource(row));
  }

  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Yalnızca bilinçli admin ataması — otomatik/arka plan çağrıları yasak. */
export type AuthorDistributeOpts = {
  /** Admin panel «yazar ata» veya syncArticlesOnly. Otomatik backfill için kullanılmaz. */
  explicitAdminAction: true;
};

/**
 * Kaynak yazarın yayınlı köşe makalelerini hedef HM sitelerine kopyalar.
 * Yalnızca admin bulk-distribute ile çağrılmalı; sayfa yüklemesinde / boş listede
 * otomatik çalıştırılmamalı.
 */
export async function distributeAuthorArticlesToHmSites(
  sourceAuthorIds: number[],
  targetSiteIds: number[],
  opts: AuthorDistributeOpts,
): Promise<AuthorArticleDistributeResult> {
  if (opts?.explicitAdminAction !== true) {
    throw new Error("distributeAuthorArticlesToHmSites: explicitAdminAction gerekli (otomatik dağıtım kapalı)");
  }
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
        .select({ slug: hmMakalelerTable.slug, externalKey: hmMakalelerTable.externalKey })
        .from(hmMakalelerTable)
        .where(eq(hmMakalelerTable.siteId, targetSiteId));
      const slugSet = new Set(existingRows.map((r) => String(r.slug ?? "").trim()).filter(Boolean));
      const extSet = new Set(existingRows.map((r) => String(r.externalKey ?? "").trim()).filter(Boolean));

      for (const m of articles) {
        const ext = m.externalKey.trim();
        const slug = m.slug.trim();
        if (!slug) {
          articlesSkipped += 1;
          continue;
        }
        if ((ext && extSet.has(ext)) || slugSet.has(slug)) {
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
        articlesAdded += 1;
      }
    }
  }

  return { articlesAdded, articlesSkipped };
}
