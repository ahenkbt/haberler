import { useMemo, useRef } from "react";
import { useHmCustomPageEnhancements } from "@/lib/hmCustomPageEnhancements";
import { prepareHmCustomPageBodyHtml } from "@/lib/prepareHmCustomPageBodyHtml";
import "@/styles/hmVkdCorporatePages.css";

/** Editör «Görünüm» sekmesi — vitrindeki kurumsal özel sayfa ile aynı HTML işleme. */
export function EditorHmHtmlPreview({
  html,
  corporate,
  site,
}: {
  html: string;
  corporate: boolean;
  site: { id: number; slug: string; domain?: string | null };
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const prepared = useMemo(
    () =>
      prepareHmCustomPageBodyHtml(html, {
        corporate,
        importSource: null,
        site: { slug: site.slug, siteId: site.id, domain: site.domain ?? null },
      }),
    [html, corporate, site.domain, site.id, site.slug],
  );

  useHmCustomPageEnhancements(bodyRef, site, "preview", "Önizleme", prepared);

  const shellClass = corporate
    ? "hm-custom-page-body hm-custom-page-body--corporate max-w-none overflow-x-hidden bg-[var(--hm-page-bg,#ffffff)]"
    : "prose prose-sm max-w-none";

  return (
    <div
      ref={bodyRef}
      className={`rounded-lg border border-slate-200 p-4 min-h-[220px] overflow-auto ${shellClass}`}
      data-hm-page-slug="preview"
      dangerouslySetInnerHTML={{
        __html: prepared.trim() || "<p class='text-slate-400'>Önizleme için HTML girin.</p>",
      }}
    />
  );
}
