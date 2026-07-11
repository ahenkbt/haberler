import HmRootYazarRedirect from "./HmRootYazarRedirect";
import YekparePortalYazarYazilari from "./YekparePortalYazarYazilari";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

/** Özel HM alanında `/yazar/:id` yönlendirmesi; Yekpare portalında merkez yazar sayfası. */
export default function YazarAuthorRoute() {
  const host =
    typeof window !== "undefined" ? (window.location.hostname.toLowerCase().split(":")[0] ?? "") : "";
  if (host && !isDefaultPortalHost(host)) {
    return <HmRootYazarRedirect />;
  }
  return <YekparePortalYazarYazilari />;
}
