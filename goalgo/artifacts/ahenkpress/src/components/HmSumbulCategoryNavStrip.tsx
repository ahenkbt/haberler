import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Cpu,
  Globe2,
  List,
  Newspaper,
  PenLine,
  PlayCircle,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { ModuleSubNavBar, type ModuleSubNavItem } from "@/components/ModuleSubNavBar";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmChromeContainedShellClass, isHmHeaderChromeContained } from "@/lib/hmChromeLayout";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { SUMBUL_PORTAL_CATEGORY_NAV } from "@/lib/hmSumbulPortalNav";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gundem: Newspaper,
  ekonomi: TrendingUp,
  spor: Trophy,
  dunya: Globe2,
  teknoloji: Cpu,
  kultur: BookOpen,
};

export const HM_SUMBUL_CATEGORY_NAV_STRIP_HEIGHT_PX = 44;

function normPath(path: string): string {
  const p = (path.split("?")[0] ?? path).trim();
  if (!p || p === "/") return "/";
  return p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
}

export function HmSumbulCategoryNavStrip({
  stickyTopPx,
  yekpareIcons = false,
}: {
  stickyTopPx: number;
  /** layout_json yekpareMenuPreset=yekpare-icons — ikonlu yatay şerit */
  yekpareIcons?: boolean;
}) {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [loc] = useLocation();
  const locPath = normPath(loc.split("?")[0] || "/");
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const contained = isHmHeaderChromeContained(layoutPrefs);
  const portalHubOnly = useMemo(() => {
    const host =
      typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
    return isYekparePortalHubOnly(host, ctx?.slug ?? null);
  }, [ctx?.slug]);

  const items = useMemo<ModuleSubNavItem[]>(() => {
    const yazarlarHref = h("/yazarlar");
    const tumHaberlerHref = h("/tum-haberler");
    const categoryItems = SUMBUL_PORTAL_CATEGORY_NAV.map((cat) => ({
      id: cat.slug,
      label: cat.label,
      href: h(`/kategori/${encodeURIComponent(cat.slug)}`),
      icon: CATEGORY_ICONS[cat.slug] ?? Newspaper,
    }));
    const trailing: ModuleSubNavItem[] = [
      { id: "yazarlar", label: "Yazarlar", href: yazarlarHref, icon: PenLine },
      { id: "tum-haberler", label: "Tüm haberler", href: tumHaberlerHref, icon: List },
    ];
    if (yekpareIcons && portalHubOnly) {
      return [
        { id: "yektube", label: "Yektube", href: "/yektube", icon: PlayCircle },
        ...categoryItems,
        ...trailing,
      ];
    }
    return [...categoryItems, ...trailing];
  }, [h, portalHubOnly, yekpareIcons]);

  if (!ctx) return null;

  const inner = (
    <ModuleSubNavBar
      ariaLabel="Haber kategorileri"
      items={items}
      className="hm-sumbul-category-nav"
      isItemActive={(path, item) => {
        if (item.isActive !== undefined) return item.isActive;
        if (!item.href) return false;
        const hrefPath = normPath(item.href);
        if (hrefPath === normPath(h("/"))) return locPath === hrefPath;
        return locPath === hrefPath || locPath.startsWith(`${hrefPath}/`);
      }}
    />
  );

  return (
    <div
      className={`hm-sumbul-category-nav-strip sticky z-[44] w-full shrink-0 border-b bg-[var(--hm-nav-strip-bg,#ffffff)]${
        yekpareIcons ? " hm-yekpare-icon-menu-strip" : ""
      }`}
      data-hm-yekpare-menu={yekpareIcons ? "icons" : undefined}
      style={{
        top: stickyTopPx,
        borderColor: "var(--hm-nav-strip-border, rgba(14, 165, 233, 0.15))",
      }}
    >
      {contained ? (
        <div className={hmChromeContainedShellClass("w-full")}>{inner}</div>
      ) : (
        <div className="mx-auto w-full max-w-screen-xl">{inner}</div>
      )}
    </div>
  );
}
