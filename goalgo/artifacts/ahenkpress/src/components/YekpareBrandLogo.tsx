import { Link } from "wouter";

import { YEKPARE_SUPER_APP_LOGO_SRC } from "@/components/SearchEngineHeroBrandLogo";
import { usePortalBrandVisuals } from "@/hooks/usePortalBrandVisuals";
import { portalBrandHomeAriaLabel, portalBrandLogoAlt } from "@/lib/portalBrand";

/** Varsayılan portal logosu (DB boş veya eski URL). */
export const YEKPARE_BRAND_LOGO_SRC = YEKPARE_SUPER_APP_LOGO_SRC;

export type YekpareBrandLogoProps = {
  className?: string;
  /** SERP / chrome üst şeridi (~32px). */
  compact?: boolean;
  /** hero: gradient üstünde tinted pill; serp: beyaz zemin, doğrudan logo. */
  variant?: "hero" | "serp";
};

/** YEKPARE tam marka logosu — header, SERP ve modül chrome. */
export function YekpareBrandLogo({
  className = "",
  compact = false,
  variant = "serp",
}: YekpareBrandLogoProps) {
  const { logoSrc } = usePortalBrandVisuals();
  return (
    <Link
      href="/"
      className={[
        "yekpare-brand-logo",
        "seh-header-brand-logo",
        compact ? "yekpare-brand-logo--compact seh-header-brand-logo--compact" : "",
        variant === "serp" ? "yekpare-brand-logo--serp seh-header-brand-logo--serp" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={portalBrandHomeAriaLabel()}
    >
      <img
        src={logoSrc}
        alt={portalBrandLogoAlt()}
        className="yekpare-brand-logo-img seh-header-brand-logo-img"
        width={compact ? 44 : 96}
        height={compact ? 44 : 96}
        decoding="async"
        fetchPriority={compact ? "auto" : "high"}
      />
    </Link>
  );
}
