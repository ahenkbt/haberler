import { useCallback, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { MapsGeocodeSettings } from "@/lib/mapsGeocode";
import { forwardGeocodeAddressHybrid } from "@/lib/mapsGeocode";
import {
  fetchHybridLocationSuggestionsDetailed,
  geocodePlaceIdHybrid,
  searchStaticTurkishLocationSuggestions,
  type HybridLocationSuggestionRow,
} from "@/lib/mapsPlacePredictions";
import { resolveIlCenterFromSearchQuery } from "@/lib/newsmapSidebarHeadlines";

export type NewsmapLocationSelectPayload = {
  label: string;
  lat: number;
  lng: number;
  zoom?: number;
};

type NewsmapLocationSearchProps = {
  mapsSettings: MapsGeocodeSettings | null | undefined;
  ilCenters?: Array<{ plaka?: number | null; adi: string; lat: number; lng: number; zoom: number }>;
  className?: string;
  onLocationSelect: (payload: NewsmapLocationSelectPayload) => void;
};

/** Haber haritası — konum arama (Places autocomplete). */
export function NewsmapLocationSearch({
  mapsSettings,
  ilCenters = [],
  className = "",
  onLocationSelect,
}: NewsmapLocationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<HybridLocationSuggestionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef(0);

  const schedulePredictions = useCallback(
    (raw: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const q = raw.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const runId = ++runRef.current;
      timerRef.current = setTimeout(async () => {
        const rows = await fetchHybridLocationSuggestionsDetailed(mapsSettings, q, { ilCenters, limit: 8 });
        if (runRef.current !== runId) return;
        setSuggestions(rows);
        setOpen(rows.length > 0);
      }, 220);
    },
    [mapsSettings, ilCenters],
  );

  const resolveSuggestion = useCallback(
    async (row: HybridLocationSuggestionRow) => {
      setBusy(true);
      setOpen(false);
      try {
        let lat = row.lat;
        let lng = row.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          const geo = await geocodePlaceIdHybrid(mapsSettings, row.place_id);
          if (!geo) return;
          lat = geo.lat;
          lng = geo.lng;
        }
        onLocationSelect({
          label: row.description,
          lat: lat!,
          lng: lng!,
          zoom: row.zoom,
        });
        setQuery(row.description);
      } finally {
        setBusy(false);
      }
    },
    [mapsSettings, onLocationSelect],
  );

  const submitRawQuery = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (q.length < 2) return;
      setBusy(true);
      setOpen(false);
      try {
        if (suggestions[0]) {
          await resolveSuggestion(suggestions[0]);
          return;
        }
        const ilMatch = resolveIlCenterFromSearchQuery(q, ilCenters);
        if (ilMatch) {
          onLocationSelect({
            label: ilMatch.adi,
            lat: ilMatch.lat,
            lng: ilMatch.lng,
            zoom: Math.max(10, ilMatch.zoom || 11),
          });
          setQuery(ilMatch.adi);
          return;
        }
        const staticRows = searchStaticTurkishLocationSuggestions(q, ilCenters, [], [], 1);
        if (staticRows[0]) {
          await resolveSuggestion(staticRows[0]);
          return;
        }
        const geo = await forwardGeocodeAddressHybrid(mapsSettings, q);
        if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
          onLocationSelect({
            label: q,
            lat: geo.lat,
            lng: geo.lng,
            zoom: 10,
          });
          setQuery(q);
        }
      } finally {
        setBusy(false);
      }
    },
    [ilCenters, mapsSettings, onLocationSelect, resolveSuggestion, suggestions],
  );

  return (
    <div className={`newsmap-location-search ${className}`.trim()}>
      <div className="newsmap-location-search__field">
        <Search className="newsmap-location-search__icon" aria-hidden="true" />
        <input
          type="search"
          className="newsmap-location-search__input"
          placeholder="Konum ara…"
          value={query}
          autoComplete="off"
          aria-label="Konum ara"
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            schedulePredictions(value);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              schedulePredictions(query);
            } else if (suggestions.length > 0) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 180);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim().length >= 2) {
              e.preventDefault();
              void submitRawQuery(query);
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="newsmap-location-search__clear"
            aria-label="Temizle"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setOpen(false);
            }}
          >
            ×
          </button>
        ) : null}
        {busy ? (
          <span className="newsmap-location-search__spinner" aria-hidden="true" />
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul
          className="newsmap-location-search__dropdown"
          role="listbox"
          /* Dokunmatikte blur, tıklamadan önce listeyi kapatıyordu — odak kaybını engelle. */
          onPointerDown={(e) => e.preventDefault()}
        >
          {suggestions.map((row) => (
            <li key={row.place_id}>
              <button
                type="button"
                className="newsmap-location-search__option"
                role="option"
                onClick={() => {
                  void resolveSuggestion(row);
                }}
              >
                <MapPin className="newsmap-location-search__option-icon" aria-hidden="true" />
                <span className="newsmap-location-search__option-label">{row.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
