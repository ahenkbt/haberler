import { useEffect, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import type { HmNewsHomeModuleId } from "@/lib/newsSiteLayout";

type Props = {
  moduleId: HmNewsHomeModuleId | string;
  children: ReactNode;
  onNearViewport?: () => void;
  className?: string;
  skeletonTitle?: string;
};

function LazySectionSkeleton({ title, moduleId }: { title?: string; moduleId: string }) {
  return (
    <section className="hm-news-module-empty hm-vitrin-card mb-6 rounded-2xl p-4 sm:p-6" data-hm-home-module={moduleId} data-hm-lazy-placeholder="1" aria-busy="true">
      {title ? <div className="mb-4 h-4 w-40 animate-pulse rounded bg-slate-200/90" /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-slate-100 p-3">
            <div className="aspect-[16/10] animate-pulse rounded-lg bg-slate-200/80" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-200/70" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HmLazyHomeSection({ moduleId, children, onNearViewport, className = "", skeletonTitle }: Props) {
  const { ref, inView } = useInView({ rootMargin: "520px 0px", triggerOnce: true });
  useEffect(() => {
    if (inView) onNearViewport?.();
  }, [inView, onNearViewport]);
  return (
    <div ref={ref} className={className} data-hm-lazy-section={moduleId}>
      {inView ? children : <LazySectionSkeleton title={skeletonTitle} moduleId={String(moduleId)} />}
    </div>
  );
}
