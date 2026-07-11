import { Link, useLocation } from "wouter";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { HmVideoTvNavPill } from "@/components/HmVideoTvNavPill";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  resolveHmCorporateAuthorsEnabled,
  resolveHmCorporateRssLinksEnabled,
  resolveHmNewsAnyAuthorsEnabled,
  resolveHmNewsHeaderMenuEnabled,
  resolveHmNewsVideoTvEnabled,
  resolveHeaderPreset,
  resolveHmNavStripTransparent,
} from "@/lib/newsSiteLayout";
import { HmNewsCategoriesDropdown } from "@/components/HmNewsCategoriesDropdown";
import { useHmPublicNewsCategoryMenu } from "@/hooks/useHmPublicNewsCategoryMenu";
import {
  buildCorporateHeaderNavItems,
  buildEditorStandardNewsNavItems,
  hasConfiguredHmHeaderMenu,
  type HmCorporateNavMenuItem as NavMenuItem,
} from "@/lib/hmCorporateNavMenu";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { apiUrl } from "@/lib/apiBase";
import { HmPwaInstallNavButton } from "@/components/HmPwaInstallNavButton";
import { HmCategoryRssNavButton } from "@/components/HmCategoryRssNavButton";
import { HmPageRefreshNavButton } from "@/components/HmPageRefreshNavButton";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  hmRequestFormPath,
  resolveHmCorporateRequestFormEnabled,
  resolveHmNewsRequestFormEnabled,
} from "@/lib/hmRequestForm";
import {
  hmChromeContainedShellClass,
  isHmHeaderChromeContained,
  isLightBackgroundHex,
  normalizeHmChromeHex,
  resolveHmNavLinkColor,
  resolveHmNavStripBackgroundStyle,
} from "@/lib/hmChromeLayout";
import { formatHmNavLabel } from "@/lib/hmDisplayText";
import "@/styles/hmNewsCategoriesMenu.css";

function renderMenuItemLabel(label: string, Icon?: LucideIcon | null) {
  const text = formatHmNavLabel(label);
  if (!Icon) return text;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      {text}
    </span>
  );
}

function NavItemLink({
  item,
  className,
  style,
  children,
}: {
  item: NavMenuItem;
  className: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  if (item.external) {
    return (
      <a href={item.href} className={className} style={style} rel="noopener noreferrer" target="_blank">
        {children ?? renderMenuItemLabel(item.label, item.icon)}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} style={style}>
      {children ?? renderMenuItemLabel(item.label, item.icon)}
    </Link>
  );
}

function NavDropdown({
  label,
  items,
  triggerStyle,
  accent = "#c40021",
}: {
  label: string;
  items: NavMenuItem[];
  triggerStyle: CSSProperties;
  accent?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPanelPos(null);
      return;
    }
    const sync = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPanelPos({ top: r.bottom + 8, left: r.left, minWidth: Math.max(220, r.width) });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!items.length) return null;

  const panel =
    open && panelPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="hm-news-nav-dropdown-panel hm-news-nav-dropdown-panel--portal"
            role="menu"
            data-hm-vitrin-theme="corporate"
            style={{
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              minWidth: panelPos.minWidth,
              zIndex: 10060,
              ["--hm-dropdown-accent" as string]: accent,
            }}
          >
            {items.map((item) => (
              <NavItemLink
                key={item.key}
                item={item}
                className={`hm-news-nav-dropdown-btn${item.active ? " hm-news-nav-dropdown-btn--active" : ""}`}
              >
                {formatHmNavLabel(item.label)}
              </NavItemLink>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`hm-news-nav-dropdown${open ? " hm-news-nav-dropdown--open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="hm-news-nav-dropdown-trigger"
        style={triggerStyle}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {panel}
    </div>
  );
}

function pathOnlyHref(href: string): string {
  const raw = String(href ?? "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      return new URL(raw).pathname.replace(/\/$/, "") || "/";
    } catch {
      return raw.split("?")[0]?.replace(/\/$/, "") || "/";
    }
  }
  return raw.split("?")[0]?.replace(/\/$/, "") || "/";
}

function normPath(p: string): string {
  return (p || "/").replace(/\/$/, "") || "/";
}

function isVideoTvNavMenuItem(item: NavMenuItem, hmVideoTvHref: string): boolean {
  if (item.key === "video-tv") return true;
  const itemPath = normPath(pathOnlyHref(item.href));
  const videoPath = normPath(pathOnlyHref(hmVideoTvHref));
  return itemPath === videoPath || itemPath.startsWith(`${videoPath}/`);
}

export type HmPublicNewsNavStripProps = {
  /** Sticky `top` (px): AppNav + site header bandı altı. */
  stickyTopPx: number;
  /** Video TV: şeffaf cam şerit (sticky, sabit değil). */
  pinOnVideoTv?: boolean;
  /** Video TV chrome yığını içinde: dış sticky kaldırılır. */
  embedInVideoTvChrome?: boolean;
};

/**
 * Haber merkezi vitrin + alt sayfalarda ortak üst menü / kısayol şeridi (kategori pill'leri yok).
 * Başlam yoksa (portal `/haberler` vb.) hiçbir şey çizmez.
 */
export function HmPublicNewsNavStrip({
  stickyTopPx,
  pinOnVideoTv = false,
  embedInVideoTvChrome = false,
}: HmPublicNewsNavStripProps) {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [loc] = useLocation();
  const isMobileViewport = useIsMobile();
  const { categoryMenuItems, accent: menuAccent, triggerStyle: categoryTriggerStyle } = useHmPublicNewsCategoryMenu();

  const layoutPrefs: NewsSiteLayoutPrefs | null = ctx?.layoutPrefs ?? null;
  const effectiveLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const corporateNav = layoutPrefs?.hmVitrinTheme === "corporate";
  const newsNavEnabled = resolveHmNewsHeaderMenuEnabled(layoutPrefs);
  const newsAuthorsEnabled = layoutPrefs
    ? layoutPrefs.hmVitrinTheme === "corporate"
      ? resolveHmCorporateAuthorsEnabled(layoutPrefs)
      : resolveHmNewsAnyAuthorsEnabled(layoutPrefs)
    : true;
  const newsRssEnabled = layoutPrefs
    ? corporateNav
      ? resolveHmCorporateRssLinksEnabled(layoutPrefs)
      : layoutPrefs.hmNewsRssLinksEnabled !== false
    : true;

  const accent = menuAccent;
  const hmSlug = ctx?.slug ?? null;
  const hmVideoTvHref =
    hmSlug != null ? h(`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmSlug)}/video-tv`) : "/yektube";
  const talepFormuHref = h(hmRequestFormPath());
  const locPath = useMemo(() => normPath(loc.split("?")[0] || "/"), [loc]);

  const activeCategorySlug = useMemo(() => {
    const m = locPath.match(/\/kategori\/([^/]+)\/?$/);
    return m?.[1] ? decodeURIComponent(m[1]).trim().toLowerCase() : "";
  }, [locPath]);

  const categoryRssHref = useMemo(() => {
    if (!ctx || !newsRssEnabled || !activeCategorySlug) return null;
    return apiUrl(`/api/rss/${encodeURIComponent(ctx.slug)}/${encodeURIComponent(activeCategorySlug)}.xml`);
  }, [activeCategorySlug, ctx, newsRssEnabled]);

  const videoActive = locPath === normPath(pathOnlyHref(hmVideoTvHref));
  const talepFormuActive = locPath === normPath(pathOnlyHref(talepFormuHref));
  const requestFormEnabled = corporateNav
    ? resolveHmCorporateRequestFormEnabled(layoutPrefs)
    : resolveHmNewsRequestFormEnabled(layoutPrefs);
  const videoTvEnabled = resolveHmNewsVideoTvEnabled(layoutPrefs);
  const portalHubOnly = isYekparePortalHubOnly(
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "",
    hmSlug,
  );
  const showHubVideoTvLink = videoTvEnabled && portalHubOnly;

  const contained = isHmHeaderChromeContained(layoutPrefs);
  const headerPreset = resolveHeaderPreset(layoutPrefs);
  const isTrabzonikNav = headerPreset === "trabzonik";
  const isClassicNav = headerPreset === "classic";
  const isMinimalNav = headerPreset === "minimal";
  const headerPresetClass =
    isTrabzonikNav ? " hm-news-nav-strip--trabzonik" : isClassicNav ? " hm-news-nav-strip--classic" : isMinimalNav ? " hm-news-nav-strip--minimal" : "";
  const navBgHex = useMemo(() => normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null), [layoutPrefs?.hmNavBarBackground]);
  const trabzonikNavHex =
    navBgHex || normalizeHmChromeHex(layoutPrefs?.hmPrimaryColor ?? null) || "#6b0f1a";
  const navColors = useMemo(() => resolveHmNavLinkColor(effectiveLayoutPrefs, accent), [effectiveLayoutPrefs, accent]);
  const navOnLight = navColors.onLight;
  const showPwaInstall = layoutPrefs?.hmNewsPwaInstallEnabled === true;
  const accentHex = normalizeHmChromeHex(accent);
  const accentOnLight = accentHex ? isLightBackgroundHex(accentHex) : false;
  const videoTvChrome = pinOnVideoTv;
  const navTransparent = resolveHmNavStripTransparent(layoutPrefs) && !corporateNav && !isTrabzonikNav;
  const transparentChrome = navTransparent || videoTvChrome;
  /** Video TV / şeffaf şerit üzerinde okunaklı koyu düz metin (beyaz metin yok). */
  const videoTvPlainText = "#1e293b";
  const videoTvPlainMuted = "#475569";
  const videoTvPlainHover = "#0f172a";
  const linkMuted = transparentChrome ? videoTvPlainMuted : navColors.muted;
  const linkActive = transparentChrome ? videoTvPlainText : navColors.active;
  const pillIdleBg = transparentChrome ? "transparent" : navColors.pillIdleBg;
  const pillText = transparentChrome ? videoTvPlainText : navColors.pillText;
  const activePillText = transparentChrome ? (accentOnLight ? "#0f172a" : "#ffffff") : navColors.activePillText;
  const stripNavOnLight = transparentChrome ? true : navOnLight;

  if (!ctx || !hmSlug || (!corporateNav && !newsNavEnabled)) return null;

  const dropdownTriggerStyle: CSSProperties = transparentChrome
    ? { background: "transparent", color: videoTvPlainText }
    : categoryTriggerStyle;
  const useEditorHeaderMenu = hasConfiguredHmHeaderMenu(layoutPrefs);
  const standardNavItems: NavMenuItem[] = buildEditorStandardNewsNavItems({
    layoutPrefs: layoutPrefs!,
    h,
    siteSlug: hmSlug,
    locPath,
    showVideoTvLink: showHubVideoTvLink,
    newsAuthorsEnabled,
  });
  const headerMenuItems: NavMenuItem[] = useEditorHeaderMenu
    ? buildCorporateHeaderNavItems({
        layoutPrefs: layoutPrefs!,
        h,
        siteSlug: hmSlug,
        locPath,
        showVideoTvLink: showHubVideoTvLink,
        newsAuthorsEnabled,
        newsRssEnabled,
        requestFormEnabled,
      })
    : standardNavItems;
  const hasHeaderVideoTvItem = headerMenuItems.some(
    (item) =>
      item.key === "video-tv" ||
      normPath(pathOnlyHref(item.href)) === normPath(pathOnlyHref(hmVideoTvHref)) ||
      (item.children ?? []).some(
        (child) =>
          child.key === "video-tv" ||
          normPath(pathOnlyHref(child.href)) === normPath(pathOnlyHref(hmVideoTvHref)),
      ),
  );

  const videoTvWhiteIdleBg = !transparentChrome && !stripNavOnLight;
  const videoTvPillProps = {
    accent,
    pillIdleBg,
    pillText,
    activePillText,
    whiteIdleBackground: videoTvWhiteIdleBg,
  };

  const videoTvPill =
    !useEditorHeaderMenu && videoTvEnabled && !hasHeaderVideoTvItem && portalHubOnly ? (
      <HmVideoTvNavPill
        key="video-tv-pill"
        href={hmVideoTvHref}
        active={videoActive}
        {...videoTvPillProps}
      />
    ) : null;

  const hasHeaderRequestFormItem = headerMenuItems.some(
    (item) =>
      normPath(pathOnlyHref(item.href)) === normPath(pathOnlyHref(talepFormuHref)) ||
      (item.children ?? []).some(
        (child) => normPath(pathOnlyHref(child.href)) === normPath(pathOnlyHref(talepFormuHref)),
      ),
  );

  const requestPill = !useEditorHeaderMenu && requestFormEnabled && !hasHeaderRequestFormItem ? (
    <Link
      key="talep-formu"
      href={talepFormuHref}
      className={`hm-news-nav-pill my-1 mr-1 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-black tracking-[0.06em] transition-colors duration-150 ${
        talepFormuActive ? "hm-news-nav-pill--active" : ""
      }`}
      style={{
        background: talepFormuActive ? accent : pillIdleBg,
        color: talepFormuActive ? activePillText : pillText,
        boxShadow: talepFormuActive ? "var(--hm-nav-pill-active-shadow, 0 1px 0 rgba(0,0,0,0.35))" : undefined,
      }}
    >
      {formatHmNavLabel("Talep Formu")}
    </Link>
  ) : null;

  const renderHeaderMenuPills = () =>
    headerMenuItems.map((item) =>
      item.children?.length ? (
        <NavDropdown
          key={item.key}
          label={formatHmNavLabel(item.label)}
          items={item.children}
          triggerStyle={dropdownTriggerStyle}
          accent={accent}
        />
      ) : isVideoTvNavMenuItem(item, hmVideoTvHref) && showHubVideoTvLink ? (
        <HmVideoTvNavPill
          key={item.key}
          href={item.href}
          active={item.active}
          {...videoTvPillProps}
        />
      ) : (
        <NavItemLink
          key={item.key}
          item={item}
          className={`hm-news-nav-pill my-1 mr-1 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-black tracking-[0.06em] transition-colors duration-150 ${
            item.active ? "hm-news-nav-pill--active" : ""
          }`}
          style={{
            background: item.active ? accent : pillIdleBg,
            color: item.active ? activePillText : pillText,
            boxShadow: item.active ? "var(--hm-nav-pill-active-shadow, 0 1px 0 rgba(0,0,0,0.35))" : undefined,
          }}
        >
          {renderMenuItemLabel(item.label, item.icon)}
        </NavItemLink>
      ),
    );

  const stripPlateStyle: CSSProperties = transparentChrome
    ? {
        background: "transparent",
        borderColor: "rgba(15,23,42,0.12)",
        boxShadow: "none",
        ["--hm-nav-link-hover" as string]: videoTvPlainHover,
        ["--hm-nav-link-muted" as string]: linkMuted,
        ["--hm-nav-link-active" as string]: linkActive,
        ["--hm-nav-pill-idle-text" as string]: pillText,
        ["--hm-nav-pill-active-text" as string]: activePillText,
      }
    : {
        ...(isTrabzonikNav
          ? {
              background: resolveHmNavStripBackgroundStyle(effectiveLayoutPrefs, {
                trabzonik: true,
                trabzonikNavHex,
              }),
              color: "#ffffff",
            }
          : { background: resolveHmNavStripBackgroundStyle(effectiveLayoutPrefs) }),
        borderColor: isTrabzonikNav
          ? "rgba(255,255,255,0.12)"
          : stripNavOnLight
            ? "rgba(15,23,42,0.12)"
            : "var(--hm-nav-strip-border, #1e293b)",
        boxShadow: contained ? "0 2px 10px rgba(0,0,0,0.08)" : "0 2px 12px rgba(0,0,0,0.12)",
        ...(isTrabzonikNav
          ? {
              ["--hm-nav-link-hover" as string]: "#ffffff",
              ["--hm-nav-link-muted" as string]: "rgba(255,255,255,0.82)",
              ["--hm-nav-link-active" as string]: "#ffffff",
              ["--hm-nav-pill-idle-text" as string]: "rgba(255,255,255,0.92)",
              ["--hm-nav-pill-active-text" as string]: trabzonikNavHex,
            }
          : {
              ["--hm-nav-link-hover" as string]: navColors.linkHover,
              ["--hm-nav-link-muted" as string]: linkMuted,
              ["--hm-nav-link-active" as string]: linkActive,
              ["--hm-nav-pill-idle-text" as string]: pillText,
              ["--hm-nav-pill-active-text" as string]: activePillText,
            }),
      };

  const categoriesDropdown =
    !useEditorHeaderMenu && categoryMenuItems.length ? (
    <HmNewsCategoriesDropdown
      items={categoryMenuItems}
      triggerStyle={dropdownTriggerStyle}
      accent={accent}
      mobile={isMobileViewport || transparentChrome}
    />
  ) : null;

  const pillsRow = (
    <div
      className={`hm-news-nav-row flex touch-manipulation items-center gap-1 px-3 py-1 overflow-x-auto overflow-y-visible overscroll-x-contain ${
        corporateNav || useEditorHeaderMenu ? "hm-news-nav-row--corporate" : ""
      }`}
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {renderHeaderMenuPills()}
        {useEditorHeaderMenu ? requestPill : null}
        {videoTvPill}
      </div>
      <div className="hm-news-nav-actions flex shrink-0 items-center gap-1">
        <HmPageRefreshNavButton navOnLight={stripNavOnLight} pillIdleBg={pillIdleBg} pillText={pillText} />
        {categoryRssHref ? (
          <HmCategoryRssNavButton
            href={categoryRssHref}
            navOnLight={stripNavOnLight}
            pillIdleBg={pillIdleBg}
            pillText={pillText}
          />
        ) : null}
        {showPwaInstall ? (
          <HmPwaInstallNavButton
            accent={accent}
            navOnLight={stripNavOnLight}
            pillIdleBg={pillIdleBg}
            pillText={pillText}
            activePillText={activePillText}
          />
        ) : null}
        {categoriesDropdown ? (
          <div
            className={`hm-news-nav-categories-slot shrink-0${transparentChrome ? "" : " hidden sm:block"}`}
          >
            {categoriesDropdown}
          </div>
        ) : null}
      </div>
    </div>
  );

  const stripPositionClass = embedInVideoTvChrome
    ? "hm-news-nav-strip--video-tv-embed"
    : transparentChrome
      ? "hm-news-nav-strip--transparent sticky z-[52]"
      : videoTvChrome
        ? "hm-news-nav-strip--video-tv sticky z-[52]"
        : "sticky z-[52]";
  const stripChromeClass = embedInVideoTvChrome
    ? ""
    : transparentChrome
      ? "border-b border-slate-200/70"
      : videoTvChrome
        ? "border-b border-slate-200/70"
        : "border-b shadow-[0_2px_12px_rgba(0,0,0,0.12)]";
  const plateChromeClass = embedInVideoTvChrome
    ? ""
    : transparentChrome
      ? "border-b border-slate-200/70"
      : videoTvChrome
        ? "border-b border-slate-200/70"
        : "border-b shadow-[0_2px_12px_rgba(0,0,0,0.12)]";
  const stickyStyle: CSSProperties | undefined = embedInVideoTvChrome ? undefined : { top: stickyTopPx };

  if (embedInVideoTvChrome) {
    return (
      <div
        className={`hm-news-nav-strip ${stripPositionClass} w-full max-w-full`}
        data-hm-nav-on-light={stripNavOnLight ? "true" : "false"}
        data-hm-video-tv-nav="true"
        style={stripPlateStyle}
      >
        {pillsRow}
      </div>
    );
  }

  if (contained) {
    return (
      <div
        className={`hm-news-nav-strip hm-news-nav-strip--contained-outer ${stripPositionClass} w-full max-w-full${headerPresetClass}`}
        style={stickyStyle}
        data-hm-video-tv-nav={transparentChrome ? "true" : undefined}
        data-hm-nav-transparent={navTransparent ? "true" : undefined}
        data-hm-header-preset={headerPreset !== "default" ? headerPreset : undefined}
      >
        <div
          className={`${hmChromeContainedShellClass(`hm-news-nav-strip__plate ${plateChromeClass}`)}`}
          data-hm-nav-on-light={stripNavOnLight ? "true" : "false"}
          style={stripPlateStyle}
        >
          {pillsRow}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`hm-news-nav-strip ${stripPositionClass} w-full max-w-full ${stripChromeClass}${headerPresetClass}`}
      data-hm-header-preset={headerPreset !== "default" ? headerPreset : undefined}
      data-hm-nav-on-light={stripNavOnLight ? "true" : "false"}
      data-hm-video-tv-nav={transparentChrome ? "true" : undefined}
      data-hm-nav-transparent={navTransparent ? "true" : undefined}
      style={{ ...stripPlateStyle, ...stickyStyle }}
    >
      <div className={`min-w-0 max-w-full ${corporateNav ? "w-full" : "mx-auto max-w-[1280px] px-3 md:px-4"}`}>{pillsRow}</div>
    </div>
  );
}

/** Video TV içerişi için şerit yükseklişi (sticky `top` telafisi). */
export const HM_PUBLIC_NEWS_NAV_STRIP_HEIGHT_PX = 42;
