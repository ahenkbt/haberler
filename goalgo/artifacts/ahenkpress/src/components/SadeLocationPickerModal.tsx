import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { forwardGeocodeAddressHybrid, reverseGeocodeHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";
import { fetchGooglePlacePredictions, geocodePlaceIdClient } from "@/lib/mapsPlacePredictions";
import {
  formatPublicLocationLabel,
  readPublicLocation,
  requestPublicLocation,
  savePublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";

type LineSug = { placeId: string; label: string };

export function SadeLocationPickerModal({
  open,
  onClose,
  mapsSettings,
  fallbackLabel = "Adres / konum seç",
}: {
  open: boolean;
  onClose: () => void;
  mapsSettings: MapsGeocodeSettings | null | undefined;
  fallbackLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<LineSug[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRun = useRef(0);

  useEffect(() => {
    if (!open) return;
    const stored = readPublicLocation();
    setQuery(stored ? formatPublicLocationLabel(stored, "") : "");
    setSuggestions([]);
    setSugOpen(false);
  }, [open]);

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

  async function persistFromCoords(lat: number, lng: number, labelHint?: string): Promise<PublicLocationState> {
    let label = labelHint?.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    let city = "";
    let district = "";
    try {
      const addr = await reverseGeocodeHybrid(mapsSettings, lat, lng);
      label = addr.label || label;
      city = addr.city || "";
      district = addr.district || "";
    } catch {
      /* coordinates still useful */
    }
    const next: PublicLocationState = { lat, lng, label, city, district, updatedAt: Date.now() };
    savePublicLocation(next);
    return next;
  }

  async function applyPrediction(s: LineSug) {
    setSugOpen(false);
    setSuggestions([]);
    setQuery(s.label);
    setBusy(true);
    try {
      const hit = await geocodePlaceIdClient(mapsSettings ?? null, s.placeId);
      if (!hit) {
        window.alert("Konum çözülemedi — başka bir öneri deneyin.");
        return;
      }
      const saved = await persistFromCoords(hit.lat, hit.lng, s.label);
      setQuery(formatPublicLocationLabel(saved, fallbackLabel));
      onClose();
    } catch {
      window.alert("Konum çözülemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTypedQuery() {
    const q = query.trim();
    if (!q) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      const searchQ = /türkiye|turkiye/i.test(q) ? q : `${q}, Türkiye`;
      const hit = await forwardGeocodeAddressHybrid(mapsSettings ?? null, searchQ);
      if (!hit) {
        window.alert("Konum bulunamadı — farklı yazmayı deneyin.");
        return;
      }
      const saved = await persistFromCoords(hit.lat, hit.lng, q);
      setQuery(formatPublicLocationLabel(saved, fallbackLabel));
      onClose();
    } catch {
      window.alert("Konum kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const loc = await requestPublicLocation(mapsSettings, { timeout: 12_000 });
      setQuery(formatPublicLocationLabel(loc, fallbackLabel));
      onClose();
    } catch {
      window.alert("Konum alınamadı — tarayıcı konum iznini kontrol edin.");
    } finally {
      setLocating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sade-location-picker-title">
      <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" aria-label="Kapat" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#f7fbf8] px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#0f766e]" />
            <h2 id="sade-location-picker-title" className="text-sm font-black text-slate-900">Adres / konum seç</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs font-semibold text-slate-500">Teslimat ve yakın işletme önerileri için konumunuzu belirleyin.</p>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-[#0f766e]/20 focus:border-[#0f766e] focus:ring-2"
              placeholder="Mahalle, ilçe veya adres yazın…"
              autoComplete="off"
              value={query}
              disabled={busy || locating}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                setSugOpen(true);
                schedulePredictions(v);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setSugOpen(true);
              }}
              onBlur={() => setTimeout(() => setSugOpen(false), 180)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveTypedQuery();
                }
              }}
            />
            {sugOpen && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50"
                    onMouseDown={() => void applyPrediction(s)}
                  >
                    <span className="shrink-0" aria-hidden>📍</span>
                    <span className="text-slate-800">{s.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={locating || busy}
            onClick={() => void useCurrentLocation()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-[#0f766e] hover:bg-emerald-100 disabled:opacity-50"
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? "Konum alınıyor…" : "Konumumu kullan"}
          </button>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={busy || locating}
              onClick={() => void saveTypedQuery()}
              className="flex-1 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-black text-white hover:bg-[#0b5f59] disabled:opacity-50"
              style={{ color: "#fff" }}
            >
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
