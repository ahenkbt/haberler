import { Link, useRoute } from "wouter";
import { TravllaShell } from "../TravllaShell";
import { TravllaInnerBanner } from "../components/TravllaInnerBanner";
import { TravllaTourCard } from "../components/TravllaTourCard";
import { useTravllaDestination } from "../hooks/useTravllaApi";
import { TRV } from "../travllaPaths";

export default function TravllaDestinasyonDetay() {
  const [, params] = useRoute("/turizm/destinasyon/:slug");
  const slug = params?.slug || "";
  const { destination, tours, loading } = useTravllaDestination(slug);

  if (loading) {
    return (
      <TravllaShell page="destinations">
        <div className="trv-empty">Yükleniyor…</div>
      </TravllaShell>
    );
  }

  if (!destination) {
    return (
      <TravllaShell page="destinations">
        <div className="trv-empty">
          <p>Destinasyon bulunamadı.</p>
          <Link href={TRV.destinasyonlar} className="site-button">
            Destinasyonlara dön
          </Link>
        </div>
      </TravllaShell>
    );
  }

  return (
    <TravllaShell page="destinations">
      <TravllaInnerBanner
        title={destination.detailTitle || destination.title}
        crumbs={[
          { label: "Seyahat", href: TRV.home },
          { label: "Destinasyonlar", href: TRV.destinasyonlar },
          { label: destination.title },
        ]}
      />
      <div className="container" style={{ padding: "2rem 0 3rem" }}>
        <div className="trv-detail-panel" style={{ marginBottom: "2rem" }}>
          <img
            src={destination.image}
            alt={destination.title}
            style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 16 }}
          />
          {destination.excerpt ? <p style={{ marginTop: "1rem" }}>{destination.excerpt}</p> : null}
          <p style={{ fontWeight: 700, color: "var(--trv-primary)" }}>
            {destination.listings} tur ve konaklama seçeneği
          </p>
          <Link
            href={`${TRV.turlar}?city=${encodeURIComponent(destination.title)}`}
            className="site-button"
            style={{ marginTop: 8 }}
          >
            Bu destinasyondaki turları gör
          </Link>
        </div>

        <h2 style={{ fontFamily: "Afacad, sans-serif", color: "var(--trv-heading)" }}>Öne çıkan turlar</h2>
        {tours.length === 0 ? (
          <div className="trv-empty">Bu destinasyon için henüz tur listelenmedi.</div>
        ) : (
          <div className="trv-tour-grid">
            {tours.map((t) => (
              <TravllaTourCard key={t.id} tour={t} />
            ))}
          </div>
        )}
      </div>
    </TravllaShell>
  );
}
