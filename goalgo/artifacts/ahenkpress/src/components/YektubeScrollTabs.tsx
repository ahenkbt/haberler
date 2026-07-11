export type YektubeTabItem = { id: string; label: string };

/** Yatay kayan sekme şeridi — haber kategorileri / playlist sekmeleri */
export function YektubeScrollTabs({
  tabs: tabsProp,
  items,
  activeId,
  onChange,
  className = "",
}: {
  tabs?: YektubeTabItem[];
  /** @deprecated tabs kullanın */
  items?: YektubeTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const tabs = tabsProp ?? items ?? [];
  if (tabs.length === 0) return null;

  return (
    <div
      className={`flex gap-1 overflow-x-auto border-b border-zinc-200 scrollbar-none ${className}`.trim()}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors sm:px-4 sm:text-xs ${
              active
                ? "bg-[#039D55] text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
