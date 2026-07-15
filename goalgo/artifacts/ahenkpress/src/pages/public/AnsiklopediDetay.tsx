import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Share2 } from "lucide-react";
import { BilgiAgaciCategoryPills } from "@/components/BilgiAgaciCategoryPills";
import { applyHmNewsArticleMeta, resetSeoToSiteDefaults, seoPlainSnippet, applyEncyclopediaArticleStructuredData } from "@/lib/pageSeo";
import { useAnsiklopediBasePath } from "@/lib/ansiklopediPaths";
import {
  detectProvinceFromTitle,
  resolveTurkishProvinceWikiTitle,
  TR_PROVINCE_NAMES_81,
  wikiTitleDriftsFromProvince,
} from "@/lib/turkishProvinces";
import { NATIONAL_DAYS, nationalDayEncyclopediaPath } from "@/lib/hmCorporateHeritage";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { BILGI_AGACI_DISPLAY_NAME, BILGI_AGACI_SEARCH_PLACEHOLDER } from "@/lib/bilgiAgaciBrand";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { portalAbsoluteHref } from "@/lib/portalBrand";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { haritalarPlaceHref } from "@/lib/haritalarNav";
import {
  canonicalWikiUrlSlug,
  isCanonicalWikiAsciiSlug,
  wikiArticleApiCandidates,
  wikiArticleSlugsMatch,
  wikiSlugToApiTitle,
  wikiTitleToUrlSlug,
} from "@/lib/wikiArticleSlug";
import { splitWikiArticleHtml } from "@/lib/wikiArticleHtml";
import "@/styles/bilgiAgaciTheme.css";

const API = "/api";

interface ArticleData {
  title: string;
  html: string;
  description?: string | null;
  extract?: string | null;
  thumbnail?: { source: string; width?: number; height?: number } | null;
  originalimage?: { source: string; width?: number; height?: number } | null;
  coordinates?: { lat: number; lon: number } | null;
  images?: { src: string; caption?: string }[];
}

type WikiSuggestion = { title: string; snippet?: string };
type WikiTocItem = { id: string; text: string; level: 2 | 3 };

function stripTagsForToc(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildWikiToc(html: string): { html: string; toc: WikiTocItem[] } {
  const toc: WikiTocItem[] = [];
  let idx = 0;
  const enriched = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_full, levelRaw, attrs, inner) => {
    const text = stripTagsForToc(inner);
    if (!text) return _full;
    const level = Number(levelRaw) === 3 ? 3 : 2;
    const id = `wiki-sec-${idx++}`;
    toc.push({ id, text, level });
    const cleanAttrs = String(attrs).replace(/\sid="[^"]*"/i, "");
    return `<h${levelRaw}${cleanAttrs} id="${id}">${inner}</h${levelRaw}>`;
  });
  return { html: enriched, toc };
}

function WikiSectionNav({ items }: { items: WikiTocItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav className="wiki-section-nav" aria-label="Bölümler">
      <p className="wiki-section-nav-label">Bölümler</p>
      <div className="wiki-section-nav-scroll">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`wiki-section-pill${item.level === 3 ? " wiki-section-pill-sub" : ""}`}
          >
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
}

function slugToTitle(slug: string) {
  return wikiSlugToApiTitle(slug);
}
const titleToSlug = wikiTitleToUrlSlug;

function articleShareSummary(article: ArticleData): string {
  const fromWiki = seoPlainSnippet(article.extract || article.description, 320);
  if (fromWiki) return fromWiki;
  const firstP = article.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  return seoPlainSnippet(firstP, 320);
}

function buildArticleShareText(article: ArticleData, url: string): string {
  const summary = articleShareSummary(article);
  const parts = [article.title];
  if (summary) parts.push("", summary);
  parts.push("", url);
  return parts.join("\n");
}

function getArticleCoordinates(article: ArticleData | null): { lat: number; lng: number } | null {
  const lat = Number(article?.coordinates?.lat);
  const lng = Number(article?.coordinates?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function discoverSearchHref(article: ArticleData, city: string | null): string {
  const params = new URLSearchParams();
  params.set("q", article.title);
  if (city) params.set("near", city);
  return portalAbsoluteHref(`/kesfet?${params.toString()}`);
}

function isBadWikiLeadImage(image?: { source?: string; width?: number; height?: number } | null): boolean {
  const src = image?.source ?? "";
  if (!src) return true;
  let haystack = src.toLowerCase();
  try {
    haystack = decodeURIComponent(src).toLowerCase();
  } catch {
    /* keep raw src */
  }
  const width = Number(image?.width);
  const height = Number(image?.height);
  if (Number.isFinite(width) && Number.isFinite(height) && Math.max(width, height) <= 128) return true;
  return /(poweredby|wikimedia-button|transparent|spacer|blank\.gif|pixel|oojs|ambox|icon|symbol|logo|commons-logo|wikidata-logo|arrow|increase|decrease|triangle|sort[_\s-]*(up|down)|padlock|locator|location[_\s-]*map|map[_\s-]*marker|red[_\s-]*pog|red[_\s-]*dot|pushpin|blank[_\s-]*map|placeholder|flag|bayrak|coat[_\s-]*of[_\s-]*arms|arma|emblem|seal|crest)/i.test(
    haystack,
  );
}

function WikiInfoboxAside({ boxes }: { boxes: string[] }) {
  if (boxes.length === 0) return null;
  return (
    <aside className="wiki-infobox-aside" aria-label="Bilgi kutusu">
      {boxes.map((box, i) => (
        <div
          key={`infobox-${i}`}
          className="wiki-infobox-card yekpare-rich-content wiki-article"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(box) }}
        />
      ))}
    </aside>
  );
}

/** Renders full Wikipedia HTML; intercepts /bilgiagaci/ links → SPA navigation */
function ArticleBody({ html, onNavigate }: { html: string; onNavigate: (slug: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const bilgiIndex = href.indexOf("/bilgiagaci/");
      const legacyIndex = href.indexOf("/ansiklopedi/");
      const idx = bilgiIndex >= 0 ? bilgiIndex : legacyIndex;
      const prefix = bilgiIndex >= 0 ? "/bilgiagaci/" : "/ansiklopedi/";
      if (idx >= 0) {
        e.preventDefault();
        const slugPart = href.slice(idx + prefix.length).split("?")[0];
        if (slugPart) onNavigate(slugPart);
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [html, onNavigate]);

  return (
    <div
      ref={ref}
      className="yekpare-rich-content wiki-article text-gray-800 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

export default function AnsiklopediDetay() {
  const params = useParams<{ wikiSlug?: string }>();
  const [, navigate] = useLocation();
  const ansiklopediBase = useAnsiklopediBasePath();
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const slug = params.wikiSlug ?? "";

  const [wikiLang, setWikiLang] = useState<"tr" | "en">("tr");
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; snippet: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notFoundSuggestions, setNotFoundSuggestions] = useState<WikiSuggestion[]>([]);
  const [notFoundSearch, setNotFoundSearch] = useState("");
  const [shareDone, setShareDone] = useState(false);

  const articleBody = useMemo(() => {
    if (!article?.html) {
      return { html: "", toc: [] as WikiTocItem[], infoboxHtml: [] as string[], mapArtifactCount: 0 };
    }
    const split = splitWikiArticleHtml(article.html);
    const tocBuilt = buildWikiToc(split.bodyHtml);
    return { ...tocBuilt, infoboxHtml: split.infoboxHtml, mapArtifactCount: split.mapArtifactCount };
  }, [article?.html]);

  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/wiki/encyclopedia-ui`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.wikiLang === "en") setWikiLang("en");
      })
      .catch(() => {});
  }, []);

  const loadArticle = useCallback(
    (articleSlug: string) => {
      setArticle(null);
      setError(null);
      setNotFoundSuggestions([]);
      setLoading(true);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      const title = wikiSlugToApiTitle(articleSlug);
      const province = resolveTurkishProvinceWikiTitle(title) ?? detectProvinceFromTitle(title);
      const fetchTitle = province ?? title;
      const apiCandidates = wikiArticleApiCandidates(articleSlug);

      const canonicalizeArticleUrl = (wikiTitle: string) => {
        const resolved = wikiTitle.trim();
        if (!resolved) return;
        const canonicalSlug = wikiTitleToUrlSlug(resolved);
        if (!canonicalSlug || wikiArticleSlugsMatch(articleSlug, resolved)) return;
        const nextPath = `${ansiklopediBase}/${canonicalSlug}`;
        window.history.replaceState(window.history.state, "", nextPath);
      };

      const normalizeSuggestions = (items: unknown[]): WikiSuggestion[] => {
        return items
          .map((item) => {
            if (typeof item === "string") return { title: item };
            if (typeof item === "object" && item !== null && "title" in item) {
              const src = item as { title?: unknown; snippet?: unknown };
              const suggestionTitle = String(src.title ?? "").trim();
              if (!suggestionTitle) return null;
              return {
                title: suggestionTitle,
                snippet: typeof src.snippet === "string" ? src.snippet : undefined,
              };
            }
            return null;
          })
          .filter((item): item is WikiSuggestion => Boolean(item?.title));
      };

      const applyPayload = (d: {
        success?: boolean;
        data?: ArticleData & { resolvedTitle?: string };
      }): boolean => {
        if (!d.success || !d.data?.html?.trim()) return false;
        const resolved = (d.data.resolvedTitle ?? d.data.title ?? fetchTitle).trim();
        const slugIsProvince = Boolean(resolveTurkishProvinceWikiTitle(wikiSlugToApiTitle(articleSlug)));
        if (
          slugIsProvince &&
          province &&
          d.data.title &&
          wikiTitleDriftsFromProvince(d.data.title, province)
        ) {
          return false;
        }
        setArticle(d.data);
        setError(null);
        setNotFoundSuggestions([]);
        canonicalizeArticleUrl(resolved);
        return true;
      };

      /** Boşluklu başlıklar sunucuda underscore slug'a çevrilir; encode öncesi sabitle. */
      const wikiArticlePathTitle = (titleForApi: string) =>
        String(titleForApi ?? "")
          .trim()
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_");

      const loadArticlePayload = async (titleForApi: string) => {
        try {
          const pathTitle = wikiArticlePathTitle(titleForApi);
          if (!pathTitle) return null;
          const res = await fetch(
            `${API}/wiki/article/${encodeURIComponent(pathTitle)}?lang=${wikiLang}&searchFallback=1`,
          );
          return await res.json();
        } catch {
          return null;
        }
      };

      const tryLoadResolvedArticle = async (resolvedTitle: string): Promise<boolean> => {
        try {
          const pathTitle = wikiArticlePathTitle(resolvedTitle);
          if (!pathTitle) return false;
          const payload = await fetch(
            `${API}/wiki/article/${encodeURIComponent(pathTitle)}?lang=${wikiLang}&searchFallback=1`,
          ).then((r) => r.json());
          if (payload?.success && payload.data?.html?.trim() && applyPayload(payload)) {
            return true;
          }
        } catch {
          /* try next candidate */
        }
        return false;
      };

      const showNotFound = async (queryTitle: string, initialSuggestions: unknown[] = []) => {
        let suggestions = normalizeSuggestions(initialSuggestions);

        try {
          const resolvePayload = await fetch(
            `${API}/wiki/resolve-title?q=${encodeURIComponent(articleSlug)}&lang=${wikiLang}`,
          ).then((r) => r.json());
          const resolved = String(resolvePayload?.data?.title ?? "").trim();
          if (resolvePayload?.success && resolved && (await tryLoadResolvedArticle(resolved))) return;
        } catch {
          /* continue */
        }

        if (queryTitle !== articleSlug) {
          try {
            const resolvePayload = await fetch(
              `${API}/wiki/resolve-title?q=${encodeURIComponent(queryTitle)}&lang=${wikiLang}`,
            ).then((r) => r.json());
            const resolved = String(resolvePayload?.data?.title ?? "").trim();
            if (resolvePayload?.success && resolved && (await tryLoadResolvedArticle(resolved))) return;
          } catch {
            /* continue */
          }
        }

        try {
          const searchPayload = await fetch(
            `${API}/wiki/search?q=${encodeURIComponent(queryTitle)}&limit=5&lang=${wikiLang}`,
          ).then((r) => r.json());
          if (searchPayload?.success && Array.isArray(searchPayload.data)) {
            const searchSuggestions = normalizeSuggestions(searchPayload.data);
            const seen = new Set(suggestions.map((item) => item.title));
            for (const item of searchSuggestions) {
              if (!seen.has(item.title)) suggestions.push(item);
              seen.add(item.title);
            }
            suggestions = suggestions.slice(0, 8);
            const slugMatch = suggestions.find((item) => wikiArticleSlugsMatch(articleSlug, item.title));
            if (slugMatch && (await tryLoadResolvedArticle(slugMatch.title))) return;
            if (searchSuggestions.length === 1 && searchSuggestions[0]) {
              if (await tryLoadResolvedArticle(searchSuggestions[0].title)) return;
            }
          }
        } catch {
          /* continue */
        }

        const canonical = province ?? resolveTurkishProvinceWikiTitle(queryTitle) ?? detectProvinceFromTitle(queryTitle);
        if (canonical) {
          const exactMatch = suggestions.find((item) => wikiArticleSlugsMatch(item.title, canonical));
          if (exactMatch && (await tryLoadResolvedArticle(exactMatch.title))) return;
          if (await tryLoadResolvedArticle(canonical)) return;
        }

        if (suggestions.length === 1 && suggestions[0]) {
          const only = suggestions[0];
          if (wikiArticleSlugsMatch(articleSlug, only.title) && (await tryLoadResolvedArticle(only.title))) return;
        }

        if (suggestions.length === 0) {
          setError("Makale bulunamadı");
          setNotFoundSearch(queryTitle);
          setNotFoundSuggestions([]);
          return;
        }

        for (const item of suggestions) {
          if (wikiArticleSlugsMatch(articleSlug, item.title) && (await tryLoadResolvedArticle(item.title))) return;
        }

        if (suggestions.length === 1 && suggestions[0]) {
          if (await tryLoadResolvedArticle(suggestions[0].title)) return;
        }

        setError("Başlığı netleştirelim");
        setNotFoundSearch(queryTitle);
        setNotFoundSuggestions(suggestions);
      };

      const tryLoadCandidates = async (): Promise<boolean> => {
        if (province) {
          const provinceData = await loadArticlePayload(province);
          if (provinceData?.success && provinceData.data?.html?.trim() && applyPayload(provinceData)) return true;
        }
        // Sunucu zaten Türkçe aday genişletmesi yapıyor; istemci fan-out'unu sınırla.
        for (const titleForApi of apiCandidates.slice(0, 6)) {
          const d = await loadArticlePayload(titleForApi);
          if (d?.success && d.data?.html?.trim() && applyPayload(d)) return true;
        }
        return false;
      };

      tryLoadCandidates()
        .then(async (loaded) => {
          if (loaded) return;
          try {
            const resolvePayload = await fetch(
              `${API}/wiki/resolve-title?q=${encodeURIComponent(articleSlug)}&lang=${wikiLang}`,
            ).then((r) => r.json());
            const resolved = String(resolvePayload?.data?.title ?? "").trim();
            if (resolvePayload?.success && resolved && (await tryLoadResolvedArticle(resolved))) return;
          } catch {
            /* continue to showNotFound */
          }
          const first = await loadArticlePayload(fetchTitle);
          const initialSuggestions = Array.isArray(first?.suggestions)
            ? first.suggestions
            : Array.isArray(first?.data?.suggestions)
              ? first.data.suggestions
              : [];
          await showNotFound(fetchTitle, initialSuggestions);
        })
        .catch(() => setError("Bağlantı hatası"))
        .finally(() => setLoading(false));
    },
    [wikiLang, ansiklopediBase],
  );

  useEffect(() => {
    if (!slug) return;
    if (!isCanonicalWikiAsciiSlug(slug)) {
      const canonical = canonicalWikiUrlSlug(slug);
      if (canonical && canonical !== slug) {
        navigate(`${ansiklopediBase}/${canonical}`, { replace: true });
        return;
      }
    }
    loadArticle(slug);
  }, [slug, loadArticle, ansiklopediBase, navigate]);

  const handleNavigate = useCallback(
    (targetSlug: string) => {
      const canonical = canonicalWikiUrlSlug(targetSlug);
      navigate(`${ansiklopediBase}/${canonical || targetSlug}`);
    },
    [navigate, ansiklopediBase],
  );

  const shareArticle = useCallback(async () => {
    if (!article) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    const shareText = buildArticleShareText(article, url);
    const summary = articleShareSummary(article);
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: summary ? `${article.title}\n\n${summary}` : article.title,
          url,
        });
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } catch {
        /* noop */
      }
    }
  }, [article]);

  const articleMapTarget = useMemo(() => {
    const coords = getArticleCoordinates(article);
    if (!article || !coords) return null;
    const href = haritalarPlaceHref({
      name: article.title,
      lat: coords.lat,
      lng: coords.lng,
      zoom: 13,
    });
    return { ...coords, href: portalAbsoluteHref(href) };
  }, [article]);

  const heroImage = useMemo(() => {
    const candidate = article?.originalimage && !isBadWikiLeadImage(article.originalimage)
      ? article.originalimage
      : article?.thumbnail && !isBadWikiLeadImage(article.thumbnail)
        ? article.thumbnail
        : null;
    return candidate?.source ?? "";
  }, [article?.originalimage?.source, article?.thumbnail?.source]);

  const articleCity = useMemo(() => {
    return article ? detectProvinceFromTitle(article.title) : null;
  }, [article?.title]);

  const articleActionLinks = useMemo(() => {
    const cityQuery = articleCity ? `?city=${encodeURIComponent(articleCity)}` : "";
    const links = [
      {
        href: portalAbsoluteHref(`/siparis${cityQuery}`),
        label: articleCity ? `🍽️ ${articleCity}'dan Sipariş` : "🍽️ Yemek Siparişi",
      },
      {
        href: portalAbsoluteHref(`/haritalar${cityQuery}`),
        label: "🗺️ İşletmeler",
      },
      {
        href: portalAbsoluteHref(`/alisveris${cityQuery}`),
        label: articleCity ? `🛍️ ${articleCity} Mağazaları` : "🛍️ Alışveriş",
      },
      { href: portalAbsoluteHref("/ulasim"), label: "🚗 Ulaşım" },
      { href: portalAbsoluteHref("/turizm"), label: "✈️ Seyahat" },
    ];
    if (articleMapTarget) {
      links.unshift({
        href: articleMapTarget.href,
        label: `📍 Haritada Gör (${articleMapTarget.lat.toFixed(3)}, ${articleMapTarget.lng.toFixed(3)})`,
      });
    }
    return links;
  }, [articleCity, articleMapTarget]);

  useEffect(() => {
    if (!article) return;
    const siteName = ctx?.displayName?.trim() || BILGI_AGACI_DISPLAY_NAME;
    const canonicalPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `${ansiklopediBase}/${slug}`;
    const summary = articleShareSummary(article);
    applyHmNewsArticleMeta({
      siteName,
      articleTitle: article.title,
      description: summary || article.description,
      canonicalPath,
      imageUrl: article.originalimage?.source || article.thumbnail?.source || null,
    });
    applyEncyclopediaArticleStructuredData({
      headline: article.title,
      description: summary || article.description,
      canonicalPath,
      imageUrl: article.originalimage?.source || article.thumbnail?.source || null,
    });
    return () => resetSeoToSiteDefaults();
  }, [article, ansiklopediBase, slug, ctx?.displayName]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/wiki/search?q=${encodeURIComponent(search)}&limit=7&lang=${wikiLang}`)
        .then(r => r.json())
        .then(d => { if (d.success) setSearchResults(d.data); });
    }, 300);
    return () => clearTimeout(t);
  }, [search, wikiLang]);

  function handleNotFoundSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = notFoundSearch.trim();
    if (!q) return;
    navigate(`${ansiklopediBase}/${titleToSlug(q)}`);
  }

  return (
    <div
      className="bilgi-agaci-detail-page min-h-screen pb-10"
      ref={topRef}
    >
      {/* Alt gezinme + arama — site header ile hizalı */}
      <div className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} flex flex-wrap items-center gap-3 py-3`}>
          <Link href={ansiklopediBase} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-800">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span className="hidden sm:inline">{BILGI_AGACI_DISPLAY_NAME}</span>
          </Link>
          <div className="min-w-[200px] flex-1 relative">
            <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/40 px-3 py-2">
              <svg className="h-4 w-4 shrink-0 text-emerald-600/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder={BILGI_AGACI_SEARCH_PLACEHOLDER}
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                onFocus={() => search && setSearchOpen(true)}
              />
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-2xl">
                {searchResults.map(r => (
                  <Link key={r.title} href={`${ansiklopediBase}/${titleToSlug(r.title)}`}
                    className="flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-emerald-50/50"
                    onClick={() => { setSearch(""); setSearchOpen(false); }}>
                    <span className="mt-0.5 shrink-0 text-emerald-600">📖</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.snippet + "...") }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} py-6 wiki-article-page`}>
        <div className="wiki-detail-main min-w-0 w-full">
          {loading && (
            <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-emerald-100 bg-white p-10 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="text-sm text-slate-500">Makale yükleniyor...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-[1.25rem] border border-emerald-100 bg-white p-10 text-center shadow-sm">
              <p className="mb-3 text-4xl">📚</p>
              <p className="font-bold text-slate-800">{error}</p>
              <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                "{slugToTitle(slug)}" başlığı birebir açılmadı. Yanlış maddeye yönlendirmek yerine aşağıdaki
                seçeneklerden tam başlığı seçebilirsiniz.
              </p>
              <form onSubmit={handleNotFoundSearchSubmit} className="mx-auto mt-5 flex max-w-xl flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-2 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-white bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-300"
                  value={notFoundSearch}
                  onChange={(event) => setNotFoundSearch(event.target.value)}
                  placeholder="Tam madde başlığını yazın"
                />
                <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
                  Tekrar dene
                </button>
              </form>
              {notFoundSuggestions.length > 0 ? (
                <div className="mx-auto mt-5 max-w-xl text-left">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-700">Seçilebilir başlıklar</p>
                  <div className="grid gap-2">
                    {notFoundSuggestions.map((item) => (
                      <Link
                        key={item.title}
                        href={`${ansiklopediBase}/${titleToSlug(item.title)}`}
                        className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50"
                      >
                        <span className="block">{item.title}</span>
                        {item.snippet ? (
                          <span
                            className="mt-1 line-clamp-1 block text-xs font-normal text-slate-500"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.snippet) }}
                          />
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mx-auto mt-5 max-w-xl text-sm text-slate-500">
                  Yakın eşleşme bulunamadı. Yukarıdaki arama kutusuna tam madde başlığını yazıp tekrar deneyin.
                </p>
              )}
              <Link href={ansiklopediBase} className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
                {BILGI_AGACI_DISPLAY_NAME}&apos;na dön →
              </Link>
            </div>
          )}

          {article && !loading && (
            <article className="wiki-detail-card min-w-0 overflow-hidden">
              <div className="wiki-detail-hero">
                <div className="wiki-detail-hero__bg">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt=""
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="wiki-detail-hero__content">
                  <Link href={ansiklopediBase} className="wiki-detail-hero__breadcrumb">
                    {BILGI_AGACI_DISPLAY_NAME}
                  </Link>
                  <h1>{article.title}</h1>
                  {(article.extract || article.description) && (
                    <p>{article.extract || article.description}</p>
                  )}
                  <BilgiAgaciCategoryPills />
                  <div className="wiki-detail-hero__actions">
                    {articleMapTarget ? (
                      <a href={articleMapTarget.href} className="wiki-detail-map-cta">
                        Yekpare Haritalar'da görüntüle
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void shareArticle()}
                      className="wiki-detail-share-btn"
                    >
                      <Share2 className="w-4 h-4" />
                      {shareDone ? "Kopyalandı" : "Paylaş"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="wiki-detail-actions-strip">
                <div className="wiki-detail-actions-strip__inner">
                  <a
                    href={discoverSearchHref(article, articleCity)}
                    className="wiki-detail-discover-primary"
                  >
                    ✨ Yekpare Keşfet'te ara
                  </a>
                  <div className="wiki-detail-glass-actions" aria-label="Yekpare hızlı aksiyonları">
                    {articleActionLinks.map((item) => (
                      <a key={`${item.href}-${item.label}`} href={item.href} className="wiki-detail-glass-action">
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
                {articleMapTarget && articleBody.mapArtifactCount > 0 ? (
                  <p className="wiki-detail-actions-strip__note">
                    {articleBody.mapArtifactCount} harita görseli makale akışından ayrıldı.
                  </p>
                ) : null}
              </div>

              {articleBody.toc.length >= 2 && (
                <div className="px-5 pt-5 sm:px-8">
                  <WikiSectionNav items={articleBody.toc} />
                </div>
              )}

              <div className="wiki-detail-body px-5 py-5 sm:px-8 sm:py-6">
                <div className="wiki-article-layout">
                  <div className="wiki-article-main min-w-0">
                    <ArticleBody html={articleBody.html} onNavigate={handleNavigate} />

                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                      <button
                        type="button"
                        onClick={() => void shareArticle()}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
                      >
                        <Share2 className="w-4 h-4" />
                        {shareDone ? "Bağlantı ve özet kopyalandı" : "Paylaş"}
                      </button>
                      {articleMapTarget ? (
                        <a href={articleMapTarget.href} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50">
                          Yekpare Haritalar
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <WikiInfoboxAside boxes={articleBody.infoboxHtml} />
                </div>
              </div>
            </article>
          )}
        </div>

        {article && !loading ? (
        <aside className="wiki-detail-aside mt-8 grid min-w-0 gap-5 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-emerald-100/90 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Millî günler ve anmalar</p>
            <div className="mb-4 max-h-40 space-y-0.5 overflow-y-auto pr-1">
              {NATIONAL_DAYS.filter((d) => d.day !== "—").slice(0, 14).map((day) => (
                <Link
                  key={`${day.day}-${day.month}-${day.title}`}
                  href={h(nationalDayEncyclopediaPath(day))}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 transition hover:bg-rose-50 hover:text-rose-900"
                >
                  <span className="shrink-0 font-bold text-rose-700">{day.day} {day.month.slice(0, 3)}</span>
                  <span className="line-clamp-1">{day.title}</span>
                </Link>
              ))}
            </div>
            <Link href={h("/milli-gunler")} className="text-[11px] font-semibold text-rose-700 hover:underline">
              Tüm anma takvimi →
            </Link>
          </div>

          {/* Quick links — 81 il + Türkiye */}
          <div className="rounded-[1.25rem] border border-emerald-100/90 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Şehirler (81 il)</p>
            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
              <Link
                href={`${ansiklopediBase}/${wikiTitleToUrlSlug("Türkiye")}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                🇹🇷 Türkiye
              </Link>
              {TR_PROVINCE_NAMES_81.map((name) => (
                <Link
                  key={name}
                  href={`${ansiklopediBase}/${wikiTitleToUrlSlug(name)}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>

        </aside>
        ) : null}
      </div>
    </div>
  );
}
