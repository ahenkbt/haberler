export type DeliveryBusinessModule = "food" | "market" | "nearby";

export type DeliveryCategoryLike = {
  id?: number | string | null;
  name?: string | null;
  slug?: string | null;
  superCategory?: string | null;
  super_category?: string | null;
};

export type DeliveryVendorLike = {
  categoryId?: number | string | null;
  category_id?: number | string | null;
  categoryName?: string | null;
  name?: string | null;
  slug?: string | null;
  tags?: string[] | string | null;
};

export const DELIVERY_MODULES: Array<{
  key: DeliveryBusinessModule;
  label: string;
  shortLabel: string;
  href: string;
  emoji: string;
  description: string;
}> = [
  {
    key: "food",
    label: "Yekpare Yemek",
    shortLabel: "Yemek",
    href: "/yemek",
    emoji: "🍽️",
    description: "Restoran, kafe, pastane, simit ve börek işletmeleri",
  },
  {
    key: "market",
    label: "Yekpare Market",
    shortLabel: "Market",
    href: "/market",
    emoji: "🛒",
    description: "Market, manav, kasap, şarküteri, fırın, su ve içecek",
  },
  {
    key: "nearby",
    label: "Yekpare Yakınımdakiler",
    shortLabel: "Yakınımdakiler",
    href: "/isletmeler",
    emoji: "🏪",
    description: "Yapı market, elektronik, moda, petshop ve yerel dükkanlar",
  },
];

const FOOD_TERMS = [
  "restaurant",
  "restoran",
  "lokanta",
  "yemek",
  "cafe",
  "kafe",
  "pastane",
  "simit",
  "borek",
  "pide",
  "lahmacun",
  "kebap",
  "kebab",
  "doner",
  "pizza",
  "burger",
  "kofte",
  "tatli",
  "baklava",
  "cig kofte",
  "kahvalti",
];

const MARKET_TERMS = [
  "market",
  "grocery",
  "bakkal",
  "manav",
  "kuruyemis",
  "aktar",
  "tavuk",
  "kasap",
  "sarkuteri",
  "firin",
  "yufka",
  "su",
  "icecek",
  "mesrubat",
  "balik",
  "balikci",
  "bakliyat",
  "organik",
  "mandira",
  "sut",
  "peynir",
  "zeytin",
];

/** Yakınımdakiler şeridinden çıkarılan kategoriler (otomotiv modülüne taşındı) */
export const NEARBY_EXCLUDED_SLUGS = new Set(["yedek-parca", "oto-yedek-parca", "yedek-parca-oto"]);
const NEARBY_OTO_EXCLUDED_TERMS = ["yedek parca", "oto parca", "oto yedek", "yedek parca oto"];

const NEARBY_TERMS = [
  "yapi market",
  "hirdavat",
  "elektronik",
  "giyim",
  "moda",
  "petshop",
  "pet shop",
  "kozmetik",
  "hediyelik",
  "bijuteri",
  "cicekci",
  "ayakkabici",
  "nalburiye",
  "oyuncak",
  "mobilya",
  "kirtasiye",
];

function normalizeForGroup(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesAnyTerm(haystack: string, terms: string[]): boolean {
  return terms.some((term) => {
    const normalizedTerm = normalizeForGroup(term);
    return new RegExp(`(^|\\s)${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(haystack);
  });
}

export function isNearbyExcludedCategory(input: DeliveryCategoryLike | string | null | undefined): boolean {
  const raw =
    typeof input === "string"
      ? input
      : [input?.name, input?.slug, input?.superCategory, input?.super_category].filter(Boolean).join(" ");
  const text = normalizeForGroup(raw);
  const slug = normalizeForGroup(typeof input === "string" ? input : input?.slug);
  if (slug && NEARBY_EXCLUDED_SLUGS.has(slug)) return true;
  return includesAnyTerm(text, NEARBY_OTO_EXCLUDED_TERMS);
}

export function classifyDeliveryCategory(input: DeliveryCategoryLike | string | null | undefined): DeliveryBusinessModule {
  const raw =
    typeof input === "string"
      ? input
      : [input?.name, input?.slug, input?.superCategory, input?.super_category].filter(Boolean).join(" ");
  const text = normalizeForGroup(raw);
  if (includesAnyTerm(text, FOOD_TERMS)) return "food";
  if (includesAnyTerm(text, MARKET_TERMS)) return "market";
  if (includesAnyTerm(text, NEARBY_TERMS)) return "nearby";
  return "nearby";
}

export function deliveryCategoryBelongsToModule(
  category: DeliveryCategoryLike,
  moduleKey: DeliveryBusinessModule,
): boolean {
  if (moduleKey === "nearby" && isNearbyExcludedCategory(category)) return false;
  return classifyDeliveryCategory(category) === moduleKey;
}

export function deliveryVendorModule(
  vendor: DeliveryVendorLike,
  categories: DeliveryCategoryLike[],
): DeliveryBusinessModule {
  const rawCategoryId = vendor.categoryId ?? vendor.category_id;
  const categoryId = rawCategoryId == null ? null : String(rawCategoryId);
  const category = categoryId
    ? categories.find((cat) => cat.id != null && String(cat.id) === categoryId)
    : undefined;
  if (category) return classifyDeliveryCategory(category);

  const tags = Array.isArray(vendor.tags) ? vendor.tags.join(" ") : String(vendor.tags ?? "");
  return classifyDeliveryCategory([vendor.categoryName, vendor.name, vendor.slug, tags].filter(Boolean).join(" "));
}

export function deliveryVendorBelongsToModule(
  vendor: DeliveryVendorLike,
  categories: DeliveryCategoryLike[],
  moduleKey: DeliveryBusinessModule,
): boolean {
  return deliveryVendorModule(vendor, categories) === moduleKey;
}
