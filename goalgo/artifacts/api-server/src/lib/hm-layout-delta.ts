import type { HmWpTemplatePageSaved } from "./hm-wp-template-pages.js";
import { mergeWpTemplatePagesIntoLayout, normalizeHmWpTemplatePageForSave } from "./hm-wp-template-pages.js";

export type HmLayoutDeltaPageInput = {
  slug?: unknown;
  title?: unknown;
  bodyHtml?: unknown;
  html?: unknown;
  enabled?: unknown;
  fullWidth?: unknown;
  sourceName?: unknown;
};

export type HmLayoutDeltaInput = {
  displayName?: unknown;
  description?: unknown;
  hmCorporateMenuItems?: unknown;
  hmCorporateMenuPrimaryOnly?: unknown;
  pageUpdates?: unknown;
  /** false ise mevcut slug'ların gövdesi korunur (yalnızca yeni sayfa eklenir). */
  overwritePages?: unknown;
  vkdPageSyncVersion?: unknown;
  vkdMenuSyncVersion?: unknown;
};

type CorporateMenuItem = Record<string, unknown> & { id?: string };

function menuItemId(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  return String((item as CorporateMenuItem).id ?? "").trim();
}

/** Repo menüsündeki eksik maddeleri ekler; mevcut öğelerin enabled/label/href ayarları korunur. */
export function mergeMissingCorporateMenuItems(
  existingRaw: unknown,
  canonicalRaw: unknown[],
): { items: unknown[]; added: number } {
  const existing = Array.isArray(existingRaw) ? existingRaw : [];
  const canonicalIds = new Set(canonicalRaw.map(menuItemId).filter(Boolean));
  const byId = new Map<string, CorporateMenuItem>();
  for (const item of existing) {
    const id = menuItemId(item);
    if (!id || typeof item !== "object") continue;
    byId.set(id, { ...(item as CorporateMenuItem) });
  }

  let added = 0;
  const merged: unknown[] = [];
  for (const item of canonicalRaw) {
    const id = menuItemId(item);
    if (!id || typeof item !== "object") continue;
    if (byId.has(id)) {
      merged.push(byId.get(id));
    } else {
      merged.push(item);
      added += 1;
    }
  }

  for (const item of existing) {
    const id = menuItemId(item);
    if (!id || canonicalIds.has(id)) continue;
    merged.push(item);
  }

  return { items: merged, added };
}

export function parseHmLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function applyHmLayoutDelta(
  prevLayout: Record<string, unknown>,
  delta: HmLayoutDeltaInput,
): { layout: Record<string, unknown>; updatedPages: number; menuUpdated: boolean } {
  let layout: Record<string, unknown> = { ...prevLayout };
  let updatedPages = 0;
  let menuUpdated = false;

  if (Array.isArray(delta.hmCorporateMenuItems) && delta.hmCorporateMenuItems.length > 0) {
    layout.hmCorporateMenuItems = delta.hmCorporateMenuItems;
    menuUpdated = true;
  }

  if (delta.hmCorporateMenuPrimaryOnly === true || delta.hmCorporateMenuPrimaryOnly === "true") {
    layout.hmCorporateMenuPrimaryOnly = true;
    menuUpdated = true;
  }

  if (Array.isArray(delta.pageUpdates) && delta.pageUpdates.length > 0) {
    const pages = delta.pageUpdates
      .map((page, index) => normalizeHmWpTemplatePageForSave(page as HmLayoutDeltaPageInput, index))
      .filter((page): page is HmWpTemplatePageSaved => page != null);
    if (pages.length > 0) {
      const overwrite = delta.overwritePages !== false;
      const merged = mergeWpTemplatePagesIntoLayout(layout, pages, { overwrite, addToCorporateMenu: false });
      layout = merged.layout;
      updatedPages = merged.updatedCount + merged.createdCount;
    }
  }

  if (typeof delta.vkdPageSyncVersion === "number" && Number.isFinite(delta.vkdPageSyncVersion)) {
    layout.vkdPageSyncVersion = delta.vkdPageSyncVersion;
  }

  if (typeof delta.vkdMenuSyncVersion === "number" && Number.isFinite(delta.vkdMenuSyncVersion)) {
    layout.vkdMenuSyncVersion = delta.vkdMenuSyncVersion;
  }

  return { layout, updatedPages, menuUpdated };
}
