import { Redirect } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import type { ReactNode } from "react";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

/**
 * Portal yolları (`/kunye`, `/reklam` …) özel alan adında site bağlamı olmadan açılırsa varsayılan şablon görünür.
 * HM kayıtlı domainde aynı sayfayı `/tr/{slug}/…` rotasına yönlendir.
 */
export function HmPortalOrDomainStandardPage({
  segment,
  children,
}: {
  segment: string;
  children: ReactNode;
}) {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const { data, isLoading, isError } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !isDefaultPortalHost(host),
    retry: false,
  });

  if (typeof window !== "undefined" && !isDefaultPortalHost(host)) {
    if (isLoading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Sayfa yükleniyor…
        </div>
      );
    }
    if (!isError && data?.slug) {
      return (
        <Redirect
          to={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(data.slug)}/${segment.replace(/^\/+/, "")}`}
        />
      );
    }
  }

  return <>{children}</>;
}
