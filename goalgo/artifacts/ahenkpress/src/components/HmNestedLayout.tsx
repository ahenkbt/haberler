import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { HmPublicSiteHeader } from "@/components/HmPublicSiteHeader";
import { HmPublicSiteFooter } from "@/components/HmPublicSiteFooter";
import { HmFooterMarketSearchBand } from "@/components/HmFooterMarketSearchBand";
import { hasConfiguredHmHeaderMenu } from "@/lib/hmCorporateNavMenu";
import { parseNewsSiteLayoutFromJson, normalizeHmVitrinTheme, resolveFinanceWeatherBelowMenu, resolveHeaderPreset, resolveHmNewsHeaderMenuEnabled, resolveHmNewsVideoTvEnabled, resolveShowYekpareIconMenu } from "@/lib/newsSiteLayout";
import { AppNav, APP_MOBILE_BOTTOM_NAV_HEIGHT, APP_NAV_HEIGHT } from "@/components/AppNav";
import { HmPublicNewsNavStrip, HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX } from "@/components/HmPublicNewsNavStrip";
import {
  HmSumbulCategoryNavStrip,
  HM_SUMBUL_CATEGORY_NAV_STRIP_HEIGHT_PX,
} from "@/components/HmSumbulCategoryNavStrip";
import { HmMobileBottomNav, HM_MOBILE_BOTTOM_NAV_HEIGHT_PX } from "@/components/HmMobileBottomNav";
import { HmSonDakikaChromeBand } from "@/components/HmSonDakikaChromeBand";
import { HmFinanceWeatherPlacementBand } from "@/components/HmFinanceWeatherPlacementBand";
import { HmVideoTvChromeStack } from "@/components/HmVideoTvChromeStack";
import { HmBilgiAgaciChromeBand } from "@/components/HmBilgiAgaciChromeBand";
import { HM_BILGI_AGACI_CHROME_BAND_HEIGHT_PX, isHmBilgiAgaciPublicPath } from "@/lib/bilgiAgaciHmRoutes";
import { isHmHaritalarPublicPath, isHmNewsmapPublicPath } from "@/lib/hmHaritalarRoutes";
import { HmPublicLinkProvider } from "@/contexts/HmPublicLinkContext";
import { HmDeferredAdSlotStrip } from "@/components/HmDeferredAdSlotStrip";
import { useHmDomainSlugFromHost } from "@/hooks/useHmDomainSlugFromHost";
import { HmChromeWidthShell } from "@/components/HmChromeWidthShell";
import { isDefaultPortalHost, isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { applyHmSiteVerificationMeta, applyHmSiteBranding, type HmSeoVerification } from "@/lib/pageSeo";
import { applyHmEarlyBrandingFromMeta, hmSiteBrandingIconUrl } from "@/lib/hmEarlyBranding";
import {
  readHmNestedMetaCache,
  writeHmNestedMetaCache,
  writeHmDomainSlugCache,
  normalizeHmSlugSegment,
  hmSiteDisplayNameFromMeta,
  hmSiteIconUrlFromLayout,
  type HmNestedMetaCached,
} from "@/lib/hmNestedMetaStorage";
import { resolveExternalSondakikaEnabled } from "@/lib/hmHeadlinePool";
import { HM_SITE_LOADING_LABEL } from "@/lib/hmNewsPlaceholder";
import { hmPublicSiteOrigin, resolveHmPublicDomainFromSite } from "@/lib/hmPublicLinks";
import {
  hmEditorContainedPageHostClass,
  isHmEditorPageForContainedHost,
  isHmHeaderChromeContained,
  isHmSiteLayoutContained,
  normalizeHmChromeHex,
  resolveEditorHmEffectiveChromeColorMode,
  resolveHmFooterBackgroundHex,
  resolveHmFooterHeadingHex,
  resolveHmNavLinkColor,
  resolveHmTickerGlassSurface,
} from "@/lib/hmChromeLayout";
import { HmChromeThemeProvider, useHmChromeThemeOptional } from "@/contexts/HmChromeThemeContext";
import { resolveHmColorPalette, resolveHmCategoryColorCssVars, resolveHmEditorAccentCssVars } from "@/lib/hmVitrinThemeTokens";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isHmReservedRouteSegment, isLikelyHmExtraPagePublicPath } from "@/lib/hmExtraPageLookup";
import { clearHmNestedMetaCache } from "@/lib/hmNestedMetaCache";
import { HM_LAYOUT_UPDATED_EVENT } from "@/lib/hmLayoutUpdatedEvent";
import { useIsMobile, useIsHmCompactViewport } from "@/hooks/use-mobile";
import { resolveIsHmSiteHomeRoot } from "@/hooks/useIsHmSiteHomeRoot";
import HmEditorIndexLandingPage from "@/pages/public/HmEditorIndexLandingPage";
import "@/styles/hmIndexLanding.css";
import "@/styles/hmMobileShell.css";

/** `HmPublicSiteHeader` bandı (mobilde daha yüksek logo + son dakika); şerit bunun altında sticky kalır. */
const HM_PUBLIC_HEADER_BAND_PX = 72;

const FETCH_TIMEOUT_MS = 18_000;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const HM_VITRIN_THEMES_WITH_CSS_TOKENS = new Set([
  "ankara",
  "gold",
  "classic",
  "portal3",
  "esen",
  "manset24",
  "renkli",
  "ahenkhaber",
  "modern",
  "sumbul",
  "corporate",
]);

async function fetchWithDeadline(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => {
    ctrl.abort(new DOMException(`fetch exceeded ${ms}ms`, "TimeoutError"));
  }, ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

function browserHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase().split(":")[0] ?? "";
}

function mixCss(hex: string, amount: number, other: string): string {
  return `color-mix(in srgb, ${hex} ${amount}%, ${other})`;
}

function premiumPaletteVars(
  palette: "red" | "gold" | "blue",
  logoBgHex: string | null,
  navBgHex: string | null,
  vitrinTheme: string | undefined,
): CSSProperties {
  const basePalettes = {
    red: {
      accent: "#c40021",
      accent2: "#7a0014",
      brand: "#d4af37",
      header: "#0d0b0b",
      nav: "#171111",
      page: "#ffffff",
      muted: "#ffffff",
      soft: "#fde8ec",
      tickerText: "#d8d1c7",
    },
    gold: {
      accent: "#d4af37",
      accent2: "#735a0e",
      brand: "#f4d77d",
      header: "#0f0c08",
      nav: "#1a140b",
      page: "#ffffff",
      muted: "#ffffff",
      soft: "#f7efd8",
      tickerText: "#d7c8aa",
    },
    blue: {
      accent: "#0d63b6",
      accent2: "#0f766e",
      brand: "#d4af37",
      header: "#061a33",
      nav: "#08294f",
      page: "#ffffff",
      muted: "#ffffff",
      soft: "#dbeafe",
      tickerText: "#c7e5ef",
    },
  } as const;
  const picked = basePalettes[palette];
  const accent = picked.accent;
  const base = navBgHex || logoBgHex || picked.nav;
  const headerBase = logoBgHex || base;
  const navBase = navBgHex || base;
  const headerDark = logoBgHex ? mixCss(headerBase, 44, "#020617") : picked.header;
  const navDark = navBgHex ? mixCss(navBase, 50, "#020617") : picked.nav;
  const footerDark = resolveHmFooterBackgroundHex(palette, logoBgHex, navBgHex, vitrinTheme);
  const footerHeading = resolveHmFooterHeadingHex(vitrinTheme, picked.brand);

  return {
    "--hm-accent": accent,
    "--hm-accent-2": picked.accent2,
    "--hm-brand-label": picked.brand,
    "--hm-header-bg": headerDark,
    "--hm-strip-bg": logoBgHex ? mixCss(headerBase, 38, "#020617") : picked.header,
    "--hm-nav-strip-bg": navDark,
    "--hm-footer-bg": footerDark,
    "--hm-footer-text": "rgba(226, 232, 240, 0.88)",
    "--hm-footer-heading": footerHeading,
    "--hm-footer-link": "rgba(255, 255, 255, 0.92)",
    "--hm-footer-link-hover": palette === "blue" ? accent : picked.brand,
    "--hm-ticker-bg": logoBgHex ? mixCss(headerBase, 48, "#020617") : picked.header,
    "--hm-ticker-rail": navBgHex ? mixCss(navBase, 44, "#020617") : picked.nav,
    "--hm-ticker-text": picked.tickerText,
    "--hm-ticker-sep": mixCss(picked.brand, 42, "transparent"),
    "--hm-ticker-text-hover": "#ffffff",
    "--hm-page-bg": picked.page,
    "--hm-page-muted": picked.muted,
    "--hm-header-muted": "rgba(255,255,255,0.58)",
    "--hm-header-code": "rgba(255,255,255,0.74)",
    "--hm-header-border": mixCss(picked.brand, palette === "blue" ? 28 : 36, "rgba(255,255,255,0.08)"),
    "--hm-header-accent-line": mixCss(picked.brand, palette === "blue" ? 70 : 58, "transparent"),
    "--hm-nav-strip-border": mixCss(accent, 28, "rgba(255,255,255,0.1)"),
    "--hm-nav-pill-bg": "rgba(255,255,255,0.07)",
    "--hm-nav-pill-hover": mixCss(palette === "gold" ? picked.brand : accent, 26, "rgba(255,255,255,0.08)"),
    "--hm-accent-soft": picked.soft,
    "--hm-text-on-dark": "#ffffff",
    "--hm-card-bg": "#ffffff",
    "--hm-card-border": mixCss(accent, 20, "rgba(15,23,42,0.08)"),
    "--hm-card-shadow": "0 1px 0 rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.08)",
    "--hm-card-shadow-hover": "0 14px 40px rgba(15,23,42,0.13)",
    "--hm-card-radius": "0.85rem",
    "--hm-section-line": mixCss(accent, 20, "rgba(15,23,42,0.08)"),
    "--hm-section-accent-glow": mixCss(palette === "blue" ? picked.brand : accent, 36, "transparent"),
    "--hm-latest-divide": mixCss(accent, 12, "rgba(15,23,42,0.06)"),
    "--hm-hero-overlay": `linear-gradient(to top, rgba(2, 6, 23, 0.9) 0%, ${mixCss(accent, 20, "rgba(2,6,23,0.38)")} 52%, transparent 100%)`,
    "--hm-cat-hover-bg": mixCss(accent, 12, "transparent"),
    "--hm-cat-hover-text": picked.accent2,
    "--hm-corporate-surface-dark": headerDark,
    "--hm-corporate-surface-darker": logoBgHex ? mixCss(headerBase, 30, "#020617") : mixCss(picked.header, 82, "#020617"),
    "--hm-corporate-surface-nav": navDark,
  } as CSSProperties;
}

export type HmNestedMeta = HmNestedMetaCached & {
  contact: { phone?: string; email?: string; address?: string; notes?: string } | null;
  createdAt: string;
  layoutUpdatedAt?: string | null;
  seoVerification?: HmSeoVerification | null;
};

function isUsableHmNestedMeta(meta: HmNestedMeta, expectedSlug: string): boolean {
  const metaSlug = normalizeHmSlugSegment(meta?.slug ?? "");
  const pathSlug = normalizeHmSlugSegment(expectedSlug);
  return Boolean(
    pathSlug &&
      metaSlug &&
      typeof meta?.id === "number" &&
      Number.isFinite(meta.id) &&
      meta.id > 0,
  );
}

async function readHmNestedMetaJson(r: Response, expectedSlug: string): Promise<HmNestedMeta> {
  const ct = (r.headers.get("content-type") ?? "").toLowerCase();
  const text = await r.text();
  if (!ct.includes("json")) {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(snippet ? `invalid_json:${snippet}` : "invalid_json");
  }
  let meta: HmNestedMeta;
  try {
    meta = JSON.parse(text) as HmNestedMeta;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse";
    throw new Error(`invalid_json:${msg.slice(0, 180)}`);
  }
  if (r.headers.get("x-yekpare-api-degraded") === "1" || !isUsableHmNestedMeta(meta, expectedSlug)) {
    throw new Error("degraded_api");
  }
  return meta;
}

/** İlk ziyaret: API gelene kadar logo + site adı ile yükleme ekranı. */
function HmNestedLoadingShell({ slug, early }: { slug: string; early?: HmNestedMetaCached | null }) {
  const { displayName, logoUrl } = useMemo(() => {
    if (early) {
      const layoutPrefs = parseNewsSiteLayoutFromJson(
        early.layout != null ? JSON.stringify(early.layout) : null,
        early.slug,
      );
      const rawIcon = hmSiteBrandingIconUrl(layoutPrefs) ?? hmSiteIconUrlFromLayout(early.layout);
      const icon = rawIcon ? resolveClientMediaSrc(rawIcon) || rawIcon : null;
      return { displayName: hmSiteDisplayNameFromMeta(early), logoUrl: icon };
    }
    const s = normalizeHmSlugSegment(slug);
    const label = !s
      ? "Haber Merkezi"
      : s
          .split("-")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
    return { displayName: label, logoUrl: null };
  }, [slug, early]);

  return (
    <div
      className="hm-nested-loading-shell flex min-h-[100dvh] min-w-0 flex-1 flex-col items-center justify-center bg-white px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="mx-auto mb-5 h-20 w-auto max-w-[220px] object-contain"
          />
        ) : (
          <div className="mx-auto mb-5 h-20 w-20 animate-pulse rounded-2xl bg-slate-200" />
        )}
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{displayName}</h1>
        <p className="mt-3 text-sm font-medium text-slate-600">{HM_SITE_LOADING_LABEL}</p>
        <div className="mx-auto mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}

async function loadHmNestedMeta(pathSlugRaw: string, includePageContent = false): Promise<HmNestedMeta> {
  const pathSlug = normalizeHmSlugSegment(pathSlugRaw);
  if (!pathSlug) throw new Error("empty_slug");

  const host = browserHostname();
  const params = new URLSearchParams();
  if (host && !isDefaultPortalHost(host)) params.set("domain", host);
  if (includePageContent) params.set("includePageContent", "1");
  const query = params.toString() ? `?${params.toString()}` : "";
  const r1 = await fetchWithDeadline(
    apiUrl(`/api/hm/meta/by-slug/${encodeURIComponent(pathSlug)}${query}`),
    FETCH_TIMEOUT_MS,
  );

  if (r1.ok) {
    return readHmNestedMetaJson(r1, pathSlug);
  }

  if (r1.status === 404 || r1.status === 400) throw new Error("notfound");
  const errText = await r1.text().catch(() => "");
  throw new Error(errText.replace(/\s+/g, " ").trim().slice(0, 220) || `http_${r1.status}`);
}

function formatHmNestedLoadError(err: unknown): string {
  if (!(err instanceof Error)) return "Yükleme başarısız.";
  const m = err.message;
  if (m === "notfound") return "Bu slug ile kayıtlı haber sitesi bulunamadı (veya site pasif).";
  if (m === "empty_slug") return "Geçersiz adres.";
  if (m === "degraded_api") return "Haber merkezi geçici olarak yüklenemiyor. API yeniden hazır olduşunda sayfa otomatik düzelecek.";
  if (m.startsWith("invalid_json:"))
    return "API yanıtı JSON deşil (çoşunlukla /api vekili veya önbellek HTML'i). Sunucu yönlendirmesini kontrol edin.";
  if (err.name === "TimeoutError" || m.includes("AbortError") || m.includes("aborted"))
    return "Sunucu yanıt vermedi (zaman aşımı). API adresi ve aş başlantısını kontrol edin.";
  return m.length > 240 ? `${m.slice(0, 240)}…` : m;
}

/**
 * `/tr/:slug` ve alt sayfalar için ortak: meta sorgusu, SEO, link başlamı, üst/alt şerit.
 */
function isEditorManagedContentRoute(pathname: string): boolean {
  const path = String(pathname ?? "").split("?")[0]?.replace(/\/+$/, "") ?? "";
  if (/\/sayfa\//.test(path)) return true;
  const m = path.match(new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/[^/]+/([^/?#]+)$`, "i"));
  if (m?.[1] && !isHmReservedRouteSegment(m[1])) return true;
  if (isLikelyHmExtraPagePublicPath(path)) return true;
  return false;
}

function isHmVideoTvPublicPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  return /\/video-tv(?:\/|$)/.test(path);
}

function isHmIndexLandingEnabled(layout: unknown, parsedEnabled: boolean): boolean {
  if (layout && typeof layout === "object" && !Array.isArray(layout)) {
    const raw = (layout as Record<string, unknown>).hmNewsIndexLandingEnabled;
    if (raw === true || raw === 1 || raw === "true" || raw === "1") return true;
  }
  return parsedEnabled === true;
}

export function HmNestedLayout({
  children,
  hideFooter: hideFooterProp = false,
  indexLandingGate = false,
}: {
  children: React.ReactNode;
  /** Video TV gibi tam ekran gömülü sayfalarda haber sitesi alt footer gizlenir. */
  hideFooter?: boolean;
  /** Anasayfa kökünde dinamik index giriş ekranı (yalnızca HmSitePublic). */
  indexLandingGate?: boolean;
}) {
  const params = useParams<{ slug: string }>();
  const resolvedSlug = useHmDomainSlugFromHost();
  const [location] = useLocation();
  const slug = String(resolvedSlug || params?.slug || "").trim();
  const hostKey = typeof window !== "undefined" ? browserHostname() : "";
  const needsFreshMeta = isEditorManagedContentRoute(location.split("?")[0] ?? "");
  const headerBandRef = useRef<HTMLDivElement>(null);
  const [headerBandPx, setHeaderBandPx] = useState(HM_PUBLIC_HEADER_BAND_PX);

  const queryClient = useQueryClient();
  const storedMeta = useMemo(() => readHmNestedMetaCache(slug), [slug]);
  const pathOnlyForHome = (location.split("?")[0] ?? "/").trim();
  const isHomeRoot = resolveIsHmSiteHomeRoot(pathOnlyForHome, slug);
  const [indexLandingDismissed, setIndexLandingDismissed] = useState(false);

  useEffect(() => {
    const onLayoutUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<{ slug?: string }>).detail;
      const norm = normalizeHmSlugSegment(detail?.slug ?? "");
      if (!norm || norm !== normalizeHmSlugSegment(slug)) return;
      clearHmNestedMetaCache(slug);
      void queryClient.invalidateQueries({ queryKey: ["hm-nested-meta", slug] });
    };
    window.addEventListener(HM_LAYOUT_UPDATED_EVENT, onLayoutUpdated);
    return () => window.removeEventListener(HM_LAYOUT_UPDATED_EVENT, onLayoutUpdated);
  }, [queryClient, slug]);

  const { data, error } = useQuery({
    queryKey: ["hm-nested-meta", slug, hostKey, needsFreshMeta ? "full" : "slim"],
    queryFn: () => loadHmNestedMeta(slug, needsFreshMeta),
    enabled: slug.length > 0,
    // Anasayfa ilk boyamasını meta refetch ile bloklamayın; layout event ile invalidate edilir.
    staleTime: indexLandingGate && isHomeRoot ? 5 * 60 * 1000 : needsFreshMeta ? 0 : 60 * 1000,
    refetchOnMount: needsFreshMeta ? "always" : true,
    refetchOnWindowFocus: needsFreshMeta,
    retry: 1,
    retryDelay: 1500,
  });

  useEffect(() => {
    if (!data) return;
    writeHmNestedMetaCache(slug, data);
    for (const d of [data.domain, data.domain2 ?? null, data.domain3 ?? null]) {
      if (typeof d === "string" && d.trim()) writeHmDomainSlugCache(d, data.slug);
    }
  }, [data, slug]);

  useLayoutEffect(() => {
    const early = data ?? storedMeta?.data;
    if (!early) return;
    try {
      applyHmEarlyBrandingFromMeta(early, slug);
    } catch (brandingErr) {
      console.warn("[HmNestedLayout] early branding skipped", brandingErr);
    }
  }, [slug, data, storedMeta?.data]);

  /** API gelene kadar önbellek meta ile tam kabuk — boş beyaz iskelet flash'ını önler. */
  const effectiveData = (data ?? storedMeta?.data) as HmNestedMeta | undefined;

  const layoutPrefs = useMemo(
    () => parseNewsSiteLayoutFromJson(effectiveData?.layout != null ? JSON.stringify(effectiveData.layout) : null, effectiveData?.slug),
    [effectiveData?.layout, effectiveData?.slug],
  );

  const indexLandingEnabled = effectiveData
    ? isHmIndexLandingEnabled(effectiveData.layout, layoutPrefs.hmNewsIndexLandingEnabled === true)
    : false;
  const showIndexLanding =
    Boolean(effectiveData) &&
    indexLandingGate &&
    isHomeRoot &&
    !indexLandingDismissed &&
    indexLandingEnabled;

  useLayoutEffect(() => {
    if (!effectiveData) return;
    document.documentElement.removeAttribute("data-hm-manset-variant-early");
    document.documentElement.removeAttribute("data-hm-vitrin-theme-early");
  }, [effectiveData?.id, layoutPrefs.mansetVariant, layoutPrefs.hmVitrinTheme]);

  useEffect(() => {
    if (!effectiveData) return;
    applyHmSiteVerificationMeta((effectiveData.seoVerification as HmSeoVerification | null | undefined) ?? null);
    return () => applyHmSiteVerificationMeta(null);
  }, [effectiveData?.seoVerification, effectiveData]);

  useEffect(() => {
    if (!effectiveData) return;
    const iconRaw = hmSiteBrandingIconUrl(layoutPrefs);
    applyHmSiteBranding({
      logoUrl: iconRaw ? resolveClientMediaSrc(iconRaw) || iconRaw : null,
      siteOrigin: hmPublicSiteOrigin(effectiveData.domain),
      domain: effectiveData.domain,
      siteDisplayName: effectiveData.displayName,
    });
  }, [effectiveData?.domain, effectiveData?.id, layoutPrefs.faviconUrl, layoutPrefs.logoUrl]);

  const showPlatformNav = layoutPrefs.showPlatformNav === true;
  const portalHubOnly = isYekparePortalHubOnly(browserHostname(), slug);
  const isCorporateTheme = layoutPrefs.hmVitrinTheme === "corporate";
  const isClassicTheme = layoutPrefs.hmVitrinTheme === "classic";
  const isPortal3Theme = layoutPrefs.hmVitrinTheme === "portal3";
  const isEsenTheme = layoutPrefs.hmVitrinTheme === "esen";
  const isSumbulTheme = normalizeHmVitrinTheme(layoutPrefs.hmVitrinTheme) === "sumbul";
  const isStandardNewsTheme = !isCorporateTheme && !isClassicTheme && !isPortal3Theme && !isEsenTheme;
  const siteLayoutWidth = isHmSiteLayoutContained(layoutPrefs) ? "contained" : "full";
  const corporateLayoutWidth = isCorporateTheme ? siteLayoutWidth : undefined;
  const showNewsHeaderMenu = resolveHmNewsHeaderMenuEnabled(layoutPrefs);
  const showStripMenu = layoutPrefs.hmNewsStripMenuEnabled === true;
  const pathOnly = (location.split("?")[0] ?? "").trim();
  const isVideoTvPage = portalHubOnly && isHmVideoTvPublicPath(pathOnly);
  const showHaritalarEmbed =
    portalHubOnly && (isHmHaritalarPublicPath(pathOnly) || isHmNewsmapPublicPath(pathOnly));
  const showYekpareIconMenu = resolveShowYekpareIconMenu(layoutPrefs);
  const editorHeaderMenuConfigured = hasConfiguredHmHeaderMenu(layoutPrefs);
  const showSumbulCategoryNav =
    (isSumbulTheme || showYekpareIconMenu) &&
    !isCorporateTheme &&
    !isVideoTvPage &&
    !showHaritalarEmbed &&
    !editorHeaderMenuConfigured;
  const showNewsmapBranding = isHmNewsmapPublicPath(pathOnly);
  const isMobileViewport = useIsMobile();
  const isCompactViewport = useIsHmCompactViewport();
  /** Logo menü veya Yekpare/Sümbül kategori şeridi — logo bandının altında. */
  const showTopNewsNavStrip = showNewsHeaderMenu && !showSumbulCategoryNav;
  const showSumbulNavStrip = showSumbulCategoryNav;
  const headerPreset = resolveHeaderPreset(layoutPrefs);
  const financeBelowMenu = resolveFinanceWeatherBelowMenu(layoutPrefs);
  const showMobileBottomNav =
    showStripMenu && isCompactViewport && !isVideoTvPage && !isCorporateTheme && !showHaritalarEmbed;
  const hidePlatformNavOnVideoTvMobile = isVideoTvPage && isMobileViewport;
  const showNewsFooter =
    !hideFooterProp &&
    !isVideoTvPage &&
    !showHaritalarEmbed &&
    (isCorporateTheme || layoutPrefs.hmNewsFooterEnabled !== false);
  const stackTopPx = showPlatformNav && !hidePlatformNavOnVideoTvMobile ? APP_NAV_HEIGHT : 0;
  const showBilgiAgaciChrome = portalHubOnly && isHmBilgiAgaciPublicPath(pathOnly);
  const videoTvChromeHeaderPx = isVideoTvPage ? 0 : headerBandPx;
  const newsStripStickyTopPx = stackTopPx + videoTvChromeHeaderPx;
  const categoryNavStripHeightPx = showSumbulNavStrip
    ? HM_SUMBUL_CATEGORY_NAV_STRIP_HEIGHT_PX
    : showTopNewsNavStrip
      ? HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX
      : 0;
  const afterNavStickyTopPx = newsStripStickyTopPx + categoryNavStripHeightPx;
  const bilgiAgaciChromeStickyTopPx = afterNavStickyTopPx;
  const sonDakikaChromeStickyTopPx = showBilgiAgaciChrome
    ? afterNavStickyTopPx + HM_BILGI_AGACI_CHROME_BAND_HEIGHT_PX
    : afterNavStickyTopPx;
  const logo = layoutPrefs.logoUrl?.trim();
  const vitrinThemeAttr =
    layoutPrefs.hmVitrinTheme === "news" ||
    layoutPrefs.hmVitrinTheme === "classic" ||
    layoutPrefs.hmVitrinTheme === "portal3" ||
    layoutPrefs.hmVitrinTheme === "esen" ||
    layoutPrefs.hmVitrinTheme === "manset24" ||
    layoutPrefs.hmVitrinTheme === "renkli" ||
    layoutPrefs.hmVitrinTheme === "modern" ||
    layoutPrefs.hmVitrinTheme === "sumbul" ||
    layoutPrefs.hmVitrinTheme === "ahenkhaber" ||
    layoutPrefs.hmVitrinTheme === "ankara" ||
    layoutPrefs.hmVitrinTheme === "gold" ||
    layoutPrefs.hmVitrinTheme === "corporate"
      ? layoutPrefs.hmVitrinTheme
      : undefined;
  const primaryHex = HEX_COLOR.test((layoutPrefs.hmPrimaryColor ?? "").trim()) ? layoutPrefs.hmPrimaryColor!.trim() : "";
  const secondaryHex = HEX_COLOR.test((layoutPrefs.hmSecondaryColor ?? "").trim()) ? layoutPrefs.hmSecondaryColor!.trim() : "";
  const logoBgHex = normalizeHmChromeHex(layoutPrefs.hmLogoBarBackground ?? null);
  const navBgHex = normalizeHmChromeHex(layoutPrefs.hmNavBarBackground ?? null);
  const resolvedPalette = resolveHmColorPalette(layoutPrefs.hmColorPalette, primaryHex, layoutPrefs.hmVitrinTheme);
  const vitrinHasCssTokens =
    Boolean(vitrinThemeAttr) && HM_VITRIN_THEMES_WITH_CSS_TOKENS.has(String(vitrinThemeAttr));
  const editorAccentVars = resolveHmEditorAccentCssVars(primaryHex, secondaryHex, vitrinThemeAttr);
  const categoryColorVars = resolveHmCategoryColorCssVars(layoutPrefs.hmCategoryColors ?? null);
  const useFullPremiumPalette =
    !vitrinHasCssTokens && (Boolean(logoBgHex) || Boolean(navBgHex) || Boolean(primaryHex));
  const paletteVars = useFullPremiumPalette
    ? premiumPaletteVars(resolvedPalette, logoBgHex, navBgHex, vitrinThemeAttr)
    : ({} as CSSProperties);
  const rootStyleBase = {
    ...(showPlatformNav
      ? {
          paddingBottom: `calc(${APP_MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
        }
      : {}),
    ...paletteVars,
    ...editorAccentVars,
    ...categoryColorVars,
  } as CSSProperties;

  useLayoutEffect(() => {
    const el = headerBandRef.current;
    if (!el) return undefined;

    const updateHeaderHeight = () => {
      const next = Math.ceil(el.getBoundingClientRect().height);
      if (next > 0) {
        setHeaderBandPx((prev) => (prev === next ? prev : next));
      }
    };

    updateHeaderHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeaderHeight);
      return () => window.removeEventListener("resize", updateHeaderHeight);
    }

    const ro = new ResizeObserver(updateHeaderHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [effectiveData?.id, logo, showPlatformNav]);

  if (!slug) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">
        Geçersiz adres
      </div>
    );
  }

  if (error && !effectiveData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-medium">{formatHmNestedLoadError(error)}</p>
        <Button variant="outline" asChild>
          <Link href="/">Anasayfa</Link>
        </Button>
      </div>
    );
  }

  if (!effectiveData) {
    return <HmNestedLoadingShell slug={slug} early={storedMeta?.data ?? null} />;
  }

  const pathSlugNorm = normalizeHmSlugSegment(slug);
  const metaSlugNorm = normalizeHmSlugSegment(effectiveData.slug);
  if (pathSlugNorm && metaSlugNorm && pathSlugNorm !== metaSlugNorm) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-medium">Bu haber sitesi bu alan adına ait deşil.</p>
        <Button variant="outline" asChild>
          <Link href="/">Anasayfa</Link>
        </Button>
      </div>
    );
  }

  const publicDomain = resolveHmPublicDomainFromSite(
    { domain: effectiveData.domain, domain2: effectiveData.domain2 ?? null, domain3: effectiveData.domain3 ?? null },
    hostKey,
  );

  const linkProviderValue = {
    siteId: effectiveData.id,
    slug: effectiveData.slug,
    domain: effectiveData.domain,
    domain2: effectiveData.domain2 ?? null,
    domain3: effectiveData.domain3 ?? null,
    displayName: effectiveData.displayName,
    description: effectiveData.description ?? null,
    seoVerification: (effectiveData.seoVerification as HmSeoVerification | null | undefined) ?? null,
    layoutPrefs,
    contact: effectiveData.contact ?? null,
  };

  if (showIndexLanding) {
    const indexOverlay =
      typeof document !== "undefined" ? (
        createPortal(
          <div className="hm-index-landing-overlay" role="dialog" aria-modal="true" aria-label="Site giriş sayfası">
            <HmEditorIndexLandingPage onEnterSite={() => setIndexLandingDismissed(true)} />
          </div>,
          document.body,
        )
      ) : null;

    return (
      <HmPublicLinkProvider value={linkProviderValue}>
        {indexOverlay}
        <div className="hm-index-landing-preload" aria-hidden>
          {children}
        </div>
      </HmPublicLinkProvider>
    );
  }

  return (
    <HmPublicLinkProvider
      value={linkProviderValue}
    >
      <HmChromeThemeProvider layoutPrefs={layoutPrefs}>
        <HmNestedLayoutVitrinRoot
          layoutPrefs={layoutPrefs}
          vitrinThemeAttr={vitrinThemeAttr}
          siteLayoutWidth={siteLayoutWidth}
          corporateLayoutWidth={corporateLayoutWidth}
          rootStyleBase={rootStyleBase}
          isStandardNewsTheme={isStandardNewsTheme}
          isCorporateTheme={isCorporateTheme}
          showPlatformNav={showPlatformNav}
          showNewsHeaderMenu={showNewsHeaderMenu}
          showTopNewsNavStrip={showTopNewsNavStrip}
          showSumbulNavStrip={showSumbulNavStrip}
          showYekpareIconMenu={showYekpareIconMenu}
          financeBelowMenu={financeBelowMenu}
          headerPreset={headerPreset}
          afterNavStickyTopPx={afterNavStickyTopPx}
          showMobileBottomNav={showMobileBottomNav}
          showBilgiAgaciChrome={showBilgiAgaciChrome}
          showHaritalarEmbed={showHaritalarEmbed}
          showNewsmapBranding={showNewsmapBranding}
          showNewsFooter={showNewsFooter}
          isVideoTvPage={isVideoTvPage}
          effectiveData={effectiveData}
          publicDomain={publicDomain}
          logo={logo}
          stackTopPx={stackTopPx}
          headerBandRef={headerBandRef}
          newsStripStickyTopPx={newsStripStickyTopPx}
          bilgiAgaciChromeStickyTopPx={bilgiAgaciChromeStickyTopPx}
          sonDakikaChromeStickyTopPx={sonDakikaChromeStickyTopPx}
          pathOnly={pathOnlyForHome}
          isHomeRoot={isHomeRoot}
        >
          {children}
        </HmNestedLayoutVitrinRoot>
      </HmChromeThemeProvider>
    </HmPublicLinkProvider>
  );
}

type HmNestedLayoutVitrinRootProps = {
  layoutPrefs: ReturnType<typeof parseNewsSiteLayoutFromJson>;
  vitrinThemeAttr: string | undefined;
  siteLayoutWidth: "contained" | "full";
  corporateLayoutWidth: "contained" | "full" | undefined;
  rootStyleBase: CSSProperties;
  isStandardNewsTheme: boolean;
  isCorporateTheme: boolean;
  showPlatformNav: boolean;
  showNewsHeaderMenu: boolean;
  showTopNewsNavStrip: boolean;
  showSumbulNavStrip: boolean;
  showYekpareIconMenu: boolean;
  financeBelowMenu: boolean;
  headerPreset: ReturnType<typeof resolveHeaderPreset>;
  afterNavStickyTopPx: number;
  showMobileBottomNav: boolean;
  showBilgiAgaciChrome: boolean;
  showHaritalarEmbed: boolean;
  showNewsmapBranding: boolean;
  showNewsFooter: boolean;
  isVideoTvPage: boolean;
  effectiveData: HmNestedMetaCached;
  publicDomain: string | null;
  logo: string | undefined;
  stackTopPx: number;
  headerBandRef: RefObject<HTMLDivElement | null>;
  newsStripStickyTopPx: number;
  bilgiAgaciChromeStickyTopPx: number;
  sonDakikaChromeStickyTopPx: number;
  pathOnly: string;
  isHomeRoot: boolean;
  children: ReactNode;
};

function HmNestedLayoutVitrinRoot({
  layoutPrefs,
  vitrinThemeAttr,
  siteLayoutWidth,
  corporateLayoutWidth,
  rootStyleBase,
  isStandardNewsTheme,
  isCorporateTheme,
  showPlatformNav,
  showNewsHeaderMenu,
  showTopNewsNavStrip,
  showSumbulNavStrip,
  showYekpareIconMenu,
  financeBelowMenu,
  headerPreset,
  afterNavStickyTopPx,
  showMobileBottomNav,
  showBilgiAgaciChrome,
  showHaritalarEmbed,
  showNewsmapBranding,
  showNewsFooter,
  isVideoTvPage,
  effectiveData,
  publicDomain,
  logo,
  stackTopPx,
  headerBandRef,
  newsStripStickyTopPx,
  bilgiAgaciChromeStickyTopPx,
  sonDakikaChromeStickyTopPx,
  pathOnly,
  isHomeRoot,
  children,
}: HmNestedLayoutVitrinRootProps) {
  const themeCtx = useHmChromeThemeOptional();
  const isMobile = useIsMobile();
  const isCompactViewport = useIsHmCompactViewport();
  /** Video TV mobil: yalnızca içerik alanı tam ekran; haber menü şeridi görünür kalır. */
  const immersiveVideoTvMain = isVideoTvPage && isMobile;
  const hidePlatformNavOnVideoTvMobile = immersiveVideoTvMain;
  const chromeLayoutPrefs = themeCtx?.mergedLayoutPrefs ?? layoutPrefs;
  const effectiveChromeMode = themeCtx?.effectiveChromeMode ?? resolveEditorHmEffectiveChromeColorMode(layoutPrefs);
  const navLinkColors = useMemo(() => resolveHmNavLinkColor(chromeLayoutPrefs), [chromeLayoutPrefs]);
  const breakingTickerGlass = useMemo(
    () => resolveHmTickerGlassSurface(chromeLayoutPrefs, "breaking"),
    [chromeLayoutPrefs],
  );
  const financeTickerGlass = useMemo(
    () => resolveHmTickerGlassSurface(chromeLayoutPrefs, "finance"),
    [chromeLayoutPrefs],
  );
  const showExternalSondakika = resolveExternalSondakikaEnabled(layoutPrefs, {
    siteId: effectiveData?.id ?? null,
    mansetVariant: layoutPrefs.mansetVariant,
  });

  useEffect(() => {
    if (!immersiveVideoTvMain || typeof document === "undefined") return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
    };
  }, [immersiveVideoTvMain]);

  const showVideoTvLink = resolveHmNewsVideoTvEnabled(layoutPrefs);
  const useContainedEditorPageHost =
    siteLayoutWidth === "contained" && isHmEditorPageForContainedHost(pathOnly, isHomeRoot);
  const mainChildren = useContainedEditorPageHost ? (
    <div className={hmEditorContainedPageHostClass("min-w-0")}>{children}</div>
  ) : (
    children
  );
  const showFooterMarketBand =
    showNewsFooter &&
    isCompactViewport &&
    (layoutPrefs.hmNewsStripMenuEnabled === true || showSumbulNavStrip);
  const headerChromeWidth = isHmHeaderChromeContained(layoutPrefs) ? "contained" : "full";
  const mobileBottomNavPadding = showMobileBottomNav
    ? `calc(${HM_MOBILE_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`
    : undefined;
  const rootStyle = {
    ...rootStyleBase,
    ...(immersiveVideoTvMain
      ? {
          paddingBottom: 0,
          height: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
        }
      : showMobileBottomNav
        ? { paddingBottom: mobileBottomNavPadding }
        : {}),
    ["--hm-nav-link-muted" as string]: navLinkColors.muted,
    ["--hm-nav-link-active" as string]: navLinkColors.active,
    ["--hm-nav-pill-idle-text" as string]: navLinkColors.pillText,
    ["--hm-nav-pill-active-text" as string]: navLinkColors.activePillText,
    ["--hm-nav-link-hover" as string]: navLinkColors.linkHover,
  } as CSSProperties;

  return (
    <div
      className="hm-vitrin-root flex min-h-[100dvh] min-w-0 w-full flex-1 flex-col"
      data-hm-vitrin-theme={vitrinThemeAttr}
      data-hm-video-tv={isVideoTvPage ? "true" : undefined}
      data-hm-video-tv-immersive={immersiveVideoTvMain ? "true" : undefined}
      data-hm-chrome-mode={effectiveChromeMode}
      data-hm-nav-on-light={navLinkColors.onLight ? "true" : "false"}
      data-hm-ticker-glass-breaking={breakingTickerGlass}
      data-hm-ticker-glass-finance={financeTickerGlass}
      data-hm-manset-variant={layoutPrefs.mansetVariant ?? "split"}
      data-hm-header-preset={headerPreset !== "default" ? headerPreset : undefined}
      data-hm-site-layout={siteLayoutWidth}
      data-hm-corporate-layout={corporateLayoutWidth}
      data-hm-header-chrome={isCorporateTheme ? headerChromeWidth : undefined}
      style={Object.keys(rootStyle).length > 0 ? rootStyle : undefined}
    >
      {showPlatformNav && !hidePlatformNavOnVideoTvMobile ? <AppNav /> : null}
        {!isVideoTvPage && isStandardNewsTheme && !isMobile ? (
          <HmChromeWidthShell layoutPrefs={layoutPrefs}>
            <HmDeferredAdSlotStrip
              slotKey="header_top"
              siteId={effectiveData.id}
              slug={effectiveData.slug}
              domain={publicDomain}
              layoutPrefs={layoutPrefs}
              className="w-full shrink-0 rounded-b-md border-x border-b border-zinc-200 bg-zinc-50 py-2 flex justify-center [&_img]:max-w-full [&_img]:h-auto"
            />
          </HmChromeWidthShell>
        ) : null}
        {!isVideoTvPage ? (
          <HmPublicSiteHeader
            slug={effectiveData.slug}
            displayName={effectiveData.displayName}
            domain={publicDomain}
            logoUrl={logo}
            stickyStackTopPx={stackTopPx}
            rootRef={headerBandRef}
            showNewsmapBranding={showNewsmapBranding}
          />
        ) : null}
        {isVideoTvPage && showTopNewsNavStrip ? (
          <HmVideoTvChromeStack stickyTopPx={newsStripStickyTopPx} />
        ) : (
          <>
            {showSumbulNavStrip ? (
              <HmSumbulCategoryNavStrip stickyTopPx={newsStripStickyTopPx} yekpareIcons={showYekpareIconMenu} />
            ) : showTopNewsNavStrip ? (
              <HmPublicNewsNavStrip stickyTopPx={newsStripStickyTopPx} pinOnVideoTv={isVideoTvPage} />
            ) : null}
            {financeBelowMenu && !isCorporateTheme && !showBilgiAgaciChrome && !showHaritalarEmbed ? (
              <HmFinanceWeatherPlacementBand stickyTopPx={afterNavStickyTopPx} variant="below-menu" />
            ) : null}
            {!isCorporateTheme && !showBilgiAgaciChrome && !showHaritalarEmbed && (!immersiveVideoTvMain || isVideoTvPage) && showExternalSondakika ? (
              <HmSonDakikaChromeBand stickyTopPx={sonDakikaChromeStickyTopPx} />
            ) : null}
          </>
        )}
        {!immersiveVideoTvMain && showBilgiAgaciChrome ? (
          <HmBilgiAgaciChromeBand stickyTopPx={bilgiAgaciChromeStickyTopPx} />
        ) : null}
        {!isVideoTvPage && !immersiveVideoTvMain && isStandardNewsTheme ? (
          <HmChromeWidthShell layoutPrefs={layoutPrefs}>
            <HmDeferredAdSlotStrip
              slotKey="header_bottom"
              siteId={effectiveData.id}
              slug={effectiveData.slug}
              domain={publicDomain}
              layoutPrefs={layoutPrefs}
              className="w-full shrink-0 rounded-b-md border-x border-b border-zinc-200 bg-white py-2 flex justify-center [&_img]:max-w-full [&_img]:h-auto"
            />
          </HmChromeWidthShell>
        ) : null}
        <div
          className={`hm-vitrin-main min-w-0 w-full flex-1${isVideoTvPage ? " flex min-h-0 flex-col" : ""}${showHaritalarEmbed ? " hm-vitrin-main--haritalar-embed flex min-h-0 flex-col" : ""}${immersiveVideoTvMain ? " hm-vitrin-main--video-tv-immersive" : ""}`}
        >
          {mainChildren}
        </div>
        {showFooterMarketBand ? <HmFooterMarketSearchBand /> : null}
        {showNewsFooter ? (
          <HmPublicSiteFooter
            siteId={effectiveData.id}
            slug={effectiveData.slug}
            layoutPrefs={layoutPrefs}
            showVideoTvLink={showVideoTvLink}
            siteDisplayName={effectiveData.displayName}
            contact={effectiveData.contact ?? null}
            className="mt-auto"
          />
        ) : null}
        {showMobileBottomNav ? <HmMobileBottomNav /> : null}
    </div>
  );
}
