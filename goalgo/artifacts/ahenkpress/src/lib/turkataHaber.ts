/**
 * turkatahaber.com — TÜRKATA HABER AJANSI.
 * Metinler cloudflare/turkata-haber.js ile aynı tutulur.
 */
import { applyJsonLd } from "@/lib/pageSeo";
import { isAhenkAgencyHost } from "@/lib/ahenkAgencyHost";

export const TURKATA_BRAND = "TÜRKATA HABER AJANSI";
export const TURKATA_ORIGIN = "https://turkatahaber.com";
export const TURKATA_FOUNDATION = "Türk Kültürünü Araştırma ve Tanıtma Vakfı";
export const TURKATA_FOUNDATION_URL = "https://turkatav.org";
export const TURKATA_FOUNDATION_ALT_URL = "https://tukav.org";
export const TURKATA_FOUNDING_DATE = "1998";
export const TURKATA_STATEMENT =
  "THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.";
export const TURKATA_TAGLINE = "Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı";
export const TURKATA_OFFICE = "TürkAta Haber Ajansı Genel Müdürlüğü";
export const TURKATA_ADDRESS_LINE = "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara";
export const TURKATA_STREET = "Sağlık Mah. Aksu Cad. 13/5";
export const TURKATA_LOCALITY = "Çankaya";
export const TURKATA_REGION = "Ankara";
export const TURKATA_LEGAL_NAME = "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.";
export const TURKATA_LEGAL_ADDRESS_LINE = "Meşrutiyet Mah. Karanfil Sok. 4/91 Çankaya - Ankara";
export const TURKATA_LEGAL_STREET = "Meşrutiyet Mah. Karanfil Sok. 4/91";
export const TURKATA_FOUNDATION_ADDRESS_LINE = "Başak Mah. Özalp Cad. 5/2 Mamak - Ankara";
export const TURKATA_FOUNDATION_STREET = "Başak Mah. Özalp Cad. 5/2";
export const TURKATA_FOUNDATION_LOCALITY = "Mamak";
export const TURKATA_PHONE_DISPLAY = "0532 229 18 92";
export const TURKATA_PHONE_TEL = "+905322291892";
export const TURKATA_EMAIL = "bilgi@turkatahaber.com";
export const TURKATA_KUNYE_TITLE = "Künye | TürkAta Haber Ajansı";
export const TURKATA_WORDMARK = "/turkata/turkata-wordmark.svg";
export const TURKATA_LAT = 39.9272;
export const TURKATA_LNG = 32.8548;
export const TURKATA_PEOPLE = [
  { name: "Nail Türkoğlu", jobTitle: "Genel Müdür" },
  { name: "Mustafa ÖZDEMİR", jobTitle: "Genel Yayın Yönetmeni" },
  { name: "Melek Acar", jobTitle: "Yazı İşleri Müdürü" },
] as const;
export const TURKATA_DEPARTMENTS = [
  "Yerel Yönetimler Haber Müdürlüğü",
  "Kamu Haber Müdürlüğü",
  "STK ve Sektörel Haber Müdürlükleri",
] as const;

export const TURKATA_DESCRIPTION =
  "TÜRKATA HABER AJANSI (THA), Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde 1998’den bu yana yayın yapan haber ajansıdır. Genel Müdürlük: Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara. THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.";

export const TURKATA_MISSION =
  "TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. Yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.";

const HOSTS = new Set(["turkatahaber.com", "www.turkatahaber.com"]);

export function isTurkataHaberHost(host?: string | null): boolean {
  const raw = String(
    host ?? (typeof window !== "undefined" ? window.location.hostname : ""),
  )
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (!raw) return false;
  if (HOSTS.has(raw)) return true;
  return raw.replace(/^www\./, "") === "turkatahaber.com";
}

export function normalizeTurkataPath(path: string): string {
  const p = (path.split("?")[0] ?? "").trim() || "/";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function isSharedNewsPath(path: string): boolean {
  const p = normalizeTurkataPath(path).toLowerCase();
  return (
    p === "/haberler" ||
    p.startsWith("/haber/") ||
    p.startsWith("/makale/") ||
    p.startsWith("/haberler/rss/")
  );
}

export function turkataCanonicalPath(path: string): string {
  const p = normalizeTurkataPath(path);
  if (p === "/" || p.toLowerCase() === "/haberler") return "/";
  return p;
}

export function turkataCanonicalUrl(path: string): string {
  const canon = turkataCanonicalPath(path);
  return canon === "/" ? `${TURKATA_ORIGIN}/` : `${TURKATA_ORIGIN}${canon}`;
}

/** ahenk.net.tr haber URL’lerinin kanonik adresi. Haber değilse null. */
export function sharedNewsCanonicalUrl(path: string): string | null {
  if (!isSharedNewsPath(path)) return null;
  return turkataCanonicalUrl(path);
}

export function isTurkataPublicPath(path: string): boolean {
  const p = normalizeTurkataPath(path).toLowerCase();
  if (p === "/" || p === "/haberler") return true;
  if (p.startsWith("/haber/") || p.startsWith("/makale/") || p.startsWith("/haberler/rss/")) return true;
  if (p === "/hakkimizda" || p === "/hakkinda" || p === "/about") return true;
  if (p === "/kunye" || p === "/iletisim" || p === "/iletisim-kunye" || p === "/contact") return true;
  if (p === "/haberler/kunye" || p === "/haberler/hakkimizda" || p === "/haberler/iletisim") return true;
  if (p.startsWith("/kategori/")) return true;
  if (p.startsWith("/admin") || p.startsWith("/editor") || p.startsWith("/api")) return true;
  return false;
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

function upsertLink(rel: string, href: string, hreflang?: string) {
  if (typeof document === "undefined") return;
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(sel) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

function postalAddress(street: string, locality: string, region: string, name?: string) {
  return {
    "@type": "PostalAddress",
    ...(name ? { name } : {}),
    streetAddress: street,
    addressLocality: locality,
    addressRegion: region,
    addressCountry: "TR",
  };
}

function personNode(person: { name: string; jobTitle: string }) {
  return { "@type": "Person", name: person.name, jobTitle: person.jobTitle };
}

/** ahenk.net.tr haber vitrininde statik sayfalar /haberler altında kalır. */
export function turkataSitePath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return p;
  if (!isAhenkAgencyHost() || isTurkataHaberHost()) return p;
  if (p === "/") return "/haberler";
  if (p === "/hakkimizda" || p === "/kunye" || p === "/iletisim") return `/haberler${p}`;
  return p;
}

export function turkataOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["NewsMediaOrganization", "Organization"],
    "@id": `${TURKATA_ORIGIN}/#organization`,
    name: TURKATA_BRAND,
    legalName: TURKATA_LEGAL_NAME,
    alternateName: ["THA", "TürkAta Haber Ajansı", "Turkata Haber", "turkatahaber.com", "TÜRKATA"],
    slogan: TURKATA_STATEMENT,
    url: `${TURKATA_ORIGIN}/`,
    description: TURKATA_DESCRIPTION,
    foundingDate: TURKATA_FOUNDING_DATE,
    inLanguage: "tr-TR",
    publishingPrinciples: `${TURKATA_ORIGIN}/kunye#yayin-ilkeleri`,
    telephone: TURKATA_PHONE_TEL,
    email: TURKATA_EMAIL,
    sameAs: [TURKATA_FOUNDATION_URL, TURKATA_FOUNDATION_ALT_URL],
    address: [
      postalAddress(TURKATA_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_OFFICE),
      postalAddress(TURKATA_LEGAL_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_LEGAL_NAME),
    ],
    geo: { "@type": "GeoCoordinates", latitude: TURKATA_LAT, longitude: TURKATA_LNG },
    areaServed: { "@type": "Country", name: "Türkiye" },
    parentOrganization: {
      "@type": "Organization",
      name: TURKATA_FOUNDATION,
      url: TURKATA_FOUNDATION_URL,
      foundingDate: TURKATA_FOUNDING_DATE,
      sameAs: [TURKATA_FOUNDATION_URL, TURKATA_FOUNDATION_ALT_URL],
      address: postalAddress(
        TURKATA_FOUNDATION_STREET,
        TURKATA_FOUNDATION_LOCALITY,
        TURKATA_REGION,
        TURKATA_FOUNDATION,
      ),
    },
    founder: personNode(TURKATA_PEOPLE[0]),
    employee: TURKATA_PEOPLE.map(personNode),
    department: TURKATA_DEPARTMENTS.map((name) => ({ "@type": "Organization", name })),
    logo: { "@type": "ImageObject", url: `${TURKATA_ORIGIN}${TURKATA_WORDMARK}` },
  };
}

export function turkataLocalBusinessJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${TURKATA_ORIGIN}/#local`,
    name: TURKATA_BRAND,
    url: `${TURKATA_ORIGIN}/`,
    description: TURKATA_DESCRIPTION,
    telephone: TURKATA_PHONE_TEL,
    email: TURKATA_EMAIL,
    address: postalAddress(TURKATA_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_OFFICE),
    geo: { "@type": "GeoCoordinates", latitude: TURKATA_LAT, longitude: TURKATA_LNG },
    parentOrganization: {
      "@type": "Organization",
      name: TURKATA_FOUNDATION,
      url: TURKATA_FOUNDATION_URL,
      foundingDate: TURKATA_FOUNDING_DATE,
      address: postalAddress(
        TURKATA_FOUNDATION_STREET,
        TURKATA_FOUNDATION_LOCALITY,
        TURKATA_REGION,
        TURKATA_FOUNDATION,
      ),
    },
    sameAs: [TURKATA_FOUNDATION_URL, TURKATA_FOUNDATION_ALT_URL],
  };
}

export type TurkataArticleSeo = {
  headline: string;
  description?: string | null;
  path: string;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string | null;
  categoryName?: string | null;
};

function absImage(imageUrl?: string | null): string {
  const u = String(imageUrl ?? "").trim();
  if (!u) return `${TURKATA_ORIGIN}/apple-touch-icon.png`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${TURKATA_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

export function applyTurkataDocumentSeo(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  ogType?: "website" | "article";
  article?: TurkataArticleSeo | null;
}): void {
  if (typeof document === "undefined") return;
  const canonical = turkataCanonicalUrl(opts.path);
  const brand = TURKATA_BRAND;
  const title =
    opts.title === brand || opts.title.includes("|") || opts.title.includes(brand)
      ? opts.title
      : `${opts.title} | ${brand}`;
  const image = absImage(opts.image);
  document.title = title;
  document.documentElement.lang = "tr";
  upsertMeta("name", "title", title);
  upsertMeta("name", "description", opts.description);
  upsertMeta("name", "author", brand);
  upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1");
  upsertMeta("name", "geo.region", "TR-06");
  upsertMeta("name", "geo.placename", "Ankara");
  upsertMeta("name", "geo.position", `${TURKATA_LAT};${TURKATA_LNG}`);
  upsertMeta("name", "ICBM", `${TURKATA_LAT}, ${TURKATA_LNG}`);
  upsertMeta("property", "og:type", opts.ogType || (opts.article ? "article" : "website"));
  upsertMeta("property", "og:locale", "tr_TR");
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", opts.description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:site_name", brand);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", opts.description);
  upsertMeta("name", "twitter:image", image);
  upsertMeta("name", "twitter:url", canonical);
  upsertLink("canonical", canonical);
  upsertLink("alternate", canonical, "tr");
  upsertLink("alternate", canonical, "x-default");

  const crumbs: { name: string; path: string }[] = [{ name: "Anasayfa", path: "/" }];
  const canonPath = turkataCanonicalPath(opts.path);
  if (canonPath !== "/") crumbs.push({ name: opts.article?.headline || opts.title, path: canonPath });
  const graph: Record<string, unknown>[] = [
    turkataOrganizationJsonLd(),
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${TURKATA_ORIGIN}/#legal-entity`,
      name: TURKATA_LEGAL_NAME,
      legalName: TURKATA_LEGAL_NAME,
      address: postalAddress(TURKATA_LEGAL_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_LEGAL_NAME),
    },
    turkataLocalBusinessJsonLd(),
  ];
  if (opts.article?.headline) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "@id": `${canonical}#article`,
      headline: opts.article.headline,
      description: opts.article.description || opts.description,
      image,
      datePublished: opts.article.datePublished || undefined,
      dateModified: opts.article.dateModified || opts.article.datePublished || undefined,
      author: opts.article.authorName
        ? { "@type": "Person", name: opts.article.authorName }
        : { "@type": "Organization", name: brand },
      publisher: {
        "@type": "NewsMediaOrganization",
        name: brand,
        legalName: TURKATA_LEGAL_NAME,
        alternateName: ["THA", "TürkAta Haber Ajansı"],
        url: `${TURKATA_ORIGIN}/`,
        telephone: TURKATA_PHONE_TEL,
        email: TURKATA_EMAIL,
        address: postalAddress(TURKATA_LEGAL_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_LEGAL_NAME),
        logo: { "@type": "ImageObject", url: `${TURKATA_ORIGIN}${TURKATA_WORDMARK}` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      inLanguage: "tr-TR",
      isAccessibleForFree: true,
      articleSection: opts.article.categoryName || undefined,
    });
  }
  if (crumbs.length > 1) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.path === "/" ? `${TURKATA_ORIGIN}/` : `${TURKATA_ORIGIN}${item.path}`,
      })),
    });
  }
  applyJsonLd(graph, "turkata");
}
