import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HmNewsImage, resolveNewsItemImageFallbackUrl, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import {
  fetchHybridNewsList,
  HM_HYBRID_CATEGORY_FETCH_TIMEOUT_MS,
  hybridNewsListQueryKey,
  mapHybridNewsToBandItem,
} from "@/hooks/useHomeHybridNews";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";
import { passesCategoryContentGuard } from "@/lib/hmCategoryContentGuard";
import {
  HM_SPOR_BOX_CARD_COUNT,
  HM_SPOR_BOX_LEAD_COUNT,
  HM_SPOR_BOX_TOTAL,
  HM_SPOR_SUBCATEGORIES,
  pickSporAllBoxItems,
  type HmSporSubcategoryId,
} from "@/lib/hmSporSubcategories";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import "@/styles/hmSporModule.css";

export type HmSporNewsPanelItem = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  enclosure?: string | { url?: string | null } | null;
  href?: string | null;
  source?: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  feedLabel?: string | null;
  spot?: string | null;
  content?: string | null;
  rssSourceUrl?: string | null;
  originUrl?: string | null;
};

function newsTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? "").trim()) || "Haber";
}

function dedupeFillSporItems(
  primary: readonly HmSporNewsPanelItem[],
  fallback: readonly HmSporNewsPanelItem[],
  limit: number,
): HmSporNewsPanelItem[] {
  const seen = new Set<string>();
  const out: HmSporNewsPanelItem[] = [];
  const push = (item: HmSporNewsPanelItem | undefined) => {
    if (!item || out.length >= limit) return;
    const key = String(item.id ?? item.href ?? item.slug ?? item.rssSourceUrl ?? "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };
  for (const item of primary) push(item);
  for (const item of fallback) push(item);
  return out;
}

export type HmSporNewsPanelProps = {
  items: HmSporNewsPanelItem[];
  newsHref?: (n: HmSporNewsPanelItem) => string;
  siteId?: number | null;
  kategoriHref?: string;
  categoryTitle?: string;
  className?: string;
  /** true: üst SPOR sekmesi + panel çerçevesi (HmSporModule ile). */
  showCategoryTab?: boolean;
};

/** SPOR kutusu: sütun iç kategori butonları + üstte 2 büyük / altta 4 kutu. */
export function HmSporNewsPanel({
  items,
  newsHref,
  siteId = null,
  kategoriHref,
  categoryTitle = "SPOR",
  className = "",
  showCategoryTab = true,
}: HmSporNewsPanelProps) {
  const h = useHmPublicHref();
  const [activeSub, setActiveSub] = useState<HmSporSubcategoryId>("all");
  const activeMeta = HM_SPOR_SUBCATEGORIES.find((row) => row.id === activeSub) ?? HM_SPOR_SUBCATEGORIES[0]!;

  const tabQuery = useQuery({
    queryKey: hybridNewsListQueryKey({
      scope: "hm-spor-box-tab",
      siteId,
      categorySlug: activeMeta.categorySlug,
      limit: Math.max(HM_SPOR_BOX_TOTAL * 3, 18),
      offset: 0,
      rssScope: "all",
      rssOnly: true,
    }),
    queryFn: async ({ signal }) => {
      const rows = await fetchHybridNewsList({
        siteId,
        categorySlug: activeMeta.categorySlug,
        limit: Math.max(HM_SPOR_BOX_TOTAL * 3, 18),
        offset: 0,
        rssScope: "all",
        rssOnly: true,
        timeoutMs: HM_HYBRID_CATEGORY_FETCH_TIMEOUT_MS,
        retries: 0,
        signal,
      });
      return rows
        .map(mapHybridNewsToBandItem)
        .filter((item) => passesCategoryContentGuard(item, "spor"));
    },
    staleTime: 60 * 1000,
    retry: 0,
  });

  const displayItems = useMemo(() => {
    const fromApi = (tabQuery.data ?? []).filter(Boolean) as HmSporNewsPanelItem[];
    const fallback = items.filter(Boolean);
    if (activeSub === "all") {
      return pickSporAllBoxItems(fromApi, fallback, HM_SPOR_BOX_TOTAL);
    }
    return dedupeFillSporItems(fromApi, fallback, HM_SPOR_BOX_TOTAL);
  }, [activeSub, items, tabQuery.data]);

  const resolveHref = (n: HmSporNewsPanelItem) => {
    if (newsHref) return newsHref(n);
    return h(coercePublicHybridNewsHref(n));
  };

  const leads = displayItems.slice(0, HM_SPOR_BOX_LEAD_COUNT);
  const cards = displayItems.slice(HM_SPOR_BOX_LEAD_COUNT, HM_SPOR_BOX_TOTAL);
  const loading = tabQuery.isLoading && displayItems.length === 0;

  return (
    <div className={`hm-spor-news-panel ${className}`.trim()} data-hm-spor-sub={activeSub}>
      {showCategoryTab ? (
        kategoriHref ? (
          <Link href={kategoriHref} className="hm-spor-module-tab">
            {categoryTitle}
          </Link>
        ) : (
          <span className="hm-spor-module-tab">{categoryTitle}</span>
        )
      ) : null}

      <div className="hm-spor-module-news-panel">
        <div className="hm-spor-subcats" role="tablist" aria-label="Spor iç kategorileri">
          {HM_SPOR_SUBCATEGORIES.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              className={`hm-spor-subcat ${activeSub === row.id ? "is-active" : ""}`.trim()}
              aria-selected={activeSub === row.id}
              onClick={() => setActiveSub(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="hm-spor-module-empty hm-spor-module-empty--compact">Yükleniyor…</div>
        ) : displayItems.length === 0 ? (
          <div className="hm-spor-module-empty hm-spor-module-empty--compact">
            {activeSub === "all" ? "Spor haberi bulunamadı." : `${activeMeta.label} haberi bulunamadı.`}
          </div>
        ) : (
          <div className="hm-spor-news-layout">
            {leads.length > 0 ? (
              <div className="hm-spor-news-leads">
                {leads.map((n, index) => (
                  <Link
                    key={`lead-${n.id ?? n.slug ?? index}`}
                    href={resolveHref(n)}
                    className="hm-spor-news-lead group"
                  >
                    <div className="hm-spor-news-lead-media">
                      <HmNewsImage
                        src={resolveNewsItemImageUrl(n)}
                        fallbackSrc={resolveNewsItemImageFallbackUrl(n)}
                        alt={newsTitle(n.title)}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                      <div className="hm-spor-news-lead-shade" aria-hidden />
                      <h3 className="hm-spor-news-lead-title">{newsTitle(n.title)}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
            {cards.length > 0 ? (
              <div className="hm-spor-news-cards">
                {cards.map((n, index) => (
                  <Link
                    key={`card-${n.id ?? n.slug ?? index}`}
                    href={resolveHref(n)}
                    className="hm-spor-module-card group"
                  >
                    <div className="hm-spor-module-thumb">
                      <HmNewsImage
                        src={resolveNewsItemImageUrl(n)}
                        fallbackSrc={resolveNewsItemImageFallbackUrl(n)}
                        alt={newsTitle(n.title)}
                        loading="lazy"
                      />
                    </div>
                    <h3>{newsTitle(n.title)}</h3>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
