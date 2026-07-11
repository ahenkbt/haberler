import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { ExternalLink, FileJson2 } from "lucide-react";

type HmSiteRow = {
  id: number;
  slug: string;
  displayName: string;
  active: boolean;
};

async function fetchSites(): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/sites"));
  const raw = await r.text();
  let j: { items?: HmSiteRow[]; error?: string } = {};
  try {
    j = JSON.parse(raw) as typeof j;
  } catch {
    /* */
  }
  if (!r.ok) {
    throw new Error(j.error || raw || `HTTP ${r.status}`);
  }
  return { items: Array.isArray(j.items) ? j.items : [] };
}

type PreviewRow = {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  categoryResolved: boolean;
  status: string;
  date?: string;
  hasFeaturedImage: boolean;
  imageCountInBody: number;
  skipReason?: string;
};

type ImportOk = {
  ok: true;
  siteId: number;
  siteSlug: string;
  dryRun: boolean;
  itemsTotal: number;
  itemsProcessed: number;
  newsAdded: number;
  newsSkipped: number;
  skippedDuplicates: number;
  imagesDownloaded: number;
  warnings: string[];
  preview?: PreviewRow[];
  hasMore: boolean;
  nextOffset: number;
  log: string[];
};

/** Vercel Edge vekili ~10–25s; görsel indirmeli isteklerde küçük tutulmalı. */
const BATCH_LIMIT = 4;

type CategoryRow = { id: number; name: string; slug: string };

type CategoryOverrideMode = "auto" | "all" | "fallback";

async function fetchCategoriesForSite(siteId: number): Promise<CategoryRow[]> {
  await ensureAdminPanelBootstrap();
  const res = await apiFetch(apiUrl(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`));
  if (!res.ok) throw new Error(await res.text());
  const rows = (await res.json()) as CategoryRow[];
  return Array.isArray(rows) ? rows : [];
}

export default function HmHaberIceAktar() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/hm/sites"],
    queryFn: fetchSites,
    retry: false,
  });
  const items = data?.items ?? [];

  const [sitePick, setSitePick] = useState<Record<number, boolean>>({});
  const [categoryPick, setCategoryPick] = useState("");
  const [categoryOverrideMode, setCategoryOverrideMode] = useState<CategoryOverrideMode>("auto");
  const [newsFiles, setNewsFiles] = useState<File[]>([]);
  const [skipImages, setSkipImages] = useState(false);
  const [allowDuplicateTitles, setAllowDuplicateTitles] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<ImportOk[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedSiteIds = useMemo(
    () => items.filter((s) => sitePick[s.id]).map((s) => s.id),
    [items, sitePick],
  );

  const categorySiteId = selectedSiteIds[0] ?? null;

  const { data: siteCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories", "ahb-import", categorySiteId],
    queryFn: () => fetchCategoriesForSite(categorySiteId!),
    enabled: categorySiteId != null && categorySiteId > 0,
    retry: false,
  });

  const validateFiles = (): boolean => {
    setErr("");
    if (selectedSiteIds.length === 0) {
      setErr("En az bir haber sitesi işaretleyin.");
      return false;
    }
    if (categoryOverrideMode !== "auto" && !categoryPick) {
      setErr(
        "«Tek kategori (tümü)» veya «Varsayılan (eşleşmeyenler)» için hedef kategori seçin.",
      );
      return false;
    }
    if (newsFiles.length === 0) {
      setErr("En az bir AHB haber JSON dosyası seçin (ahb-export-haber-*.json).");
      return false;
    }
    return true;
  };

  const postImport = async (
    sid: number,
    opts: { dryRun: boolean; offset: number },
  ): Promise<ImportOk | { error: string; log?: string[] }> => {
    const fd = new FormData();
    fd.append("siteId", String(sid));
    fd.append("dryRun", opts.dryRun ? "true" : "false");
    fd.append("offset", String(opts.offset));
    fd.append("limit", String(opts.dryRun ? 250 : BATCH_LIMIT));
    for (const f of newsFiles) {
      fd.append("news", f);
    }
    if (categoryOverrideMode !== "auto" && categoryPick) {
      fd.append("categoryId", categoryPick);
      fd.append("categoryOverride", categoryOverrideMode);
    }
    if (skipImages) fd.append("skipImages", "true");
    if (allowDuplicateTitles) fd.append("allowDuplicateTitles", "true");
    const r = await apiFetch(apiUrl("/api/hm/import-ahb-haber"), {
      method: "POST",
      body: fd,
    });
    const raw = await r.text();
    let j: (ImportOk & { error?: string }) | null = null;
    try {
      j = JSON.parse(raw) as ImportOk & { error?: string };
    } catch {
      /* */
    }
    if (!r.ok) {
      return { error: j?.error || raw.slice(0, 400) || `HTTP ${r.status}`, log: j?.log };
    }
    if (!j?.ok) {
      return { error: raw.slice(0, 400) || "Beklenmeyen yanıt" };
    }
    return j;
  };

  const runDryRunPreview = async () => {
    if (!validateFiles()) return;
    setBusy(true);
    setErr("");
    setPreview([]);
    setResults([]);
    try {
      await ensureAdminPanelBootstrap();
      const sid = selectedSiteIds[0]!;
      const j = await postImport(sid, { dryRun: true, offset: 0 });
      if ("error" in j) {
        setErr(j.error);
        return;
      }
      setPreview(j.preview ?? []);
      if ((j.preview?.length ?? 0) === 0) {
        setErr("Önizleme boş — JSON items dizisini kontrol edin.");
      }
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  };

  const runImportForSelectedSites = async () => {
    setConfirmOpen(false);
    setErr("");
    setResults([]);
    setPreview([]);
    setBusy(true);
    setImportProgress("");
    const acc: ImportOk[] = [];
    const errLines: string[] = [];
    try {
      await ensureAdminPanelBootstrap();
      for (const sid of selectedSiteIds) {
        const site = items.find((x) => x.id === sid);
        const label = site ? `${site.displayName} (${site.slug})` : `#${sid}`;
        let offset = 0;
        let merged: ImportOk | null = null;
        let guard = 0;
        while (guard < 500) {
          guard += 1;
          const totalHint = merged?.itemsTotal ?? "…";
          setImportProgress(`${label}: ${offset} / ${totalHint} kayıt işleniyor…`);
          const j = await postImport(sid, { dryRun: false, offset });
          if ("error" in j) {
            errLines.push(`${label}: ${j.error}`);
            break;
          }
          if (!merged) {
            merged = {
              ...j,
              newsAdded: 0,
              newsSkipped: 0,
              skippedDuplicates: 0,
              imagesDownloaded: 0,
              log: [],
              warnings: [],
            };
          }
          merged.newsAdded += j.newsAdded;
          merged.newsSkipped += j.newsSkipped;
          merged.skippedDuplicates += j.skippedDuplicates ?? 0;
          merged.imagesDownloaded += j.imagesDownloaded;
          merged.log.push(...(j.log ?? []));
          merged.warnings.push(...(j.warnings ?? []));
          merged.hasMore = j.hasMore;
          merged.nextOffset = j.nextOffset;
          if (!j.hasMore) break;
          offset = j.nextOffset;
        }
        if (merged) acc.push(merged);
      }
      setResults(acc);
      if (errLines.length > 0) setErr(errLines.join("\n"));
      if (acc.length > 0) {
        await qc.invalidateQueries({ queryKey: ["/api/hm/sites"] });
      }
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setBusy(false);
      setImportProgress("");
    }
  };

  const openConfirm = (dryRun: boolean) => {
    if (!validateFiles()) return;
    if (dryRun) {
      void runDryRunPreview();
      return;
    }
    setConfirmOpen(true);
  };

  const previewStats = useMemo(() => {
    const byCat = new Map<string, number>();
    let unresolved = 0;
    let duplicateTitles = 0;
    for (const p of preview) {
      byCat.set(p.categorySlug, (byCat.get(p.categorySlug) ?? 0) + 1);
      if (!p.categoryResolved) unresolved += 1;
      if (p.skipReason === "atlanacak (aynı başlık)") duplicateTitles += 1;
    }
    return { byCat, unresolved, duplicateTitles, total: preview.length };
  }, [preview]);

  return (
    <AdminLayout title="Haber aktar (AHB JSON)">
      <div className="space-y-8 max-w-4xl">
        <div className="bg-white border rounded-lg p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <FileJson2 className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">AHB haber içe aktarımı</h2>
              <p className="text-sm text-gray-600 mt-1">
                <code className="text-xs bg-gray-100 px-1 rounded">ahb-export-haber-*.json</code> dosyalarını HM
                haber sitesine aktarır. Kayıtlar <strong>news</strong> tablosuna yazılır; görseller uzaktan indirilip{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">/api/media/uploads</code> altına kaydedilir. Aynı
                başlık (büyük/küçük harf ve fazla boşluk yok sayılır) veya aynı AHB haber kimliği (
                <code className="text-xs bg-gray-100 px-1 rounded">ahb-haber:…</code>) tekrar eklenmez.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Kategori: AHB slug’ları (Gundem, oZEL, Ankara, Ekonomi) Goalgo slug’larına eşlenir (ör. oZEL →{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">ozel-haber</code>). Eşleşmezse aşağıdan varsayılan
                kategori seçin. İstekler turknet.app üzerinden Vercel vekili ile Railway’e gider; içe aktarım{" "}
                {BATCH_LIMIT} haber/istek parçalar halinde otomatik devam eder.
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-gray-500 text-sm">Siteler yükleniyor…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error instanceof Error ? error.message : String(error)}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-amber-800">Önce bir haber sitesi oluşturun: Haber siteleri (HM).</p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Hedef haber sitesi *</Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Ankara Şehir Gazetesi içe aktarımı için ilgili HM sitesini seçin (ör. ankarasehirgazetesi).
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {items.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={!!sitePick[s.id]}
                        onCheckedChange={(c) =>
                          setSitePick((p) => ({ ...p, [s.id]: c === true }))
                        }
                      />
                      <span>
                        {s.displayName}{" "}
                        <span className="text-gray-400">
                          ({s.slug}){s.active ? "" : " — pasif"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {selectedSiteIds.length > 0 ? (
                  <div className="text-xs text-gray-500 mt-3 space-y-1">
                    <span className="font-semibold text-gray-600">Önizleme bağlantısı:</span>
                    {items
                      .filter((s) => selectedSiteIds.includes(s.id))
                      .map((s) => (
                        <div key={s.id}>
                          <Link
                            href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(s.slug)}?siteId=${s.id}`}
                            className="text-red-600 hover:underline inline-flex items-center gap-0.5"
                            target="_blank"
                          >
                            {s.displayName}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>

              {selectedSiteIds.length > 0 ? (
                <div
                  className="rounded-lg border-2 border-red-300 bg-red-50/50 p-4 space-y-4"
                  data-testid="ahb-category-mapping"
                >
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Kategori eşlemesi</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Mod ve hedef kategori (liste:{" "}
                      {items.find((s) => s.id === categorySiteId)?.displayName ?? "ilk seçili site"}). Önizleme de bu
                      siteye göre çalışır.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-700">Mod</Label>
                      <Select
                        value={categoryOverrideMode}
                        onValueChange={(v) => {
                          const mode = v as CategoryOverrideMode;
                          setCategoryOverrideMode(mode);
                          if (mode === "auto") setCategoryPick("");
                        }}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Otomatik (JSON)</SelectItem>
                          <SelectItem value="all">Tek kategori (tümü)</SelectItem>
                          <SelectItem value="fallback">Varsayılan (eşleşmeyenler)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-700">Hedef kategori</Label>
                      <Select
                        value={categoryPick}
                        onValueChange={setCategoryPick}
                        disabled={categoryOverrideMode === "auto" || categoriesLoading}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue
                            placeholder={
                              categoryOverrideMode === "auto"
                                ? "Otomatik mod — seçim gerekmez"
                                : categoriesLoading
                                  ? "Kategoriler yükleniyor…"
                                  : "Site kategorisi seçin"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {siteCategories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name} ({c.slug})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!categoriesLoading && siteCategories.length === 0 ? (
                    <p className="text-xs text-amber-900 font-medium">
                      Bu site için kategori bulunamadı. Önce{" "}
                      <Link href="/admin/haber-kategorileri" className="text-red-700 underline">
                        Haber kategorileri
                      </Link>{" "}
                      bölümünden ekleyin.
                    </p>
                  ) : null}
                  {previewStats.unresolved > 0 && categoryOverrideMode === "auto" ? (
                    <p className="text-xs text-amber-900">
                      Önizlemede {previewStats.unresolved} kayıt için kategori eşleşmedi — modu «Varsayılan
                      (eşleşmeyenler)» yapıp hedef kategori seçin.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3">
                  Hedef site işaretleyince <strong>Kategori eşlemesi</strong> (mod + site kategorileri) burada görünür.
                </p>
              )}

              <div className="space-y-3">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Seçenekler</Label>
                <label className="flex items-start gap-2 text-sm cursor-pointer max-w-lg">
                  <Checkbox checked={skipImages} onCheckedChange={(c) => setSkipImages(c === true)} className="mt-0.5" />
                  <span>Görselleri bu turda indirme (uzak URL bırak) — Vercel zaman aşımı riskini azaltır.</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer max-w-lg">
                  <Checkbox
                    checked={allowDuplicateTitles}
                    onCheckedChange={(c) => setAllowDuplicateTitles(c === true)}
                    className="mt-0.5"
                  />
                  <span>Aynı başlığı yine de içe aktar (AHB kimliği tekrarı yine eklenmez).</span>
                </label>
              </div>

              <div>
                <Label>Haber JSON dosyaları *</Label>
                <input
                  type="file"
                  accept=".json,application/json"
                  multiple
                  className="mt-1 block w-full max-w-md text-sm"
                  onChange={(e) => setNewsFiles(Array.from(e.target.files ?? []))}
                />
                {newsFiles.length > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {newsFiles.length} dosya: {newsFiles.map((f) => f.name).join(", ")}
                  </p>
                ) : null}
              </div>

              {err ? (
                <pre className="text-sm text-red-700 whitespace-pre-wrap break-words bg-red-50 border border-red-100 rounded p-3">
                  {err}
                </pre>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => openConfirm(true)}
                >
                  {busy ? "İşleniyor…" : "Kuru çalıştır (önizleme)"}
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => openConfirm(false)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  İçe aktar
                </Button>
              </div>

              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Haber içe aktarmayı onaylayın</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-left">
                        <p>
                          <strong>{newsFiles.length}</strong> JSON dosyası,{" "}
                          <strong>{selectedSiteIds.length}</strong> siteye parça parça yazılacak ({BATCH_LIMIT} haber /
                          istek{skipImages ? ", görseller atlanacak" : ", görseller indirilecek"}).
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-700">
                          {items
                            .filter((s) => selectedSiteIds.includes(s.id))
                            .map((s) => (
                              <li key={s.id}>
                                {s.displayName} ({s.slug})
                              </li>
                            ))}
                        </ul>
                        <p className="text-sm text-gray-700">
                          Kategori:{" "}
                          {categoryOverrideMode === "auto"
                            ? "Otomatik (JSON)"
                            : (() => {
                                const c = siteCategories.find((x) => String(x.id) === categoryPick);
                                const label = c ? `${c.name} (${c.slug})` : categoryPick ? `#${categoryPick}` : "— seçilmedi";
                                return categoryOverrideMode === "fallback"
                                  ? `${label} — yalnızca eşleşmeyenler`
                                  : `${label} — tüm haberler`;
                              })()}
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>İptal</AlertDialogCancel>
                    <Button
                      type="button"
                      disabled={busy}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => void runImportForSelectedSites()}
                    >
                      {busy ? "İşleniyor…" : "Evet, içe aktar"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {preview.length > 0 ? (
          <div className="bg-white border rounded-lg p-4 md:p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900">Önizleme (ilk site, kuru çalıştırma)</h3>
            <p className="text-sm text-gray-600">
              Toplam satır: {previewStats.total}. Aynı başlık (atlanacak): {previewStats.duplicateTitles}. Eşleşmeyen
              kategori: {previewStats.unresolved}. Dağılım:{" "}
              {[...previewStats.byCat.entries()].map(([k, v]) => `${k} (${v})`).join(", ")}
            </p>
            <div className="border rounded overflow-x-auto max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Görsel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 80).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{p.id}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={p.title}>
                        {p.skipReason ? `(${p.skipReason}) ` : ""}
                        {p.title}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.categorySlug}
                        {!p.categoryResolved ? (
                          <span className="text-amber-700 block">eşleşmedi</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.hasFeaturedImage ? "kapak" : ""}
                        {p.imageCountInBody > 0 ? ` +${p.imageCountInBody} gövde` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.length > 80 ? (
              <p className="text-xs text-gray-500">… ve {preview.length - 80} kayıt daha</p>
            ) : null}
          </div>
        ) : null}

        {busy ? (
          <p className="text-sm text-gray-600">
            {importProgress || "İşleniyor…"}
            {skipImages ? " (görseller atlanıyor)" : " (görseller indirilebilir)"}
          </p>
        ) : null}

        {results.length > 0 ? (
          <div className="bg-white border rounded-lg p-4 md:p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Sonuç</h3>
            {results.map((result) => (
              <div key={result.siteId} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                <p className="text-sm font-semibold text-gray-800">
                  {result.siteSlug} <span className="text-gray-400 font-normal">#{result.siteId}</span>
                </p>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 mt-2">
                  <li>Toplam JSON kayıt: {result.itemsTotal}</li>
                  <li>Eklenen haber: {result.newsAdded}</li>
                  <li>Atlanan: {result.newsSkipped}</li>
                  <li>Aynı başlık (atlanan): {result.skippedDuplicates ?? 0}</li>
                  <li>İndirilen görsel: {result.imagesDownloaded}</li>
                  <li>Uyarı: {result.warnings.length}</li>
                </ul>
                {result.log.length > 0 ? (
                  <pre className="text-xs bg-gray-50 border rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words mt-2">
                    {result.log.slice(-80).join("\n")}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
