import { useParams } from "wouter";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { readHmAuthorPayload } from "@/lib/hmAuthorSession";
import { hmPublicSiteBase } from "@/lib/hmPublicSiteUrl";
import { YazarPanelNav } from "@/components/YazarPanelNav";
import { HaberlerInner } from "@/pages/admin/HaberlerInner";

export default function YazarHaberler() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const enc = encodeURIComponent(slug);
  const base = `/${HM_SITE_PUBLIC_PREFIX}/${enc}/yazar`;
  const authorSite = readHmAuthorPayload()?.site ?? null;
  const publicSite = authorSite?.slug === slug ? authorSite : { slug };
  const previewPrefix = slug ? `${hmPublicSiteBase(publicSite)}/haber` : null;

  return (
    <div className="mx-auto max-w-screen-lg px-3 py-6">
      <YazarPanelNav slug={slug} />
      <HaberlerInner
        newsEditorBase={`${base}/haber`}
        categoriesHref={null}
        showBulkDelete={false}
        hmAuthorApi
        newsPreviewHrefPrefix={previewPrefix}
      />
    </div>
  );
}
