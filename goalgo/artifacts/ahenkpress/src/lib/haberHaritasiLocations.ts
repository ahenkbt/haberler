import { TR_PROVINCE_NAMES_81 } from "@/lib/turkishProvinces";
import { normalizeHmMapCityKey } from "@/lib/hmMapCityKey";

export type HaberHaritasiLocationKind = "tr-province" | "global-city" | "country";

export type HaberHaritasiLocation = {
  key: string;
  label: string;
  searchTerms: string[];
  lat: number;
  lng: number;
  zoom: number;
  countryCode: string;
  kind: HaberHaritasiLocationKind;
};

type RawGlobalRow = {
  key: string;
  label: string;
  searchTerms: string[];
  lat: number;
  lng: number;
  countryCode: string;
  kind: "global-city" | "country";
  zoom?: number;
};

/** Dünya haber haritası — başkentler + büyük şehirler (statik koordinat sözlüğü; geocoding yok). */
const RAW_GLOBAL_LOCATIONS: RawGlobalRow[] = [
  { key: "usa", label: "ABD", searchTerms: ["ABD", "Amerika", "United States", "USA", "Washington"], lat: 38.9072, lng: -77.0369, countryCode: "US", kind: "country" },
  { key: "new-york", label: "New York", searchTerms: ["New York", "NYC"], lat: 40.7128, lng: -74.006, countryCode: "US", kind: "global-city" },
  { key: "washington", label: "Washington", searchTerms: ["Washington DC", "Washington D.C."], lat: 38.9072, lng: -77.0369, countryCode: "US", kind: "global-city" },
  { key: "uk", label: "İngiltere", searchTerms: ["İngiltere", "Ingiltere", "United Kingdom", "Britain", "UK", "London"], lat: 51.5074, lng: -0.1278, countryCode: "GB", kind: "country" },
  { key: "london", label: "Londra", searchTerms: ["Londra", "London"], lat: 51.5074, lng: -0.1278, countryCode: "GB", kind: "global-city" },
  { key: "germany", label: "Almanya", searchTerms: ["Almanya", "Germany", "Deutschland", "Berlin"], lat: 52.52, lng: 13.405, countryCode: "DE", kind: "country" },
  { key: "berlin", label: "Berlin", searchTerms: ["Berlin"], lat: 52.52, lng: 13.405, countryCode: "DE", kind: "global-city" },
  { key: "france", label: "Fransa", searchTerms: ["Fransa", "France", "Paris"], lat: 48.8566, lng: 2.3522, countryCode: "FR", kind: "country" },
  { key: "paris", label: "Paris", searchTerms: ["Paris"], lat: 48.8566, lng: 2.3522, countryCode: "FR", kind: "global-city" },
  { key: "russia", label: "Rusya", searchTerms: ["Rusya", "Russia", "Moscow", "Moskova"], lat: 55.7558, lng: 37.6173, countryCode: "RU", kind: "country" },
  { key: "moscow", label: "Moskova", searchTerms: ["Moskova", "Moscow"], lat: 55.7558, lng: 37.6173, countryCode: "RU", kind: "global-city" },
  { key: "ukraine", label: "Ukrayna", searchTerms: ["Ukrayna", "Ukraine", "Kyiv", "Kiev"], lat: 50.4501, lng: 30.5234, countryCode: "UA", kind: "country" },
  { key: "china", label: "Çin", searchTerms: ["Çin", "Cin", "China", "Beijing", "Pekin"], lat: 39.9042, lng: 116.4074, countryCode: "CN", kind: "country" },
  { key: "beijing", label: "Pekin", searchTerms: ["Pekin", "Beijing"], lat: 39.9042, lng: 116.4074, countryCode: "CN", kind: "global-city" },
  { key: "japan", label: "Japonya", searchTerms: ["Japonya", "Japan", "Tokyo"], lat: 35.6762, lng: 139.6503, countryCode: "JP", kind: "country" },
  { key: "tokyo", label: "Tokyo", searchTerms: ["Tokyo"], lat: 35.6762, lng: 139.6503, countryCode: "JP", kind: "global-city" },
  { key: "india", label: "Hindistan", searchTerms: ["Hindistan", "India", "New Delhi"], lat: 28.6139, lng: 77.209, countryCode: "IN", kind: "country" },
  { key: "pakistan", label: "Pakistan", searchTerms: ["Pakistan", "Islamabad"], lat: 33.6844, lng: 73.0479, countryCode: "PK", kind: "country" },
  { key: "iran", label: "İran", searchTerms: ["İran", "Iran", "Tehran", "Tahran"], lat: 35.6892, lng: 51.389, countryCode: "IR", kind: "country" },
  { key: "israel", label: "İsrail", searchTerms: ["İsrail", "Israil", "Israel", "Tel Aviv", "Gaza", "Gazze"], lat: 31.7683, lng: 35.2137, countryCode: "IL", kind: "country" },
  { key: "palestine", label: "Filistin", searchTerms: ["Filistin", "Palestine", "Gazze", "Gaza"], lat: 31.5, lng: 34.4667, countryCode: "PS", kind: "country" },
  { key: "saudi-arabia", label: "Suudi Arabistan", searchTerms: ["Suudi Arabistan", "Saudi Arabia", "Riyadh"], lat: 24.7136, lng: 46.6753, countryCode: "SA", kind: "country" },
  { key: "uae", label: "BAE", searchTerms: ["BAE", "Birleşik Arap Emirlikleri", "UAE", "Dubai"], lat: 25.2048, lng: 55.2708, countryCode: "AE", kind: "country" },
  { key: "egypt", label: "Mısır", searchTerms: ["Mısır", "Misir", "Egypt", "Kahire", "Cairo"], lat: 30.0444, lng: 31.2357, countryCode: "EG", kind: "country" },
  { key: "syria", label: "Suriye", searchTerms: ["Suriye", "Syria", "Damascus", "Şam"], lat: 33.5138, lng: 36.2765, countryCode: "SY", kind: "country" },
  { key: "iraq", label: "Irak", searchTerms: ["Irak", "Iraq", "Baghdad", "Bağdat"], lat: 33.3152, lng: 44.3661, countryCode: "IQ", kind: "country" },
  { key: "lebanon", label: "Lübnan", searchTerms: ["Lübnan", "Lubnan", "Lebanon", "Beirut"], lat: 33.8938, lng: 35.5018, countryCode: "LB", kind: "country" },
  { key: "qatar", label: "Katar", searchTerms: ["Katar", "Qatar", "Doha"], lat: 25.2854, lng: 51.531, countryCode: "QA", kind: "country" },
  { key: "italy", label: "İtalya", searchTerms: ["İtalya", "Italy", "Rome", "Roma"], lat: 41.9028, lng: 12.4964, countryCode: "IT", kind: "country" },
  { key: "spain", label: "İspanya", searchTerms: ["İspanya", "Spain", "Madrid"], lat: 40.4168, lng: -3.7038, countryCode: "ES", kind: "country" },
  { key: "netherlands", label: "Hollanda", searchTerms: ["Hollanda", "Netherlands", "Amsterdam"], lat: 52.3676, lng: 4.9041, countryCode: "NL", kind: "country" },
  { key: "belgium", label: "Belçika", searchTerms: ["Belçika", "Belgium", "Brussels"], lat: 50.8503, lng: 4.3517, countryCode: "BE", kind: "country" },
  { key: "sweden", label: "İsveç", searchTerms: ["İsveç", "Sweden", "Stockholm"], lat: 59.3293, lng: 18.0686, countryCode: "SE", kind: "country" },
  { key: "norway", label: "Norveç", searchTerms: ["Norveç", "Norway", "Oslo"], lat: 59.9139, lng: 10.7522, countryCode: "NO", kind: "country" },
  { key: "poland", label: "Polonya", searchTerms: ["Polonya", "Poland", "Warsaw", "Varşova"], lat: 52.2297, lng: 21.0122, countryCode: "PL", kind: "country" },
  { key: "greece", label: "Yunanistan", searchTerms: ["Yunanistan", "Greece", "Athens", "Atina"], lat: 37.9838, lng: 23.7275, countryCode: "GR", kind: "country" },
  { key: "canada", label: "Kanada", searchTerms: ["Kanada", "Canada", "Ottawa", "Toronto"], lat: 45.4215, lng: -75.6972, countryCode: "CA", kind: "country" },
  { key: "mexico", label: "Meksika", searchTerms: ["Meksika", "Mexico", "Mexico City"], lat: 19.4326, lng: -99.1332, countryCode: "MX", kind: "country" },
  { key: "brazil", label: "Brezilya", searchTerms: ["Brezilya", "Brazil", "Brasilia"], lat: -15.7939, lng: -47.8828, countryCode: "BR", kind: "country" },
  { key: "argentina", label: "Arjantin", searchTerms: ["Arjantin", "Argentina", "Buenos Aires"], lat: -34.6037, lng: -58.3816, countryCode: "AR", kind: "country" },
  { key: "australia", label: "Avustralya", searchTerms: ["Avustralya", "Australia", "Canberra", "Sydney"], lat: -35.2809, lng: 149.13, countryCode: "AU", kind: "country" },
  { key: "south-africa", label: "Güney Afrika", searchTerms: ["Güney Afrika", "South Africa", "Pretoria"], lat: -25.7479, lng: 28.2293, countryCode: "ZA", kind: "country" },
  { key: "nigeria", label: "Nijerya", searchTerms: ["Nijerya", "Nigeria", "Abuja"], lat: 9.0765, lng: 7.3986, countryCode: "NG", kind: "country" },
  { key: "south-korea", label: "Güney Kore", searchTerms: ["Güney Kore", "South Korea", "Seoul", "Seul"], lat: 37.5665, lng: 126.978, countryCode: "KR", kind: "country" },
  { key: "north-korea", label: "Kuzey Kore", searchTerms: ["Kuzey Kore", "North Korea", "Pyongyang"], lat: 39.0392, lng: 125.7625, countryCode: "KP", kind: "country" },
  { key: "taiwan", label: "Tayvan", searchTerms: ["Tayvan", "Taiwan", "Taipei"], lat: 25.033, lng: 121.5654, countryCode: "TW", kind: "country" },
  { key: "azerbaijan", label: "Azerbaycan", searchTerms: ["Azerbaycan", "Azerbaijan", "Baku", "Bakü"], lat: 40.4093, lng: 49.8671, countryCode: "AZ", kind: "country" },
  { key: "georgia", label: "Gürcistan", searchTerms: ["Gürcistan", "Georgia", "Tbilisi"], lat: 41.7151, lng: 44.8271, countryCode: "GE", kind: "country" },
  { key: "kktc", label: "KKTC", searchTerms: ["KKTC", "Kuzey Kıbrıs", "Kuzey Kibris", "Lefkoşa", "Lefkosa", "Girne", "Mağusa"], lat: 35.1856, lng: 33.3823, countryCode: "CY", kind: "country" },
  { key: "lefkosa", label: "Lefkoşa", searchTerms: ["Lefkoşa", "Lefkosa", "Nicosia North"], lat: 35.1856, lng: 33.3823, countryCode: "CY", kind: "global-city" },
  { key: "girne", label: "Girne", searchTerms: ["Girne", "Kyrenia"], lat: 35.3369, lng: 33.3175, countryCode: "CY", kind: "global-city" },
  { key: "albania", label: "Arnavutluk", searchTerms: ["Arnavutluk", "Albania", "Tirana", "Tiran"], lat: 41.3275, lng: 19.8187, countryCode: "AL", kind: "country" },
  { key: "north-macedonia", label: "Kuzey Makedonya", searchTerms: ["Kuzey Makedonya", "North Macedonia", "Üsküp", "Skopje"], lat: 41.9981, lng: 21.4254, countryCode: "MK", kind: "country" },
  { key: "bosnia", label: "Bosna Hersek", searchTerms: ["Bosna", "Bosnia", "Saraybosna", "Sarajevo"], lat: 43.8563, lng: 18.4131, countryCode: "BA", kind: "country" },
  { key: "croatia", label: "Hırvatistan", searchTerms: ["Hırvatistan", "Croatia", "Zagreb"], lat: 45.815, lng: 15.9819, countryCode: "HR", kind: "country" },
  { key: "montenegro", label: "Karadağ", searchTerms: ["Karadağ", "Montenegro", "Podgorica"], lat: 42.4304, lng: 19.2594, countryCode: "ME", kind: "country" },
  { key: "yerevan", label: "Yerevan", searchTerms: ["Yerevan", "Erivan", "Eriwan"], lat: 40.1776, lng: 44.5126, countryCode: "AM", kind: "global-city" },
  { key: "armenia", label: "Ermenistan", searchTerms: ["Ermenistan", "Armenia"], lat: 40.1792, lng: 44.4991, countryCode: "AM", kind: "country" },
  { key: "kazakhstan", label: "Kazakistan", searchTerms: ["Kazakistan", "Kazakhstan", "Astana"], lat: 51.1694, lng: 71.4491, countryCode: "KZ", kind: "country" },
  { key: "romania", label: "Romanya", searchTerms: ["Romanya", "Romania", "Bucharest"], lat: 44.4268, lng: 26.1025, countryCode: "RO", kind: "country" },
  { key: "hungary", label: "Macaristan", searchTerms: ["Macaristan", "Hungary", "Budapest"], lat: 47.4979, lng: 19.0402, countryCode: "HU", kind: "country" },
  { key: "austria", label: "Avusturya", searchTerms: ["Avusturya", "Austria", "Vienna", "Viyana"], lat: 48.2082, lng: 16.3738, countryCode: "AT", kind: "country" },
  { key: "switzerland", label: "İsviçre", searchTerms: ["İsviçre", "Switzerland", "Bern"], lat: 46.948, lng: 7.4474, countryCode: "CH", kind: "country" },
  { key: "portugal", label: "Portekiz", searchTerms: ["Portekiz", "Portugal", "Lisbon"], lat: 38.7223, lng: -9.1393, countryCode: "PT", kind: "country" },
  { key: "finland", label: "Finlandiya", searchTerms: ["Finlandiya", "Finland", "Helsinki"], lat: 60.1699, lng: 24.9384, countryCode: "FI", kind: "country" },
  { key: "denmark", label: "Danimarka", searchTerms: ["Danimarka", "Denmark", "Copenhagen"], lat: 55.6761, lng: 12.5683, countryCode: "DK", kind: "country" },
  { key: "czechia", label: "Çekya", searchTerms: ["Çekya", "Czechia", "Czech Republic", "Prague"], lat: 50.0755, lng: 14.4378, countryCode: "CZ", kind: "country" },
  { key: "serbia", label: "Sırbistan", searchTerms: ["Sırbistan", "Serbia", "Belgrade"], lat: 44.7866, lng: 20.4489, countryCode: "RS", kind: "country" },
  { key: "bulgaria", label: "Bulgaristan", searchTerms: ["Bulgaristan", "Bulgaria", "Sofia"], lat: 42.6977, lng: 23.3219, countryCode: "BG", kind: "country" },
  { key: "libya", label: "Libya", searchTerms: ["Libya", "Tripoli"], lat: 32.8872, lng: 13.1913, countryCode: "LY", kind: "country" },
  { key: "tunisia", label: "Tunus", searchTerms: ["Tunus", "Tunisia"], lat: 36.8065, lng: 10.1815, countryCode: "TN", kind: "country" },
  { key: "algeria", label: "Cezayir", searchTerms: ["Cezayir", "Algeria"], lat: 36.7538, lng: 3.0588, countryCode: "DZ", kind: "country" },
  { key: "morocco", label: "Fas", searchTerms: ["Fas", "Morocco", "Rabat"], lat: 34.0209, lng: -6.8416, countryCode: "MA", kind: "country" },
  { key: "yemen", label: "Yemen", searchTerms: ["Yemen", "Sanaa"], lat: 15.3694, lng: 44.191, countryCode: "YE", kind: "country" },
  { key: "afghanistan", label: "Afganistan", searchTerms: ["Afganistan", "Afghanistan", "Kabul"], lat: 34.5553, lng: 69.2075, countryCode: "AF", kind: "country" },
  { key: "venezuela", label: "Venezuela", searchTerms: ["Venezuela", "Caracas"], lat: 10.4806, lng: -66.9036, countryCode: "VE", kind: "country" },
  { key: "colombia", label: "Kolombiya", searchTerms: ["Kolombiya", "Colombia", "Bogota"], lat: 4.711, lng: -74.0721, countryCode: "CO", kind: "country" },
  { key: "chile", label: "Şili", searchTerms: ["Şili", "Chile", "Santiago"], lat: -33.4489, lng: -70.6693, countryCode: "CL", kind: "country" },
  { key: "indonesia", label: "Endonezya", searchTerms: ["Endonezya", "Indonesia", "Jakarta"], lat: -6.2088, lng: 106.8456, countryCode: "ID", kind: "country" },
  { key: "bali", label: "Bali", searchTerms: ["Bali", "Denpasar", "Ubud"], lat: -8.4095, lng: 115.1889, countryCode: "ID", kind: "global-city" },
  { key: "batumi", label: "Batumi", searchTerms: ["Batumi", "Batum", "Batumı"], lat: 41.6168, lng: 41.6367, countryCode: "GE", kind: "global-city" },
  { key: "malaysia", label: "Malezya", searchTerms: ["Malezya", "Malaysia", "Kuala Lumpur"], lat: 3.139, lng: 101.6869, countryCode: "MY", kind: "country" },
  { key: "thailand", label: "Tayland", searchTerms: ["Tayland", "Thailand", "Bangkok"], lat: 13.7563, lng: 100.5018, countryCode: "TH", kind: "country" },
  { key: "vietnam", label: "Vietnam", searchTerms: ["Vietnam", "Hanoi"], lat: 21.0285, lng: 105.8542, countryCode: "VN", kind: "country" },
  { key: "philippines", label: "Filipinler", searchTerms: ["Filipinler", "Philippines", "Manila"], lat: 14.5995, lng: 120.9842, countryCode: "PH", kind: "country" },
  { key: "singapore", label: "Singapur", searchTerms: ["Singapur", "Singapore"], lat: 1.3521, lng: 103.8198, countryCode: "SG", kind: "global-city" },
  { key: "hong-kong", label: "Hong Kong", searchTerms: ["Hong Kong", "Hongkong"], lat: 22.3193, lng: 114.1694, countryCode: "HK", kind: "global-city" },
  { key: "european-union", label: "Avrupa Birliği", searchTerms: ["Avrupa Birliği", "European Union", "AB", "EU"], lat: 50.8503, lng: 4.3517, countryCode: "EU", kind: "country" },
  { key: "nato", label: "NATO", searchTerms: ["NATO", "NAVO", "Kuzey Atlantik"], lat: 50.8503, lng: 4.3517, countryCode: "EU", kind: "country" },
];

export const HABER_HARITASI_GLOBAL_LOCATIONS: HaberHaritasiLocation[] = RAW_GLOBAL_LOCATIONS.map((row) => ({
  ...row,
  zoom: row.zoom ?? (row.kind === "country" ? 5 : 8),
  searchTerms: [...new Set(row.searchTerms.map((t) => t.trim()).filter(Boolean))],
}));

const TR_PROVINCE_SET = new Set(TR_PROVINCE_NAMES_81.map((name) => normalizeHmMapCityKey(name)));

export function isTurkishProvinceName(name: string): boolean {
  return TR_PROVINCE_SET.has(normalizeHmMapCityKey(name));
}

export function matchHaberHaritasiGlobalLocation(
  label: string,
  globalLocations: HaberHaritasiLocation[] = HABER_HARITASI_GLOBAL_LOCATIONS,
): HaberHaritasiLocation | null {
  const primary = String(label ?? "").trim().split(",")[0]?.trim() || "";
  if (!primary) return null;
  const cityKey = normalizeHmMapCityKey(primary);

  const exactMatch = (loc: HaberHaritasiLocation) => {
    const locKey = normalizeHmMapCityKey(loc.label);
    if (locKey === cityKey || loc.key === cityKey) return true;
    return loc.searchTerms.some((term) => normalizeHmMapCityKey(term) === cityKey);
  };

  const cityHit = globalLocations.find((loc) => loc.kind === "global-city" && exactMatch(loc));
  if (cityHit) return cityHit;

  const countryHit = globalLocations.find((loc) => loc.kind === "country" && exactMatch(loc));
  if (countryHit) return countryHit;

  if (cityKey.length >= 4) {
    for (const loc of globalLocations) {
      const locKey = normalizeHmMapCityKey(loc.label);
      if (locKey.length >= 4 && (locKey === cityKey || loc.key === cityKey || locKey.includes(cityKey) || cityKey.includes(locKey))) {
        return loc;
      }
    }
  }
  return null;
}

export function buildTrProvinceLocations(
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
): HaberHaritasiLocation[] {
  const byName = new Map(ilCenters.map((il) => [normalizeHmMapCityKey(il.adi), il]));
  return TR_PROVINCE_NAMES_81.map((name) => {
    const center = byName.get(normalizeHmMapCityKey(name));
    return {
      key: normalizeHmMapCityKey(name),
      label: name,
      searchTerms: [name],
      lat: center?.lat ?? 39.2,
      lng: center?.lng ?? 35.2,
      zoom: Math.max(10, center?.zoom ?? 10),
      countryCode: "TR",
      kind: "tr-province" as const,
    };
  });
}

/** Metin eşleştirmede uzun adlar önce (ör. «New York» > «York»). */
export function sortLocationsForTextMatch(locations: HaberHaritasiLocation[]): HaberHaritasiLocation[] {
  return [...locations].sort((a, b) => {
    const maxA = Math.max(...a.searchTerms.map((t) => t.length));
    const maxB = Math.max(...b.searchTerms.map((t) => t.length));
    if (maxB !== maxA) return maxB - maxA;
    if (a.kind === "global-city" && b.kind === "country") return -1;
    if (a.kind === "country" && b.kind === "global-city") return 1;
    return a.label.localeCompare(b.label, "tr-TR");
  });
}

/**
 * Konum listesi newsmap oluşturucularında ~8× yeniden kurulur (haritayı açarken donma kaynağı).
 * `ilCenters` referansına göre önbelleğe alınır — aynı oturumda tek dizi paylaşılır ve
 * aşağı akıştaki çözümleme önbellekleri (item→konum) kararlı kimlikten yararlanır.
 */
const matchLocationsCache = new WeakMap<object, HaberHaritasiLocation[]>();
let matchLocationsEmptyFallback: HaberHaritasiLocation[] | null = null;

export function allHaberHaritasiMatchLocations(
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
): HaberHaritasiLocation[] {
  if (!ilCenters || ilCenters.length === 0) {
    if (!matchLocationsEmptyFallback) {
      matchLocationsEmptyFallback = sortLocationsForTextMatch([
        ...buildTrProvinceLocations([]),
        ...HABER_HARITASI_GLOBAL_LOCATIONS,
      ]);
    }
    return matchLocationsEmptyFallback;
  }
  const cached = matchLocationsCache.get(ilCenters);
  if (cached) return cached;
  const built = sortLocationsForTextMatch([
    ...buildTrProvinceLocations(ilCenters),
    ...HABER_HARITASI_GLOBAL_LOCATIONS,
  ]);
  matchLocationsCache.set(ilCenters, built);
  return built;
}
