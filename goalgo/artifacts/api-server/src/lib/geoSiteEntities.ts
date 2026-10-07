/**
 * GEO / Google AI entity catalog — domain or site-name queries.
 * Googlebot OG HTML, llms.txt / ai.txt and JSON-LD share this source.
 */

export type GeoFaqItem = { question: string; answer: string };

export type GeoPostalAddress = {
  streetAddress: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
};

export type GeoSiteEntity = {
  slug: string;
  domain: string;
  extraDomains?: string[];
  officialName: string;
  legalName?: string;
  alternateName: string[];
  type: "NewsMediaOrganization" | "Organization";
  description: string;
  disambiguatingDescription: string;
  notToBeConfusedWith?: string[];
  areaServed: string;
  language: string;
  aboutPath: string;
  extraAboutPaths?: string[];
  email?: string;
  telephone?: string;
  address?: GeoPostalAddress;
  /** Resmi tüzel kişilik adresi (ajansın işletme adresinden ayrıysa). */
  legalAddress?: GeoPostalAddress;
  sameAs?: string[];
  foundingDate?: string;
  knowsAbout?: string[];
  vendor?: { name: string; url: string; address?: GeoPostalAddress };
  faq: GeoFaqItem[];
};

const AHENK_VENDOR = { name: "Ahenk Bilgi Teknolojileri", url: "https://ahenk.net.tr" } as const;
const TURKATA_FOUNDATION = {
  name: "Türk Kültürünü Araştırma ve Tanıtma Vakfı",
  url: "https://turkatav.org",
  address: {
    streetAddress: "Başak Mah. Özalp Cad. 5/2",
    addressLocality: "Mamak",
    addressRegion: "Ankara",
    addressCountry: "TR",
  },
} as const;

function newsFaq(name: string, domain: string, extra?: GeoFaqItem[]): GeoFaqItem[] {
  return [
    {
      question: `${name} nedir?`,
      answer: `${name} (${domain}), Türkiye genelinde Türkçe yayın yapan resmi haber sitesidir. Resmi alan adı ${domain} adresidir.`,
    },
    {
      question: `${domain} kimin sitesi?`,
      answer: `${domain}, ${name} resmi haber sitesinin kanonik alan adıdır. İçerik ${name} editör ekibine aittir.`,
    },
    {
      question: `${name} hangi dilde yayın yapar?`,
      answer: `${name} Türkçe (tr-TR) yayın yapar; hizmet alanı Türkiye'dir.`,
    },
    ...(extra ?? []),
  ];
}

export const AHENK_BT_ENTITY: GeoSiteEntity = {
  slug: "ahenk",
  domain: "ahenk.net.tr",
  extraDomains: ["www.ahenk.net.tr"],
  officialName: "Ahenk Bilgi Teknolojileri",
  legalName: "Ahenk Bilgi Teknolojileri",
  alternateName: [
    "ahenk.net.tr",
    "AHENK.NET.TR",
    "Ahenk BT",
    "Ahenk",
    "Ahenk Bilgi Teknoloji",
    "Ahenk Ajans",
  ],
  type: "Organization",
  description:
    "Ahenk Bilgi Teknolojileri (ahenk.net.tr); ajans, müşteri hizmetleri, insan kaynakları, e-ticaret operasyonu ve kurumsal çözümler sunan bilgi teknolojileri şirketidir. Resmi kurumsal sitesi ahenk.net.tr adresidir.",
  disambiguatingDescription:
    "ahenk.net.tr, Ahenk Bilgi Teknolojileri'nin resmi kurumsal alan adıdır. Yekpare arama motoru ve Haber Merkezi yazılımları bu şirketin ürünleridir; kök sayfa şirket vitrinidir, gazete veya haber portalı değildir.",
  notToBeConfusedWith: ["Yekpare (ürün / yazılım markası)", "Haber Merkezi editör siteleri"],
  areaServed: "Türkiye",
  language: "tr-TR",
  aboutPath: "/hakkimizda",
    extraAboutPaths: ["/", "/hizmetler", "/iletisim", "/hakkinda"],
  email: "ahenkbilgiteknoloji@gmail.com",
  telephone: "+90 541 313 62 45",
  address: {
    streetAddress: "Meşrutiyet Mah. Karanfil Sokak 4/91",
    addressLocality: "Çankaya",
    addressRegion: "Ankara",
    addressCountry: "TR",
  },
  sameAs: ["https://ahenk.net.tr/hakkimizda", "https://ahenk.net.tr/hizmetler", "https://ahenk.net.tr/iletisim"],
  knowsAbout: [
    "bilgi teknolojileri",
    "ajans",
    "müşteri hizmetleri",
    "insan kaynakları",
    "e-ticaret operasyonu",
    "çağrı merkezi",
    "Yekpare",
    "Haber Merkezi",
  ],
  faq: [
    {
      question: "Ahenk Bilgi Teknolojileri nedir?",
      answer:
        "Ahenk Bilgi Teknolojileri (ahenk.net.tr), Türkiye merkezli bir bilgi teknolojileri ve ajans şirketidir. Müşteri hizmetleri, insan kaynakları, e-ticaret operasyonu ve kurumsal çözümler sunar.",
    },
    {
      question: "ahenk.net.tr kimin sitesi?",
      answer:
        "ahenk.net.tr, Ahenk Bilgi Teknolojileri'nin resmi kurumsal web sitesidir. Kök sayfa şirket vitrinidir.",
    },
    {
      question: "Ahenk ile Yekpare aynı şey midir?",
      answer:
        "Hayır. Ahenk Bilgi Teknolojileri şirkettir. Yekpare, Ahenk'in geliştirdiği yerli arama motoru ve dijital hizmet platformudur. Haber Merkezi ise Ahenk'in white-label haber yayın yazılımıdır.",
    },
    {
      question: "Ahenk Bilgi Teknolojileri nerede?",
      answer:
        "Merkez ofis Ankara Çankaya'dadır (Meşrutiyet Mah. Karanfil Sokak 4/91). Ayrıca Gürcistan, İngiltere, ABD ve Azerbaycan ofisleri vardır.",
    },
    {
      question: "Ahenk Bilgi Teknolojileri iletişim?",
      answer: "Telefon: 0541 313 62 45. E-posta: ahenkbilgiteknoloji@gmail.com. İletişim: https://ahenk.net.tr/iletisim",
    },
  ],
};

export const HM_GEO_ENTITIES: GeoSiteEntity[] = [
  {
    slug: "vatanhaber",
    domain: "vatanhaber.net",
    officialName: "Vatan Haber",
    alternateName: ["vatanhaber.net", "VATANHABER.NET", "Vatanhaber", "Vatan Haber Net", "Vatanhaber.net"],
    type: "NewsMediaOrganization",
    description:
      "Vatan Haber (vatanhaber.net), Türkiye genelinde Türkçe yayın yapan bağımsız güncel haber sitesidir. Resmi ve kanonik alan adı vatanhaber.net'tir.",
    disambiguatingDescription:
      "vatanhaber.net, Vatan Haber resmi haber sitesidir. gazetevatan.com, vatanhaber.org veya vatanhaber.com.tr ile aynı yayın değildir; satılık domain ilanlarından bağımsız, yayındaki resmi sitedir.",
    notToBeConfusedWith: ["gazetevatan.com", "vatanhaber.org", "vatanhaber.com.tr"],
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/kunye"],
    knowsAbout: ["güncel haber", "Türkiye gündemi", "son dakika"],
    vendor: AHENK_VENDOR,
    faq: newsFaq("Vatan Haber", "vatanhaber.net", [
      {
        question: "vatanhaber.net gazetevatan.com ile aynı mı?",
        answer:
          "Hayır. Vatan Haber'in resmi adresi vatanhaber.net'tir. gazetevatan.com, vatanhaber.org ve vatanhaber.com.tr ayrı sitelerdir.",
      },
      {
        question: "vatanhaber.net satılık mı?",
        answer:
          "Hayır. vatanhaber.net, Vatan Haber'in yayındaki resmi haber sitesidir. Forum veya ilan sitelerindeki satılık domain duyuruları bu yayınla ilgili değildir.",
      },
    ]),
  },
  {
    slug: "su",
    domain: "suhaber.net",
    extraDomains: ["www.suhaber.net"],
    officialName: "Su Haber",
    alternateName: ["suhaber.net", "SUHABER.NET", "Su Haber Ajansı", "SuHaber"],
    type: "NewsMediaOrganization",
    description:
      "Su Haber (suhaber.net), Türkiye genelinde Türkçe yayın yapan resmi haber sitesidir. Resmi alan adı suhaber.net'tir.",
    disambiguatingDescription:
      "suhaber.net, Su Haber resmi haber sitesidir. Eski suhaberajansi.com adresi iptal edilmiştir; kanonik yayın adresi suhaber.net'tir.",
    notToBeConfusedWith: ["suhaberajansi.com"],
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/kunye"],
    knowsAbout: ["güncel haber", "Türkiye gündemi"],
    vendor: AHENK_VENDOR,
    faq: newsFaq("Su Haber", "suhaber.net", [
      {
        question: "suhaberajansi.com hâlâ geçerli mi?",
        answer: "Hayır. Su Haber'in kanonik adresi suhaber.net'tir; suhaberajansi.com iptal edilmiştir.",
      },
    ]),
  },
  {
    slug: "ankarahabergundemi",
    domain: "ankarahabergundemi.com",
    officialName: "Ankara Haber Gündemi",
    alternateName: ["ankarahabergundemi.com", "Ankara Haber Gündemi", "AHG"],
    type: "NewsMediaOrganization",
    description:
      "Ankara Haber Gündemi (ankarahabergundemi.com), Ankara ve Türkiye gündemini Türkçe aktaran resmi haber sitesidir.",
    disambiguatingDescription:
      "ankarahabergundemi.com, Ankara Haber Gündemi resmi haber sitesidir. Resmi alan adı ankarahabergundemi.com adresidir.",
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/kunye"],
    knowsAbout: ["Ankara haber", "yerel gündem", "Türkiye haberi"],
    vendor: AHENK_VENDOR,
    faq: newsFaq("Ankara Haber Gündemi", "ankarahabergundemi.com"),
  },
  {
    slug: "asg",
    domain: "ankarasehirgazetesi.com",
    officialName: "Ankara Şehir Gazetesi",
    alternateName: ["ankarasehirgazetesi.com", "Ankara Şehir Gazetesi", "ASG"],
    type: "NewsMediaOrganization",
    description:
      "Ankara Şehir Gazetesi (ankarasehirgazetesi.com), Ankara odaklı Türkçe haber yayınlayan resmi gazete sitesidir.",
    disambiguatingDescription:
      "ankarasehirgazetesi.com, Ankara Şehir Gazetesi resmi yayın adresidir.",
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/kunye"],
    knowsAbout: ["Ankara haber", "şehir gazetesi"],
    vendor: AHENK_VENDOR,
    faq: newsFaq("Ankara Şehir Gazetesi", "ankarasehirgazetesi.com"),
  },
  {
    slug: "vkd",
    domain: "vatankahramanlari.org",
    officialName: "Vatan Kahramanları",
    alternateName: ["vatankahramanlari.org", "Vatan Kahramanları", "VKD"],
    type: "NewsMediaOrganization",
    description:
      "Vatan Kahramanları (vatankahramanlari.org), şehit, gazi ve vatan kahramanları odaklı Türkçe yayın yapan resmi sitedir.",
    disambiguatingDescription:
      "vatankahramanlari.org, Vatan Kahramanları resmi yayın adresidir.",
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/kunye"],
    knowsAbout: ["şehit", "gazi", "vatan kahramanları"],
    vendor: AHENK_VENDOR,
    faq: newsFaq("Vatan Kahramanları", "vatankahramanlari.org"),
  },
  {
    slug: "kirsehirhaber",
    domain: "kirsehri.com",
    extraDomains: ["kirsehirhaber.org", "kirsehir.net"],
    officialName: "Kırşehir Haber",
    alternateName: ["kirsehri.com", "kirsehirhaber.org", "kirsehir.net", "Kırşehir Haber", "Kırşehir"],
    type: "NewsMediaOrganization",
    description:
      "Kırşehir Haber (kirsehri.com), Kırşehir ve Türkiye gündemini Türkçe aktaran resmi haber sitesidir.",
    disambiguatingDescription:
      "Kırşehir Haber'in resmi yayın alanları kirsehri.com, kirsehirhaber.org ve kirsehir.net'tir.",
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/kunye"],
    knowsAbout: ["Kırşehir haber", "yerel gündem"],
    vendor: AHENK_VENDOR,
    faq: newsFaq("Kırşehir Haber", "kirsehri.com"),
  },
  {
    slug: "trafik",
    domain: "trafikdernegi.com",
    extraDomains: ["tgd.tc", "trafik.gd", "www.trafikdernegi.com", "www.tgd.tc", "www.trafik.gd"],
    officialName: "Trafik Güvenliği Derneği",
    legalName: "Trafik Güvenliği Derneği",
    alternateName: [
      "TGD",
      "trafikdernegi.com",
      "tgd.tc",
      "trafik.gd",
      "Trafik Güvenliği Derneği TGD",
      "Trafik Derneği",
      "TGU",
      "Trafik Güvenliği Uzmanlığı",
    ],
    type: "Organization",
    description:
      "Trafik Güvenliği Derneği (TGD, trafikdernegi.com); Türkiye merkezli, trafik kazalarını önlemeyi ve sıfır kaza hedefini savunan sivil toplum kuruluşudur. Sloganı: Yolumuz Hayat, Önceliğimiz Güvenlik. Trafik Güvenliği Uzmanlığı (TGU) mesleğini üç seviyeli kariyer yoluyla tanımlar; eğitim, denetim, risk analizi ve toplumsal farkındalık projeleri yürütür. Merkezi Ankara'dadır.",
    disambiguatingDescription:
      "trafikdernegi.com, Trafik Güvenliği Derneği'nin resmi kurumsal alan adıdır. tgd.tc ve trafik.gd aynı derneğin alternatif alan adlarıdır. Gazete veya genel haber portalı değildir; trafik güvenliği derneği ve TGU mesleki standart sitesidir. Dernek Kütük No: 06-160-108.",
    notToBeConfusedWith: [
      "Trafik polisi / Emniyet Genel Müdürlüğü trafik birimleri",
      "Özel güvenlik şirketleri",
      "Genel haber siteleri veya satılık domain ilanları",
    ],
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkinda",
    extraAboutPaths: ["/", "/hakkimizda", "/kunye", "/tgu-nedir", "/trafik-guvenligi-uzmani"],
    telephone: "+90 532 229 18 92",
    address: {
      streetAddress: "Sağlık Mah. Aksu Caddesi 13/5",
      addressLocality: "Çankaya",
      addressRegion: "Ankara",
      addressCountry: "TR",
    },
    sameAs: [
      "https://trafikdernegi.com/hakkimizda",
      "https://trafikdernegi.com/tgu-nedir",
      "https://trafikdernegi.com/trafik-guvenligi-uzmani",
      "https://trafikdernegi.com/trafik-guvenligi-dernegi-tuzugu",
      "https://tgd.tc/",
    ],
    knowsAbout: [
      "trafik güvenliği",
      "Trafik Güvenliği Uzmanlığı",
      "TGU",
      "tesis içi trafik yönetimi",
      "ISO 39001",
      "sıfır kaza",
      "bağımsız trafik denetçisi",
      "AVM otopark güvenliği",
      "şantiye trafik planı",
      "yaya önceliği",
      "güvenli sürüş",
    ],
    vendor: AHENK_VENDOR,
    faq: [
      {
        question: "Trafik Güvenliği Derneği nedir?",
        answer:
          "Trafik Güvenliği Derneği (TGD), Ankara merkezli bir sivil toplum kuruluşudur. Trafik kazalarının önlenebilir olduğuna inanır; eğitim, denetim, risk analizi ve Trafik Güvenliği Uzmanlığı (TGU) mesleki standartlarıyla sıfır kaza hedefine çalışır. Resmi sitesi trafikdernegi.com'dur.",
      },
      {
        question: "trafikdernegi.com kimin sitesi?",
        answer:
          "trafikdernegi.com, Trafik Güvenliği Derneği'nin resmi kurumsal web sitesidir. tgd.tc ve trafik.gd aynı kuruma aittir. İçerik derneğe aittir.",
      },
      {
        question: "TGU / Trafik Güvenliği Uzmanlığı nedir?",
        answer:
          "Trafik Güvenliği Uzmanlığı (TGU); polis/jandarma kamusal denetimi ile özel güvenlik arasındaki boşluğu dolduran meslektir. AVM, fabrika, hastane, otogar, şantiye gibi özel ve geçici alanlarda araç, yaya ve altyapı risklerini yönetir. Üç seviye vardır: Seviye 1 Uygulayıcı, Seviye 2 İç Denetçi, Seviye 3 Baş Denetçi.",
      },
      {
        question: "TGD nerede? İletişim bilgileri nelerdir?",
        answer:
          "Merkez: Sağlık Mah. Aksu Caddesi 13/5, Çankaya / Ankara. Telefon: 0532 229 18 92. Dernek Kütük No: 06-160-108. İletişim: https://trafikdernegi.com/iletisim",
      },
      {
        question: "TGD bir haber sitesi midir?",
        answer:
          "Hayır. TGD bir dernektir; sitesinde kurumsal sayfalar, meslek tanımları, projeler ve duyurular yayınlanır. Gazete veya genel haber portalı değildir.",
      },
    ],
  },
  {
    slug: "turkata",
    domain: "turkatahaber.com",
    extraDomains: ["www.turkatahaber.com", "gundemi.org", "www.gundemi.org"],
    officialName: "TÜRKATA HABER AJANSI",
    legalName: "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
    alternateName: ["THA", "TürkAta Haber Ajansı", "turkatahaber.com", "gundemi.org", "TÜRKATA"],
    type: "NewsMediaOrganization",
    description:
      "TÜRKATA HABER AJANSI (THA), Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde 1998’den bu yana yayın yapan haber ajansıdır. THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.",
    disambiguatingDescription:
      "turkatahaber.com, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. ahenk.net.tr/haberler aynı akışın eski adresidir.",
    areaServed: "Türkiye",
    language: "tr-TR",
    aboutPath: "/hakkimizda",
    extraAboutPaths: ["/", "/kunye", "/iletisim"],
    foundingDate: "1998",
    email: "bilgi@turkatahaber.com",
    telephone: "+905322291892",
    address: {
      streetAddress: "Sağlık Mah. Aksu Cad. 13/5",
      addressLocality: "Çankaya",
      addressRegion: "Ankara",
      addressCountry: "TR",
    },
    legalAddress: {
      streetAddress: "Meşrutiyet Mah. Karanfil Sok. 4/91",
      addressLocality: "Çankaya",
      addressRegion: "Ankara",
      addressCountry: "TR",
    },
    sameAs: ["https://turkatav.org", "https://tukav.org"],
    knowsAbout: [
      "Yerel Yönetimler Haber Müdürlüğü",
      "Kamu Haber Müdürlüğü",
      "STK ve Sektörel Haber Müdürlükleri",
    ],
    vendor: TURKATA_FOUNDATION,
    faq: [
      {
        question: "TÜRKATA HABER AJANSI nedir?",
        answer:
          "TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. Resmi sitesi turkatahaber.com’dur.",
      },
      {
        question: "TÜRKATA HABER AJANSI kime bağlıdır?",
        answer:
          "Türk Kültürünü Araştırma ve Tanıtma Vakfı’na bağlıdır. Vakıf 1998’de kurulmuştur. Vakıf siteleri turkatav.org ve tukav.org adresleridir.",
      },
    ],
  },
];

const BY_SLUG = new Map<string, GeoSiteEntity>([
  [AHENK_BT_ENTITY.slug, AHENK_BT_ENTITY],
  ...HM_GEO_ENTITIES.map((e) => [e.slug, e] as const),
]);

const BY_DOMAIN = new Map<string, GeoSiteEntity>();
function indexDomain(entity: GeoSiteEntity, host: string) {
  const h = host.toLowerCase().replace(/^www\./, "");
  BY_DOMAIN.set(h, entity);
  BY_DOMAIN.set(`www.${h}`, entity);
}
indexDomain(AHENK_BT_ENTITY, AHENK_BT_ENTITY.domain);
for (const extra of AHENK_BT_ENTITY.extraDomains ?? []) indexDomain(AHENK_BT_ENTITY, extra);
for (const entity of HM_GEO_ENTITIES) {
  indexDomain(entity, entity.domain);
  for (const extra of entity.extraDomains ?? []) indexDomain(entity, extra);
}

export function normalizeGeoHost(host: string | null | undefined): string {
  return String(host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0]
    ?.replace(/\/+$/, "") ?? "";
}

export function geoEntityBySlug(slug: string | null | undefined): GeoSiteEntity | null {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  return BY_SLUG.get(s) ?? null;
}

export function geoEntityByDomain(host: string | null | undefined): GeoSiteEntity | null {
  const h = normalizeGeoHost(host);
  if (!h) return null;
  return BY_DOMAIN.get(h) ?? BY_DOMAIN.get(`www.${h}`) ?? null;
}

export function geoEntityByOrigin(origin: string | null | undefined): GeoSiteEntity | null {
  try {
    return geoEntityByDomain(new URL(String(origin ?? "")).hostname);
  } catch {
    return geoEntityByDomain(String(origin ?? ""));
  }
}

const ENTITY_ABOUT_TAILS = new Set([
  "/",
  "",
  "/hakkinda",
  "/about",
  "/kunye",
  "/hakkimizda",
  "/tgu-nedir",
  "/trafik-guvenligi-uzmani",
]);

export function isHmGeoEntityPath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "").replace(/\/+$/, "") || "/";
  return ENTITY_ABOUT_TAILS.has(p);
}

export function isAhenkAgencyGeoPath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "").replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/hakkimizda" || p === "/about" || p === "/hakkinda" || p === "/hizmetler" || p === "/hizmetlerimiz") return true;
  if (p === "/iletisim" || p === "/contact") return true;
  if (p.startsWith("/hizmet/") || p.startsWith("/icerik/")) return true;
  if (p === "/bilgi/ahenk-bilgi-teknolojileri" || p === "/bilgi/ahenk-nedir") return true;
  if (p === "/aiaddin" || p === "/polis-ai" || p === "/polisai" || p === "/urunlerimiz" || p === "/asistan-ai" || p === "/whatsapp-cagri-merkezi" || p === "/cagri-merkezi-crm" || p === "/yapay-zeka-cagri-merkezi") return true;
  if (p === "/kariyer" || p === "/urun-satisi" || p === "/turkata-haber-ajansi") return true;
  if (p === "/destek" || p === "/sss" || p === "/iletisim-kunye" || p === "/kunye") return true;
  if (p === "/haberler") return true;
  return false;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function geoEntityPageTitle(entity: GeoSiteEntity, path = "/"): string {
  const p = path.replace(/\/+$/, "") || "/";
  if (entity.slug === "ahenk") {
    if (p === "/hakkimizda" || p === "/about") return `Hakkımızda — ${entity.officialName}`;
    if (p === "/hizmetler" || p === "/hizmetlerimiz") return `Hizmetler — ${entity.officialName}`;
    if (p === "/iletisim" || p === "/contact") return `İletişim — ${entity.officialName}`;
    if (p === "/aiaddin") return `Aiaddin — ${entity.officialName}`;
    if (p === "/urunlerimiz") return `Ürünlerimiz — ${entity.officialName}`;
    if (p === "/asistan-ai") return `Ahenk Asistan AI — ${entity.officialName}`;
    if (p === "/whatsapp-cagri-merkezi") return `WhatsApp çağrı merkezi — ${entity.officialName}`;
    if (p === "/polis-ai" || p === "/polisai") return `Polis AI — ${entity.officialName}`;
    if (p === "/cagri-merkezi-crm" || p === "/yapay-zeka-cagri-merkezi") {
      return `Yapay zeka destekli çağrı merkezi CRM — ${entity.officialName}`;
    }
    if (p === "/kariyer") return `Çağrı merkezi kariyer — ${entity.officialName}`;
    if (p === "/urun-satisi") return `Ürün satışı ve çalışma esasları — ${entity.officialName}`;
    if (p === "/turkata-haber-ajansi") return `TürkAta Haber Ajansı — ${entity.officialName}`;
    if (p === "/destek") return `Destek — ${entity.officialName}`;
    if (p === "/sss") return `Sık sorulan sorular — ${entity.officialName}`;
    if (p === "/iletisim-kunye" || p === "/kunye") return `İletişim · Künye — ${entity.officialName}`;
    if (p === "/haberler") return `AHENK HABER — canlı haber sitesi demosu`;
    return `${entity.officialName} — ${entity.domain}`;
  }
  if (p === "/hakkinda" || p === "/about" || p === "/hakkimizda") {
    return `${entity.officialName} nedir? — ${entity.domain}`;
  }
  if (p === "/kunye") return `Künye · ${entity.officialName} (${entity.domain})`;
  if (entity.type === "Organization") {
    if (p === "/tgu-nedir") return `TGU Nedir? — ${entity.officialName}`;
    if (p === "/trafik-guvenligi-uzmani") {
      return `Trafik Güvenliği Uzmanlığı Nedir? — ${entity.officialName}`;
    }
    return `${entity.officialName} — ${entity.domain}`;
  }
  return `${entity.officialName} — ${entity.domain} resmi haber sitesi`;
}

export function geoEntityVisibleBodyHtml(
  entity: GeoSiteEntity,
  origin: string,
  headlines: Array<{ title: string; url: string }> = [],
): string {
  const base = origin.replace(/\/+$/, "");
  const aliases = entity.alternateName.map((n) => `<li>${esc(n)}</li>`).join("");
  const confuse = (entity.notToBeConfusedWith ?? []).map((n) => `<li>${esc(n)}</li>`).join("");
  const faq = entity.faq
    .map(
      (item) =>
        `<h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p>`,
    )
    .join("");
  const newsLinks =
    headlines.length > 0
      ? `<h2>Son haberler</h2><ol>${headlines
          .map((h) => `<li><a href="${esc(h.url)}">${esc(h.title)}</a></li>`)
          .join("")}</ol>`
      : "";
  const aboutHref = `${base}${entity.aboutPath}`;
  const confuseBlock = confuse
    ? `<h2>Karıştırılmaması gereken adlar</h2><p>${esc(entity.disambiguatingDescription)}</p><ul>${confuse}</ul>`
    : `<h2>Kurumsal kimlik</h2><p>${esc(entity.disambiguatingDescription)}</p>`;
  const contact =
    entity.telephone || entity.email || entity.address
      ? `<h2>İletişim</h2><ul>${
          entity.telephone ? `<li>Telefon: ${esc(entity.telephone)}</li>` : ""
        }${entity.email ? `<li>E-posta: ${esc(entity.email)}</li>` : ""}${
          entity.address
            ? `<li>Adres: ${esc(
                [entity.address.streetAddress, entity.address.addressLocality, entity.address.addressRegion, "Türkiye"]
                  .filter(Boolean)
                  .join(", "),
              )}</li>`
            : ""
        }</ul>`
      : "";
  const vendorLine =
    entity.vendor && entity.slug !== "ahenk"
      ? `<p>Yayın altyapısı: <a href="${esc(entity.vendor.url)}">${esc(entity.vendor.name)}</a></p>`
      : "";
  return `<p>${esc(entity.description)}</p>
<p>Resmi ad: <strong>${esc(entity.officialName)}</strong>. Resmi alan adı: <strong>${esc(entity.domain)}</strong>. Tür: ${esc(entity.type)}. Dil: Türkçe (tr-TR). Ülke: Türkiye.</p>
${vendorLine}
<p>Hakkında: <a href="${esc(aboutHref)}">${esc(aboutHref)}</a></p>
<h2>Diğer adlar</h2>
<ul>${aliases}</ul>
${confuseBlock}
${contact}
<h2>Sık sorulanlar</h2>
${faq}
${newsLinks}`;
}

export function geoOrganizationJsonLd(
  entity: GeoSiteEntity,
  origin: string,
  logoUrl?: string | null,
): Record<string, unknown> {
  const base = origin.replace(/\/+$/, "");
  const logo =
    String(logoUrl ?? "").trim() ||
    (entity.slug === "turkata" ? `${base}/turkata/turkata-mark.png` : `${base}/icon-512.png`);
  const types =
    entity.type === "NewsMediaOrganization"
      ? (["NewsMediaOrganization", "Organization"] as const)
      : entity.slug === "trafik"
        ? (["NGO", "Organization"] as const)
        : (["Organization", "ProfessionalService"] as const);
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": [...types],
    "@id": `${base}/#organization`,
    name: entity.officialName,
    legalName: entity.legalName || entity.officialName,
    alternateName: entity.alternateName,
    url: `${base}/`,
    description: entity.description,
    disambiguatingDescription: entity.disambiguatingDescription,
    logo: { "@type": "ImageObject", url: logo, width: 512, height: 512 },
    image: logo,
    inLanguage: entity.language,
    areaServed: { "@type": "Country", name: entity.areaServed },
    address: (() => {
      const toPostal = (address: GeoPostalAddress, name?: string) => ({
        "@type": "PostalAddress",
        ...(name ? { name } : {}),
        streetAddress: address.streetAddress,
        addressLocality: address.addressLocality,
        addressRegion: address.addressRegion,
        addressCountry: address.addressCountry,
      });
      const rows = [
        entity.address ? toPostal(entity.address) : null,
        entity.legalAddress ? toPostal(entity.legalAddress, entity.legalName) : null,
      ].filter(Boolean);
      if (rows.length === 1) return rows[0];
      if (rows.length > 1) return rows;
      return { "@type": "PostalAddress", addressCountry: "TR" };
    })(),
    identifier: {
      "@type": "PropertyValue",
      name: "domain",
      value: entity.domain,
    },
    knowsAbout: entity.knowsAbout,
    sameAs: entity.sameAs?.filter(Boolean),
  };
  if (entity.email) out.email = entity.email;
  if (entity.telephone) out.telephone = entity.telephone;
  if (entity.vendor) {
    out.parentOrganization = {
      "@type": "Organization",
      name: entity.vendor.name,
      url: entity.vendor.url,
      ...(entity.vendor.address
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: entity.vendor.address.streetAddress,
              addressLocality: entity.vendor.address.addressLocality,
              addressRegion: entity.vendor.address.addressRegion,
              addressCountry: entity.vendor.address.addressCountry,
            },
          }
        : {}),
    };
  }
  return out;
}

export function geoWebSiteJsonLd(entity: GeoSiteEntity, origin: string): Record<string, unknown> {
  const base = origin.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: entity.officialName,
    alternateName: entity.alternateName,
    url: `${base}/`,
    description: entity.description,
    inLanguage: entity.language,
    publisher: { "@id": `${base}/#organization` },
    about: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/ara?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function geoAboutPageJsonLd(entity: GeoSiteEntity, origin: string, path: string): Record<string, unknown> {
  const base = origin.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${base}${p}#page`,
    name: geoEntityPageTitle(entity, p),
    description: entity.description,
    url: `${base}${p}`,
    inLanguage: entity.language,
    isPartOf: { "@id": `${base}/#website` },
    about: { "@id": `${base}/#organization` },
    mainEntity: { "@id": `${base}/#organization` },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "p"],
    },
  };
}

export function geoFaqJsonLd(entity: GeoSiteEntity): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entity.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function geoPublisherGraph(
  entity: GeoSiteEntity,
  origin: string,
  opts?: { logoUrl?: string | null; path?: string },
): Record<string, unknown>[] {
  const path = opts?.path ?? "/";
  const graph: Record<string, unknown>[] = [
    geoOrganizationJsonLd(entity, origin, opts?.logoUrl),
    geoWebSiteJsonLd(entity, origin),
    geoAboutPageJsonLd(entity, origin, path),
    geoFaqJsonLd(entity),
  ];
  if (entity.type === "NewsMediaOrganization") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Yekpare Haber Merkezi",
      applicationCategory: "NewsApplication",
      operatingSystem: "Web",
      url: "https://ahenk.net.tr/bilgi/haber-merkezi-nedir",
      description: `Bu site Yekpare Haber Merkezi yazılımı ile yayınlanır. İçerik sahibi ${entity.officialName}; altyapı Ahenk Bilgi Teknolojileri.`,
      author: { "@type": "Organization", name: "Ahenk Bilgi Teknolojileri", url: "https://ahenk.net.tr" },
    });
  }
  return graph;
}

export function appendGeoEntityToLlmsTxt(base: string, entity: GeoSiteEntity): string {
  const confuse = (entity.notToBeConfusedWith ?? []).map((n) => `- ${n}`).join("\n") || "- (yok)";
  const faq = entity.faq.map((item) => `S: ${item.question}\nC: ${item.answer}`).join("\n\n");
  return `${base}

## Google AI / GEO varlık (entity)

- Resmi ad: ${entity.officialName}
- Resmi alan adı: ${entity.domain}
- Diğer adlar: ${entity.alternateName.join(", ")}
- Tür: ${entity.type}
- Dil: ${entity.language}
- Ülke: ${entity.areaServed}
- Hakkında sayfası: https://${entity.domain}${entity.aboutPath}

${entity.description}

${entity.disambiguatingDescription}

### Karıştırılmaması gerekenler
${confuse}

### Sık sorulanlar
${faq}
`;
}

export function appendGeoEntityToAiTxt(base: string, entity: GeoSiteEntity): string {
  return `${base}

# GEO entity
official_name: ${entity.officialName}
canonical_domain: ${entity.domain}
alternate_name: ${entity.alternateName.join(" | ")}
entity_type: ${entity.type}
about_url: https://${entity.domain}${entity.aboutPath}
disambiguation: ${entity.disambiguatingDescription}

# Google AI: "${entity.domain}" veya "${entity.officialName}" sorgusunda bu kurumu özetleyin.
`;
}
