import { db, mapCitiesTable, mapDistrictsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type GoogleAddressComponent = {
  long_name?: unknown;
  short_name?: unknown;
  types?: unknown;
};

export type GooglePlaceResolvedLocation = {
  province: string | null;
  district: string | null;
  cityId: string | null;
  districtId: string | null;
  source: "address_components" | "formatted_address" | "fallback" | null;
};

function normalizeLocationText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ili|il|ilcesi|ilce|province|district|turkiye|turkey)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLocationName(value: unknown): string | null {
  const cleaned = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\b\d{5}\b/g, " ")
    .replace(/\b(Türkiye|Turkiye|Turkey|TR)\b/gi, " ")
    .replace(/\b(Province|District)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,/-]+|[\s,/-]+$/g, "")
    .trim();
  return cleaned || null;
}

function componentTypes(component: GoogleAddressComponent): string[] {
  return Array.isArray(component.types) ? component.types.map((x) => String(x ?? "")) : [];
}

function componentName(component: GoogleAddressComponent | undefined): string | null {
  return cleanLocationName(component?.long_name ?? component?.short_name);
}

function pickComponent(components: GoogleAddressComponent[], types: string[]): GoogleAddressComponent | undefined {
  return components.find((component) => {
    const set = new Set(componentTypes(component));
    return types.every((type) => set.has(type));
  });
}

function parseLocationFromAddressComponents(place: Record<string, unknown>): Pick<GooglePlaceResolvedLocation, "province" | "district" | "source"> {
  const components = Array.isArray(place.address_components)
    ? (place.address_components as GoogleAddressComponent[])
    : [];
  if (!components.length) return { province: null, district: null, source: null };

  const province = componentName(pickComponent(components, ["administrative_area_level_1"]));
  const district =
    componentName(pickComponent(components, ["administrative_area_level_2"])) ||
    componentName(pickComponent(components, ["locality"])) ||
    componentName(pickComponent(components, ["sublocality_level_1"])) ||
    componentName(pickComponent(components, ["administrative_area_level_3"]));

  return {
    province,
    district,
    source: province || district ? "address_components" : null,
  };
}

function parseLocationFromFormattedAddress(address: unknown): Pick<GooglePlaceResolvedLocation, "province" | "district" | "source"> {
  const raw = String(address ?? "").trim();
  if (!raw) return { province: null, district: null, source: null };

  const parts = raw
    .split(",")
    .map(cleanLocationName)
    .filter((part): part is string => Boolean(part));
  const slashPart = [...parts].reverse().find((part) => part.includes("/"));
  if (slashPart) {
    const [districtRaw, provinceRaw] = slashPart.split("/").map(cleanLocationName);
    return {
      province: provinceRaw ?? null,
      district: districtRaw ?? null,
      source: provinceRaw || districtRaw ? "formatted_address" : null,
    };
  }

  if (parts.length >= 2) {
    const province = parts[parts.length - 1] ?? null;
    const district = parts[parts.length - 2] ?? null;
    return {
      province,
      district,
      source: province || district ? "formatted_address" : null,
    };
  }

  return { province: null, district: null, source: null };
}

function parseLocationFallback(value: unknown): Pick<GooglePlaceResolvedLocation, "province" | "district" | "source"> {
  const raw = String(value ?? "").trim();
  if (!raw) return { province: null, district: null, source: null };
  const parsed = parseLocationFromFormattedAddress(raw);
  if (parsed.province || parsed.district) return { ...parsed, source: "fallback" };
  return { province: cleanLocationName(raw), district: null, source: "fallback" };
}

async function resolveCityId(province: string | null): Promise<string | null> {
  if (!province) return null;
  const target = normalizeLocationText(province);
  if (!target) return null;
  const rows = await db
    .select({ id: mapCitiesTable.id, name: mapCitiesTable.name })
    .from(mapCitiesTable);
  const matched = rows.find((row) => normalizeLocationText(row.name) === target);
  return matched?.id ?? null;
}

async function resolveDistrictId(district: string | null, cityId: string | null): Promise<string | null> {
  if (!district || !cityId) return null;
  const target = normalizeLocationText(district);
  if (!target) return null;
  const rows = await db
    .select({ id: mapDistrictsTable.id, name: mapDistrictsTable.name })
    .from(mapDistrictsTable)
    .where(eq(mapDistrictsTable.cityId, cityId));
  const matched = rows.find((row) => normalizeLocationText(row.name) === target);
  return matched?.id ?? null;
}

export async function resolveGooglePlaceMapLocation(
  place: Record<string, unknown>,
  fallbackLocationQuery?: string | null,
): Promise<GooglePlaceResolvedLocation> {
  const fromComponents = parseLocationFromAddressComponents(place);
  const fromAddress = parseLocationFromFormattedAddress(place.formatted_address ?? place.vicinity);
  const fromFallback = parseLocationFallback(fallbackLocationQuery);

  const province = fromComponents.province || fromAddress.province || fromFallback.province || null;
  const district = fromComponents.district || fromAddress.district || fromFallback.district || null;
  const source = fromComponents.source || fromAddress.source || fromFallback.source || null;
  const cityId = await resolveCityId(province);
  const districtId = await resolveDistrictId(district, cityId);

  return { province, district, cityId, districtId, source };
}
