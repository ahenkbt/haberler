import {
  AHENK_CORPORATE_EMAIL,
  AHENK_LOGO_MARK,
  AHENK_LOGO_WORDMARK,
  ahenkResolvedPackage,
} from "@/lib/ahenkCampaignPrice";

/** Ahenk Bilgi Teknolojileri ajans vitrini — arşiv içeriği + admin override. */

export type AhenkAgencyOffice = {
  id: string;
  country: string;
  flag: string;
  address: string;
};

export type AhenkAgencySlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image?: string;
};

export type AhenkAgencyService = {
  slug: string;
  title: string;
  excerpt: string;
  icon: string;
  bodyHtml: string;
  image?: string;
  aliases?: string[];
};

export type AhenkContentCard = {
  slug: string;
  title: string;
  excerpt: string;
  icon: string;
  href: string;
  bodyHtml: string;
  image?: string;
  aliases?: string[];
  /** Sektöre özel operasyon modülleri (POS, randevu, kurye…). */
  features?: string[];
};

/** Kayıtlı vitrinde yoksa anasayfaya eklenen yeni yazılım dikeyleri. */
export const AHENK_SOFTWARE_APPEND_SLUGS = ["surucu-kursu-sitesi", "guzellik-merkezi-sitesi"] as const;

export type AhenkPromoBlock = {
  kicker: string;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image?: string;
};

export type AhenkFaq = {
  q: string;
  a: string;
};

export type AhenkTextBlock = {
  title: string;
  text: string;
};

export const AHENK_REMOVED_SERVICE_SLUGS = new Set(["temizlik-hizmetleri"]);

export function defaultAhenkLandingFeatures(): AhenkTextBlock[] {
  return [
    {
      title: "Manşet ve vitrin",
      text: "Slider manşet, ara manşet, kategori blokları, son haberler ızgarası ve gazete / ajans / kurumsal düzenler.",
    },
    {
      title: "RSS ve hibrit haber",
      text: "RSS kaynakları, son dakika bandı, Google News tarzı kart bandı ve manuel + otomatik haber havuzu.",
    },
    {
      title: "Özel alan adı ve sunucu",
      text: "Kendi domaininiz, sunucu ve SSL kampanya paketine dahildir. SEO, sitemap ve RSS otomatik.",
    },
    {
      title: "Haber sitesi teması",
      text: "Çoklu vitrin teması, logo, renk, sidebar ve footer — kod bilmeden admin / editör panelinden.",
    },
    {
      title: "Video TV ve galeri",
      text: "Kanal, playlist, foto galeri ve embed widget; haber detayında zengin medya.",
    },
    {
      title: "Yapay zekâ editör",
      text: "Haber ekleme, özgünleştirme ve içerik araçları; 1–3 günde teslim.",
    },
  ];
}

export function defaultAhenkFaqs(): AhenkFaq[] {
  return [
    {
      q: "Kurumsal web sitesi kaç günde teslim edilir ve fiyatı nedir?",
      a: "Kurumsal web sitesi 3 günde teslim edilir. 2026 sonuna kadar kampanya fiyatı 10.000 TL’dir (20.000 TL yerine); sunucu ve domain dahildir. 2027’den itibaren paket 20.000 TL olur.",
    },
    {
      q: "Web yazılımı ve web tasarımı hangi sektörleri kapsar?",
      a: "Tüm sektörler kendi operasyon modülleriyle teslim edilir: restoran POS, QR menü, kurye, kasiyer ve garson; doktor ve avukat sitelerinde online randevu ile görüntülü danışmanlık; emlak, okul, sürücü kursu, güzellik merkezi, haber scripti ve kurumsal web sitesi.",
    },
    {
      q: "Haber sitesi yazılımı veya haber scripti alabilir miyim?",
      a: "Evet. Haber Merkezi white-label yazılımı manşet, RSS, yazar, tema ve özel alan adı ile teslim edilir. 1-3 günde yayına alınır.",
    },
    {
      q: "Restoran yazılımında POS, QR menü ve kurye var mı?",
      a: "Evet. Restoran paketinde QR kod menü, restoran POS yönetimi, kasiyer, garson sipariş, kurye / paket servis, stok takibi, masa rezervasyonu ve online sipariş bulunur. Her sektörün kendi profesyonel modülleri ayrı teslim edilir.",
    },
    {
      q: "Mobil uyumlu yazılım dahil mi?",
      a: "Tüm web yazılımları mobil uyumludur. Telefon, tablet ve masaüstünde aynı hız ve SEO temeliyle teslim edilir.",
    },
    {
      q: "Ödeme IBAN bilgisi nedir?",
      a: "Kuveyt Türk · Nail TÜRKOĞLU · TR160020500000041593000001. Kurumsal e-posta bilgi@ahenk.net.tr. WhatsApp hattı 0541 313 62 45.",
    },
  ];
}

export type AhenkAgencySite = {
  version: 2;
  brandName: string;
  tagline: string;
  phone: string;
  phoneTel: string;
  whatsappTel: string;
  email: string;
  logoUrl: string;
  logoMarkUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  aiDeliveryLead: string;
  priceTitle: string;
  priceAmount: string;
  priceCurrency: string;
  pricePeriodNote: string;
  priceCampaignUntilYear: string;
  priceCampaignAmount: string;
  priceRegularAmount: string;
  priceIncludesNote: string;
  ibanBank: string;
  ibanHolder: string;
  iban: string;
  faqs: AhenkFaq[];
  hoursWeekday: string;
  hoursSunday: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroSecondaryLabel: string;
  heroSecondaryHref: string;
  heroImage: string;
  softwareTitle: string;
  softwareLead: string;
  softwareSectors: AhenkContentCard[];
  agencyTitle: string;
  agencyLead: string;
  agencyOffers: AhenkContentCard[];
  yekpare: AhenkPromoBlock;
  platformTitle: string;
  platformLead: string;
  platformProducts: AhenkContentCard[];
  haberMerkeziTitle: string;
  haberMerkeziLead: string;
  haberMerkeziHtml: string;
  yekparePageTitle: string;
  yekparePageHtml: string;
  aboutTitle: string;
  aboutHtml: string;
  aboutImage: string;
  ctaTitle: string;
  ctaText: string;
  servicesTitle: string;
  servicesLead: string;
  servicesHeroImage: string;
  landingKicker: string;
  landingTitle: string;
  landingLead: string;
  landingCtaLabel: string;
  landingFeatures: AhenkTextBlock[];
  offices: AhenkAgencyOffice[];
  slides: AhenkAgencySlide[];
  services: AhenkAgencyService[];
};

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** https veya site-içi yol. javascript: ve data: reddedilir. */
export function safeAhenkImageUrl(v: unknown, fallback = ""): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return fallback;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    /* ignore */
  }
  return fallback;
}

function photo(id: string, w = 1600): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export const AHENK_PHOTOS = {
  hero: photo("photo-1486406146926-c627a92ad1ab", 1920),
  about: photo("photo-1497366216548-37526070297c", 1600),
  servicesHero: photo("photo-1521737604893-d14cc237f11d", 1920),
  lawyer: photo("photo-1505664194779-8beaceb93744"),
  doctor: photo("photo-1576091160399-112ba8d25d1d"),
  ngo: photo("photo-1559027615-cd4628902d4a"),
  city: photo("photo-1477959858617-67f85cf4f1df"),
  news: photo("photo-1504711434969-e33886168f5c"),
  shop: photo("photo-1556742049-0cfed4f6a45d"),
  restaurant: photo("photo-1414235077428-338989a2e8c0"),
  estate: photo("photo-1560518883-ce09059eeffa"),
  school: photo("photo-1524178232363-1fb2b075b655"),
  driving: photo("photo-1449965408869-eaa3f722e40d"),
  beauty: photo("photo-1560066984-138dadb4c035"),
  corporate: photo("photo-1497366811353-6870744d04b2"),
  design: photo("photo-1561070791-2526d30994b5"),
  code: photo("photo-1461749280684-dccba630e2f6"),
  social: photo("photo-1611162617474-5b21e879e113"),
  video: photo("photo-1492691527719-9d1e07e534b4"),
  ads: photo("photo-1460925895917-afdab827c52f"),
  seo: photo("photo-1432888498266-38ffec3eaf0a"),
  yekpare: photo("photo-1451187580459-43490279c0fa", 1600),
  yektube: photo("photo-1574717024653-61fd2cf4d44d"),
  newsmap: photo("photo-1526772662000-3f88f10405ff"),
  callCenter: photo("photo-1596524430615-b46475ddff6e"),
  photography: photo("photo-1542038784456-1ea8e935640e"),
  warehouse: photo("photo-1556740758-90de374c12ad"),
  cleaning: photo("photo-1581578731548-c64695cc6952"),
  agency: photo("photo-1552664730-d307ca884978"),
  hr: photo("photo-1521737711867-e3b97375f902"),
  qrMenu: photo("photo-1517248135467-4c7edcad34c4"),
  event: photo("photo-1511578314322-379afb476865"),
} as const;

function card(
  slug: string,
  title: string,
  excerpt: string,
  icon: string,
  href: string,
  bodyHtml: string,
  image: string,
  features: string[] = [],
): AhenkContentCard {
  return { slug, title, excerpt, icon, href, bodyHtml, image, features };
}

function modsHtml(features: string[]): string {
  if (!features.length) return "";
  return `<h3>Sektör modülleri</h3>
<ul class="ahenk-mods">${features.map((f) => `<li>${f}</li>`).join("")}</ul>`;
}

function defaultSoftwareSectors(): AhenkContentCard[] {
  const pkg = ahenkResolvedPackage({});
  const lawyerMods = [
    "Online randevu",
    "Görüntülü danışmanlık",
    "Uzmanlık ve dava alanları",
    "Müvekkil paneli",
    "Evrak ve dilekçe yükleme",
    "Ücret tarifesi",
    "Baro ve reklam mevzuatı",
    "KVKK ve referans gizliliği",
    "Karar / yayın arşivi",
    "WhatsApp hattı",
  ];
  const doctorMods = [
    "Online randevu",
    "Görüntülü danışmanlık",
    "Branş ve hekim seçimi",
    "Hasta ön kayıt formu",
    "Randevu hatırlatma",
    "Online ödeme",
    "Tetkik / sonuç talebi",
    "Çoklu klinik / şube",
    "KVKK ve hasta gizliliği",
    "WhatsApp hattı",
  ];
  const ngoMods = [
    "Online bağış",
    "Üyelik ve aidat",
    "Gönüllü kaydı",
    "Burs başvurusu",
    "Etkinlik takvimi",
    "Faaliyet ve arşiv",
    "Şeffaflık raporları",
    "Duyuru / SMS",
    "Haber vitrini",
    "Yönetim kurulu sayfaları",
  ];
  const cityMods = [
    "Duyuru ve meclis kararları",
    "Başvuru / dilekçe formu",
    "e-Belediye yönlendirme",
    "İhale ilanları",
    "Proje ve mahalle haritası",
    "Başkan mesajı ve canlı yayın",
    "Randevu (nikâh, zabıta)",
    "Haber merkezi",
    "Erişilebilirlik",
    "Mobil vatandaş paneli",
  ];
  const newsMods = [
    "Manşet ve slider",
    "Editör / yazar paneli",
    "RSS ve Google News",
    "Son dakika bandı",
    "Video TV ve galeri",
    "Haber haritası",
    "Reklam alanları",
    "Çoklu tema",
    "Özel alan adı",
    "Yapay zekâ haber aracı",
  ];
  const shopMods = [
    "Ürün katalog ve varyant",
    "Stok takibi",
    "Sepet ve sanal POS",
    "Kargo entegrasyonu",
    "Sipariş ve iade paneli",
    "Kupon / kampanya",
    "Çağrı merkezi sipariş",
    "Müşteri hesabı",
    "Fatura / e-arşiv yönlendirme",
    "Pazaryeri ürün aktarımı",
  ];
  const restoMods = [
    "QR kod menü",
    "Restoran POS yönetimi",
    "Kasiyer ekranı",
    "Garson sipariş / masa",
    "Kurye ve paket servis",
    "Stok takibi",
    "Masa rezervasyonu",
    "Mutfak ekranı (KDS)",
    "Online sipariş",
    "Personel ve vardiya",
    "Çoklu şube",
    "Otel oda rezervasyonu",
  ];
  const estateMods = [
    "Proje ve portföy vitrini",
    "Kat planı ve vaziyet",
    "Sanal tur / 360",
    "Filtreli ilan arama",
    "Gezme randevusu",
    "Lead ve CRM",
    "Teslim takvimi",
    "Yatırımcı sunumu",
    "Danışman kadrosu",
    "WhatsApp ilan paylaşımı",
  ];
  const schoolMods = [
    "Online ön kayıt",
    "Veli paneli",
    "Akademik kadro",
    "Ders programı ve takvim",
    "Duyuru ve ödev",
    "Aidat / online ödeme",
    "Görüntülü veli görüşmesi",
    "Galeri ve etkinlik",
    "Servis güzergâhı",
    "Yoklama bildirimi",
  ];
  const drivingMods = [
    "Ehliyet sınıfları (B, A, C…)",
    "Online kurs kaydı",
    "Direksiyon randevusu",
    "Sınav takvimi",
    "Eğitmen ve filo",
    "Paket ve fiyat",
    "Direksiyon saati takibi",
    "Online ödeme / taksit",
    "e-Sınav deneme",
    "Aday WhatsApp hattı",
  ];
  const beautyMods = [
    "Online randevu",
    "Uzman / oda seçimi",
    "Hizmet ve fiyat listesi",
    "Önce–sonra galeri",
    "Paket ve üyelik",
    "Stok / ürün satışı",
    "Online ödeme",
    "Randevu hatırlatma",
    "Instagram vitrini",
    "Kampanya QR menü",
  ];
  const corpMods = [
    "Çok dilli kurumsal vitrin",
    "Ürün ve hizmet ailesi",
    "Kariyer / İK başvuru",
    "Yatırımcı ilişkileri",
    "Bayi ve iş ortağı formu",
    "Katalog / doküman",
    "Kurumsal blog ve haber",
    "CRM iletişim formu",
    "Sürdürülebilirlik sayfası",
    "Sunucu ve domain dahil paket",
  ];

  return [
    card(
      "avukat-sitesi",
      "Avukat sitesi yazılımı",
      "Online randevu, görüntülü danışmanlık, müvekkil paneli ve evrak yükleme. Baro uyumlu hukuk bürosu yazılımı.",
      "scale",
      "/yazilim/avukat-sitesi",
      `<h2>Avukat sitesi yazılımı</h2>
<p>Hukuk büroları için vitrin değil, müvekkil operasyonu: uzmanlık alanları, avukat kadrosu, online randevu ve görüntülü danışmanlık tek prestij yüzeyinde. Baro ve reklam mevzuatına uygun dil, referans gizliliği, KVKK.</p>
${modsHtml(lawyerMods)}
<p>Müvekkil paneliyle evrak ve dilekçe yüklenir; ücret tarifesi ve SSS panelden yönetilir. SEO, Google İşletme ve harita kaydı teslimata dahildir.</p>`,
      AHENK_PHOTOS.lawyer,
      lawyerMods,
    ),
    card(
      "doktor-sitesi",
      "Doktor sitesi yazılımı",
      "Online randevu, görüntülü danışmanlık, hekim seçimi ve hasta ön kayıt. Klinik ve hastane web yazılımı.",
      "heart",
      "/yazilim/doktor-sitesi",
      `<h2>Doktor ve klinik yazılımı</h2>
<p>Sağlıkta dijital yüz, tedavi kadar özen ister. Branş sayfaları, hekim özgeçmişleri, online randevu, görüntülü danışmanlık ve hasta ön kayıt formu klinik kimliğinize göre kodlanır.</p>
${modsHtml(doctorMods)}
<p>Hatırlatma, online ödeme ve tetkik talebi paneli; KVKK ve hasta gizliliği. Estetik cerrahiden diş kliniğine, tıp merkezinden özel muayenehaneye kadar özel mimari.</p>`,
      AHENK_PHOTOS.doctor,
      doctorMods,
    ),
    card(
      "dernek-vakif-sitesi",
      "Dernek & vakıf",
      "Online bağış, üyelik, burs, gönüllü kaydı ve şeffaflık raporları.",
      "users",
      "/yazilim/dernek-vakif-sitesi",
      `<h2>Dernek ve vakıf yazılımı</h2>
<p>Sivil toplumun dijital kampüsü: faaliyetler, yönetim kurulu, bağış, burs, etkinlik takvimi ve arşiv. Vakıf senedi ve gönüllü formları panelden yönetilir.</p>
${modsHtml(ngoMods)}
<p>Ahenk’in STK temaları ve Haber Merkezi entegrasyonu ile duyurular haber vitrinine de düşebilir.</p>`,
      AHENK_PHOTOS.ngo,
      ngoMods,
    ),
    card(
      "belediye-kamu-sitesi",
      "Belediye & kamu",
      "Dilekçe, randevu, ihale, e-belediye yönlendirme ve mahalle haberleri.",
      "building",
      "/yazilim/belediye-kamu-sitesi",
      `<h2>Belediye ve kamu web yazılımı</h2>
<p>Vatandaşın ilk kapısı. Başkan mesajı, birimler, duyurular, ihaleler, proje haritası ve haber merkezi. Erişilebilirlik ve mobil hız kamu standardıdır.</p>
${modsHtml(cityMods)}
<p>Başvuru formu, nikâh / zabıta randevusu ve e-belediye köprüleri teslimata dahildir.</p>`,
      AHENK_PHOTOS.city,
      cityMods,
    ),
    card(
      "haber-medya-sitesi",
      "Haber sitesi yazılımı & haber scripti",
      "Manşet, RSS, editör paneli, yazar, video TV ve haber haritası — 1-3 günde yayında.",
      "news",
      "/yazilim/haber-medya-sitesi",
      `<h2>Haber sitesi yazılımı</h2>
<p>Gazete ve ajanslar için Haber Merkezi: manşet, kategori, köşe, video TV, Google News ve haber haritası. Özel alan adı, editör paneli, RSS.</p>
${modsHtml(newsMods)}
<p>YekTube ile video yayın katmanı eklenebilir. Yapay zekâ haber aracı 1–3 günde yayına alır.</p>`,
      AHENK_PHOTOS.news,
      newsMods,
    ),
    card(
      "e-ticaret-sitesi",
      "E-ticaret & marka mağazası",
      "Katalog, stok, sanal POS, kargo, kupon ve çağrı merkezi sipariş.",
      "cart",
      "/yazilim/e-ticaret-sitesi",
      `<h2>E-ticaret yazılımı</h2>
<p>Ürün, stok, ödeme ve kargo akışını markanızın ritmine göre kurarız. Katalog, sanal POS ve çağrı merkezi sipariş ile omnichannel teslimat.</p>
${modsHtml(shopMods)}
<p>Kampanya, iade ve müşteri hesabı panelden yönetilir. Performans reklamına hazır ürün sayfaları.</p>`,
      AHENK_PHOTOS.shop,
      shopMods,
    ),
    card(
      "restoran-otel-sitesi",
      "Restoran sitesi yazılımı",
      "QR menü, restoran POS, kasiyer, garson, kurye ve stok takibi. Rezervasyon ve online sipariş.",
      "qr",
      "/yazilim/restoran-otel-sitesi",
      `<h2>Restoran ve otel yazılımı</h2>
<p>Restoran, kafe ve otel için operasyon yazılımı: masadan mutfağa, kasadan kuryeye tek panel. QR kod menü, restoran POS yönetimi, kasiyer, garson sipariş, kurye ve stok takibi aynı sistemde çalışır.</p>
${modsHtml(restoMods)}
<p>Otelde oda tipleri, müsaitlik ve rezervasyon; restoranda masa, mutfak ekranı (KDS) ve personel vardiyası. Mobil uyumlu, 1–3 günde teslim.</p>`,
      AHENK_PHOTOS.restaurant,
      restoMods,
    ),
    card(
      "emlak-insaat-sitesi",
      "Emlak & inşaat",
      "Portföy, kat planı, sanal tur, gezme randevusu ve CRM. Teslim takvimi.",
      "building",
      "/yazilim/emlak-insaat-sitesi",
      `<h2>Emlak ve inşaat yazılımı</h2>
<p>Konut projeleri, arsa, ticari portföy. Kat planı, vaziyet, teslim tarihi, sanal tur ve lead formu. Yatırımcı sunum kalitesinde tipografi.</p>
${modsHtml(estateMods)}
<p>Gezme randevusu, danışman kadrosu ve WhatsApp ilan paylaşımı teslimata dahildir.</p>`,
      AHENK_PHOTOS.estate,
      estateMods,
    ),
    card(
      "egitim-okul-sitesi",
      "Okul & eğitim",
      "Online kayıt, veli paneli, aidat, ders programı ve görüntülü veli görüşmesi.",
      "users",
      "/yazilim/egitim-okul-sitesi",
      `<h2>Eğitim kurumu yazılımı</h2>
<p>Okul, kurs ve üniversite birimleri için kayıt, kadro, akademik takvim, galeri ve duyuru. Güven ve aidiyet hissi taşıyan arayüz.</p>
${modsHtml(schoolMods)}
<p>Veli paneli, aidat ödemesi ve görüntülü görüşme ile okul–aile hattı tek yerde toplanır.</p>`,
      AHENK_PHOTOS.school,
      schoolMods,
    ),
    card(
      "surucu-kursu-sitesi",
      "Sürücü kursu sitesi",
      "Ehliyet sınıfları, online kayıt, direksiyon randevusu, filo ve sınav takvimi.",
      "map",
      "/yazilim/surucu-kursu-sitesi",
      `<h2>Sürücü kursu yazılımı</h2>
<p>Ehliyet sınıfları, paket fiyatları, eğitmen kadrosu, araç filosu, kayıt ve sınav takvimi tek panelde. Aday WhatsApp hattı teslimata dahildir.</p>
${modsHtml(drivingMods)}
<p>Direksiyon saati takibi ve e-sınav deneme ile kurs operasyonu dijitalleşir. Mobil uyumlu, 1–3 günde yayında.</p>`,
      AHENK_PHOTOS.driving,
      drivingMods,
    ),
    card(
      "guzellik-merkezi-sitesi",
      "Güzellik merkezi sitesi",
      "Online randevu, uzman seçimi, fiyat listesi, önce–sonra galeri ve paket üyelik.",
      "sparkle",
      "/yazilim/guzellik-merkezi-sitesi",
      `<h2>Güzellik merkezi yazılımı</h2>
<p>Cilt bakımı, saç, tırnak, lazer ve medikal estetik hizmet sayfaları; uzman kadro, önce–sonra galeri, randevu ve WhatsApp. Marka paleti sizin kimliğinizle kurulur.</p>
${modsHtml(beautyMods)}
<p>Paket üyelik, ürün stoku ve kampanya QR menü eklenebilir. Mobil öncelikli, 1–3 günde teslim.</p>`,
      AHENK_PHOTOS.beauty,
      beautyMods,
    ),
    card(
      "kurumsal-sirket-sitesi",
      "Kurumsal web sitesi",
      "Çok dil, kariyer, yatırımcı ve ürün ailesi. 3 günde teslim · sunucu ve domain dahil.",
      "pen",
      "/yazilim/kurumsal-sirket-sitesi",
      `<h2>Kurumsal web yazılımı</h2>
<p>Holding, sanayi ve ihracat markaları için çok dilli şirket sitesi. Yatırımcı ilişkileri, kariyer, sürdürülebilirlik ve ürün ailesi Londra–Ankara ofis standartlarında teslim edilir.</p>
${modsHtml(corpMods)}
<p>${pkg.note}</p>`,
      AHENK_PHOTOS.corporate,
      corpMods,
    ),
  ];
}

function defaultAgencyOffers(): AhenkContentCard[] {
  return [
    card(
      "grafik-tasarim",
      "Grafik & marka",
      "Kimlik, ambalaj, basılı ve dijital tüm yüzeylerde tek imza.",
      "pen",
      "/yazilim/grafik-tasarim",
      `<h2>Grafik tasarım ve marka</h2>
<p>Logo, kurumsal kimlik, ambalaj ve kampanya dilini sıfırdan veya evrimle kurarız. Global sahada doğru konumlanan, özgün ve bütünlüklü bir marka algısı.</p>`,
      AHENK_PHOTOS.design,
    ),
    card(
      "web-yazilim",
      "Web & mobil yazılım",
      "Kurumsal, e-ticaret, iOS/Android ve SEO’lu özel geliştirme.",
      "code",
      "/yazilim/web-yazilim",
      `<h2>Web tasarım ve yazılım</h2>
<p>Kurumsal site, e-ticaret, mobil uygulama, SEO, harita kaydı. Siteniz vizyonunuzun arayüzüdür; her dikeyde size özel kodlanır.</p>`,
      AHENK_PHOTOS.code,
    ),
    card(
      "sosyal-medya",
      "Sosyal medya",
      "İçerik, kriz, kampanya ve dijital ofis yönetimi.",
      "sparkle",
      "/yazilim/sosyal-medya",
      `<h2>Sosyal medya yönetimi</h2>
<p>Duyuru, kampanya, çekiliş ve müşteri yanıtı. Markanın dijital ofisini kurar, içerik takvimini işletiriz.</p>`,
      AHENK_PHOTOS.social,
    ),
    card(
      "video-film",
      "Video & reklam filmi",
      "Tanıtım, ürün, intro, kurgu ve yayın için sinema kalitesi.",
      "camera",
      "/yazilim/video-film",
      `<h2>Video çekimi ve reklam filmi</h2>
<p>Reklam filmi, ürün tanıtımı, kurumsal intro ve kurgu. Görsel iletişimin güçlendiği yerde Ahenk stüdyosu devrededir.</p>`,
      AHENK_PHOTOS.video,
    ),
    card(
      "dijital-reklam",
      "Dijital reklam",
      "Google, YouTube, görüntülü, mobil ve e-posta büyüme.",
      "news",
      "/yazilim/dijital-reklam",
      `<h2>Dijital reklam yönetimi</h2>
<p>Arama ağı, YouTube, görüntülü, remarketing ve e-posta. Anahtar kelime stratejisi, bütçe ve rapor tek elde.</p>`,
      AHENK_PHOTOS.ads,
    ),
    card(
      "seo-buyume",
      "SEO & büyüme",
      "Teknik SEO, içerik mimarisi ve arama görünürlüğü.",
      "sparkle",
      "/yazilim/seo-buyume",
      `<h2>SEO çalışması</h2>
<p>Mobil uyum, site içi SEO, harita, Open Graph, Search Console ve analitik. Siteniz kendi alan adınızda, kendi hızınızda yükselir.</p>`,
      AHENK_PHOTOS.seo,
    ),
  ];
}

function defaultPlatformProducts(): AhenkContentCard[] {
  return [
    card(
      "haber-merkezi",
      "Haber Merkezi",
      "Kendi haber siteniz: manşet, RSS, yazar, tema, özel domain. Sunucu ve domain dahil paket.",
      "news",
      "/ucretsiz-haber-sitesi",
      `<p>White-label haber yazılımı. Editör paneli, vitrin temaları, köşe yazarları. Haber sitesi yazılımı ve kurumsal web sitesi Ahenk Bilgi Teknolojileri kampanya paketiyle teslim edilir; sunucu ve domain dahildir.</p>`,
      AHENK_PHOTOS.news,
    ),
    card(
      "yektube",
      "YekTube",
      "Video platformu, kanallar, canlı yayın ve oynatma listeleri.",
      "play",
      "/yektube",
      `<p>YekTube; haber ve marka videoları için yerli yayın katmanı. Kanallar, canlı TV ve oynatma listeleri ahenk.net.tr/yektube adresinde.</p>`,
      AHENK_PHOTOS.yektube,
    ),
    card(
      "haberler",
      "Haberler",
      "Günlük haber vitrini, son dakika ve kategori akışı.",
      "news",
      "/haberler",
      `<p>Canlı haber vitrini ahenk.net.tr/haberler adresinde yayınlanır.</p>`,
      AHENK_PHOTOS.news,
    ),
    card(
      "haber-haritasi",
      "Haber haritası",
      "Newsmap: coğrafyaya pinlenen haber keşfi.",
      "map",
      "/newsmap",
      `<p>Haber haritası dünya ve Türkiye üzerindeki akışı görselleştirir. ahenk.net.tr/newsmap</p>`,
      AHENK_PHOTOS.newsmap,
    ),
  ];
}

function defaultYekpare(): AhenkPromoBlock {
  return {
    kicker: "yekpare.net",
    title: "Hazır siteniz keşif, harita ve sipariş ağına bağlanır",
    text: "Listelenmek ücretsizdir. yekpare.net reklamları trafiği artırır; haritalar, sarı sayfalar ve onbinlerce işletme kaydı aynı sistemde. Sipariş, satış ve rezervasyon buradan gelir. Özel yazılımlar için Ahenk BT ile iletişime geçin.",
    ctaLabel: "Yekpare.net’i ziyaret et",
    ctaHref: "https://yekpare.net",
    secondaryLabel: "Yekpare sayfası",
    secondaryHref: "/yekpare",
    image: AHENK_PHOTOS.yekpare,
  };
}

export function defaultAhenkAgencySite(): AhenkAgencySite {
  return {
    version: 2,
    brandName: "Ahenk Bilgi Teknolojileri",
    tagline: "yekpare.net hazır web sitesi — Ahenk Bilgi Teknolojileri.",
    phone: "0541 313 62 45",
    phoneTel: "+905413136245",
    whatsappTel: "+905413136245",
    email: AHENK_CORPORATE_EMAIL,
    logoUrl: AHENK_LOGO_WORDMARK,
    logoMarkUrl: AHENK_LOGO_MARK,
    seoTitle: "Ahenk BT | yekpare.net hazır web sitesi",
    seoDescription:
      "Ahenk Bilgi Teknolojileri, yekpare.net hazır web siteleri üretir. Haber siteleri (HM editör) ve servis sağlayıcı vitrinleri. Ücretsiz liste, harita, sarı sayfalar, sipariş ve rezervasyon. Özel yazılımlar için iletişime geçin.",
    seoKeywords:
      "web yazılımı, web tasarımı, haber sitesi yazılımı, haber scripti, avukat sitesi, doktor sitesi, restoran sitesi, kurumsal web sitesi, mobil uyumlu yazılım, web ofisi, webintek",
    aiDeliveryLead: "Yapay zeka destekli tüm sektörlerden web yazılımı yapıyoruz. 1-3 günde teslim ediyoruz.",
    priceTitle: "Kurumsal web sitesi",
    priceAmount: "10000",
    priceCurrency: "TRY",
    pricePeriodNote: "Kurumsal web sitesi 3 günde teslim · sunucu ve domain dahil",
    priceCampaignUntilYear: "2026",
    priceCampaignAmount: "10000",
    priceRegularAmount: "20000",
    priceIncludesNote: "Sunucu ve domain dahildir.",
    ibanBank: "Kuveyt Türk",
    ibanHolder: "Nail TÜRKOĞLU",
    iban: "TR160020500000041593000001",
    faqs: defaultAhenkFaqs(),
    hoursWeekday: "Pazartesi - Cumartesi 09:00 - 18:00",
    hoursSunday: "Pazar: Kapalı",
    heroKicker: "Ahenk Bilgi Teknolojileri",
    heroTitle: "yekpare.net hazır web sitesi",
    heroSubtitle:
      "Ahenk BT, yekpare.net üzerinde hazır web siteleri üretir. Haber siteleri HM editör altyapısıyla, sektör siteleri yekpare.net servis sağlayıcı vitrinleriyle yayına alınır.",
    heroCtaLabel: "Canlı demolar",
    heroCtaHref: "#demolar",
    heroSecondaryLabel: "Özel yazılım için iletişim",
    heroSecondaryHref: "/iletisim",
    heroImage: AHENK_PHOTOS.hero,
    softwareTitle: "Web yazılımı — tüm sektörler",
    softwareLead:
      "Avukat ve doktor sitelerinde online randevu ile görüntülü danışmanlık; restoranda QR menü, POS, kasiyer, garson, kurye ve stok; emlak, okul, sürücü kursu, güzellik ve kurumsal web sitesi. Yapay zeka destekli, 1-3 günde teslim.",
    softwareSectors: defaultSoftwareSectors(),
    agencyTitle: "Ajans hizmetleri",
    agencyLead: "Web yazılımından sonra: grafik, sosyal medya, film, reklam ve SEO.",
    agencyOffers: defaultAgencyOffers(),
    yekpare: defaultYekpare(),
    platformTitle: "Yayın ürünleri",
    platformLead: "YekTube, Haberler, haber haritası ve Haber Merkezi — ahenk.net.tr/haber-merkezi",
    platformProducts: defaultPlatformProducts(),
    haberMerkeziTitle: "Haber Merkezi ürün ailesi",
    haberMerkeziLead:
      "YekTube, günlük Haberler vitrini, Newsmap haber haritası ve white-label Haber Merkezi yazılımı aynı çatıda.",
    haberMerkeziHtml: `<p>Ahenk’in yayın katmanı dört üründen oluşur. Haber Merkezi ile kendi gazetenizi kurarsınız; Haberler canlı vitrindir; YekTube video ve canlı TV’dir; haber haritası coğrafi keşiftir.</p>
<p>Canlı uygulamalar mevcut adreslerinde çalışmaya devam eder. Bu sayfa ürünleri kurumsal dilde tanıtır.</p>`,
    yekparePageTitle: "Yekpare.net",
    yekparePageHtml: `<p><strong>Yekpare.net</strong> hazır web sitelerinin yayınlandığı ekosistemdir. Ahenk Bilgi Teknolojileri (Ahenk BT) bu hazır siteleri üretir: haber siteleri HM editör altyapısıyla, sektör vitrinleri yekpare.net servis sağlayıcı siteleriyle.</p>
<p>yekpare.net üzerinde listelenmek ücretsizdir. Reklamlar trafiği artırır; haritalar kaydı, sarı sayfalar ve onbinlerce işletme kaydı aynı sistemdedir. Sipariş, satış ve rezervasyon bu ağdan gelir.</p>
<p>Canlı örnekler: <a href="https://yekpare.net/saglik" rel="noreferrer">sağlık</a>, <a href="https://yekpare.net/hukuk" rel="noreferrer">hukuk</a>, <a href="https://yekpare.net/alisveris/magaza/imece" rel="noreferrer">İmece mağaza</a>, <a href="https://yekpare.net/siparis/satici/kafe-bazar" rel="noreferrer">Kafe Bazar</a>; haber için <a href="https://ankarasehirgazetesi.com/" rel="noreferrer">Ankara Şehir Gazetesi</a> ve <a href="https://vatankahramanlari.org/" rel="noreferrer">Vatan Kahramanları</a>.</p>
<p>Özel yazılımlar için <a href="/iletisim">bizimle iletişime geçin</a>.</p>`,
    aboutTitle: "Küresel markalarla çalışıyoruz",
    aboutHtml: `<p>Ahenk Bilgi Teknolojileri olarak Getir Yemek, Getir Çarşı, Migros Yemek ve Yemeksepeti gibi start up firmalarına verdiğimiz hizmetlerle tecrübe sahibiyiz. Teknolojik girişim şirketlerinin ihtiyaç duydukları tüm bilgi ve birikime sahibiz; birçok alanda hizmet sağlıyoruz.</p>
<p>Hedefimiz; yenilikçi uygulamalarıyla ülkemizin kamu kurumları ve özel sektör kuruluşlarına bilgi teknolojileri alanında en üst seviyede hizmet verebilmektir. Teknolojik girişim tekliflerine açığız.</p>
<p>Londra, Ankara, Batum, Bakü ve Cheyenne ofislerimizle yazılım, ajans ve kurumsal operasyonu tek çatıda yönetiriz.</p>`,
    aboutImage: AHENK_PHOTOS.about,
    ctaTitle: "Ofisimizde misafirimiz olun",
    ctaText:
      "Yazılım, ajans veya yayın projeniz için sizi Ankara, Londra veya Batum ofisimizde ağırlamaktan mutluluk duyarız.",
    servicesTitle: "Çağrı merkezi ve operasyon",
    servicesLead:
      "Web yazılımı ve ajansın ardından: çağrı merkezi, müşteri hizmetleri, insan kaynakları, e-ticaret destek ve kurumsal organizasyon.",
    servicesHeroImage: AHENK_PHOTOS.servicesHero,
    landingKicker: "Ahenk Bilgi Teknolojileri",
    landingTitle: "Haber sitesi yazılımı — sunucu ve domain dahil",
    landingLead:
      "Yapay zeka destekli haber sitesi yazılımı ve kurumsal web sitesi. 2026 sonuna kadar kampanya 10.000 TL (20.000 TL yerine); 2027’den itibaren 20.000 TL. Teslim 1–3 gün.",
    landingCtaLabel: "Teklif / başvuru",
    landingFeatures: defaultAhenkLandingFeatures(),
    offices: [
      {
        id: "tr",
        country: "Türkiye",
        flag: "🇹🇷",
        address: "Meşrutiyet Mah. Karanfik Sokak 4/91 Çankaya - Ankara",
      },
      {
        id: "ge",
        country: "Gürcistan",
        flag: "🇬🇪",
        address: "Kutaisi St. No:11 Batum / Gürcistan",
      },
      {
        id: "uk",
        country: "İngiltere",
        flag: "🇬🇧",
        address: "71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ",
      },
      {
        id: "us",
        country: "ABD",
        flag: "🇺🇸",
        address: "1621 CENTRAL AVE CHEYENNE, WY 82001",
      },
      {
        id: "az",
        country: "Azerbaycan",
        flag: "🇦🇿",
        address: "Caferov Qardaşları Küçesi No: 20/1 Bakü",
      },
    ],
    slides: [
      {
        id: "yazilim",
        title: "Sektör yazılımı",
        subtitle: "Avukat, doktor, dernek ve kurumsal markalar için prestij web yazılımı.",
        ctaLabel: "Yazılımı incele",
        ctaHref: "/yazilim",
        image: AHENK_PHOTOS.hero,
      },
      {
        id: "ajans",
        title: "Ajans stüdyosu",
        subtitle: "Grafik, film, sosyal medya, SEO ve dijital reklam tek imzada.",
        ctaLabel: "Ajans",
        ctaHref: "/ajans",
        image: AHENK_PHOTOS.agency,
      },
      {
        id: "yayin",
        title: "Haber Merkezi ürünleri",
        subtitle: "YekTube, Haberler, haber haritası ve white-label Haber Merkezi.",
        ctaLabel: "Haber Merkezi",
        ctaHref: "/haber-merkezi",
        image: AHENK_PHOTOS.news,
      },
    ],
    services: [
      {
        slug: "musteri-hizmetleri",
        title: "Müşteri Hizmetleri",
        excerpt:
          "Kurumsal ve bireysel müşteri hizmetleri, şikayet/talep yönetimi ve 7/24 çağrı merkezi çözümleri.",
        icon: "headphones",
        image: AHENK_PHOTOS.callCenter,
        bodyHtml: `<h2>Müşteri Hizmetleri</h2>
<p>Nihai müşterilerinizin memnuniyetini artırmak amacıyla şikayet, talep, öneri ve teşekkürlerinin telefon, e-posta, web ve benzeri kanallar aracılığı ile karşılanması ve yönetilmesidir.</p>
<h3>Kurumsal Müşteri Hizmetleri Çözümleri</h3>
<ul>
<li>Çağrı merkezi hizmetleri ve sipariş alma</li>
<li>Şikayet, talep ve öneri yönetimi</li>
<li>Üyelik ve sadakat programı operasyonu</li>
</ul>
<h3>Bireysel Müşteri Hizmetleri Çözümleri</h3>
<p>Profesyonel sekreterya ve asistanlık hizmeti sunuyoruz. Talebinize göre özelleştirilmiş, ekonomik ve işlevsel seçeneklerle işinize özel santal ve sabit hat kurgulanabilir.</p>
<h3>Genel Çağrı Merkezi Hizmetleri</h3>
<p>Müşterilerinize, konusunda uzman müşteri hizmet yetkililerimiz ile 7 gün 24 saat talep ve önerilerini karşılıyor; şikayet yönetimi, sipariş yönetimi, üyelik yönetimi ve sadakat programı gibi hizmetler sunuyoruz.</p>
<h3>Müşteri Elde Tutma, Kalite ve Backoffice</h3>
<p>Web sayfası, sosyal medya veya telefon ile iletilen tüm öneri, şikayet ve teşekkür kayıtlarını değerlendirir, cevaplarız. Kayıtları düzenli olarak ilgili birimlerle paylaşır, kalite yönetim sistemini destekleriz. Satış ve pazarlama, tahsilat, lokasyon kiralama, sosyal medya takibi ve raporlama bu kapsamda yer alır.</p>`,
      },
      {
        slug: "urun-fotograf-cekimi",
        title: "Ürün Fotoğraf Çekimi",
        excerpt:
          "E-ticaret, katalog ve tanıtım için yüksek çözünürlüklü endüstriyel ve ürün fotoğraf çekimi.",
        icon: "camera",
        image: AHENK_PHOTOS.photography,
        bodyHtml: `<h2>Ürün Fotoğraf Çekimi</h2>
<p>E-ticaret ile ürün veya hizmetlerinizi doğru anlatmanın yolu profesyonel fotoğraflardır. Endüstriyel fotoğraf çekimi ile üretim yaptığınız ürünleri ve üretim alanlarınızı yüksek çözünürlükte görselleştiriyoruz.</p>
<p>Görsel uzmanlarımız, son teknoloji ekipmanlarla ürünlerinize en doğru açıdan yaklaşarak firmanızın imajını yansıtan çekimler gerçekleştirir. Ürün katalogları, sosyal medya, reklam ve tanıtım çalışmaları için kullanılacak görseller çekim sonrası profesyonel olarak düzenlenir.</p>
<ul>
<li>Ödeme kolaylığı</li>
<li>Kurumsallık ve profesyonellik</li>
<li>Her alanda hizmet yetkinliği</li>
<li>Kreatif grafik ve tasarım ekibi</li>
<li>Alanında uzman fotoğrafçılar</li>
<li>Son teknoloji ekipman</li>
<li>Türkiye’nin her yerinde çekim hizmeti</li>
</ul>
<p>Detaylı bilgi ve fiyat için bizi arayın: <strong>0541 313 62 45</strong></p>`,
      },
      {
        slug: "cagri-merkezi-siparis-sistemi",
        title: "Çağrı Merkezi Sipariş Sistemi",
        excerpt: "Sipariş alma, üyelik ve müşteri kayıtlarını tek operasyonel sistemde yönetin.",
        icon: "phone",
        image: AHENK_PHOTOS.callCenter,
        bodyHtml: `<h2>Çağrı Merkezi Sipariş Sistemi</h2>
<p>Restoran, e-ticaret ve hizmet işletmeleri için çağrı merkezi üzerinden sipariş alma altyapısı kuruyoruz. Gelen aramalar, sipariş fişleri, müşteri kayıtları ve raporlama aynı süreçte ilerler.</p>
<p>KRAL POS ve dijital menü çözümlerimizle entegre çalışabilen sipariş sistemi; yoğun saatlerde kaçırılan çağrıları azaltır, operasyonu standartlaştırır ve müşteri memnuniyetini yükseltir.</p>
<ul>
<li>7/24 sipariş alma ve yönlendirme</li>
<li>Müşteri kayıt ve tekrar sipariş</li>
<li>Kampanya ve üyelik yönetimi</li>
<li>Raporlama ve kalite dinleme</li>
</ul>`,
      },
      {
        slug: "e-ticaret-destek-hizmetleri",
        title: "E-Ticaret Destek Hizmetleri",
        excerpt: "Personel tedariki, kurye çözümleri ve e-ticaret operasyon desteği.",
        icon: "cart",
        image: AHENK_PHOTOS.warehouse,
        bodyHtml: `<h2>E-Ticaret Destek Hizmetleri</h2>
<p>Dönemsel veya sürekli personel temin tedarik hizmetlerimiz ile işe alım ve yerleştirme hizmetleri sunuyoruz. Mükemmel adayın ihtiyaç duyduğunuz becerilerden daha fazlasına sahip olması gerektiğini biliyoruz; inisiyatif, güvenilirlik ve ekip uyumu başarının önemli göstergeleridir.</p>
<h3>Kurye Servisi (Paket Teslimatları)</h3>
<p>Teslimat hizmetlerinde sürat, bireyselleştirme ve uzmanlık önemli olduğunda kurye servisi en uygun taşıma modu haline gelir. Kurumsal e-ticaret firmalarına ve e-ticarette ürün satan işletmelere kurye tedarik hizmeti sağlıyoruz.</p>
<h3>E-ticaret depo personel tedarik hizmetleri</h3>
<p>Kara Cuma, Siber Pazartesi veya Noel gibi yoğun dönemlerde paketleme, depo ve teslimat ekiplerine duyulan ihtiyaç artar. Bu dönemlerde deneyimli personel ve kurye desteği sağlarız.</p>
<h3>E-ticaret uzmanlarının işe alınması</h3>
<p>Ahenk Bilgi Teknolojileri olarak başta e-ticaret şirketlerinin kalifiye insana ihtiyaç duydukları alanlarda ve bu ekosistemde yer almak isteyen firmaların internete taşınmasında, pazara açıldıktan sonra da teknoloji odaklı ihtiyaç duyulan birçok alanda uzman çalışanlarımızla hizmet sunuyoruz.</p>`,
      },
      {
        slug: "ajans-hizmetleri",
        title: "Ajans Hizmetleri",
        excerpt: "Grafik tasarım, web yazılım, SEO, sosyal medya, video ve dijital reklam yönetimi.",
        icon: "pen",
        image: AHENK_PHOTOS.agency,
        bodyHtml: `<h2>Ajans Hizmetleri</h2>
<h3>Grafik Tasarım Hizmetleri</h3>
<p>Markanızın basılı ya da dijital mecralarda ihtiyaç duyduğu bütün tasarım işlerini, markanızı en iyi şekilde tanıtacak yenilikçi bir bakış açısıyla oluşturuyoruz.</p>
<h3>Sosyal Medya Yönetimi</h3>
<p>Ekibimiz, firmaların sosyal medya hesaplarının yönetimi konusunda en kaliteli ve yaratıcı hizmeti vermeyi hedefler.</p>
<h3>Web Tasarım &amp; Yazılım</h3>
<p>Kurumsal web sitesi, e-ticaret, mobil uygulama, SEO, işletme ve harita kaydı, mobil uyumlu arayüzler geliştiriyoruz.</p>
<h3>Video Çekimi</h3>
<p>Reklam filmi, kurgu-montaj, marka ve ürün tanıtım filmi, kurumsal intro üretiyoruz.</p>
<h3>Dijital Reklam Yönetimi</h3>
<p>Google anahtar kelime reklamları, YouTube reklam yönetimi, görüntülü reklamlar, mobil reklam ve e-posta pazarlama süreçlerini planlar, yönetir ve raporlarız.</p>`,
      },
      {
        slug: "insan-kaynaklari-hizmetleri",
        title: "İnsan Kaynakları Hizmetleri",
        excerpt: "Belirli süreli ve süresiz personel tedariki ile organizasyonel esneklik.",
        icon: "users",
        image: AHENK_PHOTOS.hr,
        bodyHtml: `<h2>İnsan Kaynakları Hizmetleri</h2>
<p>Belirli süreli / süresiz personel hizmeti sunuyoruz. Süreli ve süresiz eleman hizmetleri ile sağlanan organizasyonel esneklik, firmanıza benzersiz bir hareket kabiliyeti kazandırır.</p>
<p>İşe alım, yerleştirme, dönemsel kampanya ekipleri, çağrı merkezi ve saha personeli tedarikinde deneyimli ekibimizle yanınızdayız. Start-up ve ölçeklenen teknoloji şirketlerinin operasyonel insan kaynağı ihtiyacını hızlı karşılarız.</p>`,
      },
      {
        slug: "dijital-menu-qr-menu",
        title: "Dijital Menü — QR Menü",
        excerpt: "Kağıt menü maliyetini kaldırın; QR kod ile temassız, anlık güncellenen dijital menü.",
        icon: "qr",
        image: AHENK_PHOTOS.qrMenu,
        aliases: ["dijital-menu-qr-menu"],
        bodyHtml: `<h2>Dijital Menü — QR Menü</h2>
<p>Klasik kâğıt menülerdeki baskı maliyetlerini unutun. İhtiyacınız olduğunda yönetim panelinden birkaç dakikada ürünlerinizi dilediğiniz gibi düzenleyebilirsiniz.</p>
<p>Müşterileriniz masadaki QR kodu telefonlarına okutarak ürünlerinize erişir ve hiçbir fiziksel temasa gerek kalmadan kolaylıkla siparişlerini verir.</p>
<p>Dijital QR menü, ürünlerinizi düzenli, anlaşılır ve etkileyici şekilde sunmanıza yardımcı olur.</p>`,
      },
      {
        slug: "kurumsal-organizasyon",
        title: "Kurumsal Organizasyon",
        excerpt: "Şirket etkinlikleri, fuar, festival ve kurumsal davetlerin uçtan uca planlanması.",
        icon: "building",
        image: AHENK_PHOTOS.event,
        bodyHtml: `<h2>Kurumsal Organizasyon</h2>
<p>Ahenk Bilgi Teknolojileri olarak firmaların kurumsal değer ve prensiplerini analiz ederek onların beklentileri doğrultusunda hareket etmekteyiz.</p>
<p>Hayalinizdeki organizasyonun oluşturulma aşamasında size her adımda yardımcı olacak tecrübeli, eğitimli ve yenilikçi bir ekip olarak davet planınızın en başından en sonuna kadar yanınızdayız.</p>
<p>Şirket organizasyonlarının yanı sıra belediyeler, meslek odaları, dernekler ve vakıflar ile sergi, konser, tiyatro, fuar, yerel ve yöresel festival organizasyonu hizmeti de vermekteyiz.</p>`,
      },
    ],
  };
}

function mergeOffices(raw: unknown, defaults: AhenkAgencyOffice[]): AhenkAgencyOffice[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const items = raw
    .filter(isRecord)
    .map((o, i) => ({
      id: str(o.id, `office-${i}`),
      country: str(o.country, ""),
      flag: str(o.flag, "📍"),
      address: str(o.address, ""),
    }))
    .filter((o) => o.country && o.address);
  return items.length ? items : defaults;
}

function mergeSlides(raw: unknown, defaults: AhenkAgencySlide[]): AhenkAgencySlide[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const byId = new Map(defaults.map((d) => [d.id, d]));
  const items = raw
    .filter(isRecord)
    .map((s, i) => {
      const id = str(s.id, `slide-${i}`);
      const fallback = byId.get(id);
      return {
        id,
        title: str(s.title, ""),
        subtitle: str(s.subtitle, ""),
        ctaLabel: str(s.ctaLabel, "İncele"),
        ctaHref: str(s.ctaHref, "/hizmetler"),
        image: safeAhenkImageUrl(s.image, fallback?.image ?? ""),
      };
    })
    .filter((s) => s.title);
  return items.length ? items : defaults;
}

function mergeServices(raw: unknown, defaults: AhenkAgencyService[]): AhenkAgencyService[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const bySlug = new Map(defaults.map((d) => [d.slug, d]));
  const items = raw
    .filter(isRecord)
    .map((s) => {
      const slug = str(s.slug, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fallback = bySlug.get(slug);
      return {
        slug,
        title: str(s.title, ""),
        excerpt: str(s.excerpt, ""),
        icon: str(s.icon, "sparkle"),
        bodyHtml: str(s.bodyHtml, ""),
        image: safeAhenkImageUrl(s.image, fallback?.image ?? ""),
        aliases: Array.isArray(s.aliases)
          ? s.aliases.map((a) => String(a || "").trim()).filter(Boolean)
          : undefined,
      };
    })
    .filter((s) => s.slug && s.title && !AHENK_REMOVED_SERVICE_SLUGS.has(s.slug));
  return items.length ? items : defaults;
}

function mergeFeatureList(raw: unknown, fallback?: string[]): string[] | undefined {
  if (Array.isArray(raw)) {
    const items = raw.map((x) => String(x ?? "").trim()).filter(Boolean);
    if (items.length) return items;
  }
  return fallback?.length ? fallback : undefined;
}

function mergeCards(raw: unknown, defaults: AhenkContentCard[]): AhenkContentCard[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const bySlug = new Map(defaults.map((d) => [d.slug, d]));
  const items = raw
    .filter(isRecord)
    .map((c, i) => {
      const slug = str(c.slug, `kart-${i}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fallback = bySlug.get(slug);
      return {
        slug,
        title: str(c.title, ""),
        excerpt: str(c.excerpt, ""),
        icon: str(c.icon, fallback?.icon ?? "sparkle"),
        href: str(c.href, fallback?.href ?? "/"),
        bodyHtml: str(c.bodyHtml, fallback?.bodyHtml ?? ""),
        image: safeAhenkImageUrl(c.image, fallback?.image ?? ""),
        aliases: Array.isArray(c.aliases)
          ? c.aliases.map((a) => String(a || "").trim()).filter(Boolean)
          : fallback?.aliases,
        features: mergeFeatureList(c.features, fallback?.features),
      };
    })
    .filter((c) => c.slug && c.title);
  return items.length ? items : defaults;
}

function mergeTextBlocks(raw: unknown, defaults: AhenkTextBlock[]): AhenkTextBlock[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const items = raw
    .filter(isRecord)
    .map((b) => ({ title: str(b.title, ""), text: str(b.text, "") }))
    .filter((b) => b.title && b.text);
  return items.length ? items : defaults;
}

/** Kayıtlı JSON eski kopyaysa sektör modüllerini ve yeni dikeyleri uygular. */
export function enrichSoftwareSectors(
  items: AhenkContentCard[],
  defaults: AhenkContentCard[],
): AhenkContentCard[] {
  const bySlug = new Map(defaults.map((d) => [d.slug, d]));
  const mapped = items.map((c) => {
    const d = bySlug.get(c.slug);
    if (!d) return c;
    const hasMods =
      (c.features?.length ?? 0) > 0 && String(c.bodyHtml || "").includes("ahenk-mods");
    if (hasMods) {
      return { ...c, features: c.features?.length ? c.features : d.features };
    }
    return {
      ...c,
      excerpt: d.excerpt,
      bodyHtml: d.bodyHtml,
      features: d.features,
      icon: c.icon || d.icon,
      image: c.image || d.image,
    };
  });
  const seen = new Set(mapped.map((c) => c.slug));
  const extra = defaults.filter(
    (d) => (AHENK_SOFTWARE_APPEND_SLUGS as readonly string[]).includes(d.slug) && !seen.has(d.slug),
  );
  if (!extra.length) return mapped;
  const insertAt = mapped.findIndex((c) => c.slug === "kurumsal-sirket-sitesi");
  if (insertAt >= 0) return [...mapped.slice(0, insertAt), ...extra, ...mapped.slice(insertAt)];
  return [...mapped, ...extra];
}

function mergePromo(raw: unknown, defaults: AhenkPromoBlock): AhenkPromoBlock {
  if (!isRecord(raw)) return defaults;
  return {
    kicker: str(raw.kicker, defaults.kicker),
    title: str(raw.title, defaults.title),
    text: str(raw.text, defaults.text),
    ctaLabel: str(raw.ctaLabel, defaults.ctaLabel),
    ctaHref: str(raw.ctaHref, defaults.ctaHref),
    secondaryLabel: str(raw.secondaryLabel, defaults.secondaryLabel),
    secondaryHref: str(raw.secondaryHref, defaults.secondaryHref),
    image: safeAhenkImageUrl(raw.image, defaults.image ?? ""),
  };
}

function mergeFaqs(raw: unknown, defaults: AhenkFaq[]): AhenkFaq[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const items = raw
    .filter(isRecord)
    .map((f) => ({ q: str(f.q, ""), a: str(f.a, "") }))
    .filter((f) => f.q && f.a);
  if (!items.length) return defaults;
  const seen = new Set(items.map((f) => f.q.trim().toLowerCase()));
  for (const d of defaults) {
    if (!seen.has(d.q.trim().toLowerCase())) items.push(d);
  }
  return items;
}

function looksLikePricedHomeCopy(value: unknown): boolean {
  return /10\.000|10000\s*TL|Kurumsal 10/i.test(String(value ?? ""));
}

export function parseAhenkAgencySiteFromJson(raw: string | null | undefined): AhenkAgencySite {
  const defaults = defaultAhenkAgencySite();
  if (!raw || !String(raw).trim()) return defaults;
  try {
    const data = JSON.parse(String(raw)) as unknown;
    if (!isRecord(data)) return defaults;
    const useNewCopy = typeof data.seoTitle !== "string" || !String(data.seoTitle).trim();
    const refreshHomeCopy =
      useNewCopy ||
      looksLikePricedHomeCopy(data.heroTitle) ||
      looksLikePricedHomeCopy(data.heroSubtitle) ||
      looksLikePricedHomeCopy(data.heroSecondaryLabel) ||
      looksLikePricedHomeCopy(data.seoDescription) ||
      looksLikePricedHomeCopy(data.seoTitle) ||
      looksLikePricedHomeCopy(data.tagline);
    return {
      version: 2,
      brandName: str(data.brandName, defaults.brandName),
      tagline: refreshHomeCopy ? defaults.tagline : str(data.tagline, defaults.tagline),
      phone: str(data.phone, defaults.phone),
      phoneTel: str(data.phoneTel, defaults.phoneTel),
      whatsappTel: str(data.whatsappTel, defaults.whatsappTel),
      email: str(data.email, defaults.email),
      logoUrl: safeAhenkImageUrl(data.logoUrl, defaults.logoUrl),
      logoMarkUrl: safeAhenkImageUrl(data.logoMarkUrl, defaults.logoMarkUrl),
      seoTitle: refreshHomeCopy ? defaults.seoTitle : str(data.seoTitle, defaults.seoTitle),
      seoDescription: refreshHomeCopy ? defaults.seoDescription : str(data.seoDescription, defaults.seoDescription),
      seoKeywords: str(data.seoKeywords, defaults.seoKeywords),
      aiDeliveryLead: str(data.aiDeliveryLead, defaults.aiDeliveryLead),
      priceTitle: str(data.priceTitle, defaults.priceTitle),
      priceAmount: str(data.priceAmount, defaults.priceAmount),
      priceCurrency: str(data.priceCurrency, defaults.priceCurrency),
      pricePeriodNote: str(data.pricePeriodNote, defaults.pricePeriodNote),
      priceCampaignUntilYear: str(data.priceCampaignUntilYear, defaults.priceCampaignUntilYear),
      priceCampaignAmount: str(data.priceCampaignAmount, defaults.priceCampaignAmount),
      priceRegularAmount: str(data.priceRegularAmount, defaults.priceRegularAmount),
      priceIncludesNote: str(data.priceIncludesNote, defaults.priceIncludesNote),
      ibanBank: str(data.ibanBank, defaults.ibanBank),
      ibanHolder: str(data.ibanHolder, defaults.ibanHolder),
      iban: str(data.iban, defaults.iban).replace(/\s+/g, ""),
      faqs: mergeFaqs(data.faqs, defaults.faqs),
      hoursWeekday: str(data.hoursWeekday, defaults.hoursWeekday),
      hoursSunday: str(data.hoursSunday, defaults.hoursSunday),
      heroKicker: refreshHomeCopy ? defaults.heroKicker : str(data.heroKicker, defaults.heroKicker),
      heroTitle: refreshHomeCopy ? defaults.heroTitle : str(data.heroTitle, defaults.heroTitle),
      heroSubtitle: refreshHomeCopy ? defaults.heroSubtitle : str(data.heroSubtitle, defaults.heroSubtitle),
      heroCtaLabel: refreshHomeCopy ? defaults.heroCtaLabel : str(data.heroCtaLabel, defaults.heroCtaLabel),
      heroCtaHref: refreshHomeCopy ? defaults.heroCtaHref : str(data.heroCtaHref, defaults.heroCtaHref),
      heroSecondaryLabel: refreshHomeCopy
        ? defaults.heroSecondaryLabel
        : str(data.heroSecondaryLabel, defaults.heroSecondaryLabel),
      heroSecondaryHref: refreshHomeCopy
        ? defaults.heroSecondaryHref
        : str(data.heroSecondaryHref, defaults.heroSecondaryHref),
      heroImage: safeAhenkImageUrl(data.heroImage, defaults.heroImage),
      softwareTitle: useNewCopy ? defaults.softwareTitle : str(data.softwareTitle, defaults.softwareTitle),
      softwareLead:
        useNewCopy || !String(data.softwareLead || "").includes("görüntülü")
          ? defaults.softwareLead
          : str(data.softwareLead, defaults.softwareLead),
      softwareSectors: enrichSoftwareSectors(
        useNewCopy ? defaults.softwareSectors : mergeCards(data.softwareSectors, defaults.softwareSectors),
        defaults.softwareSectors,
      ),
      agencyTitle: useNewCopy ? defaults.agencyTitle : str(data.agencyTitle, defaults.agencyTitle),
      agencyLead: useNewCopy ? defaults.agencyLead : str(data.agencyLead, defaults.agencyLead),
      agencyOffers: mergeCards(data.agencyOffers, defaults.agencyOffers),
      yekpare: mergePromo(data.yekpare, defaults.yekpare),
      platformTitle: str(data.platformTitle, defaults.platformTitle),
      platformLead: str(data.platformLead, defaults.platformLead),
      platformProducts: mergeCards(data.platformProducts, defaults.platformProducts),
      haberMerkeziTitle: str(data.haberMerkeziTitle, defaults.haberMerkeziTitle),
      haberMerkeziLead: str(data.haberMerkeziLead, defaults.haberMerkeziLead),
      haberMerkeziHtml: str(data.haberMerkeziHtml, defaults.haberMerkeziHtml),
      yekparePageTitle: str(data.yekparePageTitle, defaults.yekparePageTitle),
      yekparePageHtml: str(data.yekparePageHtml, defaults.yekparePageHtml),
      aboutTitle: str(data.aboutTitle, defaults.aboutTitle),
      aboutHtml: str(data.aboutHtml, defaults.aboutHtml),
      aboutImage: safeAhenkImageUrl(data.aboutImage, defaults.aboutImage),
      ctaTitle: str(data.ctaTitle, defaults.ctaTitle),
      ctaText: str(data.ctaText, defaults.ctaText),
      servicesTitle: useNewCopy ? defaults.servicesTitle : str(data.servicesTitle, defaults.servicesTitle),
      servicesLead: useNewCopy ? defaults.servicesLead : str(data.servicesLead, defaults.servicesLead),
      servicesHeroImage: safeAhenkImageUrl(data.servicesHeroImage, defaults.servicesHeroImage),
      landingKicker: str(data.landingKicker, defaults.landingKicker),
      landingTitle: str(data.landingTitle, defaults.landingTitle),
      landingLead: str(data.landingLead, defaults.landingLead),
      landingCtaLabel: str(data.landingCtaLabel, defaults.landingCtaLabel),
      landingFeatures: mergeTextBlocks(data.landingFeatures, defaults.landingFeatures),
      offices: mergeOffices(data.offices, defaults.offices),
      slides: mergeSlides(data.slides, defaults.slides),
      services: mergeServices(data.services, defaults.services),
    };
  } catch {
    return defaults;
  }
}

export function serializeAhenkAgencySite(site: AhenkAgencySite): string {
  return JSON.stringify({ ...site, version: 2 });
}

export function findAhenkAgencyService(
  site: AhenkAgencySite,
  slug: string,
): AhenkAgencyService | null {
  const key = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!key) return null;
  if (AHENK_REMOVED_SERVICE_SLUGS.has(key)) return null;
  return site.services.find((s) => s.slug === key || s.aliases?.includes(key)) ?? null;
}

export function findAhenkContentCard(site: AhenkAgencySite, slug: string): AhenkContentCard | null {
  const key = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!key) return null;
  const match = (s: AhenkContentCard) =>
    s.slug === key || s.aliases?.includes(key) || s.aliases?.includes(`/${key}`) || s.href.endsWith(`/${key}`);
  return (
    site.softwareSectors.find(match) ??
    site.agencyOffers.find(match) ??
    site.platformProducts.find(match) ??
    null
  );
}

export function ahenkAgencyJsonFromSettings(settings: unknown): string | null {
  const rec = settings as { ahenkAgencyJson?: string | null } | null | undefined;
  const v = rec?.ahenkAgencyJson;
  return typeof v === "string" && v.trim() ? v : null;
}

export function isExternalAhenkHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}
