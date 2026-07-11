import type { ReactNode } from "react";
import { HmDeferredNewsDetailSidebar } from "@/components/HmDeferredNewsDetailSidebar";

type EditorialNewsArticleLayoutProps = {
  accent: string;
  breadcrumbs?: ReactNode;
  /** Ana + sonsuz kaydırma makaleleri — yalnızca sol sütun */
  articleColumn: ReactNode;
  /** Yükleme göstergesi (sol sütunun altında) */
  loadingNext?: boolean;
  /** IntersectionObserver sentinel */
  bottomSentinel?: ReactNode;
  excludeNewsId?: number;
  excludeSlug?: string;
  excludeRssItemId?: string;
  portalSiteId?: number | null;
  prefetchedSidebarAuthors?: Array<{ id: number; name: string; title?: string | null; avatarUrl?: string | null }> | null;
  prefetchedSidebarPopular?: Array<{ id: number; slug: string; title: string; imageUrl?: string | null; createdAt: string }> | null;
  /** Mobilde sidebar makalelerin altında */
  sidebar?: ReactNode;
};

/** Editör haber sitesi düzeni: sol makale yığını + sağ yapışkan sidebar. */
export function EditorialNewsArticleLayout({
  accent,
  breadcrumbs,
  articleColumn,
  loadingNext,
  bottomSentinel,
  excludeNewsId,
  excludeSlug,
  excludeRssItemId,
  portalSiteId,
  prefetchedSidebarAuthors,
  prefetchedSidebarPopular,
  sidebar,
}: EditorialNewsArticleLayoutProps) {
  const sidebarNode =
    sidebar ?? (
      <HmDeferredNewsDetailSidebar
        accent={accent}
        excludeNewsId={excludeNewsId}
        excludeSlug={excludeSlug}
        excludeRssItemId={excludeRssItemId}
        portalSiteId={portalSiteId}
        prefetchedAuthors={prefetchedSidebarAuthors}
        prefetchedPopular={prefetchedSidebarPopular}
      />
    );

  return (
    <div className="hm-article-detail-page min-w-0">
      {breadcrumbs ? <div className="mb-5">{breadcrumbs}</div> : null}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="min-w-0 lg:col-span-2 space-y-0 hm-article-main-column">
          {articleColumn}
          {bottomSentinel}
          {loadingNext ? (
            <div className="flex justify-center py-10">
              <div className="flex items-center gap-3 text-slate-500">
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${accent} transparent transparent transparent` }}
                />
                <span className="text-sm font-medium">Sonraki haber yükleniyor…</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="order-last lg:order-none lg:col-span-1">{sidebarNode}</div>
      </div>
    </div>
  );
}

/** Ardışık makaleler arası editör tarzı ayırıcı */
export function EditorialNextArticleDivider({ accent = "#0EA5E9" }: { accent?: string }) {
  return (
    <div
      className="my-10 border-y py-3"
      style={{ borderColor: `${accent}33`, background: `${accent}0d` }}
    >
      <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-4">
        <div className="h-px flex-1" style={{ background: `${accent}44` }} />
        <span
          className="whitespace-nowrap text-xs font-bold uppercase tracking-widest"
          style={{ color: accent }}
        >
          Sonraki Haber
        </span>
        <div className="h-px flex-1" style={{ background: `${accent}44` }} />
      </div>
    </div>
  );
}
