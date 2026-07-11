import { Redirect, useLocation } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

/**
 * Özel alan (HM) kökünde `/bilgiagaci` URL’sini `/tr/{siteSlug}/bilgiagaci` ile değiştirir;
 * böylece HM üst/alt şerit (`HmNestedLayout`) uygulanır.
 */
export function HmAnsiklopediPublicWrap({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const { data, isLoading, isError } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !isDefaultPortalHost(host),
    retry: false,
  });

  const pathOnly = (loc.split("?")[0] ?? "").trim();

  if (typeof window !== "undefined" && !isDefaultPortalHost(host)) {
    if (isLoading) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center text-slate-500 text-sm">
          Yükleniyor…
        </div>
      );
    }
    if (!isError && data?.slug) {
      const enc = encodeURIComponent(data.slug);
      const trAns = `/${HM_SITE_PUBLIC_PREFIX}/${enc}/bilgiagaci`;
      const shortAns = `/${enc}/bilgiagaci`;
      let tail = "";
      if (pathOnly === "/bilgiagaci" || pathOnly.startsWith("/bilgiagaci/")) {
        tail = pathOnly.slice("/bilgiagaci".length);
      } else if (pathOnly === "/ansiklopedi" || pathOnly.startsWith("/ansiklopedi/")) {
        tail = pathOnly.slice("/ansiklopedi".length);
      } else if (pathOnly === shortAns || pathOnly.startsWith(`${shortAns}/`)) {
        tail = pathOnly.slice(shortAns.length);
      }
      return <Redirect to={`${trAns}${tail}`} replace />;
    }
  }

  return <>{children}</>;
}
