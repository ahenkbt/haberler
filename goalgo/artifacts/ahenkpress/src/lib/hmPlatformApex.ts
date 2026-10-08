export const HM_PLATFORM_FIX_TC = "fix.tc";
export const HM_PLATFORM_GUNDEMI_ORG = "gundemi.org";

export function normalizeHmPlatformSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function suggestHmPlatformSubdomains(slug: string): { fixTc: string; gundemiOrg: string } {
  const s = normalizeHmPlatformSlug(slug) || "site";
  return {
    fixTc: `${s}.${HM_PLATFORM_FIX_TC}`,
    gundemiOrg: `${s}.${HM_PLATFORM_GUNDEMI_ORG}`,
  };
}

export const HM_PLATFORM_APEX_HELP =
  "Yeni siteler için varsayılan platformlar: fix.tc ve gundemi.org (ör. adana.fix.tc, adana.gundemi.org). " +
  "Domain 2/3’e harici apex (örn. sosyalhizmetler.tr) yazıldığında DNS, panel Worker yolları, Neon domain bağlama ve VPS Traefik (şablon varsa) otomatik denenir.";
