import { TR_PROVINCE_NAMES_81 } from "./turkishProvinces";

export type CityFamousSymbol = {
  emoji: string;
  /** Kısa sembol adı — aria-label / title için (ör. «horozu», «karpuzu»). */
  label: string;
};

/** İl adına göre meşhur sembol — bilinmeyen iller için 📍 yedek. */
export const CITY_FAMOUS_SYMBOLS: Record<string, CityFamousSymbol> = {
  Adana: { emoji: "🌶️", label: "Adana kebabı" },
  Adıyaman: { emoji: "🗿", label: "Nemrut" },
  Afyonkarahisar: { emoji: "🍭", label: "lokumu" },
  Ağrı: { emoji: "🏔️", label: "Ağrı Dağı" },
  Aksaray: { emoji: "🧂", label: "Tuz Gölü" },
  Amasya: { emoji: "🍎", label: "elması" },
  Ankara: { emoji: "🏛️", label: "Anıtkabir" },
  Antalya: { emoji: "☀️", label: "turizmi" },
  Ardahan: { emoji: "🧊", label: "Cıldır Gölü" },
  Artvin: { emoji: "🍯", label: "balı" },
  Aydın: { emoji: "🟣", label: "inciri" },
  Balıkesir: { emoji: "🫒", label: "zeytini" },
  Bartın: { emoji: "🌲", label: "ormanı" },
  Batman: { emoji: "🏰", label: "Hasankeyf" },
  Bayburt: { emoji: "🧵", label: "el dokuması" },
  Bilecik: { emoji: "🌳", label: "Osman Gazi" },
  Bingöl: { emoji: "🍯", label: "balı" },
  Bitlis: { emoji: "🏰", label: "kalesi" },
  Bolu: { emoji: "🍲", label: "Abant" },
  Burdur: { emoji: "🦢", label: "gölleri" },
  Bursa: { emoji: "🥙", label: "İskender kebabı" },
  Çanakkale: { emoji: "⚔️", label: "Gelibolu" },
  Çankırı: { emoji: "🧂", label: "tuzu" },
  Çorum: { emoji: "🥜", label: "leblebisi" },
  Denizli: { emoji: "🐓", label: "horozu" },
  Diyarbakır: { emoji: "🍉", label: "karpuzu" },
  Düzce: { emoji: "🌰", label: "fındığı" },
  Edirne: { emoji: "🕌", label: "Selimiye" },
  Elazığ: { emoji: "🧀", label: "tulum peyniri" },
  Erzincan: { emoji: "🧀", label: "tulum peyniri" },
  Erzurum: { emoji: "🍖", label: "cağ kebabı" },
  Eskişehir: { emoji: "🥟", label: "çiböreği" },
  Gaziantep: { emoji: "🍯", label: "baklavası" },
  Giresun: { emoji: "🌰", label: "fındığı" },
  Gümüşhane: { emoji: "🍇", label: "üzümü" },
  Hakkâri: { emoji: "🏔️", label: "dağları" },
  Hatay: { emoji: "🧁", label: "künefesi" },
  Iğdır: { emoji: "🍇", label: "üzümü" },
  Isparta: { emoji: "🌹", label: "gülü" },
  İstanbul: { emoji: "🏙️", label: "Boğaz'ı" },
  İzmir: { emoji: "🥐", label: "boyozu" },
  Kahramanmaraş: { emoji: "🍦", label: "dondurması" },
  Karabük: { emoji: "🏘️", label: "Safranbolu" },
  Karaman: { emoji: "🍎", label: "elması" },
  Kars: { emoji: "🧀", label: "kaşarı" },
  Kastamonu: { emoji: "🌰", label: "fındığı" },
  Kayseri: { emoji: "🥟", label: "mantısı" },
  Kırıkkale: { emoji: "🌾", label: "tahılı" },
  Kırklareli: { emoji: "🍷", label: "şarabı" },
  Kırşehir: { emoji: "🎵", label: "nevi" },
  Kilis: { emoji: "🫒", label: "zeytinyağı" },
  Kocaeli: { emoji: "🍬", label: "pişmaniyesi" },
  Konya: { emoji: "🕌", label: "Mevlana" },
  Kütahya: { emoji: "🏺", label: "çinisi" },
  Malatya: { emoji: "🍑", label: "kayısısı" },
  Manisa: { emoji: "🍇", label: "üzümü" },
  Mardin: { emoji: "🏛️", label: "taş evleri" },
  Mersin: { emoji: "🍊", label: "narenciyesi" },
  Muğla: { emoji: "🏖️", label: "koyları" },
  Muş: { emoji: "🌸", label: "lalesi" },
  Nevşehir: { emoji: "🎈", label: "balon turu" },
  Niğde: { emoji: "🥔", label: "patatesi" },
  Ordu: { emoji: "🌰", label: "fındığı" },
  Osmaniye: { emoji: "🌶️", label: "biberi" },
  Rize: { emoji: "🍵", label: "çayı" },
  Sakarya: { emoji: "🌰", label: "fındığı" },
  Samsun: { emoji: "🥙", label: "pidesi" },
  Siirt: { emoji: "🍖", label: "büryanı" },
  Sinop: { emoji: "🐟", label: "hamsisi" },
  Sivas: { emoji: "🥩", label: "köftesi" },
  Şanlıurfa: { emoji: "🌶️", label: "biberi" },
  Şırnak: { emoji: "🍯", label: "balı" },
  Tekirdağ: { emoji: "🥩", label: "köftesi" },
  Tokat: { emoji: "🍇", label: "üzümü" },
  Trabzon: { emoji: "🐟", label: "hamsisi" },
  Tunceli: { emoji: "🍯", label: "balı" },
  Uşak: { emoji: "🧶", label: "halısı" },
  Van: { emoji: "🐱", label: "kedisi" },
  Yalova: { emoji: "♨️", label: "termal kaplıcaları" },
  Yozgat: { emoji: "🌰", label: "cevizi" },
  Zonguldak: { emoji: "⛏️", label: "maden ocakları" },
};

const DEFAULT_CITY_SYMBOL: CityFamousSymbol = { emoji: "📍", label: "" };

export function getCityFamousSymbol(name: string): CityFamousSymbol {
  return CITY_FAMOUS_SYMBOLS[name] ?? DEFAULT_CITY_SYMBOL;
}

export type TurkeyCity = {
  name: (typeof TR_PROVINCE_NAMES_81)[number];
  emoji: string;
  label: string;
};

export function cityAccessibilityLabel(city: Pick<TurkeyCity, "name" | "label">): string {
  const trimmed = city.label.trim();
  if (!trimmed) return city.name;
  if (trimmed.startsWith(city.name)) return trimmed;
  return `${city.name} ${trimmed}`;
}

export type PopularCityWithLocation = TurkeyCity & {
  lat: number;
  lng: number;
  zoom: number;
};

/** Yekpare anasayfa + HM vitrin “Popüler şehirler” satırı (ansiklopedi slug ile uyumlu isimler). */
const POPULAR_CITY_LOCATIONS = [
  { name: "İstanbul", lat: 41.0082, lng: 28.9784, zoom: 11 },
  { name: "Ankara", lat: 39.9208, lng: 32.8541, zoom: 11 },
  { name: "İzmir", lat: 38.4237, lng: 27.1428, zoom: 12 },
  { name: "Antalya", lat: 36.8841, lng: 30.7056, zoom: 12 },
  { name: "Bursa", lat: 40.1885, lng: 29.061, zoom: 12 },
  { name: "Adana", lat: 37.0, lng: 35.3213, zoom: 12 },
  { name: "Gaziantep", lat: 37.0662, lng: 37.3833, zoom: 12 },
  { name: "Konya", lat: 37.8713, lng: 32.4846, zoom: 12 },
  { name: "Kayseri", lat: 38.7312, lng: 35.4787, zoom: 12 },
  { name: "Trabzon", lat: 41.0015, lng: 39.7178, zoom: 12 },
] as const satisfies ReadonlyArray<{
  name: (typeof TR_PROVINCE_NAMES_81)[number];
  lat: number;
  lng: number;
  zoom: number;
}>;

export const POPULAR_CITIES: readonly PopularCityWithLocation[] = POPULAR_CITY_LOCATIONS.map((city) => {
  const symbol = getCityFamousSymbol(city.name);
  return { ...city, emoji: symbol.emoji, label: symbol.label };
});

function toTurkeyCity(name: (typeof TR_PROVINCE_NAMES_81)[number]): TurkeyCity {
  const symbol = getCityFamousSymbol(name);
  return { name, emoji: symbol.emoji, label: symbol.label };
}

/** Türkiye şehirleri görünümü için 81 ilin tamamı. */
export const TURKEY_CITIES: readonly TurkeyCity[] = TR_PROVINCE_NAMES_81.map(toTurkeyCity);

function normalizeTurkeyCityLookupKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i");
}

/** İl adından keşif/harita API slug'ı (ör. Samsun → samsun). */
export function turkeyCitySlugFromName(name: string): string {
  return normalizeTurkeyCityLookupKey(name).replace(/\s+/g, "-");
}

/** İl adı veya slug ile TURKEY_CITIES kaydı. */
export function findTurkeyCityByNameOrSlug(query: string): TurkeyCity | undefined {
  const raw = String(query ?? "").trim();
  if (!raw) return undefined;
  const key = normalizeTurkeyCityLookupKey(raw);
  const slugKey = key.replace(/\s+/g, "-");
  return TURKEY_CITIES.find((city) => {
    const nameKey = normalizeTurkeyCityLookupKey(city.name);
    return nameKey === key || nameKey.replace(/\s+/g, "-") === slugKey;
  });
}

/** 30 büyükşehir belediyesi — anasayfa Türkiye Şehirleri bandı. */
export const METROPOLITAN_CITY_NAMES = [
  "Adana",
  "Ankara",
  "Antalya",
  "Aydın",
  "Balıkesir",
  "Bursa",
  "Denizli",
  "Diyarbakır",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Hatay",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Kayseri",
  "Kocaeli",
  "Konya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Ordu",
  "Sakarya",
  "Samsun",
  "Şanlıurfa",
  "Tekirdağ",
  "Trabzon",
  "Van",
] as const satisfies readonly (typeof TR_PROVINCE_NAMES_81)[number][];

export const METROPOLITAN_CITIES: readonly TurkeyCity[] = METROPOLITAN_CITY_NAMES.map(toTurkeyCity);
