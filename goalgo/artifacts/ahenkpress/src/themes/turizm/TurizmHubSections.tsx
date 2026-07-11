import { useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { TURIZM } from "./turizmRoutes";
import type { TurizmCmsBannerRow, TurizmCmsFeaturedPost } from "./turizmCmsTypes";
import {
  formatTryPrice,
  TURIZM_HUB_CAMPAIGN_TABS,
  type TurizmHubActionCard,
  type TurizmHubLinkColumn,
  type TurizmHubRouteCard,
  type TurizmHubValueCard,
} from "./turizmHubConfig";

export function TurizmHubValueCards({ cards }: { cards: TurizmHubValueCard[] }) {
  return (
    <div className="bc-hub-value-grid">
      {cards.map((c) => (
        <div key={c.title} className="bc-hub-value-card">
          <span className="bc-hub-value-card__icon" aria-hidden>
            {c.icon}
          </span>
          <h3>{c.title}</h3>
          <p>{c.description}</p>
        </div>
      ))}
    </div>
  );
}

type CampaignItem = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  href?: string;
  code?: string;
  category: string;
};

function buildCampaignItems(
  banners: TurizmCmsBannerRow[],
  posts: TurizmCmsFeaturedPost[],
  defaultCategory: string,
): CampaignItem[] {
  const fromBanners: CampaignItem[] = banners.map((b) => ({
    id: `banner-${b.id}`,
    title: b.title || "Kampanya",
    image: b.image_url,
    href: b.link_url || undefined,
    category: b.category_slug || defaultCategory,
  }));
  const fromPosts: CampaignItem[] = posts.map((p) => ({
    id: `post-${p.id}`,
    title: p.title,
    subtitle: p.excerpt || undefined,
    image: p.cover_image_url || undefined,
    href: TURIZM.blogPost(p.slug),
    category: p.category_slug || defaultCategory,
  }));
  return [...fromBanners, ...fromPosts];
}

export function TurizmHubCampaignCarousel({
  title,
  banners,
  featuredPosts,
  defaultCategory = "ucus",
}: {
  title: string;
  banners: TurizmCmsBannerRow[];
  featuredPosts: TurizmCmsFeaturedPost[];
  defaultCategory?: string;
}) {
  const [tab, setTab] = useState("all");
  const carouselId = useId().replace(/:/g, "");
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const items = useMemo(
    () => buildCampaignItems(banners, featuredPosts, defaultCategory),
    [banners, featuredPosts, defaultCategory],
  );

  const filtered =
    tab === "all"
      ? items
      : items.filter((i) => i.category === tab || (tab === "otel" && i.category === "konaklama"));

  const display = filtered.length > 0 ? filtered : items;

  if (display.length === 0) return null;

  return (
    <section className="bc-hub-section" data-campaign-carousel={carouselId}>
      <div className="bc-hub-section__head">
        <h2>{title}</h2>
      </div>
      <div className="bc-hub-campaign-tabs" role="tablist">
        {TURIZM_HUB_CAMPAIGN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`bc-hub-campaign-tabs__btn${tab === t.id ? " bc-hub-campaign-tabs__btn--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bc-hub-campaign-carousel">
        <button
          ref={prevRef}
          type="button"
          className="bc-hub-campaign-carousel__nav bc-hub-campaign-carousel__nav--prev"
          aria-label="Önceki"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Swiper
          modules={[Navigation, Autoplay]}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={(swiper) => {
            if (typeof swiper.params.navigation !== "boolean" && swiper.params.navigation) {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }
          }}
          autoplay={{ delay: 5000, disableOnInteraction: true }}
          spaceBetween={16}
          slidesPerView={1.1}
          breakpoints={{ 640: { slidesPerView: 2.2 }, 1024: { slidesPerView: 3.2 } }}
        >
          {display.map((item) => (
            <SwiperSlide key={item.id}>
              {item.href ? (
                <a href={item.href} className="bc-hub-promo-card" target="_blank" rel="noopener noreferrer">
                  <PromoCardInner item={item} />
                </a>
              ) : (
                <div className="bc-hub-promo-card">
                  <PromoCardInner item={item} />
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
        <button
          ref={nextRef}
          type="button"
          className="bc-hub-campaign-carousel__nav bc-hub-campaign-carousel__nav--next"
          aria-label="Sonraki"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function PromoCardInner({ item }: { item: CampaignItem }) {
  return (
    <>
      <div className="bc-hub-promo-card__media">
        {item.image ? (
          <img src={item.image} alt="" loading="lazy" />
        ) : (
          <span className="bc-hub-promo-card__placeholder">🎁</span>
        )}
        {item.code ? <span className="bc-hub-promo-card__code">{item.code}</span> : null}
      </div>
      <div className="bc-hub-promo-card__body">
        <h3>{item.title}</h3>
        {item.subtitle ? <p>{item.subtitle}</p> : null}
      </div>
    </>
  );
}

export function TurizmHubPopularRoutes({
  title,
  domestic,
  international,
  showTabs = true,
  singleRow = false,
}: {
  title: string;
  domestic: TurizmHubRouteCard[];
  international?: TurizmHubRouteCard[];
  showTabs?: boolean;
  /** Tek satır yatay kaydırma — ikinci satıra düşmez */
  singleRow?: boolean;
}) {
  const [scope, setScope] = useState<"domestic" | "international">("domestic");
  const routes =
    showTabs && international
      ? scope === "domestic"
        ? domestic
        : international
      : domestic;

  return (
    <section className="bc-hub-section">
      <div className="bc-hub-section__head">
        <h2>{title}</h2>
      </div>
      {showTabs && international ? (
        <div className="bc-dest-tabs">
          <button
            type="button"
            className={`bc-dest-tabs__btn${scope === "domestic" ? " bc-dest-tabs__btn--active" : ""}`}
            onClick={() => setScope("domestic")}
          >
            Yurt içi
          </button>
          <button
            type="button"
            className={`bc-dest-tabs__btn${scope === "international" ? " bc-dest-tabs__btn--active" : ""}`}
            onClick={() => setScope("international")}
          >
            Yurt dışı
          </button>
        </div>
      ) : null}
      <div className={`bc-hub-route-grid${singleRow ? " bc-hub-route-grid--single-row" : ""}`}>
        {routes.map((r) => (
          <Link key={`${r.origin}-${r.destination}`} href={r.href} className="bc-hub-route-card">
            <div className="bc-hub-route-card__media">
              <img src={r.image} alt="" loading="lazy" />
            </div>
            <div className="bc-hub-route-card__body">
              <p className="bc-hub-route-card__route">
                {r.origin}
                {r.originCode ? ` (${r.originCode})` : ""} — {r.destination}
                {r.destCode ? ` (${r.destCode})` : ""}
              </p>
              <strong className="bc-hub-route-card__price">{formatTryPrice(r.priceTry)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TurizmHubFeatureGrid({ title, cards }: { title: string; cards: TurizmHubValueCard[] }) {
  return (
    <section className="bc-hub-section">
      <div className="bc-hub-section__head">
        <h2>{title}</h2>
      </div>
      <div className="bc-hub-feature-grid">
        {cards.map((c) => (
          <div key={c.title} className="bc-hub-feature-card">
            <span className="bc-hub-feature-card__icon" aria-hidden>
              {c.icon}
            </span>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TurizmHubActionCards({ title, cards }: { title: string; cards: TurizmHubActionCard[] }) {
  return (
    <section className="bc-hub-section">
      <div className="bc-hub-section__head">
        <h2>{title}</h2>
      </div>
      <div className="bc-hub-action-grid">
        {cards.map((c) => (
          <a key={c.title} href={c.href} className="bc-hub-action-card">
            <span className="bc-hub-action-card__icon" aria-hidden>
              {c.icon}
            </span>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function TurizmHubLinkColumns({ title, columns }: { title: string; columns: TurizmHubLinkColumn[] }) {
  return (
    <section className="bc-hub-section bc-hub-section--links">
      <div className="bc-hub-section__head">
        <h2>{title}</h2>
      </div>
      <div className="bc-hub-link-columns">
        {columns.map((col) => (
          <div key={col.title} className="bc-hub-link-col">
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TurizmHubPartnerLogos({ partners }: { partners: { name: string; logo?: string }[] }) {
  return (
    <section className="bc-hub-section bc-hub-section--partners">
      <div className="bc-hub-partners">
        {partners.map((p) => (
          <span key={p.name} className="bc-hub-partner">
            {p.logo ? <img src={p.logo} alt={p.name} loading="lazy" /> : p.name}
          </span>
        ))}
      </div>
    </section>
  );
}
