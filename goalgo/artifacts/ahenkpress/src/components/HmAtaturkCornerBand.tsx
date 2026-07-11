import { useMemo, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import {
  ATATURK_CORNER_HOME_ACTION_LABELS,
  ATATURK_CORNER_HOME_ACTION_SLUGS,
  ATATURK_CORNER_LINKS,
  ATATURK_CORNER_PORTRAIT_SRC,
  ataturkCornerPath,
  pickAtaturkCornerHomeQuote,
} from "@/lib/hmAtaturkCorner";
import { resolveSadeAccent } from "@/lib/yekpareSadeTheme";

const ATATURK_HOME_ACTION_LINKS = ATATURK_CORNER_LINKS.filter((item) =>
  ATATURK_CORNER_HOME_ACTION_SLUGS.includes(item.slug),
);

export type HmAtaturkCornerBandProps = {
  accent?: string;
  className?: string;
};

export function HmAtaturkCornerBand({ accent, className }: HmAtaturkCornerBandProps) {
  const h = useHmPublicHref();
  const quote = useMemo(() => pickAtaturkCornerHomeQuote(), []);
  const accentColor = resolveSadeAccent(accent);
  const sectionClassName = ["hm-ataturk-band", "hm-ataturk-band--home", "mb-8", className]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--hm-ataturk-accent": accentColor,
    borderTopColor: accentColor,
  } as CSSProperties;

  return (
    <section className={sectionClassName} aria-label="Atatürk Köşesi">
      <div
        className="grid w-full overflow-hidden rounded-2xl border border-emerald-100 border-t-4 bg-[#f4fbf7] shadow-sm lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]"
        style={style}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b border-emerald-100 p-4 sm:gap-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-7">
          <div
            className="flex aspect-square h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#C9A84C]/40 bg-white shadow-sm sm:h-24 sm:w-24"
            aria-hidden="true"
          >
            <img
              src={ATATURK_CORNER_PORTRAIT_SRC}
              alt=""
              loading="lazy"
              className="h-[86%] w-[86%] object-contain object-bottom"
            />
          </div>
          <div className="relative min-w-0 pt-1">
            <span
              className="pointer-events-none absolute -top-1 left-0 font-serif text-4xl leading-none text-[#C9A84C]/35 sm:text-5xl"
              aria-hidden
            >
              "
            </span>
            <blockquote className="relative z-[1] m-0 max-w-full font-serif text-sm italic leading-relaxed text-slate-800 sm:text-base">
              {quote}
            </blockquote>
            <cite className="mt-2 block not-italic text-xs font-semibold tracking-wide text-[#0f766e]">
              Mustafa Kemal Atatürk
            </cite>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 p-4 sm:p-6 lg:p-7">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C9A84C]">
            Cumhuriyet Hafızası
          </span>
          <Link
            href={h("/ataturk")}
            className="inline-flex items-center gap-1 text-lg font-black uppercase tracking-wide text-slate-950 transition hover:text-[#0f766e] sm:text-xl"
          >
            ATATÜRK KÖŞESİ
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
          <div className="flex flex-wrap gap-2">
            {ATATURK_HOME_ACTION_LINKS.map((item) => (
              <Link
                key={item.slug}
                href={h(ataturkCornerPath(item.slug))}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#0f766e] transition hover:-translate-y-px hover:border-[#0f766e] hover:bg-emerald-50"
              >
                {ATATURK_CORNER_HOME_ACTION_LABELS[item.slug] ?? item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
