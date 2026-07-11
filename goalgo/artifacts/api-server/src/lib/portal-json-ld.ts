/** Schema.org JSON-LD — arama motorları ve yapay zeka özetleri için. */

import { PORTAL_ORIGIN } from "./portalBrand.js";

function portalOriginFallback(origin: string): string {
  return origin.replace(/\/+$/, "") || PORTAL_ORIGIN;
}

function cleanText(raw: string | null | undefined, max = 500): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function vendorJsonLd(opts: {
  origin: string;
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  isShop: boolean;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const schemaType = opts.isShop ? "Store" : "Restaurant";
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${url}#business`,
    name: opts.name,
    url,
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() || undefined,
    telephone: opts.phone?.trim() || undefined,
    address: opts.address?.trim()
      ? {
          "@type": "PostalAddress",
          streetAddress: opts.address.trim(),
          addressLocality: opts.district?.trim() || opts.city?.trim() || undefined,
          addressRegion: opts.city?.trim() || undefined,
          addressCountry: "TR",
        }
      : undefined,
    parentOrganization: {
      "@type": "Organization",
      name: "Yekpare",
      url: portalOriginFallback(opts.origin),
    },
  };
  if (opts.lat != null && opts.lng != null && Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
    out.geo = { "@type": "GeoCoordinates", latitude: opts.lat, longitude: opts.lng };
  }
  if (opts.rating != null && Number(opts.rating) > 0) {
    out.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(opts.rating).toFixed(1),
      reviewCount: Math.max(0, Number(opts.reviewCount ?? 0)),
      bestRating: "5",
      worstRating: "1",
    };
  }
  return out;
}

export function mapBusinessJsonLd(opts: {
  origin: string;
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
}): Record<string, unknown> {
  const base = vendorJsonLd({ ...opts, isShop: false, reviewCount: null });
  return { ...base, "@type": "LocalBusiness" };
}

export function newsArticleJsonLd(opts: {
  origin: string;
  path: string;
  headline: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
  authorName?: string | null;
  publisherName?: string;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const pub = opts.datePublished != null ? new Date(opts.datePublished).toISOString() : undefined;
  const mod = opts.dateModified != null ? new Date(opts.dateModified).toISOString() : pub;
  const publisher = opts.publisherName?.trim() || "Yekpare";
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    headline: cleanText(opts.headline, 200),
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() ? [opts.image.trim()] : undefined,
    datePublished: pub,
    dateModified: mod,
    author: opts.authorName?.trim()
      ? { "@type": "Person", name: opts.authorName.trim() }
      : { "@type": "Organization", name: publisher },
    publisher: {
      "@type": "Organization",
      name: publisher,
      url: portalOriginFallback(opts.origin),
      logo: {
        "@type": "ImageObject",
        url: `${portalOriginFallback(opts.origin)}/icon-512.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "tr-TR",
  };
}

export function encyclopediaArticleJsonLd(opts: {
  origin: string;
  path: string;
  headline: string;
  description?: string | null;
  image?: string | null;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: cleanText(opts.headline, 200),
    name: cleanText(opts.headline, 200),
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() || undefined,
    url,
    inLanguage: "tr-TR",
    isPartOf: {
      "@type": "WebSite",
      name: "Yekpare Ansiklopedi",
      url: `${opts.origin.replace(/\/+$/, "")}/bilgiagaci`,
    },
    publisher: {
      "@type": "Organization",
      name: "Yekpare",
      url: portalOriginFallback(opts.origin),
    },
  };
}

export function blogListJsonLd(opts: {
  origin: string;
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  posts?: Array<{ url: string; headline: string; datePublished?: string | Date | null }>;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    name: cleanText(opts.name, 200),
    url,
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() || undefined,
    inLanguage: "tr-TR",
    isPartOf: {
      "@type": "WebSite",
      name: "Yekpare",
      url: portalOriginFallback(opts.origin),
    },
  };
  if (opts.posts?.length) {
    out.blogPost = opts.posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: cleanText(p.headline, 200),
      url: p.url,
      datePublished: p.datePublished != null ? new Date(p.datePublished).toISOString() : undefined,
    }));
  }
  return out;
}

export function collectionPageJsonLd(opts: {
  origin: string;
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  items?: Array<{ name: string; url: string; description?: string | null }>;
}): Record<string, unknown> {
  const base = portalOriginFallback(opts.origin);
  const url = `${base}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    name: cleanText(opts.name, 200),
    url,
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() || undefined,
    inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", name: "Yekpare", url: base },
  };
  if (opts.items?.length) {
    out.mainEntity = {
      "@type": "ItemList",
      itemListElement: opts.items.slice(0, 12).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: cleanText(item.name, 120),
        url: item.url.startsWith("http") ? item.url : `${base}${item.url.startsWith("/") ? item.url : `/${item.url}`}`,
        description: item.description ? cleanText(item.description, 200) : undefined,
      })),
    };
  }
  return out;
}

export function blogPostingJsonLd(opts: {
  origin: string;
  path: string;
  headline: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | Date | null;
  authorName?: string | null;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const pub = opts.datePublished != null ? new Date(opts.datePublished).toISOString() : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    headline: cleanText(opts.headline, 200),
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() || undefined,
    datePublished: pub,
    dateModified: pub,
    url,
    author: opts.authorName?.trim()
      ? { "@type": "Organization", name: opts.authorName.trim() }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: opts.authorName?.trim() || "Yekpare",
      url: portalOriginFallback(opts.origin),
    },
    inLanguage: "tr-TR",
  };
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function tourismListingJsonLd(opts: {
  origin: string;
  path: string;
  title: string;
  description?: string | null;
  image?: string | null;
  type?: string | null;
  city?: string | null;
  price?: number | null;
  priceUnit?: string | null;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const t = String(opts.type ?? "hotel").toLowerCase();
  const schemaType =
    t === "hotel" || t === "villa" ? "LodgingBusiness" : t === "tour" ? "TouristTrip" : "LocalBusiness";
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${url}#listing`,
    name: cleanText(opts.title, 200),
    url,
    description: cleanText(opts.description) || undefined,
    image: opts.image?.trim() || undefined,
    address: opts.city?.trim()
      ? { "@type": "PostalAddress", addressLocality: opts.city.trim(), addressCountry: "TR" }
      : undefined,
  };
  if (opts.price != null && Number(opts.price) > 0) {
    out.offers = {
      "@type": "Offer",
      price: Number(opts.price),
      priceCurrency: "TRY",
      url,
      description: opts.priceUnit?.trim() || undefined,
    };
  }
  return out;
}

export function productJsonLd(opts: {
  origin: string;
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  sku?: string | null;
  brand?: string | null;
  price?: number | null;
  salePrice?: number | null;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  sellerName?: string | null;
  sellerUrl?: string | null;
  aggregateRating?: { ratingValue: number; reviewCount: number } | null;
}): Record<string, unknown> {
  const url = `${opts.origin.replace(/\/+$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const price = opts.salePrice != null && opts.salePrice > 0 ? opts.salePrice : opts.price;
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: opts.name,
    url,
    description: cleanText(opts.description, 500) || undefined,
    image: opts.image?.trim() || undefined,
    sku: opts.sku?.trim() || undefined,
    brand: opts.brand?.trim()
      ? { "@type": "Brand", name: opts.brand.trim() }
      : opts.sellerName?.trim()
        ? { "@type": "Brand", name: opts.sellerName.trim() }
        : undefined,
    inLanguage: "tr-TR",
  };
  if (price != null && Number(price) > 0) {
    out.offers = {
      "@type": "Offer",
      price: Number(price).toFixed(2),
      priceCurrency: opts.currency ?? "TRY",
      availability: `https://schema.org/${opts.availability ?? "InStock"}`,
      url,
      seller: opts.sellerName?.trim()
        ? {
            "@type": "Organization",
            name: opts.sellerName.trim(),
            url: opts.sellerUrl?.trim() || undefined,
          }
        : undefined,
    };
  }
  if (opts.aggregateRating && opts.aggregateRating.ratingValue > 0) {
    out.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(opts.aggregateRating.ratingValue).toFixed(1),
      reviewCount: Math.max(0, Number(opts.aggregateRating.reviewCount ?? 0)),
      bestRating: "5",
      worstRating: "1",
    };
  }
  return out;
}

export function jsonLdScriptTag(data: Record<string, unknown> | Record<string, unknown>[]): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}
