import { useEffect, useRef } from "react";
import noUiSlider from "nouislider";

type FilterState = {
  city: string;
  maxPrice: string;
  minRating: string;
  sort: string;
};

type Props = {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  cities: string[];
  priceMax?: number;
};

export function TravllaFilterSidebar({ filters, onChange, cities, priceMax = 15000 }: Props) {
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el || (el as HTMLDivElement & { noUiSlider?: unknown }).noUiSlider) return;
    const instance = noUiSlider.create(el, {
      start: [0, Number(filters.maxPrice) || priceMax],
      connect: true,
      range: { min: 0, max: priceMax },
      step: 100,
    });
    instance.on("update", (values) => {
      onChange({ maxPrice: String(Math.round(Number(values[1]))) });
    });
  }, [filters.maxPrice, onChange, priceMax]);

  return (
    <aside className="trv-sidebar">
      <h3>Filtrele</h3>

      <div className="trv-filter-group">
        <label>Şehir</label>
        <select value={filters.city} onChange={(e) => onChange({ city: e.target.value })}>
          <option value="">Tüm şehirler</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="trv-filter-group">
        <label>Maksimum fiyat</label>
        <div ref={sliderRef} />
        <div style={{ marginTop: 8, fontWeight: 700, color: "var(--trv-primary)" }}>
          {Number(filters.maxPrice || priceMax).toLocaleString("tr-TR")}₺
        </div>
      </div>

      <div className="trv-filter-group">
        <label>Minimum puan</label>
        <select value={filters.minRating} onChange={(e) => onChange({ minRating: e.target.value })}>
          <option value="">Tümü</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="4.5">4.5+</option>
        </select>
      </div>

      <div className="trv-filter-group">
        <label>Sıralama</label>
        <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })}>
          <option value="featured">Öne çıkanlar</option>
          <option value="price_asc">Fiyat (artan)</option>
          <option value="price_desc">Fiyat (azalan)</option>
          <option value="rating">En yüksek puan</option>
        </select>
      </div>

      <button
        type="button"
        className="site-button"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => onChange({ city: "", maxPrice: String(priceMax), minRating: "", sort: "featured" })}
      >
        Filtreleri temizle
      </button>
    </aside>
  );
}
