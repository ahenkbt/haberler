import { useEffect } from "react";
import { KesfetDiscoverHubSection } from "@/components/KesfetDiscoverHubSection";
import {
  KESFET_HUB_META_DESCRIPTION,
  KESFET_HUB_PAGE_TITLE,
  KESFET_HUB_PATH,
} from "@/lib/kesfetDiscoverHub";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";

export default function KesfetDiscoverHub() {
  useEffect(() => {
    applySocialShareMeta({
      title: KESFET_HUB_PAGE_TITLE,
      descriptionPrimary: KESFET_HUB_META_DESCRIPTION,
      canonicalPath: KESFET_HUB_PATH,
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#f7fbf8] via-white to-white" data-page="kesfet-discover-hub">
      <KesfetDiscoverHubSection variant="page" />
    </div>
  );
}
