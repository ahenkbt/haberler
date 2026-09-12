import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { hmNewsArticleSlugsMatch } from "@/lib/hmHaberPathSlug";
import { readHmHomeBundleBoot } from "@/lib/hmHomeBundleBoot";
import { readHmHomeHybridNewsCache } from "@/lib/hmHomeHybridNewsCache";

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

function headlineFromHomeBundle(bundle: unknown, slug: string): Record<string, unknown> | null {
  if (!bundle || typeof bundle !== "object") return null;
  const want = slug.trim().toLowerCase();
  if (!want) return null;
  const rec = bundle as Record<string, unknown>;
  const lists = [rec.tepeManset, rec.featured, rec.centerHeadlines, rec.manualEditor, rec.breaking, rec.popular];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (String(row.slug || "").trim().toLowerCase() === want && String(row.title || "").trim()) {
        return row;
      }
    }
  }
  return null;
}

function headlineToClientArticle<TArticle>(item: Record<string, unknown>, slug: string): TArticle {
  const spot = String(item.spot || item.summary || item.description || "").trim();
  return {
    ...item,
    slug: String(item.slug || slug).trim(),
    title: String(item.title || "").trim(),
    spot: spot || null,
    content: String(item.content || spot || item.title || "").trim(),
  } as TArticle;
}

/** Anasayfa manşet / hibrit cache — API 5xx olsa da manuel haber başlık+spot açılsın. */
export function readHmHeadlineAsPageBundle<TArticle extends { title?: string }>(
  slug: string,
  siteId: number | null,
): HmNewsPageBundle<TArticle> | undefined {
  if (typeof window === "undefined" || !slug.trim()) return undefined;
  const want = slug.trim();
  const early = window.__YEKPARE_HM_HOME_BUNDLE__;
  const siteOk =
    siteId == null || !Number.isFinite(siteId) || siteId <= 0 || Number(early?.siteId) === siteId;
  let row = siteOk ? headlineFromHomeBundle(early?.bundle, want) : null;
  if (!row && siteId != null && Number.isFinite(siteId) && siteId > 0) {
    row = headlineFromHomeBundle(readHmHomeBundleBoot(siteId), want);
  }
  if (!row && siteId != null && Number.isFinite(siteId) && siteId > 0) {
    const hybrid = readHmHomeHybridNewsCache(siteId);
    const hit = hybrid?.find((it) => String(it.slug || "").trim().toLowerCase() === want.toLowerCase());
    if (hit?.title?.trim() && !String(hit.href || "").includes("/haberler/rss/")) {
      row = hit as unknown as Record<string, unknown>;
    }
  }
  if (!row) return undefined;
  const article = headlineToClientArticle<TArticle>(row, want);
  if (!hasArticleTitle(article)) return undefined;
  return { ...wrapNewsArticleAsPageBundle(article), fetchFailed: true };
}

/** Worker / index.html erken bootstrap — React beklemeden haber gövdesi. */
export function readHmNewsArticleBoot<TArticle extends { title?: string }>(
  slug: string,
): HmNewsPageBundle<TArticle> | undefined {
  if (typeof window === "undefined" || !slug.trim()) return undefined;
  const boot = window.__YEKPARE_HM_ARTICLE_BUNDLE__;
  if (!boot?.bundle || typeof boot.bundle !== "object") return undefined;
  const bootSlug = String(boot.slug || "").trim();
  const articleSlug = String(
    (boot.bundle as { article?: { slug?: string } | null }).article?.slug || "",
  ).trim();
  if (bootSlug && !hmNewsArticleSlugsMatch(bootSlug, slug) && !hmNewsArticleSlugsMatch(articleSlug, slug)) {
    return undefined;
  }
  const bundle = boot.bundle as HmNewsPageBundle<TArticle>;
  if (!hasArticleTitle(bundle.article)) return undefined;
  return bundle;
}

async function fetchNewsArticlePair<TArticle extends { title?: string }>(
  slug: string,
  siteId: number | null,
): Promise<{
  bundled: Awaited<ReturnType<typeof fetchPublicJson<HmNewsPageBundle<TArticle>>>>;
  article: Awaited<ReturnType<typeof fetchPublicJson<TArticle>>>;
}> {
  const q = siteId != null ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  const bundleUrl = apiUrl(`/api/news/page-bundle/${encodeURIComponent(slug)}${q}`);
  const articleUrl = apiUrl(`/api/news/${encodeURIComponent(slug)}${q}`);
  const bundledP = fetchPublicJson<HmNewsPageBundle<TArticle>>(bundleUrl, {
    timeoutMs: 8_000,
    retries: 0,
  });
  const articleP = fetchPublicJson<TArticle>(articleUrl, { timeoutMs: 8_000, retries: 0 });
  const bundled = await bundledP;
  // /api/news/:slug siteId ile 8sn asılı kalabiliyor; page-bundle geldiyse beklemeyin.
  if (bundled.ok && (hasArticleTitle(bundled.data?.article) || bundled.data?.redirect?.location)) {
    return { bundled, article: { ok: false, status: 0, data: null, retried: false } };
  }
  return { bundled, article: await articleP };
}

function bundleFromPair<TArticle extends { title?: string }>(
  bundled: Awaited<ReturnType<typeof fetchPublicJson<HmNewsPageBundle<TArticle>>>>,
  article: Awaited<ReturnType<typeof fetchPublicJson<TArticle>>>,
): HmNewsPageBundle<TArticle> | null {
  if (bundled.ok && hasArticleTitle(bundled.data?.article)) return bundled.data;
  if (bundled.ok && bundled.data?.redirect?.location) return bundled.data;
  if (article.ok && hasArticleTitle(article.data)) return wrapNewsArticleAsPageBundle(article.data);
  return null;
}

/** page-bundle 5xx/timeout olunca haber gövdesini /api/news/:slug ile aç. İkisini paralel çek. */
export async function fetchHmNewsPageBundle<TArticle extends { title?: string }>(
  slug: string,
  siteId: number | null,
): Promise<HmNewsPageBundle<TArticle>> {
  const scoped = await fetchNewsArticlePair<TArticle>(slug, siteId);
  const fromScoped = bundleFromPair(scoped.bundled, scoped.article);
  if (fromScoped) return fromScoped;

  // HM özel alan: merkez havuz haberi siteId ile 404/timeout olabilir — portalsız dene.
  if (siteId != null) {
    const unscoped = await fetchNewsArticlePair<TArticle>(slug, null);
    const fromUnscoped = bundleFromPair(unscoped.bundled, unscoped.article);
    if (fromUnscoped) return fromUnscoped;
  }

  const local = readHmHeadlineAsPageBundle<TArticle>(slug, siteId);
  if (local) return local;
  if (scoped.bundled.status === 404 || scoped.article.status === 404) {
    return scoped.bundled.data ?? wrapNewsArticleAsPageBundle<TArticle>(null);
  }
  throw new Error("news-page-bundle-unavailable");
}
