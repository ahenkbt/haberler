import { useMemo, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Link } from "wouter";
import { pushRecentSearch } from "@/hooks/useSearchSuggestions";
import { useHomeBilgiAgaciDaily } from "@/hooks/useHomeBilgiAgaciDaily";
import { useHomeDailyTrends } from "@/hooks/useHomeDailyTrends";
import {
  buildCategoryHeadlines,
  useHomeNewsBandItems,
} from "@/hooks/useHomeNewsBandItems";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";
import {
  BILGI_AGACI_TAB_ID,
  HABER_KATEGORILERI_TAB_ID,
  HIBRIT_RSS_TAB_ID,
  SON_EKLENEN_HABERLER_TAB_ID,
  isBilgiAgaciTab,
  isNewsLinkTab,
  resolveHomeTrendHeadlines,
  resolveHomeTrendTabs,
} from "@/lib/homeDailyTrendTabs";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";

const COLLAPSED = 8;
const EXPANDED = 16;

/** Anasayfa — sabit saydam günlük trend bandı (arama altında, odak bağımsız) */
export function HomeTrendsBand() {
  const { data, isLoading, isError } = useHomeDailyTrends();
  const { data: bilgiItems = [], isLoading: bilgiLoading } = useHomeBilgiAgaciDaily();
  const { data: newsItems = [], isLoading: newsLoading } = useHomeNewsBandItems();
  const [activeTab, setActiveTab] = useState(BILGI_AGACI_TAB_ID);
  const [expanded, setExpanded] = useState(false);

  const categories = data?.categories?.length ? data.categories : [];
  const tabs = useMemo(
    () => resolveHomeTrendTabs(categories.length ? categories : undefined, { includeSpecialTabs: true }),
    [categories],
  );

  const categoryHeadlines = useMemo(() => buildCategoryHeadlines(newsItems), [newsItems]);

  const trendHeadlines = useMemo(() => {
    if (isBilgiAgaciTab(activeTab) || isNewsLinkTab(activeTab)) return [];
    const all = resolveHomeTrendHeadlines(categories.length ? categories : undefined, activeTab);
    return all.slice(0, expanded ? EXPANDED : COLLAPSED);
  }, [activeTab, categories, expanded]);

  const newsHeadlines = useMemo(() => {
    if (!isNewsLinkTab(activeTab)) return [];
    let source = newsItems;
    if (activeTab === HABER_KATEGORILERI_TAB_ID) {
      source = categoryHeadlines;
    } else if (activeTab === HIBRIT_RSS_TAB_ID) {
      source = newsItems.filter((item) => item.source === "rss");
    }
    return source.slice(0, expanded ? EXPANDED : COLLAPSED);
  }, [activeTab, categoryHeadlines, expanded, newsItems]);

  const bilgiHeadlines = useMemo(() => {
    if (!isBilgiAgaciTab(activeTab)) return [];
    return bilgiItems.slice(0, expanded ? EXPANDED : COLLAPSED);
  }, [activeTab, bilgiItems, expanded]);

  const totalCount = useMemo(() => {
    if (isBilgiAgaciTab(activeTab)) return bilgiItems.length;
    if (activeTab === HABER_KATEGORILERI_TAB_ID) return categoryHeadlines.length;
    if (activeTab === SON_EKLENEN_HABERLER_TAB_ID || activeTab === HIBRIT_RSS_TAB_ID) {
      return activeTab === HIBRIT_RSS_TAB_ID
        ? newsItems.filter((item) => item.source === "rss").length
        : newsItems.length;
    }
    if (isNewsLinkTab(activeTab)) return newsItems.length;
    return resolveHomeTrendHeadlines(categories.length ? categories : undefined, activeTab).length;
  }, [activeTab, bilgiItems.length, categories, categoryHeadlines.length, newsItems.length]);

  const goToQuery = (text: string) => {
    const q = text.trim();
    if (!q) return;
    pushRecentSearch(q);
    window.location.href = `/ara?q=${encodeURIComponent(q)}`;
  };

  const showBilgi = isBilgiAgaciTab(activeTab);
  const showNews = isNewsLinkTab(activeTab);
  const showLoading = showBilgi
    ? bilgiLoading && !bilgiHeadlines.length
    : showNews
      ? newsLoading && !newsHeadlines.length
      : isLoading && !trendHeadlines.length;
  const showError = !showBilgi && !showNews && isError && !trendHeadlines.length;

  const loadingLabel = showBilgi
    ? "Bilgi Ağacı yükleniyor…"
    : showNews
      ? "Haberler yükleniyor…"
      : "Günün trendleri yükleniyor…";

  return (
    <section className="home-search-band home-search-band--suggest" aria-label="Günün trendleri">
      <div className="home-glass-panel">
        <div className="yss-trend-tabs" role="tablist" aria-label="Trend kategorileri">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`yss-trend-tab${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => {
                setActiveTab(tab.id);
                setExpanded(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showLoading ? (
          <p className="yss-trend-loading" aria-live="polite">
            {loadingLabel}
          </p>
        ) : null}

        {showError ? (
          <p className="yss-trend-loading" role="status">
            Trendler şu an yüklenemedi.
          </p>
        ) : null}

        <div className="yss-trend-grid">
          {showBilgi
            ? bilgiHeadlines.map((item) => (
                <Link
                  key={`${item.slotKind}-${item.wikiTitle}`}
                  href={`/bilgiagaci/${wikiTitleToUrlSlug(item.wikiTitle)}`}
                  className="yss-trend-item yss-trend-item--link"
                >
                  <ArrowUp className="yss-trend-arrow" aria-hidden />
                  <span className="yss-trend-text">
                    {item.slotLabel ? (
                      <>
                        <span className="yss-trend-slot-label">{item.slotLabel}</span>
                        {" · "}
                      </>
                    ) : null}
                    {item.title}
                  </span>
                </Link>
              ))
            : showNews
              ? newsHeadlines.map((item) => (
                  <Link
                    key={item.id}
                    href={coercePublicHybridNewsHref({
                      id: item.id,
                      slug: item.slug ?? null,
                      source: item.source ?? null,
                      href: item.href,
                    })}
                    className="yss-trend-item yss-trend-item--link"
                  >
                    <ArrowUp className="yss-trend-arrow" aria-hidden />
                    <span className="yss-trend-text">{item.title}</span>
                  </Link>
                ))
              : trendHeadlines.map((text) => (
                  <button
                    key={text}
                    type="button"
                    className="yss-trend-item"
                    onClick={() => goToQuery(text)}
                  >
                    <ArrowUp className="yss-trend-arrow" aria-hidden />
                    <span className="yss-trend-text">{text}</span>
                  </button>
                ))}
        </div>

        {totalCount > COLLAPSED ? (
          <button
            type="button"
            className="yss-show-more"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Daha az göster" : "Daha fazla göster"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
