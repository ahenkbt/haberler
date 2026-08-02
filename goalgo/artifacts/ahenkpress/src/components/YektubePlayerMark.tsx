import { useHmVideoTvSiteBrand } from "@/lib/hmVideoTvSiteBrand";

const YEKTUBE_LOGO_SRC = "/yektube-logo.png";

/** Oynatıcı üzerinde köşe markası — YouTube filigranının üstüne opak logo. */
export function YektubePlayerMark({
  className = "",
  coverYoutubeCorner = false,
  playerVariant = "watch",
}: {
  className?: string;
  coverYoutubeCorner?: boolean;
  playerVariant?: "watch" | "shorts";
}) {
  const { useSiteBranding, siteLogoUrl, siteName } = useHmVideoTvSiteBrand();

  if (coverYoutubeCorner) {
    const sizeClasses =
      playerVariant === "shorts"
        ? useSiteBranding
          ? "h-7 w-7 object-contain"
          : "h-5 w-auto max-w-[min(34%,5.5rem)] sm:h-5"
        : useSiteBranding && siteLogoUrl
          ? "h-9 w-auto max-w-[min(48%,10rem)] object-contain"
          : "h-9 sm:h-10 w-auto max-w-[min(52%,12rem)]";
    const pillPad =
      playerVariant === "shorts"
        ? "px-1 py-0.5"
        : "px-1.5 py-1 sm:px-2 sm:py-1";
    return (
      <span
        className={`pointer-events-none z-30 inline-flex items-center justify-end rounded-[2px] bg-black leading-none ${pillPad} shadow-[0_0_0_1px_rgba(0,0,0,0.9)]`}
        aria-hidden
      >
        {useSiteBranding && siteLogoUrl ? (
          <img
            src={siteLogoUrl}
            alt=""
            className={`select-none object-contain object-bottom brightness-110 ${sizeClasses} ${className}`.trim()}
            draggable={false}
          />
        ) : useSiteBranding ? (
          <span
            className={`max-w-[min(52%,10rem)] truncate text-[10px] font-black uppercase tracking-wide text-white sm:text-[11px] ${className}`.trim()}
          >
            {siteName}
          </span>
        ) : (
          <img
            src={YEKTUBE_LOGO_SRC}
            alt="Yektube"
            className={`select-none object-contain object-bottom brightness-110 contrast-105 ${sizeClasses} ${className}`.trim()}
            draggable={false}
          />
        )}
      </span>
    );
  }

  return (
    <img
      src="/yektube-icon.png"
      alt="Yektube"
      className={`pointer-events-none select-none w-auto max-w-full object-contain object-bottom ${className}`.trim()}
      draggable={false}
    />
  );
}
