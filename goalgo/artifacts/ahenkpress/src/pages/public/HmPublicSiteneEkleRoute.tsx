import { useEffect } from "react";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import SiteneEkle from "@/pages/public/SiteneEkle";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

function SiteneHmSeo() {
  const ctx = useHmPublicLinkContextOptional();
  useEffect(() => {
    if (!ctx) return;
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      browserTitle: `Sitene ekle · ${ctx.displayName}`,
      description: `${ctx.displayName} — Sitene ekle (iframe kodu)`,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(ctx.slug)}/sitene-ekle`,
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [ctx?.slug, ctx?.displayName, ctx?.domain, ctx?.layoutPrefs.logoUrl, ctx?.layoutPrefs.faviconUrl]);
  return null;
}

/** `/tr/:slug/sitene-ekle` — Yekpare üst menüsü olmadan iframe aracı. */
export default function HmPublicSiteneEkleRoute() {
  return (
    <HmNestedLayout>
      <SiteneHmSeo />
      <SiteneEkle />
    </HmNestedLayout>
  );
}
