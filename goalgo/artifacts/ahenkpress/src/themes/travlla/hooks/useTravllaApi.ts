import { useEffect, useState } from "react";
import type { TravllaDestination, TravllaTour } from "../travllaTypes";
import {
  TRAVLLA_DEMO_DESTINATIONS,
  destinationBySlug,
  enrichTourRow,
  normalizeListingTours,
  toursForDestinationCity,
} from "../travllaFallbackData";

const API = "/api";

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useTravllaTours(params?: {
  city?: string;
  page?: number;
  limit?: number;
  type?: string;
}) {
  const [tours, setTours] = useState<TravllaTour[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 12),
      type: params?.type || "tour",
    });
    if (params?.city) q.set("city", params.city);

    (async () => {
      const primary = await fetchJson(`${API}/tourism/tours?${q}`);
      if (cancelled) return;
      if (primary) {
        setTours(normalizeListingTours((primary.tours || primary.listings || []) as Record<string, unknown>[]));
        setTotal(Number(primary.total || 0));
        setLoading(false);
        return;
      }

      const fallbackQ = new URLSearchParams(q);
      fallbackQ.set("type", "tour");
      const legacy = await fetchJson(`${API}/tourism/listings?${fallbackQ}`);
      if (cancelled) return;
      if (legacy) {
        setTours(normalizeListingTours((legacy.listings || []) as Record<string, unknown>[]));
        setTotal(Number(legacy.total || 0));
      } else {
        setTours([]);
        setTotal(0);
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setTours([]);
        setTotal(0);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params?.city, params?.page, params?.limit, params?.type]);

  return { tours, total, loading };
}

export function useTravllaTour(slug: string) {
  const [tour, setTour] = useState<TravllaTour | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const primary = await fetchJson(`${API}/tourism/tours/${encodeURIComponent(slug)}`);
      if (cancelled) return;
      if (primary) {
        setTour(enrichTourRow(primary));
        setLoading(false);
        return;
      }

      const legacy = await fetchJson(`${API}/tourism/listings/${encodeURIComponent(slug)}`);
      if (cancelled) return;
      setTour(legacy ? enrichTourRow(legacy) : null);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setTour(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { tour, loading };
}

export function useTravllaDestinations() {
  const [destinations, setDestinations] = useState<TravllaDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const primary = await fetchJson(`${API}/tourism/destinations`);
      if (cancelled) return;
      if (primary?.destinations) {
        setDestinations(primary.destinations as TravllaDestination[]);
        setLoading(false);
        return;
      }
      setDestinations(TRAVLLA_DEMO_DESTINATIONS);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setDestinations(TRAVLLA_DEMO_DESTINATIONS);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { destinations, loading };
}

export function useTravllaDestination(slug: string) {
  const [destination, setDestination] = useState<TravllaDestination | null>(null);
  const [tours, setTours] = useState<TravllaTour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const primary = await fetchJson(`${API}/tourism/destinations/${encodeURIComponent(slug)}`);
      if (cancelled) return;
      if (primary?.destination) {
        setDestination(primary.destination as TravllaDestination);
        setTours(normalizeListingTours((primary.tours || []) as Record<string, unknown>[]));
        setLoading(false);
        return;
      }

      const dest = destinationBySlug(slug);
      if (!dest) {
        setDestination(null);
        setTours([]);
        setLoading(false);
        return;
      }

      const tourQ = new URLSearchParams({ type: "tour", limit: "12", page: "1", city: dest.title });
      const tourData = await fetchJson(`${API}/tourism/tours?${tourQ}`);
      let rows: TravllaTour[] = [];
      if (tourData) {
        rows = normalizeListingTours((tourData.tours || tourData.listings || []) as Record<string, unknown>[]);
      } else {
        const legacy = await fetchJson(`${API}/tourism/listings?${tourQ}`);
        if (legacy) {
          rows = normalizeListingTours((legacy.listings || []) as Record<string, unknown>[]);
        }
      }
      if (cancelled) return;
      setDestination(dest);
      setTours(toursForDestinationCity(dest.title, rows));
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        const dest = destinationBySlug(slug);
        setDestination(dest);
        setTours([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { destination, tours, loading };
}
