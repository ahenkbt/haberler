import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SERVICE_MODULE_CARD_HERO_CLASS =
  "group relative flex min-h-[100px] flex-col justify-between rounded-[10px] border border-white/60 bg-white/95 p-3 shadow-[0_8px_24px_rgba(3,157,85,0.12)] backdrop-blur-sm transition hover:bg-[#039D55] hover:text-white md:min-h-[108px] md:p-3.5";

export const SERVICE_MODULE_CARD_PLAIN_CLASS =
  "group relative flex min-h-[100px] flex-col justify-between rounded-[10px] border border-slate-200/90 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-[#039D55]/30 hover:bg-[#039D55] hover:text-white hover:shadow-[0_8px_24px_rgba(3,157,85,0.18)] md:min-h-[108px] md:p-3.5";

export type ServiceModuleCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentColor?: string;
  className?: string;
  surface?: "hero" | "plain";
};

export function ServiceModuleCard({
  href,
  title,
  description,
  icon: Icon,
  accentColor = "#039D55",
  className = "",
  surface = "plain",
}: ServiceModuleCardProps) {
  const surfaceClass = surface === "hero" ? SERVICE_MODULE_CARD_HERO_CLASS : SERVICE_MODULE_CARD_PLAIN_CLASS;
  const iconBgClass =
    surface === "hero"
      ? "mb-1.5 grid h-[40px] w-[40px] place-items-center rounded-lg bg-emerald-50/90 shadow-sm md:mb-2 md:h-[44px] md:w-[44px]"
      : "mb-1.5 grid h-[40px] w-[40px] place-items-center rounded-lg shadow-sm transition group-hover:bg-white/20 md:mb-2 md:h-[44px] md:w-[44px]";

  return (
    <Link href={href} className={`${surfaceClass} ${className}`}>
      <span
        className={`absolute right-2.5 top-2.5 transition group-hover:text-white md:right-3 md:top-3 ${
          surface === "hero" ? "text-[#039D55]" : "text-slate-400"
        }`}
      >
        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </span>
      <span
        className={iconBgClass}
        style={
          surface === "hero"
            ? undefined
            : { backgroundColor: `${accentColor}18`, color: accentColor }
        }
      >
        <Icon
          className={`h-[18px] w-[18px] md:h-5 md:w-5 ${surface === "hero" ? "text-[#039D55] group-hover:text-[#039D55]" : "group-hover:text-white"}`}
          strokeWidth={2.25}
        />
      </span>
      <span className={`pr-4 leading-tight ${surface === "hero" ? "text-xs font-semibold sm:text-sm md:text-[15px]" : "text-xs font-bold sm:text-sm md:text-[15px]"}`}>
        {title}
      </span>
      <span
        className={`mt-0.5 text-[10px] text-slate-500 group-hover:text-white/80 sm:text-[11px] md:text-xs ${
          surface === "hero" ? "line-clamp-2" : "line-clamp-1"
        }`}
      >
        {description}
      </span>
    </Link>
  );
}
