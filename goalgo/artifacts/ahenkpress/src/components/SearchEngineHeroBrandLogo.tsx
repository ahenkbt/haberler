import { Link } from "wouter";

import turkEcoLogo from "@/assets/turk-eco-logo.png?url";

/** turk.eco marka logosu (haber video portalı). */
export const YEKPARE_SUPER_APP_LOGO_SRC = turkEcoLogo;

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
      aria-label="turk.eco ana sayfa"
    >
      <img
        src={YEKPARE_SUPER_APP_LOGO_SRC}
        alt="turk.eco — haber video portalı"
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

/** Anasayfa hero logosu — yekpare-super-app-logo.png, arka plansız. */
export function SearchEngineHeroBrandLogo({ className = "" }: SearchEngineHeroBrandLogoProps) {
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
      aria-label="turk.eco ana sayfa"
    >
      <img
        src={YEKPARE_SUPER_APP_LOGO_SRC}
        alt="turk.eco — haber video portalı"
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
