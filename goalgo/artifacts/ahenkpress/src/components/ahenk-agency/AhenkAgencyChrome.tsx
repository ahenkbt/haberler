import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  Camera,
  Code2,
  Headphones,
  Heart,
  Mail,
  Map,
  Menu,
  Newspaper,
  PenTool,
  Phone,
  Play,
  QrCode,
  Scale,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { AHENK_LOGO_MARK, AHENK_LOGO_WORDMARK } from "@/lib/ahenkCampaignPrice";
import {
  isExternalAhenkHref,
  defaultAhenkNavItems,
  safeAhenkImageUrl,
  type AhenkAgencySite,
  type AhenkContentCard,
  type AhenkFaq,
} from "@/lib/ahenkAgencySite";
import {
  applyAhenkAgencySeo,
  ahenkWhatsAppHref,
  isAhenkHubPath,
  normalizeAhenkPath,
} from "@/lib/ahenkAgencySeo";
import "@/styles/ahenkAgency.css";

export function AhenkServiceIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (name) {
    case "camera":
      return <Camera className={cls} />;
    case "phone":
      return <Phone className={cls} />;
    case "cart":
      return <ShoppingCart className={cls} />;
    case "sparkle":
      return <Sparkles className={cls} />;
    case "pen":
      return <PenTool className={cls} />;
    case "users":
      return <Users className={cls} />;
    case "qr":
      return <QrCode className={cls} />;
    case "building":
      return <Building2 className={cls} />;
    case "scale":
      return <Scale className={cls} />;
    case "heart":
      return <Heart className={cls} />;
    case "news":
      return <Newspaper className={cls} />;
    case "play":
      return <Play className={cls} />;
    case "map":
      return <Map className={cls} />;
    case "code":
      return <Code2 className={cls} />;
    default:
      return <Headphones className={cls} />;
  }
}

function navActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  if (href === "/urunlerimiz") {
    return (
      path === "/urunlerimiz" ||
      path === "/asistan-ai" ||
      path === "/whatsapp-cagri-merkezi" ||
      path === "/polis-ai" ||
      path === "/polisai" ||
      path === "/aiaddin" ||
      path === "/cagri-merkezi-crm" ||
      path === "/yekpare" ||
      path === "/haber-merkezi" ||
      path === "/yektube" ||
      path === "/haberler" ||
      path === "/web-yazilimi"
    );
  }
  if (href === "/hizmetlerimiz") {
    return (
      path === "/hizmetlerimiz" ||
      path === "/hizmetler" ||
      path.startsWith("/hizmet/") ||
      path.startsWith("/icerik/") ||
      path === "/ajans" ||
      path === "/yazilim/grafik-tasarim" ||
      path === "/yazilim/web-yazilim" ||
      path === "/yazilim/sosyal-medya" ||
      path === "/yazilim/video-film" ||
      path === "/yazilim/dijital-reklam" ||
      path === "/yazilim/seo-buyume"
    );
  }
  if (href === "/web-yazilimi") {
    return (
      path === "/yazilim" ||
      path.startsWith("/yazilim/") ||
      isAhenkHubPath(path) ||
      path === "/web-yazilimi"
    );
  }
  if (href === "/cagri-merkezi-crm") {
    return path === "/cagri-merkezi-crm" || path === "/yapay-zeka-cagri-merkezi";
  }
  if (href === "/kariyer") {
    return path === "/kariyer";
  }
  if (href === "/iletisim") {
    return path === "/iletisim" || path === "/iletisim-kunye" || path === "/kunye" || path === "/destek";
  }
  return path === href || path.startsWith(`${href}/`);
}

export function AhenkSmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (isExternalAhenkHref(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function AhenkFeatureChips({
  features,
  limit = 6,
}: {
  features?: string[];
  limit?: number;
}) {
  const list = (features ?? []).map((f) => f.trim()).filter(Boolean);
  if (!list.length) return null;
  const shown = list.slice(0, limit);
  const more = list.length - shown.length;
  return (
    <ul className="ahenk-chips">
      {shown.map((f) => (
        <li key={f}>{f}</li>
      ))}
      {more > 0 ? <li className="ahenk-chip-more">+{more}</li> : null}
    </ul>
  );
}

export function AhenkMediaCard({
  href,
  image,
  title,
  excerpt,
  icon,
  cta = "İncele",
  features,
  featureLimit = 5,
}: {
  href: string;
  image?: string;
  title: string;
  excerpt: string;
  icon: string;
  cta?: string;
  features?: string[];
  featureLimit?: number;
}) {
  const src = safeAhenkImageUrl(image, "");
  return (
    <AhenkSmartLink href={href} className="ahenk-card ahenk-card-media">
      <span className="ahenk-card-photo">
        {src ? <img src={src} alt="" loading="lazy" /> : null}
        <span className="ahenk-card-icon">
          <AhenkServiceIcon name={icon} />
        </span>
      </span>
      <span className="ahenk-card-body">
        <h3>{title}</h3>
        <p>{excerpt}</p>
        <AhenkFeatureChips features={features} limit={featureLimit} />
        <span className="ahenk-card-cta">{cta} →</span>
      </span>
    </AhenkSmartLink>
  );
}

export function AhenkCardGrid({
  items,
  cta,
}: {
  items: AhenkContentCard[];
  cta?: string;
}) {
  return (
    <div className="ahenk-grid">
      {items.map((item) => (
        <AhenkMediaCard
          key={item.slug}
          href={item.href}
          image={item.image}
          title={item.title}
          excerpt={item.excerpt}
          icon={item.icon}
          cta={cta}
          features={item.features}
        />
      ))}
    </div>
  );
}

export function AhenkPageHero({
  crumb,
  title,
  lead,
  image,
}: {
  crumb: ReactNode;
  title: string;
  lead?: string;
  image?: string;
}) {
  const src = safeAhenkImageUrl(image, "");
  return (
    <div className={`ahenk-page-hero${src ? " has-photo" : ""}`}>
      {src ? (
        <div className="ahenk-page-hero-bg" aria-hidden>
          <img src={src} alt="" />
        </div>
      ) : null}
      <div className="ahenk-page-hero-inner">
        <div className="ahenk-crumb">{crumb}</div>
        <h1>{title}</h1>
        {lead ? <p className="ahenk-page-hero-lead">{lead}</p> : null}
      </div>
    </div>
  );
}

export function AhenkFaqList({ faqs }: { faqs: AhenkFaq[] }) {
  if (!faqs.length) return null;
  return (
    <div className="ahenk-faq">
      {faqs.map((f) => (
        <details key={f.q} className="ahenk-faq-item">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function AhenkAgencyChrome({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const site = useAhenkAgencySite();
  const [location] = useLocation();
  const path = normalizeAhenkPath((location.split("?")[0] ?? "/").trim() || "/");
  const [open, setOpen] = useState(false);
  const nav = site.navItems?.length ? site.navItems : defaultAhenkNavItems();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, web yazılımı / kurumsal web sitesi hakkında bilgi almak istiyorum.",
  );

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    applyAhenkAgencySeo({
      title: title || site.seoTitle || site.brandName,
      description: description || site.seoDescription || site.tagline,
      path,
      site,
      image: site.heroImage,
    });
  }, [title, description, path, site]);

  return (
    <div className="ahenk-agency">
      <div className="ahenk-topbar">
        <div className="ahenk-topbar-inner">
          <span>GSM: {site.phone}</span>
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <span>
            {site.hoursWeekday} · {site.hoursSunday}
          </span>
        </div>
      </div>
      <header className="ahenk-header">
        <div className="ahenk-header-inner">
          <Link href="/" className="ahenk-brand" aria-label={site.brandName}>
            <AhenkWordmark site={site} variant="header" />
          </Link>
          <button
            type="button"
            className="ahenk-burger"
            aria-label="Menü"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <nav className={`ahenk-nav ${open ? "is-open" : ""}`}>
            {nav.map((item) =>
              item.href === "/hizmetlerimiz" || item.id === "services" ? (
                // hsy-landing 2026-10-09: Hizmetlerimiz altında Haber Sitesi Yazılımı (Worker sayfası, tam yükleme)
                <span key={item.id || item.href} className="ahenk-nav-dd">
                  <Link href={item.href} className={navActive(path, item.href) ? "is-active" : ""}>
                    {item.label}
                  </Link>
                  <span className="ahenk-nav-sub">
                    <a href={AHENK_HSY_HREF}>Haber Sitesi Yazılımı</a>
                    <Link href="/hizmetlerimiz">Tüm hizmetlerimiz</Link>
                  </span>
                </span>
              ) : (
                <Link
                  key={item.id || item.href}
                  href={item.href}
                  className={navActive(path, item.href) ? "is-active" : ""}
                >
                  {item.label}
                </Link>
              ),
            )}
            <a className="ahenk-nav-cta" href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
        </div>
      </header>
      {children}
      <a
        className="ahenk-wa"
        href={wa}
        target="_blank"
        rel="noreferrer"
        aria-label={`WhatsApp ${site.phone}`}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
          <path
            fill="currentColor"
            d="M20.5 3.5A11 11 0 0 0 3.2 17.4L2 22l4.7-1.2A11 11 0 1 0 20.5 3.5zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.8.7.8-2.7-.2-.3A9 9 0 1 1 12 20.5zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8 8 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.5-.6c.1-.2.1-.3 0-.5l-.9-2.1c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3s-1 1-1 2.4 1 2.8 1.2 3 .2.4 2.1 3.3a11.3 11.3 0 0 0 3.2 2.1c.4.2 1.5.5 2.1.3s1.4-1.1 1.6-2.1.2-.9.1-1-.2-.2-.5-.3z"
          />
        </svg>
        <span>WhatsApp</span>
      </a>
      <AhenkAgencyFooter site={site} />
    </div>
  );
}

function AhenkWordmark({ site, variant }: { site: AhenkAgencySite; variant: "header" | "footer" }) {
  const bundled = AHENK_LOGO_WORDMARK;
  const fromSettings = safeAhenkImageUrl(site.logoUrl, bundled);
  const src = fromSettings && !fromSettings.includes("/api/media/uploads/") ? fromSettings : bundled;
  const [srcFailed, setSrcFailed] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);
  const className = variant === "header" ? "ahenk-brand-lockup" : "ahenk-footer-wordmark";
  if (srcFailed) {
    return (
      <span className="ahenk-brand-fallback">
        {markFailed ? (
          <span className="ahenk-mark" aria-hidden>
            A
          </span>
        ) : (
          <img
            src={AHENK_LOGO_MARK}
            alt=""
            width={40}
            height={40}
            onError={() => setMarkFailed(true)}
          />
        )}
        <span>Ahenk Bilgi Teknolojileri</span>
      </span>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt="Ahenk Bilgi Teknolojileri"
      width={240}
      height={48}
      onError={() => setSrcFailed(true)}
    />
  );
}

function AhenkAgencyFooter({ site }: { site: AhenkAgencySite }) {
  return (
    <footer className="ahenk-footer">
      <div className="ahenk-footer-grid">
        <div>
          <AhenkWordmark site={site} variant="footer" />
          <p>{site.tagline}</p>
          <p style={{ marginTop: 12 }}>
            <Phone className="inline w-4 h-4 mr-1" />
            <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
          </p>
          <p>
            <a href={ahenkWhatsAppHref(site.whatsappTel || site.phoneTel)} target="_blank" rel="noreferrer">
              WhatsApp: {site.phone}
            </a>
          </p>
          <p>
            <Mail className="inline w-4 h-4 mr-1" />
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
        <div>
          <h3>Menü</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {(site.navItems?.length ? site.navItems : defaultAhenkNavItems())
              .filter((n) => n.href !== "/")
              .map((n) => (
                <Link key={n.id || n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
          </div>
        </div>
        <div>
          <h3>Ürünler</h3>
          <div style={{ display: "grid", gap: 6 }}>
            <Link href="/asistan-ai">Ahenk Asistan AI</Link>
            <Link href="/whatsapp-cagri-merkezi">WhatsApp çağrı merkezi</Link>
            <Link href="/polis-ai">Polis AI</Link>
            <a href={AHENK_HSY_HREF}>Haber Sitesi Yazılımı</a>
            <Link href="/haber-merkezi">Haber Merkezi</Link>
            <Link href="/yektube">YekTube</Link>
            <Link href="/turkata-haber-ajansi">TürkAta Haber Ajansı</Link>
            <Link href="/cagri-merkezi-crm">PBX CRM</Link>
            <Link href="/aiaddin">Aiaddin</Link>
            <a href="https://yekpare.net" target="_blank" rel="noreferrer">
              yekpare.net
            </a>
          </div>
        </div>
        <div>
          <h3>İletişim Bilgileri</h3>
          <p>
            {site.hoursWeekday}
            <br />
            {site.hoursSunday}
          </p>
          <p style={{ marginTop: 10 }}>
            <Link href="/iletisim">İletişim</Link>
            {" · "}
            <Link href="/destek">Destek</Link>
            {" · "}
            <Link href="/iletisim-kunye">Künye</Link>
          </p>
          <p>
            <strong style={{ color: "#fff" }}>{site.phone}</strong>
          </p>
        </div>
      </div>
      <div className="ahenk-footer-copy">
        © {new Date().getFullYear()} {site.brandName}. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}

/** hsy-landing 2026-10-09: ahenk.net.tr/haber-sitesi-yazilimi Worker'da sunucu tarafında üretilir; SPA içinden tam yükleme ile açılır. */
export const AHENK_HSY_HREF = "/haber-sitesi-yazilimi";

const AHENK_HSY_PROMO_LOGOS: { name: string; src: string }[] = [
  { name: "Vatan Haber", src: "/api/hm/public/news-sites/1/logo" },
  { name: "TürkAta Haber Ajansı", src: "/api/hm/public/news-sites/230/logo" },
  { name: "Ankara Şehir Gazetesi", src: "/api/hm/public/news-sites/3/logo" },
  { name: "Ankara Haber Gündemi", src: "/api/hm/public/news-sites/8/logo" },
  { name: "Gündem İstanbul", src: "/api/hm/public/news-sites/1141/logo" },
  { name: "Harika Olacak", src: "/api/hm/public/news-sites/1172/logo" },
];

export function AhenkHsyPromo({ id = "haber-sitesi-yazilimi" }: { id?: string }) {
  return (
    <section className="ahenk-hsy-promo" id={id}>
      <div className="ahenk-hsy-promo-copy">
        <span className="ahenk-kicker">Anında kurulum · Siteniz dolu dolu hazır</span>
        <h2>Haber Sitesi Yazılımı</h2>
        <p>
          PHP haber sitesi, editör paneli ve yapay zekâ editörü tek pakette. Haberler otomatik gelir, kategorilenir ve
          özgünleştirilir; siteniz ilk günden manşeti ve güncel haberleriyle yayında.
        </p>
        <ul>
          <li>Otomatik RSS haber akışı, AI editör ve AI köşe yazarları</li>
          <li>Google News sitemap, IndexNow, Cloudflare hızı</li>
          <li>Aylık 3.000 TL · Yıllık 27.000 TL (%25 indirim) · Barındırma dahil</li>
        </ul>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <a href={AHENK_HSY_HREF} className="ahenk-btn">
            Haber Sitesi Yazılımı
          </a>
          <a href={`${AHENK_HSY_HREF}#referanslar`} className="ahenk-btn ahenk-btn-ghost">
            Referanslar
          </a>
        </div>
      </div>
      <a className="ahenk-hsy-promo-logos" href={`${AHENK_HSY_HREF}#referanslar`} aria-label="Referans haber siteleri">
        {AHENK_HSY_PROMO_LOGOS.map((l) => (
          <span key={l.src} className="ahenk-hsy-logo">
            <img src={l.src} alt={`${l.name} logosu`} loading="lazy" decoding="async" />
          </span>
        ))}
      </a>
    </section>
  );
}
