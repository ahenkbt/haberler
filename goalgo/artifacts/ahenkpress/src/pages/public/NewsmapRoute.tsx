import { SearchEnginePublicChrome } from "@/components/SearchEnginePublicChrome";
import Kesfet from "./Kesfet";

/** Yekpare haber haritası — `/newsmap` tam sayfa (mobil + masaüstü, `/map`'e yönlendirme yok). */
export default function NewsmapRoute() {
  return (
    <SearchEnginePublicChrome
      fullBleed
      mapEmbed
      searchPlaceholder="Harita, haber veya adres ara"
    >
      <Kesfet layout="desktop-chrome" />
    </SearchEnginePublicChrome>
  );
}
