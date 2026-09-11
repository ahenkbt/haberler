import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";

export type HmNewsPageBundle<TArticle = Record<string, unknown>> = {
  article: TArticle | null;
  related: TArticle[];
  kose: unknown;
  sidebar: { authors: unknown[]; popular: TArticle[] };
  redirect?: { status: 301; location: string; searchQuery: string };
  fetchFailed?: boolean;
};

export function wrapNewsArticleAsPageBundle<TArticle>(article: TArticle | null): HmNewsPageBundle<TArticle> {
  return {
    article,
    related: [],
    kose: null,
    sidebar: { authors: [], popular: [] },
  };
}

function hasArticleTitle<TArticle extends { title?: string }>(article: TArticle | null | undefined): article is TArticle {
  return Boolean(article && String(article.title || "").trim());
}

/** Worker / index.html erken bootstrap — React beklemeden haber gövdesi. */
export function readHmNewsArticleBoot<TArticle extends { title?: string }>(
  slug: string,
): HmNewsPageBundle<TArticle> | undefined {
  if (typeof window === "undefined" || !slug.trim()) return undefined;
  const boot = window.__YEKPARE_HM_ARTICLE_BUNDLE__;
  if (!boot?.bundle || typeof boot.bundle !== "object") return undefined;
  const bootSlug = String(boot.slug || "").trim();
  if (bootSlug && bootSlug !== slug) return undefined;
  const bundle = boot.bundle as HmNewsPageBundle<TArticle>;
  if (!hasArticleTitle(bundle.article)) return undefined;
  return bundle;
}

/** page-bundle 5xx/timeout olunca haber gövdesini /api/news/:slug ile aç. İkisini paralel çek. */
export async function fetchHmNewsPageBundle<TArticle extends { title?: string }>(
  slug: string,
  siteId: number | null,
): Promise<HmNewsPageBundle<TArticle>> {
  const q = siteId != null ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  const bundleUrl = apiUrl(`/api/news/page-bundle/${encodeURIComponent(slug)}${q}`);
  const articleUrl = apiUrl(`/api/news/${encodeURIComponent(slug)}${q}`);
  const bundledP = fetchPublicJson<HmNewsPageBundle<TArticle>>(bundleUrl, {
    timeoutMs: 8_000,
    retries: 0,
  });
  const articleP = fetchPublicJson<TArticle>(articleUrl, { timeoutMs: 8_000, retries: 0 });
  const bundled = await bundledP;
  if (bundled.ok && hasArticleTitle(bundled.data?.article)) {
    return bundled.data;
  }
  if (bundled.ok && bundled.data?.redirect?.location) {
    return bundled.data;
  }
  const article = await articleP;
  if (article.ok && hasArticleTitle(article.data)) {
    return wrapNewsArticleAsPageBundle(article.data);
  }
  if (bundled.status === 404 || article.status === 404) {
    return bundled.data ?? wrapNewsArticleAsPageBundle<TArticle>(null);
  }
  throw new Error("news-page-bundle-unavailable");
}
