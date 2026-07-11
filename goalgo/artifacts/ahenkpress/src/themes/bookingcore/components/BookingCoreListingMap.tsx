import { useEffect, useRef, useState } from "react";
import type { TourismListing } from "../hooks/useTourismListings";
import { tourismListingHref } from "../lib/listingRoutes";
import { priceLevelToSymbols } from "../lib/googlePlaceMeta";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_PIN_ICON: Record<string, string> = {
  hotel: "🏨",
  villa: "🏡",
  car: "🚗",
  boat: "⛵",
  tour: "🗺️",
};

function ensureLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).L) return resolve();
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if ((window as any).L) resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.addEventListener("load", () => resolve());
    document.body.appendChild(script);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function BookingCoreListingMap({ listings }: { listings: TourismListing[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const withCoords = listings.filter(
    (l) => typeof l.lat === "number" && typeof l.lng === "number" && l.lat !== 0 && l.lng !== 0,
  );

  useEffect(() => {
    let cancelled = false;
    void ensureLeaflet().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(
        [39.0, 35.0],
        6,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap, © CARTO",
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;
    const markerLayer: any[] = [];
    const bounds: [number, number][] = [];

    for (const l of withCoords) {
      const lat = l.lat as number;
      const lng = l.lng as number;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:38px;position:relative"><div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#059669,#10b981);border:3px solid white;box-shadow:0 4px 12px rgba(16,185,129,.45);display:flex;align-items:center;justify-content:center;font-size:15px">${TYPE_PIN_ICON[l.type] || "📍"}</div><div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #059669"></div></div>`,
        iconSize: [34, 38],
        iconAnchor: [17, 38],
      });
      const href = l.href || tourismListingHref(l);
      const priceLevel = priceLevelToSymbols(l.price_level);
      const ratingLine =
        l.rating && l.rating > 0
          ? `<span style="display:block;font-size:11px;color:#475569">★ ${Number(l.rating).toFixed(1)}${l.review_count ? ` (${l.review_count})` : ""}${priceLevel ? ` · ${priceLevel}` : ""}</span>`
          : priceLevel
            ? `<span style="display:block;font-size:11px;color:#475569">${priceLevel}</span>`
            : "";
      const popupHtml = `<div style="min-width:160px">
          <strong style="display:block;font-size:13px;color:#0f172a">${escapeHtml(l.title)}</strong>
          ${l.city ? `<span style="display:block;font-size:11px;color:#64748b">${escapeHtml(String(l.city))}</span>` : ""}
          ${ratingLine}
          <a href="${escapeHtml(href)}" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:700;color:#059669">Detayları gör →</a>
        </div>`;
      const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupHtml);
      markerLayer.push(marker);
      bounds.push([lat, lng]);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch {
        /* noop */
      }
    }
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        /* noop */
      }
    }, 60);

    return () => {
      for (const m of markerLayer) {
        try {
          map.removeLayer(m);
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, listings]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch {
          /* noop */
        }
        mapInstance.current = null;
      }
    };
  }, []);

  if (withCoords.length === 0) {
    return (
      <div className="bc-empty">
        <p>Bu listede harita üzerinde gösterilecek konum bilgisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="bc-listing-map">
      <div ref={mapRef} className="bc-listing-map__canvas" />
      <p className="bc-listing-map__note">{withCoords.length} işletme harita üzerinde gösteriliyor</p>
    </div>
  );
}
