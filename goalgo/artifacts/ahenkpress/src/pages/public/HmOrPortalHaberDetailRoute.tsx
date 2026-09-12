import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { resolveKnownHmEditorSlug } from "@/lib/hmEditorDomains";
import { writeHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import HmPublicHaberDetayRoute from "@/pages/public/HmPublicHaberDetayRoute";
import { SixAmMartNewsDetailPage } from "@/themes/sixammart/SixAmMartTheme";

/**
 * `/haber/:id` — özel HM alanında vitrin detayı; turk.eco'te SixAmMart haber detayı.
 * Temiz URL (`/haber/slug`) wouter iç yoluna çevrilmeden önce de doğru sayfayı açar.
 * ASG / AHG gibi editör alanlarında meta 404 olsa bile SixAmMart gece kabuğuna (#020617) düşülmez.
 */
export default function HmOrPortalHaberDetailRoute() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const isCustomDomain = !!host && !isDefaultPortalHost(host);

  if (!isCustomDomain) {
    return <SixAmMartNewsDetailPage />;
  }

  const knownSlug = resolveKnownHmEditorSlug(host);
  if (knownSlug) writeHmDomainSlugCache(host, knownSlug);
  return <HmPublicHaberDetayRoute />;
}
