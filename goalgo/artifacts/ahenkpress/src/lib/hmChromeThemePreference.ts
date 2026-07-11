/** Eski ziyaretçi tema anahtarları — artık kullanılmıyor; temizlik için tutulur. */
export const HM_VISITOR_THEME_KEY = "hm-visitor-theme";

/** @deprecated Eski anahtar — okuma sırasında taşınır. */
export const HM_CHROME_THEME_PREFERENCE_KEY = "hm-chrome-theme-preference";

/** Ziyaretçi localStorage tercihini ve `data-hm-visitor-theme` özniteliklerini kaldırır. */
export function purgeHmVisitorThemePreference(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HM_VISITOR_THEME_KEY);
    localStorage.removeItem(HM_CHROME_THEME_PREFERENCE_KEY);
  } catch {
    /* quota / private mode */
  }
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  html.removeAttribute("data-hm-visitor-theme");
  if (body) body.removeAttribute("data-hm-visitor-theme");
  html.style.removeProperty("color-scheme");
  html.style.removeProperty("background-color");
  html.style.removeProperty("color");
  if (body) {
    body.style.removeProperty("background-color");
    body.style.removeProperty("color");
  }
}
