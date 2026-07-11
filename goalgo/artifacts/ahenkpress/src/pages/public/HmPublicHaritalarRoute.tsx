import { useEffect } from "react";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { hmHaritalarPublicPath } from "@/lib/hmHaritalarRoutes";
import Kesfet from "@/pages/public/Kesfet";

function HmHaritalarSeo() {
  const ctx = useHmPublicLinkContextOptional();
  useEffect(() => {
    if (!ctx) return;
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      browserTitle: `Haritalar · ${ctx.displayName}`,
      description: `${ctx.displayName} — dünya haber haritası ve şehir rehberi`,
      canonicalPath: hmHaritalarPublicPath(ctx.slug),
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [ctx?.slug, ctx?.displayName, ctx?.domain, ctx?.layoutPrefs.logoUrl, ctx?.layoutPrefs.faviconUrl]);
  return null;
}

/** `/tr/:slug/haritalar` — editör site header + Keşfet haritası + RSS haber entegrasyonu. */
export default function HmPublicHaritalarRoute() {
  return (
    <HmNestedLayout hideFooter>
      <HmHaritalarSeo />
      <div className="hm-haritalar-embed flex min-h-0 flex-1 flex-col">
        <Kesfet layout="desktop-chrome" embedInHmSite />
      </div>
    </HmNestedLayout>
  );
}
