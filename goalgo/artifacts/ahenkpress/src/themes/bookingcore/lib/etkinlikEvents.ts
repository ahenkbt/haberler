/** Etkinlik.io etkinlik arama — sunucu proxy üzerinden. */

import { apiUrl } from "@/lib/apiBase";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

export interface EtkinlikTaxonomyItem {
  id: number;
  name: string;
  slug: string;
}

export interface EtkinlikEventResult {
  id: number;
  name: string;
  slug: string;
  url: string;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  isFree: boolean;
  posterUrl: string | null;
  ticketUrl: string | null;
  category: { id: number; name: string; slug: string } | null;
  format?: { id: number; name: string; slug: string } | null;
  venueName: string | null;
  venueCity: string | null;
}

export interface EtkinlikEventDetailResult extends EtkinlikEventResult {
  description: string | null;
  descriptionHtml: string | null;
  imageUrls: string[];
  tags: string[];
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string;
  mapBusinessId?: string | null;
  mapBusinessSlug?: string | null;
  haritalarUrl?: string | null;
  sariSayfalarUrl?: string | null;
}

export interface EtkinlikEventDetailResponse {
  configured: boolean;
  hasEtkinlikIo?: boolean;
  source?: "cache" | "api" | "scrape" | "mixed";
  enriching?: boolean;
  configHint?: string | null;
  event: EtkinlikEventDetailResult | null;
}

export interface EtkinlikSearchResponse {
  configured: boolean;
  hasEtkinlikIo?: boolean;
  total: number;
  events: EtkinlikEventResult[];
  affiliateUrl?: string | null;
  configHint?: string | null;
  env?: EtkinlikIoEnvHint;
}

export interface EtkinlikTaxonomyResponse {
  configured: boolean;
  hasEtkinlikIo?: boolean;
  source: "live" | "fallback";
  configHint?: string | null;
  env?: EtkinlikIoEnvHint;
  categories: EtkinlikTaxonomyItem[];
  formats: EtkinlikTaxonomyItem[];
  extras: EtkinlikTaxonomyItem[];
}

export interface EtkinlikIoEnvHint {
  configured: boolean;
  tokenLength: number;
  tokenSource: string | null;
  emptyKeys: string[];
  noKeysPresent: boolean;
  expectedKey: string;
  redeployHint: string | null;
}

export interface EtkinlikStatusResponse {
  configured: boolean;
  hasEtkinlikIo?: boolean;
  configHint?: string | null;
  env: EtkinlikIoEnvHint;
}

/** status / search / taxonomy yanıtlarında tutarlı yapılandırma bayrağı. */
export function isEtkinlikIntegrationConfigured(
  data: { configured?: boolean; hasEtkinlikIo?: boolean; env?: EtkinlikIoEnvHint | null } | null | undefined,
): boolean {
  if (!data) return false;
  if (data.env?.configured === true) return true;
  if (data.hasEtkinlikIo === true) return true;
  return Boolean(data.configured);
}

export async function fetchEtkinlikStatus(): Promise<EtkinlikStatusResponse | null> {
  try {
    const res = await fetch(apiUrl("/api/travel/events/status"));
    if (!res.ok) return null;
    return (await res.json()) as EtkinlikStatusResponse;
  } catch {
    return null;
  }
}

export async function fetchEtkinlikTaxonomy(): Promise<EtkinlikTaxonomyResponse | null> {
  try {
    const res = await fetch(apiUrl("/api/travel/events/taxonomy"));
    if (!res.ok) return null;
    return (await res.json()) as EtkinlikTaxonomyResponse;
  } catch {
    return null;
  }
}

export async function fetchEtkinlikEvents(params: {
  city?: string;
  category?: string;
  format?: string;
  startDate?: string;
  endDate?: string;
  priceFilter?: "all" | "free" | "paid";
  take?: number;
  fetchAll?: boolean;
}): Promise<EtkinlikSearchResponse | null> {
  try {
    const q = new URLSearchParams();
    if (params.city) q.set("city", params.city);
    if (params.category && params.category !== "all") q.set("category", params.category);
    if (params.format && params.format !== "all") q.set("format", params.format);
    if (params.startDate) q.set("startDate", params.startDate);
    if (params.endDate) q.set("endDate", params.endDate);
    if (params.priceFilter && params.priceFilter !== "all") q.set("priceFilter", params.priceFilter);
    if (params.take) q.set("take", String(params.take));
    if (params.fetchAll) q.set("fetchAll", "1");
    const res = await fetch(`${apiUrl("/api/travel/events/search")}?${q.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as EtkinlikSearchResponse;
  } catch {
    return null;
  }
}

/** Site içi etkinlik detay rotası */
export function etkinlikDetailPath(event: { id: number; slug: string }): string {
  const key = (event.slug || String(event.id)).trim();
  return `${TURIZM.stubs.etkinlik}/${encodeURIComponent(key)}`;
}

export async function fetchEtkinlikEventDetail(
  idOrSlug: string,
): Promise<EtkinlikEventDetailResponse | null> {
  try {
    const q = encodeURIComponent(idOrSlug.trim());
    const res = await fetch(apiUrl(`/api/travel/events/${q}`));
    if (res.status === 404) {
      return { configured: false, event: null };
    }
    if (!res.ok) return null;
    const data = (await res.json()) as EtkinlikEventDetailResponse;
    return data;
  } catch {
    return null;
  }
}
