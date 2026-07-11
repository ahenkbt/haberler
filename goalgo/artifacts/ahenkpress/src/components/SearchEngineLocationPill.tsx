import { useEffect, useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import { SadeLocationPickerModal } from "./SadeLocationPickerModal";

export const MODULE_SUBNAV_HEADER_INLINE_CLASS = "module-subnav--header-inline";

type LocationPillButtonProps = {
  onOpen: () => void;
  displayLabel: string;
};

function LocationPillButton({ onOpen, displayLabel }: LocationPillButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="seh-location-pill"
      title="Adres veya konum seç"
      aria-label={`Konum: ${displayLabel}. Değiştirmek için tıklayın.`}
    >
      <MapPin className="seh-location-pin h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="seh-location-pill-label">{displayLabel}</span>
    </button>
  );
}

function usePublicLocationLabel(fallbackLabel = "Adres / konum seç") {
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

  const displayLabel = formatPublicLocationLabel(stored, fallbackLabel);

  return { siteSettings, pickerOpen, setPickerOpen, displayLabel, fallbackLabel };
}

/** Modül alt menüsü satırı (konum pill ayrı satırda — SearchEngineLocationPill). */
export function SearchEngineLocationSubNavRow({
  align = "start",
  subNav,
  showLocationPill = true,
  fallbackLabel = "Adres / konum seç",
}: {
  align?: "center" | "start";
  subNav?: ReactNode;
  showLocationPill?: boolean;
  fallbackLabel?: string;
}) {
  const { siteSettings, pickerOpen, setPickerOpen, displayLabel } = usePublicLocationLabel(fallbackLabel);

  if (!showLocationPill && !subNav) return null;

  return (
    <>
      <div
        className={`seh-location-subnav-row${
          align === "start" ? " seh-location-subnav-row--start" : " seh-location-subnav-row--center"
        }`}
      >
        {showLocationPill ? (
          <LocationPillButton onOpen={() => setPickerOpen(true)} displayLabel={displayLabel} />
        ) : null}
        {subNav ? <div className="seh-location-subnav-chips">{subNav}</div> : null}
      </div>
      {showLocationPill ? (
        <SadeLocationPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          mapsSettings={siteSettings ?? null}
          fallbackLabel={fallbackLabel}
        />
      ) : null}
    </>
  );
}

/** Google-style konum pill — tek başına (legacy satır). */
export function SearchEngineLocationPill({
  fallbackLabel = "Adres / konum seç",
  align = "center",
}: {
  fallbackLabel?: string;
  align?: "center" | "start";
}) {
  const { siteSettings, pickerOpen, setPickerOpen, displayLabel } = usePublicLocationLabel(fallbackLabel);

  return (
    <>
      <div className={`seh-location-row${align === "start" ? " seh-location-row--start" : ""}`}>
        <LocationPillButton onOpen={() => setPickerOpen(true)} displayLabel={displayLabel} />
      </div>
      <SadeLocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mapsSettings={siteSettings ?? null}
        fallbackLabel={fallbackLabel}
      />
    </>
  );
}
