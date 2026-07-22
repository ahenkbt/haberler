import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Flame, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { RssBreakingBalloonPool } from "@/components/news/RssBreakingBalloonPool";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  resolveHmBreakingRssDisplayMode,
  resolveHmBreakingRssFeedRows,
  resolveHmBreakingRssSectionTitle,
} from "@/lib/newsSiteLayout";
import { sanitizeHtml, stripExternalAnchorsFromHtml } from "@/lib/sanitizeHtml";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";
import { fetchHybridNewsList } from "@/hooks/useHomeHybridNews";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";

type RssBreakingCategoryId = "mixed" | string;

type RssBreakingBandItem = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  summary: string;
  contentHtml: string;
  contentText: string;
  contentIsLimited: boolean;
  url: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
};

type RssBreakingBandResponse = {
  ok: boolean;
  category: RssBreakingCategoryId;
  fetchedAt?: string;
  cacheTtlSeconds?: number;
  items?: RssBreakingBandItem[];
};

export type RssBreakingBandFallbackItem = {
  id: number | string;
  slug?: string | null;
  title: string;
  summary?: string | null;
  spot?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  source?: "db" | "rss";
  href?: string | null;
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try {
    return format(new Date(d), "d MMM, HH:mm", { locale: tr });
  } catch {
    return "";
  }
}

function isValidBreakingRssUrl(value: string | null | undefined): boolean {
  return /^https?:\/\//i.test(String(value ?? "").trim());
}

function rssCategorySlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "");
}

function mapFallbackToRssItems(items: RssBreakingBandFallbackItem[]): RssBreakingBandItem[] {
  return items.slice(0, 10).map((item) => ({
    id: String(item.id),
    category: "portal",
    categoryLabel: String(item.categoryName ?? "Haber").trim() || "Haber",
    title: item.title,
    summary: String(item.summary ?? item.spot ?? "").trim(),
    contentHtml: "",
    contentText: String(item.summary ?? item.spot ?? "").trim(),
    contentIsLimited: true,
    url: null,
    imageUrl: resolveClientMediaSrc(item.imageUrl) ?? item.imageUrl ?? null,
    publishedAt: item.publishedAt ?? item.createdAt ?? null,
  }));
}

function RssBreakingPreviewModal({
  item,
  accent,
  onClose,
}: {
  item: RssBreakingBandItem;
  accent: string;
  onClose: () => void;
}) {
  const titleId = `rss-breaking-preview-title-${item.id}`;
  const contentHtml = sanitizeHtml(stripExternalAnchorsFromHtml(String(item.contentHtml ?? "").trim()));
  const contentText = String(item.contentText || item.summary || "").trim();
  const contentHasInlineImage = /<img\b/i.test(contentHtml);
  const showLeadImage = Boolean(item.imageUrl) && !contentHasInlineImage;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              <span className="rounded-full px-2 py-1 text-white" style={{ background: accent }}>
                {item.categoryLabel}
              </span>
              {item.publishedAt ? <span>{fmtDate(item.publishedAt)}</span> : null}
            </p>
            <h3 id={titleId} className="mt-2 text-lg font-black leading-tight text-slate-950 sm:text-2xl">
              {item.title}
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label="Haberi kapat"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[calc(92vh-138px)] overflow-y-auto px-4 py-4 sm:px-5">
          {showLeadImage ? (
            <img src={item.imageUrl!} alt="" className="mb-4 max-h-[280px] w-full rounded-xl object-cover" />
          ) : null}

          {contentHtml ? (
            <div
              className="prose prose-sm max-w-none prose-headings:text-slate-950 prose-a:font-bold prose-a:no-underline prose-img:rounded-xl prose-img:shadow-sm"
              style={{ "--tw-prose-links": accent } as CSSProperties}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : contentText ? (
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{contentText}</p>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Bu RSS kaynağı haber metnini paylaşmıyor; kayıt yapılmadan yalnızca RSS ile gelen bilgiler gösterilebilir.
            </p>
          )}

          {item.contentIsLimited ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              RSS kaynağı bu haber için kısa içerik paylaşıyor olabilir; siteye kaydetmeden yalnızca RSS ile gelen metin
              gösteriliyor.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export function HmRssBreakingBand({
  accent,
  layoutPrefs,
  siteId,
  className = "hm-vitrin-card mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow",
  fallbackNewsItems,
  fallbackHrefPrefix = "/haber/",
}: {
  accent: string;
  layoutPrefs: NewsSiteLayoutPrefs;
  siteId?: number | null;
  className?: string;
  /** RSS boş/hata olduğunda portal haber API yedek kartları. */
  fallbackNewsItems?: RssBreakingBandFallbackItem[];
  fallbackHrefPrefix?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<RssBreakingCategoryId>("mixed");
  const [selectedItem, setSelectedItem] = useState<RssBreakingBandItem | null>(null);
  const h = useHmPublicHref();
  const [poppedBalloonIds, setPoppedBalloonIds] = useState<Set<string>>(() => new Set());
  const feedRows = useMemo(() => resolveHmBreakingRssFeedRows(layoutPrefs), [layoutPrefs]);
  const displayMode = resolveHmBreakingRssDisplayMode(layoutPrefs);
  const isBalloonMode = displayMode === "balloons";
  const sectionTitle = resolveHmBreakingRssSectionTitle(layoutPrefs);
  const feedSignature = useMemo(
    () => feedRows.map((row) => `${row.id}:${row.label}:${row.url}`).join("|"),
    [feedRows],
  );
  const tabs = useMemo<Array<{ id: RssBreakingCategoryId; label: string }>>(() => {
    const categories = feedRows
      .filter((row) => isValidBreakingRssUrl(row.url))
      .map((row) => ({
        id: rssCategorySlug(row.label) || rssCategorySlug(row.id) || row.id,
        label: row.label.trim() || row.id,
      }));
    return categories.length ? [{ id: "mixed", label: "Genel" }, ...categories] : [];
  }, [feedRows]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((tab) => tab.id === activeCategory)) {
      setActiveCategory("mixed");
    }
  }, [activeCategory, tabs]);

  useEffect(() => {
    setPoppedBalloonIds(new Set());
  }, [activeCategory, isBalloonMode]);

  const handleBalloonSelect = useCallback((item: RssBreakingBandItem) => {
    setPoppedBalloonIds((current) => {
      const next = new Set(current);
      next.add(item.id);
      return next;
    });
    setSelectedItem(item);
  }, []);

  const { data, isPending, isError } = useQuery<RssBreakingBandResponse>({
    queryKey: ["/api/news/hybrid", "rss-band", siteId ?? "portal", activeCategory, feedSignature],
    queryFn: async () => {
      const mapRows = (rows: Awaited<ReturnType<typeof fetchHybridNewsList>>) =>
        rows
          .filter((row) => row.source === "rss")
          .slice(0, 10)
          .map((row) => ({
            id: String(row.id).replace(/^rss:/, ""),
            category: row.categorySlug ?? "rss",
            categoryLabel: row.feedLabel ?? row.categoryName ?? "RSS",
            title: row.title,
            summary: String(row.spot ?? "").trim(),
            contentHtml: "",
            contentText: String(row.spot ?? "").trim(),
            contentIsLimited: true,
            url: row.href,
            imageUrl: row.imageUrl ? resolveClientMediaSrc(row.imageUrl) ?? row.imageUrl : null,
            publishedAt: row.publishedAt ?? null,
          }));

      const categorySlug = activeCategory === "mixed" ? undefined : String(activeCategory);
      let rows = await fetchHybridNewsList({
        siteId,
        categorySlug,
        limit: 10,
        offset: 0,
        rssOnly: true,
        rssScope: "box",
      });
      let items = mapRows(rows);
      if (items.length === 0) {
        rows = await fetchHybridNewsList({
          siteId,
          categorySlug,
          limit: 10,
          offset: 0,
          rssOnly: true,
          rssScope: "all",
        });
        items = mapRows(rows);
      }
      if (items.length === 0 && categorySlug) {
        rows = await fetchHybridNewsList({
          siteId,
          limit: 10,
          offset: 0,
          rssOnly: true,
          rssScope: "all",
        });
        items = mapRows(rows);
      }
      return {
        ok: true,
        category: activeCategory,
        items,
      } satisfies RssBreakingBandResponse;
    },
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: tabs.length > 0,
  });
  const rssItems = data?.items ?? [];
  const fallbackItems = useMemo(
    () => (fallbackNewsItems?.length ? mapFallbackToRssItems(fallbackNewsItems) : []),
    [fallbackNewsItems],
  );
  const useFallback = tabs.length === 0 || isError || data?.ok === false || (!isPending && rssItems.length === 0);
  const items = useFallback && fallbackItems.length ? fallbackItems : rssItems;
  const showLoading = tabs.length > 0 && isPending && !fallbackItems.length;
  const showRssError = tabs.length > 0 && (isError || data?.ok === false) && !fallbackItems.length;
  const showEmpty = !showLoading && !showRssError && items.length === 0;
  const closePreview = useCallback(() => setSelectedItem(null), []);

  return (
    <section className={className}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
            <Flame className="h-3.5 w-3.5" />
            Son Dakika
          </p>
          <h2 className="mt-1 text-base font-black uppercase tracking-[0.03em] text-slate-950">{sectionTitle}</h2>
        </div>
        {tabs.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => {
              const active = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition"
                  style={{
                    borderColor: active ? accent : "rgba(15,23,42,0.12)",
                    background: active ? accent : "#fff",
                    color: active ? "#fff" : "#334155",
                  }}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="bg-slate-50 px-3 py-3 sm:px-4">
        {showLoading ? (
          isBalloonMode ? (
            <div className="h-[360px] animate-pulse rounded-xl bg-slate-200 md:h-[400px]" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-[202px] animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          )
        ) : showRssError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            RSS son dakika haberleri şu anda alınamadı. Bağlantı düzelince saatlik cache ile yeniden gösterilir.
          </div>
        ) : showEmpty ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {tabs.length === 0
              ? "RSS kaynağı tanımlı değil. Yönetim panelinden RSS satırları ekleyin veya portal haberleri yayınlayın."
              : "Bu kategori için gösterilecek RSS öğesi bulunamadı."}
          </div>
        ) : isBalloonMode ? (
          <RssBreakingBalloonPool items={items} accent={accent} hiddenIds={poppedBalloonIds} onSelect={handleBalloonSelect} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {items.map((item) => {
              const fallbackItem = fallbackNewsItems?.find((n) => String(n.id) === item.id);
              const cardHref =
                useFallback && fallbackNewsItems?.length && fallbackItem
                  ? coercePublicHybridNewsHref(fallbackItem)
                  : null;
              const cardBody = (
                <>
                  <div className="relative h-24 w-full overflow-hidden bg-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Haber
                      </div>
                    )}
                    <span
                      className="absolute left-2 top-2 rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow"
                      style={{ background: accent }}
                    >
                      {item.categoryLabel}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-2 text-sm font-black leading-snug text-slate-950">{item.title}</h3>
                    {item.summary ? (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.summary}</p>
                    ) : null}
                    {item.publishedAt ? (
                      <p className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-400">
                        <Clock className="h-3 w-3" />
                        {fmtDate(item.publishedAt)}
                      </p>
                    ) : null}
                  </div>
                </>
              );

              const rssHref = !useFallback && item.url ? item.url : null;
              if (cardHref || rssHref) {
                return (
                  <Link
                    key={item.id}
                    href={h(cardHref ?? rssHref!)}
                    className="group flex min-h-[202px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {cardBody}
                  </Link>
                );
              }

              return (
                <article
                  key={item.id}
                  className="group flex min-h-[202px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <button
                    type="button"
                    className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ "--tw-ring-color": accent } as CSSProperties}
                    onClick={() => setSelectedItem(item)}
                    aria-label={`${item.title} haberini önizle`}
                  >
                    {cardBody}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {selectedItem ? (
        <RssBreakingPreviewModal
          item={selectedItem}
          accent={accent}
          onClose={closePreview}
        />
      ) : null}
    </section>
  );
}
