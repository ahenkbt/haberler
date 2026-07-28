import { and, eq, isNull, not, or, sql } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable, newsTable } from "@workspace/db";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";

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

function ensureTepeMansetInModuleOrder(order: unknown): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  if (Array.isArray(order)) {
    for (const item of order) {
      const id = String(item ?? "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      next.push(id);
    }
  }
  if (!next.includes("tepeManset")) {
    return ["tepeManset", ...next];
  }
  return ["tepeManset", ...next.filter((id) => id !== "tepeManset")];
}

/**
 * Tüm HM haber sitelerinde tepe manşet modülünü aç ve modül sırasına ekle.
 * `hmNewsTepeMansetEnabled: false` ile kapatılmış siteleri geri açar.
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
    const nextOrder = ensureTepeMansetInModuleOrder(prev.hmNewsHomeModuleOrder);
    const prevOrder = Array.isArray(prev.hmNewsHomeModuleOrder)
      ? (prev.hmNewsHomeModuleOrder as string[]).join(",")
      : "";
    const orderChanged = prevOrder !== nextOrder.join(",");
    const wasDisabled = prev.hmNewsTepeMansetEnabled === false;
    if (!orderChanged && !wasDisabled) continue;

    const merged = {
      ...prev,
      hmNewsTepeMansetEnabled: true,
      hmNewsHomeModuleOrder: nextOrder,
    };
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
    detail: sitesPatched > 0 ? `${sitesPatched} sitede tepe manşet yeniden açıldı` : "layout zaten uygun",
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
