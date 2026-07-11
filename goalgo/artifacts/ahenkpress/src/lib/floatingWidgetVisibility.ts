/**
 * Yüzen widget görünürlük kuralları — regresyon önlemek için tek kaynak.
 *
 * - ChatBubble (sağ): yalnızca mağaza/sipariş işlem sayfaları + sağlayıcı panelleri
 * - YekpareAiChat: /ara ve servis sayfalarında FAB/dock; anasayfa yalnızca inline AI (FAB yok)
 */

import { shouldShowChatBubble } from "@/lib/chatBubbleRoutes";
import { getYekpareAiLayout } from "@/lib/yekpareAiRoutes";
import { isHmSitePublicChromePath } from "@/lib/hmSitePublicPath";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

export type FloatingWidgetContext = {
  pathNoQuery: string;
  isQrMenu?: boolean;
  isHmChrome?: boolean;
};

function normalizePath(path: string): string {
  return (path.split("?")[0] ?? "").trim() || "/";
}

export function resolveFloatingWidgetVisibility(
  location: string,
  options?: { hmChrome?: boolean },
): { chatBubble: boolean; yekpareAi: boolean } {
  const pathNoQuery = normalizePath(location);
  const isQrMenu = pathNoQuery.startsWith("/siparis/qr-menu/");
  const isHmChrome = options?.hmChrome ?? isHmSitePublicChromePath(pathNoQuery);
  const pageHost =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const isHmCustomDomain = Boolean(pageHost && !isDefaultPortalHost(pageHost));

  if (isQrMenu || isHmChrome || isHmCustomDomain) {
    return { chatBubble: false, yekpareAi: false };
  }

  const aiLayout = getYekpareAiLayout(pathNoQuery);

  return {
    chatBubble: shouldShowChatBubble(pathNoQuery),
    yekpareAi: aiLayout !== null && aiLayout !== "home-inline",
  };
}
