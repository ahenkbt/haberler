import Iletisim from "@/pages/public/Iletisim";
import { HmPublicStandardExtraPageRoute } from "@/components/HmPublicStandardExtraPageRoute";

/** `/tr/:slug/reklam` */
export function HmPublicReklamRoute() {
  return <HmPublicStandardExtraPageRoute segment="reklam" label="Reklam" />;
}

/** `/tr/:slug/abonelik` */
export function HmPublicAbonelikRoute() {
  return <HmPublicStandardExtraPageRoute segment="abonelik" label="Abonelik" />;
}

/** `/tr/:slug/telif-kullanim` — editör sitelerinde platform varsayılan telif sayfası gösterilmez. */
export function HmPublicTelifKullanimRoute() {
  return <HmPublicStandardExtraPageRoute segment="telif-kullanim" label="Telif & Kullanım" />;
}

/** `/tr/:slug/iletisim` — özel sayfa yoksa iletişim formu. */
export function HmPublicIletisimRoute() {
  return <HmPublicStandardExtraPageRoute segment="iletisim" label="İletişim" fallback={<Iletisim />} />;
}
