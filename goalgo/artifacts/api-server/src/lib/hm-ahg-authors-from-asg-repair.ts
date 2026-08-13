import { and, asc, eq } from "drizzle-orm";
import {
  authorsTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmMakalelerTable,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { authorsRepresentSamePerson } from "./hm-sync-source.js";

/** Kaynak: ankarasehirgazetesi.com (slug `asg`). */
export const AHG_AUTHORS_SOURCE_SLUG = "asg" as const;
/** Hedef: ankarahabergundemi.com */
export const AHG_AUTHORS_TARGET_SLUG = "ankarahabergundemi" as const;

export const AHG_FROM_ASG_MAKALE_EXT_PREFIX = "ahg←asg:makale:" as const;
export const AHG_FROM_ASG_NEWS_EXT_PREFIX = "ahg←asg:news:" as const;

export type AhgAuthorsFromAsgRepairResult = {
  ok: boolean;
  sourceSiteId: number | null;
  targetSiteId: number | null;
  upserted: number;
  reused: number;
  makaleCopied: number;
  makaleRematched: number;
  newsCopied: number;
  authorIds: number[];
  actions: string[];
};

type AuthorRow = typeof authorsTable.$inferSelect;
type MakaleRow = typeof hmMakalelerTable.$inferSelect;

export function foldMakaleTitle(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

export function ahgFromAsgMakaleExternalKey(sourceMakaleId: number): string {
  return `${AHG_FROM_ASG_MAKALE_EXT_PREFIX}${sourceMakaleId}`;
}

export function ahgFromAsgNewsExternalKey(sourceNewsId: number): string {
  return `${AHG_FROM_ASG_NEWS_EXT_PREFIX}${sourceNewsId}`;
}

/** ASG vitrin sırası olan yazarlar; aynı kişinin kopyalarını tekilleştir. */
export function canonicalAsgAuthors(rows: AuthorRow[]): AuthorRow[] {
  const withOrder = rows.filter((row) => row.hmSortOrder != null);
  const pool = withOrder.length > 0 ? withOrder : rows;
  const sorted = [...pool].sort((a, b) => {
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

async function resolveSiteIdBySlug(slug: string): Promise<number | null> {
  const db = getNewsDbForRead();
  const [row] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, slug))
    .limit(1);
  return row?.id ?? null;
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

function findTargetAuthorId(targetRows: AuthorRow[], name: string): number | null {
  const match = targetRows.find((row) => authorsRepresentSamePerson(row.name, name));
  return match?.id ?? null;
}

/**
 * Ankara Şehir Gazetesi köşe yazarları + makalelerini ankarahabergundemi.com’a ekler.
 * Silme yok: mevcut AHG yazarları (ör. Gülay KOÇ) korunur; aynı kişi eşlenir.
 */
export async function repairAhgAuthorsFromAsg(): Promise<AhgAuthorsFromAsgRepairResult> {
  const db = getNewsDbForRead();
  const actions: string[] = [];
  const sourceSiteId = await resolveSiteIdBySlug(AHG_AUTHORS_SOURCE_SLUG);
  const targetSiteId = await resolveSiteIdBySlug(AHG_AUTHORS_TARGET_SLUG);

  const empty = (extra: string[] = []): AhgAuthorsFromAsgRepairResult => ({
    ok: false,
    sourceSiteId,
    targetSiteId,
    upserted: 0,
    reused: 0,
    makaleCopied: 0,
    makaleRematched: 0,
    newsCopied: 0,
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

  const canonical = canonicalAsgAuthors(sourceRows);
  if (canonical.length === 0) {
    return empty(["no-source-authors"]);
  }

  let upserted = 0;
  let reused = 0;
  const newIds: number[] = [];
  const sourceAuthorIdToTargetId = new Map<number, number>();
  let workingTarget = [...targetRows];

  for (const src of canonical) {
    const existingId = findTargetAuthorId(workingTarget, src.name);
    if (existingId != null) {
      reused += 1;
      sourceAuthorIdToTargetId.set(src.id, existingId);
      const existing = workingTarget.find((row) => row.id === existingId);
      const patch: Partial<typeof authorsTable.$inferInsert> = {};
      if (!existing?.avatarUrl && src.avatarUrl) patch.avatarUrl = src.avatarUrl;
      if (!existing?.bio && src.bio) patch.bio = src.bio;
      if (!existing?.title && src.title) patch.title = src.title;
      if (existing?.hmSortOrder == null && src.hmSortOrder != null) patch.hmSortOrder = src.hmSortOrder;
      if (Object.keys(patch).length > 0) {
        await dualWriteUpdate(authorsTable, patch, eq(authorsTable.id, existingId));
        actions.push(`patched-author:${existingId}←asg:${src.id}`);
      } else {
        actions.push(`reused-author:${existingId}←asg:${src.id}`);
      }
      continue;
    }

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
      workingTarget.push(created);
      actions.push(`created-author:${created.id}←asg:${src.id}`);
    }
  }

  for (const src of sourceRows) {
    if (sourceAuthorIdToTargetId.has(src.id)) continue;
    const mapped = findTargetAuthorId(workingTarget, src.name);
    if (mapped != null) sourceAuthorIdToTargetId.set(src.id, mapped);
  }

  const sourceMakaleler: MakaleRow[] = await db
    .select()
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, sourceSiteId))
    .orderBy(asc(hmMakalelerTable.createdAt), asc(hmMakalelerTable.id));

  const targetMakaleler: MakaleRow[] = await db
    .select()
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, targetSiteId));

  const usedSlugs = new Set(targetMakaleler.map((row) => String(row.slug ?? "").trim()).filter(Boolean));
  const byExternal = new Map(
    targetMakaleler
      .filter((row) => String(row.externalKey ?? "").trim())
      .map((row) => [String(row.externalKey), row] as const),
  );
  const byTitle = new Map<string, MakaleRow[]>();
  for (const row of targetMakaleler) {
    const key = foldMakaleTitle(row.title);
    if (!key) continue;
    const list = byTitle.get(key) ?? [];
    list.push(row);
    byTitle.set(key, list);
  }

  let makaleCopied = 0;
  let makaleRematched = 0;
  const copiedTitleKeys = new Set<string>();

  const attachOrInsert = async (opts: {
    authorId: number | null;
    title: string;
    slugBase: string;
    spot: string | null;
    content: string | null;
    imageUrl: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    externalKey: string;
  }): Promise<"copied" | "rematched" | "skipped"> => {
    const titleKey = foldMakaleTitle(opts.title);
    if (!titleKey) return "skipped";

    const existing =
      byExternal.get(opts.externalKey) ??
      (titleKey ? byTitle.get(titleKey)?.[0] : undefined);
    if (existing) {
      copiedTitleKeys.add(titleKey);
      if (opts.authorId != null && existing.authorId !== opts.authorId) {
        await dualWriteUpdate(
          hmMakalelerTable,
          { authorId: opts.authorId, externalKey: existing.externalKey || opts.externalKey },
          eq(hmMakalelerTable.id, existing.id),
        );
        existing.authorId = opts.authorId;
        makaleRematched += 1;
        return "rematched";
      }
      return "skipped";
    }

    const slug = allocSlug(opts.slugBase || opts.title, usedSlugs);
    const [created] = await dualWriteInsert(hmMakalelerTable, {
      siteId: targetSiteId,
      authorId: opts.authorId,
      title: opts.title,
      slug,
      spot: opts.spot,
      content: opts.content,
      imageUrl: opts.imageUrl,
      status: opts.status || "published",
      views: 0,
      externalKey: opts.externalKey,
      createdAt: opts.createdAt,
      updatedAt: opts.updatedAt,
    });
    if (!created?.id) return "skipped";
    copiedTitleKeys.add(titleKey);
    byExternal.set(opts.externalKey, created);
    const list = byTitle.get(titleKey) ?? [];
    list.push(created);
    byTitle.set(titleKey, list);
    return "copied";
  };

  const canonicalIds = new Set(canonical.map((row) => row.id));
  for (const src of sourceMakaleler) {
    const title = String(src.title ?? "").trim();
    if (!title) continue;
    if (src.status && src.status !== "published") continue;
    if (src.authorId == null || !canonicalIds.has(src.authorId)) continue;
    const targetAuthorId = sourceAuthorIdToTargetId.get(src.authorId) ?? null;
    const result = await attachOrInsert({
      authorId: targetAuthorId,
      title,
      slugBase: src.slug || title,
      spot: src.spot,
      content: src.content,
      imageUrl: src.imageUrl,
      status: src.status || "published",
      createdAt: src.createdAt,
      updatedAt: src.updatedAt,
      externalKey: ahgFromAsgMakaleExternalKey(src.id),
    });
    if (result === "copied") makaleCopied += 1;
  }

  const sourceNews = await db
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.siteId, sourceSiteId), eq(newsTable.status, "published")))
    .orderBy(asc(newsTable.createdAt), asc(newsTable.id));

  let newsCopied = 0;
  for (const src of sourceNews) {
    if (src.authorId == null || !canonicalIds.has(src.authorId)) continue;
    const title = String(src.title ?? "").trim();
    if (!title) continue;
    const titleKey = foldMakaleTitle(title);
    if (copiedTitleKeys.has(titleKey) || byTitle.has(titleKey)) {
      const targetAuthorId = sourceAuthorIdToTargetId.get(src.authorId) ?? null;
      const existing = byTitle.get(titleKey)?.[0];
      if (existing && targetAuthorId != null && existing.authorId !== targetAuthorId) {
        await dualWriteUpdate(
          hmMakalelerTable,
          { authorId: targetAuthorId },
          eq(hmMakalelerTable.id, existing.id),
        );
        existing.authorId = targetAuthorId;
        makaleRematched += 1;
      }
      continue;
    }
    const targetAuthorId = sourceAuthorIdToTargetId.get(src.authorId) ?? null;
    const result = await attachOrInsert({
      authorId: targetAuthorId,
      title,
      slugBase: src.slug || title,
      spot: src.spot,
      content: src.content,
      imageUrl: src.imageUrl,
      status: "published",
      createdAt: src.createdAt,
      updatedAt: src.updatedAt,
      externalKey: ahgFromAsgNewsExternalKey(src.id),
    });
    if (result === "copied") newsCopied += 1;
  }

  actions.push(`copied-makaleler:${makaleCopied}`);
  actions.push(`rematched-makaleler:${makaleRematched}`);
  actions.push(`copied-news-as-makale:${newsCopied}`);

  const mappedIds = [...new Set(sourceAuthorIdToTargetId.values())];
  return {
    ok: mappedIds.length === canonical.length,
    sourceSiteId,
    targetSiteId,
    upserted,
    reused,
    makaleCopied,
    makaleRematched,
    newsCopied,
    authorIds: mappedIds,
    actions,
  };
}
