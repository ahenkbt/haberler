import { SearchEngineSearchForm } from "@/components/SearchEngineSearchForm";
import { useSearchEngineHeaderState } from "@/hooks/useSearchEngineHeaderState";
import { YEKPARE_SLOGAN } from "@/lib/kesfetDiscoverHub";
import { Search } from "lucide-react";
import "@/styles/searchEngineHeader.css";

type HmNewsSearchBoxProps = {
  accent?: string;
  className?: string;
};

/** HM anasayfa — Yekpare birleşik arama (web + platform). */
export function HmNewsSearchBox({ accent = "#e61e25", className = "" }: HmNewsSearchBoxProps) {
  const { searchValue, setSearchValue, onSearchSubmit } = useSearchEngineHeaderState();

  return (
    <section
      className={`hm-news-search-box hm-vitrin-card overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 ${className}`}
      style={{ ["--hm-accent" as string]: accent }}
      aria-label="Yekpare arama"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: accent }}
          aria-hidden
        >
          <Search className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: accent }}>
            Yekpare Arama
          </p>
          <h2 className="text-base font-black text-slate-950 sm:text-lg">Web ve Yekpare&apos;de ara</h2>
        </div>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-slate-600">{YEKPARE_SLOGAN}</p>
      <SearchEngineSearchForm
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchSubmit={onSearchSubmit}
        searchPlaceholder="Haber, firma, ürün veya konu ara…"
        listId="hm-news-search-suggest"
        inputTheme="home"
        size="large"
        className="hm-news-search-box__form"
      />
    </section>
  );
}
