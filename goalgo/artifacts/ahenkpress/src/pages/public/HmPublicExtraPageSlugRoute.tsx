import { useParams } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import HmRedirectToSonDakika from "@/pages/public/HmRedirectToSonDakika";
import KategoriDetay from "@/pages/public/KategoriDetay";
import Iletisim from "@/pages/public/Iletisim";
import { HmPublicStandardExtraPageRoute } from "@/components/HmPublicStandardExtraPageRoute";
import { isHmReservedRouteSegment, normalizeHmExtraPageSlug } from "@/lib/hmExtraPageLookup";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { apiRequest } from "@/lib/queryClient";
import { resolveHmUnifiedRssFeedRows } from "@/lib/newsSiteLayout";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";

function MissingExtraPage({ segment }: { segment: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">
      <p className="font-medium text-slate-800">Bu sayfa henüz yayınlanmamış.</p>
      <p className="mt-2">
        Editör → Sayfalar bölümünden slug&apos;ı <strong>{segment}</strong> olan bir özel sayfa ekleyin ve yayına alın.
      </p>
    </div>
  );
}

function CategorySlugFallback({ segment }: { segment: string }) {
  const ctx = useHmPublicLinkContextOptional();
  const wanted = normalizeNewsCategorySlug(segment);
  const { data: categories, isLoading } = useQuery<any[]>({
    queryKey: ["/api/categories", ctx?.siteId ?? 0, "short-category-fallback"],
    queryFn: () => apiRequest(`/api/categories?siteId=${encodeURIComponent(String(ctx!.siteId))}`) as Promise<any[]>,
    enabled: !!ctx?.siteId,
    staleTime: 10 * 60 * 1000,
  });
  const rssSlugSet = useMemo(() => {
    if (!ctx) return new Set<string>();
    const rows = resolveHmUnifiedRssFeedRows(ctx.layoutPrefs).filter((row) => String(row.url ?? "").trim());
    return new Set(
      rows.flatMap((row) => [normalizeNewsCategorySlug(row.label), normalizeNewsCategorySlug(row.id)]).filter(Boolean),
    );
  }, [ctx]);
  const hasDbCategory = (categories ?? []).some((category) => normalizeNewsCategorySlug(category?.slug) === wanted);
  const hasRssCategory = rssSlugSet.has(wanted);
  if (!ctx || isLoading) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">Sayfa yükleniyor…</div>;
  }
  if (hasDbCategory || hasRssCategory) return <KategoriDetay />;
  return <HmRedirectToSonDakika />;
}

/** `/tr/:slug/:pageSlug` — özel sayfa (kunye, iletisim, vb.). */
export default function HmPublicExtraPageSlugRoute() {
  const params = useParams<{ slug: string; pageSlug: string }>();
  let pageSlug = String(params?.pageSlug ?? "").trim();
  try {
    pageSlug = decodeURIComponent(pageSlug);
  } catch {
    /* keep raw */
  }
  const norm = normalizeHmExtraPageSlug(pageSlug);
  if (!pageSlug || isHmReservedRouteSegment(norm)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">Geçersiz sayfa adresi.</div>
    );
  }
  const fallback =
    norm === "iletisim" ? (
      <Iletisim />
    ) : (
      <CategorySlugFallback segment={pageSlug} />
    );
  return <HmPublicStandardExtraPageRoute segment={pageSlug} label={pageSlug} fallback={fallback} />;
}
