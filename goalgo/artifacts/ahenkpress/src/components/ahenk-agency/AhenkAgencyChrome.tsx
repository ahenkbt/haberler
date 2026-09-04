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
      path === "/newsmap" ||
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
            <AhenkHeaderLogo site={site} />
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
            {nav.map((item) => (
              <Link
                key={item.id || item.href}
                href={item.href}
                className={navActive(path, item.href) ? "is-active" : ""}
              >
                {item.label}
              </Link>
            ))}
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
        aria-label="WhatsApp 0541 313 62 45"
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

function AhenkHeaderLogo({ site }: { site: AhenkAgencySite }) {
  const wordmark = safeAhenkImageUrl(site.logoUrl, "/ahenk-brand/ahenk-logo.png");
  const mark = safeAhenkImageUrl(site.logoMarkUrl, "/ahenk-brand/ahenk-mark.png");
  const src = wordmark || mark;
  if (!src) return <span className="ahenk-mark">A</span>;
  return (
    <img
      className={wordmark ? "ahenk-brand-lockup" : "ahenk-mark-img"}
      src={src}
      alt={site.brandName}
    />
  );
}

function AhenkAgencyFooter({ site }: { site: AhenkAgencySite }) {
  const wordmark = safeAhenkImageUrl(site.logoUrl, "/ahenk-brand/ahenk-logo.png");
  return (
    <footer className="ahenk-footer">
      <div className="ahenk-footer-grid">
        <div>
          {wordmark ? (
            <img className="ahenk-footer-wordmark" src={wordmark} alt={site.brandName} />
          ) : (
            <h3>{site.brandName}</h3>
          )}
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
          <p className="ahenk-iban" style={{ marginTop: 12 }}>
            <strong>{site.ibanBank}</strong>
            <br />
            {site.ibanHolder}
            <br />
            <span className="ahenk-iban-num">{site.iban}</span>
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
            <Link href="/haber-merkezi">Haber Merkezi</Link>
            <Link href="/yektube">YekTube</Link>
            <Link href="/haberler">Haberler</Link>
            <Link href="/newsmap">Haber haritası</Link>
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
            <Link href="/urunlerimiz">Ürünlerimiz</Link>
            {" · "}
            <Link href="/hizmetlerimiz">Hizmetlerimiz</Link>
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
