import { useEffect, useState } from "react";
import { tourismListingHref } from "../lib/listingRoutes";
import { fetchTourismListings } from "../lib/fetchTourismListings";
import type { TourismListingRow } from "../lib/normalizeTourismListing";
import { mergeTourismCityLists, TOURISM_FALLBACK_CITIES } from "../lib/tourismCities";

export type TourismListing = TourismListingRow & {
  address?: string | null;
};

export function useTourismListings(params: {
  type?: string;
  city?: string;
  featured?: boolean;
  limit?: number;
}) {
  const [listings, setListings] = useState<TourismListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchTourismListings({
      type: params.type,
      city: params.city,
      featured: params.featured,
      limit: params.limit ?? 8,
    })
      .then((rows) => {
        if (cancelled) return;
        setListings(
          rows.map((row) => ({
            ...row,
            href: row.href || tourismListingHref(row),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.type, params.city, params.featured, params.limit]);

  return { listings, loading };
}

export function useTourismDestinations() {
  const [destinations, setDestinations] = useState<
    {
      id: number;
      title: string;
      slug: string;
      image: string;
      listings: number;
      hotels?: number;
      tours?: number;
      villas?: number;
      excerpt?: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tourism/destinations")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setDestinations(Array.isArray(d?.destinations) ? d.destinations : []);
      })
      .catch(() => {
        if (!cancelled) setDestinations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { destinations, loading };
}

export function useTourismCities(type?: string) {
  const [cities, setCities] = useState<string[]>([...TOURISM_FALLBACK_CITIES]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = type ? `?type=${encodeURIComponent(type)}` : "";
    fetch(`/api/tourism/cities${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const apiCities = Array.isArray(d?.cities) ? (d.cities as string[]) : [];
        setCities(mergeTourismCityLists(apiCities, [...TOURISM_FALLBACK_CITIES]));
      })
      .catch(() => {
        if (!cancelled) setCities([...TOURISM_FALLBACK_CITIES]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  return { cities, loading };
}
