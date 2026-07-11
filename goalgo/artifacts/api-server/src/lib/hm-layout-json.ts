/** VKD gibi sitelerde `hmExtraPages` HTML ile layout_json büyüyebilir; üst sınır import scriptleriyle uyumlu. */
export const HM_LAYOUT_JSON_MAX_CHARS = 2_000_000;

export function assertHmLayoutJsonSize(
  raw: string,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): boolean {
  if (raw.length <= HM_LAYOUT_JSON_MAX_CHARS) return true;
  res.status(400).json({
    error: "layout çok büyük",
    maxChars: HM_LAYOUT_JSON_MAX_CHARS,
    sizeChars: raw.length,
    hint: "Çok sayıda özel sayfa HTML'i varsa sayfaları kısaltın veya destek ile iletişime geçin.",
  });
  return false;
}

/** Vitrin kaydında DB'deki ağır alanların üzerine yazılmaması için. */
export const HM_LAYOUT_HEAVY_KEYS = ["hmExtraPages", "hmCorporatePageHtml"] as const;

/** Vitrin kaydında başka editör sekmelerinin (menü vb.) ezilmemesi için. */
export const HM_LAYOUT_MENU_KEYS = [
  "hmCorporateMenuItems",
  "hmCorporateMenuPrimaryOnly",
  "hmNewsFooterMenuItems",
  "hmNewsSidebarMenuItems",
  "hmNewsStripMenuItems",
] as const;

export function stripHeavyLayoutKeys(inc: Record<string, unknown>): Record<string, unknown> {
  const out = { ...inc };
  for (const k of HM_LAYOUT_HEAVY_KEYS) delete out[k];
  return out;
}

export function stripMenuLayoutKeys(inc: Record<string, unknown>): Record<string, unknown> {
  const out = { ...inc };
  for (const k of HM_LAYOUT_MENU_KEYS) delete out[k];
  return out;
}

/** Vitrin PATCH gövdesinden menü + ağır alanları çıkarır. */
export function stripNonVitrinLayoutKeys(inc: Record<string, unknown>): Record<string, unknown> {
  let out = stripHeavyLayoutKeys(inc);
  out = stripMenuLayoutKeys(out);
  delete out.vkdEditorTouchedAt;
  delete out.vkdPageSyncVersion;
  delete out.vkdMenuSyncVersion;
  return out;
}

export function parseHmLayoutRecord(raw: string | null | undefined): Record<string, unknown> {
  try {
    if (raw == null || !String(raw).trim()) return {};
    const j = JSON.parse(String(raw)) as unknown;
    if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

export function mergeHmLayoutPatch(
  prev: Record<string, unknown>,
  incoming: Record<string, unknown>,
  opts?: { vitrinOnly?: boolean },
): Record<string, unknown> {
  const inc = opts?.vitrinOnly ? stripNonVitrinLayoutKeys(incoming) : incoming;
  const merged: Record<string, unknown> = { ...prev, ...inc };
  if (
    Array.isArray(inc.hmCorporateMenuItems) &&
    (inc.hmCorporateMenuItems as unknown[]).length > 0 &&
    inc.hmCorporateMenuPrimaryOnly === undefined
  ) {
    merged.hmCorporateMenuPrimaryOnly = false;
  }
  if (
    prev.hmCategoryColors &&
    inc.hmCategoryColors &&
    typeof inc.hmCategoryColors === "object" &&
    !Array.isArray(inc.hmCategoryColors)
  ) {
    merged.hmCategoryColors = {
      ...(prev.hmCategoryColors as Record<string, unknown>),
      ...(inc.hmCategoryColors as Record<string, unknown>),
    };
  }
  return merged;
}

export function stringifyHmLayoutMerged(merged: Record<string, unknown>): string {
  return JSON.stringify(merged);
}

/** PWA / sekme ikonu: favicon öncelikli, yoksa logo. */
export function hmLayoutTabIconUrl(layout: Record<string, unknown> | null | undefined): string | null {
  if (!layout) return null;
  const fav = typeof layout.faviconUrl === "string" ? layout.faviconUrl.trim() : "";
  if (fav) return fav;
  const logoUrl = typeof layout.logoUrl === "string" ? layout.logoUrl.trim() : "";
  if (logoUrl) return logoUrl;
  const legacy = typeof layout.logo === "string" ? layout.logo.trim() : "";
  return legacy || null;
}
