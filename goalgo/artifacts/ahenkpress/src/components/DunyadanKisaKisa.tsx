import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Clock, Globe2 } from "lucide-react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import { useWorldBriefs, type WorldBriefContinentGroup, type WorldBriefItem } from "@/hooks/useWorldBriefs";
import { resolveWorldBriefHref } from "@/lib/worldBriefsDisplay";
import { WorldBriefLink } from "@/components/WorldBriefLink";

export type DunyadanKisaKisaProps = {
  accent?: string;
  className?: string;
  perFeed?: number;
  /** HM editör sitesinde public link prefix */
  enabled?: boolean;
};

function fmtTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BriefCard({
  item,
  h,
  accent,
}: {
  item: WorldBriefItem;
  h: (path: string) => string;
  accent: string;
}) {
  const flag = countryCodeToFlagEmoji(item.countryCode);
  return (
    <article className="group rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <span aria-hidden>{flag}</span>
        {item.countryName ? <span>{item.countryName}</span> : null}
        <span className="text-slate-300">·</span>
        <span className="normal-case tracking-normal text-slate-400">{item.sourceName}</span>
      </div>
      <WorldBriefLink
        href={resolveWorldBriefHref(h, item)}
        className="block text-sm font-bold leading-snug text-slate-900 group-hover:underline"
        style={{ textDecorationColor: accent }}
      >
        {item.title}
      </WorldBriefLink>
      {item.spot ? (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.spot}</p>
      ) : null}
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        <Clock className="h-3 w-3" aria-hidden />
        {fmtTime(item.publishedAt)}
      </p>
    </article>
  );
}

function ContinentPanel({
  continent,
  h,
  accent,
}: {
  continent: WorldBriefContinentGroup;
  h: (path: string) => string;
  accent: string;
}) {
  const hasCountries = continent.countries.some((c) => c.items.length > 0);
  const globalItems = continent.items.slice(0, 6);

  return (
    <div className="space-y-5">
      {globalItems.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Küresel / bölgesel</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {globalItems.map((item) => (
              <BriefCard key={item.id} item={item} h={h} accent={accent} />
            ))}
          </div>
        </div>
      ) : null}

      {hasCountries ? (
        <div className="space-y-4">
          {continent.countries.map((country) =>
            country.items.length === 0 ? null : (
              <div key={country.code}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg leading-none" aria-hidden>
                    {countryCodeToFlagEmoji(country.code)}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">{country.name}</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {country.items.slice(0, 6).map((item) => (
                    <BriefCard key={item.id} item={item} h={h} accent={accent} />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Küresel harita RSS kaynaklarından kıta → ülke gruplu dünya haberleri. */
export function DunyadanKisaKisa({
  accent = "#0284c7",
  className = "",
  perFeed = 3,
  enabled = true,
}: DunyadanKisaKisaProps) {
  const h = useHmPublicHref();
  const { data, isLoading, isError } = useWorldBriefs(perFeed, enabled);
  const continents = useMemo(
    () => (data?.continents ?? []).filter((c) => c.items.length > 0 || c.countries.some((co) => co.items.length > 0)),
    [data?.continents],
  );
  const [activeContinent, setActiveContinent] = useState<string>("");

  const selectedId = activeContinent || continents[0]?.id || "";
  const selected = continents.find((c) => c.id === selectedId) ?? continents[0] ?? null;

  if (!enabled) return null;
  if (!isLoading && (isError || continents.length === 0)) return null;

  return (
    <section
      className={`hm-vitrin-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`.trim()}
      aria-label="Dünyadan Kısa Kısa"
      data-hm-home-module="worldBriefs"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
            <Globe2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Dünya
          </p>
          <h2 className="text-lg font-black text-slate-950">Dünyadan Kısa Kısa</h2>
          <p className="text-xs text-slate-500">Kıta ve ülke bazında küresel haber akışı</p>
        </div>
        <Link
          href={h("/kisa-kisa")}
          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80"
          style={{ color: accent }}
        >
          Tümünü gör <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : selected ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Kıtalar">
            {continents.map((continent) => {
              const active = continent.id === selectedId;
              return (
                <button
                  key={continent.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveContinent(continent.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-bold transition"
                  style={{
                    borderColor: active ? accent : "rgba(148, 163, 184, 0.45)",
                    background: active ? `${accent}14` : "#fff",
                    color: active ? accent : "#475569",
                  }}
                >
                  {continent.label}
                </button>
              );
            })}
          </div>
          <ContinentPanel continent={selected} h={h} accent={accent} />
        </>
      ) : null}
    </section>
  );
}
