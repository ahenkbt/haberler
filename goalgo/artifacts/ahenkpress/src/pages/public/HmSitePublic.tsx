import { Component, useEffect, type ReactNode } from "react";
import HaberAnasayfasi from "@/pages/public/HaberAnasayfasi";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

class HmHomeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[HmSitePublic] Homepage render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="font-medium text-slate-700">Ana sayfa yüklenemedi.</p>
          <button
            type="button"
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Sayfayı yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function HmHomeSeo() {
  const ctx = useHmPublicLinkContextOptional();
  useEffect(() => {
    if (!ctx) return;
    const onCustomDomain =
      typeof window !== "undefined" &&
      !isDefaultPortalHost(window.location.hostname.toLowerCase().split(":")[0] ?? "");
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      description: ctx.description || `${ctx.displayName} güncel haberler ve köşe yazıları`,
      canonicalPath: onCustomDomain ? "/" : `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(ctx.slug)}`,
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [
    ctx?.slug,
    ctx?.displayName,
    ctx?.description,
    ctx?.domain,
    ctx?.layoutPrefs.logoUrl,
    ctx?.layoutPrefs.faviconUrl,
  ]);
  return null;
}

function HmHomeBody() {
  const ctx = useHmPublicLinkContextOptional();
  if (!ctx) return null;
  const hmBareChrome = ctx.layoutPrefs.showPlatformNav !== true;

  return (
    <HmHomeErrorBoundary>
      <HaberAnasayfasi serverLayoutPrefs={ctx.layoutPrefs} hmBareChrome={hmBareChrome} />
    </HmHomeErrorBoundary>
  );
}

export default function HmSitePublic() {
  return (
    <HmNestedLayout indexLandingGate>
      <HmHomeSeo />
      <HmHomeBody />
    </HmNestedLayout>
  );
}
