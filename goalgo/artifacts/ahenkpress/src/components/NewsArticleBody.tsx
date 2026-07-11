import { useMemo, type CSSProperties } from "react";
import { splitNewsBodyHtml } from "@/lib/newsInlineGallery";
import { NewsInlineGallery } from "@/components/NewsInlineGallery";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

type Props = {
  html: string;
  className?: string;
  style?: CSSProperties;
};

export function NewsArticleBody({ html, className, style }: Props) {
  const parts = useMemo(() => splitNewsBodyHtml(html), [html]);

  return (
    <div className={className} style={style}>
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
