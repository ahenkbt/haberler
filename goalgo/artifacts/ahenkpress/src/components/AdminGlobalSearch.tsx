import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { searchAdminIndex, type AdminSearchEntry } from "@/lib/adminSearchIndex";

type Props = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

export function AdminGlobalSearch({
  className = "",
  inputClassName = "",
  placeholder = "Panelde ara: Gemini, haberler, turizm, ayarlar…",
  autoFocus = false,
}: Props) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchAdminIndex(query, 10), [query]);

  useEffect(() => {
    if (autoFocus) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [autoFocus]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const goTo = useCallback(
    (entry: AdminSearchEntry) => {
      setOpen(false);
      setQuery("");
      navigate(entry.href);
    },
    [navigate],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!results.length) return;
      setActiveIdx((i) => (i + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIdx] ?? results[0];
      if (pick) goTo(pick);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-[#e61e25] focus:bg-white focus:ring-2 focus:ring-[#e61e25]/15 ${inputClassName}`}
          aria-label="Yönetim panelinde ara"
          aria-expanded={showDropdown}
          aria-controls="admin-global-search-results"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Aramayı temizle"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <ul
          id="admin-global-search-results"
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-[min(360px,60dvh)] w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-gray-500">Sonuç bulunamadı. Farklı bir anahtar kelime deneyin.</li>
          ) : (
            results.map((entry, idx) => {
              const Icon = entry.icon;
              const active = idx === activeIdx;
              return (
                <li key={entry.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => goTo(entry)}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition ${
                      active ? "bg-red-50 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-[#e61e25]" : "text-gray-400"}`} />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug">{entry.title}</span>
                      <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">{entry.description}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
