import { useCallback, useEffect, useRef, useState } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { fetchGooglePlacePredictions, geocodePlaceIdClient } from "@/lib/mapsPlacePredictions";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import { useTourismCities } from "../hooks/useTourismListings";

type Props = {
  value: string;
  onChange: (city: string) => void;
  type?: string;
  label?: string;
  id?: string;
  placeholder?: string;
};

/** Turizm liste araması — Google Places autocomplete + şehir önerileri (§10). */
export function BookingCoreLocationInput({
  value,
  onChange,
  type,
  label = "Destinasyon",
  id,
  placeholder = "Şehir veya konum ara",
}: Props) {
  const { data: siteSettings } = useGetSiteSettings();
  const mapsGeo = effectiveMapsGeocodeSettings(siteSettings ?? null);
  const { cities: tourismCities } = useTourismCities(type);

  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; placeId?: string }[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [hint, setHint] = useState("");
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRun = useRef(0);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const showCityPicker = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (q.length >= 2) return;
      setSuggestions(
        tourismCities.slice(0, 10).map((name) => ({
          id: `city_${name}`,
          label: name,
        })),
      );
      setSugOpen(true);
      setHint("");
    },
    [tourismCities],
  );

  const scheduleSuggest = useCallback(
    (raw: string) => {
      if (sugTimer.current) clearTimeout(sugTimer.current);
      const q = raw.trim();
      setInput(raw);
      if (q.length < 2) {
        showCityPicker(raw);
        return;
      }
      sugTimer.current = setTimeout(() => {
        const runId = ++sugRun.current;
        void (async () => {
          let server: { id: string; label: string }[] = [];
          try {
            const r = await fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`);
            const d = await r.json();
            if (d.success && Array.isArray(d.data)) {
              server = d.data.map((x: { id: string; label: string }) => ({
                id: String(x.id),
                label: x.label,
              }));
            }
          } catch {
            /* ignore */
          }
          const gRows =
            mapsGeo.mapsGoogleEnabled && (mapsGeo.mapsGoogleBrowserKey ?? "").trim()
              ? await fetchGooglePlacePredictions(siteSettings ?? null, q)
              : [];
          if (runId !== sugRun.current) return;
          const merged = [
            ...gRows.map((g) => ({ id: `g_${g.place_id}`, label: g.description, placeId: g.place_id })),
            ...server.map((s) => ({ id: s.id, label: s.label })),
          ].slice(0, 8);
          setSuggestions(merged);
          setSugOpen(merged.length > 0);
          if (merged.length === 0 && mapsGeo.mapsGoogleEnabled && !(mapsGeo.mapsGoogleBrowserKey ?? "").trim()) {
            setHint("Google konum araması yapılandırılmamış; şehir adı yazabilirsiniz.");
          } else {
            setHint("");
          }
        })();
      }, 220);
    },
    [siteSettings, mapsGeo.mapsGoogleBrowserKey, mapsGeo.mapsGoogleEnabled, showCityPicker],
  );

  async function pickSuggestion(item: { label: string; placeId?: string }) {
    setInput(item.label);
    setSuggestions([]);
    setSugOpen(false);
    setHint("");

    let city = item.label.split(",")[0]?.trim() || item.label;
    if (item.placeId && mapsGeo.mapsGoogleEnabled) {
      const geo = await geocodePlaceIdClient(siteSettings ?? null, item.placeId);
      if (geo?.formatted_address) {
        city = geo.formatted_address.split(",")[0]?.trim() || city;
      }
    }
    onChange(city);
  }

  return (
    <label className="bc-location-input">
      <span>{label}</span>
      <div className="bc-location-input__wrap">
        <input
          id={id}
          type="text"
          value={input}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => showCityPicker(input)}
          onBlur={() => setTimeout(() => setSugOpen(false), 180)}
          onChange={(e) => scheduleSuggest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onChange(input.trim().split(",")[0]?.trim() || input.trim());
              setSugOpen(false);
            }
          }}
        />
        {sugOpen && suggestions.length > 0 ? (
          <ul className="bc-hero-search__suggest bc-location-input__suggest">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button type="button" onMouseDown={() => void pickSuggestion(s)}>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hint ? <span className="bc-location-input__hint">{hint}</span> : null}
    </label>
  );
}
