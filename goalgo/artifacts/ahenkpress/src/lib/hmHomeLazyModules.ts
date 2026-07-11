import type { HmNewsHomeModuleId } from "@/lib/newsSiteLayout";

export const HM_HOME_ABOVE_FOLD_MODULES = new Set<HmNewsHomeModuleId>([
  "breakingBand",
  "yekpareSearchBox",
  "googleNewsBand",
  "tepeManset",
  "hero",
]);

export function isHmHomeAboveFoldModule(moduleId: HmNewsHomeModuleId): boolean {
  return HM_HOME_ABOVE_FOLD_MODULES.has(moduleId);
}
