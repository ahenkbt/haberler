/**
 * Vatan theme — VKD / vatankahramanlari.org site-wide heritage memorial skin.
 * Theme id: `vatan`. CSS namespace: `[data-hm-vitrin-theme="vatan"]`, `.vatan-*`.
 */

export const VATAN_THEME_ID = "vatan" as const;

export const VATAN_ASSET_BASE = "/vkd/vatan";

export const VATAN_ASSETS = {
  logo: `${VATAN_ASSET_BASE}/logo.png`,
  canakkaleHero: `${VATAN_ASSET_BASE}/canakkale-hero.jpg`,
  memorialPillars: `${VATAN_ASSET_BASE}/memorial-pillars.jpg`,
  milliGunler: `${VATAN_ASSET_BASE}/milli-gunler.jpg`,
  sehitlik: `${VATAN_ASSET_BASE}/sehitlik.jpg`,
  terorleMucadele: `${VATAN_ASSET_BASE}/terorle-mucadele.jpg`,
  haklar: `${VATAN_ASSET_BASE}/haklar.jpg`,
  guvenlikGucleri: `${VATAN_ASSET_BASE}/guvenlik-gucleri.jpg`,
  sehitlerimiz: `${VATAN_ASSET_BASE}/sehitlerimiz.jpg`,
  ataturk: `${VATAN_ASSET_BASE}/ataturk.jpg`,
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
      "Şehitlerimizin isimlerini ad, rütbe veya yılla arayabilirsiniz.",
    image: VATAN_ASSETS.sehitlerimiz,
    imageAlt: "Gece vakti anıt terasında yanan ebedî ateş",
  },
  {
    slug: "canakkale-sehitleri",
    href: "/canakkale-sehitleri",
    title: "Çanakkale Şehitleri",
    kicker: "1915 · Gelibolu",
    excerpt:
      "Çanakkale’de yatan şehitlerimizi adıyla, baba adıyla veya memleketiyle arayın.",
    image: VATAN_ASSETS.canakkaleHero,
    imageAlt: "Çanakkale kıyısında bayrak ve anıt, gelincik motifleriyle",
  },
  {
    slug: "sehitliklerimiz",
    href: "/sehitliklerimiz",
    title: "Şehitliklerimiz",
    kicker: "Ziyaret",
    excerpt:
      "Gelibolu’dan Edirnekapı’ya, yurt içi ve yurt dışı şehitliklerimiz.",
    image: VATAN_ASSETS.sehitlik,
    imageAlt: "Taş kabartma yaprak ve çiçek motifli şehitlik levhası",
  },
  {
    slug: "terorle-mucadele",
    href: "/terorle-mucadele",
    title: "Terörle Mücadele Şehitleri",
    kicker: "Vefa ve hatıra",
    excerpt:
      "Terörle mücadelede hayatını verenleri minnetle anıyoruz. Ailelerinin yanındayız.",
    image: VATAN_ASSETS.terorleMucadele,
    imageAlt: "Zeytin ağacı ve kırmızı kapılı anıt bahçe yolu",
  },
  {
    slug: "sehit-gazi-haklari",
    href: "/sehit-gazi-haklari",
    title: "Haklarımız",
    kicker: "Şehit ve gazi hakları",
    excerpt:
      "Haklarınız var. Başvuruda yanınızdayız.",
    image: VATAN_ASSETS.haklar,
    imageAlt: "Açık kitap üzerinde altın terazi",
  },
  {
    slug: "guvenlik-gucleri",
    href: "/guvenlik-gucleri",
    title: "Güvenlik Güçleri",
    kicker: "TSK · Jandarma · Emniyet",
    excerpt:
      "Kara, deniz, hava, jandarma, emniyet ve sahil güvenlik. Aynı vatan, ayrı görev.",
    image: VATAN_ASSETS.guvenlikGucleri,
    imageAlt: "Alacakaranlıkta granit anıt ve ebedî ateş",
  },
  {
    slug: "milli-gunler",
    href: "/milli-gunler",
    title: "Millî Günler",
    kicker: "Takvim ve anlam",
    excerpt:
      "18 Mart, 19 Mayıs, 30 Ağustos, 29 Ekim… Unutmadığımız günler.",
    image: VATAN_ASSETS.milliGunler,
    imageAlt: "Anadolu şafağı, hilal ve gelincik motifli geometrik manzara",
  },
];

/** Anasayfa ikinci ızgara — Atatürk Köşesi ve mevcut kurum/hafıza sayfaları. */
export const VATAN_HERITAGE_CARDS: VatanMemorialCard[] = [
  {
    slug: "ataturk",
    href: "/ataturk",
    title: "Atatürk Köşesi",
    kicker: "Cumhuriyet hafızası",
    excerpt:
      "Hayatı, kronolojisi, ilkeleri ve sözleri.",
    image: VATAN_ASSETS.ataturk,
    imageAlt: "Alacakaranlıkta granit sütunlu anıt terası ve Türk bayrağı",
  },
  {
    slug: "kultur-portali",
    href: "/kultur-portali",
    title: "Kültür Portalı",
    kicker: "Müze · sanat · yer",
    excerpt:
      "Gezilecek yerler, müzeler ve sanat. Kapımız kültürümüze de açık.",
    image: VATAN_ASSETS.milliGunler,
    imageAlt: "Anadolu şafağı ve geometrik gelincik motifi",
  },
  {
    slug: "savaslar",
    href: "/savaslar",
    title: "Savaşlar ve Harekât",
    kicker: "Tarih sayfaları",
    excerpt:
      "Çanakkale, Kurtuluş, Kore ve Kıbrıs. Milletimizin yazdığı destanlar.",
    image: VATAN_ASSETS.canakkaleHero,
    imageAlt: "Çanakkale kıyısında bayrak ve anıt",
  },
  {
    slug: "hakkimizda",
    href: "/hakkimizda",
    title: "Derneğimiz",
    kicker: "Kurumsal",
    excerpt:
      "Hakkımızda, genel başkan, faaliyetler ve bağış. Derneğimizi yakından tanıyın.",
    image: VATAN_ASSETS.sehitlerimiz,
    imageAlt: "Anıt terasında yanan ebedî ateş",
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
    eyebrow: "Şehitliklerimiz",
    title: "Şehitliklerimiz",
    accent: "Ziyaret edin, hatırlayın",
    lead:
      "Şehitlikler, isimlerin durduğu yerlerdir. Gelibolu’dan Edirnekapı’ya, yurt içi ve yurt dışı şehitliklerimizi ziyaret edin; hatıralarına sahip çıkın.",
    heroImage: VATAN_ASSETS.sehitlik,
    heroAlt: "Taş kabartma yaprak motifli şehitlik levhası",
    sections: [
      {
        eyebrow: "Neden şehitlik",
        title: "İsimlerin durduğu yer",
        body: [
          "Bir şehitlik yalnızca mezarlık değildir. Taşın üzerine işlenen ad, bir ailenin kaybını hepimizin vicdanına emanet eder. Ziyaretçi sessiz durur; çocuklar isimleri okur.",
          "Derneğimiz, şehit yakınlarının bu mekânlara ulaşmasını ister. Bakım, anma ve ziyaret adabı saygıyla aktarılır. Uydurma isim veya hikâye anlatmayız.",
        ],
      },
      {
        eyebrow: "Yurt içi",
        title: "Bilinen şehitlik ve anıtlar",
        body: [
          "Aşağıdaki yerler herkese açıktır. Ziyaret saati ve yol tarifi için valilik, belediye veya ilgili bakanlığa bakmanız iyi olur.",
        ],
        cards: [
          {
            title: "Çanakkale Şehitlikleri",
            text: "Gelibolu’da 57. Alay, Şehitler Abidesi ve cephe mezarlıkları. Çanakkale’nin hatırası burada durur.",
            href: "/canakkale-sehitleri",
          },
          {
            title: "Edirnekapı Şehitliği",
            text: "İstanbul’da Kurtuluş Savaşı ve sonraki dönem şehitlerimizin yattığı büyük şehitliklerden biri.",
          },
          {
            title: "Kore ve Kıbrıs anıtları",
            text: "Kore Savaşı ve Kıbrıs Barış Harekâtı’nın yurt içindeki hatırası.",
            href: "/savaslar",
          },
          {
            title: "İl ve ilçe şehitlikleri",
            text: "Hemen her ilde bir şehitlik vardır. Bakımı çoğu kez belediye ve şehit aileleriyle birlikte yürür.",
          },
        ],
      },
      {
        eyebrow: "Ziyaret",
        title: "Saygı ve sadelik",
        body: [
          "Şehitlikte yüksek ses, ticari çekim ve siyasi slogan yer almaz. Çiçek bırakmak, Fatiha okumak veya sessiz durmak yeterlidir. Çocuklara isimleri okutmak, hatırayı bir sonraki kuşağa aktarmanın en sade yoludur.",
          "Yurt dışı şehitlikler (Kore, Kıbrıs ve büyükelçilik gözetimindeki mezarlıklar) Dışişleri ve MSB ile birlikte yürütülür. Aileler ziyaret için ataşelik veya dernek üzerinden bilgi alabilir.",
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
    accent: "Minnetle anıyoruz",
    lead:
      "Terörle mücadelede hayatını veren askerimizi, polisimizi, jandarmamızı ve sahil güvenlik mensuplarımızı minnetle anıyoruz. Ailelerinin yanındayız.",
    heroImage: VATAN_ASSETS.terorleMucadele,
    heroAlt: "Zeytin ağacı ve kırmızı kapılı anıt bahçe",
    sections: [
      {
        eyebrow: "Kayıt",
        title: "İsimlerini arayın",
        body: [
          "Millî Savunma Bakanlığı, Jandarma ve Emniyet şehit duyurularını kendi kanallarından yayımlar. Sitemizde MSB listesine /sehitlerimiz adresinden bakabilirsiniz.",
          "Bir ismi burada uydurmak veya süslemek, aileye ihanettir. Eksik bir satır görürseniz bize yazın; kaynağı birlikte kontrol ederiz.",
        ],
        cards: [
          {
            title: "MSB şehit listesi",
            text: "Kara, deniz ve hava. Ad, rütbe ve yılla arayın.",
            href: "/sehitlerimiz",
          },
          {
            title: "Haklar rehberi",
            text: "Şehit yakınları ve gaziler için haklar, başvuru ve belgeler.",
            href: "/sehit-gazi-haklari",
          },
        ],
      },
      {
        eyebrow: "Vefa",
        title: "Ailelerin yanında",
        body: [
          "Terörle mücadele şehitlerinin yakınlarının eğitim, sağlık, iş ve sosyal yardım hakları vardır. Bu hakların takibi Aile ve Sosyal Hizmetler, ilgili kuvvet ve dernekler eliyle yürür.",
          "Vatan Kahramanları Derneği aileyi dinler, doğru kapıya yönlendirir ve hatırayı millî günlerde yaşatır. Gösteriş değil, süreklilik.",
        ],
        image: VATAN_ASSETS.sehitlerimiz,
        imageAlt: "Anıt terasında yanan ebedî ateş",
      },
    ],
  },
  "guvenlik-gucleri": {
    slug: "guvenlik-gucleri",
    eyebrow: "Vefa",
    title: "Güvenlik Güçleri",
    accent: "Aynı vatan, ayrı görev",
    lead:
      "Türk Silahlı Kuvvetleri, Jandarma, Emniyet ve Sahil Güvenlik. Aynı vatanı koruyan, ayrı görevler taşıyan kahramanlarımız.",
    heroImage: VATAN_ASSETS.guvenlikGucleri,
    heroAlt: "Alacakaranlıkta granit anıt ve ebedî ateş",
    sections: [
      {
        eyebrow: "Kuvvetler",
        title: "Aynı vatan, ayrı görev",
        body: [
          "Kara, Deniz ve Hava Kuvvetleri ile Jandarma ve Sahil Güvenlik birbirini tamamlar. Emniyet, asayiş ve terörle mücadelede sivil kolluk görevini taşır.",
          "Şehit ve gazi isimleri kuvvetlere göre ayrı tutulur. Biz onları burada aynı saygıyla buluştururuz; teşkilat nizamına karışmayız.",
        ],
        cards: [
          {
            title: "Türk Silahlı Kuvvetleri",
            text: "Kara, Deniz, Hava. Şehit listesine /sehitlerimiz sayfasından bakabilirsiniz.",
            href: "/sehitlerimiz",
          },
          {
            title: "Jandarma ve Sahil Güvenlik",
            text: "Kır, sınır ve deniz. Şehit duyuruları ilgili komutanlıktadır.",
          },
          {
            title: "Emniyet Genel Müdürlüğü",
            text: "Şehir asayişi ve terörle mücadele. Polis şehitlerimiz EGM duyurularıyla anılır.",
          },
        ],
      },
      {
        eyebrow: "Hatıra",
        title: "Üniforma değil, isim",
        body: [
          "Anma, rütbeden önce isimledir. Bir şehitlik taşında yazan ad; bir annenin, bir birliğin ve bir köyün ortak cümlesidir.",
          "Güvenlik güçleri ile ilgili haberler sitemizde Şehit-Gazi ve Derneğimiz kategorilerinde yer alır. Açıklama yokken spekülasyon yapmayız.",
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
    accent: "Haklarınız var. Yanınızdayız.",
    lead:
      "Aylık, eğitim, sağlık, iş… hepsi sizin hakkınız. Gelin, dinleyelim; yolunu birlikte bulalım. Güncel belge ve tutarlar için ilgili bakanlığa da bakın.",
    heroImage: VATAN_ASSETS.haklar,
    heroAlt: "Açık kitap üzerinde altın terazi",
    sections: [
      {
        eyebrow: "Haklar",
        title: "Nereden başlanır",
        body: [
          "Aylık ve tazminat 2330 sayılı Kanun’la yürür. Terörle mücadelede hayatını kaybedenler ve malul olanlar için 3713 sayılı Kanun ek haklar tanır. Sosyal güvenlik 5510 sayılı Kanun’la kurulur.",
          "Kim hak sahibidir, hangi evrak gerekir, başvuru nereye yapılır — bunlar duruma göre değişir. İlk durak çoğu kez ilgili kuvvetin personel birimi veya Aile ve Sosyal Hizmetler il müdürlüğüdür.",
        ],
        cards: [
          {
            title: "Aile ve Sosyal Hizmetler",
            text: "Şehit yakını ve gazi kartı, sosyal yardım ve il müdürlüğü başvuruları.",
          },
          {
            title: "MSB / EGM / Jandarma",
            text: "Görev belgesi ve şehitlik işlemleri ilgili kuvvettedir.",
          },
          {
            title: "Eğitim bursları",
            text: "Şehit ve gazi çocuklarımız için KYK ve bakanlık bursları dönem dönem duyurulur.",
            href: "/burs",
          },
          {
            title: "Uluslararası haklar",
            text: "Yurt dışı şehit-gazi kuruluşları ayrı sayfadadır.",
            href: "/uluslararasi-sehit-gazi-haklari",
          },
        ],
      },
      {
        eyebrow: "Dernek",
        title: "Yanınızdayız, yerinize geçmeyiz",
        body: [
          "Vatan Kahramanları Derneği aileyi dinler, evrakı sadeleştirir ve doğru kapıya yönlendirir. Mahkeme veya bakanlık yerine geçmeyiz.",
          "Hukuk sayfamız ve talep formu somut başvurular içindir. Acil işler her zaman ilgili kurumun kaydıyla yürür.",
        ],
        image: VATAN_ASSETS.haklar,
        imageAlt: "Kitap ve adalet terazisi",
      },
    ],
  },
};

export const VATAN_HOME_HERO = {
  eyebrow: "Vatan Kahramanları Derneği",
  title: "Hatırayı yaşatmak,",
  accent: "hakkı savunmak",
  lead:
    "Şehitlerimizin, gazilerimizin ve kıymetli ailelerinin yanındayız. Anıları yaşatmak, birbirimize sahip çıkmak için buradayız.",
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
    subtitle: "Gelibolu’da yatan şehitlerimizi adıyla arayın. Hatıraları yaşasın.",
    href: "/canakkale-sehitleri",
    imageUrl: VATAN_ASSETS.canakkaleHero,
    color: VATAN_COLORS.gold,
    order: 1,
    active: true,
  },
  {
    id: "vatan-slide-sehitler",
    title: "Şehitlerimizi Anıyoruz",
    subtitle: "İsimlerini ad, rütbe veya yılla arayabilirsiniz.",
    href: "/sehitlerimiz",
    imageUrl: VATAN_ASSETS.sehitlerimiz,
    color: VATAN_COLORS.gold,
    order: 2,
    active: true,
  },
  {
    id: "vatan-slide-milli",
    title: "Millî Günler",
    subtitle: "18 Mart, 19 Mayıs, 30 Ağustos, 29 Ekim. Unutmadığımız günler.",
    href: "/milli-gunler",
    imageUrl: VATAN_ASSETS.milliGunler,
    color: VATAN_COLORS.gold,
    order: 3,
    active: true,
  },
];

export type VatanMenuSeed = {
  id: string;
  label: string;
  href: string;
  parentId?: string;
};

/** VKD menüsüne eklenecek eksik maddeler — mevcut öğelerin ayarı korunur. */
export const VATAN_MENU_ITEMS: VatanMenuSeed[] = [
  { id: "vkd-menu-kah-teror", label: "Terörle Mücadele Şehitleri", href: "/terorle-mucadele", parentId: "vkd-menu-kahramanlar" },
  { id: "vkd-menu-kah-guvenlik", label: "Güvenlik Güçleri", href: "/guvenlik-gucleri", parentId: "vkd-menu-kahramanlar" },
  { id: "vkd-menu-kur-vakif", label: "Vakfımız", href: "/vakif", parentId: "vkd-menu-kurumsal" },
  { id: "vkd-menu-sos-burs", label: "Burs Programı", href: "/burs", parentId: "vkd-menu-sosyal" },
  { id: "vkd-menu-tarih-kultur", label: "Kültür Portalı", href: "/kultur-portali", parentId: "vkd-menu-tarih" },
  { id: "vkd-menu-ataturk", label: "ATATÜRK", href: "#" },
  { id: "vkd-menu-ataturk-kose", label: "Atatürk Köşesi", href: "/ataturk", parentId: "vkd-menu-ataturk" },
  { id: "vkd-menu-ataturk-hayati", label: "Atatürk'ün Hayatı", href: "/ataturk/hayati", parentId: "vkd-menu-ataturk" },
  { id: "vkd-menu-ataturk-kronoloji", label: "Atatürk Kronolojisi", href: "/ataturk/kronoloji", parentId: "vkd-menu-ataturk" },
  { id: "vkd-menu-ataturk-ilkeler", label: "Atatürk İlkeleri", href: "/ataturk/ilkeler", parentId: "vkd-menu-ataturk" },
  { id: "vkd-menu-ataturk-sozleri", label: "Atatürk Sözleri", href: "/ataturk/sozleri", parentId: "vkd-menu-ataturk" },
];

export function mergeVkdVatanMenuItems<T extends { id: string; parentId?: string | null }>(
  existing: T[],
): Array<T | (VatanMenuSeed & { enabled: true })> {
  const next: Array<T | (VatanMenuSeed & { enabled: true })> = [...existing];
  const have = new Set(next.map((item) => item.id));
  for (const seed of VATAN_MENU_ITEMS) {
    if (have.has(seed.id)) continue;
    const row = { ...seed, enabled: true as const };
    const parentId = seed.parentId;
    if (parentId) {
      let insertAt = -1;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].id === parentId || next[i].parentId === parentId) {
          insertAt = i + 1;
          break;
        }
      }
      if (insertAt >= 0) next.splice(insertAt, 0, row);
      else next.push(row);
    } else if (seed.id === "vkd-menu-ataturk") {
      const kunyeIdx = next.findIndex((item) => item.id === "vkd-menu-kunye");
      if (kunyeIdx >= 0) next.splice(kunyeIdx, 0, row);
      else next.push(row);
    } else {
      next.push(row);
    }
    have.add(seed.id);
  }
  return next;
}

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
