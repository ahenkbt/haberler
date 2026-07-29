import { useMemo, type ReactNode } from "react";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX } from "@/components/HmPublicNewsNavStrip";
import { HmVideoTvContextProvider, type HmVideoTvLayoutValue } from "@/contexts/HmVideoTvContext";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { isKhHmSite } from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

const HM_HEADER_BAND_PX = 72;

/**
 * Haber sitesi Video TV — tek HM kabuğu.
 * Native `/api/video` vitrini; normal header→footer akışı (iframe yok).
 */
export function HmPublicVideoTvLayout({ children }: { children: ReactNode }) {
  return (
    <HmNestedLayout>
      <HmVideoTvContextBridge>
        <div className="hm-video-tv-native-host w-full min-w-0 flex-1">{children}</div>
      </HmVideoTvContextBridge>
    </HmNestedLayout>
  );
}

function HmVideoTvContextBridge({ children }: { children: ReactNode }) {
  const ctx = useHmPublicLinkContextOptional();
  const isMobile = useIsMobile();
  const value = useMemo((): HmVideoTvLayoutValue | null => {
    if (!ctx?.slug) return null;
    const contentStickyTopPx = isMobile ? 0 : HM_HEADER_BAND_PX + HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX;
    const host =
      typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
    const khShort = isKhHmSite(host, ctx.slug);
    return {
      slug: ctx.slug,
      pathHome: khShort
        ? "/video"
        : `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(ctx.slug)}/video-tv`,
      contentStickyTopPx,
      displayName: ctx.displayName,
    };
  }, [ctx?.slug, ctx?.displayName, isMobile]);

  return <HmVideoTvContextProvider value={value}>{children}</HmVideoTvContextProvider>;
}
