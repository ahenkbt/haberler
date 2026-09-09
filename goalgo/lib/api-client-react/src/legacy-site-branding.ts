import type { SiteSettings } from "./generated/api.schemas";

/**
 * Eski dağıtımlarda DB’de Goalgo / Yekpare / Türk Ekosistemi kalmış olabilir.
 * Yönetimden kayıt edince gerçek değerler gelir — burada görüntü düzeltmesi.
 */
export function looksLikeSiteSettingsPayload(data: unknown): data is SiteSettings {
  if (!data || typeof data !== "object") return false;
  const rec = data as Record<string, unknown>;
  return typeof rec.siteName === "string" && typeof rec.tagline === "string";
}

export function applyLegacyGoalgoAsYekpareDisplay(s: SiteSettings): SiteSettings {
  const legacy = /goalgo|yekpare|türk\s*ekosistemi|turk\s*ekosistemi|turknet|türknet|turk\.eco/i;
  const ahenk = "Ahenk Bilgi Teknolojileri";
  let { siteName, tagline, footerText, copyrightText, logoText1, logoText2 } = s;
  if (legacy.test(String(siteName ?? "")) || !String(siteName ?? "").trim()) siteName = ahenk;
  if (legacy.test(String(tagline ?? "")) || /keşfet.*sipariş|şehir.*yekpare/i.test(String(tagline ?? ""))) {
    tagline = "Web yazılımı, haber sitesi ve ajans — Ahenk Bilgi Teknolojileri.";
  }
  const foot = footerText ?? "";
  const copy = copyrightText ?? "";
  if (legacy.test(foot) || !foot.trim() || /pazaryeri|firma rehberi|newsmap/i.test(foot)) {
    footerText =
      "Ahenk Bilgi Teknolojileri (ahenk.net.tr); web yazılımı, haber sitesi yazılımı, ajans ve çağrı merkezi çözümleri.";
  }
  if (legacy.test(copy) || !copy.trim()) {
    copyrightText = "© Ahenk Bilgi Teknolojileri. Tüm hakları saklıdır.";
  }
  const g1 = String(logoText1 ?? "").trim().toLowerCase();
  const g2 = String(logoText2 ?? "").trim().toLowerCase();
  if (
    !g1 ||
    (g1 === "yek" && g2 === "pare") ||
    (g1 === "yekpare" && g2 === "") ||
    (g1 === "goal" && g2 === "go") ||
    (g1 === "türk" || g1 === "turk")
  ) {
    logoText1 = "Ahenk";
    logoText2 = "BT";
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
