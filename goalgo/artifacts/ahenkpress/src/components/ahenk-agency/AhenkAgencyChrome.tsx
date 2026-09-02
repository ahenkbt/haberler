import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  Camera,
  Headphones,
  Mail,
  Menu,
  PenTool,
  Phone,
  QrCode,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import type { AhenkAgencySite } from "@/lib/ahenkAgencySite";
import { AHENK_BT_ENTITY } from "@/lib/geoSiteEntities";
import { applyJsonLd } from "@/lib/pageSeo";
import "@/styles/ahenkAgency.css";

const NAV = [
  { href: "/", label: "Anasayfa" },
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
    default:
      return <Headphones className={cls} />;
  }
}

function navActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
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
          <p style={{ marginTop: 10 }}>Bir sorunuz mu var? Bizi 7/24 arayın</p>
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
