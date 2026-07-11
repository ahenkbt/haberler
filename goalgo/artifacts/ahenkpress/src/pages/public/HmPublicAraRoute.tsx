import { useEffect } from "react";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import UnifiedSearchResultsPage from "@/pages/public/UnifiedSearchResultsPage";

function HmAraSeo() {
  const ctx = useHmPublicLinkContextOptional();
  useEffect(() => {
    if (!ctx) return;
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      browserTitle: `Ara · ${ctx.displayName}`,
      description: `${ctx.displayName} — Yekpare birleşik arama`,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(ctx.slug)}/ara`,
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [ctx?.slug, ctx?.displayName, ctx?.domain, ctx?.layoutPrefs.logoUrl, ctx?.layoutPrefs.faviconUrl]);
  return null;
}

/** `/tr/:slug/ara` — site header/footer + Yekpare arama sonuçları. */
export default function HmPublicAraRoute() {
  return (
    <HmNestedLayout>
      <HmAraSeo />
      <UnifiedSearchResultsPage embedInHmSite />
    </HmNestedLayout>
  );
}
