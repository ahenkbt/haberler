import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { fetchPortalRssPreview } from "@/hooks/useHomeHybridNews";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";

export type InfiniteScrollMode = "portal-hybrid" | "hm-site";

export type StackedNewsArticle = {
  key: string;
  href: string;
  source: "db" | "rss" | "author";
  slug?: string | null;
  rssItemId?: string | null;
  title: string;
  spot?: string | null;
  content?: string | null;
  contentHtml?: string | null;
  imageUrl?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  authorName?: string | null;
  feedLabel?: string | null;
  createdAt: string;
  views?: number;
  tags?: string[];
  id?: number;
  siteId?: number | null;
};

type HybridRow = {
  id?: string;
  source?: string;
  title?: string;
  slug?: string | null;
  href?: string;
  spot?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  authorName?: string | null;
  feedLabel?: string | null;
  publishedAt?: string;
  views?: number;
};

type NewsListRow = {
  id: number;
  slug: string;
  title: string;
  spot?: string | null;
  summary?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  authorName?: string | null;
  createdAt: string;
  views?: number;
  tags?: string[];
  siteId?: number | null;
};

const FETCH_BATCH = 5;
const MAX_SCAN = 40;

/** Tekilleştirme anahtarı — API `rss:…` / `db:…` / `author:…` öneklerini normalize eder. */
export function stackedNewsArticleKey(input: {
  source?: "db" | "rss" | "author" | string | null;
  id?: string | number | null;
  slug?: string | null;
  rssItemId?: string | null;
}): string {
  const source =
    input.source === "rss" ? "rss" : input.source === "author" ? "author" : "db";
  if (source === "rss") {
    const raw = String(input.rssItemId ?? input.id ?? "")
      .trim()
      .replace(/^rss:/, "");
    return raw ? `rss:${raw}` : "";
  }
  const slug = String(input.slug ?? "").trim();
  if (slug) return `${source}:${slug}`;
  const numId = String(input.id ?? "")
    .trim()
    .replace(/^(db|author):/, "")
    .replace(/^id:/, "");
  return numId ? `${source}:id:${numId}` : "";
}

function rssItemIdFromHybrid(row: HybridRow): string | null {
  const raw = String(row.id ?? "").trim();
  if (raw.startsWith("rss:")) return raw.slice(4);
  const href = String(row.href ?? "");
  const m = href.match(/\/haberler\/rss\/([^/?#]+)/i);
  return m?.[1] ?? null;
}

function hybridRowKey(row: HybridRow): string {
  const source =
    row.source === "rss" ? "rss" : row.source === "author" ? "author" : "db";
  return stackedNewsArticleKey({
    source,
    id: row.id,
    slug: row.slug,
    rssItemId: source === "rss" ? rssItemIdFromHybrid(row) : null,
  });
}

async function loadPortalHybridArticle(row: HybridRow, siteId?: number | null): Promise<StackedNewsArticle | null> {
  const key = hybridRowKey(row);
  if (!key) return null;
  const title = String(row.title ?? "").trim();
  if (!title) return null;

  const source =
    row.source === "rss" ? "rss" : row.source === "author" ? "author" : "db";
  const href = coercePublicHybridNewsHref({
    id: String(row.id ?? ""),
    slug: row.slug ?? null,
    source: source === "author" ? "db" : source,
    href: row.href ?? null,
  });

  if (row.source === "rss") {
    const rssId = rssItemIdFromHybrid(row);
    if (!rssId) return null;
    const detail = await fetchPortalRssPreview(rssId, siteId);
    if (!detail) return null;
    return {
      key,
      href: detail.href ? coercePublicHybridNewsHref({ id: `rss:${rssId}`, source: "rss", href: detail.href }) : href,
      source: "rss",
      rssItemId: rssId,
      title: detail.title,
      spot: detail.spot,
      contentHtml: detail.contentHtml,
      imageUrl: detail.imageUrl,
      categoryName: detail.categoryName,
      feedLabel: detail.feedLabel,
      createdAt: detail.publishedAt ?? new Date().toISOString(),
    };
  }

  const slug = String(row.slug ?? "").trim();
  if (slug) {
    const r = await fetch(apiUrl(`/api/news/${encodeURIComponent(slug)}`));
    if (r.ok) {
      const full = (await r.json()) as NewsListRow;
      return {
        key,
        href,
        source,
        slug: full.slug,
        id: full.id,
        title: full.title,
        spot: full.spot ?? full.summary,
        content: full.content,
        imageUrl: full.imageUrl,
        categorySlug: full.categorySlug,
        categoryName: full.categoryName,
        authorName: full.authorName,
        createdAt: full.createdAt,
        views: full.views,
        tags: full.tags,
        siteId: full.siteId,
      };
    }
  }

  return {
    key,
    href,
    source,
    slug: row.slug ?? null,
    title,
    spot: row.spot,
    content: row.content,
    imageUrl: row.imageUrl,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    authorName: row.authorName,
    createdAt: row.publishedAt ?? new Date().toISOString(),
    views: row.views,
  };
}

async function fetchNextPortalHybridInfinite(opts: {
  cursor: number;
  categorySlug?: string | null;
  siteId?: number | null;
  seen: Set<string>;
}): Promise<{ article: StackedNewsArticle | null; nextCursor: number; exhausted: boolean }> {
  const excludeIds = [...opts.seen].join(",");
  const qs = new URLSearchParams({
    cursor: String(opts.cursor),
    excludeIds,
  });
  if (opts.categorySlug) qs.set("categorySlug", opts.categorySlug);
  if (opts.siteId != null && opts.siteId > 0) qs.set("siteId", String(opts.siteId));

  const r = await fetch(apiUrl(`/api/news/hybrid/infinite?${qs}`));
  if (!r.ok) return { article: null, nextCursor: opts.cursor, exhausted: true };
  const data = (await r.json()) as {
    item?: HybridRow | null;
    cursor?: number;
    exhausted?: boolean;
  };
  const row = data.item ?? null;
  const nextCursor = typeof data.cursor === "number" ? data.cursor : opts.cursor + 1;
  if (!row) {
    return { article: null, nextCursor, exhausted: data.exhausted !== false };
  }

  const key = hybridRowKey(row);
  if (!key || opts.seen.has(key)) {
    if (data.exhausted) return { article: null, nextCursor, exhausted: true };
    return fetchNextPortalHybridInfinite({
      cursor: nextCursor,
      categorySlug: opts.categorySlug,
      siteId: opts.siteId,
      seen: opts.seen,
    });
  }

  opts.seen.add(key);
  const article = await loadPortalHybridArticle(row, opts.siteId);
  if (!article) {
    if (data.exhausted) return { article: null, nextCursor, exhausted: true };
    return fetchNextPortalHybridInfinite({
      cursor: nextCursor,
      categorySlug: opts.categorySlug,
      siteId: opts.siteId,
      seen: opts.seen,
    });
  }
  return { article, nextCursor, exhausted: false };
}

async function fetchNextHmSite(opts: {
  offset: number;
  siteId: number;
  excludeSlug: string;
  seen: Set<string>;
}): Promise<{ article: StackedNewsArticle | null; nextOffset: number; exhausted: boolean }> {
  let off = opts.offset;
  let scanned = 0;
  while (scanned < MAX_SCAN) {
    const qs = new URLSearchParams({
      status: "published",
      limit: String(FETCH_BATCH),
      offset: String(off),
      siteId: String(opts.siteId),
    });
    const r = await fetch(apiUrl(`/api/news?${qs}`));
    if (!r.ok) return { article: null, nextOffset: off, exhausted: true };
    const data = (await r.json()) as { items?: NewsListRow[]; total?: number };
    const items = data.items ?? [];
    off += FETCH_BATCH;
    scanned += FETCH_BATCH;

    for (const row of items) {
      if (!row.slug || row.slug === opts.excludeSlug) continue;
      const key = stackedNewsArticleKey({ source: "db", slug: row.slug, id: row.id });
      if (!key || opts.seen.has(key)) continue;
      opts.seen.add(key);

      const detailR = await fetch(
        apiUrl(`/api/news/${encodeURIComponent(row.slug)}?siteId=${encodeURIComponent(String(opts.siteId))}`),
      );
      const full = detailR.ok ? ((await detailR.json()) as NewsListRow) : row;
      return {
        article: {
          key,
          href: `/haber/${encodeURIComponent(row.slug)}`,
          source: "db",
          slug: full.slug,
          id: full.id,
          title: full.title,
          spot: full.spot ?? full.summary,
          content: full.content,
          imageUrl: full.imageUrl,
          categorySlug: full.categorySlug,
          categoryName: full.categoryName,
          authorName: full.authorName,
          createdAt: full.createdAt,
          views: full.views,
          tags: full.tags,
          siteId: full.siteId ?? opts.siteId,
        },
        nextOffset: off,
        exhausted: false,
      };
    }

    const total = data.total ?? 0;
    if (off >= total || items.length === 0) {
      return { article: null, nextOffset: off, exhausted: true };
    }
  }
  return { article: null, nextOffset: off, exhausted: true };
}

export function useNewsInfiniteScroll(opts: {
  mode: InfiniteScrollMode;
  initialKey: string;
  initialHref: string;
  initialSlug?: string | null;
  categorySlug?: string | null;
  siteId?: number | null;
  resolveHref?: (article: StackedNewsArticle) => string;
  enabled?: boolean;
}) {
  const enabled = opts.enabled !== false;
  const [stack, setStack] = useState<StackedNewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const seenRef = useRef(new Set<string>());
  const cursorRef = useRef(0);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const stackRef = useRef<StackedNewsArticle[]>([]);
  const articleRefs = useRef<Map<string, HTMLElement | null>>(new Map());

  const reset = useCallback(
    (initialKey: string) => {
      seenRef.current = new Set(initialKey ? [initialKey] : []);
      stackRef.current = [];
      setStack([]);
      cursorRef.current = 0;
      offsetRef.current = 0;
      setExhausted(false);
      setLoading(false);
      loadingRef.current = false;
      articleRefs.current.clear();
    },
    [],
  );

  useEffect(() => {
    reset(opts.initialKey);
  }, [opts.initialKey, opts.mode, opts.categorySlug, opts.siteId, reset]);

  const loadNext = useCallback(async () => {
    if (!enabled || loadingRef.current || exhausted) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      let result: { article: StackedNewsArticle | null; exhausted: boolean };
      if (opts.mode === "portal-hybrid") {
        const hybrid = await fetchNextPortalHybridInfinite({
          cursor: cursorRef.current,
          categorySlug: opts.categorySlug,
          siteId: opts.siteId,
          seen: seenRef.current,
        });
        cursorRef.current = hybrid.nextCursor;
        result = { article: hybrid.article, exhausted: hybrid.exhausted };
      } else {
        const siteId = opts.siteId;
        if (!siteId) {
          setExhausted(true);
          return;
        }
        const hm = await fetchNextHmSite({
          offset: offsetRef.current,
          siteId,
          excludeSlug: opts.initialSlug ?? "",
          seen: seenRef.current,
        });
        offsetRef.current = hm.nextOffset;
        result = { article: hm.article, exhausted: hm.exhausted };
      }

      if (result.exhausted && !result.article) setExhausted(true);
      if (result.article) {
        if (stackRef.current.some((a) => a.key === result.article!.key)) return;
        const href = opts.resolveHref?.(result.article) ?? result.article.href;
        const withHref = { ...result.article, href };
        stackRef.current = [...stackRef.current, withHref];
        setStack(stackRef.current);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [enabled, exhausted, opts.mode, opts.categorySlug, opts.siteId, opts.initialSlug, opts.resolveHref]);

  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el || !enabled || exhausted) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNext();
      },
      { threshold: 0.05, rootMargin: "240px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, exhausted, loadNext, stack.length]);

  const registerArticleRef = useCallback((key: string, el: HTMLElement | null) => {
    articleRefs.current.set(key, el);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const keys = [opts.initialKey, ...stack.map((a) => a.key)];
    const ratios = new Map<string, number>();

    const pickAndSync = () => {
      let bestKey = "";
      let best = 0;
      for (const [k, r] of ratios) {
        if (r > best) {
          best = r;
          bestKey = k;
        }
      }
      if (!bestKey || best < 0.15) return;
      const href =
        bestKey === opts.initialKey
          ? opts.initialHref
          : stackRef.current.find((a) => a.key === bestKey)?.href ?? opts.initialHref;
      const path = window.location.pathname;
      try {
        const nextPath = new URL(href, window.location.origin).pathname;
        if (nextPath !== path) window.history.replaceState(window.history.state, "", href);
      } catch {
        /* ignore */
      }
    };

    const observers: IntersectionObserver[] = [];
    for (const key of keys) {
      const el = articleRefs.current.get(key);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) ratios.set(key, e.intersectionRatio);
          pickAndSync();
        },
        { threshold: [0, 0.15, 0.35, 0.55, 0.75], rootMargin: "-72px 0px -45% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [enabled, opts.initialKey, opts.initialHref, stack]);

  return {
    stack,
    loading,
    exhausted,
    bottomSentinelRef,
    registerArticleRef,
    reset,
  };
}
