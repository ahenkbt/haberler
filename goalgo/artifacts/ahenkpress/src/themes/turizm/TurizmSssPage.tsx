import { Link } from "wouter";
import { YEKPARE_TURIZM_SSS_BODY_HTML } from "@workspace/site-nav";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryPageFooter } from "./TurizmCategoryIntro";
import "@/styles/turizmHub.css";

/** /turizm/turlar/sss — seyahat modülüne özel SSS */
export default function TurizmSssPage() {
  const bodyHtml = YEKPARE_TURIZM_SSS_BODY_HTML;

  return (
    <div className="tz-hub tz-sss" data-page="turizm-sss">
      <TurizmSubNavBar sticky />
      <div className="max-w-3xl mx-auto w-full px-4 py-10 text-gray-800">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700 mb-2">Yekpare Seyahat</p>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 border-b border-gray-200 pb-4">
          Turizm Sıkça Sorulan Sorular
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Otel, tur, uçuş, transfer ve yat ilanları için platform modeli ve sorumluluk sınırları. Genel SSS:{" "}
          <Link href="/sss" className="text-[#e61e25] underline font-semibold">
            /sss
          </Link>
        </p>
        <div
          className="space-y-4 text-sm md:text-base leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[#e61e25] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
        />
      </div>
      <TurizmCategoryPageFooter title="Turizm SSS" />
    </div>
  );
}
