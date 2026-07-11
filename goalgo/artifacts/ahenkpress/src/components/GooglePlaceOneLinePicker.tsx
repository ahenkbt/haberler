import { useState, useRef, useCallback } from "react";
import { reverseGeocodeHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";
import { fetchGooglePlacePredictionsDetailed, geocodePlaceIdClient } from "@/lib/mapsPlacePredictions";

type LineSug = { placeId: string; label: string };
const API = "/api";

async function readJsonResponse<T>(res: Response, fallback: T): Promise<{ ok: boolean; data: T }> {
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text().catch(() => "");
  if (!raw.trim()) return { ok: false, data: fallback };
  if (!contentType.toLowerCase().includes("json") && !/^\s*[\[{]/.test(raw)) return { ok: false, data: fallback };
  try {
    return { ok: res.ok, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, data: fallback };
  }
}

function placesStatusHint(status: string): string | null {
  const s = status.toUpperCase();
  if (s === "OK" || s === "ZERO_RESULTS") return null;
  if (s.includes("OVER_QUERY_LIMIT") || s.includes("OVER_DAILY")) return "Öneriler şu anda yoğun; biraz sonra tekrar deneyin.";
  return "Öneriler şu anda kullanılamıyor.";
}

async function fetchServerPlacePredictionsDetailed(input: string): Promise<{
  predictions: LineSug[];
  configured: boolean;
  error?: string;
}> {
  const q = input.trim();
  if (q.length < 2) return { predictions: [], configured: true };
  try {
    const r = await fetch(`${API}/map/places/autocomplete?input=${encodeURIComponent(q)}`);
    const parsed = await readJsonResponse<{ success?: boolean; configured?: boolean; data?: unknown[]; error?: string }>(r, {
      success: false,
      configured: true,
      data: [],
      error: "Öneriler şu anda kullanılamıyor.",
    });
    const d = parsed.data;
    return {
      predictions: Array.isArray(d?.data)
        ? d.data
          .map((row: { placeId?: string; label?: string }) => ({
            placeId: String(row.placeId ?? "").trim(),
            label: String(row.label ?? "").trim(),
          }))
          .filter((row: LineSug) => row.placeId && row.label)
        : [],
      configured: d?.configured !== false,
      error: !parsed.ok || d?.success === false ? String(d?.error ?? "Öneriler şu anda kullanılamıyor.") : undefined,
    };
  } catch {
    return { predictions: [], configured: true, error: "Öneriler şu anda kullanılamıyor." };
  }
}

async function geocodePlaceIdServer(placeId: string): Promise<{ lat: number; lng: number; formatted_address?: string } | null> {
  const id = placeId.trim();
  if (!id) return null;
  try {
    const r = await fetch(`${API}/map/places/details?placeId=${encodeURIComponent(id)}`);
    const parsed = await readJsonResponse<{ success?: boolean; data?: Record<string, unknown> | null }>(r, { success: false, data: null });
    const d = parsed.data;
    const row = d?.data;
    if (!parsed.ok || !d?.success || !row) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, formatted_address: String(row.formattedAddress ?? "") };
  } catch {
    return null;
  }
}

/**
 * Tek satır yazı → Places önerileri; seçimde place_id → koordinat + adres satırı + il/ilçe.
 */
export function GooglePlaceOneLinePicker({
  mapsSettings,
  onPick,
  placeholder = "İşletme, yer veya adres yazın…",
  label = "Konum seç",
  compact,
}: {
  mapsSettings: MapsGeocodeSettings | null | undefined;
  onPick: (r: {
    lat: number;
    lng: number;
    addressLine: string;
    city: string;
    district: string;
    label: string;
  }) => void | Promise<void>;
  placeholder?: string;
  label?: string;
  compact?: boolean;
}) {
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<LineSug[]>([]);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runId = useRef(0);

  const schedule = useCallback(
    (raw: string) => {
      if (timer.current) clearTimeout(timer.current);
      const q = raw.trim();
      setHint(null);
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      timer.current = setTimeout(() => {
        const id = ++runId.current;
        void (async () => {
          const server = await fetchServerPlacePredictionsDetailed(q);
          if (id !== runId.current) return;
          if (server.predictions.length > 0 || server.configured === false || server.error) {
            setSuggestions(server.predictions);
            if (server.configured === false) {
              setHint("Öneriler şu anda hazır değil.");
            } else if (server.error) {
              setHint("Öneriler şu anda kullanılamıyor.");
            } else if (q.length >= 3 && server.predictions.length === 0) {
              setHint("Sonuç bulunamadı. Farklı bir ad veya adres deneyin.");
            }
            return;
          }
          const { predictions, status, configOk } = await fetchGooglePlacePredictionsDetailed(mapsSettings ?? null, q);
          if (id !== runId.current) return;
          setSuggestions(predictions.map((p) => ({ placeId: p.place_id, label: p.description })));
          if (!configOk) {
            setHint("Öneriler şu anda hazır değil.");
          } else if (predictions.length === 0) {
            const h = placesStatusHint(status);
            if (h) setHint(h);
            else if (q.length >= 3) setHint("Sonuç bulunamadı. Farklı bir ad veya adres deneyin.");
          }
        })();
      }, 220);
    },
    [mapsSettings],
  );

  async function apply(s: LineSug) {
    setOpen(false);
    setSuggestions([]);
    setBusy(true);
    setHint(null);
    try {
      const hit = await geocodePlaceIdServer(s.placeId) || await geocodePlaceIdClient(mapsSettings ?? null, s.placeId);
      if (!hit) {
        setHint("Seçilen yer çözülemedi; başka bir öneri deneyin.");
        return;
      }
      const rev = await reverseGeocodeHybrid(mapsSettings, hit.lat, hit.lng);
      const addressLine = (hit.formatted_address || rev.label || s.label).trim();
      await onPick({
        lat: hit.lat,
        lng: hit.lng,
        addressLine,
        city: rev.city || "",
        district: rev.district || "",
        label: s.label,
      });
      setLine(s.label);
    } catch {
      setHint("Konum çözülemedi.");
    } finally {
      setBusy(false);
    }
  }

  const enabled = true;

  return (
    <div className={compact ? "space-y-1.5" : "rounded-lg border border-sky-200 bg-sky-50/40 p-3 space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-sky-950">{label}</span>
      </div>
      <div className="relative">
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white disabled:opacity-60"
          disabled={!enabled || busy}
          placeholder={placeholder}
          autoComplete="off"
          value={line}
          onChange={(e) => {
            const v = e.target.value;
            setLine(v);
            setOpen(true);
            schedule(v);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 180);
          }}
        />
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-[10052] mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-sky-50"
                onMouseDown={() => void apply(s)}
              >
                <span className="text-gray-800">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {busy ? <p className="text-[11px] text-gray-600">Konum alınıyor…</p> : null}
      {hint ? <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{hint}</p> : null}
    </div>
  );
}
