import { useMemo, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { buildHmNewsCategoryMenuItems } from "@/lib/hmNewsCategoryMenu";
import { apiRequest } from "@/lib/queryClient";
import {
  collectHmRssCategoryNavItems,
  resolveHmUnifiedRssFeedRows,
} from "@/lib/newsSiteLayout";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import {
  filterHmPublicCategoryRows,
  resolveHmPublicActiveGlobalSlugs,
  resolveHmPublicHiddenCategorySlugs,
} from "@/lib/hmPublicCategoryFilter";
import { isLightBackgroundHex, normalizeHmChromeHex, resolveHmNavStripOnLight } from "@/lib/hmChromeLayout";
import { shouldShowHmTelifInPublicNav } from "@/lib/hmTelifNav";

const DEFAULT_RED = "#e61e25";

function normPath(p: string): string {
  return (p || "/").replace(/\/$/, "") || "/";
}

/** HM haber sitesi — kategori grid menüsü (nav şeridi + mobil header). */
export function useHmPublicNewsCategoryMenu() {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [loc] = useLocation();
  const { data: settings } = useGetSiteSettings();

  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const effectiveLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const locPath = useMemo(() => normPath(loc.split("?")[0] || "/"), [loc]);
  const hiddenCategorySlugs = useMemo(
    () => resolveHmPublicHiddenCategorySlugs(layoutPrefs),
    [layoutPrefs],
  );
  const siteId = ctx?.siteId ?? 0;
  const siteSlug = ctx?.slug ?? null;

  const accent = useMemo(() => {
    const fromLp = (layoutPrefs?.hmPrimaryColor?.trim() ?? "").length >= 3 ? layoutPrefs!.hmPrimaryColor!.trim() : "";
    if (fromLp) return fromLp;
    const locked = hmVitrinAccentHex(layoutPrefs?.hmVitrinTheme ?? "default");
    if (locked) return locked;
    return settings?.primaryColor?.trim() || DEFAULT_RED;
  }, [layoutPrefs, settings?.primaryColor]);

  const navOnLight = useMemo(() => resolveHmNavStripOnLight(effectiveLayoutPrefs), [effectiveLayoutPrefs]);
  const pillIdleBg = navOnLight ? "rgba(15,23,42,0.07)" : "var(--hm-nav-pill-bg, rgba(255,255,255,0.08))";
  const pillText = navOnLight ? "#0f172a" : "#fff";

  const { data: apiCats = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", siteId, "nav-strip"],
    queryFn: () =>
      apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`) as Promise<any[]>,
    staleTime: 10 * 60 * 1000,
    enabled: siteId > 0,
  });

  const activeGlobalSlugs = useMemo(() => {
    const globals = apiCats
      .filter((c) => c.exclusiveSiteId == null)
      .map((c) => normalizeNewsCategorySlug(c.slug))
      .filter(Boolean);
    return resolveHmPublicActiveGlobalSlugs(layoutPrefs, globals);
  }, [apiCats, layoutPrefs]);

  const filteredApiCats = useMemo(
    () => filterHmPublicCategoryRows(apiCats, layoutPrefs, siteId, siteSlug),
    [apiCats, layoutPrefs, siteId, siteSlug],
  );

  const isCorporateSite = layoutPrefs?.hmVitrinTheme === "corporate";

  const rssCategoryRows = useMemo(
    () =>
      layoutPrefs && !isCorporateSite
        ? collectHmRssCategoryNavItems(resolveHmUnifiedRssFeedRows(layoutPrefs)).filter(
            (row) => row.slug && !hiddenCategorySlugs.has(row.slug) && activeGlobalSlugs.has(row.slug),
          )
        : [],
    [activeGlobalSlugs, hiddenCategorySlugs, isCorporateSite, layoutPrefs],
  );

  const categoryMenuItems = useMemo(
    () =>
      buildHmNewsCategoryMenuItems({
        h,
        apiCategories: filteredApiCats,
        rssRows: rssCategoryRows,
        hiddenSlugs: hiddenCategorySlugs,
        activeGlobalSlugs,
        sortSlugs: layoutPrefs?.hmCategorySortSlugs,
        locPath,
        includeContactLinks: true,
        includeTelifLink: shouldShowHmTelifInPublicNav(layoutPrefs),
        includeStandardNewsCategories: !isCorporateSite,
      }),
    [
      activeGlobalSlugs,
      filteredApiCats,
      h,
      hiddenCategorySlugs,
      isCorporateSite,
      layoutPrefs?.hmCategorySortSlugs,
      locPath,
      rssCategoryRows,
    ],
  );

  const triggerStyle: CSSProperties = {
    background: pillIdleBg,
    color: pillText,
  };

  const headerTriggerStyle: CSSProperties = useMemo(() => {
    const logoBgHex = normalizeHmChromeHex(layoutPrefs?.hmLogoBarBackground ?? null);
    const lightHeaderTheme =
      layoutPrefs?.hmVitrinTheme === "portal3" ||
      layoutPrefs?.hmVitrinTheme === "esen" ||
      layoutPrefs?.hmVitrinTheme === "modern";
    const onLightCustom = !!logoBgHex && isLightBackgroundHex(logoBgHex);
    const useLightText = (!logoBgHex && !lightHeaderTheme) || (logoBgHex && !onLightCustom);
    return {
      background: useLightText ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.06)",
      color: useLightText ? "#ffffff" : "#0f172a",
      border: useLightText ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(15,23,42,0.14)",
    };
  }, [layoutPrefs?.hmLogoBarBackground, layoutPrefs?.hmVitrinTheme]);

  return {
    enabled: Boolean(ctx && categoryMenuItems.length > 0),
    categoryMenuItems,
    accent,
    triggerStyle,
    headerTriggerStyle,
    navOnLight,
  };
}
