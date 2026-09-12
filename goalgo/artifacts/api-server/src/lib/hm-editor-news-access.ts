import { and, eq, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { getNewsDbForRead, newsTable } from "@workspace/db";
import { excludeYekparePoolNewsSql } from "./hm-corporate-news-policy.js";
import { buildHmSyncDedupeKey } from "./hm-yekpare-news-sync.js";
import { hmPublishGroupEditorNewsScopeSql, resolveHmPublishGroupSiteIds } from "./hm-publish-groups.js";

type NewsRow = typeof newsTable.$inferSelect;

/** Editör CRUD: site-yerel satırlar + publish-group editör/site_only satırlar. */
export function hmEditorSiteNewsWhere(
  siteId: number,
  extra?: SQL,
  opts?: { excludePoolCopies?: boolean; peerSiteIds?: readonly number[] | null },
): SQL {
  const parts: SQL[] = [and(isNotNull(newsTable.siteId), hmPublishGroupEditorNewsScopeSql(siteId, opts?.peerSiteIds))!];
  if (opts?.excludePoolCopies) parts.push(excludeYekparePoolNewsSql());
  if (extra) parts.push(extra);
  return and(...parts)!;
}

/**
 * Editör haber CRUD için site-yerel satır çözümü.
 * İstek id'si merkez havuz kopyası (pool/sync) ise yerel site kopyasına map eder.
 */
export async function findHmEditorEditableNewsRow(
  siteId: number,
  requestedId: number,
): Promise<NewsRow | null> {
  if (!Number.isFinite(siteId) || siteId <= 0 || !Number.isFinite(requestedId) || requestedId <= 0) {
    return null;
  }

  const readDb = getNewsDbForRead();

  const [direct] = await readDb
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.id, requestedId), eq(newsTable.siteId, siteId)))
    .limit(1);
  if (direct) return direct;

  const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId);
  const peers = groupSiteIds.filter((id) => id !== siteId);
  if (peers.length > 0) {
    const [peer] = await readDb
      .select()
      .from(newsTable)
      .where(
        and(
          eq(newsTable.id, requestedId),
          inArray(newsTable.siteId, peers),
          or(eq(newsTable.isEditorManual, true), eq(newsTable.siteOnly, true))!,
        ),
      )
      .limit(1);
    if (peer) return peer;
  }

  const poolPattern = `yekpare-hm-pool:%:${requestedId}`;
  const [poolCopy] = await readDb
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.siteId, siteId), sql`${newsTable.rssSourceUrl} LIKE ${poolPattern}`))
    .limit(1);
  if (poolCopy) return poolCopy;

  const syncKey = buildHmSyncDedupeKey(siteId, "news", requestedId);
  const [syncCopy] = await readDb
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.siteId, siteId), eq(newsTable.rssSourceUrl, syncKey)))
    .limit(1);
  if (syncCopy) return syncCopy;

  return null;
}
