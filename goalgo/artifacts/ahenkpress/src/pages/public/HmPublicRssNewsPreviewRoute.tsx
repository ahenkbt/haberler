import { HmNestedLayout } from "@/components/HmNestedLayout";
import { PortalRssNewsPreviewPage } from "@/pages/public/PortalRssNewsPreviewPage";

/** `/tr/:slug/haberler/rss/:itemId` — HM vitrininde RSS haber önizlemesi. */
export default function HmPublicRssNewsPreviewRoute() {
  return (
    <HmNestedLayout>
      <PortalRssNewsPreviewPage />
    </HmNestedLayout>
  );
}
