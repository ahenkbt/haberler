import HmVideoTvPage from "@/pages/public/HmVideoTvPage";

/**
 * `/tr/:slug/video-tv` ve KH `/video` —
 * iframe yerine `/api/video` ile native Video TV vitrini.
 */
export default function HmPublicVideoTvRoute() {
  return <HmVideoTvPage />;
}
