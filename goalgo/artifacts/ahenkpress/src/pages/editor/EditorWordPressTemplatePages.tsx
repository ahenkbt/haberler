import { Component, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, ExternalLink, FileCode2, Loader2, ShieldCheck } from "lucide-react";
import { EditorLayout } from "@/components/EditorLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { sanitizeHmImportedTemplateHtml } from "@/lib/hmImportedTemplateHtml";

type TemplatePreviewRow = {
  sourceName: string;
  title: string;
  slug: string;
  bodyHtml: string;
  originalBytes?: number;
  removedPhpBlocks?: number;
  enabled: boolean;
  fullWidth: boolean;
  warnings?: string[];
};

type PreviewResponse = {
  ok: true;
  siteId: number;
  items: TemplatePreviewRow[];
};

type SaveResponse = {
  ok: true;
  siteId: number;
  imported: TemplatePreviewRow[];
  createdCount: number;
  updatedCount: number;
  menuAdded: number;
};

function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / 1024 / 102.4) / 10} MB`;
}

function slugHint(slug: string): string {
  return slug.trim().replace(/^\/+|\/+$/g, "");
}

function templatePreviewHtml(html: string): string {
  try {
    return sanitizeHmImportedTemplateHtml(rewriteInlineHtmlImgSrc(html));
  } catch {
    return "";
  }
}

class TemplatePreviewErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "Önizleme oluşturulamadı." };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Önizleme güvenli şekilde gösterilemedi. Temizlenmiş HTML alanından içeriği düzenleyip tekrar deneyin.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function EditorWordPressTemplatePages() {
  const { site, refreshMe } = useHmEditor();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [pasteName, setPasteName] = useState("template-sayfasi.html");
  const [pasteHtml, setPasteHtml] = useState("");
  const [preview, setPreview] = useState<TemplatePreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [overwrite, setOverwrite] = useState(true);
  const [addToCorporateMenu, setAddToCorporateMenu] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResponse | null>(null);

  const hmBase = site?.slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}` : "";
  const selectedCount = useMemo(
    () => preview.filter((row) => row.enabled && row.title.trim() && row.slug.trim() && row.bodyHtml.trim()).length,
    [preview],
  );

  const pageUrl = (slug: string): string => {
    const clean = slugHint(slug);
    return hmBase && clean ? `${hmBase}/sayfa/${encodeURIComponent(clean)}` : "";
  };

  const parseError = async (res: Response): Promise<string> => {
    const raw = await res.text().catch(() => "");
    if (!raw) return `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw) as { error?: string; detail?: string; sizeChars?: number; maxChars?: number };
      let msg = String(j.error ?? "").trim() || raw.slice(0, 400);
      if (j.detail) msg += ` — ${j.detail}`;
      if (typeof j.sizeChars === "number" && typeof j.maxChars === "number") msg += ` (${j.sizeChars} / ${j.maxChars} karakter)`;
      return msg;
    } catch {
      return raw.slice(0, 500);
    }
  };

  const runPreview = async () => {
    setErr("");
    setSaveResult(null);
    if (files.length === 0 && !pasteHtml.trim()) {
      setErr("PHP/HTML template dosyası seçin veya içerik yapıştırın.");
      return;
    }
    const token = readHmJwt();
    if (!token) {
      setErr("Editör oturumu yok.");
      return;
    }
    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    if (pasteHtml.trim()) {
      fd.append("sourceText", pasteHtml);
      fd.append("sourceName", pasteName.trim() || "yapistirilan-template.html");
    }

    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/hm/editor/wordpress-template-pages/preview"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        setErr(await parseError(res));
        return;
      }
      const data = (await res.json()) as PreviewResponse;
      setPreview((data.items ?? []).map((item) => ({ ...item, enabled: item.enabled !== false, fullWidth: item.fullWidth !== false })));
      if (!data.items?.length) setErr("Aktarılabilecek statik template içeriği bulunamadı.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  };

  const savePages = async () => {
    const pages = preview
      .filter((row) => row.enabled && row.title.trim() && row.slug.trim() && row.bodyHtml.trim())
      .map((row) => ({
        sourceName: row.sourceName,
        title: row.title,
        slug: row.slug,
        bodyHtml: row.bodyHtml,
        enabled: row.enabled,
        fullWidth: row.fullWidth,
      }));
    if (pages.length === 0) {
      setErr("Kaydedilecek aktif sayfa yok.");
      return;
    }
    const token = readHmJwt();
    if (!token) {
      setErr("Editör oturumu yok.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(apiUrl("/api/hm/editor/wordpress-template-pages/save"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pages, overwrite, addToCorporateMenu }),
      });
      if (!res.ok) {
        setErr(await parseError(res));
        return;
      }
      const data = (await res.json()) as SaveResponse;
      setSaveResult(data);
      setPreview((data.imported ?? []).map((item) => ({ ...item, enabled: item.enabled !== false, fullWidth: item.fullWidth !== false })));
      await refreshMe();
      toast({
        title: "Template sayfaları kaydedildi",
        description: `${data.createdCount} yeni, ${data.updatedCount} güncellenen sayfa.`,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (index: number, patch: Partial<TemplatePreviewRow>) => {
    setPreview((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <EditorLayout title="WordPress Template Sayfaları">
      <div className="max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <FileCode2 className="mt-0.5 h-6 w-6 text-red-600" />
              <div>
                <CardTitle>PHP/HTML template sayfası içe aktar</CardTitle>
                <CardDescription className="mt-2">
                  WordPress özel page template dosyalarını çalıştırmadan okur, statik HTML kısmını çıkarır ve bu haber
                  sitesinin özel sayfalarına kaydeder.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Güvenli import</AlertTitle>
              <AlertDescription>
                PHP kodu yürütülmez. <code>&lt;?php ... ?&gt;</code> blokları, script etiketleri, event handler
                attribute&apos;ları ve javascript URL&apos;leri temizlenir; görsel ve bağlantılar korunur.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Template dosyaları</Label>
                <Input
                  type="file"
                  multiple
                  accept=".php,.html,.htm,.txt,text/html,text/plain,application/x-httpd-php"
                  disabled={busy || saving}
                  onChange={(event) => {
                    setFiles(Array.from(event.target.files ?? []));
                    setPreview([]);
                    setSaveResult(null);
                    setErr("");
                  }}
                />
                <p className="text-xs text-slate-500">
                  Birden fazla <code>.php</code>, <code>.html</code> veya <code>.htm</code> dosyası seçebilirsiniz.
                  Seçili: {files.length || 0}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Yapıştırılan içerik için dosya adı</Label>
                <Input value={pasteName} disabled={busy || saving} onChange={(e) => setPasteName(e.target.value)} />
                <p className="text-xs text-slate-500">Dosya adı başlık/slug üretmek için kullanılır.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alternatif: PHP/HTML içeriği yapıştır</Label>
              <Textarea
                value={pasteHtml}
                disabled={busy || saving}
                onChange={(e) => {
                  setPasteHtml(e.target.value);
                  setSaveResult(null);
                }}
                placeholder="<?php /* Template Name: Atatürk */ ?>&#10;<section>...</section>"
                className="min-h-[150px] font-mono text-xs"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-2 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                <Checkbox checked={overwrite} onCheckedChange={(v) => setOverwrite(v === true)} disabled={busy || saving} />
                <span>
                  Aynı slug varsa güncelle
                  <span className="block text-xs text-slate-500">
                    Kapalıysa çakışan slug&apos;lara otomatik <code>-2</code>, <code>-3</code> eki verilir.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                <Checkbox
                  checked={addToCorporateMenu}
                  onCheckedChange={(v) => setAddToCorporateMenu(v === true)}
                  disabled={busy || saving}
                />
                <span>
                  Manuel kurumsal menü varsa bağlantı ekle
                  <span className="block text-xs text-slate-500">
                    Varsayılan kurumsal menü özel sayfaları zaten “Kurumsal” altında otomatik gösterir.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={runPreview} disabled={busy || saving}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Önizle / ayrıştır
              </Button>
              <Button
                type="button"
                onClick={savePages}
                disabled={busy || saving || selectedCount === 0}
                className="bg-[#e61e25] text-white hover:bg-[#c9181e]"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {selectedCount} sayfayı kaydet
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/editor/sayfalar">Özel sayfaları aç</Link>
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/editor/wordpress-ice-aktar">WordPress XML import</Link>
              </Button>
            </div>

            {err ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>İçe aktarım hatası</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{err}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        {saveResult ? (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-700" />
            <AlertTitle>Kaydedildi</AlertTitle>
            <AlertDescription>
              {saveResult.createdCount} yeni sayfa eklendi, {saveResult.updatedCount} sayfa güncellendi.
              {saveResult.menuAdded > 0 ? ` Manuel kurumsal menüye ${saveResult.menuAdded} bağlantı eklendi.` : ""}
            </AlertDescription>
          </Alert>
        ) : null}

        {preview.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Önizleme ve düzenleme</CardTitle>
              <CardDescription>
                Kaydetmeden önce başlık, slug, yayın durumu ve HTML gövdesini düzenleyebilirsiniz. Sayfalar{" "}
                <code>{hmBase || "/tr/site-slug"}/sayfa/slug</code> adresinde yayınlanır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preview.map((row, index) => {
                const url = pageUrl(row.slug);
                return (
                  <div key={`${row.sourceName}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{row.sourceName}</Badge>
                          <span className="text-xs text-slate-500">{formatBytes(row.originalBytes)}</span>
                          {row.removedPhpBlocks ? <Badge variant="secondary">{row.removedPhpBlocks} PHP blok temizlendi</Badge> : null}
                        </div>
                        {url ? (
                          <Link href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-red-600 hover:underline">
                            {url} <ExternalLink className="inline h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <label className="flex items-center gap-2">
                          <Switch checked={row.enabled} disabled={saving} onCheckedChange={(v) => updateRow(index, { enabled: !!v })} />
                          Yayında
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch checked={row.fullWidth} disabled={saving} onCheckedChange={(v) => updateRow(index, { fullWidth: !!v })} />
                          Tam genişlik
                        </label>
                      </div>
                    </div>

                    {row.warnings?.length ? (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {row.warnings.join(" ")}
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Başlık</Label>
                        <Input
                          className="mt-1"
                          value={row.title}
                          disabled={saving}
                          onChange={(e) => updateRow(index, { title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Slug</Label>
                        <Input
                          className="mt-1 font-mono text-sm"
                          value={row.slug}
                          disabled={saving}
                          onChange={(e) => updateRow(index, { slug: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <Label>Temizlenmiş HTML</Label>
                      <Textarea
                        value={row.bodyHtml}
                        disabled={saving}
                        onChange={(e) => updateRow(index, { bodyHtml: e.target.value })}
                        className="min-h-[220px] font-mono text-xs"
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      <Label>Canlı önizleme</Label>
                      <TemplatePreviewErrorBoundary resetKey={`${row.sourceName}-${index}-${row.bodyHtml.length}`}>
                        <div
                          className="hm-custom-page-body prose prose-slate min-h-[180px] max-w-none overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
                          dangerouslySetInnerHTML={{ __html: templatePreviewHtml(row.bodyHtml) || "<p>Önizleme için HTML içerik yok.</p>" }}
                        />
                      </TemplatePreviewErrorBoundary>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </EditorLayout>
  );
}
