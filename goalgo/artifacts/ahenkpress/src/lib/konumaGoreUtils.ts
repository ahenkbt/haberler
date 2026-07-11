import {
  classifyDeliveryCategory,
  type DeliveryBusinessModule,
} from "@/lib/deliveryModuleGroups";
import { resolveMapBusinessStoreHref, type MapBusinessLinkInput } from "@/lib/mapBusinessCardLinks";
import { TR_PROVINCE_NAMES_81 } from "@/lib/turkishProvinces";

function normalizeProvinceKey(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

/** "Fethiye (Muğla)" → ilçe + il ayrıştırması. */
export function parseDistrictProvinceLabel(raw: string): { district: string; city: string } | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!match) return null;
  const district = match[1]?.trim() ?? "";
  const city = match[2]?.trim() ?? "";
  if (!district || !city) return null;
  return { district, city };
}

export function resolveTurkishProvinceName(raw: string): string | null {
  const q = String(raw ?? "").trim();
  if (!q) return null;
  const key = normalizeProvinceKey(q);
  return TR_PROVINCE_NAMES_81.find((name) => normalizeProvinceKey(name) === key) ?? null;
}

/** URL / Keşfet'ten gelen karışık konum parametrelerini il–ilçe olarak düzeltir. */
export function normalizeKonumaGoreSearchParams(input: {
  city?: string;
  district?: string;
  location?: string;
  lat?: number;
  lng?: number;
}): {
  city: string;
  district: string;
  location: string;
  lat?: number;
  lng?: number;
} {
  let city = String(input.city ?? "").trim();
  let district = String(input.district ?? "").trim();
  let location = String(input.location ?? "").trim();

  const fromCity = parseDistrictProvinceLabel(city);
  if (fromCity) {
    district = district || fromCity.district;
    city = resolveTurkishProvinceName(fromCity.city) ?? fromCity.city;
  } else if (city) {
    city = resolveTurkishProvinceName(city) ?? city;
  }

  const fromLocation = parseDistrictProvinceLabel(location);
  if (fromLocation) {
    district = district || fromLocation.district;
    if (!city || city === location) {
      city = resolveTurkishProvinceName(fromLocation.city) ?? fromLocation.city;
    }
    location = [fromLocation.district, resolveTurkishProvinceName(fromLocation.city) ?? fromLocation.city]
      .filter(Boolean)
      .join(", ");
  }

  if (!location) {
    location = [district, city].filter(Boolean).join(", ") || city;
  }

  return {
    city,
    district,
    location,
    lat: input.lat,
    lng: input.lng,
  };
}

export function shouldRequireKonumaGoreCityScope(city: string): boolean {
  const trimmed = String(city ?? "").trim();
  if (!trimmed) return false;
  if (parseDistrictProvinceLabel(trimmed)) return false;
  return Boolean(resolveTurkishProvinceName(trimmed));
}

export type KonumaGoreLocation = {
  lat: number;
  lng: number;
  city: string;
  district: string;
  location: string;
};

export type KonumaGoreBusiness = MapBusinessLinkInput & {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  homepageSuperCategory?: string | null;
  storeType?: string | null;
  categoryName?: string | null;
  category?: { name?: string | null; slug?: string | null } | null;
  city?: { name?: string | null; nameTr?: string | null } | null;
  district?: { name?: string | null } | null;
  distance?: number | null;
  hasDelivery?: boolean | null;
};

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatKonumaGoreDistance(km: number | null | undefined): string {
  if (!Number.isFinite(Number(km)) || Number(km) < 0) return "";
  const n = Number(km);
  if (n < 1) return `${Math.round(n * 1000)} m`;
  if (n >= 10) return `${Math.round(n)} km`;
  return `${n.toFixed(1)} km`;
}

export function parseKonumaGoreModule(raw: string | null | undefined): DeliveryBusinessModule {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "market" || value === "grocery") return "market";
  if (value === "nearby" || value === "yakinimdakiler" || value === "isletmeler") return "nearby";
  return "food";
}

export function classifyMapBusinessModule(biz: KonumaGoreBusiness): DeliveryBusinessModule {
  const superCat = String(biz.homepageSuperCategory ?? "").toLocaleLowerCase("tr-TR");
  const storeType = String(biz.storeType ?? "").toLocaleLowerCase("tr-TR");
  if (
    superCat === "siparis" ||
    superCat === "yiyecek" ||
    storeType.includes("restoran") ||
    storeType.includes("mekan_restoran") ||
    storeType.includes("cafe") ||
    storeType.includes("kafe")
  ) {
    return "food";
  }
  if (
    storeType.includes("market") ||
    storeType.includes("grocery") ||
    storeType.includes("manav") ||
    storeType.includes("bakkal") ||
    superCat === "market"
  ) {
    return "market";
  }
  const blob = [
    biz.categoryName,
    biz.category?.name,
    biz.category?.slug,
    biz.storeType,
    biz.name,
    biz.homepageSuperCategory,
  ]
    .filter(Boolean)
    .join(" ");
  return classifyDeliveryCategory(blob);
}

export function isOrderableMapBusiness(biz: KonumaGoreBusiness): boolean {
  if (biz.hasActiveStorefront === false) return false;
  const href = resolveMapBusinessStoreHref(biz);
  return Boolean(href);
}

export function buildKonumaGoreHref(input: {
  city?: string;
  district?: string;
  location?: string;
  lat?: number;
  lng?: number;
  module?: DeliveryBusinessModule;
}): string {
  const params = new URLSearchParams();
  if (input.city?.trim()) params.set("city", input.city.trim());
  if (input.district?.trim()) params.set("district", input.district.trim());
  if (input.location?.trim()) params.set("location", input.location.trim());
  if (Number.isFinite(Number(input.lat))) params.set("lat", String(input.lat));
  if (Number.isFinite(Number(input.lng))) params.set("lng", String(input.lng));
  if (input.module) params.set("module", input.module);
  const qs = params.toString();
  return qs ? `/konumagore?${qs}` : "/konumagore";
}

export function appendKonumaGoreLocationToHref(href: string, loc: KonumaGoreLocation): string {
  const trimmed = String(href ?? "").trim();
  if (!trimmed.startsWith("/")) return trimmed;
  const hashIdx = trimmed.indexOf("#");
  const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : "";
  const pathAndQuery = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const [path, query = ""] = pathAndQuery.split("?");
  const params = new URLSearchParams(query);
  params.set("lat", String(loc.lat));
  params.set("lng", String(loc.lng));
  if (loc.city) params.set("city", loc.city);
  if (loc.district) params.set("district", loc.district);
  if (loc.location) params.set("location", loc.location);
  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash}`;
}

export function resolveKonumaGoreStoreHref(
  biz: KonumaGoreBusiness,
  loc: KonumaGoreLocation | null,
): string | null {
  const base = resolveMapBusinessStoreHref(biz);
  if (!base) return null;
  if (!loc) return base;
  return appendKonumaGoreLocationToHref(base, loc);
}

export function mapBusinessLocationLine(biz: KonumaGoreBusiness): string {
  const district = String(biz.district?.name ?? "").trim();
  const city = String(biz.city?.nameTr || biz.city?.name || "").trim();
  const address = String(biz.address ?? "").trim();
  return [district, city].filter(Boolean).join(", ") || address || "Türkiye";
}
