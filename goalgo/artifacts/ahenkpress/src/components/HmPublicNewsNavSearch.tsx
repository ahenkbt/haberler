import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import "@/styles/hmNewsCategoriesMenu.css";

type HmPublicNewsNavSearchProps = {
  navOnLight: boolean;
  pillIdleBg: string;
  pillText: string;
  inputId?: string;
  className?: string;
};

function readUrlQueryParam(loc: string, key: string): string {
  const qs = new URLSearchParams((loc.split("?")[1] ?? "").trim());
  return String(qs.get(key) ?? "").trim();
}

/** HM üst bant — Son Dakika haber araması (DB + RSS hibrit). */
export function HmPublicNewsNavSearch({
  navOnLight,
  pillIdleBg,
  pillText,
  inputId = "hm-header-band-search-input",
  className = "",
}: HmPublicNewsNavSearchProps) {
  const h = useHmPublicHref();
  const [loc, navigate] = useLocation();
  const urlQuery = useMemo(() => readUrlQueryParam(loc, "q"), [loc]);
  const [value, setValue] = useState(urlQuery);

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const submit = () => {
    const q = value.trim();
    const base = h("/sondakika");
    navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base);
  };

  const inputBg = navOnLight ? "rgba(255,255,255,0.92)" : pillIdleBg;
  const btnBg = navOnLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.18)";

  return (
    <form
      className={`hm-news-nav-search hm-news-nav-search--compact shrink-0${className ? ` ${className}` : ""}`}
      role="search"
      aria-label="Haberlerde ara"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        Haberlerde ara
      </label>
      <span className="hm-news-nav-search__wrap">
        <input
          id={inputId}
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ara..."
          className="hm-news-nav-search__input"
          style={{
            background: inputBg,
            color: pillText,
          }}
        />
        <button
          type="submit"
          className="hm-news-nav-search__btn"
          style={{ background: btnBg, color: pillText }}
          aria-label="Ara"
        >
          <Search className="h-3 w-3 shrink-0" aria-hidden />
        </button>
      </span>
    </form>
  );
}
