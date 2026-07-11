import { useState, useEffect, useRef } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { TrAddressFields, type TrAddressValue } from "@/components/TrAddressFields";
import { GooglePlaceOneLinePicker } from "@/components/GooglePlaceOneLinePicker";
import { GeofillAddressButton } from "./GeofillAddressButton";
import { apiRequest } from "@/lib/queryClient";

export function combineTrAddressLine(tr: TrAddressValue, streetLine: string): string {
  const head = [tr.mahalle, tr.district, tr.city].map((s) => String(s || "").trim()).filter(Boolean).join(", ");
  const tail = String(streetLine || "").trim();
  if (head && tail) return `${head} — ${tail}`;
  return head || tail;
}

function stripGpsNote(addr: string): string {
  const i = addr.indexOf(" (GPS");
  return (i >= 0 ? addr.slice(0, i) : addr).trim();
}

type SokRow = { kimlikNo: string; adi?: string; bilesen?: string };

type Props = {
  trValue: TrAddressValue;
  onTrChange: (v: TrAddressValue) => void;
  detail: string;
  onDetailChange: (s: string) => void;
  detailLabel: string;
  detailPlaceholder: string;
  /** GPS ile tam adres satırı + koordinat */
  onGeofill: (payload: { address: string; lat: number; lng: number }) => void;
};

/** Ulaşım formları: il–ilçe–mahalle + sokak satırı + Konumumdan doldur */
export function TransportAddressPicker({
  trValue,
  onTrChange,
  detail,
  onDetailChange,
  detailLabel,
  detailPlaceholder,
  onGeofill,
}: Props) {
  const { data: siteSettings } = useGetSiteSettings();
  const [skOpen, setSkOpen] = useState(false);
  const [skList, setSkList] = useState<SokRow[]>([]);
  const reqId = useRef(0);

  useEffect(() => {
    const c = trValue.city?.trim() || "";
    const d = trValue.district?.trim() || "";
    const m = trValue.mahalle?.trim() || "";
    const q = detail.trim();
    if (c.length < 2 || d.length < 2 || q.length < 2) {
      setSkList([]);
      return;
    }
    const t = window.setTimeout(() => {
      const id = ++reqId.current;
      const url =
        `/api/tr-address/street-suggest-context?city=${encodeURIComponent(c)}` +
        `&district=${encodeURIComponent(d)}&mahalle=${encodeURIComponent(m)}&q=${encodeURIComponent(q)}&limit=18`;
      apiRequest(url)
        .then((rows: SokRow[]) => {
          if (id !== reqId.current) return;
          setSkList(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (id === reqId.current) setSkList([]);
        });
    }, 240);
    return () => clearTimeout(t);
  }, [trValue.city, trValue.district, trValue.mahalle, detail]);

  const pickStreet = (r: SokRow) => {
    const line = (r.bilesen || r.adi || "").trim();
    if (line) onDetailChange(line);
    setSkOpen(false);
    setSkList([]);
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
      <GooglePlaceOneLinePicker
        mapsSettings={siteSettings ?? null}
        compact
        label="1) Google ile adres (önerilen)"
        onPick={(r) => {
          onTrChange({
            ...trValue,
            city: r.city || trValue.city,
            district: r.district || trValue.district,
            mahalle: trValue.mahalle,
          });
          onDetailChange(stripGpsNote(r.addressLine));
          /* GPS «Beni bul» hâlâ onGeofill ile; Google seçimi il/ilçe + detay satırını doldurur */
        }}
      />
      <p className="text-xs font-semibold text-gray-600">2) İl / ilçe / mahalle (yedek)</p>
      <TrAddressFields value={trValue} onChange={onTrChange} showSokak={false} />
      <div className="flex justify-end">
        <GeofillAddressButton
          onFilled={({ address, lat, lng }) => {
            onGeofill({ address: stripGpsNote(address), lat, lng });
          }}
        />
      </div>
      <div className="relative">
        <label className="text-xs text-gray-500 mb-1 block">{detailLabel}</label>
        <input
          value={detail}
          onChange={(e) => {
            onDetailChange(e.target.value);
            setSkOpen(true);
          }}
          onFocus={() => setSkOpen(true)}
          onBlur={() => window.setTimeout(() => setSkOpen(false), 200)}
          placeholder={detailPlaceholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
        />
        {skOpen && skList.length > 0 ? (
          <ul className="absolute z-40 mt-0.5 max-h-44 overflow-auto w-full rounded-xl border border-gray-200 bg-white shadow-lg text-sm">
            {skList.map((r) => (
              <li key={String(r.kimlikNo)}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickStreet(r)}
                >
                  {(r.bilesen || r.adi || "").trim() || "—"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
