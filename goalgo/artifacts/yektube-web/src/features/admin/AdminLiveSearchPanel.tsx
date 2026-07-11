import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  adminBootstrapLiveTv,
  adminImportAllLiveCategories,
  adminImportLiveYoutubeSearch,
  adminNormalizeLiveSources,
  adminSearchLiveYoutube,
  fetchLiveTvCategories,
  type LiveTvSearchCategory,
  type YoutubeLiveSearchHit,
} from "@/lib/adminApi";
import { AdminBtn, AdminCard, AdminField, AdminInput, AdminSelect } from "./ui/adminUi";
import { Loader2, Search, Wrench, Download, Layers } from "lucide-react";
import { videoThumbUrl } from "@/lib/constants";

type Props = {
  onMessage: (text: string, isError?: boolean) => void;
};

export function AdminLiveSearchPanel({ onMessage }: Props) {
  const qc = useQueryClient();
  const [categories, setCategories] = useState<LiveTvSearchCategory[]>([]);
  const [categoryKey, setCategoryKey] = useState("haber");
  const [query, setQuery] = useState("haber");
  const [limit, setLimit] = useState(15);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [hits, setHits] = useState<YoutubeLiveSearchHit[]>([]);

  useEffect(() => {
    void fetchLiveTvCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const cat = categories.find((c) => c.key === categoryKey);
    if (cat) setQuery(cat.defaultQuery);
  }, [categoryKey, categories]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-sources"] });
    void qc.invalidateQueries({ queryKey: ["yektube-live"] });
  };

  const runSearch = async () => {
    setSearching(true);
    try {
      const res = await adminSearchLiveYoutube(query, limit);
      setHits(res.items ?? []);
      onMessage(res.items?.length ? `${res.items.length} canlı yayın bulundu` : "Canlı yayın bulunamadı");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Arama başarısız", true);
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  const runImport = async (opts?: { categoryKey?: string; query?: string }) => {
    setImporting(true);
    try {
      const res = await adminImportLiveYoutubeSearch({
        categoryKey: opts?.categoryKey ?? categoryKey,
        query: opts?.query ?? query,
        limit,
      });
      onMessage(res.message ?? `${res.added ?? 0} eklendi, ${res.skipped ?? 0} atlandı`);
      invalidate();
      if ((res.added ?? 0) > 0) setHits([]);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "İçe aktarma başarısız", true);
    } finally {
      setImporting(false);
    }
  };

  const runNormalize = async () => {
    setNormalizing(true);
    try {
      const res = await adminNormalizeLiveSources();
      onMessage(res.message ?? `${res.updated ?? 0} kaynak onarıldı`);
      invalidate();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Onarım başarısız", true);
    } finally {
      setNormalizing(false);
    }
  };

  const runBootstrap = async () => {
    setBootstrapping(true);
    try {
      const res = await adminBootstrapLiveTv();
      onMessage(res.message ?? "Canlı TV kurulumu tamamlandı");
      invalidate();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Kurulum başarısız", true);
    } finally {
      setBootstrapping(false);
    }
  };

  const runImportAll = async () => {
    setImportingAll(true);
    try {
      const res = await adminImportAllLiveCategories(limit);
      const detail =
        res.details?.filter((d) => d.added > 0).map((d) => `${d.label}:${d.added}`).join(", ") ?? "";
      onMessage(
        res.message ?? `${res.added ?? 0} kanal eklendi` + (detail ? ` (${detail})` : ""),
      );
      invalidate();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Toplu içe aktarma başarısız", true);
    } finally {
      setImportingAll(false);
    }
  };

  return (
    <AdminCard
      title="YouTube arama ile canlı TV ekle"
      description="YouTube'da aradığınız gibi kelime yazın (ör. haber), kategori seçin ve canlı yayınları içe aktarın."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <AdminBtn variant="primary" disabled={bootstrapping || importingAll} onClick={() => void runBootstrap()}>
          {bootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 shrink-0" />}
          <span className="yt-admin-btn-label">{bootstrapping ? "Kuruluyor…" : "Canlı TV'yi kur (preset + kategoriler)"}</span>
        </AdminBtn>
        <AdminBtn variant="secondary" disabled={importingAll || bootstrapping} onClick={() => void runImportAll()}>
          {importingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4 shrink-0" />}
          <span className="yt-admin-btn-label">
            {importingAll ? "Ekleniyor…" : "7 kategoriyi tara ve ekle"}
          </span>
        </AdminBtn>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => {
          const active = categoryKey === c.key;
          return (
            <button
              key={c.key}
              type="button"
              disabled={importing}
              onClick={() => {
                setCategoryKey(c.key);
                setQuery(c.defaultQuery);
                void runImport({ categoryKey: c.key, query: c.defaultQuery });
              }}
              style={{
                color: active ? "#ffffff" : "#374151",
                WebkitTextFillColor: active ? "#ffffff" : "#374151",
                backgroundColor: active ? "#dc2626" : "#ffffff",
                borderColor: active ? "#dc2626" : "#cbd5e1",
              }}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              {c.label} — canlı ekle
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label="Kategori">
          <AdminSelect value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} → {c.categorySlug}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label="Sonuç limiti">
          <AdminSelect value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
            {[10, 15, 20, 30, 40, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      </div>

      <div className="mt-3">
        <AdminField label="Arama kelimesi" hint="YouTube search_query gibi: haber, yaşam, film, radyo, doğa, komedi">
          <AdminInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="haber" />
        </AdminField>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminBtn variant="secondary" disabled={searching || importing} onClick={() => void runSearch()}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 shrink-0" />}
          <span className="yt-admin-btn-label">{searching ? "Aranıyor…" : "Canlı ara (önizle)"}</span>
        </AdminBtn>
        <AdminBtn variant="primary" disabled={importing || searching} onClick={() => void runImport()}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className="yt-admin-btn-label">{importing ? "Ekleniyor…" : "Bulunanları içe aktar"}</span>
        </AdminBtn>
        <AdminBtn variant="secondary" disabled={normalizing} onClick={() => void runNormalize()}>
          {normalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4 shrink-0" />}
          <span className="yt-admin-btn-label">{normalizing ? "Onarılıyor…" : "Kapak / video ID onar"}</span>
        </AdminBtn>
      </div>

      {hits.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-3 py-2">Kapak</th>
                <th className="px-3 py-2">Kanal / başlık</th>
                <th className="px-3 py-2">Video ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hits.map((h) => (
                <tr key={h.videoId}>
                  <td className="px-3 py-2">
                    <img
                      src={h.thumbnail || videoThumbUrl(h.videoId, "mq")}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-900">{h.channelTitle || h.title}</p>
                    <p className="truncate text-xs text-zinc-500">{h.title}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-600">{h.videoId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminCard>
  );
}
