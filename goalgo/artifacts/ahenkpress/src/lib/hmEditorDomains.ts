/**
 * Bilinen editör haber sitesi alanları — meta 404 olsa bile Yekpare portal anasayfasına düşülmez.
 * Worker `cloudflare/hm-html-boot.js` alan→slug tablosu ile senkron tutulmalı.
 *
 * turkatahaber.com ajans portalıdır (HM public app / kök vitrin boot değil).
 * Köşe yazarı paneli `/koseyazari/giris` yine HM site slug'ı `turkatahaber` ister;
 * meta/by-domain bu hostta 500 verdiği için tablo yedeği şarttır.
 * Worker HM_DOMAIN_SLUG_FALLBACKS'e eklenmez — anasayfa ajans SEO kabuğu kalır.
 */
export const KNOWN_HM_EDITOR_DOMAIN_SLUGS: Record<string, string> = {
  "suhaber.net": "su",
  "kirsehri.com": "kirsehirhaber",
  "kirsehirhaber.org": "kirsehirhaber",
  "kirsehir.net": "kirsehirhaber",
  "ankarahabergundemi.com": "ankarahabergundemi",
  "gundem.fix.tc": "ankarahabergundemi",
  "ankara.gundemi.org": "ankarahabergundemi",
  "ankarasehirgazetesi.com": "asg",
  "ankara.fix.tc": "asg",
  "vatankahramanlari.org": "vkd",
  "vatanhaber.net": "vatanhaber",
  "trafikdernegi.com": "trafik",
  "tgd.tc": "trafik",
  "trafik.gd": "trafik",
  "yesilvatan.gen.tr": "yesilvatan",
  "yerel.net.tr": "yerelnet",
  "sehitgazi.org.tr": "sehitgazi",
  "dunyasaglik.org": "dunyasaglik",
  "turksav.org": "turksav",
  "turkatahaber.com": "turkatahaber",
  /** Apex — kendi HM sitesi (slug `gundemi`); turkatahaber alias değil. */
  "gundemi.org": "gundemi",
  "fix.tc": "fixhaber",
};

function normalizeHostKey(host: string): string {
  return host.toLowerCase().split(":")[0]?.replace(/^www\./, "") ?? "";
}

export function resolveKnownHmEditorSlug(host: string): string | undefined {
  const h = normalizeHostKey(host);
  if (!h) return undefined;
  return KNOWN_HM_EDITOR_DOMAIN_SLUGS[h] || undefined;
}
