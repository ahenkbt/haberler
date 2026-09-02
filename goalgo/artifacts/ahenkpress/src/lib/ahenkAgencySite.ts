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
};

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

export type AhenkAgencySite = {
  version: 2;
  brandName: string;
  tagline: string;
  phone: string;
  phoneTel: string;
  email: string;
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
  lawyer: photo("photo-1589829545858-294fe4ee2d94"),
  doctor: photo("photo-1576091160399-112ba8d25d1d"),
  ngo: photo("photo-1559027615-cd4628902d4a"),
  city: photo("photo-1477959858617-67f85cf4f1df"),
  news: photo("photo-1504711434969-e33886168f5c"),
  shop: photo("photo-1556742049-0cfed4f6a45d"),
  restaurant: photo("photo-1414235077428-338989a2e8c0"),
  estate: photo("photo-1560518883-ce09059eeffa"),
  school: photo("photo-1523050854058-8df90110c9f1"),
  corporate: photo("photo-1497366811353-6870744d04b2"),
  design: photo("photo-1561070791-2526d30994b5"),
  code: photo("photo-1461749280684-dccba630e2f6"),
  social: photo("photo-1611162617474-5b21e879e113"),
  video: photo("photo-1492691527719-9d1e07e534b4"),
  ads: photo("photo-1460925895917-afdab827c52f"),
  seo: photo("photo-1432888498266-38ffec3eaf0a"),
  yekpare: photo("photo-1451187580459-43490279c0fa", 1600),
  yektube: photo("photo-1574717024653-61fd2cf4d44d"),
  newsmap: photo("photo-1524661132064-9658e512c88a"),
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
): AhenkContentCard {
  return { slug, title, excerpt, icon, href, bodyHtml, image };
}

function defaultSoftwareSectors(): AhenkContentCard[] {
  return [
    card(
      "avukat-sitesi",
      "Avukat & hukuk bürosu",
      "Dava alanları, avukat profilleri, randevu ve KVKK uyumlu kurumsal hukuk yazılımı.",
      "scale",
      "/yazilim/avukat-sitesi",
      `<h2>Avukat sitesi yazılımı</h2>
<p>Hukuk büroları için vitrin değil, güven mimarisi tasarlarız. Uzmanlık alanları, avukat kadrosu, yayınlar, randevu ve WhatsApp hattı tek bir prestij yüzeyinde birleşir. Baro ve reklam mevzuatına uygun dil, koyu mermer-tonlu tipografi, referans gizliliği.</p>
<p>İçerik paneliyle karar özetleri, SSS ve iletişim formları yönetilir. SEO, Google İşletme ve harita kaydı teslimata dahildir.</p>`,
      AHENK_PHOTOS.lawyer,
    ),
    card(
      "doktor-sitesi",
      "Doktor & sağlık kurumu",
      "Klinik, hastane ve hekim markası: randevu, birimler, bilimsel içerik, güven.",
      "heart",
      "/yazilim/doktor-sitesi",
      `<h2>Doktor ve klinik yazılımı</h2>
<p>Sağlıkta dijital yüz, tedavi kadar özen ister. Branş sayfaları, hekim özgeçmişleri, tıbbi içerik, randevu ve hasta iletişim formları klinik kimliğinize göre kodlanır.</p>
<p>Mobil öncelikli, sakin palet, tıbbi görsel yönetimi ve KVKK. Estetik cerrahiden diş kliniğine, tıp merkezinden özel muayenehaneye kadar dikey şablonlar değil özel mimari.</p>`,
      AHENK_PHOTOS.doctor,
    ),
    card(
      "dernek-vakif-sitesi",
      "Dernek & vakıf",
      "Bağış, üyelik, faaliyet, şehit-gazi ve kurumsal şeffaflık sayfaları.",
      "users",
      "/yazilim/dernek-vakif-sitesi",
      `<h2>Dernek ve vakıf yazılımı</h2>
<p>Sivil toplumun dijital kampüsü: faaliyetler, yönetim kurulu, bağış, burs, etkinlik takvimi ve arşiv. Vakıf senedi, şeffaflık raporları ve gönüllü formları panelden yönetilir.</p>
<p>Ahenk’in STK temaları ve Haber Merkezi entegrasyonu ile duyurular haber vitrinine de düşebilir.</p>`,
      AHENK_PHOTOS.ngo,
    ),
    card(
      "belediye-kamu-sitesi",
      "Belediye & kamu",
      "Duyuru, e-belediye yönlendirme, başkan mesajı, ihale ve mahalle haberleri.",
      "building",
      "/yazilim/belediye-kamu-sitesi",
      `<h2>Belediye ve kamu web yazılımı</h2>
<p>Vatandaşın ilk kapısı. Başkan mesajı, birimler, duyurular, ihaleler, proje haritası ve haber merkezi. Erişilebilirlik, Türkçe sade dil ve mobil hız kamu standardıdır.</p>`,
      AHENK_PHOTOS.city,
    ),
    card(
      "haber-medya-sitesi",
      "Haber & medya",
      "Manşet, son dakika, yazar, RSS ve Newsmap — Haber Merkezi altyapısı.",
      "news",
      "/yazilim/haber-medya-sitesi",
      `<h2>Haber sitesi yazılımı</h2>
<p>Gazete ve ajanslar için Haber Merkezi: manşet, kategori, köşe, video TV, Google News ve haber haritası. Özel alan adı, editör paneli, RSS. YekTube ile video yayın katmanı eklenebilir.</p>`,
      AHENK_PHOTOS.news,
    ),
    card(
      "e-ticaret-sitesi",
      "E-ticaret & marka mağazası",
      "Vitrin, sepet, ödeme, kargo ve performans reklamıyla satış makinesi.",
      "cart",
      "/yazilim/e-ticaret-sitesi",
      `<h2>E-ticaret yazılımı</h2>
<p>Ürün, stok, ödeme ve kargo akışını markanızın ritmine göre kurarız. Katalog fotoğrafı, QR menü ve çağrı merkezi sipariş sistemi ile omnichannel teslimat.</p>`,
      AHENK_PHOTOS.shop,
    ),
    card(
      "restoran-otel-sitesi",
      "Restoran & otel",
      "Rezervasyon, dijital menü, oda ve deneyim sayfaları.",
      "sparkle",
      "/yazilim/restoran-otel-sitesi",
      `<h2>Restoran ve otel yazılımı</h2>
<p>Menü, rezervasyon, galeri, konum ve KRAL POS / QR menü entegrasyonu. Otelde oda tipleri, müsaitlik ve deneyim hikâyesi.</p>`,
      AHENK_PHOTOS.restaurant,
    ),
    card(
      "emlak-insaat-sitesi",
      "Emlak & inşaat",
      "Proje vitrini, kat planı, teslim takvimi ve yatırım dili.",
      "building",
      "/yazilim/emlak-insaat-sitesi",
      `<h2>Emlak ve inşaat yazılımı</h2>
<p>Konut projeleri, arsa, ticari portföy. Kat planı, vaziyet, teslim tarihi, sanal tur ve lead formu. Yatırımcı sunum kalitesinde tipografi.</p>`,
      AHENK_PHOTOS.estate,
    ),
    card(
      "egitim-okul-sitesi",
      "Okul & eğitim",
      "Kayıt, akademik kadro, duyuru ve veli iletişimi.",
      "users",
      "/yazilim/egitim-okul-sitesi",
      `<h2>Eğitim kurumu yazılımı</h2>
<p>Okul, kurs ve üniversite birimleri için kayıt, kadro, akademik takvim, galeri ve duyuru. Güven ve aidiyet hissi taşıyan arayüz.</p>`,
      AHENK_PHOTOS.school,
    ),
    card(
      "kurumsal-sirket-sitesi",
      "Kurumsal şirket",
      "Holding, sanayi ve ihracat markaları için global İngilizce-Türkçe vitrin.",
      "pen",
      "/yazilim/kurumsal-sirket-sitesi",
      `<h2>Kurumsal web yazılımı</h2>
<p>Çok dilli şirket sitesi, yatırımcı ilişkileri, kariyer, sürdürülebilirlik ve ürün ailesi. Londra–Ankara ofis standartlarında teslimat.</p>`,
      AHENK_PHOTOS.corporate,
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
      "Kendi haber siteniz: manşet, RSS, yazar, tema ve özel domain.",
      "news",
      "/ucretsiz-haber-sitesi",
      `<p>White-label haber yazılımı. Editör paneli, vitrin temaları, köşe yazarları. Ücretsiz haber sitesi kurulumundan kurumsal gazete teslimatına kadar.</p>`,
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
    kicker: "Yekpare.net",
    title: "Türkiye’nin dijital kamusal katmanı",
    text: "Yekpare; harita, yerel hizmet, turizm ve keşif yüzeylerini tek çatıda birleştirir. Ahenk, Yekpare’nin teknoloji ve yayın omurgasını üretir — markanız bu ekosisteme bağlanabilir.",
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
    tagline: "Prestij yazılım evi ve kreatif ajans. Avukat, doktor, dernek ve küresel markalar için.",
    phone: "0541 313 62 45",
    phoneTel: "+905413136245",
    email: "ahenkbilgiteknoloji@gmail.com",
    hoursWeekday: "Pazartesi - Cumartesi 09:00 - 18:00",
    hoursSunday: "Pazar: Kapalı",
    heroKicker: "Yazılım evi · Kreatif ajans",
    heroTitle: "Avukat, doktor ve kurumlar için milyon dolarlık dijital yüz.",
    heroSubtitle:
      "Sektörel web yazılımı, marka stüdyosu ve yayın altyapısı. Operasyonel hizmetler ayrı bir katmanda; anasayfada yalnızca prestij işi.",
    heroCtaLabel: "Sektör yazılımı",
    heroCtaHref: "/yazilim",
    heroSecondaryLabel: "Ajans stüdyosu",
    heroSecondaryHref: "/ajans",
    heroImage: AHENK_PHOTOS.hero,
    softwareTitle: "Ön planda: sektör yazılımı",
    softwareLead:
      "Avukat, doktor, dernek ve vakıf sitelerinden belediye, haber, e-ticaret ve holding vitrinine. Her dikeyde size özel mimari.",
    softwareSectors: defaultSoftwareSectors(),
    agencyTitle: "Ajans stüdyosu",
    agencyLead: "Marka, yazılım, sosyal, film, reklam ve SEO — tek imza, tek ritim.",
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
    yekparePageHtml: `<p><strong>Yekpare.net</strong>, yerel keşif, harita ve kamusal dijital hizmetleri bir araya getiren platformdur. Ahenk Bilgi Teknolojileri, Yekpare’nin yazılım ve yayın omurgasını üretir.</p>
<p>Markanızı Yekpare ekosistemine bağlamak, sektör yazılımınızı harita ve keşif katmanına taşımak veya ortak yayın kurgulamak için bizimle görüşün.</p>
<p><a href="https://yekpare.net" rel="noreferrer">yekpare.net</a> adresinden platformu ziyaret edebilirsiniz.</p>`,
    aboutTitle: "Küresel markalarla çalışıyoruz",
    aboutHtml: `<p>Ahenk Bilgi Teknolojileri olarak Getir Yemek, Getir Çarşı, Migros Yemek ve Yemeksepeti gibi start up firmalarına verdiğimiz hizmetlerle tecrübe sahibiyiz. Teknolojik girişim şirketlerinin ihtiyaç duydukları tüm bilgi ve birikime sahibiz; birçok alanda hizmet sağlıyoruz.</p>
<p>Hedefimiz; yenilikçi uygulamalarıyla ülkemizin kamu kurumları ve özel sektör kuruluşlarına bilgi teknolojileri alanında en üst seviyede hizmet verebilmektir. Teknolojik girişim tekliflerine açığız.</p>
<p>Londra, Ankara, Batum, Bakü ve Cheyenne ofislerimizle yazılım, ajans ve kurumsal operasyonu tek çatıda yönetiriz.</p>`,
    aboutImage: AHENK_PHOTOS.about,
    ctaTitle: "Ofisimizde misafirimiz olun",
    ctaText:
      "Yazılım, ajans veya yayın projeniz için sizi Ankara, Londra veya Batum ofisimizde ağırlamaktan mutluluk duyarız.",
    servicesTitle: "Operasyonel hizmetler",
    servicesLead:
      "Çağrı merkezi, insan kaynakları, temizlik, e-ticaret destek, QR menü ve kurumsal organizasyon — saha ve operasyon katmanı.",
    servicesHeroImage: AHENK_PHOTOS.servicesHero,
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
        slug: "temizlik-hizmetleri",
        title: "Temizlik Hizmetleri",
        excerpt:
          "Ev, ofis, işyeri ve inşaat sonrası temizlik için aynı gün profesyonel ekip yönlendirmesi.",
        icon: "sparkle",
        image: AHENK_PHOTOS.cleaning,
        bodyHtml: `<h2>Temizlik Hizmetleri</h2>
<p>Yüzlerce profesyonel temizlikçi ağımız ile size yakınız. Yoğunluğa göre aynı gün içerisinde 1–3 saat gibi kısa bir sürede temizlikçi, istemiş olduğunuz adreste hazır bulunarak hizmete başlayabilir.</p>
<p>Kimlik ve adres bilgileri doğrulanmış, ciddi şikayet almamış, gerçek müşteri referanslarına sahip profesyoneller yönlendirilir. Gelişmiş eşleştirme ile ihtiyacınıza uygun temizlikçi bulunur.</p>
<h3>Sıfır Risk Sistemi</h3>
<p>Ödemenizi kart veya havale ile yapabilirsiniz. Temizlik sırasında oluşabilecek herhangi bir durumda ödemeniz aktarılmadan müdahale edilir; hizmet alamamanız durumunda paranız iade edilir. Satın aldığınız süre boyunca sürpriz ek ücret yoktur.</p>
<h3>Temizlik Hizmetlerimiz</h3>
<p>Ev, ofis, işyeri, villa ya da inşaat sonrası temizlik işleriniz için haftanın 7 günü rezervasyon yapılabilir.</p>`,
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
    .filter((s) => s.slug && s.title);
  return items.length ? items : defaults;
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
      };
    })
    .filter((c) => c.slug && c.title);
  return items.length ? items : defaults;
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

export function parseAhenkAgencySiteFromJson(raw: string | null | undefined): AhenkAgencySite {
  const defaults = defaultAhenkAgencySite();
  if (!raw || !String(raw).trim()) return defaults;
  try {
    const data = JSON.parse(String(raw)) as unknown;
    if (!isRecord(data)) return defaults;
    return {
      version: 2,
      brandName: str(data.brandName, defaults.brandName),
      tagline: str(data.tagline, defaults.tagline),
      phone: str(data.phone, defaults.phone),
      phoneTel: str(data.phoneTel, defaults.phoneTel),
      email: str(data.email, defaults.email),
      hoursWeekday: str(data.hoursWeekday, defaults.hoursWeekday),
      hoursSunday: str(data.hoursSunday, defaults.hoursSunday),
      heroKicker: str(data.heroKicker, defaults.heroKicker),
      heroTitle: str(data.heroTitle, defaults.heroTitle),
      heroSubtitle: str(data.heroSubtitle, defaults.heroSubtitle),
      heroCtaLabel: str(data.heroCtaLabel, defaults.heroCtaLabel),
      heroCtaHref: str(data.heroCtaHref, defaults.heroCtaHref),
      heroSecondaryLabel: str(data.heroSecondaryLabel, defaults.heroSecondaryLabel),
      heroSecondaryHref: str(data.heroSecondaryHref, defaults.heroSecondaryHref),
      heroImage: safeAhenkImageUrl(data.heroImage, defaults.heroImage),
      softwareTitle: str(data.softwareTitle, defaults.softwareTitle),
      softwareLead: str(data.softwareLead, defaults.softwareLead),
      softwareSectors: mergeCards(data.softwareSectors, defaults.softwareSectors),
      agencyTitle: str(data.agencyTitle, defaults.agencyTitle),
      agencyLead: str(data.agencyLead, defaults.agencyLead),
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
      servicesTitle: str(data.servicesTitle, defaults.servicesTitle),
      servicesLead: str(data.servicesLead, defaults.servicesLead),
      servicesHeroImage: safeAhenkImageUrl(data.servicesHeroImage, defaults.servicesHeroImage),
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
  return site.services.find((s) => s.slug === key || s.aliases?.includes(key)) ?? null;
}

export function findAhenkContentCard(site: AhenkAgencySite, slug: string): AhenkContentCard | null {
  const key = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!key) return null;
  return (
    site.softwareSectors.find((s) => s.slug === key) ??
    site.agencyOffers.find((s) => s.slug === key) ??
    site.platformProducts.find((s) => s.slug === key) ??
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
