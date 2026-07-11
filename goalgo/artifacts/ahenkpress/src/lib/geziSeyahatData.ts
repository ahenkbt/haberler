import { POPULAR_CITIES } from "./popularCities";
import { TRV_DEST_IMAGES } from "@/themes/travlla/travllaMedia";
import { wikiTitleToUrlSlug } from "./wikiArticleSlug";

export type GeziDestination = {
  name: string;
  country: string;
  region: GeziRegion;
  excerpt: string;
  image: string;
  /** Ansiklopedi madde linki */
  wikiHref: string;
  /** İsteğe bağlı turizm destinasyon slug */
  turizmSlug?: string;
};

export type GeziRegion = "turkiye" | "avrupa" | "asya" | "afrika" | "amerika" | "orta-dogu";

export type GeziCountry = {
  id: string;
  name: string;
  region: GeziRegion;
  flag: string;
  image: string;
  excerpt: string;
  destinations: GeziDestination[];
};

const wiki = (title: string) => `/bilgiagaci/${wikiTitleToUrlSlug(title)}`;

function cityImage(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "");
  return TRV_DEST_IMAGES[key] ?? "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80";
}

/** Türkiye — popüler şehirler + öne çıkan rotalar */
export const GEZI_TURKEY_DESTINATIONS: GeziDestination[] = [
  ...POPULAR_CITIES.map((city) => ({
    name: city.name,
    country: "Türkiye",
    region: "turkiye" as const,
    excerpt: city.label ? `${city.name} — ${city.label}` : `${city.name} rehberi`,
    image: cityImage(city.name),
    wikiHref: wiki(city.name),
    turizmSlug: city.name.toLowerCase().replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c"),
  })),
  {
    name: "Kapadokya",
    country: "Türkiye",
    region: "turkiye",
    excerpt: "Peri bacaları, balon turları ve vadiler",
    image: TRV_DEST_IMAGES.kapadokya,
    wikiHref: wiki("Kapadokya"),
    turizmSlug: "kapadokya",
  },
  {
    name: "Pamukkale",
    country: "Türkiye",
    region: "turkiye",
    excerpt: "Traverten terasları ve Hierapolis antik kenti",
    image: TRV_DEST_IMAGES.pamukkale,
    wikiHref: wiki("Pamukkale"),
    turizmSlug: "pamukkale",
  },
  {
    name: "Bodrum",
    country: "Türkiye",
    region: "turkiye",
    excerpt: "Ege koyları ve yaz rotaları",
    image: TRV_DEST_IMAGES.bodrum,
    wikiHref: wiki("Bodrum"),
    turizmSlug: "bodrum",
  },
  {
    name: "Fethiye",
    country: "Türkiye",
    region: "turkiye",
    excerpt: "Ölüdeniz ve Likya yolu",
    image: TRV_DEST_IMAGES.fethiye,
    wikiHref: wiki("Fethiye"),
    turizmSlug: "fethiye",
  },
];

export const GEZI_COUNTRIES: GeziCountry[] = [
  {
    id: "italya",
    name: "İtalya",
    region: "avrupa",
    flag: "🇮🇹",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=900&q=80",
    excerpt: "Rönesans, gastronomi ve Akdeniz kıyıları",
    destinations: [
      { name: "Roma", country: "İtalya", region: "avrupa", excerpt: "Kolezyum, Vatikan ve antik Roma", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=900&q=80", wikiHref: wiki("Roma") },
      { name: "Venedik", country: "İtalya", region: "avrupa", excerpt: "Kanallar ve gotik mimari", image: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=900&q=80", wikiHref: wiki("Venedik") },
      { name: "Floransa", country: "İtalya", region: "avrupa", excerpt: "Uffizi ve Toskana kapısı", image: "https://images.unsplash.com/photo-1543429779-278ad9d3711f?w=900&q=80", wikiHref: wiki("Floransa") },
    ],
  },
  {
    id: "fransa",
    name: "Fransa",
    region: "avrupa",
    flag: "🇫🇷",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80",
    excerpt: "Paris, Provence ve Riviera",
    destinations: [
      { name: "Paris", country: "Fransa", region: "avrupa", excerpt: "Eyfel, Louvre ve Seine", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80", wikiHref: wiki("Paris") },
      { name: "Nice", country: "Fransa", region: "avrupa", excerpt: "Côte d'Azur ve Promenade", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=900&q=80", wikiHref: wiki("Nice") },
    ],
  },
  {
    id: "yunanistan",
    name: "Yunanistan",
    region: "avrupa",
    flag: "🇬🇷",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=900&q=80",
    excerpt: "Adalar, antik kentler ve Ege",
    destinations: [
      { name: "Atina", country: "Yunanistan", region: "avrupa", excerpt: "Akropolis ve Plaka", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=900&q=80", wikiHref: wiki("Atina") },
      { name: "Santorini", country: "Yunanistan", region: "avrupa", excerpt: "Beyaz evler ve volkanik manzara", image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=900&q=80", wikiHref: wiki("Santorini") },
    ],
  },
  {
    id: "ispanya",
    name: "İspanya",
    region: "avrupa",
    flag: "🇪🇸",
    image: "https://images.unsplash.com/photo-1583422409516-2895a84ef6b5?w=900&q=80",
    excerpt: "Gaudi, tapas ve Akdeniz",
    destinations: [
      { name: "Barselona", country: "İspanya", region: "avrupa", excerpt: "Sagrada Familia ve Las Ramblas", image: "https://images.unsplash.com/photo-1583422409516-2895a84ef6b5?w=900&q=80", wikiHref: wiki("Barselona") },
      { name: "Madrid", country: "İspanya", region: "avrupa", excerpt: "Prado ve kraliyet sarayları", image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=900&q=80", wikiHref: wiki("Madrid") },
    ],
  },
  {
    id: "japonya",
    name: "Japonya",
    region: "asya",
    flag: "🇯🇵",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80",
    excerpt: "Tapınaklar, teknoloji ve dört mevsim",
    destinations: [
      { name: "Tokyo", country: "Japonya", region: "asya", excerpt: "Shibuya, Asakusa ve modern şehir", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80", wikiHref: wiki("Tokyo") },
      { name: "Kyoto", country: "Japonya", region: "asya", excerpt: "Fushimi Inari ve geleneksel sokaklar", image: "https://images.unsplash.com/photo-1493976040374-85c8e912f636?w=900&q=80", wikiHref: wiki("Kyoto") },
    ],
  },
  {
    id: "bae",
    name: "Birleşik Arap Emirlikleri",
    region: "orta-dogu",
    flag: "🇦🇪",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=80",
    excerpt: "Çöl, gökdelenler ve lüks tatil",
    destinations: [
      { name: "Dubai", country: "BAE", region: "orta-dogu", excerpt: "Burj Khalifa ve çöl safarisi", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=80", wikiHref: wiki("Dubai") },
      { name: "Abu Dabi", country: "BAE", region: "orta-dogu", excerpt: "Şeyh Zayed Camii ve Louvre", image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=900&q=80", wikiHref: wiki("Abu Dabi") },
    ],
  },
  {
    id: "misir",
    name: "Mısır",
    region: "afrika",
    flag: "🇪🇬",
    image: "https://images.unsplash.com/photo-1572252002811-bfd36f375407?w=900&q=80",
    excerpt: "Piramitler, Nil ve antik uygarlık",
    destinations: [
      { name: "Kahire", country: "Mısır", region: "afrika", excerpt: "Giza ve İslami Kahire", image: "https://images.unsplash.com/photo-1572252002811-bfd36f375407?w=900&q=80", wikiHref: wiki("Kahire") },
      { name: "Luksor", country: "Mısır", region: "afrika", excerpt: "Karnak ve Krallar Vadisi", image: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=900&q=80", wikiHref: wiki("Luksor") },
    ],
  },
  {
    id: "abd",
    name: "Amerika Birleşik Devletleri",
    region: "amerika",
    flag: "🇺🇸",
    image: "https://images.unsplash.com/photo-1496442226666-8d0d0e62e9e9?w=900&q=80",
    excerpt: "Metropoller ve doğa parkları",
    destinations: [
      { name: "New York", country: "ABD", region: "amerika", excerpt: "Manhattan, Broadway ve Central Park", image: "https://images.unsplash.com/photo-1496442226666-8d0d0e62e9e9?w=900&q=80", wikiHref: wiki("New York") },
      { name: "Los Angeles", country: "ABD", region: "amerika", excerpt: "Hollywood ve Pasifik kıyısı", image: "https://images.unsplash.com/photo-1534190236510-9779e4a957da?w=900&q=80", wikiHref: wiki("Los Angeles") },
    ],
  },
];

export const GEZI_REGION_FILTERS: { label: string; value: GeziRegion | "all" }[] = [
  { label: "Tümü", value: "all" },
  { label: "Türkiye", value: "turkiye" },
  { label: "Avrupa", value: "avrupa" },
  { label: "Asya", value: "asya" },
  { label: "Afrika", value: "afrika" },
  { label: "Amerika", value: "amerika" },
  { label: "Orta Doğu", value: "orta-dogu" },
];

export const GEZI_EDITORIAL_FEATURES = [
  { num: "01", title: "Keşfet", body: "Şehir ve ülke rehberlerini Bilgi Ağacı maddeleriyle okuyun." },
  { num: "02", title: "Planla", body: "Rotaları karşılaştırın; rezervasyon için Seyahat modülüne geçin." },
  { num: "03", title: "Paylaş", body: "Favori destinasyonlarınızı kaydedin ve arkadaşlarınıza önerin." },
  { num: "04", title: "Derinleş", body: "Tarih, kültür ve coğrafya bağlantılarıyla konuyu genişletin." },
];
