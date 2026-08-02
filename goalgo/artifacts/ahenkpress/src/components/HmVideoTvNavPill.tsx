import { Link } from "wouter";
import type { CSSProperties } from "react";
import { VideoTvBrandLogo } from "@/components/VideoTvBrandLogo";
import { useHmVideoTvSiteBrand } from "@/lib/hmVideoTvSiteBrand";

export type HmVideoTvNavPillProps = {
  href: string;
  active?: boolean;
  accent: string;
  pillIdleBg: string;
  pillText: string;
  activePillText: string;
  /** Koyu nav şeridinde rozet zemini — varsayılan beyaz. */
  whiteIdleBackground?: boolean;
  className?: string;
};

/** HM haber sitesi üst menüsünde video modülü rozeti — site logosu ile markalanır. */
export function HmVideoTvNavPill({
  href,
  active = false,
  accent,
  pillIdleBg,
  pillText,
  activePillText,
  whiteIdleBackground = false,
  className = "",
}: HmVideoTvNavPillProps) {
  const brand = useHmVideoTvSiteBrand();
  const idleBg = whiteIdleBackground && !active ? "#ffffff" : pillIdleBg;
  const style: CSSProperties = {
    background: active ? accent : idleBg,
    color: active ? activePillText : pillText,
    boxShadow: active ? "var(--hm-nav-pill-active-shadow, 0 1px 0 rgba(0,0,0,0.35))" : undefined,
  };

  const label = brand.useSiteBranding ? "Videolar" : "Video TV";

  return (
    <Link
      href={href}
      className={`hm-news-nav-pill hm-video-tv-nav-pill my-1 mr-1 shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-black tracking-[0.06em] transition-colors duration-150${
        active ? " hm-news-nav-pill--active" : ""
      }${className ? ` ${className}` : ""}`}
      style={style}
    >
      <VideoTvBrandLogo
        className="h-5 w-auto max-w-[88px] object-contain"
        alt=""
        preferSiteBranding={brand.useSiteBranding}
        siteLogoUrl={brand.siteLogoUrl}
        siteName={brand.siteName}
      />
      <span className={brand.useSiteBranding ? "max-w-[7rem] truncate uppercase" : "sr-only"}>{label}</span>
    </Link>
  );
}
