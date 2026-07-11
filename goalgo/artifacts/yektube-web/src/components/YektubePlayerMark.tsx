import { useState } from "react";
import { YEKTUBE_ICON_URL, YEKTUBE_LOGO_URL } from "@/lib/assetUrl";

type Props = {
  className?: string;
  /** Oynatıcı köşesi için daha belirgin logo */
  variant?: "icon" | "logo";
  /** YouTube köşe filigranını kapatmak için Yektube logosu + koyu zemin */
  coverYoutubeCorner?: boolean;
  /** iframe oynatıcı boyutu — watch / shorts */
  playerVariant?: "watch" | "shorts";
};

/** Oynatıcı köşesinde Yektube markası */
export function YektubePlayerMark({
  className = "",
  variant = "icon",
  coverYoutubeCorner = false,
  playerVariant = "watch",
}: Props) {
  if (coverYoutubeCorner) {
    const sizeClasses =
      playerVariant === "shorts"
        ? "h-5 w-auto max-w-[min(34%,5.5rem)] sm:h-5"
        : "h-10 sm:h-11 w-auto max-w-[min(52%,12rem)]";
    const pillPad =
      playerVariant === "shorts"
        ? "px-0.5 py-px"
        : "px-1 py-0.5 sm:px-1.5 sm:py-0.5";
    return (
      <span
        className={`pointer-events-none z-10 inline-flex items-center justify-end rounded-[3px] bg-black/45 leading-none ${pillPad} shadow-[0_1px_3px_rgba(0,0,0,0.3)]`}
        aria-hidden
      >
        <img
          src={YEKTUBE_LOGO_URL}
          alt="Yektube"
          className={`select-none object-contain object-bottom brightness-110 ${sizeClasses} ${className}`.trim()}
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
