import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  fetchNewsmapLocationWikiSummary,
  resolveNewsmapWikiQueryLabel,
  type NewsmapWikiSummary,
} from "@/lib/newsmapLocationWiki";

type NewsmapLocationInfoPanelProps = {
  locationLabel: string | null;
  bilgiHref?: string | null;
  /** Şehir kartı gövdesinde — hero üst panelde, burada yalnızca metin. */
  variant?: "standalone" | "embedded";
  wikiOverride?: NewsmapWikiSummary | null;
  wikiLoading?: boolean;
};

/** Konum paneli — Bilgi sekmesi: Wikipedia özeti (işletme listesinden ayrı). */
export function NewsmapLocationInfoPanel({
  locationLabel,
  bilgiHref = null,
  variant = "standalone",
  wikiOverride,
  wikiLoading: wikiLoadingOverride,
}: NewsmapLocationInfoPanelProps) {
  const [wikiLocal, setWikiLocal] = useState<NewsmapWikiSummary | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const useExternalWiki = wikiOverride !== undefined || wikiLoadingOverride !== undefined;
  const wiki = useExternalWiki ? (wikiOverride ?? null) : wikiLocal;
  const loading = useExternalWiki ? Boolean(wikiLoadingOverride) : loadingLocal;

  useEffect(() => {
    if (useExternalWiki) return;
    const query = resolveNewsmapWikiQueryLabel(locationLabel);
    if (query.length < 2) {
      setWikiLocal(null);
      setLoadingLocal(false);
      return;
    }
    let cancelled = false;
    setLoadingLocal(true);
    void fetchNewsmapLocationWikiSummary(locationLabel)
      .then((result) => {
        if (!cancelled) setWikiLocal(result);
      })
      .catch(() => {
        if (!cancelled) setWikiLocal(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingLocal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationLabel, useExternalWiki]);

  const label = resolveNewsmapWikiQueryLabel(locationLabel);

  if (!label) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-600">Konum seçin</p>
        <p className="mt-1 text-xs text-slate-400">Haritadan bir şehir veya bölge seçerek bilgi görüntüleyin.</p>
      </div>
    );
  }

  if (loading && !wiki) {
    return (
      <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 px-6 py-10">
        <p className="text-center text-sm font-semibold leading-relaxed text-slate-600">
          Şu anda bilgiler getiriliyor, lütfen bekleyiniz...
        </p>
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 text-4xl opacity-40">ℹ️</div>
        <p className="text-sm font-bold text-slate-700">Bu konum için Wikipedia özeti bulunamadı</p>
        {bilgiHref ? (
          <Link
            href={bilgiHref}
            className="mt-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
          >
            Bilgi Ağacı&apos;nda ara
          </Link>
        ) : null}
      </div>
    );
  }

  if (variant === "embedded") {
    return (
      <div className="newsmap-location-panel__wiki px-4 py-3">
        <p className="newsmap-location-panel__wiki-label">Wikipedia</p>
        <p className="newsmap-location-panel__wiki-title">{wiki.title}</p>
        <p className="newsmap-location-panel__wiki-summary">{wiki.summary}</p>
        <div className="newsmap-location-panel__wiki-actions">
          {wiki.url ? (
            <a
              href={wiki.url}
              target="_blank"
              rel="noopener noreferrer"
              className="newsmap-location-panel__wiki-link"
            >
              Wikipedia&apos;da oku →
            </a>
          ) : null}
          {bilgiHref ? (
            <Link href={bilgiHref} className="newsmap-location-panel__bilgi-link">
              Bilgi Ağacı
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
        {wiki.image ? (
          <div className="relative h-32 overflow-hidden">
            <img src={wiki.image} alt={wiki.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <p className="absolute bottom-2 left-3 text-sm font-bold text-white">{wiki.title}</p>
          </div>
        ) : (
          <div className="border-b border-indigo-50 px-3 py-2">
            <p className="text-sm font-bold text-slate-900">{wiki.title}</p>
          </div>
        )}
        <div className="px-3 py-3">
          <p className="text-xs leading-relaxed text-slate-600">{wiki.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wiki.url ? (
              <a
                href={wiki.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                Wikipedia&apos;da oku →
              </a>
            ) : null}
            {bilgiHref ? (
              <Link
                href={bilgiHref}
                className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
              >
                Bilgi Ağacı
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <p className="px-1 text-[10px] text-slate-400">
        📍 {label} — Vikipedi özeti
      </p>
    </div>
  );
}
