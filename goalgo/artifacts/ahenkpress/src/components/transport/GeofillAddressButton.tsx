import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { reverseGeocodeHybrid } from "@/lib/mapsGeocode";

type Props = {
  onFilled: (payload: { address: string; lat: number; lng: number }) => void;
  className?: string;
};

/** GPS + (isteğe bağlı) Google/OSM ters geocoding ile adres satırı doldurur */
export function GeofillAddressButton({ onFilled, className }: Props) {
  const { data: siteSettings } = useGetSiteSettings();
  const [busy, setBusy] = useState(false);

  function click() {
    if (!navigator.geolocation) {
      window.alert("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const { label } = await reverseGeocodeHybrid(siteSettings, lat, lng);
          const acc = pos.coords.accuracy;
          let accNote = "";
          if (typeof acc === "number" && acc > 2000) {
            accNote = " (GPS doğruluğu düşük — adresi kontrol edin)";
          } else if (typeof acc === "number" && acc > 120) {
            accNote = ` (GPS ±${Math.min(2000, Math.round(acc))} m — gerekirse sokağı elle düzeltin)`;
          }
          const address = `${label.trim()}${accNote}` || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          onFilled({ address, lat, lng });
        } catch {
          window.alert("Adres çözümlenemedi; alış adresini elle yazabilirsiniz.");
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        window.alert("Konum izni gerekli veya cihaz konumu alınamadı.");
      },
      { enableHighAccuracy: true, timeout: 22_000, maximumAge: 0 },
    );
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 disabled:opacity-60"
      }
    >
      <LocateFixed className="w-3.5 h-3.5 shrink-0" />
      {busy ? "Konum alınıyor…" : "Konumumdan doldur"}
    </button>
  );
}

export function mapsDirectionsHref(from: string, to: string): string | null {
  const a = from.trim();
  const b = to.trim();
  if (!a || !b) return null;
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("origin", a);
  u.searchParams.set("destination", b);
  u.searchParams.set("travelmode", "driving");
  return u.toString();
}
