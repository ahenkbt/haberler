import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPublicJson } from "@/lib/fetchPublicJson";

type SearchAiResponse = {
  success?: boolean;
  query?: string;
  aiSummary?: string | null;
  aiModel?: string | null;
  internetSearchEnabled?: boolean;
  searchMeta?: { ai?: { detail?: string; timedOut?: boolean } };
};

/**
 * Yekpare AI arama sekmesi — birleşik aramada özet gelmediyse /api/search/ai ile tetikler.
 */
export function useSearchAiTabSummary(options: {
  query: string;
  active: boolean;
  existingSummary: string | null;
}) {
  const [tabAiSummary, setTabAiSummary] = useState<string | null>(null);
  const [tabAiLoading, setTabAiLoading] = useState(false);
  const [tabAiError, setTabAiError] = useState<string | null>(null);
  const attemptRef = useRef("");

  const fetchAi = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setTabAiSummary(null);
      setTabAiError(null);
      return;
    }
    if (attemptRef.current === trimmed) return;
    attemptRef.current = trimmed;
    setTabAiLoading(true);
    setTabAiError(null);
    try {
      const { ok, data } = await fetchPublicJson<SearchAiResponse>(
        `/api/search/ai?q=${encodeURIComponent(trimmed)}`,
      );
      if (!ok || !data?.success) {
        setTabAiError("Yekpare AI yanıtı alınamadı.");
        setTabAiSummary(null);
        return;
      }
      const summary = typeof data.aiSummary === "string" ? data.aiSummary.trim() : "";
      if (summary) {
        setTabAiSummary(summary);
        return;
      }
      const detail = data.searchMeta?.ai?.detail;
      setTabAiError(
        typeof detail === "string" && detail.trim()
          ? detail.trim()
          : "Yekpare AI bu sorgu için özet üretemedi.",
      );
      setTabAiSummary(null);
    } catch {
      setTabAiError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setTabAiSummary(null);
    } finally {
      setTabAiLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = options.query.trim();
    if (!options.active || !q) {
      setTabAiLoading(false);
      return;
    }
    const existing = options.existingSummary?.trim();
    if (existing) {
      setTabAiSummary(existing);
      setTabAiLoading(false);
      setTabAiError(null);
      attemptRef.current = q;
      return;
    }
    if (attemptRef.current !== q) {
      setTabAiSummary(null);
      setTabAiError(null);
      attemptRef.current = "";
    }
    void fetchAi(q);
  }, [options.active, options.existingSummary, options.query, fetchAi]);

  const retry = useCallback(() => {
    const q = options.query.trim();
    if (!q) return;
    attemptRef.current = "";
    void fetchAi(q);
  }, [fetchAi, options.query]);

  const existing = options.existingSummary?.trim();
  return {
    summary: existing || tabAiSummary,
    loading: tabAiLoading && !existing,
    error: tabAiError,
    retry,
  };
}
