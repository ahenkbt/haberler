import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { EditorLayout } from "@/components/EditorLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { HM_EDITOR_NEWS_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import { useHmEditor } from "@/contexts/HmEditorContext";

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
};

type PreviewRow = {
  id: number;
  title: string;
  slug: string;
  date?: string;
  author?: string;
  wpCategories: string[];
  hasFeaturedImage: boolean;
  imageCountInBody: number;
  skipReason?: string;
};

type SkippedItemCount = {
  postType: string;
  status: string;
  count: number;
  reason: string;
};

type ImportOk = {
  ok: true;
  siteId: number;
  dryRun: boolean;
  wxrItemsTotal?: number;
  eligiblePostsTotal?: number;
  skippedItemCounts?: SkippedItemCount[];
  itemsTotal: number;
  itemsProcessed: number;
  newsAdded: number;
  newsSkipped: number;
  skippedDuplicates: number;
  imagesDownloaded: number;
  imagesFailed: number;
  imagesSkipped: number;
  warnings: string[];
  preview?: PreviewRow[];
  hasMore: boolean;
  nextOffset: number;
  log: string[];
};

const BATCH_LIMIT = 3;

function formatSkippedWxrCounts(rows: SkippedItemCount[] | undefined): string {
  const parts = (rows ?? [])
    .filter((row) => row.count > 0)
    .map((row) => `${row.postType}/${row.status}: ${row.count} (${row.reason})`);
  return parts.join("; ");
}

async function fetchEditorCategories(): Promise<CategoryRow[]> {
  const token = readHmJwt();
  if (!token) throw new Error("Editör oturumu yok.");
  const res = await fetch(apiUrl("/api/hm/editor/categories"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = (await res.json()) as CategoryRow[];
  return Array.isArray(rows) ? rows : [];
}

function mergeImportResult(base: ImportOk | null, next: ImportOk): ImportOk {
  if (!base) {
    return {
      ...next,
      newsAdded: next.newsAdded,
      newsSkipped: next.newsSkipped,
      skippedDuplicates: next.skippedDuplicates,
      imagesDownloaded: next.imagesDownloaded,
      imagesFailed: next.imagesFailed,
      imagesSkipped: next.imagesSkipped,
      warnings: [...(next.warnings ?? [])],
      log: [...(next.log ?? [])],
    };
  }
  return {
    ...base,
    itemsProcessed: base.itemsProcessed + next.itemsProcessed,
    newsAdded: base.newsAdded + next.newsAdded,
    newsSkipped: base.newsSkipped + next.newsSkipped,
    skippedDuplicates: base.skippedDuplicates + next.skippedDuplicates,
    imagesDownloaded: base.imagesDownloaded + next.imagesDownloaded,
    imagesFailed: base.imagesFailed + next.imagesFailed,
    imagesSkipped: base.imagesSkipped + next.imagesSkipped,
    warnings: [...base.warnings, ...(next.warnings ?? [])],
    log: [...base.log, ...(next.log ?? [])],
    hasMore: next.hasMore,
    nextOffset: next.nextOffset,
  };
}

export default function EditorWordPressImport() {
  const qc = useQueryClient();
  const { site } = useHmEditor();
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [skipImages, setSkipImages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<ImportOk | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/hm/editor/categories", "wordpress-import"],
    queryFn: fetchEditorCategories,
    retry: false,
  });

  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(String(categories[0].id));
  }, [categories, categoryId]);

  const selectedCategory = useMemo(
    () => categories.find((cat) => String(cat.id) === categoryId) ?? null,
    [categories, categoryId],
  );

  const wxrItemsTotal = result?.wxrItemsTotal ?? result?.itemsTotal ?? 0;
  const eligiblePostsTotal = result?.eligiblePostsTotal ?? result?.itemsTotal ?? 0;
  const skippedWxrSummary = useMemo(
    () => formatSkippedWxrCounts(result?.skippedItemCounts),
    [result?.skippedItemCounts],
  );

  const validate = (): boolean => {
    setErr("");
    if (!xmlFile) {
      setErr("WordPress XML dosyası seçin.");
      return false;
    }
    const name = xmlFile.name.toLowerCase();
    if (!name.endsWith(".xml") && !name.endsWith(".wxr")) {
      setErr("Sadece .xml veya .wxr dosyası yükleyin.");
      return false;
    }
    if (!categoryId) {
      setErr("Aktarılacak haberler için kategori seçin.");
      return false;
    }
    return true;
  };

  const postImport = async (
    opts: { dryRun: boolean; offset: number },
  ): Promise<ImportOk | { error: string; log?: string[] }> => {
    if (!xmlFile) return { error: "XML dosyası yok." };
    const token = readHmJwt();
    if (!token) return { error: "Editör oturumu yok." };
    const fd = new FormData();
    fd.append("xml", xmlFile);
    fd.append("categoryId", categoryId);
    fd.append("dryRun", opts.dryRun ? "true" : "false");
    fd.append("offset", String(opts.offset));
    fd.append("limit", String(opts.dryRun ? 500 : BATCH_LIMIT));
    if (skipImages) fd.append("skipImages", "true");
    const res = await fetch(apiUrl("/api/hm/editor/import-wordpress"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const raw = await res.text();
    let parsed: (ImportOk & { error?: string }) | null = null;
    try {
      parsed = JSON.parse(raw) as ImportOk & { error?: string };
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return { error: parsed?.error || raw.slice(0, 500) || `HTTP ${res.status}`, log: parsed?.log };
    }
    if (!parsed?.ok) return { error: raw.slice(0, 500) || "Beklenmeyen yanıt" };
    return parsed;
  };

  const runPreview = async () => {
    if (!validate()) return;
    setBusy(true);
    setPreview([]);
    setResult(null);
    setProgress("XML okunuyor ve önizleme hazırlanıyor...");
    try {
      const response = await postImport({ dryRun: true, offset: 0 });
      if ("error" in response) {
        setErr(response.error);
        return;
      }
      setPreview(response.preview ?? []);
      setResult(response);
      if ((response.preview?.length ?? 0) === 0) {
        setErr("Önizlenecek yayınlanmış WordPress yazısı bulunamadı.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const runImport = async () => {
    if (!validate()) return;
    if (!confirm(`${selectedCategory?.name ?? "seçili kategori"} kategorisine aktarım başlatılsın mı?`)) return;
    setBusy(true);
    setErr("");
    setPreview([]);
    setResult(null);
    let offset = 0;
    let merged: ImportOk | null = null;
    let guard = 0;
    try {
      while (guard < 1000) {
        guard += 1;
        const totalHint = merged?.itemsTotal ?? "...";
        setProgress(`${offset} / ${totalHint} kayıt işleniyor...`);
        const response = await postImport({ dryRun: false, offset });
        if ("error" in response) {
          setErr(response.error);
          break;
        }
        merged = mergeImportResult(merged, response);
        setResult(merged);
        if (!response.hasMore) break;
        offset = response.nextOffset;
      }
      if (merged) {
        await qc.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const progressValue = result?.itemsTotal
    ? Math.min(100, Math.round(((result.nextOffset || result.itemsProcessed) / result.itemsTotal) * 100))
    : busy
      ? 12
      : 0;

  return (
    <EditorLayout title="WordPress XML içe aktar">
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <FileUp className="mt-0.5 h-6 w-6 text-red-600" />
              <div>
                <CardTitle>WordPress WXR XML aktarımı</CardTitle>
                <CardDescription className="mt-2">
                  WordPress Araçlar &gt; Dışa aktar çıktısındaki yayınlanmış yazılar, yalnızca bu editör oturumunun
                  bağlı olduğu <strong>{site?.displayName ?? "haber sitesi"}</strong> sitesine aktarılır.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>WordPress XML dosyası *</Label>
                <Input
                  type="file"
                  accept=".xml,.wxr,text/xml,application/xml"
                  disabled={busy}
                  onChange={(event) => {
                    setXmlFile(event.target.files?.[0] ?? null);
                    setPreview([]);
                    setResult(null);
                    setErr("");
                  }}
                />
                <p className="text-xs text-slate-500">Maksimum dosya boyutu: 48 MB.</p>
              </div>
              <div className="space-y-2">
                <Label>Aktarım kategorisi *</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={busy || categoriesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Seçilen kategori tüm aktarılan yazılara uygulanır; WordPress kategori adları etiket/meta olarak korunur.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
              <Checkbox checked={skipImages} onCheckedChange={(v) => setSkipImages(v === true)} disabled={busy} />
              <span>
                Görsel indirmeyi atla
                <span className="block text-xs text-slate-500">
                  Normalde kapak ve içerik görselleri indirilip /api/media/uploads altına kaydedilir. Zaman aşımı
                  yaşanırsa bu seçenekle sadece haber metinlerini aktarabilirsiniz.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={runPreview} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Önizle
              </Button>
              <Button type="button" onClick={runImport} disabled={busy} className="bg-[#e61e25] text-white hover:bg-[#c9181e]">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                İçe aktar
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/editor/haberler">Haberlere dön</Link>
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/editor/wordpress-template-sayfalari">Template sayfaları import</Link>
              </Button>
            </div>

            {progress ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-600">{progress}</div>
                <Progress value={progressValue} />
              </div>
            ) : null}

            {err ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Aktarım hatası</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{err}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Sonuç
              </CardTitle>
              <CardDescription>
                Duplicate kontrolü WordPress kaynak anahtarı, slug ve başlık üzerinden yapılır; bulunan kayıtlar
                güncellenmez, atlanır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                <Stat label="WXR öğe" value={wxrItemsTotal} />
                <Stat label="Yayın yazısı" value={eligiblePostsTotal} />
                <Stat label="İşlenen" value={result.itemsProcessed} />
                <Stat label="Eklenen" value={result.newsAdded} />
                <Stat label="Atlanan" value={result.newsSkipped} />
                <Stat label="Duplicate" value={result.skippedDuplicates} />
                <Stat
                  label="Görsel"
                  value={`${result.imagesDownloaded} indirildi / ${result.imagesFailed} hata / ${result.imagesSkipped ?? 0} atlandı`}
                />
              </div>
              {skippedWxrSummary ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>WXR kapsamı</AlertTitle>
                  <AlertDescription>
                    İçe aktarım yalnızca <strong>post/publish</strong> WordPress yazılarını haber olarak ekler.
                    Kapsam dışı bırakılan öğeler: {skippedWxrSummary}
                  </AlertDescription>
                </Alert>
              ) : null}
              {result.log.length > 0 ? (
                <div className="max-h-52 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                  {result.log.slice(-80).map((line, idx) => (
                    <div key={`${idx}-${line}`}>{line}</div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {preview.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Önizleme</CardTitle>
              <CardDescription>
                {wxrItemsTotal
                  ? `WXR içinde ${wxrItemsTotal} öğe var; ${eligiblePostsTotal} yayınlanmış yazı aktarım kapsamına giriyor.`
                  : "İlk 500 yayınlanmış WordPress yazısı için aktarım durumu."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>WP kategorileri</TableHead>
                      <TableHead>Görsel</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 80).map((row) => (
                      <TableRow key={`${row.id}-${row.slug}`}>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell className="text-xs text-slate-500">{row.slug}</TableCell>
                        <TableCell className="text-sm">{row.wpCategories.join(", ") || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {row.hasFeaturedImage ? "Kapak var" : "Kapak yok"} / içerik: {row.imageCountInBody}
                        </TableCell>
                        <TableCell className={row.skipReason ? "text-amber-700" : "text-green-700"}>
                          {row.skipReason ?? "aktarılabilir"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </EditorLayout>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
