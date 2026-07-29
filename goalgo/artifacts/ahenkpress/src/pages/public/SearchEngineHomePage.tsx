import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  Compass,
  Grid3X3,
  MapPinned,
  Menu,
  Moon,
  Newspaper,
  Plane,
  Play,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sun,
  Utensils,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { UnifiedSearchInput } from "@/components/search/UnifiedSearchInput.tsx";
import { useAuth } from "@/contexts/AuthContext";
import { pushRecentSearch } from "@/hooks/useSearchSuggestions";
import { useYekpareTheme } from "@/hooks/useYekpareTheme";
import { FIRMA_REHBERI_FEATURED_BUSINESSES } from "@/lib/firmaRehberiData";
import { UNIFIED_SEARCH_PATH } from "@/lib/kesfetDiscoverHub";
import {
  applyJsonLd,
  applyPortalSiteSeo,
  buildYekpareWebSiteJsonLd,
  PORTAL_SEARCH_TAGLINE,
} from "@/lib/pageSeo";
import { PORTAL_BRAND_SHORT, PORTAL_SITE_NAME } from "@/lib/portalBrand";

import "@/styles/homepageTheme.css";
import "@/styles/searchSuggest.css";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type ServiceCard = NavItem & {
  desc: string;
  color: string;
};

type FeaturedProduct = {
  name: string;
  category: string;
  price: string;
  href: string;
  color: string;
};

type FeaturedSpotlight = {
  business: (typeof FIRMA_REHBERI_FEATURED_BUSINESSES)[number];
  product: FeaturedProduct;
};

const navItems: NavItem[] = [
  { label: "Haber", href: "/haberler", icon: Newspaper },
  { label: "Video", href: "/yektube", icon: Video },
  { label: "Newsmap", href: "/newsmap", icon: MapPinned },
  { label: "Haber Merkezi", href: "/habermerkezi", icon: Building2 },
];

const searchExamples = [
  "Son dakika haberler",
  "Yerel gündem",
  "Canlı yayın",
  "Newsmap",
  "Haber Merkezi",
];

const heroChips = [
  { label: "Haber", href: "/haberler" },
  { label: "Video", href: "/yektube" },
  { label: "Newsmap", href: "/newsmap" },
  { label: "Haber Merkezi", href: "/habermerkezi" },
];

const services: ServiceCard[] = [
  { label: "Haberler", href: "/haberler", icon: Newspaper, desc: "Gündem ve manşet akışı.", color: "#0f766e" },
  { label: "YekTube", href: "/yektube", icon: Video, desc: "Canlı TV ve video içerikleri.", color: "#dc2626" },
  { label: "Newsmap", href: "/newsmap", icon: MapPinned, desc: "Haber haritası ve konum.", color: "#059669" },
  { label: "Haber Merkezi", href: "/habermerkezi", icon: Building2, desc: "HM editör siteleri ve yayınlar.", color: "#7c3aed" },
];

const whyCards = [
  { icon: Search, title: "Tek Arama", desc: "Haber ve video sonuçları tek aramada birleşir." },
  { icon: CheckCircle2, title: "Tek Hesap", desc: "Platform genelinde tek hesap ve hızlı erişim." },
  { icon: Grid3X3, title: "Tek Platform", desc: "Haber Merkezi, Yektube ve Newsmap aynı ekosistemde." },
];

const resultTypes = [
  { label: "Haber", value: "Gündem akışı", icon: Newspaper, href: "/haberler" },
  { label: "Video", value: "YekTube içerikleri", icon: Play, href: "/yektube" },
  { label: "Newsmap", value: "Haber haritası", icon: MapPinned, href: "/newsmap" },
  { label: "Haber Merkezi", value: "Editör siteleri", icon: Building2, href: "/habermerkezi" },
];

const featuredProducts: FeaturedProduct[] = [
  { name: "Günün manşetleri", category: "Haber", price: "Canlı akış", href: "/haberler", color: "#0f766e" },
  { name: "Canlı TV & video", category: "YekTube", price: "İzle", href: "/yektube", color: "#dc2626" },
  { name: "Newsmap", category: "Harita", price: "Keşfet", href: "/newsmap", color: "#059669" },
  { name: "Haber Merkezi", category: "Yayın", price: "Siteler", href: "/habermerkezi", color: "#7c3aed" },
];

const trendingCards = [
  {
    title: "En Çok Arananlar",
    icon: Zap,
    lines: [
      { label: "Son dakika", href: "/haberler?q=son%20dakika" },
      { label: "Gündem", href: "/haberler?q=g%C3%BCndem" },
      { label: "Yerel haber", href: "/haberler?q=yerel" },
      { label: "Ekonomi", href: "/haberler?q=ekonomi" },
    ],
  },
  {
    title: "Son Dakika Haberler",
    icon: Bell,
    lines: [
      { label: "Merkez Bankası faiz kararı", href: "/haberler?q=Merkez%20Bankas%C4%B1%20faiz" },
      { label: "İstanbul'da sağanak uyarısı", href: "/haberler?q=%C4%B0stanbul%20sa%C4%9Fanak" },
      { label: "Yeni vergi düzenlemesi", href: "/haberler?q=vergi%20d%C3%BCzenlemesi" },
    ],
  },
  {
    title: "Popüler Videolar",
    icon: Video,
    lines: [
      { label: "Günün en çok izlenenleri", href: "/yektube" },
      { label: "Teknoloji kısa özetleri", href: "/yektube?q=teknoloji" },
      { label: "Haber özetleri", href: "/yektube?q=haber" },
    ],
  },
  {
    title: "Haber Merkezi",
    icon: BadgePercent,
    lines: [
      { label: "Editör siteleri", href: "/habermerkezi" },
      { label: "Newsmap", href: "/newsmap" },
      { label: "YekTube", href: "/yektube" },
    ],
  },
];

const footerGroups = [
  { title: "Keşfet", links: ["Haberler", "Videolar", "Newsmap", "Haber Merkezi"] },
  { title: "Servisler", links: ["Haberler", "YekTube"] },
  { title: "Yönetim", links: ["Anasayfa Tasarım", "Anasayfa Modülleri"] },
  { title: "Yardım", links: ["SSS", "Gizlilik", "Kullanım Şartları", "İletişim", "Kariyer"] },
];

const footerHrefByLabel: Record<string, string> = {
  Haberler: "/haberler",
  Videolar: "/yektube",
  YekTube: "/yektube",
  Newsmap: "/newsmap",
  "Haber Merkezi": "/habermerkezi",
  "Anasayfa Tasarım": "/admin/anasayfa-tasarim",
  "Anasayfa Modülleri": "/admin/anasayfa-modulleri",
  SSS: "/destek",
  Gizlilik: "/gizlilik",
  "Kullanım Şartları": "/kullanim-sartlari",
  İletişim: "/iletisim",
  Kariyer: "/kariyer",
};

function routeForHomeQuery(rawQuery: string): string {
  const q = rawQuery.trim();
  const nq = q.toLocaleLowerCase("tr-TR");
  if (nq.includes("video") || nq.includes("yektube") || nq.includes("canlı") || nq.includes("canli")) {
    return q ? `/yektube?q=${encodeURIComponent(q)}` : "/yektube";
  }
  if (nq.includes("newsmap") || nq.includes("harita")) {
    return "/newsmap";
  }
  if (nq.includes("haber merkezi") || nq.includes("habermerkezi") || nq.includes("editör") || nq.includes("editor")) {
    return "/habermerkezi";
  }
  if (!q) return UNIFIED_SEARCH_PATH;
  const params = new URLSearchParams({ q });
  return `${UNIFIED_SEARCH_PATH}?${params.toString()}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

function SectionReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function PremiumLogo() {
  return (
    <Link href="/" className="ypl-logo" aria-label={`${PORTAL_SITE_NAME} ana sayfa`}>
      <span className="ypl-logo-mark">T</span>
      <span>{PORTAL_SITE_NAME}</span>
    </Link>
  );
}

function PremiumNav({
  theme,
  onToggleTheme,
}: {
  theme: "day" | "night";
  onToggleTheme: () => void;
}) {
  return (
    <header className="ypl-nav-wrap">
      <div className="ypl-nav">
        <PremiumLogo />
        <nav className="ypl-nav-links" aria-label={`${PORTAL_SITE_NAME} ana menü`}>
          <Link href="/ara" className="ypl-nav-link">
            <Search className="h-3.5 w-3.5" aria-hidden />
            Search
          </Link>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="ypl-nav-link">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ypl-nav-actions">
          <button
            type="button"
            className="ypl-icon-button"
            onClick={onToggleTheme}
            aria-label={theme === "night" ? "Gündüz moduna geç" : "Gece moduna geç"}
          >
            {theme === "night" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" className="ypl-icon-button ypl-menu-button" aria-label="Menüyü aç">
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/hesabim" className="ypl-login">
            Giriş Yap
          </Link>
        </div>
      </div>
    </header>
  );
}

function FloatingServiceIcons() {
  const icons = [
    { icon: Video, className: "ypl-float-icon ypl-float-icon--one" },
    { icon: MapPinned, className: "ypl-float-icon ypl-float-icon--two" },
    { icon: ShoppingCart, className: "ypl-float-icon ypl-float-icon--three" },
    { icon: Newspaper, className: "ypl-float-icon ypl-float-icon--four" },
    { icon: Plane, className: "ypl-float-icon ypl-float-icon--five" },
  ];

  return (
    <div className="ypl-floating-icons" aria-hidden>
      {icons.map(({ icon: Icon, className }, index) => (
        <motion.span
          key={className}
          className={className}
          animate={{ y: [0, index % 2 ? 14 : -14, 0], rotate: [0, index % 2 ? -5 : 5, 0] }}
          transition={{ duration: 5 + index * 0.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-6 w-6" />
        </motion.span>
      ))}
    </div>
  );
}

function HeroSearch({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: (query?: string) => void;
}) {
  return (
    <form
      className="ypl-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      <UnifiedSearchInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        autoFocus
        theme="home"
        listId="premium-home-search"
        disableDropdown
        inputClassName="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
      />
      <button type="submit" className="ypl-search-submit" aria-label="Ara">
        <ArrowRight className="h-5 w-5" />
      </button>
    </form>
  );
}

function HeroSection({
  searchText,
  placeholder,
  onSearchChange,
  onSearchSubmit,
}: {
  searchText: string;
  placeholder: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (query?: string) => void;
}) {
  return (
    <section className="ypl-hero">
      <div className="ypl-aurora" aria-hidden />
      <FloatingServiceIcons />
      <motion.div
        className="ypl-container ypl-hero-inner"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="ypl-hero-badge">
          <Sparkles className="h-4 w-4" aria-hidden />
          AI destekli arama ve süper uygulama
        </div>
        <h1>
          İnternette Ne Arıyorsan,
          <span> Tek Yerde.</span>
        </h1>
        <p className="ypl-hero-subtitle">
          Haberleri keşfet, videolar izle, yakındaki işletmeleri bul, sipariş ver,
          alışveriş yap ve daha fazlasına tek aramayla ulaş.
        </p>
        <HeroSearch
          value={searchText}
          placeholder={placeholder}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
        />
        <div className="ypl-hero-chips" aria-label="Popüler kategoriler">
          {heroChips.map((chip) => (
            <Link key={chip.label} href={chip.href}>
              {chip.label}
            </Link>
          ))}
        </div>
        <p className="ypl-address-line">
          Tüm aramalarının tek adresi
          <span>Web</span>
          <span>Haber</span>
          <span>Video</span>
          <span>Harita</span>
          <span>Alışveriş</span>
          <span>Yapay Zekâ</span>
        </p>
      </motion.div>
    </section>
  );
}

function ServicesSection() {
  return (
    <SectionReveal className="ypl-container ypl-services-grid" aria-label="Hızlı erişim servisleri">
      {services.map((service) => {
        const Icon = service.icon;
        return (
          <Link key={service.label} href={service.href} className="ypl-service-card">
            <span className="ypl-service-icon" style={{ "--service-color": service.color } as React.CSSProperties}>
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <strong>{service.label}</strong>
            <small>{service.desc}</small>
            <span className="ypl-card-arrow">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        );
      })}
    </SectionReveal>
  );
}

function WhySection() {
  return (
    <SectionReveal className="ypl-container ypl-why">
      <div className="ypl-section-copy">
        <p>Neden {PORTAL_SITE_NAME}?</p>
        <h2>Tek Platform, Haber Odaklı</h2>
        <span>Haber, video, Newsmap ve Haber Merkezi — tek yerden.</span>
      </div>
      <div className="ypl-why-grid">
        {whyCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="ypl-glass-card">
              <Icon className="h-7 w-7 text-violet-300" aria-hidden />
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </article>
          );
        })}
      </div>
    </SectionReveal>
  );
}

function SmartSearchSection({ spotlight }: { spotlight: FeaturedSpotlight }) {
  void spotlight;
  return (
    <SectionReveal className="ypl-container ypl-smart">
      <div className="ypl-smart-demo">
        <Link href="/haberler" className="ypl-demo-search">
          <Search className="h-4 w-4" aria-hidden />
          Son dakika haberler
        </Link>
        <div className="ypl-demo-tabs">
          {["Haber", "Video", "Newsmap", "Haber Merkezi"].map((tab) => (
            <span key={tab}>{tab}</span>
          ))}
        </div>
        <div className="ypl-demo-grid ypl-featured-grid">
          <Link href="/haberler" className="ypl-featured-card ypl-featured-card--business">
            <span className="ypl-featured-kicker">Haberler</span>
            <strong>Gündem ve manşet akışı</strong>
            <small>Canlı haber vitrini</small>
          </Link>
          <Link href="/yektube" className="ypl-featured-card ypl-featured-card--product">
            <span className="ypl-featured-kicker">YekTube</span>
            <strong>Canlı TV ve videolar</strong>
            <small>İzlemeye başla</small>
          </Link>
          <Link href="/newsmap" className="ypl-featured-card ypl-featured-card--compact">
            <span className="ypl-featured-kicker">Newsmap</span>
            <strong>Haber haritası</strong>
            <small>Konuma göre keşfet</small>
          </Link>
        </div>
      </div>
      <div className="ypl-smart-copy">
        <p>Akıllı Arama</p>
        <h2>Bir Arama, Birden Fazlası.</h2>
        <span>
          {PORTAL_BRAND_SHORT} tek bir aramada haber, video ve Newsmap sonuçlarını bir araya getirir.
        </span>
        <div className="ypl-result-pills">
          {resultTypes.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}>
                <Icon className="h-4 w-4" />
                <strong>{item.label}</strong>
                {item.value}
              </Link>
            );
          })}
        </div>
      </div>
    </SectionReveal>
  );
}

function TrendingSection() {
  return (
    <SectionReveal className="ypl-container ypl-trending">
      <div className="ypl-section-row">
        <h2>Trend Olanlar</h2>
        <Link href="/haberler">Tümünü Gör</Link>
      </div>
      <div className="ypl-trending-grid">
        {trendingCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="ypl-trend-card">
              <div>
                <Icon className="h-5 w-5" aria-hidden />
                <h3>{card.title}</h3>
              </div>
              <ol>
                {card.lines.map((line) => (
                  <li key={line.label}>
                    <Link href={line.href}>{line.label}</Link>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
    </SectionReveal>
  );
}

function FinalCtaSection() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <SectionReveal className="ypl-container ypl-final-cta">
      <div>
        <Link href="/admin/anasayfa-tasarim" className="ypl-primary-cta">
          Anasayfayı Yönet <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SectionReveal>
  );
}

function PremiumFooter() {
  const { isAuthenticated } = useAuth();
  const visibleFooterGroups = footerGroups.filter(
    (group) => group.title !== "Yönetim" || isAuthenticated,
  );

  return (
    <footer className="ypl-footer">
      <div className="ypl-container ypl-footer-grid">
        <div>
          <PremiumLogo />
          <p>İnternette aradığın her şey tek platformda.</p>
          <div className="ypl-socials" aria-label="Sosyal medya">
            {["X", "IG", "YT", "in"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        {visibleFooterGroups.map((group) => (
          <div key={group.title}>
            <h3>{group.title}</h3>
            {group.links.map((link) => (
              <Link key={link} href={footerHrefByLabel[link] ?? "/haberler"}>
                {link}
              </Link>
            ))}
          </div>
        ))}
        <form className="ypl-newsletter">
          <h3>Yeniliklerden Haberdar Ol</h3>
          <label>
            <span className="sr-only">E-posta adresiniz</span>
            <input type="email" placeholder="E-posta adresini gir" />
            <button type="submit" aria-label="Abone ol">
              <ArrowRight className="h-4 w-4" />
            </button>
          </label>
        </form>
      </div>
      <div className="ypl-footer-bottom">
        <span>© 2026 Türk Ekosistemi. Tüm hakları saklıdır.</span>
        <nav className="ypl-footer-bottom-nav" aria-label="Alt menü">
          <Link href="/kariyer">Kariyer</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function SearchEngineHomePage() {
  const { theme, toggleTheme } = useYekpareTheme();
  const [searchText, setSearchText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(() =>
    Math.floor(Math.random() * Math.max(FIRMA_REHBERI_FEATURED_BUSINESSES.length, featuredProducts.length, 1)),
  );

  useEffect(() => {
    applyPortalSiteSeo({ siteName: PORTAL_SITE_NAME, tagline: PORTAL_SEARCH_TAGLINE });
    applyJsonLd(buildYekpareWebSiteJsonLd());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % searchExamples.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const placeholder = useMemo(() => searchExamples[placeholderIndex] ?? searchExamples[0], [placeholderIndex]);
  const spotlight = useMemo<FeaturedSpotlight>(() => {
    const business = FIRMA_REHBERI_FEATURED_BUSINESSES[featuredIndex % FIRMA_REHBERI_FEATURED_BUSINESSES.length];
    const product = featuredProducts[featuredIndex % featuredProducts.length];
    return { business, product };
  }, [featuredIndex]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFeaturedIndex((current) => current + 1);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  const submitSearch = (queryOverride?: string) => {
    const q = (queryOverride ?? searchText).trim();
    if (typeof window === "undefined") return;
    const effectiveQuery = q || placeholder;
    if (!effectiveQuery) return;
    pushRecentSearch(effectiveQuery);
    window.location.href = routeForHomeQuery(effectiveQuery);
  };

  return (
    <div
      className="yekpare-home-root ypl-page min-h-[100dvh]"
      data-page="home"
      data-yekpare-theme={theme}
      data-home-theme={theme}
    >
      <PremiumNav theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <HeroSection
          searchText={searchText}
          placeholder={placeholder}
          onSearchChange={setSearchText}
          onSearchSubmit={submitSearch}
        />
        <ServicesSection />
        <WhySection />
        <SmartSearchSection spotlight={spotlight} />
        <TrendingSection />
        <FinalCtaSection />
      </main>
      <PremiumFooter />
    </div>
  );
}

