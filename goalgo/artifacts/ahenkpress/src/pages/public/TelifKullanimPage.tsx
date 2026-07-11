import { useQuery } from "@tanstack/react-query";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";
import { hmFullWidthPageShellClass } from "@/lib/hmChromeLayout";
import { fetchHmStaticPage } from "@/lib/hmStaticPagesApi";
import { HM_TELIF_KULLANIM_SLUG } from "@/lib/hmTelifDefaults";
import { looksLikeHmRichPageHtml } from "@/lib/prepareHmCustomPageBodyHtml";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export default function TelifKullanimPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hm-static-page", HM_TELIF_KULLANIM_SLUG],
    queryFn: () => fetchHmStaticPage(HM_TELIF_KULLANIM_SLUG),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-500">Yükleniyor…</div>
    );
  }

  if (isError || !data?.page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
        Telif hakkı sayfası yüklenemedi.
      </div>
    );
  }

  const page = data.page;

  if (looksLikeHmRichPageHtml(page.body)) {
    return (
      <div className={hmFullWidthPageShellClass()}>
        <div
          className="hm-custom-page-body hm-custom-page-body--corporate max-w-none overflow-x-hidden"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }}
        />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-zinc-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-950 px-6 py-5 text-white md:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Yasal</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{page.title}</h1>
            <p className="mt-2 text-sm text-zinc-300">
              <span className="font-medium text-zinc-200">Son Güncelleme:</span> {page.lastUpdated}
            </p>
          </div>
          <div className="px-6 py-8 md:px-8">
            <SimpleMarkdown source={page.body} />
          </div>
        </div>
      </div>
    </div>
  );
}
