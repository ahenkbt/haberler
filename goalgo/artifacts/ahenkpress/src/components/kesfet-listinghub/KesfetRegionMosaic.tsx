import { KESFET_REGIONS, type KesfetRegion } from "@/lib/kesfetRegions";

type Props = {
  cityCounts: Map<string, number>;
  activeCity: string;
  onSelectCity: (cityName: string) => void;
};

function regionListingCount(region: KesfetRegion, cityCounts: Map<string, number>): number {
  let total = 0;
  for (const city of region.cities) {
    total += cityCounts.get(city) ?? 0;
  }
  return total;
}

export function KesfetRegionMosaic({ cityCounts, activeCity, onSelectCity }: Props) {
  return (
    <div className="lh-region-mosaic">
      {KESFET_REGIONS.map((region) => {
        const count = regionListingCount(region, cityCounts);
        const regionActive = region.cities.includes(activeCity);
        return (
          <article
            key={region.id}
            className={`lh-region-card ${region.mosaic}${regionActive ? " region-active" : ""}`}
          >
            <img
              className="lh-region-img"
              src={region.image}
              alt={region.imageAlt}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = "1";
                img.style.opacity = "0.35";
              }}
            />
            <div className="lh-region-overlay">
              {count > 0 ? (
                <span className="lh-region-badge">{count} işletme</span>
              ) : null}
              <div className="lh-region-body">
                <h4 className="lh-region-title">{region.name}</h4>
                <div className="lh-region-city-chips" role="list" aria-label={`${region.name} şehirleri`}>
                  {region.cities.map((city) => {
                    const isActive = activeCity === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        role="listitem"
                        className={`lh-region-city-chip${isActive ? " active" : ""}`}
                        onClick={() => onSelectCity(city)}
                        aria-pressed={isActive}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
