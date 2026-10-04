import { resolveKnownHmEditorSlug } from "@/lib/hmEditorDomains";
import { writeHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { usesPortalHybridNewsDetail } from "@/lib/resolveRootModeWouterPath";
import HmPublicHaberDetayRoute from "@/pages/public/HmPublicHaberDetayRoute";
import { SixAmMartNewsDetailPage } from "@/themes/sixammart/SixAmMartTheme";

/**
 * `/haber/:id` ve `/makale/:id` — ahenk.net.tr ile turkatahaber.com portal haber detayı;
 * özel HM alanında vitrin detayı.
 * Temiz URL (`/haber/slug`) wouter iç yoluna çevrilmeden önce de doğru sayfayı açar.
 * ASG gibi editör alanlarında meta 404 olsa bile SixAmMart gece kabuğuna düşülmez.
 * turkatahaber.com portal haberidir; boş HM slug ile "Geçersiz adres" açılmaz.
 */
export default function HmOrPortalHaberDetailRoute() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  if (usesPortalHybridNewsDetail(host)) {
    return <SixAmMartNewsDetailPage />;
  }

  const knownSlug = resolveKnownHmEditorSlug(host);
  if (knownSlug) writeHmDomainSlugCache(host, knownSlug);
  return <HmPublicHaberDetayRoute />;
}
