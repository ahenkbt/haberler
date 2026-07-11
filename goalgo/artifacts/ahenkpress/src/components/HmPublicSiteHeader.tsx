import type { CSSProperties, Ref } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useListAds } from "@workspace/api-client-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { resolveHmOrGlobalSlotHtml } from "@/lib/hmResolveAdSlotHtml";
import {
  hmChromeContainedShellClass,
  isHmHeaderChromeContained,
  normalizeHmChromeHex,
  hmTickerVariantLightFromGlassSurface,
  resolveEditorHmEffectiveChromeColorMode,
  resolveHmHeaderBandBackgroundStyle,
  resolveHmHeaderChromeLightText,
  resolveHmTickerGlassSurface,
} from "@/lib/hmChromeLayout";
import { HmHeaderFinanceWeatherStrip } from "@/components/HmHeaderFinanceWeatherStrip";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import { HmNewsCategoriesDropdown } from "@/components/HmNewsCategoriesDropdown";
import { useHmPublicNewsCategoryMenu } from "@/hooks/useHmPublicNewsCategoryMenu";
import {
  normalizeHmVitrinTheme,
  resolveHeaderPreset,
  resolveHmHeaderRightBannerUrl,
  resolveHmHeaderRightSlot,
  resolveHmHeaderRightSlotText,
  resolveHmNewsHeaderMenuEnabled,
  type HmHeaderRightSlotId,
} from "@/lib/newsSiteLayout";
import { HmPublicNewsNavSearch } from "@/components/HmPublicNewsNavSearch";
import { NewsmapHeaderBranding } from "@/components/NewsmapHeaderBranding";
import { HmAdSlotStrip } from "@/components/HmAdSlotStrip";
import { useIsMobile } from "@/hooks/use-mobile";

export type HmPublicSiteHeaderProps = {
  slug: string;
  displayName: string;
  domain: string | null | undefined;
  logoUrl?: string | null;
  stickyStackTopPx: number;
  rootRef?: Ref<HTMLDivElement>;
  /** Video TV gibi gömülü Yektube sayfalarında site logosunu gizle (nav bandı kalır). */
  hideSiteLogo?: boolean;
  /** Haber haritası sayfasında logo solunda marka bloğu. */
  showNewsmapBranding?: boolean;
};

export function HmPublicSiteHeader({
  slug,
  displayName,
  domain,
  logoUrl,
  stickyStackTopPx,
  rootRef,
  hideSiteLogo = false,
  showNewsmapBranding = false,
}: HmPublicSiteHeaderProps) {
  const logo = logoUrl?.trim();
  const [logoFailed, setLogoFailed] = useState(false);
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const layoutPrefs = hmCtx?.layoutPrefs ?? null;
  const chromeLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const { data: adSlots = [] } = useListAds();
  const newsNavEnabled = resolveHmNewsHeaderMenuEnabled(layoutPrefs);
  const corporateHeader = layoutPrefs?.hmVitrinTheme === "corporate";
  const showHeaderCategories = newsNavEnabled || corporateHeader;
  const {
    enabled: categoriesMenuEnabled,
    categoryMenuItems,
    accent: categoryAccent,
    headerTriggerStyle,
  } = useHmPublicNewsCategoryMenu();
  const mobileHeaderMenuTriggerStyle = useMemo(
    (): CSSProperties => ({
      ...headerTriggerStyle,
      color: "#f97316",
      border: "1px solid rgba(249, 115, 22, 0.55)",
      background: "rgba(255, 255, 255, 0.92)",
    }),
    [headerTriggerStyle],
  );
  const contained = isHmHeaderChromeContained(layoutPrefs);
  const logoBgHex = useMemo(() => normalizeHmChromeHex(layoutPrefs?.hmLogoBarBackground ?? null), [layoutPrefs?.hmLogoBarBackground]);
  const headerRightSlot = resolveHmHeaderRightSlot(layoutPrefs);
  const headerRightText = resolveHmHeaderRightSlotText(layoutPrefs, hmCtx?.description);
  const headerRightBannerUrl = resolveHmHeaderRightBannerUrl(layoutPrefs);
  const isSumbulTheme = normalizeHmVitrinTheme(layoutPrefs?.hmVitrinTheme) === "sumbul";
  const headerPreset = resolveHeaderPreset(layoutPrefs);
  const isTrabzonikHeader = headerPreset === "trabzonik";
  const isClassicHeader = headerPreset === "classic";
  const isMinimalHeader = headerPreset === "minimal";
  const showHeaderSideAd =
    !isMinimalHeader &&
    hmCtx &&
    !hideSiteLogo &&
    !corporateHeader &&
    headerRightSlot !== "banner";
  const headerRightBannerSlotKey = isTrabzonikHeader ? "header_top" : "header_logo_side";
  const headerRightBannerAdHtml = useMemo(() => {
    if (!hmCtx || !layoutPrefs || headerRightSlot !== "banner" || headerRightBannerUrl) return "";
    return (resolveHmOrGlobalSlotHtml(hmCtx.siteId, layoutPrefs, headerRightBannerSlotKey, adSlots) ?? "").trim();
  }, [adSlots, headerRightBannerSlotKey, headerRightBannerUrl, headerRightSlot, hmCtx, layoutPrefs]);
  const isMobileViewport = useIsMobile();
  const headerRightShowsOnMobile =
    headerRightSlot === "banner" ||
    headerRightSlot === "text" ||
    headerRightSlot === "text-search" ||
    headerRightSlot === "search" ||
    headerRightSlot === "finance" ||
    headerRightSlot === "weather" ||
    headerRightSlot === "finance-weather";
  const trabzonikNavHex =
    normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null) ||
    normalizeHmChromeHex(layoutPrefs?.hmPrimaryColor ?? null) ||
    "#6b0f1a";
  const headerChromeLight = resolveEditorHmEffectiveChromeColorMode(chromeLayoutPrefs) === "light";
  const useLightText = resolveHmHeaderChromeLightText(chromeLayoutPrefs);
  const financeGlassSurface = resolveHmTickerGlassSurface(chromeLayoutPrefs, "finance");
  const financeStripLightText = hmTickerVariantLightFromGlassSurface(financeGlassSurface);
  const headerSearchNavOnLight = !useLightText;
  const headerSearchPillIdleBg = headerSearchNavOnLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.12)";
  const headerSearchPillText = headerSearchNavOnLight ? "#475569" : "rgba(255,255,255,0.88)";
  const taglineShellClass = `flex w-full flex-wrap items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold leading-relaxed md:justify-end md:text-right ${
    useLightText ? "border-white/10 bg-white/5 text-white/70" : "border-slate-200 bg-white/70 text-slate-600"
  }`;
  const headerRightTextClass = "min-w-0 flex-1 text-center md:text-right";
  const headerRightSearchClass = "hm-corporate-header-tagline__search hidden md:block";

  const renderHeaderRightSlot = (slot: HmHeaderRightSlotId | null) => {
    if (!slot) {
      return <div className="min-h-[2.25rem] flex items-center justify-end gap-2" aria-hidden />;
    }

    switch (slot) {
      case "text":
        return (
          <div className={taglineShellClass}>
            <span className={headerRightTextClass}>{headerRightText}</span>
          </div>
        );
      case "text-search":
        return (
          <div className={taglineShellClass}>
            <span className={headerRightTextClass}>{headerRightText}</span>
            <HmPublicNewsNavSearch
              navOnLight={headerSearchNavOnLight}
              pillIdleBg={headerSearchPillIdleBg}
              pillText={headerSearchPillText}
              inputId="hm-corporate-header-search-input"
              className={headerRightSearchClass}
            />
          </div>
        );
      case "search":
        return (
          <div className={taglineShellClass}>
            <span className={`${headerRightTextClass} md:hidden`}>{headerRightText}</span>
            <HmPublicNewsNavSearch
              navOnLight={headerSearchNavOnLight}
              pillIdleBg={headerSearchPillIdleBg}
              pillText={headerSearchPillText}
              inputId="hm-header-right-search-input"
              className={`${headerRightSearchClass} md:w-auto`}
            />
          </div>
        );
      case "banner":
        if (headerRightBannerUrl) {
          return (
            <div className={`${taglineShellClass} justify-end p-1.5`}>
              <img
                src={resolveClientMediaSrc(headerRightBannerUrl)}
                alt=""
                className="max-h-[72px] max-w-full object-contain object-right"
                loading="lazy"
                decoding="async"
              />
            </div>
          );
        }
        if (hmCtx && headerRightBannerAdHtml) {
          return (
            <div className={`${taglineShellClass} justify-end p-1.5`}>
              <HmAdSlotStrip
                slotKey={headerRightBannerSlotKey}
                siteId={hmCtx.siteId}
                slug={slug}
                domain={domain}
                layoutPrefs={layoutPrefs!}
                className="flex w-full justify-end [&_img]:max-h-[72px] [&_img]:max-w-full [&_img]:h-auto"
              />
            </div>
          );
        }
        return (
          <div className={taglineShellClass}>
            <span className={headerRightTextClass}>{headerRightText}</span>
          </div>
        );
      case "finance":
        return (
          <HmHeaderFinanceWeatherStrip
            variantLight={financeStripLightText}
            mode="finance"
            hideSearch={isMobileViewport}
          />
        );
      case "weather":
        return (
          <HmHeaderFinanceWeatherStrip
            variantLight={financeStripLightText}
            mode="weather"
            hideSearch={isMobileViewport}
          />
        );
      case "finance-weather":
        return (
          <HmHeaderFinanceWeatherStrip
            variantLight={financeStripLightText}
            mode="both"
            hideSearch={isSumbulTheme || isMobileViewport}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    setLogoFailed(false);
  }, [logo]);

  const homeHref = hmCtx ? h("/") : `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}`;

  const bgStyle: CSSProperties = resolveHmHeaderBandBackgroundStyle(chromeLayoutPrefs, logoBgHex);

  const shadow = contained ? "0 4px 24px rgba(0,0,0,0.12)" : "0 4px 24px rgba(0,0,0,0.18)";

  const innerRow = (
    <div
      className={`flex w-full max-w-full flex-col gap-2 ${
        contained ? "" : "px-3"
      } ${
        isTrabzonikHeader
          ? `py-2.5 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-4 ${contained ? "" : "sm:px-4"}`
          : isClassicHeader
            ? `py-3 sm:flex-col sm:items-center sm:justify-center sm:gap-2 ${contained ? "" : "sm:px-4"}`
            : isMinimalHeader
              ? `py-1.5 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-2 ${contained ? "" : "sm:px-3"}`
              : corporateHeader
                ? `py-3 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-5 sm:py-3.5 ${contained ? "" : "sm:px-6 lg:px-8"}`
                : `py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${contained ? "" : "sm:px-4"}`
      }`}
    >
      <div
        className={`flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-initial ${
          hideSiteLogo && !showNewsmapBranding ? "hidden" : ""
        } ${isClassicHeader ? "justify-center sm:justify-center" : ""}`}
      >
        {showNewsmapBranding ? (
          <NewsmapHeaderBranding
            variant={useLightText ? "dark" : "light"}
            className="shrink-0 sm:mr-1"
          />
        ) : null}
        <Link
          href={homeHref}
          className={`flex min-w-0 flex-1 items-center justify-center gap-3 hover:opacity-95 sm:max-w-none sm:flex-initial sm:justify-start ${
            hideSiteLogo ? "hidden" : ""
          } ${
            showHeaderCategories && categoriesMenuEnabled ? "max-w-[calc(100%-3rem)] sm:max-w-none" : ""
          } ${corporateHeader ? "sm:min-w-[18rem] lg:min-w-[22rem] xl:min-w-[26rem]" : ""}`}
        >
          {logo && !logoFailed ? (
            <img
              src={resolveClientMediaSrc(logo)}
              alt={displayName}
              className={`block h-auto w-auto max-w-full shrink rounded object-contain object-center px-1 py-0.5 ${
                corporateHeader
                  ? "max-h-[5rem] max-w-[min(calc(100vw-4.5rem),240px)] sm:max-h-16 sm:max-w-[360px] lg:max-h-[5.5rem] lg:max-w-[460px]"
                  : "max-h-14 max-w-[min(calc(100vw-4.5rem),15rem)] sm:h-14 sm:max-h-14 sm:max-w-[15rem]"
              } ${useLightText ? "bg-white/5" : "bg-slate-100 ring-1 ring-slate-200/80"}`}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div
              className={`min-w-0 ${corporateHeader ? "max-w-[min(calc(100%-3rem),420px)] sm:max-w-[min(100%,420px)]" : "max-w-[min(calc(100%-3rem),220px)] sm:max-w-[min(100%,280px)]"}`}
            >
              <div
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  useLightText ? "text-[var(--hm-brand-label,#f87171)]" : "text-red-600"
                }`}
              >
                Haber merkezi
              </div>
              <div
                className={`truncate text-lg font-black tracking-tight ${
                  corporateHeader ? "sm:text-2xl lg:text-3xl" : "sm:text-xl"
                } ${useLightText ? "text-white" : "text-slate-900"}`}
              >
                {displayName}
              </div>
              <div className={`mt-0.5 text-xs ${useLightText ? "text-[var(--hm-header-muted,rgb(148,163,184))]" : "text-slate-600"}`}>
                <code className={useLightText ? "text-[var(--hm-header-code,rgb(203,213,225))]" : "text-slate-800"}>
                  /{HM_SITE_PUBLIC_PREFIX}/{slug}
                </code>
                {domain ? <span> · {domain}</span> : null}
              </div>
            </div>
          )}
        </Link>
        {showHeaderCategories && categoriesMenuEnabled ? (
          <div className="hm-header-categories-slot ml-auto flex shrink-0 items-center gap-1.5 sm:hidden">
            <HmNewsCategoriesDropdown
              items={categoryMenuItems}
              triggerStyle={mobileHeaderMenuTriggerStyle}
              accent={categoryAccent}
              mobile
            />
          </div>
        ) : null}
      </div>
      {isTrabzonikHeader && showHeaderSideAd ? (
        <div className="hm-trabzonik-header-ad hidden min-w-0 flex-1 md:flex md:max-w-[min(100%,728px)] md:justify-end">
          <HmAdSlotStrip
            slotKey={isTrabzonikHeader ? "header_top" : "header_logo_side"}
            siteId={hmCtx!.siteId}
            slug={slug}
            domain={domain}
            layoutPrefs={layoutPrefs!}
            className="flex w-full max-w-[728px] justify-end [&_img]:max-h-[90px] [&_img]:max-w-full [&_img]:h-auto"
          />
        </div>
      ) : null}
      {!isTrabzonikHeader && showHeaderSideAd ? (
        <div className="hm-header-logo-side-ad hidden min-w-0 flex-1 sm:flex sm:max-w-[320px] sm:justify-end lg:max-w-[420px]">
          <HmAdSlotStrip
            slotKey="header_logo_side"
            siteId={hmCtx!.siteId}
            slug={slug}
            domain={domain}
            layoutPrefs={layoutPrefs!}
            className="flex w-full justify-end [&_img]:max-h-[72px] [&_img]:max-w-full [&_img]:h-auto"
          />
        </div>
      ) : null}
      {/* Logo sağı özelleştirilebilir alan (yazı, banner, hava, döviz, arama) */}
      <div
        className={`min-h-0 min-w-0 w-full flex-1 ${
          isClassicHeader ? "hidden" : isSumbulTheme || headerRightShowsOnMobile ? "flex" : "hidden md:flex"
        } md:w-auto md:min-w-[12rem] ${isMinimalHeader ? "md:max-w-[14rem]" : ""}`}
        data-hm-header-right-slot={headerRightSlot ?? undefined}
      >
        {renderHeaderRightSlot(headerRightSlot)}
      </div>
    </div>
  );

  const plateStyle: CSSProperties = {
    borderBottomColor: useLightText ? "var(--hm-header-border, rgba(30, 41, 59, 0.85))" : "rgba(15, 23, 42, 0.12)",
    borderBottomWidth: "1px",
    ...bgStyle,
    boxShadow: shadow,
    ...(isTrabzonikHeader
      ? {
          ["--hm-trabzonik-nav-bg" as string]: trabzonikNavHex,
          ...(headerChromeLight ? { backgroundColor: logoBgHex || "#ffffff" } : {}),
        }
      : {}),
  };

  return (
    <div
      ref={rootRef}
      className={`hm-site-header-band sticky z-[45] w-full ${
        contained ? "hm-site-header-band--contained-outer" : `border-b ${useLightText ? "text-white" : "text-slate-900"}`
      }${isTrabzonikHeader ? " hm-site-header-band--trabzonik" : ""}${
        isClassicHeader ? " hm-site-header-band--classic" : ""
      }${isMinimalHeader ? " hm-site-header-band--minimal" : ""}`}
      data-hm-header-preset={headerPreset !== "default" ? headerPreset : undefined}
      style={contained ? { top: stickyStackTopPx } : { top: stickyStackTopPx, ...plateStyle }}
    >
      {contained ? (
        <div
          className={`${hmChromeContainedShellClass("hm-site-header-band__plate border-b")} ${
            useLightText ? "text-white" : "text-slate-900"
          }`}
          style={plateStyle}
        >
          {innerRow}
        </div>
      ) : (
        <div className={`${useLightText ? "text-white" : "text-slate-900"} ${corporateHeader ? "w-full" : "mx-auto max-w-screen-xl"}`}>
          {innerRow}
        </div>
      )}
    </div>
  );
}
