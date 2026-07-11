import { Search } from "lucide-react";
import { FormEvent } from "react";
import { yektubeSearchPath } from "@/lib/yektubeUrls";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (query: string) => void;
  pathHome?: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  showSubmitButton?: boolean;
  submitLabel?: string;
};

export const YEKTUBE_INLINE_SEARCH_PLACEHOLDER = "Video, kanal veya oynatma listesi ara…";

export const YEKTUBE_INLINE_SEARCH_INPUT_CLASS =
  "w-full rounded-full border border-emerald-100 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#039D55]/30";

export function YektubeTopSearchBar({
  value,
  onChange,
  onSubmit,
  pathHome,
  className = "",
  inputClassName = "",
  placeholder = "Video, kanal veya içerik ara…",
  showSubmitButton = false,
  submitLabel = "Ara",
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (onSubmit) {
      onSubmit(q);
      return;
    }
    if (q) {
      window.location.href = yektubeSearchPath(pathHome, q);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 ${showSubmitButton ? "" : "relative"} ${className}`}
    >
      <div className={`relative min-w-0 flex-1 ${showSubmitButton ? "" : "w-full"}`}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f766e]/80" />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            inputClassName ||
            "w-full min-w-[10rem] rounded-full border border-emerald-100/80 bg-white/70 py-1.5 pl-9 pr-3 text-xs text-slate-800 backdrop-blur placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#039D55]/30 sm:w-52 lg:w-64"
          }
        />
      </div>
      {showSubmitButton ? (
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#039D55] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#028347] focus:outline-none focus:ring-2 focus:ring-[#039D55]/40"
        >
          {submitLabel}
        </button>
      ) : null}
    </form>
  );
}

export default YektubeTopSearchBar;
