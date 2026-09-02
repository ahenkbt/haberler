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
import {
  isExternalAhenkHref,
  safeAhenkImageUrl,
  type AhenkAgencySite,
  type AhenkContentCard,
} from "@/lib/ahenkAgencySite";
import { AHENK_BT_ENTITY } from "@/lib/geoSiteEntities";
import { applyJsonLd } from "@/lib/pageSeo";
import "@/styles/ahenkAgency.css";

const NAV = [
  { href: "/", label: "Anasayfa" },
  { href: "/yazilim", label: "Yazılım" },
  { href: "/ajans", label: "Ajans" },
  { href: "/haber-merkezi", label: "Haber Merkezi" },
  { href: "/yekpare", label: "Yekpare" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
];

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

export function AhenkMediaCard({
  href,
  image,
  title,
  excerpt,
  icon,
  cta = "İncele",
}: {
  href: string;
  image?: string;
  title: string;
  excerpt: string;
  icon: string;
  cta?: string;
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
  const path = (location.split("?")[0] ?? "/").trim() || "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const pageTitle = title ? `${title} | ${site.brandName}` : site.brandName;
    document.title = pageTitle;
    const desc = description || site.tagline;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    const origin = "https://ahenk.net.tr";
    applyJsonLd(
      [
        {
          "@context": "https://schema.org",
          "@type": ["Organization", "ProfessionalService"],
          "@id": `${origin}/#organization`,
          name: AHENK_BT_ENTITY.officialName,
          alternateName: AHENK_BT_ENTITY.alternateName,
          url: `${origin}/`,
          description: AHENK_BT_ENTITY.description,
          disambiguatingDescription: AHENK_BT_ENTITY.disambiguatingDescription,
          telephone: site.phoneTel || AHENK_BT_ENTITY.telephone,
          email: site.email || AHENK_BT_ENTITY.email,
          areaServed: { "@type": "Country", name: "Türkiye" },
          address: {
            "@type": "PostalAddress",
            streetAddress: "Meşrutiyet Mah. Karanfil Sokak 4/91",
            addressLocality: "Çankaya",
            addressRegion: "Ankara",
            addressCountry: "TR",
          },
          inLanguage: "tr-TR",
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          name: AHENK_BT_ENTITY.officialName,
          url: `${origin}/`,
          publisher: { "@id": `${origin}/#organization` },
          inLanguage: "tr-TR",
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: AHENK_BT_ENTITY.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ],
      "ahenk-org",
    );
  }, [title, description, site.brandName, site.tagline, site.phoneTel, site.email]);

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
          <Link href="/" className="ahenk-brand">
            <span className="ahenk-mark">A</span>
            <span className="ahenk-brand-text">
              <span className="ahenk-brand-name">{site.brandName}</span>
              <span className="ahenk-brand-tag">{site.tagline}</span>
            </span>
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
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navActive(path, item.href) ? "is-active" : ""}
              >
                {item.label}
              </Link>
            ))}
            <a className="ahenk-nav-cta" href={`tel:${site.phoneTel}`}>
              Bizi Arayın
            </a>
          </nav>
        </div>
      </header>
      {children}
      <AhenkAgencyFooter site={site} />
    </div>
  );
}

function AhenkAgencyFooter({ site }: { site: AhenkAgencySite }) {
  return (
    <footer className="ahenk-footer">
      <div className="ahenk-footer-grid">
        <div>
          <h3>{site.brandName}</h3>
          <p>{site.tagline}</p>
          <p style={{ marginTop: 12 }}>
            <Phone className="inline w-4 h-4 mr-1" />
            <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
          </p>
          <p>
            <Mail className="inline w-4 h-4 mr-1" />
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
        <div>
          <h3>Yazılım</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {site.softwareSectors.slice(0, 6).map((s) => (
              <Link key={s.slug} href={s.href}>
                {s.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3>Hizmetler</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {site.services.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/hizmet/${s.slug}`}>
                {s.title}
              </Link>
            ))}
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
            <Link href="/haber-merkezi">Haber Merkezi</Link>
            {" · "}
            <a href="https://yekpare.net" target="_blank" rel="noreferrer">
              Yekpare.net
            </a>
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
