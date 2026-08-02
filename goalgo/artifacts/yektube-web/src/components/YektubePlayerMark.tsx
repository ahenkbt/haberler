import { useState } from "react";
import { YEKTUBE_ICON_URL, YEKTUBE_LOGO_URL, YEKTUBE_VIDEO_TV_LOGO_URL } from "@/lib/assetUrl";

type Props = {
  className?: string;
  /** Oynatıcı köşesi için daha belirgin logo */
  variant?: "icon" | "logo";
  /** YouTube köşe filigranını kapatmak için Yektube logosu + koyu zemin */
  coverYoutubeCorner?: boolean;
  /** iframe oynatıcı boyutu — watch / shorts */
  playerVariant?: "watch" | "shorts";
  preferVideoTvLogo?: boolean;
};

/** Oynatıcı köşesinde Yektube markası */
export function YektubePlayerMark({
  className = "",
  variant = "icon",
  coverYoutubeCorner = false,
  playerVariant = "watch",
  preferVideoTvLogo = false,
}: Props) {
  if (coverYoutubeCorner) {
    const logoSrc = preferVideoTvLogo ? YEKTUBE_VIDEO_TV_LOGO_URL : YEKTUBE_LOGO_URL;
    const sizeClasses =
      playerVariant === "shorts"
        ? preferVideoTvLogo
          ? "h-7 w-auto max-w-[min(44%,7.5rem)]"
          : "h-5 w-auto max-w-[min(34%,5.5rem)] sm:h-5"
        : preferVideoTvLogo
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

  const primary = variant === "logo" ? YEKTUBE_LOGO_URL : YEKTUBE_ICON_URL;
  const fallback = variant === "logo" ? YEKTUBE_ICON_URL : YEKTUBE_LOGO_URL;
  const [src, setSrc] = useState(primary);

  return (
    <img
      src={src}
      alt="Yektube"
      className={`pointer-events-none h-7 w-auto select-none object-contain ${className}`.trim()}
      draggable={false}
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
