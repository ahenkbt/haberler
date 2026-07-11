import type { HmExtraPage } from "@/lib/newsSiteLayout";
import { normalizeHmExtraPageSlug } from "@/lib/hmExtraPageLookup";
import {
  HM_TELIF_DEFAULT_BODY_HTML,
  HM_TELIF_KULLANIM_SLUG,
  HM_TELIF_PAGE_TITLE,
} from "@/lib/hmTelifDefaults";

export const HM_EDITOR_STUB_PAGE_ID_PREFIX = "hm-editor-stub:";

export function isHmEditorStubExtraPageId(id: string): boolean {
  return id.startsWith(HM_EDITOR_STUB_PAGE_ID_PREFIX);
}

export function isHmEditorProtectedStandardSlug(slug: string): boolean {
  return normalizeHmExtraPageSlug(slug) === HM_TELIF_KULLANIM_SLUG;
}

export function defaultHmEditorTelifExtraPage(): HmExtraPage {
  return {
    id: `${HM_EDITOR_STUB_PAGE_ID_PREFIX}${HM_TELIF_KULLANIM_SLUG}`,
    title: HM_TELIF_PAGE_TITLE,
    slug: HM_TELIF_KULLANIM_SLUG,
    bodyHtml: HM_TELIF_DEFAULT_BODY_HTML,
    enabled: false,
    fullWidth: true,
  };
}

/** Editör listesinde telif sayfası her zaman görünür; sunucuda yoksa stub eklenir. */
export function mergeHmEditorTelifExtraPage(pages: HmExtraPage[]): HmExtraPage[] {
  const hasTelif = pages.some((p) => normalizeHmExtraPageSlug(p.slug) === HM_TELIF_KULLANIM_SLUG);
  if (hasTelif) return pages;
  return [...pages, defaultHmEditorTelifExtraPage()];
}

function newHmExtraPageId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `page-${Date.now()}`;
}

/** Stub sayfa düzenlendiğinde gerçek kayda dönüştürür. */
export function upsertHmEditorExtraPage(pages: HmExtraPage[], pageId: string, patch: Partial<HmExtraPage>): HmExtraPage[] {
  const display = mergeHmEditorTelifExtraPage(pages);
  const target = display.find((p) => p.id === pageId);
  if (!target) return pages;

  const merged: HmExtraPage = { ...target, ...patch };
  const norm = normalizeHmExtraPageSlug(merged.slug);
  const existingIdx = pages.findIndex((p) => normalizeHmExtraPageSlug(p.slug) === norm);

  if (existingIdx >= 0) {
    return pages.map((p, i) => (i === existingIdx ? { ...p, ...patch } : p));
  }

  if (isHmEditorStubExtraPageId(pageId)) {
    return [...pages, { ...merged, id: newHmExtraPageId() }];
  }

  return pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
}

/** Kaydetmeden önce yalnızca gerçek (sunucuya gidecek) sayfalar. */
export function materializeHmEditorExtraPagesForSave(pages: HmExtraPage[]): HmExtraPage[] {
  return pages.filter((p) => !isHmEditorStubExtraPageId(p.id));
}
