import { useMemo } from "react";
import { EditorManagedPage } from "./EditorManagedPage";
import { HmCorporateStaticHtmlPage } from "@/components/HmCorporateStaticHtmlPage";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { toSafeHmStaticPageHtml } from "@/lib/hmStaticPageHtml";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { parseLegalPagesJson } from "@workspace/site-nav";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { KunyeLegalPage } from "./legalPages";

export default function KunyePage() {
  const ctx = useHmPublicLinkContextOptional();
  const { data: settings } = useGetSiteSettings();
  const raw = (ctx?.layoutPrefs.hmCorporatePageHtml?.kunye ?? "").trim();
  const html = useMemo(() => {
    return toSafeHmStaticPageHtml(raw, ctx);
  }, [raw, ctx]);

  const portalKunyeHtml = useMemo(() => {
    const pages = parseLegalPagesJson((settings as { legalPagesJson?: string | null } | undefined)?.legalPagesJson);
    const body = pages.kunye.bodyHtml.trim();
    return body ? sanitizeHtml(body) : "";
  }, [(settings as { legalPagesJson?: string | null } | undefined)?.legalPagesJson]);

  if (html) {
    return <HmCorporateStaticHtmlPage title="Künye" subtitle="Yayın ilkeleri, sorumlu müdür ve iletişim bilgileri." html={html} />;
  }

  if (portalKunyeHtml) {
    return <KunyeLegalPage />;
  }

  return (
    <EditorManagedPage
      pageKey="kunye"
      title="Künye"
      subtitle="Yayın ilkeleri, sorumlu müdür ve iletişim bilgileri burada yer alır."
    >
      <p>
        İçeriği <strong>Editör → Sayfalar</strong> bölümünden slug&apos;ı <strong>kunye</strong> olan bir{" "}
        <strong>özel sayfa</strong> ekleyerek düzenleyin.
      </p>
      <ul>
        <li>Sorumlu müdür</li>
        <li>Yayın politikası</li>
        <li>Adres ve kayıt bilgileri</li>
      </ul>
    </EditorManagedPage>
  );
}
