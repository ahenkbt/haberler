import { useParams } from "wouter";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { YazarPanelNav } from "@/components/YazarPanelNav";
import { HaberlerInner } from "@/pages/admin/HaberlerInner";

export default function YazarHaberler() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const enc = encodeURIComponent(slug);
  const base = `/${HM_SITE_PUBLIC_PREFIX}/${enc}/yazar`;

  return (
    <div className="mx-auto max-w-screen-lg px-3 py-6">
      <YazarPanelNav slug={slug} />
      <HaberlerInner
        newsEditorBase={`${base}/haber`}
        categoriesHref={null}
        showBulkDelete={false}
        hmAuthorApi
        newsPreviewHrefPrefix={`/${HM_SITE_PUBLIC_PREFIX}/${enc}/haber`}
      />
    </div>
  );
}
