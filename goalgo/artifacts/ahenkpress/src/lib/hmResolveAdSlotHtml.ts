import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

export type GlobalAdSlotRow = { slotKey: string; enabled: boolean; html?: string | null };

/** HM slot → boşsa portal Reklam Alanları (`useListAds`). */
export function resolveHmOrGlobalSlotHtml(
  siteId: number | null,
  layoutPrefs: NewsSiteLayoutPrefs,
  slotKey: string,
  adSlots: GlobalAdSlotRow[],
): string | null {
  if (siteId != null) {
    const hm = layoutPrefs.hmAdSlots?.find((s) => s.slotKey === slotKey && s.enabled && (s.html ?? "").trim());
    if (hm?.html?.trim()) return hm.html.trim();
    if (slotKey === "manset_alti" && layoutPrefs.hmMansetBelowAdHtml?.trim()) {
      return layoutPrefs.hmMansetBelowAdHtml.trim();
    }
    if (slotKey === "sidebar_top" && layoutPrefs.hmSidebarAdHtml?.trim()) {
      return layoutPrefs.hmSidebarAdHtml.trim();
    }
  }
  const g = adSlots.find((a) => a.slotKey === slotKey && a.enabled && (a.html ?? "").trim().length);
  return g?.html?.trim() ?? null;
}
