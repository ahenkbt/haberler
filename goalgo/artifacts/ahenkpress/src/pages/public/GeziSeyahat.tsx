import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import { GeziSeyahatShell } from "@/components/GeziSeyahatShell";
import {
  GEZI_COUNTRIES,
  GEZI_EDITORIAL_FEATURES,
  GEZI_REGION_FILTERS,
  GEZI_TURKEY_DESTINATIONS,
  type GeziRegion,
} from "@/lib/geziSeyahatData";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { TurizmCategoryBlogRow } from "@/themes/turizm/TurizmCategoryBlogRow";
import { getCategoryHero } from "@/themes/turizm/turizmHubConfig";
import "@/styles/bookingCoreTurizm.css";

export default function GeziSeyahat() {
  const [loc, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<GeziRegion | "all">("all");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bolge = params.get("bolge");
      if (bolge === "turkiye") setRegion("turkiye");
      else if (bolge === "dunya") setRegion("all");
      else {
        const r = params.get("region") as GeziRegion | null;
        if (r && GEZI_REGION_FILTERS.some((f) => f.value === r)) setRegion(r);
      }
    } catch {
      /* ignore */
    }
  }, [loc]);

  useEffect(() => {
    applySocialShareMeta({
      title: "Gezi Seyahat — Türkiye ve Dünya Rotaları | Yekpare",
      descriptionPrimary:
        "Türkiye şehirleri ve seçkin ülkelerden destinasyon keşfi. Bilgi Ağacı rehberleri ve Seyahat modülüne geçiş.",
      canonicalPath: "/gezi-seyahat",
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  const turkeyCards = useMemo(() => {
    if (region === "all" || region === "turkiye") return GEZI_TURKEY_DESTINATIONS;
    return [];
  }, [region]);

  const countryCards = useMemo(() => {
    if (region === "turkiye") return [];
    if (region === "all") return GEZI_COUNTRIES;
    return GEZI_COUNTRIES.filter((c) => c.region === region);
  }, [region]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/bilgiagaci/${wikiTitleToUrlSlug(term)}`);
  }

  function setRegionFilter(value: GeziRegion | "all") {
    setRegion(value);
    if (value === "turkiye") navigate("/gezi-seyahat?bolge=turkiye");
    else if (value === "all") navigate("/gezi-seyahat");
    else navigate(`/gezi-seyahat?region=${value}`);
  }

  const hero = getCategoryHero("gezi-seyahat");

  return (
    <GeziSeyahatShell>
      <section
        className="trv-gezi-hero section-full bc-hub-hero bc-hub-hero--bus bc-hub-hero--category"
        style={{ backgroundImage: `url(${hero.bg})` }}
        aria-label="Gezi seyahat arama"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="trv-gezi-hero__body bc-hub-hero__inner bc-hub-hero__inner--bus">
          <span className="trv-gezi-kicker">Keşfet</span>
          <h1 className="trv-gezi-title bc-hub-hero__title bc-hub-hero__title--dark">{hero.title}</h1>
          <p className="trv-hero-sub mx-auto max-w-xl text-base font-medium bc-hub-hero__subtitle">
            {hero.subtitle}
          </p>
        </div>
      </section>

      <div className="trv-gezi-search-dock container">
        <div className="trv-gezi-search-card">
          <form onSubmit={handleSearch} className="trv-gezi-search-row">
            <label className="trv-field">
              <span>Nereyi keşfetmek istersiniz?</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Şehir, ülke veya destinasyon yazın…"
              />
            </label>
            <button type="submit" className="site-button trv-search-submit">
              <Search className="h-4 w-4" aria-hidden />
              Ara
            </button>
          </form>
        </div>
      </div>

      <TurizmCategoryBlogRow slug="gezi-seyahat" title={null} />

      <section className="trv-trend-section section-full">
        <div className="container trv-trend-layout">
          <div>
            <div className="trv-section-head" style={{ textAlign: "left", margin: "0 0 2rem" }}>
              <h2>
                <span className="accent">Trend</span> Destinasyonlar
              </h2>
              <p>
                Türkiye öncelikli filtreli keşif: seçkin ülkeler, şehir rotaları ve görsel gezi kartları.
              </p>
            </div>
            <div className="trv-dest-filter">
              {GEZI_REGION_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={region === f.value ? "active" : ""}
                  onClick={() => setRegionFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {GEZI_EDITORIAL_FEATURES.map((item) => (
                <div key={item.num} className="trv-feature-step">
                  <span className="num">{item.num}</span>
                  <h3 style={{ margin: "0 0 0.35rem", fontFamily: "Afacad, sans-serif", color: "var(--trv-heading)" }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            {turkeyCards.length > 0 ? (
              <>
                <div className="trv-section-head" style={{ textAlign: "left", marginBottom: "1.25rem" }}>
                  <h2>
                    Türkiye <span className="accent">Şehirleri</span>
                  </h2>
                </div>
                <Swiper
                  modules={[Navigation, Autoplay]}
                  spaceBetween={16}
                  slidesPerView={1.15}
                  navigation
                  autoplay={{ delay: 3200, disableOnInteraction: false }}
                  breakpoints={{
                    640: { slidesPerView: 2 },
                    992: { slidesPerView: 2.5 },
                  }}
                  style={{ marginBottom: "2rem" }}
                >
                  {turkeyCards.map((dest) => (
                    <SwiperSlide key={dest.name}>
                      <Link href={dest.wikiHref} className="trv-dest-chip">
                        <img src={dest.image} alt={dest.name} loading="lazy" />
                        <div className="trv-dest-chip__meta">
                          <h4>{dest.name}</h4>
                          <p>{dest.excerpt}</p>
                        </div>
                      </Link>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </>
            ) : null}

            {countryCards.length > 0 ? (
              <>
                <div className="trv-section-head" style={{ textAlign: "left", marginBottom: "1.25rem" }}>
                  <h2>
                    Seçkin <span className="accent">Ülkeler</span>
                  </h2>
                </div>
                <div className="trv-dest-chip-grid">
                  {countryCards.map((country) => (
                    <article key={country.id} className="trv-country-card">
                      <div className="trv-country-card__media">
                        <img src={country.image} alt={country.name} loading="lazy" />
                        <span className="trv-country-card__flag" aria-hidden>
                          {country.flag}
                        </span>
                      </div>
                      <div className="trv-country-card__body">
                        <h3>{country.name}</h3>
                        <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--trv-body)" }}>
                          {country.excerpt}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {country.destinations.map((city) => (
                            <Link
                              key={city.name}
                              href={city.wikiHref}
                              className="rounded-full border border-[rgba(6,97,104,0.2)] px-3 py-1 text-xs font-bold text-[var(--trv-primary)] hover:bg-[rgba(6,97,104,0.08)]"
                            >
                              {city.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-full" style={{ padding: "2rem 0 3rem" }}>
        <div className="container">
          <div className="trv-section-head">
            <h2>
              Dünya <span className="accent">Şehirleri</span>
            </h2>
            <p>Ülke kartlarından bağımsız — görsel ağırlıklı şehir vitrini</p>
          </div>
          <div className="trv-dest-chip-grid">
            {GEZI_COUNTRIES.flatMap((c) => c.destinations)
              .filter((d) => region === "all" || d.region === region)
              .map((city) => (
                <Link key={`${city.country}-${city.name}`} href={city.wikiHref} className="trv-dest-chip">
                  <img src={city.image} alt={city.name} loading="lazy" />
                  <div className="trv-dest-chip__meta">
                    <h4>
                      {city.name} · {city.country}
                    </h4>
                    <p>{city.excerpt}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      <section className="section-full" style={{ paddingBottom: "3rem" }}>
        <div className="container">
          <div className="trv-cta-band">
            <h3>Rezervasyona hazır mısınız?</h3>
            <p style={{ margin: "0 0 1rem", opacity: 0.95 }}>
              Gezi Seyahat editoryal keşif sunar; otel, tur ve araç kiralama için Seyahat modülünü kullanın.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <Link href={TURIZM.hub} className="site-button btn-white">
                Seyahat modülü
              </Link>
              <Link href="/bilgiagaci" className="site-button outline" style={{ color: "#fff", borderColor: "#fff" }}>
                Bilgi Ağacı
              </Link>
            </div>
          </div>
        </div>
      </section>
    </GeziSeyahatShell>
  );
}
