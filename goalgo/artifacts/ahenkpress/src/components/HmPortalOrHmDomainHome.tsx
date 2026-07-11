import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useMemo } from "react";
import { PortalSeoSync } from "@/components/PortalSeoSync";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { apiUrl } from "@/lib/apiBase";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";
import { isConfiguredPortalHost } from "@/lib/hmPortalHosts";
import HmSitePublic from "@/pages/public/HmSitePublic";
import { applyHmEarlyBrandingFromMeta } from "@/lib/hmEarlyBranding";
import {
  clearHmDomainSlugCache,
  readHmDomainBootSlug,
  readHmNestedMetaCache,
  resolveHmDomainSlugHint,
  writeHmDomainSlugCache,
  normalizeHmSlugSegment,
} from "@/lib/hmNestedMetaStorage";
import YekpareSadeHome from "@/pages/public/YekpareSadeHome";
import { VendorDomainStorefront } from "@/components/VendorDomainStorefront";
import { writeVendorDomainMetaCache } from "@/lib/vendorDomainStorage";

type VendorDomainMeta = {
  slug: string;
  storefrontPath: string;
  shortPath?: string;
};

function HmDomainRedirectLoading({ slug }: { slug: string }) {
  const label = useMemo(() => {
    const s = normalizeHmSlugSegment(slug);
    if (!s) return "Yükleniyor";
    return s
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, [slug]);

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-[72px] w-full shrink-0 bg-slate-900/95" />
      <div className="mx-auto w-full max-w-screen-xl flex-1 px-3 py-10">
        <div className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-6 shadow-sm">
          <p className="text-center text-sm font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-center text-xs text-slate-500">Sayfa hazırlanıyor…</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Özel alan kökü (`/`):
 * 1. HM panelde kayıtlı domain → haber anasayfası (adres çubuğu `/` kalır)
 * 2. Mağaza / servis sağlayıcı domaini → vitrin yolu
 * 3. Diğer tüm alanlar → Yekpare anasayfası
 */
export default function HmPortalOrHmDomainHome() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const cachedSlug = useMemo(
    () => (host && !isConfiguredPortalHost(host) ? resolveHmDomainSlugHint(host) : undefined),
    [host],
  );

  useLayoutEffect(() => {
    if (!cachedSlug) return;
    const cachedMeta = readHmNestedMetaCache(cachedSlug);
    if (cachedMeta?.data) applyHmEarlyBrandingFromMeta(cachedMeta.data, cachedSlug);
  }, [cachedSlug]);

  const isCustomDomain =
    typeof window !== "undefined" && !!host && !isConfiguredPortalHost(host);

  const hmQuery = useHmMetaByDomain(host, {
    enabled: isCustomDomain,
    retry: 2,
    retryDelay: (attempt) => Math.min(1200 * 2 ** attempt, 6_000),
    timeoutMs: 18_000,
    retries: 2,
  });

  const vendorQuery = useQuery({
    queryKey: ["/api/vendors/meta/by-domain", host, "home"],
    queryFn: async () => {
      const { ok, status, data: payload } = await fetchPublicJson<VendorDomainMeta>(
        apiUrl(`/api/vendors/meta/by-domain?domain=${encodeURIComponent(host)}`),
        { timeoutMs: 12_000, retries: 1 },
      );
      if (status === 404) return null;
      if (!ok) throw new Error(`HTTP ${status}`);
      return payload;
    },
    enabled: isCustomDomain,
    retry: 1,
    staleTime: 60_000,
  });

  if (!isCustomDomain) {
    return (
      <>
        <PortalSeoSync />
        <YekpareSadeHome />
      </>
    );
  }

  const bootSlug = readHmDomainBootSlug(host);
  const hmSlug =
    hmQuery.data?.slug ??
    (hmQuery.isFetched ? undefined : cachedSlug ?? bootSlug) ??
    (hmQuery.isError ? cachedSlug ?? bootSlug : undefined);

  if (hmSlug) {
    writeHmDomainSlugCache(host, hmSlug);
    return <HmSitePublic />;
  }

  const hmResolved = hmQuery.isFetched;
  const vendorResolved = vendorQuery.isFetched;

  const vendorMeta = hmResolved && !hmSlug ? vendorQuery.data : null;
  if (vendorMeta?.slug && vendorMeta.storefrontPath) {
    writeVendorDomainMetaCache(host, {
      slug: vendorMeta.slug,
      storefrontPath: vendorMeta.storefrontPath,
      shortPath: vendorMeta.shortPath,
    });
    return (
      <VendorDomainStorefront slug={vendorMeta.slug} storefrontPath={vendorMeta.storefrontPath} />
    );
  }

  const stillLoading = !hmResolved || (!hmSlug && !vendorResolved);

  if (stillLoading && (cachedSlug || bootSlug)) {
    return <HmSitePublic />;
  }

  if (stillLoading) {
    return <HmDomainRedirectLoading slug={cachedSlug ?? bootSlug ?? host.replace(/^www\./, "")} />;
  }

  const cachedMetaSlug = cachedSlug ?? bootSlug;
  const hasCachedHmMeta = Boolean(cachedMetaSlug && readHmNestedMetaCache(cachedMetaSlug)?.data);

  if (hmQuery.isError && (cachedMetaSlug || hasCachedHmMeta)) {
    if (cachedMetaSlug) writeHmDomainSlugCache(host, cachedMetaSlug);
    return <HmSitePublic />;
  }

  if (hasCachedHmMeta && cachedMetaSlug) {
    writeHmDomainSlugCache(host, cachedMetaSlug);
    return <HmSitePublic />;
  }

  /** API geçici hata — özel alanda Yekpare anasayfasına düşme (Google/mobil yavaş ağ). */
  if (hmQuery.isError) {
    return <HmDomainRedirectLoading slug={cachedMetaSlug ?? bootSlug ?? host.replace(/^www\./, "")} />;
  }

  if (hmQuery.data === null && vendorQuery.isFetched && !vendorMeta) {
    clearHmDomainSlugCache(host);
    return (
      <>
        <PortalSeoSync />
        <YekpareSadeHome />
      </>
    );
  }

  return <HmDomainRedirectLoading slug={cachedMetaSlug ?? bootSlug ?? host.replace(/^www\./, "")} />;
}
