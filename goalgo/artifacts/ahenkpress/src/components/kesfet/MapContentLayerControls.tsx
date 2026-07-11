import { Menu } from "lucide-react";
import {
  MAP_CONTENT_LAYER_LABELS,
  type MapContentLayerKey,
  type MapContentLayers,
} from "@/lib/mapContentLayers";

const CONTENT_LAYER_ORDER: MapContentLayerKey[] = ["news", "video", "bilgiAgaci"];

type MapContentLayerControlsProps = {
  mapContentLayers: MapContentLayers;
  onToggle: (key: MapContentLayerKey) => void;
  compact?: boolean;
};

export function MapContentLayerControls({
  mapContentLayers,
  onToggle,
  compact = false,
}: MapContentLayerControlsProps) {
  return (
    <div className={`${compact ? "mb-2" : "mb-3"} rounded-xl border border-emerald-200/70 bg-emerald-50/80 p-2.5`}>
      <p className="font-bold mb-1.5 text-emerald-900">İçerik Katmanları</p>
      <div className={`${compact ? "space-y-1" : "grid grid-cols-1 gap-y-1"}`}>
        {CONTENT_LAYER_ORDER.map((key) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mapContentLayers[key]} onChange={() => onToggle(key)} />
            <span>{MAP_CONTENT_LAYER_LABELS[key]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

type MapContentLayerQuickPanelProps = {
  visible: boolean;
  mapContentLayers: MapContentLayers;
  onToggle: (key: MapContentLayerKey) => void;
};

export function MapContentLayerQuickPanel({
  visible,
  mapContentLayers,
  onToggle,
}: MapContentLayerQuickPanelProps) {
  if (!visible) return null;
  return (
    <section>
      <p className="haritalar-layers-section-title">İçerik katmanları</p>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3 space-y-2">
        {CONTENT_LAYER_ORDER.map((key) => (
          <label key={key} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700">
            <span>{MAP_CONTENT_LAYER_LABELS[key]}</span>
            <input type="checkbox" checked={mapContentLayers[key]} onChange={() => onToggle(key)} />
          </label>
        ))}
      </div>
    </section>
  );
}

type MobileMapMenuTriggerProps = {
  visible: boolean;
  onOpen: () => void;
};

export function MobileMapMenuTrigger({ visible, onOpen }: MobileMapMenuTriggerProps) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="haritalar-map-mobile-menu-trigger pointer-events-auto"
      aria-label="Menüyü aç"
      onClick={onOpen}
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
