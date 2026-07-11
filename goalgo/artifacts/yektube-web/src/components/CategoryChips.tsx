import { cn } from "@/lib/cn";
import { categoryLabel } from "@/lib/constants";

export function CategoryChips({
  categories,
  activeId,
  onChange,
  className,
  sticky = true,
}: {
  categories: Array<string | { slug: string; label?: string }>;
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  sticky?: boolean;
}) {
  const tabs = [
    { id: "all", label: "Tümü" },
    ...categories.map((c) =>
      typeof c === "string"
        ? { id: c, label: categoryLabel(c) }
        : { id: c.slug, label: c.label ?? categoryLabel(c.slug) },
    ),
  ];

  return (
    <div
      className={cn(
        "border-b border-[var(--color-yt-border)] yt-panel",
        sticky && "sticky z-30 top-[var(--yt-mobile-sticky-top,3rem)] lg:top-14",
        className,
      )}
    >
      <div className="flex gap-2 overflow-x-auto px-3 py-1 scrollbar-none lg:px-0 lg:py-2">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              activeId === id
                ? "bg-[var(--color-yt-chip-active)] text-[var(--color-yt-chip-active-text)]"
                : "bg-[var(--color-yt-chip)] text-[var(--color-yt-text)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-[var(--color-yt-border)]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-video animate-pulse yt-skeleton" />
          <div className="flex gap-3 p-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full yt-skeleton" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-full animate-pulse rounded yt-skeleton" />
              <div className="h-3 w-2/3 animate-pulse rounded yt-skeleton" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
