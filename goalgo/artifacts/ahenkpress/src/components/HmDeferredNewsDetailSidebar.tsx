import { useInView } from "@/hooks/useInView";
import { HmNewsDetailSidebar } from "@/components/HmNewsDetailSidebar";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof HmNewsDetailSidebar>;

function SidebarSkeleton() {
  return (
    <aside className="space-y-4" aria-busy="true" aria-label="Kenar çubuğu yükleniyor">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-3 flex gap-3">
            <div className="h-16 w-20 shrink-0 animate-pulse rounded-lg bg-slate-100" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100/80" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function HmDeferredNewsDetailSidebar(props: Props) {
  const { ref, inView } = useInView({ rootMargin: "240px 0px", triggerOnce: true });

  return (
    <div ref={ref} data-hm-deferred-sidebar={inView ? "active" : "pending"}>
      {inView ? <HmNewsDetailSidebar {...props} /> : <SidebarSkeleton />}
    </div>
  );
}
