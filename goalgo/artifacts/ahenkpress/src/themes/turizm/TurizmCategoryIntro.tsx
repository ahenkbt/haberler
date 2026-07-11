import { Link } from "wouter";
import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import { TurizmCategoryBanners } from "./TurizmCategoryBanners";
import type { TurizmCategorySlug, TurizmIntroCard } from "./turizmCategoryIntroConfig";
import { useTurizmCms } from "./useTurizmCms";
import "@/styles/bookingCoreTurizm.css";

type Props = {
  slug: TurizmCategorySlug;
  onCardFilter?: (filter: Partial<ListingFilterState>) => void;
  listingsAnchorId?: string;
  /** Sadece üst intro (banner + bölümler). Sidebar promos ayrı bileşende. */
  variant?: "full" | "main-only" | "cms-only";
};

function IntroCard({
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
      <div className="bc-cat-intro-card__media">
        <img src={card.image} alt="" loading="lazy" />
      </div>
      <div className="bc-cat-intro-card__body">
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </div>
    </>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="bc-cat-intro-card">
        {body}
      </Link>
    );
  }

  if (card.filter && onCardFilter) {
    return (
      <button
        type="button"
        className="bc-cat-intro-card"
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
    <a href={`#${listingsAnchorId}`} className="bc-cat-intro-card">
      {body}
    </a>
  );
}

/** Kategori listeleme sayfalarında ilanların üstünde tanıtım bölümleri */
export function TurizmCategoryIntro({
  slug,
  onCardFilter,
  listingsAnchorId = "bc-listings",
  variant = "full",
}: Props) {
  const { cms } = useTurizmCms(slug);

  return (
    <div className="bc-cat-intro" data-category={slug}>
      {variant !== "main-only" ? <TurizmCategoryBanners banners={cms.banners} /> : null}

      {cms.featuredPosts.length > 0 ? (
        <div className="bc-cat-manset">
          <div className="bc-cat-manset__head">
            <h2>Manşet</h2>
          </div>
          <ul className="bc-cat-manset__list">
            {cms.featuredPosts.map((p) => (
              <li key={p.id}>
                <Link href={`/turizm/blog/${encodeURIComponent(p.slug)}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {variant === "cms-only" ? null : (
        cms.mainSections.slice(0, 1).map((section) => (
          <section key={section.title || "intro"} className="bc-cat-intro__section">
            <div className="bc-cat-intro__grid bc-cat-intro__grid--single-row">
              {section.cards.map((card) => (
                <IntroCard
                  key={card.title}
                  card={card}
                  onCardFilter={onCardFilter}
                  listingsAnchorId={listingsAnchorId}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** Kategori sayfası altında: H1 + açıklama (üst başlıktan taşındı) */
export function TurizmCategoryPageFooter({ title, description }: { title: string; description?: string }) {
  if (!title && !description) return null;
  return (
    <footer className="bc-page-heading bc-page-heading--bottom">
      <div className="bc-page-heading__inner">
        {title ? <h1>{title}</h1> : null}
        {description ? <p className="bc-page-heading__desc">{description}</p> : null}
      </div>
    </footer>
  );
}

/** Sidebar promos için CMS verisi (BookingCoreListe içinde kullanılır) */
export function useTurizmSidebarPromos(slug: TurizmCategorySlug) {
  const { cms } = useTurizmCms(slug);
  return cms.sidebarCards;
}
