import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";

const YEKTUBE_LOGO_SRC = "/yektube-logo.png";
const YEKTUBE_VIDEO_TV_LOGO_SRC = "/yektube-video-tv-logo.png";

/** Oynatıcı üzerinde köşe markası — YouTube filigranının üstüne opak zemin + logo. */
export function YektubePlayerMark({
  className = "",
  /** YouTube köşe filigranını kapatmak için Yektube logosu + koyu zemin */
  coverYoutubeCorner = false,
  /** iframe oynatıcı boyutu — watch / shorts */
  playerVariant = "watch",
  /** HM Video TV sayfalarında geniş VIDEO TV logosu */
  preferVideoTvLogo,
}: {
  className?: string;
  coverYoutubeCorner?: boolean;
  playerVariant?: "watch" | "shorts";
  preferVideoTvLogo?: boolean;
}) {
  const hmTv = useHmVideoTvLayout();
  const useVideoTvLogo = preferVideoTvLogo ?? Boolean(hmTv);

  if (coverYoutubeCorner) {
    const logoSrc = useVideoTvLogo ? YEKTUBE_VIDEO_TV_LOGO_SRC : YEKTUBE_LOGO_SRC;
    const sizeClasses =
      playerVariant === "shorts"
        ? useVideoTvLogo
          ? "h-7 w-auto max-w-[min(44%,7.5rem)]"
          : "h-5 w-auto max-w-[min(34%,5.5rem)] sm:h-5"
        : useVideoTvLogo
          ? "h-10 sm:h-11 w-auto max-w-[min(62%,15rem)]"
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
        <img
          src={logoSrc}
          alt="Yektube"
          className={`select-none object-contain object-bottom brightness-110 contrast-105 ${sizeClasses} ${className}`.trim()}
          draggable={false}
        />
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
