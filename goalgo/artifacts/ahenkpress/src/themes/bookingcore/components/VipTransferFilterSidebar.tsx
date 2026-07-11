import { SlidersHorizontal } from "lucide-react";

export type VipTransferFilterState = {
  transferTypes: string[];
  segments: string[];
  passengers: string;
  luggage: string;
  meetGreet: boolean;
  babySeat: boolean;
};

export const DEFAULT_VIP_TRANSFER_FILTERS: VipTransferFilterState = {
  transferTypes: [],
  segments: [],
  passengers: "",
  luggage: "",
  meetGreet: false,
  babySeat: false,
};

export const VIP_TRANSFER_TYPE_OPTIONS = [
  { value: "oneway", label: "Tek yön" },
  { value: "roundtrip", label: "Gidiş-dönüş" },
  { value: "hourly", label: "Saatlik" },
  { value: "airport", label: "Havalimanı transferi" },
] as const;

export const VIP_SEGMENT_OPTIONS = [
  "Premium Sedan",
  "VIP Vito",
  "Sprinter",
  "Lüks SUV",
] as const;

type Props = {
  draft: VipTransferFilterState;
  applied: VipTransferFilterState;
  onDraftChange: (next: Partial<VipTransferFilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function VipTransferFilterSidebar({
  draft,
  applied,
  onDraftChange,
  onApply,
  onReset,
  mobileOpen,
  onMobileClose,
}: Props) {
  function toggleTransferType(value: string) {
    const next = draft.transferTypes.includes(value)
      ? draft.transferTypes.filter((t) => t !== value)
      : [...draft.transferTypes, value];
    onDraftChange({ transferTypes: next });
  }

  function toggleSegment(seg: string) {
    const next = draft.segments.includes(seg)
      ? draft.segments.filter((s) => s !== seg)
      : [...draft.segments, seg];
    onDraftChange({ segments: next });
  }

  const hasActive =
    applied.transferTypes.length > 0 ||
    applied.segments.length > 0 ||
    applied.passengers !== "" ||
    applied.luggage !== "" ||
    applied.meetGreet ||
    applied.babySeat;

  const panel = (
    <aside className="bc-filter-sidebar">
      <div className="bc-filter-sidebar__head">
        <h3>
          <SlidersHorizontal className="w-4 h-4" />
          Filtrele
        </h3>
        {onMobileClose ? (
          <button type="button" className="bc-filter-sidebar__close" onClick={onMobileClose}>
            Kapat
          </button>
        ) : null}
      </div>

      <div className="bc-filter-group">
        <span className="bc-filter-group__label">Transfer türü</span>
        <div className="bc-filter-checks">
          {VIP_TRANSFER_TYPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="bc-filter-check">
              <input
                type="checkbox"
                checked={draft.transferTypes.includes(opt.value)}
                onChange={() => toggleTransferType(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="bc-filter-group">
        <span className="bc-filter-group__label">Araç segmenti</span>
        <div className="bc-filter-checks">
          {VIP_SEGMENT_OPTIONS.map((seg) => (
            <label key={seg} className="bc-filter-check">
              <input type="checkbox" checked={draft.segments.includes(seg)} onChange={() => toggleSegment(seg)} />
              {seg}
            </label>
          ))}
        </div>
      </div>

      <div className="bc-filter-group">
        <label className="bc-filter-group__label" htmlFor="vip-filter-pax">
          Kişi sayısı (min.)
        </label>
        <select
          id="vip-filter-pax"
          className="bc-filter-select"
          value={draft.passengers}
          onChange={(e) => onDraftChange({ passengers: e.target.value })}
        >
          <option value="">Fark etmez</option>
          {[1, 2, 3, 4, 6, 8, 10, 14].map((n) => (
            <option key={n} value={String(n)}>
              {n}+ kişi
            </option>
          ))}
        </select>
      </div>

      <div className="bc-filter-group">
        <label className="bc-filter-group__label" htmlFor="vip-filter-bags">
          Bagaj kapasitesi (min.)
        </label>
        <select
          id="vip-filter-bags"
          className="bc-filter-select"
          value={draft.luggage}
          onChange={(e) => onDraftChange({ luggage: e.target.value })}
        >
          <option value="">Fark etmez</option>
          {[0, 1, 2, 3, 4, 6, 8].map((n) => (
            <option key={n} value={String(n)}>
              {n}+ bagaj
            </option>
          ))}
        </select>
      </div>

      <div className="bc-filter-group">
        <span className="bc-filter-group__label">Ekstralar</span>
        <div className="bc-filter-checks">
          <label className="bc-filter-check">
            <input
              type="checkbox"
              checked={draft.meetGreet}
              onChange={(e) => onDraftChange({ meetGreet: e.target.checked })}
            />
            Meet &amp; greet
          </label>
          <label className="bc-filter-check">
            <input
              type="checkbox"
              checked={draft.babySeat}
              onChange={(e) => onDraftChange({ babySeat: e.target.checked })}
            />
            Bebek koltuğu
          </label>
        </div>
      </div>

      <div className="bc-filter-actions">
        <button type="button" className="bc-search-btn bc-filter-actions__apply" onClick={onApply}>
          Uygula
        </button>
        <button type="button" className="bc-filter-actions__reset" onClick={onReset} disabled={!hasActive}>
          Sıfırla
        </button>
      </div>
    </aside>
  );

  if (mobileOpen != null) {
    return (
      <>
        <div className={`bc-filter-drawer${mobileOpen ? " is-open" : ""}`}>{panel}</div>
        {mobileOpen ? (
          <button
            type="button"
            className="bc-filter-backdrop"
            aria-label="Filtreleri kapat"
            onClick={onMobileClose}
          />
        ) : null}
      </>
    );
  }

  return panel;
}
