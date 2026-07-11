/**
 * Yasal metinler — admin panelden (Genel Ayarlar → Alt menü) düzenlenir.
 */
import { useMemo } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { parseLegalPagesJson, type LegalPageKey } from "@workspace/site-nav";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import IletisimKunyePremium from "./IletisimKunyePremium";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto w-full flex-1 px-4 py-10 text-gray-800">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 border-b border-gray-200 pb-4">{title}</h1>
      <div className="space-y-4 text-sm md:text-base leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[#e61e25] [&_a]:underline">
        {children}
      </div>
    </div>
  );
}

function LegalPageView({ pageKey }: { pageKey: LegalPageKey }) {
  const { data: settings } = useGetSiteSettings();
  const pages = useMemo(
    () => parseLegalPagesJson((settings as { legalPagesJson?: string | null } | undefined)?.legalPagesJson),
    [(settings as { legalPagesJson?: string | null } | undefined)?.legalPagesJson],
  );
  const page = pages[pageKey];

  if (pageKey === "iletisim-kunye" && !page.bodyHtml.trim()) {
    return <IletisimKunyePremium />;
  }

  return (
    <Shell title={page.title}>
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.bodyHtml) }} />
    </Shell>
  );
}

export function MesafeliSatisSozlesmesiPage() {
  return <LegalPageView pageKey="mesafeli-satis-sozlesmesi" />;
}

export function OnBilgilendirmePage() {
  return <LegalPageView pageKey="on-bilgilendirme" />;
}

export function KvkkPage() {
  return <LegalPageView pageKey="gizlilik-kvkk" />;
}

export function IadeDegisimPage() {
  return <LegalPageView pageKey="iade-degisim" />;
}

export function TeslimatKargoPage() {
  return <LegalPageView pageKey="teslimat-kargo" />;
}

export function KullanimKosullariPage() {
  return <LegalPageView pageKey="kullanim-kosullari" />;
}

export function SssPage() {
  return <LegalPageView pageKey="sss" />;
}

export function IletisimKunyePage() {
  return <LegalPageView pageKey="iletisim-kunye" />;
}

export function KunyeLegalPage() {
  return <LegalPageView pageKey="kunye" />;
}
