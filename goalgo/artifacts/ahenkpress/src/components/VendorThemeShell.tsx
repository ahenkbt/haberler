import { useEffect, useState, type ReactNode } from "react";
import { resolveVendorThemeConfig, themeDefByKey, isVendorStandaloneHost } from "@/lib/vendorThemes";
import { activeVendorNavMenuItems, buildVendorStripMenuLinks } from "@/lib/vendorNavMenuUtils";
import { VendorMobileBottomNav, VENDOR_MOBILE_BOTTOM_NAV_HEIGHT_PX } from "@/components/VendorMobileBottomNav";
import "@/styles/vendorThemes.css";

type Props = {
  themeKey?: string | null;
  themeConfig?: Record<string, string> | null;
  navMenuEnabled?: boolean;
  navMenuItems?: Array<{ id: string; label: string; href: string; enabled?: boolean }> | null;
  stripMenuEnabled?: boolean;
  stripMenuItems?: Array<{ id: string; label: string; href: string; enabled?: boolean }> | null;
  vendorName: string;
  vendorLogo?: string | null;
  vendorCover?: string | null;
  children: ReactNode;
  onHeroCta?: () => void;
  discoverHref?: string | null;
  hideHero?: boolean;
};

function currentStorefrontBase(): { base: string; productsSegment: string } {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const ecom = pathname.match(/^\/alisveris\/magaza\/[^/]+/);
  if (ecom) return { base: ecom[0], productsSegment: "urunler" };
  const delivery = pathname.match(/^\/siparis\/(?:satici|isletme)\/[^/]+/);
  if (delivery) return { base: delivery[0], productsSegment: "menu" };
  const tourism = pathname.match(/^\/turizm\/[^/]+\/[^/]+/);
  if (tourism) return { base: tourism[0], productsSegment: "urunler" };
  if (isVendorStandaloneHost()) {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first && /^[a-z][a-z0-9]{3,}$/i.test(first)) {
      return { base: `/${first}`, productsSegment: "menu" };
    }
  }
  return { base: "/", productsSegment: "urunler" };
}

function absoluteYekpareHref(href: string | null | undefined): string {
  const raw = String(href ?? "/kesfet").trim() || "/kesfet";
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `https://yekpare.net${path}`;
}

function contrastTextForHex(hex: string): "#0f172a" | "#ffffff" {
  const normalized = hex.trim().replace(/^#/, "");
  const full = normalized.length === 3
    ? normalized.split("").map((x) => `${x}${x}`).join("")
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(full)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16) / 255);
  const linear = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.35 ? "#0f172a" : "#ffffff";
}

export function VendorThemeShell({
  themeKey,
  themeConfig,
  navMenuEnabled,
  navMenuItems,
  stripMenuEnabled,
  stripMenuItems,
  vendorName,
  vendorLogo,
  vendorCover,
  children,
  onHeroCta,
  discoverHref,
  hideHero = false,
}: Props) {
  const key = String(themeKey ?? "foodmart").trim().toLowerCase();
  const def = themeDefByKey(key);
  const cfg = resolveVendorThemeConfig(key, themeConfig ?? undefined);
  const accent = cfg.accentColor || "#3BB77E";
  const accentContrast = contrastTextForHex(accent);
  const configuredHero = String(themeConfig?.heroImage ?? "").trim();
  const heroImage = configuredHero || cfg.heroImage || vendorCover || def?.previewImage || "";
  const standalone = isVendorStandaloneHost();
  const [imageOk, setImageOk] = useState(Boolean(heroImage));
  const { base, productsSegment } = currentStorefrontBase();
  const absoluteDiscoverHref = absoluteYekpareHref(discoverHref);
  const defaultNavLinks = [
    { label: "Giriş", href: base },
    { label: "Hakkımızda", href: `${base}/hakkimizda` },
    { label: productsSegment === "menu" ? "Menü" : "Ürünler", href: `${base}/${productsSegment}` },
    { label: "Blog", href: `${base}/blog` },
    { label: "Keşfet", href: absoluteDiscoverHref },
  ];
  const customNavItems = activeVendorNavMenuItems(navMenuItems ?? undefined, navMenuEnabled === true);
  const navLinks =
    navMenuEnabled === true && customNavItems.length
      ? customNavItems.map((item) => ({ label: item.label, href: item.href }))
      : navMenuEnabled === true
        ? []
        : defaultNavLinks;
  const stripMenuLinks = buildVendorStripMenuLinks({
    base,
    productsSegment: productsSegment as "menu" | "urunler",
    stripMenuEnabled: stripMenuEnabled === true,
    stripMenuItems: stripMenuItems ?? undefined,
  });
  const mobileStripPadding = stripMenuLinks.length
    ? `calc(${VENDOR_MOBILE_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`
    : undefined;

  useEffect(() => {
    setImageOk(Boolean(heroImage));
  }, [heroImage]);

  return (
    <div
      className="vendor-theme-root min-h-screen"
      data-vendor-theme={key}
      data-vendor-standalone={standalone ? "1" : "0"}
      style={{
        ["--vendor-accent" as string]: accent,
        ["--vendor-accent-contrast" as string]: accentContrast,
        fontFamily: def?.fontFamily,
      }}
    >
      <div className="vendor-theme-topbar">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="font-black tracking-wide">{vendorName}</div>
          <div className="hidden sm:flex items-center gap-5 text-xs font-bold uppercase tracking-[0.18em]">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="vendor-theme-nav-link">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      {!hideHero ? (
        <header className="vendor-theme-hero relative overflow-hidden">
          {heroImage && imageOk ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImageOk(false)}
            />
          ) : null}
          <div className="vendor-theme-hero-overlay absolute inset-0" />
          <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-16 flex flex-col md:flex-row md:items-end gap-6">
            {vendorLogo ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/80 shadow-lg shrink-0 bg-white">
                <img src={vendorLogo} alt={vendorName} className="w-full h-full object-cover" />
              </div>
            ) : null}
            <div className="flex-1 min-w-0 text-white">
              {cfg.promoBadge ? (
                <span className="vendor-theme-badge inline-block mb-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">
                  {cfg.promoBadge}
                </span>
              ) : null}
              <h1 className="vendor-theme-title text-3xl md:text-5xl font-black leading-tight drop-shadow-lg">
                {cfg.heroTitle || vendorName}
              </h1>
              {cfg.heroSubtitle ? (
                <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl leading-relaxed drop-shadow">
                  {cfg.heroSubtitle}
                </p>
              ) : null}
              {cfg.ctaText && onHeroCta ? (
                <button
                  type="button"
                  onClick={onHeroCta}
                  className="mt-4 px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition hover:opacity-90"
                  style={{ backgroundColor: accent, color: accentContrast }}
                >
                  {cfg.ctaText}
                </button>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}
      <div className="vendor-theme-body" style={mobileStripPadding ? { paddingBottom: mobileStripPadding } : undefined}>
        {children}
      </div>
      {stripMenuLinks.length ? (
        <VendorMobileBottomNav items={stripMenuLinks} accent={accent} accentContrast={accentContrast} />
      ) : null}
      <footer className="vendor-theme-footer">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm">
            <strong>{vendorName}</strong> altyapı:{" "}
            <a href="https://yekpare.net" className="font-bold hover:underline">
              yekpare.net
            </a>{" "}
            · © 2026
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-bold">
            <a href="/servis-saglayici-giris" className="hover:underline">Mağaza Girişi</a>
            <a href={absoluteDiscoverHref} className="hover:underline">Keşfet Sayfası</a>
            {navLinks.map((link) => (
              <a key={`footer-${link.href}`} href={link.href} className="hover:underline">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
