import type { CSSProperties } from "react";
import { Rss } from "lucide-react";

type Props = {
  href: string;
  navOnLight: boolean;
  pillIdleBg: string;
  pillText: string;
};

const iconOnlyPillClass =
  "hm-category-rss-nav inline-flex shrink-0 items-center justify-center rounded-md p-2 transition-colors duration-150";

const title = "RSS beslemesi";

/** Menü şeridinde kategori RSS bağlantısı — yalnızca ikon. */
export function HmCategoryRssNavButton({ href, navOnLight, pillIdleBg, pillText }: Props) {
  const idleStyle: CSSProperties = {
    background: navOnLight ? pillIdleBg : "rgba(255, 255, 255, 0.12)",
    color: pillText,
    border: navOnLight ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255, 255, 255, 0.2)",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${iconOnlyPillClass} my-1`}
      style={idleStyle}
      aria-label={title}
      title={title}
    >
      <Rss className="h-4 w-4 shrink-0" aria-hidden />
    </a>
  );
}
