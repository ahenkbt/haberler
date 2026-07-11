import { useLocation } from "wouter";
import { useLayoutEffect, useMemo } from "react";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { hmCustomDomainCanonicalizeBrowserUrl } from "@/lib/hmCustomDomainCleanPath";
import { readHmDomainSlugCache, writeHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

/**
 * Özel HM alanında `/tr/{slug}/...` adreslerini ziyaretçi için kısa yola çevirir:
 * `ankarasehirgazetesi.com/haber/...` (profesyonel görünüm).
 * İç yönlendirme `useHmCustomDomainLocation` ile wouter'da kalır.
 */
export function HmCustomDomainPathRedirect() {
  const [loc] = useLocation();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const cachedSlug = useMemo(
    () => (host && !isDefaultPortalHost(host) ? readHmDomainSlugCache(host) : undefined),
    [host],
  );

  const { data } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !!host && !isDefaultPortalHost(host),
    retry: false,
  });

  const slug = data?.slug ?? cachedSlug;

  useLayoutEffect(() => {
    if (!slug || isDefaultPortalHost(host)) return;
    if (data?.slug) writeHmDomainSlugCache(host, data.slug);
    const clean = hmCustomDomainCanonicalizeBrowserUrl(slug);
    if (!clean) return;
    window.history.replaceState(window.history.state, "", clean);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [host, loc, slug, data?.slug]);

  return null;
}
