/** VKD gibi sitelerde `hmExtraPages` HTML ile layout_json büyüyebilir; üst sınır import scriptleriyle uyumlu. */
export const HM_LAYOUT_JSON_MAX_CHARS = 2_000_000;

/**
 * HM anasayfa düzen türü (`layout kind`) nasıl belirlenir
 * ------------------------------------------------------
 * 1. `hm_news_sites.layout_json.hmVitrinTheme` ∈ {`corporate`, `kurumsal`} → **corporate**
 *    (`HaberAnasayfasi` `HmCorporateHome` kabuğunu kullanır; haber manşet grid’i değil.)
 * 2. Bilinen kurumsal slug (`vkd`, `vatankahramanlari`) → **corporate**
 *    Tema alanı boş/haber varsayılanına düşse bile dernek/kurumsal kabuk korunur.
 * 3. Aksi halde → **news** (esen / classic / portal3 / manset24 / … gazete anasayfası).
 *
 * Editör vitrin kaydı (`PATCH /hm/editor/site-layout`, `vitrinOnly`) yalnızca değişen
 * vitrin alanlarını yazmalıdır. Kurumsal sitelerde `hmVitrinTheme` haber temasına
 * indirgenemez — aksi halde canlı site varsayılan haber düzenine düşer.
 */
export type HmLayoutKind = "corporate" | "news";

export const HM_KNOWN_CORPORATE_SITE_SLUGS = ["vkd", "vatankahramanlari"] as const;

export function isCorporateHmVitrinTheme(theme: unknown): boolean {
  const t = String(theme ?? "")
    .trim()
    .toLowerCase();
  return t === "corporate" || t === "kurumsal";
}

export function isKnownCorporateHmSiteSlug(siteSlug: unknown): boolean {
  const slug = String(siteSlug ?? "")
    .trim()
    .toLowerCase();
  if (!slug) return false;
  if ((HM_KNOWN_CORPORATE_SITE_SLUGS as readonly string[]).includes(slug)) return true;
  return slug.includes("vatankahramanlari");
}

export function resolveHmLayoutKind(
  layout: Record<string, unknown> | null | undefined,
  siteSlug?: string | null,
): HmLayoutKind {
  if (isCorporateHmVitrinTheme(layout?.hmVitrinTheme)) return "corporate";
  if (isKnownCorporateHmSiteSlug(siteSlug)) return "corporate";
  return "news";
}

/** Kurumsal düzeni haber anasayfa temasına düşürmeyi engeller. */
export function preserveCorporateHmLayoutKind(
  prev: Record<string, unknown>,
  merged: Record<string, unknown>,
  siteSlug?: string | null,
): Record<string, unknown> {
  const prevKind = resolveHmLayoutKind(prev, siteSlug);
  if (prevKind !== "corporate") return merged;
  if (isCorporateHmVitrinTheme(merged.hmVitrinTheme)) return merged;
  const kept =
    isCorporateHmVitrinTheme(prev.hmVitrinTheme) && String(prev.hmVitrinTheme).trim()
      ? String(prev.hmVitrinTheme).trim().toLowerCase() === "kurumsal"
        ? "kurumsal"
        : "corporate"
      : "corporate";
  return { ...merged, hmVitrinTheme: kept };
}

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
  opts?: { vitrinOnly?: boolean; siteSlug?: string | null },
): Record<string, unknown> {
  const inc = opts?.vitrinOnly ? stripNonVitrinLayoutKeys(incoming) : incoming;
  let merged: Record<string, unknown> = { ...prev, ...inc };
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
  merged = preserveCorporateHmLayoutKind(prev, merged, opts?.siteSlug);
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
