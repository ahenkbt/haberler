import type { SiteSettings } from "./generated/api.schemas";

/**
 * Eski dağıtımlarda DB’de "Goalgo" / Goal+go kalmış olabilir; tüm UI bu cevabı kullanır.
 * Yönetimden kayıt edince gerçek değerler gelir — burada sadece görüntü düzeltmesi.
 * Orval ile `api.ts` yeniden üretilirse `getSiteSettings` / `updateSiteSettings` çıktısına bu fonksiyonu tekrar sarın.
 */
export function applyLegacyGoalgoAsYekpareDisplay(s: SiteSettings): SiteSettings {
  const repl = (t: string) => t.replace(/goalgo/gi, "Yekpare");
  let { siteName, tagline, footerText, copyrightText, logoText1, logoText2 } = s;
  const foot = footerText ?? "";
  const copy = copyrightText ?? "";
  if (/goalgo/i.test(siteName)) siteName = repl(siteName);
  if (/goalgo/i.test(tagline)) tagline = repl(tagline);
  if (/goalgo/i.test(foot)) footerText = repl(foot);
  if (/goalgo/i.test(copy)) copyrightText = repl(copy);
  const g1 = logoText1.trim().toLowerCase();
  const g2 = logoText2.trim().toLowerCase();
  if ((g1 === "goal" && g2 === "go") || (g1 === "goalgo" && g2 === "")) {
    logoText1 = "Yek";
    logoText2 = "pare";
  }
  return {
    ...s,
    siteName,
    tagline,
    footerText,
    copyrightText,
    logoText1,
    logoText2,
  };
}
