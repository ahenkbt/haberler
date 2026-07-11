import { GooglePlaceOneLinePicker } from "@/components/GooglePlaceOneLinePicker";
import { TrAddressFields, type TrAddressValue } from "@/components/TrAddressFields";
import type { MapsGeocodeSettings } from "@/lib/mapsGeocode";

type Props = {
  mapsSettings: MapsGeocodeSettings | null | undefined;
  value: TrAddressValue;
  onChange: (v: TrAddressValue) => void;
  showSokak?: boolean;
  showMahalle?: boolean;
  variant?: "light" | "dark";
  className?: string;
  /** Harita sağlayıcısından seçilen tam konum (koordinat, tam adres satırı) */
  onGooglePick?: (r: {
    lat: number;
    lng: number;
    addressLine: string;
    city: string;
    district: string;
    label: string;
  }) => void;
  compactGoogle?: boolean;
  googleLabel?: string;
};

/**
 * Konum girişi: önce harita araması, yedek olarak TR il / ilçe / mahalle.
 */
export function LocationPickerGooglePrimary({
  mapsSettings,
  value,
  onChange,
  showSokak = false,
  showMahalle = true,
  variant = "light",
  className,
  onGooglePick,
  compactGoogle,
  googleLabel,
}: Props) {
  return (
    <div className={className}>
      <GooglePlaceOneLinePicker
        mapsSettings={mapsSettings}
        compact={compactGoogle}
        label={googleLabel ?? "1) Konum araması"}
        onPick={(r) => {
          onChange({
            ...value,
            city: r.city || value.city,
            district: r.district || value.district,
            mahalle: value.mahalle,
          });
          onGooglePick?.(r);
        }}
      />
      <p className="text-[11px] text-gray-500 mt-2 mb-1">2) İl / ilçe / mahalle seçimi (yedek)</p>
      <TrAddressFields
        value={value}
        onChange={onChange}
        showSokak={showSokak}
        showMahalle={showMahalle}
        variant={variant}
      />
    </div>
  );
}
