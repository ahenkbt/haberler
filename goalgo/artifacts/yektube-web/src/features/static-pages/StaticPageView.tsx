import { useQuery } from "@tanstack/react-query";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";
import { fetchStaticPage } from "@/lib/staticPagesApi";

export function StaticPageView({ slug }: { slug: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["yektube-static-page", slug],
    queryFn: () => fetchStaticPage(slug),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="px-4 py-12 text-center text-sm text-[var(--color-yt-muted)]">Yükleniyor…</p>;
  }

  if (isError || !data?.page) {
    const detail = error instanceof Error ? error.message : "Sayfa bulunamadı";
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-[var(--color-yt-muted)]">{detail}</p>
      </div>
    );
  }

  const page = data.page;

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-[var(--color-yt-border)] pb-6">
          <h1 className="text-2xl font-bold text-[var(--color-yt-text)] lg:text-3xl">{page.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-yt-muted)]">
            <span className="font-medium text-[var(--color-yt-text)]">Son Güncelleme:</span> {page.lastUpdated}
          </p>
        </header>
        <SimpleMarkdown source={page.body} />
      </div>
    </div>
  );
}
