/**
 * HM kurumsal sayfalarında `layout_json.hmCorporatePageHtml` ile gelen HTML için ortak kabuk.
 */
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export function HmCorporateStaticHtmlPage({
  title,
  subtitle,
  html,
}: {
  title: string;
  subtitle?: string;
  html: string;
}) {
  return (
    <div style={{ background: "var(--hm-page-bg, #ffffff)" }}>
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div
            className="border-b px-6 py-5 md:px-8 bg-[#f4fbf7] border-emerald-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">
              Kurumsal
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div
            className="yekpare-rich-content prose prose-zinc prose-sm max-w-none px-6 py-8 md:px-8 prose-headings:font-bold prose-a:text-red-600 prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />
        </div>
      </div>
    </div>
  );
}
