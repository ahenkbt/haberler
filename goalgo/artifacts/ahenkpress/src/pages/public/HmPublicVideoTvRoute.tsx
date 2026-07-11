import { HmYektubePortalEmbed } from "@/components/YektubeV2Gateway";

/** `/tr/:slug/video-tv` — yekpare.net/yp ile aynı Yektube arayüzü (haber kromu dışarıda). */
export default function HmPublicVideoTvRoute() {
  return <HmYektubePortalEmbed />;
}
