import { and, eq } from "drizzle-orm";
import {
  authorsTable,
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmMakalelerTable,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { authorsRepresentSamePerson } from "./hm-sync-source.js";

export const ASG_AUTHORS_SOURCE_SLUG = "ankarahabergundemi" as const;
export const ASG_AUTHORS_TARGET_SLUG = "asg" as const;

export type AsgAuthorsFromAhgRepairResult = {
  ok: boolean;
  sourceSiteId: number | null;
  targetSiteId: number | null;
  upserted: number;
  removed: number;
  remappedNews: number;
  remappedMakaleler: number;
  authorIds: number[];
  actions: string[];
};

type AuthorRow = typeof authorsTable.$inferSelect;

async function resolveSiteIdBySlug(slug: string): Promise<number | null> {
  const db = getNewsDbForRead();
  const [row] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

/** AHG vitrin sırası (hm_sort_order) olan yazarlar; aynı kişinin kopyalarını tekilleştir. */
export function canonicalAhgAuthors(rows: AuthorRow[]): AuthorRow[] {
  const withOrder = rows.filter((row) => row.hmSortOrder != null);
  const sorted = [...withOrder].sort((a, b) => {
    const ao = a.hmSortOrder ?? 9999;
    const bo = b.hmSortOrder ?? 9999;
    if (ao !== bo) return ao - bo;
    return (b.id ?? 0) - (a.id ?? 0);
  });
  const out: AuthorRow[] = [];
  for (const row of sorted) {
    if (out.some((prev) => authorsRepresentSamePerson(prev.name, row.name))) continue;
    out.push(row);
  }
  return out;
}

/**
 * ankarahabergundemi.com yazar listesini ankarasehirgazetesi.com (slug=asg) sitesine kopyalar.
 * Yalnızca yazar kayıtları — haber, layout veya başka site ayarlarına dokunmaz.
 */
export async function repairAsgAuthorsFromAhg(): Promise<AsgAuthorsFromAhgRepairResult> {
  const db = getNewsDbForRead();
  const actions: string[] = [];
  const sourceSiteId = await resolveSiteIdBySlug(ASG_AUTHORS_SOURCE_SLUG);
  const targetSiteId = await resolveSiteIdBySlug(ASG_AUTHORS_TARGET_SLUG);

  if (sourceSiteId == null || targetSiteId == null) {
    return {
      ok: false,
      sourceSiteId,
      targetSiteId,
      upserted: 0,
      removed: 0,
      remappedNews: 0,
      remappedMakaleler: 0,
      authorIds: [],
      actions: ["missing-site"],
    };
  }

  const [sourceRows, targetRows] = await Promise.all([
    db.select().from(authorsTable).where(eq(authorsTable.hmSiteId, sourceSiteId)),
    db.select().from(authorsTable).where(eq(authorsTable.hmSiteId, targetSiteId)),
  ]);

  const canonical = canonicalAhgAuthors(sourceRows);
  if (canonical.length === 0) {
    return {
      ok: false,
      sourceSiteId,
      targetSiteId,
      upserted: 0,
      removed: 0,
      remappedNews: 0,
      remappedMakaleler: 0,
      authorIds: [],
      actions: ["no-source-authors"],
    };
  }

  const oldAuthorNames = new Map<number, string>();
  for (const row of targetRows) oldAuthorNames.set(row.id, row.name);

  const newIds: number[] = [];
  let upserted = 0;
  for (const src of canonical) {
    const [created] = await dualWriteInsert(authorsTable, {
      name: src.name,
      title: src.title,
      avatarUrl: src.avatarUrl,
      bio: src.bio,
      hmSiteId: targetSiteId,
      hmSortOrder: src.hmSortOrder,
      email: null,
      passwordHash: null,
    });
    if (created?.id) {
      newIds.push(created.id);
      upserted += 1;
      actions.push(`created:${created.id}←ahg:${src.id}`);
    }
  }

  const freshRows = await db
    .select()
    .from(authorsTable)
    .where(eq(authorsTable.hmSiteId, targetSiteId));
  const newRows = freshRows.filter((row) => newIds.includes(row.id));

  let remappedNews = 0;
  let remappedMakaleler = 0;
  for (const [oldId, oldName] of oldAuthorNames) {
    const match = newRows.find((row) => authorsRepresentSamePerson(row.name, oldName));
    if (!match) continue;
    remappedNews += (
      await dualWriteUpdate(
        newsTable,
        { authorId: match.id },
        and(eq(newsTable.siteId, targetSiteId), eq(newsTable.authorId, oldId))!,
      )
    ).length;
    remappedMakaleler += (
      await dualWriteUpdate(
        hmMakalelerTable,
        { authorId: match.id },
        and(eq(hmMakalelerTable.siteId, targetSiteId), eq(hmMakalelerTable.authorId, oldId))!,
      )
    ).length;
  }

  let removed = 0;
  for (const row of targetRows) {
    await dualWriteUpdate(
      newsTable,
      { authorId: null },
      and(eq(newsTable.siteId, targetSiteId), eq(newsTable.authorId, row.id))!,
    );
    await dualWriteUpdate(
      hmMakalelerTable,
      { authorId: null },
      and(eq(hmMakalelerTable.siteId, targetSiteId), eq(hmMakalelerTable.authorId, row.id))!,
    );
    await dualWriteDelete(authorsTable, eq(authorsTable.id, row.id));
    removed += 1;
    actions.push(`removed:${row.id}`);
  }

  return {
    ok: newIds.length > 0,
    sourceSiteId,
    targetSiteId,
    upserted,
    removed,
    remappedNews,
    remappedMakaleler,
    authorIds: newIds,
    actions,
  };
}
