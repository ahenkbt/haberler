import { useMemo } from "react";
import { Link } from "wouter";
import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import { CATEGORY_BLOG_ROW_TITLE } from "./turizmHubConfig";
import type { TurizmCategorySlug, TurizmIntroCard } from "./turizmCategoryIntroConfig";
import { turizmBlogHref } from "./turizmCategoryIntroConfig";
import { buildTurizmBlogSeedPosts } from "./turizmBlogPostsSeed";
import { TURIZM } from "./turizmRoutes";
import type { MergedTurizmCms, TurizmCmsFeaturedPost } from "./turizmCmsTypes";
import { useTurizmCms } from "./useTurizmCms";
import "@/styles/bookingCoreTurizm.css";

type BlogRowCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  href?: string;
  filter?: Partial<ListingFilterState>;
};

function postToCard(post: TurizmCmsFeaturedPost): BlogRowCard {
  return {
    id: `post-${post.id}`,
    title: post.title,
    description: post.excerpt || "",
    image: post.cover_image_url || "/turizm/category-intro/travel.jpg",
    href: TURIZM.blogPost(post.slug),
  };
}

function introToCard(card: TurizmIntroCard, index: number): BlogRowCard {
  return {
    id: `intro-${index}-${card.title}`,
    title: card.title,
    description: card.description,
    image: card.image,
    href: card.href || (card.filter ? undefined : turizmBlogHref(card.title)),
    filter: card.filter,
  };
}

function buildBlogRowCards(cms: MergedTurizmCms, slug: TurizmCategorySlug): BlogRowCard[] {
  if (cms.featuredPosts.length > 0) {
    return cms.featuredPosts.slice(0, 4).map(postToCard);
  }
  const introCards = cms.mainSections.flatMap((s) => s.cards);
  if (introCards.length > 0) {
    return introCards.slice(0, 4).map(introToCard);
  }
  if (slug === "hub") {
    return buildTurizmBlogSeedPosts()
      .filter((p) => p.category_slug === null && p.is_featured)
      .slice(0, 4)
      .map((p) => ({
        id: `seed-${p.slug}`,
        title: p.title,
        description: p.excerpt,
        image: p.cover_image_url,
        href: TURIZM.blogPost(p.slug),
      }));
  }
  return [];
}

function BlogRowCardView({
  card,
  onCardFilter,
  listingsAnchorId,
}: {
  card: BlogRowCard;
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
        {card.description ? <p>{card.description}</p> : null}
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

type Props = {
  slug: TurizmCategorySlug;
  onCardFilter?: (filter: Partial<ListingFilterState>) => void;
  listingsAnchorId?: string;
  /** Başlık gösterme (varsayılan: kategori bazlı) */
  title?: string | null;
  className?: string;
};

/** Hero altında 4 blog/tanıtım kutusu — tek satır, mobilde yığılır */
export function TurizmCategoryBlogRow({
  slug,
  onCardFilter,
  listingsAnchorId = "bc-listings",
  title,
  className = "",
}: Props) {
  const { cms } = useTurizmCms(slug);
  const cards = useMemo(() => buildBlogRowCards(cms, slug), [cms, slug]);
  const rowTitle = title === null ? null : title ?? CATEGORY_BLOG_ROW_TITLE[slug];

  if (cards.length === 0) return null;

  return (
    <section
      className={`bc-hub-blog-row${className ? ` ${className}` : ""}`}
      data-category={slug}
      aria-label={rowTitle || "Öne çıkan içerikler"}
    >
      {rowTitle ? (
        <div className="bc-hub-blog-row__head">
          <h2>{rowTitle}</h2>
        </div>
      ) : null}
      <div className="bc-cat-intro__grid bc-cat-intro__grid--single-row bc-hub-blog-row__grid">
        {cards.map((card) => (
          <BlogRowCardView
            key={card.id}
            card={card}
            onCardFilter={onCardFilter}
            listingsAnchorId={listingsAnchorId}
          />
        ))}
      </div>
    </section>
  );
}
