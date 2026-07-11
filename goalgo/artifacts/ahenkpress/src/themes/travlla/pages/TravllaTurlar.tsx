import { useMemo, useState } from "react";
import { TravllaShell } from "../TravllaShell";
import { TravllaInnerBanner } from "../components/TravllaInnerBanner";
import { TravllaFilterSidebar } from "../components/TravllaFilterSidebar";
import { TravllaTourCard } from "../components/TravllaTourCard";
import { useTravllaTours } from "../hooks/useTravllaApi";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bodrum", "Kapadokya", "Fethiye", "Trabzon", "Muğla"];

export default function TravllaTurlar() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialCity = params.get("city") || "";

  const [filters, setFilters] = useState({
    city: initialCity,
    maxPrice: "15000",
    minRating: "",
    sort: "featured",
  });
  const [page, setPage] = useState(1);

  const { tours, total, loading } = useTravllaTours({
    city: filters.city || undefined,
    page,
    limit: 12,
    type: "tour",
  });

  const filtered = useMemo(() => {
    let rows = [...tours];
    const maxP = Number(filters.maxPrice);
    if (maxP > 0) {
      rows = rows.filter((t) => Number(t.sale_price || t.price || 0) <= maxP);
    }
    if (filters.minRating) {
      const min = Number(filters.minRating);
      rows = rows.filter((t) => (t.rating || 0) >= min);
    }
    if (filters.sort === "price_asc") {
      rows.sort((a, b) => Number(a.sale_price || a.price) - Number(b.sale_price || b.price));
    } else if (filters.sort === "price_desc") {
      rows.sort((a, b) => Number(b.sale_price || b.price) - Number(a.sale_price || a.price));
    } else if (filters.sort === "rating") {
      rows.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return rows;
  }, [tours, filters]);

  return (
    <TravllaShell page="listing">
      <TravllaInnerBanner
        title="Tur Paketleri"
        crumbs={[
          { label: "Seyahat", href: TURIZM.hub },
          { label: "Turlar", href: TURIZM.turlar.home },
          { label: "Liste" },
        ]}
      />
      <div className="container trv-listing-layout">
        <TravllaFilterSidebar
          filters={filters}
          onChange={(next) => {
            setFilters((f) => ({ ...f, ...next }));
            setPage(1);
          }}
          cities={CITIES}
        />
        <div>
          <p style={{ margin: "0 0 1rem", fontWeight: 600 }}>
            {loading ? "Yükleniyor…" : `${filtered.length} tur listeleniyor`}
            {filters.city ? ` · ${filters.city}` : ""}
          </p>
          {loading && filtered.length === 0 ? (
            <div className="trv-tour-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 260, borderRadius: 24, background: "#dbeeee" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="trv-empty">
              <p>Filtrelere uygun tur bulunamadı.</p>
            </div>
          ) : (
            <div className="trv-tour-grid">
              {filtered.map((t) => (
                <TravllaTourCard key={t.id} tour={t} />
              ))}
            </div>
          )}
          {total > page * 12 && (
            <div className="trv-pagination">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ‹
              </button>
              <span className="active">{page}</span>
              <button type="button" onClick={() => setPage((p) => p + 1)}>
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </TravllaShell>
  );
}
