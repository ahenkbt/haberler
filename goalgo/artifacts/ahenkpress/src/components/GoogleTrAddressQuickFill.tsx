import { useState, useRef, useCallback, useEffect } from "react";
import { forwardGeocodeAddressHybrid, reverseGeocodeHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";
import { fetchGooglePlacePredictions, geocodePlaceIdClient } from "@/lib/mapsPlacePredictions";
import { requestPublicLocation } from "@/lib/publicLocation";

type Variant = "orange" | "blue" | "emerald";
type TrAddressValue = { city: string; district: string; mahalle: string; sokak?: string };

const btnClass: Record<Variant, string> = {
  orange: "bg-orange-600 hover:bg-orange-700 text-white",
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  emerald: "bg-[#0f766e] hover:bg-[#0b5f59] text-white",
};

const secondaryClass: Record<Variant, string> = {
  orange: "border border-orange-600 text-orange-700 bg-white hover:bg-orange-50",
  blue: "border border-blue-600 text-blue-700 bg-white hover:bg-blue-50",
  emerald: "border border-[#0f766e] text-[#0f766e] bg-white hover:bg-emerald-50",
};

type LineSug = { placeId: string; label: string };

/** Tek satırlı konum araması + tarayıcı konumu. */
export function GoogleTrAddressQuickFill({
  mapsSettings,
  value,
  onChange,
  onCommit,
  variant = "orange",
  helperText,
}: {
  mapsSettings: MapsGeocodeSettings | null | undefined;
  value: TrAddressValue;
  onChange: (v: TrAddressValue) => void;
  /** İl seçildiğinde veya alanlar değişince (debounce); konum/öneri sonrası da tetiklenir. */
  onCommit?: (v: TrAddressValue) => void;
  variant?: Variant;
  helperText?: string;
}) {
  const [googleLine, setGoogleLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<LineSug[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRun = useRef(0);
  const skipFirstCommit = useRef(true);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (!onCommitRef.current) return;
    if (skipFirstCommit.current) {
      skipFirstCommit.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const fn = onCommitRef.current;
      if (fn && value.city.trim()) fn({ city: value.city, district: value.district, mahalle: value.mahalle });
    }, 420);
    return () => window.clearTimeout(t);
  }, [value.city, value.district, value.mahalle]);

  const schedulePredictions = useCallback(
    (raw: string) => {
      if (sugTimer.current) clearTimeout(sugTimer.current);
      const q = raw.trim();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      sugTimer.current = setTimeout(() => {
        const runId = ++sugRun.current;
        void (async () => {
          const rows = await fetchGooglePlacePredictions(mapsSettings ?? null, q);
          if (runId !== sugRun.current) return;
          setSuggestions(rows.map((r) => ({ placeId: r.place_id, label: r.description })));
        })();
      }, 220);
    },
    [mapsSettings],
  );

  async function applyPrediction(s: LineSug) {
    setSugOpen(false);
    setSuggestions([]);
    setGoogleLine(s.label);
    setBusy(true);
    try {
      const hit = await geocodePlaceIdClient(mapsSettings ?? null, s.placeId);
      if (!hit) {
        window.alert("Konum çözülemedi — başka bir öneri deneyin.");
        return;
      }
      const addr = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
      onChange({
        city: addr.city || value.city,
        district: addr.district || value.district,
        mahalle: value.mahalle,
      });
    } catch {
      window.alert("Konum çözülemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function fillFromTypedLine() {
    const q = googleLine.trim();
    if (!q) return;
    setBusy(true);
    try {
      const query = /türkiye|turkiye/i.test(q) ? q : `${q}, Türkiye`;
      const hit = await forwardGeocodeAddressHybrid(mapsSettings ?? null, query);
      if (!hit) {
        window.alert("Konum bulunamadı — farklı yazmayı deneyin.");
        return;
      }
      const addr = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
      setGoogleLine(addr.label || googleLine);
      onChange({
        city: addr.city || value.city,
        district: addr.district || value.district,
        mahalle: value.mahalle,
      });
    } catch {
      window.alert("Konum çözülemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function fillFromBrowserLocation() {
    setLocating(true);
    try {
      const loc = await requestPublicLocation(mapsSettings, { timeout: 12_000 });
      setGoogleLine(loc.label);
      onChange({
        city: loc.city || value.city,
        district: loc.district || value.district,
        mahalle: value.mahalle,
      });
    } catch {
      window.alert("Konum alınamadı — tarayıcı konum iznini kontrol edin.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white/95 p-3 text-gray-900">
      {helperText ? <p className="text-[11px] font-semibold text-gray-600">{helperText}</p> : null}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="Konumu yazın…"
            autoComplete="off"
            value={googleLine}
            onChange={(e) => {
              const v = e.target.value;
              setGoogleLine(v);
              setSugOpen(true);
              schedulePredictions(v);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setSugOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setSugOpen(false), 180);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void fillFromTypedLine();
              }
            }}
          />
          {sugOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-[10052] mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onMouseDown={() => void applyPrediction(s)}
                >
                  <span className="shrink-0 text-base" aria-hidden>
                    📍
                  </span>
                  <span className="text-gray-800">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={busy || locating}
            onClick={() => void fillFromTypedLine()}
            className={`text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap ${btnClass[variant]}`}
            style={{ color: "#fff" }}
          >
            {busy ? "Aranıyor..." : "Ara"}
          </button>
          <button
            type="button"
            disabled={locating || busy}
            onClick={() => void fillFromBrowserLocation()}
            className={`rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap disabled:opacity-50 ${secondaryClass[variant]}`}
            title="Cihaz konumunuz"
          >
            {locating ? "…" : "Konumum"}
          </button>
        </div>
      </div>
      {[value.district, value.city].filter(Boolean).length > 0 ? (
        <p className="text-xs font-semibold text-gray-600">
          Seçilen konum: {[value.district, value.city].filter(Boolean).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
