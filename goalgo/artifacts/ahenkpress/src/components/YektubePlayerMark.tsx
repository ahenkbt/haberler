const YEKTUBE_LOGO_SRC = "/yektube-logo.png";

/** Oynatıcı üzerinde köşe markası — `public/yektube-logo.png` (YouTube filigranı üstü). */
export function YektubePlayerMark({
  className = "",
  /** YouTube köşe filigranını kapatmak için Yektube logosu + koyu zemin */
  coverYoutubeCorner = false,
  /** iframe oynatıcı boyutu — watch / shorts */
  playerVariant = "watch",
}: {
  className?: string;
  coverYoutubeCorner?: boolean;
  playerVariant?: "watch" | "shorts";
}) {
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
          src={YEKTUBE_LOGO_SRC}
          alt="Yektube"
          className={`select-none object-contain object-bottom brightness-110 ${sizeClasses} ${className}`.trim()}
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
