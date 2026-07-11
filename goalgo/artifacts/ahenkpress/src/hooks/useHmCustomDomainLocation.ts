import { useCallback, useSyncExternalStore } from "react";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { readHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { toHmCustomDomainCleanPath, toHmInternalTrPath } from "@/lib/hmCustomDomainCleanPath";
import { readVendorDomainMetaCache } from "@/lib/vendorDomainStorage";
import {
  toVendorCustomDomainCleanPath,
  toVendorInternalStorefrontPath,
} from "@/lib/vendorCustomDomainCleanPath";

/**
 * Wouter yalnızca pathname üzerinde eşleşir (varsayılan `usePathname` gibi).
 * search/hash eklenirse `/newsmap?q=...` gibi adresler hiçbir Route ile eşleşmez.
 */
function browserPathname(): string {
  return window.location.pathname;
}

function resolveCustomDomainBinding(host: string): { kind: "hm"; slug: string } | { kind: "vendor"; storefrontPath: string } | null {
  const hmSlug = readHmDomainSlugCache(host);
  if (hmSlug) return { kind: "hm", slug: hmSlug };
  const vendor = readVendorDomainMetaCache(host);
  if (vendor?.storefrontPath) return { kind: "vendor", storefrontPath: vendor.storefrontPath };
  return null;
}

/**
 * Özel alanlarda kısa adres çubuğu; wouter içte tam yol görür.
 * HM: `/haber/...` ↔ `/tr/{slug}/haber/...`
 * Mağaza: `/` ↔ `/siparis/satici/{slug}` (veya alışveriş / turizm vitrini)
 */
export function useHmCustomDomainLocation(): [
  string,
  (to: string, options?: { replace?: boolean }) => void,
] {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const useCleanUrls = !!host && !isDefaultPortalHost(host);

  const subscribe = useCallback((onChange: () => void) => {
    // wouter, history.pushState/replaceState'i monkey-patch'leyip aynı adla event yayar;
    // doğrudan history çağrıları da (ör. harita lat/lng yazımı) yakalansın.
    const events = ["popstate", "pushState", "replaceState", "hashchange"];
    for (const ev of events) window.addEventListener(ev, onChange);
    return () => {
      for (const ev of events) window.removeEventListener(ev, onChange);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const raw = browserPathname();
    if (!useCleanUrls) return raw;
    const binding = resolveCustomDomainBinding(host);
    if (!binding) return raw;
    if (binding.kind === "hm") {
      return toHmInternalTrPath(raw, binding.slug) ?? raw;
    }
    return toVendorInternalStorefrontPath(raw, binding.storefrontPath) ?? raw;
  }, [host, useCleanUrls]);

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      if (!useCleanUrls) {
        if (options?.replace) window.history.replaceState(null, "", to);
        else window.history.pushState(null, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      const binding = resolveCustomDomainBinding(host);
      if (!binding) {
        if (options?.replace) window.history.replaceState(null, "", to);
        else window.history.pushState(null, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      let internal = to;
      let clean = to;
      if (binding.kind === "hm") {
        internal = toHmInternalTrPath(to, binding.slug) ?? to;
        clean = toHmCustomDomainCleanPath(internal, binding.slug);
      } else {
        internal = toVendorInternalStorefrontPath(to, binding.storefrontPath) ?? to;
        clean = toVendorCustomDomainCleanPath(internal, binding.storefrontPath);
      }

      const method = options?.replace ? "replaceState" : "pushState";
      window.history[method](null, "", clean);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [host, useCleanUrls],
  );

  const location = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [location, navigate];
}
