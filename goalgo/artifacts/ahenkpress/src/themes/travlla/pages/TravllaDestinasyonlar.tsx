import { TravllaShell } from "../TravllaShell";
import { TravllaInnerBanner } from "../components/TravllaInnerBanner";
import { TravllaDestinationCard } from "../components/TravllaDestinationCard";
import { useTravllaDestinations } from "../hooks/useTravllaApi";
import { TRV } from "../travllaPaths";

export default function TravllaDestinasyonlar() {
  const { destinations, loading } = useTravllaDestinations();

  return (
    <TravllaShell page="destinations">
      <TravllaInnerBanner
        title="Destinasyonlar"
        crumbs={[
          { label: "Seyahat", href: TRV.home },
          { label: "Destinasyonlar" },
        ]}
      />
      <div className="container" style={{ padding: "2rem 0 3rem" }}>
        {loading ? (
          <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 320, borderRadius: 24, background: "#dbeeee" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {destinations.map((d) => (
              <TravllaDestinationCard key={d.id} destination={d} />
            ))}
          </div>
        )}
      </div>
    </TravllaShell>
  );
}
