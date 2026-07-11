import { useRef, type FormEvent } from "react";
import { Search } from "lucide-react";
import { UnifiedSearchInput } from "@/components/search/UnifiedSearchInput.tsx";

export type SearchEngineSearchFormProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (query?: string) => void;
  searchPlaceholder?: string;
  autoFocus?: boolean;
  listId?: string;
  inputTheme?: "home" | "results";
  className?: string;
  size?: "default" | "large";
  /** Anasayfa: sadece input + ghost; sabit bandlar ayrı render edilir */
  disableDropdown?: boolean;
};

export function SearchEngineSearchForm({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Restoran, otel, firma, ürün veya adres ara…",
  autoFocus = false,
  listId = "search-engine-suggest",
  inputTheme = "home",
  className = "",
  size = "default",
  disableDropdown = false,
}: SearchEngineSearchFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    onSearchSubmit(q || undefined);
  };

  const formClass = [
    "seh-search-form",
    size === "large" ? "seh-search-form--large" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form className={formClass} onSubmit={handleSubmit}>
      <Search className="h-4 w-4 shrink-0" style={{ color: "var(--seh-muted)" }} />
      <UnifiedSearchInput
        value={searchValue}
        onChange={onSearchChange}
        onSubmit={onSearchSubmit}
        placeholder={searchPlaceholder}
        autoFocus={autoFocus}
        theme={inputTheme}
        listId={listId}
        disableDropdown={disableDropdown}
        inputClassName="min-w-0 flex-1 border-none bg-transparent text-sm font-semibold outline-none"
      />
      <button type="submit" className="seh-search-submit">
        Ara
      </button>
    </form>
  );
}
