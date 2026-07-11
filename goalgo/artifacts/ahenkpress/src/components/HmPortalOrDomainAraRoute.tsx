import { Redirect, useSearch } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { readHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import UnifiedSearchResultsPage from "@/pages/public/UnifiedSearchResultsPage";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

/**
 * Portal `/ara` — tam Yekpare arama kromu.
 * HM kayıtlı özel alan adında `/tr/{slug}/ara` rotasına yönlendir (site header/footer embed).
 */
export function HmPortalOrDomainAraRoute() {
  const search = useSearch();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const cachedSlug =
    host && !isDefaultPortalHost(host) ? readHmDomainSlugCache(host) : undefined;

  const { data, isLoading, isError } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !isDefaultPortalHost(host),
    retry: false,
  });

  const qs = search ? (search.startsWith("?") ? search : `?${search}`) : "";

  if (typeof window !== "undefined" && !isDefaultPortalHost(host)) {
    const slug = data?.slug ?? cachedSlug;
    if (slug) {
      return (
        <Redirect
          to={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/ara${qs}`}
          replace
        />
      );
    }
    if (isLoading && !cachedSlug) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Arama sayfası yükleniyor…
        </div>
      );
    }
    if (!isError && data === null) {
      return <UnifiedSearchResultsPage />;
    }
  }

  return <UnifiedSearchResultsPage />;
}
