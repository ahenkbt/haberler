/** Konum parametreleriyle Keşfet liste sayfası bağlantısı (eski /konumagore yerine). */
export function buildKesfetListHref(input: {
  city?: string;
  district?: string;
  location?: string;
  lat?: number;
  lng?: number;
}): string {
  const params = new URLSearchParams();
  if (input.city?.trim()) params.set("city", input.city.trim());
  if (input.district?.trim()) params.set("district", input.district.trim());
  if (input.location?.trim()) params.set("location", input.location.trim());
  if (Number.isFinite(Number(input.lat))) params.set("lat", String(input.lat));
  if (Number.isFinite(Number(input.lng))) params.set("lng", String(input.lng));
  const qs = params.toString();
  return qs ? `/kesfet/liste?${qs}` : "/kesfet/liste";
}
