import { and, eq, isNull, not, or, sql } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable, newsTable } from "@workspace/db";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";
import { nextTepeMansetLayoutPatch } from "./hm-tepe-manset-layout.js";

export type HmTepeMansetRepairResult = {
  ok: boolean;
  sitesPatched: number;
  featuredFlagsPatched: number;
  detail?: string;
};

function parseLayoutRecord(raw: unknown): Record<string, unknown> {
  try {
    if (raw == null || !String(raw).trim()) return {};
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (j && typeof j === "object" && !Array.isArray(j)) return { ...j };
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Tüm HM haber sitelerinde Tepe manşeti bir kez kapatır (opt-in).
 * Editör panelden açtıysa `hmTepeMansetOptInRev` sayesinde tekrar kapanmaz.
 */
export async function repairHmTepeMansetLayoutForAllSites(): Promise<HmTepeMansetRepairResult> {
  const sites = await listHmNewsSitesCompat();
  let sitesPatched = 0;

  for (const site of sites) {
    const row = await getNewsDbForRead()
      .select({ layoutJson: hmNewsSitesTable.layoutJson })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.id, site.id))
      .limit(1);
    const prev = parseLayoutRecord(row[0]?.layoutJson);
    const merged = nextTepeMansetLayoutPatch(prev);
    if (!merged) continue;

    const raw = JSON.stringify(merged);
    await dualWriteUpdate(
      hmNewsSitesTable,
      { layoutJson: raw, updatedAt: new Date() },
      eq(hmNewsSitesTable.id, site.id),
    );
    sitesPatched += 1;
  }

  return {
    ok: true,
    sitesPatched,
    featuredFlagsPatched: 0,
    detail: sitesPatched > 0 ? `${sitesPatched} sitede Tepe manşet varsayılan kapalıya alındı` : "layout zaten uygun",
  };
}

/**
 * `isFeatured=true` haberlerde editör bayrağı eksikse tamamla — tepe manşet API filtresi için.
 */
export async function repairHmFeaturedEditorManualFlags(): Promise<number> {
  const db = getNewsDbForRead();
  const rows = await db
    .select({ id: newsTable.id })
    .from(newsTable)
    .where(
      and(
        eq(newsTable.isFeatured, true),
        eq(newsTable.status, "published"),
        eq(newsTable.isEditorManual, false),
        or(
          isNull(newsTable.rssSourceUrl),
          sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-sync:%'`,
        )!,
        not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-pool:%'`),
      ),
    )
    .limit(5000);

  let n = 0;
  for (const row of rows) {
    await dualWriteUpdate(
      newsTable,
      { isEditorManual: true, updatedAt: new Date() },
      eq(newsTable.id, row.id),
    );
    n += 1;
  }
  return n;
}

export async function repairHmTepeMansetSystem(): Promise<HmTepeMansetRepairResult> {
  const featuredFlagsPatched = await repairHmFeaturedEditorManualFlags();
  const layout = await repairHmTepeMansetLayoutForAllSites();
  return {
    ok: true,
    sitesPatched: layout.sitesPatched,
    featuredFlagsPatched,
    detail: [
      layout.detail,
      featuredFlagsPatched > 0 ? `${featuredFlagsPatched} manşet haberinde editör bayrağı düzeltildi` : null,
    ]
      .filter(Boolean)
      .join("; "),
  };
}
