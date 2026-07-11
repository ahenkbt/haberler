import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { forwardGeocodeAddressHybrid, reverseGeocodeHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";
import { fetchGlobalSearchLocationPredictions, geocodePlaceIdHybrid } from "@/lib/mapsPlacePredictions";
import { requestPublicLocation } from "@/lib/publicLocation";
import { TURKEY_CITIES } from "@/lib/popularCities";
import {
  KesfetHeroSuggestDropdown,
  type KesfetHeroSuggestItem,
} from "@/components/kesfet-listinghub/KesfetHeroSuggestDropdown";

type TrAddressValue = { city: string; district: string; mahalle: string; sokak?: string };

type LineSug = { placeId: string; label: string };

const LOCAL_CITY_PREFIX = "local:city:";

function localCitySuggestions(raw: string): LineSug[] {
  const q = raw.trim().toLocaleLowerCase("tr-TR");
  const rows = q.length < 1
    ? TURKEY_CITIES.slice(0, 8)
    : TURKEY_CITIES.filter((c) => c.name.toLocaleLowerCase("tr-TR").startsWith(q)).slice(0, 8);
  return rows.map((c) => ({
    placeId: `${LOCAL_CITY_PREFIX}${c.name}`,
    label: `${c.name}, Türkiye`,
  }));
}

function matchProvince(raw: string): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const exact = TURKEY_CITIES.find((c) => c.name.toLowerCase() === q);
  if (exact) return exact.name;
  const prefix = TURKEY_CITIES.find((c) => c.name.toLowerCase().startsWith(q));
  return prefix?.name ?? null;
}

function toSuggestItems(rows: LineSug[]): KesfetHeroSuggestItem[] {
  return rows.map((row) => ({
    id: row.placeId,
    label: row.label,
    icon: row.placeId.startsWith(LOCAL_CITY_PREFIX) ? "🏙️" : "📍",
  }));
}

export type KesfetHeroLocationFieldHandle = { commit: () => Promise<void> };

export const KesfetHeroLocationField = forwardRef<
  KesfetHeroLocationFieldHandle,
  {
    mapsSettings: MapsGeocodeSettings | null | undefined;
    displayValue: string;
    onDisplayChange: (v: string) => void;
    onLocationResolved: (v: TrAddressValue) => void;
    onCommit?: () => void;
    onSuggestionSelect?: (v: TrAddressValue) => void;
  }
>(function KesfetHeroLocationField({
  mapsSettings,
  displayValue,
  onDisplayChange,
  onLocationResolved,
  onCommit,
  onSuggestionSelect,
}, ref) {
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<LineSug[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRun = useRef(0);

  const schedulePredictions = useCallback(
    (raw: string) => {
      if (sugTimer.current) clearTimeout(sugTimer.current);
      const q = raw.trim();
      const localRows = localCitySuggestions(q);
      if (q.length < 1) {
        setSuggestions(localRows);
        setActiveIndex(localRows.length ? 0 : -1);
        return;
      }
      if (localRows.length) {
        setSuggestions(localRows);
        setActiveIndex(0);
      }
      sugTimer.current = setTimeout(() => {
        const runId = ++sugRun.current;
        void (async () => {
          const remoteRows = await fetchGlobalSearchLocationPredictions(mapsSettings ?? null, q);
          if (runId !== sugRun.current) return;
          const seen = new Set<string>();
          const merged: LineSug[] = [];
          for (const row of [...localRows, ...remoteRows.map((r) => ({ placeId: r.place_id, label: r.description }))]) {
            const key = row.label.toLocaleLowerCase("tr-TR");
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(row);
          }
          setSuggestions(merged.slice(0, 8));
          setActiveIndex(merged.length ? 0 : -1);
        })();
      }, 220);
    },
    [mapsSettings],
  );

  async function applyPrediction(s: LineSug) {
    setSugOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onDisplayChange(s.label);

    if (s.placeId.startsWith(LOCAL_CITY_PREFIX)) {
      const city = s.placeId.slice(LOCAL_CITY_PREFIX.length);
      const resolved = { city, district: "", mahalle: "" };
      onLocationResolved(resolved);
      onDisplayChange(city);
      onCommit?.();
      onSuggestionSelect?.(resolved);
      return;
    }

    setBusy(true);
    try {
      const hit = await geocodePlaceIdHybrid(mapsSettings ?? null, s.placeId);
      if (!hit) return;
      const addr = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
      const resolved = {
        city: addr.city || "",
        district: addr.district || "",
        mahalle: "",
      };
      onLocationResolved(resolved);
      onDisplayChange(addr.label || s.label);
      onCommit?.();
      onSuggestionSelect?.(resolved);
    } finally {
      setBusy(false);
    }
  }

  async function commitTypedLocation(): Promise<void> {
    const q = displayValue.trim();
    if (!q) {
      onLocationResolved({ city: "", district: "", mahalle: "" });
      onCommit?.();
      return;
    }
    setBusy(true);
    try {
      const province = matchProvince(q);
      if (province && q.length <= 20) {
        onLocationResolved({ city: province, district: "", mahalle: "" });
        onDisplayChange(province);
        onCommit?.();
        return;
      }
      const query = /türkiye|turkiye/i.test(q) ? q : `${q}, Türkiye`;
      const hit = await forwardGeocodeAddressHybrid(mapsSettings ?? null, query);
      if (hit) {
        const addr = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
        onLocationResolved({
          city: addr.city || "",
          district: addr.district || "",
          mahalle: "",
        });
        onDisplayChange(addr.label || q);
      } else if (province) {
        onLocationResolved({ city: province, district: "", mahalle: "" });
        onDisplayChange(province);
      } else {
        onLocationResolved({ city: q, district: "", mahalle: "" });
      }
      onCommit?.();
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({ commit: commitTypedLocation }), [displayValue, mapsSettings]);

  const suggestItems = toSuggestItems(suggestions);

  return (
    <div ref={anchorRef} className="lh-field lh-field-location relative flex-1">
      <MapPin className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
      <input
        value={displayValue}
        role="combobox"
        aria-expanded={sugOpen && suggestItems.length > 0}
        aria-controls="kesfet-hero-loc-suggest"
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          onDisplayChange(v);
          setSugOpen(true);
          schedulePredictions(v);
        }}
        onFocus={() => {
          schedulePredictions(displayValue);
          setSugOpen(true);
        }}
        onBlur={() => setTimeout(() => setSugOpen(false), 180)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            if (!sugOpen || !suggestItems.length) return;
            e.preventDefault();
            setSugOpen(true);
            setActiveIndex((idx) => (idx + 1) % suggestItems.length);
            return;
          }
          if (e.key === "ArrowUp") {
            if (!sugOpen || !suggestItems.length) return;
            e.preventDefault();
            setSugOpen(true);
            setActiveIndex((idx) => (idx <= 0 ? suggestItems.length - 1 : idx - 1));
            return;
          }
          if (e.key === "Escape") {
            setSugOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (sugOpen && activeIndex >= 0 && suggestItems[activeIndex]) {
              const hit = suggestions[activeIndex];
              if (hit) void applyPrediction(hit);
              return;
            }
            void commitTypedLocation();
          }
        }}
        placeholder="Konumunuzu yazın"
        aria-label="Konum ara"
        disabled={busy}
      />
      <KesfetHeroSuggestDropdown
        open={sugOpen}
        anchorRef={anchorRef}
        items={suggestItems}
        activeIndex={activeIndex}
        listId="kesfet-hero-loc-suggest"
        onSelect={(item) => {
          const hit = suggestions.find((row) => row.placeId === item.id);
          if (hit) void applyPrediction(hit);
        }}
      />
    </div>
  );
});

export async function resolveLocationFromBrowser(
  mapsSettings: MapsGeocodeSettings | null | undefined,
): Promise<{ loc: TrAddressValue; label: string }> {
  const pos = await requestPublicLocation(mapsSettings, { timeout: 12_000 });
  return {
    loc: { city: pos.city || "", district: pos.district || "", mahalle: "" },
    label: pos.label || pos.city || "",
  };
}
