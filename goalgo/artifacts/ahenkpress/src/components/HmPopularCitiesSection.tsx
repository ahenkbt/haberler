import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cityAccessibilityLabel, POPULAR_CITIES, TURKEY_CITIES } from "@/lib/popularCities";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";

export type HmPopularCitiesSectionProps = {
  hmSlug: string;
  accent: string;
  className?: string;
};

/** HM vitrin anasayfasında “Gündem haberleri” blokunun altına — Türkiye şehirleri (ansiklopedi bağlantısı). */
export function HmPopularCitiesSection({ hmSlug, accent, className = "" }: HmPopularCitiesSectionProps) {
  const [showAllCities, setShowAllCities] = useState(false);
  const h = useHmPublicHref();
  const base = h("/bilgiagaci");
  const cities = showAllCities ? TURKEY_CITIES : POPULAR_CITIES;

  useEffect(() => {
    const titles = cities.map((city) => city.name);
    fetch("/api/wiki/precache?lang=tr", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ titles }),
    }).catch(() => {});
  }, [cities]);

  return (
    <section className={`hm-vitrin-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black tracking-wide text-gray-900">Türkiye Şehirleri</h2>
          <p className="text-xs text-gray-500 mt-0.5">{BILGI_AGACI_DISPLAY_NAME} şehir rehberi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={showAllCities}
            onClick={() => setShowAllCities(true)}
            className="rounded-full border px-3 py-1 text-xs font-bold transition hover:shadow-sm disabled:cursor-default"
            style={{
              borderColor: showAllCities ? accent : "rgba(148, 163, 184, 0.45)",
              background: showAllCities ? `${accent}14` : "#fff",
              color: showAllCities ? accent : "#475569",
            }}
            disabled={showAllCities}
          >
            Tümü
          </button>
          <Link
            href={base}
            className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80"
            style={{ color: accent }}
          >
            {BILGI_AGACI_DISPLAY_NAME} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {cities.map((city) => (
          <Link
            key={city.name}
            href={h(`/bilgiagaci/${wikiTitleToUrlSlug(city.name)}`)}
            title={cityAccessibilityLabel(city)}
            aria-label={cityAccessibilityLabel(city)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-slate-50/80 p-2.5 text-center transition hover:border-slate-300 hover:shadow-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-2xl leading-none" aria-hidden>
              {city.emoji}
            </span>
            <span className="text-[11px] font-bold leading-tight text-gray-800">{city.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
