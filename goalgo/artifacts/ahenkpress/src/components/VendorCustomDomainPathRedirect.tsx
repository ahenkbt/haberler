import { useLocation } from "wouter";
import { useLayoutEffect, useMemo } from "react";
import { apiUrl } from "@/lib/apiBase";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { vendorCustomDomainCanonicalizeBrowserUrl } from "@/lib/vendorCustomDomainCleanPath";
import { readVendorDomainMetaCache, writeVendorDomainMetaCache } from "@/lib/vendorDomainStorage";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";
import { useQuery } from "@tanstack/react-query";

type VendorDomainMeta = {
  slug: string;
  storefrontPath: string;
  shortPath?: string;
  themeKey?: string;
};

/**
 * Özel mağaza alanında tam vitrin yolunu (`/siparis/satici/...`) adres çubuğundan gizler.
 * İç yönlendirme `useHmCustomDomainLocation` ile wouter'da kalır.
 */
export function VendorCustomDomainPathRedirect() {
  const [loc] = useLocation();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const cached = useMemo(
    () => (host && !isDefaultPortalHost(host) ? readVendorDomainMetaCache(host) : undefined),
    [host],
  );

  const { data: hmProbe } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !!host && !isDefaultPortalHost(host),
    retry: false,
    staleTime: 120_000,
  });

  const { data } = useQuery({
    queryKey: ["/api/vendors/meta/by-domain", host, "custom-domain-path"],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/vendors/meta/by-domain?domain=${encodeURIComponent(host)}`));
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as VendorDomainMeta;
    },
    enabled: typeof window !== "undefined" && !!host && !isDefaultPortalHost(host) && !hmProbe,
    retry: false,
    staleTime: 60_000,
  });

  const meta = data ?? (cached
    ? { slug: cached.slug, storefrontPath: cached.storefrontPath, shortPath: cached.shortPath, themeKey: cached.themeKey }
    : null);

  useLayoutEffect(() => {
    if (!meta?.storefrontPath || isDefaultPortalHost(host) || hmProbe) return;
    if (data?.slug) {
      writeVendorDomainMetaCache(host, {
        slug: data.slug,
        storefrontPath: data.storefrontPath,
        shortPath: data.shortPath,
        themeKey: data.themeKey,
      });
    }
    const clean = vendorCustomDomainCanonicalizeBrowserUrl(meta.storefrontPath);
    if (!clean) return;
    window.history.replaceState(window.history.state, "", clean);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [host, loc, meta?.storefrontPath, data, hmProbe]);

  return null;
}
