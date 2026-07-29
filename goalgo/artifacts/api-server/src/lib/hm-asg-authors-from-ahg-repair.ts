import { and, asc, eq, inArray } from "drizzle-orm";
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

/** Kaynak: https://turk.eco/tr/ankarahabergundemi (slug `ankarahabergundemi`, ahg değil). */
export const ASG_AUTHORS_SOURCE_SLUG = "ankarahabergundemi" as const;
export const ASG_AUTHORS_TARGET_SLUG = "asg" as const;

/** ASG'ye kopyalanan köşe yazıları için dış anahtar öneki. */
export const ASG_FROM_AHG_MAKALE_EXT_PREFIX = "asg←ankarahabergundemi:makale:" as const;

export type AsgAuthorsFromAhgRepairResult = {
  ok: boolean;
  sourceSiteId: number | null;
  targetSiteId: number | null;
  upserted: number;
  removed: number;
  remappedNews: number;
  remappedMakaleler: number;
  makaleRemoved: number;
  makaleCopied: number;
  authorIds: number[];
  actions: string[];
};

type AuthorRow = typeof authorsTable.$inferSelect;
type MakaleRow = typeof hmMakalelerTable.$inferSelect;

async function resolveSiteIdBySlug(slug: string): Promise<number | null> {
  const db = getNewsDbForRead();
  const [row] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

/** ankarahabergundemi vitrin sırası (hm_sort_order) olan yazarlar; aynı kişinin kopyalarını tekilleştir. */
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

export function asgFromAhgMakaleExternalKey(sourceMakaleId: number): string {
  return `${ASG_FROM_AHG_MAKALE_EXT_PREFIX}${sourceMakaleId}`;
}

function allocSlug(base: string, existing: Set<string>): string {
  let s = String(base || "yazi")
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!s) s = "yazi";
  let cand = s;
  let n = 0;
  while (existing.has(cand)) {
    n += 1;
    cand = `${s}-${n}`;
  }
  existing.add(cand);
  return cand;
}

/**
 * Sıra (zorunlu):
 * 1) ASG mevcut köşe yazılarını (`hm_makaleler`) sil
 * 2) ASG yazarlarını sil → ankarahabergundemi yazarlarını ekle
 * 3) ankarahabergundemi köşe yazılarını yazar eşlemesiyle ekle
 */
export async function repairAsgAuthorsFromAhg(): Promise<AsgAuthorsFromAhgRepairResult> {
  const db = getNewsDbForRead();
  const actions: string[] = [];
  const sourceSiteId = await resolveSiteIdBySlug(ASG_AUTHORS_SOURCE_SLUG);
  const targetSiteId = await resolveSiteIdBySlug(ASG_AUTHORS_TARGET_SLUG);

  const empty = (extra: string[] = []): AsgAuthorsFromAhgRepairResult => ({
    ok: false,
    sourceSiteId,
    targetSiteId,
    upserted: 0,
    removed: 0,
    remappedNews: 0,
    remappedMakaleler: 0,
    makaleRemoved: 0,
    makaleCopied: 0,
    authorIds: [],
    actions: extra,
  });

  if (sourceSiteId == null || targetSiteId == null) {
    return empty(["missing-site"]);
  }

  const [sourceRows, targetRows] = await Promise.all([
    db.select().from(authorsTable).where(eq(authorsTable.hmSiteId, sourceSiteId)),
    db.select().from(authorsTable).where(eq(authorsTable.hmSiteId, targetSiteId)),
  ]);

  const canonical = canonicalAhgAuthors(sourceRows);
  if (canonical.length === 0) {
    return empty(["no-source-authors"]);
  }

  const sourceAuthorsById = new Map(sourceRows.map((row) => [row.id, row] as const));
  const oldIds = targetRows.map((row) => row.id);
  const oldIdToName = new Map(targetRows.map((row) => [row.id, row.name] as const));

  const newsNameById = new Map<number, string>();
  if (oldIds.length > 0) {
    const newsHits = await db
      .select({ id: newsTable.id, authorId: newsTable.authorId })
      .from(newsTable)
      .where(and(eq(newsTable.siteId, targetSiteId), inArray(newsTable.authorId, oldIds)));
    for (const hit of newsHits) {
      const name = hit.authorId != null ? oldIdToName.get(hit.authorId) : null;
      if (name) newsNameById.set(hit.id, name);
    }
  }

  // 1) ÖNCE: ASG'deki tüm köşe yazılarını sil
  const existingMakaleIds = await db
    .select({ id: hmMakalelerTable.id })
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, targetSiteId));
  const makaleRemoved = existingMakaleIds.length;
  if (makaleRemoved > 0) {
    await dualWriteDelete(hmMakalelerTable, eq(hmMakalelerTable.siteId, targetSiteId));
    actions.push(`removed-makaleler:${makaleRemoved}`);
  }

  // 2) ASG yazarlarını sil
  let removed = 0;
  for (const row of targetRows) {
    await dualWriteUpdate(
      newsTable,
      { authorId: null },
      and(eq(newsTable.siteId, targetSiteId), eq(newsTable.authorId, row.id))!,
    );
    await dualWriteDelete(authorsTable, eq(authorsTable.id, row.id));
    removed += 1;
    actions.push(`removed-author:${row.id}`);
  }

  // 3) ankarahabergundemi yazarlarını ekle
  const newIds: number[] = [];
  let upserted = 0;
  const sourceAuthorIdToTargetId = new Map<number, number>();
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
      sourceAuthorIdToTargetId.set(src.id, created.id);
      actions.push(`created-author:${created.id}←ankarahabergundemi:${src.id}`);
    }
  }

  const newRows = (
    await db.select().from(authorsTable).where(eq(authorsTable.hmSiteId, targetSiteId))
  ).filter((row) => newIds.includes(row.id));

  const findNewIdByName = (name: string): number | null => {
    const match = newRows.find((row) => authorsRepresentSamePerson(row.name, name));
    return match?.id ?? null;
  };

  for (const src of sourceRows) {
    if (sourceAuthorIdToTargetId.has(src.id)) continue;
    const mapped = findNewIdByName(src.name);
    if (mapped != null) sourceAuthorIdToTargetId.set(src.id, mapped);
  }

  let remappedNews = 0;
  for (const [newsId, name] of newsNameById) {
    const nextId = findNewIdByName(name);
    if (nextId == null) continue;
    remappedNews += (
      await dualWriteUpdate(newsTable, { authorId: nextId }, eq(newsTable.id, newsId))
    ).length;
  }

  // 4) ankarahabergundemi köşe yazılarını ekle
  const sourceMakaleler: MakaleRow[] = await db
    .select()
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, sourceSiteId))
    .orderBy(asc(hmMakalelerTable.createdAt), asc(hmMakalelerTable.id));

  const usedSlugs = new Set<string>();
  let makaleCopied = 0;
  for (const src of sourceMakaleler) {
    const title = String(src.title ?? "").trim();
    if (!title) continue;
    let targetAuthorId: number | null = null;
    if (src.authorId != null) {
      targetAuthorId = sourceAuthorIdToTargetId.get(src.authorId) ?? null;
      if (targetAuthorId == null) {
        const srcAuthor = sourceAuthorsById.get(src.authorId);
        if (srcAuthor) targetAuthorId = findNewIdByName(srcAuthor.name);
      }
    }
    const slug = allocSlug(src.slug || title, usedSlugs);
    const [created] = await dualWriteInsert(hmMakalelerTable, {
      siteId: targetSiteId,
      authorId: targetAuthorId,
      title,
      slug,
      spot: src.spot,
      content: src.content,
      imageUrl: src.imageUrl,
      status: src.status || "published",
      views: 0,
      externalKey: asgFromAhgMakaleExternalKey(src.id),
      createdAt: src.createdAt,
      updatedAt: src.updatedAt,
    });
    if (created?.id) makaleCopied += 1;
  }
  actions.push(`copied-makaleler:${makaleCopied}/${sourceMakaleler.length}`);

  const titledSource = sourceMakaleler.filter((m) => String(m.title ?? "").trim()).length;
  return {
    ok: newIds.length === canonical.length && makaleCopied === titledSource,
    sourceSiteId,
    targetSiteId,
    upserted,
    removed,
    remappedNews,
    remappedMakaleler: 0,
    makaleRemoved,
    makaleCopied,
    authorIds: newIds,
    actions,
  };
}
