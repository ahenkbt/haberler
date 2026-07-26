/**
 * HM editör manuel haberleri yalnızca eklendiği sitede kalır.
 * site_only + owner_site_id işaretler; merkez sync / diğer site pool kopyalarını temizler.
 */
import { and, eq, gt, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import {
  dualWriteDelete,
  dualWriteUpdate,
  getNewsDbForRead,
  newsTable,
} from "@workspace/db";
import { buildHmSyncDedupeKey } from "./hm-yekpare-news-sync.js";

export type RepairManualEditorNewsSiteOnlyResult = {
  scanned: number;
  markedSiteOnly: number;
  deletedCentralSync: number;
  deletedPoolCopies: number;
  sample: Array<{ id: number; title: string; siteId: number; action: string }>;
};

export async function repairManualEditorNewsSiteOnly(opts?: {
  dryRun?: boolean;
  siteId?: number;
  /** Yalnızca bu tarihten sonra oluşturulan manuel haberler (ISO veya Date). */
  since?: Date | string | null;
  sampleLimit?: number;
}): Promise<RepairManualEditorNewsSiteOnlyResult> {
  const dryRun = opts?.dryRun === true;
  const sampleLimit = Math.min(Math.max(opts?.sampleLimit ?? 40, 1), 200);
  const readDb = getNewsDbForRead();

  const conds = [
    eq(newsTable.isEditorManual, true),
    isNotNull(newsTable.siteId),
  ];
  if (opts?.siteId != null && Number.isFinite(opts.siteId) && opts.siteId > 0) {
    conds.push(eq(newsTable.siteId, opts.siteId));
  }
  if (opts?.since) {
    const since = opts.since instanceof Date ? opts.since : new Date(opts.since);
    if (Number.isFinite(since.getTime())) {
      conds.push(gt(newsTable.createdAt, since));
    }
  }

  const rows = await readDb
    .select({
      id: newsTable.id,
      title: newsTable.title,
      siteId: newsTable.siteId,
      siteOnly: newsTable.siteOnly,
      ownerSiteId: newsTable.ownerSiteId,
    })
    .from(newsTable)
    .where(and(...conds))
    .limit(20_000);

  const sample: RepairManualEditorNewsSiteOnlyResult["sample"] = [];
  let markedSiteOnly = 0;
  let deletedCentralSync = 0;
  let deletedPoolCopies = 0;

  for (const row of rows) {
    const siteId = row.siteId;
    if (siteId == null || siteId <= 0) continue;

    const needsMark = row.siteOnly !== true || row.ownerSiteId !== siteId;
    if (needsMark) {
      if (!dryRun) {
        await dualWriteUpdate(
          newsTable,
          { siteOnly: true, ownerSiteId: siteId },
          eq(newsTable.id, row.id),
        );
      }
      markedSiteOnly += 1;
      if (sample.length < sampleLimit) {
        sample.push({
          id: row.id,
          title: String(row.title ?? "").slice(0, 120),
          siteId,
          action: "mark-site-only",
        });
      }
    }

    const syncKey = buildHmSyncDedupeKey(siteId, "news", row.id);
    const central = await readDb
      .select({ id: newsTable.id })
      .from(newsTable)
      .where(and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, syncKey)))
      .limit(50);

    const centralIds = central.map((c: { id: number }) => c.id);
    if (centralIds.length > 0) {
      if (!dryRun) {
        await dualWriteDelete(
          newsTable,
          and(isNull(newsTable.siteId), inArray(newsTable.id, centralIds)),
        );
      }
      deletedCentralSync += centralIds.length;
      if (sample.length < sampleLimit) {
        sample.push({
          id: row.id,
          title: String(row.title ?? "").slice(0, 120),
          siteId,
          action: `delete-central-sync:${centralIds.length}`,
        });
      }
    }

    const poolPatterns = [
      `yekpare-hm-pool:${siteId}:${row.id}`,
      ...centralIds.map((cid) => `yekpare-hm-pool:0:${cid}`),
    ];
    const poolRows = await readDb
      .select({ id: newsTable.id })
      .from(newsTable)
      .where(
        and(
          ne(newsTable.siteId, siteId),
          inArray(newsTable.rssSourceUrl, poolPatterns),
        ),
      )
      .limit(500);

    const poolIds = poolRows.map((p: { id: number }) => p.id);
    if (poolIds.length > 0) {
      if (!dryRun) {
        await dualWriteDelete(
          newsTable,
          and(ne(newsTable.siteId, siteId), inArray(newsTable.id, poolIds)),
        );
      }
      deletedPoolCopies += poolIds.length;
      if (sample.length < sampleLimit) {
        sample.push({
          id: row.id,
          title: String(row.title ?? "").slice(0, 120),
          siteId,
          action: `delete-pool-copies:${poolIds.length}`,
        });
      }
    }
  }

  // Merkezde kalmış, kaynak satırı silinmiş eski manuel sync kopyaları
  const orphanConds = [
    isNull(newsTable.siteId),
    eq(newsTable.isEditorManual, true),
    sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-sync:%:news:%'`,
  ];
  if (opts?.siteId != null && Number.isFinite(opts.siteId) && opts.siteId > 0) {
    orphanConds.push(sql`${newsTable.rssSourceUrl} LIKE ${`yekpare-hm-sync:${opts.siteId}:news:%`}`);
  }
  if (opts?.since) {
    const since = opts.since instanceof Date ? opts.since : new Date(opts.since);
    if (Number.isFinite(since.getTime())) {
      orphanConds.push(gt(newsTable.createdAt, since));
    }
  }

  const orphanCentral = await readDb
    .select({ id: newsTable.id, title: newsTable.title, rssSourceUrl: newsTable.rssSourceUrl })
    .from(newsTable)
    .where(and(...orphanConds))
    .limit(5000);

  if (orphanCentral.length > 0) {
    // Yalnızca kaynak satır artık yoksa veya kaynak site_only ise sil
    const toDelete: number[] = [];
    for (const orphan of orphanCentral) {
      const m = /^yekpare-hm-sync:(\d+):news:(\d+)$/.exec(String(orphan.rssSourceUrl ?? "").trim());
      if (!m) continue;
      const originSiteId = Number(m[1]);
      const originId = Number(m[2]);
      const [origin] = await readDb
        .select({
          id: newsTable.id,
          siteOnly: newsTable.siteOnly,
          isEditorManual: newsTable.isEditorManual,
        })
        .from(newsTable)
        .where(and(eq(newsTable.id, originId), eq(newsTable.siteId, originSiteId)))
        .limit(1);
      if (!origin || origin.isEditorManual === true || origin.siteOnly === true) {
        toDelete.push(orphan.id);
      }
    }
    if (toDelete.length > 0) {
      if (!dryRun) {
        await dualWriteDelete(newsTable, and(isNull(newsTable.siteId), inArray(newsTable.id, toDelete)));
      }
      deletedCentralSync += toDelete.length;
    }
  }

  return {
    scanned: rows.length,
    markedSiteOnly,
    deletedCentralSync,
    deletedPoolCopies,
    sample,
  };
}

/** Merkez havuzda manuel editör sync satırı mı? */
export function isManualEditorCentralSyncRef(rssSourceUrl: string | null | undefined): boolean {
  return /^yekpare-hm-sync:\d+:news:\d+$/.test(String(rssSourceUrl ?? "").trim());
}
