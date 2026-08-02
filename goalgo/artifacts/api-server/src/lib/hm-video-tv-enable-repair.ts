import { eq, inArray } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { parseHmLayoutJson } from "./hm-editor-categories.js";
import { sanitizeHmPublicLayoutRecord } from "./hm-layout-sanitize.js";

export const HM_VIDEO_TV_ENSURE_SLUGS = ["su", "suhaber", "ankarahabergundemi", "kirsehirhaber", "kh", "kirsehir"] as const;

export type HmVideoTvEnsureResult = {
  updated: number;
  siteIds: number[];
  slugs: string[];
};

/** Seçili editör sitelerinde Video TV vitrin bayrağını açık tutar. */
export async function ensureHmVideoTvEnabledForEditorSites(): Promise<HmVideoTvEnsureResult> {
  const readDb = getNewsDbForRead();
  const slugList = [...HM_VIDEO_TV_ENSURE_SLUGS];
  const rows = await readDb
    .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(inArray(hmNewsSitesTable.slug, slugList));

  const siteIds: number[] = [];
  const slugs: string[] = [];
  let updated = 0;

  for (const row of rows) {
    const slug = String(row.slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const layout = parseHmLayoutJson(row.layoutJson != null ? String(row.layoutJson) : null);
    if (layout.hmNewsVideoTvEnabled !== false) continue;
    const next = sanitizeHmPublicLayoutRecord(
      {
        ...layout,
        hmNewsVideoTvEnabled: true,
      },
      slug,
    );
    await dualWriteUpdate(
      hmNewsSitesTable,
      { layoutJson: JSON.stringify(next) },
      eq(hmNewsSitesTable.id, row.id),
    );
    updated += 1;
    siteIds.push(row.id);
    slugs.push(slug);
  }

  return { updated, siteIds, slugs };
}
