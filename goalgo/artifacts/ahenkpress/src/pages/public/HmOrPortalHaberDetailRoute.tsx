import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { readHmDomainSlugCache, writeHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";
import HmPublicHaberDetayRoute from "@/pages/public/HmPublicHaberDetayRoute";
import { SixAmMartNewsDetailPage } from "@/themes/sixammart/SixAmMartTheme";

/**
 * `/haber/:id` — özel HM alanında vitrin detayı; yekpare.net'te SixAmMart haber detayı.
 * Temiz URL (`/haber/slug`) wouter iç yoluna çevrilmeden önce de doğru sayfayı açar.
 */
export default function HmOrPortalHaberDetailRoute() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const isCustomDomain = !!host && !isDefaultPortalHost(host);
  const cachedSlug = isCustomDomain ? readHmDomainSlugCache(host) : undefined;

  const { data, isFetched } = useHmMetaByDomain(host, {
    enabled: isCustomDomain && !cachedSlug,
    timeoutMs: 12_000,
    retry: 1,
  });

  if (!isCustomDomain) {
    return <SixAmMartNewsDetailPage />;
  }

  const hmSlug = cachedSlug ?? data?.slug;
  if (hmSlug) {
    if (data?.slug) writeHmDomainSlugCache(host, data.slug);
    return <HmPublicHaberDetayRoute />;
  }

  if (!isFetched) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-slate-600">
        Haber yükleniyor…
      </div>
    );
  }

  return <SixAmMartNewsDetailPage />;
}
