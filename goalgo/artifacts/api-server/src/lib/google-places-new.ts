/**
 * Google Places API (New) — https://places.googleapis.com/v1
 * Legacy Details’ta olmayan alanlar + foto medya URL’leri (aynı API anahtarı, ayrı SKU).
 * Yoğunluk histogramı (Maps “popüler saatler”) resmi REST’te yok; metadata burada saklanır.
 */
import axios from "axios";

const PLACES_V1 = "https://places.googleapis.com/v1";

function boolish(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return false;
}

function productServiceSignalsFromPlace(place: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (boolish(place.delivery)) out.push("Teslimat");
  if (boolish(place.takeout)) out.push("Paket servis");
  if (boolish(place.dineIn)) out.push("Mekanda yeme");
  if (boolish(place.curbsidePickup)) out.push("Arabaya servis");
  if (boolish(place.reservable)) out.push("Rezervasyon");
  if (boolish(place.servesBreakfast)) out.push("Kahvaltı");
  if (boolish(place.servesBrunch)) out.push("Brunch");
  if (boolish(place.servesLunch)) out.push("Öğle yemeği");
  if (boolish(place.servesDinner)) out.push("Akşam yemeği");
  if (boolish(place.servesVegetarianFood)) out.push("Vejetaryen seçenek");
  if (boolish(place.menuForChildren)) out.push("Çocuk menüsü");
  if (boolish(place.servesDessert)) out.push("Tatlı");
  if (boolish(place.servesCoffee)) out.push("Kahve");
  if (boolish(place.servesBeer)) out.push("Bira");
  if (boolish(place.servesWine)) out.push("Şarap");
  if (boolish(place.servesCocktails)) out.push("Kokteyl");
  if (boolish(place.liveMusic)) out.push("Canlı müzik");
  if (boolish(place.outdoorSeating)) out.push("Dış mekan");
  if (boolish(place.goodForWatchingSports)) out.push("Maç izleme");
  if (boolish(place.goodForChildren)) out.push("Çocuk dostu");
  if (boolish(place.goodForGroups)) out.push("Grup uygun");
  if (boolish(place.allowsDogs)) out.push("Evcil hayvan");
  return out.slice(0, 16);
}

/** Genişletilmiş alan maskesi (New API): zengin özellik + özet + operasyonel detaylar. */
const PLACE_DETAILS_FIELD_MASK_EXTENDED = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "editorialSummary",
  "generativeSummary",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
  "priceLevel",
  "businessStatus",
  "types",
  "primaryType",
  "plusCode",
  "location",
  "photos",
  "accessibilityOptions",
  "paymentOptions",
  "parkingOptions",
  "servesBeer",
  "servesWine",
  "servesCoffee",
  "servesVegetarianFood",
  "menuForChildren",
  "servesDessert",
  "servesCocktails",
  "liveMusic",
  "outdoorSeating",
  "goodForWatchingSports",
  "goodForChildren",
  "goodForGroups",
  "allowsDogs",
  "reservable",
  "wheelchairAccessibleEntrance",
  "wheelchairAccessibleParking",
  "wheelchairAccessibleRestroom",
  "wheelchairAccessibleSeating",
  "curbsidePickup",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
  "takeout",
  "delivery",
  "dineIn",
  "currentSecondaryOpeningHours",
  "regularSecondaryOpeningHours",
].join(",");

/** Bazı hesaplarda yeni alanların bir kısmı kapalı olabilir; güvenli fallback maskesi. */
const PLACE_DETAILS_FIELD_MASK_FALLBACK = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
  "priceLevel",
  "businessStatus",
  "types",
  "primaryType",
  "location",
  "photos",
  "accessibilityOptions",
  "takeout",
  "delivery",
  "dineIn",
].join(",");

export type PlacesNewDetailsResult =
  | { ok: true; place: Record<string, unknown> }
  | { ok: false; status: number; message: string; bodySnippet?: string };

/** GET Place Details (New) — `placeId` ChIJ… veya `places/ChIJ…` */
export async function fetchPlaceDetailsNew(apiKey: string, placeIdRaw: string): Promise<PlacesNewDetailsResult> {
  const key = apiKey?.trim();
  if (!key) return { ok: false, status: 0, message: "API anahtarı yok" };
  const raw = placeIdRaw.replace(/^places\//, "").trim();
  if (!raw) return { ok: false, status: 0, message: "place_id boş" };
  const url = `${PLACES_V1}/places/${encodeURIComponent(raw)}`;
  const tryFetch = async (fieldMask: string): Promise<PlacesNewDetailsResult> => {
    const { data, status } = await axios.get<Record<string, unknown>>(url, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
      validateStatus: () => true,
      timeout: 22_000,
    });
    if (status === 200 && data && typeof data.id === "string") {
      return { ok: true, place: data };
    }
    const err = (data as { error?: { message?: string; status?: string } })?.error;
    const msg = err?.message || (data as { message?: string })?.message || `HTTP ${status}`;
    const bodySnippet = JSON.stringify(data ?? {}).slice(0, 420);
    return { ok: false, status, message: msg, bodySnippet };
  };
  try {
    const extended = await tryFetch(PLACE_DETAILS_FIELD_MASK_EXTENDED);
    if (extended.ok) return extended;
    const msg = `${extended.message} ${extended.bodySnippet || ""}`.toLowerCase();
    const invalidMask =
      msg.includes("field mask") ||
      msg.includes("invalid argument") ||
      msg.includes("cannot find field") ||
      msg.includes("unknown field");
    if (!invalidMask) return extended;
    return await tryFetch(PLACE_DETAILS_FIELD_MASK_FALLBACK);
  } catch (e) {
    return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e) };
  }
}

/** New API Photo → doğrudan tarayıcı/API sunucusu medya URL’si */
export function buildNewApiPhotoMediaUrls(
  photos: unknown,
  apiKey: string,
  max = 10,
  maxWidthPx = 1200,
): string[] {
  const key = apiKey.trim();
  if (!key || !Array.isArray(photos)) return [];
  const out: string[] = [];
  for (const p of photos) {
    const name = (p as { name?: string })?.name?.trim();
    if (!name) continue;
    /** Kaynak: `places/ChIJ…/photos/…` — path segment olarak API köküne eklenir */
    const resource = name.startsWith("places/") ? name : `places/${name}`;
    const u = `${PLACES_V1}/${resource}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(key)}`;
    out.push(u);
    if (out.length >= max) break;
  }
  return out;
}

/** DB / admin için küçük JSON (tüm yanıtı saklamayız). */
export function sanitizePlacesNewForExtras(place: Record<string, unknown>): Record<string, unknown> {
  const dn = place.displayName as { text?: string } | undefined;
  const photoNames = Array.isArray(place.photos)
    ? (place.photos as { name?: string }[]).map((p) => p?.name).filter(Boolean).slice(0, 5)
    : [];
  const editorial = (place.editorialSummary as { text?: string } | undefined)?.text ?? null;
  const generative = (place.generativeSummary as { overview?: { text?: string } } | undefined)?.overview?.text ?? null;
  return {
    id: place.id,
    displayName: dn?.text ?? null,
    editorialSummary: editorial,
    generativeSummary: generative,
    primaryType: place.primaryType ?? null,
    types: Array.isArray(place.types) ? (place.types as string[]).slice(0, 24) : [],
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    businessStatus: place.businessStatus ?? null,
    priceLevel: place.priceLevel ?? null,
    plusCode: place.plusCode ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    utcOffsetMinutes: place.utcOffsetMinutes ?? null,
    accessibilityOptions: place.accessibilityOptions ?? null,
    paymentOptions: place.paymentOptions ?? null,
    parkingOptions: place.parkingOptions ?? null,
    currentOpeningHours: place.currentOpeningHours ?? null,
    regularOpeningHours: place.regularOpeningHours ?? null,
    currentSecondaryOpeningHours: place.currentSecondaryOpeningHours ?? null,
    regularSecondaryOpeningHours: place.regularSecondaryOpeningHours ?? null,
    takeout: place.takeout ?? null,
    delivery: place.delivery ?? null,
    dineIn: place.dineIn ?? null,
    reservable: place.reservable ?? null,
    servesVegetarianFood: place.servesVegetarianFood ?? null,
    menuForChildren: place.menuForChildren ?? null,
    servesDessert: place.servesDessert ?? null,
    servesCocktails: place.servesCocktails ?? null,
    servesBeer: place.servesBeer ?? null,
    servesWine: place.servesWine ?? null,
    servesCoffee: place.servesCoffee ?? null,
    liveMusic: place.liveMusic ?? null,
    outdoorSeating: place.outdoorSeating ?? null,
    goodForWatchingSports: place.goodForWatchingSports ?? null,
    goodForChildren: place.goodForChildren ?? null,
    goodForGroups: place.goodForGroups ?? null,
    allowsDogs: place.allowsDogs ?? null,
    wheelchairAccessibleEntrance: place.wheelchairAccessibleEntrance ?? null,
    wheelchairAccessibleParking: place.wheelchairAccessibleParking ?? null,
    wheelchairAccessibleRestroom: place.wheelchairAccessibleRestroom ?? null,
    wheelchairAccessibleSeating: place.wheelchairAccessibleSeating ?? null,
    curbsidePickup: place.curbsidePickup ?? null,
    servesBreakfast: place.servesBreakfast ?? null,
    servesBrunch: place.servesBrunch ?? null,
    servesLunch: place.servesLunch ?? null,
    servesDinner: place.servesDinner ?? null,
    productServiceSignals: productServiceSignalsFromPlace(place),
    photoResourceNames: photoNames,
    source: "places_api_new",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * `popular_hours` kolonu: Maps yoğunluk çubuğu yok; New API özet + histogramNote (madde olarak kullanılmaz).
 */
export function buildPopularHoursFromPlacesNew(place: Record<string, unknown>): Record<string, unknown> {
  const dn = place.displayName as { text?: string } | undefined;
  return {
    source: "places_api_new",
    title: dn?.text ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    fetchedAt: new Date().toISOString(),
  };
}
