import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  KESFET_HUB_BADGE_LABEL,
  KESFET_HUB_FEATURED_CARDS,
  KESFET_HUB_HERO_SUBTITLE,
  KESFET_HUB_HERO_TITLE,
  KESFET_HUB_PATH,
  KESFET_HUB_SECTIONS,
  type KesfetHubCard,
} from "@/lib/kesfetDiscoverHub";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";

const HUB_CARD_ROW_CLASS =
  "yekpare-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:gap-3 md:overflow-visible md:px-0";

const HUB_CARD_ITEM_CLASS = "min-w-[132px] shrink-0 sm:min-w-[140px]";

type KesfetDiscoverHubSectionProps = {
  variant?: "page" | "section";
};

function resolveCardHref(card: KesfetHubCard, variant: "page" | "section") {
  if (variant === "section" && card.id === "kesfet-liste") {
    return KESFET_HUB_PATH;
  }
  return card.href;
}

function HubCompactTile({
  card,
  variant,
  size = "default",
}: {
  card: KesfetHubCard;
  variant: "page" | "section";
  size?: "default" | "compact";
}) {
  const href = resolveCardHref(card, variant);
  const isCompact = size === "compact";

  return (
    <Link
      href={href}
      className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white text-center shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#039D55]/35 hover:bg-[#f7fbf8] hover:shadow-[0_8px_24px_rgba(3,157,85,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#039D55] ${
        isCompact ? "min-h-[5.5rem] px-2 py-2.5" : "min-h-[7.5rem] px-3 py-4 sm:min-h-[8.25rem]"
      }`}
    >
      <span
        className={`grid place-items-center rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-sm ring-1 ring-black/5 transition group-hover:scale-105 ${
          isCompact ? "h-10 w-10 text-xl" : "h-12 w-12 text-2xl sm:h-14 sm:w-14 sm:text-3xl"
        }`}
        aria-hidden
      >
        {card.emoji}
      </span>
      <span
        className={`font-black leading-tight text-slate-900 transition group-hover:text-[#039D55] ${
          isCompact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"
        }`}
      >
        {card.title}
      </span>
      {!isCompact ? (
        <span className="line-clamp-2 text-[10px] font-semibold leading-snug text-slate-500 sm:text-[11px]">
          {card.description}
        </span>
      ) : null}
    </Link>
  );
}

function HubSectionBlock({ variant }: { variant: "page" | "section" }) {
  return (
    <div className="space-y-10 md:space-y-12">
      {KESFET_HUB_SECTIONS.map((section) => (
        <div key={section.id}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-emerald-100/80 pb-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950 md:text-xl">{section.title}</h2>
              {section.subtitle ? (
                <p className="mt-0.5 text-xs font-semibold text-slate-500 md:text-sm">{section.subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {section.cards.map((card) => (
              <HubCompactTile key={card.id} card={card} variant={variant} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HubFeaturedRow({ variant }: { variant: "page" | "section" }) {
  return (
    <div className={HUB_CARD_ROW_CLASS}>
      {KESFET_HUB_FEATURED_CARDS.map((card) => (
        <div key={card.id} className={HUB_CARD_ITEM_CLASS}>
          <HubCompactTile card={card} variant={variant} size="compact" />
        </div>
      ))}
    </div>
  );
}

export function KesfetDiscoverHubSection({ variant = "page" }: KesfetDiscoverHubSectionProps) {
  if (variant === "section") {
    return (
      <section className="border-y border-slate-100 bg-white py-10 md:py-14">
        <div className={YEKPARE_PAGE_CONTAINER_CLASS}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#0f766e] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {KESFET_HUB_BADGE_LABEL}
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              {KESFET_HUB_HERO_TITLE}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 md:text-base">
              {KESFET_HUB_HERO_SUBTITLE}
            </p>
          </div>
          <div className="mt-8 md:mt-10">
            <HubFeaturedRow variant="section" />
          </div>
          <div className="mt-8 text-center">
            <Link
              href={KESFET_HUB_PATH}
              className="inline-flex items-center gap-2 text-sm font-black text-[#039D55] transition hover:gap-3"
            >
              Tüm Keşfet merkezini aç
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${YEKPARE_PAGE_CONTAINER_CLASS} py-10 md:py-14`}>
      <div className="relative mx-auto max-w-3xl text-center">
        <div
          className="pointer-events-none absolute inset-x-0 -top-8 mx-auto h-32 max-w-md rounded-full bg-gradient-to-r from-emerald-200/40 via-teal-100/30 to-sky-200/40 blur-3xl"
          aria-hidden
        />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#0f766e] shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          {KESFET_HUB_BADGE_LABEL}
        </span>
        <h1 className="relative mt-5 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0f766e] bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-5xl md:leading-[1.1]">
          {KESFET_HUB_HERO_TITLE}
        </h1>
        <p className="relative mt-4 text-base font-semibold leading-7 text-slate-600 md:text-lg">
          {KESFET_HUB_HERO_SUBTITLE}
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        <HubSectionBlock variant="page" />
      </div>
    </section>
  );
}
