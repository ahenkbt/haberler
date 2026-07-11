import { EditorLayout } from "@/components/EditorLayout";
import { HaberlerInner } from "@/pages/admin/HaberlerInner";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

/**
 * AHB içe aktarılan köşe metinleri (`hm_makaleler`). `news` tablosundaki “blog” kategorili
 * haberlerden ayrıdır; vitrinde blog bölümü yalnızca `news` blog kayıtlarını gösterir, köşe yazıları burada listelenmez.
 */
export default function EditorMakaleler() {
  const { site } = useHmEditor();
  const newsPreviewHrefPrefix = site?.slug
    ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/haber`
    : null;
  return (
    <EditorLayout title="Köşe makaleleri (AHB)">
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-2">
        <p>
          Bu listede <strong>AHB içe aktarımı</strong> (<code className="rounded bg-white/80 px-1">hm_makaleler</code>)
          ile eklenen yazılar, <strong>Yeni köşe makalesi</strong> ile oluşturduğunuz kayıtlar ve aynı sitedeki{" "}
          <strong>blog kategorili haberler</strong> birlikte görünür (yönetim listesi). Ana sayfadaki{" "}
          <strong>Blog Haberleri</strong> vitrin alanı yalnızca blog kategorisindeki <code className="rounded bg-white/80 px-1">news</code>{" "}
          kayıtlarını gösterir; köşe makaleleri yazar vitrini ve haber bağlantılarıyla açılır. Köşe yazısının vitrinde görünmesi için{" "}
          <strong>yayında</strong> olması ve yazara atanması gerekir.
        </p>
        <p>
          Haber akışı için <strong>Haberler</strong> menüsünü; doğrudan <code className="rounded bg-white/80 px-1">hm_makaleler</code>{" "}
          kaydı için <strong>Yeni köşe makalesi</strong> veya düzenle ikonunu kullanın.
        </p>
      </div>
      <HaberlerInner
        newsEditorBase="/editor/haberler"
        categoriesHref="/editor/kategoriler"
        showBulkDelete
        hmEditorMakaleApi
        makaleEditorBase="/editor/makaleler"
        newNewsHref="/editor/makaleler/yeni"
        newNewsButtonLabel="Yeni köşe makalesi"
        newsPreviewHrefPrefix={newsPreviewHrefPrefix}
      />
    </EditorLayout>
  );
}
