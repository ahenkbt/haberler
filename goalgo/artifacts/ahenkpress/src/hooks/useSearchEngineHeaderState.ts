import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { pushRecentSearch } from "@/hooks/useSearchSuggestions";
import { buildUnifiedSearchHref, isUnifiedSearchPath } from "@/lib/hmUnifiedSearchPath";
import { buildMapSearchHref } from "@/lib/haritalarNav";
import { yektubeSearchPath } from "@/lib/yektubeUrls";

function isMapChromePath(path: string): boolean {
  return path === "/map" || path === "/maps" || path === "/haritalar" || path.startsWith("/haritalar/");
}

function isYektubeChromePath(path: string): boolean {
  return (
    path === "/yektube" ||
    path.startsWith("/yektube/") ||
    path === "/canlitv" ||
    path.startsWith("/canlitv/")
  );
}

export function useSearchEngineHeaderState() {
  const [loc] = useLocation();
  const path = (loc.split("?")[0] ?? "").trim();
  const urlQ = new URLSearchParams(loc.split("?")[1] ?? "").get("q") ?? "";
  const [searchValue, setSearchValue] = useState(urlQ);

  useEffect(() => {
    if (isUnifiedSearchPath(path) || isMapChromePath(path) || isYektubeChromePath(path)) {
      setSearchValue(urlQ);
    }
  }, [path, urlQ]);

  const onSearchSubmit = useCallback(
    (q?: string) => {
      const query = (q ?? searchValue).trim();
      if (query) pushRecentSearch(query);
      if (isMapChromePath(path)) {
        window.location.href = query ? buildMapSearchHref({ q: query }) : "/map";
        return;
      }
      if (isYektubeChromePath(path)) {
        window.location.href = yektubeSearchPath(undefined, query || undefined);
        return;
      }
      window.location.href = buildUnifiedSearchHref({ q: query || undefined });
    },
    [path, searchValue],
  );

  return { searchValue, setSearchValue, onSearchSubmit };
}
