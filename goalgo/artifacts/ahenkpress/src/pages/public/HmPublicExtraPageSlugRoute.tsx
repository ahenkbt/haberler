import { useParams } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import HmRedirectToSonDakika from "@/pages/public/HmRedirectToSonDakika";
import KategoriDetay from "@/pages/public/KategoriDetay";
import Iletisim from "@/pages/public/Iletisim";
import HakkindaPage from "@/pages/public/HakkindaPage";
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
  /** Vatan/kurumsal sitelerde bilinmeyen slug → sondakika değil, “yayınlanmamış” uyarısı. */
  const theme = String(ctx.layoutPrefs.hmVitrinTheme ?? "").toLowerCase();
  if (theme === "vatan" || theme === "corporate") {
    return <MissingExtraPage segment={segment} />;
  }
  return <HmRedirectToSonDakika />;
}

/** `/tr/:slug/:pageSlug` — özel sayfa (kunye, iletisim, vb.).
 * Nested WP yolları (`/tr/:slug/trafik-yasam/projeler`) de aynı komponentle açılır;
 * slug lookup `/` → `-` normalize eder.
 */
export default function HmPublicExtraPageSlugRoute() {
  const params = useParams<{
    slug: string;
    pageSlug?: string;
    seg1?: string;
    seg2?: string;
    seg3?: string;
  }>();
  let pageSlug = String(params?.pageSlug ?? "").trim();
  if (!pageSlug) {
    const nested = [params?.seg1, params?.seg2, params?.seg3]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);
    pageSlug = nested.join("/");
  }
  try {
    pageSlug = decodeURIComponent(pageSlug);
  } catch {
    /* keep raw */
  }
  const norm = normalizeHmExtraPageSlug(pageSlug);
  const firstSeg = normalizeHmExtraPageSlug(String(params?.seg1 ?? params?.pageSlug ?? "").split("/")[0] ?? "");
  if (!pageSlug || isHmReservedRouteSegment(firstSeg) || isHmReservedRouteSegment(norm)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">Geçersiz sayfa adresi.</div>
    );
  }
  const fallback =
    norm === "iletisim" ? (
      <Iletisim />
    ) : norm === "hakkinda" || norm === "about" ? (
      <HakkindaPage />
    ) : (
      <CategorySlugFallback segment={norm || pageSlug} />
    );
  return <HmPublicStandardExtraPageRoute segment={norm || pageSlug} label={norm || pageSlug} fallback={fallback} />;
}
