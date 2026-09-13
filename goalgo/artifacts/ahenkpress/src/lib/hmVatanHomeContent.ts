/**
 * Vatan bespoke homepage — static, evergreen copy and constants (S1–S9).
 * No news, no fetched data. Figures the association has not supplied stay `null`
 * and are never rendered as placeholder digits.
 */
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";

export type VatanHeroSlide = {
  id: string;
  image: string;
  alt: string;
};

export const VATAN_HOME_HERO_V2 = {
  eyebrow: "Vatan Kahramanları Derneği",
  title: "Hatırayı yaşatmak,",
  accent: "hakkı savunmak.",
  lead:
    "Şehitlerimizin, gazilerimizin ve kıymetli ailelerinin yanındayız. Anıları yaşatmak, birbirimize sahip çıkmak için buradayız.",
  primaryHref: "/canakkale-sehitleri",
  primaryLabel: "Şehit Sorgula",
  secondaryHref: "/sehitliklerimiz",
  secondaryLabel: "Şehitliklerimizi Keşfet",
  scrollCueLabel: "Keşfet",
  slides: [
    { id: "canakkale", image: VATAN_ASSETS.canakkaleHero, alt: "Çanakkale kıyısında alacakaranlık, servi sırası ve dalgalanan Türk bayrağı" },
    { id: "pillars", image: VATAN_ASSETS.memorialPillars, alt: "Terasta granit anıt sütunları, hilal ve kızıl akşam" },
    { id: "ataturk", image: VATAN_ASSETS.ataturk, alt: "Alacakaranlıkta sütunlu anıt terası ve Türk bayrağı" },
  ] as VatanHeroSlide[],
  slideIntervalMs: 8000,
} as const;

export type VatanSearchSource = "canakkale" | "msb";

export const VATAN_SEARCH_SOURCES: { id: VatanSearchSource; label: string; href: string; shortLabel: string }[] = [
  { id: "canakkale", label: "Çanakkale Şehitleri", shortLabel: "Çanakkale", href: "/canakkale-sehitleri" },
  { id: "msb", label: "MSB Şehit Listesi", shortLabel: "MSB", href: "/sehitlerimiz" },
];

export const VATAN_SEARCH_HELPER = "Çanakkale şehitlerimizde veya MSB listesinde isim arayabilirsiniz.";

export type VatanMosaicTile = {
  slug: string;
  href: string;
  title: string;
  kicker: string;
  excerpt?: string;
  image: string;
  imageAlt: string;
  size: "xl" | "sm";
};

export const VATAN_MOSAIC_TILES: VatanMosaicTile[] = [
  {
    slug: "sehitliklerimiz",
    href: "/sehitliklerimiz",
    title: "Şehitliklerimiz",
    kicker: "Ziyaret",
    excerpt: "Gelibolu’dan Edirnekapı’ya, yurt içi ve yurt dışı şehitliklerimiz.",
    image: VATAN_ASSETS.sehitlik,
    imageAlt: "Taş kabartma yaprak ve çiçek motifli şehitlik levhası",
    size: "xl",
  },
  {
    slug: "canakkale-sehitleri",
    href: "/canakkale-sehitleri",
    title: "Çanakkale Şehitleri",
    kicker: "1915 · Gelibolu",
    image: VATAN_ASSETS.canakkaleHero,
    imageAlt: "Çanakkale kıyısında bayrak ve anıt, gelincik motifleriyle",
    size: "sm",
  },
  {
    slug: "terorle-mucadele",
    href: "/terorle-mucadele",
    title: "Terörle Mücadele Şehitleri",
    kicker: "Vefa ve hatıra",
    image: VATAN_ASSETS.terorleMucadele,
    imageAlt: "Zeytin ağacı ve kırmızı kapılı anıt bahçe yolu",
    size: "sm",
  },
  {
    slug: "guvenlik-gucleri",
    href: "/guvenlik-gucleri",
    title: "Güvenlik Güçleri",
    kicker: "TSK · Jandarma · Emniyet",
    image: VATAN_ASSETS.guvenlikGucleri,
    imageAlt: "Alacakaranlıkta granit anıt ve ebedî ateş",
    size: "sm",
  },
  {
    slug: "sehitlerimiz",
    href: "/sehitlerimiz",
    title: "Şehitlerimiz",
    kicker: "Şehitlerimiz",
    image: VATAN_ASSETS.sehitlerimiz,
    imageAlt: "Gece vakti anıt terasında yanan ebedî ateş",
    size: "sm",
  },
];

export type VatanMissionPillar = {
  id: "hatira" | "hak" | "vefa";
  title: string;
  text: string;
};

export const VATAN_MISSION_PILLARS: VatanMissionPillar[] = [
  {
    id: "hatira",
    title: "Hatıra",
    text: "Şehitlerimizin anısını yaşatırız. İsimleri unutulmasın, hatıraları dilden dile gezsin diye.",
  },
  {
    id: "hak",
    title: "Hak",
    text: "Haklarını takip eder, başvuruda yanlarında oluruz. Doğru kapıyı birlikte ararız.",
  },
  {
    id: "vefa",
    title: "Vefa",
    text: "Aileleri yalnız bırakmayız. Kapımız her zaman açıktır.",
  },
];

/** Association-supplied figures. Null values are omitted; never invent placeholders. */
export const VATAN_ASSOCIATION_FIGURES: {
  kurulusYili: number | string | null;
  subeSayisi: number | string | null;
  bursluOgrenci: number | string | null;
} = {
  kurulusYili: null,
  subeSayisi: null,
  bursluOgrenci: "500+",
};

export const VATAN_FIGURE_LABELS = {
  kurulusYili: "Kuruluş",
  subeSayisi: "Şube / temsilcilik",
  bursluOgrenci: "Burslu öğrencimiz",
} as const;

export type VatanLinkRow = {
  href: string;
  title: string;
  text?: string;
};

export const VATAN_RIGHTS_ROWS: VatanLinkRow[] = [
  { href: "/sehit-gazi-haklari", title: "Şehit-Gazi Hakları", text: "Aylık, eğitim, sağlık ve işe yerleşme haklarınız için yanınızdayız." },
  { href: "/burs", title: "Burs Programı", text: "Şehit ve gazi çocuklarımız için burs. Dönem dönem duyururuz." },
  { href: "/hukuk-savunuculuk", title: "Hukuk ve Savunuculuk", text: "Başvuruda evrakı sadeleştirir, doğru kapıya yönlendiririz." },
  { href: "/talep-formu", title: "Talep Formu", text: "Bir sorunuz, bir talebiniz varsa bize yazın." },
];

export const VATAN_RIGHTS_NOTE_LINKS: { href: string; label: string }[] = [
  { href: "/uluslararasi-sehit-gazi-haklari", label: "Uluslararası şehit-gazi hakları" },
  { href: "/turkiye-sehit-gazi-dernekleri", label: "Yurt içi kuruluşlar" },
  { href: "/dunya-sehit-gazi-kuruluslari", label: "Yurt dışı kuruluşlar" },
];

export type VatanNationalDay = {
  id: string;
  month: number;
  day: number;
  dateLabel: string;
  title: string;
};

/** Fixed public dates only — facts, not statistics. */
export const VATAN_NATIONAL_DAYS: VatanNationalDay[] = [
  { id: "18-mart", month: 3, day: 18, dateLabel: "18 Mart", title: "Çanakkale Zaferi ve Şehitleri Anma Günü" },
  { id: "23-nisan", month: 4, day: 23, dateLabel: "23 Nisan", title: "Ulusal Egemenlik ve Çocuk Bayramı" },
  { id: "19-mayis", month: 5, day: 19, dateLabel: "19 Mayıs", title: "Atatürk’ü Anma, Gençlik ve Spor Bayramı" },
  { id: "15-temmuz", month: 7, day: 15, dateLabel: "15 Temmuz", title: "Demokrasi ve Millî Birlik Günü" },
  { id: "30-agustos", month: 8, day: 30, dateLabel: "30 Ağustos", title: "Zafer Bayramı" },
  { id: "29-ekim", month: 10, day: 29, dateLabel: "29 Ekim", title: "Cumhuriyet Bayramı" },
  { id: "10-kasim", month: 11, day: 10, dateLabel: "10 Kasım", title: "Atatürk’ü Anma Günü" },
];

/** Index of the next upcoming national day for a given local (Europe/Istanbul) month/day. */
export function resolveUpcomingNationalDayIndex(month: number, day: number): number {
  for (let i = 0; i < VATAN_NATIONAL_DAYS.length; i++) {
    const d = VATAN_NATIONAL_DAYS[i];
    if (d.month > month || (d.month === month && d.day >= day)) return i;
  }
  return 0;
}

export function resolveIstanbulMonthDay(now: Date = new Date()): { month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      month: "numeric",
      day: "numeric",
    }).formatToParts(now);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    if (Number.isFinite(month) && Number.isFinite(day)) return { month, day };
  } catch {
    // Intl unavailable — fall through to local time.
  }
  return { month: now.getMonth() + 1, day: now.getDate() };
}

export const VATAN_ATATURK_ROWS: VatanLinkRow[] = [
  { href: "/ataturk/hayati", title: "Hayatı" },
  { href: "/ataturk/kronoloji", title: "Kronoloji" },
  { href: "/ataturk/ilkeler", title: "İlkeler" },
  { href: "/ataturk/sozleri", title: "Sözleri" },
];

export type VatanWarPanel = {
  slug: string;
  href: string;
  numeral: string;
  title: string;
  image?: string;
  imageAlt?: string;
};

export const VATAN_WAR_PANELS: VatanWarPanel[] = [
  {
    slug: "canakkale-savasi",
    href: "/savaslar/canakkale-savasi",
    numeral: "1915",
    title: "Çanakkale Savaşı",
    image: VATAN_ASSETS.canakkaleHero,
    imageAlt: "Çanakkale kıyısında bayrak ve anıt",
  },
  { slug: "kurtulus-savasi", href: "/savaslar/kurtulus-savasi", numeral: "1919–1923", title: "Kurtuluş Savaşı" },
  { slug: "kore-savasi", href: "/savaslar/kore-savasi", numeral: "1950–1953", title: "Kore Savaşı" },
  { slug: "kibris-baris-harekati", href: "/savaslar/kibris-baris-harekati", numeral: "1974", title: "Kıbrıs Barış Harekâtı" },
];

export const VATAN_HISTORY_LINKS: { href: string; label: string }[] = [
  { href: "/savaslar", label: "Tüm savaşlar" },
  { href: "/kultur-portali", label: "Kültür Portalı" },
  { href: "/ansiklopedi/Türk_tarihi_kronolojisi", label: "Türk Tarihi Kronolojisi" },
];

export const VATAN_SUPPORT_LINKS: { href: string; label: string }[] = [
  { href: "/bagis", label: "Bağış" },
  { href: "/vakif", label: "Vakfımız" },
  { href: "/isbirligi", label: "İşbirliği" },
];

export const VATAN_SUPPORT_NOTE = "Desteğiniz için teşekkür ederiz. Sorunuz olursa bizi arayın.";

/** Mega-menu right-column image by editor root id, with label-keyword fallback. */
export const VATAN_NAV_GROUP_IMAGES: Record<string, { image: string; caption: string }> = {
  "vkd-menu-kurumsal": { image: VATAN_ASSETS.memorialPillars, caption: "Derneğimiz, vakfımız ve birlikte yürüdüğümüz yol." },
  "vkd-menu-kahramanlar": { image: VATAN_ASSETS.sehitlerimiz, caption: "Şehitlerimiz, gazilerimiz ve kıymetli aileleri." },
  "vkd-menu-sosyal": { image: VATAN_ASSETS.haklar, caption: "Haklar, burs ve başvuru. Yanınızdayız." },
  "vkd-menu-tarih": { image: VATAN_ASSETS.canakkaleHero, caption: "Çanakkale’den Kıbrıs’a, unutmadığımız günler ve destanlar." },
  "vkd-menu-ataturk": { image: VATAN_ASSETS.ataturk, caption: "Hayatı, ilkeleri ve sözleri." },
};

export function resolveVatanNavGroupImage(rootId: string, label: string): { image: string; caption: string } {
  const direct = VATAN_NAV_GROUP_IMAGES[rootId];
  if (direct) return direct;
  const l = label.toLocaleLowerCase("tr-TR");
  if (l.includes("kurum")) return VATAN_NAV_GROUP_IMAGES["vkd-menu-kurumsal"];
  if (l.includes("kahraman") || l.includes("şehit")) return VATAN_NAV_GROUP_IMAGES["vkd-menu-kahramanlar"];
  if (l.includes("sosyal") || l.includes("hak")) return VATAN_NAV_GROUP_IMAGES["vkd-menu-sosyal"];
  if (l.includes("tarih")) return VATAN_NAV_GROUP_IMAGES["vkd-menu-tarih"];
  if (l.includes("atatürk")) return VATAN_NAV_GROUP_IMAGES["vkd-menu-ataturk"];
  return { image: VATAN_ASSETS.memorialPillars, caption: "Vatan Kahramanları Derneği" };
}

export const VATAN_FOOTER_MISSION = "Şehitlerimizin anısını yaşatır, ailelerimizin yanında dururuz.";
export const VATAN_HEADER_TAGLINE = "Hatıra · Hak · Vefa";
export const VATAN_WORDMARK = "Vatan Kahramanları Derneği";
