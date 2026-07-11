import { useMemo } from "react";
import { useListAds } from "@workspace/api-client-react";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { resolveHmOrGlobalSlotHtml } from "@/lib/hmResolveAdSlotHtml";
import { rewriteHmSiteAnchorsInHtml } from "@/lib/rewriteNewsBodyLinksForHm";
import { rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export function HmAdSlotStrip({
  slotKey,
  siteId,
  slug,
  domain,
  layoutPrefs,
  className = "",
}: {
  slotKey: string;
  siteId: number | null;
  slug: string;
  domain?: string | null;
  layoutPrefs: NewsSiteLayoutPrefs;
  className?: string;
}) {
  const { data: adSlots = [] } = useListAds();
  const raw = useMemo(
    () => resolveHmOrGlobalSlotHtml(siteId, layoutPrefs, slotKey, adSlots),
    [siteId, layoutPrefs, slotKey, adSlots],
  );
  const html = useMemo(() => {
    let h = raw ?? "";
    if (h.trim() && siteId != null && slug) {
      h = rewriteHmSiteAnchorsInHtml(h, { slug, siteId, domain });
    }
    h = sanitizeHtml(rewriteInlineHtmlImgSrc(h));
    if (h.includes("<img") && !/loading\s*=/i.test(h)) {
      h = h.replace(/<img\b/gi, '<img loading="lazy" decoding="async"');
    }
    return h;
  }, [raw, siteId, slug, domain]);
  if (!html?.trim()) return null;
  return (
    <div
      className={className}
      data-hm-ad-slot={slotKey}
      style={{ contain: "layout style" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
