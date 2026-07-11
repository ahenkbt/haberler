import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type AhbImportMode = "full" | "authors" | "posts";

type ImportOk = {
  ok: true;
  siteId: number;
  siteSlug: string;
  authorsMapped: number;
  postsAdded: number;
  postsSkipped: number;
  imagesDownloaded: number;
  imagesFailed: number;
  imagesSkipped: number;
  warnings: string[];
  log: string[];
};

export default function HmKoseIceAktar() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/hm/sites"],
    queryFn: fetchSites,
    retry: false,
  });
  const items = data?.items ?? [];

  const [sitePick, setSitePick] = useState<Record<number, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importMode, setImportMode] = useState<AhbImportMode>("posts");
  const [authorsFile, setAuthorsFile] = useState<File | null>(null);
  const [postsFile, setPostsFile] = useState<File | null>(null);
  const [sourceBaseUrl, setSourceBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<ImportOk[]>([]);

  const selectedSiteIds = useMemo(
    () => items.filter((s) => sitePick[s.id]).map((s) => s.id),
    [items, sitePick],
  );

  const validateAndOpenConfirm = () => {
    setErr("");
    setResults([]);
    if (selectedSiteIds.length === 0) {
      setErr("En az bir haber sitesi işaretleyin.");
      return;
    }
    if (importMode === "full" && (!authorsFile || !postsFile)) {
      setErr("Tam içe aktarım: hem yazar hem makale JSON gerekli.");
      return;
    }
    if (importMode === "authors" && !authorsFile) {
      setErr("Yalnızca yazarlar: __tbl_ky_yazarlar__ JSON dosyasını seçin.");
      return;
    }
    if (importMode === "posts" && !postsFile) {
      setErr("Yalnızca makaleler: __ky_makaleler__ JSON dosyasını seçin.");
      return;
    }
    setConfirmOpen(true);
  };

  const runImportForSelectedSites = async () => {
    setConfirmOpen(false);
    setErr("");
    setResults([]);
    setBusy(true);
    type JsonBody = ImportOk & { error?: string; log?: string[] };
    const acc: ImportOk[] = [];
    const errLines: string[] = [];
    try {
      await ensureAdminPanelBootstrap();
      for (const sid of selectedSiteIds) {
        const fd = new FormData();
        fd.append("siteId", String(sid));
        fd.append("mode", importMode);
        if (sourceBaseUrl.trim()) fd.append("sourceBaseUrl", sourceBaseUrl.trim());
        if (authorsFile) fd.append("authors", authorsFile);
        if (postsFile) fd.append("posts", postsFile);
        const r = await apiFetch(apiUrl("/api/hm/import-ahb-kose"), {
          method: "POST",
          body: fd,
        });
        const raw = await r.text();
        let j: JsonBody | null = null;
        try {
          j = JSON.parse(raw) as JsonBody;
        } catch {
          /* HTML veya düz metin 404 */
        }
        const site = items.find((x) => x.id === sid);
        const label = site ? `${site.displayName} (${site.slug})` : `#${sid}`;
        if (!r.ok) {
          const tail = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
          errLines.push(
            `${label}: ${
              j?.error ||
                (r.status === 404
                  ? `HTTP 404 — API yok veya eski sürüm. (${tail.trim().slice(0, 120)})`
                  : `HTTP ${r.status}: ${tail.trim().slice(0, 200)}`)
            }`,
          );
          if (j && Array.isArray(j.log) && j.log.length) {
            errLines.push(...j.log.map((ln) => `  ${ln}`));
          }
          continue;
        }
        if (j?.ok) acc.push(j);
        else errLines.push(`${label}: ${raw.trim().slice(0, 400) || "Beklenmeyen yanıt"}`);
      }
      setResults(acc);
      if (errLines.length > 0) {
        setErr(errLines.join("\n"));
      }
      if (acc.length > 0) {
        await qc.invalidateQueries({ queryKey: ["/api/hm/sites"] });
      }
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="AHB köşe içe aktar (HM)">
      <div className="space-y-8 max-w-3xl">
        <div className="bg-white border rounded-lg p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <FileJson2 className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">AHB köşe içe aktarımı</h2>
              <p className="text-sm text-gray-600 mt-1">
                <code className="text-xs bg-gray-100 px-1 rounded">__tbl_ky_yazarlar__</code> ve{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">__ky_makaleler__</code> JSON dosyalarını ayrı ayrı
                veya birlikte yükleyebilirsiniz. Yazar fotoğrafları uzaktan indirilip{" "}
                <Link href="/admin/medya" className="text-red-600 font-semibold hover:underline">
                  medya
                </Link>{" "}
                klasörüne kaydedilir. Makaleler <strong>hm_makaleler</strong> tablosuna yazılır (merkez{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">news</code> tablosundan ayrı); site editöründe{" "}
                <strong>Blog</strong> listesinden silinebilir. Aynı AHB makale kimliği tekrar yüklenmez.
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">İçe aktarma modu</Label>
            <Tabs
              value={importMode}
              onValueChange={(v) => setImportMode(v as AhbImportMode)}
              className="mt-2 w-full"
            >
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-gray-50 p-1 w-full max-w-xl">
                <TabsTrigger value="full" className="text-xs">
                  Tam (yazar + makale)
                </TabsTrigger>
                <TabsTrigger value="authors" className="text-xs">
                  Yalnızca yazarlar
                </TabsTrigger>
                <TabsTrigger value="posts" className="text-xs">
                  Yalnızca makaleler
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-gray-500 mt-2">
              {importMode === "full"
                ? "İlk kurulum veya tam yenileme: iki dosya da zorunlu."
                : importMode === "authors"
                  ? "Sadece yazar kayıtları ve fotoğraflar güncellenir; makale içe aktarılmaz."
                  : "Yazarları zaten aktardıysanız buradan sadece makale JSON yükleyin. İsteğe bağlı olarak yazar dosyası da ekleyebilirsiniz (eşleme için)."}
            </p>
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
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Hedef haber siteleri *</Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  İçe aktarma birden çok siteye sırayla uygulanır; başlamadan önce onay penceresi açılır.
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
                    <span className="font-semibold text-gray-600">Önizleme (köşe yazıları):</span>
                    {items
                      .filter((s) => selectedSiteIds.includes(s.id))
                      .map((s) => (
                        <div key={s.id}>
                          <Link
                            href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(s.slug)}/kategori/blog?siteId=${s.id}`}
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
              <div>
                <Label>
                  Yazarlar JSON
                  {importMode === "full" || importMode === "authors" ? " *" : " (isteğe bağlı)"}
                </Label>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="mt-1 block w-full max-w-md text-sm"
                  onChange={(e) => setAuthorsFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label>
                  Makaleler JSON
                  {importMode === "full" || importMode === "posts" ? " *" : ""}
                </Label>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="mt-1 block w-full max-w-md text-sm"
                  onChange={(e) => setPostsFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label>Kaynak WordPress site URL (isteğe bağlı)</Label>
                <input
                  type="url"
                  value={sourceBaseUrl}
                  placeholder="https://ornek-site.com"
                  className="mt-1 block w-full max-w-md rounded-md border px-3 py-2 text-sm"
                  onChange={(e) => setSourceBaseUrl(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  JSON içinde foto yolları <code>/wp-content/uploads/...</code> gibi göreli gelirse bu adresle tam URL’ye çevrilir.
                </p>
              </div>
              {err ? (
                <pre className="text-sm text-red-700 whitespace-pre-wrap break-words bg-red-50 border border-red-100 rounded p-3">
                  {err}
                </pre>
              ) : null}
              <Button
                type="button"
                disabled={busy}
                onClick={() => validateAndOpenConfirm()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                İçe aktar (seçilen mod)
              </Button>

              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>İçe aktarmayı onaylayın</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-left">
                        <p>
                          Seçilen <strong>{selectedSiteIds.length}</strong> siteye içerik yazılacak:
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
                        <p className="text-xs text-gray-500">
                          Mod:{" "}
                          <strong>
                            {importMode === "full"
                              ? "Tam (yazar + makale)"
                              : importMode === "authors"
                                ? "Yalnızca yazarlar"
                                : "Yalnızca makaleler"}
                          </strong>
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

        {busy ? (
          <p className="text-sm text-gray-600">Siteler sırayla işleniyor…</p>
        ) : null}

        {results.length > 0 ? (
          <div className="bg-white border rounded-lg p-4 md:p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Sonuç (site başına)</h3>
            {results.map((result) => (
              <div key={result.siteId} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                <p className="text-sm font-semibold text-gray-800">
                  {result.siteSlug} <span className="text-gray-400 font-normal">#{result.siteId}</span>
                </p>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 mt-2">
                  <li>Yazar eşlemesi (ahb id → kayıt): {result.authorsMapped}</li>
                  <li>Eklenen makale: {result.postsAdded}</li>
                  <li>Atlanan (zaten vardı / boş başlık): {result.postsSkipped}</li>
                  <li>
                    Görsel: {result.imagesDownloaded ?? 0} indirildi / {result.imagesFailed ?? 0} hata /{" "}
                    {result.imagesSkipped ?? 0} atlandı
                  </li>
                  <li>Uyarı satırı: {result.warnings.length}</li>
                </ul>
                {result.log.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Günlük</p>
                    <pre className="text-xs bg-gray-50 border rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                      {result.log.join("\n")}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
