/** ahenk.net.tr web yazılım vitrini — on-page SEO / GEO. Sıralama garantisi değil; tarayıcı ve yapay zeka özetleri için. */

import { applyJsonLd, buildBreadcrumbJsonLd } from "@/lib/pageSeo";
import { AHENK_BT_ENTITY } from "@/lib/geoSiteEntities";
import { ahenkPackageFromFields } from "@/lib/ahenkCampaignPrice";
import {
  AHENK_REMOVED_SERVICE_SLUGS,
  defaultAhenkFaqs,
  type AhenkAgencySite,
  type AhenkContentCard,
  type AhenkFaq,
} from "@/lib/ahenkAgencySite";

export const AHENK_HUB_PATHS = [
  "/web-yazilimi",
  "/web-yazilim",
  "/web-tasarimi",
  "/web-tasarim",
  "/mobil-uyumlu-yazilim",
  "/mobil-uyumlu-yazilimlar",
] as const;

/** Kısa, arama niyetli URL → yazılım/ajans kart slug’u. */
export const AHENK_SLUG_ALIASES: Record<string, string> = {
  "/avukat-sitesi": "avukat-sitesi",
  "/avukat-web-sitesi": "avukat-sitesi",
  "/hukuk-burosu-sitesi": "avukat-sitesi",
  "/doktor-sitesi": "doktor-sitesi",
  "/doktor-web-sitesi": "doktor-sitesi",
  "/klinik-sitesi": "doktor-sitesi",
  "/hastane-sitesi": "doktor-sitesi",
  "/dernek-sitesi": "dernek-vakif-sitesi",
  "/vakif-sitesi": "dernek-vakif-sitesi",
  "/belediye-sitesi": "belediye-kamu-sitesi",
  "/haber-sitesi": "haber-medya-sitesi",
  "/haber-sitesi-yazilimi": "haber-medya-sitesi",
  "/haber-scripti": "haber-medya-sitesi",
  "/haber-yazilimi": "haber-medya-sitesi",
  "/haber-portali": "haber-medya-sitesi",
  "/e-ticaret-sitesi": "e-ticaret-sitesi",
  "/restoran-sitesi": "restoran-otel-sitesi",
  "/otel-sitesi": "restoran-otel-sitesi",
  "/emlak-sitesi": "emlak-insaat-sitesi",
  "/insaat-sitesi": "emlak-insaat-sitesi",
  "/okul-sitesi": "egitim-okul-sitesi",
  "/surucu-kursu-sitesi": "surucu-kursu-sitesi",
  "/surucu-kursu": "surucu-kursu-sitesi",
  "/ehliyet-kursu": "surucu-kursu-sitesi",
  "/guzellik-merkezi-sitesi": "guzellik-merkezi-sitesi",
  "/guzellik-merkezi": "guzellik-merkezi-sitesi",
  "/guzellik-salonu": "guzellik-merkezi-sitesi",
  "/kurumsal-web-sitesi": "kurumsal-sirket-sitesi",
  "/kurumsal-web-yazilimi": "kurumsal-sirket-sitesi",
  "/kurumsal-site": "kurumsal-sirket-sitesi",
};

const HUB_CANONICAL: Record<string, string> = {
  "/web-yazilimi": "/web-yazilimi",
  "/web-yazilim": "/web-yazilimi",
  "/yazilim": "/web-yazilimi",
  "/web-tasarimi": "/web-tasarimi",
  "/web-tasarim": "/web-tasarimi",
  "/mobil-uyumlu-yazilim": "/mobil-uyumlu-yazilim",
  "/mobil-uyumlu-yazilimlar": "/mobil-uyumlu-yazilim",
};

export function ahenkCanonicalPath(path: string): string {
  const n = normalizeAhenkPath(path);
  if (HUB_CANONICAL[n]) return HUB_CANONICAL[n];
  if (AHENK_SLUG_ALIASES[n]) return n;
  const m = n.match(/^\/yazilim\/([^/]+)$/);
  if (m?.[1]) {
    const slug = m[1];
    const preferred = Object.entries(AHENK_SLUG_ALIASES).find(([, s]) => s === slug);
    if (preferred) return preferred[0];
  }
  return n;
}

export function normalizeAhenkPath(path: string): string {
  const p = (path.split("?")[0] ?? "").trim().toLowerCase() || "/";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function isAhenkKeywordPath(path: string): boolean {
  const n = normalizeAhenkPath(path);
  if ((AHENK_HUB_PATHS as readonly string[]).includes(n)) return true;
  return Boolean(AHENK_SLUG_ALIASES[n]);
}

export function ahenkAliasSlug(path: string): string | null {
  return AHENK_SLUG_ALIASES[normalizeAhenkPath(path)] ?? null;
}

export function isAhenkHubPath(path: string): boolean {
  return (AHENK_HUB_PATHS as readonly string[]).includes(normalizeAhenkPath(path));
}

export function ahenkWhatsAppHref(phoneTel: string, text?: string): string {
  const digits = String(phoneTel || "").replace(/\D/g, "");
  const n = digits.startsWith("90") ? digits : digits.startsWith("0") ? `90${digits.slice(1)}` : `90${digits}`;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${n}${q}`;
}

export function ahenkHubSeo(path: string): { title: string; description: string; h1: string } {
  const n = normalizeAhenkPath(path);
  if (n === "/web-tasarimi" || n === "/web-tasarim") {
    return {
      title: "Web Tasarımı | Kurumsal Web Sitesi 10.000 TL · 3 Günde Teslim",
      description:
        "Web tasarımı ve kurumsal web sitesi. Yapay zeka destekli, mobil uyumlu, 1-3 günde teslim. Avukat, doktor, haber, restoran ve tüm sektörler.",
      h1: "Web tasarımı",
    };
  }
  if (n === "/mobil-uyumlu-yazilim" || n === "/mobil-uyumlu-yazilimlar") {
    return {
      title: "Mobil Uyumlu Yazılım | Web Yazılımı 1-3 Günde Teslim",
      description:
        "Mobil uyumlu web yazılımı ve web tasarımı. Haber scripti, avukat sitesi, doktor sitesi, restoran sitesi. Kurumsal paket 10.000 TL.",
      h1: "Mobil uyumlu yazılım",
    };
  }
  return {
    title: "Web Yazılımı | Haber Sitesi Yazılımı, Avukat Sitesi, Doktor Sitesi",
    description:
      "Yapay zeka destekli web yazılımı: haber sitesi yazılımı, haber scripti, web tasarımı, avukat sitesi, doktor sitesi, restoran sitesi. 1-3 günde teslim. Kurumsal web sitesi 10.000 TL.",
    h1: "Web yazılımı",
  };
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (typeof document === "undefined") return;
  const sel = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.href = href;
}

export function applyAhenkAgencySeo(opts: {
  title: string;
  description: string;
  path: string;
  site: AhenkAgencySite;
  image?: string;
}): void {
  if (typeof document === "undefined") return;
  const origin = window.location.origin.replace(/\/+$/, "");
  const path = normalizeAhenkPath(opts.path);
  const canonPath = ahenkCanonicalPath(path);
  const canonical = `${origin}${canonPath === "/" ? "/" : canonPath}`;
  const brand = opts.site.brandName;
  const title = opts.title.includes(brand) ? opts.title : `${opts.title} | ${brand}`;
  const desc = opts.description || opts.site.seoDescription || opts.site.tagline;
  const image = opts.image || opts.site.heroImage;
  const keywords =
    opts.site.seoKeywords ||
    "web yazılımı, web tasarımı, haber sitesi yazılımı, haber scripti, avukat sitesi, doktor sitesi, restoran sitesi, kurumsal web sitesi, mobil uyumlu yazılım";

  document.title = title;
  document.documentElement.lang = "tr";
  upsertMeta("name", "title", title);
  upsertMeta("name", "description", desc);
  upsertMeta("name", "keywords", keywords);
  upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1");
  upsertMeta("name", "geo.region", "TR-06");
  upsertMeta("name", "geo.placename", "Çankaya, Ankara, Türkiye");
  upsertMeta("name", "ICBM", "39.9208, 32.8541");
  upsertMeta("name", "author", brand);
  upsertMeta("property", "og:type", path === "/" ? "website" : "article");
  upsertMeta("property", "og:locale", "tr_TR");
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", desc);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:site_name", brand);
  if (image) upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", desc);
  if (image) upsertMeta("name", "twitter:image", image);
  upsertLink("canonical", canonical);
  upsertLink("alternate", canonical);

  const crumbs = [{ name: "Anasayfa", path: "/" }];
  if (path !== "/") crumbs.push({ name: opts.title.slice(0, 80), path });

  applyJsonLd(
    [
      buildAhenkOrganizationJsonLd(opts.site, origin),
      buildAhenkWebSiteJsonLd(opts.site, origin),
      buildAhenkOfferJsonLd(opts.site, origin),
      buildAhenkFaqJsonLd(opts.site.faqs),
      buildBreadcrumbJsonLd(crumbs),
    ],
    "ahenk-agency",
  );
}

export function buildAhenkOrganizationJsonLd(site: AhenkAgencySite, origin: string): Record<string, unknown> {
  const tr = site.offices.find((o) => o.id === "tr") ?? site.offices[0];
  return {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "Organization"],
    "@id": `${origin}/#organization`,
    name: site.brandName || AHENK_BT_ENTITY.officialName,
    alternateName: Array.from(
      new Set([...AHENK_BT_ENTITY.alternateName, "Ahenk Web Yazılımı", site.brandName]),
    ),
    url: `${origin}/`,
    logo: `${origin}/favicon.png`,
    image: site.heroImage,
    description: site.seoDescription || site.tagline || AHENK_BT_ENTITY.description,
    disambiguatingDescription: AHENK_BT_ENTITY.disambiguatingDescription,
    telephone: site.phoneTel,
    email: site.email,
    priceRange: `${site.priceAmount} ${site.priceCurrency}`,
    areaServed: ["TR", "GE", "GB", "US", "AZ"],
    knowsAbout: [
      "web yazılımı",
      "web tasarımı",
      "haber sitesi yazılımı",
      "haber scripti",
      "avukat sitesi",
      "doktor sitesi",
      "restoran sitesi",
      "kurumsal web sitesi",
    ],
    address: tr
      ? {
          "@type": "PostalAddress",
          streetAddress: tr.address,
          addressLocality: "Ankara",
          addressRegion: "Çankaya",
          addressCountry: "TR",
        }
      : undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: 39.9208,
      longitude: 32.8541,
    },
    sameAs: ["https://yekpare.net", "https://ahenk.net.tr/haber-merkezi"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: site.phoneTel,
        contactType: "sales",
        availableLanguage: ["Turkish", "English"],
        areaServed: "TR",
      },
      {
        "@type": "ContactPoint",
        telephone: site.whatsappTel || site.phoneTel,
        contactType: "customer support",
        availableLanguage: ["Turkish"],
        areaServed: "TR",
      },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
  };
}

export function buildAhenkWebSiteJsonLd(site: AhenkAgencySite, origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: site.brandName,
    url: `${origin}/`,
    inLanguage: "tr-TR",
    description: site.seoDescription || site.tagline,
    publisher: { "@id": `${origin}/#organization` },
  };
}

export function buildAhenkOfferJsonLd(site: AhenkAgencySite, origin: string): Record<string, unknown> {
  const pkg = ahenkPackageFromFields(site);
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    "@id": `${origin}/#kurumsal-web-teklifi`,
    name: site.priceTitle || "Kurumsal web sitesi",
    description: pkg.note,
    url: `${origin}/kurumsal-web-sitesi`,
    price: pkg.amount,
    priceCurrency: site.priceCurrency || "TRY",
    availability: "https://schema.org/InStock",
    itemOffered: {
      "@type": "Service",
      name: "Kurumsal web sitesi yazılımı",
      serviceType: "Web yazılımı",
      provider: { "@id": `${origin}/#organization` },
    },
  };
}

export function buildAhenkFaqJsonLd(faqs: AhenkFaq[] | undefined): Record<string, unknown> {
  const siteItems = faqs?.length ? faqs : defaultAhenkFaqs();
  const entityItems: AhenkFaq[] = AHENK_BT_ENTITY.faq.map((f) => ({ q: f.question, a: f.answer }));
  const seen = new Set<string>();
  const items: AhenkFaq[] = [];
  for (const f of [...siteItems, ...entityItems]) {
    const key = f.q.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(f);
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function ahenkSoftwareServiceList(site: AhenkAgencySite): AhenkContentCard[] {
  return site.softwareSectors;
}

export function ahenkCallCenterServices(site: AhenkAgencySite) {
  return site.services.filter(
    (s) =>
      !AHENK_REMOVED_SERVICE_SLUGS.has(s.slug) &&
      (s.slug.includes("cagri") || s.slug.includes("musteri")),
  );
}

export function ahenkOperationalServices(site: AhenkAgencySite) {
  return site.services.filter((s) => !AHENK_REMOVED_SERVICE_SLUGS.has(s.slug));
}
