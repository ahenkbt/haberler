/**
 * Bilinen editör haber sitesi alanları — meta 404 olsa bile Yekpare portal anasayfasına düşülmez.
 * Worker `cloudflare/hm-html-boot.js` alan→slug tablosu ile senkron tutulmalı.
 */
export const KNOWN_HM_EDITOR_DOMAIN_SLUGS: Record<string, string> = {
  "suhaber.net": "su",
  "suhaberajansi.com": "su",
  "kirsehri.com": "kirsehirhaber",
  "kirsehirhaber.org": "kirsehirhaber",
  "kirsehir.net": "kirsehirhaber",
  "ankarahabergundemi.com": "ankarahabergundemi",
  "ankarasehirgazetesi.com": "asg",
  "vatankahramanlari.org": "vkd",
  "vatanhaber.net": "vatanhaber",
};

function normalizeHostKey(host: string): string {
  return host.toLowerCase().split(":")[0]?.replace(/^www\./, "") ?? "";
}

export function resolveKnownHmEditorSlug(host: string): string | undefined {
  const h = normalizeHostKey(host);
  if (!h) return undefined;
  return KNOWN_HM_EDITOR_DOMAIN_SLUGS[h] || undefined;
}
