/**
 * turkatahaber.com — TÜRKATA HABER AJANSI.
 * Portal haber akışı (ahenk.net.tr/haberler ile aynı kaynak) için kenar SEO.
 * Kanonik kök: https://turkatahaber.com (www → apex).
 */

import { markHmNewsBootHtml } from "./hm-html-boot.js";
import { sitemapFailXml, toGscWebSitemapXml } from "./sitemap-fail-xml.js";

export const TURKATA_APEX_HOST = "turkatahaber.com";
export const TURKATA_WWW_HOST = "www.turkatahaber.com";
export const TURKATA_ORIGIN = "https://turkatahaber.com";
/** Apex host alias’ları — aynı HM site (turkatahaber); kanonik SEO kökü yine TURKATA_ORIGIN. */
export const TURKATA_ALIAS_APEX_HOSTS = Object.freeze(["gundemi.org"]);
export const TURKATA_BRAND = "TÜRKATA HABER AJANSI";
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
export const TURKATA_LAT = 39.9272;
export const TURKATA_LNG = 32.8548;
export const TURKATA_DEPARTMENTS = [
  "Yerel Yönetimler Haber Müdürlüğü",
  "Kamu Haber Müdürlüğü",
  "STK ve Sektörel Haber Müdürlükleri",
];
export const TURKATA_PEOPLE = [
  { name: "Nail Türkoğlu", jobTitle: "Genel Müdür" },
  { name: "Mustafa ÖZDEMİR", jobTitle: "Genel Yayın Yönetmeni" },
  { name: "Melek Acar", jobTitle: "Yazı İşleri Müdürü" },
];

export const TURKATA_DESCRIPTION =
  "TÜRKATA HABER AJANSI (THA), Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde 1998’den bu yana yayın yapan haber ajansıdır. Genel Müdürlük: Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara. THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.";

export const TURKATA_LOGO_PATH = "/turkata/turkata-logo.png";
export const TURKATA_OG_IMAGE_PATH = "/turkata/og-default.png";
export const TURKATA_ABOUT_TITLE = "TürkAta Haber Ajansı – Hakkımızda";
export const TURKATA_ABOUT_INTRO = [
  "TürkAta Haber Ajansı; Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde, 1998 yılından bu yana süre gelen çeyrek asırlık kurumsal birikim ve toplumsal sorumluluk bilinciyle yayın hayatını sürdürmektedir.",
  "Temel amacımız; Türkiye’nin dört bir yanında fedakârca görev yapan kamu kurumlarımızın, yerel yönetimlerimizin, muhtarlıklarımızın, eğitim camiamızın, sivil toplum kuruluşlarımızın ve özel sektör temsilcilerimizin dinamizmini, hizmetlerini ve başarılarını tarafsız bir yayıncılık anlayışıyla kamuoyuna aktarmaktır.",
];
export const TURKATA_ABOUT_MISSION_TITLE = 'Misyonumuz: "Sesiniz, Gücünüz ve Tanıtım Yüzünüz"';
export const TURKATA_ABOUT_MISSION =
  "Çağımızın dijital iletişim dinamiklerini geleneksel gazetecilik ilkeleriyle harmanlayan ajansımız; mahallelerimizin, okullarımızın ve kurumlarımızın adeta sesi ve dijital hafızası olmaktadır.";
export const TURKATA_ABOUT_MISSION_POINTS = [
  "Yerel Yönetimler ve Muhtarlıklar: Mahallelerin ihtiyaçlarını, yapılan çalışmaları ve bölgesel güzellikleri ulusal ve dijital gündeme taşıyoruz.",
  "Eğitim ve Kamu Kurumları: Okullarımızın ve kamu birimlerimizin örnek projelerini, başarılarını ve tanıtım materyallerini dijital mecralarımızda öne çıkarıyoruz.",
  "Sivil Toplum ve Sektörel Tanıtım: STK’ların ve kurumların hizmet odaklı vizyonunu hedef kitleleriyle buluşturuyoruz.",
];
export const TURKATA_ABOUT_REACH =
  "Hazırladığımız özel tanıtım haberleri, röportajlar ve görsel içerikler; turkatahaber.com portalımız başta olmak üzere, ajansımıza bağlı haber ağlarında ve sosyal medya kanallarında geniş kitlelere ulaştırılmaktadır.";
export const TURKATA_ABOUT_SOCIAL_TITLE = "Sosyal Sorumluluk ve Eğitim Bütçesine Katkı";
export const TURKATA_ABOUT_SOCIAL = [
  "TürkAta Haber Ajansı, yalnızca bir haber portalı değil; aynı zamanda sosyal sorumluluk bilinciyle çalışan bir geleceğe yatırım projesidir.",
  "Ajansımızın saha ve yayın faaliyetlerinde; vakfımızdan burs alan başta şehit ve gazi çocuklarımız olmak üzere üniversite öğrencilerimiz aktif görev almaktadır. Tanıtım ve haber çalışmalarımız kapsamında sağlanan her türlü gönüllü destek ve katkı; bu öğrencilerimizin eğitim hayatlarına birer burs desteği olarak dönmektedir.",
];
export const TURKATA_ABOUT_PRINCIPLES_TITLE = "Yayın İlkelerimiz ve Yapımız";
export const TURKATA_ABOUT_PRINCIPLES_LEAD =
  "Ankara merkezli yayın organımız; alanında uzmanlaşmış Yerel Yönetimler Haber Müdürlüğü, Kamu Haber Müdürlüğü, STK ve Sektörel Haber Müdürlükleri ile kurumsal ve profesyonel bir yapıda hizmet vermektedir.";
export const TURKATA_ABOUT_PRINCIPLES = [
  "Süreklilik ve Kalite: Paydaşlarımızın ve kurumlarımızın ihtiyaçlarına özel, hızlı ve esnek içerik üretimi.",
  "Dijital Görünürlük: Modern yapay zekâ ve yeni nesil medya teknolojilerini kullanarak hızlı, estetik ve etkileşimi yüksek içerik tasarımı.",
  "Toplumsal Fayda: Yerel başarıları görünür kılarak kurumların ve yöneticilerin toplumsal bağlarını güçlendirmek.",
];
export const TURKATA_ABOUT_CLOSE =
  "Türk Kültürünü Araştırma ve Tanıtma Vakfı güvencesiyle, Türkiye'nin her köşesindeki emeği, hizmeti ve değeri kamuoyuyla buluşturmaya gururla devam ediyoruz.";

const GOOGLE_NEWS_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function normalizeTurkataHost(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
}

function isTurkataAliasApex(apex) {
  return TURKATA_ALIAS_APEX_HOSTS.includes(String(apex || ""));
}

export function isTurkataHaberHost(hostname) {
  const raw = String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (!raw) return false;
  if (raw === TURKATA_APEX_HOST || raw === TURKATA_WWW_HOST) return true;
  const apex = normalizeTurkataHost(raw);
  return apex === TURKATA_APEX_HOST || isTurkataAliasApex(apex);
}

/** www.turkatahaber.com veya www.<alias> (ör. www.gundemi.org) → ilgili apex. */
export function isTurkataWwwHost(hostname) {
  const raw = String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (!raw.startsWith("www.")) return false;
  return isTurkataHaberHost(raw);
}

/**
 * Tarayıcıda görünen kök: alias host’ta kal (gundemi.org), kanonik turkatahaber değil.
 * SEO canonical URL’leri hâlâ TURKATA_ORIGIN kullanır.
 */
export function turkataPublicOrigin(hostname) {
  const apex = normalizeTurkataHost(hostname);
  if (isTurkataAliasApex(apex)) return `https://${apex}`;
  return TURKATA_ORIGIN;
}

export function normalizeTurkataPath(pathname) {
  const p = String(pathname || "").split("?")[0].trim() || "/";
  const n = p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  return n || "/";
}

/** ahenk.net.tr üzerindeki aynı haber URL’leri. Kanonik hedef turkatahaber.com. */
export function isAhenkNewsMirrorPath(pathname) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  if (p === "/haberler") return true;
  if (p.startsWith("/haber/")) return true;
  if (p.startsWith("/makale/")) return true;
  if (p.startsWith("/haberler/rss/")) return true;
  return false;
}

export function turkataCanonicalPath(pathname) {
  const p = normalizeTurkataPath(pathname);
  if (p === "/" || p.toLowerCase() === "/haberler") return "/";
  return p;
}

export function turkataCanonicalUrl(pathname) {
  const path = turkataCanonicalPath(pathname);
  return path === "/" ? `${TURKATA_ORIGIN}/` : `${TURKATA_ORIGIN}${path}`;
}

export function turkataArticleSlug(pathname) {
  const p = normalizeTurkataPath(pathname);
  const m = p.match(/^\/(?:haber|makale)\/([^/]+)$/i);
  if (!m?.[1]) return "";
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function turkataPageKind(pathname) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  if (p === "/" || p === "/haberler") return "home";
  if (p.startsWith("/haber/") || p.startsWith("/makale/") || p.startsWith("/haberler/rss/")) return "article";
  if (p === "/hakkimizda" || p === "/hakkinda" || p === "/about") return "about";
  if (p === "/kunye" || p === "/iletisim-kunye") return "imprint";
  if (p === "/iletisim" || p === "/contact") return "contact";
  return "other";
}

/** Köşe yazarı paneli — canlı SPA slug'ı `turkatahaber` (meta/by-domain 500). */
export function isTurkataAuthorPanelPath(pathname) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  return (
    p.startsWith("/yazar/giris") ||
    p.startsWith("/yazar/sifre") ||
    p.startsWith("/yazar/haber") ||
    p.startsWith("/koseyazari/giris") ||
    p.startsWith("/koseyazari/sifre") ||
    p.startsWith("/koseyazari/haber")
  );
}

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlEscape(s) {
  return escHtml(s);
}

function replaceMetaByKey(html, attr, key, value) {
  const escVal = escHtml(value);
  const rePropFirst = new RegExp(
    `(<meta\\s+[^>]*${attr}=["']${key}["'][^>]*content=["'])[^"']*(["'])`,
    "i",
  );
  if (rePropFirst.test(html)) return html.replace(rePropFirst, `$1${escVal}$2`);
  const reContentFirst = new RegExp(
    `(<meta\\s+[^>]*content=["'])[^"']*(["'][^>]*${attr}=["']${key}["'])`,
    "i",
  );
  if (reContentFirst.test(html)) return html.replace(reContentFirst, `$1${escVal}$2`);
  return html.replace(/<\/head>/i, `<meta ${attr}="${key}" content="${escVal}"/>\n</head>`);
}

function upsertLinkTag(html, rel, href, extra) {
  const escHref = escHtml(href);
  const extraAttr = extra ? ` ${extra}` : "";
  const re = new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*>`, "i");
  const tag = `<link rel="${rel}" href="${escHref}"${extraAttr}/>`;
  if (rel === "canonical" && re.test(html)) return html.replace(re, tag);
  if (rel === "canonical") return html.replace(/<\/head>/i, `${tag}\n</head>`);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function isoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function articleFieldsFromNewsPayload(json) {
  const article = json?.article && typeof json.article === "object" ? json.article : json;
  if (!article || typeof article !== "object") return null;
  const title = String(article.title || "").trim();
  if (!title) return null;
  const published = article.publishedAt || article.createdAt || article.date || "";
  const modified = article.updatedAt || article.dateModified || published;
  return {
    title,
    slug: String(article.slug || "").trim(),
    description: String(article.spot || article.summary || article.description || title).trim(),
    imageUrl: String(article.imageUrl || article.image || article.thumbnailUrl || "").trim(),
    authorName: String(article.authorName || "").trim(),
    datePublished: isoDate(published),
    dateModified: isoDate(modified) || isoDate(published),
    categoryName: String(article.categoryName || "").trim(),
  };
}

function postalAddress(street, locality, region, name) {
  const node = {
    "@type": "PostalAddress",
    streetAddress: street,
    addressLocality: locality,
    addressRegion: region,
    addressCountry: "TR",
  };
  if (name) node.name = name;
  return node;
}

function personNode(person) {
  return { "@type": "Person", name: person.name, jobTitle: person.jobTitle };
}

function organizationNode() {
  return {
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
    geo: {
      "@type": "GeoCoordinates",
      latitude: TURKATA_LAT,
      longitude: TURKATA_LNG,
    },
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
    logo: {
      "@type": "ImageObject",
      url: `${TURKATA_ORIGIN}${TURKATA_LOGO_PATH}`,
      width: 960,
      height: 313,
    },
  };
}

function legalEntityNode() {
  return {
    "@type": "Organization",
    "@id": `${TURKATA_ORIGIN}/#legal-entity`,
    name: TURKATA_LEGAL_NAME,
    legalName: TURKATA_LEGAL_NAME,
    address: postalAddress(TURKATA_LEGAL_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_LEGAL_NAME),
  };
}

function localBusinessNode() {
  return {
    "@type": "LocalBusiness",
    "@id": `${TURKATA_ORIGIN}/#local`,
    name: TURKATA_BRAND,
    url: `${TURKATA_ORIGIN}/`,
    description: TURKATA_DESCRIPTION,
    telephone: TURKATA_PHONE_TEL,
    email: TURKATA_EMAIL,
    address: postalAddress(TURKATA_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_OFFICE),
    geo: {
      "@type": "GeoCoordinates",
      latitude: TURKATA_LAT,
      longitude: TURKATA_LNG,
    },
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

function pageCopy(kind, article) {
  if (kind === "article" && article?.title) {
    const title = `${article.title} | ${TURKATA_BRAND}`;
    const description = String(article.description || article.title).trim();
    return { title, description, ogType: "article" };
  }
  if (kind === "about") {
    return {
      title: TURKATA_ABOUT_TITLE,
      description: TURKATA_ABOUT_INTRO[0],
      ogType: "website",
    };
  }
  if (kind === "imprint") {
    return {
      title: TURKATA_KUNYE_TITLE,
      description: `${TURKATA_OFFICE}. Resmi ünvan: ${TURKATA_LEGAL_NAME}. Adres: ${TURKATA_ADDRESS_LINE}. Gsm: ${TURKATA_PHONE_DISPLAY}. E-posta: ${TURKATA_EMAIL}.`,
      ogType: "website",
    };
  }
  if (kind === "contact") {
    return {
      title: `İletişim | TürkAta Haber Ajansı`,
      description: `${TURKATA_OFFICE}. ${TURKATA_ADDRESS_LINE}. Gsm: ${TURKATA_PHONE_DISPLAY}. E-posta: ${TURKATA_EMAIL}.`,
      ogType: "website",
    };
  }
  return {
    title: TURKATA_BRAND,
    description: TURKATA_DESCRIPTION,
    ogType: "website",
  };
}

function breadcrumbLd(kind, canonical, article) {
  const items = [{ name: "Anasayfa", path: "/" }];
  if (kind === "article") {
    items.push({ name: article?.title || "Haber", path: turkataCanonicalPath(canonical.replace(TURKATA_ORIGIN, "") || "/") });
  } else if (kind === "about") items.push({ name: "Hakkımızda", path: "/hakkimizda" });
  else if (kind === "imprint") items.push({ name: "Künye", path: "/kunye" });
  else if (kind === "contact") items.push({ name: "İletişim", path: "/iletisim" });
  if (items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.path === "/" ? `${TURKATA_ORIGIN}/` : `${TURKATA_ORIGIN}${item.path}`,
    })),
  };
}

function newsArticleLd(article, canonical, image) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${canonical}#article`,
    headline: article.title,
    description: article.description,
    image: image || undefined,
    datePublished: article.datePublished || undefined,
    dateModified: article.dateModified || article.datePublished || undefined,
    author: article.authorName
      ? { "@type": "Person", name: article.authorName }
      : { "@type": "Organization", name: TURKATA_BRAND },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: TURKATA_BRAND,
      legalName: TURKATA_LEGAL_NAME,
      alternateName: ["THA", "TürkAta Haber Ajansı"],
      url: `${TURKATA_ORIGIN}/`,
      telephone: TURKATA_PHONE_TEL,
      email: TURKATA_EMAIL,
      address: postalAddress(TURKATA_LEGAL_STREET, TURKATA_LOCALITY, TURKATA_REGION, TURKATA_LEGAL_NAME),
      logo: {
        "@type": "ImageObject",
        url: `${TURKATA_ORIGIN}${TURKATA_LOGO_PATH}`,
        width: 960,
        height: 313,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "tr-TR",
    isAccessibleForFree: true,
    articleSection: article.categoryName || undefined,
  };
}

function jsonLdForPage(kind, canonical, article, image) {
  const graph = [organizationNode(), legalEntityNode(), localBusinessNode()];
  if (kind === "article" && article?.title) graph.push(newsArticleLd(article, canonical, image));
  const crumbs = breadcrumbLd(kind, canonical, article);
  if (crumbs) graph.push(crumbs);
  return { "@context": "https://schema.org", "@graph": graph };
}

function absImage(imageUrl) {
  const u = String(imageUrl || "").trim();
  if (!u) return `${TURKATA_ORIGIN}${TURKATA_OG_IMAGE_PATH}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${TURKATA_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

function visibleBody(kind, article) {
  if (kind === "article" && article?.title) {
    const img = article.imageUrl
      ? `<p><img src="${escHtml(absImage(article.imageUrl))}" alt="${escHtml(article.title)}"/></p>`
      : "";
    return `<article><h1>${escHtml(article.title)}</h1><p>${escHtml(article.description || "")}</p>${img}</article>`;
  }
  if (kind === "about") {
    const intro = TURKATA_ABOUT_INTRO.map((p) => `<p>${escHtml(p)}</p>`).join("");
    const missionPoints = TURKATA_ABOUT_MISSION_POINTS.map((p) => `<li>${escHtml(p)}</li>`).join("");
    const social = TURKATA_ABOUT_SOCIAL.map((p) => `<p>${escHtml(p)}</p>`).join("");
    const principles = TURKATA_ABOUT_PRINCIPLES.map((p) => `<li>${escHtml(p)}</li>`).join("");
    return `<article>
<h1>${escHtml(TURKATA_ABOUT_TITLE)}</h1>
<p>${escHtml(TURKATA_TAGLINE)}</p>
${intro}
<h2>${escHtml(TURKATA_ABOUT_MISSION_TITLE)}</h2>
<p>${escHtml(TURKATA_ABOUT_MISSION)}</p>
<ul>${missionPoints}</ul>
<p>${escHtml(TURKATA_ABOUT_REACH)}</p>
<h2>${escHtml(TURKATA_ABOUT_SOCIAL_TITLE)}</h2>
${social}
<h2>${escHtml(TURKATA_ABOUT_PRINCIPLES_TITLE)}</h2>
<p>${escHtml(TURKATA_ABOUT_PRINCIPLES_LEAD)}</p>
<ul>${principles}</ul>
<p>${escHtml(TURKATA_ABOUT_CLOSE)}</p>
</article>`;
  }
  if (kind === "imprint") {
    const people = TURKATA_PEOPLE.map((p) => `<li>${escHtml(p.jobTitle)}: ${escHtml(p.name)}</li>`).join("");
    const deps = TURKATA_DEPARTMENTS.map((d) => `<li>${escHtml(d)}</li>`).join("");
    return `<article>
<h1>${escHtml(TURKATA_KUNYE_TITLE)}</h1>
<p>${escHtml(TURKATA_STATEMENT)}</p>
<p>${escHtml(TURKATA_OFFICE)}</p>
<ul>${people}</ul>
<p>Adres: ${escHtml(TURKATA_ADDRESS_LINE)}</p>
<p>Gsm: <a href="tel:${TURKATA_PHONE_TEL}">${escHtml(TURKATA_PHONE_DISPLAY)}</a></p>
<p>E-posta: <a href="mailto:${TURKATA_EMAIL}">${escHtml(TURKATA_EMAIL)}</a></p>
<h2>Resmi Ünvan</h2>
<p>${escHtml(TURKATA_LEGAL_NAME)}</p>
<p>Adres: ${escHtml(TURKATA_LEGAL_ADDRESS_LINE)}</p>
<h2>Vakıf</h2>
<p>${escHtml(TURKATA_FOUNDATION)}</p>
<p>Adres: ${escHtml(TURKATA_FOUNDATION_ADDRESS_LINE)}</p>
<ul>${deps}</ul>
</article>`;
  }
  const deps = TURKATA_DEPARTMENTS.map((d) => `<li>${escHtml(d)}</li>`).join("");
  return `<main>
<h1>${escHtml(TURKATA_BRAND)}</h1>
<p>${escHtml(TURKATA_DESCRIPTION)}</p>
<ul>${deps}</ul>
<nav>
<a href="${TURKATA_ORIGIN}/">Ana sayfa</a>
<a href="${TURKATA_ORIGIN}/hakkimizda">Hakkımızda</a>
<a href="${TURKATA_ORIGIN}/kunye">Künye</a>
<a href="${TURKATA_ORIGIN}/iletisim">İletişim</a>
</nav>
</main>`;
}

/**
 * SPA index.html başlığını turkata sayfasına çevirir. Tüm kullanıcı ajanları.
 */
export function rewriteTurkataSpaHtml(html, opts) {
  const pathname = opts?.pathname || "/";
  const kind = turkataPageKind(pathname);
  const article = opts?.article || null;
  const copy = pageCopy(kind, article);
  const canonical = turkataCanonicalUrl(pathname);
  const image = absImage(article?.imageUrl);
  const ld = jsonLdForPage(kind, canonical, article, image);
  let out = String(html || "");
  out = out.replace(/<html[^>]*>/i, '<html lang="tr" class="hm-news-boot">');
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escHtml(copy.title)}</title>`);
  out = replaceMetaByKey(out, "name", "title", copy.title);
  out = replaceMetaByKey(out, "name", "description", copy.description);
  out = replaceMetaByKey(out, "name", "author", TURKATA_BRAND);
  out = replaceMetaByKey(out, "name", "robots", "index, follow, max-image-preview:large, max-snippet:-1");
  out = replaceMetaByKey(out, "name", "language", "Turkish");
  out = replaceMetaByKey(out, "name", "geo.region", "TR-06");
  out = replaceMetaByKey(out, "name", "geo.placename", "Ankara");
  out = replaceMetaByKey(out, "name", "geo.position", `${TURKATA_LAT};${TURKATA_LNG}`);
  out = replaceMetaByKey(out, "name", "ICBM", `${TURKATA_LAT}, ${TURKATA_LNG}`);
  out = replaceMetaByKey(out, "property", "og:type", copy.ogType);
  out = replaceMetaByKey(out, "property", "og:locale", "tr_TR");
  out = replaceMetaByKey(out, "property", "og:title", copy.title);
  out = replaceMetaByKey(out, "property", "og:description", copy.description);
  out = replaceMetaByKey(out, "property", "og:url", canonical);
  out = replaceMetaByKey(out, "property", "og:site_name", TURKATA_BRAND);
  out = replaceMetaByKey(out, "property", "og:image", image);
  out = replaceMetaByKey(out, "name", "twitter:card", "summary_large_image");
  out = replaceMetaByKey(out, "name", "twitter:title", copy.title);
  out = replaceMetaByKey(out, "name", "twitter:description", copy.description);
  out = replaceMetaByKey(out, "name", "twitter:image", image);
  out = replaceMetaByKey(out, "name", "twitter:url", canonical);
  out = upsertLinkTag(out, "canonical", canonical);
  out = out.replace(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>/gi, "");
  out = upsertLinkTag(out, "alternate", canonical, 'hreflang="tr"');
  out = upsertLinkTag(out, "alternate", canonical, 'hreflang="x-default"');
  out = out.replace(
    /<script type="application\/ld\+json"[^>]*data-yekpare-portal-jsonld="1"[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  out = out.replace(/<link\s+[^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon|manifest)["'][^>]*>/gi, "");
  const iconTags = [
    '<link rel="icon" href="/turkata/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/turkata/favicon-32.png">',
    '<link rel="icon" type="image/png" sizes="192x192" href="/turkata/icon-192.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/turkata/apple-touch-icon.png">',
    '<link rel="manifest" href="/turkata/manifest.webmanifest">',
  ].join("");
  const ldTag = `<script type="application/ld+json" data-turkata-jsonld="1">${JSON.stringify(ld)}</script>`;
  const authorBoot = isTurkataAuthorPanelPath(pathname)
    ? `<script>window.__YEKPARE_HM_DOMAIN_BOOT__=${JSON.stringify({
        slug: "turkatahaber",
        host: "turkatahaber.com",
      })};</script>`
    : "";
  const body = visibleBody(kind, article);
  if (/id=["']root["']/.test(out)) {
    out = out.replace(/<div id="root">\s*<\/div>/i, `<div id="root">${body}</div>`);
  }
  out = out.replace(/<\/head>/i, `${iconTags}${ldTag}${authorBoot}\n</head>`);
  return markHmNewsBootHtml(out);
}

/** `/haberler/haber/:slug` portal makalesidir; HM site slug'ı değildir. */
export function portalHaberlerArticleAliasPath(pathname) {
  const path = String(pathname || "").split("?")[0].split("#")[0];
  const match = path.match(/^\/haberler\/haber\/([^/]+)\/?$/);
  if (!match || !match[1]) return null;
  return `/haber/${match[1]}`;
}

/** ahenk.net.tr/haberler ve haber detayı — canonical turkatahaber.com. Başlık ajans vitrininde kalır. */
export function rewriteAhenkNewsCanonicalHtml(html, pathname) {
  if (!isAhenkNewsMirrorPath(pathname)) return String(html || "");
  const canonical = turkataCanonicalUrl(pathname);
  let out = String(html || "");
  out = upsertLinkTag(out, "canonical", canonical);
  out = replaceMetaByKey(out, "property", "og:url", canonical);
  out = replaceMetaByKey(out, "name", "twitter:url", canonical);
  out = out.replace(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>/gi, "");
  out = upsertLinkTag(out, "alternate", canonical, 'hreflang="tr"');
  return out;
}

export function buildTurkataRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes, use=full",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    `Sitemap: ${TURKATA_ORIGIN}/sitemap.xml`,
    `Sitemap: ${TURKATA_ORIGIN}/google-news.xml`,
    "",
    "# GEO — https://llmstxt.org/",
    "# LLMs-Txt: /llms.txt",
    "",
    "Disallow: /admin/",
    "Disallow: /editor/",
    "Disallow: /api/",
    "",
  ].join("\n");
}

export function buildTurkataLlmsTxt() {
  const deps = TURKATA_DEPARTMENTS.map((d) => `- ${d}`).join("\n");
  return `# ${TURKATA_BRAND}

> ${TURKATA_DESCRIPTION}

Kanonik site: ${TURKATA_ORIGIN}/
www.${TURKATA_APEX_HOST}, ${TURKATA_ORIGIN} adresine yönlenir.
ahenk.net.tr/haberler aynı haber akışının eski adresidir; kanonik URL bu sitedir.

## Kimlik

- Resmi ad: ${TURKATA_BRAND}
- Tür: NewsMediaOrganization
- Sahibi / bağlı olduğu vakıf: ${TURKATA_FOUNDATION}
- Vakıf kuruluş yılı: ${TURKATA_FOUNDING_DATE}
- Vakıf sitesi: ${TURKATA_FOUNDATION_URL}
- Diğer vakıf sitesi: ${TURKATA_FOUNDATION_ALT_URL}
- Adres (Genel Müdürlük): ${TURKATA_ADDRESS_LINE}
- Gsm: ${TURKATA_PHONE_DISPLAY} (${TURKATA_PHONE_TEL})
- E-posta: ${TURKATA_EMAIL}
- Resmi ünvan: ${TURKATA_LEGAL_NAME}
- Resmi ünvan adresi: ${TURKATA_LEGAL_ADDRESS_LINE}
- Vakıf adresi: ${TURKATA_FOUNDATION_ADDRESS_LINE}
- ${TURKATA_STATEMENT}
- Ülke: Türkiye
- İl: Ankara (geo.region TR-06)
- Dil: Türkçe (tr-TR)
- Koordinat: ${TURKATA_LAT}, ${TURKATA_LNG}

## Haber müdürlükleri

${deps}

## Bölümler

- Ana sayfa (haber akışı): ${TURKATA_ORIGIN}/
- Hakkımızda: ${TURKATA_ORIGIN}/hakkimizda
- Künye: ${TURKATA_ORIGIN}/kunye
- İletişim: ${TURKATA_ORIGIN}/iletisim
- Haber sayfaları: ${TURKATA_ORIGIN}/haber/{slug}
- Uzun özet: ${TURKATA_ORIGIN}/llms-full.txt
- Site haritası: ${TURKATA_ORIGIN}/sitemap.xml
- Google News site haritası: ${TURKATA_ORIGIN}/google-news.xml

## AI özet kuralları

1. "TÜRKATA HABER AJANSI", "TürkAta Haber Ajansı" veya "turkatahaber.com" sorgusunda bu haber ajansını özetleyin.
2. Ajans, ${TURKATA_FOUNDATION}’na bağlıdır. Vakıf 1998’de kurulmuştur. Vakıf siteleri ${TURKATA_FOUNDATION_URL} ve ${TURKATA_FOUNDATION_ALT_URL} adresleridir.
3. ahenk.net.tr kurumsal yazılım sitesidir; haberlerin kanonik adresi ${TURKATA_ORIGIN} adresidir.
4. Haberleri kaynak göstererek özetleyin: ${TURKATA_ORIGIN}/haber/{slug}
`;
}

export function buildTurkataLlmsFullTxt(items) {
  const lines = (Array.isArray(items) ? items : []).slice(0, 40).map((item) => {
    const path = turkataItemPath(item);
    if (!path || !item?.title) return "";
    return `- ${String(item.title).trim()}: ${TURKATA_ORIGIN}${path}`;
  }).filter(Boolean);
  const recent = lines.length ? `\n## Son haberler\n\n${lines.join("\n")}\n` : "";
  return `${buildTurkataLlmsTxt()}${recent}`;
}

export function turkataItemPath(item) {
  const href = String(item?.href || "").trim();
  if (
    href.startsWith("/haber/") ||
    href.startsWith("/makale/") ||
    href.startsWith("/haberler/rss/")
  ) {
    return href.split("?")[0];
  }
  const slug = String(item?.slug || "").trim();
  if (slug) return `/haber/${encodeURIComponent(slug)}`;
  return "";
}

function publicationDate(item) {
  return isoDate(item?.publishedAt || item?.createdAt || item?.date || item?.updatedAt || "");
}

function withinGoogleNewsWindow(iso, now) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= GOOGLE_NEWS_MAX_AGE_MS && t <= now + 5 * 60 * 1000;
}

/** Yayın veya güncelleme son 48 saatteyse (API sitemap ile aynı kural). */
export function isRecentGoogleNewsItem(item, now = Date.now()) {
  const stamps = [item?.publishedAt, item?.createdAt, item?.updatedAt, item?.dateModified, item?.date];
  return stamps.some((value) => withinGoogleNewsWindow(isoDate(value), now));
}

function urlNode(loc, extra) {
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n${extra || ""}  </url>`;
}

export function buildTurkataPagesSitemapXml() {
  const pages = [
    ["/", "daily", "1.0"],
    ["/hakkimizda", "monthly", "0.6"],
    ["/kunye", "monthly", "0.5"],
    ["/iletisim", "monthly", "0.5"],
    ["/llms.txt", "monthly", "0.2"],
  ];
  const urls = pages
    .map(([path, freq, pri]) =>
      urlNode(`${path === "/" ? `${TURKATA_ORIGIN}/` : `${TURKATA_ORIGIN}${path}`}`, `    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n`),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildTurkataNewsSitemapXml(items) {
  const seen = new Set();
  const urls = [];
  for (const item of Array.isArray(items) ? items : []) {
    const path = turkataItemPath(item);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const loc = `${TURKATA_ORIGIN}${path}`;
    const lastmod = publicationDate(item) || isoDate(item?.updatedAt);
    const image = String(item?.imageUrl || "").trim();
    let extra = lastmod ? `    <lastmod>${xmlEscape(lastmod)}</lastmod>\n` : "";
    extra += `    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n`;
    if (image.startsWith("http")) {
      extra += `    <image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>\n`;
    }
    urls.push(urlNode(loc, extra));
    if (urls.length >= 1000) break;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}

export function buildTurkataGoogleNewsSitemapXml(items, now = Date.now()) {
  const seen = new Set();
  const urls = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!isRecentGoogleNewsItem(item, now)) continue;
    const path = turkataItemPath(item);
    const title = String(item?.title || "").trim();
    if (!path || !title || seen.has(path)) continue;
    seen.add(path);
    const loc = `${TURKATA_ORIGIN}${path}`;
    const pub = publicationDate(item);
    urls.push(
      urlNode(
        loc,
        `    <news:news>\n      <news:publication>\n        <news:name>${xmlEscape(TURKATA_BRAND)}</news:name>\n        <news:language>tr</news:language>\n      </news:publication>\n      <news:publication_date>${xmlEscape(pub)}</news:publication_date>\n      <news:title>${xmlEscape(title)}</news:title>\n    </news:news>\n`,
      ),
    );
    if (urls.length >= 1000) break;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function buildTurkataSitemapIndexXml() {
  const now = new Date().toISOString();
  const locs = ["/sitemap-pages.xml", "/sitemap-news.xml", "/google-news.xml"];
  const body = locs
    .map(
      (path) =>
        `  <sitemap>\n    <loc>${TURKATA_ORIGIN}${path}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

const TURKATA_SITEMAP_REWRITE_ORIGINS = [
  "https://www.ahenk.net.tr",
  "http://www.ahenk.net.tr",
  "https://ahenk.net.tr",
  "http://ahenk.net.tr",
  "https://www.turk.eco",
  "http://www.turk.eco",
  "https://turk.eco",
  "http://turk.eco",
  "https://goalgo-production.up.railway.app",
  "http://goalgo-production.up.railway.app",
  "https://goalgo-y7ze.onrender.com",
  "http://goalgo-y7ze.onrender.com",
];

const TURKATA_STATIC_SITEMAP_PAGES = ["/", "/hakkimizda", "/kunye", "/iletisim"];

/**
 * turkatahaber.com is not an HM slug. The shared proxy maps /sitemap.xml to
 * /api/sitemap/index.xml for unknown hosts, and that route 500s. These files
 * are the portal article urlsets instead.
 */
export function turkataUpstreamSitemapApiPath(pathname) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  if (p === "/sitemap.xml" || p === "/sitemap-web.xml" || p === "/sitemap-news.xml") {
    return "/api/sitemap/news-yekpare.xml";
  }
  if (p === "/google-news.xml") return "/api/sitemap/google-news.xml";
  return null;
}

export function rewriteTurkataSitemapXml(xml) {
  let out = String(xml || "");
  for (const bad of TURKATA_SITEMAP_REWRITE_ORIGINS) {
    if (out.includes(bad)) out = out.split(bad).join(TURKATA_ORIGIN);
  }
  out = out.replace(
    /<news:name>[^<]*<\/news:name>/g,
    `<news:name>${xmlEscape(TURKATA_BRAND)}</news:name>`,
  );
  return out;
}

export function mergeTurkataStaticPagesIntoUrlset(xml) {
  let out = String(xml || "");
  if (!out.includes("<urlset")) {
    out =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
  }
  const inserts = [];
  for (const path of TURKATA_STATIC_SITEMAP_PAGES) {
    const loc = path === "/" ? `${TURKATA_ORIGIN}/` : `${TURKATA_ORIGIN}${path}`;
    if (out.includes(`<loc>${loc}</loc>`)) continue;
    inserts.push(urlNode(loc, ""));
  }
  if (!inserts.length) return out;
  const idx = out.lastIndexOf("</urlset>");
  if (idx === -1) return out;
  return `${out.slice(0, idx)}${inserts.join("\n")}\n${out.slice(idx)}`;
}

/** Upstream article XML → public TürkAta sitemap, or sitemapFailXml when the API failed. */
export function turkataSitemapFromUpstream(pathname, upstream) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  const xml = String(upstream?.xml || "");
  if (upstream?.ok !== true || !xml.includes("<urlset")) {
    return {
      status: 503,
      contentType: "application/xml; charset=utf-8",
      body: sitemapFailXml(p, TURKATA_ORIGIN),
      failed: true,
    };
  }
  let body = rewriteTurkataSitemapXml(xml);
  if (p === "/sitemap.xml" || p === "/sitemap-web.xml") {
    body = toGscWebSitemapXml(body);
    body = mergeTurkataStaticPagesIntoUrlset(body);
  }
  return {
    status: 200,
    contentType: "application/xml; charset=utf-8",
    body,
    failed: false,
  };
}

export function turkataStaticSeoBody(pathname) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  if (p === "/robots.txt") return { contentType: "text/plain; charset=utf-8", body: buildTurkataRobotsTxt() };
  if (p === "/llms.txt" || p === "/ai.txt") return { contentType: "text/plain; charset=utf-8", body: buildTurkataLlmsTxt() };
  if (p === "/sitemap-index.xml") return { contentType: "application/xml; charset=utf-8", body: buildTurkataSitemapIndexXml() };
  if (p === "/sitemap-pages.xml") return { contentType: "application/xml; charset=utf-8", body: buildTurkataPagesSitemapXml() };
  return null;
}

export function turkataDynamicSeoBody(pathname, items) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  if (p === "/llms-full.txt") return { contentType: "text/plain; charset=utf-8", body: buildTurkataLlmsFullTxt(items) };
  return null;
}

export function isTurkataDynamicSeoPath(pathname) {
  const p = normalizeTurkataPath(pathname).toLowerCase();
  return p === "/llms-full.txt";
}

export function isTurkataSeoPath(pathname) {
  return Boolean(turkataStaticSeoBody(pathname)) || isTurkataDynamicSeoPath(pathname);
}
