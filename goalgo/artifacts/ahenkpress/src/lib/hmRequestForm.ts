import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

export type HmRequestIntentId = "need-help" | "want-help";

export type HmRequestCategory = {
  id: string;
  label: string;
  enabled?: boolean;
  order?: number;
};

export const HM_CORPORATE_REQUEST_INTENT_OPTIONS: ReadonlyArray<{ id: HmRequestIntentId; label: string }> = [
  { id: "need-help", label: "Yardım Talep Ediyorum" },
  { id: "want-help", label: "Yardım Etmek İstiyorum" },
];

export const HM_NEWS_REQUEST_INTENT_OPTIONS: ReadonlyArray<{ id: HmRequestIntentId; label: string }> = [
  { id: "need-help", label: "Talep Ediyorum" },
  { id: "want-help", label: "Teklif ediyorum" },
];

/** @deprecated Kurumsal varsayılanı; tema için `resolveHmRequestIntentOptions` kullanın. */
export const HM_REQUEST_INTENT_OPTIONS = HM_CORPORATE_REQUEST_INTENT_OPTIONS;

export const DEFAULT_CORPORATE_REQUEST_CATEGORIES: HmRequestCategory[] = [
  { id: "ogrenci-bursu", label: "Öğrenci Bursu", enabled: true },
  { id: "nakdi-yardim", label: "Nakdi Yardım", enabled: true },
  { id: "hukuki-destek", label: "Hukuki Destek", enabled: true },
  { id: "yurtdisi-destek", label: "Yurtdışı Destek", enabled: true },
  { id: "gida-yardimi", label: "Gıda Yardımı", enabled: true },
  { id: "kira-yardimi", label: "Kira Yardımı", enabled: true },
];

export const DEFAULT_NEWS_REQUEST_CATEGORIES: HmRequestCategory[] = [
  { id: "abonelik", label: "Abonelik", enabled: true },
  { id: "reklam", label: "Reklam", enabled: true },
  { id: "sponsorluk", label: "Sponsorluk", enabled: true },
];

export const DEFAULT_NEWS_OFFER_CATEGORIES: HmRequestCategory[] = [
  { id: "sosyal-medya", label: "Sosyal Medya", enabled: true },
  { id: "basin-daveti", label: "Basın Daveti", enabled: true },
  { id: "isbirligi-protokolu", label: "İşbirliği Protokolü", enabled: true },
];

export function hmRequestFormPath(): string {
  return "/talep-formu";
}

export function isHmCorporateTheme(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmVitrinTheme === "corporate";
}

export function normalizeHmRequestCategories(raw: unknown): HmRequestCategory[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HmRequestCategory[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = String((row as HmRequestCategory).id ?? "").trim();
    const label = String((row as HmRequestCategory).label ?? "").trim();
    if (!id || !label) continue;
    const orderRaw = (row as HmRequestCategory).order;
    out.push({
      id,
      label,
      enabled: (row as HmRequestCategory).enabled !== false,
      order: typeof orderRaw === "number" && Number.isFinite(orderRaw) ? orderRaw : undefined,
    });
  }
  return out.length > 0 ? out : null;
}

export function cleanHmRequestCategories(items: HmRequestCategory[]): HmRequestCategory[] | null {
  const cleaned = items
    .map((item, index) => ({
      id: String(item.id ?? "").trim(),
      label: String(item.label ?? "").trim(),
      enabled: item.enabled !== false,
      order: index,
    }))
    .filter((item) => item.id.length > 0 && item.label.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

export function resolveHmCorporateRequestCategories(p: NewsSiteLayoutPrefs | null | undefined): HmRequestCategory[] {
  const stored = normalizeHmRequestCategories(p?.hmCorporateRequestCategories);
  const list = stored ?? DEFAULT_CORPORATE_REQUEST_CATEGORIES;
  return list.filter((item) => item.enabled !== false);
}

export function resolveHmNewsRequestCategories(p: NewsSiteLayoutPrefs | null | undefined): HmRequestCategory[] {
  const stored = normalizeHmRequestCategories(p?.hmNewsRequestCategories);
  const list = stored ?? DEFAULT_NEWS_REQUEST_CATEGORIES;
  return list.filter((item) => item.enabled !== false);
}

export function resolveHmNewsOfferCategories(p: NewsSiteLayoutPrefs | null | undefined): HmRequestCategory[] {
  const stored = normalizeHmRequestCategories(p?.hmNewsOfferCategories);
  const list = stored ?? DEFAULT_NEWS_OFFER_CATEGORIES;
  return list.filter((item) => item.enabled !== false);
}

export function resolveHmRequestIntentOptions(
  p: NewsSiteLayoutPrefs | null | undefined,
): ReadonlyArray<{ id: HmRequestIntentId; label: string }> {
  return isHmCorporateTheme(p) ? HM_CORPORATE_REQUEST_INTENT_OPTIONS : HM_NEWS_REQUEST_INTENT_OPTIONS;
}

export function resolveHmRequestCategoriesForIntent(
  p: NewsSiteLayoutPrefs | null | undefined,
  intent: HmRequestIntentId,
): HmRequestCategory[] {
  if (isHmCorporateTheme(p)) return resolveHmCorporateRequestCategories(p);
  return intent === "want-help" ? resolveHmNewsOfferCategories(p) : resolveHmNewsRequestCategories(p);
}

export function resolveHmRequestCategoriesForSite(p: NewsSiteLayoutPrefs | null | undefined): HmRequestCategory[] {
  return isHmCorporateTheme(p) ? resolveHmCorporateRequestCategories(p) : resolveHmNewsRequestCategories(p);
}

export function resolveHmCorporateRequestFormEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmCorporateRequestFormEnabled !== false;
}

export function resolveHmNewsRequestFormEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  return p?.hmNewsRequestFormEnabled === true;
}

export function resolveHmRequestFormEnabled(p: NewsSiteLayoutPrefs | null | undefined): boolean {
  if (!p) return false;
  return isHmCorporateTheme(p)
    ? resolveHmCorporateRequestFormEnabled(p)
    : resolveHmNewsRequestFormEnabled(p);
}

export function resolveHmRequestIntentLabel(
  intentId: string,
  p?: NewsSiteLayoutPrefs | null | undefined,
): string {
  const found = resolveHmRequestIntentOptions(p).find((opt) => opt.id === intentId);
  return found?.label ?? intentId;
}

export function buildHmRequestFormSubject(
  intentId: string,
  categoryLabel: string,
  p?: NewsSiteLayoutPrefs | null | undefined,
): string {
  const intent = resolveHmRequestIntentLabel(intentId, p);
  const cat = String(categoryLabel ?? "").trim();
  return cat ? `[Talep] ${intent} — ${cat}`.slice(0, 200) : `[Talep] ${intent}`.slice(0, 200);
}
