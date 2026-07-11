import type { SearchLocationContext } from "@/components/search/SearchLocationRightPanel";
import { isCityLocationHeroQuery } from "@/components/search/SearchLocationRightPanel";

export type HaritalarSearchItem = {
  id: string;
  name: string;
  slug?: string | null;
  resultType?: string;
  typeLabel?: string;
  href: string;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  categoryName?: string | null;
  price?: number | null;
  subtitle?: string | null;
  storeType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type HaritalarQueryIntent = "location" | "business" | "topic";

export type HaritalarSectionKey =
  | "isletmeler"
  | "seyahat"
  | "oteller"
  | "rentacar"
  | "etkinlik"
  | "siparis"
  | "urunler";

export type HaritalarSectionDef = {
  key: HaritalarSectionKey;
  label: string;
  emoji: string;
  items: HaritalarSearchItem[];
  seeAllHref: string;
};

export type HaritalarBucketsInput = {
  query: string;
  locationContext?: SearchLocationContext | null;
  cityCount: number;
  cityQuickFacts?: unknown;
  mapItems: HaritalarSearchItem[];
  sariSayfalarItems: HaritalarSearchItem[];
  hizmetItems: HaritalarSearchItem[];
  otomotivItems: HaritalarSearchItem[];
  tourismItems: HaritalarSearchItem[];
  yemekMarketItems: HaritalarSearchItem[];
  urunlerItems: HaritalarSearchItem[];
};

function dedupeItems(...lists: HaritalarSearchItem[][]): HaritalarSearchItem[] {
  const seen = new Set<string>();
  const items: HaritalarSearchItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item.id.replace(/^map-pin-/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  return items;
}

function isHotelItem(item: HaritalarSearchItem): boolean {
  const t = String(item.storeType ?? "").toLowerCase();
  if (t === "hotel" || t === "villa" || t === "space") return true;
  const label = `${item.typeLabel ?? ""} ${item.categoryName ?? ""}`.toLocaleLowerCase("tr-TR");
  return label.includes("konaklama") || label.includes("otel") || label.includes("villa");
}

function isRentCarItem(item: HaritalarSearchItem): boolean {
  const t = String(item.storeType ?? "").toLowerCase();
  if (t === "car") return true;
  const label = `${item.typeLabel ?? ""} ${item.categoryName ?? ""}`.toLocaleLowerCase("tr-TR");
  return label.includes("araç kiralama") || label.includes("arac kiralama") || label.includes("rent");
}

function isEventItem(item: HaritalarSearchItem): boolean {
  const t = String(item.storeType ?? "").toLowerCase();
  if (t === "etkinlik_mekan" || t === "tour" || t === "event") return true;
  const label = `${item.typeLabel ?? ""} ${item.categoryName ?? ""} ${item.name}`.toLocaleLowerCase("tr-TR");
  return (
    label.includes("etkinlik") ||
    label.includes("konser") ||
    label.includes("festival") ||
    label.includes("tiyatro") ||
    label.includes("bilet")
  );
}

function isFoodVendorItem(item: HaritalarSearchItem): boolean {
  const superCat = String(item.resultType ?? "").toLowerCase();
  if (superCat === "vendor_food" || superCat === "vendor_grocery") return true;
  const t = String(item.storeType ?? "").toLowerCase();
  if (t.includes("restoran") || t.includes("yemek") || t.includes("market")) return true;
  const label = `${item.typeLabel ?? ""} ${item.categoryName ?? ""}`.toLocaleLowerCase("tr-TR");
  return label.includes("yemek") || label.includes("market") || label.includes("restoran");
}

export function detectHaritalarQueryIntent(input: {
  query: string;
  locationContext?: SearchLocationContext | null;
  cityCount: number;
  cityQuickFacts?: unknown;
  businessCount: number;
}): HaritalarQueryIntent {
  const isCity = isCityLocationHeroQuery({
    locationContext: input.locationContext,
    cityCount: input.cityCount,
    cityQuickFacts: input.cityQuickFacts,
  });
  if (isCity) return "location";

  const ctx = input.locationContext;
  if (ctx?.locationIntent && ctx.businesses.length > 0 && !ctx.city) {
    return "business";
  }

  if (input.businessCount > 0 && !isCity) {
    const qNorm = input.query.trim().toLocaleLowerCase("tr-TR");
    const hasExactBusiness = ctx?.businesses.some(
      (b) => b.name.trim().toLocaleLowerCase("tr-TR") === qNorm,
    );
    if (hasExactBusiness || input.businessCount <= 3) return "business";
  }

  if (ctx?.locationIntent) return "location";
  return "topic";
}

function cityLabel(input: HaritalarBucketsInput): string {
  return (
    input.locationContext?.city?.name ??
    input.locationContext?.label ??
    input.query.trim()
  );
}

function seeAll(path: string, q: string, city?: string): string {
  const params = new URLSearchParams({ q });
  if (city && city !== q) params.set("city", city);
  return `${path}?${params.toString()}`;
}

export function buildHaritalarSections(input: HaritalarBucketsInput): HaritalarSectionDef[] {
  const q = input.query.trim();
  const city = cityLabel(input);

  const isletmeler = dedupeItems(
    input.sariSayfalarItems,
    input.hizmetItems,
    input.otomotivItems,
    input.mapItems,
  ).filter((item) => !isEventItem(item));

  const oteller = input.tourismItems.filter(isHotelItem);
  const rentacar = input.tourismItems.filter(isRentCarItem);
  const etkinlikFromMap = dedupeItems(input.mapItems, input.sariSayfalarItems).filter(isEventItem);
  const etkinlikFromTourism = input.tourismItems.filter(
    (item) => isEventItem(item) && !isHotelItem(item) && !isRentCarItem(item),
  );
  const etkinlik = dedupeItems(etkinlikFromMap, etkinlikFromTourism);

  const siparisFromMarket = input.yemekMarketItems;
  const siparisFromMap = dedupeItems(input.sariSayfalarItems, input.mapItems).filter(isFoodVendorItem);
  const siparis = dedupeItems(siparisFromMarket, siparisFromMap);

  const seyahat = input.tourismItems.filter(
    (item) => !isHotelItem(item) && !isRentCarItem(item) && !isEventItem(item),
  );

  const urunler = input.urunlerItems;

  const sections: HaritalarSectionDef[] = [
    {
      key: "isletmeler",
      label: "İşletmeler",
      emoji: "🏪",
      items: isletmeler,
      seeAllHref: seeAll("/kesfet/liste", q, city),
    },
    {
      key: "seyahat",
      label: "Seyahat",
      emoji: "✈️",
      items: dedupeItems(input.tourismItems.filter((item) => !isHotelItem(item) && !isRentCarItem(item)), seyahat),
      seeAllHref: seeAll("/turizm", q, city),
    },
    {
      key: "oteller",
      label: "Oteller",
      emoji: "🏨",
      items: oteller,
      seeAllHref: seeAll("/turizm/konaklama", q, city),
    },
    {
      key: "rentacar",
      label: "Rent a Car",
      emoji: "🚗",
      items: rentacar,
      seeAllHref: seeAll("/turizm/arac-kiralama", q, city),
    },
    {
      key: "etkinlik",
      label: "Etkinlik",
      emoji: "🎫",
      items: etkinlik,
      seeAllHref: seeAll("/turizm/etkinlik", q, city),
    },
    {
      key: "siparis",
      label: "Sipariş",
      emoji: "🍽️",
      items: siparis,
      seeAllHref: seeAll("/siparis", q, city),
    },
    {
      key: "urunler",
      label: "Ürünler",
      emoji: "🛍️",
      items: urunler,
      seeAllHref: seeAll("/magaza/urunler", q, city),
    },
  ];

  return sections;
}

export function primaryHaritalarSection(sections: HaritalarSectionDef[]): HaritalarSectionKey {
  const order: HaritalarSectionKey[] = [
    "isletmeler",
    "oteller",
    "seyahat",
    "rentacar",
    "etkinlik",
    "siparis",
    "urunler",
  ];
  for (const key of order) {
    const section = sections.find((s) => s.key === key);
    if (section && section.items.length > 0) return key;
  }
  return "isletmeler";
}
