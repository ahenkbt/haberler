import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { KesfetRegionMosaic } from "@/components/kesfet-listinghub/KesfetRegionMosaic";
import { TURKEY_CITIES } from "@/lib/popularCities";
import "@/styles/listinghubKesfet.css";

const API = "/api";

type ListingBusiness = {
  address?: string | null;
};

type Props = {
  /** Keşfet hub: filtre + scroll; anasayfa: /kesfet yönlendirmesi */
  mode?: "hub" | "home";
  activeCity?: string;
  onSelectCity?: (cityName: string) => void;
  /** Anasayfada SixAmMart Section başlığı; Keşfet'te lh-sec-head */
  variant?: "sade" | "kesfet";
};

function buildCityCounts(businesses: ListingBusiness[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of businesses) {
    const parts = (b.address ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    const city = parts[parts.length - 1] ?? "";
    if (!city) continue;
    map.set(city, (map.get(city) ?? 0) + 1);
  }
  return map;
}

export function KesfetRegionsExploreBlock({
  mode = "hub",
  activeCity = "",
  onSelectCity,
  variant = "kesfet",
}: Props) {
  const [, setLocation] = useLocation();
  const [businesses, setBusinesses] = useState<ListingBusiness[]>([]);

  useEffect(() => {
    fetch(`${API}/map/businesses?limit=120`)
      .then((r) => r.json())
      .then((d) => setBusinesses(d?.success && Array.isArray(d.data) ? d.data : []))
      .catch(() => setBusinesses([]));
  }, []);

  const cityCounts = useMemo(() => buildCityCounts(businesses), [businesses]);

  function handleSelectCity(cityName: string) {
    if (onSelectCity) {
      onSelectCity(cityName);
      return;
    }
    if (mode === "home") {
      const params = new URLSearchParams();
      params.set("city", cityName);
      setLocation(`/kesfet?${params.toString()}#lh-popular-businesses`);
      return;
    }
  }

  const header =
    variant === "sade" ? (
      <div className="mb-4 text-center">
        <h2 className="text-[22px] font-black tracking-tight text-slate-950">
          Bölgelere göre <span className="text-[#039D55]">keşfet</span>
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          Marmara, Ege, Akdeniz ve diğer bölgelerde işletmeleri inceleyin
        </p>
      </div>
    ) : (
      <div className="lh-sec-head">
        <h2>
          Bölgelere göre <span>keşfet</span>
        </h2>
        <p>Marmara, Ege, Akdeniz ve diğer bölgelerde işletmeleri inceleyin</p>
      </div>
    );

  const scopeClass = variant === "sade" ? "lh-kesfet sade-home-regions" : "lh-kesfet";

  return (
    <div className={scopeClass}>
      {header}
      <KesfetRegionMosaic cityCounts={cityCounts} activeCity={activeCity} onSelectCity={handleSelectCity} />
      <h3 className="lh-all-cities-head">Tüm şehirler</h3>
      <div
        className={`lh-all-cities-scroll${variant === "sade" ? " yekpare-scrollbar" : ""}`}
        role="list"
        aria-label="Tüm iller"
      >
        {TURKEY_CITIES.map((city) => {
          const isActive = activeCity === city.name;
          return (
            <button
              key={city.name}
              type="button"
              role="listitem"
              className={`lh-all-cities-chip${isActive ? " active" : ""}`}
              onClick={() => handleSelectCity(city.name)}
              aria-pressed={isActive}
            >
              <span className="lh-all-cities-chip-emoji" aria-hidden>
                {city.emoji}
              </span>
              {city.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
