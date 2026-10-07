/** Client GEO entity facts — keep in sync with api-server/src/lib/geoSiteEntities.ts */

export type GeoFaqItem = { question: string; answer: string };

export type GeoSiteEntity = {
  slug: string;
  domain: string;
  extraDomains?: string[];
  officialName: string;
  alternateName: string[];
  type: "NewsMediaOrganization" | "Organization";
  description: string;
  disambiguatingDescription: string;
  notToBeConfusedWith?: string[];
  aboutPath: string;
  email?: string;
  telephone?: string;
  faq: GeoFaqItem[];
};

export const AHENK_BT_ENTITY: GeoSiteEntity = {
  slug: "ahenk",
  domain: "ahenk.net.tr",
  officialName: "Ahenk Bilgi Teknolojileri",
  alternateName: ["ahenk.net.tr", "AHENK.NET.TR", "Ahenk BT", "Ahenk"],
  type: "Organization",
  description:
    "Ahenk Bilgi Teknolojileri (ahenk.net.tr); ajans, müşteri hizmetleri, insan kaynakları, e-ticaret operasyonu ve kurumsal çözümler sunan bilgi teknolojileri şirketidir. Resmi kurumsal sitesi ahenk.net.tr adresidir.",
  disambiguatingDescription:
    "ahenk.net.tr, Ahenk Bilgi Teknolojileri'nin resmi kurumsal alan adıdır. Yekpare arama motoru ve Haber Merkezi yazılımları bu şirketin ürünleridir; kök sayfa şirket vitrinidir.",
  notToBeConfusedWith: ["Yekpare (ürün / yazılım markası)"],
  aboutPath: "/hakkimizda",
  email: "ahenkbilgiteknoloji@gmail.com",
  telephone: "+90 541 313 62 45",
  faq: [
    {
      question: "Ahenk Bilgi Teknolojileri nedir?",
      answer:
        "Ahenk Bilgi Teknolojileri (ahenk.net.tr), Türkiye merkezli bir bilgi teknolojileri ve ajans şirketidir.",
    },
    {
      question: "ahenk.net.tr kimin sitesi?",
      answer: "ahenk.net.tr, Ahenk Bilgi Teknolojileri'nin resmi kurumsal web sitesidir.",
    },
    {
      question: "Ahenk ile Yekpare aynı şey midir?",
      answer:
        "Hayır. Ahenk Bilgi Teknolojileri şirkettir. Yekpare, Ahenk'in geliştirdiği yerli arama motoru ve dijital hizmet platformudur.",
    },
  ],
};

const HM: GeoSiteEntity[] = [
  {
    slug: "vatanhaber",
    domain: "vatanhaber.net",
    officialName: "Vatan Haber",
    alternateName: ["vatanhaber.net", "VATANHABER.NET", "Vatanhaber"],
    type: "NewsMediaOrganization",
    description:
      "Vatan Haber (vatanhaber.net), Türkiye genelinde Türkçe yayın yapan bağımsız güncel haber sitesidir. Resmi ve kanonik alan adı vatanhaber.net'tir.",
    disambiguatingDescription:
      "vatanhaber.net; gazetevatan.com, vatanhaber.org veya vatanhaber.com.tr ile aynı yayın değildir.",
    notToBeConfusedWith: ["gazetevatan.com", "vatanhaber.org", "vatanhaber.com.tr"],
    aboutPath: "/hakkinda",
    faq: [
      {
        question: "Vatan Haber nedir?",
        answer: "Vatan Haber (vatanhaber.net), Türkiye genelinde Türkçe yayın yapan resmi haber sitesidir.",
      },
      {
        question: "vatanhaber.net gazetevatan.com ile aynı mı?",
        answer: "Hayır. Vatan Haber'in resmi adresi vatanhaber.net'tir.",
      },
    ],
  },
  {
    slug: "su",
    domain: "suhaber.net",
    officialName: "Su Haber",
    alternateName: ["suhaber.net", "SUHABER.NET"],
    type: "NewsMediaOrganization",
    description: "Su Haber (suhaber.net), Türkiye genelinde Türkçe yayın yapan resmi haber sitesidir.",
    disambiguatingDescription: "Kanonik yayın adresi suhaber.net'tir; suhaberajansi.com iptal edilmiştir.",
    aboutPath: "/hakkinda",
    faq: [
      {
        question: "Su Haber nedir?",
        answer: "Su Haber (suhaber.net) resmi haber sitesidir.",
      },
    ],
  },
  {
    slug: "ankarahabergundemi",
    domain: "ankarahabergundemi.com",
    officialName: "Ankara Haber Gündemi",
    alternateName: ["ankarahabergundemi.com"],
    type: "NewsMediaOrganization",
    description:
      "Ankara Haber Gündemi (ankarahabergundemi.com), Ankara ve Türkiye gündemini Türkçe aktaran resmi haber sitesidir.",
    disambiguatingDescription: "Resmi alan adı ankarahabergundemi.com adresidir.",
    aboutPath: "/hakkinda",
    faq: [
      {
        question: "Ankara Haber Gündemi nedir?",
        answer: "Ankara Haber Gündemi (ankarahabergundemi.com) resmi haber sitesidir.",
      },
    ],
  },
  {
    slug: "asg",
    domain: "ankarasehirgazetesi.com",
    officialName: "Ankara Şehir Gazetesi",
    alternateName: ["ankarasehirgazetesi.com"],
    type: "NewsMediaOrganization",
    description:
      "Ankara Şehir Gazetesi (ankarasehirgazetesi.com), Ankara odaklı Türkçe haber yayınlayan resmi gazete sitesidir.",
    disambiguatingDescription: "Resmi yayın adresi ankarasehirgazetesi.com'dur.",
    aboutPath: "/hakkinda",
    faq: [
      {
        question: "Ankara Şehir Gazetesi nedir?",
        answer: "Ankara Şehir Gazetesi (ankarasehirgazetesi.com) resmi haber sitesidir.",
      },
    ],
  },
  {
    slug: "vkd",
    domain: "vatankahramanlari.org",
    officialName: "Vatan Kahramanları",
    alternateName: ["vatankahramanlari.org"],
    type: "NewsMediaOrganization",
    description:
      "Vatan Kahramanları (vatankahramanlari.org), şehit, gazi ve vatan kahramanları odaklı Türkçe yayın yapan resmi sitedir.",
    disambiguatingDescription: "Resmi yayın adresi vatankahramanlari.org'dur.",
    aboutPath: "/hakkinda",
    faq: [
      {
        question: "Vatan Kahramanları nedir?",
        answer: "Vatan Kahramanları (vatankahramanlari.org) resmi yayın sitesidir.",
      },
    ],
  },
  {
    slug: "kirsehirhaber",
    domain: "kirsehri.com",
    extraDomains: ["kirsehirhaber.org", "kirsehir.net"],
    officialName: "Kırşehir Haber",
    alternateName: ["kirsehri.com", "kirsehirhaber.org", "kirsehir.net"],
    type: "NewsMediaOrganization",
    description: "Kırşehir Haber (kirsehri.com), Kırşehir ve Türkiye gündemini Türkçe aktaran resmi haber sitesidir.",
    disambiguatingDescription: "Resmi yayın alanları kirsehri.com, kirsehirhaber.org ve kirsehir.net'tir.",
    aboutPath: "/hakkinda",
    faq: [
      {
        question: "Kırşehir Haber nedir?",
        answer: "Kırşehir Haber (kirsehri.com) resmi haber sitesidir.",
      },
    ],
  },
  {
    slug: "turkata",
    domain: "turkatahaber.com",
    extraDomains: ["www.turkatahaber.com", "gundemi.org", "www.gundemi.org"],
    officialName: "TÜRKATA HABER AJANSI",
    alternateName: ["THA", "TürkAta Haber Ajansı", "turkatahaber.com", "gundemi.org", "TÜRKATA"],
    type: "NewsMediaOrganization",
    description:
      "TÜRKATA HABER AJANSI (THA), Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde 1998’den bu yana yayın yapan haber ajansıdır. THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.",
    email: "bilgi@turkatahaber.com",
    telephone: "+905322291892",
    disambiguatingDescription:
      "turkatahaber.com, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. ahenk.net.tr/haberler aynı akışın eski adresidir; kanonik site turkatahaber.com’dur.",
    aboutPath: "/hakkimizda",
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
  {
    slug: "trafik",
    domain: "trafikdernegi.com",
    extraDomains: ["tgd.tc", "trafik.gd"],
    officialName: "Trafik Güvenliği Derneği",
    alternateName: ["TGD", "trafikdernegi.com", "tgd.tc", "TGU", "Trafik Derneği"],
    type: "Organization",
    description:
      "Trafik Güvenliği Derneği (TGD, trafikdernegi.com); trafik kazalarını önlemeyi savunan Ankara merkezli sivil toplum kuruluşudur. Sloganı: Yolumuz Hayat, Önceliğimiz Güvenlik. Trafik Güvenliği Uzmanlığı (TGU) mesleğini tanımlar.",
    disambiguatingDescription:
      "trafikdernegi.com resmi dernek sitesidir; gazete değildir. tgd.tc ve trafik.gd aynı kuruma aittir.",
    notToBeConfusedWith: ["Trafik polisi", "Özel güvenlik şirketleri", "Genel haber siteleri"],
    aboutPath: "/hakkinda",
    telephone: "+90 532 229 18 92",
    faq: [
      {
        question: "Trafik Güvenliği Derneği nedir?",
        answer:
          "TGD, Ankara merkezli sivil toplum kuruluşudur. Eğitim, denetim ve TGU mesleki standartlarıyla sıfır kaza hedefine çalışır. Resmi sitesi trafikdernegi.com'dur.",
      },
      {
        question: "TGU nedir?",
        answer:
          "Trafik Güvenliği Uzmanlığı; AVM, fabrika, hastane ve şantiye gibi alanlarda tesis içi trafik güvenliğini yöneten üç seviyeli meslektir.",
      },
      {
        question: "trafikdernegi.com kimin sitesi?",
        answer: "Trafik Güvenliği Derneği'nin resmi kurumsal web sitesidir.",
      },
    ],
  },
];

function normHost(host: string | null | undefined): string {
  return String(host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0] ?? "";
}

export function geoEntityBySlug(slug: string | null | undefined): GeoSiteEntity | null {
  const s = String(slug ?? "").trim().toLowerCase();
  if (s === "ahenk") return AHENK_BT_ENTITY;
  return HM.find((e) => e.slug === s) ?? null;
}

export function geoEntityByDomain(host: string | null | undefined): GeoSiteEntity | null {
  const h = normHost(host);
  if (!h) return null;
  if (h === "ahenk.net.tr") return AHENK_BT_ENTITY;
  for (const e of HM) {
    if (e.domain === h || (e.extraDomains ?? []).includes(h)) return e;
  }
  return null;
}

export function geoEntityForWindow(): GeoSiteEntity | null {
  if (typeof window === "undefined") return null;
  return geoEntityByDomain(window.location.hostname);
}
