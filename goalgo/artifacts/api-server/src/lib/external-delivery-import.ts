import { fetchAndParseVendor } from "./food-platform-import";
import { fetchExternalApiViaEdge, fetchExternalPageHtml } from "./fetch-external-page";

export type ExternalPlatform =
  | "yemeksepeti"
  | "getir-yemek"
  | "getir-carsi"
  | "migros-yemek"
  | "trendyol-yemek"
  | "tgo"
  | "google-maps"
  | "local-aladdin"
  | "unknown";

export interface ImportedOptionGroup {
  name: string;
  required?: boolean;
  multiple?: boolean;
  choices: Array<{ name: string; price?: number }>;
}

export interface ImportedMenuItem {
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  options?: ImportedOptionGroup[];
}

export interface ImportedVendorData {
  platform: ExternalPlatform;
  sourceUrl: string;
  sourceId?: string | null;
  name: string;
  description?: string | null;
  phone?: string | null;
  /** Yerel Excel içe aktarımında doldurulabilir */
  email?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
  workingHours?: string | null;
  /** aggregateRating / sayfa meta */
  rating?: number | null;
  reviewCount?: number | null;
  isOpen: boolean;
  menu: ImportedMenuItem[];
}

export type ExternalMenuPreviewCategory = {
  name: string;
  items: ImportedMenuItem[];
};

export type ExternalMenuPreview = {
  platform: ExternalPlatform;
  sourceUrl: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isOpen: boolean;
  categories: ExternalMenuPreviewCategory[];
  totalItems: number;
};

export function groupMenuByCategory(menu: ImportedMenuItem[]): ExternalMenuPreviewCategory[] {
  const map = new Map<string, ImportedMenuItem[]>();
  for (const item of menu) {
    const cat = normalizeText(item.category) || "Diğer";
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .map(([name, items]) => ({ name, items }));
}

export function filterMenuSelection(
  menu: ImportedMenuItem[],
  selectedCategories?: string[] | null,
): ImportedMenuItem[] {
  if (!selectedCategories?.length) return menu;
  const allowed = new Set(selectedCategories.map((c) => normalizeText(c).toLowerCase()).filter(Boolean));
  if (!allowed.size) return menu;
  return menu.filter((m) => allowed.has((normalizeText(m.category) || "Diğer").toLowerCase()));
}

export function buildExternalMenuPreview(data: ImportedVendorData): ExternalMenuPreview {
  const categories = groupMenuByCategory(data.menu);
  return {
    platform: data.platform,
    sourceUrl: data.sourceUrl,
    name: data.name,
    description: data.description ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    district: data.district ?? null,
    neighborhood: data.neighborhood ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    imageUrl: data.imageUrl ?? null,
    rating: data.rating ?? null,
    reviewCount: data.reviewCount ?? null,
    isOpen: data.isOpen,
    categories,
    totalItems: data.menu.length,
  };
}

export function externalMenuPreviewPayload(imported: ImportedVendorData) {
  const preview = buildExternalMenuPreview(imported);
  const warning =
    imported.menu.length === 0
      ? imported.description?.includes("HTTP")
        ? imported.description
        : imported.platform === "yemeksepeti"
          ? "Menü otomatik çekilemedi (Yemeksepeti bot koruması). Sayfa kaynağını (Ctrl+U) tekrar yapıştırıp deneyin veya birkaç dakika sonra önizleyin."
          : "Menü ürünü bulunamadı. Getir/Yemeksepeti sunucu isteğini engellemiş olabilir; sayfa kaynağı veya CSV deneyin."
      : undefined;
  return { preview, rawMenu: imported.menu, warning };
}

type LocationHints = {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
};

function titleCaseTrSlug(raw: string): string {
  return normalizeText(raw)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function pickLongerText(a: string | null | undefined, b: string | null | undefined): string | null {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x) return y || null;
  if (!y) return x || null;
  return y.length > x.length ? y : x;
}

function mergeLocationHints(...parts: Array<LocationHints | null | undefined>): LocationHints {
  const out: LocationHints = {};
  for (const p of parts) {
    if (!p) continue;
    out.address = pickLongerText(out.address, p.address);
    out.city = out.city || p.city || null;
    out.district = out.district || p.district || null;
    out.neighborhood = out.neighborhood || p.neighborhood || null;
    out.phone = out.phone || p.phone || null;
    if (out.lat == null && p.lat != null) out.lat = p.lat;
    if (out.lng == null && p.lng != null) out.lng = p.lng;
  }
  return out;
}

function parseLocationFromUrl(url: string, platform: ExternalPlatform): LocationHints {
  const out: LocationHints = {};
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const slug = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    if (!slug) return out;

    if (platform === "getir-yemek" || platform === "getir-carsi") {
      const mahIdx = slug.indexOf("-mah-");
      if (mahIdx >= 0) {
        const before = slug.slice(0, mahIdx);
        const after = slug.slice(mahIdx + 5);
        const beforeParts = before.split("-").filter(Boolean);
        const afterParts = after.split("-").filter(Boolean);
        if (afterParts.length >= 2) {
          out.city = titleCaseTrSlug(afterParts[afterParts.length - 1]);
          out.district = titleCaseTrSlug(afterParts.slice(0, -1).join("-"));
        } else if (afterParts.length === 1) {
          out.city = titleCaseTrSlug(afterParts[0]);
        }
        const mahParts = beforeParts.slice(-2);
        if (mahParts.length) {
          const mah = titleCaseTrSlug(mahParts.join("-"));
          out.neighborhood = /mah/i.test(mah) ? mah : `${mah} Mah`;
        }
      } else {
        const parts = slug.split("-").filter(Boolean);
        const trCities = new Set([
          "istanbul", "izmir", "ankara", "bursa", "antalya", "adana", "konya", "gaziantep",
          "mersin", "kayseri", "eskisehir", "diyarbakir", "samsun", "denizli", "sanliurfa",
        ]);
        if (parts.length >= 2 && trCities.has(parts[parts.length - 1])) {
          out.city = titleCaseTrSlug(parts[parts.length - 1]);
          if (parts.length >= 3) out.district = titleCaseTrSlug(parts[parts.length - 2]);
        }
      }
    }

    if (platform === "yemeksepeti" && path.includes("/restaurant/")) {
      const parts = slug.split("-").filter(Boolean);
      const trCities = ["istanbul", "izmir", "ankara", "bursa", "antalya", "adana", "konya"];
      if (parts.length >= 2 && trCities.includes(parts[parts.length - 1])) {
        out.city = titleCaseTrSlug(parts[parts.length - 1]);
      }
    }
  } catch {
    /* noop */
  }
  return out;
}

function deepCollectLocation(node: any, out: LocationHints) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) deepCollectLocation(n, out);
    return;
  }
  if (typeof node !== "object") return;

  const addrKeys = [
    "fullAddress", "formattedAddress", "openAddress", "streetAddress", "addressLine", "addressText", "addressDetail",
  ] as const;
  for (const k of addrKeys) {
    const v = normalizeText(node[k]);
    if (v.length >= 6) out.address = pickLongerText(out.address, v);
  }
  const plainAddr = normalizeText(node.address);
  if (plainAddr.length >= 6 && !plainAddr.startsWith("{")) out.address = pickLongerText(out.address, plainAddr);

  const city = normalizeText(
    node.city ?? node.cityName ?? node.province ?? node.provinceName ?? node.addressLocality ?? node.il,
  );
  if (city) out.city = out.city || city;

  const district = normalizeText(
    node.district ?? node.districtName ?? node.county ?? node.town ?? node.addressRegion ?? node.ilce ?? node.townName,
  );
  if (district) out.district = out.district || district;

  const neighborhood = normalizeText(
    node.neighborhood ?? node.neighbourhood ?? node.mahalle ?? node.subDistrict ?? node.quarter ?? node.areaName ?? node.addressLocality2,
  );
  if (neighborhood) out.neighborhood = out.neighborhood || neighborhood;

  const lat = toNumber(node.latitude ?? node.lat ?? node.location?.latitude ?? node.location?.lat ?? node.geo?.latitude);
  const lng = toNumber(node.longitude ?? node.lng ?? node.location?.longitude ?? node.location?.lng ?? node.geo?.longitude);
  if (lat != null && lat >= -90 && lat <= 90 && out.lat == null) out.lat = lat;
  if (lng != null && lng >= -180 && lng <= 180 && out.lng == null) out.lng = lng;

  const coords = node.coordinates ?? node.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const a = toNumber(coords[0]);
    const b = toNumber(coords[1]);
    if (a != null && b != null) {
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        if (out.lat == null) out.lat = a;
        if (out.lng == null) out.lng = b;
      } else if (Math.abs(b) <= 90 && Math.abs(a) <= 180) {
        if (out.lat == null) out.lat = b;
        if (out.lng == null) out.lng = a;
      }
    }
  }

  const phone = normalizeText(node.phone ?? node.telephone ?? node.phoneNumber ?? node.mobilePhone ?? node.contactPhone);
  if (phone && phone.replace(/\D/g, "").length >= 10) out.phone = out.phone || phone;

  for (const v of Object.values(node)) {
    if (v && typeof v === "object") deepCollectLocation(v, out);
  }
}

function extractPhoneFromHtml(html: string): string | null {
  const patterns = [
    /"phone(?:Number)?"\s*:\s*"(\+?90[\d\s\-()]{10,18})"/i,
    /"telephone"\s*:\s*"(\+?90[\d\s\-()]{10,18})"/i,
    /(\+90[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/,
    /(0\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return normalizeText(m[1]);
  }
  return null;
}

export function buildMergedAddress(hints: LocationHints): string | null {
  const street = normalizeText(hints.address);
  const mah = normalizeText(hints.neighborhood);
  if (mah && street) {
    if (street.toLowerCase().includes(mah.toLowerCase())) return street;
    return `${mah}, ${street}`;
  }
  return street || mah || null;
}

function extractRatingFromJsonLd(jsonLd: any[]): { rating: number | null; reviewCount: number | null } {
  let rating: number | null = null;
  let reviewCount: number | null = null;
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    const t = String(node["@type"] ?? "").toLowerCase();
    if (t.includes("aggregaterating") || node.ratingValue != null || node.ratingCount != null) {
      const rv = toNumber(node.ratingValue ?? node.rating ?? node.averageRating);
      const rc = toNumber(node.reviewCount ?? node.ratingCount ?? node.userRatingCount);
      if (rv != null && rv > 0 && rv <= 5) rating = rv;
      if (rc != null && rc >= 0) reviewCount = Math.round(rc);
    }
    if (node.aggregateRating && typeof node.aggregateRating === "object") {
      walk(node.aggregateRating);
    }
    for (const v of Object.values(node)) {
      if (v && typeof v === "object") walk(v);
    }
  };
  for (const obj of jsonLd) walk(obj);
  return { rating, reviewCount };
}

function extractRatingFromHtml(html: string): { rating: number | null; reviewCount: number | null } {
  let rating: number | null = null;
  let reviewCount: number | null = null;
  const ratingPatterns = [
    /"ratingValue"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/i,
    /"averageRating"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/i,
    /"score"\s*:\s*"?(\d+(?:[.,]\d+)?)"?[\s\S]{0,120}"(?:type|@type)"\s*:\s*"Rating"/i,
  ];
  for (const re of ratingPatterns) {
    const m = html.match(re);
    if (m) {
      const n = toNumber(m[1]);
      if (n != null && n > 0 && n <= 5) {
        rating = n;
        break;
      }
    }
  }
  const reviewPatterns = [
    /"reviewCount"\s*:\s*"?(\d+)"?/i,
    /"ratingCount"\s*:\s*"?(\d+)"?/i,
    /"userRatingCount"\s*:\s*"?(\d+)"?/i,
  ];
  for (const re of reviewPatterns) {
    const m = html.match(re);
    if (m) {
      const n = toNumber(m[1]);
      if (n != null && n >= 0) {
        reviewCount = Math.round(n);
        break;
      }
    }
  }
  return { rating, reviewCount };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPartialFromUrl(sourceUrl: string, platform: ExternalPlatform, status?: number): ImportedVendorData {
  const loc = mergeLocationHints(parseLocationFromUrl(sourceUrl, platform));
  const name = fallbackVendorNameFromUrl(sourceUrl);
  return {
    platform,
    sourceUrl,
    sourceId: pickSourceId(sourceUrl),
    name,
    description:
      status != null
        ? `Sayfa sunucudan alınamadı (HTTP ${status}). Adres bilgisi URL'den çıkarıldı; menü için CSV veya farklı link deneyin.`
        : null,
    phone: loc.phone ?? null,
    address: buildMergedAddress(loc),
    city: loc.city ?? null,
    district: loc.district ?? null,
    neighborhood: loc.neighborhood ?? null,
    lat: loc.lat ?? null,
    lng: loc.lng ?? null,
    imageUrl: null,
    coverUrl: null,
    workingHours: null,
    isOpen: true,
    menu: [],
  };
}

function uniqByName<T extends { name?: string | null }>(arr: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    const k = String(item.name ?? "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function menuItemQualityScore(item: ImportedMenuItem): number {
  let s = 0;
  if (normalizeText(item.imageUrl)) s += 4;
  const cat = normalizeText(item.category);
  if (cat && cat !== "Diğer" && cat !== "En Sevilenler") s += 2;
  else if (cat && cat !== "Diğer") s += 1;
  if (normalizeText(item.description)) s += 1;
  return s;
}

/** Aynı isimli ürünlerde resim + gerçek kategori tercih edilir (Getir çift kayıt). */
function uniqMenuItems(arr: ImportedMenuItem[]): ImportedMenuItem[] {
  const map = new Map<string, ImportedMenuItem>();
  for (const item of arr) {
    const k = normalizeText(item.name).toLowerCase();
    if (!k) continue;
    const prev = map.get(k);
    if (!prev || menuItemQualityScore(item) > menuItemQualityScore(prev)) {
      map.set(k, item);
    }
  }
  return [...map.values()];
}

function normalizeText(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function detectPlatform(url: string): ExternalPlatform {
  const u = url.toLowerCase();
  let host = "";
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    host = u;
    path = u;
  }
  if (u.includes("google.com/maps") || host.includes("maps.app.goo.gl")) return "google-maps";
  if (host.includes("yemeksepeti.com")) return "yemeksepeti";
  if (host.includes("getir.com") || host.includes("getiryemek.com") || host.includes("yemek.getir.com")) {
    if (path.includes("/carsi") || path.includes("/isletmeler")) return "getir-carsi";
    return "getir-yemek";
  }
  if (host.includes("migros.com.tr") || host.includes("migrosyemek")) return "migros-yemek";
  if (host.includes("trendyol.com") || host.includes("trendyolgo.com")) return "trendyol-yemek";
  if (host.includes("tgoyemek.com")) return "tgo";
  return "unknown";
}

function pickSourceId(url: string): string | null {
  try {
    const u = new URL(url);
    const p = u.pathname.split("/").filter(Boolean);
    return p[p.length - 1] || null;
  } catch {
    return null;
  }
}

function fallbackVendorNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
    return normalizeText(decodeURIComponent(last).replace(/[-_+]+/g, " ")) || "İsimsiz İşletme";
  } catch {
    return "İsimsiz İşletme";
  }
}

function extractJsonLdObjects(html: string): any[] {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const out: any[] = [];
  for (const m of blocks) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      /* noop */
    }
  }
  return out;
}

function parseMenuFromJsonLd(jsonLd: any[]): ImportedMenuItem[] {
  const menuItems: ImportedMenuItem[] = [];
  const walk = (node: any, cat?: string) => {
    if (!node || typeof node !== "object") return;
    const t = String(node["@type"] ?? "").toLowerCase();
    const name = normalizeText(node.name);
    if (t.includes("menuitem") || (name && (node.price || node.offers?.price))) {
      const price = toNumber(node.price ?? node.offers?.price);
      menuItems.push({
        name,
        price,
        description: normalizeText(node.description) || null,
        imageUrl: normalizeText(node.image || node.photo) || null,
        category: cat ?? null,
      });
    }
    if (Array.isArray(node.hasMenuSection)) {
      for (const s of node.hasMenuSection) walk(s, normalizeText(s?.name) || cat);
    }
    if (Array.isArray(node.hasMenuItem)) {
      for (const mi of node.hasMenuItem) walk(mi, cat);
    }
    if (Array.isArray(node.itemListElement)) {
      for (const it of node.itemListElement) walk(it?.item ?? it, cat);
    }
  };
  for (const obj of jsonLd) walk(obj);
  return uniqByName(menuItems).slice(0, 2000);
}

function parseJsonFromBrace(html: string, braceStart: number): any | null {
  if (braceStart < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractJsonFromScript(html: string, marker: string): any | null {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const braceStart = html.indexOf("{", idx);
  return parseJsonFromBrace(html, braceStart);
}

function extractPreloadedState(html: string): any | null {
  const idx = html.indexOf("window.__PRELOADED_STATE__=");
  if (idx < 0) return null;
  const braceStart = html.indexOf("{", idx);
  return parseJsonFromBrace(html, braceStart);
}

function tryParseMenuJsonBlob(text: string): any | null {
  const t = String(text ?? "").trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(t);
    if (!parsed || typeof parsed !== "object") return null;
    if (
      parsed?.data?.menu_categories ||
      parsed?.data?.menuCategories ||
      parsed?.menu_categories ||
      parsed?.menuCategories ||
      parsed?.productCategories ||
      parsed?.initialState?.restaurantDetail?.menu?.productCategories
    ) {
      return parsed;
    }
  } catch {
    /* noop */
  }
  return null;
}

function pickProductPrice(node: any): number | null {
  const direct = toNumber(
    node?.price ??
      node?.product_price ??
      node?.productPrice ??
      node?.amount ??
      node?.salePrice ??
      node?.discountedPrice ??
      node?.unit_price,
  );
  if (direct != null) return direct;
  const text = normalizeText(node?.priceText ?? node?.displayPrice ?? node?.formattedPrice ?? node?.price_text);
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  return m ? toNumber(m[1]) : null;
}

function pickProductImageUrl(node: any, platform: ExternalPlatform): string | null {
  const direct = normalizeText(
    node?.imageURL ??
      node?.imageUrl ??
      node?.image ??
      node?.photo ??
      node?.thumbnailUrl ??
      node?.wideImage ??
      node?.fullScreenImageURL ??
      node?.productImage ??
      node?.image_url ??
      node?.photoUrl,
  );
  if (direct.startsWith("http")) return direct;
  const filePath = normalizeText(node?.file_path ?? node?.filePath ?? node?.imagePath ?? node?.image_path);
  if (filePath) {
    if (filePath.startsWith("http")) return filePath;
    if (platform === "yemeksepeti") {
      return `https://images.deliveryhero.io/image/fd-tr/${filePath.replace(/^\//, "")}`;
    }
    if (platform === "getir-yemek" || platform === "getir-carsi") {
      return `https://cdn.getiryemek.com/${filePath.replace(/^\//, "")}`;
    }
  }
  return direct || null;
}

function parseOptionGroupsFromProduct(node: any): ImportedOptionGroup[] | undefined {
  const optionGroups: ImportedOptionGroup[] = [];
  const rawGroups = [node?.options, node?.variants, node?.modifiers, node?.choices, node?.toppings].filter(Boolean);
  for (const g of rawGroups) {
    const arr = Array.isArray(g) ? g : [g];
    for (const entry of arr) {
      if (!entry || typeof entry !== "object") continue;
      const choicesRaw = Array.isArray(entry.items)
        ? entry.items
        : Array.isArray(entry.options)
          ? entry.options
          : Array.isArray(entry.choices)
            ? entry.choices
            : [];
      const choices = choicesRaw
        .map((c: any) => ({
          name: normalizeText(c?.name ?? c?.title ?? c?.label),
          price: toNumber(c?.price ?? c?.amount) ?? undefined,
        }))
        .filter((c: { name: string }) => Boolean(c.name));
      if (!choices.length) continue;
      optionGroups.push({
        name: normalizeText(entry.name ?? entry.title) || "Seçenekler",
        required: Boolean(entry.required),
        multiple: Boolean(entry.multiple ?? entry.multiSelect),
        choices,
      });
    }
  }
  return optionGroups.length ? optionGroups : undefined;
}

function menuItemFromProductNode(node: any, category: string, platform: ExternalPlatform): ImportedMenuItem | null {
  const name = normalizeText(node?.name ?? node?.title ?? node?.productName);
  if (!name || name.length < 2) return null;
  const price = pickProductPrice(node);
  const options = parseOptionGroupsFromProduct(node);
  if (price == null && !options) return null;
  return {
    name,
    price,
    description: normalizeText(node?.description ?? node?.summary ?? node?.shortDescription) || null,
    imageUrl: pickProductImageUrl(node, platform),
    category: normalizeText(category) || "Diğer",
    options,
  };
}

function parseCategoryProductSections(categories: unknown, platform: ExternalPlatform, defaultCat?: string): ImportedMenuItem[] {
  if (!Array.isArray(categories)) return [];
  const out: ImportedMenuItem[] = [];
  for (const section of categories) {
    if (!section || typeof section !== "object") continue;
    const catName =
      normalizeText((section as any).name ?? (section as any).title ?? (section as any).categoryName) ||
      defaultCat ||
      "Diğer";
    const products =
      (section as any).products ??
      (section as any).items ??
      (section as any).menuItems ??
      (section as any).productList ??
      (section as any).menu_products;
    if (!Array.isArray(products)) continue;
    for (const p of products) {
      const item = menuItemFromProductNode(p, catName, platform);
      if (item) out.push(item);
    }
  }
  return out;
}

function extractStructuredMenuItems(sources: unknown[], platform: ExternalPlatform): ImportedMenuItem[] {
  const out: ImportedMenuItem[] = [];
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    const s = src as any;

    out.push(...parseCategoryProductSections(s?.props?.pageProps?.initialState?.restaurantDetail?.menu?.productCategories, platform));
    out.push(...parseCategoryProductSections(s?.props?.initialState?.restaurantDetail?.menu?.productCategories, platform));
    out.push(...parseCategoryProductSections(s?.initialState?.restaurantDetail?.menu?.productCategories, platform));
    out.push(...parseCategoryProductSections(s?.restaurantDetail?.menu?.productCategories, platform));
    out.push(...parseCategoryProductSections(s?.menu?.productCategories, platform));

    out.push(...parseCategoryProductSections(s?.data?.menu_categories, platform));
    out.push(...parseCategoryProductSections(s?.data?.menuCategories, platform));
    out.push(...parseCategoryProductSections(s?.menu_categories, platform));
    out.push(...parseCategoryProductSections(s?.menuCategories, platform));
    out.push(...parseCategoryProductSections(s?.productCategories, platform));
    out.push(...parseCategoryProductSections(s?.categories, platform));
    out.push(...parseCategoryProductSections(s?.sections, platform));

    const nestedMenu = s?.menu;
    if (nestedMenu && typeof nestedMenu === "object") {
      out.push(...parseCategoryProductSections(nestedMenu.productCategories, platform));
      out.push(...parseCategoryProductSections(nestedMenu.menu_categories, platform));
      out.push(...parseCategoryProductSections(nestedMenu.menuCategories, platform));
    }
  }
  return out;
}

function yemeksepetiVendorHintsFromPreloaded(state: any): { code: string | null; lat: number | null; lng: number | null } {
  const vd = state?.vendor?.data ?? {};
  const vi = state?.vendorInfo ?? {};
  return {
    code: normalizeText(vd.code) || null,
    lat: toNumber(vd.latitude ?? vd.lat ?? vi.latitude ?? vi.lat),
    lng: toNumber(vd.longitude ?? vd.lng ?? vi.longitude ?? vi.lng),
  };
}

function buildYemeksepetiMenuApiUrls(code: string, lat: number, lng: number): string[] {
  const q =
    `language_id=2&opening_type=delivery&latitude=${lat}&longitude=${lng}`;
  const enc = encodeURIComponent(code);
  return [
    `https://tr.fd-api.com/api/v5/vendors/${enc}/menus?${q}`,
    `https://www.yemeksepeti.com/api/v5/vendors/${enc}/menus?${q}`,
  ];
}

function isYemeksepetiMenuPayload(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  const data = o.data as Record<string, unknown> | undefined;
  return Boolean(
    data?.menu_categories ||
      data?.menuCategories ||
      o.menu_categories ||
      o.menuCategories,
  );
}

async function fetchYemeksepetiMenuJsonDirect(apiUrl: string, referer: string): Promise<any | null> {
  try {
    const res = await fetch(apiUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "application/json, text/plain, */*",
        "accept-language": "tr-TR,tr;q=0.9",
        referer: referer.includes("yemeksepeti") ? referer : "https://www.yemeksepeti.com/",
        origin: "https://www.yemeksepeti.com",
        "x-country-code": "tr",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": apiUrl.includes("fd-api.com") ? "cross-site" : "same-origin",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return isYemeksepetiMenuPayload(json) ? json : null;
  } catch {
    return null;
  }
}

/** Yemeksepeti menü API — doğrudan veya Vercel edge vekili ile. */
export async function fetchYemeksepetiMenuJson(
  vendorCode: string,
  lat: number | null,
  lng: number | null,
  referer: string,
): Promise<any | null> {
  const code = normalizeText(vendorCode);
  if (!code) return null;
  const latQ = lat ?? 38.4192;
  const lngQ = lng ?? 27.1287;
  const urls = buildYemeksepetiMenuApiUrls(code, latQ, lngQ);
  const pageReferer = referer.includes("yemeksepeti") ? referer : "https://www.yemeksepeti.com/";

  for (const apiUrl of urls) {
    const direct = await fetchYemeksepetiMenuJsonDirect(apiUrl, pageReferer);
    if (direct) return direct;
  }

  for (const apiUrl of urls) {
    const edge = await fetchExternalApiViaEdge(apiUrl, pageReferer);
    if (edge.json && isYemeksepetiMenuPayload(edge.json)) return edge.json;
  }

  return null;
}

/** Yapıştırılan HTML'den vendor kodu çıkarıp menü JSON'unu otomatik çeker. */
export async function resolveYemeksepetiMenuFromHtml(
  html: string,
  sourceUrl: string,
): Promise<any | null> {
  const preloaded = extractPreloadedState(html);
  const hints = yemeksepetiVendorHintsFromPreloaded(preloaded);
  if (!hints.code) return null;
  return fetchYemeksepetiMenuJson(hints.code, hints.lat, hints.lng, sourceUrl);
}

function deepCollectMenu(node: any, out: ImportedMenuItem[], cat?: string, platform: ExternalPlatform = "unknown") {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) deepCollectMenu(n, out, cat, platform);
    return;
  }
  if (typeof node !== "object") return;

  const category =
    normalizeText(
      (node.categoryName ??
        node.category ??
        node.sectionName ??
        node.menuCategoryName ??
        node.groupName ??
        cat) as string,
    ) || cat;
  const name = normalizeText(node.name ?? node.title ?? node.productName);
  const price = pickProductPrice(node);
  const maybeMenuLike = Boolean(
    name &&
      (price != null || node.options || node.variants || node.modifiers || node.choices || node.toppings),
  );
  if (maybeMenuLike) {
    const item = menuItemFromProductNode(node, category || "Diğer", platform);
    if (item) out.push(item);
  }

  for (const [k, v] of Object.entries(node)) {
    if (!v || typeof v !== "object") continue;
    if (/categories$|sections$|menu_categories$/i.test(k) && Array.isArray(v)) {
      out.push(...parseCategoryProductSections(v, platform, category));
      continue;
    }
    deepCollectMenu(v, out, category, platform);
  }
}

function detectClosed(htmlLower: string): boolean {
  const patterns = [
    "geçici olarak kapalı",
    "su anda kapali",
    "şu anda kapalı",
    "işletme kapalı",
    "restoran kapalı",
    "closed now",
    "currently closed",
    "temporarily closed",
    "siparişe kapalı",
  ];
  return patterns.some((p) => htmlLower.includes(p));
}

function extractNeighborhoodFromAddress(address: string): string | null {
  const a = normalizeText(address);
  if (!a) return null;
  const m = a.match(/([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s.'-]{2,40}\sMah(?:\.|allesi)?)/i);
  return m ? normalizeText(m[1]) : null;
}

function pickGeoFromHtml(html: string): { lat: number | null; lng: number | null } {
  const candidates = [
    /"latitude"\s*:\s*"?(-?\d+(?:\.\d+)?)"?[\s\S]{0,80}"longitude"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/i,
    /"lat"\s*:\s*"?(-?\d+(?:\.\d+)?)"?[\s\S]{0,80}"lng"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/i,
    /"lng"\s*:\s*"?(-?\d+(?:\.\d+)?)"?[\s\S]{0,80}"lat"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (!m) continue;
    const a = toNumber(m[1]);
    const b = toNumber(m[2]);
    if (a != null && b != null) {
      if (re.source.includes('"lng"\\s*')) return { lat: b, lng: a };
      return { lat: a, lng: b };
    }
  }
  return { lat: null, lng: null };
}

function parseCampaignLikeItems(node: any, out: ImportedMenuItem[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) parseCampaignLikeItems(n, out);
    return;
  }
  if (typeof node !== "object") return;
  const title = normalizeText(node.title ?? node.name ?? node.campaignName ?? node.promoName);
  const desc = normalizeText(node.description ?? node.summary ?? node.shortDescription) || null;
  const p = toNumber(node.price ?? node.discountedPrice ?? node.salePrice);
  const hasCampaignWord = /(kampanya|firsat|fırsat|indirim|menu|menü|paket|combo)/i.test(title);
  if (title && hasCampaignWord) {
    out.push({
      name: title,
      description: desc,
      price: p,
      imageUrl: normalizeText(node.image ?? node.imageUrl ?? node.photo) || null,
      category: "Kampanyalar",
    });
  }
  for (const v of Object.values(node)) {
    if (typeof v === "object") parseCampaignLikeItems(v, out);
  }
}

export async function importVendorFromExternalUrl(
  sourceUrl: string,
  opts?: { prefetchedHtml?: string | null; prefetchedMenuJson?: unknown },
): Promise<ImportedVendorData> {
  const platform = detectPlatform(sourceUrl);
  if (platform === "google-maps") {
    const { scrapeBusinessDetail } = await import("./gmaps-scraper");
    const decoded = decodeURIComponent(sourceUrl);
    const placeName =
      normalizeText(decoded.match(/\/place\/([^/@?]+)/i)?.[1] || "").replace(/\+/g, " ") ||
      normalizeText(decoded.match(/[?&]q=([^&]+)/i)?.[1] || "").replace(/\+/g, " ") ||
      "Google Maps İşletmesi";
    const detail = await scrapeBusinessDetail({ name: placeName, sourceUrl });
    return {
      platform,
      sourceUrl,
      sourceId: pickSourceId(sourceUrl),
      name: normalizeText(detail.name) || placeName,
      description: normalizeText(detail.description) || null,
      phone: normalizeText(detail.phone) || null,
      address: normalizeText(detail.address) || null,
      city: normalizeText((detail.address || "").split(",").slice(-2, -1)[0] || "") || null,
      district: null,
      neighborhood: extractNeighborhoodFromAddress(normalizeText(detail.address) || ""),
      lat: detail.latitude ?? null,
      lng: detail.longitude ?? null,
      imageUrl: normalizeText(detail.photoUrl) || null,
      coverUrl: normalizeText(detail.photoUrl) || null,
      workingHours: detail.workingHours ? JSON.stringify(detail.workingHours) : null,
      isOpen: false,
      menu: [],
    };
  }

  const prefetched = String(opts?.prefetchedHtml ?? "").trim();
  const menuJsonFromPaste = tryParseMenuJsonBlob(prefetched);
  if (prefetched.length > 400 || menuJsonFromPaste) {
    const menuJson =
      opts?.prefetchedMenuJson ??
      menuJsonFromPaste ??
      null;
    const htmlForParse = menuJsonFromPaste && prefetched.length < 400 ? `<html><body>${prefetched}</body></html>` : prefetched;
    return parseVendorFromHtmlAsync(sourceUrl, htmlForParse, platform, menuJson);
  }

  await sleep(900 + Math.floor(Math.random() * 1900));
  const fetched = await fetchExternalPageHtml(sourceUrl);
  const html = fetched.html;
  if (!html || html.length < 400) {
    try {
      const fallback = await fetchAndParseVendor(sourceUrl);
      const fallbackMenu = (fallback.items || []).map((it) => ({
        name: normalizeText(it.name),
        description: normalizeText(it.description) || null,
        price: toNumber(it.price),
        imageUrl: normalizeText(it.imageUrl) || null,
        category: normalizeText(it.category) || null,
        options: (it.options || []).map((g) => ({
          name: normalizeText(g.name) || "Seçenekler",
          required: Boolean(g.required),
          multiple: Boolean(g.multiple),
          choices: (g.choices || [])
            .map((c) => ({ name: normalizeText(c.label), price: toNumber(c.price) ?? undefined }))
            .filter((c) => Boolean(c.name)),
        })),
      }));
      if (fallbackMenu.length > 0) {
        const fbLoc = mergeLocationHints(
          {
            address: fallback.address ?? null,
            city: fallback.city ?? null,
            district: fallback.district ?? null,
            phone: fallback.phone ?? null,
          },
          parseLocationFromUrl(sourceUrl, platform),
        );
        return {
          platform,
          sourceUrl,
          sourceId: pickSourceId(sourceUrl),
          name: fallback.name || fallbackVendorNameFromUrl(sourceUrl),
          description: fallback.description ?? null,
          phone: fbLoc.phone ?? null,
          address: buildMergedAddress(fbLoc),
          city: fbLoc.city ?? null,
          district: fbLoc.district ?? null,
          neighborhood: fbLoc.neighborhood ?? null,
          lat: fbLoc.lat ?? null,
          lng: fbLoc.lng ?? null,
          imageUrl: null,
          coverUrl: null,
          workingHours: fallback.workingHours ?? null,
          isOpen: true,
          menu: fallbackMenu,
        };
      }
    } catch {
      /* ignore */
    }
    return buildPartialFromUrl(sourceUrl, platform, fetched.status || undefined);
  }
  return parseVendorFromHtmlAsync(sourceUrl, html, platform);
}

/** HTML gövdesinden menü + konum ayrıştırır (Vercel edge veya başarılı fetch sonrası). */
export async function parseVendorFromHtmlAsync(
  sourceUrl: string,
  html: string,
  platform?: ExternalPlatform,
  menuJson?: unknown,
): Promise<ImportedVendorData> {
  let parsed = parseVendorFromHtml(sourceUrl, html, platform, menuJson);
  if (parsed.menu.length > 0 || parsed.platform !== "yemeksepeti") return parsed;

  const apiMenu =
    (menuJson && isYemeksepetiMenuPayload(menuJson) ? menuJson : null) ??
    (await resolveYemeksepetiMenuFromHtml(html, sourceUrl));
  if (!apiMenu) return parsed;

  const apiItems = extractStructuredMenuItems([apiMenu], "yemeksepeti");
  if (!apiItems.length) return parsed;

  return {
    ...parsed,
    menu: uniqMenuItems([...parsed.menu, ...apiItems]).slice(0, 3000),
    isOpen: true,
  };
}

/** HTML gövdesinden menü + konum ayrıştırır (Vercel edge veya başarılı fetch sonrası). */
export function parseVendorFromHtml(
  sourceUrl: string,
  html: string,
  platform?: ExternalPlatform,
  menuJson?: unknown,
): ImportedVendorData {
  const resolvedPlatform = platform ?? detectPlatform(sourceUrl);
  const htmlLower = html.toLowerCase();
  const jsonLd = extractJsonLdObjects(html);

  const preloaded = extractPreloadedState(html);
  const preloadedVendor = preloaded?.vendor?.data;
  const preloadedInfo = preloaded?.vendorInfo;

  const restaurantNode =
    jsonLd.find((x: any) => String(x?.["@type"] ?? "").toLowerCase().includes("restaurant")) ??
    jsonLd.find((x: any) => normalizeText(x?.name));

  const menuItems = parseMenuFromJsonLd(jsonLd);
  const deepItems: ImportedMenuItem[] = [];
  const campaignItems: ImportedMenuItem[] = [];
  const nextData = extractJsonFromScript(html, "__NEXT_DATA__");
  const deepLoc: LocationHints = {};
  const structuredSources: unknown[] = [];

  if (menuJson) structuredSources.push(menuJson);
  const pastedMenuJson = tryParseMenuJsonBlob(html);
  if (pastedMenuJson) structuredSources.push(pastedMenuJson);

  if (nextData) {
    structuredSources.push(nextData);
    deepCollectMenu(nextData, deepItems, undefined, resolvedPlatform);
    parseCampaignLikeItems(nextData, campaignItems);
    deepCollectLocation(nextData, deepLoc);
  }
  if (preloaded) {
    structuredSources.push(preloaded);
    deepCollectLocation(preloaded, deepLoc);
  }
  const apolloState = extractJsonFromScript(html, "__APOLLO_STATE__");
  if (apolloState) {
    structuredSources.push(apolloState);
    deepCollectMenu(apolloState, deepItems, undefined, resolvedPlatform);
    parseCampaignLikeItems(apolloState, campaignItems);
    deepCollectLocation(apolloState, deepLoc);
  }
  for (const obj of jsonLd) deepCollectLocation(obj, deepLoc);

  const structuredItems = extractStructuredMenuItems(structuredSources, resolvedPlatform);

  const mergedMenu = uniqMenuItems(
    [...structuredItems, ...menuItems, ...deepItems, ...campaignItems].filter((m) => normalizeText(m.name)),
  ).slice(0, 3000);

  const name =
    normalizeText(restaurantNode?.name) ||
    normalizeText(preloadedVendor?.name) ||
    normalizeText(preloadedInfo?.name) ||
    normalizeText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").split("|")[0] ||
    "İsimsiz İşletme";

  const jsonLdLoc: LocationHints = {
    address:
      normalizeText(restaurantNode?.address?.streetAddress) ||
      normalizeText(restaurantNode?.address) ||
      normalizeText(preloadedVendor?.address) ||
      normalizeText(preloadedInfo?.address) ||
      null,
    city:
      normalizeText(restaurantNode?.address?.addressLocality) ||
      normalizeText(preloadedVendor?.city?.name) ||
      null,
    district: normalizeText(restaurantNode?.address?.addressRegion) || null,
    neighborhood:
      normalizeText((restaurantNode?.address as any)?.addressLocality2) ||
      extractNeighborhoodFromAddress(normalizeText(restaurantNode?.address?.streetAddress || restaurantNode?.address) || "") ||
      extractNeighborhoodFromAddress(normalizeText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")) ||
      null,
    lat: toNumber(
      restaurantNode?.geo?.latitude ??
        restaurantNode?.location?.geo?.latitude ??
        preloadedVendor?.latitude ??
        preloadedInfo?.latitude,
    ),
    lng: toNumber(
      restaurantNode?.geo?.longitude ??
        restaurantNode?.location?.geo?.longitude ??
        preloadedVendor?.longitude ??
        preloadedInfo?.longitude,
    ),
    phone:
      normalizeText(restaurantNode?.telephone) ||
      normalizeText(preloadedVendor?.customer_phone) ||
      null,
  };
  const geoFromHtml = pickGeoFromHtml(html);
  if (jsonLdLoc.lat == null) jsonLdLoc.lat = geoFromHtml.lat;
  if (jsonLdLoc.lng == null) jsonLdLoc.lng = geoFromHtml.lng;

  const mergedLoc = mergeLocationHints(
    jsonLdLoc,
    deepLoc,
    parseLocationFromUrl(sourceUrl, resolvedPlatform),
    { phone: extractPhoneFromHtml(html) },
  );
  const address = buildMergedAddress(mergedLoc);
  const city = mergedLoc.city ?? null;
  const district = mergedLoc.district ?? null;
  const neighborhood = mergedLoc.neighborhood ?? null;
  const lat = mergedLoc.lat ?? null;
  const lng = mergedLoc.lng ?? null;
  const phone = mergedLoc.phone ?? null;

  const isClosed = detectClosed(htmlLower);
  const explicitOpen = restaurantNode?.openingHoursSpecification ? true : undefined;
  const isOpen = mergedMenu.length > 0 ? true : (explicitOpen !== undefined ? !isClosed : !isClosed);
  const ratingFromLd = extractRatingFromJsonLd(jsonLd);
  const ratingFromHtml = extractRatingFromHtml(html);
  const rating = ratingFromLd.rating ?? ratingFromHtml.rating ?? toNumber((restaurantNode as any)?.aggregateRating?.ratingValue);
  const reviewCount =
    ratingFromLd.reviewCount ??
    ratingFromHtml.reviewCount ??
    toNumber((restaurantNode as any)?.aggregateRating?.reviewCount);

  return {
    platform: resolvedPlatform,
    sourceUrl,
    sourceId: pickSourceId(sourceUrl),
    name,
    description: normalizeText(restaurantNode?.description) || null,
    phone,
    address,
    city,
    district,
    neighborhood,
    lat,
    lng,
    imageUrl:
      normalizeText(restaurantNode?.image) ||
      normalizeText(preloadedVendor?.hero_image) ||
      normalizeText(preloadedInfo?.hero_listing_image) ||
      null,
    coverUrl:
      normalizeText(restaurantNode?.image) ||
      normalizeText(preloadedVendor?.hero_listing_image) ||
      null,
    workingHours: normalizeText(restaurantNode?.openingHours) || null,
    rating,
    reviewCount,
    isOpen,
    menu: mergedMenu,
  };
}

