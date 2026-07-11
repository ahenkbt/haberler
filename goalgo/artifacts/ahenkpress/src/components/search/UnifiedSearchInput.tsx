import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  Building2,
  Clock,
  MapPin,
  Newspaper,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  groupSuggestionsBySection,
  LOCAL_TRENDING_QUERIES,
  pickDefaultTrendingGhost,
  pushRecentSearch,
  readRecentSearches,
  recentSearchSuggestions,
  resolveSuggestionHref,
  useSearchSuggestions,
  type SearchSuggestionItem,
} from "@/hooks/useSearchSuggestions.ts";
import { useHomeDailyTrends } from "@/hooks/useHomeDailyTrends";
import {
  resolveHomeTrendHeadlines,
  resolveHomeTrendTabs,
} from "@/lib/homeDailyTrendTabs";
import "@/styles/searchSuggest.css";

const TYPE_LABELS: Record<string, string> = {
  query: "Arama",
  popular: "Popüler",
  recent: "Son arama",
  news: "Haber",
  business: "İşletme",
  city: "Şehir",
  vendor: "Firma",
  ai: "AI öneri",
};

const TRENDING_COLLAPSED = 8;
const TRENDING_EXPANDED = 16;

function TypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0 opacity-70";
  switch (type) {
    case "news":
      return <Newspaper className={cls} aria-hidden />;
    case "business":
    case "vendor":
      return <Building2 className={cls} aria-hidden />;
    case "city":
      return <MapPin className={cls} aria-hidden />;
    case "popular":
      return <TrendingUp className={cls} aria-hidden />;
    case "recent":
      return <Clock className={cls} aria-hidden />;
    case "ai":
      return <Sparkles className={cls} aria-hidden />;
    default:
      return <Search className={cls} aria-hidden />;
  }
}

function splitSuggestMatch(query: string, text: string): { prefix: string; rest: string } {
  const q = query.trim();
  if (!q) return { prefix: "", rest: text };
  const qLower = q.toLocaleLowerCase("tr-TR");
  const tLower = text.toLocaleLowerCase("tr-TR");
  if (tLower.startsWith(qLower)) {
    return { prefix: text.slice(0, q.length), rest: text.slice(q.length) };
  }
  const idx = tLower.indexOf(qLower);
  if (idx >= 0) {
    return { prefix: text.slice(0, idx + q.length), rest: text.slice(idx + q.length) };
  }
  return { prefix: text, rest: "" };
}

function completionSuffix(query: string, suggestion: string): string | null {
  const q = query.trim();
  if (!q || !suggestion) return null;
  const qLower = q.toLocaleLowerCase("tr-TR");
  const sLower = suggestion.toLocaleLowerCase("tr-TR");
  if (!sLower.startsWith(qLower)) return null;
  const suffix = suggestion.slice(q.length);
  return suffix || null;
}

function pickGhostSuggestion(
  query: string,
  items: SearchSuggestionItem[],
  activeIndex: number,
): SearchSuggestionItem | null {
  if (!items.length) return null;
  if (activeIndex >= 0 && items[activeIndex]) return items[activeIndex]!;
  const trimmed = query.trim();
  if (!trimmed) {
    return items.find((item) => item.type === "popular") ?? items[0] ?? null;
  }
  const prefixMatch =
    items.find((item) =>
      item.text.toLocaleLowerCase("tr-TR").startsWith(trimmed.toLocaleLowerCase("tr-TR")),
    ) ?? null;
  if (prefixMatch) return prefixMatch;
  return items.find((item) => item.type === "query" || item.type === "popular") ?? items[0] ?? null;
}

function SearchDropdownStack({
  open,
  items,
  activeIndex,
  listId,
  theme,
  query,
  loading,
  onSelect,
}: {
  open: boolean;
  items: SearchSuggestionItem[];
  activeIndex: number;
  listId: string;
  theme: "home" | "results";
  query: string;
  loading: boolean;
  onSelect: (item: SearchSuggestionItem) => void;
}) {
  const { data: trendsData, isLoading: trendsLoading } = useHomeDailyTrends();
  const [activeTrendTab, setActiveTrendTab] = useState("trendler");
  const [trendingExpanded, setTrendingExpanded] = useState(false);
  const grouped = useMemo(() => groupSuggestionsBySection(items), [items]);
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);
  const hasQuery = Boolean(query.trim());
  const isEmptyTrending = !hasQuery && theme === "home";

  const trendCategories = trendsData?.categories?.length ? trendsData.categories : [];
  const trendTabs = resolveHomeTrendTabs(trendCategories.length ? trendCategories : undefined);

  const allTrendHeadlines = useMemo(
    () =>
      resolveHomeTrendHeadlines(trendCategories.length ? trendCategories : undefined, activeTrendTab),
    [activeTrendTab, trendCategories],
  );

  const totalTrendCount = allTrendHeadlines.length || LOCAL_TRENDING_QUERIES.length;

  const trendingQueries = useMemo(() => {
    const source = allTrendHeadlines.length ? allTrendHeadlines : [...LOCAL_TRENDING_QUERIES];
    const limit = trendingExpanded ? TRENDING_EXPANDED : TRENDING_COLLAPSED;
    return source.slice(0, limit);
  }, [allTrendHeadlines, trendingExpanded]);

  const showSuggestPanel = open && (isEmptyTrending || flatItems.length > 0 || loading);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listId || isEmptyTrending) return;
    document.getElementById(`${listId}-item-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isEmptyTrending, listId, open]);

  useEffect(() => {
    if (hasQuery) setTrendingExpanded(false);
  }, [hasQuery]);

  if (!open) return null;

  let itemIdx = -1;

  return (
    <div className="yss-dropdown-stack" onMouseDown={(e) => e.preventDefault()}>
      {showSuggestPanel ? (
        <div
          id={listId}
          role="listbox"
          className={`yekpare-search-suggest-panel${theme === "results" ? " theme-results" : " theme-home"}`}
        >
          {isEmptyTrending ? (
            <>
              <div className="yss-trend-tabs" role="tablist" aria-label="Trend kategorileri">
                {trendTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTrendTab === tab.id}
                    className={`yss-trend-tab${activeTrendTab === tab.id ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveTrendTab(tab.id);
                      setTrendingExpanded(false);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {trendsLoading && !trendingQueries.length ? (
                <p className="yss-trend-loading" aria-live="polite">
                  Günün trendleri yükleniyor…
                </p>
              ) : null}
              <div className="yss-trend-grid">
                {trendingQueries.map((text, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <button
                      key={text}
                      id={`${listId}-item-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`yss-trend-item${isActive ? " active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect({
                          text,
                          type: "popular",
                          url: resolveSuggestionHref({ text, type: "popular" }),
                        });
                      }}
                    >
                      <ArrowUp className="yss-trend-arrow" aria-hidden />
                      <span className="yss-trend-text">{text}</span>
                    </button>
                  );
                })}
              </div>
              {totalTrendCount > TRENDING_COLLAPSED ? (
                <button
                  type="button"
                  className="yss-show-more"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTrendingExpanded((v) => !v)}
                >
                  {trendingExpanded ? "Daha az göster" : "Daha fazla göster"}
                </button>
              ) : null}
            </>
          ) : (
            <>
              {loading && flatItems.length === 0 ? (
                <div className="yekpare-search-suggest-loading">Öneriler yükleniyor…</div>
              ) : null}
              {grouped.map((group) => (
                <div key={group.section.key}>
                  <div className="yekpare-search-suggest-section-label">{group.section.label}</div>
                  {group.items.map((item) => {
                    itemIdx += 1;
                    const idx = itemIdx;
                    const { prefix, rest } = splitSuggestMatch(query, item.text);
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={`${item.type}-${item.text}-${idx}`}
                        id={`${listId}-item-${idx}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={`yekpare-search-suggest-item${isActive ? " active" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSelect(item);
                        }}
                      >
                        <TypeIcon type={item.type} />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {prefix ? (
                            <span className="yekpare-search-suggest-prefix">{prefix}</span>
                          ) : null}
                          {rest ? (
                            <span
                              className={`yekpare-search-suggest-rest${isActive ? " is-active" : ""}`}
                            >
                              {rest}
                            </span>
                          ) : (
                            <span className="font-semibold">{item.text}</span>
                          )}
                        </span>
                        <span className="yekpare-search-suggest-badge">
                          {TYPE_LABELS[item.type] ?? item.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export type UnifiedSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  theme?: "home" | "results";
  listId?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  /** Anasayfa: popup dropdown kapalı, sadece input içi ghost tamamlama */
  disableDropdown?: boolean;
  dropdownAnchorRef?: RefObject<HTMLElement | null>;
};

export function UnifiedSearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ürün, firma, hizmet veya adres ara…",
  autoFocus = false,
  theme = "home",
  listId = "yekpare-unified-search-suggest",
  className = "",
  inputClassName = "",
  ariaLabel = "Site geneli arama",
  disableDropdown = false,
  dropdownAnchorRef,
}: UnifiedSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [stackHost, setStackHost] = useState<HTMLElement | null>(null);
  const { data: trendsData } = useHomeDailyTrends();
  const { suggestions, loading } = useSearchSuggestions(value, true);

  const emptyTrendHeadlines = useMemo(() => {
    const categories = trendsData?.categories?.length ? trendsData.categories : [];
    const headlines = resolveHomeTrendHeadlines(categories.length ? categories : undefined, "trendler");
    return headlines.length ? headlines : [...LOCAL_TRENDING_QUERIES];
  }, [trendsData]);

  useEffect(() => {
    if (disableDropdown) return;
    const syncHost = () => setStackHost(dropdownAnchorRef?.current ?? null);
    syncHost();
    const id = requestAnimationFrame(syncHost);
    return () => cancelAnimationFrame(id);
  }, [disableDropdown, dropdownAnchorRef, focused, open, value]);

  useEffect(() => {
    setRecent(readRecentSearches());
  }, []);

  const displayItems = useMemo(() => {
    if (value.trim()) return suggestions;
    const recentItems = recentSearchSuggestions(recent);
    if (!recentItems.length) return suggestions;
    const seen = new Set<string>();
    const merged: SearchSuggestionItem[] = [];
    for (const item of [...recentItems, ...suggestions]) {
      const key = item.text.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    return merged;
  }, [recent, suggestions, value]);

  const flatDisplayItems = useMemo(() => {
    if (!value.trim() && theme === "home") {
      return emptyTrendHeadlines
        .slice(0, TRENDING_COLLAPSED)
        .map((text) => ({ text, type: "popular" }));
    }
    return groupSuggestionsBySection(displayItems).flatMap((group) => group.items);
  }, [displayItems, emptyTrendHeadlines, theme, value]);

  const ghostItem = useMemo(
    () => pickGhostSuggestion(value, displayItems.length ? displayItems : suggestions, activeIndex),
    [activeIndex, displayItems, suggestions, value],
  );

  const ghostHintText = !value.trim() ? (ghostItem?.text ?? pickDefaultTrendingGhost()) : "";
  const ghostInlineSuffix =
    value.trim() && ghostItem ? (completionSuffix(value, ghostItem.text) ?? "") : "";

  const showGhostHint = !value.trim() && Boolean(ghostHintText);
  const showGhostInline = Boolean(value.trim() && ghostInlineSuffix);
  const showDropdown = !disableDropdown && open && (focused || Boolean(value.trim()));
  const ghostAcceptText =
    showGhostInline && ghostItem ? ghostItem.text : showGhostHint ? ghostHintText : "";

  const navigateToSuggestion = (item: SearchSuggestionItem) => {
    const q = item.text.trim();
    if (!q) return;
    pushRecentSearch(q);
    setRecent(readRecentSearches());
    setOpen(false);
    setActiveIndex(-1);
    onChange(q);
    if (onSubmit) {
      onSubmit(q);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.href = resolveSuggestionHref(item);
    }
  };

  const handleSubmitQuery = (query: string) => {
    const q = query.trim();
    if (!q) {
      onSubmit?.("");
      return;
    }
    pushRecentSearch(q);
    setRecent(readRecentSearches());
    setOpen(false);
    setActiveIndex(-1);
    onSubmit?.(q);
  };

  const acceptGhostCompletion = () => {
    if (!ghostAcceptText) return false;
    onChange(ghostAcceptText);
    setActiveIndex(-1);
    return true;
  };

  const isCursorAtEnd = () => {
    const el = inputRef.current;
    if (!el) return true;
    return el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!disableDropdown) {
      if (e.key === "ArrowDown") {
        if (!flatDisplayItems.length) return;
        e.preventDefault();
        setOpen(true);
        setActiveIndex((idx) => (idx + 1) % flatDisplayItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        if (!flatDisplayItems.length) return;
        e.preventDefault();
        setOpen(true);
        setActiveIndex((idx) => (idx <= 0 ? flatDisplayItems.length - 1 : idx - 1));
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        return;
      }
    }
    if ((e.key === "Tab" || e.key === "ArrowRight") && ghostAcceptText && isCursorAtEnd()) {
      e.preventDefault();
      acceptGhostCompletion();
      return;
    }
    if (e.key === "Enter") {
      if (!disableDropdown && showDropdown && activeIndex >= 0 && flatDisplayItems[activeIndex]) {
        e.preventDefault();
        navigateToSuggestion(flatDisplayItems[activeIndex]!);
        return;
      }
      e.preventDefault();
      handleSubmitQuery(value);
    }
  };

  const resolvedPlaceholder = showGhostHint ? "" : placeholder;

  const stack = !disableDropdown && showDropdown ? (
    <SearchDropdownStack
      open={showDropdown}
      items={displayItems}
      activeIndex={activeIndex}
      listId={listId}
      theme={theme}
      query={value}
      loading={loading}
      onSelect={navigateToSuggestion}
    />
  ) : null;

  return (
    <>
      <div
        className={`yekpare-search-input-wrap relative min-w-0 flex-1${className ? ` ${className}` : ""}`}
      >
        <div className="yekpare-search-input-inner">
          {(showGhostHint || showGhostInline) && (
            <div className="yekpare-search-ghost-overlay" aria-hidden="true">
              {showGhostHint ? (
                <span className="yekpare-search-ghost-hint">{ghostHintText}</span>
              ) : (
                <>
                  <span className="yekpare-search-ghost-typed">{value}</span>
                  <span className="yekpare-search-ghost-completion">{ghostInlineSuffix}</span>
                </>
              )}
            </div>
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!disableDropdown) {
                setOpen(true);
                setActiveIndex(-1);
              }
            }}
            onFocus={() => {
              setFocused(true);
              if (!disableDropdown) {
                setOpen(true);
                setActiveIndex(flatDisplayItems.length ? 0 : -1);
              }
            }}
            onBlur={() => {
              if (disableDropdown) {
                setFocused(false);
                return;
              }
              setTimeout(() => {
                setFocused(false);
                setOpen(false);
              }, 180);
            }}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            autoFocus={autoFocus}
            autoComplete="off"
            role={disableDropdown ? "searchbox" : "combobox"}
            aria-expanded={disableDropdown ? undefined : showDropdown && displayItems.length > 0}
            aria-controls={disableDropdown ? undefined : listId}
            aria-autocomplete={disableDropdown ? undefined : "list"}
            aria-label={ariaLabel}
            aria-busy={loading}
            className={`yekpare-search-input-field${inputClassName ? ` ${inputClassName}` : ""}`}
          />
        </div>
      </div>
      {stackHost && stack ? createPortal(stack, stackHost) : null}
    </>
  );
}
