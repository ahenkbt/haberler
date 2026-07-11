import { Link, useLocation } from "wouter";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { useMemo, useState, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { AuthModal } from "./AuthModal";
import NotificationBell from "./NotificationBell";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { normalizePortalDisplayName, PORTAL_BRAND_SHORT, PWA_ICON_PATH, PWA_STORE_NAME, PWA_STORE_TAGLINE } from "@/lib/portalBrand";
import { portalNavBrandParts } from "@/lib/portalNavBrand";
import {
  parseModulesEnabledJson,
  isModuleEnabled,
  type MainNavKey,
  MAIN_NAV_HREF,
} from "@workspace/site-nav";
import { resolvePublicTopNav, filterPublicTopNavForHeader } from "@/lib/kesfetDiscoverHub";
import { isSiparisNavActive } from "@/lib/yekpareServiceNav";
import { isTurizmNavActive } from "@/themes/turizm/turizmRoutes";
import { TurizmSubNavBar } from "@/themes/turizm/TurizmSubNavBar";
import { isOtomotivNavActive } from "@/themes/otomotiv/otomotivRoutes";
import { OtomotivSubNavBar } from "@/themes/otomotiv/OtomotivSubNavBar";
import { SiparisSubNavBar } from "@/components/SiparisSubNavBar";
import {
  Newspaper,
  BookOpen,
  Map as MapIcon,
  ShoppingBag,
  Download,
  Menu,
  X,
  Star,
  Store,
  UserCircle2,
  LogIn,
  Truck,
  Building2,
  Handshake,
  Plane,
  Car,
  Mail,
  Youtube,
  Link2,
  ChevronDown,
} from "lucide-react";

export const APP_NAV_HEIGHT = 52;
export const APP_MOBILE_BOTTOM_NAV_HEIGHT = 64;

/** API bazen `name` göndermez; `.split` çağrısı tüm uygulamayı düşürürdü (beyaz ekran). */
function customerShortName(name: string | null | undefined): string {
  const s = (name ?? "").trim();
  if (!s) return "Hesap";
  return s.split(/\s+/)[0] || "Hesap";
}

function customerDisplayName(name: string | null | undefined): string {
  const s = (name ?? "").trim();
  return s || "Hesap";
}

const iconCls = "w-3.5 h-3.5";

function navIcon(key: MainNavKey): ReactNode {
  switch (key) {
    case "haberler":
      return <Newspaper className={iconCls} />;
    case "ansiklopedi":
      return <BookOpen className={iconCls} />;
    case "yektube":
      return <Youtube className={iconCls} />;
    case "kesfet":
      return <MapIcon className={iconCls} />;
    case "haritalar":
      return <MapIcon className={iconCls} />;
    case "firmaRehberi":
      return <Building2 className={iconCls} />;
    case "alisveris":
      return <ShoppingBag className={iconCls} />;
    case "magaza":
      return <Store className={iconCls} />;
    case "yemek":
      return <Store className={iconCls} />;
    case "market":
      return <ShoppingBag className={iconCls} />;
    case "isletmeler":
      return <Building2 className={iconCls} />;
    case "siparis":
      return <Store className={iconCls} />;
    case "turizm":
      return <Plane className={iconCls} />;
    case "otomotiv":
      return <Car className={iconCls} />;
    case "ulasim":
      return <Truck className={iconCls} />;
    case "iletisim":
      return <Mail className={iconCls} />;
    default:
      return null;
  }
}

type ResolvedNav = {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  external: boolean;
  newTab?: boolean;
};

function normalizePublicNavText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function isHiddenTopNavItem(label: string, href: string): boolean {
  const normalizedHref = href.trim().replace(/\/+$/, "");
  const text = normalizePublicNavText(`${label} ${href}`);
  return (
    normalizedHref === "/alisveris" ||
    [String.fromCharCode(112, 97, 114, 99, 97), String.fromCharCode(112, 97, 114, 99, 101, 108), "6am" + "mart", "google", "maps"]
      .some((word) => new RegExp(`\\b${word}\\b`).test(text)) ||
    /^https?:\/\//i.test(href)
  );
}

function OtomotivNavDropdown({ active, shrink }: { active: boolean; shrink?: boolean }) {
  const [open, setOpen] = useState(false);

  const cls =
    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap" +
    (shrink ? " shrink-0" : "");
  const st: CSSProperties = {
    color: active ? "#fff" : "rgba(255,255,255,0.65)",
    background: active ? "rgba(30,58,95,0.45)" : "transparent",
    boxShadow: active ? "inset 0 0 0 1px rgba(59,130,246,0.5)" : "none",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link href="/otomotiv" className={cls} style={st} aria-expanded={open}>
        <Car className={iconCls} />
        Otomotiv
        <ChevronDown className={`w-3 h-3 transition-transform${open ? " rotate-180" : ""}`} />
      </Link>
      {open ? (
        <div className="absolute left-0 top-full z-[9010] mt-0 min-w-[min(100vw-1.5rem,42rem)]">
          <OtomotivSubNavBar className="otomotiv-subnav--panel" onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function SiparisNavDropdown({ active, shrink }: { active: boolean; shrink?: boolean }) {
  const [open, setOpen] = useState(false);

  const cls =
    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap" +
    (shrink ? " shrink-0" : "");
  const st: CSSProperties = {
    color: active ? "#fff" : "rgba(255,255,255,0.65)",
    background: active ? "rgba(16,185,129,0.35)" : "transparent",
    boxShadow: active ? "inset 0 0 0 1px rgba(52,211,153,0.5)" : "none",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link href="/siparis" className={cls} style={st} aria-expanded={open}>
        <Store className={iconCls} />
        Sipariş
        <ChevronDown className={`w-3 h-3 transition-transform${open ? " rotate-180" : ""}`} />
      </Link>
      {open ? (
        <div className="absolute left-0 top-full z-[9010] mt-0 min-w-[min(100vw-1.5rem,36rem)]">
          <SiparisSubNavBar className="module-subnav--panel" onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function TurizmNavDropdown({ active, shrink }: { active: boolean; shrink?: boolean }) {
  const [open, setOpen] = useState(false);

  const cls =
    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap" +
    (shrink ? " shrink-0" : "");
  const st: CSSProperties = {
    color: active ? "#fff" : "rgba(255,255,255,0.65)",
    background: active ? "rgba(99,102,241,0.35)" : "transparent",
    boxShadow: active ? "inset 0 0 0 1px rgba(139,92,246,0.5)" : "none",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link href="/turizm" className={cls} style={st} aria-expanded={open}>
        <Plane className={iconCls} />
        Seyahat
        <ChevronDown className={`w-3 h-3 transition-transform${open ? " rotate-180" : ""}`} />
      </Link>
      {open ? (
        <div className="absolute left-0 top-full z-[9010] mt-0 min-w-[min(100vw-1.5rem,42rem)]">
          <TurizmSubNavBar className="turizm-subnav--panel" onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function TopNavItem({
  nav,
  active,
  shrink,
  measureOnly,
}: {
  nav: ResolvedNav;
  active: boolean;
  shrink?: boolean;
  measureOnly?: boolean;
}) {
  const cls =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap" +
    (shrink ? " shrink-0" : "") +
    (measureOnly ? " invisible" : "");
  const st: CSSProperties = {
    color: active ? "#fff" : "rgba(255,255,255,0.65)",
    background: active ? "rgba(99,102,241,0.35)" : "transparent",
    boxShadow: active ? "inset 0 0 0 1px rgba(139,92,246,0.5)" : "none",
  };
  if (nav.external) {
    return (
      <a
        href={nav.href}
        target={nav.newTab ? "_blank" : undefined}
        rel={nav.newTab ? "noopener noreferrer" : undefined}
        className={cls}
        style={st}
      >
        {nav.icon}
        {nav.label}
      </a>
    );
  }
  return (
    <Link href={nav.href} className={cls} style={st}>
      {nav.icon}
      {nav.label}
    </Link>
  );
}

function DesktopNavBar({
  navLinks,
  isActive,
}: {
  navLinks: ResolvedNav[];
  isActive: (href: string) => boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(navLinks.length);
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const measureItems = () => {
      const children = Array.from(measure.children) as HTMLElement[];
      if (!children.length) {
        setVisibleCount(navLinks.length);
        return;
      }
      const available = container.clientWidth;
      const moreReserve = 92;
      let used = 0;
      let count = 0;
      for (let i = 0; i < children.length; i++) {
        const width = children[i].offsetWidth + (i > 0 ? 4 : 0);
        const needsMore = i < children.length - 1;
        const budget = needsMore ? available - moreReserve : available;
        if (used + width > budget) break;
        used += width;
        count++;
      }
      setVisibleCount(count > 0 ? count : navLinks.length);
    };

    measureItems();
    const observer = new ResizeObserver(measureItems);
    observer.observe(container);
    return () => observer.disconnect();
  }, [navLinks]);

  useEffect(() => {
    if (visibleCount >= navLinks.length) setMoreOpen(false);
  }, [visibleCount, navLinks.length]);

  const visibleLinks = navLinks.slice(0, visibleCount);
  const overflowLinks = navLinks.slice(visibleCount);

  function renderNavItem(nav: ResolvedNav, measureOnly = false) {
    if (nav.href === "/siparis") {
      return measureOnly ? (
        <TopNavItem key={nav.id} nav={nav} active={isActive("/siparis")} shrink measureOnly />
      ) : (
        <SiparisNavDropdown key={nav.id} active={isActive("/siparis")} shrink />
      );
    }
    if (nav.href === "/turizm") {
      return measureOnly ? (
        <TopNavItem key={nav.id} nav={nav} active={isActive("/turizm")} shrink measureOnly />
      ) : (
        <TurizmNavDropdown key={nav.id} active={isActive("/turizm")} shrink />
      );
    }
    if (nav.href === "/otomotiv") {
      return measureOnly ? (
        <TopNavItem key={nav.id} nav={nav} active={isActive("/otomotiv")} shrink measureOnly />
      ) : (
        <OtomotivNavDropdown key={nav.id} active={isActive("/otomotiv")} shrink />
      );
    }
    return (
      <TopNavItem
        key={nav.id}
        nav={nav}
        active={!nav.external && isActive(nav.href)}
        shrink
        measureOnly={measureOnly}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative hidden min-w-0 flex-1 items-center md:flex">
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 flex items-center gap-1 opacity-0"
      >
        {navLinks.map((nav) => renderNavItem(nav, true))}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto yekpare-scrollbar">
        {visibleLinks.map((nav) => renderNavItem(nav))}
        {overflowLinks.length > 0 ? (
          <div
            className="relative shrink-0"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0"
              style={{ color: "rgba(255,255,255,0.65)" }}
              aria-expanded={moreOpen}
            >
              Daha fazla
              <ChevronDown className={`w-3 h-3 transition-transform${moreOpen ? " rotate-180" : ""}`} />
            </button>
            {moreOpen ? (
              <div
                className="absolute right-0 top-full z-[9010] mt-1 min-w-[11rem] rounded-xl border py-1 shadow-2xl"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "linear-gradient(180deg,#1e1b4b,#0f172a)",
                }}
              >
                {overflowLinks.map((nav) => {
                  const rowCls =
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-white/10";
                  const rowSt: CSSProperties = {
                    color: !nav.external && isActive(nav.href) ? "#fff" : "rgba(255,255,255,0.75)",
                  };
                  if (nav.external) {
                    return (
                      <a
                        key={nav.id}
                        href={nav.href}
                        target={nav.newTab ? "_blank" : undefined}
                        rel={nav.newTab ? "noopener noreferrer" : undefined}
                        className={rowCls}
                        style={rowSt}
                      >
                        {nav.icon}
                        {nav.label}
                      </a>
                    );
                  }
                  return (
                    <Link key={nav.id} href={nav.href} className={rowCls} style={rowSt}>
                      {nav.icon}
                      {nav.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AppNav() {
  const [loc] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, logout } = useCustomerAuth();
  const { data: settings } = useGetSiteSettings();

  const modulesMap = useMemo(
    () => parseModulesEnabledJson(settings?.modulesEnabledJson ?? null),
    [settings?.modulesEnabledJson],
  );

  const navLinks = useMemo((): ResolvedNav[] => {
    const { flatLinks } = resolvePublicTopNav({
      mainNavJson: settings?.mainNavJson,
      modulesEnabledJson: settings?.modulesEnabledJson,
    });
    const filtered = filterPublicTopNavForHeader(flatLinks);
    const out: ResolvedNav[] = [];
    for (const it of filtered) {
      if (isHiddenTopNavItem(it.label, it.href)) continue;
      let key: MainNavKey | null = null;
      for (const candidate of Object.keys(MAIN_NAV_HREF) as MainNavKey[]) {
        if (MAIN_NAV_HREF[candidate] === it.href) {
          key = candidate;
          break;
        }
      }
      if (key === "alisveris") continue;
      if (key && key !== "yektube" && !isModuleEnabled(modulesMap, key)) continue;
      out.push({
        id: it.id,
        label: it.label,
        href: it.href,
        icon: key ? navIcon(key) : <Link2 className={iconCls} />,
        external: it.external === true,
        newTab: it.newTab,
      });
    }
    return out;
  }, [settings?.mainNavJson, settings?.modulesEnabledJson, modulesMap]);

  const [turizmMobileOpen, setTurizmMobileOpen] = useState(false);
  const [otomotivMobileOpen, setOtomotivMobileOpen] = useState(false);
  const [siparisMobileOpen, setSiparisMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/siparis") return isSiparisNavActive(loc);
    if (href === "/turizm") return isTurizmNavActive(loc);
    if (href === "/otomotiv") return isOtomotivNavActive(loc);
    if (href === "/") return loc === "/";
    if (href === "/yektube") return loc === "/yektube" || loc.startsWith("/yektube/");
    if (href === "/kesfet") return loc === "/kesfet" || loc.startsWith("/kesfet/");
    return loc.startsWith(href);
  };
  const pathOnly = loc.split("?")[0] ?? "";
  const isKesfet = pathOnly === "/kesfet" || pathOnly.startsWith("/kesfet/");

  useEffect(() => {
    const onCloseMenu = () => setMenuOpen(false);
    window.addEventListener("kesfet:close-mobile-menu", onCloseMenu as EventListener);
    return () => window.removeEventListener("kesfet:close-mobile-menu", onCloseMenu as EventListener);
  }, []);

  const hideSiteChrome = pathOnly.startsWith("/siparis/qr-menu/");
  if (hideSiteChrome) return null;

  function handleInstall() {
    window.location.href = "/pwastore";
  }

  const brand = portalNavBrandParts(settings ?? undefined);

  return (
    <>
      <nav
        className="sticky top-0 z-[9000] flex-shrink-0 select-none"
        style={{
          height: APP_NAV_HEIGHT,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #1a237e 100%)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.45)",
        }}
      >
        {/* shimmer top line */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,.6),rgba(59,130,246,.8),rgba(139,92,246,.6),transparent)" }} />

        <div className="max-w-screen-2xl mx-auto h-full min-w-0 px-3 flex items-center gap-1 sm:gap-2">

          {/* Logo: görsel URL doluysa yalnızca görsel; değilse yalnızca metin (çift logo önlenir). */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-1 sm:mr-3">
            {settings?.logoUrl?.trim() ? (
              <img
                src={resolveClientMediaSrc(settings.logoUrl.trim()) || settings.logoUrl.trim()}
                alt={normalizePortalDisplayName(settings?.siteName) || PORTAL_BRAND_SHORT}
                className="h-8 sm:h-9 w-auto max-w-[min(42vw,9rem)] sm:max-w-[10.5rem] object-contain object-left drop-shadow-md"
              />
            ) : (
              <span className="flex items-center gap-2 font-black text-sm tracking-tight whitespace-nowrap">
                <img src={PWA_ICON_PATH} alt="" className="h-8 w-8 sm:h-9 sm:w-9 rounded-[10px] object-cover shrink-0" />
                <span style={{ color: settings?.primaryColor || "#ff6b35" }}>{brand.part1}</span>
                <span className="text-white">{brand.part2}</span>
              </span>
            )}
          </Link>

          {/* Desktop: admin kaydettiği sıra ile tek yatay menü */}
          <DesktopNavBar navLinks={navLinks} isActive={isActive} />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstall}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", boxShadow: "0 3px 10px rgba(22,163,74,.4)" }}
            >
              <Download className="w-3 h-3" />
              PWA Store
            </button>

            <Link href="/is-ortagi"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#059669,#0d9488)", color: "#fff", boxShadow: "0 3px 10px rgba(5,150,105,.35)" }}>
              <Handshake className="w-3 h-3" />
              İş Ortağı Ol
            </Link>
            <Link href="/servis-saglayici-giris"
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)", color: "#fff", boxShadow: "0 3px 10px rgba(245,158,11,.35)" }}>
              <Building2 className="w-3 h-3" />
              İşletmem
            </Link>


            {/* Bildirim Zili */}
            <NotificationBell />

            {/* Customer account */}
            {user ? (
              <div className="relative group">
                <Link href="/hesabim"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                  <UserCircle2 className="w-4 h-4 text-indigo-300" />
                  <span className="hidden sm:block max-w-[80px] truncate">{customerShortName(user.name)}</span>
                </Link>
              </div>
            ) : (
              <button onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}>
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:block">Giriş</span>
              </button>
            )}

            {/* Mobile hamburger (Kesfet'te gizli: sol panel kontrolü sayfa içinden) */}
            {!isKesfet && (
              <button className="md:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                onClick={() => setMenuOpen(v => !v)}>
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 z-[9001] shadow-2xl flex flex-col"
            style={{ background: "linear-gradient(180deg,#1e1b4b,#0f172a)" }}>
            {navLinks.map((nav) => {
              const active = !nav.external && isActive(nav.href);
              const rowCls =
                "flex items-center gap-3 px-5 py-3.5 text-sm font-bold border-b transition-colors";
              const rowSt: CSSProperties = {
                color: active ? "#fff" : "rgba(255,255,255,0.7)",
                background: active ? "rgba(99,102,241,0.2)" : "transparent",
                borderColor: "rgba(255,255,255,0.07)",
              };
              if (nav.href === "/siparis") {
                return (
                  <div key={nav.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <button
                      type="button"
                      className={`${rowCls} w-full text-left`}
                      style={rowSt}
                      onClick={() => setSiparisMobileOpen((v) => !v)}
                      aria-expanded={siparisMobileOpen}
                    >
                      {nav.icon}
                      {nav.label}
                      <ChevronDown
                        className={`ml-auto w-4 h-4 transition-transform${siparisMobileOpen ? " rotate-180" : ""}`}
                      />
                    </button>
                    {siparisMobileOpen ? (
                      <SiparisSubNavBar
                        onNavigate={() => {
                          setMenuOpen(false);
                          setSiparisMobileOpen(false);
                        }}
                      />
                    ) : null}
                  </div>
                );
              }
              if (nav.href === "/turizm") {
                return (
                  <div key={nav.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <button
                      type="button"
                      className={`${rowCls} w-full text-left`}
                      style={rowSt}
                      onClick={() => setTurizmMobileOpen((v) => !v)}
                      aria-expanded={turizmMobileOpen}
                    >
                      {nav.icon}
                      {nav.label}
                      <ChevronDown
                        className={`ml-auto w-4 h-4 transition-transform${turizmMobileOpen ? " rotate-180" : ""}`}
                      />
                    </button>
                    {turizmMobileOpen ? (
                      <TurizmSubNavBar
                        onNavigate={() => {
                          setMenuOpen(false);
                          setTurizmMobileOpen(false);
                        }}
                      />
                    ) : null}
                  </div>
                );
              }
              if (nav.href === "/otomotiv") {
                return (
                  <div key={nav.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <button
                      type="button"
                      className={`${rowCls} w-full text-left`}
                      style={rowSt}
                      onClick={() => setOtomotivMobileOpen((v) => !v)}
                      aria-expanded={otomotivMobileOpen}
                    >
                      {nav.icon}
                      {nav.label}
                      <ChevronDown
                        className={`ml-auto w-4 h-4 transition-transform${otomotivMobileOpen ? " rotate-180" : ""}`}
                      />
                    </button>
                    {otomotivMobileOpen ? (
                      <OtomotivSubNavBar
                        onNavigate={() => {
                          setMenuOpen(false);
                          setOtomotivMobileOpen(false);
                        }}
                      />
                    ) : null}
                  </div>
                );
              }
              if (nav.external) {
                return (
                  <a
                    key={nav.id}
                    href={nav.href}
                    target={nav.newTab ? "_blank" : undefined}
                    rel={nav.newTab ? "noopener noreferrer" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={rowCls}
                    style={rowSt}
                  >
                    {nav.icon}
                    {nav.label}
                  </a>
                );
              }
              return (
                <Link key={nav.id} href={nav.href} onClick={() => setMenuOpen(false)} className={rowCls} style={rowSt}>
                  {nav.icon}
                  {nav.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setMenuOpen(false);
                handleInstall();
              }}
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold border-b"
              style={{ color: "#4ade80", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <Download className="w-4 h-4" />
              {PWA_STORE_NAME}
            </button>
            <Link href="/is-ortagi" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold border-b"
              style={{ color: "#34d399", borderColor: "rgba(255,255,255,0.07)" }}>
              <Handshake className="w-4 h-4" />
              İş Ortağı Ol — İşletmeni Ekle
            </Link>
            <Link href="/servis-saglayici-giris" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold border-b"
              style={{ color: "#fbbf24", borderColor: "rgba(255,255,255,0.07)" }}>
              <Building2 className="w-4 h-4" />
              İşletme Girişi
            </Link>
            {user ? (
              <>
                <Link href="/hesabim" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold border-b"
                  style={{ color: "#a5b4fc", borderColor: "rgba(255,255,255,0.07)" }}>
                  <UserCircle2 className="w-4 h-4" />
                  Hesabım — {customerDisplayName(user.name)}
                </Link>
                <button onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-left w-full"
                  style={{ color: "rgba(255,255,255,0.5)" }}>
                  <LogIn className="w-4 h-4 rotate-180" />
                  Çıkış Yap
                </button>
              </>
            ) : (
              <button onClick={() => { setMenuOpen(false); setAuthOpen(true); }}
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-left w-full"
                style={{ color: "#93c5fd" }}>
                <LogIn className="w-4 h-4" />
                Giriş Yap / Kayıt Ol
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Backdrop for mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[8999] bg-black/30 md:hidden"
          onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile bottom navbar (not on Kesfet/Haritalar) */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9002] border-t"
        style={{
          height: APP_MOBILE_BOTTOM_NAV_HEIGHT,
          background: "linear-gradient(180deg, #0b1023 0%, #090f1f 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 -6px 24px rgba(0,0,0,0.45)",
        }}
      >
        <div className={`h-full grid ${isKesfet ? "grid-cols-5" : "grid-cols-7"}`}>
          {isKesfet ? (
            <>
              <Link href="/" className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
                <Store className="w-4 h-4" />
                <span className="leading-none">Ana Sayfa</span>
              </Link>
              {[
                { id: "isletmeler", label: "İşletmeler", icon: <Building2 className="w-4 h-4" /> },
                { id: "harita", label: "Haritalar", icon: <MapIcon className="w-4 h-4" />, href: "/haritalar" },
                { id: "nav", label: "Navigasyon", icon: <Truck className="w-4 h-4" /> },
                { id: "kgm", label: "Güzergah", icon: <Plane className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.href) {
                      window.open(item.href, "_blank", "noopener,noreferrer");
                      return;
                    }
                    window.dispatchEvent(new CustomEvent("kesfet:open-mobile-menu", { detail: { action: item.id } }));
                  }}
                  className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  {item.icon}
                  <span className="leading-none">{item.label}</span>
                </button>
              ))}
            </>
          ) : (
            [
              { href: "/", label: "Ana Sayfa", icon: <Store className="w-4 h-4" /> },
              { href: "/siparis", label: "Sipariş", icon: <Store className="w-4 h-4" /> },
              { href: "/turizm", label: "Seyahat", icon: <Plane className="w-4 h-4" /> },
              { href: "/otomotiv", label: "Otomotiv", icon: <Car className="w-4 h-4" /> },
              { href: "/magaza", label: "Alışveriş", icon: <Store className="w-4 h-4" /> },
              { href: "/kesfet", label: "Keşfet", icon: <MapIcon className="w-4 h-4" /> },
              { href: "/ulasim", label: "Ulaşım", icon: <Truck className="w-4 h-4" /> },
            ].map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold"
                  style={{ color: active ? "#38bdf8" : "rgba(255,255,255,0.72)" }}
                >
                  {item.icon}
                  <span className="leading-none">{item.label}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
