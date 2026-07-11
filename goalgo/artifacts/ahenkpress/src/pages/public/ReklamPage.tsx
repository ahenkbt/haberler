import { useMemo } from "react";
import { EditorManagedPage } from "./EditorManagedPage";
import { HmCorporateStaticHtmlPage } from "@/components/HmCorporateStaticHtmlPage";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { toSafeHmStaticPageHtml } from "@/lib/hmStaticPageHtml";

export default function ReklamPage() {
  const ctx = useHmPublicLinkContextOptional();
  const raw = (ctx?.layoutPrefs.hmCorporatePageHtml?.reklam ?? "").trim();
  const html = useMemo(() => {
    return toSafeHmStaticPageHtml(raw, ctx);
  }, [raw, ctx]);

  if (html) {
    return <HmCorporateStaticHtmlPage title="Reklam" subtitle="Site içi ve sponsorlu içerik seçenekleri." html={html} />;
  }

  return (
    <EditorManagedPage
      pageKey="reklam"
      title="Reklam"
      subtitle="Site içi banner veya özel haber / sponsorlu içerik seçenekleri."
    >
      <p>
        İçeriği <strong>Editör → Sayfalar</strong> üzerinden <strong>Sabit sayfalar (içerik)</strong> bölümünde düzenleyin.
      </p>
      <ul>
        <li>Anasayfa ve kategori bandı</li>
        <li>Haber içi yerleşim</li>
        <li>Özel haber / sponsorlu köşe</li>
      </ul>
    </EditorManagedPage>
  );
}
