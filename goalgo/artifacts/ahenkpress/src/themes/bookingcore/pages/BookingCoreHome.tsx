import { Children, useEffect, useState } from "react";
import { Link } from "wouter";
import { Gift, Mail, Palmtree } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { SADE_PUBLIC_PAGE_BG_WHITE, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import { TurizmSubNavBar } from "@/themes/turizm/TurizmSubNavBar";
import { TurizmCategoryBlogRow } from "@/themes/turizm/TurizmCategoryBlogRow";
import { turizmBlogCategoryLabel, type TurizmBlogPostListItem } from "@/themes/turizm/turizmCmsTypes";
import { formatTurizmBlogDate, useTurizmBlogPosts } from "@/themes/turizm/useTurizmBlogPosts";
import { resetSeoToSiteDefaults, applySocialShareMeta } from "@/lib/pageSeo";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { BookingCoreHeroSearch } from "../components/BookingCoreHeroSearch";
import {
  BookingCoreBlogCard,
  BookingCoreDestinationTile,
  BookingCoreEventHomeCard,
  BookingCoreHomeCard,
  BookingCoreTestimonial,
} from "../components/BookingCoreHomeCard";
import { fetchEtkinlikEvents, type EtkinlikEventResult } from "../lib/etkinlikEvents";
import { useTourismDestinations, useTourismListings } from "../hooks/useTourismListings";
import "@/styles/bookingCoreTurizm.css";

const HERO_BG =
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80";

const PROMO_CARDS: { title: string; desc: string; href: string; tone: string; Icon: LucideIcon }[] = [
  {
    title: "Özel Teklifler",
    desc: "Sezon indirimleri ve erken rezervasyon fırsatları",
    href: TURIZM.konaklama.home,
    tone: "blue",
    Icon: Gift,
  },
  {
    title: "Haber Bültenleri",
    desc: "Turizm ipuçları ve Yekpare duyuruları",
    href: TURIZM.blog,
    tone: "cyan",
    Icon: Mail,
  },
  {
    title: "Seyahat İpuçları",
    desc: "Destinasyon rehberleri ve pratik bilgiler",
    href: TURIZM.turlar.destinasyonlar,
    tone: "gold",
    Icon: Palmtree,
  },
];

const TESTIMONIALS = [
  {
    name: "Ayşe K.",
    text: "Villa kiralama ve otel aramasını tek yerden yaptık. Yekpare Turizm arayüzü çok pratik.",
    rating: 5,
  },
  {
    name: "Mehmet T.",
    text: "Kapadokya turu rezervasyonu sorunsuzdu; demo vitrin bile güven verici.",
    rating: 5,
  },
  {
    name: "Zeynep A.",
    text: "Araç kiralama modülü ile tur paketlerini aynı gün planladık.",
    rating: 5,
  },
];

function SectionCarousel({
  title,
  subtitle,
  loading,
  children,
  viewAllHref,
  emptyMessage = "Şu an listelenecek ilan yok.",
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  children: React.ReactNode;
  viewAllHref?: string;
  emptyMessage?: string;
}) {
  const slides = Children.toArray(children).filter(Boolean);
  const hasSlides = slides.length > 0;

  return (
    <section className="bc-home-section">
      <div className="bc-home-section__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {viewAllHref ? (
          <Link href={viewAllHref} className="bc-home-section__more">
            Tümünü gör →
          </Link>
        ) : null}
      </div>
      {loading ? (
        <div className="bc-home-section__skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bc-skeleton" />
          ))}
        </div>
      ) : !hasSlides ? (
        <p className="bc-home-section__empty">{emptyMessage}</p>
      ) : (
        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={16}
          slidesPerView={1.15}
          navigation
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 2.1 },
            900: { slidesPerView: 3.1 },
            1200: { slidesPerView: 4 },
          }}
          className="bc-home-swiper"
        >
          {children}
        </Swiper>
      )}
    </section>
  );
}

export default function BookingCoreHome() {
  const [carouselCity, setCarouselCity] = useState("");
  const [events, setEvents] = useState<EtkinlikEventResult[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { listings: villas, loading: villasLoading } = useTourismListings({ type: "villa", limit: 8, featured: true });
  const { listings: tours, loading: toursLoading } = useTourismListings({
    type: "tour",
    limit: 8,
    featured: true,
    city: carouselCity || undefined,
  });
  const { listings: cars, loading: carsLoading } = useTourismListings({ type: "car", limit: 4, featured: true });
  const { listings: boats, loading: boatsLoading } = useTourismListings({ type: "boat", limit: 4, featured: true });
  const { destinations, loading: destLoading } = useTourismDestinations();
  const { posts: blogPosts, loading: blogLoading } = useTurizmBlogPosts(3);

  useEffect(() => {
    applySocialShareMeta({
      title: "Yekpare Seyahat — Otel, Villa, Tur ve Ulaşım",
      descriptionPrimary: "Türkiye turizm vitrini: otel, villa/ev kiralama, turlar, araç ve yat.",
      canonicalPath: TURIZM.hub,
      imageUrl: HERO_BG,
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    const city = carouselCity.trim() || "İstanbul";
    void fetchEtkinlikEvents({ city, fetchAll: true, take: 8 }).then((res) => {
      if (cancelled) return;
      setEvents((res?.events ?? []).slice(0, 8));
      setEventsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [carouselCity]);

  return (
    <div className="bc-yekpare bc-home bg-white" data-page="turizm-bookingcore-home">
      <section className="sade-public-hero-stage bc-home-hero sade-public-hero-surface" style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_WHITE)}>
        <TurizmSubNavBar className="turizm-subnav--hero-glass" />
        <div className="bc-home-hero__overlay">
          <BookingCoreHeroSearch onLocationPick={setCarouselCity} />
        </div>
      </section>

      <TurizmCategoryBlogRow slug="hub" title={null} />

      <div className="bc-home-promos">
        {PROMO_CARDS.map((c) => (
          <Link key={c.title} href={c.href} className={`bc-home-promo bc-home-promo--${c.tone}`}>
            <span className="bc-home-promo__icon" aria-hidden>
              <c.Icon className="h-5 w-5" />
            </span>
            <div>
              <strong>{c.title}</strong>
              <p>{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <SectionCarousel
        title="Popüler Etkinlikler"
        subtitle={
          carouselCity
            ? `${carouselCity} — konser, tiyatro ve etkinlik biletleri`
            : "İstanbul ve Türkiye genelinde konser, tiyatro ve etkinlik biletleri"
        }
        loading={eventsLoading}
        viewAllHref={TURIZM.stubs.etkinlik}
        emptyMessage="Şu an listelenecek etkinlik yok."
      >
        {events.map((event) => (
          <SwiperSlide key={`event-${event.id}`}>
            <BookingCoreEventHomeCard event={event} />
          </SwiperSlide>
        ))}
      </SectionCarousel>

      <section className="bc-home-section">
        <div className="bc-home-section__head">
          <div>
            <h2>En İyi Destinasyonlar</h2>
            <p>Türkiye&apos;nin öne çıkan rotaları</p>
          </div>
          <Link href={TURIZM.turlar.destinasyonlar} className="bc-home-section__more">
            Tümünü gör →
          </Link>
        </div>
        {destLoading ? (
          <div className="bc-dest-grid bc-home-section__skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bc-skeleton bc-skeleton--tile" />
            ))}
          </div>
        ) : (
          <div className="bc-dest-grid">
            {destinations.slice(0, 3).map((d) => (
              <BookingCoreDestinationTile
                key={d.slug}
                title={d.title}
                slug={d.slug}
                image={d.image}
                listings={d.listings}
              />
            ))}
          </div>
        )}
      </section>

      <SectionCarousel
        title="En İyi Tatil ve Turlar"
        subtitle={
          carouselCity
            ? `${carouselCity} — rehberli geziler ve paket turlar`
            : "Rehberli geziler ve paket turlar"
        }
        loading={toursLoading}
        viewAllHref={
          carouselCity
            ? `${TURIZM.turlar.home}?city=${encodeURIComponent(carouselCity)}`
            : TURIZM.turlar.home
        }
      >
        {tours.map((l) => (
          <SwiperSlide key={l.id}>
            <BookingCoreHomeCard listing={l} featured />
          </SwiperSlide>
        ))}
      </SectionCarousel>

      <SectionCarousel
        title="Kiralık İlanı"
        subtitle="Günlük ve haftalık villa, apart ve ev kiralama"
        loading={villasLoading}
        viewAllHref={TURIZM.villaEv.home}
      >
        {villas.map((l) => (
          <SwiperSlide key={l.id}>
            <BookingCoreHomeCard listing={l} featured />
          </SwiperSlide>
        ))}
      </SectionCarousel>

      <SectionCarousel
        title="Otomobil Trendleri"
        subtitle="Günlük araç kiralama vitrini"
        loading={carsLoading}
        viewAllHref={TURIZM.arac.home}
      >
        {cars.map((l) => (
          <SwiperSlide key={l.id}>
            <BookingCoreHomeCard listing={l} featured />
          </SwiperSlide>
        ))}
      </SectionCarousel>

      <SectionCarousel
        title="Yat Tekne Kiralama"
        subtitle="Yat, tekne ve gulet kiralama ilanları"
        loading={boatsLoading}
        viewAllHref={TURIZM.yat.home}
      >
        {boats.map((l) => (
          <SwiperSlide key={l.id}>
            <BookingCoreHomeCard listing={l} />
          </SwiperSlide>
        ))}
      </SectionCarousel>

      <section className="bc-home-section">
        <div className="bc-home-section__head">
          <div>
            <h2>Blogdaki son yazıları okuyun</h2>
            <p>Seyahat rehberleri ve ipuçları</p>
          </div>
          <Link href={TURIZM.blog} className="bc-home-section__more">
            Blog →
          </Link>
        </div>
        {blogLoading ? (
          <p className="bc-blog__loading">Yükleniyor…</p>
        ) : blogPosts.length === 0 ? (
          <p className="bc-blog__empty">Henüz yayınlanmış blog yazısı yok.</p>
        ) : (
          <div className="bc-blog-grid">
            {blogPosts.map((p: TurizmBlogPostListItem) => (
              <BookingCoreBlogCard
                key={p.id}
                title={p.title}
                category={turizmBlogCategoryLabel(p.category_slug)}
                date={formatTurizmBlogDate(p.published_at)}
                image={p.cover_image_url || "/turizm/category-intro/travel.jpg"}
                href={TURIZM.blogPost(p.slug)}
                excerpt={p.excerpt || ""}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bc-home-cta">
        <div>
          <h2>Şehrinizi tanıyor musunuz?</h2>
          <p>Yerel uzmanlar olarak Yekpare Turizm ağına katılın.</p>
        </div>
        <Link href="/isletme-basvuru" className="bc-home-cta__btn">
          Yerel Uzman Olun
        </Link>
      </section>

      <section className="bc-home-section">
        <div className="bc-home-section__head">
          <div>
            <h2>Mutlu müşterilerimiz</h2>
            <p>Yekpare Turizm deneyimleri</p>
          </div>
        </div>
        <div className="bc-testimonial-grid">
          {TESTIMONIALS.map((t) => (
            <BookingCoreTestimonial key={t.name} {...t} />
          ))}
        </div>
      </section>

    </div>
  );
}
