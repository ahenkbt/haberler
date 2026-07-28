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

function canonicalAhgAuthors(rows: AuthorRow[]): AuthorRow[] {
  const sorted = [...rows].sort((a, b) => {
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

function pickAsgMatch(targets: AuthorRow[], sourceName: string): AuthorRow | null {
  const matches = targets.filter((row) => authorsRepresentSamePerson(row.name, sourceName));
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => {
    const ao = a.hmSortOrder ?? 9999;
    const bo = b.hmSortOrder ?? 9999;
    if (ao !== bo) return ao - bo;
    return (a.id ?? 0) - (b.id ?? 0);
  })[0]!;
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
  const keptIds = new Set<number>();
  let upserted = 0;

  for (const src of canonical) {
    const existing = pickAsgMatch(targetRows, src.name);
    const payload = {
      name: src.name,
      title: src.title,
      avatarUrl: src.avatarUrl,
      bio: src.bio,
      hmSiteId: targetSiteId,
      hmSortOrder: src.hmSortOrder,
      email: src.email,
    };

    if (existing) {
      await dualWriteUpdate(authorsTable, payload, eq(authorsTable.id, existing.id));
      keptIds.add(existing.id);
      upserted += 1;
      actions.push(`updated:${existing.id}←ahg:${src.id}`);
      continue;
    }

    const [created] = await dualWriteInsert(authorsTable, payload);
    if (created?.id) {
      keptIds.add(created.id);
      targetRows.push(created);
      upserted += 1;
      actions.push(`created:${created.id}←ahg:${src.id}`);
    }
  }

  const removeIds = targetRows.map((row) => row.id).filter((id) => !keptIds.has(id));
  let removed = 0;
  let remappedNews = 0;
  let remappedMakaleler = 0;

  for (const removeId of removeIds) {
    const doomed = targetRows.find((row) => row.id === removeId);
    if (!doomed) continue;
    const replacement = [...keptIds]
      .map((id) => targetRows.find((row) => row.id === id))
      .filter((row): row is AuthorRow => Boolean(row))
      .find((row) => authorsRepresentSamePerson(row.name, doomed.name));

    if (replacement && replacement.id !== removeId) {
      const newsRows = await dualWriteUpdate(
        newsTable,
        { authorId: replacement.id },
        and(eq(newsTable.siteId, targetSiteId), eq(newsTable.authorId, removeId))!,
      );
      remappedNews += newsRows.length;

      const makRows = await dualWriteUpdate(
        hmMakalelerTable,
        { authorId: replacement.id },
        and(eq(hmMakalelerTable.siteId, targetSiteId), eq(hmMakalelerTable.authorId, removeId))!,
      );
      remappedMakaleler += makRows.length;
    } else {
      await dualWriteUpdate(
        newsTable,
        { authorId: null },
        and(eq(newsTable.siteId, targetSiteId), eq(newsTable.authorId, removeId))!,
      );
      await dualWriteUpdate(
        hmMakalelerTable,
        { authorId: null },
        and(eq(hmMakalelerTable.siteId, targetSiteId), eq(hmMakalelerTable.authorId, removeId))!,
      );
    }

    await dualWriteDelete(authorsTable, eq(authorsTable.id, removeId));
    removed += 1;
    actions.push(`removed:${removeId}`);
  }

  return {
    ok: keptIds.size > 0,
    sourceSiteId,
    targetSiteId,
    upserted,
    removed,
    remappedNews,
    remappedMakaleler,
    authorIds: [...keptIds],
    actions,
  };
}
