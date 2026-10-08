/**
 * Panel layout saves are stamped with `_hmUserSavedAt` so the hm_news_sites layout guard trigger
 * (goalgo/artifacts/api-server/src/lib/hm-layout-guard.ts) lets them through. Automatic writes without
 * a new stamp are fill-only there and cannot overwrite logos, menus or other saved layout values.
 */
export const HM_LAYOUT_USER_SAVED_AT_KEY = "_hmUserSavedAt";

export function markLayoutRecordUserSave(layout, now = new Date()) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return layout;
  return { ...layout, [HM_LAYOUT_USER_SAVED_AT_KEY]: now.toISOString() };
}
