/**
 * Vatan theme — VKD / vatankahramanlari.org site-wide heritage memorial skin.
 * Theme id: `vatan`. CSS namespace: `[data-hm-vitrin-theme="vatan"]`, `.vatan-*`.
 */

export const VATAN_THEME_ID = "vatan" as const;

export const VATAN_ASSET_BASE = "/vkd/vatan";

export const VATAN_ASSETS = {
  canakkaleHero: `${VATAN_ASSET_BASE}/canakkale-hero.jpg`,
  memorialPillars: `${VATAN_ASSET_BASE}/memorial-pillars.jpg`,
  milliGunler: `${VATAN_ASSET_BASE}/milli-gunler.jpg`,
  sehitlik: `${VATAN_ASSET_BASE}/sehitlik.jpg`,
  terorleMucadele: `${VATAN_ASSET_BASE}/terorle-mucadele.jpg`,
  haklar: `${VATAN_ASSET_BASE}/haklar.jpg`,
  guvenlikGucleri: `${VATAN_ASSET_BASE}/guvenlik-gucleri.jpg`,
  sehitlerimiz: `${VATAN_ASSET_BASE}/sehitlerimiz.jpg`,
} as const;

export const VATAN_COLORS = {
  crimson: "#8C1A2E",
  crimsonDeep: "#6B1222",
  navy: "#0B1C33",
  navyDeep: "#071422",
  gold: "#C9A84C",
  goldSoft: "#E8D5A3",
  ivory: "#F6F1E8",
  ink: "#16181C",
} as const;

export type VatanMemorialCard = {
  slug: string;
  href: string;
  title: string;
  kicker: string;
  excerpt: string;
  image: string;
  imageAlt: string;
};

/** Homepage CTA cards — Çanakkale Tarihî Alan Başkanlığı hissi: net bölüm, onurlu görsel, kısa çağrı. */
export const VATAN_MEMORIAL_CARDS: VatanMemorialCard[] = [
  {
    slug: "sehitlerimiz",
    href: "/sehitlerimiz",
    title: "Şehitlerimiz",
    kicker: "Hatıra defteri",
    excerpt:
      "Millî Savunma Bakanlığı kaynaklı şehit kayıtları. Ad, rütbe ve yıl ile arayın; hatırayı canlı tutun.",
    image: VATAN_ASSETS.sehitlerimiz,
    imageAlt: "Gece vakti anıt terasında yanan ebedî ateş",
  },
  {
    slug: "canakkale-sehitleri",
    href: "/canakkale-sehitleri",
    title: "Çanakkale Şehitleri",
    kicker: "1915 · Gelibolu",
    excerpt:
      "Çanakkale Cephesi şehit listesi. Ad, baba adı, il ve sıra numarasına göre saygıyla sorgulayın.",
    image: VATAN_ASSETS.canakkaleHero,
    imageAlt: "Çanakkale kıyısında bayrak ve anıt, gelincik motifleriyle",
  },
  {
    slug: "sehitliklerimiz",
    href: "/sehitliklerimiz",
    title: "Şehitliklerimiz",
    kicker: "Hafıza mekânları",
    excerpt:
      "Gelibolu’dan Edirnekapı’ya, yurt içi ve yurt dışı şehitlikler. Ziyaret ve vefa rehberi.",
    image: VATAN_ASSETS.sehitlik,
    imageAlt: "Taş kabartma yaprak ve çiçek motifli şehitlik levhası",
  },
  {
    slug: "terorle-mucadele",
    href: "/terorle-mucadele",
    title: "Terörle Mücadele Şehitleri",
    kicker: "Vefa ve hatıra",
    excerpt:
      "Terörle mücadelede hayatını veren güvenlik güçlerimizi anıyoruz. Resmî listeler ve ailelere vefa.",
    image: VATAN_ASSETS.terorleMucadele,
    imageAlt: "Zeytin ağacı ve kırmızı kapılı anıt bahçe yolu",
  },
  {
    slug: "sehit-gazi-haklari",
    href: "/sehit-gazi-haklari",
    title: "Haklarımız",
    kicker: "Şehit ve gazi hakları",
    excerpt:
      "Yasal haklar, başvuru yolları ve kurumlar. Ailelerin yanında duran açık, sade bir haklar rehberi.",
    image: VATAN_ASSETS.haklar,
    imageAlt: "Açık kitap üzerinde altın terazi",
  },
  {
    slug: "guvenlik-gucleri",
    href: "/guvenlik-gucleri",
    title: "Güvenlik Güçleri",
    kicker: "TSK · Jandarma · Emniyet",
    excerpt:
      "Kara, deniz, hava, jandarma, emniyet ve sahil güvenlik. Kurumsal vefa ve hatıra sayfası.",
    image: VATAN_ASSETS.guvenlikGucleri,
    imageAlt: "Alacakaranlıkta granit anıt ve ebedî ateş",
  },
  {
    slug: "milli-gunler",
    href: "/milli-gunler",
    title: "Millî Günler",
    kicker: "Takvim ve anlam",
    excerpt:
      "18 Mart, 19 Mayıs, 30 Ağustos, 29 Ekim ve diğer millî günler. Anlamı, tarihi, vefa programı.",
    image: VATAN_ASSETS.milliGunler,
    imageAlt: "Anadolu şafağı, hilal ve gelincik motifli geometrik manzara",
  },
];

export type VatanLongformSection = {
  eyebrow: string;
  title: string;
  body: string[];
  image?: string;
  imageAlt?: string;
  cards?: { title: string; text: string; href?: string }[];
};

export type VatanLongformPage = {
  slug: string;
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  heroImage: string;
  heroAlt: string;
  sections: VatanLongformSection[];
};

export const VATAN_LONGFORM_PAGES: Record<string, VatanLongformPage> = {
  "sehitliklerimiz": {
    slug: "sehitliklerimiz",
    eyebrow: "Hafıza mekânları",
    title: "Şehitliklerimiz",
    accent: "Toprak, taş ve isim",
    lead:
      "Şehitlikler, bir milletin hatırasını mekâna çevirir. Vatan Kahramanları Derneği, yurt içi ve yurt dışındaki şehitlikleri ziyaret, bakım ve vefa bilinciyle gündemde tutar. Bu sayfa resmi bir envanter yerine, herkesin ulaşabileceği bir vefa rehberidir.",
    heroImage: VATAN_ASSETS.sehitlik,
    heroAlt: "Taş kabartma yaprak motifli şehitlik levhası",
    sections: [
      {
        eyebrow: "Neden şehitlik",
        title: "İsimlerin durduğu yer",
        body: [
          "Bir şehitlik yalnızca mezarlık değildir. Taşın üzerine işlenen ad, bir ailenin kaybını kamu vicdanına emanet eder. Ziyaretçi sessiz durur; çocuklar isimleri okur; devlet ve toplum aynı satırda buluşur.",
          "Derneğimiz, şehit yakınlarının bu mekânlara ulaşmasını, bakım ve anma programlarının görünür olmasını ve ziyaret adabının saygıyla aktarılmasını görev bilir. Uydurma isim veya olay anlatılmaz; kayıtlar resmî kaynaklara dayanır.",
        ],
      },
      {
        eyebrow: "Yurt içi",
        title: "Bilinen şehitlik ve anıtlar",
        body: [
          "Aşağıdaki yerler kamuya açık, tarihî ve resmî hafıza mekânlarıdır. Ziyaret saatleri, yol tarifi ve bakım sorumluluğu ilgili valilik, belediye veya bakanlık biriminden teyit edilmelidir.",
        ],
        cards: [
          {
            title: "Çanakkale Şehitlikleri",
            text: "Gelibolu Yarımadası Tarihî Millî Parkı içinde 57. Alay, Şehitler Abidesi ve cephe mezarlıkları. Çanakkale Savaşları’nın mekânsal hafızası.",
            href: "/canakkale-sehitleri",
          },
          {
            title: "Edirnekapı Şehitliği",
            text: "İstanbul’da Kurtuluş Savaşı ve sonraki dönem şehitlerinin yattığı büyük şehitliklerden biri. Resmî anma törenlerinin sık düzenlendiği bir durak.",
          },
          {
            title: "Kore ve Kıbrıs anıtları",
            text: "Kore Savaşı ve Kıbrıs Barış Harekâtı’na dair yurt içi anıt ve şehitlikler, dış harekâtın içerdeki hatırasını taşır.",
            href: "/savaslar",
          },
          {
            title: "İl ve ilçe şehitlikleri",
            text: "Hemen her ilde yerel şehitlik bulunur. Bakım çoğu kez belediye, il özel idaresi ve şehit aileleri dernekleriyle ortak yürütülür.",
          },
        ],
      },
      {
        eyebrow: "Ziyaret",
        title: "Saygı ve sadelik",
        body: [
          "Şehitlikte yüksek ses, ticari çekim ve siyasi slogan yer almaz. Çiçek bırakmak, Fatiha okumak veya sessiz durmak yeterlidir. Çocuklara isimleri okutmak, hatırayı bir sonraki kuşağa aktarmanın en sade yoludur.",
          "Yurt dışı şehitlikler (Kore, Kıbrıs, Libya, Suriye hattı ve büyükelçilik gözetimindeki mezarlıklar) Dışişleri ve MSB koordinasyonundadır. Aileler ziyaret için ilgili ataşelik veya dernek üzerinden bilgi alabilir.",
        ],
        image: VATAN_ASSETS.terorleMucadele,
        imageAlt: "Zeytin ağaçlı anıt bahçe yolu",
      },
    ],
  },
  "terorle-mucadele": {
    slug: "terorle-mucadele",
    eyebrow: "Vefa",
    title: "Terörle Mücadele Şehitleri",
    accent: "İsimler resmî kayıttadır",
    lead:
      "Terörle mücadelede hayatını kaybeden Türk Silahlı Kuvvetleri, Jandarma, Emniyet, Sahil Güvenlik ve diğer güvenlik görevlilerini minnetle anıyoruz. Bu sayfada uydurma kahramanlık hikâyesi yoktur; hatıra, resmî listeler ve ailelerin hakkı üzerinedir.",
    heroImage: VATAN_ASSETS.terorleMucadele,
    heroAlt: "Zeytin ağacı ve kırmızı kapılı anıt bahçe",
    sections: [
      {
        eyebrow: "Kayıt",
        title: "Nereden bakılır",
        body: [
          "Millî Savunma Bakanlığı, Jandarma Genel Komutanlığı ve Emniyet Genel Müdürlüğü şehit duyurularını kendi resmî kanallarından yayımlar. Derneğimiz vitrininde MSB kaynaklı liste /sehitlerimiz adresinde aranabilir.",
          "Bir ismi burada uydurmak veya süslemek, aileye ve kayda ihanettir. Eksik veya güncel olmayan bir satır görürseniz resmî kaynağı esas alın; derneğe bildirim için talep formu açıktır.",
        ],
        cards: [
          {
            title: "MSB şehit listesi",
            text: "Kara, deniz ve hava unsurlarına dair yayımlanan şehit kayıtları. Ad, rütbe ve yıl ile arayın.",
            href: "/sehitlerimiz",
          },
          {
            title: "Haklar rehberi",
            text: "Şehit yakınları ve gaziler için yasal haklar, başvuru kurumları ve belgeler.",
            href: "/sehit-gazi-haklari",
          },
        ],
      },
      {
        eyebrow: "Vefa",
        title: "Ailelerin yanında",
        body: [
          "Terörle mücadele şehitlerinin yakınları; eğitim, sağlık, istihdam ve sosyal yardım haklarına sahiptir. Bu hakların takibi Aile ve Sosyal Hizmetler Bakanlığı, ilgili kuvvet komutanlığı ve dernekler aracılığıyla yürür.",
          "Vatan Kahramanları Derneği, ailelerin başvurusunu dinler, doğru kuruma yönlendirir ve hatırayı millî günlerde görünür kılar. Gösteriş değil, süreklilik esastır.",
        ],
        image: VATAN_ASSETS.sehitlerimiz,
        imageAlt: "Anıt terasında yanan ebedî ateş",
      },
    ],
  },
  "guvenlik-gucleri": {
    slug: "guvenlik-gucleri",
    eyebrow: "Kurumsal vefa",
    title: "Güvenlik Güçleri",
    accent: "Görev, nizam, hatıra",
    lead:
      "Türkiye Cumhuriyeti’nin güvenlik mimarisi; Türk Silahlı Kuvvetleri, Jandarma Genel Komutanlığı, Emniyet Genel Müdürlüğü, Sahil Güvenlik Komutanlığı ve istihbarat kurumlarından oluşur. Bu sayfa bir kuvvet tanıtımı değil, görevin ve hatıranın kurumsal çerçevesidir.",
    heroImage: VATAN_ASSETS.guvenlikGucleri,
    heroAlt: "Alacakaranlıkta granit anıt ve ebedî ateş",
    sections: [
      {
        eyebrow: "Kuvvetler",
        title: "Aynı vatan, ayrı görev",
        body: [
          "Kara, Deniz ve Hava Kuvvetleri ile Jandarma ve Sahil Güvenlik, Millî Savunma ve İçişleri hatlarında birbirini tamamlayan görev yürütür. Emniyet Genel Müdürlüğü asayiş, kaçakçılık ve terörle mücadelede sivil kolluk görevini taşır.",
          "Şehit ve gazi kayıtları kuvvetlere göre ayrı resmî kanallarda tutulur. Dernek vitrini bu kayıtları tek bir saygı zemininde buluşturur; kuvvetlerin kendi teşkilat ve rütbe nizamına karışmaz.",
        ],
        cards: [
          {
            title: "Türk Silahlı Kuvvetleri",
            text: "Kara, Deniz, Hava. Şehit listesi MSB kaynağıyla /sehitlerimiz sayfasındadır.",
            href: "/sehitlerimiz",
          },
          {
            title: "Jandarma ve Sahil Güvenlik",
            text: "Kırsal güvenlik, sınır ve deniz yetki alanı. Şehit duyuruları ilgili komutanlık kanallarındadır.",
          },
          {
            title: "Emniyet Genel Müdürlüğü",
            text: "Şehir asayişi ve terörle mücadele. Polis şehitleri EGM resmî duyurularıyla kayda geçer.",
          },
        ],
      },
      {
        eyebrow: "Hatıra",
        title: "Üniforma değil, isim",
        body: [
          "Anma, rütbeden önce isimledir. Bir şehitlik taşında yazan ad; bir annenin, bir birliğin ve bir köyün ortak cümlesidir. Dernek, bu cümleyi süslemeden aktarır.",
          "Güvenlik güçleri ile ilgili haberler sitemizde Şehit-Gazi ve Derneğimiz kategorilerinde yer alır. Resmî açıklama yokken spekülasyon yapılmaz.",
        ],
        image: VATAN_ASSETS.memorialPillars,
        imageAlt: "Alacakaranlıkta dikili granit sütunlar ve hilal",
      },
    ],
  },
  "sehit-gazi-haklari": {
    slug: "sehit-gazi-haklari",
    eyebrow: "Haklar rehberi",
    title: "Şehit ve Gazi Hakları",
    accent: "Kanun açık, başvuru sade olmalı",
    lead:
      "Şehit yakınları ve gaziler; aylık, tazminat, eğitim, sağlık, istihdam ve sosyal yardım haklarına sahiptir. Bu sayfa hukuki tavsiye yerine, kamuya açık kanun ve kurumları toplayan bir yönlendirme metnidir. Güncel belge ve oranlar için ilgili bakanlık birimine başvurun.",
    heroImage: VATAN_ASSETS.haklar,
    heroAlt: "Açık kitap üzerinde altın terazi",
    sections: [
      {
        eyebrow: "Çerçeve",
        title: "Temel mevzuat",
        body: [
          "Nakdi tazminat ve aylık bağlanması 2330 sayılı Kanun çerçevesinde yürütülür. Terörle mücadele kapsamında hayatını kaybedenler ve malul olanlar için 3713 sayılı Terörle Mücadele Kanunu ek haklar öngörür. Sosyal güvenlik ilişkisi 5510 sayılı Kanun ve ilgili yönetmeliklerle kurulur.",
          "Hak sahibi kimdir, hangi evrak gerekir, başvuru nereye yapılır — bunlar olayın niteliğine (görev şehidi, vazife malulü, terör) göre değişir. İlk durak ilgili kuvvet personel birimi veya Aile ve Sosyal Hizmetler il müdürlüğüdür.",
        ],
        cards: [
          {
            title: "Aile ve Sosyal Hizmetler",
            text: "Şehit yakını ve gazi kartı, sosyal yardım ve il müdürlüğü başvuruları.",
          },
          {
            title: "MSB / EGM / Jandarma",
            text: "Görev belgesi, şehitlik/maluliyet tespiti ve özlük işlemleri ilgili kuvvettedir.",
          },
          {
            title: "Eğitim bursları",
            text: "Şehit ve gazi çocukları için KYK ve bakanlık burs programları dönem dönem ilan edilir.",
            href: "/burs",
          },
          {
            title: "Uluslararası haklar",
            text: "Yurt dışı şehit-gazi kuruluşları ve karşılaştırmalı çerçeve ayrı sayfadadır.",
            href: "/uluslararasi-sehit-gazi-haklari",
          },
        ],
      },
      {
        eyebrow: "Dernek",
        title: "Yanınızdayız, yerinize geçmeyiz",
        body: [
          "Vatan Kahramanları Derneği, aileyi dinler, evrak listesini sadeleştirir ve doğru kuruma yönlendirir. Karar mercisi değildir; mahkeme veya bakanlık yerine geçmez.",
          "Hukuk ve savunuculuk sayfamız ile talep formu, somut başvurular içindir. Acil ve resmî işlemler her zaman ilgili kamu kurumunun evrak kaydıyla yürür.",
        ],
        image: VATAN_ASSETS.haklar,
        imageAlt: "Kitap ve adalet terazisi",
      },
    ],
  },
};

export const VATAN_HOME_HERO = {
  eyebrow: "Vatan Kahramanları Derneği",
  title: "Hatıra, hak ve vefa",
  accent: "tek çatıda",
  lead:
    "Şehitlerimizin isimleri resmî kayıttadır. Dernek; hatırayı yaşatır, ailelerin yanında durur, millî günleri sükûnetle anar.",
  image: VATAN_ASSETS.canakkaleHero,
  imageAlt: "Çanakkale kıyısında bayrak, anıt ve gelincikler",
  primaryHref: "/sehitlerimiz",
  primaryLabel: "Şehitlerimiz",
  secondaryHref: "/hakkimizda",
  secondaryLabel: "Derneği tanı",
} as const;

export const VATAN_DEFAULT_SLIDER_ITEMS = [
  {
    id: "vatan-slide-canakkale",
    title: "Çanakkale Şehitleri",
    subtitle: "Gelibolu’nun isimleri aranabilir kayıtta. Hatırayı canlı tutun.",
    href: "/canakkale-sehitleri",
    imageUrl: VATAN_ASSETS.canakkaleHero,
    color: VATAN_COLORS.gold,
    order: 1,
    active: true,
  },
  {
    id: "vatan-slide-sehitler",
    title: "Şehitlerimizi Anıyoruz",
    subtitle: "MSB kaynaklı liste. Ad, rütbe ve yıl ile saygıyla arayın.",
    href: "/sehitlerimiz",
    imageUrl: VATAN_ASSETS.sehitlerimiz,
    color: VATAN_COLORS.gold,
    order: 2,
    active: true,
  },
  {
    id: "vatan-slide-milli",
    title: "Millî Günler",
    subtitle: "18 Mart, 19 Mayıs, 30 Ağustos, 29 Ekim. Anlamı ve vefa takvimi.",
    href: "/milli-gunler",
    imageUrl: VATAN_ASSETS.milliGunler,
    color: VATAN_COLORS.gold,
    order: 3,
    active: true,
  },
];

export const VATAN_MENU_ITEMS: { id: string; label: string; href: string; parentId: string }[] = [
  { id: "vkd-menu-kah-teror", label: "Terörle Mücadele Şehitleri", href: "/terorle-mucadele", parentId: "vkd-menu-kahramanlar" },
  { id: "vkd-menu-kah-guvenlik", label: "Güvenlik Güçleri", href: "/guvenlik-gucleri", parentId: "vkd-menu-kahramanlar" },
];

const VATAN_LONGFORM_SLUGS = new Set(Object.keys(VATAN_LONGFORM_PAGES));

export function isVatanLongformSlug(slug: string | null | undefined): boolean {
  return VATAN_LONGFORM_SLUGS.has(String(slug ?? "").trim().toLowerCase());
}

export function getVatanLongformPage(slug: string | null | undefined): VatanLongformPage | null {
  const key = String(slug ?? "").trim().toLowerCase();
  return VATAN_LONGFORM_PAGES[key] ?? null;
}

export function isHmVatanThemeId(theme: string | null | undefined): boolean {
  return String(theme ?? "").trim().toLowerCase() === VATAN_THEME_ID;
}
