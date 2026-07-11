import { X } from "lucide-react";

type MapPanelCloseButtonProps = {
  onClick: () => void;
  variant?: "light" | "dark";
  className?: string;
  label?: string;
};

/** Sol harita panelleri — görünür X kapatma düğmesi (mobil 44px dokunma hedefi). */
export function MapPanelCloseButton({
  onClick,
  variant = "light",
  className = "",
  label = "Kapat",
}: MapPanelCloseButtonProps) {
  return (
    <button
      type="button"
      className={`haritalar-map-panel-close${
        variant === "dark" ? " haritalar-map-panel-close--on-dark" : ""
      }${className ? ` ${className}` : ""}`}
      aria-label={label}
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
    >
      <X className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
    </button>
  );
}
