import { useMemo } from "react";
import { EditorManagedPage } from "./EditorManagedPage";
import { HmCorporateStaticHtmlPage } from "@/components/HmCorporateStaticHtmlPage";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { toSafeHmStaticPageHtml } from "@/lib/hmStaticPageHtml";

export default function AbonelikPage() {
  const ctx = useHmPublicLinkContextOptional();
  const raw = (ctx?.layoutPrefs.hmCorporatePageHtml?.abonelik ?? "").trim();
  const html = useMemo(() => {
    return toSafeHmStaticPageHtml(raw, ctx);
  }, [raw, ctx]);

  if (html) {
    return <HmCorporateStaticHtmlPage title="Abonelik" subtitle="Dijital ve basılı abonelik bilgileri." html={html} />;
  }

  return (
    <EditorManagedPage
      pageKey="abonelik"
      title="Abonelik"
      subtitle="Basılı gazete veya dijital site aboneliği — siteye göre yapılandırılır."
    >
      <p>
        İçeriği <strong>Editör → Sayfalar</strong> üzerinden <strong>Sabit sayfalar (içerik)</strong> bölümünde düzenleyin.
      </p>
      <ul>
        <li>Dijital tam erişim</li>
        <li>Basılı + dijital paket</li>
        <li>Kurumsal abonelik</li>
      </ul>
    </EditorManagedPage>
  );
}
