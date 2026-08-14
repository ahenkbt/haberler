import { eq } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";
import { nextRssKarmaDefaultLayoutPatch } from "./hm-rss-source-packs.js";

export type HmRssKarmaDefaultRepairResult = {
  ok: boolean;
  sitesPatched: number;
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
 * Haber sitelerinde RSS karma (tüm paketler) varsayılan açık.
 * Kurumsal sitelerden RSS haber satırları ve paketleri silinir.
 */
export async function repairHmRssKarmaDefaultsForAllSites(): Promise<HmRssKarmaDefaultRepairResult> {
  const sites = await listHmNewsSitesCompat();
  let sitesPatched = 0;

  for (const site of sites) {
    const row = await getNewsDbForRead()
      .select({ layoutJson: hmNewsSitesTable.layoutJson })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.id, site.id))
      .limit(1);
    const prev = parseLayoutRecord(row[0]?.layoutJson);
    const merged = nextRssKarmaDefaultLayoutPatch(prev);
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
    detail:
      sitesPatched > 0
        ? `${sitesPatched} sitede RSS karma varsayılanı / kurumsal RSS kapatması uygulandı`
        : "layout zaten uygun",
  };
}
