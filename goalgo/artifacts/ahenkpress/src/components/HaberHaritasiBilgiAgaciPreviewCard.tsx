import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import type { BilgiAgaciMapPreview } from "@/lib/mapContentLayers";

type HaberHaritasiBilgiAgaciPreviewCardProps = {
  preview: BilgiAgaciMapPreview | null;
  onClose: () => void;
};

function stopMapEvent(ev: React.MouseEvent | React.KeyboardEvent) {
  ev.stopPropagation();
}

export function HaberHaritasiBilgiAgaciPreviewCard({
  preview,
  onClose,
}: HaberHaritasiBilgiAgaciPreviewCardProps) {
  const [excerpt, setExcerpt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!preview) {
      setExcerpt(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setExcerpt(null);
    const wikiName = preview.locationLabel.includes(" › ")
      ? preview.locationLabel.split(" › ").pop()!
      : preview.locationLabel;
    fetch(apiUrl(`/wiki/summary/${encodeURIComponent(wikiName)}`))
      .then((r) => r.json())
      .then((d: { summary?: string | null }) => {
        if (!cancelled) setExcerpt(d.summary?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setExcerpt(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  if (!preview) return null;

  return (
    <div
      className="haber-haritasi-news-preview haber-haritasi-bilgi-preview"
      role="complementary"
      aria-label="Bilgi Ağacı özeti"
      onClick={stopMapEvent}
      onMouseDown={stopMapEvent}
    >
      <article className="haber-haritasi-news-preview__card">
        <button
          type="button"
          className="haber-haritasi-news-preview__close"
          aria-label="Kapat"
          onClick={(ev) => {
            stopMapEvent(ev);
            onClose();
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="haber-haritasi-news-preview__thumb haber-haritasi-bilgi-preview__thumb">
          <span className="haber-haritasi-bilgi-marker__icon" aria-hidden="true">i</span>
        </div>

        <div className="haber-haritasi-news-preview__body">
          <div className="haber-haritasi-news-preview__meta">
            <span className="haber-haritasi-news-preview__tag haber-haritasi-bilgi-preview__tag">
              Bilgi Ağacı
            </span>
            <span className="haber-haritasi-news-preview__location">{preview.locationLabel}</span>
          </div>

          <h3 className="haber-haritasi-news-preview__title">{preview.title}</h3>

          {loading ? (
            <p className="haber-haritasi-bilgi-preview__excerpt haber-haritasi-bilgi-preview__excerpt--muted">
              Yükleniyor…
            </p>
          ) : excerpt ? (
            <p className="haber-haritasi-bilgi-preview__excerpt">{excerpt}</p>
          ) : (
            <p className="haber-haritasi-bilgi-preview__excerpt haber-haritasi-bilgi-preview__excerpt--muted">
              Bu konum için ansiklopedi özeti henüz yüklenemedi.
            </p>
          )}

          <a
            href={preview.href}
            className="haber-haritasi-bilgi-preview__cta font-bold text-xs"
            onClick={stopMapEvent}
          >
            Oku →
          </a>
        </div>
      </article>
    </div>
  );
}
