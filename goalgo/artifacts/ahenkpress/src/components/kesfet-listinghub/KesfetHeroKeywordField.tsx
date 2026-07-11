import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  filterKesfetSearchSuggestions,
  type KesfetSearchSuggestRow,
} from "@/lib/kesfetDirectoryLookup";
import {
  KesfetHeroSuggestDropdown,
  type KesfetHeroSuggestItem,
} from "@/components/kesfet-listinghub/KesfetHeroSuggestDropdown";

export type KesfetHeroKeywordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: KesfetSearchSuggestRow[];
  onSelect: (row: KesfetSearchSuggestRow) => void;
  placeholder?: string;
  inputClassName?: string;
  listId?: string;
};

function toSuggestItems(rows: KesfetSearchSuggestRow[]): KesfetHeroSuggestItem[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    hint: row.group,
    icon: row.categoryId ? "🏷️" : "🔎",
  }));
}

export function KesfetHeroKeywordField({
  value,
  onChange,
  suggestions,
  onSelect,
  placeholder = "Firma, sektör veya hizmet",
  inputClassName,
  listId = "kesfet-hero-keyword-suggest",
}: KesfetHeroKeywordFieldProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [sugOpen, setSugOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(
    () => filterKesfetSearchSuggestions(value, suggestions),
    [suggestions, value],
  );
  const suggestItems = useMemo(() => toSuggestItems(filtered), [filtered]);

  function apply(row: KesfetSearchSuggestRow) {
    setSugOpen(false);
    setActiveIndex(-1);
    onSelect(row);
  }

  return (
    <div ref={anchorRef} className={`ss-search-input-row relative${inputClassName ? ` ${inputClassName}` : ""}`}>
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        value={value}
        role="combobox"
        aria-expanded={sugOpen && suggestItems.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setSugOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setSugOpen(true);
          setActiveIndex(filtered.length ? 0 : -1);
        }}
        onBlur={() => setTimeout(() => setSugOpen(false), 180)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            if (!suggestItems.length) return;
            e.preventDefault();
            setSugOpen(true);
            setActiveIndex((idx) => (idx + 1) % suggestItems.length);
            return;
          }
          if (e.key === "ArrowUp") {
            if (!suggestItems.length) return;
            e.preventDefault();
            setSugOpen(true);
            setActiveIndex((idx) => (idx <= 0 ? suggestItems.length - 1 : idx - 1));
            return;
          }
          if (e.key === "Escape") {
            setSugOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (e.key === "Enter" && sugOpen && activeIndex >= 0 && filtered[activeIndex]) {
            e.preventDefault();
            apply(filtered[activeIndex]);
          }
        }}
        placeholder={placeholder}
        aria-label="Ne arıyorsunuz"
      />
      <KesfetHeroSuggestDropdown
        open={sugOpen}
        anchorRef={anchorRef}
        items={suggestItems}
        activeIndex={activeIndex}
        listId={listId}
        onSelect={(item) => {
          const hit = filtered.find((row) => row.id === item.id);
          if (hit) apply(hit);
        }}
      />
    </div>
  );
}
