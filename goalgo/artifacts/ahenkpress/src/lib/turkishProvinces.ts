/**
 * Türkiye’nin 81 ili — ansiklopedi makale başlığı ile eşleme (Vikipedi başlıklarıyla uyumlu).
 * İlçe başlıkları ayrıca eşlemez; gelecekte genişletilebilir.
 */
export const TR_PROVINCE_NAMES_81 = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkâri",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kilis",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şanlıurfa",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
] as const;

const PROVINCE_NORM_ALIASES: Record<string, string> = {
  istanbul: "İstanbul",
  izmir: "İzmir",
  ankara: "Ankara",
  bursa: "Bursa",
  antalya: "Antalya",
  adana: "Adana",
  gaziantep: "Gaziantep",
  konya: "Konya",
  mersin: "Mersin",
  izmit: "Kocaeli",
  icel: "Mersin",
  sanliurfa: "Şanlıurfa",
  sirnak: "Şırnak",
  agri: "Ağrı",
  canakkale: "Çanakkale",
  corum: "Çorum",
  duzce: "Düzce",
  elazig: "Elazığ",
  eskisehir: "Eskişehir",
  kahramanmaras: "Kahramanmaraş",
  karabuk: "Karabük",
  kirsehir: "Kırşehir",
  kutahya: "Kütahya",
  mugla: "Muğla",
  mus: "Muş",
  nevsehir: "Nevşehir",
  nigde: "Niğde",
  tekirdag: "Tekirdağ",
  usak: "Uşak",
  hakari: "Hakkâri",
  igdir: "Iğdır",
  adiyaman: "Adıyaman",
  afyon: "Afyonkarahisar",
  afyonkarahisar: "Afyonkarahisar",
  balikesir: "Balıkesir",
  bartin: "Bartın",
  gumushane: "Gümüşhane",
  kirikkale: "Kırıkkale",
  kirklareli: "Kırklareli",
  diyarbakir: "Diyarbakır",
};

/** URL slug varyantları (ASCII I, büyük/küçük harf). */
const PROVINCE_SLUG_ALIASES: Record<string, string> = {
  Istanbul: "İstanbul",
  istanbul: "İstanbul",
  ISTANBUL: "İstanbul",
  Izmir: "İzmir",
  izmir: "İzmir",
  Izmit: "Kocaeli",
  "İzmit": "Kocaeli",
  Içel: "Mersin",
  "İçel": "Mersin",
};

/** normProvinceKey — ASCII/Türkçe il adı varyantlarını tek anahtara indirger. */
export function normProvinceKey(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PROVINCE_BY_NORM = new Map<string, string>(
  TR_PROVINCE_NAMES_81.map((name) => [normProvinceKey(name), name]),
);
for (const [alias, canonical] of Object.entries(PROVINCE_NORM_ALIASES)) {
  if (!PROVINCE_BY_NORM.has(alias)) PROVINCE_BY_NORM.set(alias, canonical);
}

/** Slug veya arama metni → kanonik il/Vikipedi başlığı (İstanbul, İzmir…). */
export function resolveTurkishProvinceWikiTitle(query: string): string | null {
  const raw = String(query ?? "").trim();
  if (!raw) return null;
  const slugAlias = PROVINCE_SLUG_ALIASES[raw];
  if (slugAlias) return slugAlias;
  const key = normProvinceKey(raw);
  if (!key) return null;
  return PROVINCE_BY_NORM.get(key) ?? PROVINCE_NORM_ALIASES[key] ?? null;
}

/** Makale başlığından il adı çıkar; bilinmiyorsa null. */
export function detectProvinceFromTitle(title: string): string | null {
  const raw = String(title ?? "").trim();
  if (!raw) return null;
  return resolveTurkishProvinceWikiTitle(raw);
}

const PROVINCE_DRIFT_WORDS = new Set([
  "katliam",
  "katliami",
  "hareket",
  "hareketi",
  "hareketı",
  "muharebesi",
  "savasi",
  "savaşı",
  "ulasim",
  "ulasimi",
  "havalimani",
  "limani",
  "metrosu",
]);

/** İl adı aramasında olay/hareket maddesine kayma (Adana Katliamı vb.). */
export function wikiTitleDriftsFromProvince(resultTitle: string, province: string): boolean {
  const p = province.trim().toLocaleLowerCase("tr-TR");
  const t = resultTitle.trim().toLocaleLowerCase("tr-TR");
  if (!p || !t || t === p) return false;
  if (!t.startsWith(p)) return true;
  const rest = t.slice(p.length).trim().split(/\s+/);
  return rest.some((w) => PROVINCE_DRIFT_WORDS.has(w));
}
