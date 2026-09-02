import { Link } from "wouter";

import { usePortalBrandVisuals } from "@/hooks/usePortalBrandVisuals";
import { PORTAL_DEFAULT_LOGO_PATH, portalBrandHomeAriaLabel, portalBrandLogoAlt } from "@/lib/portalBrand";

/** Varsayılan turk.eco logosu (DB boşken). */
export const YEKPARE_SUPER_APP_LOGO_SRC = PORTAL_DEFAULT_LOGO_PATH;

export type SearchEngineHeaderBrandLogoProps = {
  className?: string;
  /** Mobil / dar SERP şeridi. */
  compact?: boolean;
};

/** Header sol sütun logosu — menü + arama + alt menü bloğu ile orantılı kare marka. */
export function SearchEngineHeaderBrandLogo({
  className = "",
  compact = false,
}: SearchEngineHeaderBrandLogoProps) {
  const { logoSrc } = usePortalBrandVisuals();
  return (
    <Link
      href="/"
      className={[
        "seh-header-brand-logo",
        compact ? "seh-header-brand-logo--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={portalBrandHomeAriaLabel()}
    >
      <img
        src={logoSrc}
        alt={portalBrandLogoAlt()}
        className="seh-header-brand-logo-img"
        width={compact ? 44 : 96}
        height={compact ? 44 : 96}
        decoding="async"
        fetchPriority={compact ? "auto" : "high"}
      />
    </Link>
  );
}

export type SearchEngineHeroBrandLogoProps = {
  className?: string;
};

/** Anasayfa hero logosu — site ayarları veya varsayılan logo1. */
export function SearchEngineHeroBrandLogo({ className = "" }: SearchEngineHeroBrandLogoProps) {
  const { logoSrc } = usePortalBrandVisuals();
  return (
    <Link
      href="/"
      className={[
        "yekpare-brand-logo",
        "seh-hero-brand-logo",
        "seh-hero-brand-logo--home",
        "seh-hero-brand-logo--bare",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={portalBrandHomeAriaLabel()}
    >
      <img
        src={logoSrc}
        alt={portalBrandLogoAlt()}
        className="yekpare-brand-logo-img seh-hero-brand-logo-img seh-hero-brand-logo-img--home"
        width={220}
        height={220}
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}

export { YEKPARE_SUPER_APP_LOGO_SRC as YEKPARE_BRAND_LOGO_SRC };
