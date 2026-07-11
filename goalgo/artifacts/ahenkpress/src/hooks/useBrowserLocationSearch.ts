import { useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function emitAll(): void {
  for (const fn of listeners) fn();
}

let historyPatched = false;

function ensureHistoryListeners(): void {
  if (typeof window === "undefined" || historyPatched) return;
  historyPatched = true;
  window.addEventListener("popstate", emitAll);
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    const ret = originalPush(...args);
    queueMicrotask(emitAll);
    return ret;
  };
  history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
    const ret = originalReplace(...args);
    queueMicrotask(emitAll);
    return ret;
  };
}

function subscribe(onStoreChange: () => void): () => void {
  ensureHistoryListeners();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSearchSnapshot(): string {
  return typeof window !== "undefined" ? window.location.search : "";
}

function getServerSearchSnapshot(): string {
  return "";
}

/**
 * Wouter `useLocation()` çoğu zaman yalnızca pathname verir; `?hmTab=` gibi sorgu dizgisini içermez.
 * SPA içinde yalnızca arama parametreleri değişince bile yeniden okuma için `window.location.search` ile senkron kalır.
 */
export function useBrowserLocationSearch(): string {
  return useSyncExternalStore(subscribe, getSearchSnapshot, getServerSearchSnapshot);
}

export function useHmTabQueryParam(): string {
  const search = useBrowserLocationSearch();
  return useMemo(() => {
    const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    return (q.get("hmTab") ?? "").trim().toLowerCase();
  }, [search]);
}

export function useSiteIdQueryParam(): number | null {
  const search = useBrowserLocationSearch();
  return useMemo(() => {
    const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const v = q.get("siteId");
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [search]);
}
