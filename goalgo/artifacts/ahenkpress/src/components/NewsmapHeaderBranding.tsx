import "@/styles/newsmapHeaderBranding.css";

export type NewsmapHeaderBrandingVariant = "light" | "dark";

export type NewsmapHeaderBrandingProps = {
  className?: string;
  /** `dark` = açık metin (koyu header bandı); `light` = koyu metin (açık header). */
  variant?: NewsmapHeaderBrandingVariant;
};

/** Haber haritası sayfalarında site logosunun solunda gösterilen marka bloğu. */
export function NewsmapHeaderBranding({
  className = "",
  variant = "light",
}: NewsmapHeaderBrandingProps) {
  return (
    <div
      className={`newsmap-header-branding newsmap-header-branding--${variant}${className ? ` ${className}` : ""}`}
      aria-label="Haber haritası"
    >
      <span className="newsmap-header-branding__title">haber haritası</span>
      <p className="newsmap-header-branding__subtitle">Konum Bazlı Video ve Haber Servisi</p>
    </div>
  );
}
