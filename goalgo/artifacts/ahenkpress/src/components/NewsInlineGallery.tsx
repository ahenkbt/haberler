import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  className?: string;
};

export function NewsInlineGallery({ images, className }: Props) {
  const slides = images.map((s) => s.trim()).filter(Boolean);
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const current = count > 0 ? Math.min(index, count - 1) : 0;

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  if (count === 0) return null;

  const src = resolveClientMediaSrc(slides[current]!) || slides[current]!;

  return (
    <figure className={cn("ap-news-gallery not-prose my-8", className)} data-ap-gallery="true">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-md">
        <div className="aspect-[16/10] w-full">
          <img
            key={current}
            src={src}
            alt=""
            className="h-full w-full object-contain bg-black/90"
            loading="lazy"
          />
        </div>
        {count > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition-colors"
              onClick={() => go(-1)}
              aria-label="Önceki görsel"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition-colors"
              onClick={() => go(1)}
              aria-label="Sonraki görsel"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white tabular-nums">
              {current + 1} / {count}
            </span>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {slides.map((u, i) => {
            const thumb = resolveClientMediaSrc(u) || u;
            return (
              <button
                key={`${u}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  i === current ? "border-red-600 ring-1 ring-red-600/30" : "border-slate-200 opacity-75 hover:opacity-100",
                )}
                aria-label={`Görsel ${i + 1}`}
              >
                <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      ) : null}
    </figure>
  );
}
