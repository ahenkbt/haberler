import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  loadGoogleMapsScript,
  reverseGeocodeHybrid,
  effectiveMapsGeocodeSettings,
  describeGoogleMapsLoadFailure,
  type MapsGeocodeSettings,
} from "@/lib/mapsGeocode";

const TR_CENTER = { lat: 39.05, lng: 35.2 };

export type GoogleMapMiniPickResult = {
  lat: number;
  lng: number;
  city: string;
  district: string;
  label: string;
};

/**
 * Google Maps JavaScript API: küçük harita + sürüklenebilir pin + Places arama kutusu.
 * `mapsGeocode.ts` ile aynı script (Maps JavaScript API + `libraries=places`).
 */
export function GoogleMapMiniPicker({
  mapsSettings,
  onPick,
  heightClass = "h-[240px]",
  className = "",
  searchPlaceholder = "Haritada veya yazarak ara (Google Places)…",
  showGpsButton = true,
}: {
  mapsSettings: MapsGeocodeSettings | null | undefined;
  onPick: (r: GoogleMapMiniPickResult) => void | Promise<void>;
  heightClass?: string;
  className?: string;
  searchPlaceholder?: string;
  /** Tarayıcı konumu ile haritayı ortala + pin (HTTPS ve izin gerekir). */
  showGpsButton?: boolean;
}) {
  const eff = useMemo(() => effectiveMapsGeocodeSettings(mapsSettings), [mapsSettings]);
  const key = (eff.mapsGoogleBrowserKey ?? "").trim();
  const enabled = eff.mapsGoogleEnabled === true && !!key;
  const mapDiv = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<{ map: unknown; marker: unknown } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const runPick = useCallback(
    async (lat: number, lng: number) => {
      const addr = await reverseGeocodeHybrid(eff, lat, lng);
      await onPickRef.current({
        lat,
        lng,
        city: addr.city || "",
        district: addr.district || "",
        label: addr.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    },
    [eff],
  );

  useEffect(() => {
    const onAuthFail = () => {
        setHint(
          "Google anahtarı reddedildi (gm_authFailure). Cloud Console: faturalama, Maps JavaScript + Places API, HTTP referrer’da https://yekpare.net/* ve https://turknet.app/*.",
        );
    };
    window.addEventListener("yekpare-google-maps-auth-failure", onAuthFail);
    return () => window.removeEventListener("yekpare-google-maps-auth-failure", onAuthFail);
  }, []);

  useEffect(() => {
    if (!enabled || !mapDiv.current || !searchInput.current) return;
    let cancelled = false;
    const listeners: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let marker: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    setLoading(true);
    setHint(null);

    void (async () => {
      const loadRes = await loadGoogleMapsScript(key);
      if (cancelled) return;
      if (!loadRes.ok || !mapDiv.current || !searchInput.current) {
        const extra = !loadRes.ok ? describeGoogleMapsLoadFailure(loadRes.reason) : "";
        setHint(
          `Google Haritalar yüklenemedi. ${extra} Cloud Console: Maps JavaScript API, Places API, faturalama; referrer’da https://yekpare.net/* ve https://turknet.app/*.`,
        );
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gm = (window as any).google?.maps;
      if (!gm?.Map || !gm?.places?.Autocomplete) {
        setHint("Maps SDK hazır değil (Places kütüphanesi).");
        setLoading(false);
        return;
      }

      map = new gm.Map(mapDiv.current, {
        center: TR_CENTER,
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      marker = new gm.Marker({
        map,
        position: TR_CENTER,
        draggable: true,
      });
      mapInstanceRef.current = { map, marker };

      const ac = new gm.places.Autocomplete(searchInput.current, {
        fields: ["geometry", "formatted_address", "name"],
        componentRestrictions: { country: "tr" },
      });

      listeners.push(
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc || !map || !marker) return;
          const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
          map.setCenter({ lat, lng });
          map.setZoom(15);
          marker.setPosition({ lat, lng });
          void runPick(lat, lng);
        }),
      );

      listeners.push(
        map.addListener("click", (e: { latLng?: { lat: () => number; lng: () => number } | null }) => {
          if (!e.latLng || !marker) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          void runPick(lat, lng);
        }),
      );

      listeners.push(
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
          const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
          void runPick(lat, lng);
        }),
      );

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ev = (window as any).google?.maps?.event;
      if (ev) {
        for (const l of listeners) {
          try {
            ev.removeListener(l);
          } catch {
            /* ignore */
          }
        }
      }
      try {
        marker?.setMap(null);
      } catch {
        /* ignore */
      }
      marker = null;
      map = null;
      setLoading(false);
    };
  }, [enabled, key, runPick]);

  if (!enabled) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 ${className}`}>
        <strong>Google Harita kapalı veya tarayıcı anahtarı yok.</strong> Admin → Genel Ayarlar / Harita: Google’ı açıp{" "}
        <code className="mx-1 rounded bg-white/80 px-1">mapsGoogleBrowserKey</code> kaydedin veya derlemede{" "}
        <code className="mx-1 rounded bg-white/80 px-1">VITE_GOOGLE_MAPS_BROWSER_KEY</code> (HTTP referrer kısıtlı) tanımlayın.
      </div>
    );
  }

  const useCurrentLocation = () => {
    if (!showGpsButton || typeof navigator === "undefined" || !navigator.geolocation) {
      setHint("Bu tarayıcıda konum (GPS) desteklenmiyor.");
      return;
    }
    const inst = mapInstanceRef.current as {
      map?: { setCenter: (p: { lat: number; lng: number }) => void; setZoom: (z: number) => void };
      marker?: { setPosition: (p: { lat: number; lng: number }) => void };
    } | null;
    if (!inst?.map || !inst?.marker) return;
    setGpsBusy(true);
    setHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          inst.map!.setCenter({ lat, lng });
          inst.map!.setZoom(15);
          inst.marker!.setPosition({ lat, lng });
        } catch {
          /* ignore */
        }
        void runPick(lat, lng);
        setGpsBusy(false);
      },
      () => {
        setHint("Konum izni verilmedi veya alınamadı.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className={`rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden ${className}`}>
      <div className="p-2 border-b border-sky-100 bg-white/90">
        <input
          ref={searchInput}
          type="text"
          autoComplete="off"
          placeholder={searchPlaceholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          disabled={loading}
        />
      </div>
      <div className={`relative w-full ${heightClass}`}>
        <div ref={mapDiv} className="absolute inset-0 bg-gray-200" />
        {showGpsButton && enabled ? (
          <button
            type="button"
            disabled={loading || gpsBusy}
            onClick={() => useCurrentLocation()}
            className="absolute bottom-2 right-2 z-[2] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-sky-900 shadow-md border border-sky-200 hover:bg-sky-50 disabled:opacity-50"
          >
            {gpsBusy ? "…" : "Mevcut konum"}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-[11px] text-amber-800 px-2 py-1.5 bg-amber-50/90">{hint}</p> : null}
      <p className="text-[10px] text-gray-500 px-2 py-1">
        Haritaya tıklayın veya pini sürükleyin; üstteki kutuda yer adı arayın
        {showGpsButton ? "; sağ alttan mevcut konumu da kullanabilirsiniz." : "."}
      </p>
    </div>
  );
}
