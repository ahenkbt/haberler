import { useCallback, useEffect, useRef, useState } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { fetchGooglePlacePredictions, geocodePlaceIdClient } from "@/lib/mapsPlacePredictions";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import { fetchTravelPlaces, type TravelPlace } from "../lib/travelpayouts";

type Props = {
  value: string;
  iata: string;
  onChange: (label: string, iata: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  icon?: string;
};

type Suggestion =
  | { kind: "place"; place: TravelPlace }
  | { kind: "google"; id: string; label: string; placeId: string };

function placeLabel(p: TravelPlace): string {
  return p.code ? `${p.name} (${p.code})` : p.name;
}

async function resolveIataFromQuery(q: string): Promise<{ label: string; iata: string }> {
  const rows = await fetchTravelPlaces(q);
  const airport = rows.find((p) => p.type === "airport" && p.code) ?? rows.find((p) => p.code);
  if (airport?.code) {
    return { label: placeLabel(airport), iata: airport.code.trim().toUpperCase() };
  }
  const code = q.trim().length === 3 ? q.trim().toUpperCase() : "";
  return { label: q.trim(), iata: code };
}

/** Uçuş nereden/nereye — Google Maps Places + Travelpayouts IATA önerileri. */
export function BookingCoreFlightPlaceInput({
  value,
  iata,
  onChange,
  label = "Nereden",
  id,
  placeholder = "Şehir veya havalimanı",
  icon = "✈️",
}: Props) {
  const { data: siteSettings } = useGetSiteSettings();
  const mapsGeo = effectiveMapsGeocodeSettings(siteSettings ?? null);

  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [hint, setHint] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const schedule = useCallback(
    (raw: string) => {
      if (timer.current) clearTimeout(timer.current);
      setInput(raw);
      const code = raw.trim().length === 3 ? raw.trim().toUpperCase() : iata;
      onChange(raw, code);
      const q = raw.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setSugOpen(false);
        setHint("");
        return;
      }
      timer.current = setTimeout(() => {
        const idRun = ++runId.current;
        void (async () => {
          const [tpRows, gRows] = await Promise.all([
            fetchTravelPlaces(q),
            mapsGeo.mapsGoogleEnabled && (mapsGeo.mapsGoogleBrowserKey ?? "").trim()
              ? fetchGooglePlacePredictions(siteSettings ?? null, q)
              : Promise.resolve([]),
          ]);
          if (idRun !== runId.current) return;

          const merged: Suggestion[] = [
            ...tpRows.slice(0, 6).map((place) => ({ kind: "place" as const, place })),
            ...gRows.slice(0, 4).map((g) => ({
              kind: "google" as const,
              id: `g_${g.place_id}`,
              label: g.description,
              placeId: g.place_id,
            })),
          ].slice(0, 8);

          setSuggestions(merged);
          setSugOpen(merged.length > 0);
          if (merged.length === 0 && mapsGeo.mapsGoogleEnabled && !(mapsGeo.mapsGoogleBrowserKey ?? "").trim()) {
            setHint("Google konum araması yapılandırılmamış; havalimanı adı veya IATA kodu yazın.");
          } else {
            setHint("");
          }
        })();
      }, 220);
    },
    [iata, onChange, mapsGeo.mapsGoogleBrowserKey, mapsGeo.mapsGoogleEnabled, siteSettings],
  );

  async function pick(item: Suggestion) {
    if (item.kind === "place") {
      const nextLabel = placeLabel(item.place);
      const code = (item.place.code ?? "").trim().toUpperCase();
      setInput(nextLabel);
      onChange(nextLabel, code);
      setSuggestions([]);
      setSugOpen(false);
      setHint("");
      return;
    }

    let city = item.label.split(",")[0]?.trim() || item.label;
    if (item.placeId && mapsGeo.mapsGoogleEnabled) {
      const geo = await geocodePlaceIdClient(siteSettings ?? null, item.placeId);
      if (geo?.formatted_address) {
        city = geo.formatted_address.split(",")[0]?.trim() || city;
      }
    }
    const resolved = await resolveIataFromQuery(city);
    setInput(resolved.label || item.label);
    onChange(resolved.label || item.label, resolved.iata);
    setSuggestions([]);
    setSugOpen(false);
    setHint(resolved.iata ? "" : "Havalimanı IATA kodu bulunamadı; IST, SAW gibi kod girebilirsiniz.");
  }

  return (
    <div className="bc-hero-search__field bc-hero-search__field--grow">
      <label htmlFor={id}>{label}</label>
      <div className="bc-hero-search__input-wrap">
        <span className="bc-hero-search__icon" aria-hidden>
          {icon}
        </span>
        <input
          id={id}
          type="text"
          value={input}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => suggestions.length > 0 && setSugOpen(true)}
          onBlur={() => setTimeout(() => setSugOpen(false), 180)}
          onChange={(e) => schedule(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              void pick(suggestions[0]!);
            }
          }}
        />
        {sugOpen && suggestions.length > 0 ? (
          <ul className="bc-hero-search__suggest">
            {suggestions.map((item) => (
              <li key={item.kind === "place" ? `${item.place.code ?? item.place.name}` : item.id}>
                <button type="button" onMouseDown={() => void pick(item)}>
                  {item.kind === "place" ? (
                    <>
                      {item.place.name}
                      {item.place.code ? ` (${item.place.code})` : ""}
                      {item.place.countryName ? ` · ${item.place.countryName}` : ""}
                    </>
                  ) : (
                    <>📍 {item.label}</>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hint ? <span className="bc-location-input__hint">{hint}</span> : null}
    </div>
  );
}
