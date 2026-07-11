import { useMemo } from "react";
import { Link } from "wouter";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import { TravllaShell } from "../TravllaShell";
import { TravllaSearchBar } from "../components/TravllaSearchBar";
import { TravllaTourCard } from "../components/TravllaTourCard";
import { TravllaDestinationCard } from "../components/TravllaDestinationCard";
import { useTravllaDestinations, useTravllaTours } from "../hooks/useTravllaApi";
import { TRV } from "../travllaPaths";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { TRV_HERO_VIDEO } from "../travllaMedia";

const STEPS = [
  { num: "01", title: "Destinasyon seçin", body: "Şehir, tarih ve yolcu sayısını belirleyin." },
  { num: "02", title: "Tur paketini karşılaştırın", body: "Fiyat, program ve yorumlara göre filtreleyin." },
  { num: "03", title: "Rezervasyon yapın", body: "Talebiniz işletmeye iletilir; onay sonrası bilgilendirilirsiniz." },
];

const TESTIMONIALS = [
  { name: "Ayşe K.", text: "Kapadokya balon turu rezervasyonu sorunsuzdu. Yekpare üzerinden hızlıca tamamladık.", rating: 5 },
  { name: "Mehmet T.", text: "Antalya tekne turu için fiyatları karşılaştırmak çok kolaydı.", rating: 5 },
  { name: "Zeynep A.", text: "Destinasyon sayfaları detaylı; güzergâh ve fotoğraflar güven verdi.", rating: 4 },
];

const PLACE_TICKER = [
  { name: "Antalya", tours: 48, highlight: true },
  { name: "İstanbul", tours: 62 },
  { name: "Kapadokya", tours: 35, highlight: true },
  { name: "Bodrum", tours: 29 },
  { name: "Fethiye", tours: 41, highlight: true },
  { name: "Trabzon", tours: 22 },
];

export default function TravllaTurizmHome() {
  const { destinations, loading: destLoading } = useTravllaDestinations();
  const { tours, loading: tourLoading } = useTravllaTours({ limit: 8, type: "tour" });

  const heroCity = useMemo(() => destinations[0]?.title || "Türkiye", [destinations]);

  return (
    <TravllaShell page="home">
      <section className="trv-hero section-full">
        <img className="trv-hero-fallback" src={TRV_HERO_VIDEO} alt="" aria-hidden />
        <div className="trv-hero-overlay">
          <span className="trv-hero-kicker">Keşfet</span>
          <h1 className="trv-hero-title">{heroCity}</h1>
          <p className="trv-hero-sub">
            Türkiye&apos;nin en güzel rotalarında tur paketlerini keşfedin. Yekpare Turlar ile güvenli rezervasyon.
          </p>
          <Link href={TURIZM.turlar.liste} className="site-button btn-white butn-bg-shape">
            Turları İncele
          </Link>
        </div>
      </section>

      <TravllaSearchBar />

      <section className="section-full" style={{ padding: "2.5rem 0" }}>
        <div className="container">
          <div className="trv-section-head">
            <h2>
              <span className="accent">Popüler</span> Destinasyonlar
            </h2>
            <p>Keşfetmeye değer bölgeler — tur paketleri ve rehberler</p>
          </div>
          {destLoading ? (
            <div className="trv-tour-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 320, borderRadius: 24, background: "#dbeeee" }} />
              ))}
            </div>
          ) : (
            <Swiper
              modules={[Navigation, Autoplay]}
              spaceBetween={20}
              slidesPerView={1.1}
              navigation
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              breakpoints={{
                640: { slidesPerView: 2 },
                992: { slidesPerView: 3 },
                1200: { slidesPerView: 4 },
              }}
            >
              {destinations.map((d) => (
                <SwiperSlide key={d.id}>
                  <TravllaDestinationCard destination={d} />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link href={TRV.destinasyonlar} className="site-button outline">
              Tüm destinasyonlar
            </Link>
          </div>
        </div>
      </section>

      <section className="trv-places-ticker section-full">
        <div className="container">
          <Swiper
            modules={[Autoplay]}
            slidesPerView={2}
            spaceBetween={16}
            loop
            autoplay={{ delay: 2500 }}
            breakpoints={{ 768: { slidesPerView: 4 }, 1100: { slidesPerView: 6 } }}
          >
            {PLACE_TICKER.map((p, idx) => (
              <SwiperSlide key={`${p.name}-${idx}`}>
                <div className="trv-place-pill">
                  <span className="count">
                    <i className="fa-regular fa-flag" /> {p.tours} tur
                  </span>
                  <Link
                    href={`${TURIZM.turlar.liste}?city=${encodeURIComponent(p.name)}`}
                    className={`name${p.highlight ? " highlight" : ""}`}
                  >
                    {p.name}
                  </Link>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section className="section-full" style={{ padding: "2.5rem 0" }}>
        <div className="container">
          <div className="trv-section-head">
            <h2>
              Öne Çıkan <span className="accent">Turlar</span>
            </h2>
            <p>En çok tercih edilen tur paketleri</p>
          </div>
          {tourLoading ? (
            <div className="trv-tour-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 260, borderRadius: 24, background: "#dbeeee" }} />
              ))}
            </div>
          ) : (
            <div className="trv-tour-grid">
              {tours.slice(0, 8).map((t) => (
                <TravllaTourCard key={t.id} tour={t} />
              ))}
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link href={TURIZM.turlar.liste} className="site-button">
              Tüm turlar
            </Link>
          </div>
        </div>
      </section>

      <section className="section-full">
        <div className="container">
          <div className="trv-section-head">
            <h2>3 Adımda Rezervasyon</h2>
          </div>
          <div className="trv-steps">
            {STEPS.map((s) => (
              <div key={s.num} className="trv-step-card">
                <div className="num">{s.num}</div>
                <h3 style={{ margin: "0.5rem 0", fontFamily: "Afacad, sans-serif", color: "var(--trv-heading)" }}>
                  {s.title}
                </h3>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-full" style={{ padding: "1rem 0 3rem" }}>
        <div className="container">
          <div className="trv-section-head">
            <h2>
              Yolcu <span className="accent">Yorumları</span>
            </h2>
          </div>
          <Swiper
            modules={[Autoplay, Navigation]}
            spaceBetween={20}
            slidesPerView={1}
            navigation
            autoplay={{ delay: 4000 }}
            breakpoints={{ 768: { slidesPerView: 2 }, 1100: { slidesPerView: 3 } }}
          >
            {TESTIMONIALS.map((t) => (
              <SwiperSlide key={t.name}>
                <div className="trv-testimonial">
                  <div className="trv-stars" style={{ marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <i key={s} className="las la-star" style={{ opacity: s <= t.rating ? 1 : 0.3 }} />
                    ))}
                  </div>
                  <p className="quote">"{t.text}"</p>
                  <strong>{t.name}</strong>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section className="section-full">
        <div className="container">
          <div className="trv-cta-band">
            <h3>Turizm işletmenizi Yekpare&apos;ye ekleyin</h3>
            <p style={{ margin: "0 0 1rem", opacity: 0.95 }}>
              Otel, tur, villa veya araç kiralama hizmetinizi milyonlarca kullanıcıya ulaştırın.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <Link href="/isletme-basvuru" className="site-button btn-white">
                Ücretsiz başvur
              </Link>
              <Link href="/turizm-paneli" className="site-button outline" style={{ color: "#fff", borderColor: "#fff" }}>
                İşletme girişi
              </Link>
            </div>
          </div>
        </div>
      </section>
    </TravllaShell>
  );
}
