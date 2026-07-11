import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, TreeDeciduous } from "lucide-react";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { pickRotatingCategoryForDay } from "@/lib/homeBilgiAgaciDaily";
import {
  buildRotatedFallbackDaily,
  fetchWikiHomepageFeed,
  hasWikiDailyBlocks,
  plainDailyExcerpt,
  type WikiHomepageFeed,
} from "@/lib/wikiHomepageFeed";
import { pickDailyItem } from "@/lib/wikiDailyRotation";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";

type DailyTabId = "featured" | "quality" | "picture" | "today" | "didyouknow";

const BASE_DAILY_TABS: { id: DailyTabId; label: string }[] = [
  { id: "featured", label: "Günün Seçilmiş İçeriği" },
  { id: "quality", label: "Günün kaliteli maddesi" },
  { id: "picture", label: "Günün görseli" },
  { id: "today", label: "Tarihte Bugün" },
  { id: "didyouknow", label: "Bunları biliyor musunuz?" },
];

const TAB_SLOT_LABEL: Record<DailyTabId, string> = {
  featured: "Günün seçilmiş maddesi",
  quality: "Günün kaliteli maddesi",
  picture: "Günün görseli",
  today: "Tarihte bugün",
  didyouknow: "Bunları biliyor musunuz?",
};

const TAB_CATEGORY_OFFSET: Record<DailyTabId, number> = {
  featured: 0,
  quality: 1,
  picture: 2,
  today: 3,
  didyouknow: 4,
};

function WikiArticleLink({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!title) return <span className={className}>{children}</span>;
  return (
    <Link href={`/bilgiagaci/${wikiTitleToUrlSlug(title)}`} className={className}>
      {children}
    </Link>
  );
}

function useWikiSummary(title?: string) {
  return useQuery({
    queryKey: ["wiki-summary", title],
    queryFn: async () => {
      if (!title?.trim()) return null;
      const r = await fetch(`/api/wiki/summary/${encodeURIComponent(title.trim())}`);
      if (!r.ok) return null;
      const d = (await r.json()) as {
        success?: boolean;
        data?: {
          extract?: string;
          thumbnail?: { source?: string };
          originalimage?: { source?: string };
        };
      };
      if (!d.success || !d.data) return null;
      const thumb = d.data.thumbnail?.source ?? d.data.originalimage?.source ?? null;
      return {
        thumbnail: thumb,
        extract: String(d.data.extract ?? "").trim(),
      };
    },
    enabled: Boolean(title?.trim()),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

function DailyContentCard({
  tabId,
  dateKey,
  slotLabel,
  title,
  wikiTitle,
  excerpt,
  imageUrl,
  imageAlt = "",
  excerptMax = 180,
}: {
  tabId: DailyTabId;
  dateKey: string;
  slotLabel: string;
  title: string;
  wikiTitle?: string;
  excerpt?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  excerptMax?: number;
}) {
  const linkTitle = wikiTitle ?? title;
  const category = pickRotatingCategoryForDay(dateKey, TAB_CATEGORY_OFFSET[tabId]);

  return (
    <article className="yekpare-bilgi-agaci-suggest-card">
      <div className={`yekpare-bilgi-agaci-suggest-card-grid${imageUrl ? " has-media" : ""}`}>
        {imageUrl ? (
          <WikiArticleLink title={linkTitle} className="yekpare-bilgi-agaci-suggest-media">
            <img src={imageUrl} alt={imageAlt || title} loading="lazy" />
          </WikiArticleLink>
        ) : null}
        <div className="min-w-0">
          <div className="yekpare-bilgi-agaci-suggest-card-meta">
            <p className="yekpare-bilgi-agaci-suggest-card-label">{slotLabel}</p>
            <Link
              href={`/bilgiagaci/kategori/${encodeURIComponent(category.slug)}`}
              className="yekpare-bilgi-agaci-suggest-category-pill"
            >
              <span aria-hidden>{category.icon}</span>
              {category.title}
            </Link>
          </div>
          <WikiArticleLink title={linkTitle} className="yekpare-bilgi-agaci-suggest-card-title">
            {title}
          </WikiArticleLink>
          {excerpt ? (
            <p className="yekpare-bilgi-agaci-suggest-card-excerpt">
              {plainDailyExcerpt(excerpt, excerptMax)}
            </p>
          ) : null}
          <WikiArticleLink title={linkTitle} className="yekpare-bilgi-agaci-suggest-card-cta">
            Maddeyi oku
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </WikiArticleLink>
        </div>
      </div>
    </article>
  );
}

function DailyListItemCard({
  tabId,
  dateKey,
  slotLabel,
  itemText,
  wikiTitle,
}: {
  tabId: DailyTabId;
  dateKey: string;
  slotLabel: string;
  itemText: string;
  wikiTitle?: string;
}) {
  const { data: summary } = useWikiSummary(wikiTitle);
  const parsedTitle = itemText.replace(/^[^—–-]+[—–-]\s*/, "").trim();
  const title = wikiTitle ?? (parsedTitle || itemText);
  const excerpt = summary?.extract || itemText;

  return (
    <DailyContentCard
      tabId={tabId}
      dateKey={dateKey}
      slotLabel={slotLabel}
      title={title}
      wikiTitle={wikiTitle ?? title}
      excerpt={excerpt}
      imageUrl={summary?.thumbnail}
      imageAlt={title}
    />
  );
}

function visibleDailyTabs(feed: WikiHomepageFeed): { id: DailyTabId; label: string }[] {
  return BASE_DAILY_TABS.filter((tab) => {
    if (tab.id === "quality") return Boolean(feed.goodArticle?.title);
    if (tab.id === "picture") return Boolean(feed.featuredPicture?.imageUrl);
    if (tab.id === "today") return (feed.onThisDay?.items.length ?? 0) > 0;
    if (tab.id === "didyouknow") return (feed.didYouKnow?.items.length ?? 0) > 0;
    return Boolean(feed.featuredArticle?.title);
  });
}

/** Anasayfa — sabit saydam Bilgi Ağacı bandı (arama altında, odak bağımsız) */
export function HomeBilgiAgaciBand() {
  const [activeTab, setActiveTab] = useState<DailyTabId>("featured");
  const [feed, setFeed] = useState<WikiHomepageFeed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWikiHomepageFeed()
      .then((data) => {
        if (!cancelled) setFeed(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayFeed = hasWikiDailyBlocks(feed) ? feed! : buildRotatedFallbackDaily();
  const dateKey = displayFeed.date;
  const dailyTabs = useMemo(() => visibleDailyTabs(displayFeed), [displayFeed]);

  const todayItem = useMemo(() => {
    const items = displayFeed.onThisDay?.items ?? [];
    if (!items.length) return null;
    return pickDailyItem(items, `${dateKey}:today-tab`);
  }, [displayFeed.onThisDay?.items, dateKey]);

  const dykItem = useMemo(() => {
    const items = displayFeed.didYouKnow?.items ?? [];
    if (!items.length) return null;
    return pickDailyItem(items, `${dateKey}:dyk-tab`);
  }, [displayFeed.didYouKnow?.items, dateKey]);

  useEffect(() => {
    if (!dailyTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(dailyTabs[0]?.id ?? "featured");
    }
  }, [activeTab, dailyTabs]);

  return (
    <section className="home-search-band home-search-band--bilgi" aria-label={BILGI_AGACI_DISPLAY_NAME}>
      <div className="home-glass-panel home-glass-panel--bilgi">
        <div className="yekpare-bilgi-agaci-suggest-header">
          <p className="yekpare-bilgi-agaci-suggest-lead">
            <span className="sm:hidden">Günün içeriği, görsel ve tarihte bugün</span>
            <span className="hidden sm:inline">
              Günün seçilmiş içeriği, kaliteli madde, görsel, tarihte bugün ve ilginç bilgiler
            </span>
          </p>
          <Link href="/bilgiagaci" className="yekpare-bilgi-agaci-suggest-brand">
            <TreeDeciduous className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            <span>{BILGI_AGACI_DISPLAY_NAME}</span>
            <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          </Link>
        </div>

        <div
          className="yekpare-bilgi-agaci-suggest-tabs yekpare-scrollbar"
          role="tablist"
          aria-label="Günlük içerik sekmeleri"
        >
          {dailyTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`yekpare-bilgi-agaci-suggest-tab${selected ? " is-active" : ""}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="yekpare-bilgi-agaci-suggest-body" role="tabpanel">
          {loading ? (
            <div className="yekpare-bilgi-agaci-suggest-loading">
              <div className="yekpare-bilgi-agaci-suggest-spinner" aria-hidden />
              Günlük içerik yükleniyor…
            </div>
          ) : null}

          {!loading && activeTab === "featured" && displayFeed.featuredArticle ? (
            <DailyContentCard
              tabId="featured"
              dateKey={dateKey}
              slotLabel={TAB_SLOT_LABEL.featured}
              title={displayFeed.featuredArticle.title}
              excerpt={displayFeed.featuredArticle.extract}
              imageUrl={displayFeed.featuredArticle.thumbnail}
            />
          ) : null}

          {!loading && activeTab === "quality" && displayFeed.goodArticle ? (
            <DailyContentCard
              tabId="quality"
              dateKey={dateKey}
              slotLabel={TAB_SLOT_LABEL.quality}
              title={displayFeed.goodArticle.title}
              excerpt={displayFeed.goodArticle.extract}
              imageUrl={displayFeed.goodArticle.thumbnail}
            />
          ) : null}

          {!loading && activeTab === "picture" && displayFeed.featuredPicture ? (
            <DailyContentCard
              tabId="picture"
              dateKey={dateKey}
              slotLabel={TAB_SLOT_LABEL.picture}
              title={displayFeed.featuredPicture.title}
              wikiTitle={displayFeed.featuredPicture.wikiTitle ?? displayFeed.featuredPicture.title}
              excerpt={displayFeed.featuredPicture.caption || undefined}
              imageUrl={displayFeed.featuredPicture.imageUrl}
              imageAlt={
                displayFeed.featuredPicture.caption || displayFeed.featuredPicture.title
              }
              excerptMax={140}
            />
          ) : null}

          {!loading && activeTab === "today" && todayItem ? (
            <DailyListItemCard
              tabId="today"
              dateKey={dateKey}
              slotLabel={displayFeed.onThisDay?.label || TAB_SLOT_LABEL.today}
              itemText={todayItem.text}
              wikiTitle={todayItem.wikiTitle}
            />
          ) : null}

          {!loading && activeTab === "didyouknow" && dykItem ? (
            <DailyListItemCard
              tabId="didyouknow"
              dateKey={dateKey}
              slotLabel={TAB_SLOT_LABEL.didyouknow}
              itemText={dykItem.text}
              wikiTitle={dykItem.wikiTitle}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
