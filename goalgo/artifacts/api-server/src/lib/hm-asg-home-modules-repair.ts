import { eq } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { parseHmLayoutJson } from "./hm-editor-categories.js";

export const ASG_HOME_MODULES_REV = "asg-home-ankara-spor-v1" as const;

const ANKARA_RSS = {
  id: "ankara",
  label: "Ankara",
  categoryKey: "ankara",
  url: "https://baskentpostasi.com/rss/category/ankara",
} as const;

const SPOR_BOX_FEEDS = [
  { id: "spor", label: "Spor", categoryKey: "spor", url: "https://www.ntv.com.tr/sporskor.rss" },
  { id: "futbol", label: "Futbol", categoryKey: "futbol", url: "https://www.spordepor.com/rss/futbol" },
  { id: "basketbol", label: "Basketbol", categoryKey: "basketbol", url: "https://www.spordepor.com/rss/basketbol" },
  { id: "tenis", label: "Tenis", categoryKey: "tenis", url: "https://www.spordepor.com/rss/tenis" },
  { id: "voleybol", label: "Voleybol", categoryKey: "voleybol", url: "https://www.spordepor.com/rss/voleybol" },
] as const;

export type AsgHomeModulesRepairResult = {
  ok: boolean;
  siteId: number | null;
  action: "patched" | "already" | "missing-site";
  layoutKeys: string[];
};

/**
 * ASG: Gündemde Öne Çıkanlar + Spor modülünü aç; Ankara/spor RSS satırlarını ekle.
 */
export async function repairAsgHomeModules(): Promise<AsgHomeModulesRepairResult> {
  const db = getNewsDbForRead();
  const [site] = await db
    .select()
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, "asg"))
    .limit(1);
  if (!site) {
    return { ok: false, siteId: null, action: "missing-site", layoutKeys: [] };
  }

  const layout = parseHmLayoutJson(site.layoutJson != null ? String(site.layoutJson) : null) as Record<
    string,
    unknown
  >;
  if (layout.hmAsgHomeModulesRev === ASG_HOME_MODULES_REV) {
    return { ok: true, siteId: site.id, action: "already", layoutKeys: [] };
  }

  layout.hmNewsEsenLeadPackEnabled = true;
  layout.hmNewsSporModuleEnabled = true;
  layout.hmAsgHomeModulesRev = ASG_HOME_MODULES_REV;

  const siteRss = Array.isArray(layout.hmNewsSiteRssFeedRows)
    ? [...(layout.hmNewsSiteRssFeedRows as Array<Record<string, unknown>>)]
    : [];
  const hasAnkara = siteRss.some((r) => {
    const key = String(r?.categoryKey ?? r?.id ?? "")
      .trim()
      .toLowerCase();
    return key === "ankara";
  });
  if (!hasAnkara) siteRss.push({ ...ANKARA_RSS });
  layout.hmNewsSiteRssFeedRows = siteRss;

  const boxRss = Array.isArray(layout.hmNewsBreakingRssFeedRows)
    ? [...(layout.hmNewsBreakingRssFeedRows as Array<Record<string, unknown>>)]
    : [];
  for (const feed of SPOR_BOX_FEEDS) {
    const exists = boxRss.some((r) => String(r?.id ?? "").trim().toLowerCase() === feed.id);
    if (!exists) boxRss.push({ ...feed });
  }
  layout.hmNewsBreakingRssFeedRows = boxRss;

  await dualWriteUpdate(
    hmNewsSitesTable,
    { layoutJson: JSON.stringify(layout), updatedAt: new Date() },
    eq(hmNewsSitesTable.id, site.id),
  );

  return {
    ok: true,
    siteId: site.id,
    action: "patched",
    layoutKeys: ["hmNewsEsenLeadPackEnabled", "hmNewsSporModuleEnabled", "hmNewsSiteRssFeedRows", "hmNewsBreakingRssFeedRows"],
  };
}
