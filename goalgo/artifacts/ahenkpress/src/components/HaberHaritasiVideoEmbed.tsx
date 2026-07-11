type HaberHaritasiVideoEmbedProps = {
  videoId: string;
  title: string;
  className?: string;
};

/** YouTube iframe — haber haritası harita üstü video oynatıcı. */
export function HaberHaritasiVideoEmbed({ videoId, title, className = "" }: HaberHaritasiVideoEmbedProps) {
  const id = String(videoId ?? "").trim();
  if (!id) return null;
  const src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
  return (
    <div className={`haber-haritasi-news-overlay__embed ${className}`.trim()}>
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
