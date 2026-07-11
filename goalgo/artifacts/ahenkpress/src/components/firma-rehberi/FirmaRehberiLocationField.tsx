import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { forwardGeocodeAddressHybrid, reverseGeocodeHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";
import {
  fetchGlobalSearchLocationPredictions,
  geocodePlaceIdHybrid,
} from "@/lib/mapsPlacePredictions";
import { TURKEY_CITIES } from "@/lib/popularCities";
import {
  KesfetHeroSuggestDropdown,
  type KesfetHeroSuggestItem,
} from "@/components/kesfet-listinghub/KesfetHeroSuggestDropdown";

export type FirmaRehberiLocationValue = { city: string; district: string; label: string };

type LineSug = { placeId: string; label: string };

const LOCAL_CITY_PREFIX = "local:city:";

function localCitySuggestions(raw: string): LineSug[] {
  const q = raw.trim().toLocaleLowerCase("tr-TR");
  const rows = q.length < 1
    ? TURKEY_CITIES.slice(0, 6)
    : TURKEY_CITIES.filter((c) => c.name.toLocaleLowerCase("tr-TR").includes(q)).slice(0, 6);
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

export type FirmaRehberiLocationFieldHandle = { commit: () => Promise<FirmaRehberiLocationValue | null> };

export const FirmaRehberiLocationField = forwardRef<
  FirmaRehberiLocationFieldHandle,
  {
    mapsSettings: MapsGeocodeSettings | null | undefined;
    displayValue: string;
    onDisplayChange: (v: string) => void;
    onLocationResolved: (v: FirmaRehberiLocationValue) => void;
    disabled?: boolean;
    inputClassName?: string;
  }
>(function FirmaRehberiLocationField({
  mapsSettings,
  displayValue,
  onDisplayChange,
  onLocationResolved,
  disabled,
  inputClassName,
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

  async function resolveFromPlaceId(s: LineSug): Promise<FirmaRehberiLocationValue | null> {
    const hit = await geocodePlaceIdHybrid(mapsSettings ?? null, s.placeId);
    if (!hit) return null;
    const addr = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
    return {
      city: addr.city || "",
      district: addr.district || "",
      label: addr.label || hit.formatted_address || s.label,
    };
  }

  async function applyPrediction(s: LineSug): Promise<FirmaRehberiLocationValue | null> {
    setSugOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onDisplayChange(s.label);

    if (s.placeId.startsWith(LOCAL_CITY_PREFIX)) {
      const city = s.placeId.slice(LOCAL_CITY_PREFIX.length);
      const resolved = { city, district: "", label: city };
      onLocationResolved(resolved);
      onDisplayChange(city);
      return resolved;
    }

    setBusy(true);
    try {
      const resolved = await resolveFromPlaceId(s);
      if (!resolved) return null;
      onLocationResolved(resolved);
      onDisplayChange(resolved.label || s.label);
      return resolved;
    } finally {
      setBusy(false);
    }
  }

  async function commitTypedLocation(): Promise<FirmaRehberiLocationValue | null> {
    const q = displayValue.trim();
    if (!q) {
      const empty = { city: "", district: "", label: "" };
      onLocationResolved(empty);
      return empty;
    }
    setBusy(true);
    try {
      const province = matchProvince(q);
      if (province && q.length <= 20) {
        const resolved = { city: province, district: "", label: province };
        onLocationResolved(resolved);
        onDisplayChange(province);
        return resolved;
      }
      const hit = await forwardGeocodeAddressHybrid(mapsSettings ?? null, q);
      if (hit) {
        const addr = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
        const resolved = {
          city: addr.city || "",
          district: addr.district || "",
          label: addr.label || q,
        };
        onLocationResolved(resolved);
        onDisplayChange(resolved.label);
        return resolved;
      }
      if (province) {
        const resolved = { city: province, district: "", label: province };
        onLocationResolved(resolved);
        onDisplayChange(province);
        return resolved;
      }
      const fallback = { city: q, district: "", label: q };
      onLocationResolved(fallback);
      return fallback;
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({ commit: commitTypedLocation }), [displayValue, mapsSettings]);

  const suggestItems = toSuggestItems(suggestions);

  return (
    <div ref={anchorRef} className="relative w-full">
      <input
        value={displayValue}
        role="combobox"
        aria-expanded={sugOpen && suggestItems.length > 0}
        aria-controls="firma-rehberi-loc-suggest"
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled || busy}
        className={inputClassName ?? "w-full bg-transparent text-sm font-bold text-[#203949] outline-none placeholder:text-slate-400"}
        placeholder="Mahalle, şehir veya adres yazın…"
        aria-label="Konum ara"
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
            }
          }
        }}
      />
      <KesfetHeroSuggestDropdown
        open={sugOpen}
        anchorRef={anchorRef}
        items={suggestItems}
        activeIndex={activeIndex}
        listId="firma-rehberi-loc-suggest"
        onSelect={(item) => {
          const hit = suggestions.find((row) => row.placeId === item.id);
          if (hit) void applyPrediction(hit);
        }}
      />
    </div>
  );
});
