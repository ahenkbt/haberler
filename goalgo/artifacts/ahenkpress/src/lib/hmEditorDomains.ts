/**
 * Bilinen editör haber sitesi alanları — meta 404 olsa bile Yekpare portal anasayfasına düşülmez.
 * Worker `HM_DOMAIN_SLUG_FALLBACKS` ile senkron tutulmalı.
 */
export const KNOWN_HM_EDITOR_DOMAIN_SLUGS: Record<string, string> = {
  "suhaberajansi.com": "su",
  "kirsehri.com": "kh",
  "kirsehirhaber.org": "kh",
  "kirsehir.net": "kh",
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
