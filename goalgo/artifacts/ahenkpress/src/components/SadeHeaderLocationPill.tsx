import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import { SadeLocationPickerModal } from "./SadeLocationPickerModal";

export function SadeHeaderLocationPill({
  fallbackLabel = "Adres / konum seç",
  staticLabel,
}: {
  fallbackLabel?: string;
  /** Sabit etiket — seçici kapalı (ör. haber: Türkiye) */
  staticLabel?: string;
}) {
  const { data: siteSettings } = useGetSiteSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stored, setStored] = useState<PublicLocationState | null>(() =>
    typeof window !== "undefined" ? readPublicLocation() : null,
  );

  useEffect(() => {
    const sync = () => setStored(readPublicLocation());
    sync();
    const onUpdated = (event: Event) => {
      setStored((event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation());
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, []);

  const displayLabel = staticLabel || formatPublicLocationLabel(stored, fallbackLabel);

  if (staticLabel) {
    return (
      <div className="hidden min-w-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-100 md:inline-flex">
        <MapPin className="h-4 w-4 text-[#0f766e]" />
        <span className="max-w-[52vw] truncate">{displayLabel}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="hidden min-w-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-left shadow-sm ring-1 ring-slate-100 transition hover:ring-[#0f766e]/40 hover:bg-emerald-50/60 md:inline-flex"
        title="Adres veya konum seç"
        aria-label={`Konum: ${displayLabel}. Değiştirmek için tıklayın.`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#0f766e]" />
        <span className="max-w-[52vw] truncate">{displayLabel}</span>
      </button>
      <SadeLocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mapsSettings={siteSettings ?? null}
        fallbackLabel={fallbackLabel}
      />
    </>
  );
}
