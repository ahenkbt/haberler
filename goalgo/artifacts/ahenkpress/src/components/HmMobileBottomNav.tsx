import { Link, useLocation } from "wouter";
import { useMemo, type CSSProperties } from "react";
import { BookOpen, Home, MapPinned, Newspaper, Tv2 } from "lucide-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import {
  resolveHmCorporateAuthorsEnabled,
  resolveHmNewsAnyAuthorsEnabled,
  resolveHmNewsVideoTvEnabled,
} from "@/lib/newsSiteLayout";
import { buildHmStripMenuNavItems, type HmCorporateNavMenuItem } from "@/lib/hmCorporateNavMenu";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { decodeHmDisplayText } from "@/lib/hmDisplayText";
import { normalizeHmChromeHex, resolveHmNavLinkColor, resolveHmNavStripBackgroundHex } from "@/lib/hmChromeLayout";
import "@/styles/hmNewsCategoriesMenu.css";

/** Fixed bottom bar height (excluding safe-area). */
export const HM_MOBILE_BOTTOM_NAV_HEIGHT_PX = 56;

function normPath(p: string): string {
  return (p || "/").replace(/\/$/, "") || "/";
}

function itemIcon(item: HmCorporateNavMenuItem) {
  switch (item.key) {
    case "home":
      return Home;
    case "sondakika":
      return Newspaper;
    case "video-tv":
      return Tv2;
    case "newsmap":
      return MapPinned;
    case "bilgi-agaci":
      return BookOpen;
    default:
      return Home;
  }
}

function mobileLabel(item: HmCorporateNavMenuItem): string {
  if (item.key === "video-tv") return "Video";
  if (item.key === "newsmap") return "Harita";
  return decodeHmDisplayText(item.label);
}

/**
 * Editör HM haber siteleri — mobil alt sabit menü (Anasayfa, Sondakika, Video, Yazarlar, Bilgi Ağacı).
 */
export function HmMobileBottomNav() {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [loc] = useLocation();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const effectiveLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const locPath = useMemo(() => normPath(loc.split("?")[0] || "/"), [loc]);
  const stripMenuEnabled = layoutPrefs?.hmNewsStripMenuEnabled === true;

  const hmSlug = ctx?.slug ?? null;
  const chromePrefs = effectiveLayoutPrefs ?? layoutPrefs;
  const accent = normalizeHmChromeHex(chromePrefs?.hmPrimaryColor ?? layoutPrefs?.hmPrimaryColor ?? null) ?? "#c40021";
  const navBgHex = useMemo(() => resolveHmNavStripBackgroundHex(chromePrefs), [chromePrefs]);
  const navColors = useMemo(() => resolveHmNavLinkColor(chromePrefs, accent), [chromePrefs, accent]);

  const newsAuthorsEnabled = layoutPrefs
    ? layoutPrefs.hmVitrinTheme === "corporate"
      ? resolveHmCorporateAuthorsEnabled(layoutPrefs)
      : resolveHmNewsAnyAuthorsEnabled(layoutPrefs)
    : true;
  const videoTvEnabled = resolveHmNewsVideoTvEnabled(layoutPrefs);
  const portalHubOnly = hmSlug
    ? isYekparePortalHubOnly(
        typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "",
        hmSlug,
      )
    : false;

  const items = useMemo(() => {
    if (!ctx?.slug || !layoutPrefs) return [];
    if (!stripMenuEnabled) return [];
    return buildHmStripMenuNavItems({
      layoutPrefs,
      h,
      siteSlug: ctx.slug,
      locPath,
      showVideoTvLink: videoTvEnabled && portalHubOnly,
      newsAuthorsEnabled,
    });
  }, [ctx?.slug, layoutPrefs, stripMenuEnabled, h, locPath, videoTvEnabled, portalHubOnly, newsAuthorsEnabled]);

  if (!items.length) return null;

  const barStyle: CSSProperties = {
    background: navBgHex ?? "#0f172a",
    borderColor: navColors.onLight ? "rgba(15,23,42,0.12)" : "var(--hm-nav-strip-border, #1e293b)",
    boxShadow: navColors.onLight ? "0 -2px 12px rgba(15, 23, 42, 0.1)" : "0 -4px 16px rgba(0,0,0,0.18)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    minHeight: HM_MOBILE_BOTTOM_NAV_HEIGHT_PX,
    ["--hm-nav-link-muted" as string]: navColors.muted,
    ["--hm-nav-link-active" as string]: navColors.active,
    ["--hm-nav-link-hover" as string]: navColors.linkHover,
  };

  return (
    <nav
      className="hm-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[72] border-t lg:hidden"
      data-hm-nav-on-light={navColors.onLight ? "true" : "false"}
      aria-label="Mobil şerit menüsü"
      style={barStyle}
    >
      <ul
        className="mx-auto grid h-full w-full max-w-screen-xl touch-manipulation px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = itemIcon(item);
          const active = item.active === true;
          const className = `hm-mobile-bottom-nav__item flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[10px] font-bold leading-tight transition-colors${
            active ? " hm-mobile-bottom-nav__item--active" : ""
          }`;
          const content = (
            <>
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "opacity-100" : "opacity-90"}`} aria-hidden stroke="currentColor" />
              <span className="max-w-full truncate px-0.5">{mobileLabel(item)}</span>
            </>
          );

          if (item.external) {
            return (
              <li key={item.key} className="min-w-0">
                <a href={item.href} className={className} rel="noopener noreferrer" target="_blank">
                  {content}
                </a>
              </li>
            );
          }

          return (
            <li key={item.key} className="min-w-0">
              <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
