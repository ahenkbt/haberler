const HM_SITE_PUBLIC_PREFIX = "tr";
const PORTAL_ORIGIN = "https://ahenk.net.tr";
const CORPORATE_SLUGS = new Set(["vkd", "vatankahramanlari", "trafik"]);

function isCorporateShowcaseSlug(siteSlug: string): boolean {
  const slug = siteSlug.trim().toLowerCase();
  if (!slug) return false;
  if (CORPORATE_SLUGS.has(slug)) return true;
  return slug.includes("vatankahramanlari") || slug.includes("trafikdernegi");
}

export type ThaShowcaseSite = {
  slug: string;
  displayName: string;
  domain?: string | null;
  logoUrl?: string | null;
  newsSite?: boolean;
  publicSuspended?: boolean;
};

const FOUNDATION_HOSTS = new Set(["tukav.org", "turkatav.org"]);

function siteHost(domain: string | null | undefined): string {
  return String(domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "") ?? "";
}

/** Yayındaki haber siteleri. Kurumsal vakıf/dernek vitrinleri ve askıdakiler bu listede durmaz. */
export function thaSubscriberSites(rows: ThaShowcaseSite[] | null | undefined): ThaShowcaseSite[] {
  const bySlug = new Map<string, ThaShowcaseSite>();
  for (const row of rows ?? []) {
    const slug = String(row?.slug ?? "").trim();
    if (!slug) continue;
    if (row.publicSuspended === true) continue;
    if (row.newsSite === false) continue;
    if (isCorporateShowcaseSlug(slug)) continue;
    if (FOUNDATION_HOSTS.has(siteHost(row.domain))) continue;
    const next = { ...row, slug };
    const prev = bySlug.get(slug);
    if (!prev || (!prev.logoUrl && next.logoUrl)) bySlug.set(slug, next);
  }
  return [...bySlug.values()];
}

export function thaSubscriberHref(site: ThaShowcaseSite): string {
  const host = siteHost(site.domain);
  if (host) return `https://${host}`;
  const path = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}`;
  return `${PORTAL_ORIGIN}${path}`;
}
