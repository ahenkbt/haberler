/**
 * Etkinlik.io kamuya açık etkinlik sayfasından hafif HTML parse (JSON-LD + og meta).
 * Puppeteer kullanılmaz — API açıklama alanı yetersizse yedek kaynak.
 */

export type ScrapedEtkinlikEvent = {
  etkinlikId: number | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  descriptionHtml: string | null;
  posterUrl: string | null;
  imageUrls: string[];
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueLat: number | null;
  venueLng: number | null;
  startAt: string | null;
  endAt: string | null;
  isFree: boolean | null;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  ticketUrl: string | null;
  externalUrl: string;
};

const SCRAPE_UA =
  "Mozilla/5.0 (compatible; YekpareBot/1.0; +https://yekpare.net) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SCRAPE_TTL_MS = 7 * 24 * 60 * 60_000;
const scrapeMem = new Map<string, { at: number; value: ScrapedEtkinlikEvent | null }>();

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeHtmlEntities(m2[1].trim()) : null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out;
}

function isEventType(typeVal: unknown): boolean {
  if (typeof typeVal === "string") return /event/i.test(typeVal);
  if (Array.isArray(typeVal)) return typeVal.some((t) => typeof t === "string" && /event/i.test(t));
  return false;
}

function flattenJsonLd(nodes: unknown[]): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [];
  for (const node of nodes) {
    if (Array.isArray(node)) {
      events.push(...flattenJsonLd(node));
      continue;
    }
    const rec = asRecord(node);
    if (!rec) continue;
    if (Array.isArray(rec["@graph"])) {
      events.push(...flattenJsonLd(rec["@graph"] as unknown[]));
    }
    if (isEventType(rec["@type"])) events.push(rec);
  }
  return events;
}

function pickPlace(obj: Record<string, unknown> | null): {
  name: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
} {
  if (!obj) return { name: null, address: null, city: null, lat: null, lng: null };
  const name = obj.name ? String(obj.name) : null;
  let address: string | null = null;
  let city: string | null = null;
  const addr = obj.address;
  if (typeof addr === "string") address = addr;
  else if (asRecord(addr)) {
    const a = asRecord(addr)!;
    const parts = [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).map(String);
    address = parts.length ? parts.join(", ") : null;
    city = a.addressLocality ? String(a.addressLocality) : a.addressRegion ? String(a.addressRegion) : null;
  }
  const geo = asRecord(obj.geo);
  const lat = geo?.latitude != null ? Number(geo.latitude) : null;
  const lng = geo?.longitude != null ? Number(geo.longitude) : null;
  return {
    name,
    address,
    city,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function pickOffers(event: Record<string, unknown>): {
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  isFree: boolean | null;
  ticketUrl: string | null;
} {
  const offersRaw = event.offers;
  const offers = Array.isArray(offersRaw)
    ? (offersRaw.map(asRecord).filter(Boolean) as Record<string, unknown>[])
    : offersRaw
      ? ([asRecord(offersRaw)].filter(Boolean) as Record<string, unknown>[])
      : [];
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let currency: string | null = null;
  let ticketUrl: string | null = null;
  for (const o of offers) {
    const price = Number(o.price ?? o.lowPrice);
    const high = Number(o.highPrice ?? o.price);
    if (Number.isFinite(price)) minPrice = minPrice == null ? price : Math.min(minPrice, price);
    if (Number.isFinite(high)) maxPrice = maxPrice == null ? high : Math.max(maxPrice, high);
    if (o.priceCurrency) currency = String(o.priceCurrency);
    if (o.url) ticketUrl = String(o.url);
    if (o.availability && String(o.availability).toLowerCase().includes("free")) {
      return { minPrice: 0, maxPrice: 0, currency: currency ?? "TRY", isFree: true, ticketUrl };
    }
  }
  const isFree = minPrice === 0 && maxPrice === 0;
  return { minPrice, maxPrice, currency, isFree: offers.length ? isFree : null, ticketUrl };
}

function slugFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const eIdx = parts.indexOf("e");
    if (eIdx >= 0 && parts[eIdx + 1]) return parts[eIdx + 1] ?? null;
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

function parseEventFromJsonLd(event: Record<string, unknown>, pageUrl: string): ScrapedEtkinlikEvent {
  const loc = pickPlace(asRecord(event.location));
  const offers = pickOffers(event);
  const imagesRaw = event.image;
  const imageUrls: string[] = [];
  if (typeof imagesRaw === "string") imageUrls.push(imagesRaw);
  else if (Array.isArray(imagesRaw)) {
    for (const img of imagesRaw) {
      if (typeof img === "string") imageUrls.push(img);
      else if (asRecord(img)?.url) imageUrls.push(String(asRecord(img)!.url));
    }
  }
  const posterUrl = imageUrls[0] ?? null;
  const externalUrl = event.url ? String(event.url) : pageUrl;
  let etkinlikId: number | null = null;
  const idRaw = event.identifier ?? event["@id"] ?? event.url;
  if (typeof idRaw === "number") etkinlikId = idRaw;
  else if (typeof idRaw === "string") {
    const num = Number(idRaw.replace(/\D/g, ""));
    if (Number.isFinite(num) && num > 0) etkinlikId = num;
  }

  return {
    etkinlikId,
    slug: slugFromUrl(externalUrl) ?? slugFromUrl(pageUrl),
    title: event.name ? String(event.name) : null,
    description: event.description ? String(event.description) : null,
    descriptionHtml: null,
    posterUrl,
    imageUrls,
    venueName: loc.name,
    venueAddress: loc.address,
    venueCity: loc.city,
    venueLat: loc.lat,
    venueLng: loc.lng,
    startAt: event.startDate ? String(event.startDate) : null,
    endAt: event.endDate ? String(event.endDate) : null,
    isFree: offers.isFree,
    minPrice: offers.minPrice,
    maxPrice: offers.maxPrice,
    currency: offers.currency,
    ticketUrl: offers.ticketUrl,
    externalUrl,
  };
}

function parseFromHtml(html: string, pageUrl: string): ScrapedEtkinlikEvent | null {
  const jsonLdEvents = flattenJsonLd(extractJsonLdBlocks(html));
  if (jsonLdEvents.length) {
    return parseEventFromJsonLd(jsonLdEvents[0]!, pageUrl);
  }

  const title = pickMeta(html, "og:title") ?? pickMeta(html, "twitter:title");
  const description = pickMeta(html, "og:description") ?? pickMeta(html, "description");
  const posterUrl = pickMeta(html, "og:image");
  if (!title && !description && !posterUrl) return null;

  return {
    etkinlikId: null,
    slug: slugFromUrl(pageUrl),
    title,
    description,
    descriptionHtml: null,
    posterUrl,
    imageUrls: posterUrl ? [posterUrl] : [],
    venueName: null,
    venueAddress: null,
    venueCity: null,
    venueLat: null,
    venueLng: null,
    startAt: null,
    endAt: null,
    isFree: null,
    minPrice: null,
    maxPrice: null,
    currency: null,
    ticketUrl: pickMeta(html, "og:url"),
    externalUrl: pickMeta(html, "og:url") ?? pageUrl,
  };
}

export function buildEtkinlikPublicUrl(slugOrId: string): string {
  const q = slugOrId.trim();
  if (/^\d+$/.test(q)) return `https://etkinlik.io/e/${q}`;
  return `https://etkinlik.io/e/${encodeURIComponent(q)}`;
}

export async function scrapeEtkinlikEventPage(pageUrl: string): Promise<ScrapedEtkinlikEvent | null> {
  const url = pageUrl.trim();
  if (!url) return null;
  const memHit = scrapeMem.get(url);
  if (memHit && Date.now() - memHit.at < SCRAPE_TTL_MS) return memHit.value;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": SCRAPE_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      scrapeMem.set(url, { at: Date.now(), value: null });
      return null;
    }
    const html = await res.text();
    const parsed = parseFromHtml(html, res.url || url);
    scrapeMem.set(url, { at: Date.now(), value: parsed });
    return parsed;
  } catch {
    scrapeMem.set(url, { at: Date.now(), value: null });
    return null;
  }
}

/** Açıklama alanı yeterince dolu mu? */
export function scrapedDescriptionThin(desc: string | null | undefined): boolean {
  const t = (desc ?? "").replace(/\s+/g, " ").trim();
  return t.length < 80;
}
