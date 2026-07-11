import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  authorsTable,
  dualWriteDelete,
  dualWriteInsert,
  executeNewsDbWrite,
  getNewsDbForRead,
  hmMakalelerTable,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { CreateAuthorBody } from "@workspace/api-zod";
import { denyUnlessAdminMaintenance, denyUnlessAdminMaintenanceAny } from "../lib/admin-guard";
import { normalizePublicMediaUrl } from "../lib/normalizePublicMediaUrl.js";
import { distributeAuthorArticlesToHmSites } from "../lib/author-distribute-articles";
import {
  authorMatchKey,
  authorsRepresentSamePerson,
  filterPortalAuthorPeerIds,
  normalizeAuthorName,
} from "../lib/hm-sync-source";
import { getHmNewsSiteByIdCompat } from "../lib/hm-site-compat.js";
import {
  isHmCorporateLayout,
  parseHmLayoutJson,
  resolveHmCorporateAuthorsEnabledFromLayout,
} from "../lib/hm-editor-categories.js";

const router: IRouter = Router();
const newsReadDb = () => getNewsDbForRead();

let authorsSortSchemaPromise: Promise<void> | null = null;
function ensureAuthorsSortOrderColumn(): Promise<void> {
  if (authorsSortSchemaPromise) return authorsSortSchemaPromise;
  authorsSortSchemaPromise = executeNewsDbWrite(sql`ALTER TABLE authors ADD COLUMN IF NOT EXISTS hm_sort_order INTEGER`)
    .then(() => undefined)
    .catch((e) => {
      authorsSortSchemaPromise = null;
      throw e;
    });
  return authorsSortSchemaPromise;
}

function authorQualityScore(row: {
  avatarUrl?: string | null;
  bio?: string | null;
  title?: string | null;
  hmSiteId?: number | null;
}): number {
  return (
    (row.avatarUrl ? 2 : 0) +
    (row.bio ? 1 : 0) +
    (row.title ? 1 : 0) +
    (row.hmSiteId == null ? 1 : 0)
  );
}

type AuthorRow = typeof authorsTable.$inferSelect;

function pickCanonicalAuthors(rows: AuthorRow[]): { canonical: AuthorRow; allIds: number[] }[] {
  const groups: AuthorRow[][] = [];
  for (const row of rows) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    let placed = false;
    for (const group of groups) {
      if (authorsRepresentSamePerson(group[0]!.name, name)) {
        group.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([row]);
  }
  const out: { canonical: AuthorRow; allIds: number[] }[] = [];
  for (const group of groups) {
    const sorted = [...group].sort((a, b) => authorQualityScore(b) - authorQualityScore(a));
    const canonical = sorted[0]!;
    out.push({ canonical, allIds: sorted.map((r) => r.id) });
  }
  return out;
}

function authorPublicJson(row: typeof authorsTable.$inferSelect) {
  const { passwordHash: _p, avatarUrl, ...rest } = row;
  return {
    ...rest,
    avatarUrl: normalizePublicMediaUrl(avatarUrl) ?? avatarUrl,
  };
}

function parseHmSiteListFilter(req: Request): number | null {
  const raw = req.query.hmSiteId ?? req.query.siteId;
  if (raw === undefined || raw === null || Array.isArray(raw)) return null;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get("/authors/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz yazar id" });
    return;
  }
  const hmSiteId = parseHmSiteListFilter(req);
  const [author] = await newsReadDb().select().from(authorsTable).where(eq(authorsTable.id, id));
  if (!author) {
    res.status(404).json({ error: "Yazar bulunamadı" });
    return;
  }
  if (author.hmSiteId != null && (hmSiteId == null || author.hmSiteId !== hmSiteId)) {
    res.status(404).json({ error: "Yazar bu haber sitesine ait değil veya siteId gerekli" });
    return;
  }
  if (hmSiteId == null && author.hmSiteId == null) {
    const portalPeers = await newsReadDb()
      .select({ id: authorsTable.id, name: authorsTable.name })
      .from(authorsTable)
      .where(isNull(authorsTable.hmSiteId));
    const authorIds = filterPortalAuthorPeerIds(author.name, portalPeers, author.id);
    const canonical =
      portalPeers.length > 0
        ? (
            await newsReadDb()
              .select()
              .from(authorsTable)
              .where(inArray(authorsTable.id, authorIds))
          ).sort((a, b) => authorQualityScore(b) - authorQualityScore(a))[0] ?? author
        : author;
    const [countRow] = await newsReadDb()
      .select({ c: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(
        and(
          isNull(newsTable.siteId),
          eq(newsTable.status, "published"),
          inArray(newsTable.authorId, authorIds.length ? authorIds : [author.id]),
        ),
      );
    const [latest] = await newsReadDb()
      .select({ id: newsTable.id, title: newsTable.title, slug: newsTable.slug })
      .from(newsTable)
      .where(
        and(
          isNull(newsTable.siteId),
          eq(newsTable.status, "published"),
          inArray(newsTable.authorId, authorIds.length ? authorIds : [author.id]),
        ),
      )
      .orderBy(desc(newsTable.createdAt))
      .limit(1);
    res.json({
      ...authorPublicJson(canonical),
      articleCount: countRow?.c ?? 0,
      latestArticle: latest
        ? { id: latest.id, title: latest.title, slug: latest.slug }
        : null,
    });
    return;
  }
  res.json(authorPublicJson(author));
});

router.get("/authors", async (req, res): Promise<void> => {
  const hmSiteId = parseHmSiteListFilter(req);
  if (hmSiteId != null) {
    const site = await getHmNewsSiteByIdCompat(hmSiteId);
    const layout = parseHmLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null);
    const corporateAuthorsOff =
      isHmCorporateLayout(layout) && !resolveHmCorporateAuthorsEnabledFromLayout(layout);
    if (corporateAuthorsOff) {
      res.json([]);
      return;
    }
    await ensureAuthorsSortOrderColumn();
    const fromMak = await newsReadDb()
      .selectDistinct({ authorId: hmMakalelerTable.authorId })
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, hmSiteId),
          eq(hmMakalelerTable.status, "published"),
          isNotNull(hmMakalelerTable.authorId),
        ),
      );
    const idSet = new Set<number>();
    for (const r of fromMak) {
      if (typeof r.authorId === "number") idSet.add(r.authorId);
    }
    const owned = await newsReadDb()
      .select({ id: authorsTable.id })
      .from(authorsTable)
      .where(eq(authorsTable.hmSiteId, hmSiteId));
    for (const r of owned) idSet.add(r.id);
    if (idSet.size === 0) {
      if (isHmCorporateLayout(layout)) {
        res.json([]);
        return;
      }
      const fallbackAuthors = await newsReadDb()
        .selectDistinct({ authorId: hmMakalelerTable.authorId })
        .from(hmMakalelerTable)
        .where(
          and(
            eq(hmMakalelerTable.status, "published"),
            isNotNull(hmMakalelerTable.authorId),
            sql`${hmMakalelerTable.siteId} <> ${hmSiteId}`,
          ),
        )
        .limit(24);
      const fallbackIds = fallbackAuthors
        .map((r) => r.authorId)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);
      if (fallbackIds.length > 0) {
        // DB-first: bu yazarları hemen göster; makalelerini bu siteye kopyalama işini
        // arka planda yürüt (senkron dağıtım ilk açılışı >3s bloke ediyordu).
        void distributeAuthorArticlesToHmSites(fallbackIds, [hmSiteId]).catch((err) =>
          console.warn("[authors-hm-backfill]", err instanceof Error ? err.message : err),
        );
        for (const id of fallbackIds) idSet.add(id);
      }
    }
    if (idSet.size === 0) {
      res.json([]);
      return;
    }
    const rows = await newsReadDb()
      .select()
      .from(authorsTable)
      .where(inArray(authorsTable.id, [...idSet]))
      .orderBy(asc(sql`coalesce(${authorsTable.hmSortOrder}, 999999)`), desc(authorsTable.id));
    const ids = rows.map((r) => r.id);
    const countMap = new Map<number, number>();
    const latestMap = new Map<number, { id: number; title: string; slug: string }>();
    if (ids.length > 0) {
      const countRows = await newsReadDb()
        .select({
          authorId: hmMakalelerTable.authorId,
          c: sql<number>`count(*)::int`,
        })
        .from(hmMakalelerTable)
        .where(
          and(
            eq(hmMakalelerTable.siteId, hmSiteId),
            eq(hmMakalelerTable.status, "published"),
            inArray(hmMakalelerTable.authorId, ids),
          ),
        )
        .groupBy(hmMakalelerTable.authorId);
      for (const cr of countRows) {
        if (typeof cr.authorId === "number") countMap.set(cr.authorId, cr.c);
      }

      const latestRows = await newsReadDb()
        .select({
          id: hmMakalelerTable.id,
          authorId: hmMakalelerTable.authorId,
          title: hmMakalelerTable.title,
          slug: hmMakalelerTable.slug,
        })
        .from(hmMakalelerTable)
        .where(
          and(
            eq(hmMakalelerTable.siteId, hmSiteId),
            eq(hmMakalelerTable.status, "published"),
            inArray(hmMakalelerTable.authorId, ids),
          ),
        )
        .orderBy(desc(hmMakalelerTable.createdAt));
      for (const row of latestRows) {
        if (typeof row.authorId !== "number" || latestMap.has(row.authorId)) continue;
        latestMap.set(row.authorId, {
          id: row.id,
          title: String(row.title ?? ""),
          slug: String(row.slug ?? ""),
        });
      }

      const missingLatestIds = ids.filter((id) => !latestMap.has(id));
      if (missingLatestIds.length > 0) {
        const newsLatestRows = await newsReadDb()
          .select({
            id: newsTable.id,
            authorId: newsTable.authorId,
            title: newsTable.title,
            slug: newsTable.slug,
          })
          .from(newsTable)
          .where(
            and(
              eq(newsTable.siteId, hmSiteId),
              eq(newsTable.status, "published"),
              inArray(newsTable.authorId, missingLatestIds),
            ),
          )
          .orderBy(desc(newsTable.createdAt));
        for (const row of newsLatestRows) {
          if (typeof row.authorId !== "number" || latestMap.has(row.authorId)) continue;
          latestMap.set(row.authorId, {
            id: row.id,
            title: String(row.title ?? ""),
            slug: String(row.slug ?? ""),
          });
        }
      }
    }
    const dedupedRows = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const key = authorMatchKey(row.name) || normalizeAuthorName(row.name);
      const prev = dedupedRows.get(key);
      if (!prev) {
        dedupedRows.set(key, row);
        continue;
      }
      const prevScore = (countMap.get(prev.id) ?? 0) + (prev.avatarUrl ? 2 : 0) + (prev.bio ? 1 : 0);
      const rowScore = (countMap.get(row.id) ?? 0) + (row.avatarUrl ? 2 : 0) + (row.bio ? 1 : 0);
      if (rowScore > prevScore) dedupedRows.set(key, row);
    }
    const sortedAuthors = Array.from(dedupedRows.values()).sort((a, b) => {
      const ao = a.hmSortOrder ?? 999999;
      const bo = b.hmSortOrder ?? 999999;
      if (ao !== bo) return ao - bo;
      return b.id - a.id;
    });
    res.json(
      sortedAuthors.map((r) => ({
        ...authorPublicJson(r),
        articleCount: countMap.get(r.id) ?? 0,
        latestArticle: latestMap.get(r.id) ?? null,
      })),
    );
    return;
  }
  const rows = await newsReadDb().select().from(authorsTable).orderBy(authorsTable.id);
  const portalRows = rows.filter((r) => r.hmSiteId == null);
  const grouped = pickCanonicalAuthors(portalRows);
  const idToCanonicalId = new Map<number, number>();
  for (const g of grouped) {
    for (const id of g.allIds) idToCanonicalId.set(id, g.canonical.id);
  }
  const allIds = [...new Set(grouped.flatMap((g) => g.allIds))];
  const countMap = new Map<number, number>();
  const latestMap = new Map<number, { id: number; title: string; slug: string }>();
  if (allIds.length > 0) {
    const countRows = await newsReadDb()
      .select({
        authorId: newsTable.authorId,
        c: sql<number>`count(*)::int`,
      })
      .from(newsTable)
      .where(
        and(
          isNull(newsTable.siteId),
          eq(newsTable.status, "published"),
          inArray(newsTable.authorId, allIds),
        ),
      )
      .groupBy(newsTable.authorId);
    for (const cr of countRows) {
      if (typeof cr.authorId !== "number") continue;
      const canonicalId = idToCanonicalId.get(cr.authorId) ?? cr.authorId;
      countMap.set(canonicalId, (countMap.get(canonicalId) ?? 0) + (cr.c ?? 0));
    }
    const latestRows = await newsReadDb()
      .select({
        id: newsTable.id,
        authorId: newsTable.authorId,
        title: newsTable.title,
        slug: newsTable.slug,
        createdAt: newsTable.createdAt,
      })
      .from(newsTable)
      .where(
        and(
          isNull(newsTable.siteId),
          eq(newsTable.status, "published"),
          inArray(newsTable.authorId, allIds),
        ),
      )
      .orderBy(desc(newsTable.createdAt));
    for (const row of latestRows) {
      if (typeof row.authorId !== "number") continue;
      const canonicalId = idToCanonicalId.get(row.authorId) ?? row.authorId;
      if (latestMap.has(canonicalId)) continue;
      latestMap.set(canonicalId, {
        id: row.id,
        title: String(row.title ?? ""),
        slug: String(row.slug ?? ""),
      });
    }
  }
  const payload = grouped.map(({ canonical }) => ({
    ...authorPublicJson(canonical),
    articleCount: countMap.get(canonical.id) ?? 0,
    latestArticle: latestMap.get(canonical.id) ?? null,
  }));
  res.json(payload);
});

router.post("/authors", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const parsed = CreateAuthorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const normalized = normalizeAuthorName(parsed.data.name);
  const [existing] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(and(sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalized}`, isNull(authorsTable.hmSiteId)))
    .limit(1);
  if (existing) {
    res.status(200).json(authorPublicJson(existing));
    return;
  }
  const [row] = await dualWriteInsert(authorsTable, {
      name: parsed.data.name,
      title: parsed.data.title ?? null,
      avatarUrl: parsed.data.avatarUrl ?? null,
      bio: parsed.data.bio ?? null,
    });
  res.status(201).json(authorPublicJson(row));
});

router.delete("/authors/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }
  const [row] = await newsReadDb().select({ id: authorsTable.id }).from(authorsTable).where(eq(authorsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Yazar bulunamadı" });
    return;
  }
  await dualWriteDelete(authorsTable, eq(authorsTable.id, id));
  res.status(204).end();
});

router.post("/authors/bulk-delete", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const idsRaw = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    res.status(400).json({ error: "ids dizisi gerekli" });
    return;
  }
  const ids = idsRaw.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    res.status(400).json({ error: "Geçerli id yok" });
    return;
  }
  await dualWriteDelete(authorsTable, inArray(authorsTable.id, ids));
  res.json({ ok: true, deleted: ids.length });
});

/** Seçilen yazarları HM sitelerine veya merkez (hm_site_id null) profiline kopyalar; e-posta/şifre kopyalanmaz. */
router.post("/authors/bulk-distribute", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["hm_sites", "haberler"])) return;
  const b = req.body as {
    authorIds?: unknown;
    targetHmSiteIds?: unknown;
    copyToPortal?: unknown;
    syncArticlesOnly?: unknown;
  };
  const authorIds = Array.isArray(b.authorIds)
    ? b.authorIds.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const targetHmSiteIds = Array.isArray(b.targetHmSiteIds)
    ? b.targetHmSiteIds.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const copyToPortal = b.copyToPortal === true;
  const syncArticlesOnly = b.syncArticlesOnly === true;
  if (authorIds.length === 0) {
    res.status(400).json({ error: "authorIds gerekli" });
    return;
  }
  if (targetHmSiteIds.length === 0 && !copyToPortal && !syncArticlesOnly) {
    res.status(400).json({ error: "En az bir hedef site veya merkez (Yekpare) seçin" });
    return;
  }
  if (syncArticlesOnly) {
    if (targetHmSiteIds.length === 0) {
      res.status(400).json({ error: "syncArticlesOnly için targetHmSiteIds gerekli" });
      return;
    }
    const articleStats = await distributeAuthorArticlesToHmSites(authorIds, targetHmSiteIds);
    res.json({ ok: true, created: 0, skipped: 0, ...articleStats, syncArticlesOnly: true });
    return;
  }
  if (targetHmSiteIds.length > 0) {
    const sites = await newsReadDb()
      .select({ id: hmNewsSitesTable.id })
      .from(hmNewsSitesTable)
      .where(inArray(hmNewsSitesTable.id, targetHmSiteIds));
    if (sites.length !== targetHmSiteIds.length) {
      res.status(400).json({ error: "Geçersiz hedef site kimliği" });
      return;
    }
  }

  let created = 0;
  let skipped = 0;

  async function cloneIfMissing(
    source: typeof authorsTable.$inferSelect,
    hmSiteId: number | null,
  ): Promise<void> {
    const name = String(source.name ?? "").trim();
    if (!name) {
      skipped += 1;
      return;
    }
    const normalized = normalizeAuthorName(name);
    const exists = await newsReadDb()
      .select({ id: authorsTable.id })
      .from(authorsTable)
      .where(
        hmSiteId == null
          ? and(sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalized}`, isNull(authorsTable.hmSiteId))
          : and(sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalized}`, eq(authorsTable.hmSiteId, hmSiteId)),
      )
      .limit(1);
    if (exists[0]) {
      skipped += 1;
      return;
    }
    await dualWriteInsert(authorsTable, {
      name: source.name,
      title: source.title ?? null,
      avatarUrl: source.avatarUrl ?? null,
      bio: source.bio ?? null,
      hmSiteId,
      email: null,
      passwordHash: null,
    });
    created += 1;
  }

  for (const aid of authorIds) {
    const [src] = await newsReadDb().select().from(authorsTable).where(eq(authorsTable.id, aid));
    if (!src) {
      skipped += 1;
      continue;
    }
    if (copyToPortal) {
      await cloneIfMissing(src, null);
    }
    for (const sid of targetHmSiteIds) {
      await cloneIfMissing(src, sid);
    }
  }

  const articleStats =
    targetHmSiteIds.length > 0
      ? await distributeAuthorArticlesToHmSites(authorIds, targetHmSiteIds)
      : { articlesAdded: 0, articlesSkipped: 0 };

  res.json({ ok: true, created, skipped, ...articleStats });
});

export default router;
