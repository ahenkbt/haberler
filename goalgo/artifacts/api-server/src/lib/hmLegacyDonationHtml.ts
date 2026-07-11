const LEGACY_DONATION_MARKERS =
  /vkv-donation-footer|vkv-hero--donation|vkv-donation-amounts|vkv-donation-submit|BAĞIŞ\s*YAP|Güvenli\s*Bağış|₺\s*500|Çanakkale\s*Şehitleri\s*-\s*Vatan/i;

export function isLegacyHmDonationHtml(html: string | null | undefined): boolean {
  const h = String(html ?? "").trim();
  if (!h) return false;
  return LEGACY_DONATION_MARKERS.test(h);
}

/** Eski ₺500/BAĞIŞ YAP kutuları ve alt bağış bandı HTML'ini kaldırır. */
export function stripLegacyHmDonationHtml(html: string | null | undefined): string {
  let out = String(html ?? "").trim();
  if (!out) return "";

  const blockPatterns = [
    /<section[^>]*\bvkv-donation-footer\b[^>]*>[\s\S]*?<\/section>/gi,
    /<div[^>]*\bvkv-donation-footer\b[^>]*>[\s\S]*?<\/div>/gi,
    /<section[^>]*\bvkv-hero--donation\b[^>]*>[\s\S]*?<\/section>/gi,
    /<div[^>]*\bvkv-hero--donation\b[^>]*>[\s\S]*?<\/div>/gi,
    /<section[^>]*\bvkv-donation-band\b[^>]*>[\s\S]*?vkv-donation-amounts[\s\S]*?<\/section>/gi,
    /<div[^>]*\bvkv-donation-card\b[^>]*>[\s\S]*?vkv-donation-amounts[\s\S]*?<\/div>/gi,
  ];

  let prev = "";
  while (prev !== out) {
    prev = out;
    for (const re of blockPatterns) {
      out = out.replace(re, "");
    }
  }

  return out.trim();
}
