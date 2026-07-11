import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVideoSeoMeta, type VideoSeoMeta } from "@/lib/api";

const JSON_LD_ID = "yektube-watch-jsonld";
const SEO_ATTR = "data-yektube-seo";

type SeoHeadInput = {
  youtubeVideoId: string;
  dbVideoId?: number;
  /** Orijinal başlık — sayfada gösterilen; SEO için kullanılmaz */
  displayTitle: string;
  displayDescription?: string;
  channelName?: string;
  thumbnail?: string;
  duration?: string;
  publishedAt?: string;
  categorySlug?: string;
  pageUrl?: string;
  enabled?: boolean;
};

function upsertMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"][${SEO_ATTR}]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    el.setAttribute(SEO_ATTR, "1");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"][${SEO_ATTR}]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(SEO_ATTR, "1");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function applySeoHead(meta: VideoSeoMeta, pageUrl?: string, thumbnail?: string) {
  document.documentElement.lang = "tr";
  document.title = `${meta.seoTitle} | Yektube`;

  upsertMeta("description", meta.seoDescription);
  upsertMeta("keywords", meta.keywords.join(", "));
  upsertMeta("geo.region", "TR");
  upsertMeta("geo.placename", "Türkiye");
  upsertMeta("content-language", "tr");

  upsertMeta("og:type", "video.other", true);
  upsertMeta("og:locale", "tr_TR", true);
  upsertMeta("og:title", meta.seoTitle, true);
  upsertMeta("og:description", meta.seoDescription, true);
  upsertMeta("og:site_name", "Yektube", true);
  if (pageUrl) upsertMeta("og:url", pageUrl, true);
  if (thumbnail?.trim()) {
    upsertMeta("og:image", thumbnail.trim(), true);
    upsertMeta("twitter:image", thumbnail.trim());
  }

  upsertMeta("twitter:card", "summary_large_image");
  upsertMeta("twitter:title", meta.seoTitle);
  upsertMeta("twitter:description", meta.seoDescription);

  if (pageUrl) upsertLink("canonical", pageUrl);

  let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.setAttribute(SEO_ATTR, "1");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(meta.jsonLd);
}

function cleanupSeoHead(fallbackTitle: string) {
  document.title = fallbackTitle ? `${fallbackTitle} | Yektube` : "Yektube";
  document.querySelectorAll(`[${SEO_ATTR}]`).forEach((el) => el.remove());
  document.getElementById(JSON_LD_ID)?.remove();
}

/** Görünmez SEO katmanı — Google Translate meta; kullanıcı orijinal başlığı görür */
export function useWatchSeoHead(input: SeoHeadInput) {
  const enabled = input.enabled !== false && input.youtubeVideoId.length >= 6;

  const { data } = useQuery({
    queryKey: [
      "watch-seo-meta",
      input.youtubeVideoId,
      input.dbVideoId,
      input.displayTitle,
      input.displayDescription,
    ],
    queryFn: () =>
      fetchVideoSeoMeta(input.youtubeVideoId, {
        dbId: input.dbVideoId,
        title: input.displayTitle,
        description: input.displayDescription,
        channelName: input.channelName,
        thumbnail: input.thumbnail,
        duration: input.duration,
        publishedAt: input.publishedAt,
        categorySlug: input.categorySlug,
        pageUrl: input.pageUrl,
      }),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!enabled) return;
    if (data) applySeoHead(data, input.pageUrl, input.thumbnail);
    return () => cleanupSeoHead(input.displayTitle);
  }, [data, enabled, input.displayTitle, input.pageUrl, input.thumbnail]);
}
