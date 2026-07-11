/** Editör layout kaydından sonra açık vitrin sekmelerinin meta önbelleğini yenilemesi. */
export const HM_LAYOUT_UPDATED_EVENT = "hm-layout-updated";

export function dispatchHmLayoutUpdated(slug: string): void {
  if (typeof window === "undefined") return;
  const detail = { slug: String(slug ?? "").trim() };
  window.dispatchEvent(new CustomEvent(HM_LAYOUT_UPDATED_EVENT, { detail }));
}
