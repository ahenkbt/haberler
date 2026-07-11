/** @deprecated Yektube v1 HM kabuğu — v2 geçişinde `HmVideoTvRoute` iframe. */
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { HmPublicSiteHeader } from "@/components/HmPublicSiteHeader";
import { HmPublicSiteFooter } from "@/components/HmPublicSiteFooter";
import { parseNewsSiteLayoutFromJson, resolveHmNewsVideoTvEnabled } from "@/lib/newsSiteLayout";
import { AppNav, APP_MOBILE_BOTTOM_NAV_HEIGHT } from "@/components/AppNav";
import { HmVideoTvContextProvider, type HmVideoTvLayoutValue } from "@/contexts/HmVideoTvContext";
import { HmPublicLinkProvider } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { HmPublicNewsNavStrip, HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX } from "@/components/HmPublicNewsNavStrip";
import { HmAdSlotStrip } from "@/components/HmAdSlotStrip";
import { HmChromeWidthShell } from "@/components/HmChromeWidthShell";
import { HmChromeThemeProvider, useHmChromeThemeOptional } from "@/contexts/HmChromeThemeContext";
import { resolveEditorHmEffectiveChromeColorMode } from "@/lib/hmChromeLayout";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

type HmMeta = {
  id: number;
  slug: string;
  domain: string | null;
  displayName: string;
  contact?: { phone?: string; email?: string; address?: string; notes?: string } | null;
  layout?: unknown;
};

/** Ölçüm gelene kadar Yektube içi sticky `top` için güvenli varsayılan (üst şerit ~1 satır). */
const HM_HEADER_FALLBACK_PX = 72;

function browserHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase().split(":")[0] ?? "";
}

export function HmVideoTvShell({ children }: { children: ReactNode }) {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const hostKey = browserHostname();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/hm/meta/by-slug", slug, "video-tv", hostKey],
    queryFn: async () => {
      const domainGuard =
        hostKey && !isDefaultPortalHost(hostKey) ? `?domain=${encodeURIComponent(hostKey)}` : "";
      const r = await fetch(apiUrl(`/api/hm/meta/by-slug/${encodeURIComponent(slug)}${domainGuard}`));
      if (!r.ok) throw new Error("notfound");
      return (await r.json()) as HmMeta;
    },
    enabled: slug.length > 0,
  });

  const layoutPrefs = useMemo(
    () => parseNewsSiteLayoutFromJson(data?.layout != null ? JSON.stringify(data.layout) : null),
    [data?.layout],
  );
  const showPlatformNav = layoutPrefs.showPlatformNav === true;
  const stackTopPx = showPlatformNav ? 52 : 0;
  const logo = layoutPrefs.logoUrl?.trim();
  const vitrinThemeAttr =
    layoutPrefs.hmVitrinTheme === "ankara" || layoutPrefs.hmVitrinTheme === "gold" || layoutPrefs.hmVitrinTheme === "corporate"
      ? layoutPrefs.hmVitrinTheme
      : undefined;

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerPx, setHeaderPx] = useState(HM_HEADER_FALLBACK_PX);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderPx(Math.max(48, Math.ceil(el.getBoundingClientRect().height)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data?.slug, logo, showPlatformNav]);

  const ctxValue = useMemo((): HmVideoTvLayoutValue | null => {
    if (!data?.slug) return null;
    const pathHome = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(data.slug)}/video-tv`;
    return {
      slug: data.slug,
      pathHome,
      contentStickyTopPx: stackTopPx + headerPx + HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX,
      displayName: data.displayName,
    };
  }, [data?.slug, data?.displayName, stackTopPx, headerPx]);

  useEffect(() => {
    if (!data?.displayName) return;
    const prev = document.title;
    document.title = `Video TV · ${data.displayName}`;
    return () => {
      document.title = prev;
    };
  }, [data?.displayName]);

  if (!slug) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Geçersiz adres</div>;
  }

  if (isLoading) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center">Yükleniyor…</div>;
  }

  if (error || !data || !ctxValue) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-medium">Bu slug ile kayıtlı haber sitesi bulunamadı.</p>
        <Button variant="outline" asChild>
          <Link href="/">Anasayfa</Link>
        </Button>
      </div>
    );
  }

  return (
    <HmPublicLinkProvider
      value={{
        siteId: data.id,
        slug: data.slug,
        domain: data.domain,
        displayName: data.displayName,
        layoutPrefs,
        contact: data.contact ?? null,
      }}
    >
      <HmChromeThemeProvider layoutPrefs={layoutPrefs}>
        <HmVideoTvContextProvider value={ctxValue}>
          <HmVideoTvVitrinRoot
            vitrinThemeAttr={vitrinThemeAttr}
            showPlatformNav={showPlatformNav}
            layoutPrefs={layoutPrefs}
            data={data}
            logo={logo}
            stackTopPx={stackTopPx}
            headerRef={headerRef}
            headerPx={headerPx}
          >
            {children}
          </HmVideoTvVitrinRoot>
        </HmVideoTvContextProvider>
      </HmChromeThemeProvider>
    </HmPublicLinkProvider>
  );
}

function HmVideoTvVitrinRoot({
  vitrinThemeAttr,
  showPlatformNav,
  layoutPrefs,
  data,
  logo,
  stackTopPx,
  headerRef,
  headerPx,
  children,
}: {
  vitrinThemeAttr: string | undefined;
  showPlatformNav: boolean;
  layoutPrefs: ReturnType<typeof parseNewsSiteLayoutFromJson>;
  data: HmMeta;
  logo: string | undefined;
  stackTopPx: number;
  headerRef: React.RefObject<HTMLDivElement | null>;
  headerPx: number;
  children: ReactNode;
}) {
  const themeCtx = useHmChromeThemeOptional();
  const effectiveChromeMode = themeCtx?.effectiveChromeMode ?? resolveEditorHmEffectiveChromeColorMode(layoutPrefs);

  return (
    <div
      className="hm-vitrin-root flex min-h-0 min-w-0 flex-1 flex-col"
      data-hm-vitrin-theme={vitrinThemeAttr}
      data-hm-chrome-mode={effectiveChromeMode}
      style={
        showPlatformNav
          ? {
              paddingBottom: `calc(${APP_MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            }
          : undefined
      }
    >
      {showPlatformNav ? <AppNav /> : null}
        <HmChromeWidthShell layoutPrefs={layoutPrefs}>
          <HmAdSlotStrip
            slotKey="header_top"
            siteId={data.id}
            slug={data.slug}
            domain={data.domain}
            layoutPrefs={layoutPrefs}
            className="w-full shrink-0 rounded-b-md border-x border-b border-zinc-200 bg-zinc-50 py-2 flex justify-center [&_img]:max-w-full [&_img]:h-auto"
          />
        </HmChromeWidthShell>
        <HmPublicSiteHeader
          rootRef={headerRef}
          slug={data.slug}
          displayName={data.displayName}
          domain={data.domain}
          logoUrl={logo}
          stickyStackTopPx={stackTopPx}
        />
        <HmPublicNewsNavStrip stickyTopPx={stackTopPx + headerPx} pinOnVideoTv />
        <HmChromeWidthShell layoutPrefs={layoutPrefs}>
          <HmAdSlotStrip
            slotKey="header_bottom"
            siteId={data.id}
            slug={data.slug}
            domain={data.domain}
            layoutPrefs={layoutPrefs}
            className="w-full shrink-0 rounded-b-md border-x border-b border-zinc-200 bg-white py-2 flex justify-center [&_img]:max-w-full [&_img]:h-auto"
          />
        </HmChromeWidthShell>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <HmPublicSiteFooter
          siteId={data.id}
          slug={data.slug}
          layoutPrefs={layoutPrefs}
          showVideoTvLink={resolveHmNewsVideoTvEnabled(layoutPrefs)}
          siteDisplayName={data.displayName}
          contact={data.contact ?? null}
        />
    </div>
  );
}
