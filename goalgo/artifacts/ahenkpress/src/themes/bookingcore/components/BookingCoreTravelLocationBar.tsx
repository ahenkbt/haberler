import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { fetchTravelPlaces, type TravelPlace } from "../lib/travelpayouts";

type Props = {
  value: TravelPlace | null;
  onChange: (loc: TravelPlace | null) => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
};

function placeLabel(p: TravelPlace): string {
  if (p.type === "country") return p.name;
  const parts = [p.name];
  if (p.countryName && p.countryName !== p.name) parts.push(p.countryName);
  return parts.join(", ");
}

/** Seyahat sayfaları üst lokasyon/ülke arama kutusu (Travelpayouts places2 autocomplete). */
export function BookingCoreTravelLocationBar({
  value,
  onChange,
  title = "Nereye gitmek istiyorsunuz?",
  subtitle = "Ülke, şehir veya destinasyon seçin — tüm sonuçlar ona göre güncellenir.",
  placeholder = "Ülke veya şehir ara (örn. Antalya, İtalya)",
}: Props) {
  const [input, setInput] = useState(value ? placeLabel(value) : "");
  const [suggestions, setSuggestions] = useState<TravelPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    setInput(value ? placeLabel(value) : "");
  }, [value]);

  function schedule(raw: string) {
    setInput(raw);
    if (timer.current) clearTimeout(timer.current);
    const q = raw.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      const id = ++runId.current;
      setLoading(true);
      void fetchTravelPlaces(q)
        .then((rows) => {
          if (id !== runId.current) return;
          setSuggestions(rows.slice(0, 8));
          setOpen(rows.length > 0);
        })
        .finally(() => {
          if (id === runId.current) setLoading(false);
        });
    }, 220);
  }

  function pick(p: TravelPlace) {
    setInput(placeLabel(p));
    setSuggestions([]);
    setOpen(false);
    onChange(p);
  }

  function clear() {
    setInput("");
    setSuggestions([]);
    setOpen(false);
    onChange(null);
  }

  return (
    <div className="bc-travel-locbar">
      <div className="bc-travel-locbar__inner">
        <div className="bc-travel-locbar__head">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="bc-travel-locbar__field">
          <MapPin className="bc-travel-locbar__icon" />
          <input
            type="text"
            value={input}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => schedule(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault();
                pick(suggestions[0]!);
              }
            }}
          />
          {value || input ? (
            <button type="button" className="bc-travel-locbar__clear" onClick={clear} aria-label="Temizle">
              <X className="bc-travel-locbar__clear-icon" />
            </button>
          ) : null}
          {open && suggestions.length > 0 ? (
            <ul className="bc-travel-locbar__suggest">
              {suggestions.map((p, i) => (
                <li key={`${p.type}-${p.code ?? p.name}-${i}`}>
                  <button type="button" onMouseDown={() => pick(p)}>
                    <span className="bc-travel-locbar__sug-main">
                      {p.name}
                      {p.code ? <span className="bc-travel-locbar__sug-code">{p.code}</span> : null}
                    </span>
                    <span className="bc-travel-locbar__sug-sub">
                      {p.type === "country" ? "Ülke" : p.countryName || "Şehir"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {loading ? <span className="bc-travel-locbar__loading">Aranıyor…</span> : null}
        {value ? (
          <p className="bc-travel-locbar__active">
            Seçili: <strong>{placeLabel(value)}</strong>
            {value.code ? ` (${value.code})` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
