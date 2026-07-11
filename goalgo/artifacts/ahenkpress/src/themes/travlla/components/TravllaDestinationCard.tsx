import { Link } from "wouter";
import type { TravllaDestination } from "../travllaTypes";
import { TRV } from "../travllaPaths";

type Props = { destination: TravllaDestination };

export function TravllaDestinationCard({ destination }: Props) {
  return (
    <Link href={TRV.destinasyon(destination.slug)} className="trv-dest-card">
      <img src={destination.image} alt={destination.title} loading="lazy" />
      <div className="trv-dest-meta">
        <h3>{destination.title}</h3>
        <span>{destination.listings} tur & konaklama</span>
      </div>
    </Link>
  );
}
