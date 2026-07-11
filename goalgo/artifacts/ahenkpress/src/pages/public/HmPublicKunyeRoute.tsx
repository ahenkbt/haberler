import { HmPublicStandardExtraPageRoute } from "@/components/HmPublicStandardExtraPageRoute";

/** `/tr/:slug/kunye` — slug'ı `kunye` olan özel sayfayı gösterir. */
export default function HmPublicKunyeRoute() {
  return <HmPublicStandardExtraPageRoute segment="kunye" label="Künye" />;
}
