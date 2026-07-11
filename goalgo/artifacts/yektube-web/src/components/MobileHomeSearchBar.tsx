import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { ytRoutes } from "@/lib/routes";
import { cn } from "@/lib/cn";

export function MobileHomeSearchBar({
  compact = false,
  inline = false,
  className,
}: {
  compact?: boolean;
  inline?: boolean;
  className?: string;
}) {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");

  return (
    <form
      className={cn(
        "m-0",
        inline ? "min-w-0 flex-1" : compact ? "px-2 pb-1.5" : "px-3 py-1.5",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const q = input.trim();
        if (q) setLocation(ytRoutes.search(q));
      }}
    >
      <label
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border border-[var(--color-yt-input-border)] yt-input px-3",
          !inline && !compact && "py-0.5",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--color-yt-muted)]" aria-hidden />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Video, kanal veya oynatma listesi ara…"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm outline-none",
            compact ? "h-full py-0" : "py-2",
          )}
          enterKeyHint="search"
        />
      </label>
    </form>
  );
}
