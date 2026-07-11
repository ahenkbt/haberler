/**
 * Türkiye'nin 81 ili — ansiklopedi başlık çözümlemesi (Vikipedi şehir maddeleri).
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

export function normProvinceKey(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PROVINCE_BY_NORM = new Map<string, string>();
for (const name of TR_PROVINCE_NAMES_81) {
  PROVINCE_BY_NORM.set(normProvinceKey(name), name);
}
for (const [alias, canonical] of Object.entries(PROVINCE_NORM_ALIASES)) {
  if (!PROVINCE_BY_NORM.has(alias)) PROVINCE_BY_NORM.set(alias, canonical);
}

/** Tam il adı sorgusu → kanonik Vikipedi başlığı (şehir maddesi). */
export function resolveTurkishProvinceWikiTitle(query: string): string | null {
  const raw = String(query ?? "").trim();
  if (!raw) return null;
  const key = normProvinceKey(raw);
  if (!key) return null;
  const hit = PROVINCE_BY_NORM.get(key);
  if (hit) return hit;
  if (PROVINCE_NORM_ALIASES[key]) return PROVINCE_NORM_ALIASES[key];
  return null;
}

export function buildProvinceEncyclopediaAliases(): {
  queryAliases: Record<string, string>;
  slugAliases: Record<string, string>;
} {
  const queryAliases: Record<string, string> = {};
  const slugAliases: Record<string, string> = {};
  for (const name of TR_PROVINCE_NAMES_81) {
    const nq = normProvinceKey(name);
    queryAliases[nq] = name;
    slugAliases[nq.replace(/\s+/g, "_")] = name;
  }
  for (const [alias, canonical] of Object.entries(PROVINCE_NORM_ALIASES)) {
    queryAliases[alias] = canonical;
    slugAliases[alias] = canonical;
  }
  return { queryAliases, slugAliases };
}
