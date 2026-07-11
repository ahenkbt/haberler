import { useMemo, type ReactNode } from "react";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX } from "@/components/HmPublicNewsNavStrip";
import { HmVideoTvContextProvider, type HmVideoTvLayoutValue } from "@/contexts/HmVideoTvContext";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

const HM_HEADER_BAND_PX = 72;

/** Haber sitesi Video TV — tek HM kabuğu (`HmNestedLayout`), çift menü yok. */
export function HmPublicVideoTvLayout({ children }: { children: ReactNode }) {
  return (
    <HmNestedLayout hideFooter>
      <HmVideoTvContextBridge>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
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
    return {
      slug: ctx.slug,
      pathHome: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(ctx.slug)}/video-tv`,
      contentStickyTopPx,
      displayName: ctx.displayName,
    };
  }, [ctx?.slug, ctx?.displayName, isMobile]);

  return <HmVideoTvContextProvider value={value}>{children}</HmVideoTvContextProvider>;
}
