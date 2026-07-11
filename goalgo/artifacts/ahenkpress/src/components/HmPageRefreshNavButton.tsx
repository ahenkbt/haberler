import type { CSSProperties } from "react";
import { RefreshCw } from "lucide-react";

type Props = {
  navOnLight: boolean;
  pillIdleBg: string;
  pillText: string;
};

const iconOnlyPillClass =
  "hm-page-refresh-nav inline-flex shrink-0 items-center justify-center rounded-md p-2 transition-colors duration-150";

const ariaLabel = "Sayfayı yenile";

/** Menü şeridinde sayfayı yenile — yalnızca ikon. */
export function HmPageRefreshNavButton({ navOnLight, pillIdleBg, pillText }: Props) {
  const idleStyle: CSSProperties = {
    background: navOnLight ? pillIdleBg : "rgba(255, 255, 255, 0.12)",
    color: pillText,
    border: navOnLight ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255, 255, 255, 0.2)",
  };

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className={`${iconOnlyPillClass} my-1`}
      style={idleStyle}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}
