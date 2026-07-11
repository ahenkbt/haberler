import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import {
  buildRotatedFallbackDaily,
  fetchWikiHomepageFeed,
  hasWikiDailyBlocks,
  plainDailyExcerpt,
  type WikiHomepageFeed,
} from "@/lib/wikiHomepageFeed";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";

const SADE_ACCENT = "#039D55";

type DailyTabId = "featured" | "quality" | "picture" | "today" | "didyouknow";

const BASE_DAILY_TABS: { id: DailyTabId; label: string }[] = [
  { id: "featured", label: "Günün Seçilmiş İçeriği" },
  { id: "quality", label: "Günün kaliteli maddesi" },
  { id: "picture", label: "Günün görseli" },
  { id: "today", label: "Tarihte Bugün" },
  { id: "didyouknow", label: "Bunları biliyor musunuz?" },
];

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

function DailyMediaCard({
  label,
  title,
  wikiTitle,
  excerpt,
  imageUrl,
  imageAlt = "",
  excerptMax = 220,
}: {
  label: string;
  title: string;
  wikiTitle?: string;
  excerpt?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  excerptMax?: number;
}) {
  const linkTitle = wikiTitle ?? title;

  return (
    <article className="wiki-daily-card wiki-daily-card-featured">
      <div
        className={`wiki-daily-featured-grid${imageUrl ? " wiki-daily-featured-grid-with-media" : ""}`}
      >
        {imageUrl ? (
          <WikiArticleLink
            title={linkTitle}
            className="wiki-daily-media wiki-daily-media-featured shrink-0"
          >
            <img src={imageUrl} alt={imageAlt} loading="lazy" />
          </WikiArticleLink>
        ) : null}
        <div className="wiki-daily-featured-body min-w-0">
          <h3>{label}</h3>
          <WikiArticleLink
            title={linkTitle}
            className="wiki-daily-title-link text-base font-bold text-slate-900 hover:text-emerald-700"
          >
            {title}
          </WikiArticleLink>
          {excerpt ? (
            <p className="wiki-daily-excerpt mt-2">
              {plainDailyExcerpt(excerpt, excerptMax)}
            </p>
          ) : null}
          <WikiArticleLink
            title={linkTitle}
            className="wiki-daily-detail-cta mt-2 inline-flex items-center gap-0.5"
          >
            Maddeyi oku
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </WikiArticleLink>
        </div>
      </div>
    </article>
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

/** Yekpare anasayfa — Bölgeler altında günlük Bilgi Ağacı sekmeli bandı */
export function SadeBilgiAgaciDailyBand() {
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
  const dailyTabs = useMemo(() => visibleDailyTabs(displayFeed), [displayFeed]);

  useEffect(() => {
    if (!dailyTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(dailyTabs[0]?.id ?? "featured");
    }
  }, [activeTab, dailyTabs]);

  return (
    <section
      aria-label={BILGI_AGACI_DISPLAY_NAME}
      className="mx-auto w-full max-w-[1440px] px-4 pt-4"
    >
      <div
        className="overflow-hidden rounded-[1.25rem] border border-emerald-100/90 shadow-sm"
        style={{
          background:
            "radial-gradient(circle at 8% 0%, rgba(3, 157, 85, 0.06), transparent 18rem), linear-gradient(180deg, #ffffff 0%, #f8fdf9 100%)",
        }}
      >
        <div className="wiki-daily-band-header border-b border-emerald-100/80 px-3 py-2.5 sm:px-5 sm:py-3.5">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <p className="min-w-0 flex-1 text-[10px] font-semibold leading-snug text-slate-500 sm:text-xs">
              <span className="sm:hidden">Günün içeriği, görsel ve tarihte bugün</span>
              <span className="hidden sm:inline">
                Günün seçilmiş içeriği, kaliteli madde, görsel, tarihte bugün ve ilginç bilgiler
              </span>
            </p>
            <Link
              href="/bilgiagaci"
              className="wiki-daily-band-brand inline-flex shrink-0 items-center rounded-full border border-emerald-200/80 bg-white/55 px-2.5 py-1 text-[10px] font-black shadow-sm backdrop-blur-md transition hover:border-emerald-300 hover:bg-emerald-50/80 sm:px-3.5 sm:py-1.5 sm:text-xs"
              style={{ color: SADE_ACCENT }}
            >
              <span className="wiki-daily-band-brand-icon" aria-hidden>
                🌳
              </span>
              <span>{BILGI_AGACI_DISPLAY_NAME}</span>
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        <div
          className="wiki-daily-band-tabs yekpare-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2 sm:px-5 sm:py-3"
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
                className={`wiki-daily-tab shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black transition sm:px-3.5 sm:text-xs${
                  selected ? " wiki-daily-tab--active" : ""
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="wiki-daily-band px-3 pb-5 sm:px-5 sm:pb-5" role="tabpanel">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-50 bg-white/80 py-10 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Günlük içerik yükleniyor…
            </div>
          ) : null}

          {!loading && activeTab === "featured" && displayFeed.featuredArticle ? (
            <DailyMediaCard
              label="Günün seçilmiş maddesi"
              title={displayFeed.featuredArticle.title}
              excerpt={displayFeed.featuredArticle.extract}
              imageUrl={displayFeed.featuredArticle.thumbnail}
            />
          ) : null}

          {!loading && activeTab === "quality" && displayFeed.goodArticle ? (
            <DailyMediaCard
              label="Günün kaliteli maddesi"
              title={displayFeed.goodArticle.title}
              excerpt={displayFeed.goodArticle.extract}
              imageUrl={displayFeed.goodArticle.thumbnail}
            />
          ) : null}

          {!loading && activeTab === "picture" && displayFeed.featuredPicture ? (
            <DailyMediaCard
              label="Günün görseli"
              title={displayFeed.featuredPicture.title}
              wikiTitle={displayFeed.featuredPicture.wikiTitle ?? displayFeed.featuredPicture.title}
              excerpt={displayFeed.featuredPicture.caption || undefined}
              imageUrl={displayFeed.featuredPicture.imageUrl}
              imageAlt={
                displayFeed.featuredPicture.caption || displayFeed.featuredPicture.title
              }
              excerptMax={160}
            />
          ) : null}

          {!loading && activeTab === "today" && displayFeed.onThisDay?.items.length ? (
            <article className="wiki-daily-card">
              <h3>{displayFeed.onThisDay.label || "Tarihte bugün"}</h3>
              <ul className="space-y-1">
                {displayFeed.onThisDay.items.slice(0, 5).map((item) => (
                  <li key={item.text} className="wiki-daily-list-item">
                    <WikiArticleLink title={item.wikiTitle} className="hover:text-emerald-700">
                      {item.text}
                    </WikiArticleLink>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          {!loading && activeTab === "didyouknow" && displayFeed.didYouKnow?.items.length ? (
            <article className="wiki-daily-card">
              <h3>Bunları biliyor musunuz?</h3>
              <ul className="space-y-1">
                {displayFeed.didYouKnow.items.slice(0, 4).map((item) => (
                  <li key={item.text} className="wiki-daily-list-item">
                    <WikiArticleLink title={item.wikiTitle} className="hover:text-emerald-700">
                      {item.text}
                    </WikiArticleLink>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
