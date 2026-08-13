import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { splitNewsBodyHtml } from "@/lib/newsInlineGallery";
import { NewsInlineGallery } from "@/components/NewsInlineGallery";
import { applyHmNewsImageFallback } from "@/lib/hmNewsPlaceholder";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

type Props = {
  html: string;
  className?: string;
  style?: CSSProperties;
};

export function NewsArticleBody({ html, className, style }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => splitNewsBodyHtml(html), [html]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) applyHmNewsImageFallback(event.target);
    };
    root.addEventListener("error", onError, true);
    return () => root.removeEventListener("error", onError, true);
  }, [html]);

  return (
    <div ref={rootRef} className={className} style={style}>
      {parts.map((part, i) =>
        part.type === "gallery" ? (
          <NewsInlineGallery key={`g-${i}`} images={part.images} />
        ) : part.html.trim() ? (
          <div key={`h-${i}`} className="yekpare-news-body-chunk" dangerouslySetInnerHTML={{ __html: sanitizeHtml(part.html) }} />
        ) : null,
      )}
    </div>
  );
}
