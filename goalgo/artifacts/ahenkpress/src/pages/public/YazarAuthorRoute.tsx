import HmRootYazarRedirect from "./HmRootYazarRedirect";
import YekparePortalYazarYazilari from "./YekparePortalYazarYazilari";
import { usesPortalHybridNewsDetail } from "@/lib/resolveRootModeWouterPath";

/** Özel HM alanında `/yazar/:id` yönlendirmesi; portal ve turkatahaber.com'da merkez yazar sayfası. */
export default function YazarAuthorRoute() {
  const host =
    typeof window !== "undefined" ? (window.location.hostname.toLowerCase().split(":")[0] ?? "") : "";
  if (usesPortalHybridNewsDetail(host)) {
    return <YekparePortalYazarYazilari />;
  }
  return <HmRootYazarRedirect />;
}
