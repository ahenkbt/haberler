import { Link } from "wouter";
import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import type { TurizmIntroCard } from "./turizmCategoryIntroConfig";

type Props = {
  cards: TurizmIntroCard[];
  onCardFilter?: (filter: Partial<ListingFilterState>) => void;
  listingsAnchorId?: string;
};

function SidebarPromoCard({
  card,
  onCardFilter,
  listingsAnchorId,
}: {
  card: TurizmIntroCard;
  onCardFilter?: (filter: Partial<ListingFilterState>) => void;
  listingsAnchorId: string;
}) {
  const body = (
    <>
      <div className="bc-sidebar-promo__media">
        <img src={card.image} alt="" loading="lazy" />
      </div>
      <div className="bc-sidebar-promo__body">
        <h4>{card.title}</h4>
        <p>{card.description}</p>
      </div>
    </>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="bc-sidebar-promo">
        {body}
      </Link>
    );
  }

  if (card.filter && onCardFilter) {
    return (
      <button
        type="button"
        className="bc-sidebar-promo"
        onClick={() => {
          onCardFilter(card.filter!);
          document.getElementById(listingsAnchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {body}
      </button>
    );
  }

  return (
    <a href={`#${listingsAnchorId}`} className="bc-sidebar-promo">
      {body}
    </a>
  );
}

/** Filtre kutusunun altında dikey promo kartları */
export function TurizmSidebarPromos({ cards, onCardFilter, listingsAnchorId = "bc-listings" }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="bc-sidebar-promos" aria-label="Promosyon kartları">
      {cards.map((card) => (
        <SidebarPromoCard
          key={card.title}
          card={card}
          onCardFilter={onCardFilter}
          listingsAnchorId={listingsAnchorId}
        />
      ))}
    </div>
  );
}
